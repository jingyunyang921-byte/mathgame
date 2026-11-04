// 蛋位布局勘察/验收截图：各关×模式×视口，种子=已领养、未孵化的萌蛋。用法：node .shots/_shot_egg_layouts.mjs <前缀> [关卡,..] [模式,..] [WxH,..]
import { petBrowser } from './pet_browser.mjs';
const [pre = 'eggl', lvArg = '1,2,3,4,5,6', modeArg = 'visual,audio', szArg = '960x576'] = process.argv.slice(2);
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
  for (const sz of szArg.split(',')) {
    const [w, h] = sz.split('x').map(Number);
    await b.viewport(w, h);
    for (const lv of lvArg.split(',').map(Number)) for (const mode of modeArg.split(',')) {
      await b.ev(seed);
      try { await b.boot(lv, mode); } catch (e) { console.log('boot fail', lv, mode, e.message); continue; }
      await b.sleep(700);
      await b.shot(`${pre}_L${lv}_${mode}_${w}x${h}`);
    }
  }
  console.log('done, errors=', JSON.stringify(b.errors));
} finally { try { await b.send('Emulation.setEmulatedMedia', { features: [] }); await b.restore(); } finally { await b.close(); } }
