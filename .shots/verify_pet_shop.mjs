// 小窝商店：星币能买的款式多了，横向滑动浏览，点一下购买/使用。
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
const seed = (adopted, coins) => `(() => { localStorage.setItem('mathgameCoins', JSON.stringify({coins:${coins}})); const k = 'mathgamePet'; if (${adopted}) { const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return MG_PET.dayKey(x); };
  localStorage.setItem(k, JSON.stringify({ version: 2, adopted: true, exp: 0, stage: 0, adoptedDay: d(-22), lastDay: d(0), xp: 20, days: [d(-3), d(-2), d(-1), d(0)], phase: 0, daily: { date: d(0), correct: 0, rounds: [] }, gifts: [], decor: 'leaf', decors: ['leaf'], name: '数宝', hatchDay: '', birthSeen: false, affection: 0, stories: { seen: [], pending: [] } })); } else localStorage.removeItem(k); return true; })()`;
const open = async (adopted, coins) => {
  await b.ev(seed(adopted, coins)); await b.nav(b.menu); await b.sleep(450);
  await b.ev(`showPet(); petTab('Nest'); true`); await b.sleep(500);
  await b.ev(`(() => { const l = document.getElementById('petStoryLater'); if (l && l.offsetParent) l.click(); return true; })()`); await b.sleep(400);
  await b.ev(`petTab('Nest'); true`); await b.sleep(200);
};
const geo = `(() => { const q = s => document.querySelector(s), box = q('#petDecors'), br = box.getBoundingClientRect(), cards = [...box.querySelectorAll('.pet-decor')], card = q('#petModal .pet-card');
  const home = getComputedStyle(q('#petModal .pet-home')).backgroundImage;
  return { n: cards.length, sl: box.scrollLeft, sw: box.scrollWidth, cw: box.clientWidth, ox: getComputedStyle(box).overflowX, ta: getComputedStyle(box).touchAction,
    widths: [...new Set(cards.map(c => Math.round(c.getBoundingClientRect().width)))], vertClip: cards.some(c => c.getBoundingClientRect().bottom > br.bottom + 1 || c.getBoundingClientRect().top < br.top - 1),
    prev: q('#petShopPrev').disabled, next: q('#petShopNext').disabled, count: q('#petShopCount').textContent, coins: q('#petCoins').textContent, home,
    modalX: card.scrollWidth - card.clientWidth, pageX: document.documentElement.scrollWidth - innerWidth, boxRect: { l: br.left, t: br.top, r: br.right, b: br.bottom } }; })()`;
