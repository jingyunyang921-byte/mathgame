// 静态稿 3a：结算时星星飞进蛋（1 星 / 2 星 / 3 星 / 没通关）。用法：node .shots/_draft_eb_stars.mjs [s1,s2,s3,fail] [lv] [WxH]
import { petBrowser } from './pet_browser.mjs';
import { SEED, HELPERS } from './_draft_eb_lib.mjs';
const kinds = (process.argv[2] || 's1,s2,s3,fail').split(',');
const lv = Number(process.argv[3] || 1);
const [W, H] = (process.argv[4] || '960x576').split('x').map(Number);
const CSS3 = `.eb-arc{width:12px;height:22px;border-radius:50%;box-sizing:border-box}.eb-conf{border-radius:2px}`;
const DRAW = (kind) => `(() => {
  const E = window.__eb; const st = document.createElement('style'); st.textContent = ${JSON.stringify(CSS3)}; document.head.appendChild(st);
  const eg = document.querySelector('#cs-stage .egg-strip svg.egg'), chest = E.rect('#cs-stage .cs-chest');
  if (!eg || !chest) return { err: 'no egg/chest' };
  E.freeze();
  const r0 = eg.getBoundingClientRect(); const ec = { x: r0.left + r0.width / 2, y: r0.top + r0.height * 0.55 };
  const P0 = { x: chest.left + chest.width / 2, y: chest.top + 22 }, C = { x: (P0.x + ec.x) / 2 - 150, y: (P0.y + ec.y) / 2 - 70 };
  const q = (u) => ({ x: (1 - u) * (1 - u) * P0.x + 2 * (1 - u) * u * C.x + u * u * ec.x, y: (1 - u) * (1 - u) * P0.y + 2 * (1 - u) * u * C.y + u * u * ec.y });
  const flyStar = (u, s, rot) => { for (let k = 4; k >= 1; k--) { const p = q(Math.max(0, u - k * 0.05)), z = 6 + (5 - k) * 2.2; E.add('eb-spark', E.box(p.x, p.y, z, z) + 'opacity:' + (0.3 + (5 - k) * 0.12).toFixed(2) + ';transform:rotate(' + k * 30 + 'deg);'); } const p = q(u); E.star(p.x, p.y, s, rot); };
  const egg = (sc, rot, dy) => { eg.style.animation = 'none'; eg.style.transformBox = 'fill-box'; eg.style.transformOrigin = '50% 100%'; eg.style.transform = 'translateY(' + (dy || 0) + 'px) scale(' + sc + ') rotate(' + rot + 'deg)'; };
  const arcs = (dx, y) => { E.add('eb-arc', E.box(ec.x - dx, y, 12, 22) + 'border-left:4px solid #E7A740;'); E.add('eb-arc', E.box(ec.x + dx, y, 12, 22) + 'border-right:4px solid #E7A740;'); };
  const conf = (n, rad) => { const cs = ['#FF8A3D', '#6BCB77', '#4DA3FF', '#FF6FA5', '#FFC63D']; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + 0.3, r = rad * (0.8 + (i % 3) * 0.22); E.add('eb-conf', E.box(ec.x + Math.cos(a) * r, ec.y - 6 + Math.sin(a) * r * 0.8, 8, 14) + 'background:' + cs[i % 5] + ';transform:rotate(' + (i * 47) + 'deg);'); } };
  const kind = '${kind}';
  if (kind === 's1') {
    flyStar(0.62, 40, 14); egg(1.25, -7, -2); arcs(26, ec.y - 16);
    E.sparks(ec.x, ec.y - 4, 30, 5, 10, 0.2);
    E.tag('3a·1 星（冻结帧：1 颗星飞向蛋，蛋轻轻抖一下）');
  } else if (kind === 's2') {
    flyStar(0.9, 38, 10); flyStar(0.48, 40, -16); egg(1.6, -4, -8);
    E.add('eb-ring', E.box(ec.x, ec.y - 6, 84, 84) + 'opacity:.9;'); E.add('eb-ring', E.box(ec.x, ec.y - 6, 120, 120) + 'opacity:.4;border-width:3px;');
    E.add('eb-halo', E.box(ec.x, ec.y - 6, 130, 130)); E.sparks(ec.x, ec.y - 6, 50, 8, 14, 0.2);
    E.tag('3a·2 星（冻结帧：2 颗星飞进蛋，蛋跳一下 + 光圈）');
  } else if (kind === 's3') {
    flyStar(0.9, 40, 8); flyStar(0.62, 42, -14); flyStar(0.34, 44, 22); egg(1.9, -5, -12);
    E.add('eb-rays', E.box(ec.x, ec.y - 8, 300, 300) + 'opacity:.7;'); E.add('eb-halo', E.box(ec.x, ec.y - 8, 170, 170) + 'opacity:.45;');
    E.add('eb-ring', E.box(ec.x, ec.y - 8, 104, 104) + 'opacity:.95;'); E.add('eb-ring', E.box(ec.x, ec.y - 8, 150, 150) + 'opacity:.4;border-width:3px;');
    E.sparks(ec.x, ec.y - 8, 74, 10, 18, 0.1); conf(14, 86);
    E.add('eb-word', 'left:' + Math.round(ec.x - 150) + 'px;top:' + Math.round(ec.y - 80) + 'px;transform:rotate(-8deg);', '咔！');
    E.tag('3a·3 星（冻结帧：3 颗星依次飞进蛋，金光 + 纸屑 + “咔”）');
  } else {
    const p = q(0.97); E.star(p.x + 14, p.y + 14, 28, 18, 0.95); egg(1.3, -11, -1); arcs(28, ec.y - 14);
    E.add('eb-note', 'left:' + Math.round(ec.x - 138) + 'px;top:' + Math.round(ec.y - 62) + 'px;', '抱紧星星～');
    E.tag('3a·没通关（冻结帧：蛋抱着星星晃一晃，不扣不罚）');
  }
  return { egg: [r0.left | 0, r0.top | 0, r0.width | 0, r0.height | 0], chest: [chest.left | 0, chest.top | 0] };
})()`;
const b = await petBrowser();
try {
  await b.nav(b.menu); await b.preserve();
  await b.viewport(W, H);
  for (const kind of kinds) {
    await b.ev(SEED);
    await b.boot(lv, 'visual');
    await b.sleep(400);
    if (kind === 'fail') await b.ev(`_mgWrong=3;_mgCorrect=4;_mgMaxStreak=2;_mgRoundStart=Date.now()-9000;debugEndGame(false);true`);
    else await b.ev(`_mgWrong=0;_mgCorrect=10;_mgMaxStreak=10;_mgRoundStart=Date.now()-7000;debugEndGame(true);true`);
    await b.poll(`!!document.querySelector('#cs-stage .cs-chest')`, 6000);
    await b.ev(`document.querySelector('#cs-stage .cs-chest').click();true`);
    await b.poll(`!!document.querySelector('#cs-stage .cs-go')`, 9000);
    await b.sleep(500);
    await b.ev(HELPERS);
    const info = await b.ev(DRAW(kind));
    console.log(`L${lv} ${kind} ${W}x${H}`, JSON.stringify(info));
    await b.shot(`eb_3a_${kind}_L${lv}_${W}x${H}`);
  }
  console.log('done, errors=', JSON.stringify(b.errors));
} finally { try { await b.restore(); } finally { await b.close(); } }
