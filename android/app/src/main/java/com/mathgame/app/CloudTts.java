package com.mathgame.app;

import android.content.Context;
import android.net.Uri;
import android.provider.Settings;
import android.util.Log;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Map;
import java.util.TreeMap;

/** 小度AI老师云端音色：参数与签名沿用 TTsUtils（per=system，sign=md5(盐+排序参数)），音频落盘缓存；失败返回 null，由调用方回落系统 TTS。 */
final class CloudTts {
    private static final String TAG = "CloudTts";
    private static final long CACHE_CAP = 50L << 20;
    private static final long BACKOFF_MS = 20_000;

    private static final String BUNDLE_DIR = "tts_bundled";

    private final File dir;
    private final String cuid;
    private final android.content.res.AssetManager assets;
    private final java.util.Set<String> bundled = new java.util.HashSet<>();
    private volatile long downUntil = 0;

    static boolean configured() {
        return !BuildConfig.TTS_CLOUD_URL.isEmpty() && !BuildConfig.TTS_CLIENT_ID.isEmpty() && !BuildConfig.TTS_SALT.isEmpty();
    }

    CloudTts(Context ctx) {
        dir = new File(ctx.getCacheDir(), "tts_cloud");
        dir.mkdirs();
        String id = BuildConfig.TTS_CUID;
        if (id.isEmpty()) id = Settings.Secure.getString(ctx.getContentResolver(), Settings.Secure.ANDROID_ID);
        cuid = id == null ? "" : id;
        assets = ctx.getAssets();
        try {
            String[] names = assets.list(BUNDLE_DIR);
            if (names != null) bundled.addAll(Arrays.asList(names));
        } catch (java.io.IOException e) { /* 没有内置音频就全靠联网 */ }
    }

    private File cacheFile(String text) {
        boolean stream = BuildConfig.TTS_STREAM;
        return new File(dir, sha1(BuildConfig.TTS_SCENE + "|" + stream + "|" + text) + (stream ? ".wav" : ".snd"));
    }

    /** 返回可播放的音频文件；命中缓存不联网。 */
    File get(String text) { return get(text, false); }

    // background=true（预下载）失败时不设 20 秒退避，免得后台一次失败让前台正要念的句子也回落系统音。
    private File get(String text, boolean background) {
        boolean stream = BuildConfig.TTS_STREAM;
        File f = cacheFile(text);
        if (f.length() > 0) { f.setLastModified(System.currentTimeMillis()); return f; }
        if (installBundled(f)) return f;
        if (System.currentTimeMillis() < downUntil) return null;
        try {
            byte[] audio = stream ? fetchStream(text) : fetchPlain(text);
            File tmp = new File(dir, f.getName() + "." + Thread.currentThread().getId() + ".tmp");
            try (OutputStream o = new FileOutputStream(tmp)) { o.write(audio); }
            if (!tmp.renameTo(f)) throw new java.io.IOException("rename failed");
            trim();
            return f;
        } catch (Exception e) {
            if (!background) downUntil = System.currentTimeMillis() + BACKOFF_MS;
            Log.w(TAG, "cloud tts failed, fall back to system voice: " + e);
            return null;
        }
    }

