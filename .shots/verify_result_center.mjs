// 结算卡视觉居中：全角叹号 / 句号的字形只占字格左半边，文字按字格居中时「墨迹」会偏左。
// 这里用 canvas.measureText 量出真实墨迹范围，核对 标题 / 正文一行 / 「再来一局」按钮内容 的墨迹中心都落在各自容器中线上。
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
const TOL = 2.2;
const probe = String.raw`(() => {
  const cv = document.createElement('canvas').getContext('2d');
  const font = el => { const s = getComputedStyle(el); return s.fontStyle + ' ' + s.fontWeight + ' ' + s.fontSize + ' ' + s.fontFamily; };
  const lines = el => { const out = []; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (!n.nodeValue.trim()) continue; const r = document.createRange(); r.selectNodeContents(n); const q = [...r.getClientRects()]; out.push({ node: n, rects: q }); } return out; };
  // 一个文本节点的墨迹 [左, 右]（只处理单行）
  const ink = (el) => { const ls = lines(el); if (!ls.length) return null; const last = ls[ls.length - 1], first = ls[0];
    if (last.rects.length !== 1 || first.rects.length !== 1) return { multi: true };
    cv.font = font(el); const m = cv.measureText(last.node.nodeValue), r = last.rects[0];
    return { left: first.rects[0].left + (first === last ? -m.actualBoundingBoxLeft : 0), right: r.left + m.actualBoundingBoxRight, boxL: first.rects[0].left, boxR: r.right }; };
  const card = document.getElementById('overlay-content'), cr = card.getBoundingClientRect(), cx = cr.left + cr.width / 2;
  const t = document.getElementById('overlay-title'), m = document.getElementById('overlay-msg'), rb = document.getElementById('retry-btn');
  const ti = ink(t), mi = ink(m), bi = ink(rb);
  const rbr = rb.getBoundingClientRect(), svg = rb.querySelector('svg').getBoundingClientRect();
  const tcs = getComputedStyle(t);
  const contentCenter = bi && !bi.multi ? (svg.left + bi.right) / 2 : null;
  return { cx, title: t.textContent, titleInk: ti && !ti.multi ? (ti.left + ti.right) / 2 - cx : null, titleCls: t.className,
    msg: m.textContent, msgInk: mi && !mi.multi ? (mi.left + mi.right) / 2 - cx : null, msgMulti: !!(mi && mi.multi),
    retryInk: contentCenter == null ? null : contentCenter - (rbr.left + rbr.width / 2), retryText: rb.textContent, pad: tcs.paddingLeft };
})()`;
try {
  await b.nav(b.menu); await b.preserve();
  const run = async (lv, win, shot) => {
    await b.boot(lv);
    await b.ev(`_mgWrong=0;_mgCorrect=${win ? 10 : 0};_mgMaxStreak=${win ? 10 : 0};_mgRoundStart=Date.now()-7000;debugEndGame(${win});true`);
    await b.poll(`document.getElementById('overlay').classList.contains('show')`, 6000);
    await b.sleep(900);
    const r = await b.ev(probe);
    if (shot) {
      await b.ev(`(() => { const s = document.getElementById('cs-stage'); if (s) s.remove(); const c = document.getElementById('overlay-canvas'); return true; })()`);
      await b.sleep(200); await b.shot(shot);
    }
    return r;
  };
  for (const [w, h] of [[960, 576], [900, 500], [412, 915]]) {
    await b.viewport(w, h);
    const g = await run(1, true, w === 960 ? 'result_center_960x576' : '');
    P(g.titleInk !== null && Math.abs(g.titleInk) <= TOL, `${w}×${h} 胜利标题「${g.title}」墨迹中心在卡片中线上（偏差 ${g.titleInk && g.titleInk.toFixed(1)}px，容差 ${TOL}）`, g);
    if (!g.msgMulti) P(Math.abs(g.msgInk) <= TOL, `${w}×${h} 正文单行「${g.msg}」墨迹中心在中线上（偏差 ${g.msgInk && g.msgInk.toFixed(1)}px）`, g);
    P(g.retryInk !== null && Math.abs(g.retryInk) <= TOL, `${w}×${h} 「${g.retryText}」按钮的图标+文字整体居中（偏差 ${g.retryInk && g.retryInk.toFixed(1)}px）`, g);
  }
  await b.viewport(960, 576);
  const lose = await run(1, false);
  P(lose.title.includes('这次没赢') && lose.titleInk !== null && Math.abs(lose.titleInk) <= TOL, `失败标题「${lose.title}」没有被多补偿（偏差 ${lose.titleInk && lose.titleInk.toFixed(1)}px）`, lose);
  P(b.errors.length === 0, '无浏览器脚本异常', b.errors);
} finally {
  try { await b.restore(); } finally { await b.close(); }
}
finish('RESULT CENTER');
