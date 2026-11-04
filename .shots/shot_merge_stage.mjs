// 真页面截图：合并后的宝箱舞台（不注入 DOM）。多视口 × 关卡，并检查按钮可点、不出屏。
import { petBrowser } from './pet_browser.mjs';
const b = await petBrowser();
const end = (win, n) => b.ev(`_mgWrong=${win ? 0 : 3};_mgCorrect=${n};_mgMaxStreak=${n};_mgRoundStart=Date.now()-9000;debugEndGame(${win});true`);
const fresh = () => b.ev(`localStorage.removeItem('mathgamePet');localStorage.removeItem('mathgameStars');MG_PET.adopt();true`);
async function reach(win) {
  await fresh(); await end(win, win ? 10 : 2);
  await b.poll(`(document.getElementById('cs-stage')||{className:''}).className.includes('closed')`, 8000); await b.sleep(700);
  await b.ev(`document.querySelector('#cs-stage .cs-chest').click();true`);
  await b.poll('!!document.querySelector("#cs-stage .cs-acts")', 12000); await b.sleep(1500);
}
const probe = () => b.ev(`(() => { const s = document.getElementById('cs-stage'), W = innerWidth, H = innerHeight;
  const acts = [...s.querySelectorAll('.cs-act')].map(n => { const r = n.getBoundingClientRect(), cx = r.x + r.width / 2, cy = r.y + r.height / 2, hit = document.elementFromPoint(cx, cy);
    return { t: n.textContent.trim(), cls: n.className, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), hit: n.contains(hit), inScreen: r.left >= 0 && r.right <= W && r.top >= 0 && r.bottom <= H }; });
  const t = s.querySelector('.cs-title'), tr = t.getBoundingClientRect();
  return { title: t.firstChild.textContent, stars: s.querySelectorAll('.cs-stars svg').length, off: s.querySelectorAll('.cs-stars svg.off').length, titleIn: tr.top >= 0 && tr.right <= W,
    acts, go: !!s.querySelector('.cs-go'), strip: (r => r.bottom <= H && r.top >= 0)(s.querySelector('.egg-strip').getBoundingClientRect()), xs: s.scrollWidth <= s.clientWidth, ys: s.scrollHeight <= s.clientHeight + 1 }; })()`);
try {
  await b.nav(b.menu); await b.preserve();
  for (const [w, h, lv, win, tag] of [[960, 576, 1, true, 'l1'], [960, 576, 6, true, 'l6'], [900, 500, 1, true, 'l1'], [412, 915, 1, true, 'l1'], [960, 576, 1, false, 'l1lose']]) {
    await b.viewport(w, h); await b.boot(lv); await reach(win);
    console.log(`${w}x${h} ${tag}`, JSON.stringify(await probe()));
    await b.shot(`merge_${tag}_${w}x${h}`);
  }
  console.log('errors', JSON.stringify(b.errors));
} finally { try { await b.restore(); } finally { await b.close(); } }
