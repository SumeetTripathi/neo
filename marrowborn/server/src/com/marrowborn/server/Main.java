package com.marrowborn.server;

import com.marrowborn.net.JoinCode;
import com.marrowborn.net.Relay;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URI;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Marrowborn for desktop: serves the game to browsers and relays multiplayer on the local network.
 *
 *   java -jar marrowborn-server.jar [port] [--web DIR] [--no-browser] [--no-window]
 *
 * Without a port it takes 7777, or the next free one. The game's files come from inside the jar unless --web names a folder.
 */
public final class Main {
    public static final String VERSION = "4.1";

    public static void main(String[] args) {
        int port = -1; String web = null; boolean browser = true, window = true, single = false;
        for (int i = 0; i < args.length; i++) {
            String a = args[i];
            if (a.equals("--web") && i + 1 < args.length) web = args[++i];
            else if (a.equals("--no-browser")) browser = false;
            else if (a.equals("--no-window") || a.equals("--no-gui")) window = false;
            else if (a.equals("--single")) single = true; // one room, as the server inside the Android app runs (for testing that mode)
            else if (a.equals("--help") || a.equals("-h")) { usage(); return; }
            else if (a.matches("\\d{1,5}") && Integer.parseInt(a) <= 65535) port = Integer.parseInt(a);
            else { System.err.println("Unknown option: " + a); usage(); System.exit(2); return; }
        }
        Relay.Files files;
        try { files = web != null ? dirFiles(new File(web)) : jarFiles(); }
        catch (IOException e) { System.err.println("Ashes to Apex: " + e.getMessage()); System.exit(1); return; }

        Relay relay = null;
        // a given port is used exactly; otherwise 7777 (the one short join codes assume), the next few, then any free port
        int[] tries = port >= 0 ? new int[] { port } : new int[] { 7777, 7778, 7779, 7780, 7781, 7782, 7783, 7784, 0 };
        IOException last = null;
        for (int p : tries) {
            Relay.Config cfg = new Relay.Config();
            cfg.port = p;
            if (single) { cfg.singleRoom = true; cfg.maxRooms = 1; }
            Relay r = new Relay(cfg, files);
            try { r.start(); relay = r; break; } catch (IOException e) { last = e; }
        }
        if (relay == null) { System.err.println("Marrowborn: could not listen on port " + tries[0] + " (" + (last == null ? "?" : last.getMessage()) + ")."); System.exit(1); return; }

        final String local = "http://localhost:" + relay.port() + "/";
        List<String> ips = Relay.localIps();
        System.out.println("Ashes to Apex server " + VERSION);
        System.out.println("  Play on this computer:        " + local);
        if (ips.isEmpty()) System.out.println("  No local network address found: other devices cannot join until this computer is on a network.");
        for (String ip : ips) System.out.println("  From other devices (same network): http://" + ip + ":" + relay.port() + "/     join code " + JoinCode.pretty(JoinCode.encode(ip, relay.port())));
        System.out.println("  For a trusted local network only: anyone who can reach this port can join. Press Ctrl+C to stop.");
        System.out.flush();

        boolean headless = true;
        try { headless = java.awt.GraphicsEnvironment.isHeadless(); } catch (Throwable ignored) { }
        boolean shown = false;
        if (window && !headless) try { StatusWindow.show(relay, local, ips); shown = true; } catch (Throwable t) { System.out.println("  (no status window: " + t + ")"); }
        if (browser && !headless) try {
            if (java.awt.Desktop.isDesktopSupported() && java.awt.Desktop.getDesktop().isSupported(java.awt.Desktop.Action.BROWSE)) java.awt.Desktop.getDesktop().browse(new URI(local));
            else System.out.println("  Open " + local + " in a browser to play.");
        } catch (Throwable t) { System.out.println("  Open " + local + " in a browser to play."); }
        if (!shown) for (;;) try { Thread.sleep(Long.MAX_VALUE); } catch (InterruptedException e) { return; }
    }

    private static void usage() {
        System.out.println("Ashes to Apex server " + VERSION + "\n"
            + "  java -jar marrowborn-server.jar [port] [--web DIR] [--no-browser] [--no-window]\n"
            + "  port          listen on exactly this port (default: 7777, or the next free port)\n"
            + "  --web DIR     serve the game from DIR instead of the copy inside the jar\n"
            + "  --no-browser  do not open the game in the default browser\n"
            + "  --no-window   no status window (there is never one without a display)");
    }

    /** Files packed in the jar under web/. Only the names listed in web.list (written by build.sh) are served. */
    static Relay.Files jarFiles() throws IOException {
        final Set<String> names = new HashSet<String>();
        InputStream in = Main.class.getResourceAsStream("/web.list");
        if (in == null) throw new IOException("the game files are missing from this jar; build it with server/build.sh, or pass --web DIR");
        BufferedReader r = new BufferedReader(new InputStreamReader(in, "UTF-8"));
        try { for (String l; (l = r.readLine()) != null; ) if (l.trim().length() > 0) names.add(l.trim()); } finally { r.close(); }
        return new Relay.Files() {
            public InputStream open(String path) { return names.contains(path) ? Main.class.getResourceAsStream("/web/" + path) : null; }
        };
    }

    /** Regular files inside one folder; a path that resolves outside it (through a link, say) is refused. */
    static Relay.Files dirFiles(File dir) throws IOException {
        if (!new File(dir, "index.html").isFile()) throw new IOException("no index.html in " + dir);
        final File root = dir.getCanonicalFile();
        final String prefix = root.getPath() + File.separator;
        return new Relay.Files() {
            public InputStream open(String path) throws IOException {
                File f = new File(root, path.replace('/', File.separatorChar)).getCanonicalFile();
                return f.getPath().startsWith(prefix) && f.isFile() ? new FileInputStream(f) : null;
            }
        };
    }
}
