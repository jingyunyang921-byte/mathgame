// Device acceptance for 智能复习小关 (red dot + 复习到期 button + 遗忘曲线) over CDP on the real tablet.
// Prereq: app in foreground (parent/STANDARD mode) + `adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>`.
// Phase A (menu twin = www/index.html): inject mixed-due wrong-log → refreshReviewDot + showMistakes() →
//   read back red-dot state + #mistakeRetry 文案/handler + capture PNG (CDP bypasses FLAG_SECURE).
// Phase B (game twin = www/game.html): mgReviewPass ladder 1d→3d→7d→毕业 + mgRecordWrong reset, pure calls.
// Asserts the same invariants the local verify_review checks, but on the device's actual WebView (Chrome 91/109).
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

const DAY = 86400000, now = Date.now();
const MIXED = JSON.stringify([
  { q: '7 × 8', a: 56, op: '×', a2: 7, b2: 8, lv: 4, t: now, n: 1, rev: 0, due: now - 100000 },      // 到期
  { q: '45 ÷ 5', a: 9, op: '÷', a2: 45, b2: 5, lv: 4, t: now, n: 1, rev: 1, due: now + 7 * DAY },     // 未到期
  { q: '38 + 47', a: 85, op: '+', a2: 38, b2: 47, lv: 2, t: now, n: 1 },                              // 老行无 due → 到期
]);

let fail = 0;
const P = (ok, label, extra) => { console.log((ok ? 'PASS ' : 'FAIL ') + label + (extra != null ? '  ' + extra : '')); if (!ok) fail++; };
// ===== Phase A: 菜单孪生（www/index.html）红点 + 复习到期按钮 =====
const PROBE_A = `(() => {
  localStorage.setItem('mathgameWrongLog', ${JSON.stringify(MIXED)});
  refreshReviewDot();
  showMistakes();
  const btn = document.getElementById('mistakeBtn');
  const dot = btn.querySelector('.icon-dot');
  const r = document.getElementById('mistakeRetry');
  const modal = document.getElementById('mistakeModal');
  const card = modal.querySelector('.locked-modal-card');
  const cr = card.getBoundingClientRect();
  const u = r.querySelector('use');
  const dangling = [...document.querySelectorAll('use')].map(x => x.getAttribute('href')).filter(h => h && !document.querySelector(h));
  let styleTxt = [...document.querySelectorAll('style')].map(s => s.textContent).join('\\n').replace(/\\/\\*[\\s\\S]*?\\*\\//g, '');
  const banned = styleTxt.match(/paint-order|:has\\(|@layer|color-mix\\(|oklch\\(|\\d(dvh|svh|lvh)/g);
  const btns = [...document.querySelector('.topbar-actions').querySelectorAll('.icon-btn')];
  return {
    iw: innerWidth, ih: innerHeight,
    hasDue: btn.classList.contains('has-due'), count: countDueWrong(),
    dotShown: getComputedStyle(dot).display !== 'none',
    btnText: r.textContent.trim(), isStartReview: r.onclick === window.startReview,
    iconOk: !!(u && document.querySelector(u.getAttribute('href'))),
    cardScrolls: card.scrollHeight > card.clientHeight + 1,
    inView: cr.top >= -0.5 && cr.bottom <= innerHeight + 0.5, gapTop: Math.round(cr.top), gapBottom: Math.round(innerHeight - cr.bottom),
    nIconBtns: btns.length, danglingUse: dangling, bannedTokens: banned,
    ua: navigator.userAgent,
  };
})()`;
const ra = await ev(PROBE_A);
await sleep(400);
const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('e:/mathgame/mathgame/.shots/device_review.png', Buffer.from(shot.data, 'base64'));
console.log(JSON.stringify(ra, null, 2));

