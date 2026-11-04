// 真机实验：背景音乐压在不同音量时，话筒还能不能听清「说话」。
// 用原生 TTS 直接念「三十六」当作声源（绕过游戏自己的 _mgSpeakNative，所以话筒一直开着、音乐停在压低档），
// 数识别出 36 的次数和首个识别结果的延迟。声源有两档音量（1.0 / 0.3），0.3 代表比扬声器近场更轻的小孩声音。
// 话筒开着时音乐增益 = 0.1 × bgmListen；出厂压低档 = bgmListen 0.8 → 0.08。
// 运行：PET_DEVICE=1 node .shots/exp_bgm_voice.mjs
import { petBrowser } from './pet_browser.mjs';
const b = await petBrowser();
if (!b.device) { console.log('请用 PET_DEVICE=1'); process.exit(0); }
await b.nav(b.menu);
await b.preserve();
await b.boot(1, 'audio');
await b.poll(`(() => { const g = window._currentGame; return !!g && g.recognizing && !g._ttsSpeaking; })()`, 40000);
await b.ev(`mgIdleArm = function () {}; mgIdleCancel(window._currentGame); true`);   // 实验期间不要被「5 秒提示」插话
await b.ev(`(() => { const g = window._currentGame; window.__ev = []; window.__ans = [];
  if (!g.__hk) { g.__hk = true;
    const sh = g._setVoiceHeard; g._setVoiceHeard = function (t) { if (t) window.__ev.push({ t: Date.now(), s: String(t) }); return sh.apply(this, arguments); };
    g._processVoiceAnswer = function (res) { window.__ans.push({ t: Date.now(), s: res && res[0] ? String(res[0].transcript) : '' }); }; }
  if (!window.__vt0) { window.__vt0 = voiceTuning; window.voiceTuning = function () { const o = window.__vt0(); if (window.__stress != null) o.bgmListen = window.__stress; return o; }; }
  return true; })()`);
const MUSIC = process.env.MUSIC ? JSON.parse(process.env.MUSIC) : [0, 0.4, 1, 4];   // bgmListen；话筒开着时增益 = 0.1 × 它
const VOICE = process.env.VOICE ? JSON.parse(process.env.VOICE) : [1.0, 0.3];
const N = Number(process.env.N || 5);
const res = {};
for (const vol of VOICE) {
  for (const m of [...MUSIC, ...MUSIC.slice().reverse()]) {
    await b.ev(`window.__stress = ${m}; BGM.refresh(); true`);
    await b.sleep(1500);
    const key = `voice${vol}|music${m}`;
    res[key] = res[key] || { hit: 0, n: 0, lat: [], wrong: 0 };
    for (let i = 0; i < N; i++) {
      await b.poll(`(() => { const g = window._currentGame; return g.recognizing && !g._ttsSpeaking; })()`, 8000).catch(() => {});
      await b.ev(`(() => { const g = window._currentGame; g._ttsEndTime = 0; g._interimFired = false; window.__ev.length = 0; window.__ans.length = 0; window.__t0 = Date.now();
        Capacitor.Plugins.Tts.speak({ text: '三十六', rate: 1.0, volume: ${vol}, lang: 'zh-CN' }).catch(() => {}); return true; })()`);
      await b.sleep(3800);
      const r = await b.ev(`({ ev: window.__ev, ans: window.__ans, t0: window.__t0 })`);
      if (process.env.DUMP) console.log("  raw", JSON.stringify({ ev: r.ev.map(e => e.s + "@" + (e.t - r.t0)), ans: r.ans.map(a => a.s + "@" + (a.t - r.t0)) }));
      const hit = r.ans.find(a => /三十六|36/.test(a.s));
      res[key].n++;
      if (hit) { res[key].hit++; res[key].lat.push(hit.t - r.t0); } else if (r.ans.length || r.ev.length) res[key].wrong++;
      await b.sleep(400);
    }
    console.log(key, JSON.stringify(res[key]));
  }
}
console.log('汇总：');
for (const k of Object.keys(res)) console.log(k, `${res[k].hit}/${res[k].n}`, 'wrong=' + res[k].wrong, 'avgLatMs=' + (res[k].lat.length ? Math.round(res[k].lat.reduce((a, x) => a + x, 0) / res[k].lat.length) : '-'));
await b.restore();
await b.close();
