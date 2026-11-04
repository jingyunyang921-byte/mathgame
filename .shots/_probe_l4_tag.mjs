import { petBrowser } from './pet_browser.mjs';
const b = await petBrowser();
const seed = (ad) => `(() => {
  const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return MG_PET.dayKey(x); };
  ['mathgamePet', 'mathgameStars', 'mathgameCoins'].forEach(k => localStorage.removeItem(k));
  try { _mgPendingSnap = null; } catch (e) {}
  if (${ad}) localStorage.setItem('mathgamePet', JSON.stringify({ version: 2, adopted: true, exp: 0, stage: 0, adoptedDay: d(-22), lastDay: d(0), xp: 20,
    days: Array.from({ length: 4 }, (_, i) => d(-4 + i)), phase: 0, daily: { date: d(0), correct: 0, rounds: [] }, gifts: [], decor: 'leaf', decors: ['leaf'],
    name: '数宝', hatchDay: '', birthSeen: false, affection: 0, stories: { seen: [], pending: [] } }));
  return true; })()`;
try {
  await b.nav(b.menu); await b.preserve();
  for (const [w, h] of [[960, 576], [1000, 576]]) {
    await b.viewport(w, h);
    await b.ev(seed(true)); await b.boot(4, 'visual'); await b.sleep(900);
    console.log(w, JSON.stringify(await b.ev(`(() => { const r = s => { const e = document.querySelector(s); if (!e) return null; const q = e.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.top), Math.round(q.right), Math.round(q.bottom)]; };
      return { tag: r('#race-scene-tag'), prog: r('.race-prog-box'), left: r('#race-left-canvas'), right: r('#race-right-canvas'), back: r('#race-back-btn'), qc: r('#question-card'), cw: r('#canvas-wrapper'), ui: r('#race-ui'), slot: r('#mg-egg-slot'), finishY: Math.round(window.innerHeight*0.2) }; })()`)));
    await b.shot(`l4tag_${w}`);
  }
} finally { try { await b.restore(); } finally { await b.close(); } }
