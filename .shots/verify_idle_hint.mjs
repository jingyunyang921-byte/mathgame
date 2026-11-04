// 听算「5 秒没作答」提示：任何一句话念完后开始计时（题目 / 答错短句），5 秒没动静念一句短提示，每题最多一次；
// 提示不叮；又开口说话 / 孩子出声（识别到非空结果）/ 换题 / 离场 / 游戏结束都作废；L5 没有话筒，换成点门的说法；
// 速算、视算、音效/语音关了都不提示。本地给 Capacitor 打桩成原生环境，Tts.speak 按时长 resolve 的 Promise。真机另有脚本。
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
if (b.device) { console.log('本脚本只在本地跑（桩 Tts）'); process.exit(0); }

const STUB = `(() => {
  if (window.__ttsStub) return; window.__ttsStub = true;
  window.__tts = []; let active = null;
  const isFb = t => typeof MG_BINGO_LINES !== 'undefined' && (MG_BINGO_LINES.includes(t) || MG_WRONG_LINES.includes(t));
  const dur = t => isFb(t) ? 1800 : 700;
  const finish = (r, cut) => { if (!r || r.end) return; r.end = Date.now(); r.cut = !!cut; r.res(); };
  window.Capacitor = { isNativePlatform: () => true, Plugins: { Tts: {
    speak(a) {
      const r = { t: String(a.text), start: Date.now(), end: 0, cut: false };
      if (active) finish(active, true);
      window.__tts.push(r); active = r;
      return new Promise(res => { r.res = res; setTimeout(() => { if (active === r) active = null; finish(r, false); }, dur(r.t)); });
    },
    stop() { if (active) { finish(active, true); active = null; } return Promise.resolve(); }
  } } };
})()`;
const SPY = `(() => { window.__ding = []; window.__resume = [];
  if (!window.__askPatched) { window.__askPatched = true; const f = mgPlayAskChime;
    mgPlayAskChime = function () { const r = f.apply(this, arguments); if (r) window.__ding.push(Date.now()); return r; }; }
  const g = window._currentGame;
  if (!g.__rp) { g.__rp = true; const r = g._ttsResume; g._ttsResume = function () { window.__resume.push(Date.now()); return r.apply(this, arguments); }; }
  return true; })()`;
const LOG = `window.__tts.map(r => ({ t: r.t, s: r.start, e: r.end, cut: r.cut }))`;
const WRONG = `(() => { const g = window._currentGame; const f = g._processVoiceAnswer || g._processVoiceResult; f.call(g, [{ transcript: String(g.currentAnswer + 1) }]); return true; })()`;
const ANSWER = `(() => { const g = window._currentGame; const f = g._processVoiceAnswer || g._processVoiceResult; f.call(g, [{ transcript: String(g.currentAnswer) }]); return true; })()`;
const DOOR_OK = `(() => { const g = window._currentGame; g._choose(g.choices.find(d => d.value === g.currentAnswer)); return true; })()`;
const idle = async () => { for (let i = 0; i < 40; i++) { if (await b.ev(`(() => { const t = window.__tts, l = t[t.length - 1]; return !l || !!l.end; })()`)) return; await b.sleep(150); } };
const until = async (t) => { const d = t - Date.now(); if (d > 0) await b.sleep(d); };

await b.send('Page.addScriptToEvaluateOnNewDocument', { source: STUB });
await b.nav(b.menu);
await b.preserve();
await b.ev(`localStorage.setItem('mathgameSettings', JSON.stringify({ sfx: 3, bgm: 0, voice: 3 })); true`);

// 开局：等首题念完，返回「最后一句念完的时刻」和此刻的日志条数
const settle = async (lv) => {
  await b.boot(lv, 'audio');
  await b.ev(SPY);
  await b.sleep(1500); await idle(); await b.sleep(200);
  const log = await b.ev(LOG);
  return { tEnd: log[log.length - 1].e, n: log.length, log };
};
const POOL = await (async () => { await b.boot(1, 'audio'); return b.ev('({ voice: MG_IDLE_LINES, tap: MG_IDLE_TAP_LINES, ms: MG_IDLE_MS })'); })();
P(POOL.ms === 5000 && POOL.voice.length >= 2 && POOL.tap.length >= 2 && [...POOL.voice, ...POOL.tap].every(s => s.length <= 12), '提示句池：5 秒、短句（≤12 字）', POOL);
{
  const r = await b.ev(`(() => { const out = []; for (let i = 0; i < 200; i++) out.push(mgPickLine('idle', MG_IDLE_LINES));
    return { inPool: out.every(s => MG_IDLE_LINES.includes(s)), repeat: out.some((s, i) => i && s === out[i - 1]) }; })()`);
  P(r.inPool && !r.repeat, '提示句轮换：在池里、不连续重复', r);
}

