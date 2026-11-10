package com.mathgame.app;

import android.Manifest;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.vosk.Model;
import org.vosk.Recognizer;
import org.vosk.android.StorageService;

import java.io.IOException;

/**
 * Offline speech recognition bridge backed by Vosk (Kaldi).
 *
 * The web layer only needs a tiny surface: loadModel() once, then start()/stop()
 * around a listening session. Recognition hypotheses are pushed to JS as
 * "partialResult" / "result" events; errors as "error".
 *
 * We drive AudioRecord ourselves (rather than Vosk's SpeechService) so we can try
 * several audio sources — on assistant devices (e.g. Baidu DuerOS) the built-in
 * mic is held by the system wake-word engine on VOICE_RECOGNITION, and we must
 * fall back to MIC / VOICE_COMMUNICATION to capture at all.
 *
 * The Chinese small model ships unzipped under assets/model-cn/ and is unpacked
 * into internal storage on first use.
 */
@CapacitorPlugin(
    name = "Vosk",
    permissions = {
        @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO })
    }
)
public class VoskPlugin extends Plugin {

    private static final String TAG = "VoskPlugin";
    private static final int SAMPLE_RATE = 16000;
    // Pull audio in small chunks (~0.1s @ 16kHz mono 16-bit) so Vosk emits partial
    // hypotheses ~10x/sec — the JS side confirms a number across two consecutive
    // partials, so frequent updates keep recognition responsive without waiting for
    // the full end-of-utterance endpoint.
    private static final int READ_CHUNK = 3200;

    // 说完一个数后静音多久就判定"说完了"。model.conf 里是 0.5 秒，孩子说完到出结果要多等这么久；
    // 太短会把中间有停顿的「七…十二」切成两段。
    private static final float END_SILENCE_SEC = 0.3f;
    private static final float INITIAL_SILENCE_SEC = 5.0f;
    private static final float MAX_UTTERANCE_SEC = 20.0f;

    // Digits-only grammar used as a safe fallback: even if the caller's grammar
    // includes command words the model doesn't know, numbers stay constrained.
    private static final String NUMBERS_GRAMMAR =
        "[\"\\u96f6 \\u4e00 \\u4e8c \\u4e09 \\u56db \\u4e94 \\u516d \\u4e03 \\u516b \\u4e5d \\u5341 \\u4e24 [unk]\"]";

    private Model model;
    private Recognizer recognizer;
    private AudioRecord audioRecord;
    private Thread recordThread;
    private volatile boolean recording;
    private String grammar; // JSON grammar string constraining the vocabulary

    // ---- Model loading -------------------------------------------------

    // loadModel 可能被页面重复调用（刷新、重进）：解压期间再来的请求挂在同一次解压后面，别并发解压到同一目录。
    private final java.util.List<PluginCall> loadWaiters = new java.util.ArrayList<>();
    private boolean loading;

    @PluginMethod
    public void loadModel(PluginCall call) {
        String g = call.getString("grammar", null);
        if (g != null) grammar = g;
        if (model != null) { call.resolve(); return; }
        synchronized (loadWaiters) {
            loadWaiters.add(call);
            if (loading) return;
            loading = true;
        }
        Log.d(TAG, "Unpacking model from assets/model-cn ...");
        StorageService.unpack(
            getContext(),
            "model-cn", // source: assets/model-cn/
            "model",    // target: filesDir/model
            (m) -> { model = m; Log.d(TAG, "Model loaded"); finishLoad(null); },
            (e) -> { Log.e(TAG, "Model unpack failed", e); finishLoad("Failed to unpack Vosk model: " + e.getMessage()); }
        );
    }

    // 页面跳转：旧页面还在等的 loadModel 作废，不 resolve（事后再 resolve 会经桥落进新页面）。
    // 解压仍在后台继续，新页面的 loadModel 排在它后面；话筒一并放掉。
    void dropPageCalls() {
        synchronized (loadWaiters) { loadWaiters.clear(); }
        getBridge().execute(this::stopCapture);
    }

    private void finishLoad(String error) {
        java.util.List<PluginCall> waiting;
        synchronized (loadWaiters) {
            waiting = new java.util.ArrayList<>(loadWaiters);
            loadWaiters.clear();
            loading = false;
        }
        for (PluginCall c : waiting) {
            if (error == null) c.resolve(); else c.reject(error);
        }
    }

    // ---- Start / stop --------------------------------------------------

