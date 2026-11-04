// 听算反馈音：答对短句要念完才轮到下一题/通关语；读完题「叮」一声、隔一拍才开麦；答对只响一串和弦；
// 末题不念短句；音效关了不响和弦也不叮；答错先响轻下行两音再念短句、不叮；没听到数字响轻提示音并按住麦克风约 450ms；
// 失败结算响温柔下行小调；手动「再听一遍」仍立刻顶掉；离场后排队的朗读不得再出声。
// 听算背景音乐（柔和版）：网页版不放；原生语音下一直在放，话筒开着时压低到约 0.4 倍，叮之前先压低、隔一拍才开麦；L5 没有话筒照常放；开关关了不放。
// 本地给 Capacitor 打桩成原生环境，Tts.speak 返回按时长 resolve 的 Promise，且和真机一样：新 speak 顶掉上一句并让它提前 resolve（记 cut）。
// PET_DEVICE=1 时不打桩，直接观察真机（此脚本只做本地）。
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
// 页面内探针：数音效上下文的振荡器（背景音乐用独立上下文，不计入；一串和弦=4 个，叮=2 个，答错轻下行=2 个，没听到数字=2 个，失败小调=4 个）、记叮的时刻、记「放开麦克风」的时刻，
// 并数各音效函数被调用的次数（__soft 答错轻音 / __nod 没听到数字 / __lose 失败小调 / __buzz 旧嗡嗡声）。
const SPY = `(() => { window.__osc = 0; window.__ding = []; window.__resume = []; window.__soft = window.__nod = window.__lose = window.__buzz = 0;
  if (!window.__oscPatched) { window.__oscPatched = true; const o = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function () { if (this === mgSfxCtx()) window.__osc++; return o.apply(this, arguments); }; }
  if (!window.__askPatched) { window.__askPatched = true; const f = mgPlayAskChime;
    mgPlayAskChime = function () { const r = f.apply(this, arguments); if (r) window.__ding.push(Date.now()); return r; }; }
  if (!window.__cntPatched) { window.__cntPatched = true;
    const wrap = (name, key) => { const f = window[name]; window[name] = function () { window[key]++; return f.apply(this, arguments); }; };
    wrap('mgPlayWrongSoft', '__soft'); wrap('mgPlayNoDigitCue', '__nod'); wrap('mgPlayLoseTune', '__lose'); wrap('playWrongSound', '__buzz'); }
  const g = window._currentGame;
  if (!g.__rp) { g.__rp = true; const r = g._ttsResume; g._ttsResume = function () { window.__resume.push(Date.now()); return r.apply(this, arguments); }; }
  return true; })()`;
const RESET = `window.__tts.length = 0; window.__ding.length = 0; window.__resume.length = 0; window.__osc = 0; window.__soft = window.__nod = window.__lose = window.__buzz = 0; true`;
const ANSWER = `(() => { const g = window._currentGame; const f = g._processVoiceAnswer || g._processVoiceResult; f.call(g, [{ transcript: String(g.currentAnswer) }]); return true; })()`;
const WRONG = `(() => { const g = window._currentGame; const f = g._processVoiceAnswer || g._processVoiceResult; f.call(g, [{ transcript: String(g.currentAnswer + 1) }]); return true; })()`;
// 把进度拨到「再对一题就通关」
const NEAR_END = `(() => { const g = window._currentGame, n = g.constructor.name;
  if (n === 'RaceGame') g.playerStep = RACE_TOTAL - 1; else if (n === 'SpaceGame') g.done = SPACE_TOTAL - 1;
  else if (n === 'BattleGame') g.playerScore = g.total - 1; else g.playerScore = TOTAL - 1; return n; })()`;
const LOG = `window.__tts.map(r => ({ t: r.t, s: r.start, e: r.end, cut: r.cut }))`;
const idle = async () => { for (let i = 0; i < 40; i++) { if (await b.ev(`(() => { const t = window.__tts, l = t[t.length - 1]; return !l || !!l.end; })()`)) return; await b.sleep(150); } };

await b.send('Page.addScriptToEvaluateOnNewDocument', { source: STUB });
await b.nav(b.menu);
await b.preserve();

