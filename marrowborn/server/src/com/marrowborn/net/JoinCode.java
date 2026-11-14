package com.marrowborn.net;

/**
 * Short join codes: an IPv4 address and port written in Crockford base 32 (0-9 A-Z without I L O U).
 * The same scheme is implemented in web/net.js (codeEncode / codeDecode); keep the two in step.
 *
 *   4 characters   192.168.a.b on the default port 7777      bits: a b (16) + check (4)
 *   6 characters   10.a.b.c, 172.16-31.b.c, 100.64-127.b.c or 169.254.b.c on the default port
 *                                                             bits: kind (2) + address (24) + check (4)
 *   11 characters  any IPv4 address and any port             10 characters of address*65536+port, then 1 check character
 *
 * The check bits catch most typing mistakes. Codes are not secrets: they only spell an address.
 */
public final class JoinCode {
    public static final int DEFAULT_PORT = 7777;
    private static final String ALPHA = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

    private JoinCode() { }

    private static int hash(int a, int b, int c, int d, int port) {
        int[] v = { a, b, c, d, (port >> 8) & 255, port & 255 };
        int h = 7;
        for (int i = 0; i < v.length; i++) h = (h * 31 + v[i]) & 0xFFFF;
        return h;
    }
    private static int chk4(int h) { return (h ^ (h >> 4) ^ (h >> 8) ^ (h >> 12)) & 15; }
    private static int chk5(int h) { return (h ^ (h >> 5) ^ (h >> 10) ^ (h >> 15)) & 31; }

    private static String b32(long v, int n) {
        char[] out = new char[n];
        for (int i = n - 1; i >= 0; i--) { out[i] = ALPHA.charAt((int) (v & 31)); v >>>= 5; }
        return new String(out);
    }

    /** ip is dotted IPv4 text. Returns null when it is not an IPv4 address or the port is out of range. */
    public static String encode(String ip, int port) {
        int[] q = quad(ip);
        if (q == null || port < 1 || port > 65535) return null;
        int a = q[0], b = q[1], c = q[2], d = q[3], h = hash(a, b, c, d, port);
        if (port == DEFAULT_PORT) {
            if (a == 192 && b == 168) return b32(((long) (c << 8 | d) << 4) | chk4(h), 4);
            int kind = -1, v = 0;
            if (a == 10) { kind = 0; v = b << 16 | c << 8 | d; }
            else if (a == 172 && b >= 16 && b < 32) { kind = 1; v = (b - 16) << 16 | c << 8 | d; }
            else if (a == 100 && b >= 64 && b < 128) { kind = 2; v = (b - 64) << 16 | c << 8 | d; }
            else if (a == 169 && b == 254) { kind = 3; v = c << 8 | d; }
            if (kind >= 0) return b32((((long) kind << 24 | v) << 4) | chk4(h), 6);
        }
        long ip32 = ((long) a << 24) | (b << 16) | (c << 8) | d;
        return b32(ip32 * 65536L + port, 10) + ALPHA.charAt(chk5(h));
    }

    /** Returns "a.b.c.d:port", or null when the text is not a valid code. Spaces and dashes are ignored; I and L read as 1, O as 0. */
    public static String decode(String code) {
        if (code == null) return null;
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < code.length(); i++) {
            char ch = Character.toUpperCase(code.charAt(i));
            if (ch == ' ' || ch == '-' || ch == '.') continue;
            if (ch == 'I' || ch == 'L') ch = '1';
            if (ch == 'O') ch = '0';
            if (ALPHA.indexOf(ch) < 0) return null;
            sb.append(ch);
        }
        int n = sb.length();
        if (n != 4 && n != 6 && n != 11) return null;
        long v = 0;
        for (int i = 0; i < (n == 11 ? 10 : n); i++) v = v * 32 + ALPHA.indexOf(sb.charAt(i));
        int a, b, c, d, port = DEFAULT_PORT, chk;
        if (n == 4) {
            chk = (int) (v & 15); v >>= 4;
            a = 192; b = 168; c = (int) (v >> 8) & 255; d = (int) v & 255;
        } else if (n == 6) {
            chk = (int) (v & 15); v >>= 4;
            int kind = (int) (v >> 24) & 3, hi = (int) (v >> 16) & 255;
            c = (int) (v >> 8) & 255; d = (int) v & 255;
            if (kind == 0) { a = 10; b = hi; }
            else if (kind == 1) { if (hi > 15) return null; a = 172; b = 16 + hi; }
            else if (kind == 2) { if (hi > 63) return null; a = 100; b = 64 + hi; }
            else { if (hi != 0) return null; a = 169; b = 254; }
        } else {
            chk = ALPHA.indexOf(sb.charAt(10));
            port = (int) (v % 65536L);
            long ip32 = v / 65536L;
            if (ip32 > 0xFFFFFFFFL || port < 1) return null;
            a = (int) (ip32 >> 24) & 255; b = (int) (ip32 >> 16) & 255; c = (int) (ip32 >> 8) & 255; d = (int) ip32 & 255;
        }
        int h = hash(a, b, c, d, port);
        if (chk != (n == 11 ? chk5(h) : chk4(h))) return null;
        return a + "." + b + "." + c + "." + d + ":" + port;
    }

    /** "ABCDEFGHJKM" -> "ABCD-EFGH-JKM"; shorter codes are returned unchanged. */
    public static String pretty(String code) {
        if (code == null || code.length() != 11) return code;
        return code.substring(0, 4) + "-" + code.substring(4, 8) + "-" + code.substring(8);
    }

    static int[] quad(String ip) {
        if (ip == null) return null;
        String[] p = ip.split("\\.", -1);
        if (p.length != 4) return null;
        int[] q = new int[4];
        for (int i = 0; i < 4; i++) {
            if (p[i].length() < 1 || p[i].length() > 3) return null;
            for (int k = 0; k < p[i].length(); k++) if (p[i].charAt(k) < '0' || p[i].charAt(k) > '9') return null;
            q[i] = Integer.parseInt(p[i]);
            if (q[i] > 255) return null;
        }
        return q;
    }
}
