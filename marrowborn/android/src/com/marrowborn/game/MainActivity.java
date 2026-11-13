package com.marrowborn.game;

import android.app.Activity;
import android.os.Build;
import android.content.Context;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;

public class MainActivity extends Activity {
    private WebView web;

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
        web.addJavascriptInterface(new Bridge((Vibrator) getSystemService(Context.VIBRATOR_SERVICE)), "Android");
        setContentView(web);
        if (b == null) web.loadUrl("file:///android_asset/index.html"); else web.restoreState(b);
    }

    /** Haptics for the game: the page calls Android.vibrate("40") or Android.vibrate("60,40,200"). */
    public static class Bridge {
        private final Vibrator vib;
        Bridge(Vibrator v) { vib = v; }

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
    @Override protected void onDestroy() { web.destroy(); super.onDestroy(); }
}