const setup = async (lv) => {
  await b.boot(lv, 'audio');
  await b.ev(SPY);
  await b.sleep(1500); await idle(); await b.sleep(400);   // 首题念完、叮完、开麦
  await b.ev(RESET);
};
const BINGO = () => b.ev('MG_BINGO_LINES'), WRONGS = () => b.ev('MG_WRONG_LINES');

// 短句轮换：都在池里、不连续重复、整池都能抽到
await b.boot(1, 'audio');
{
  const r = await b.ev(`(() => { const out = []; for (let i = 0; i < 300; i++) out.push(mgPickLine('t', MG_BINGO_LINES));
    return { inPool: out.every(s => MG_BINGO_LINES.includes(s)), repeat: out.some((s, i) => i && s === out[i - 1]), kinds: new Set(out).size, pool: MG_BINGO_LINES.length }; })()`);
  P(r.inPool && !r.repeat && r.kinds === r.pool, '短句轮换：在池里/不连续重复/整池覆盖', r);
}

for (const lv of [1, 2, 3, 4, 6]) {
  const BL = await (async () => { await b.boot(lv, 'audio'); return BINGO(); })();
  await b.ev(SPY);
  await b.sleep(1500); await idle(); await b.sleep(400);
  await b.ev(RESET);
  await b.ev(ANSWER);
  await b.sleep(300);
  P(await b.ev('window.__osc') === 4, `L${lv} 答对只响一串和弦（4 个振荡器，不叠两串）`, await b.ev('window.__osc'));
  await b.poll(`window.__tts.length >= 2`, 9000).catch(() => {});
  await b.sleep(1200);
  const log = await b.ev(LOG), ding = await b.ev('window.__ding'), rs = await b.ev('window.__resume');
  const bingo = log.find(r => BL.includes(r.t)), next = log.find(r => !BL.includes(r.t));
  P(!!bingo, `L${lv} 答对后念了短句`, log.map(r => r.t));
  P(!!next, `L${lv} 随后读了下一题`, next && next.t);
  if (bingo && next) {
    P(!bingo.cut, `L${lv} 短句没被顶掉`, { cut: bingo.cut });
    P(next.s >= bingo.e - 30, `L${lv} 下一题在短句念完之后才开口`, { gapMs: next.s - bingo.e, bingoMs: bingo.e - bingo.s });
    P(bingo.e - bingo.s >= 1700, `L${lv} 短句完整念满`, bingo.e - bingo.s);
    P(ding.length === 1 && ding[0] >= next.e - 30 && ding[0] - next.e < 150, `L${lv} 只在读完题后叮一声（短句后不叮）`, { dings: ding.length, afterQuestionEnd: ding[0] - next.e });
    const gap = rs[rs.length - 1] - ding[0];
    P(gap >= 180 && gap <= 500, `L${lv} 叮完隔一拍才放开麦克风`, { gapMs: gap });
  }
}

// 手动「再听一遍」：读完同样叮；且不排队，立刻顶掉正在念的
await setup(1);
await b.ev(`window._currentGame._speakQuestion(); true`);
await b.sleep(1200);
{
  const log = await b.ev(LOG), ding = await b.ev('window.__ding'), rs = await b.ev('window.__resume');
  P(log.length === 1 && ding.length === 1 && ding[0] >= log[0].e - 30, '手动再听一遍：读完叮一声', { reads: log.length, dings: ding.length });
  P(rs.length === 1 && rs[0] - ding[0] >= 180, '手动再听一遍：叮完才开麦', { gapMs: rs[0] - ding[0] });
}
await b.ev(RESET);
await b.ev(ANSWER);
await b.sleep(200);
await b.ev(`window._currentGame._speakQuestion(); true`);
await b.sleep(150);
{
  const BL = await BINGO();
  const log = await b.ev(LOG);
  const bingo = log.find(r => BL.includes(r.t)), re = log.filter(r => !BL.includes(r.t))[0];
  P(!!bingo && !!re, '手动重读：有短句也有重读', log.map(r => r.t));
  P(bingo && re && bingo.cut && re.s - bingo.s < 600, '手动重读立刻顶掉短句', bingo && re && { gap: re.s - bingo.s, cut: bingo.cut });
}

