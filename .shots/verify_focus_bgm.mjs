// 闸门：口算（视算 / 速算）背景音乐「专注版」。本地用 OfflineAudioContext 桩记录每个振荡器的类型 / 频率 / 起音时刻；真机验起播后真实增益。
// 本地：node .shots/verify_focus_bgm.mjs    真机：PET_DEVICE=1 node .shots/verify_focus_bgm.mjs
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
if (!b.device) {
  await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
    window.__rec = [];
    window.AudioContext = window.webkitAudioContext = function () {
      const c = new OfflineAudioContext(1, 44100 * 5, 44100);
      const mk = (kind, orig) => function () { const o = orig(); const r = { kind, o, t: null }; window.__rec.push(r);
        const st = o.start.bind(o); o.start = function (t) { r.t = t; return st(t); }; return o; };
      c.createOscillator = mk('osc', c.createOscillator.bind(c));
      c.createBufferSource = mk('noise', c.createBufferSource.bind(c));
      return c;
    };
  })()` });
}
await b.nav(b.menu);
await b.preserve();
await b.boot(1, 'visual');
const SET = v => b.ev(`localStorage.setItem('mathgameSettings', JSON.stringify({ sfx: 3, bgm: ${v}, voice: 3 })); true`);
const RESTART = async (game) => { await b.ev('BGM.stop(); true'); await b.sleep(1000); return b.ev(`window.__rec && (window.__rec.length = 0); mgBgmStart(${game}); BGM.debug()`); };

if (b.device) {
  await SET(3);
  const d0 = await RESTART('window._currentGame');
  P(d0.running && d0.style === 'focus' && !d0.soft, '真机 L1 视算起播的是专注版', d0);
  await b.sleep(2200);
  const d = await b.ev('BGM.debug()');
  P(d.state === 'running' && d.gain > d.full * 0.9 && d.gain < d.full * 1.1, '真机 起播 2 秒后增益到位（没被静音也没超出）', d);
  await b.sleep(10000);
  const d2 = await b.ev('BGM.debug()');
  P(d2.running && d2.state === 'running' && d2.gain > d2.full * 0.9, '真机 再过 10 秒仍在放（循环衔接不断档）', d2);
  await b.ev('BGM.stop(); true');
} else {
  await SET(3);
  const REC = () => b.ev(`window.__rec.filter(r => r.t != null).map(r => ({ k: r.kind, type: r.kind === 'osc' ? r.o.type : 'noise', f: r.kind === 'osc' ? r.o.frequency.value : 0, t: r.t }))`);
  const d1 = await RESTART('{ mode: "visual", level: 1 }');
  P(d1.running && d1.style === 'focus' && !d1.soft, 'L1 视算：起播专注版', d1);
  P(Math.abs(d1.full - 0.36) < 1e-9, '总增益档 = 0.36 × 音量档（高于听算正常档的 0.2）', d1.full);
  const r1 = await REC(), osc1 = r1.filter(x => x.k === 'osc');
  P(osc1.length > 100, '排出了足够多的音符', osc1.length);
  P(osc1.every(x => x.type === 'sine' || x.type === 'triangle'), '音色只有音乐盒（正弦）和垫底（三角波），没有方波 / 锯齿', [...new Set(osc1.map(x => x.type))]);
  const fmax = Math.max(...osc1.map(x => x.f)), fmin = Math.min(...osc1.map(x => x.f));
  P(fmax < 2500 && fmin > 110, '音高在 110~2500Hz（没有刺耳高频 / 底鼓低频）', { fmin: +fmin.toFixed(1), fmax: +fmax.toFixed(1) });
  const bells = osc1.filter(x => x.type === 'sine');
  P(bells.every(x => { const q = (x.t - 0.05) / 0.3; return Math.abs(q - Math.round(q)) < 1e-6; }), '所有音乐盒音都落在 0.3 秒（100bpm 八分音符）格子上');
  const span = Math.max(...r1.map(x => x.t)) - Math.min(...r1.filter(x => x.t > 0.1).map(x => x.t));
  P(span > 19.2 * 1.8 && span < 19.2 * 2 + 0.5, '一次排两遍 19.2 秒的循环', +span.toFixed(2));
  P(r1.length < 14 * 38.4, '每秒不超过 14 个音（旧版约 29 个）', +(r1.length / 38.4).toFixed(1));
  P(r1.filter(x => x.k === 'noise').length === 32, '沙锤只在 2、4 拍：8 小节 × 2 × 2 遍 = 32', r1.filter(x => x.k === 'noise').length);
  // 关卡调：同一首，频率整体乘 2^(半音/12)
  const sorted = a => a.filter(x => x.k === 'osc').map(x => x.f).sort((p, q) => p - q);
  const base = sorted(r1);
  for (const [lv, semi] of [[0, 0], [2, 2], [5, 5], [6, -5]]) {
    await RESTART(`{ mode: "visual", level: ${lv} }`);
    const f = sorted(await REC()), want = Math.pow(2, semi / 12);
    P(f.length === base.length && f.every((x, i) => Math.abs(x / base[i] / want - 1) < 2e-5), `关卡 ${lv}：整首移 ${semi} 个半音（速算=第 0 关同 L1 的调）`, { n: f.length });
  }
  // 听算 / 开关不受影响
  const dA = await RESTART('{ mode: "audio", level: 1, _isNativeVoice: true, recognizing: false }');
  P(dA.running && dA.style === 'soft' && dA.soft, '原生语音听算仍是柔和版', dA);
  await b.ev('BGM.stop(); true'); await b.sleep(1000);
  await SET(0);
  const dO = await RESTART('{ mode: "visual", level: 1 }');
  P(dO.running === false, '背景音乐开关关了就不放', dO);
  await SET(3);
  await b.ev('BGM.stop(); true');
}
await b.restore();
P(b.errors.filter(e => !/cannot resume an offline context/.test(e)).length === 0, '无页面脚本异常', b.errors.slice(0, 3));
await b.close();
finish(b.device ? 'DEVICE FOCUS BGM' : 'FOCUS BGM');
