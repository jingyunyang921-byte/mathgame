// 小窝“今天”页给不识字的孩子看：萌蛋够大（摸蛋本身就能互动）；关闭钮是右上角的圆钮，没有底部长条，没领养时只在蛋下面放一个“领养”药丸；
// 蛋下面有“经验 N / 900”和一句“还差 N 点”；今天页右侧只有碗、材料格、串门的朋友，没有“去第 N 关”“复习”“今天想要”。
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
const VIS = `const visOf = el => { if (!el) return ''; let t = ''; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) { const n = w.currentNode; if (!n.parentElement.closest('.ps-sr,.quiet,[hidden]') && n.parentElement.getClientRects().length) t += n.textContent; } return t.replace(/\\s+/g, ''); };`;
const seed = xp => `(() => { ['mathgamePet', 'mathgameStars', 'mathgameSettings'].forEach(k => localStorage.removeItem(k)); MG_PET.adopt();
  localStorage.setItem('mathgameStars', JSON.stringify({ 1: 3, 2: 2 })); [1, 2].forEach(n => MG_PET.claimGift(n));
  const p = MG_PET.get(); p.xp = ${xp}; p.used = { 1: 9, 2: 4 }; p.bag = { 1: 2, 2: 1 }; localStorage.setItem('mathgamePet', JSON.stringify(p)); return true; })()`;
