// L1-L3 蛋位：记数牌下缘对齐右边小画下缘、不压虚线、不压顶部路线（4 种视口 x 4 个入口）。
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
const info = `(() => {
  const r = s => { const n = document.querySelector(s); if (!n || !n.getClientRects().length) return null; const q = n.getBoundingClientRect(); return { t: Math.round(q.top), b: Math.round(q.bottom), l: Math.round(q.left), r: Math.round(q.right) }; };
  return { slot: r('#mg-egg-slot'), tally: r('#mg-egg-slot .es-tally'), egg: r('#mg-egg-slot .es-egg'), scene: r('#mg-scene'), pk: r('#pk-section'), qs: r('#question-section'),
    sc: document.getElementById('mg-egg-slot') && document.getElementById('mg-egg-slot').style.transform };
})()`;
const seed = (adopted = true) => `(() => {
  const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return MG_PET.dayKey(x); };
  ['mathgamePet', 'mathgameStars', 'mathgameCoins'].forEach(k => localStorage.removeItem(k));
  try { _mgPendingSnap = null; } catch (e) {}
  if (${adopted}) localStorage.setItem('mathgamePet', JSON.stringify({ version: 2, adopted: true, exp: 0, stage: 0, adoptedDay: d(-22), lastDay: d(0), xp: 20,
    days: Array.from({ length: 4 }, (_, i) => d(-4 + i)), phase: 0, daily: { date: d(0), correct: 0, rounds: [] }, gifts: [], decor: 'leaf', decors: ['leaf'],
    name: '数宝', hatchDay: '', birthSeen: false, affection: 0, stories: { seen: [], pending: [] } }));
  return true; })()`;
try {
  await b.nav(b.menu); await b.preserve();
  for (const [w, h] of [[1000, 576], [960, 540], [900, 500], [1280, 800]]) {
    await b.viewport(w, h);
    for (const [lv, mode] of [[1, 'visual'], [2, 'visual'], [3, 'visual'], [3, 'audio']]) {
      await b.ev(seed(true)); await b.boot(lv, mode); await b.sleep(900);
      const i = await b.ev(info);
      console.log(w + 'x' + h, 'L' + lv, mode, JSON.stringify(i));
      P(i.slot && i.tally && i.scene, `${w}x${h} L${lv} ${mode}: 蛋位和小画都在`, i);
      if (i.slot && i.scene) {
        P(Math.abs(i.tally.b - i.scene.b) <= 3, `${w}x${h} L${lv} ${mode}: 蛋位记数牌下缘对齐小画下缘`, [i.tally.b, i.scene.b]);
        P(i.slot.b <= i.qs.b - 2 && i.tally.b < i.qs.b, `${w}x${h} L${lv} ${mode}: 蛋位不压虚线`, [i.slot.b, i.tally.b, i.qs.b]);
        P(i.egg.t >= i.pk.b - 12, `${w}x${h} L${lv} ${mode}: 蛋不压顶部路线`, [i.egg.t, i.pk.b]);
      }
      if (lv === 1 && mode === 'visual') await b.shot(`egg_align_${w}x${h}`);
    }
  }
  await b.viewport(1000, 576);
  // 窄屏把蛋位收起后再回到宽屏：不能卡在错误的位置
  await b.ev(seed(true)); await b.boot(1, 'visual'); await b.sleep(600);
  await b.viewport(412, 915); await b.sleep(700);
  const nar = await b.ev(info);
  await b.viewport(1000, 576); await b.sleep(900);
  const back = await b.ev(info);
  console.log('narrow', JSON.stringify(nar), '\nback', JSON.stringify(back));
  P(back.slot && back.scene && Math.abs(back.tally.b - back.scene.b) <= 3, '窄屏收起后回到宽屏：记数牌下缘重新对齐小画下缘', back && [back.tally && back.tally.b, back.scene && back.scene.b]);
} finally { try { await b.restore(); } finally { await b.close(); } }
finish('EGG ALIGN');
