// 真机实验（不是闸门）：话筒开着、没人说话时，背景音乐放在不同音量下，Vosk 会不会把它听成数字。
// 每档量 25s：识别框收到的非空文字条数、被判成答案的次数、话筒开着的时间占比。bgmListen=0 是对照（无音乐）。
// 话筒开着时音乐增益 = 0.1 × bgmListen（压低档 0.4 × 正常音量 0.25×bgmListen）。两轮顺序相反，抵消环境噪声漂移。
// 前置：adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>；运行：PET_DEVICE=1 node .shots/exp_bgm_mic.mjs
import { petBrowser } from './pet_browser.mjs';
const b = await petBrowser();
if (!b.device) { console.log('请用 PET_DEVICE=1'); process.exit(0); }
await b.nav(b.menu);
await b.preserve();
await b.boot(1, 'audio');
await b.poll(`(() => { const g = window._currentGame; return !!g && g.recognizing && !g._ttsSpeaking; })()`, 40000);
await b.ev(`mgIdleArm = function () {}; mgIdleCancel(window._currentGame); true`);   // 实验期间不要被「5 秒提示」插话
await b.ev(`(() => { const g = window._currentGame; window.__ev = []; window.__ans = []; window.__rec = [];
  if (!g.__hk) { g.__hk = true;
    const sh = g._setVoiceHeard; g._setVoiceHeard = function (t) { if (t) window.__ev.push(String(t)); return sh.apply(this, arguments); };
    g._processVoiceAnswer = function (res) { window.__ans.push(res && res[0] ? String(res[0].transcript) : ''); }; }
  clearInterval(window.__rt); window.__rt = setInterval(() => { window.__rec.push(g.recognizing && !g._ttsSpeaking ? 1 : 0); }, 200); return true; })()`);
// 阳性对照：往识别框灌一条假的「三十六」，确认钩子真的记得到、提交路径也通。
await b.ev(`(() => { const g = window._currentGame; g._ttsEndTime = 0; g._interimFired = false;
  g.recognition.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: '三十六' }], { isFinal: false })] }); return true; })()`);
await b.sleep(900);
console.log('阳性对照 heard/answers =', JSON.stringify(await b.ev(`({ ev: window.__ev, ans: window.__ans })`)));
// 压力档（STRESS=1）：绕过 0~1 的钳位，把 bgmListen 放到更大，找出音乐开始被听成数字的音量
if (process.env.STRESS) await b.ev(`(() => { if (!window.__vt0) { window.__vt0 = voiceTuning; window.voiceTuning = function () { const o = window.__vt0(); if (window.__stress != null) o.bgmListen = window.__stress; return o; }; } return true; })()`);
const ROUNDS = process.env.ORDER ? [JSON.parse(process.env.ORDER)] : process.env.STRESS ? [[2.5, 4, 8, 0]] : [[0, 0.2, 0.4, 0.6, 1.0], [1.0, 0.6, 0.4, 0.2, 0]];
const SECS = Number(process.env.SECS || 25) * 1000;
const rows = [];
for (const order of ROUNDS) {
  for (const v of order) {
    await b.ev(process.env.STRESS ? `window.__stress = ${v}; BGM.refresh(); true` : `setVoiceTuning({ bgmListen: ${v} }); BGM.refresh(); true`);
    await b.sleep(2500);
    await b.ev(`window.__ev.length = 0; window.__ans.length = 0; window.__rec.length = 0; true`);
    await b.sleep(SECS);
    const r = await b.ev(`({ ev: window.__ev.slice(), ans: window.__ans.slice(), mic: window.__rec.reduce((a, x) => a + x, 0) / Math.max(1, window.__rec.length), gain: BGM.debug().gain })`);
    rows.push({ v, micGain: +(0.1 * v).toFixed(3), heard: r.ev.length, answers: r.ans.length, sample: r.ev.slice(0, 4), micOpen: +r.mic.toFixed(2), gainNow: +r.gain.toFixed(3) });
    console.log(JSON.stringify(rows[rows.length - 1]));
  }
}
const by = {};
for (const r of rows) { by[r.v] = by[r.v] || { heard: 0, answers: 0, n: 0 }; by[r.v].heard += r.heard; by[r.v].answers += r.answers; by[r.v].n++; }
console.log('汇总（两轮合计，每档 50s）：', JSON.stringify(by));
await b.ev(`clearInterval(window.__rt); true`);
await b.restore();
await b.close();