// 答错：先响很轻的下行两音，再念一句短句；不响旧嗡嗡声/和弦、不叮
for (const lv of [1, 3]) {
  await setup(lv);
  const WL = await WRONGS();
  await b.ev(WRONG);
  await b.sleep(300);
  const st = { soft: await b.ev('window.__soft'), osc: await b.ev('window.__osc'), buzz: await b.ev('window.__buzz') };
  P(st.soft === 1 && st.osc === 2 && st.buzz === 0, `L${lv} 答错响一次轻下行两音（2 个振荡器），不响嗡嗡声`, st);
  await b.sleep(2300);
  const log = await b.ev(LOG);
  P(log.length === 1 && WL.includes(log[0].t), `L${lv} 答错念了一句短句`, log.map(r => r.t));
  P(await b.ev('window.__osc') === 2 && (await b.ev('window.__ding')).length === 0, `L${lv} 答错没有和弦、不叮`, await b.ev('window.__osc'));
}

// 没听到数字：很轻的上行提示音，麦克风按住约 450ms 再放开；不念话、不叮、不响答错音
const NODIGIT = `(() => { const g = window._currentGame; window.__nodAt = Date.now(); const f = g._processVoiceAnswer || g._processVoiceResult; f.call(g, [{ transcript: '嗯' }]); return true; })()`;
for (const lv of [1, 3]) {
  await setup(lv);
  await b.ev(NODIGIT);
  await b.sleep(100);
  const mid = await b.ev('window._currentGame._ttsSpeaking');
  const st = { nod: await b.ev('window.__nod'), osc: await b.ev('window.__osc'), soft: await b.ev('window.__soft'), buzz: await b.ev('window.__buzz') };
  await b.sleep(800);
  const rs = await b.ev('window.__resume'), at = await b.ev('window.__nodAt');
  P(st.nod === 1 && st.osc === 2 && st.soft === 0 && st.buzz === 0, `L${lv} 没听到数字：响一次提示音（2 个振荡器）`, st);
  P(mid === true, `L${lv} 没听到数字：提示音期间麦克风按住`, mid);
  P(rs.length === 1 && rs[0] - at >= 400 && rs[0] - at <= 700, `L${lv} 没听到数字：约 450ms 后放开麦克风`, rs.map(t => t - at));
  P((await b.ev(LOG)).length === 0 && (await b.ev('window.__ding')).length === 0, `L${lv} 没听到数字：不念话、不叮`);
  P(await b.ev('window._currentGame._ttsSpeaking') === false, `L${lv} 没听到数字：之后麦克风状态复位`);
}
// 正在念话时没听到数字：不叠提示音；提示音窗口里离场：不得再放开麦克风
await setup(1);
await b.ev(`window._currentGame._ttsSpeaking = true; true`);
await b.ev(NODIGIT);
await b.sleep(200);
P(await b.ev('window.__nod') === 0 && await b.ev('window.__osc') === 0, '正在念话时没听到数字：不叠提示音', await b.ev('window.__nod'));
await b.ev(`window._currentGame._ttsSpeaking = false; true`);
await b.ev(RESET);
await b.ev(NODIGIT);
await b.ev(`window._mgSafeLeave(window._currentGame, () => {}); true`);
await b.sleep(900);
P((await b.ev('window.__resume')).length === 0, '提示音窗口里离场：之后没有再放开麦克风', await b.ev('window.__resume'));

// 离场：答对后短句还在念就离开，排队等的下一题不得再出声、不得再叮
await setup(1);
await b.ev(ANSWER);
await b.sleep(300);
await b.ev(`window._mgSafeLeave(window._currentGame, () => {}); true`);
await b.sleep(4000);
{
  const BL = await BINGO();
  const log = await b.ev(LOG);
  P(log.length === 1 && BL.includes(log[0].t), '离场后没有再开口读题', log.map(r => r.t));
  P((await b.ev('window.__ding')).length === 0, '离场后没有再叮');
}

// 失败结算：温柔的下行四音（G5 E5 D5 C5），只在失败时响，通关不响
{
  await setup(6);
  await b.ev(`window._currentGame._endGame(false); true`);
  await b.poll(`window.__lose >= 1`, 8000).catch(() => {});
  await b.sleep(300);
  const st = { lose: await b.ev('window.__lose'), osc: await b.ev('window.__osc'), buzz: await b.ev('window.__buzz') };
  P(st.lose === 1 && st.osc === 4 && st.buzz === 0, 'L6 失败结算：响一次下行小调（4 个振荡器）', st);
  await setup(6);
  await b.ev(`window._currentGame._endGame(true); true`);
  await b.sleep(3500);
  P(await b.ev('window.__lose') === 0, 'L6 通关结算：不响失败小调', await b.ev('window.__lose'));
}

