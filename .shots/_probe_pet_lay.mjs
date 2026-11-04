// 诊断：领养态下 .pet-layout 是否多出几像素滚动；footer 在滚动前后是否不动。
import { petBrowser } from './pet_browser.mjs';
const b = await petBrowser();
const sizes = (process.argv[2] || '1000x576').split(',').map(s => s.split('x').map(Number));
try {
  await b.nav(b.menu); await b.preserve();
  for (const [w, h] of sizes) {
    await b.viewport(w, h);
    await b.ev(`(() => { localStorage.setItem('mathgameCoins', '313'); const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return MG_PET.dayKey(x); };
      localStorage.setItem('mathgamePet', JSON.stringify({ version: 2, adopted: true, exp: 0, stage: 0, adoptedDay: d(-22), lastDay: d(0), xp: 20, days: [d(-3), d(-2), d(-1), d(0)], phase: 0, daily: { date: d(0), correct: 0, rounds: [] }, gifts: [], decor: 'leaf', decors: ['leaf'], name: '数宝', hatchDay: '', birthSeen: false, affection: 0, stories: { seen: [], pending: [] } })); return true; })()`);
    await b.nav(b.menu); await b.sleep(600);
    await b.ev(`showPet(); petTab('Nest'); true`); await b.sleep(400);
    const m = await b.ev(`(() => { const q = s => document.querySelector(s), lay = q('#petModal .pet-layout'), home = q('#petModal .pet-home'), jr = q('#petModal .pet-journal'), ft = q('#petModal .pet-footer');
      const top0 = ft.getBoundingClientRect().top; lay.scrollTop = lay.scrollHeight; const top1 = ft.getBoundingClientRect().top;
      return { lay: [lay.scrollTop, lay.scrollHeight, lay.clientHeight], homeH: Math.round(home.getBoundingClientRect().height), jrH: Math.round(jr.getBoundingClientRect().height), ftTop: [Math.round(top0), Math.round(top1)], card: (c => [c.scrollTop, c.scrollHeight, c.clientHeight])(q('#petModal .pet-card')) }; })()`);
    console.log(w + 'x' + h, JSON.stringify(m));
    await b.ev(`hidePet(); true`);
  }
} finally { try { await b.viewport(1000, 576); await b.restore(); } finally { await b.close(); } }
