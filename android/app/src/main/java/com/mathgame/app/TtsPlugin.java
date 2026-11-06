package com.mathgame.app;

import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.PlaybackParams;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;

import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Offline text-to-speech for the APK. The Android System WebView does not vocalize
 * window.speechSynthesis, so 听算 read-aloud routes through android.speech.tts here.
 * speak() resolves its call only when the utterance finishes, so the JS side can
 * resume Vosk listening exactly like the web SpeechSynthesis onend handler does.
 * When the cloud voice is configured (see CloudTts) Chinese speech plays that first
 * and falls back to the system engine on any failure.
 */
@CapacitorPlugin(name = "Tts")
public class TtsPlugin extends Plugin {
    private TextToSpeech tts;
    private volatile boolean ready = false;
    private final Map<String, PluginCall> pending = new HashMap<>();
    private int seq = 0;

    private CloudTts cloud;
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final ExecutorService bg = Executors.newSingleThreadExecutor();
    private final AtomicBoolean prefetching = new AtomicBoolean(false);
    private final Handler main = new Handler(Looper.getMainLooper());
    private MediaPlayer player;
    private PluginCall cloudCall;
    private int gen = 0;

    @Override
    public void load() {
        if (CloudTts.configured()) cloud = new CloudTts(getContext());

        tts = new TextToSpeech(getContext(), status -> {
            ready = (status == TextToSpeech.SUCCESS);
            if (!ready) return;
            try { tts.setLanguage(Locale.CHINA); } catch (Exception e) { /* fall back to engine default */ }
            tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override public void onStart(String id) { }
                @Override public void onDone(String id) { finish(id, true, null); }
                @Override public void onError(String id) { finish(id, false, "tts-error"); }
                @Override public void onError(String id, int errorCode) { finish(id, false, "tts-error-" + errorCode); }
            });
        });
    }

    private synchronized void finish(String id, boolean ok, String err) {
        PluginCall call = pending.remove(id);
        if (call == null) return;
        if (ok) call.resolve();
        else call.reject(err == null ? "tts-error" : err);
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "");
        String lang = call.getString("lang", "zh-CN");
        if (cloud != null && text != null && !text.isEmpty() && !"en-US".equalsIgnoreCase(lang)) { speakCloud(call, text); return; }
        synchronized (this) { cancelCloud(); }
        speakSystem(call);
    }

    /** 预下载固定短句到云端缓存。立即返回，后台单线程逐句下载；已有一轮在跑就忽略，没配云端就什么都不做。 */
    @PluginMethod
    public void prefetch(PluginCall call) {
        List<String> texts = new ArrayList<>();
        try {
            JSArray a = call.getArray("texts");
            for (int i = 0; a != null && i < a.length() && texts.size() < 200; i++) {
                String s = a.optString(i, "");
                if (!s.isEmpty()) texts.add(s);
            }
        } catch (Exception e) { /* 参数不对就当空 */ }
        call.resolve();
        if (cloud == null || texts.isEmpty() || !prefetching.compareAndSet(false, true)) return;
        bg.execute(() -> {
            try { cloud.prefetch(texts); } finally { prefetching.set(false); }
        });
    }

    private void speakCloud(PluginCall call, String text) {
        final int my;
        synchronized (this) {
            cancelCloud();
            for (PluginCall c : pending.values()) { try { c.resolve(); } catch (Exception e) { } }
            pending.clear();
            if (tts != null) { try { tts.stop(); } catch (Exception e) { } }
            my = gen;
            call.setKeepAlive(true);
            cloudCall = call;
        }
        io.execute(() -> {
            File f = cloud.get(text);
            long keep = f == null ? 0 : Mp3Tail.keepBytes(f);
            main.post(() -> {
                synchronized (TtsPlugin.this) { if (my != gen) return; }
                if (f == null) fallback(my, call); else play(my, call, f, keep);
            });
        });
    }

    private void play(int my, PluginCall call, File f, long keep) {
        MediaPlayer mp = new MediaPlayer();
        try {
            mp.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build());
            if (keep > 0 && keep < f.length()) {
                try (FileInputStream in = new FileInputStream(f)) { mp.setDataSource(in.getFD(), 0, keep); }
            } else {
                mp.setDataSource(f.getAbsolutePath());
            }
            float vol = (float) Math.max(0.0, Math.min(1.0, call.getDouble("volume", 1.0)));
            mp.setVolume(vol, vol);
            final double rate = call.getDouble("rate", 1.0);
            mp.setOnPreparedListener(m -> {
                m.start();
                if (Math.abs(rate - 1.0) > 0.01) {
                    try { m.setPlaybackParams(new PlaybackParams().setSpeed((float) Math.max(0.5, Math.min(2.0, rate)))); } catch (Exception e) { }
                }
            });
            mp.setOnCompletionListener(m -> done(my, call));
            mp.setOnErrorListener((m, what, extra) -> { f.delete(); fallback(my, call); return true; });
            synchronized (this) {
                if (my != gen) { mp.release(); return; }
                player = mp;
            }
            mp.prepareAsync();
        } catch (Exception e) {
            try { mp.release(); } catch (Exception ignored) { }
            f.delete();
            fallback(my, call);
        }
    }

    private void done(int my, PluginCall call) {
        synchronized (this) {
            if (my != gen || cloudCall != call) return;
            cloudCall = null;
            releasePlayer();
        }
        call.resolve();
    }

    private void fallback(int my, PluginCall call) {
        synchronized (this) {
            if (my != gen || cloudCall != call) return;
            cloudCall = null;
            releasePlayer();
        }
        speakSystem(call);
    }

    private void releasePlayer() {
        if (player == null) return;
        try { player.stop(); } catch (Exception e) { }
        try { player.release(); } catch (Exception e) { }
        player = null;
    }

    private void cancelCloud() {
        gen++;
        releasePlayer();
        if (cloudCall != null) { try { cloudCall.resolve(); } catch (Exception e) { } cloudCall = null; }
    }

    private void speakSystem(PluginCall call) {
        if (tts == null || !ready) { call.reject("tts-not-ready"); return; }
        String text = call.getString("text", "");
        if (text == null || text.isEmpty()) { call.resolve(); return; }
        double rate = call.getDouble("rate", 1.0);
        double volume = call.getDouble("volume", 1.0);
        String lang = call.getString("lang", "zh-CN");

        // Treating the engine as if it speaks every language is how we got the mid-game
        // "tts-error" banner: this DuerOS box ships a Chinese-only engine, so speaking an
        // en-US utterance fired onError. setLanguage() reports availability up front —
        // if the requested voice data is missing, resolve-and-skip (the JS side treats a
        // decorative cue as optional) instead of letting the engine error out.
        int langRes;
        try {
            langRes = tts.setLanguage("en-US".equalsIgnoreCase(lang) ? Locale.US : Locale.CHINA);
        } catch (Exception e) { langRes = TextToSpeech.LANG_NOT_SUPPORTED; }
        if (langRes == TextToSpeech.LANG_MISSING_DATA || langRes == TextToSpeech.LANG_NOT_SUPPORTED) {
            call.resolve();
            return;
        }
        try { tts.setSpeechRate((float) rate); } catch (Exception e) { }

        // A new utterance flushes the queue (matches speechSynthesis.cancel()); resolve
        // any superseded calls so their JS promise resumes listening promptly.
        synchronized (this) {
            for (PluginCall c : pending.values()) { try { c.resolve(); } catch (Exception e) { } }
            pending.clear();
            String id = "u" + (seq++);
            call.setKeepAlive(true);
            pending.put(id, call);
            Bundle params = new Bundle();
            params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME,
                    (float) Math.max(0.0, Math.min(1.0, volume)));
            int res = tts.speak(text, TextToSpeech.QUEUE_FLUSH, params, id);
            if (res != TextToSpeech.SUCCESS) { pending.remove(id); call.reject("tts-speak-failed"); }
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        synchronized (this) { cancelCloud(); }
        if (tts != null) { try { tts.stop(); } catch (Exception e) { } }
        synchronized (this) {
            for (PluginCall c : pending.values()) { try { c.resolve(); } catch (Exception e) { } }
            pending.clear();
        }
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        synchronized (this) { cancelCloud(); }
        io.shutdownNow();
        if (tts != null) { try { tts.stop(); tts.shutdown(); } catch (Exception e) { } tts = null; }
    }
}