// 末题答对：不念短句（直接通关语），和弦照响
for (const lv of [1, 2, 3, 4, 6]) {
  await setup(lv);
  const BL = await BINGO();
  await b.ev(NEAR_END);
  await b.ev(ANSWER);
  await b.sleep(300);
  P(await b.ev('window.__osc') === 4, `L${lv} 末题和弦照响`, await b.ev('window.__osc'));
  await b.poll(`window.__tts.length >= 1`, 9000).catch(() => {});
  await b.sleep(800);
  const log = await b.ev(LOG);
  P(log.length >= 1 && log.every(r => !BL.includes(r.t)), `L${lv} 末题不念短句，只念通关语`, log.map(r => r.t));
}

// 音效开关关掉：答对不响和弦、读完题不叮、不推后开麦
await b.ev(`localStorage.setItem('mathgameSettings', JSON.stringify({ sfx: 0, bgm: 0, voice: 3 })); true`);
for (const lv of [1, 3]) {
  await setup(lv);
  await b.ev(ANSWER);
  await b.sleep(300);
  P(await b.ev('window.__osc') === 0, `L${lv} 音效关：答对不响和弦（旧版 Bingo 和弦无视开关）`, await b.ev('window.__osc'));
  await b.poll(`window.__tts.length >= 2`, 9000).catch(() => {});
  await b.sleep(1200);
  const log = await b.ev(LOG), rs = await b.ev('window.__resume');
  P((await b.ev('window.__ding')).length === 0 && await b.ev('window.__osc') === 0, `L${lv} 音效关：读完题不叮`, await b.ev('window.__osc'));
  P(log.length >= 2 && rs.length && rs[rs.length - 1] - log[log.length - 1].e < 100, `L${lv} 音效关：读完立刻开麦`, rs.length && log.length && rs[rs.length - 1] - log[log.length - 1].e);
  // 答错 / 没听到数字也一声不响，且没听到数字不推后开麦
  await b.ev(RESET);
  await b.ev(WRONG);
  await b.sleep(300);
  P(await b.ev('window.__osc') === 0, `L${lv} 音效关：答错不响轻下行音`, await b.ev('window.__osc'));
  await setup(lv);
  await b.ev(NODIGIT);
  await b.sleep(100);
  P(await b.ev('window.__osc') === 0 && await b.ev('window._currentGame._ttsSpeaking') === false, `L${lv} 音效关：没听到数字不响、也不按住麦克风`, await b.ev('window.__osc'));
}
{
  await setup(6);
  await b.ev(`window._currentGame._endGame(false); true`);
  await b.poll(`window.__lose >= 1`, 8000).catch(() => {});
  await b.sleep(300);
  P(await b.ev('window.__osc') === 0, 'L6 音效关：失败结算不响小调', await b.ev('window.__osc'));
}
await b.ev(`localStorage.removeItem('mathgameSettings'); true`);

