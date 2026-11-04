// 取景：小窝商店（星币商店）横向滑动。用法：node .shots/_shot_shop.mjs <前缀> [宽x高,...] [星币]
import { petBrowser } from './pet_browser.mjs';
const b = await petBrowser();
const prefix = process.argv[2] || 'shop';
const sizes = (process.argv[3] || '1000x576').split(',').map(s => s.split('x').map(Number));
const coinsSeed = Number(process.argv[4] || 313);
const geo = `(() => { const q = s => document.querySelector(s), R = e => { if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; };
  const box = q('#petDecors'), cards = [...document.querySelectorAll('#petDecors .pet-decor')];
  return { vw: innerWidth, vh: innerHeight, box: R(box), boxScroll: [box.scrollLeft, box.scrollWidth, box.clientWidth], n: cards.length, card0: R(cards[0]), card1: R(cards[1]),
    prevDis: q('#petShopPrev').disabled, nextDis: q('#petShopNext').disabled, count: q('#petShopCount').textContent, homeBg: getComputedStyle(q('#petModal .pet-home')).backgroundImage.slice(0, 60),
    cardScroll: (c => [c.scrollTop, c.scrollHeight, c.clientHeight])(q('#petModal .pet-card')), pageOverflowX: document.documentElement.scrollWidth - innerWidth }; })()`;
try {
  await b.nav(b.menu); await b.preserve();
  for (const [w, h] of sizes) {
    await b.viewport(w, h);
    await b.ev(`(() => { localStorage.setItem('mathgameCoins', JSON.stringify({coins:${coinsSeed}})); const k = 'mathgamePet'; const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return MG_PET.dayKey(x); };
      localStorage.setItem(k, JSON.stringify({ version: 2, adopted: true, exp: 0, stage: 0, adoptedDay: d(-22), lastDay: d(0), xp: 20, days: [d(-3), d(-2), d(-1), d(0)], phase: 0, daily: { date: d(0), correct: 0, rounds: [] }, gifts: [], decor: 'leaf', decors: ['leaf'], name: '数宝', hatchDay: '', birthSeen: false, affection: 0, stories: { seen: [], pending: [] } })); return true; })()`);
    await b.nav(b.menu); await b.sleep(500);
    await b.ev(`showPet(); petTab('Nest'); true`); await b.sleep(600);
    await b.ev(`(() => { const l = document.getElementById('petStoryLater'); if (l && l.offsetParent) l.click(); return true; })()`); await b.sleep(500);
    await b.ev(`petTab('Nest'); true`); await b.sleep(200);
    const tag = `${prefix}_${w}x${h}`;
    console.log(tag, 'top', JSON.stringify(await b.ev(geo)));
    await b.shot(tag + '_a');
    await b.ev(`petShopScroll(1); true`); await b.sleep(700);
    await b.ev(`petShopScroll(1); true`); await b.sleep(700);
    console.log(tag, 'scrolled', JSON.stringify(await b.ev(geo)));
    await b.shot(tag + '_b');
    await b.ev(`choosePetDecor('${process.argv[5] || 'peach'}'); true`); await b.sleep(400);
    console.log(tag, 'bought', JSON.stringify(await b.ev(geo)));
    await b.shot(tag + '_c');
    await b.ev(`hidePet(); true`);
  }
} finally {
  try { await b.viewport(1000, 576); await b.restore(); } finally { await b.close(); }
}
