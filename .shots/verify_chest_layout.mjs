// 结算卡的宝箱区布局：三视口 × 舞台弹出前 / 收下后 / 输局，结算卡不滚动、按钮都在屏内，卡里没有第二个宝箱。
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
const seed = (kind) => `(() => {
  const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return MG_PET.dayKey(x); };
  const mk = (age, days, xp) => ({ version: 2, adopted: true, exp: 0, stage: 0, adoptedDay: d(1 - age), lastDay: d(0), xp,
    days: Array.from({ length: days }, (_, i) => d(-days + i)), phase: 0, daily: { date: d(0), correct: 0, rounds: [] }, gifts: [], decor: 'leaf', decors: ['leaf'],
    name: '数宝', hatchDay: '', birthSeen: false, affection: 0, stories: { seen: [], pending: [] } });
  const K = { open: mk(22, 9, 90), phaseup: mk(22, 4, 70), none: null };
  ['mathgamePet', 'mathgameStars', 'mathgameCoins'].forEach(k => localStorage.removeItem(k));
  try { _mgPendingSnap = null; } catch (e) {}
  if (K['${kind}']) localStorage.setItem('mathgamePet', JSON.stringify(K['${kind}']));
  return true; })()`;
const end = (win, n) => `_mgWrong=${win ? 0 : 4};_mgCorrect=${n};_mgMaxStreak=${n};_mgRoundStart=Date.now()-9000;debugEndGame(${win});true`;
const play = async (kind, win = true, n = 10) => {
  await b.ev(seed(kind)); await b.boot(1);
  await b.ev(end(win, n)); await b.sleep(300);
};
const measure = () => b.ev(`(() => { const c = document.getElementById('overlay-content'), e = document.getElementById('overlay-chest');
  return { ch: c.clientHeight, sh: c.scrollHeight, vh: innerHeight, stage: !!document.getElementById('cs-stage'),
    btn: Math.max(...[...document.querySelectorAll('#overlay-btns button')].filter(x => x.offsetParent).map(x => x.getBoundingClientRect().bottom)),
    tap: !!e.querySelector('.chest-tap'), chestIcon: !!e.querySelector('use[href^="#chest-"]'), chips: e.querySelectorAll('.chest-reward:not(.care)').length,
    lines: e.querySelectorAll('.egg-line').length, strips: document.querySelectorAll('.egg-strip').length, cls: e.className }; })()`);
try {
  await b.nav(b.menu); await b.preserve();
  for (const [w, h] of b.device ? [[960, 576]] : [[1000, 576], [900, 500], [412, 915]]) {
    await b.viewport(w, h);
    for (const [kind, win, n, preview] of [['open', true, 10, true], ['phaseup', true, 10, false], ['open', false, 4, false], ['none', true, 10, false]]) {
      const tag = `${w}x${h} ${kind}${win ? '胜' : '负'}`;
      await play(kind, win, n);
      if (preview) {
        const m = await measure();
        P(!m.stage && m.cls === '' && !m.tap && !m.chestIcon && m.lines === 0 && m.sh <= m.ch + 1 && m.btn <= m.vh, `${tag}·舞台弹出前：卡里没有宝箱也没有萌蛋进度，不溢出、按钮在屏内`, m);
      }
      const taken = await b.takeChest();
      const m = await measure();
      const dup = !m.tap && !m.chestIcon && m.chips === 0 && m.strips === 0 && m.lines === 0;
      P(taken && !m.stage && dup && m.sh <= m.ch + 1 && m.btn <= m.vh, `${tag}·收下后：卡里没有宝箱 / 奖励牌 / 萌蛋进度（奖励都在舞台上讲过），不溢出、按钮在屏内`, m);
    }
  }
  P(b.errors.length === 0, '宝箱区布局全流程无脚本异常', b.errors);
} finally {
  try { await b.restore(); } finally { await b.close(); }
}
finish('CHEST LAYOUT');
