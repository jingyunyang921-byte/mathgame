package com.mathgame.app;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;

/**
 * 云端 TTS 的 mp3 末尾带 0.2~0.7 秒的全静音帧，MediaPlayer 要把它们播完才回调"读完了"。
 * 这里在不改文件的前提下算出"最后一个有声帧之后再留一帧"的字节数，播放时按这个长度截断。
 * 只认百度返回的 MPEG-2 Layer III 单声道，格式不符一律返回整文件长度（不截）。
 */
final class Mp3Tail {
    private static final int[] BITRATE_V2 = {0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160};
    private static final int[] SAMPLE_V2 = {22050, 24000, 16000};

    private Mp3Tail() { }

    static long keepBytes(File f) {
        long total = f.length();
        if (total <= 0 || total > 512 * 1024) return total;
        byte[] b = new byte[(int) total];
        try (FileInputStream in = new FileInputStream(f)) {
            int n = 0, r;
            while (n < b.length && (r = in.read(b, n, b.length - n)) > 0) n += r;
            if (n != b.length) return total;
        } catch (IOException e) {
            return total;
        }
        return keepBytes(b);
    }

    static long keepBytes(byte[] b) {
        long total = b.length;
        int pos = 0;
        if (b.length > 10 && b[0] == 'I' && b[1] == 'D' && b[2] == '3') {
            pos = 10 + (((b[6] & 0x7F) << 21) | ((b[7] & 0x7F) << 14) | ((b[8] & 0x7F) << 7) | (b[9] & 0x7F));
        }
        int lastVoicedEnd = -1, extraEnd = -1;
        while (pos + 4 <= b.length) {
            int h1 = b[pos + 1] & 0xFF, h2 = b[pos + 2] & 0xFF, h3 = b[pos + 3] & 0xFF;
            if ((b[pos] & 0xFF) != 0xFF || (h1 & 0xE0) != 0xE0) return total;
            int version = (h1 >> 3) & 3, layer = (h1 >> 1) & 3, bi = h2 >> 4, si = (h2 >> 2) & 3;
            boolean crc = (h1 & 1) == 0, mono = ((h3 >> 6) & 3) == 3;
            if (version != 2 || layer != 1 || bi == 0 || bi > 14 || si > 2 || !mono) return total;
            int len = 72 * BITRATE_V2[bi] * 1000 / SAMPLE_V2[si] + ((h2 >> 1) & 1);
            int bit = (pos + 4 + (crc ? 2 : 0)) * 8 + 9;
            if (len < 24 || pos + len > b.length) return total;
            int part23 = 0;
            for (int i = 0; i < 12; i++, bit++) part23 = (part23 << 1) | ((b[bit >> 3] >> (7 - (bit & 7))) & 1);
            if (part23 != 0) {
                lastVoicedEnd = pos + len;
                extraEnd = -1;
            } else if (lastVoicedEnd >= 0 && extraEnd < 0) {
                extraEnd = pos + len;
            }
            pos += len;
        }
        if (pos != b.length || lastVoicedEnd < 0 || extraEnd < 0) return total;
        return extraEnd;
    }
}