// L5 扬帆（点门，无麦克风）：答对念短句、下一题排在它后面、读完题叮；答错念短句、不响嗡嗡声；末题不念短句
const DOOR_OK = `(() => { const g = window._currentGame; g._choose(g.choices.find(d => d.value === g.currentAnswer)); return true; })()`;
const DOOR_BAD = `(() => { const g = window._currentGame; g._choose(g.choices.find(d => d.value !== g.currentAnswer)); return true; })()`;
{
  await setup(5);
  const BL = await BINGO(), WL = await WRONGS();
  await b.ev(DOOR_BAD);
  await b.sleep(300);
  const st5 = { soft: await b.ev('window.__soft'), osc: await b.ev('window.__osc'), buzz: await b.ev('window.__buzz') };
  P(st5.soft === 1 && st5.osc === 2 && st5.buzz === 0, 'L5 答错响一次轻下行两音，不响嗡嗡声', st5);
  await b.sleep(2200);
  let log = await b.ev(LOG);
  P(log.length === 1 && WL.includes(log[0].t), 'L5 答错念了一句短句', log.map(r => r.t));
  P((await b.ev('window.__ding')).length === 0, 'L5 答错不叮');
  await b.ev(RESET);
  await b.ev(DOOR_OK);
  await b.sleep(300);
  P(await b.ev('window.__osc') === 4, 'L5 答对只响一串和弦', await b.ev('window.__osc'));
  await b.poll(`window.__tts.length >= 2`, 9000).catch(() => {});
  await b.sleep(1200);
  log = await b.ev(LOG);
  const ding = await b.ev('window.__ding');
  const bingo = log.find(r => BL.includes(r.t)), next = log.find(r => !BL.includes(r.t));
  P(!!bingo && !!next, 'L5 答对先念短句再读下一题', log.map(r => r.t));
  if (bingo && next) {
    P(!bingo.cut && next.s >= bingo.e - 30, 'L5 下一题排在短句后面、没顶掉它', { cut: bingo.cut, gapMs: next.s - bingo.e });
    P(ding.length === 1 && ding[0] >= next.e - 30 && ding[0] - next.e < 150, 'L5 读完题叮一声', { dings: ding.length, afterQuestionEnd: ding[0] - next.e });
  }
  await b.ev(RESET);
  await b.ev(NEAR_END);
  await b.ev(DOOR_OK);
  await b.sleep(300);
  P(await b.ev('window.__osc') === 4, 'L5 末题和弦照响', await b.ev('window.__osc'));
  await b.poll(`window.__tts.length >= 1`, 9000).catch(() => {});
  await b.sleep(800);
  log = await b.ev(LOG);
  P(log.length >= 1 && log.every(r => !BL.includes(r.t)), 'L5 末题不念短句，只念通关语', log.map(r => r.t));
}

// 听算背景音乐（方案 C，一直播放版）：柔和单声部一直在放，话筒开着时压到 duck 倍而不是静音
// 本地没有 Vosk：把游戏伪装成「原生语音」，换一个会记开麦时刻的假 recognition，并包住 BGM.gate 记闸门开/关的时刻。
// 每 15ms 抽查「话筒开着（recognizing 且没在念话）时，闸门必须是压低状态；真实增益不得超过 duck 目标的 1.15 倍」，
// 同时记起播 1.5s 后的最低增益，证明音乐全程没被静音过。
const BG = () => b.ev('BGM.debug()');
const SIM = `(() => { const g = window._currentGame; g._isNativeVoice = true; g.recognizing = false;
  window.__gate = []; window.__mic = []; window.__viol = 0; window.__gmin = 9; window.__t0 = Date.now();
  g.recognition = { start() { window.__mic.push(Date.now()); g.recognizing = true; }, stop() { g.recognizing = false; }, abort() { g.recognizing = false; } };
  if (!BGM.__orig) { BGM.__orig = BGM.gate; BGM.gate = function (o) { window.__gate.push({ o: !!o, t: Date.now() }); return BGM.__orig.apply(BGM, arguments); }; }
  if (!window.__watch) window.__watch = setInterval(() => { const d = BGM.debug(), c = window._currentGame;
    if (c && c.recognizing && !c._ttsSpeaking && (d.open || (d.state === 'running' && d.gain > d.full * d.duck * 1.15 + 0.0005))) window.__viol++;
    if (d.running && d.state === 'running' && Date.now() - window.__t0 > 1500) window.__gmin = Math.min(window.__gmin, d.gain); }, 15);
  mgBgmStart(g); return BGM.debug(); })()`;

