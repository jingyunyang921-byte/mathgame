// 蛋位勘察：各关×模式×视口里关键块的 client 矩形（用来定蛋位坐标）。用法：node .shots/_probe_egg_rects.mjs [关卡,..] [模式,..] [WxH,..]
import { petBrowser } from './pet_browser.mjs';
const [lvArg = '1,2,3,4', modeArg = 'visual,audio', szArg = '960x576'] = process.argv.slice(2);
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
const probe = `(() => {
  const out = {};
  const sels = ['#pk-section', '#race-section', '#race-canvas-wrap', '#race-label', '#question-section', '#question-card', '#answer-section', '#canvas-wrapper', '#voice-section', '#voice-canvas-wrapper', '.mg-listen-card', '#float-voice-overlay', '#mg-egg-slot', '#mg-egg-slot .es-mats'];
  for (const s of sels) { const n = document.querySelector(s); if (!n) { out[s] = null; continue; }
    const r = n.getBoundingClientRect(), cs = getComputedStyle(n);
    out[s] = r.width ? [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom), cs.display === 'none' ? 'none' : ''].join(',') : 'hidden'; }
  out.vp = innerWidth + 'x' + innerHeight;
  return out; })()`;
try {
  await b.nav(b.menu); await b.preserve();
  for (const sz of szArg.split(',')) {
    const [w, h] = sz.split('x').map(Number);
    await b.viewport(w, h);
    for (const lv of lvArg.split(',').map(Number)) for (const mode of modeArg.split(',')) {
      await b.ev(seed);
      try { await b.boot(lv, mode); } catch (e) { console.log('boot fail', lv, mode, e.message); continue; }
      await b.sleep(600);
      console.log(`L${lv} ${mode} ${w}x${h}`, JSON.stringify(await b.ev(probe)));
    }
  }
  console.log('errors=', JSON.stringify(b.errors));
} finally { try { await b.restore(); } finally { await b.close(); } }
