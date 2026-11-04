// L5 小海龟取景：已领养/未领养 × 起点/中途/终点，走真实 _choose。用法：node .shots/_shot_l5_turtle.mjs [前缀] [WxH,..]
import { petBrowser } from './pet_browser.mjs';
const [pre = 'l5t', szArg = '960x576'] = process.argv.slice(2);
const b = await petBrowser();
const seed = (adopted) => `(() => {
  const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return MG_PET.dayKey(x); };
  ['mathgamePet', 'mathgameStars', 'mathgameCoins'].forEach(k => localStorage.removeItem(k));
  try { _mgPendingSnap = null; } catch (e) {}
  if (${adopted}) localStorage.setItem('mathgamePet', JSON.stringify({ version: 2, adopted: true, exp: 0, stage: 0, adoptedDay: d(-21), lastDay: d(0), xp: 0,
    days: Array.from({ length: 9 }, (_, i) => d(-9 + i)), phase: 0, daily: { date: d(0), correct: 0, rounds: [] }, gifts: [], decor: 'leaf', decors: ['leaf'],
    name: '数宝', hatchDay: '', birthSeen: false, affection: 0, stories: { seen: [], pending: [] } }));
  return true; })()`;
const answer = `(() => { const g = window._currentGame; const d = g.choices.find(c => c.value === g.currentAnswer); g.locked = false; g._choose(d); return g.done; })()`;
try {
  await b.nav(b.menu); await b.preserve();
  for (const sz of szArg.split(',')) {
    const [w, h] = sz.split('x').map(Number);
    await b.viewport(w, h);
    for (const adopted of [true, false]) {
      await b.nav(b.menu); await b.sleep(200);
      await b.ev(seed(adopted));
      await b.boot(5, 'visual'); await b.sleep(900);
      await b.shot(`${pre}_${adopted ? 'adopt' : 'plain'}_0_${w}x${h}`);
      for (const stop of [3, 6, 10]) {
        let done = 0;
        while (done < stop) { done = await b.ev(answer); if (done < stop) await b.sleep(1050); }
        await b.sleep(stop === 10 ? 500 : 1400);
        console.log(`${adopted ? '领养' : '未领养'} ${w}x${h} done=${done}`, JSON.stringify(await b.ev(`({ tp: window._currentGame.turtlePos, shown: window.MG_EGG ? MG_EGG.shown : null, ov: document.getElementById('overlay').classList.contains('show') })`)));
        await b.shot(`${pre}_${adopted ? 'adopt' : 'plain'}_${stop}_${w}x${h}`);
        if (stop === 10) break;
      }
    }
  }
  console.log('errors=', JSON.stringify(b.errors));
} finally { try { await b.restore(); } finally { await b.close(); } }
