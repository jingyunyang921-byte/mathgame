// P1 第2步 智能复习小关 (spaced-repetition) 验证闸门。两侧都守：
//   游戏侧 —— 遗忘曲线阶梯 mgReviewPass(1d→3d→7d→毕业移除)、答错 mgRecordWrong 重置 rev:0/立刻到期、
//     复习局 boot 置 _mgReview + _mgQueue 只含喂进来的到期行、复习局答对走 mgReviewPass「推档不消账」
//     (区别于普通练习局的 mgMasterWrong「消账移除」)、复习局结算照常发星币。
//   菜单侧 —— 错题本按钮红点随「到期数>0」开合、#mistakeRetry 文案/handler 在
//     「复习到期(N)/startReview」↔「重练这些题/retryWrong」间切换；回归:弹窗卡片不滚动、顶栏仍 4 钮、
//     无 Chrome-91 禁词、全 <use> 可解析。4 视口(含真机 1000×576)。
// Needs: headless Chrome --remote-debugging-port=9333 + http.server :8000 in e:/mathgame/mathgame.
import { mkdirSync } from 'fs';
const CDP = 'http://localhost:9333';
const info = await (await fetch(CDP + '/json')).json();
const page = info.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || info[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p) => { const id = ++_id; return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify({ id, method: m, params: p || {} })); }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true });
  if (r.exceptionDetails) throw new Error('EVAL: ' + ((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text));
  return r.result.value;
};
await send('Page.enable'); await send('Runtime.enable');
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
mkdirSync('.shots/out', { recursive: true });
let fail = 0; const P = (ok, l, x) => { console.log((ok ? '  PASS ' : '  FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
const MENU = 'http://localhost:8000/menu.html';
const GAME = 'http://localhost:8000/index.html';
const DAY = 86400000, now = Date.now();

// 到期(expired) + 老行(无 due) 两条都算「待复习」；未来一条不算。
const DUE2 = [
  { q: '7 × 8', a: 56, op: '×', a2: 7, b2: 8, lv: 4, t: now, n: 1, rev: 0, due: now - 100000 },
  { q: '38 + 47', a: 85, op: '+', a2: 38, b2: 47, lv: 2, t: now, n: 1 },
];
const MIXED = JSON.stringify([
  DUE2[0],
  { q: '45 ÷ 5', a: 9, op: '÷', a2: 45, b2: 5, lv: 4, t: now, n: 1, rev: 1, due: now + 7 * DAY },
  DUE2[1],
]);
const FUTURE_ONLY = JSON.stringify([
  { q: '7 × 8', a: 56, op: '×', a2: 7, b2: 8, lv: 4, t: now, n: 1, rev: 1, due: now + 7 * DAY },
  { q: '45 ÷ 5', a: 9, op: '÷', a2: 45, b2: 5, lv: 4, t: now, n: 1, rev: 2, due: now + 3 * DAY },
]);

async function bootReview(rows) {
  const json = JSON.stringify(rows);   // 先转成 JSON 文本，再 ${JSON.stringify(json)} 嵌成 JS 字符串字面量
  await send('Page.navigate', { url: GAME }); await sleep(400);
  await ev(`sessionStorage.setItem('gameLevel','0');sessionStorage.setItem('gameMode','visual');
    sessionStorage.removeItem('mgPracticeOps');
    localStorage.setItem('mathgameWrongLog', ${JSON.stringify(JSON.stringify(rows))});
    localStorage.setItem('mathgameCoins', JSON.stringify({ coins: 0 }));
    sessionStorage.setItem('mgPractice', ${JSON.stringify(JSON.stringify(rows))});
    sessionStorage.setItem('mgReview', '1');`);
  await send('Page.reload'); await sleep(900);
  await ev(`window.__errs=[];addEventListener('error',e=>window.__errs.push(String(e.message)));`);
  await ev(`window._skipOcrLoading && window._skipOcrLoading();`);
  for (let i = 0; i < 30; i++) { if (await ev(`!!window._currentGame`)) { await sleep(400); return true; } await sleep(400); }
  return false;
}
// ======== 1. 游戏侧：复习局 boot → _mgReview + 队列只含到期行 ========
console.log('\n######## 1. 复习局 boot（_mgReview / _mgQueue） ########');
await send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 576, deviceScaleFactor: 1, mobile: false });
P(await bootReview(DUE2), '复习局已构造（mgPractice=到期行 + mgReview=1）');
const a = await ev(`(() => ({ review: _mgReview, practice: _mgPractice, queue: _mgQueue ? _mgQueue.length : -1,
  cur: window._currentGame ? window._currentGame.currentExpr : null,
  reviewKeyGone: sessionStorage.getItem('mgReview') === null, errs: window.__errs || [] }))()`);
P(a.review === true, '_mgReview 已置位（复习局标记）', String(a.review));
P(a.practice === true, '_mgPractice 仍置位（骑 level-0 练习架构）', String(a.practice));
P(a.queue === 1, '_mgQueue 还剩 1 条（首题已进 currentExpr，共 2 条到期行）', 'queue=' + a.queue);
P(['7 × 8', '38 + 47'].includes(a.cur), '首题来自喂进来的到期行（无填充题）', JSON.stringify(a.cur));
P(a.reviewKeyGone, 'sessionStorage.mgReview 读一次即删', String(a.reviewKeyGone));
P(a.errs.length === 0, '无 JS 错误', JSON.stringify(a.errs));

// ======== 2. 复习局答对 → mgReviewPass「推档不消账」（区别于练习局 mgMasterWrong 的移除）========
console.log('\n######## 2. 复习答对走推档（不消账移除）########');
const b = await ev(`(() => {
  const KEY = 'mathgameWrongLog';
  const log = () => JSON.parse(localStorage.getItem(KEY) || '[]');
  const expr = window._currentGame.currentExpr;
  const before = log().find(r => r.q === expr);
  mgOnCorrect();
  const after = log().find(r => r.q === expr);
  return { expr, len: log().length, beforeRev: before ? (before.rev | 0) : null,
    afterRev: after ? after.rev : null, stillPresent: !!after,
    dueFuture: after ? Number(after.due) > Date.now() + 1000 : null, errs: window.__errs || [] };
})()`);
P(b.stillPresent && b.len === 2, '复习答对后该行还在、错题本没变短（没走 mgMasterWrong 移除）',
  'present=' + b.stillPresent + ' len=' + b.len);
P(b.afterRev === b.beforeRev + 1, 'rev 推进一级（mgReviewPass）', b.beforeRev + '→' + b.afterRev);
P(b.dueFuture, 'due 被推到未来（下次更晚复习）', String(b.dueFuture));
P(b.errs.length === 0, '无 JS 错误', JSON.stringify(b.errs));

// ======== 3. 复习局结算照常发星币 ========
console.log('\n######## 3. 复习局结算发币 ########');
const coinsOf = `(() => { try { const o = JSON.parse(localStorage.getItem('mathgameCoins') || '{}'); return Number(o.coins) || 0; } catch (e) { return 0; } })()`;
const coinBefore = await ev(coinsOf);
await ev(`_mgWrong=0;_mgCorrect=10;_mgMaxStreak=10;_mgRoundStart=Date.now()-20000;debugEndGame(true);`);
await sleep(900);
const coinHeld = await ev(coinsOf);
await ev(`(() => { const t = document.querySelector('.chest-tap'); if (t) t.click(); return true; })()`);
await sleep(300);
const coinAfter = await ev(coinsOf);
const ov = await ev(`(() => ({ title: (document.getElementById('overlay-title')||{}).textContent, errs: window.__errs || [] }))()`);
P(coinAfter > coinBefore, '复习局结算后星币增加（复习答对也给币）', coinBefore + '→' + coinAfter + '（点箱前 ' + coinHeld + '）');
P(/练习完成|复习/.test(ov.title || ''), '走练习/复习结算（不污染闯关主线）', JSON.stringify(ov.title));
P(ov.errs.length === 0, '结算无 JS 错误', JSON.stringify(ov.errs));

// ======== 4. 遗忘曲线阶梯 + 答错重置（直接调函数，不打整局）========
console.log('\n######## 4. mgReviewPass 阶梯 1d→3d→7d→毕业 + mgRecordWrong 重置 ########');
const c = await ev(`(() => {
  const KEY = 'mathgameWrongLog';
  const log = () => JSON.parse(localStorage.getItem(KEY) || '[]');
  const near = (a, b) => Math.abs(a - b) <= 8000;
  localStorage.setItem(KEY, JSON.stringify([{ q: '7 × 8', a: 56, op: '×', a2: 7, b2: 8, lv: 4, t: Date.now(), n: 1, rev: 0, due: Date.now() }]));
  const t1 = Date.now(); mgReviewPass('7 × 8'); const r1 = log()[0];
  const t2 = Date.now(); mgReviewPass('7 × 8'); const r2 = log()[0];
  const t3 = Date.now(); mgReviewPass('7 × 8'); const r3 = log()[0];
  const ladder = { rev1: r1.rev, due1: near(r1.due, t1 + 86400000), rev2: r2.rev, due2: near(r2.due, t2 + 3 * 86400000),
    rev3: r3.rev, due3: near(r3.due, t3 + 7 * 86400000) };
  mgReviewPass('7 × 8'); const graduated = log().length === 0;
  mgRecordWrong({ currentExpr: '7 × 8', currentAnswer: 56, level: 4 }, 9); const rr = log()[0];
  const reset = { len: log().length, rev: rr.rev, dueNow: Number(rr.due) <= Date.now() + 50 };
  return { ladder, graduated, reset, errs: window.__errs || [] };
})()`);
P(c.ladder.rev1 === 1 && c.ladder.due1, '第1次答对 → rev=1、due=+1天', JSON.stringify(c.ladder));
P(c.ladder.rev2 === 2 && c.ladder.due2, '第2次答对 → rev=2、due=+3天', 'rev2=' + c.ladder.rev2);
P(c.ladder.rev3 === 3 && c.ladder.due3, '第3次答对 → rev=3、due=+7天', 'rev3=' + c.ladder.rev3);
P(c.graduated, '第4次答对 → 毕业移除（整条消失）', String(c.graduated));
P(c.reset.len === 1 && c.reset.rev === 0 && c.reset.dueNow, '答错 → rev 归零、立刻到期', JSON.stringify(c.reset));
P(c.errs.length === 0, '无 JS 错误', JSON.stringify(c.errs));
// ======== 5. 菜单侧：红点 + 按钮切换（4 视口，含真机 1000×576）========
const VIEWS = [[414, 736], [768, 1024], [1000, 576], [1280, 800]];
const DOT_PROBE = `(() => {
  const btn = document.getElementById('mistakeBtn');
  const dot = btn.querySelector('.icon-dot');
  return { hasDue: btn.classList.contains('has-due'), count: countDueWrong(),
    dotShown: getComputedStyle(dot).display !== 'none',
    nBtns: document.querySelector('.topbar-actions').querySelectorAll('.icon-btn').length };
})()`;
const MODAL_PROBE = `(() => {
  const r = document.getElementById('mistakeRetry');
  const modal = document.getElementById('mistakeModal');
  const card = modal.querySelector('.locked-modal-card');
  const cr = card.getBoundingClientRect();
  const u = r.querySelector('use');
  let styleTxt = [...document.querySelectorAll('style')].map(s => s.textContent).join('\\n').replace(/\\/\\*[\\s\\S]*?\\*\\//g, '');
  const banned = styleTxt.match(/paint-order|:has\\(|@layer|color-mix\\(|oklch\\(|\\d(dvh|svh|lvh)/g);
  const dangling = [...document.querySelectorAll('use')].map(x => x.getAttribute('href')).filter(h => h && !document.querySelector(h));
  return { text: r.textContent.trim(), isStartReview: r.onclick === window.startReview,
    iconOk: !!(u && document.querySelector(u.getAttribute('href'))),
    cardScrolls: card.scrollHeight > card.clientHeight + 1,
    inView: cr.top >= -0.5 && cr.bottom <= innerHeight + 0.5,
    gapTop: Math.round(cr.top), gapBottom: Math.round(innerHeight - cr.bottom),
    banned, dangling, nBtns: document.querySelector('.topbar-actions').querySelectorAll('.icon-btn').length }; })()`;

for (const [w, h] of VIEWS) {
  console.log('\n######## 5. 菜单红点+按钮 @ ' + w + 'x' + h + ' ########');
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: MENU }); await sleep(500);
  await ev(`localStorage.setItem('mathgameWrongLog', ${JSON.stringify(MIXED)});`);
  await send('Page.reload'); await sleep(800);
  const d = await ev(DOT_PROBE);
  P(d.hasDue && d.count === 2, '2 条到期 → 红点亮（has-due）', 'hasDue=' + d.hasDue + ' count=' + d.count);
  P(d.dotShown, '红点可见（display≠none）', String(d.dotShown));
  P(d.nBtns === 4, '顶栏仍 4 钮（没打坏第 1 步）', 'nBtns=' + d.nBtns);
  await ev(`showMistakes();`); await sleep(300);
  const mm = await ev(MODAL_PROBE);
  P(/复习到期（2）/.test(mm.text), '按钮文案 =「复习到期（2）」', JSON.stringify(mm.text));
  P(mm.isStartReview, '按钮 handler = startReview', String(mm.isStartReview));
  P(mm.iconOk, '按钮图标仍可解析');
  P(!mm.cardScrolls && mm.inView && mm.gapTop >= 6 && mm.gapBottom >= 6,
    '弹窗卡片不滚动、在视口内上下留白≥6', `scroll=${mm.cardScrolls} top=${mm.gapTop} bottom=${mm.gapBottom}`);
  P(mm.banned === null, '无 Chrome-91 禁词', JSON.stringify(mm.banned));
  P(mm.dangling.length === 0, '全 <use> 可解析', JSON.stringify(mm.dangling));
  P(mm.nBtns === 4, '顶栏仍 4 钮（弹窗开着时）', 'nBtns=' + mm.nBtns);
}

