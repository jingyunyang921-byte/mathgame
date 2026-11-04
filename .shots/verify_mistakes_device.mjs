// Device verify (DuerOS WebView, Chrome 91): 错题本 读 + 写 都在真机上跑一遍。
// 先备份真实 mathgameWrongLog，验完原样写回，不给设备留假错题。
// Needs: adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>
import { writeFileSync } from 'node:fs';
const CDP = 'http://localhost:9222';
const targets = await (await fetch(CDP + '/json')).json();
const page = targets.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
if (!page) { console.log('no page target'); process.exit(1); }
console.log('target:', page.title, '|', page.url);
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let _id = 0; const pending = new Map(); const waiters = [];
ws.onmessage = e => { const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  else if (m.method) { for (let i = waiters.length - 1; i >= 0; i--) if (waiters[i].pred(m)) waiters.splice(i, 1)[0].res(m); } };
const send = (method, params) => { const id = ++_id;
  return new Promise((res, rej) => { pending.set(id, m => m.error ? rej(new Error(method + ':' + JSON.stringify(m.error))) : res(m.result)); ws.send(JSON.stringify({ id, method, params: params || {} })); }); };
const waitLoad = (ms = 20000) => new Promise((res, rej) => { const w = { pred: m => m.method === 'Page.loadEventFired', res }; waiters.push(w); setTimeout(() => { const i = waiters.indexOf(w); if (i >= 0) { waiters.splice(i, 1); rej(new Error('load timeout')); } }, ms); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ev = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true })).result.value;
// 真机页面冷启动（Vosk/OCR 权重）可能 >20s，load 事件不可靠 → 轮询到目标函数出现为止
const goto = async (url, readyExpr, ms = 90000) => {
  try { await ev(`location.href='${url}'`); } catch (e) {}
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    await sleep(900);
    try { if (await ev(`location.pathname.indexOf('${url}')>=0 && document.readyState==='complete' && (${readyExpr})`)) return; } catch (e) {}
  }
  throw new Error('nav timeout: ' + url);
};
await send('Page.enable'); await send('Runtime.enable');

// 0) 备份真实数据 + 回到菜单页
const backup = await ev(`localStorage.getItem('mathgameWrongLog')`);
console.log('backup mathgameWrongLog:', backup === null ? '(none)' : backup.slice(0, 120));
await goto('index.html', `typeof showMistakes==='function'`);
await sleep(600);

// 1) 写侧：在真机 game.html 上调 mgRecordWrong（Chrome 91 下 Number.isFinite / JSON 都要确认）
await ev(`sessionStorage.setItem('gameLevel','1');sessionStorage.setItem('gameMode','normal')`);
await goto('game.html', `typeof mgRecordWrong==='function'`);
await sleep(2500);
const writer = await ev(`(() => {
  window.__err = window.__err || null;
  addEventListener('error', e => window.__err = String(e.message));
  const KEY = 'mathgameWrongLog';
  localStorage.removeItem(KEY);
  const eng = (q, a, lv) => ({ currentExpr: q, currentAnswer: a, level: lv });
  const out = { url: location.pathname, fnType: typeof mgRecordWrong, ua: navigator.userAgent.match(/Chrome\\/[0-9]+/)[0] };
  mgRecordWrong(eng('7 × 8', 56, 3), 9);
  mgRecordWrong(eng('6 × 6', 36, 1), null);
  mgRecordWrong(eng('7 × 8', 56, 3), 48);
  // 先验 u=null 和 n++，再灌满 —— 不然第 11 条会把 6 × 6 挤出表，nullU 就成了测试自己的假阳性
  const mid = JSON.parse(localStorage.getItem(KEY));
  out.nullU = mid.some(r => r.q === '6 × 6' && r.u === null);
  out.midOrder = mid.map(r => r.q + ':' + r.n).join(',');
  for (let i = 1; i <= 9; i++) mgRecordWrong(eng(i + ' × 3', i * 3, 2), 0);
  const a = JSON.parse(localStorage.getItem(KEY));
  out.len = a.length; out.newest = a[0].q; out.dedupeGone = !a.some(r => r.q === '7 × 8' && r.n === 1);
  out.hasN2 = a.some(r => r.q === '7 × 8' && r.n === 2) || !a.some(r => r.q === '7 × 8');
  out.dropped = !a.some(r => r.q === '6 × 6');   // 11 条里最老的那条被挤掉
  out.err = window.__err;
  return out;
})()`);

