// 小窝商店扩容：三个货架（窝色/摆件/挂饰）、买断一次、同侧替换、点已摆出的收起，以及摆件落在小窝卡内。
import { readFileSync } from 'node:fs';
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
const seed = (coins, extra) => `(() => { ['mathgameStars', 'mathgameBest', 'mathgameMaxCompletedLevel'].forEach(k => localStorage.removeItem(k)); localStorage.setItem('mathgameCoins', JSON.stringify({coins:${coins}})); const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return MG_PET.dayKey(x); };
  localStorage.setItem('mathgamePet', JSON.stringify(Object.assign({ version: 2, adopted: true, exp: 0, stage: 0, adoptedDay: d(-22), lastDay: d(0), xp: 20, days: [d(-3), d(-2), d(-1), d(0)], phase: 0, daily: { date: d(0), correct: 0, rounds: [] }, gifts: [], decor: 'leaf', decors: ['leaf'], name: '数宝', hatchDay: '', birthSeen: false, affection: 0, stories: { seen: [], pending: [] } }, ${JSON.stringify(extra || {})}))); return true; })()`;
const open = async (coins, extra) => {
  await b.ev(seed(coins, extra)); await b.nav(b.menu); await b.sleep(450);
  await b.ev(`showPet(); petTab('Nest'); true`); await b.sleep(500);
  await b.ev(`(() => { const l = document.getElementById('petStoryLater'); if (l && l.offsetParent) l.click(); return true; })()`); await b.sleep(400);
  await b.ev(`petTab('Nest'); true`); await b.sleep(200);
};
const nest = () => b.ev(`(() => { const q = s => [...document.querySelectorAll(s)];
  return { props: q('#petNestItems .nest-prop').map(e => e.dataset.item + ':' + (e.classList.contains('nest-prop-L') ? 'L' : 'R')).sort(), hangs: q('#petNestItems .nest-hang').map(e => e.dataset.item),
    buttons: q('#petNestItems button').length, wallet: JSON.parse(localStorage.getItem('mathgameCoins')).coins, coinsLabel: document.getElementById('petCoins').textContent,
    msg: document.getElementById('petResponse').textContent }; })()`);
const card = id => b.ev(`(() => { const c = document.querySelector('#petDecors .pet-decor[data-item="${id}"]'); return c ? { dis: c.disabled, on: c.getAttribute('aria-pressed'), state: c.querySelector('.pd-state').textContent, name: c.querySelector('.pd-name').textContent, svg: !!c.querySelector('.pd-prev svg'), own: c.classList.contains('own') } : null; })()`);
const click = id => b.ev(`document.querySelector('#petDecors .pet-decor[data-item="${id}"]').click(); true`);
const saved = () => b.ev(`(() => { const p = JSON.parse(localStorage.getItem('mathgamePet')); return { items: p.items, put: p.put }; })()`);
const shelf = () => b.ev(`(() => ({ pressed: [...document.querySelectorAll('#petShelves .pet-shelf')].map(s => s.getAttribute('aria-pressed')).join(), counts: [...document.querySelectorAll('#petShelves .pet-shelf i')].map(i => i.textContent).join(),
  cards: document.querySelectorAll('#petDecors .pet-decor').length, items: document.querySelectorAll('#petDecors .pet-decor[data-item]').length, hint: document.getElementById('petShopHint').textContent, count: document.getElementById('petShopCount').textContent }))()`);
const bounds = `(() => { const card = document.querySelector('#petModal .pet-card').getBoundingClientRect(), art = document.getElementById('petArt').getBoundingClientRect();
  const inter = r => Math.max(0, Math.min(r.right, art.right) - Math.max(r.left, art.left));
  const rs = [...document.querySelectorAll('#petNestItems .nest-prop, #petNestItems .nest-hang')].map(e => { const r = e.getBoundingClientRect(); return { cls: e.className, in: r.left >= card.left - 1 && r.right <= card.right + 1 && r.top >= card.top - 1, over: Math.round(inter(r)), pe: getComputedStyle(e).pointerEvents, w: Math.round(r.width), h: Math.round(r.height) }; });
  const m = document.querySelector('#petModal .pet-card'); return { rs, modalX: m.scrollWidth - m.clientWidth, pageX: document.documentElement.scrollWidth - innerWidth }; })()`;