// ======== 6. 无到期 / 空错题本 → 回退「重练这些题」/收起 ========
console.log('\n######## 6. 无到期 → 重练这些题；空 → 收起 ########');
await send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 576, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: MENU }); await sleep(500);
await ev(`localStorage.setItem('mathgameWrongLog', ${JSON.stringify(FUTURE_ONLY)});`);
await send('Page.reload'); await sleep(800);
const d2 = await ev(DOT_PROBE);
P(!d2.hasDue && d2.count === 0, '全未到期 → 红点不亮', 'hasDue=' + d2.hasDue + ' count=' + d2.count);
await ev(`showMistakes();`); await sleep(250);
const m2 = await ev(`(() => { const r = document.getElementById('mistakeRetry');
  return { text: r.textContent.trim(), isRetry: r.onclick === window.retryWrong, disp: getComputedStyle(r).display }; })()`);
P(m2.disp !== 'none' && /重练这些题/.test(m2.text), '无到期 → 按钮回「重练这些题」', JSON.stringify(m2.text));
P(m2.isRetry, '无到期 → handler = retryWrong', String(m2.isRetry));

await ev(`localStorage.removeItem('mathgameWrongLog');`);
await send('Page.reload'); await sleep(800);
const d3 = await ev(DOT_PROBE);
await ev(`showMistakes();`); await sleep(250);
const m3 = await ev(`(() => ({ disp: getComputedStyle(document.getElementById('mistakeRetry')).display }))()`);
P(!d3.hasDue && m3.disp === 'none', '空错题本 → 红点灭 + 按钮收起', 'hasDue=' + d3.hasDue + ' disp=' + m3.disp);

await ev(`localStorage.removeItem('mathgameWrongLog');localStorage.removeItem('mathgameCoins');
  sessionStorage.removeItem('mgPractice');sessionStorage.removeItem('mgReview');sessionStorage.removeItem('mgPracticeOps');`);

console.log('\n' + (fail === 0 ? '===== REVIEW PASS =====' : '===== ' + fail + ' FAIL ====='));
ws.close(); process.exit(fail ? 1 : 0);
