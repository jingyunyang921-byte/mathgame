// 领养/小窝弹窗：底部按钮钉在卡底，内容滚动只发生在内部（.pet-layout/.pet-panel），不会把按钮盖住。
// 真机 Chrome 91 里 .pet-panel 不会被 flex 压到 journal 高度，旧版因此撑高 card 并让按钮压在内容上，这里按「面板不超出 journal」把关。
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
const seed = (adopted) => `(() => { localStorage.setItem('mathgameCoins', '313'); const k = 'mathgamePet'; if (${adopted}) { const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return MG_PET.dayKey(x); };
  localStorage.setItem(k, JSON.stringify({ version: 2, adopted: true, exp: 0, stage: 0, adoptedDay: d(-22), lastDay: d(0), xp: 20, days: [d(-3), d(-2), d(-1), d(0)], phase: 0, daily: { date: d(0), correct: 0, rounds: [] }, gifts: [], decor: 'leaf', decors: ['leaf'], name: '数宝', hatchDay: '', birthSeen: false, affection: 0, stories: { seen: [], pending: [] } })); } else localStorage.removeItem(k); return true; })()`;
const probe = `(() => { const q = s => document.querySelector(s), R = e => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
  const card = q('#petModal .pet-card'), lay = q('#petModal .pet-layout'), jr = q('#petModal .pet-journal'), pn = [...document.querySelectorAll('#petModal .pet-panel')].find(p => !p.hidden), ft = q('#petModal .pet-footer');
  return { card: R(card), jr: R(jr), pn: R(pn), ft: R(ft), cardTop: card.scrollTop, vh: innerHeight, wide: innerWidth > 600 }; })()`;
const scrollAll = `(() => { const l = document.querySelector('#petModal .pet-layout'), p = [...document.querySelectorAll('#petModal .pet-panel')].find(x => !x.hidden);
  l.scrollTop = l.scrollHeight; p.scrollTop = p.scrollHeight; return true; })()`;
try {
  await b.nav(b.menu); await b.preserve();
  for (const [w, h] of [[1000, 576], [900, 500], [960, 540], [412, 915]]) {
    await b.viewport(w, h);
    for (const adopted of [false, true]) for (const tab of ['Today', 'Nest', 'Log']) {
      await b.ev(seed(adopted)); await b.nav(b.menu); await b.sleep(450);
      await b.ev(`showPet(); petTab('${tab}'); true`); await b.sleep(300);
      const tag = `${w}×${h} ${adopted ? '已领养' : '未领养'} ${tab}`;
      const a = await b.ev(probe);
      await b.ev(scrollAll); await b.sleep(150);
      const z = await b.ev(probe);
      P(Math.abs(a.ft.t - z.ft.t) < 1 && Math.abs(a.ft.b - z.ft.b) < 1, `${tag}：滚动前后底部按钮纹丝不动`, [a.ft, z.ft]);
      P(z.cardTop === 0, `${tag}：整张卡不滚动，滚的是内部列表`, z.cardTop);
      P(z.ft.b <= z.card.b + 1 && z.ft.b <= z.vh + 1 && z.ft.t >= z.card.t, `${tag}：按钮完整落在卡内和屏内`, z);
      if (z.wide) P(z.pn.b <= z.jr.b + 1 && z.pn.b <= z.ft.t + 1, `${tag}：面板不超出手记区，不压到按钮`, z);
      await b.ev(`hidePet(); true`);
    }
  }
  P(b.errors.length === 0, '无脚本异常', b.errors);
} finally { try { await b.viewport(1000, 576); await b.restore(); } finally { await b.close(); } }
finish('PET FOOTER PINNED');