console.log('\n===== PHASE A · MENU (' + ra.iw + 'x' + ra.ih + ') =====');
P(ra.hasDue && ra.count === 2, '2 条到期 → 红点亮', 'hasDue=' + ra.hasDue + ' count=' + ra.count);
P(ra.dotShown, '红点可见（calc/var 在 Chrome91 生效）');
P(/复习到期（2）/.test(ra.btnText), '按钮文案 =「复习到期（2）」', JSON.stringify(ra.btnText));
P(ra.isStartReview, '按钮 handler = startReview');
P(ra.iconOk, '按钮图标解析');
P(!ra.cardScrolls && ra.inView && ra.gapTop >= 6 && ra.gapBottom >= 6, '弹窗卡片在设备视口内不滚动', 'top=' + ra.gapTop + ' bottom=' + ra.gapBottom);
P(ra.nIconBtns === 4, '顶栏仍 4 钮');
P(Array.isArray(ra.danglingUse) && ra.danglingUse.length === 0, '全 <use> 可解析', JSON.stringify(ra.danglingUse));
P(ra.bannedTokens === null, '无 Chrome-91 禁词', JSON.stringify(ra.bannedTokens));

// ===== Phase B: 游戏孪生（www/game.html）遗忘曲线阶梯 + 答错重置 =====
await send('Page.navigate', { url: new URL('game.html', page.url).href });
await sleep(1800);
for (let i = 0; i < 25 && !(await ev(`typeof mgReviewPass === 'function'`)); i++) await sleep(400);
const PROBE_B = `(() => {
  const KEY = 'mathgameWrongLog';
  const log = () => JSON.parse(localStorage.getItem(KEY) || '[]');
  const near = (a, b) => Math.abs(a - b) <= 8000;
  localStorage.setItem(KEY, JSON.stringify([{ q: '7 × 8', a: 56, op: '×', a2: 7, b2: 8, lv: 4, t: Date.now(), n: 1, rev: 0, due: Date.now() }]));
  const t1 = Date.now(); mgReviewPass('7 × 8'); const r1 = log()[0];
  const t2 = Date.now(); mgReviewPass('7 × 8'); const r2 = log()[0];
  const t3 = Date.now(); mgReviewPass('7 × 8'); const r3 = log()[0];
  const ladder = { rev1: r1.rev, due1: near(r1.due, t1 + 86400000), rev2: r2.rev, due2: near(r2.due, t2 + 3 * 86400000), rev3: r3.rev, due3: near(r3.due, t3 + 7 * 86400000) };
  mgReviewPass('7 × 8'); const graduated = log().length === 0;
  mgRecordWrong({ currentExpr: '7 × 8', currentAnswer: 56, level: 4 }, 9); const rr = log()[0];
  return { fn: typeof mgReviewPass, ladder, graduated, resetRev: rr.rev, resetDueNow: Number(rr.due) <= Date.now() + 50, resetLen: log().length };
})()`;
const rb = await ev(PROBE_B);
console.log('\n' + JSON.stringify(rb, null, 2));
console.log('\n===== PHASE B · GAME =====');
P(rb.fn === 'function', 'mgReviewPass 在设备 WebView 上可达');
P(rb.ladder.rev1 === 1 && rb.ladder.due1 && rb.ladder.rev2 === 2 && rb.ladder.due2 && rb.ladder.rev3 === 3 && rb.ladder.due3,
  '遗忘曲线阶梯 1d→3d→7d', JSON.stringify(rb.ladder));
P(rb.graduated, '第4次答对毕业移除');
P(rb.resetLen === 1 && rb.resetRev === 0 && rb.resetDueNow, '答错 → rev 归零 + 立刻到期', 'rev=' + rb.resetRev + ' dueNow=' + rb.resetDueNow);

console.log('\nUA: ' + ra.ua);
console.log('shot: .shots/device_review.png');
console.log('\n===== ' + (fail === 0 ? 'DEVICE ALL PASS' : fail + ' FAILURE(S)') + ' =====');
ws.close();
process.exit(fail === 0 ? 0 : 1);
