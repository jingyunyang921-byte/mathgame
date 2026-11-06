// 小窝弹窗布局：没有底部长条；未领养时领养药丸在左栏萌蛋下面、不滚动就看得到点得到，且全弹窗只有这一个领养入口；已领养时药丸收起。
// 右上角关闭钮是钉在卡右上角的圆钮。内容滚动只发生在内部（.pet-layout/.pet-panel），不会把按钮盖住。
// 真机 Chrome 91 里 .pet-panel 不会被 flex 压到 journal 高度，旧版因此撑高 card 并让按钮压在内容上，这里按「面板不超出 journal」把关。
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
const SEEDS = {
  unadopted: null,
  empty: { bag: {}, gifts: [] },
  bag: { bag: { 1: 2, 2: 1, 3: 1 }, gifts: [1, 2] },
};
const seed = (kind) => `(() => { sessionStorage.setItem('mgAdoptGuide', '1'); localStorage.setItem('mathgameCoins', '313'); const k = 'mathgamePet', s = ${JSON.stringify(SEEDS[kind])}; if (s) { const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return MG_PET.dayKey(x); };
  const cnt = o => { const r = {}; for (let i = 1; i <= 6; i++) r[i] = (o && o[i]) || 0; return r; };
  localStorage.setItem(k, JSON.stringify({ version: 2, adopted: true, exp: 0, stage: 0, adoptedDay: d(-22), lastDay: d(0), xp: 20, days: [d(-3), d(-2), d(-1), d(0)], phase: 0, daily: { date: d(0), correct: 0, rounds: [] }, gifts: s.gifts, decor: 'leaf', decors: ['leaf'], name: '数宝', hatchDay: '', birthSeen: false, affection: 0, stories: { seen: [], pending: [] }, xpDay: { date: d(0), got: 0, checkin: false, clears: 0, uses: 0 }, bag: cnt(s.bag), used: cnt() })); } else localStorage.removeItem(k); return true; })()`;
const probe = `(() => { const q = s => document.querySelector(s), R = e => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
  const vis = e => !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0;
  const card = q('#petModal .pet-card'), lay = q('#petModal .pet-layout'), jr = q('#petModal .pet-journal'), panels = [...document.querySelectorAll('#petModal .pet-panel')], pn = panels.find(p => !p.hidden),
    xb = q('#petCloseBtn'), ad = q('#petAdoptBtn'), pv = q('#petPreview'), tabs = q('#petModal .pet-tabs');
  const adr = R(ad), hit = vis(ad) ? document.elementFromPoint(adr.l + adr.w / 2, adr.t + adr.h / 2) : null;
  const entries = [...document.querySelectorAll('#petModal [onclick*="adoptPet"]')];
  return { card: R(card), jr: R(jr), pn: R(pn), x: R(xb), ad: adr, pv: R(pv), tabs: R(tabs), cardTop: card.scrollTop, vh: innerHeight, vw: innerWidth, wide: innerWidth > 600,
    footer: !!q('#petModal .pet-footer'), adVis: vis(ad), adHit: !!hit && ad.contains(hit), adEntries: entries.length, adEntriesVis: entries.filter(vis).length,
    pvVis: vis(pv), tabsVis: vis(tabs), panelsVis: panels.filter(vis).length, tabBtns: [...document.querySelectorAll('#petModal .pet-tabs [role=tab]')].map(t => { const r = R(t); return { t: t.textContent.trim(), l: r.l, r: r.r, b: r.b }; }) }; })()`;
const scrollAll = `(() => { const l = document.querySelector('#petModal .pet-layout'), p = [...document.querySelectorAll('#petModal .pet-panel')].find(x => !x.hidden);
  l.scrollTop = l.scrollHeight; p.scrollTop = p.scrollHeight; return true; })()`;
