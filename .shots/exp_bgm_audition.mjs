// 实验（不是闸门）：把背景音乐离线渲染成 WAV，方便在电脑上试听；同时量响度、分频段、连续性。
// 用法：[PET_GAME=_bgm_old.html] STYLE=focus|soft|lively [LEVEL=1] [SECS=40] [OUT=名字] node .shots/exp_bgm_audition.mjs
//   lively=旧口算版（需 PET_GAME 指向保留旧代码的副本，调用 BGM.start()）；focus / soft 用当前 index.html。
// 输出 .shots/out/bgm_audition/<OUT>.wav（单声道 16bit 44.1k）。为了公平试听，所有 WAV 归一到同一 RMS（0.1），
// 不代表游戏里的实际响度；实际响度看终端打印的 absRms（已含总增益，bgm 设置=3 档、关卡调不变时可直接比）。
import { petBrowser } from './pet_browser.mjs';
import fs from 'node:fs';
const b = await petBrowser();
const STYLE = process.env.STYLE || 'focus', LEVEL = Number(process.env.LEVEL || 1), SECS = Number(process.env.SECS || 40);
const OUT = process.env.OUT || `${STYLE}_L${LEVEL}`;
await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
  window.__acs = [];
  window.AudioContext = window.webkitAudioContext = function () {
    const c = new OfflineAudioContext(1, 44100 * ${SECS}, 44100); c.__osc = 0;
    const co = c.createOscillator.bind(c); c.createOscillator = function () { c.__osc++; return co(); };
    window.__acs.push(c); return c;
  };
})()` });
await b.nav(b.menu);
await b.boot(LEVEL, 'visual');
await b.ev(`localStorage.setItem('mathgameSettings', JSON.stringify({ sfx: 3, bgm: 3, voice: 3 })); BGM.stop(); true`);
await b.sleep(1300);
const call = STYLE === 'lively' ? 'BGM.start()' : `BGM.start('${STYLE}', ${LEVEL}, true)`;
await b.ev(`${call}; true`);
const t0 = Date.now();
const pre = await b.ev(`(() => { const dbg = BGM.debug(); if (!dbg.running) return { err: 'not running', dbg };
  const c = window.__acs.reduce((a, x) => (x.__osc > a.__osc ? x : a)); window.__rc = c; window.__rp = c.startRendering().then(x => { window.__rb = x; }); return { ok: 1 }; })()`);
if (pre.err) { console.log('ERR', JSON.stringify(pre)); await b.close(); process.exit(1); }
await b.poll('!!window.__rb', 240000);
console.log('渲染用时', Date.now() - t0, 'ms');
const r = await b.ev(`(async () => {
  const dbg = BGM.debug(), c = window.__rc;
  const buf = window.__rb;
  const d = buf.getChannelData(0), sr = buf.sampleRate, full = dbg.full;
  const off = sr * 2, N = 1 << 19;
  const re = new Float64Array(N), im = new Float64Array(N);
  let w2 = 0;
  for (let i = 0; i < N; i++) { const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)); re[i] = d[off + i] * w; w2 += w * w; }
  w2 /= N;
  for (let i = 1, j = 0; i < N; i++) { let bit = N >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { const t = re[i]; re[i] = re[j]; re[j] = t; } }
  for (let len = 2; len <= N; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < N; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, bb = i + k + len / 2;
        const xr = re[bb] * cr - im[bb] * ci, xi = re[bb] * ci + im[bb] * cr;
        re[bb] = re[a] - xr; im[bb] = im[a] - xi; re[a] += xr; im[a] += xi;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
  const edges = [0, 250, 1000, 3400, 1e9], band = [0, 0, 0, 0];
  for (let k = 1; k < N / 2; k++) { const f = k * sr / N; let bi = 0; while (f >= edges[bi + 1]) bi++; band[bi] += re[k] * re[k] + im[k] * im[k]; }
  const bandRms = band.map(p => Math.sqrt(2 * p / (N * N * w2)));
  let ss = 0, peak = 0;
  for (let i = off; i < off + N; i++) { ss += d[i] * d[i]; if (Math.abs(d[i]) > peak) peak = Math.abs(d[i]); }
  const rms = Math.sqrt(ss / N);
  const W = Math.round(sr * 0.1), wins = [];
  for (let s = off; s + W <= off + N; s += W) { let q = 0; for (let i = s; i < s + W; i++) q += d[i] * d[i]; wins.push(Math.sqrt(q / W)); }
  const mean = wins.reduce((x, y) => x + y, 0) / wins.length;
  const gain = rms > 0 ? Math.min(0.1 / rms, 0.95 / peak) : 1;
  const pcm = new Int16Array(d.length);
  for (let i = 0; i < d.length; i++) pcm[i] = Math.max(-32768, Math.min(32767, Math.round(d[i] * gain * 32767)));
  const u8 = new Uint8Array(pcm.buffer); let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  window.__bin = s;
  return { full, absRms: rms, absPeak: peak, bandRms, quiet: wins.filter(x => x < mean * 0.35).length / wins.length, osc: c.__osc, sr, gain, n: s.length };
})()`);
if (r.err) { console.log('ERR', JSON.stringify(r)); await b.close(); process.exit(1); }
const parts = [];
for (let i = 0; i < r.n; i += 300000) parts.push(await b.ev(`btoa(window.__bin.slice(${i}, ${Math.min(r.n, i + 300000)}))`));
const pcm = Buffer.concat(parts.map(p => Buffer.from(p, 'base64'))), hdr = Buffer.alloc(44);
hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write('WAVEfmt ', 8); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(1, 22);
hdr.writeUInt32LE(r.sr, 24); hdr.writeUInt32LE(r.sr * 2, 28); hdr.writeUInt16LE(2, 32); hdr.writeUInt16LE(16, 34); hdr.write('data', 36); hdr.writeUInt32LE(pcm.length, 40);
const dir = new URL('./out/bgm_audition/', import.meta.url);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(new URL(`${OUT}.wav`, dir), Buffer.concat([hdr, pcm]));
const f = x => +x.toFixed(4), tot = Math.sqrt(r.bandRms.reduce((a, x) => a + x * x, 0));
console.log(OUT, JSON.stringify({ full: f(r.full), absRms: f(r.absRms), absPeak: f(r.absPeak), '<250': f(r.bandRms[0] / tot), '250-1k': f(r.bandRms[1] / tot), '1k-3.4k': f(r.bandRms[2] / tot), '>3.4k': f(r.bandRms[3] / tot), quietFrac: f(r.quiet), osc: r.osc, wavGain: f(r.gain) }), '(频段为占总能量比例)');
await b.close();
