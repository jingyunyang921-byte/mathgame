// 「带蛋拜访朋友」静态稿底图：拍真实游戏 960×576 的局内画面与结算宝箱舞台，供预览页叠加新元素。
import { petBrowser } from './pet_browser.mjs';
const b = await petBrowser();
const seed = `(() => {
  const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return MG_PET.dayKey(x); };
  const days = 9;
  const p = { version: 2, adopted: true, exp: 0, stage: 0, adoptedDay: d(1 - 22), lastDay: d(0), xp: 0,
    days: Array.from({ length: days }, (_, i) => d(-days + i)), phase: 0, daily: { date: d(0), correct: 0, rounds: [] }, gifts: [], decor: 'leaf', decors: ['leaf'],
    name: '数宝', hatchDay: '', birthSeen: false, affection: 0, stories: { seen: [], pending: [] } };
  ['mathgamePet', 'mathgameStars', 'mathgameCoins'].forEach(k => localStorage.removeItem(k));
  try { _mgPendingSnap = null; } catch (e) {}
  localStorage.setItem('mathgamePet', JSON.stringify(p));
  return true; })()`;
try {
  await b.nav(b.menu); await b.preserve();
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await b.viewport(960, 576);
  for (const lv of [1, 5, 6]) {
    await b.ev(seed); await b.boot(lv);
    if (lv === 1) await b.ev(`(() => { const g = window._currentGame; g.playerScore = 5; g.monsterScore = 4; for (let i = 0; i < 5; i++) g._fillDot('p', i); for (let i = 0; i < 4; i++) g._fillDot('m', i); return true; })()`);
    if (lv === 5) await b.ev(`(() => { const g = window._currentGame; g.done = 4; g._updateHeader(); return true; })()`);
    if (lv === 6) await b.ev(`(() => { const g = window._currentGame; g.playerScore = 9; g._updateHPBar(); document.getElementById('battle-score-num').textContent = '9/20'; return true; })()`);
    await b.sleep(600); await b.shot(`egg_base_play_L${lv}`);
  }
  await b.ev(seed); await b.boot(1);
  await b.ev(`_mgWrong=0;_mgCorrect=10;_mgMaxStreak=10;_mgRoundStart=Date.now()-9000;debugEndGame(true);true`);
  await b.poll(`!!document.querySelector('#cs-stage .chest-tap')`, 6000);
  await b.sleep(900); await b.shot('egg_base_stage_closed');
  await b.ev(`document.querySelector('#cs-stage .chest-tap').click();true`);
  await b.poll(`!!document.querySelector('#cs-stage .cs-go')`, 9000);
  await b.sleep(300); await b.shot('egg_base_stage_done');
  console.log('base shots done, errors=', JSON.stringify(b.errors));
} finally { try { await b.send('Emulation.setEmulatedMedia', { features: [] }); await b.restore(); } finally { await b.close(); } }
