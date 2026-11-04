// 宝箱舞台与结算动作合一：星星并进标题、「再来一局 / 挑战下一关」直接长在舞台上（旧「收下啦」已删）。
// 多视口：按钮在屏内且可点、横屏并排 / 竖屏主按钮在上；L6 与失败局只剩一个主按钮；点击会转发给真按钮；返回键仍收回旧结算卡。
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
const end = (win, n) => b.ev(`_mgWrong=${win ? 0 : 3};_mgCorrect=${n};_mgMaxStreak=${n};_mgRoundStart=Date.now()-9000;debugEndGame(${win});true`);
const fresh = () => b.ev(`localStorage.removeItem('mathgamePet');localStorage.removeItem('mathgameStars');MG_PET.adopt();true`);
async function reach(win) {
  await fresh(); await end(win, win ? 10 : 2);
  await b.poll(`(document.getElementById('cs-stage')||{className:''}).className.includes('closed')`, 8000); await b.sleep(700);
  await b.ev(`document.querySelector('#cs-stage .cs-chest').click();true`);
  await b.poll('!!document.querySelector("#cs-stage .cs-acts")', 12000); await b.sleep(1500);
}
const probe = () => b.ev(`(() => { const s = document.getElementById('cs-stage'), W = innerWidth, H = innerHeight, t = s.querySelector('.cs-title');
  const acts = [...s.querySelectorAll('.cs-act')].map(n => { const r = n.getBoundingClientRect(), cs = getComputedStyle(n), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { t: n.textContent.trim(), pri: n.classList.contains('pri'), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), fs: parseFloat(cs.fontSize), fw: +cs.fontWeight,
      hit: n.contains(hit), inScreen: r.left >= 0 && r.right <= W && r.top >= 0 && r.bottom <= H, icon: !!n.querySelector('use'), op: cs.opacity }; });
  const tr = t.getBoundingClientRect(), st = s.querySelector('.egg-strip').getBoundingClientRect();
  return { title: t.firstChild.textContent, stars: s.querySelectorAll('.cs-stars svg').length, off: s.querySelectorAll('.cs-stars svg.off').length, titleIn: tr.top >= 0 && tr.right <= W && tr.left >= 0,
    acts, oldGo: !!s.querySelector('.cs-go'), text: s.innerText, stripIn: st.top >= 0 && st.bottom <= H }; })()`);
const okActs = d => d.acts.length > 0 && d.acts.every(a => a.hit && a.inScreen && a.icon && a.fs >= 18 && a.fw >= 800 && a.op === '1');
try {
  await b.nav(b.menu); await b.preserve();
  for (const [w, h] of [[960, 576], [900, 500], [412, 915]]) {
    await b.viewport(w, h); await b.boot(1); await reach(true);
    const d = await probe(), [again, next] = d.acts;
    P(d.title === '第1关通关！' && d.stars === 3 && d.off === 0 && d.titleIn, `${w}×${h} L1 赢：星星并进标题「第1关通关！」，三颗全亮`, [d.title, d.stars, d.off]);
    P(!d.oldGo && !d.text.includes('收下啦') && d.acts.length === 2 && okActs(d), `${w}×${h} L1 赢：无「收下啦」，两个按钮可点、在屏内、字体正常`, d.acts);
    P(again && next && /再来一局/.test(again.t) && /挑战第2关/.test(next.t) && !again.pri && next.pri, `${w}×${h} 再来一局是次按钮（白底），挑战下一关是主按钮（橙底）`, [again && again.t, next && next.t]);
    if (w >= 900) P(Math.abs(again.y - next.y) <= 4 && again.x < next.x, `${w}×${h} 横屏：两个按钮并排，再来一局在左`, [again, next]);
    else P(next.y < again.y && Math.abs(next.w - again.w) <= 2, `${w}×${h} 竖屏：主按钮在上、两个按钮同宽`, [again, next]);
    P(d.stripIn, `${w}×${h} 萌蛋条仍完整在屏内`, d.stripIn);
    await b.shot(`stage_merge_${w}x${h}`);
  }
  await b.viewport(960, 576);
  await b.boot(6); await reach(true);
  const l6 = await probe();
  P(l6.title === '第6关通关！' && l6.acts.length === 1 && l6.acts[0].pri && /再来一局/.test(l6.acts[0].t) && okActs(l6), 'L6 赢：没有下一关，只剩一个橙色「再来一局」', l6.acts);
  await b.boot(1); await reach(false);
  const lose = await probe();
  P(lose.title === '宝箱收好啦！' && lose.stars === 0 && lose.acts.length === 1 && lose.acts[0].pri && okActs(lose), '失败局：标题不变、无星星、只有一个橙色「再来一局」', [lose.title, lose.stars, lose.acts]);

  // 点击转发给真按钮
  await b.boot(1); await reach(true);
  await b.ev(`window.__retry = 0; document.getElementById('retry-btn').addEventListener('click', () => window.__retry++); document.querySelectorAll('#cs-stage .cs-act')[0].click(); true`);
  await b.sleep(400);
  P(await b.ev(`window.__retry === 1 && !document.getElementById('cs-stage')`), '点「再来一局」：转发给真按钮（只触发一次），舞台收掉', await b.ev('window.__retry'));
  await b.poll(`(document.getElementById('mg-countdown-badge')||{style:{}}).style.display==='none'`, 15000).catch(() => {});
  P(await b.ev(`!document.getElementById('overlay').classList.contains('show')`), '再来一局后结算层收起，新一局开始');

  await b.boot(1); await reach(true);
  await b.ev(`document.querySelectorAll('#cs-stage .cs-act')[1].click(); true`);
  let lv = null;
  for (let i = 0; i < 100 && lv !== 2; i++) { await b.sleep(300); lv = await b.ev(`window._currentGame ? window._currentGame.level : null`).catch(() => null); }
  P(lv === 2, '点「挑战下一关」：页面重载进入第 2 关', lv);

  // 返回键：舞台收掉，旧结算卡保留可用
  await b.boot(1); await reach(true);
  await b.ev(`mgStageBack(); true`); await b.sleep(300);
  P(await b.ev(`!document.getElementById('cs-stage') && getComputedStyle(document.getElementById('retry-btn')).display !== 'none' && document.getElementById('overlay').classList.contains('show')`), '返回键：舞台收掉，回到带按钮的结算卡');
  P(b.errors.length === 0, '无脚本异常', b.errors);
} finally { try { await b.restore(); } finally { await b.close(); } }
finish('STAGE MERGE');
