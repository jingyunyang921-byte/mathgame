// Device acceptance for 勋章成就墙 (badge wall) over CDP on the real tablet — menu-side only (www/index.html).
// Prereq: app in foreground (menu) + `adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>`.
// Inject 存档 → showBadges() → read grid 点亮数/副标题/无禁词/4 钮 + capture PNG (CDP bypasses FLAG_SECURE);
// 再测档案弹窗「我的勋章墙」入口 + 新解锁庆祝弹窗，在设备真实 WebView(Chrome 91/109)上复核本地同款不变量。
import { writeFileSync } from 'node:fs';
const CDP = 'http://localhost:9222';
const targets = await (await fetch(CDP + '/json')).json();
const page = targets.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || targets[0];
console.log('target:', JSON.stringify(page.title), '|', page.url);
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let _id = 0; const pending = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params) => { const id = ++_id; return new Promise((res, rej) => { pending.set(id, m => m.error ? rej(new Error(method + ':' + JSON.stringify(m.error))) : res(m.result)); ws.send(JSON.stringify({ id, method, params: params || {} })); }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, userGesture: true })).result.value;
await send('Page.enable');
await send('Runtime.enable');

let fail = 0;
const P = (ok, label, extra) => { console.log((ok ? 'PASS ' : 'FAIL ') + label + (extra != null ? '  ' + extra : '')); if (!ok) fail++; };
// 全达成存档 → 6 枚全亮，用于截图。
const PROBE_FULL = `(() => {
  localStorage.setItem('mathgameStars', JSON.stringify({1:3,2:3,3:3,4:3,5:3,6:3}));
  localStorage.setItem('mathgameMaxCompletedLevel', '6');
  localStorage.setItem('mathgameBest', JSON.stringify({1:{t:5,s:10}}));
  localStorage.setItem('mathgameDaily', JSON.stringify({bestStreak:7,streak:7}));
  localStorage.setItem('mathgamePet', JSON.stringify({adopted:true,exp:200}));
  localStorage.removeItem('mathgameBadges');
  showBadges();
  const modal = document.getElementById('badgeModal');
  const card = modal.querySelector('.locked-modal-card');
  const grid = document.getElementById('badgeGrid');
  const cr = card.getBoundingClientRect();
  const dangling = [...document.querySelectorAll('use')].map(x => x.getAttribute('href')).filter(h => h && !document.querySelector(h));
  let styleTxt = [...document.querySelectorAll('style')].map(s => s.textContent).join('\\n').replace(/\\/\\*[\\s\\S]*?\\*\\//g, '');
  const banned = styleTxt.match(/paint-order|:has\\(|@layer|color-mix\\(|oklch\\(|\\d(dvh|svh|lvh)/g);
  const btns = [...document.querySelector('.topbar-actions').querySelectorAll('.icon-btn')];
  const emoji = /[\\u{1F000}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{2190}-\\u{21FF}\\u{2B00}-\\u{2BFF}]/u.test(grid.innerText);
  return {
    iw: innerWidth, ih: innerHeight,
    open: modal.classList.contains('show'),
    nCells: grid.children.length, nLit: grid.querySelectorAll('.badge-cell.lit').length,
    sub: document.getElementById('badgeSub').textContent,
    emojiInGrid: emoji, danglingUse: dangling, bannedTokens: banned,
    cardScrolls: card.scrollHeight > card.clientHeight + 1,
    inView: cr.top >= -0.5 && cr.bottom <= innerHeight + 0.5, gapTop: Math.round(cr.top), gapBottom: Math.round(innerHeight - cr.bottom),
    nIconBtns: btns.length, ua: navigator.userAgent,
  };
})()`;
// 入口 + 庆祝：档案弹窗按钮打开勋章墙；清空快照只满足「初次启航」→ 恰好 1 枚新解锁 → 庆祝弹窗出现。
const PROBE_ENTRY = `(() => {
  hideBadges();
  showProfile();
  const pm = document.getElementById('profileModal');
  const btn = [...pm.querySelectorAll('.locked-modal-btn')].find(b => /勋章墙/.test(b.textContent));
  const hadBtn = !!btn; if (btn) btn.click();
  return { hadBtn, profileHid: !pm.classList.contains('show'), badgeOpen: document.getElementById('badgeModal').classList.contains('show') };
})()`;
const PROBE_CELEB = `(() => {
  hideBadges();
  localStorage.removeItem('mathgameStars'); localStorage.removeItem('mathgameBest');
  localStorage.removeItem('mathgameDaily'); localStorage.removeItem('mathgamePet');
  localStorage.setItem('mathgameMaxCompletedLevel', '1'); localStorage.setItem('mathgameStars', JSON.stringify({1:1}));
  localStorage.removeItem('mathgameBadges');
  const fresh = evaluateBadges();
  maybeShowBadgeUp(fresh);
  const um = document.getElementById('badgeUnlockModal');
  const r = { freshN: fresh.length, unlockOpen: um.classList.contains('show'), msg: document.getElementById('badgeUnlockMsg').textContent };
  hideBadgeUnlock();
  return r;
})()`;

const rf = await ev(PROBE_FULL);
await sleep(400);
const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('e:/mathgame/mathgame/.shots/device_badges.png', Buffer.from(shot.data, 'base64'));
console.log(JSON.stringify(rf, null, 2));
console.log('\n===== DEVICE · BADGE WALL (' + rf.iw + 'x' + rf.ih + ') =====');
P(rf.open, '勋章墙弹窗打开');
P(rf.nCells === 6 && rf.nLit === 6, '6 格全部点亮（全达成存档）', 'nLit=' + rf.nLit);
P(/已获得 6 \/ 6 枚勋章/.test(rf.sub), '副标题 6/6', JSON.stringify(rf.sub));
P(!rf.emojiInGrid, '网格无 emoji（内联 SVG）');
P(Array.isArray(rf.danglingUse) && rf.danglingUse.length === 0, '全 <use> 可解析（含 #i-medal）', JSON.stringify(rf.danglingUse));
P(rf.bannedTokens === null, '无 Chrome-91 禁词', JSON.stringify(rf.bannedTokens));
P(!rf.cardScrolls && rf.inView && rf.gapTop >= 6 && rf.gapBottom >= 6, '卡片在设备视口内不滚动', 'top=' + rf.gapTop + ' bottom=' + rf.gapBottom);
P(rf.nIconBtns === 4, '顶栏仍 4 钮');

const re = await ev(PROBE_ENTRY);
console.log('\n' + JSON.stringify(re));
P(re.hadBtn && re.profileHid && re.badgeOpen, '档案弹窗「我的勋章墙」能打开勋章墙', JSON.stringify(re));
const rc = await ev(PROBE_CELEB);
console.log(JSON.stringify(rc));
P(rc.freshN === 1 && rc.unlockOpen && /初次启航/.test(rc.msg), '新解锁庆祝弹窗出现且含勋章名', JSON.stringify(rc));

console.log('\nUA: ' + rf.ua);
console.log('shot: .shots/device_badges.png');
console.log('\n===== ' + (fail === 0 ? 'DEVICE ALL PASS' : fail + ' FAILURE(S)') + ' =====');
ws.close();
process.exit(fail === 0 ? 0 : 1);

