// Local verify: 错题本 (#mistakeModal) — seeds 10 fake mathgameWrongLog rows (the tallest
// possible state), opens showMistakes(), asserts render / <use> resolution / scroll containment /
// topbar layout, then exercises the empty state + clearWrongLog() 的取消/确定两条路径（走项目
// 自己的 #confirmModal，不打桩原生 confirm —— 原生 confirm 已经不在代码里了）。
// Needs: headless Chrome --remote-debugging-port=9333 + http.server :8000 in e:/mathgame/mathgame.
import { writeFileSync } from 'node:fs';
const BROWSER = 'http://localhost:9333';
const URL = 'http://localhost:8000/menu.html';
const VIEWPORTS = [
  { name: '1000x615', w: 1000, h: 615 },   // ~real device (DPR2 -> 2000x1230)
  { name: '1000x576', w: 1000, h: 576 },
  { name: '900x500', w: 900, h: 500 },     // very short: internal list scroll allowed
  { name: '412x915', w: 412, h: 915 },     // portrait phone
];

const ver = await (await fetch(BROWSER + '/json/version')).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let _id = 0; const pending = new Map(); const waiters = [];
ws.onmessage = e => { const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  else if (m.method) { for (let i = waiters.length - 1; i >= 0; i--) if (waiters[i].pred(m)) waiters.splice(i, 1)[0].res(m); } };
const send = (method, params, sessionId) => { const id = ++_id; const msg = { id, method, params: params || {} }; if (sessionId) msg.sessionId = sessionId;
  return new Promise((res, rej) => { pending.set(id, m => m.error ? rej(new Error(method + ':' + JSON.stringify(m.error))) : res(m.result)); ws.send(JSON.stringify(msg)); }); };
const waitEvent = (pred, ms = 8000) => new Promise((res, rej) => { const w = { pred, res }; waiters.push(w); setTimeout(() => { const i = waiters.indexOf(w); if (i >= 0) { waiters.splice(i, 1); rej(new Error('timeout')); } }, ms); });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);
await send('Network.enable', {}, sessionId);
await send('Network.setCacheDisabled', { cacheDisabled: true }, sessionId);   // 别拿旧 menu.html 断言新改动

const SEED_AND_OPEN = `(() => {
  const now = Date.now(), DAY = 86400000;
  localStorage.setItem('mathgameMaxCompletedLevel','6');
  localStorage.setItem('mathgameStars', JSON.stringify({1:3,2:3,3:2,4:2,5:1,6:0}));
  localStorage.setItem('mathgameWrongLog', JSON.stringify([
    {q:'7 × 8',  a:56, u:9,    lv:4, t:now-1000,    n:2},
    {q:'8 × 9',  a:72, u:63,   lv:4, t:now-60000,   n:1},
    {q:'54 ÷ 9', a:6,  u:7,    lv:5, t:now-3600000, n:3},
    {q:'6 × 6',  a:36, u:null, lv:2, t:now-DAY,     n:1},
    {q:'42 ÷ 7', a:6,  u:8,    lv:5, t:now-2*DAY,   n:1},
    {q:'9 × 9',  a:81, u:72,   lv:6, t:now-3*DAY,   n:4},
    {q:'4 × 5',  a:20, u:25,   lv:2, t:now-6*DAY,   n:1},
    {q:'24 ÷ 6', a:4,  u:6,    lv:3, t:now-9*DAY,   n:2},
    {q:'3 × 7',  a:21, u:18,   lv:2, t:now-20*DAY,  n:1},
    {q:'56 ÷ 8', a:7,  u:9,    lv:5, t:now-40*DAY,  n:1}
  ]));
  showMistakes();
  const card = document.querySelector('#mistakeModal .locked-modal-card');
  const list = document.getElementById('mistakeList');
  const btn = document.querySelector('#mistakeModal .locked-modal-btn');
  const clr = document.getElementById('mistakeClear');
  const cr = card.getBoundingClientRect(), br = btn.getBoundingClientRect(), kr = clr.getBoundingClientRect();
  const rows = [...list.children];
  const bad = [...document.querySelectorAll('use')].map(u => u.getAttribute('href')).filter(h => h && !document.querySelector(h));
  const styleTxt = [...document.querySelectorAll('style')].map(s => s.textContent).join('\\n');
  const banned = styleTxt.match(/paint-order|:has\\(|@layer|color-mix\\(|oklch\\(|\\d(dvh|svh|lvh)/g);
  // 顶栏：四个圆钮成组靠右（萌宠/错题/图鉴/齿轮），齿轮必须仍是最右
  const acts = document.querySelector('.topbar-actions');
  const btns = [...acts.querySelectorAll('.icon-btn')];
  const bandR = document.querySelector('.topbar').getBoundingClientRect().right;
  const badgeR = document.querySelector('.profile-badge').getBoundingClientRect().right;
  const bFirst = btns[0].getBoundingClientRect(), bLast = btns[btns.length - 1].getBoundingClientRect();
  const btnHrefs = btns.map(b => b.querySelector('use').getAttribute('href'));
  const strike = rows.length ? getComputedStyle(rows[0].querySelector('.mist-bad')).textDecorationLine : '';
  return {
    iw: innerWidth, ih: innerHeight,
    rowCount: rows.length,
    row0: rows.length ? rows[0].innerText.replace(/\\n/g,' | ') : '',
    row3: rows.length > 3 ? rows[3].innerText.replace(/\\n/g,' | ') : '',
    row9: rows.length > 9 ? rows[9].innerText.replace(/\\n/g,' | ') : '',
    sub: document.getElementById('mistakeSub').textContent,
    nBadChips: list.querySelectorAll('.mist-bad').length,
    nOkChips: list.querySelectorAll('.mist-ok').length,
    strike: strike,
    clrShown: getComputedStyle(clr).display !== 'none',
    clrIcon: !!clr.querySelector('use'),
    gapTop: Math.round(cr.top), gapBottom: Math.round(innerHeight - cr.bottom),
    inViewport: cr.top >= -0.5 && cr.bottom <= innerHeight + 0.5,
    cardScrolls: card.scrollHeight - card.clientHeight > 1,
    listScrolls: list.scrollHeight - list.clientHeight > 1,
    listOver: list.scrollHeight - list.clientHeight,
    btnInView: br.bottom <= innerHeight + 0.5 && br.top >= -0.5,
    clrInView: kr.bottom <= innerHeight + 0.5 && kr.top >= -0.5,
    nIconBtns: btns.length,
    btnOrder: btnHrefs.join(','),
    gearIsLast: btnHrefs[btnHrefs.length - 1] === '#i-gear',
    actsFlushRight: Math.abs(bandR - bLast.right) < 2,
    bookAfterBadge: bFirst.left > badgeR,
    danglingUse: bad, bannedTokens: banned,
    row0LvName: LEVEL_NAMES[4],
    ui: getComputedStyle(document.documentElement).getPropertyValue('--ui').trim(),
  };
})()`;