    @PluginMethod
    public void start(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "micPermCallback");
            return;
        }
        doStart(call);
    }

    @PermissionCallback
    private void micPermCallback(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) doStart(call);
        else call.reject("Microphone permission denied");
    }

    private void doStart(PluginCall call) {
        if (model == null) { call.reject("Model not loaded"); return; }
        String g = call.getString("grammar", null);
        if (g != null) grammar = g;
        stopCapture();
        try {
            recognizer = createRecognizer();
            recognizer.setWords(true);
            recognizer.setPartialWords(true);
            try {
                recognizer.setEndpointerDelays(INITIAL_SILENCE_SEC, (float) (double) call.getDouble("endSec", (double) END_SILENCE_SEC), MAX_UTTERANCE_SEC);
            } catch (Throwable t) {
                Log.w(TAG, "setEndpointerDelays unavailable, using model.conf endpoints", t);
            }
        } catch (IOException e) {
            Log.e(TAG, "createRecognizer failed", e);
            call.reject("Failed to create recognizer: " + e.getMessage());
            return;
        }
        int minBuf = AudioRecord.getMinBufferSize(SAMPLE_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT);
        if (minBuf <= 0) minBuf = SAMPLE_RATE;
        final int bufSize = Math.max(minBuf * 2, SAMPLE_RATE); // ~0.5s of 16-bit mono
        AudioRecord rec = openMic(bufSize);
        if (rec == null) { call.reject("Microphone unavailable (busy?)"); return; }
        audioRecord = rec;
        try {
            audioRecord.startRecording();
        } catch (Exception e) {
            Log.e(TAG, "startRecording threw", e);
            stopCapture();
            call.reject("startRecording failed: " + e.getMessage());
            return;
        }
        if (audioRecord.getRecordingState() != AudioRecord.RECORDSTATE_RECORDING) {
            Log.e(TAG, "Recorder not RECORDING (mic busy)");
            stopCapture();
            call.reject("Microphone busy");
            return;
        }
        recording = true;
        recordThread = new Thread(() -> captureLoop(bufSize), "vosk-capture");
        recordThread.start();
        Log.d(TAG, "Recording started");
        call.resolve();
    }

    // Try each audio source in turn; assistant devices hold VOICE_RECOGNITION.
    private AudioRecord openMic(int bufSize) {
        int[] sources = {
            MediaRecorder.AudioSource.VOICE_RECOGNITION,
            MediaRecorder.AudioSource.MIC,
            MediaRecorder.AudioSource.VOICE_COMMUNICATION,
            MediaRecorder.AudioSource.DEFAULT
        };
        for (int src : sources) {
            try {
                AudioRecord r = new AudioRecord(src, SAMPLE_RATE,
                    AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, bufSize);
                if (r.getState() == AudioRecord.STATE_INITIALIZED) {
                    Log.d(TAG, "AudioRecord OK with source " + src);
                    return r;
                }
                Log.w(TAG, "AudioRecord source " + src + " not initialized");
                r.release();
            } catch (Exception e) {
                Log.w(TAG, "AudioRecord source " + src + " threw: " + e.getMessage());
            }
        }
        return null;
    }

    private void captureLoop(int bufSize) {
        byte[] buffer = new byte[READ_CHUNK];
        try {
            while (recording) {
                int n = audioRecord.read(buffer, 0, buffer.length);
                if (n > 0) {
                    synchronized (this) {
                        if (recognizer == null) break;
                        if (recognizer.acceptWaveForm(buffer, n)) {
                            emit("result", recognizer.getResult(), "text", "result");
                        } else {
                            emit("partialResult", recognizer.getPartialResult(), "partial", "partial_result");
                        }
                    }
                } else if (n < 0) {
                    Log.e(TAG, "AudioRecord.read error: " + n);
                    emitError("read-error " + n);
                    break;
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "captureLoop error", e);
            emitError(e.getMessage());
        }
    }

    // Prefer a grammar-constrained recognizer; fall back through a digits-only
    // grammar and finally open recognition if a grammar has out-of-vocabulary words.
    private Recognizer createRecognizer() throws IOException {
        if (grammar != null && grammar.length() > 0) {
            try {
                return new Recognizer(model, (float) SAMPLE_RATE, grammar);
            } catch (IOException e) {
                Log.w(TAG, "grammar recognizer failed, trying digits: " + e.getMessage());
            }
            try {
                return new Recognizer(model, (float) SAMPLE_RATE, NUMBERS_GRAMMAR);
            } catch (IOException e) {
                Log.w(TAG, "digits grammar failed, using open recognition: " + e.getMessage());
            }
        }
        return new Recognizer(model, (float) SAMPLE_RATE);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        stopCapture();
        call.resolve();
    }

    private void stopCapture() {
        recording = false;
        Thread t = recordThread;
        recordThread = null;
        if (t != null) {
            try { t.join(600); } catch (InterruptedException ignored) {}
        }
        synchronized (this) {
            if (audioRecord != null) {
                try {
                    if (audioRecord.getState() == AudioRecord.STATE_INITIALIZED) audioRecord.stop();
                } catch (Exception ignored) {}
                audioRecord.release();
                audioRecord = null;
            }
            if (recognizer != null) {
                recognizer.close();
                recognizer = null;
            }
        }
    }

    // ---- Helpers -------------------------------------------------------

    // words: per-word {w, c(onf), s(tart), e(nd)} in seconds, so the web layer can tell a spoken digit from tail noise.
    private void emit(String event, String hypothesis, String textKey, String wordsKey) {
        String text = "";
        JSONArray words = new JSONArray();
        if (hypothesis != null) {
            try {
                JSONObject h = new JSONObject(hypothesis);
                text = h.optString(textKey, "");
                JSONArray raw = h.optJSONArray(wordsKey);
                for (int i = 0; raw != null && i < raw.length(); i++) {
                    JSONObject w = raw.optJSONObject(i);
                    if (w == null) continue;
                    JSONObject o = new JSONObject();
                    o.put("w", w.optString("word"));
                    o.put("c", w.optDouble("conf", 1));
                    o.put("s", w.optDouble("start", 0));
                    o.put("e", w.optDouble("end", 0));
                    words.put(o);
                }
            } catch (JSONException ignored) {}
        }
        JSObject ret = new JSObject();
        ret.put("text", text);
        ret.put("words", words);
        notifyListeners(event, ret);
    }

    private void emitError(String msg) {
        JSObject ret = new JSObject();
        ret.put("error", msg != null ? msg : "unknown");
        notifyListeners("error", ret);
    }

    // 切后台就放开话筒：助手设备上系统唤醒词引擎要用它。网页端在 visibilitychange 里自己停、回前台再开。
    @Override
    protected void handleOnStop() {
        getBridge().execute(this::stopCapture);
        super.handleOnStop();
    }

    @Override
    protected void handleOnDestroy() {
        synchronized (loadWaiters) { loadWaiters.clear(); }
        stopCapture();
        if (model != null) {
            model.close();
            model = null;
        }
        super.handleOnDestroy();
    }
}
