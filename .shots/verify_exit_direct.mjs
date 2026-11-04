// 左上角返回：不再弹确认框，直接 _forceEnd → _mgSafeLeave 离场；硬件返回键（游戏页）同样直接离场。
// 本地用假的 Capacitor.Plugins.App 抓 backButton 回调；真机用 adb keyevent 4 按真返回键。
import { execSync } from 'node:child_process';
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
const LOCAL = !b.device;
const FAKE = `(() => { window.Capacitor = window.Capacitor || { Plugins: { App: { addListener: (n, cb) => { (window.__backCbs = window.__backCbs || {})[n] = cb; return Promise.resolve({ remove() {} }); } } } }; })()`;
const STUB_LEAVE = `(() => { window.__leave = []; const orig = window._mgSafeLeave;
  window._mgSafeLeave = function (self, go) { window.__leave.push({ ended: !!(self && self.gameEnded), go: String(go) }); window._mgSafeLeave = orig; }; return true; })()`;
const pressBack = async () => {
  if (LOCAL) await b.ev(`window.__backCbs.backButton(); true`);
  else execSync('adb shell input keyevent 4');
};
const GONE = ['exit-modal', 'exit-modal-bg', 'exit-confirm-btn', 'exit-cancel-btn', 'exit-modal-emoji'];
let stubId;
try {
  await b.nav(b.menu); await b.preserve();
  if (LOCAL) ({ identifier: stubId } = await b.send('Page.addScriptToEvaluateOnNewDocument', { source: FAKE }));

  // ---------- 六关 × 视算/听算：点左上角返回 = 直接离场，没有确认框 ----------
  const CASES = [[1, 'visual'], [2, 'visual'], [3, 'visual'], [4, 'visual'], [5, 'visual'], [6, 'visual'], [1, 'audio'], [2, 'audio'], [4, 'audio'], [5, 'audio'], [6, 'audio']];
  for (const [lv, mode] of CASES) {
    await b.boot(lv, mode);
    const pre = await b.ev(`({ gone: ${JSON.stringify(GONE)}.filter(id => document.getElementById(id)).length, stub: ${STUB_LEAVE} })`);
    await b.ev(`document.getElementById('exit-btn').click(); true`);
    const after = await b.ev(`({ leave: window.__leave, ended: window._currentGame.gameEnded })`);
    const ok = after.leave.length === 1 && after.leave[0].ended && /(menu|index)\.html/.test(after.leave[0].go) && after.ended === true;
    P(pre.gone === 0 && ok, `L${lv} ${mode}：点返回直接走 _mgSafeLeave 回主页（无确认框）`, { gone: pre.gone, after });
  }

  // ---------- 硬件返回键：对局中 = 点左上角返回 ----------
  await b.boot(1, 'visual');
  await b.ev(STUB_LEAVE);
  await pressBack();
  await b.sleep(300);
  const hb = await b.ev(`({ leave: window.__leave, ended: window._currentGame.gameEnded })`);
  P(hb.leave.length === 1 && hb.leave[0].ended && hb.ended, '硬件返回键（对局中）：直接离场，不弹框', hb);

  // ---------- 硬件返回键：结算遮罩上 = 点左上角返回（结算卡已没有「休息一下」） ----------
  if (LOCAL) {
    await b.boot(2, 'visual');
    await b.ev(`(() => { window.__home = 0; document.getElementById('exit-btn').click = () => { window.__home++; }; document.getElementById('overlay').classList.add('show'); return !document.getElementById('home-btn'); })()`);
    await pressBack();
    const hh = await b.ev(`window.__home`);
    P(hh === 1, '硬件返回键（结算遮罩上）：等于点左上角返回', hh);
    // ---------- 开场规则卡期间：返回 = 跳过规则卡，不离场 ----------
    await b.nav(b.menu);
    await b.ev(`sessionStorage.setItem('gameLevel','3');sessionStorage.setItem('gameMode','visual');sessionStorage.removeItem('mgSprint');true`);
    await b.nav(b.game);
    await b.ev('window._skipOcrLoading && window._skipOcrLoading();true');
    await b.poll(`document.getElementById('intro-overlay').style.display === 'flex'`, 20000);
    await pressBack();
    const ib = await b.ev(`({ shown: document.getElementById('intro-overlay').style.display, href: location.href })`);
    P(ib.shown === 'none' && ib.href.includes('localhost:8000/index.html'), '开场规则卡期间按返回：只收卡，仍在游戏页', ib);
  }

  // ---------- 真跳转：不打桩，点返回确实回到主页，且不写星星/打卡 ----------
  await b.boot(1, 'visual');
  const snap0 = await b.ev(`({ s: localStorage.getItem('mathgameStars'), d: localStorage.getItem('mathgameDaily') })`);
  await b.ev(`document.getElementById('exit-btn').click(); true`);
  let href = '';
  for (let i = 0; i < 30 && !href.startsWith(b.menu); i++) {
    await b.sleep(200);
    try { href = await b.ev('location.href'); } catch (e) { href = ''; }
  }
  P(href.startsWith(b.menu), '真跳转：点返回后回到主页', href);
  const snap1 = await b.ev(`({ s: localStorage.getItem('mathgameStars'), d: localStorage.getItem('mathgameDaily') })`);
  P(snap0.s === snap1.s && snap0.d === snap1.d, '中途退出不记星星、不记今日打卡', { snap0, snap1 });
  P(b.errors.length === 0, '无脚本异常', b.errors);
} finally {
  try { if (stubId) await b.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: stubId }); } catch (e) {}
  try { await b.restore(); } finally { await b.close(); }
}
finish('EXIT DIRECT');
