// 真页面看小窝摆件/挂饰：三个货架 + 多个视口下道具是否落在小窝卡内。
import { petBrowser } from './pet_browser.mjs';
const b = await petBrowser();
const seed = (coins, extra) => `(() => { localStorage.setItem('mathgameCoins', JSON.stringify({coins:${coins}})); const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return MG_PET.dayKey(x); };
  localStorage.setItem('mathgamePet', JSON.stringify(Object.assign({ version: 2, adopted: true, exp: 0, stage: 0, adoptedDay: d(-22), lastDay: d(0), xp: 20, days: [d(-3), d(-2), d(-1), d(0)], phase: 0, daily: { date: d(0), correct: 0, rounds: [] }, gifts: [], decor: 'leaf', decors: ['leaf', 'peach'], name: '数宝', hatchDay: '', birthSeen: false, affection: 0, stories: { seen: [], pending: [] } }, ${JSON.stringify(extra)}))); return true; })()`;
const open = async (coins, extra) => {
  await b.ev(seed(coins, extra)); await b.nav(b.menu); await b.sleep(450);
  await b.ev(`showPet(); petTab('Nest'); true`); await b.sleep(500);
  await b.ev(`(() => { const l = document.getElementById('petStoryLater'); if (l && l.offsetParent) l.click(); return true; })()`); await b.sleep(400);
  await b.ev(`petTab('Nest'); true`); await b.sleep(200);
};
const rects = `(() => { const h = document.querySelector('#petModal .pet-home').getBoundingClientRect();
  const r = s => [...document.querySelectorAll(s)].map(e => { const q = e.getBoundingClientRect(); return { cls: e.className, l: Math.round(q.left - h.left), r: Math.round(h.right - q.right), t: Math.round(q.top - h.top), w: Math.round(q.width), h: Math.round(q.height) }; });
  return { home: Math.round(h.width), props: r('.nest-prop'), hang: r('.nest-hang') }; })()`;
try {
  await b.viewport(1000, 576);
  await b.nav(b.menu); await b.preserve();
  const have = { items: ['sunflower', 'books', 'pinwheel', 'starlight', 'bunting', 'lantern'], put: { L: 'sunflower', R: 'pinwheel', H: 'starlight' } };
  await open(220, have);
  await b.shot('shop_real_decors');
  await b.ev(`petShelf(1); true`); await b.sleep(250); await b.shot('shop_real_props');
  await b.ev(`petShelf(2); true`); await b.sleep(250); await b.shot('shop_real_hang');
  await b.ev(`choosePetItem('lantern'); true`); await b.sleep(300); await b.shot('shop_real_lantern');
  await b.ev(`choosePetItem('garland'); true`); await b.sleep(300); await b.shot('shop_real_garland');
  await b.ev(`hidePet(); true`);
  for (const [w, h] of [[1000, 576], [900, 500], [780, 420], [700, 400], [640, 360], [601, 340], [600, 500], [412, 915], [320, 640]]) {
    await b.viewport(w, h);
    await open(220, have);
    console.log(w + 'x' + h, JSON.stringify(await b.ev(rects)));
    await b.shot(`shop_real_${w}x${h}`);
    await b.ev(`hidePet(); true`);
  }
  console.log('errors:', JSON.stringify(b.errors));
} finally { try { await b.viewport(1000, 576); await b.restore(); } finally { await b.close(); } }
