// 「小动物带路」规则闸门：答完 10 题一律通关。
// L1-L4 都不是比赛（小动物不当对手，不封顶，成绩行是本关口吻：L1-L3 平静小画，L4 并肩上山）。
// 仍用 PK 条的只剩错题重练(level 0)：小动物领先时的提示是暖色静态（不红、不闪、不抖、不说「跟上/追」），文案「在等你」。
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
const COMBOS = [
  { lv: 1, mode: 'visual', eng: 'Game' }, { lv: 2, mode: 'visual', eng: 'Game' },
  { lv: 3, mode: 'audio', eng: 'VoiceGame' }, { lv: 4, mode: 'visual', eng: 'RaceGame' },
];
const CALM_WIN = { 1: /小兔吃得饱饱的/, 2: /小松鼠摘到松果啦/, 3: /小鸟唱完这首歌啦/, 4: /小鹿陪你走到山顶啦/ };
const endRound = (companionFirst) => `(() => {
  const g = window._currentGame, race = g.constructor.name === 'RaceGame';
  _mgWrong = 0; _mgCorrect = 10; _mgMaxStreak = 10; _mgRoundStart = Date.now() - 9000;
  g.monsterFinished = ${companionFirst};
  if (race) { g.playerStep = 10; } else { g.playerScore = 10; g.monsterScore = ${companionFirst} ? 10 : 7; }
  g._endGame();
  return true; })()`;

const readOverlay = `(() => { const q = id => document.getElementById(id), g = window._currentGame;
  return { shown: q('overlay').classList.contains('show'), cls: q('overlay-title').className, title: q('overlay-title').textContent,
    msg: q('overlay-msg').textContent.trim(), stars: document.querySelectorAll('#overlay-stars .star.on').length,
    snapStars: g && g._mgRoundSnap ? g._mgRoundSnap.stars : null }; })()`;
try {
  await b.nav(b.menu); await b.preserve();

  // 1. 胜负规则 + 星数封顶
  for (const c of COMBOS) {
    const tag = `L${c.lv} ${c.mode}`;
    await b.boot(c.lv, c.mode);
    P(await b.ev('window._currentGame.constructor.name') === c.eng, `${tag}：引擎 ${c.eng}`);
    await b.ev(endRound(true)); await b.sleep(2000);
    const a = await b.ev(readOverlay);
    P(a.shown && a.cls === 'win' && !/这次没赢/.test(a.title), `${tag}：小动物先到终点，答完仍是通关`, a);
    P(a.snapStars === 3 && a.stars === 3, `${tag}：不是比赛，不封顶，全对仍是 3 星`, a);
    P(CALM_WIN[c.lv].test(a.msg) && !/先到终点|在等你|再来一次|再练|等到你啦/.test(a.msg), `${tag}：成绩行是本关口吻`, a.msg);
    await b.boot(c.lv, c.mode);
    await b.ev(endRound(false)); await b.sleep(2000);
    const w = await b.ev(readOverlay);
    P(w.shown && w.cls === 'win' && w.snapStars === 3 && w.stars === 3, `${tag}：全对且小动物没到终点 → 3 星`, w);
    P(CALM_WIN[c.lv].test(w.msg), `${tag}：成绩行是本关口吻`, w.msg);
  }

  // 2. 错题重练(level 0)仍用 PK 条：小动物领先时的暖色静态提示（L1-L3 平静模式下 setDangerBorder 一律不亮，见 verify_scenes_l123；L4 没有 PK 条）
  await b.boot(0, 'visual');

  const d = await b.ev(`(() => {
    const g = window._currentGame; if (g.monsterTimer) clearInterval(g.monsterTimer); g.playerScore = 2; g.monsterScore = 4; g.monsterFinished = false; setDangerBorder(true);
    const cs = (el, p) => getComputedStyle(el, p || null), q = s => document.querySelector(s);
    const lab = q('#race-label'), card = q('#question-card'), pk = q('#pk-section'), edge = q('#pk-edge');
    const inf = document.getAnimations().filter(a => a.effect && a.effect.getComputedTiming().iterations === Infinity && a.effect.target)
      .map(a => a.effect.target.id).filter(id => ['race-label', 'question-card', 'answer-section', 'canvas-wrapper', 'monster-full-banner', 'pk-section'].includes(id));
    const kf = [...document.styleSheets].flatMap(s => { try { return [...s.cssRules]; } catch (e) { return []; } }).filter(r => r.type === 7).map(r => r.name);
    const ans = cs(q('#answer-section')).backgroundImage, cw = cs(q('#canvas-wrapper'));
    return { urgent: lab.classList.contains('urgent'), text: lab.textContent, labBg: cs(lab).backgroundColor, labAnim: cs(lab).animationName,
      cardAnim: cs(card).animationName, inf, kfBad: kf.filter(n => /label-urgent|question-card-urgent|blink-banner|score-urgent|monster-bounce/.test(n)),
      pkShadow: cs(pk, '::after').boxShadow, edgeFill: edge ? cs(edge).fill : null, cwBorder: cw.borderTopColor, ans,
      cue: JSON.stringify([MG_CUE.lead, MG_CUE.finish]) }; })()`);
  P(d.urgent && /在前面等你/.test(d.text) && !/跟上/.test(d.text), '领先时标签「X在前面等你，慢慢算！」', d.text);
  P(d.labBg === 'rgb(255, 233, 191)' && d.labAnim === 'none', '领先标签是暖色静态（不红、不脉冲）', [d.labBg, d.labAnim]);
  P(d.cardAnim === 'none' && d.inf.length === 0, '题卡/答题区/标签没有无限动画（不闪不抖）', [d.cardAnim, d.inf]);
  P(d.kfBad.length === 0, '旧红色警报 keyframes 已删净', d.kfBad);
  P(/255, 190, 90/.test(d.pkShadow) && !/255, 77, 109/.test(d.pkShadow), '赛道外框是暖色，不是红框', d.pkShadow);
  P(d.edgeFill === 'rgb(255, 196, 107)' && d.cwBorder === 'rgb(255, 183, 77)', '赛道底边/手写区边框是暖色', [d.edgeFill, d.cwBorder]);
  P(/255, 229, 168/.test(d.ans) && !/255, 204, 204/.test(d.ans), '答题区底色是淡暖色，不是粉红', d.ans);
  P(!/加油|赶紧|快点|追上|输/.test(d.cue), '领先/到终点语音提示没有催促词', d.cue);
  const f = await b.ev(`(() => { const g = window._currentGame; g.monsterScore = 10; g.monsterFinished = true; setDangerBorder(true);
    return document.getElementById('race-label').textContent; })()`);
  P(/在终点等你啦/.test(f), '小动物到终点后标签「X在终点等你啦！」', f);

  // 3. 到终点横幅样式（#monster-full-banner 还在 DOM 里，只有错题重练的 PK 引擎会显示它）：暖色静态
  const r = await b.ev(`(() => { const bn = document.getElementById('monster-full-banner'); bn.style.display = 'block'; const cs = getComputedStyle(bn);
    return { text: bn.textContent, bg: cs.backgroundColor, anim: cs.animationName }; })()`);
  P(/在终点等你/.test(r.text) && r.bg === 'rgb(255, 233, 191)' && r.anim === 'none', '到终点横幅：暖色静态「在终点等你」', r);

  P(b.errors.length === 0, '无脚本异常', b.errors);
} finally {
  try { await b.restore(); } finally { await b.close(); }
}
finish('GUIDE RULES');
