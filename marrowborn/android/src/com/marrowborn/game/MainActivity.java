package com.marrowborn.game;

import android.app.Activity;
import android.os.Build;
import android.content.Context;
import android.content.res.AssetManager;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.marrowborn.net.JoinCode;
import com.marrowborn.net.Relay;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class MainActivity extends Activity {
    private WebView web;
    private Bridge bridge;

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }
        web = new WebView(this);
        web.setBackgroundColor(0xFF0D0C11);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportZoom(false);
        bridge = new Bridge((Vibrator) getSystemService(Context.VIBRATOR_SERVICE), getApplicationContext());
        web.addJavascriptInterface(bridge, "Android");
        setContentView(web);
        if (b == null) web.loadUrl("file:///android_asset/index.html"); else web.restoreState(b);
    }

    /**
     * What the page can ask of the app (window.Android): haptics, and hosting a multiplayer game.
     * Haptics: the page calls Android.vibrate("40") or Android.vibrate("60,40,200").
     * Hosting: Android.startServer(7777) starts the relay (com.marrowborn.net.Relay) in this process and answers with JSON
     * {ok, ip, port, ips, code} or {ok:false, error}; Android.stopServer() stops it; Android.localIp() is this phone's address on the Wi-Fi or hotspot.
     * The relay also serves the game's own files (this APK's assets) over HTTP, so a browser on the same network can open http://ip:port/ and join.
     * These methods are called on the WebView's bridge thread, not the UI thread.
     */
    public static class Bridge {
        private final Vibrator vib;
        private final Context ctx;
        private Relay relay;
        Bridge(Vibrator v, Context c) { vib = v; ctx = c; }

        @JavascriptInterface public synchronized String startServer(int port) {
            try {
                if (relay != null && relay.isRunning()) return describe();
                if (port < 1024 || port > 65535) port = JoinCode.DEFAULT_PORT;
                Relay.Files files = assetFiles(ctx);
                IOException last = null;
                // the asked port first (short join codes assume 7777), then its neighbours, then any free one
                int[] tries = { port, port + 1, port + 2, port + 3, 0 };
                for (int p : tries) {
                    Relay.Config cfg = new Relay.Config();
                    cfg.port = p; cfg.singleRoom = true; cfg.maxRooms = 1; cfg.maxConnections = 48;
                    Relay r = new Relay(cfg, files);
                    try { r.start(); relay = r; break; } catch (IOException e) { last = e; }
                }
                if (relay == null) return "{\"ok\":false,\"error\":\"The game server could not start" + (last == null ? "" : " (" + clean(last.getMessage()) + ")") + ".\"}";
                return describe();
            } catch (Throwable t) {
                return "{\"ok\":false,\"error\":\"The game server could not start (" + clean(String.valueOf(t)) + ").\"}";
            }
        }

        @JavascriptInterface public synchronized void stopServer() {
            Relay r = relay; relay = null;
            if (r != null) try { r.stop(); } catch (Throwable ignored) { }
        }

        /** Empty when the phone is on no local network. */
        @JavascriptInterface public String localIp() {
            try { List<String> ips = Relay.localIps(); return ips.isEmpty() ? "" : ips.get(0); } catch (Throwable t) { return ""; }
        }

        private String describe() {
            List<String> ips = Relay.localIps();
            StringBuilder sb = new StringBuilder("{\"ok\":true,\"port\":" + relay.port() + ",\"ip\":\"" + (ips.isEmpty() ? "" : ips.get(0)) + "\",\"ips\":[");
            for (int i = 0; i < ips.size(); i++) sb.append(i > 0 ? "," : "").append('"').append(ips.get(i)).append('"');
            String code = ips.isEmpty() ? null : JoinCode.encode(ips.get(0), relay.port());
            return sb.append("],\"code\":").append(code == null ? "null" : "\"" + code + "\"").append('}').toString();
        }
        private static String clean(String s) { return s == null ? "" : s.replaceAll("[^A-Za-z0-9 .:,_/-]", " "); }

        /** The game's files as packed into the APK. Only names in assets/web.list (written by build.sh) are served: the asset manager also holds system files. */
        private static Relay.Files assetFiles(Context c) throws IOException {
            final AssetManager am = c.getAssets();
            final Set<String> names = new HashSet<String>();
            BufferedReader r = new BufferedReader(new InputStreamReader(am.open("web.list"), "UTF-8"));
            try { for (String l; (l = r.readLine()) != null; ) if (l.trim().length() > 0) names.add(l.trim()); } finally { r.close(); }
            return new Relay.Files() {
                public InputStream open(String path) throws IOException { return names.contains(path) ? am.open(path) : null; }
            };
        }

        @JavascriptInterface public void vibrate(String pattern) {
            if (vib == null || !vib.hasVibrator()) return;
            try {
                String[] parts = pattern.split(",");
                long[] p = new long[parts.length + 1];
                p[0] = 0; // the web pattern starts with a buzz, Android's starts with a wait
                for (int i = 0; i < parts.length; i++) p[i + 1] = Math.min(600, Math.max(0, Long.parseLong(parts[i].trim())));
                if (Build.VERSION.SDK_INT >= 26) {
                    vib.vibrate(parts.length == 1 ? VibrationEffect.createOneShot(Math.max(1, p[1]), VibrationEffect.DEFAULT_AMPLITUDE)
                                                  : VibrationEffect.createWaveform(p, -1));
                } else if (parts.length == 1) vib.vibrate(p[1]); else vib.vibrate(p, -1);
            } catch (Exception ignored) { }
        }
    }

    private void immersive() {
        web.setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
    }

    @Override public void onWindowFocusChanged(boolean has) { super.onWindowFocusChanged(has); if (has) immersive(); }
    @Override protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); web.saveState(out); }
    @Override protected void onPause() { web.onPause(); web.pauseTimers(); super.onPause(); }
    @Override protected void onResume() { super.onResume(); web.resumeTimers(); web.onResume(); }
    @Override protected void onDestroy() { if (bridge != null) bridge.stopServer(); web.destroy(); super.onDestroy(); }
}
