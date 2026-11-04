// 实验（不是闸门）：把听算柔和背景音乐离线渲染一个 12s 循环，量总 RMS、分频段 RMS、连续性（短窗口 RMS 分布）。
// 所有数值都除以 BGM 的满格增益（debug().full），所以是「进总增益之前」的幅度，新旧版可直接比。
// 用法：PET_GAME=_bgm_old.html node .shots/exp_bgm_render.mjs [关卡,默认1]   （PET_GAME 默认 index.html）
import { petBrowser } from './pet_browser.mjs';
const b = await petBrowser();
const level = Number(process.argv[2] || 1);
await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
  window.__acs = [];
  window.AudioContext = window.webkitAudioContext = function () {
    const c = new OfflineAudioContext(1, 44100 * 16, 44100); c.__osc = 0;
    const co = c.createOscillator.bind(c); c.createOscillator = function () { c.__osc++; return co(); };
    window.__acs.push(c); return c;
  };
})()` });
await b.nav(b.menu);
await b.boot(level, 'visual');
await b.ev(`localStorage.setItem('mathgameSettings', JSON.stringify({ sfx: 3, bgm: 3, voice: 3 })); BGM.stop(); true`);
await b.sleep(1300);                       // stop() 800ms 后才拆旧节点，要等它拆完再起柔和版
await b.ev(`BGM.start('soft', ${level}, true); true`);
const st = await b.ev(`(async () => {
  const dbg = BGM.debug();
  if (!dbg.running || !dbg.soft) return { err: 'not running soft', dbg };
  const c = window.__acs.reduce((a, x) => (x.__osc > a.__osc ? x : a));
  const buf = await c.startRendering();
  const d = buf.getChannelData(0), sr = buf.sampleRate, full = dbg.full;
  const N = 1 << 19, off = sr * 2;
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
  const bandRms = band.map(p => Math.sqrt(2 * p / (N * N * w2)) / full);
  let ss = 0, peak = 0;
  for (let i = off; i < off + N; i++) { ss += d[i] * d[i]; if (Math.abs(d[i]) > peak) peak = Math.abs(d[i]); }
  const rms = Math.sqrt(ss / N) / full;
  const W = Math.round(sr * 0.1), wins = [];
  for (let s = off; s + W <= off + N; s += W) { let q = 0; for (let i = s; i < s + W; i++) q += d[i] * d[i]; wins.push(Math.sqrt(q / W) / full); }
  const sorted = wins.slice().sort((x, y) => x - y), mean = wins.reduce((x, y) => x + y, 0) / wins.length;
  const pct = p => sorted[Math.floor(p * (sorted.length - 1))];
  return { rms, peak: peak / full, bandRms, p10: pct(0.1), p50: pct(0.5), p90: pct(0.9), quiet: wins.filter(x => x < mean * 0.35).length / wins.length, osc: c.__osc };
})()`);
if (st.err) { console.log("ERR", JSON.stringify(st)); await b.close(); process.exit(1); }
const f = x => +x.toFixed(4);
console.log(process.env.PET_GAME || 'index.html', 'L' + level, JSON.stringify({
  rms: f(st.rms), peak: f(st.peak), '<250': f(st.bandRms[0]), '250-1k': f(st.bandRms[1]), '1k-3.4k': f(st.bandRms[2]), '>3.4k': f(st.bandRms[3]),
  p10: f(st.p10), p50: f(st.p50), p90: f(st.p90), quietFrac: f(st.quiet), osc: st.osc }));
await b.close();