// 六关：5 秒才提示、一题一次、不叮、提示后开麦、答对进下一题后再提示一次
for (const lv of [1, 2, 3, 4, 5, 6]) {
  const { tEnd, n } = await settle(lv);
  const tap = lv === 5;
  const mic = await b.ev(`!!window._currentGame.recognition`);
  P(mic === !tap, `L${lv} ${tap ? '没有话筒' : '有识别器'}`, mic);
  const dings0 = (await b.ev('window.__ding')).length, res0 = (await b.ev('window.__resume')).length;
  P(Date.now() < tEnd + 4000, `L${lv} 起点在读完题 4 秒内（测量前提）`, Date.now() - tEnd);
  await until(tEnd + 4300);
  P((await b.ev(LOG)).length === n, `L${lv} 读完题 4.3 秒时还没提示`);
  await until(tEnd + 6200);
  let log = await b.ev(LOG);
  const hint = log[n];
  P(log.length === n + 1 && !!hint, `L${lv} 5 秒后念了一句提示`, log.slice(n).map(r => r.t));
  if (hint) {
    P((tap ? POOL.tap : POOL.voice).includes(hint.t), `L${lv} 提示句来自${tap ? '点门' : '开口'}句池`, hint.t);
    P(hint.s - tEnd >= 4700 && hint.s - tEnd <= 5800, `L${lv} 提示在读完题约 5 秒后`, hint.s - tEnd);
    P(!hint.cut, `L${lv} 提示完整念完`);
  }
  P((await b.ev('window.__ding')).length === dings0, `L${lv} 提示不叮`);
  P((await b.ev('window.__resume')).length === res0 + 1, `L${lv} 提示念完后放开麦克风一次`, (await b.ev('window.__resume')).length - res0);
  await until(tEnd + 12500);
  P((await b.ev(LOG)).length === n + 1, `L${lv} 同一题再等 6 秒也不再提示（一题一次）`);
  if (lv === 1 || lv === 5) {
    // 答对 → 短句 → 下一题读完 → 再等 5 秒：新题又有一次提示
    await b.ev(lv === 5 ? DOOR_OK : ANSWER);
    await b.poll(`(() => { const t = window.__tts; return t.length >= ${n + 3} && !!t[t.length - 1].end; })()`, 9000).catch(() => {});
    log = await b.ev(LOG);
    const q2 = log[log.length - 1], n2 = log.length;
    await until(q2.e + 6200);
    log = await b.ev(LOG);
    P(log.length === n2 + 1 && (tap ? POOL.tap : POOL.voice).includes(log[n2].t), `L${lv} 下一题读完后又提示一次`, log.slice(n2 - 1).map(r => r.t));
  }
}

