import { petBrowser } from './pet_browser.mjs';
const b = await petBrowser();
const seed = `(() => {
  const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return MG_PET.dayKey(x); };
  ['mathgamePet', 'mathgameStars', 'mathgameCoins'].forEach(k => localStorage.removeItem(k));
  try { _mgPendingSnap = null; } catch (e) {}
  localStorage.setItem('mathgamePet', JSON.stringify({ version: 2, adopted: true, exp: 0, stage: 0, adoptedDay: d(-22), lastDay: d(0), xp: 20,
    days: Array.from({ length: 4 }, (_, i) => d(-4 + i)), phase: 0, daily: { date: d(0), correct: 0, rounds: [] }, gifts: [], decor: 'leaf', decors: ['leaf'],
    name: '数宝', hatchDay: '', birthSeen: false, affection: 0, stories: { seen: [], pending: [] } }));
  return true; })()`;
const R = `(() => { const r = s => { const e = document.querySelector(s); if (!e || !e.getClientRects().length) return null; const q = e.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.top), Math.round(q.right), Math.round(q.bottom)]; };
  return { vp: [innerWidth, innerHeight], ansTop: getComputedStyle(document.body).getPropertyValue('--mg-ans-top') || getComputedStyle(document.documentElement).getPropertyValue('--mg-ans-top'), pk: r('#pk-section'), qc: r('#question-card'), cw: r('#canvas-wrapper'), lc: r('.mg-listen-card'), scene: r('#mg-scene'), slot: r('#mg-egg-slot'), skip: r('#skip-btn'), lskip: r('#mg-listen-skip'), cls: document.body.className }; })()`;
const modes = process.argv.slice(2).length ? process.argv.slice(2) : ['1:visual', '1:audio', '2:visual', '2:audio', '3:visual', '3:audio'];
const vps = (process.env.VPS || '960x576').split(',').map(s => s.split('x').map(Number));
try {
  await b.nav(b.menu); await b.preserve();
  for (const [w, h] of vps) {
    await b.viewport(w, h);
    for (const m of modes) {
      const [lv, mode] = m.split(':');
      await b.ev(seed); await b.boot(Number(lv), mode); await b.sleep(900);
      console.log(w + 'x' + h, 'L' + lv, mode, JSON.stringify(await b.ev(R)));
    }
  }
} finally { try { await b.restore(); } finally { await b.close(); } }
