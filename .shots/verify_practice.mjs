// 二期 P2-a/P2-c：错题重练 + 「已掌握」消账，本地 Chrome :9333 / 静态服 :8000。
// 这个闸门守三件在代码里看不出来的事：
//   1) 题目真的来自错题本 —— 钩子(mgNextQuestion)接进了 5 个引擎，但只要有一个引擎漏改，
//      练习局就会悄悄发随机题，而孩子根本看不出来「这不是我错过的题」。所以逐题比对算式集合。
//   2) 练习局不污染进度 —— level 传 0，星星/解锁等级必须一动不动。写坏了是不可逆的
//      （没有 git，localStorage 里就是孩子真实的进度）。
//   3) 消账只在练习局发生 —— 普通闯关局答对同一道题不能让错题本变短，否则孩子会觉得
//      错题本自己在乱跳。
// 还验两条边界：补齐的同类变式题不会被误消账（算式不同，精确匹配查不到）；坏数据行整条跳过不崩。
import { mkdirSync, writeFileSync } from 'fs';
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
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });  // 新脚本一律禁缓存
mkdirSync('.shots/out', { recursive: true });
let fail = 0; const P = (ok, l, x) => { console.log((ok ? '  PASS ' : '  FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
const MENU = 'http://localhost:8000/menu.html';
const GAME = 'http://localhost:8000/index.html';
await send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 576, deviceScaleFactor: 1, mobile: false });

// 错题行。前 5 条带 op/a2/b2（改动之后写入的新数据），后 5 条只有算式字符串
// （改动之前就躺在用户机器里的老数据，必须靠 mgParseExpr 回退解析，否则升级即丢）。
const TEN = [
  { q: '7 × 8', a: 56, op: '×', a2: 7, b2: 8 }, { q: '9 × 6', a: 54, op: '×', a2: 9, b2: 6 },
  { q: '45 ÷ 5', a: 9, op: '÷', a2: 45, b2: 5 }, { q: '38 + 47', a: 85, op: '+', a2: 38, b2: 47 },
  { q: '56 − 29', a: 27, op: '−', a2: 56, b2: 29 },
  { q: '63 ÷ 7', a: 9 }, { q: '8 × 7', a: 56 }, { q: '72 ÷ 8', a: 9 },
  { q: '19 + 26', a: 45 }, { q: '84 − 37', a: 47 },
];
const THREE = [{ q: '7 × 8', a: 56, op: '×', a2: 7, b2: 8 }, { q: '9 × 6', a: 54 }, { q: '6 × 4', a: 24 }];
// 智能复习小关加了 due/rev 字段后，错题本按钮会在「有到期题」时切成「复习到期（N）」/startReview。
// 本闸门专守「重练这些题」/retryWrong 路径，所以把种子行 due 全设未来 → countDueWrong()===0，按钮不切。
// （到期题 → 复习路径由 verify_review.mjs 单独守。）
const row = (o, n) => JSON.stringify(Object.assign({ u: null, lv: 4, n: n || 1, t: Date.now(), due: Date.now() + 7 * 86400000 }, o));
const mkLog = (rows, n) => '[' + rows.map(r => row(r, n)).join(',') + ']';

// 进度基线：练习局跑完必须跟它逐字节相同。
const PROGRESS = `JSON.stringify([localStorage.getItem('mathgameStars'),
  localStorage.getItem('mathgameMaxCompletedLevel'), localStorage.getItem('mathgameBest')])`;

// 跑 n 道题：每道记下算式并按「答对」走一遍 mgOnCorrect（消账就挂在它尾部）。
// RUN 从「当前这道」开始；RUN_NEXT 先翻页再答，接在 RUN 后面用。
const PROBE_TAIL = `log: JSON.parse(localStorage.getItem('mathgameWrongLog') || '[]'),
  queueLeft: _mgQueue ? _mgQueue.length : -1, practice: _mgPractice, mastered: _mgMastered,
  genSet: !!_mgPracticeGen, errs: window.__errs || []`;
const RUN = n => `(() => { const g = window._currentGame; const qs = [];
  for (let i = 0; i < ${n}; i++) { qs.push(g.currentExpr); mgOnCorrect(); if (i < ${n} - 1) g.nextQuestion(); }
  return { qs, ${PROBE_TAIL} }; })()`;
const RUN_NEXT = n => `(() => { const g = window._currentGame; const qs = [];
  for (let i = 0; i < ${n}; i++) { g.nextQuestion(); qs.push(g.currentExpr); mgOnCorrect(); }
  return { qs, ${PROBE_TAIL} }; })()`;

async function bootGame(lv, mode) {
  await send('Page.navigate', { url: GAME }); await sleep(400);
  await ev(`sessionStorage.setItem('gameLevel','${lv}');sessionStorage.setItem('gameMode','${mode || 'visual'}');`);
  await send('Page.reload'); await sleep(900);
  await ev(`window.__errs=[];addEventListener('error',e=>window.__errs.push(String(e.message)));`);
  await ev(`window._skipOcrLoading && window._skipOcrLoading();`);
  for (let i = 0; i < 30; i++) { if (await ev(`!!window._currentGame`)) { await sleep(400); return true; } await sleep(400); }
  return false;
}
// 直接灌 sessionStorage.mgPractice 开练习局 —— 菜单那条点击路径在第 2 组已经验过，
// 后面几组只关心游戏页侧的行为，不必每次再绕一趟菜单。
async function bootPractice(rowsJson) {
  await send('Page.navigate', { url: GAME }); await sleep(400);
  await ev(`sessionStorage.setItem('gameLevel','0');sessionStorage.setItem('gameMode','visual');
    sessionStorage.removeItem('mgPracticeOps');
    sessionStorage.setItem('mgPractice', ${JSON.stringify(rowsJson)});`);
  await send('Page.reload'); await sleep(900);
  await ev(`window.__errs=[];addEventListener('error',e=>window.__errs.push(String(e.message)));`);
  await ev(`window._skipOcrLoading && window._skipOcrLoading();`);
  for (let i = 0; i < 30; i++) { if (await ev(`!!window._currentGame`)) { await sleep(400); return true; } await sleep(400); }
  return false;
}
// ======== 1. 菜单入口：有错题才给「重练这些题」 ========
console.log('\n######## 1. 菜单错题本入口 ########');
await send('Page.navigate', { url: MENU }); await sleep(700);
await ev(`localStorage.setItem('mathgameWrongLog', '${mkLog(TEN)}');`);
await send('Page.reload'); await sleep(900);
await ev(`showMistakes();`); await sleep(400);
let m = await ev(`(() => {
  const r = document.getElementById('mistakeRetry'), c = document.getElementById('mistakeClose');
  const card = document.querySelector('#mistakeModal .locked-modal-card');
  const cr = card.getBoundingClientRect(), rr = r.getBoundingClientRect();
  const u = r.querySelector('use');
  return { disp: getComputedStyle(r).display, text: r.textContent.trim(),
    icon: u ? u.getAttribute('href') : null, iconOk: !!(u && document.querySelector(u.getAttribute('href'))),
    iconW: u ? Math.round(u.getBoundingClientRect().width) : -1,
    ghost: c.classList.contains('ghost'), sameRow: Math.abs(rr.top - c.getBoundingClientRect().top) < 2,
    cardScrolls: card.scrollHeight > card.clientHeight + 1,
    gapTop: Math.round(cr.top), gapBottom: Math.round(innerHeight - cr.bottom) }; })()`);
P(m.disp !== 'none' && /重练这些题/.test(m.text), '有错题 → 「重练这些题」可见', m.disp + ' ' + JSON.stringify(m.text));
P(m.icon === '#i-play' && m.iconOk && m.iconW > 0, '按钮图标解析且有尺寸', m.icon + ' w=' + m.iconW);
P(m.ghost, '「好的！」退成 ghost（主行动只有一个）', String(m.ghost));
P(m.sameRow, '两个按钮并排一行（不多占一行高度）', String(m.sameRow));
P(!m.cardScrolls && m.gapTop >= 6 && m.gapBottom >= 6, '卡片仍不滚动、上下留白足够', `scroll=${m.cardScrolls} top=${m.gapTop} bottom=${m.gapBottom}`);
const shot1 = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('.shots/out/practice_entry.png', Buffer.from(shot1.data, 'base64'));

await ev(`localStorage.removeItem('mathgameWrongLog');`);
await send('Page.reload'); await sleep(900);
await ev(`showMistakes();`); await sleep(300);
m = await ev(`(() => { const r = document.getElementById('mistakeRetry'), c = document.getElementById('mistakeClose');
  return { disp: getComputedStyle(r).display, ghost: c.classList.contains('ghost'),
    full: Math.round(c.getBoundingClientRect().width) }; })()`);
P(m.disp === 'none', '没错题 → 按钮整个收掉', m.disp);
P(!m.ghost && m.full > 200, '「好的！」收回主按钮样式独占一行', 'ghost=' + m.ghost + ' w=' + m.full);

// ======== 2. 10 条错题 → 10 道题全部来自错题本 ========
console.log('\n######## 2. 注入 10 条 → 整局都是错题 ########');
await ev(`localStorage.setItem('mathgameWrongLog', '${mkLog(TEN)}');
  localStorage.setItem('mathgameStars', JSON.stringify({"1":3,"2":2,"3":1}));
  localStorage.setItem('mathgameMaxCompletedLevel','3');`);
await send('Page.reload'); await sleep(900);
const before = await ev(PROGRESS);
await ev(`showMistakes();`); await sleep(300);
await ev(`document.getElementById('mistakeRetry').click();`); await sleep(1500);
let st = await ev(`(() => ({ url: location.pathname, lv: sessionStorage.getItem('gameLevel'),
  pract: sessionStorage.getItem('mgPractice'), ops: sessionStorage.getItem('mgPracticeOps') }))()`);
P(/index\.html$/.test(st.url), '点按钮跳到游戏页', st.url);
P(st.lv === '0', 'gameLevel 传 0（练习局）', String(st.lv));
await ev(`window._skipOcrLoading && window._skipOcrLoading();`);
for (let i = 0; i < 30 && !(await ev(`!!window._currentGame`)); i++) await sleep(400);
await sleep(500);
await ev(`window.__errs=[];addEventListener('error',e=>window.__errs.push(String(e.message)));`);
let s = await ev(`(() => ({ gType: window._currentGame.constructor.name, level: window._currentGame.level,
  queue: _mgQueue ? _mgQueue.length : -1, practice: _mgPractice,
  pract: sessionStorage.getItem('mgPractice'), ops: JSON.parse(sessionStorage.getItem('mgPracticeOps')||'null'),
  intro: (document.getElementById('intro-title')||{}).textContent,
  bg: getComputedStyle(document.getElementById('overlay')).getPropertyValue('--ov-bg') }))()`);
P(s.gType === 'Game' && s.level === 0, 'level 0 走默认 Game 引擎', s.gType + ' lv=' + s.level);
P(s.practice === true, '_mgPractice 已置位', String(s.practice));
P(s.pract === null, 'sessionStorage.mgPractice 读完即删', JSON.stringify(s.pract));
P(Array.isArray(s.ops) && s.ops.length === 10, '运算符留给「再来一局」用', JSON.stringify(s.ops));
P(/错题重练/.test(s.intro || ''), '开场卡用 LEVEL_INTROS[0] 而不是掉回关1 文案', JSON.stringify(s.intro));

const r2 = await ev(RUN(10));
const want = TEN.map(t => t.q);
const extra = r2.qs.filter(q => want.indexOf(q) === -1);
P(r2.qs.length === 10 && extra.length === 0, '10 道题全部来自错题本', JSON.stringify(r2.qs));
P(new Set(r2.qs).size === 10, '10 道互不重复（队列按序发完）', String(new Set(r2.qs).size));
P(r2.queueLeft === 0, '队列已排空', String(r2.queueLeft));
P(r2.mastered === 10, '10 道全消账', String(r2.mastered));
P(r2.log.length === 0, '错题本已清空（n 都是 1，减到 0 整条移除）', JSON.stringify(r2.log.map(x => x.q)));
P(r2.errs.length === 0, '无 JS 错误', JSON.stringify(r2.errs));

await ev(`_mgWrong=0;_mgCorrect=10;_mgMaxStreak=10;_mgRoundStart=Date.now()-20000;debugEndGame(true);`);
await sleep(900);
let ov = await ev(`(() => ({ title: document.getElementById('overlay-title').textContent,
  msg: document.getElementById('overlay-msg').textContent,
  next: getComputedStyle(document.getElementById('next-level-btn')).display,
  stars: [...document.getElementById('overlay-stars').children].length,
  prog: ${PROGRESS}, errs: window.__errs || [] }))()`);
P(/练习完成/.test(ov.title), '结算标题是「练习完成！」', JSON.stringify(ov.title));
P(/划掉啦/.test(ov.msg), '真消了账才说「划掉啦」', JSON.stringify(ov.msg));
P(ov.next === 'none', '练习局不给「下一关」（不在闯关主线上）', ov.next);
P(ov.prog === before, '星星/解锁等级/最佳成绩一字未动', ov.prog === before ? 'unchanged' : before + ' → ' + ov.prog);
P(ov.errs.length === 0, '结算无 JS 错误', JSON.stringify(ov.errs));
const shot2 = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('.shots/out/practice_overlay.png', Buffer.from(shot2.data, 'base64'));
// ======== 3. 3 条错题 → 前 3 道原题、后 7 道同类变式题 ========
console.log('\n######## 3. 注入 3 条（全是乘法，n=2）→ 前 3 原题 + 后 7 同 op ########');
await ev(`localStorage.setItem('mathgameWrongLog', '${mkLog(THREE, 2)}');`);
P(await bootPractice(mkLog(THREE, 2)), '练习局已构造');
let r3 = await ev(RUN(3));
P(JSON.stringify(r3.qs) === JSON.stringify(THREE.map(t => t.q)), '前 3 道就是那 3 道错题（按序）', JSON.stringify(r3.qs));
P(r3.queueLeft === 0 && r3.genSet, '队列发完、补齐生成器已就位', 'left=' + r3.queueLeft + ' gen=' + r3.genSet);
P(r3.mastered === 3, '3 道各消账一次', String(r3.mastered));
// n=2 的行答对一次只该 n--，不该整条消失 —— 「错过 2 次」的题练一遍就当掌握，对孩子是放水。
P(r3.log.length === 3 && r3.log.every(x => Number(x.n) === 1), 'n=2 的行降到 1 而不是被移除',
  JSON.stringify(r3.log.map(x => x.q + ':' + x.n)));
const r3b = await ev(RUN_NEXT(7));
const parse3 = r3b.qs.map(q => q.split(/\s+/));
// 「同类」要同到难度量级，不只是同运算符：错题行 lv=4（表内乘除），所以变式题必须也落在
// 表内（两个数都 ≤9）。第一版只按 op 挑基件，于是「错了 7 × 8」推出来的是「43 × 2」——
// 运算符对上了，练的却是两位数乘法，是另一种技能。
P(r3b.qs.length === 7 && parse3.every(p => p[1] === '×'), '后 7 道全是乘法', JSON.stringify(r3b.qs));
P(parse3.every(p => +p[0] <= 9 && +p[2] <= 9), '后 7 道都落在表内（跟错题同一个难度量级）', JSON.stringify(r3b.qs));
// pickFresh 保证的是「最近 8 道内不重复」，不是「10 道全不同」—— 后者在 81 种表内乘法里
// 大约 2.5% 的局会自然撞上，写成全不同这条断言就是随机失败的。按真实口径验窗口。
const all3 = r3.qs.concat(r3b.qs);
const win3 = all3.every((q, i) => all3.slice(Math.max(0, i - 8), i).indexOf(q) === -1);
P(win3, '任意 8 道窗口内无重复（pickFresh 口径没被绕过）', JSON.stringify(all3));
// 变式题偶尔会正好撞上一道错题（都是表内乘法），撞上就该消账 —— 所以期望值按实际命中数算，
// 写死成 0 这条断言就是随机失败的。
const hit3 = r3b.qs.filter(q => THREE.some(t => t.q === q)).length;
P(r3b.mastered === 3 + hit3, '消账次数 = 命中错题的题数', r3b.mastered + ' (hit=' + hit3 + ')');
P(r3b.errs.length === 0, '无 JS 错误', JSON.stringify(r3b.errs));

// ======== 4. 「再来一局」：只剩运算符，整局变式题，且一道都不消账 ========
console.log('\n######## 4. 再来一局（原题已练完，只留 ops）########');
await ev(`localStorage.setItem('mathgameWrongLog', '${mkLog(THREE, 1)}');`);
P(await bootGame(0), '练习局已构造（无 mgPractice，只有 mgPracticeOps）');
const r4 = await ev(RUN(10));
const parse4 = r4.qs.map(q => q.split(/\s+/));
P(r4.queueLeft === -1 || r4.queueLeft === 0, '没有原题队列', String(r4.queueLeft));
P(r4.genSet && r4.practice === false, '有变式生成器但不是消账局', 'gen=' + r4.genSet + ' practice=' + r4.practice);
P(r4.qs.length === 10 && parse4.every(p => p[1] === '×' && +p[0] <= 9 && +p[2] <= 9),
  '整局都是表内乘法（题型留存跨 reload 生效）', JSON.stringify(r4.qs));
P(r4.mastered === 0, '一道都不消账（原题早消完了，变式不该再扣）', String(r4.mastered));
P(r4.log.length === 3, '错题本原样不动', JSON.stringify(r4.log.map(x => x.q + ':' + x.n)));
await ev(`_mgWrong=0;_mgCorrect=10;_mgMaxStreak=10;_mgRoundStart=Date.now()-20000;debugEndGame(true);`);
await sleep(900);
const ov4 = await ev(`(() => ({ title: document.getElementById('overlay-title').textContent,
  msg: document.getElementById('overlay-msg').textContent, errs: window.__errs || [] }))()`);
P(/练习完成/.test(ov4.title), '仍是练习局标题', JSON.stringify(ov4.title));
P(!/划掉啦/.test(ov4.msg) && /熟/.test(ov4.msg), '没消账就不说「划掉啦」（空口一次孩子就不信结算卡了）', JSON.stringify(ov4.msg));
P(ov4.errs.length === 0, '无 JS 错误', JSON.stringify(ov4.errs));
// ======== 5. 普通闯关局：出题不被劫持、答对不消账、ops 残留被清掉 ========
console.log('\n######## 5. 普通闯关局（L4）不受影响 ########');
await ev(`localStorage.setItem('mathgameWrongLog', '${mkLog(THREE, 2)}');`);
P(await bootGame(4), 'L4 已构造');
const r5 = await ev(RUN(10));
P(await ev(`window._currentGame.constructor.name`) === 'RaceGame', 'L4 还是 RaceGame');
P(r5.practice === false && r5.queueLeft === -1 && r5.genSet === false,
  '练习三件套全是空的（出题器没被劫持）', `practice=${r5.practice} queue=${r5.queueLeft} gen=${r5.genSet}`);
const ss5 = await ev(`JSON.stringify([sessionStorage.getItem('mgPractice'), sessionStorage.getItem('mgPracticeOps')])`);
P(ss5 === '[null,null]', '非 0 关进来就把练习 key 清掉（否则 ops 残留会顶掉本关生成器）', ss5);
// 表内乘除会抽到 7×8 这种题，正好撞上错题是常事；撞上也绝不能消账 —— 判据是 _mgPractice，
// 不是「这道题在不在错题本里」。所以这条断言跟题目内容无关，是确定的。
P(r5.mastered === 0, '闯关局答对同一道题也不消账', String(r5.mastered));
P(r5.log.length === 3 && r5.log.every(x => Number(x.n) === 2), '错题本 n 一动不动', JSON.stringify(r5.log.map(x => x.q + ':' + x.n)));
P(r5.errs.length === 0, '无 JS 错误', JSON.stringify(r5.errs));

// ======== 6. 坏数据：整行跳过，不崩，也不出一道答案错的题 ========
console.log('\n######## 6. 坏错题行兜底 ########');
const BAD = '[' + [
  row({ q: '1 ? 2', a: 3 }),                       // 运算符不在白名单
  row({ q: '99 + 99', a: 198 }),                   // 答案越过 99 红线
  row({ q: 'bad' }),                               // 根本不是算式
  row({ q: '7 ÷ 0', a: 0, op: '÷', a2: 7, b2: 0 }),// 除零
  row({ q: '5 − 9', a: -4 }),                      // 负数
  row({ q: '7 × 8', a: 56, op: '×', a2: 7, b2: 8 }),// 唯一一条好的
].join(',') + ']';
await ev(`localStorage.setItem('mathgameWrongLog', '${mkLog(THREE, 1)}');`);
P(await bootPractice(BAD), '练习局已构造（6 条里只有 1 条能出题）');
const r6 = await ev(`(() => ({ queue: _mgQueue ? _mgQueue.map(c => c.key) : null, practice: _mgPractice,
  first: window._currentGame.currentExpr, ans: window._currentGame.currentAnswer, errs: window.__errs || [] }))()`);
P(r6.practice === true && r6.first === '7 × 8' && r6.ans === 56,
  '只发那条合法的，答案按 a/b/op 重算', r6.first + ' = ' + r6.ans);
P(Array.isArray(r6.queue) && r6.queue.length === 0, '5 条坏行整条跳过（不猜、不硬凑）', JSON.stringify(r6.queue));
P(r6.errs.length === 0, '坏数据不抛错', JSON.stringify(r6.errs));

// 全是坏行时退化成普通随机局，而不是空局/死局
P(await bootPractice('[{"q":"bad"},{"q":"1 ? 2"}]'), '全坏行也能开局');
const r6b = await ev(`(() => ({ practice: _mgPractice, queue: _mgQueue, gen: !!_mgPracticeGen,
  first: window._currentGame.currentExpr, errs: window.__errs || [] }))()`);
P(r6b.practice === false && r6b.queue === null && r6b.gen === false, '退化成普通随机局', JSON.stringify(r6b));
P(/[+\-−×÷]/.test(r6b.first || ''), '照常出了一道题（不是空局）', JSON.stringify(r6b.first));
P(r6b.errs.length === 0, '无 JS 错误', JSON.stringify(r6b.errs));

await ev(`localStorage.removeItem('mathgameWrongLog');localStorage.removeItem('mathgameStars');
  localStorage.removeItem('mathgameMaxCompletedLevel');localStorage.removeItem('mathgameBest');
  sessionStorage.removeItem('mgPractice');sessionStorage.removeItem('mgPracticeOps');`);

console.log('\n' + (fail === 0 ? '=== PRACTICE PASS ===' : '=== ' + fail + ' FAIL ==='));
ws.close(); process.exit(fail ? 1 : 0);
