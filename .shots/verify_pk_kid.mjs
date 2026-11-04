// L1-L3 带路条「我」换成小孩子（同 L4 的 #p-kid）：旧金头盔勇士手绘已删、<use> 指向在、尺寸正常、「我」标牌还在。
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
try {
  await b.nav(b.menu); await b.preserve();
  for (const [w, h] of (b.device ? [[960, 576]] : [[960, 576], [1280, 800], [900, 500]])) {
    await b.viewport(w, h);
    for (const lv of [1, 2, 3]) {
      await b.boot(lv, 'visual');
      await b.sleep(400);
      const r = await b.ev(`(() => {
        const wrap = document.getElementById('warrior-wrap'), svg = wrap.querySelector('.character-svg'), use = svg.querySelector('use');
        const rc = svg.getBoundingClientRect(), crown = wrap.querySelector('.crown');
        const dangling = [...document.querySelectorAll('use')].map(u => u.getAttribute('href')).filter(h => h && !document.querySelector(h));
        return { href: use && use.getAttribute('href'), vb: svg.getAttribute('viewBox'), paths: svg.querySelectorAll('path').length,
          w: Math.round(rc.width), h: Math.round(rc.height), crown: crown && crown.textContent, dangling,
          sym: document.querySelectorAll('symbol#p-kid').length, comp: document.getElementById('companion-svg').querySelector('use').getAttribute('href') };
      })()`);
      const tag = `${w}×${h} L${lv}`;
      P(r.href === '#p-kid' && r.vb === '0 0 24 24' && r.sym === 1, `${tag} 「我」=小孩子精灵`, { href: r.href, vb: r.vb, sym: r.sym });
      P(r.paths === 0, `${tag} 金头盔勇士手绘已删`, r.paths);
      P(r.w >= 40 && r.w <= 56 && r.h === r.w, `${tag} 图标尺寸正常(${r.w}×${r.h})`, { w: r.w, h: r.h });
      P(r.crown === '我', `${tag} 「我」标牌仍在`, r.crown);
      P(r.dangling.length === 0, `${tag} 无悬空 <use>`, r.dangling);
      if (w === 960) await b.shot('kid_pk_L' + lv);
    }
  }
  P(b.errors.length === 0, '无脚本异常', b.errors);
} finally {
  try { await b.viewport(1000, 576); await b.restore(); } finally { await b.close(); }
}
finish('PK KID HERO');
