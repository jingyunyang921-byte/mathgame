// 真机验证：听算答对后 Bingo 先念完，下一题才开口。包一层真实 Tts.speak 记录起止（resolve 时刻=原生念完/被顶掉）。
// 前置：adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>；运行：PET_DEVICE=1 node .shots/verify_bingo_queue_device.mjs
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
if (!b.device) { console.log('请用 PET_DEVICE=1'); process.exit(0); }
await b.nav(b.menu);
await b.preserve();
const SPY = `(() => { window.__tts = []; mgIdleArm = function () {};   // 此脚本的时间线不该被「5 秒提示」插话（该功能另有 verify_idle_hint*）
  const T = Capacitor.Plugins.Tts; if (!T.__orig) { T.__orig = T.speak.bind(T);
    T.speak = function (a) { const r = { t: String(a.text), s: Date.now(), e: 0 }; window.__tts.push(r);
      const p = T.__orig(a); p.then(() => { r.e = Date.now(); }, () => { r.e = Date.now(); r.err = 1; }); return p; }; }
  window.__ding = [];
  if (!window.__askPatched) { window.__askPatched = true; const f = mgPlayAskChime;
    mgPlayAskChime = function () { const r = f.apply(this, arguments); if (r) window.__ding.push(Date.now()); return r; }; }
  return true; })()`;
const ANSWER = `(() => { const g = window._currentGame; const f = g._processVoiceAnswer || g._processVoiceResult; f.call(g, [{ transcript: String(g.currentAnswer) }]); return true; })()`;
for (const lv of [1, 3]) {
  await b.boot(lv, 'audio');
  await b.ev(SPY);
  await b.sleep(4500);
  await b.ev(`window.__tts.length = 0; window.__ding.length = 0; true`);
  await b.ev(ANSWER);
  await b.sleep(7000);
  const BL = await b.ev('MG_BINGO_LINES');
  const log = await b.ev(`window.__tts.map(r => ({ t: r.t, s: r.s, e: r.e, err: r.err || 0 }))`);
  const ding = await b.ev('window.__ding');
  console.log('L' + lv, JSON.stringify(log.map(r => ({ t: r.t, s: r.s - log[0].s, e: r.e ? r.e - log[0].s : 0 }))), 'dings', ding.length);
  const bingo = log.find(r => BL.includes(r.t)), next = log.find(r => !BL.includes(r.t));
  P(!!bingo && !!next, `真机 L${lv} 答对后先念短句再读题`, log.map(r => r.t));
  if (bingo && next) {
    P(next.s >= bingo.e - 30, `真机 L${lv} 下一题等短句念完才开口`, { lineMs: bingo.e - bingo.s, gapMs: next.s - bingo.e });
    P(ding.length === 1 && ding[0] >= next.e - 30, `真机 L${lv} 只在读完题后叮一声`, { dings: ding.length, afterQuestionEnd: ding[0] - next.e });
  }
}
// 方案 B 新音效：答错轻下行两音（不响嗡嗡声）、没听到数字提示音并按住麦克风约 450ms、失败结算下行小调。
// 只能验「触发了几次、起了几个振荡器、麦克风何时放开」，音量好不好听要亲耳听。
const SPY2 = `(() => { mgIdleArm = function () {}; window.__c = { soft: 0, nod: 0, lose: 0, buzz: 0 }; window.__resume = []; window.__osc = 0;
  if (!window.__cntPatched) { window.__cntPatched = true;
    const wrap = (name, key) => { const f = window[name]; window[name] = function () { window.__c[key]++; return f.apply(this, arguments); }; };
    wrap('mgPlayWrongSoft', 'soft'); wrap('mgPlayNoDigitCue', 'nod'); wrap('mgPlayLoseTune', 'lose'); wrap('playWrongSound', 'buzz');
    const o = AudioContext.prototype.createOscillator; AudioContext.prototype.createOscillator = function () { if (this === mgSfxCtx()) window.__osc++; return o.apply(this, arguments); }; }
  const g = window._currentGame; if (!g.__rp) { g.__rp = true; const r = g._ttsResume; g._ttsResume = function () { window.__resume.push(Date.now()); return r.apply(this, arguments); }; }
  return true; })()`;