const open = due => `(() => { document.querySelectorAll('.locked-modal.show').forEach(m => { m.classList.remove('show'); m.setAttribute('aria-hidden', 'true'); }); window.countDueWrong = () => ${due}; showPet(); petTab('Today'); return true; })()`;
const reload = async () => { await b.nav(b.menu); await b.sleep(900); };
try {
  await b.nav(b.menu); await b.preserve();
  for (const [w, h, minArt] of [[1000, 576, 200], [900, 500, 200], [800, 480, 115], [412, 915, 110]]) {
    await b.viewport(w, h); await b.ev(seed(330)); await reload(); await b.ev(open(4)); await b.sleep(400);
    const m = await b.ev(`(() => { ${VIS} const R = s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; }, home = R('.pet-home'), art = R('#petArt'), card = R('#petModal .pet-card'), eggs = [...document.querySelectorAll('.en-path .en-stop')];
      const strip = R('.en-path'), x = R('#petCloseBtn'), xe = document.elementFromPoint(x.x + x.width / 2, x.y + x.height / 2), eg = eggs.map(e => e.querySelector('b').getBoundingClientRect()), tiles = [...document.querySelectorAll('#petBag > button')].map(t => t.getBoundingClientRect());
      return { artW: Math.round(art.width),
        homeVis: visOf(document.querySelector('.pet-home')), name: document.getElementById('petName').textContent, xpVis: visOf(document.getElementById('petEnergyNum')), todayVis: visOf(document.getElementById('petPanelToday')),
        eggs: eggs.length, got: eggs.filter(e => e.classList.contains('got')).length, nx: eggs.filter(e => e.classList.contains('nx')).length, far: eggs.filter(e => e.classList.contains('far')).length,
        eggMin: Math.round(Math.min(...eg.map(r => r.width))), eggIn: eg.every(r => r.left >= home.left - 1 && r.right <= home.right + 1), stripIn: strip.left >= home.left - 1 && strip.right <= home.right + 1,
        old: !!document.querySelector('.en-head,.en-next,.en-done,#petNestLabel'), pb: document.querySelector('.en-path').getAttribute('role'), now: document.querySelector('.en-path').getAttribute('aria-valuenow'),
        closeVis: visOf(document.getElementById('petCloseBtn')), closeSvg: !!document.querySelector('#petCloseBtn svg'), noFeed: !document.getElementById('petFeedBtn'), closeW: Math.round(x.width), closeHit: document.getElementById('petCloseBtn').contains(xe),
        closeIn: x.top >= card.top - 1 && x.right <= card.right + 1 && x.right <= innerWidth && x.top >= 0, footer: !!document.querySelector('.pet-footer'), adVis: getComputedStyle(document.getElementById('petAdoptBtn')).display !== 'none', x: document.documentElement.scrollWidth <= innerWidth + 1,
        tiles: tiles.length, tileMin: Math.round(Math.min(...tiles.map(t => Math.min(t.width, t.height)))), resp: document.getElementById('petResponse').classList.contains('ps-sr'), daily: document.getElementById('petDailyStatus').classList.contains('ps-sr') }; })()`);
    P(m.artW >= minArt, `${w}×${h} 萌蛋够大：宽 ≥ ${minArt}px`, { artW: m.artW });
    P(m.eggs === 7 && m.got === 2 && m.nx === 1 && m.far === 4 && m.eggMin >= 24 && m.eggIn && m.stripIn && m.pb === 'progressbar' && m.now === '330' && !m.old,
      `${w}×${h} 成长小路：7 颗小蛋（2 颗已到、1 颗是下一站、4 颗还没到），每颗 ≥ 24px 且在左栏内；没有刻度数字和旧的进度框`, m);
    const fl = await b.ev(`(() => { const st = e => getComputedStyle(e), bs = [...document.querySelectorAll('.en-path .en-stop b')];
      return { n: bs.length, eggs: bs.filter(b => b.querySelector('svg.egg')).length, looks: new Set(bs.map(b => b.querySelector('svg').innerHTML)).size, flowers: bs.filter(b => b.querySelector('path[stroke="#6BAF52"]')).length, hid: bs.every(b => b.querySelector('svg').getAttribute('aria-hidden') === 'true') }; })()`);
    P(fl.n === 7 && fl.eggs === 7 && fl.looks === 7 && fl.flowers === 0 && fl.hid, `${w}×${h} 7 个站点都是小蛋（不是小花），7 颗长得各不相同，图标对读屏隐藏`, fl);
    const col = await b.ev(`(() => { const st = e => getComputedStyle(e), bs = [...document.querySelectorAll('.en-path .en-stop b')], far = document.querySelector('.en-path .en-stop.far'), fill = document.querySelector('.en-trk .en-fill');
      return { rings: new Set(bs.map(e => st(e).borderTopColor)).size, filter: st(far.querySelector('svg')).filter, op: +st(far.querySelector('svg')).opacity, gotLine: st(document.querySelector('.en-path .en-stop.got b')).borderTopStyle, farLine: st(far.querySelector('b')).borderTopStyle,
        fill: st(fill).backgroundImage.includes('gradient'), trk: st(document.querySelector('.en-trk')).backgroundImage.includes('gradient'), size: fill.style.backgroundSize }; })()`);
    P(col.rings === 7 && col.filter === 'none' && col.op >= 0.5 && col.gotLine === 'solid' && col.farLine === 'dashed' && col.fill && col.trk && /%/.test(col.size),
      `${w}×${h} 成长小路是彩虹主题：7 颗小蛋 7 种圈色，没到的蛋仍有颜色（没有灰滤镜），已到实心圈、没到虚线圈，进度条填色与底色都是彩虹渐变`, col);
    const bad = ['今天学好', '再答对', '解锁', '先复习', '复习', '去第', '题', '分'].filter(s => m.todayVis.includes(s));
    P(m.homeVis === m.name.replace(/\s+/g, '') + m.xpVis && /^经验330\/900还差\d+点，蛋有新变化$/.test(m.xpVis) && bad.length === 0, `${w}×${h} 左栏只有阶段名 + “经验 330 / 900” + 一句“还差 N 点”；今天页看得见的字里没有“去第 / 复习 / 今天学好 / 再答对 / 解锁”`, { home: m.homeVis, xp: m.xpVis, bad, today: m.todayVis });
    P(m.resp && m.daily && m.tiles === 6 && m.tileMin >= 44, `${w}×${h} 提示行、今日状态收进读屏区；材料格 6 个，每个 ≥ 44px`, m);
    P(m.closeSvg && m.closeVis === '' && m.noFeed && m.closeW >= 44 && m.closeHit && m.closeIn && !m.footer && !m.adVis && m.x, `${w}×${h} 关闭：右上角 ≥ 44px 的 X 圆钮（图标、点得到、在卡内）；已领养时没有底部长条、领养药丸收起，没有“摸一摸”、没有横向溢出`, m);
    if (w === 1000) await b.shot('nest_preschool_1000x576');
  }

  // 到期错题数不再影响今天页：没有“去第 N 关”主钮，也没有复习小图标
  await b.viewport(1000, 576);
  for (const due of [0, 4, 12]) {
    await b.ev(open(due)); await b.ev('renderPet(); true');
    const r = await b.ev(`(() => { ${VIS} return { start: !!document.getElementById('petStartBtn'), review: !!document.getElementById('petReviewBtn'), want: !!document.getElementById('petWant'), vis: visOf(document.getElementById('petPanelToday')) }; })()`);
    P(!r.start && !r.review && !r.want && !/复习|9\+|去第/.test(r.vis), `有 ${due} 道到期错题：今天页没有“去第 N 关”、复习图标和“今天想要”`, r);
  }

  // 还没领养：小路上没有“已到”的蛋，蛋下面只有一个领养药丸，右上角仍有关闭钮
  await b.ev(`['mathgamePet', 'mathgameStars', 'mathgameSettings'].forEach(k => localStorage.removeItem(k)); true`); await reload();
  await b.ev(open(0)); await b.sleep(300);
  const un = await b.ev(`(() => { ${VIS} const e = [...document.querySelectorAll('.en-path .en-stop')], a = document.getElementById('petAdoptBtn'), x = document.getElementById('petCloseBtn').getBoundingClientRect();
    return { n: e.length, got: e.filter(x => x.classList.contains('got')).length, adopt: getComputedStyle(a).display !== 'none' && a.getBoundingClientRect().height > 0, btns: [...document.querySelectorAll('#petModal [onclick*="adoptPet"]')].filter(b => b.getClientRects().length).map(b => b.id), inHome: !!a.closest('.pet-home'), footer: !!document.querySelector('.pet-footer'), closeW: Math.round(x.width), want: !!document.getElementById('petWant'), home: visOf(document.querySelector('.pet-home')) }; })()`);
  P(un.n === 7 && un.got === 0 && un.adopt && un.btns.join() === 'petAdoptBtn' && un.inHome && !un.footer && un.closeW >= 44 && !un.want && !/\d/.test(un.home), '没领养:7 颗蛋都还没到,只有蛋下面一个领养药丸(没有底部长条),右上角有关闭钮,左栏没有数字', un);

  // 下一颗蛋轻轻晃，减少动态效果时必须停
  const rm = await b.ev(`(() => { let hit = false; for (const ss of document.styleSheets) { let rules; try { rules = ss.cssRules; } catch (e) { continue; } for (const r of rules) { if (r.media && /prefers-reduced-motion:\\s*reduce/.test(r.media.mediaText) && r.cssText.includes('.en-stop.nx b')) hit = true; } } return hit; })()`);
  P(rm, '“下一颗蛋”的轻晃动画在减少动态效果下被关掉');
} finally { await b.restore(); await b.close(); }
finish('NEST PRESCHOOL');