// 2) 读侧：回菜单页，喂满 10 条 → 开错题本
await goto('index.html', `typeof showMistakes==='function'`);
await sleep(700);
const SEED_AND_OPEN = `(() => {
  const now = Date.now(), DAY = 86400000;
  localStorage.setItem('mathgameWrongLog', JSON.stringify([
    {q:'7 × 8',a:56,u:9,lv:4,t:now-1000,n:2},   {q:'8 × 9',a:72,u:63,lv:4,t:now-60000,n:1},
    {q:'54 ÷ 9',a:6,u:7,lv:5,t:now-3600000,n:3},{q:'6 × 6',a:36,u:null,lv:2,t:now-DAY,n:1},
    {q:'42 ÷ 7',a:6,u:8,lv:5,t:now-2*DAY,n:1},  {q:'9 × 9',a:81,u:72,lv:6,t:now-3*DAY,n:4},
    {q:'4 × 5',a:20,u:25,lv:2,t:now-6*DAY,n:1}, {q:'24 ÷ 6',a:4,u:6,lv:3,t:now-9*DAY,n:2},
    {q:'3 × 7',a:21,u:18,lv:2,t:now-20*DAY,n:1},{q:'56 ÷ 8',a:7,u:9,lv:5,t:now-40*DAY,n:1}
  ]));
  showMistakes();
  const card = document.querySelector('#mistakeModal .locked-modal-card');
  const list = document.getElementById('mistakeList');
  const btn = document.querySelector('#mistakeModal .locked-modal-btn');
  const clr = document.getElementById('mistakeClear');
  const cr = card.getBoundingClientRect(), br = btn.getBoundingClientRect(), kr = clr.getBoundingClientRect();
  const rows = [...list.children];
  const acts = document.querySelector('.topbar-actions');
  const btns = [...acts.querySelectorAll('.icon-btn')];
  const bandR = document.querySelector('.topbar').getBoundingClientRect().right;
  const badgeR = document.querySelector('.profile-badge').getBoundingClientRect().right;
  const bFirst = btns[0].getBoundingClientRect(), bLast = btns[btns.length - 1].getBoundingClientRect();
  const btnHrefs = btns.map(b => b.querySelector('use').getAttribute('href'));
  return {
    iw: innerWidth, ih: innerHeight, dpr: devicePixelRatio,
    ui: getComputedStyle(document.documentElement).getPropertyValue('--ui').trim(),
    rowCount: rows.length,
    row0: rows[0].innerText.replace(/\\n/g, ' | '),
    row3: rows[3].innerText.replace(/\\n/g, ' | '),
    row9: rows[9].innerText.replace(/\\n/g, ' | '),
    sub: document.getElementById('mistakeSub').textContent,
    row0LvName: LEVEL_NAMES[4],   // 关卡名从页面现读：写死过一次「乘法进阶」，四则运算重做后就一直是红的
    msgHidden: getComputedStyle(document.getElementById('mistakeMsg')).display === 'none',
    nBadChips: list.querySelectorAll('.mist-bad').length,
    nOkChips: list.querySelectorAll('.mist-ok').length,
    strike: getComputedStyle(rows[0].querySelector('.mist-bad')).textDecorationLine,
    clrShown: getComputedStyle(clr).display !== 'none',
    gapTop: Math.round(cr.top), gapBottom: Math.round(innerHeight - cr.bottom),
    inViewport: cr.top >= -0.5 && cr.bottom <= innerHeight + 0.5,
    cardScrolls: card.scrollHeight - card.clientHeight > 1,
    listScrolls: list.scrollHeight - list.clientHeight > 1,
    btnInView: br.bottom <= innerHeight + 0.5 && br.top >= -0.5,
    clrInView: kr.bottom <= innerHeight + 0.5 && kr.top >= -0.5,
    nIconBtns: btns.length, btnOrder: btnHrefs.join(','), gearIsLast: btnHrefs[btnHrefs.length - 1] === '#i-gear',
    actsFlushRight: Math.abs(bandR - bLast.right) < 2, bookAfterBadge: bFirst.left > badgeR,
    danglingUse: [...document.querySelectorAll('use')].map(u => u.getAttribute('href')).filter(h => h && !document.querySelector(h)),
    errBanner: !!document.querySelector('#mg-err-banner'),
  };
})()`;
const r = await ev(SEED_AND_OPEN);
await sleep(400);
const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('e:/mathgame/mathgame/.shots/device_mistakes.png', Buffer.from(shot.data, 'base64'));

// 3) 清空 → 空状态。走项目自己的 #confirmModal，不打桩 window.confirm ——
// 原生 confirm 早就被换掉了（见 verify_confirm_modal.mjs）。打桩版从那之后就一直是红的：
// clearWrongLog 挂在 mgConfirm 的 Promise 上永远不返回，于是「没清掉」「没问我」几条一起假失败。
// 先点一次取消（一道都不许删），再点确定。
const c = await ev(`(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const cm = document.getElementById('confirmModal');
  const pCancel = clearWrongLog(); await wait(80);
  const cancelAsked = cm.classList.contains('show');
  document.getElementById('confirmCancelBtn').click(); await pCancel; await wait(40);
  const cancelKept = getWrongLog().length;

  const p = clearWrongLog(); await wait(80);
  const askShown = cm.classList.contains('show');
  const asked = document.getElementById('confirmTitle').textContent + ' ' + document.getElementById('confirmMsg').textContent;
  const okText = document.getElementById('confirmOkBtn').textContent.trim();
  document.getElementById('confirmOkBtn').click(); await p; await wait(40);
  return { asked, askShown, okText, cancelAsked, cancelKept,
    confirmGone: !cm.classList.contains('show'),
    keyGone: localStorage.getItem('mathgameWrongLog') === null,
    rowCount: document.getElementById('mistakeList').children.length,
    msg: document.getElementById('mistakeMsg').textContent,
    msgShown: getComputedStyle(document.getElementById('mistakeMsg')).display !== 'none',
    clrShown: getComputedStyle(document.getElementById('mistakeClear')).display !== 'none',
    stillOpen: document.getElementById('mistakeModal').classList.contains('show') };
})()`);
await sleep(300);
const shot2 = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('e:/mathgame/mathgame/.shots/device_mistakes_empty.png', Buffer.from(shot2.data, 'base64'));