// 清空：走真实的项目风格确认弹窗(mgConfirm)，不再打桩 window.confirm ——
// 原生 confirm 早就被 #confirmModal 换掉了（见 verify_confirm_modal.mjs），打桩版从那之后
// 就一直是红的：clearWrongLog 挂在 mgConfirm 的 Promise 上永远不返回，于是「没清掉」「还有 10 行」
// 「没问我」四条断言一起假失败。顺手把口径改好：现在断的是「孩子真正看见的那行字」。
// 先跑一遍取消（必须一道都不删），再跑确定。
const CLEAR_AND_CHECK = `(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const cm = document.getElementById('confirmModal');
  const txt = () => document.getElementById('confirmTitle').textContent + ' ' + document.getElementById('confirmMsg').textContent;

  const pCancel = clearWrongLog(); await wait(60);
  const cancelAsked = cm.classList.contains('show');
  document.getElementById('confirmCancelBtn').click(); await pCancel; await wait(30);
  const cancelKept = getWrongLog().length;

  const p = clearWrongLog(); await wait(60);
  const askShown = cm.classList.contains('show');
  const asked = txt();
  const okText = document.getElementById('confirmOkBtn').textContent.trim();
  document.getElementById('confirmOkBtn').click();
  await p; await wait(30);

  const list = document.getElementById('mistakeList');
  const clr = document.getElementById('mistakeClear');
  const modal = document.getElementById('mistakeModal');
  return {
    asked, askShown, okText, cancelAsked, cancelKept,
    confirmGone: !cm.classList.contains('show'),
    keyGone: localStorage.getItem('mathgameWrongLog') === null,
    rowCount: list.children.length,
    msg: document.getElementById('mistakeMsg').textContent,
    subShown: getComputedStyle(document.getElementById('mistakeSub')).display !== 'none',
    clrShown: getComputedStyle(clr).display !== 'none',
    stillOpen: modal.classList.contains('show') && modal.getAttribute('aria-hidden') === 'false',
    logAfter: JSON.stringify(getWrongLog()),
  };
})()`;

