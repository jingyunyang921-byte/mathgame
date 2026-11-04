// 草稿：把「收下啦」换成「下一关 / 再来一局」，结算卡的星星并入标题。只在页面里临时改 DOM 截图，不动产品代码。
import { petBrowser } from './pet_browser.mjs';
const b = await petBrowser();
const CSS = `
.cs-title .dr-stars{display:inline-flex;gap:3px;margin-left:10px;vertical-align:-4px}
.cs-title .dr-stars svg{width:24px;height:24px;fill:#FFC83D;stroke:#E39A1F;stroke-width:1.2;stroke-linejoin:round}
.dr-btns{position:relative;display:flex;gap:12px;align-items:center;justify-content:center;margin-top:2px;flex-wrap:wrap}
.dr-btns button{font-family:inherit;font-weight:900;font-size:20px;border:0;border-radius:999px;padding:12px 26px;cursor:pointer;display:flex;align-items:center;gap:8px}
.dr-btns svg{width:20px;height:20px}
.dr-pri{color:#fff;background:linear-gradient(var(--grad-angle),var(--c-primary),var(--c-primary-deep));box-shadow:0 5px 0 var(--c-primary-dark),0 12px 22px rgba(0,0,0,.28)}
.dr-sec{color:var(--c-primary-deep);background:#fff;border:3px solid #FFC9A0!important;padding:9px 22px!important;box-shadow:0 4px 0 rgba(0,0,0,.14),0 10px 18px rgba(0,0,0,.2)}
.dr-stats{position:relative;display:inline-block;margin-top:6px;padding:3px 14px;border-radius:99px;background:rgba(62,34,12,.78);color:#FFF3C4;font-size:13px;font-weight:800}
.cs.lv6 .dr-stats{background:rgba(24,30,78,.86)}`;
const end = (win, n) => b.ev(`_mgWrong=${win ? 0 : 3};_mgCorrect=${n};_mgMaxStreak=${n};_mgRoundStart=Date.now()-9000;debugEndGame(${win});true`);
const fresh = () => b.ev(`localStorage.removeItem('mathgamePet');localStorage.removeItem('mathgameStars');MG_PET.adopt();true`);
const restart = async () => { await b.ev('window._currentGame._restart();true'); await b.poll(`(document.getElementById('mg-countdown-badge')||{style:{}}).style.display==='none'`); };
async function reach(lv) {
  await fresh(); await end(true, 10);
  await b.poll(`(document.getElementById('cs-stage')||{className:''}).className.includes('closed')`, 8000); await b.sleep(700);
  await b.ev(`document.querySelector('#cs-stage .cs-chest').click();true`);
  await b.poll('!!document.querySelector("#cs-stage .cs-go")', 12000); await b.sleep(1500);
}
async function inject(lv, withStats, hasNext) {
  await b.ev(`(() => {
    if (!document.getElementById('dr-css')) { const st = document.createElement('style'); st.id = 'dr-css'; st.textContent = ${JSON.stringify(CSS)}; document.head.appendChild(st); }
    const s = document.getElementById('cs-stage'), ti = s.querySelector('.cs-title'), sub = ti.querySelector('small').outerHTML;
    const star = '<svg viewBox="0 0 24 24"><use href="#i-star"/></svg>';
    ti.innerHTML = mgWinTitle(${lv}) + '<span class="dr-stars">' + star + star + star + '</span>' + sub;
    if (${withStats}) ti.insertAdjacentHTML('afterend', '<div class="dr-stats" style="align-self:center">正确率 100%  ·  9 秒  ·  连对 10</div>');
    const go = s.querySelector('.cs-go'); if (go) go.remove();
    const ic = id => '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#' + id + '"/></svg>';
    const next = ${hasNext} ? '<button class="dr-pri">' + ic('i-play') + '挑战第${lv + 1}关：' + MG_LEVEL_NAMES[${lv + 1}] + '</button>' : '';
    const again = '<button class="' + (${hasNext} ? 'dr-sec' : 'dr-pri') + '">' + ic('i-refresh') + '再来一局！</button>';
    s.insertAdjacentHTML('beforeend', '<div class="dr-btns">' + (${hasNext} ? again + next : again) + '</div>');
    return true; })()`);
  await b.sleep(250);
}
const dump = async tag => console.log(tag, JSON.stringify(await b.ev(`(() => { const s = document.getElementById('cs-stage'), r = n => { const e = s.querySelector(n); if (!e) return null; const q = e.getBoundingClientRect(), c = getComputedStyle(e); return { x: Math.round(q.x), y: Math.round(q.y), w: Math.round(q.width), h: Math.round(q.height), op: c.opacity, vis: c.visibility, disp: c.display, bg: c.backgroundImage.slice(0, 60) + '|' + c.backgroundColor, col: c.color, anim: c.animationName, pos: c.position }; };
  return { stage: r('.egg-strip'), btns: r('.dr-btns'), pri: r('.dr-pri'), sec: r('.dr-sec'), stats: r('.dr-stats'), kids: [...s.children].map(k => k.className.toString().slice(0, 24)), sh: s.scrollHeight, ch: s.clientHeight }; })()`)));
try {
  await b.nav(b.menu); await b.preserve(); await b.viewport(960, 576);
  for (const [lv, tag, stats, nxt] of [[1, 'a', false, true], [1, 'b', true, true], [6, 'a', false, false]]) {
    await b.boot(lv); await reach(lv); await inject(lv, stats, nxt);
    await dump(`l${lv}_${tag}`);
    await b.shot(`draft_merge_l${lv}_${tag}`);
  }
  await b.viewport(412, 915); await b.boot(1); await reach(1); await inject(1, false, true);
  await b.shot('draft_merge_l1_a_412x915');
  await b.viewport(900, 500); await b.boot(1); await reach(1); await inject(1, true, true);
  await b.shot('draft_merge_l1_b_900x500');
  console.log('errors', JSON.stringify(b.errors));
} finally { try { await b.restore(); } finally { await b.close(); } }
