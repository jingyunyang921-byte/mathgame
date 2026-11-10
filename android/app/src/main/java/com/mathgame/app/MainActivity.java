package com.mathgame.app;

import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginHandle;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MgApp";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register the custom offline speech-recognition plugin before the bridge starts.
        registerPlugin(VoskPlugin.class);
        // Register the offline text-to-speech plugin (WebView can't vocalize speechSynthesis).
        registerPlugin(TtsPlugin.class);
        // 页面一开始跳转就作废旧页面没做完的原生调用，免得事后 resolve 经桥落进销毁中的 WebView。
        // 只能挂在 Builder 上：Bridge 构造完会用 Builder 的列表整个替换监听器，插件 load() 里加的会丢。
        bridgeBuilder.addWebViewListener(new WebViewListener() {
            @Override
            public void onPageStarted(WebView webView) {
                Log.i(TAG, "page started " + webView.getUrl());
                if (bridge == null) return;
                Plugin vosk = pluginOf("Vosk");
                Plugin tts = pluginOf("Tts");
                if (vosk instanceof VoskPlugin) ((VoskPlugin) vosk).dropPageCalls();
                if (tts instanceof TtsPlugin) ((TtsPlugin) tts).dropPageCalls();
            }

            // 只记一笔，返回 false 不改变原来的处理（渲染进程没了，系统照旧收掉应用）。
            @Override
            public boolean onRenderProcessGone(WebView webView, RenderProcessGoneDetail detail) {
                String how = Build.VERSION.SDK_INT >= 26 ? (detail.didCrash() ? "crashed" : "killed by system (low memory?)") : "gone";
                Log.e(TAG, "WebView render process " + how + ", url=" + webView.getUrl());
                return false;
            }
        });
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onLowMemory() {
        Log.w(TAG, "onLowMemory");
        super.onLowMemory();
    }

    private Plugin pluginOf(String id) {
        PluginHandle handle = bridge.getPlugin(id);
        return handle == null ? null : handle.getInstance();
    }
}
