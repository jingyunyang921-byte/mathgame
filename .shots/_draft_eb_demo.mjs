// 静态稿 2b：3-2-1 之后第一题的「幽灵示范」。用法：node .shots/_draft_eb_demo.mjs [lv:mode,..] [WxH]
import { petBrowser } from './pet_browser.mjs';
import { SEED, HELPERS } from './_draft_eb_lib.mjs';
const specs = (process.argv[2] || '1:visual,5:visual').split(',').map(s => s.split(':'));
const [W, H] = (process.argv[3] || '960x576').split('x').map(Number);
const CSS2 = `.eb-tip{padding:3px 14px;border-radius:999px;background:#fff;border:3px solid #FF9B3D;color:#D9560B;font-weight:900;font-size:17px;line-height:24px;white-space:nowrap;box-shadow:0 3px 0 rgba(160,90,0,.25)}
.eb-demo-svg{overflow:visible}`;
const DRAW = (lv) => `(() => {
  const E = window.__eb; const st = document.createElement('style'); st.textContent = ${JSON.stringify(CSS2)}; document.head.appendChild(st);
  const lv = ${lv};
  if (lv !== 5) {
    const w = E.rect('#canvas-wrapper'); if (!w) return { err: 'no wrapper' };
    const bw = Math.min(260, w.width * 0.5), bh = bw * 0.7, x0 = w.left + w.width / 2 - bw / 2, y0 = w.top + w.height / 2 - bh / 2 + 6;
    const d = document.createElement('div'); d.className = 'eb-abs'; d.style.cssText = 'left:' + x0 + 'px;top:' + y0 + 'px;width:' + bw + 'px;height:' + bh + 'px;';
    d.innerHTML = '<svg class="eb-demo-svg" viewBox="0 0 220 154" width="100%" height="100%"><path id="eb-gp" d="M24 40 C 90 0, 150 40, 110 80 S 30 120, 100 130 S 170 112, 198 92" fill="none" pathLength="100" stroke="#FFB05A" stroke-width="9" stroke-linecap="round" stroke-dasharray="0.1 3.4" opacity=".9"/>'
      + '<path id="eb-gd" d="M24 40 C 90 0, 150 40, 110 80 S 30 120, 100 130 S 170 112, 198 92" fill="none" pathLength="100" stroke="#FF8A3D" stroke-width="12" stroke-linecap="round" stroke-dasharray="56 100" opacity=".78"/></svg>';
    document.body.appendChild(d);
    const p = document.getElementById('eb-gd'), L = p.getTotalLength(), pt = p.getPointAtLength(L * 0.56), k = bw / 220;
    const tx = x0 + pt.x * k, ty = y0 + pt.y * k;
    E.add('eb-ring', E.box(tx, ty, 34, 34) + 'opacity:.8;border-width:4px;');
    E.hand(tx + 8, ty + 36, 58, -14);
    E.add('eb-tip', 'left:' + Math.round(w.left + w.width / 2 - 62) + 'px;top:' + Math.round(w.top + 14) + 'px;', '跟着小手写');
    E.tag('2b 首题示范·视算（冻结帧：小手在手写区划一笔，孩子一落笔就消失）');
    return { stroke: [Math.round(tx), Math.round(ty)] };
  }
  const g = window._currentGame, c = g.canvas, r = c.getBoundingClientRect(), sx = r.width / c.width, sy = r.height / c.height;
  const ds = g.choices.map(q => ({ cx: r.left + (q.x + q.w / 2) * sx, cy: r.top + (q.y + q.h * 0.76) * sy, w: q.w * sx, h: q.h * sy }));
  const t = ds[1] || ds[0];
  E.add('eb-ring', E.box(t.cx, t.cy, 70, 70) + 'opacity:.9;border-width:5px;');
  E.add('eb-ring', E.box(t.cx, t.cy, 104, 104) + 'opacity:.45;border-width:4px;');
  E.hand(t.cx + 12, t.cy + 38, 60, -12);
  E.add('eb-tip', 'left:' + Math.round(t.cx - 40) + 'px;top:' + Math.round(t.cy - t.h * 0.76 - 40) + 'px;', '点一下');
  E.tag('2b 首题示范·L5（冻结帧：小手点门、波纹扩散，孩子一点就消失）');
  return { doors: ds.map(q => [q.cx | 0, q.cy | 0, q.w | 0, q.h | 0]) };
})()`;
const b = await petBrowser();
try {
  await b.nav(b.menu); await b.preserve();
  await b.viewport(W, H);
  for (const [lvS, mode] of specs) {
    const lv = Number(lvS);
    await b.ev(SEED);
    await b.boot(lv, mode);
    await b.sleep(900);
    await b.ev(HELPERS);
    const info = await b.ev(DRAW(lv));
    console.log(`L${lv} ${mode} ${W}x${H}`, JSON.stringify(info));
    await b.shot(`eb_2b_L${lv}_${mode}_${W}x${H}`);
  }
  console.log('done, errors=', JSON.stringify(b.errors));
} finally { try { await b.restore(); } finally { await b.close(); } }
