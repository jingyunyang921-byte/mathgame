// 诊断：领养萌蛋弹窗（#petModal）滚动后底部按钮是否压住内容。用法：node .shots/_probe_pet_modal.mjs <前缀> [宽x高,...]
import { petBrowser } from './pet_browser.mjs';
const b = await petBrowser();
const prefix = process.argv[2] || 'petmodal';
const sizes = (process.argv[3] || '1000x576').split(',').map(s => s.split('x').map(Number));
const r2 = `(() => { const q = s => document.querySelector(s), R = e => { if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; };
  const card = q('#petModal .pet-card'), lay = q('#petModal .pet-layout'), jr = q('#petModal .pet-journal'), pn = [...document.querySelectorAll('#petModal .pet-panel')].find(p => !p.hidden), ft = q('#petModal .pet-footer');
  return { vw: innerWidth, vh: innerHeight, card: R(card), cardScroll: [card.scrollTop, card.scrollHeight, card.clientHeight], lay: R(lay), jr: R(jr), pn: R(pn), pnScroll: pn ? [pn.scrollTop, pn.scrollHeight, pn.clientHeight] : null, ft: R(ft),
    pos: getComputedStyle(ft).position }; })()`;
try {
  await b.nav(b.menu); await b.preserve();
  for (const [w, h] of sizes) {
    await b.viewport(w, h);
    for (const adopted of [false, true]) {
      await b.ev(`(() => { localStorage.setItem('mathgameCoins', '313'); const k = 'mathgamePet'; if (${adopted}) { const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return MG_PET.dayKey(x); };
        localStorage.setItem(k, JSON.stringify({ version: 2, adopted: true, exp: 0, stage: 0, adoptedDay: d(-22), lastDay: d(0), xp: 20, days: [d(-3), d(-2), d(-1), d(0)], phase: 0, daily: { date: d(0), correct: 0, rounds: [] }, gifts: [], decor: 'leaf', decors: ['leaf'], name: '数宝', hatchDay: '', birthSeen: false, affection: 0, stories: { seen: [], pending: [] } })); } else localStorage.removeItem(k); return true; })()`);
      await b.nav(b.menu); await b.sleep(500);
      await b.ev(`showPet(); petTab('Nest'); true`); await b.sleep(400);
      const tag = `${prefix}_${w}x${h}_${adopted ? 'adopted' : 'new'}`;
      const a = await b.ev(r2);
      console.log(tag, 'top', JSON.stringify(a));
      await b.shot(tag + '_top');
      await b.ev(`(() => { const c = document.querySelector('#petModal .pet-card'); c.scrollTop = c.scrollHeight; return true; })()`); await b.sleep(250);
      const z = await b.ev(r2);
      console.log(tag, 'bottom', JSON.stringify(z));
      await b.shot(tag + '_bottom');
      await b.ev(`(() => { const c = document.querySelector('#petModal .pet-card'); c.scrollTop = Math.round(c.scrollHeight / 3); return true; })()`); await b.sleep(250);
      await b.shot(tag + '_mid');
      await b.ev(`hidePet(); true`);
    }
  }
} finally {
  try { await b.viewport(1000, 576); await b.restore(); } finally { await b.close(); }
}
