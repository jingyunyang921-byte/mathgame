// 小窝商店扩充·静态稿：在真实菜单页的真实样式里注入「摆件/挂饰」货架与小窝摆放效果，另出一张总览+价格表。只截图，不改产品文件。
import { petBrowser } from './pet_browser.mjs';
import { GROUND, } from './shop_draft_art.mjs';
import { HANG, NEST_PRICES } from './shop_draft_art2.mjs';
const b = await petBrowser();
const seed = coins => `(() => { localStorage.setItem('mathgameCoins', JSON.stringify({coins:${coins}})); const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return MG_PET.dayKey(x); };
  localStorage.setItem('mathgamePet', JSON.stringify({ version: 2, adopted: true, exp: 0, stage: 0, adoptedDay: d(-22), lastDay: d(0), xp: 20, days: [d(-3), d(-2), d(-1), d(0)], phase: 0, daily: { date: d(0), correct: 0, rounds: [] }, gifts: [], decor: 'leaf', decors: ['leaf', 'peach'], name: '数宝', hatchDay: '', birthSeen: false, affection: 0, stories: { seen: [], pending: [] } })); return true; })()`;
const CSS = `.dchips{display:flex;gap:6px;margin:0 0 6px}.dchips button{flex:1;border:2px solid #E5D2B8;background:#FFF9EF;color:#775839;border-radius:999px;font:inherit;font-size:12px;font-weight:900;padding:4px 0}
.dchips button[aria-selected=true]{background:#E9A04B;border-color:#E9A04B;color:#fff}.dchips i{font-style:normal;font-weight:800;opacity:.85;margin-left:3px}
.dprop{position:absolute;width:42px;height:42px;bottom:16px;pointer-events:none}.dprop svg,.dhang svg{display:block;width:100%;height:100%}.dprop.dL{left:-44px}.dprop.dR{right:-44px}
.dhang{position:absolute;left:-43px;right:-43px;top:0;height:32px;pointer-events:none}`;
const ground = (it, w = 42) => it.art;
const prevG = it => `<span class="pd-prev"><svg viewBox="0 0 84 50" aria-hidden="true"><path d="M8 45.5H76" stroke="#D9C39E" stroke-width="2" stroke-linecap="round"/><svg x="22" y="4" width="40" height="40" viewBox="0 0 24 24">${it.art.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg></svg></span>`;
const prevH = it => `<span class="pd-prev"><svg viewBox="108 -1 84 51" aria-hidden="true">${it.art.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg></span>`;
const card = (it, prev, state, own, on) => `<button type="button" class="pet-decor${own ? ' own' : ''}" aria-pressed="${!!on}">${prev(it)}<span class="pd-name">${it.name}</span><span class="pd-state">${state}</span></button>`;
const coins = 220;
const st = (it, own, on) => on ? '摆出中' : own ? '点我摆出' : it.cost > coins ? '还差 ' + (it.cost - coins) : it.cost + ' 星币';
const shelf = (list, prev, owned, onIds) => list.map(it => card(it, prev, st(it, owned.includes(it.id), onIds.includes(it.id)), owned.includes(it.id), onIds.includes(it.id))).join('');
const chips = sel => `<div class="dchips">${[['窝色', '2/12'], ['摆件', '3/8'], ['挂饰', '2/4']].map(([n, c], i) => `<button type="button" aria-selected="${i === sel}">${n}<i>${c}</i></button>`).join('')}</div>`;
const pick = (list, id) => list.find(x => x.id === id);

async function scene({ shelfNo, L, R, H, tag }) {
  const owned = ['sunflower', 'books', 'pinwheel', 'starlight', 'bunting'];
  const on = [L, R, H].filter(Boolean);
  const cards = shelfNo === 1 ? shelf(GROUND, prevG, owned, on) : shelf(HANG, prevH, owned, on);
  await b.ev(`(() => { document.querySelectorAll('.dchips,.dprop,.dhang').forEach(n => n.remove());
    if (!document.getElementById('draftCss')) { const s = document.createElement('style'); s.id = 'draftCss'; s.textContent = ${JSON.stringify(CSS)}; document.head.appendChild(s); }
    const head = document.querySelector('.pet-shop-head'); head.insertAdjacentHTML('afterend', ${JSON.stringify(chips(shelfNo))});
    document.getElementById('petDecors').innerHTML = ${JSON.stringify(cards)}; document.getElementById('petDecors').scrollLeft = 0;
    document.getElementById('petShopCount').textContent = ${JSON.stringify(shelfNo === 1 ? ' · 摆件 已拥有 3/8' : ' · 挂饰 已拥有 2/4')};
    document.getElementById('petCoins').textContent = ${coins};
    const nest = document.getElementById('petNest');
    nest.insertAdjacentHTML('afterbegin', ${JSON.stringify(H ? `<div class="dhang">${pick(HANG, H).art}</div>` : '')});
    nest.insertAdjacentHTML('beforeend', ${JSON.stringify((L ? `<div class="dprop dL">${pick(GROUND, L).art}</div>` : '') + (R ? `<div class="dprop dR">${pick(GROUND, R).art}</div>` : ''))});
    return true; })()`);
  await b.sleep(250); await b.shot(tag);
}