const GATES = `window.__gate.length = 0; window.__mic.length = 0; true`;
{
  await setup(1);
  P((await BG()).running === false, 'L1 网页版听算不放背景音乐（扬声器的声音会被浏览器识别收进去）', await BG());
  let d = await b.ev(SIM);
  P(d.running && d.soft && d.open === true, 'L1 原生语音：柔和版起播，话筒没开就是正常音量（不再等读题才响）', d);
  await b.ev(GATES);
  await b.ev(`window._currentGame._speakQuestion(false); true`);
  P((await BG()).open === true, 'L1 开始读题：闸门保持打开', await BG());
  await b.poll(`window.__ding.length >= 1`, 6000).catch(() => {});
  const atDing = { open: (await BG()).open, speaking: await b.ev('window._currentGame._ttsSpeaking'), mic: (await b.ev('window.__mic')).length };
  P(atDing.open === false && atDing.speaking === true && atDing.mic === 0, 'L1 叮响时音乐已压低、话筒还没开', atDing);
  await b.sleep(600);
  let gt = await b.ev('window.__gate'), mic = await b.ev('window.__mic');
  let closeAt = (gt.find(x => !x.o) || {}).t;
  P(mic.length === 1 && closeAt && mic[0] - closeAt >= 180, 'L1 先压低、隔一拍才开麦', { gapMs: mic[0] - closeAt, mics: mic.length });
  d = await BG();
  P(d.open === false && await b.ev('window._currentGame.recognizing') === true, 'L1 话筒开着时闸门保持压低', d);
  P(d.gain > d.full * d.duck * 0.8 && d.gain < d.full * d.duck * 1.15 + 0.0005, 'L1 话筒开着时音乐停在压低档（没静音、也没放大）', { gain: d.gain, full: d.full, duck: d.duck });
  // 没有叮声的收尾（答错短句等）：也要先压低再开麦
  await b.ev(GATES);
  await b.ev(`window._currentGame._playTTS('嗯嗯'); true`);
  P((await BG()).open === true, 'L1 念反馈话时闸门打开', await BG());
  await b.sleep(1300);
  gt = await b.ev('window.__gate'); mic = await b.ev('window.__mic');
  closeAt = (gt.find(x => !x.o) || {}).t;
  P(mic.length === 1 && closeAt && mic[0] - closeAt >= 180, 'L1 没有叮声的收尾：也先压低、隔一拍才开麦', { gapMs: mic[0] - closeAt, mics: mic.length });
  P(await b.ev('window.__viol') === 0, 'L1 全程没有「话筒开着而音乐没压低」', await b.ev('window.__viol'));
  {
    const gmin = await b.ev('window.__gmin'), d2 = await BG();
    P(gmin >= d2.full * d2.duck * 0.8, 'L1 读题→开麦→答错→再开麦：音乐一直在放，没被静音', { gmin, floor: d2.full * d2.duck * 0.8 });
  }
  // 结束后停播，之后再念话不得把音乐唤醒
  await b.ev(`window._currentGame._endGame(); true`);
  await b.sleep(2600);   // 胜利一拍约 1.5s 后才进结算卡并停音乐
  await b.ev(`window._currentGame._playTTS('嗯嗯'); true`);
  await b.sleep(300);
  P((await BG()).running === false, 'L1 结算后音乐停了，再念话也不会唤醒', await BG());
}
// L5 扬帆没有话筒：柔和版照放，读题 / 短句 / 叮都不关它
{
  await setup(5);
  let d = await BG();
  P(d.running && d.soft && d.open === true, 'L5 听算：柔和版起播，且不受话筒闸门管（没有话筒）', d);
  await b.ev(DOOR_BAD);
  await b.sleep(2300);
  P((await BG()).open === true, 'L5 答错念短句后音乐照放', await BG());
  await b.ev(RESET);
  await b.ev(DOOR_OK);
  await b.poll(`window.__ding.length >= 1`, 9000).catch(() => {});
  await b.sleep(400);
  P((await BG()).open === true && (await b.ev('window.__ding')).length === 1, 'L5 答对、读完题叮一声后音乐照放', await BG());
}
// 背景音乐开关关了就不放；视算仍是原来的欢快版
await b.ev(`localStorage.setItem('mathgameSettings', JSON.stringify({ sfx: 3, bgm: 0, voice: 3 })); true`);
await b.boot(5, 'audio');
await b.sleep(600);
P((await BG()).running === false, 'L5 听算：背景音乐开关关了就不放', await BG());
await b.ev(`localStorage.removeItem('mathgameSettings'); true`);
await b.boot(1, 'visual');
await b.sleep(600);
{
  const d = await BG();
  P(d.running && d.soft === false, 'L1 视算：仍放原来的欢快背景音乐', d);
}

await b.restore();
P(b.errors.length === 0, '无页面脚本异常', b.errors.slice(0, 3));
await b.close();
finish('BINGO QUEUE + ASK CHIME');
