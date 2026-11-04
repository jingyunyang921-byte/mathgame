// 真机实验（不是闸门）：新柔和背景音乐的哪一层最容易被 Vosk 听成数字。
// 关掉游戏自己的 BGM，在页面里另起一个 AudioContext，按同样的和弦/琶音/旋律排程，只开指定层，增益固定在「话筒开着」档（默认 0.08）。
// 每个配置量 25s：识别框收到的非空文字条数、被判成答案的次数。none 是对照。两轮顺序相反。
// 数组=[pad,arp,mel 各层音量倍数, 可选第4项=该配置的总增益]。运行：PET_DEVICE=1 [GAIN=0.08] [SECS=25] [CONFIGS='{"all":[1,1,1],"pad":[1,0,0]}'] node .shots/exp_bgm_layers.mjs   （数组=[pad,arp,mel]）
import { petBrowser } from './pet_browser.mjs';
const b = await petBrowser();
if (!b.device) { console.log('请用 PET_DEVICE=1'); process.exit(0); }
await b.nav(b.menu);
await b.preserve();
await b.boot(1, 'audio');
await b.poll(`(() => { const g = window._currentGame; return !!g && g.recognizing && !g._ttsSpeaking; })()`, 40000);
await b.ev(`mgIdleArm = function () {}; mgIdleCancel(window._currentGame); BGM.stop(); true`);
await b.sleep(1300);
await b.ev(`(() => { const g = window._currentGame; window.__ev = []; window.__ans = [];
  if (!g.__hk) { g.__hk = true;
    const sh = g._setVoiceHeard; g._setVoiceHeard = function (t) { if (t) window.__ev.push(String(t)); return sh.apply(this, arguments); };
    g._processVoiceAnswer = function (res) { window.__ans.push(res && res[0] ? String(res[0].transcript) : ''); }; }
  return true; })()`);
const PLAYER = `(() => {
  if (window.__tp) return window.__tp.ac.state;
  const AC = window.AudioContext || window.webkitAudioContext, ac = new AC(), master = ac.createGain();
  master.gain.value = 0; master.connect(ac.destination);
  const st = n => 261.6256 * Math.pow(2, n / 12), nodes = [];
  const bell = (f, t, vol, tau, partial) => [[1, 1], [2, partial]].forEach(([m, a]) => {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f * m; o.connect(g); g.connect(master);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol * a, t + 0.012); g.gain.setTargetAtTime(0.0001, t + 0.012, tau);
    o.start(t); o.stop(t + tau * 8 + 0.1); nodes.push(o); });
  const pad = (f, t, dur, vol) => { const t0 = Math.max(t - 0.4, ac.currentTime), d = t + dur + 0.4 - t0;
    const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = f; o.connect(g); g.connect(master);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.8); g.gain.setValueAtTime(vol, t0 + d - 0.9); g.gain.linearRampToValueAtTime(0, t0 + d);
    o.start(t0); o.stop(t0 + d + 0.02); nodes.push(o); };
  const CH = [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]], ARP = [0, 1, 2, 1, 0, 1, 2, 1];
  const MEL = [[0, 659.255], [2, 783.991], [3, 659.255], [4, 587.33], [6, 523.251], [8, 440], [10, 523.251], [11, 587.33], [12, 659.255], [14, 587.33],
    [16, 440], [18, 523.251], [19, 440], [20, 391.995], [22, 440], [24, 391.995], [26, 587.33], [28, 659.255]];
  window.__tp = { ac,
    stop() { master.gain.cancelScheduledValues(ac.currentTime); master.gain.value = 0; nodes.splice(0).forEach(o => { try { o.stop(); } catch (e) {} }); },
    play(cfg, gain, loops) { this.stop(); ac.resume(); const step = 12 / 32, base = ac.currentTime + 0.15;
      master.gain.value = cfg[3] != null ? cfg[3] : gain;
      for (let L = 0; L < loops; L++) { const b0 = base + L * 12;
        CH.forEach((ch, ci) => { const t0 = b0 + ci * 8 * step;
          if (cfg[0]) ch.forEach(n => pad(st(n), t0, 8 * step, 0.06 * cfg[0]));
          if (cfg[1]) for (let s = 0; s < 8; s++) bell(st(ch[ARP[s]] + 24), t0 + s * step, (s % 4 === 0 ? 0.17 : 0.1) * cfg[1], 0.16, 0.12); });
        if (cfg[2]) MEL.forEach(([i, f]) => bell(f * 2, b0 + i * step, 0.4 * cfg[2], 0.2, 0.18)); } } };
  return ac.state; })()`;
console.log('AudioContext 状态 =', await b.ev(PLAYER));
const CONFIGS = process.env.CONFIGS ? JSON.parse(process.env.CONFIGS)
  : { all: [1, 1, 1], pad: [1, 0, 0], arp: [0, 1, 0], mel: [0, 0, 1], none: [0, 0, 0] };
const GAIN = Number(process.env.GAIN || 0.08), SECS = Number(process.env.SECS || 25) * 1000;
const names = Object.keys(CONFIGS), rows = [];
const REPS = Number(process.env.REPS || 2);
let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const shuffled = () => { const a = names.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
for (let rep = 0; rep < REPS; rep++) {
  const order = rep % 2 ? names.slice().reverse() : shuffled();
  for (const k of order) {
    await b.ev(`window.__tp.play(${JSON.stringify(CONFIGS[k])}, ${GAIN}, 4); true`);
    await b.sleep(2500);
    await b.ev(`window.__ev.length = 0; window.__ans.length = 0; true`);
    await b.sleep(SECS);
    const r = await b.ev(`({ ev: window.__ev.slice(), ans: window.__ans.slice(), st: window.__tp.ac.state })`);
    rows.push({ k, heard: r.ev.length, answers: r.ans.length, sample: r.ev.slice(0, 4), st: r.st });
    console.log(JSON.stringify(rows[rows.length - 1]));
  }
}
const by = {};
for (const r of rows) { by[r.k] = by[r.k] || { heard: 0, answers: 0, winHit: 0, n: 0 }; by[r.k].winHit += r.heard > 0 ? 1 : 0; by[r.k].heard += r.heard; by[r.k].answers += r.answers; by[r.k].n++; }
console.log(`汇总（增益 ${GAIN}，REPS 轮合计）：`, JSON.stringify(by));
await b.ev(`window.__tp.stop(); true`);
await b.restore();
await b.close();