try {
  // 静态：价格表与不兼容写法
  const css = readFileSync(new URL('../pet-story.css', import.meta.url), 'utf8'), js = readFileSync(new URL('../pet-story.js', import.meta.url), 'utf8');
  P(!/(paint-order|:has\(|@layer|color-mix\(|oklch\(|\bdvh\b|\bsvh\b|\blvh\b)/.test(css + js), '摆件/挂饰的样式与插画不含 Chrome 91 不认的写法');
  await b.viewport(1000, 576);
  await b.nav(b.menu); await b.preserve();

  const data = await b.ev(`MG_PET.items.map(i => i.slot + ':' + i.id + ':' + i.cost).join(' ')`);
  P(data === 'L:sunflower:80 L:books:120 L:pumpkin:160 L:fountain:240 R:mushroom:90 R:pinwheel:130 R:mailbox:170 R:tent:250 R:wishstar:0 H:bunting:100 H:starlight:160 H:lantern:220 H:garland:280', '12 件商店摆件挂饰 + 1 件限定许愿星灯(R:wishstar:0)的槽位与价格按方案', data);
  P(await b.ev(`MG_PET.items.filter(i => i.limited).map(i => i.id).join()`) === 'wishstar', '只有许愿星灯是限定款（打卡 D7 才送、不上架）');
  const decors = await b.ev(`MG_PET.decors.map(d => d.cost).join()`);
  P(decors === '0,50,70,90,110,110,150,150,190,190,240,300', '12 款窝色价格已上调', decors);
  P(await b.ev(`MG_PET.items.every(i => { const a = MG_PET_STORY.itemArt(i.id), v = MG_PET_STORY.itemPrev(i.id); return a.startsWith('<svg') && v.startsWith('<svg') && !/<script|onload=|href=/.test(a + v); })`), '每件都有安全的内联 SVG 与预览');

  // 货架与购买流程
  await open(313, { decors: ['leaf', 'peach'], gifts: [1, 2] });
  let s = await shelf();
  P(s.pressed === 'true,false,false' && s.counts === '2/12,0/8,0/4' && s.cards === 12 && s.items === 0, '默认停在「窝色」，三个货架各显示已拥有数', s);
  const btn0 = (await nest()).buttons;
  await b.ev(`petShelf(1); true`); await b.sleep(200);
  s = await shelf();
  P(s.pressed === 'false,true,false' && s.cards === 8 && s.items === 8 && s.count.includes('0/8') && s.hint.includes('收起'), '切到「摆件」：8 张卡、提示可收起', s);
  P(await b.ev(`document.getElementById('petDecors').scrollLeft <= 4`), '换货架后列表回到最左');
  let c = await card('sunflower');
  P(c && !c.dis && c.state === '80 星币' && c.on === 'false' && c.svg && c.name === '向日葵盆', '未拥有的摆件显示价格与预览', c);
  await click('sunflower'); await b.sleep(250);
  let n = await nest(), sv = await saved();
  P(n.wallet === 233 && n.coinsLabel === '233' && n.props.join() === 'sunflower:L' && !n.hangs.length, '买向日葵：扣 80，左边出现向日葵', n);
  P(sv.items.join() === 'sunflower' && sv.put.L === 'sunflower', '存档记下已拥有并摆出', sv);
  P(n.msg.includes('向日葵盆'), '提示语带摆件名', n.msg);
  c = await card('sunflower');
  P(c.on === 'true' && c.state === '摆出中' && c.own, '向日葵卡显示「摆出中」', c);
  // 点已摆出的：收起，免费，仍拥有
  await click('sunflower'); await b.sleep(250);
  n = await nest(); c = await card('sunflower');
  P(!n.props.length && n.wallet === 233 && c.state === '点我摆出' && c.on === 'false' && c.own, '再点一下收起：不扣钱、仍拥有，卡片写「点我摆出」', [n, c]);
  await click('sunflower'); await b.sleep(250);
  n = await nest();
  P(n.wallet === 233 && n.props.join() === 'sunflower:L', '收起后再摆出免费', n);
  // 同侧替换
  await click('books'); await b.sleep(250);
  n = await nest(); sv = await saved();
  P(n.wallet === 113 && n.props.join() === 'books:L' && sv.items.join() === 'sunflower,books', '买小书堆：左侧被换成书堆（同侧只摆一件）', [n, sv]);
  // 另一侧并存
  await click('mushroom'); await b.sleep(250);
  n = await nest();
  P(n.wallet === 23 && n.props.join() === 'books:L,mushroom:R', '买红蘑菇：右侧并存，左右各一件', n);
  // 买不起
  c = await card('pinwheel');
  P(c.dis && c.state === '还差 107', '星币不够：灰掉并写「还差 107」', c);
  await click('pinwheel').catch(() => 0); await b.sleep(150);
  n = await nest();
  P(n.wallet === 23 && !(await saved()).items.includes('pinwheel'), '买不起的点了也买不到');
  c = await card('sunflower');
  P(!c.dis && c.state === '点我摆出', '已拥有的摆件星币再少也能点', c);
  P(n.buttons === btn0, '小窝礼物按钮数量不受摆件影响', [btn0, n.buttons]);
  await b.shot('items_props_1000x576');

  // 挂饰
  await b.ev(`localStorage.setItem('mathgameCoins', JSON.stringify({coins:400})); renderPet(); petShelf(2); true`); await b.sleep(250);
  s = await shelf();
  P(s.pressed === 'false,false,true' && s.cards === 4 && s.items === 4 && s.counts === '2/12,3/8,0/4', '切到「挂饰」：4 张卡，摆件已拥有数 3/8', s);
  c = await card('lantern');
  P(c.state === '220 星币' && c.name === '纸灯笼', '挂饰卡显示价格', c);
  await click('bunting'); await b.sleep(250);
  n = await nest();
  P(n.wallet === 300 && n.hangs.join() === 'bunting' && n.props.join() === 'books:L,mushroom:R', '买彩旗串：顶上挂一条，地上摆件不变', n);
  c = await card('bunting');
  P(c.state === '挂着中' && c.on === 'true', '彩旗串卡显示「挂着中」', c);
  await click('lantern'); await b.sleep(250);
  n = await nest();
  P(n.wallet === 80 && n.hangs.join() === 'lantern', '买纸灯笼：顶上只留一条（换掉彩旗）', n);
  c = await card('bunting');
  P(c.state === '点我挂上' && c.own, '被换下的彩旗仍拥有', c);
  await click('lantern'); await b.sleep(250);
  n = await nest();
  P(!n.hangs.length && n.wallet === 80, '点已挂着的灯笼：收起，不扣钱', n);
  await b.ev(`petShelf(0); true`); await b.sleep(200);
  s = await shelf();
  P(s.pressed === 'true,false,false' && s.cards === 12 && s.count.includes('2/12') && s.hint.includes('滑动'), '切回「窝色」恢复原样', s);
  await b.ev(`hidePet(); true`);

  // 重开页面后摆件还在
  await open(0, { decors: ['leaf'], items: ['pinwheel', 'starlight'], put: { L: '', R: 'pinwheel', H: 'starlight' } });
  n = await nest();
  P(n.props.join() === 'pinwheel:R' && n.hangs.join() === 'starlight', '重新进入小窝：已摆出的摆件与挂饰还在', n);
  await b.ev(`hidePet(); true`);

  // 脏存档：不认识的 id、槽位不符、没买过的都被清掉
  await open(0, { items: ['mushroom', 'ghost'], put: { L: 'mushroom', R: 'tent', H: 'bunting' } });
  n = await nest();
  P(!n.props.length && !n.hangs.length, '存档里槽位不符/没买过/不存在的摆件不会被画出来', n);
  await b.ev(`hidePet(); true`);

  // 各视口：摆件挂饰都在小窝卡内、不挡宠物、不拦点击、不横向溢出
  for (const [w, h] of [[1000, 576], [900, 500], [780, 420], [640, 360], [412, 915], [320, 640]]) {
    await b.viewport(w, h);
    await open(0, { items: ['sunflower', 'pinwheel', 'starlight'], put: { L: 'sunflower', R: 'pinwheel', H: 'starlight' } });
    const g = await b.ev(bounds), tag = `${w}×${h}`;
    P(g.rs.length === 3, `${tag}：两件摆件 + 一条挂饰都画出来`, g.rs.map(r => r.cls));
    P(g.rs.every(r => r.in), `${tag}：全部落在小窝卡片范围内`, g.rs);
    P(g.rs.every(r => r.pe === 'none'), `${tag}：不拦截点击`);
    P(g.rs.filter(r => r.cls.includes('nest-prop')).every(r => r.over <= 2), `${tag}：摆件不压在宠物身上`, g.rs.map(r => r.over));
    P(g.modalX <= 1 && g.pageX <= 1, `${tag}：弹窗与页面都没有横向溢出`, [g.modalX, g.pageX]);
    const gifts = await b.ev(`document.querySelectorAll('#petNestItems button').length`);
    P(gifts === 0, `${tag}：没礼物时没有多余按钮`, gifts);
    await b.shot(`items_${w}x${h}`);
    await b.ev(`hidePet(); true`);
  }
  P(b.errors.length === 0, '无脚本异常', b.errors);
} finally { try { await b.viewport(1000, 576); await b.restore(); } finally { await b.close(); } }
finish('PET ITEMS');