// mistWhen 走日历日：把「昨晚 23:50」按今早 08:00 读，必须是「昨天」而不是「今天」
const WHEN_AND_RESET = `(async () => {
  const mk = (dayOffset, h, m) => { const d = new Date(); d.setDate(d.getDate() - dayOffset); d.setHours(h, m, 0, 0); return d.getTime(); };
  const out = {
    now: mistWhen(Date.now()),
    lastNight: mistWhen(mk(1, 23, 50)),
    d3: mistWhen(mk(3, 12, 0)),
    d9: mistWhen(mk(9, 12, 0)),
    d40: mistWhen(mk(40, 12, 0)),
    bad: mistWhen('x'), zero: mistWhen(0),
    dirty: (() => { localStorage.setItem('mathgameWrongLog', '{not json'); const a = getWrongLog();
      localStorage.setItem('mathgameWrongLog', JSON.stringify([{q:''},null,7,{q:'2 × 2',a:4,u:5,lv:1,t:Date.now(),n:1}]));
      return { onBadJson: a.length, filtered: getWrongLog().length }; })(),
    esc: mistEsc('<img src=x onerror=1> & y'),
  };
  // 重置学习进度也要清掉错题本 + 升段庆祝的已见档位（否则重置后重新攒星一次都不弹）
  // + 影子对手的速度档位（否则进度归零了怪兽还按老水平出手，对重新开始的孩子是突然变难）
  // + 速算纪录和连续天数（它们也是「学习进度」，留着就成了孤岛数据：星星清零了却还写着「最高 30 题」）。
  // 同样走真实确认弹窗，不打桩 window.confirm。
  localStorage.setItem('mathgameRankSeen', '7');
  localStorage.setItem('mathgamePace', '{"1":{"n":20,"ms":3000}}');
  localStorage.setItem('mathgameSprintBest', '{"best":30,"t":' + Date.now() + '}');
  localStorage.setItem('mathgameDaily', JSON.stringify({ last: '2026-01-01', streak: 9, bestStreak: 9 }));
  const p = resetProgress(); await new Promise(r => setTimeout(r, 60));
  out.resetAsked = document.getElementById('confirmModal').classList.contains('show');
  document.getElementById('confirmOkBtn').click();
  await p; await new Promise(r => setTimeout(r, 30));
  out.wipedByReset = localStorage.getItem('mathgameWrongLog') === null;
  out.rankSeenWiped = localStorage.getItem('mathgameRankSeen') === null;
  out.paceWiped = localStorage.getItem('mathgamePace') === null;
  out.sprintBestWiped = localStorage.getItem('mathgameSprintBest') === null;
  out.dailyWiped = localStorage.getItem('mathgameDaily') === null;
  // 重置后那两颗 pill 当场就得归零（refreshLevelCards 里带了 refreshSprintUI），
  // 不是等下次开机 —— 否则孩子看着「连续 9 天」却发现星星全没了。
  out.streakPillGone = !document.getElementById('streakPill').classList.contains('show');
  out.sprintMeta = document.getElementById('sprintPillMeta').textContent;
  return out;
})()`;

const results = [];
for (const vp of VIEWPORTS) {
  await send('Emulation.setDeviceMetricsOverride', { width: vp.w, height: vp.h, deviceScaleFactor: 1, mobile: false }, sessionId);
  const nav = waitEvent(m => m.method === 'Page.loadEventFired' && m.sessionId === sessionId);
  await send('Page.navigate', { url: URL }, sessionId);
  await nav; await sleep(350);
  const open = await send('Runtime.evaluate', { expression: SEED_AND_OPEN, returnByValue: true }, sessionId);
  await sleep(300); // 让 modal-icon 弹跳动画落定再截图
  let shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync('e:/mathgame/mathgame/.shots/mistakes_' + vp.name + '.png', Buffer.from(shot.data, 'base64'));
  const cleared = await send('Runtime.evaluate', { expression: CLEAR_AND_CHECK, returnByValue: true, awaitPromise: true, userGesture: true }, sessionId);
  await sleep(200);
  shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync('e:/mathgame/mathgame/.shots/mistakes_empty_' + vp.name + '.png', Buffer.from(shot.data, 'base64'));
  const when = await send('Runtime.evaluate', { expression: WHEN_AND_RESET, returnByValue: true, awaitPromise: true, userGesture: true }, sessionId);
  results.push({ vp, r: open.result.value, c: cleared.result.value, w: when.result.value });
}

