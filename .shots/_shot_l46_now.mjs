// L4/L6 取景（标题居中/山路接亭子/大枫树/L6 蛋大小）。用法：node .shots/_shot_l46_now.mjs [前缀] [关:模式 ...]；环境变量 VPS、HATCH=1（已孵化）、NOPET=1
import { petBrowser } from './pet_browser.mjs';
const [pre = 'l46', ...modes0] = process.argv.slice(2);
const modes = modes0.length ? modes0 : ['4:visual', '6:visual'];
const vps = (process.env.VPS || '960x576').split(',').map(s => s.split('x').map(Number));
const b = await petBrowser();
const seed = `(() => {
  const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return MG_PET.dayKey(x); };
  ['mathgamePet', 'mathgameStars', 'mathgameCoins'].forEach(k => localStorage.removeItem(k));
  try { _mgPendingSnap = null; } catch (e) {}
  if (${process.env.NOPET ? 'false' : 'true'}) localStorage.setItem('mathgamePet', JSON.stringify({ version: 2, adopted: true, exp: 0, stage: ${process.env.HATCH ? 1 : 0}, adoptedDay: d(-22), lastDay: d(0), xp: 20,
    days: Array.from({ length: 4 }, (_, i) => d(-4 + i)), phase: 0, daily: { date: d(0), correct: 0, rounds: [] }, gifts: [], decor: 'leaf', decors: ['leaf'],
    name: '数宝', hatchDay: ${process.env.HATCH ? 'd(0)' : "''"}, birthSeen: false, affection: 0, stories: { seen: [], pending: [] } }));
  return true; })()`;
try {
  await b.nav(b.menu); await b.preserve();
  for (const [w, h] of vps) {
    await b.viewport(w, h);
    for (const m of modes) {
      const [lv, mode] = m.split(':');
      await b.ev(seed); await b.boot(Number(lv), mode); await b.sleep(1200);
      if (Number(lv) === 4) {
        const info = await b.ev(`(() => { const r = s => { const e = document.querySelector(s); if (!e || !e.getClientRects().length) return null; const q = e.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.top), Math.round(q.right), Math.round(q.bottom)]; };
          return { vp: [innerWidth, innerHeight], tag: r('#race-scene-tag'), prog: r('#race-prog-player'), left: r('#race-track-left'), right: r('#race-track-right') }; })()`);
        console.log(`${w}x${h} L4`, JSON.stringify(info));
      }
      await b.shot(`${pre}_L${lv}_${mode}_${w}x${h}`);
    }
  }
  console.log('errors=', JSON.stringify(b.errors));
} finally { try { await b.restore(); } finally { await b.close(); } }