// 孩子出声（识别到非空结果）→ 取消
{
  const { tEnd, n } = await settle(1);
  await until(tEnd + 2000);
  await b.ev(`(() => { const g = window._currentGame; const res = Object.assign([{ transcript: '嗯' }], { isFinal: false });
    try { g.recognition.onresult({ resultIndex: 0, results: [res] }); } catch (e) {} return true; })()`);
  P(await b.ev('!window._currentGame._idleTimer'), 'L1 识别到孩子出声：提示计时作废');
  await until(tEnd + 7500);
  P((await b.ev(LOG)).length === n, 'L1 孩子出过声就不再提示');
}
// 手动「再听一遍」：重新计时，原来的 5 秒作废
{
  const { tEnd, n } = await settle(1);
  await until(tEnd + 3000);
  await b.ev(`window._currentGame._speakQuestion(); true`);
  await until(tEnd + 7500);
  let log = await b.ev(LOG);
  P(log.length === n + 1, 'L1 再听一遍后，原来的 5 秒作废（7.5 秒时只有那一遍）', log.slice(n).map(r => r.t));
  await until(tEnd + 10800);
  log = await b.ev(LOG);
  P(log.length === n + 2 && POOL.voice.includes(log[n + 1].t), 'L1 再听一遍念完后 5 秒才提示', log.slice(n).map(r => r.t));
  P(log.length === n + 2 && log[n + 1].s - log[n].e >= 4700, 'L1 提示距再听一遍念完约 5 秒', log.length > n + 1 ? log[n + 1].s - log[n].e : null);
}
// 答错：答错短句念完后重新计时，这一题还没提示过，所以还会提示一次
{
  const { n } = await settle(1);
  await b.ev(WRONG);
  await b.poll(`(() => { const t = window.__tts; return t.length >= ${n + 1} && !!t[t.length - 1].end; })()`, 6000).catch(() => {});
  let log = await b.ev(LOG);
  const w = log[n], tW = w && w.e;
  P(!!w && (await b.ev('MG_WRONG_LINES')).includes(w.t), 'L1 答错念了答错短句', log.slice(n).map(r => r.t));
  await until(tW + 4300);
  P((await b.ev(LOG)).length === n + 1, 'L1 答错短句念完 4.3 秒时还没提示');
  await until(tW + 6200);
  log = await b.ev(LOG);
  P(log.length === n + 2 && POOL.voice.includes(log[n + 1].t) && log[n + 1].s - tW >= 4700, 'L1 答错后仍提示一次（距短句念完约 5 秒）', log.slice(n).map(r => r.t));
}
// 游戏结束 → 不提示
{
  const { tEnd, n } = await settle(1);
  await until(tEnd + 1000);
  await b.ev(`window._currentGame.gameEnded = true; true`);
  await until(tEnd + 6500);
  P((await b.ev(LOG)).length === n, 'L1 游戏结束后不提示');
}
// 条件开关：直接调 mgIdleArm 看会不会起计时
{
  await settle(1);
  const probe = (setup, undo) => b.ev(`(() => { const g = window._currentGame; ${setup}; mgIdleArm(g); const armed = !!g._idleTimer; mgIdleCancel(g); ${undo}; return armed; })()`);
  P(await probe('', '') === true, '对照：正常状态会起计时');
  P(await probe('g.__s = g.sprint; g.sprint = true', 'g.sprint = g.__s') === false, '速算(sprint)不提示');
  P(await probe('g.__m = g.mode; g.mode = "visual"', 'g.mode = g.__m') === false, '视算不提示');
  P(await probe('g.gameEnded = true', 'g.gameEnded = false') === false, '游戏已结束不提示');
  P(await probe('g.locked = true', 'g.locked = false') === false, '锁定中（倒计时/过场）不提示');
  P(await probe('g.__q = g.currentQuestion; g.currentQuestion = ""', 'g.currentQuestion = g.__q') === false, '没有题目不提示');
  P(await probe('g._hintQ = g.currentQuestion', 'g._hintQ = null') === false, '这题已提示过不再提示');
  await b.ev(`localStorage.setItem('mathgameSettings', JSON.stringify({ sfx: 3, bgm: 0, voice: 0 })); true`);
  P(await probe('', '') === false, '语音开关关了不提示');
  await b.ev(`localStorage.setItem('mathgameSettings', JSON.stringify({ sfx: 3, bgm: 0, voice: 3 })); true`);
  // 题目变了：已排上的计时到点也不念
  await b.ev(`(() => { const g = window._currentGame; mgIdleArm(g); g.currentQuestion = g.currentQuestion + "（换题）"; return true; })()`);
  const n = (await b.ev(LOG)).length;
  await b.sleep(5600);
  P((await b.ev(LOG)).length === n, '计时期间换了题，到点不念旧题的提示');
  // 离场：_mgSafeLeave 取消计时
  await b.ev(`(() => { const g = window._currentGame; g.currentQuestion = "1 加 1 等于"; g.gameEnded = false; g.locked = false; mgIdleArm(g); return !!g._idleTimer; })()`);
  await b.ev(`(() => { _mgSafeLeave(window._currentGame, () => {}); return true; })()`);
  P(await b.ev('!window._currentGame._idleTimer'), '离场时取消计时');
}

await b.restore();
P(b.errors.length === 0, '无页面脚本异常', b.errors.slice(0, 3));
await b.close();
finish('IDLE HINT');