try {
  await b.nav(b.menu); await b.preserve();
  for (const [w, h] of [[1000, 576], [960, 576], [900, 500], [800, 480], [412, 915]]) {
    await b.viewport(w, h);
    for (const kind of Object.keys(SEEDS)) for (const tab of (kind === 'unadopted' ? ['Today', 'Nest'] : ['Today', 'Nest', 'Log'])) {
      await b.ev(seed(kind)); await b.nav(b.menu); await b.sleep(450);
      await b.ev(`showPet(); petTab('${tab}'); true`); await b.sleep(300);
      const tag = `${w}×${h} ${kind === 'unadopted' ? '未领养' : kind === 'empty' ? '已领养空包' : '已领养有材料'} ${tab}`;
      const a = await b.ev(probe);
      await b.ev(scrollAll); await b.sleep(150);
      const z = await b.ev(probe);
      P(Math.abs(a.x.t - z.x.t) < 1 && Math.abs(a.x.r - z.x.r) < 1 && z.x.t >= 0 && z.x.r <= z.vw + 1 && z.x.h >= 44, `${tag}：滚动前后右上角关闭钮纹丝不动，完整在屏内`, [a.x, z.x]);
      P(!a.footer, `${tag}：底部领养长条已删`, a.footer);
      P(z.cardTop === 0 && z.card.b <= z.vh + 1 && z.card.t >= 0, `${tag}：整张卡不滚动且完整在屏内，滚的是内部列表`, z);
      if (kind === 'unadopted') {
        P(a.adVis && a.ad.t >= a.card.t && a.ad.b <= a.card.b + 1 && a.ad.b <= a.vh + 1 && a.ad.l >= a.card.l && a.ad.r <= a.card.r + 1 && a.ad.h >= 44, `${tag}：领养药丸不用滚动就完整落在卡内和屏内，高度≥44`, a);
        P(a.adHit, `${tag}：领养药丸中心点得到（没被别的元素盖住）`, a);
        P(a.adEntries === 1 && a.adEntriesVis === 1, `${tag}：整个小窝弹窗只有一个领养入口`, a);
        P(a.ad.r < a.x.l || a.ad.b < a.x.t || a.ad.l > a.x.r || a.ad.t > a.x.b, `${tag}：领养药丸不和右上角关闭钮重叠`, [a.ad, a.x]);
        P(!a.tabsVis && a.panelsVis === 0 && a.pvVis, `${tag}：未领养时标签和面板收起，右侧是旅程预告图画带`, a);
        if (a.wide) P(a.pv.t >= a.jr.t - 1 && a.pv.b <= a.jr.b + 1 && a.pv.l >= a.jr.l - 1 && a.pv.r <= a.jr.r + 1, `${tag}：预告图画带不超出手记区`, [a.pv, a.jr]);
        else P(a.pv.l >= a.card.l - 1 && a.pv.r <= a.card.r + 1, `${tag}：预告图画带宽度在卡内`, [a.pv, a.card]);
      } else {
        P(!a.adVis && a.adEntriesVis === 0, `${tag}：已领养，领养药丸收起，不再有任何领养入口`, a);
        P(a.tabsVis && !a.pvVis && a.panelsVis === 1 && a.tabBtns.length === 3 && a.tabBtns.map(t => t.t).join() === '喂蛋,布置,贴纸', `${tag}：三个木牌标签 喂蛋/布置/贴纸，旅程预告收起`, a.tabBtns);
        P(a.tabBtns.every(t => t.l >= a.card.l && t.r <= a.card.r + 1), `${tag}：木牌标签都在卡内`, a.tabBtns);
        if (z.wide) P(z.pn.b <= z.jr.b + 1 && z.pn.b <= z.card.b + 1, `${tag}：面板不超出手记区`, z);
      }
      await b.ev(`hidePet(); true`);
    }
  }
  P(b.errors.length === 0, '无脚本异常', b.errors);
} finally { try { await b.viewport(1000, 576); await b.restore(); } finally { await b.close(); } }
finish('PET LAYOUT PINNED');
