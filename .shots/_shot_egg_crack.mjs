// 通关舞台「咔」取景：点开宝箱后材料落进蛋的瞬间截图。用法：node .shots/_shot_egg_crack.mjs [前缀] [关卡]
import { petBrowser } from './pet_browser.mjs';
const [pre = 'crack', lv = '1'] = process.argv.slice(2);
const b = await petBrowser();
const seed = `(() => {
  const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return MG_PET.dayKey(x); };
  ['mathgamePet', 'mathgameStars', 'mathgameCoins'].forEach(k => localStorage.removeItem(k));
  try { _mgPendingSnap = null; } catch (e) {}
  localStorage.setItem('mathgamePet', JSON.stringify({ version: 2, adopted: true, exp: 0, stage: 0, adoptedDay: d(-22), lastDay: d(0), xp: 20,
    days: Array.from({ length: 4 }, (_, i) => d(-4 + i)), phase: 0, daily: { date: d(0), correct: 0, rounds: [] }, gifts: [], decor: 'leaf', decors: ['leaf'],
    name: '数宝', hatchDay: '', birthSeen: false, affection: 0, stories: { seen: [], pending: [] } }));
  return true; })()`;
try {
  await b.nav(b.menu); await b.preserve();
  await b.viewport(960, 576);
  await b.ev(seed); await b.boot(Number(lv), 'visual'); await b.sleep(300);
  await b.ev(`_mgWrong=0;_mgCorrect=10;_mgMaxStreak=10;_mgRoundStart=Date.now()-7000;debugEndGame(true);true`);
  await b.poll(`!!document.querySelector('#cs-stage .cs-chest')`, 7000);
  await b.ev(`document.querySelector('#cs-stage .cs-chest').click();true`);
  await b.poll(`!!document.querySelector('#cs-stage .egg-crack')`, 6000);
  await b.sleep(380);
  console.log(JSON.stringify(await b.ev(`(() => { const k = document.querySelector('#cs-stage .egg-ka'); if (!k) return null; const cs = getComputedStyle(k), r = k.getBoundingClientRect(); return { fs: cs.fontSize, fw: cs.fontWeight, w: Math.round(r.width), h: Math.round(r.height), op: cs.opacity }; })()`)));
  await b.shot(`${pre}_L${lv}`);
  console.log('errors=', JSON.stringify(b.errors));
} finally { try { await b.restore(); } finally { await b.close(); } }