// 4) 还原真实数据 + 关弹窗
const restored = await ev(`(() => { hideMistakes();
  ${backup === null ? `localStorage.removeItem('mathgameWrongLog');` : `localStorage.setItem('mathgameWrongLog', ${JSON.stringify(backup)});`}
  return localStorage.getItem('mathgameWrongLog'); })()`);

let fail = 0;
const P = (ok, label, extra) => { console.log((ok ? 'PASS ' : 'FAIL ') + label + (extra != null ? '  ' + extra : '')); if (!ok) fail++; };
console.log('\nWRITER ' + JSON.stringify(writer));
console.log('READER ' + JSON.stringify(r, null, 1));
console.log('\n===== DEVICE VERDICTS (' + writer.ua + ', ' + r.iw + 'x' + r.ih + ' dpr' + r.dpr + ' ui=' + r.ui + ') =====');
P(writer.fnType === 'function' && /game\.html$/.test(writer.url), 'mgRecordWrong reachable on the device game page', writer.url);
P(!writer.err, 'no JS error on the device game page', JSON.stringify(writer.err));
P(writer.nullU && /^7 × 8:2,6 × 6:1$/.test(writer.midOrder), 'device writer: re-miss jumps to front with n++, u=null preserved', writer.midOrder);
P(writer.len === 10 && writer.dedupeGone && writer.dropped, 'device writer: caps at 10, oldest row pushed out', JSON.stringify(writer));
P(r.rowCount === 10, '10 rows rendered on device', 'rowCount=' + r.rowCount);
P(/7 × 8 = \?/.test(r.row0) && r.row0.indexOf(r.row0LvName) >= 0 && /错过 2 次/.test(r.row0) && /今天/.test(r.row0), 'row0 = expr + level + n + when', JSON.stringify(r.row0) + ' lv3=' + r.row0LvName);
P(!/错过/.test(r.row3) && /昨天/.test(r.row3), 'n===1 omits 错过 N 次; 昨天 by calendar day', JSON.stringify(r.row3));
P(/一个月以前/.test(r.row9), 'oldest row falls back to 一个月以前', JSON.stringify(r.row9));
P(r.nBadChips === 9 && r.nOkChips === 10, 'u===null row omits the struck chip only', 'bad=' + r.nBadChips + ' ok=' + r.nOkChips);
P(r.strike === 'line-through', 'Chrome 91 renders the strike-through', r.strike);
P(/^最近 10 道错题 · 划掉的是当时答错的数/.test(r.sub) && r.msgHidden, 'legend sits in the subtitle, 3-line note hidden', JSON.stringify(r.sub));
P(r.danglingUse.length === 0, 'all <use> resolve on device (incl. #i-book)', JSON.stringify(r.danglingUse));
P(!r.errBanner, 'no #mg-err-banner raised');
P(r.inViewport && r.gapTop >= 6 && r.gapBottom >= 6, 'card inside the device viewport with room', 'top=' + r.gapTop + ' bottom=' + r.gapBottom);
P(!r.cardScrolls, 'card itself never scrolls (header/buttons pinned)');
P(r.btnInView && r.clrInView, 'both footer buttons visible on device');
P(r.nIconBtns === 4 && r.gearIsLast && r.actsFlushRight && r.bookAfterBadge, 'topbar: 萌宠 + 错题本 + 图鉴 + 齿轮 grouped flush right, gear last', r.btnOrder);
P(c.cancelAsked && c.cancelKept === 10, '点取消一道都不删（真机）', 'asked=' + c.cancelAsked + ' kept=' + c.cancelKept);
P(c.keyGone && c.rowCount === 0, 'clearWrongLog wipes the key and rows on device');
P(c.askShown && /清空错题本/.test(c.asked) && /10 道/.test(c.asked) && c.okText === '清空',
  'clear asks via #confirmModal with the count', JSON.stringify(c.asked) + ' ok=' + c.okText);
P(c.confirmGone, '确认弹窗点完即收起', String(c.confirmGone));
P(!c.clrShown && c.msgShown && /太棒了/.test(c.msg), 'empty state on device: praise shown, clear hidden', JSON.stringify(c.msg));
P(c.stillOpen, 'modal stays open after clearing');
P(restored === backup, 'real 错题本 data restored', restored === null ? '(none)' : (restored + '').slice(0, 60));
console.log('\nshots: .shots/device_mistakes.png  .shots/device_mistakes_empty.png');
console.log('===== ' + (fail === 0 ? 'ALL PASS' : fail + ' FAILURE(S)') + ' =====');
ws.close();
process.exit(fail === 0 ? 0 : 1);