const cardInfo = id => b.ev(`(() => { const c = document.querySelector('#petDecors .pet-decor[data-decor="${id}"]'); return c ? { dis: c.disabled, on: c.getAttribute('aria-pressed'), state: c.querySelector('.pd-state').textContent, own: c.classList.contains('own'), name: c.querySelector('.pd-name').textContent, prev: !!c.querySelector('.pd-prev svg') } : null; })()`);
const wallet = () => b.ev(`JSON.parse(localStorage.getItem('mathgameCoins')).coins`);
const savedPet = () => b.ev(`(() => { const p = JSON.parse(localStorage.getItem('mathgamePet')); return { decor: p.decor, decors: p.decors }; })()`);
const clickCard = id => b.ev(`document.querySelector('#petDecors .pet-decor[data-decor="${id}"]').click(); true`);
try {
  await b.nav(b.menu); await b.preserve();

  const data = await b.ev(`MG_PET.decors.map(d => ({ id: d.id, name: d.name, color: d.color, cost: d.cost, bg: d.bg || '' }))`);
  P(data.length >= 12, `小窝款式不少于 12 款（现有 ${data.length}）`);
  P(new Set(data.map(d => d.id)).size === data.length && new Set(data.map(d => d.name)).size === data.length, '款式 id 和名字都不重复');
  P(data.slice(0, 3).map(d => d.id + ':' + d.cost).join() === 'leaf:0,peach:50,sea:70', '原有三款 id 和价格不变', data.slice(0, 3));
  P(data.every(d => /^#[0-9A-Fa-f]{6}$/.test(d.color) && Number.isInteger(d.cost) && d.cost >= 0 && d.cost <= 300), '颜色是 6 位十六进制，价格是 0~300 的整数');
  P(data.every((d, i) => i === 0 || d.cost >= data[i - 1].cost), '按价格从低到高排列');
  P(data.slice(3).every(d => d.bg && !/(color-mix|oklch|:has|@layer)/.test(d.bg)), '新款都带背景，且不含 Chrome 91 不认的写法');
  P(data.slice(3).every(d => d.bg.length > 0), '新款背景非空');

  // 未领养：商店能看，但所有款式都不能买
  await b.viewport(1000, 576);
  await open(false, 313);
  let g = await b.ev(geo);
  P(g.n === data.length, `未领养：商店仍展示全部 ${data.length} 款`, g.n);
  P(await b.ev(`[...document.querySelectorAll('#petDecors .pet-decor')].every(c => c.disabled)`), '未领养：所有款式不可点');
  await b.ev(`hidePet(); true`);

  for (const [w, h] of [[1000, 576], [900, 500], [412, 915]]) {
    await b.viewport(w, h);
    await open(true, 313);
    const tag = `${w}×${h}`;
    g = await b.ev(geo);
    P(g.n === data.length, `${tag}：商店展示全部 ${data.length} 款`, g.n);
    P(g.ox === 'auto' && g.sw > g.cw + 100, `${tag}：商店可横向滚动（内容 ${g.sw} > 可视 ${g.cw}）`, [g.ox, g.sw, g.cw]);
    P(g.ta !== 'none' && g.ta !== 'pan-y', `${tag}：横向手势没被禁用`, g.ta);
    P(g.widths.length === 1 && g.widths[0] >= 88, `${tag}：每张卡等宽、不被压扁`, g.widths);
    P(!g.vertClip, `${tag}：卡片上下完整，没被裁掉`);
    P(g.modalX <= 1 && g.pageX <= 1, `${tag}：整个弹窗和页面都没有横向溢出`, [g.modalX, g.pageX]);
    P(g.prev === true && g.next === false, `${tag}：起点「往左」灰、「往右」亮`, [g.prev, g.next]);
    P(g.count.includes('1/' + data.length), `${tag}：显示已拥有 1/${data.length}`, g.count);
    // 点箭头
    await b.ev(`document.getElementById('petShopNext').click(); true`); await b.sleep(900);
    let g2 = await b.ev(geo);
    P(g2.sl > g.sl + 100, `${tag}：点「往右」后列表向右滑动`, [g.sl, g2.sl]);
    P(g2.prev === false, `${tag}：滑动后「往左」变亮`, g2.prev);
    // 滚轮/拖动横向滚动（本机 Chrome 合成不了手指触摸，真手指滑动靠真机手验）
    const cx = Math.round((g2.boxRect.l + g2.boxRect.r) / 2), cy = Math.round((g2.boxRect.t + g2.boxRect.b) / 2);
    await b.send('Input.synthesizeScrollGesture', { x: cx, y: cy, xDistance: -220, gestureSourceType: 'mouse', speed: 900 });
    await b.sleep(900);
    const g3 = await b.ev(geo);
    P(g3.sl > g2.sl + 60, `${tag}：向左拖/滚，列表继续向右走`, [g2.sl, g3.sl]);
    await b.send('Input.synthesizeScrollGesture', { x: cx, y: cy, xDistance: 600, gestureSourceType: 'mouse', speed: 1200 });
    await b.sleep(900);
    const g4 = await b.ev(geo);
    P(g4.sl < g3.sl - 60, `${tag}：向右拖/滚，列表往回走`, [g3.sl, g4.sl]);
    // 滑到最右
    await b.ev(`document.getElementById('petDecors').scrollLeft = 99999; true`); await b.sleep(300);
    g2 = await b.ev(geo);
    P(g2.next === true && g2.prev === false, `${tag}：到最右头「往右」变灰`, [g2.prev, g2.next]);
    const last = data[data.length - 1];
    const lr = await b.ev(`(() => { const c = document.querySelector('#petDecors .pet-decor[data-decor="${last.id}"]').getBoundingClientRect(), box = document.getElementById('petDecors').getBoundingClientRect(); return { l: c.left, r: c.right, bl: box.left, br: box.right }; })()`);
    P(lr.r <= lr.br + 1 && lr.l >= lr.bl - 1, `${tag}：最后一款「${last.name}」完整露在可视区内`, lr);
    await b.ev(`document.getElementById('petDecors').scrollLeft = 0; true`); await b.sleep(250);

    // 购买：薄荷窝 90 → 余额 223
    const mint = data.find(d => d.id === 'mint');
    let c = await cardInfo('mint');
    P(c && !c.dis && c.state === mint.cost + ' 星币' && c.prev, `${tag}：薄荷窝显示价格 ${mint.cost} 星币并带预览`, c);
    await clickCard('mint'); await b.sleep(300);
    const w1 = await wallet(), sp = await savedPet();
    P(w1 === 313 - mint.cost, `${tag}：买薄荷窝扣 ${mint.cost}，余额 ${w1}`, w1);
    P(sp.decor === 'mint' && sp.decors.includes('mint') && sp.decors.includes('leaf'), `${tag}：存档里已拥有并正在使用薄荷窝`, sp);
    c = await cardInfo('mint');
    P(c.on === 'true' && c.state === '使用中' && c.own, `${tag}：薄荷窝卡显示「使用中」`, c);
    g2 = await b.ev(geo);
    P(g2.home !== 'none' && g2.coins === String(w1), `${tag}：小窝背景换上新款，星币显示 ${g2.coins}`, [g2.home.slice(0, 40), g2.coins]);
    P(g2.count.includes('2/' + data.length), `${tag}：已拥有变成 2/${data.length}`, g2.count);
    const msg = await b.ev(`document.getElementById('petResponse').textContent`);
    P(msg.includes('薄荷窝'), `${tag}：提示语带款式名`, msg);

    // 再点自己：不再扣钱
    await clickCard('mint'); await b.sleep(250);
    P(await wallet() === w1, `${tag}：已拥有的款式再点不再扣钱`);
    // 切回嫩叶窝：免费，背景回到默认
    await clickCard('leaf'); await b.sleep(300);
    P(await wallet() === w1 && (await savedPet()).decor === 'leaf', `${tag}：免费换回嫩叶窝`);
    P((await b.ev(geo)).home === 'none', `${tag}：嫩叶窝用默认背景`);
    // 买不起：把星币压到 20
    await b.ev(`localStorage.setItem('mathgameCoins', JSON.stringify({coins:20})); renderPet(); true`); await b.sleep(250);
    const exp = data.find(d => d.id === 'flower');
    c = await cardInfo('flower');
    P(c.dis && c.state === '还差 ' + (exp.cost - 20), `${tag}：星币不够时灰掉并写「还差 ${exp.cost - 20}」`, c);
    await clickCard('flower'); await b.sleep(200);
    P(await wallet() === 20 && !(await savedPet()).decors.includes('flower'), `${tag}：买不起的点了也买不到`);
    c = await cardInfo('mint');
    P(!c.dis && c.state === '点我使用', `${tag}：已拥有的款式星币再少也能点，写「点我使用」`, c);
    // 购买后滚动位置不跳回开头
    await b.ev(`localStorage.setItem('mathgameCoins', JSON.stringify({coins:313})); renderPet(); document.getElementById('petDecors').scrollLeft = 300; true`); await b.sleep(250);
    const before = (await b.ev(geo)).sl;
    await clickCard('sunset'); await b.sleep(300);
    const after = (await b.ev(geo)).sl;
    P(Math.abs(after - before) <= 2 && before > 200, `${tag}：购买后列表停在原位（${before} → ${after}）`, [before, after]);
    await b.shot(`pet_shop_${w}x${h}`);
    await b.ev(`hidePet(); true`);
  }
  P(b.errors.length === 0, '无脚本异常', b.errors);
} finally { try { await b.viewport(1000, 576); await b.restore(); } finally { await b.close(); } }
finish('PET SHOP');