const RESET2 = `window.__c.soft = window.__c.nod = window.__c.lose = window.__c.buzz = 0; window.__resume.length = 0; window.__osc = 0; true`;
const WRONG = `(() => { const g = window._currentGame; const f = g._processVoiceAnswer || g._processVoiceResult; f.call(g, [{ transcript: String(g.currentAnswer + 1) }]); return true; })()`;
const NODIGIT = `(() => { const g = window._currentGame; window.__nodAt = Date.now(); const f = g._processVoiceAnswer || g._processVoiceResult; f.call(g, [{ transcript: '嗯' }]); return true; })()`;
for (const lv of [1, 3]) {
  await b.boot(lv, 'audio');
  await b.ev(SPY2);
  await b.sleep(4500);
  await b.ev(RESET2);
  await b.ev(WRONG);
  await b.sleep(400);
  const w = { c: await b.ev('window.__c'), osc: await b.ev('window.__osc') };
  P(w.c.soft === 1 && w.c.buzz === 0 && w.osc === 2, `真机 L${lv} 答错响轻下行两音、不响嗡嗡声`, w);
  await b.poll(`window._currentGame._ttsSpeaking === false`, 9000).catch(() => {});
  await b.sleep(800);
  await b.ev(RESET2);
  await b.ev(NODIGIT);
  await b.sleep(100);
  const mid = await b.ev('window._currentGame._ttsSpeaking');
  await b.sleep(900);
  const n = { c: await b.ev('window.__c'), osc: await b.ev('window.__osc'), rs: (await b.ev('window.__resume')).map(t => t - 0), at: await b.ev('window.__nodAt') };
  P(n.c.nod === 1 && n.osc === 2 && mid === true, `真机 L${lv} 没听到数字：响提示音并按住麦克风`, { nod: n.c.nod, osc: n.osc, mid });
  const first = n.rs.length ? n.rs[0] - n.at : -1;
  P(first >= 400 && first <= 900, `真机 L${lv} 没听到数字：约 450ms 后放开麦克风`, { firstResumeMs: first });
}
{
  await b.boot(6, 'audio');
  await b.ev(SPY2);
  await b.sleep(3000);
  await b.ev(RESET2);
  await b.ev(`window._currentGame._endGame(false); true`);
  await b.poll(`window.__c.lose >= 1`, 8000).catch(() => {});
  await b.sleep(300);
  const l = { c: await b.ev('window.__c'), osc: await b.ev('window.__osc') };
  P(l.c.lose === 1 && l.osc === 4, '真机 L6 失败结算响下行小调', l);
}
// 方案 C（一直播放版）：听算背景音乐的话筒闸门。每 40ms 记「话筒开着 / 在念话 / 音乐真实增益」，
// 查：话筒真正开着（recognizing 且没在念话）时增益不超过压低档（full×duck）；念话时增益真的升到正常音量（音乐听得到）；
// 全程增益没掉到压低档以下（一直在放、没静音）。音量好不好听要亲耳听。
const WATCH = `(() => { window.__w = []; clearInterval(window.__wt);
  window.__wt = setInterval(() => { const g = window._currentGame, d = BGM.debug();
    window.__w.push({ rec: !!g.recognizing, spk: !!g._ttsSpeaking, gain: d.gain, full: d.full, duck: d.duck }); }, 40); return true; })()`;
for (const lv of [1, 3]) {
  await b.boot(lv, 'audio');
  await b.ev(SPY2);
  await b.sleep(5000);
  const d0 = await b.ev('BGM.debug()');
  P(d0.running && d0.soft && d0.state === 'running', `真机 L${lv} 听算起播柔和背景音乐`, d0);
  await b.ev(WATCH);
  await b.ev(`window._currentGame._speakQuestion(false); true`);
  await b.sleep(6500);
  await b.ev(WRONG);
  await b.sleep(6500);
  const w = await b.ev('window.__w');
  await b.ev('clearInterval(window.__wt); true');
  const full = w[0].full, cap = full * w[0].duck;
  const open = w.filter(s => s.rec && !s.spk), bad = open.filter(s => s.gain > cap * 1.15 + 0.0005);
  const loud = Math.max(0, ...w.filter(s => s.spk).map(s => s.gain));
  const low = Math.min(...w.map(s => s.gain));
  P(bad.length === 0 && open.length > 20, `真机 L${lv} 话筒开着时音乐不超过压低档`, { samples: w.length, micOpen: open.length, bad: bad.length, worst: Math.max(0, ...bad.map(s => s.gain)), cap });
  P(loud > cap * 1.8, `真机 L${lv} 读题 / 反馈时音乐回到正常音量`, { peakGainWhileSpeaking: loud, cap });
  P(low >= cap * 0.8, `真机 L${lv} 全程音乐没被静音`, { lowest: low, floor: cap * 0.8 });
}
await b.restore();
await b.close();
finish('DEVICE BINGO QUEUE');