let fail = 0;
const P = (ok, label, extra) => { console.log((ok ? 'PASS ' : 'FAIL ') + label + (extra != null ? '  ' + extra : '')); if (!ok) fail++; };
console.log(JSON.stringify(results.map(x => ({ vp: x.vp.name, ...x.r })), null, 2));
console.log('\n===== VERDICTS =====');
for (const { vp, r, c, w } of results) {
  console.log('\n-- ' + vp.name + '  (ui=' + r.ui + ')  -> .shots/mistakes_' + vp.name + '.png');
  P(r.rowCount === 10, '10 rows rendered', 'rowCount=' + r.rowCount);
  P(/^最近 10 道错题/.test(r.sub), 'subtitle counts rows', JSON.stringify(r.sub));
  P(/7 × 8 = \?/.test(r.row0) && r.row0.indexOf(r.row0LvName) >= 0 && /错过 2 次/.test(r.row0) && /今天/.test(r.row0), 'row0 = expr + level + n + when', JSON.stringify(r.row0) + ' lv4(表内乘除)=' + r.row0LvName);
  P(/9/.test(r.row0) && /56/.test(r.row0), 'row0 shows wrong + right answer', JSON.stringify(r.row0));
  P(!/错过/.test(r.row3) && /昨天/.test(r.row3), 'n===1 omits 错过 N 次; calendar day label', JSON.stringify(r.row3));
  P(/一个月以前/.test(r.row9), 'oldest row falls back to 一个月以前', JSON.stringify(r.row9));
  P(r.nBadChips === 9 && r.nOkChips === 10, 'u===null row omits the struck chip only', 'bad=' + r.nBadChips + ' ok=' + r.nOkChips);
  P(r.strike === 'line-through', 'wrong answer is struck through', r.strike);
  P(r.clrShown && r.clrIcon, 'clear button visible with i-reset icon', 'shown=' + r.clrShown);
  P(Array.isArray(r.danglingUse) && r.danglingUse.length === 0, 'all <use> resolve (incl. #i-book)', JSON.stringify(r.danglingUse));
  P(r.bannedTokens === null, 'no Chrome-91-banned CSS tokens', JSON.stringify(r.bannedTokens));
  P(r.inViewport && r.gapTop >= 6 && r.gapBottom >= 6, 'card inside viewport with breathing room', 'top=' + r.gapTop + ' bottom=' + r.gapBottom);
  P(!r.cardScrolls, 'card itself never scrolls (header/buttons pinned)');
  P(r.btnInView && r.clrInView, 'both footer buttons always visible', 'btn+clear');
  P(r.nIconBtns === 4 && r.gearIsLast && r.actsFlushRight && r.bookAfterBadge, 'topbar: 4 round buttons (萌宠/错题/图鉴/齿轮), group flush right, gear last', r.btnOrder);
  console.log('INFO list internal scroll ' + (r.listScrolls ? 'ON' : 'off') + '  listOver=' + r.listOver);
  P(c.cancelAsked && c.cancelKept === 10, '点取消一道都不删', 'asked=' + c.cancelAsked + ' kept=' + c.cancelKept);
  P(c.keyGone && c.rowCount === 0 && c.logAfter === '[]', 'clearWrongLog wipes the key and the rows', 'rows=' + c.rowCount);
  P(c.askShown && /清空错题本/.test(c.asked) && /10 道/.test(c.asked) && c.okText === '清空',
    'clear asks via #confirmModal with the count', JSON.stringify(c.asked) + ' ok=' + c.okText);
  P(c.confirmGone, '确认弹窗点完即收起', String(c.confirmGone));
  P(!c.clrShown && !c.subShown && /太棒了/.test(c.msg), 'empty state: clear+subtitle hidden, praise shown', JSON.stringify(c.msg));
  P(c.stillOpen, 'modal stays open after clearing');
  P(w.now === '今天' && w.lastNight === '昨天' && w.d3 === '3 天前' && w.d9 === '1 周前' && w.d40 === '一个月以前', 'mistWhen is calendar-day based', JSON.stringify(w));
  P(w.bad === '' && w.zero === '', 'mistWhen tolerates bad timestamps');
  P(w.dirty.onBadJson === 0 && w.dirty.filtered === 1, 'getWrongLog survives bad JSON / filters junk rows', JSON.stringify(w.dirty));
  P(!/</.test(w.esc) && /&amp;/.test(w.esc), 'mistEsc neutralises markup', JSON.stringify(w.esc));
  P(w.resetAsked && w.wipedByReset, '重置学习进度 also wipes 错题本（经 #confirmModal）', 'asked=' + w.resetAsked);
  P(w.rankSeenWiped, '重置学习进度 also wipes mathgameRankSeen（否则重置后升段再不庆祝）', String(w.rankSeenWiped));
  P(w.paceWiped, '重置学习进度 also wipes mathgamePace（否则怪兽还按老水平出手）', String(w.paceWiped));
  P(w.sprintBestWiped && w.dailyWiped, '重置学习进度 also wipes 速算纪录 + 连续天数',
    'best=' + w.sprintBestWiped + ' daily=' + w.dailyWiped);
  P(w.streakPillGone && w.sprintMeta === '今天可得 5 星币', '重置后两颗 pill 当场归零（不等下次开机）：打卡 pill 收起、打卡卡回到第 1 天奖品',
    'streakHidden=' + w.streakPillGone + ' meta=' + JSON.stringify(w.sprintMeta));
}
console.log('\n===== ' + (fail === 0 ? 'ALL PASS' : fail + ' FAILURE(S)') + ' =====');
await send('Target.closeTarget', { targetId });
ws.close();
process.exit(fail === 0 ? 0 : 1);