    /** 安装包里自带的音频（固定短句 + L1/L2/L4/L5 题目）：缓存里没有时直接复制进缓存，不联网；复制失败当没有，走联网。 */
    private boolean installBundled(File f) {
        if (!bundled.contains(f.getName())) return false;
        File tmp = new File(dir, f.getName() + "." + Thread.currentThread().getId() + ".tmp");
        try (InputStream in = assets.open(BUNDLE_DIR + "/" + f.getName()); OutputStream o = new FileOutputStream(tmp)) {
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) o.write(buf, 0, n);
        } catch (Exception e) {
            tmp.delete();
            return false;
        }
        if (tmp.length() == 0 || !tmp.renameTo(f)) { tmp.delete(); return false; }
        return true;
    }

    /** 后台逐句预下载固定短句：已缓存的只刷新使用时间（不被淘汰），安装包自带的不用下载，第一次下载失败就停（没网时不空转）。返回新下载的句数。 */
    int prefetch(java.util.List<String> texts) {
        int fetched = 0, covered = 0, builtin = 0;
        for (String t : texts) {
            File f = cacheFile(t);
            boolean had = f.length() > 0;
            if (!had && bundled.contains(f.getName())) { covered++; builtin++; continue; }
            if (get(t, true) == null) break;
            covered++;
            if (!had) {
                fetched++;
                try { Thread.sleep(200); } catch (InterruptedException e) { break; }
            }
        }
        Log.i(TAG, "prefetch done: " + fetched + " new, " + covered + " of " + texts.size() + " cached (" + builtin + " in apk)");
        return fetched;
    }

    private TreeMap<String, String> params(String text) throws Exception {
        TreeMap<String, String> p = new TreeMap<>();
        Uri u = Uri.parse(BuildConfig.TTS_CLOUD_URL);
        for (String k : u.getQueryParameterNames()) p.put(k, u.getQueryParameter(k));
        p.put("clientId", BuildConfig.TTS_CLIENT_ID);
        p.put("cuid", cuid);
        p.put("per", "system");
        p.put("ts", String.valueOf(System.currentTimeMillis() / 1000));
        if (!p.containsKey("scene")) p.put("scene", BuildConfig.TTS_SCENE);
        if (BuildConfig.TTS_STREAM) p.put("stream", "true");
        p.put("text", text);
        StringBuilder s = new StringBuilder(BuildConfig.TTS_SALT);
        boolean first = true;
        for (Map.Entry<String, String> e : p.entrySet()) {
            if (!first) s.append('&');
            first = false;
            s.append(e.getKey()).append('=').append(e.getValue());
        }
        p.put("sign", hex(MessageDigest.getInstance("MD5").digest(s.toString().getBytes(StandardCharsets.UTF_8))));
        return p;
    }

    private static String baseOf(String url) {
        Uri u = Uri.parse(url);
        return u.getScheme() + "://" + u.getAuthority() + u.getPath();
    }

    private HttpURLConnection open(String url, String method) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setRequestMethod(method);
        c.setConnectTimeout(4000);
        c.setReadTimeout(10000);
        return c;
    }

    private byte[] fetchPlain(String text) throws Exception {
        StringBuilder q = new StringBuilder();
        for (Map.Entry<String, String> e : params(text).entrySet()) {
            if (q.length() > 0) q.append('&');
            q.append(URLEncoder.encode(e.getKey(), "UTF-8")).append('=').append(URLEncoder.encode(e.getValue(), "UTF-8").replace("+", "%20"));
        }
        String url = baseOf(BuildConfig.TTS_CLOUD_URL) + "?" + q;
        // 服务端把 https 请求 302 到 http 媒体地址；HttpURLConnection 不跟 https→http，且系统禁明文，所以手动跟并升回 https。
        for (int hop = 0; hop < 4; hop++) {
            HttpURLConnection c = open(url, "GET");
            c.setInstanceFollowRedirects(false);
            try {
                int code = c.getResponseCode();
                String loc = c.getHeaderField("Location");
                if (code >= 300 && code < 400 && loc != null) {
                    url = new URL(new URL(url), loc).toString().replaceFirst("^http:", "https:");
                    continue;
                }
                byte[] body = readAll(code < 400 ? c.getInputStream() : c.getErrorStream());
                String type = c.getContentType();
                boolean audio = type != null && (type.startsWith("audio") || type.contains("octet-stream"));
                if (code != 200 || !audio || body.length < 512) throw new java.io.IOException("http " + code + " " + type + " " + head(body));
                return body;
            } finally { c.disconnect(); }
        }
        throw new java.io.IOException("too many redirects");
    }

    private byte[] fetchStream(String text) throws Exception {
        HttpURLConnection c = open(baseOf(BuildConfig.TTS_CLOUD_URL), "POST");
        c.setDoOutput(true);
        c.setRequestProperty("content-type", "application/json");
        c.setRequestProperty("accept", "application/json, text/plain, */*");
        try {
            try (OutputStream o = c.getOutputStream()) { o.write(new JSONObject(params(text)).toString().getBytes(StandardCharsets.UTF_8)); }
            int code = c.getResponseCode();
            if (code != 200) throw new java.io.IOException("http " + code + " " + head(readAll(c.getErrorStream())));
            ByteArrayOutputStream pcm = new ByteArrayOutputStream();
            try (BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = r.readLine()) != null) {
                    if (!line.startsWith("data:")) continue;
                    JSONObject d = new JSONObject(line.substring(5).trim()).optJSONObject("data");
                    if (d == null || d.optInt("status") != 1) continue;
                    String h = d.optString("audio");
                    byte[] b = new byte[h.length() / 2];
                    for (int i = 0; i < b.length; i++) b[i] = (byte) Integer.parseInt(h.substring(2 * i, 2 * i + 2), 16);
                    pcm.write(b);
                }
            }
            if (pcm.size() < 512) throw new java.io.IOException("stream returned no audio");
            return wav(pcm.toByteArray());
        } finally { c.disconnect(); }
    }

    private static byte[] wav(byte[] pcm) {
        final int rate = 32000;
        java.nio.ByteBuffer b = java.nio.ByteBuffer.allocate(44 + pcm.length).order(java.nio.ByteOrder.LITTLE_ENDIAN);
        b.put("RIFF".getBytes()).putInt(36 + pcm.length).put("WAVEfmt ".getBytes()).putInt(16).putShort((short) 1).putShort((short) 1)
                .putInt(rate).putInt(rate * 2).putShort((short) 2).putShort((short) 16).put("data".getBytes()).putInt(pcm.length).put(pcm);
        return b.array();
    }

    private static byte[] readAll(InputStream in) throws java.io.IOException {
        if (in == null) return new byte[0];
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) > 0 && o.size() < (8 << 20)) o.write(buf, 0, n);
        in.close();
        return o.toByteArray();
    }

    private static String head(byte[] b) {
        return new String(b, 0, Math.min(b.length, 160), StandardCharsets.UTF_8).replaceAll("\\s+", " ");
    }

    private void trim() {
        File[] fs = dir.listFiles();
        if (fs == null) return;
        long total = 0;
        for (File x : fs) total += x.length();
        if (total <= CACHE_CAP) return;
        Arrays.sort(fs, (a, b) -> Long.compare(a.lastModified(), b.lastModified()));
        for (File x : fs) {
            if (total <= CACHE_CAP) break;
            total -= x.length();
            x.delete();
        }
    }

    private static String sha1(String s) {
        try { return hex(MessageDigest.getInstance("SHA-1").digest(s.getBytes(StandardCharsets.UTF_8))); }
        catch (Exception e) { return Integer.toHexString(s.hashCode()); }
    }

    private static String hex(byte[] d) {
        StringBuilder sb = new StringBuilder();
        for (byte x : d) sb.append(String.format("%02x", x));
        return sb.toString();
    }
}
