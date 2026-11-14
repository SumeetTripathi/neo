package com.marrowborn.net;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketTimeoutException;
import java.nio.charset.Charset;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Marrowborn's local-network relay: one listening port that answers
 *   - WebSocket (RFC 6455, text frames) on /ws : rooms of up to 8 members; the relay only forwards what members send
 *     to each other and keeps the member list. It knows nothing about the game.
 *   - plain HTTP GET/HEAD for the game's static files (through a {@link Files} source) and GET /api/info.
 *
 * The same class runs inside the Android app (one room, files from the APK's assets) and in the standalone server
 * (many rooms, files from the jar). It uses only classes present in Java 8 and in Android API 23.
 *
 * It is meant for a trusted local network. It listens on every interface and has no authentication or encryption.
 *
 * Wire protocol, one text frame each, first character = kind:
 *   client -> relay   J v|room|create|mode|name   join (create=1 makes a room; name is percent-encoded UTF-8)
 *                     B json                      send to every other member of my room
 *                     T id json                   send to one member
 *                     R0 / R1                     not ready / ready
 *                     N name                      rename (percent-encoded)
 *                     O mode                      host: set the mode (coop or versus)
 *                     S seed                      host: start (seed is a decimal integer chosen by the host page)
 *                     E reason                    host: end the running game, everyone returns to the lobby
 *                     K id                        host: remove a member
 *                     L                           list the rooms on this relay
 *                     P text                      echo (latency probe, keep-alive)
 *   relay -> client   W json                      welcome: my id, the room, its members, facts about the relay
 *                     S json                      an event: join leave ready name mode start end closed rooms error
 *                     M id json                   a message from member id
 *                     P text                      echo
 *
 * Limits (see {@link Config}): frame size, per-member outbound queue, inbound rate, members per room, rooms, connections.
 * A member whose outbound queue overflows (a consumer too slow for the traffic) is disconnected; nobody else waits for it.
 */
public final class Relay {
    public static final int PROTOCOL = 1;
    private static final Charset UTF8 = Charset.forName("UTF-8");
    private static final String WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

    /** Where static files come from. The path is already checked: relative, '/' separated, only [A-Za-z0-9._-] segments, none starting with a dot. Return null when there is no such file. */
    public interface Files { InputStream open(String path) throws IOException; }

    public static final class Config {
        /** Port to listen on. */
        public int port = JoinCode.DEFAULT_PORT;
        /** One room only (the in-app server): joining without a room code enters it. */
        public boolean singleRoom = false;
        public int maxRooms = 32;
        public int maxMembers = 8;
        /** Largest message accepted from a member, in bytes of UTF-8 (also across fragments). */
        public int maxFrame = 1 << 20;
        /** Outbound queue per member: a member further behind than this is disconnected. */
        public int maxQueueFrames = 1024;
        public int maxQueueBytes = 8 << 20;
        /** Inbound rate per member, measured over 2 second windows. */
        public int maxInFramesPerSec = 400;
        public int maxInBytesPerSec = 4 << 20;
        public int maxConnections = 96;
        /** Seconds without any inbound traffic (the relay pings every 10 s) before a connection is dropped. */
        public int idleSeconds = 40;
        /** Largest static file served. */
        public int maxFileBytes = 32 << 20;
    }

    private final Config cfg;
    private final Files files;
    private ServerSocket server;
    private volatile boolean running;
    private int port;
    private final Map<String, Room> rooms = new LinkedHashMap<String, Room>();
    private final Set<Conn> conns = new HashSet<Conn>();
    private int nextId = 1;
    private final SecureRandom rnd = new SecureRandom();
    private volatile Runnable onChange;

    public Relay(Config cfg, Files files) { this.cfg = cfg == null ? new Config() : cfg; this.files = files; }

    /** Called (from relay threads) whenever rooms or members change. */
    public void setOnChange(Runnable r) { onChange = r; }
    public int port() { return port; }
    public boolean isRunning() { return running; }

    /** Binds every interface on cfg.port (0 = any free port) and starts serving. Throws when the port is taken. */
    public synchronized void start() throws IOException {
        if (running) return;
        ServerSocket ss = new ServerSocket();
        ss.setReuseAddress(true);
        ss.bind(new InetSocketAddress(cfg.port), 64);
        server = ss; port = ss.getLocalPort(); running = true;
        daemon(() -> acceptLoop(), "mb-accept").start();
        daemon(() -> tickLoop(), "mb-tick").start();
    }

    public void stop() {
        List<Conn> all;
        synchronized (this) {
            if (!running) return;
            running = false;
            try { server.close(); } catch (IOException ignored) { }
            all = new ArrayList<Conn>(conns);
            rooms.clear();
        }
        for (Conn c : all) c.hardClose();
        changed();
    }

    private static Thread daemon(Runnable r, String name) { Thread t = new Thread(r, name); t.setDaemon(true); return t; }
    private void changed() { Runnable r = onChange; if (r != null) try { r.run(); } catch (RuntimeException ignored) { } }

    private void acceptLoop() {
        final ServerSocket ss = server;
        while (running) {
            Socket s;
            try { s = ss.accept(); } catch (IOException e) { if (!running) return; pause(50); continue; }
            Conn c = null;
            synchronized (this) { if (conns.size() < cfg.maxConnections) { c = new Conn(this, s); conns.add(c); } }
            if (c == null) { try { s.close(); } catch (IOException ignored) { } continue; }
            try { daemon(c, "mb-conn").start(); }
            catch (Throwable t) { c.hardClose(); synchronized (this) { conns.remove(c); } } // out of threads: refuse rather than fall over
        }
    }

    private static void pause(long ms) { try { Thread.sleep(ms); } catch (InterruptedException ignored) { } }

    /** Every 10 s: ping each WebSocket (browsers answer by themselves) and reap connections that did not finish closing. */
    private void tickLoop() {
        final byte[] ping = frame(9, new byte[0], 0, 0, null);
        while (running) {
            pause(10000);
            List<Conn> all;
            synchronized (this) { all = new ArrayList<Conn>(conns); }
            long now = System.currentTimeMillis();
            for (Conn c : all) {
                if (c.closingSince > 0 && now - c.closingSince > 5000) c.hardClose();
                else if (c.ws) c.offer(ping);
            }
        }
    }

    /* ------------------------------------------------------------------ rooms ------------------------------------------------------------------ */

    private static final class Room {
        final String code; String mode = "coop"; String state = "lobby"; Conn host;
        final List<Conn> members = new ArrayList<Conn>();
        Room(String code) { this.code = code; }
    }

    private static final String CODE_ALPHA = "ABCDEFGHJKMNPQRSTVWXYZ23456789";

    private String newRoomCode() {
        for (;;) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 4; i++) sb.append(CODE_ALPHA.charAt(rnd.nextInt(CODE_ALPHA.length())));
            if (!rooms.containsKey(sb.toString())) return sb.toString();
        }
    }

    private static void sendTo(Room r, byte[] f, Conn except) { for (Conn m : r.members) if (m != except) m.offer(f); }
    private static byte[] event(String json) { byte[] p = ("S" + json).getBytes(UTF8); return frame(1, p, 0, p.length, null); }
    private static byte[] error(String code, String msg) { return event("{\"e\":\"error\",\"code\":" + q(code) + ",\"msg\":" + q(msg) + "}"); }

    private static String memberJson(Conn m, Room r, boolean full) {
        return "{\"id\":" + q(m.id) + ",\"name\":" + q(m.name) + (full ? ",\"ready\":" + m.ready + ",\"isHost\":" + (r.host == m) : "") + "}";
    }
    private static String membersJson(Room r, boolean full) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < r.members.size(); i++) { if (i > 0) sb.append(','); sb.append(memberJson(r.members.get(i), r, full)); }
        return sb.append(']').toString();
    }
    private synchronized String roomsJson() {
        StringBuilder sb = new StringBuilder("[");
        boolean first = true;
        for (Room r : rooms.values()) {
            if (!first) sb.append(','); first = false;
            sb.append("{\"code\":").append(q(r.code)).append(",\"name\":").append(q(r.host == null ? "" : r.host.name))
              .append(",\"mode\":").append(q(r.mode)).append(",\"state\":").append(q(r.state))
              .append(",\"count\":").append(r.members.size()).append(",\"max\":").append(cfg.maxMembers).append('}');
        }
        return sb.append(']').toString();
    }
    private String serverJson() {
        List<String> ips = localIps();
        StringBuilder sb = new StringBuilder("{\"v\":" + PROTOCOL + ",\"port\":" + port + ",\"single\":" + cfg.singleRoom
            + ",\"max\":" + cfg.maxMembers + ",\"maxFrame\":" + cfg.maxFrame + ",\"ips\":[");
        for (int i = 0; i < ips.size(); i++) { if (i > 0) sb.append(','); sb.append(q(ips.get(i))); }
        sb.append("],\"join\":").append(ips.isEmpty() ? "null" : q(JoinCode.encode(ips.get(0), port))).append('}');
        return sb.toString();
    }

    /** Lines for a status display: one per room, "CODE co-op lobby: Ann (host), Bob". */
    public synchronized List<String> describe() {
        List<String> out = new ArrayList<String>();
        for (Room r : rooms.values()) {
            StringBuilder sb = new StringBuilder(r.code + "  " + r.mode + "  " + r.state + ":  ");
            for (int i = 0; i < r.members.size(); i++) { Conn m = r.members.get(i); if (i > 0) sb.append(", "); sb.append(m.name); if (m == r.host) sb.append(" (host)"); }
            out.add(sb.toString());
        }
        return out;
    }
    public synchronized int memberCount() { int n = 0; for (Room r : rooms.values()) n += r.members.size(); return n; }

    private synchronized void join(Conn c, String arg) {
        if (c.room != null) { c.offer(error("already", "You are already in a room.")); return; }
        String[] f = arg.split("\\|", -1);
        if (f.length < 5) { c.offer(error("bad", "Malformed join.")); return; }
        if (!String.valueOf(PROTOCOL).equals(f[0])) { c.offer(error("version", "This game and the host are different versions. Update both to the same build.")); return; }
        String code = f[1].trim().toUpperCase(Locale.ROOT), mode = "versus".equals(f[3]) ? "versus" : "coop";
        boolean create = "1".equals(f[2]);
        c.name = cleanName(unpct(f[4]));
        Room r;
        if (cfg.singleRoom) r = rooms.isEmpty() ? null : rooms.values().iterator().next();
        else r = code.length() > 0 ? rooms.get(code) : null;
        if (create) {
            if (cfg.singleRoom && r != null) { c.offer(error("busy", "A game is already being hosted here.")); return; }
            if (rooms.size() >= cfg.maxRooms) { c.offer(error("rooms", "This server has no room left for another game.")); return; }
            r = new Room(cfg.singleRoom ? "GAME" : newRoomCode());
            r.mode = mode; r.host = c;
            rooms.put(r.code, r);
        } else {
            if (r == null) { c.offer(error("noroom", cfg.singleRoom ? "Nobody is hosting a game there right now." : "That room no longer exists.")); return; }
            if ("playing".equals(r.state)) { c.offer(error("playing", "That game has already started.")); return; }
            if (r.members.size() >= cfg.maxMembers) { c.offer(error("full", "That room is full.")); return; }
        }
        c.id = "p" + Integer.toString(nextId++, 36);
        c.ready = false; c.room = r;
        sendTo(r, event("{\"e\":\"join\",\"id\":" + q(c.id) + ",\"name\":" + q(c.name) + "}"), null);
        r.members.add(c);
        byte[] w = ("W{\"id\":" + q(c.id) + ",\"hostId\":" + q(r.host.id) + ",\"room\":{\"code\":" + q(r.code) + ",\"mode\":" + q(r.mode)
            + ",\"state\":" + q(r.state) + "},\"members\":" + membersJson(r, true) + ",\"server\":" + serverJson() + "}").getBytes(UTF8);
        c.offer(frame(1, w, 0, w.length, null));
        changed();
    }

    /** Takes a connection out of its room. If it hosted, the room closes for everyone. */
    private void leave(Conn c, String why) {
        List<Conn> drop = null;
        synchronized (this) {
            Room r = c.room;
            if (r == null) return;
            c.room = null;
            r.members.remove(c);
            if (r.host == c || r.members.isEmpty()) {
                rooms.remove(r.code);
                byte[] f = event("{\"e\":\"closed\",\"reason\":\"host-left\"}");
                drop = new ArrayList<Conn>(r.members);
                for (Conn m : drop) { m.room = null; m.offer(f); }
                r.members.clear();
            } else sendTo(r, event("{\"e\":\"leave\",\"id\":" + q(c.id) + ",\"why\":" + q(why) + "}"), null);
        }
        if (drop != null) for (Conn m : drop) m.close(1000, "host left");
        changed();
    }

    private synchronized void command(Conn c, char kind, String arg) {
        Room r = c.room;
        if (kind == 'L') { c.offer(event("{\"e\":\"rooms\",\"rooms\":" + roomsJson() + ",\"server\":" + serverJson() + "}")); return; }
        if (r == null) { c.offer(error("noroom", "You are not in a room.")); return; }
        boolean host = r.host == c;
        switch (kind) {
            case 'R': {
                boolean v = arg.startsWith("1");
                if (c.ready != v) { c.ready = v; sendTo(r, event("{\"e\":\"ready\",\"id\":" + q(c.id) + ",\"ready\":" + v + "}"), null); }
                break;
            }
            case 'N': {
                String n = cleanName(unpct(arg));
                if (!n.equals(c.name)) { c.name = n; sendTo(r, event("{\"e\":\"name\",\"id\":" + q(c.id) + ",\"name\":" + q(n) + "}"), null); }
                break;
            }
            case 'O':
                if (host && "lobby".equals(r.state) && (arg.equals("coop") || arg.equals("versus")) && !arg.equals(r.mode)) {
                    r.mode = arg; sendTo(r, event("{\"e\":\"mode\",\"mode\":" + q(arg) + "}"), null);
                }
                break;
            case 'S':
                if (!host) { c.offer(error("nothost", "Only the host can start.")); break; }
                if (!"lobby".equals(r.state)) break;
                long seed;
                try { seed = Long.parseLong(arg.trim()); } catch (NumberFormatException e) { seed = rnd.nextInt() & 0x7FFFFFFFL; }
                r.state = "playing";
                sendTo(r, event("{\"e\":\"start\",\"mode\":" + q(r.mode) + ",\"seed\":" + seed + ",\"hostId\":" + q(r.host.id)
                    + ",\"members\":" + membersJson(r, false) + "}"), null);
                break;
            case 'E':
                if (host && "playing".equals(r.state)) {
                    r.state = "lobby";
                    for (Conn m : r.members) m.ready = false;
                    sendTo(r, event("{\"e\":\"end\",\"reason\":" + q(token(arg)) + "}"), null);
                }
                break;
            case 'K':
                if (host) for (Conn m : new ArrayList<Conn>(r.members)) if (m != c && m.id.equals(arg.trim())) {
                    m.offer(event("{\"e\":\"closed\",\"reason\":\"kicked\"}"));
                    m.close(1000, "removed by the host"); // its reader then leaves the room and the others are told
                }
                break;
            default: c.offer(error("bad", "Unknown command.")); return;
        }
        changed();
    }

    /** B and T: forward the payload bytes untouched, prefixed with the sender's id. */
    private synchronized void relay(Conn c, byte[] p, int len) {
        Room r = c.room;
        if (r == null) return;
        if (p[0] == 'B') {
            if (r.members.size() < 2) return;
            sendTo(r, frame(1, p, 1, len - 1, ("M" + c.id + " ").getBytes(UTF8)), c);
        } else {
            int sp = 1;
            while (sp < len && sp < 24 && p[sp] != ' ') sp++;
            if (sp >= len || p[sp] != ' ') return;
            String to = new String(p, 1, sp - 1, UTF8);
            for (Conn m : r.members) if (m.id.equals(to)) { m.offer(frame(1, p, sp + 1, len - sp - 1, ("M" + c.id + " ").getBytes(UTF8))); break; }
        }
    }

    /* ------------------------------------------------------------------ connections ------------------------------------------------------------------ */

    // a static nested class and lambdas rather than inner and anonymous classes: d8 34.0.0 fails on the nameless
    // "mandated" constructor parameter that newer javac versions record for those
    private static final class Conn implements Runnable {
        final Relay relay; final Config cfg;
        final Socket sock;
        InputStream in; OutputStream out;
        volatile boolean ws, dead;
        volatile long closingSince;
        String id = "", name = "Player"; boolean ready; Room room; // guarded by the Relay lock
        private final ArrayDeque<byte[]> queue = new ArrayDeque<byte[]>();
        private int queued; private boolean closeAfterFlush;
        private long winStart; private int winFrames; private long winBytes;

        Conn(Relay r, Socket s) { relay = r; cfg = r.cfg; sock = s; }

        public void run() {
            try {
                sock.setTcpNoDelay(true);
                sock.setSoTimeout(10000); // for the request head
                in = new BufferedInputStream(sock.getInputStream(), 16384);
                out = sock.getOutputStream();
                String[] head = readHead();
                if (head == null) return;
                Map<String, String> h = headers(head);
                String[] rl = head[0].split(" ");
                if (rl.length < 3) { http(400, "Bad Request", "text/plain", "bad request".getBytes(UTF8), false, null); return; }
                String method = rl[0], target = rl[1];
                int qm = target.indexOf('?'); if (qm >= 0) target = target.substring(0, qm);
                String up = h.get("upgrade");
                if (up != null && up.equalsIgnoreCase("websocket")) { if (handshake(method, target, h)) frames(); return; }
                serve(method, target);
            } catch (IOException ignored) {
            } catch (RuntimeException ignored) {
            } finally {
                try { relay.leave(this, dead ? "dropped" : "left"); } catch (RuntimeException ignored) { }
                for (int i = 0; i < 50 && closingSince > 0 && !dead; i++) pause(20); // let the writer deliver the close frame
                hardClose();
                synchronized (relay) { relay.conns.remove(this); }
            }
        }

        /** Request line and header lines, or null (after answering) when the head is malformed or too long. */
        private String[] readHead() throws IOException {
            ByteArrayOutputStream b = new ByteArrayOutputStream(512);
            int state = 0, c;
            long t0 = System.currentTimeMillis();
            while (state < 4) {
                c = in.read();
                if (c < 0 || System.currentTimeMillis() - t0 > 10000) return null; // a head that trickles in is dropped
                if (b.size() >= 8192) { http(431, "Request Header Fields Too Large", "text/plain", "headers too large".getBytes(UTF8), false, null); return null; }
                b.write(c);
                if (c == '\r') state = state == 2 ? 3 : 1;
                else if (c == '\n') state = state == 1 ? 2 : state == 3 ? 4 : 0;
                else state = 0;
            }
            String[] lines = new String(b.toByteArray(), Charset.forName("ISO-8859-1")).split("\r\n");
            return lines.length == 0 ? null : lines;
        }
        private Map<String, String> headers(String[] head) {
            Map<String, String> h = new HashMap<String, String>();
            for (int i = 1; i < head.length; i++) { int k = head[i].indexOf(':'); if (k > 0) h.put(head[i].substring(0, k).trim().toLowerCase(Locale.ROOT), head[i].substring(k + 1).trim()); }
            return h;
        }

        private void http(int code, String status, String type, byte[] body, boolean headOnly, String extra) throws IOException {
            String hd = "HTTP/1.1 " + code + " " + status + "\r\nContent-Type: " + type + "\r\nContent-Length: " + body.length
                + "\r\nCache-Control: no-cache\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n" + (extra == null ? "" : extra) + "\r\n";
            out.write(hd.getBytes(UTF8));
            if (!headOnly) out.write(body);
            out.flush();
        }

        private void serve(String method, String target) throws IOException {
            boolean headOnly = method.equals("HEAD");
            if (!headOnly && !method.equals("GET")) { http(405, "Method Not Allowed", "text/plain", "GET only".getBytes(UTF8), false, "Allow: GET, HEAD\r\n"); return; }
            if (target.equals("/api/info")) {
                String j = "{\"name\":\"marrowborn\",\"server\":" + relay.serverJson() + ",\"rooms\":" + relay.roomsJson() + "}";
                http(200, "OK", "application/json; charset=utf-8", j.getBytes(UTF8), headOnly, "Access-Control-Allow-Origin: *\r\n");
                return;
            }
            String path = safePath(target);
            byte[] body = null;
            if (path != null && relay.files != null) {
                InputStream f = null;
                try {
                    f = relay.files.open(path);
                    if (f != null) body = readAll(f, cfg.maxFileBytes);
                } catch (IOException e) { body = null; }
                finally { if (f != null) try { f.close(); } catch (IOException ignored) { } }
            }
            if (body == null) { http(404, "Not Found", "text/plain; charset=utf-8", "Not found".getBytes(UTF8), headOnly, null); return; }
            sock.setSoTimeout(30000);
            http(200, "OK", mime(path), body, headOnly, null);
        }

        private boolean handshake(String method, String target, Map<String, String> h) throws IOException {
            String key = h.get("sec-websocket-key");
            if (!method.equals("GET") || !target.equals("/ws") || key == null || key.length() > 64 || !"13".equals(h.get("sec-websocket-version"))) {
                http(400, "Bad Request", "text/plain", "not a Marrowborn socket".getBytes(UTF8), false, "Sec-WebSocket-Version: 13\r\n");
                return false;
            }
            if (!originOk(h.get("origin"), h.get("host"))) { http(403, "Forbidden", "text/plain", "origin not allowed".getBytes(UTF8), false, null); return false; }
            String accept;
            try { accept = base64(MessageDigest.getInstance("SHA-1").digest((key + WS_GUID).getBytes(UTF8))); }
            catch (java.security.NoSuchAlgorithmException e) { throw new IOException(e.toString()); }
            out.write(("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + accept + "\r\n\r\n").getBytes(UTF8));
            out.flush();
            ws = true;
            sock.setSoTimeout(cfg.idleSeconds * 1000);
            daemon(() -> writeLoop(), "mb-write").start();
            return true;
        }

        /** Reads frames until the socket closes or the peer breaks the protocol. */
        private void frames() throws IOException {
            byte[] msg = null; int msgLen = 0; // a fragmented message being assembled
            byte[] hd = new byte[8], mask = new byte[4];
            for (;;) {
                int b0, b1;
                try { b0 = in.read(); b1 = in.read(); }
                catch (SocketTimeoutException e) { dead = true; return; }
                if (b0 < 0 || b1 < 0) { dead = closingSince == 0; return; }
                boolean fin = (b0 & 0x80) != 0;
                int op = b0 & 15;
                if ((b0 & 0x70) != 0 || (b1 & 0x80) == 0) { close(1002, "protocol error"); return; } // extensions are not negotiated; clients must mask
                long len = b1 & 0x7F;
                if (len == 126) { readFully(hd, 2); len = (hd[0] & 255) << 8 | (hd[1] & 255); }
                else if (len == 127) { readFully(hd, 8); len = 0; for (int i = 0; i < 8; i++) len = len << 8 | (hd[i] & 255); if (len < 0) { close(1002, "protocol error"); return; } }
                readFully(mask, 4);
                if (op >= 8) { // control frames
                    if (!fin || len > 125) { close(1002, "protocol error"); return; }
                    byte[] p = new byte[(int) len]; readFully(p, p.length); unmask(p, p.length, mask, 0);
                    if (op == 8) { closeAfterFlushWith(frame(8, p, 0, Math.min(p.length, 2), null)); return; }
                    if (op == 9) offer(frame(10, p, 0, p.length, null));
                    else if (op != 10) { close(1002, "protocol error"); return; }
                    continue;
                }
                if (op == 2) { close(1003, "text frames only"); return; }
                if (op != (msg == null ? 1 : 0)) { close(1002, "protocol error"); return; }
                if (len + msgLen > cfg.maxFrame) { close(1009, "message too big"); return; }
                byte[] p; int total;
                if (msg == null && fin) { p = new byte[(int) len]; readFully(p, p.length); unmask(p, p.length, mask, 0); total = p.length; }
                else {
                    if (msg == null) { msg = new byte[(int) Math.max(len, 1024)]; msgLen = 0; }
                    if (msgLen + (int) len > msg.length) { byte[] g = new byte[Math.max(msg.length * 2, msgLen + (int) len)]; System.arraycopy(msg, 0, g, 0, msgLen); msg = g; }
                    readFully(msg, msgLen, (int) len);
                    for (int i = 0; i < (int) len; i++) msg[msgLen + i] ^= mask[i & 3];
                    msgLen += (int) len;
                    if (!fin) continue;
                    p = msg; total = msgLen; msg = null; msgLen = 0;
                }
                if (!rateOk(total)) { close(1008, "sending too fast"); return; }
                if (total == 0) continue;
                if (!utf8Ok(p, total)) { close(1007, "invalid text"); return; }
                char kind = (char) p[0];
                if (kind == 'B' || kind == 'T') relay.relay(this, p, total);
                else if (kind == 'P') offer(frame(1, p, 0, Math.min(total, 64), null));
                else if (kind == 'J') relay.join(this, new String(p, 1, Math.min(total - 1, 512), UTF8));
                else relay.command(this, kind, new String(p, 1, Math.min(total - 1, 256), UTF8));
            }
        }

        private boolean rateOk(int bytes) {
            long now = System.currentTimeMillis();
            if (now - winStart >= 2000) { winStart = now; winFrames = 0; winBytes = 0; }
            winFrames++; winBytes += bytes;
            return winFrames <= cfg.maxInFramesPerSec * 2 && winBytes <= cfg.maxInBytesPerSec * 2L;
        }
        private void readFully(byte[] b, int n) throws IOException { readFully(b, 0, n); }
        private void readFully(byte[] b, int off, int n) throws IOException {
            while (n > 0) { int k = in.read(b, off, n); if (k < 0) throw new IOException("eof"); off += k; n -= k; }
        }
        private void unmask(byte[] p, int n, byte[] mask, int at) { for (int i = 0; i < n; i++) p[i] ^= mask[(at + i) & 3]; }

        /** Queues a frame for this member. Never blocks: a member whose queue is full is cut off instead. */
        void offer(byte[] f) {
            boolean over = false;
            synchronized (queue) {
                if (dead || closeAfterFlush || !ws) return;
                if (queue.size() >= cfg.maxQueueFrames || queued + f.length > cfg.maxQueueBytes) over = true;
                else { queue.add(f); queued += f.length; queue.notify(); }
            }
            if (over) { dead = true; hardClose(); } // too slow for the traffic: its reader thread notices the closed socket and tells the room
        }

        /** Sends a close frame after whatever is queued, then closes the socket. */
        void close(int code, String reason) {
            byte[] r = reason.getBytes(UTF8), p = new byte[2 + r.length];
            p[0] = (byte) (code >> 8); p[1] = (byte) code; System.arraycopy(r, 0, p, 2, r.length);
            closeAfterFlushWith(frame(8, p, 0, p.length, null));
        }
        private void closeAfterFlushWith(byte[] f) {
            synchronized (queue) {
                if (dead || closeAfterFlush) return;
                if (!ws) { hardCloseQuiet(); return; }
                queue.add(f); closeAfterFlush = true; closingSince = System.currentTimeMillis(); queue.notify();
            }
        }

        private void writeLoop() {
            try {
                ArrayList<byte[]> batch = new ArrayList<byte[]>();
                for (;;) {
                    boolean last;
                    synchronized (queue) {
                        while (queue.isEmpty() && !dead && !closeAfterFlush) queue.wait();
                        if (dead) return;
                        batch.clear(); batch.addAll(queue); queue.clear(); queued = 0;
                        last = closeAfterFlush;
                    }
                    for (int i = 0; i < batch.size(); i++) out.write(batch.get(i));
                    out.flush();
                    if (last) { try { sock.shutdownOutput(); } catch (IOException ignored) { } pause(200); return; }
                }
            } catch (IOException e) { dead = true;
            } catch (InterruptedException ignored) {
            } finally { hardClose(); }
        }

        void hardClose() { synchronized (queue) { dead = true; queue.clear(); queued = 0; queue.notifyAll(); } hardCloseQuiet(); }
        private void hardCloseQuiet() { try { sock.close(); } catch (IOException ignored) { } }
    }

    /* ------------------------------------------------------------------ helpers ------------------------------------------------------------------ */

    /** A server-to-client frame (never masked): header, an optional prefix, then len bytes of p from off. */
    static byte[] frame(int op, byte[] p, int off, int len, byte[] prefix) {
        int pl = prefix == null ? 0 : prefix.length, n = pl + len, h = n < 126 ? 2 : n < 65536 ? 4 : 10;
        byte[] f = new byte[h + n];
        f[0] = (byte) (0x80 | op);
        if (h == 2) f[1] = (byte) n;
        else if (h == 4) { f[1] = 126; f[2] = (byte) (n >> 8); f[3] = (byte) n; }
        else { f[1] = 127; for (int i = 0; i < 8; i++) f[2 + i] = (byte) ((long) n >> (8 * (7 - i))); }
        if (pl > 0) System.arraycopy(prefix, 0, f, h, pl);
        System.arraycopy(p, off, f, h + pl, len);
        return f;
    }

    /** Strict UTF-8 check: a browser drops its connection when it is sent malformed text, so malformed text is never forwarded. */
    static boolean utf8Ok(byte[] b, int n) {
        int i = 0;
        while (i < n) {
            int c = b[i] & 255;
            if (c < 0x80) { i++; continue; }
            int need, min;
            if (c >= 0xC2 && c <= 0xDF) { need = 1; min = 0x80; c &= 0x1F; }
            else if (c >= 0xE0 && c <= 0xEF) { need = 2; min = 0x800; c &= 0x0F; }
            else if (c >= 0xF0 && c <= 0xF4) { need = 3; min = 0x10000; c &= 0x07; }
            else return false;
            if (i + need >= n) return false;
            for (int k = 1; k <= need; k++) { int d = b[i + k] & 255; if ((d & 0xC0) != 0x80) return false; c = c << 6 | (d & 0x3F); }
            if (c < min || c > 0x10FFFF || (c >= 0xD800 && c <= 0xDFFF)) return false;
            i += need + 1;
        }
        return true;
    }

    /** "/fonts/a.woff2" -> "fonts/a.woff2"; "/" -> "index.html"; null for anything that is not a plain relative file path. */
    static String safePath(String target) {
        if (target == null || target.length() > 240 || !target.startsWith("/")) return null;
        String p = unpct(target.substring(1));
        if (p == null) return null;
        if (p.length() == 0) return "index.html";
        String[] seg = p.split("/", -1);
        if (seg.length > 6) return null;
        for (int i = 0; i < seg.length; i++) {
            String s = seg[i];
            if (s.length() == 0 || s.charAt(0) == '.') return null; // no empty, hidden, "." or ".." segments
            for (int k = 0; k < s.length(); k++) {
                char ch = s.charAt(k);
                if (!(ch >= 'a' && ch <= 'z' || ch >= 'A' && ch <= 'Z' || ch >= '0' && ch <= '9' || ch == '.' || ch == '_' || ch == '-')) return null;
            }
        }
        return p;
    }

    /** Percent-decoding as UTF-8; null when malformed. */
    static String unpct(String s) {
        if (s.indexOf('%') < 0) return s;
        ByteArrayOutputStream b = new ByteArrayOutputStream(s.length());
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            if (ch == '%') {
                if (i + 2 >= s.length()) return null;
                int hi = Character.digit(s.charAt(i + 1), 16), lo = Character.digit(s.charAt(i + 2), 16);
                if (hi < 0 || lo < 0) return null;
                b.write(hi << 4 | lo); i += 2;
            } else { byte[] u = String.valueOf(ch).getBytes(UTF8); b.write(u, 0, u.length); }
        }
        byte[] out = b.toByteArray();
        return utf8Ok(out, out.length) ? new String(out, UTF8) : null;
    }

    /** Player names are text typed by players: control characters go, whitespace collapses, 16 characters at most. */
    static String cleanName(String s) {
        if (s == null) return "Player";
        StringBuilder sb = new StringBuilder();
        boolean space = false; int count = 0;
        for (int i = 0; i < s.length() && count < 16; ) {
            int cp = s.codePointAt(i); i += Character.charCount(cp);
            if (cp < 0x20 || cp == 0x7F || cp >= 0x80 && cp < 0xA0 || cp == 0x2028 || cp == 0x2029 || cp == 0x202E || cp == 0x202D || cp == 0x200B || cp == 0xFEFF
                || Character.isWhitespace(cp) || cp == 0xA0) { space = sb.length() > 0; continue; }
            if (space) { sb.append(' '); count++; space = false; if (count >= 16) break; }
            sb.appendCodePoint(cp); count++;
        }
        return sb.length() == 0 ? "Player" : sb.toString();
    }

    private static String token(String s) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length() && sb.length() < 32; i++) { char ch = s.charAt(i); if (ch >= 'a' && ch <= 'z' || ch >= '0' && ch <= '9' || ch == '-') sb.append(ch); }
        return sb.length() == 0 ? "ended" : sb.toString();
    }

    /** JSON string literal. */
    static String q(String s) {
        StringBuilder sb = new StringBuilder(s.length() + 2).append('"');
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            if (ch == '"' || ch == '\\') sb.append('\\').append(ch);
            else if (ch < 0x20 || ch == 0x2028 || ch == 0x2029 || ch == '<' || ch == '>' || ch == '&') { String hx = Integer.toHexString(ch); sb.append("\\u"); for (int k = hx.length(); k < 4; k++) sb.append('0'); sb.append(hx); }
            else sb.append(ch);
        }
        return sb.append('"').toString();
    }

    static String base64(byte[] b) {
        final String A = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < b.length; i += 3) {
            int n = (b[i] & 255) << 16 | (i + 1 < b.length ? (b[i + 1] & 255) << 8 : 0) | (i + 2 < b.length ? b[i + 2] & 255 : 0);
            sb.append(A.charAt(n >> 18 & 63)).append(A.charAt(n >> 12 & 63)).append(i + 1 < b.length ? A.charAt(n >> 6 & 63) : '=').append(i + 2 < b.length ? A.charAt(n & 63) : '=');
        }
        return sb.toString();
    }

    static byte[] readAll(InputStream in, int max) throws IOException {
        ByteArrayOutputStream b = new ByteArrayOutputStream(65536);
        byte[] buf = new byte[16384]; int k;
        while ((k = in.read(buf)) > 0) { if (b.size() + k > max) throw new IOException("file too large"); b.write(buf, 0, k); }
        return b.toByteArray();
    }

    static String mime(String path) {
        String e = path.substring(path.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        if (e.equals("html")) return "text/html; charset=utf-8";
        if (e.equals("js")) return "text/javascript; charset=utf-8";
        if (e.equals("css")) return "text/css; charset=utf-8";
        if (e.equals("json")) return "application/json; charset=utf-8";
        if (e.equals("webmanifest")) return "application/manifest+json; charset=utf-8";
        if (e.equals("png")) return "image/png";
        if (e.equals("jpg") || e.equals("jpeg")) return "image/jpeg";
        if (e.equals("svg")) return "image/svg+xml";
        if (e.equals("ico")) return "image/x-icon";
        if (e.equals("woff2")) return "font/woff2";
        if (e.equals("txt")) return "text/plain; charset=utf-8";
        return "application/octet-stream";
    }

    /**
     * Browsers let any web page open a socket to a LAN address, so a page from the internet is refused here:
     * the page must come from this relay (same host), from a file or app (no http origin), or from a host on the local network.
     */
    static boolean originOk(String origin, String host) {
        if (origin == null || origin.length() == 0 || origin.equals("null")) return true;
        String o = origin.toLowerCase(Locale.ROOT);
        if (!o.startsWith("http://") && !o.startsWith("https://")) return true; // file://, app wrappers
        String oh = hostOnly(o.substring(o.indexOf("//") + 2));
        if (host != null && oh.equals(hostOnly(host.toLowerCase(Locale.ROOT)))) return true;
        if (oh.equals("localhost") || oh.endsWith(".local") || oh.endsWith(".lan") || oh.endsWith(".home") || oh.endsWith(".internal")) return true;
        if (oh.indexOf(':') >= 0) return oh.equals("::1") || oh.startsWith("fe80:") || oh.startsWith("fc") || oh.startsWith("fd");
        int[] v = JoinCode.quad(oh);
        if (v == null) return oh.indexOf('.') < 0; // a bare intranet name such as "gamepc"
        return v[0] == 10 || v[0] == 127 || v[0] == 192 && v[1] == 168 || v[0] == 172 && v[1] >= 16 && v[1] < 32 || v[0] == 169 && v[1] == 254 || v[0] == 100 && v[1] >= 64 && v[1] < 128;
    }
    private static String hostOnly(String h) {
        int slash = h.indexOf('/'); if (slash >= 0) h = h.substring(0, slash);
        if (h.startsWith("[")) { int e = h.indexOf(']'); return e > 0 ? h.substring(1, e) : h; }
        int c = h.lastIndexOf(':');
        return c >= 0 && h.indexOf(':') == c ? h.substring(0, c) : h;
    }

    /** This machine's IPv4 addresses on the local network, the likeliest first (Wi-Fi and home ranges before the rest). */
    public static List<String> localIps() {
        final List<String[]> found = new ArrayList<String[]>();
        try {
            Enumeration<NetworkInterface> en = NetworkInterface.getNetworkInterfaces();
            while (en != null && en.hasMoreElements()) {
                NetworkInterface ni = en.nextElement();
                try { if (!ni.isUp() || ni.isLoopback()) continue; } catch (IOException e) { continue; }
                Enumeration<InetAddress> ad = ni.getInetAddresses();
                while (ad.hasMoreElements()) {
                    InetAddress a = ad.nextElement();
                    if (a instanceof Inet4Address && !a.isLoopbackAddress()) found.add(new String[] { a.getHostAddress(), String.valueOf(ni.getName()) });
                }
            }
        } catch (IOException ignored) { } catch (RuntimeException ignored) { }
        Collections.sort(found, (x, y) -> rank(x) - rank(y));
        List<String> out = new ArrayList<String>();
        for (String[] f : found) if (!out.contains(f[0])) out.add(f[0]);
        return out;
    }
    private static int rank(String[] f) {
        String ip = f[0], ni = f[1].toLowerCase(Locale.ROOT);
        int r = ip.startsWith("192.168.") ? 0 : ip.startsWith("10.") ? 2 : ip.startsWith("172.") ? 3 : ip.startsWith("169.254.") ? 8 : 5;
        if (ni.startsWith("wlan") || ni.startsWith("swlan") || ni.startsWith("ap") || ni.startsWith("en") || ni.startsWith("eth") || ni.startsWith("wl")) r -= 1;
        if (ni.startsWith("rmnet") || ni.startsWith("ccmni") || ni.startsWith("tun") || ni.startsWith("docker") || ni.startsWith("veth") || ni.startsWith("br-") || ni.startsWith("virbr") || ni.startsWith("vbox") || ni.startsWith("vmnet")) r += 10;
        return r;
    }
}