try {
  await b.viewport(1000, 576);
  await b.nav(b.menu); await b.preserve();
  await b.ev(seed(coins)); await b.nav(b.menu); await b.sleep(450);
  await b.ev(`showPet(); petTab('Nest'); true`); await b.sleep(500);
  await b.ev(`(() => { const l = document.getElementById('petStoryLater'); if (l && l.offsetParent) l.click(); return true; })()`); await b.sleep(400);
  await b.ev(`petTab('Nest'); true`); await b.sleep(200);
  console.log(JSON.stringify(await b.ev(`(() => { const h = document.querySelector('#petModal .pet-home').getBoundingClientRect(), n = document.getElementById('petNest').getBoundingClientRect(); return { home: [h.left, h.width], nest: [n.left, n.width], flankL: n.left - h.left, flankR: h.right - n.right }; })()`)));
  await scene({ shelfNo: 1, L: 'sunflower', R: 'pinwheel', H: 'starlight', tag: 'shop_draft_ground' });
  await scene({ shelfNo: 2, L: 'books', R: 'mushroom', H: 'lantern', tag: 'shop_draft_hang' });
  // 总览页
  const cell = it => `<div class="c">${it.art}<b>${it.name}</b><u>${it.cost} 星币</u></div>`;
  const hcell = it => `<div class="c h">${it.art}<b>${it.name}</b><u>${it.cost} 星币</u></div>`;
  const rows = Object.entries(NEST_PRICES).map(([id, [o, n]]) => `<tr><td>${id}</td><td>${o}</td><td>→ <b>${n}</b></td></tr>`).join('');
  const sheet = `<div id="dsheet" style="position:fixed;inset:0;z-index:99999;background:#FFF9EF;font-family:inherit;color:#684321;padding:14px 20px;display:grid;grid-template-columns:1fr 190px;gap:18px;overflow:hidden">
  <style>#dsheet h3{margin:4px 0 6px;font-size:15px}#dsheet .g{display:grid;grid-template-columns:repeat(4,1fr);gap:8px 10px}#dsheet .c{display:flex;flex-direction:column;align-items:center;background:#FAEED9;border-radius:12px;padding:6px 4px;font-size:12px}
  #dsheet .c svg{width:56px;height:56px}#dsheet .c.h svg{width:100%;height:30px}#dsheet .c b{font-weight:900}#dsheet .c u{text-decoration:none;color:#8A5B22;font-weight:800}#dsheet .hg{display:grid;grid-template-columns:repeat(2,1fr);gap:8px 10px}
  #dsheet table{font-size:12px;border-collapse:collapse;width:100%}#dsheet td{padding:2px 4px;border-bottom:1px dashed #E5D2B8}#dsheet p{font-size:11px;line-height:1.5;margin:6px 0}</style>
  <div><h3>新增·摆件（地面，左边 4 款 / 右边 4 款，各摆一件）</h3><div class="g">${GROUND.map(cell).join('')}</div><h3 style="margin-top:12px">新增·挂饰（顶部横幅，同时只挂一条）</h3><div class="hg">${HANG.map(hcell).join('')}</div></div>
  <div><h3>窝色涨价（旧→新）</h3><table>${rows}</table><p>已买过的永远算已拥有，不退不补。一轮通关约 20~35 星币：最便宜的新款约 3 轮，最贵的约 10 轮。</p></div></div>`;
  await b.ev(`document.body.insertAdjacentHTML('beforeend', ${JSON.stringify(sheet)}); true`); await b.sleep(250);
  await b.shot('shop_draft_sheet');
  console.log('errors:', JSON.stringify(b.errors));
} finally { await b.restore(); await b.close(); }
