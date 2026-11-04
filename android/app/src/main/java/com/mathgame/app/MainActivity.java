package com.mathgame.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register the custom offline speech-recognition plugin before the bridge starts.
        registerPlugin(VoskPlugin.class);
        // Register the offline text-to-speech plugin (WebView can't vocalize speechSynthesis).
        registerPlugin(TtsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
