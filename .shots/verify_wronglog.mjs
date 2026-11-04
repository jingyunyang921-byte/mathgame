// Writer-side verify: mgRecordWrong() in index.html (the game page). 错题本 的「写」从没被测过，
// 菜单那边的「读」在 verify_mistakes.mjs。只调函数本身，不驱动真实答题。
// Needs: headless Chrome --remote-debugging-port=9333 + http.server :8000 in e:/mathgame/mathgame.
const BROWSER = 'http://localhost:9333';
const URL = 'http://localhost:8000/index.html';

const ver = await (await fetch(BROWSER + '/json/version')).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let _id = 0; const pending = new Map(); const waiters = [];
ws.onmessage = e => { const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  else if (m.method) { for (let i = waiters.length - 1; i >= 0; i--) if (waiters[i].pred(m)) waiters.splice(i, 1)[0].res(m); } };
const send = (method, params, sessionId) => { const id = ++_id; const msg = { id, method, params: params || {} }; if (sessionId) msg.sessionId = sessionId;
  return new Promise((res, rej) => { pending.set(id, m => m.error ? rej(new Error(method + ':' + JSON.stringify(m.error))) : res(m.result)); ws.send(JSON.stringify(msg)); }); };
const waitEvent = (pred, ms = 15000) => new Promise((res, rej) => { const w = { pred, res }; waiters.push(w); setTimeout(() => { const i = waiters.indexOf(w); if (i >= 0) { waiters.splice(i, 1); rej(new Error('timeout')); } }, ms); });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);
await send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 615, deviceScaleFactor: 1, mobile: false }, sessionId);
const nav = waitEvent(m => m.method === 'Page.loadEventFired' && m.sessionId === sessionId);
await send('Page.navigate', { url: URL }, sessionId);
await nav;
await send('Runtime.evaluate', { expression: `sessionStorage.setItem('gameLevel','1');sessionStorage.setItem('gameMode','normal');window.__err=null;addEventListener('error',e=>window.__err=String(e.message));`, returnByValue: true }, sessionId);
await send('Page.reload', {}, sessionId);
await sleep(4000);

const PROBE = `(() => {
  const KEY = 'mathgameWrongLog';
  const raw = () => localStorage.getItem(KEY);
  const log = () => { try { const a = JSON.parse(raw() || '[]'); return Array.isArray(a) ? a : null; } catch (e) { return 'BADJSON'; } };
  const wipe = () => localStorage.removeItem(KEY);
  const eng = (expr, ans, lv) => ({ currentExpr: expr, currentAnswer: ans, level: lv });
  const out = { fnType: typeof mgRecordWrong, err: window.__err || null };

  // 1) 守卫：g 为空 / 没有算式（构造器初值 ''）都不该落盘
  wipe();
  mgRecordWrong(null, 3); mgRecordWrong(undefined, 3);
  mgRecordWrong({ currentExpr: '', currentAnswer: 0, level: 1 }, 3);
  out.guardNoWrite = raw() === null;

  // 2) 首条记录的形状
  wipe();
  mgRecordWrong(eng('7 × 8', 56, 3), 9);
  const r0 = log()[0];
  // 三期(P1-复习)起每行还多存 rev/due（遗忘曲线调度：刚答错 → rev:0 + due 立刻到期）。
  out.shape = { q: r0.q, a: r0.a, u: r0.u, lv: r0.lv, n: r0.n, tFresh: Math.abs(Date.now() - r0.t) < 5000,
    rev: r0.rev, dueFresh: Math.abs(Date.now() - Number(r0.due)) < 5000, keys: Object.keys(r0).sort().join(',') };
  // 二期(P2-a)起每行还多存一份结构化三元组 op/a2/b2 —— 重练局就靠它重算题目，不依赖算式字符串。
  // 这个假引擎没有 currentCand，走的是 mgParseExpr 兜底那条路（= 改动之前写进去的老数据那条路）。
  out.triple = { op: r0.op, a2: r0.a2, b2: r0.b2 };
  // 算式解析不出来时只能少那三个字段，但这一行本身必须照样落盘（否则错题直接丢了）
  wipe();
  mgRecordWrong(eng('???', 1, 1), 2);
  const rb = log()[0];
  out.unparsed = { len: log().length, q: rb && rb.q, hasOp: !!(rb && rb.op), keys: rb ? Object.keys(rb).sort().join(',') : '' };

  // 3) userAns 非有限数 → u:null（视算没认出数字 / 听算没解析出来）
  wipe();
  mgRecordWrong(eng('6 × 6', 36, 1), null);
  mgRecordWrong(eng('5 × 5', 25, 1), undefined);
  mgRecordWrong(eng('4 × 4', 16, 1), NaN);
  mgRecordWrong(eng('3 × 3', 9, 1), '7');
  out.nullU = log().map(r => r.u);

  // 4) 同一道题再错：移到第一行 + n++，长度不变（表里永远 10 道不同的题）
  wipe();
  mgRecordWrong(eng('9 × 9', 81, 5), 72);
  mgRecordWrong(eng('2 × 2', 4, 1), 5);
  mgRecordWrong(eng('9 × 9', 81, 5), 18);
  const d = log();
  out.dedupe = { len: d.length, firstQ: d[0].q, firstN: d[0].n, firstU: d[0].u, secondQ: d[1].q, secondN: d[1].n };
  mgRecordWrong(eng('9 × 9', 81, 5), 9);
  out.dedupeN3 = log()[0].n;

  // 5) 封顶 10 条，最新在前，最老被挤掉
  wipe();
  for (let i = 1; i <= 13; i++) mgRecordWrong(eng(i + ' × 2', i * 2, 1), 0);
  const c = log();
  out.cap = { len: c.length, newestQ: c[0].q, oldestQ: c[c.length - 1].q, hasDropped: !c.some(r => r.q === '1 × 2') };

  // 6) 坏数据兜底：非 JSON / 不是数组，都当空表重开，不抛
  let threw = null;
  try {
    localStorage.setItem(KEY, '{not json');
    mgRecordWrong(eng('8 × 7', 56, 3), 54);
    const a1 = log();
    localStorage.setItem(KEY, JSON.stringify({ a: 1 }));
    mgRecordWrong(eng('8 × 7', 56, 3), 54);
    const a2 = log();
    out.dirty = { afterBadJson: a1 && a1.length, afterNonArray: a2 && a2.length };
  } catch (e) { threw = String(e); }
  out.threw = threw;

  // 7) level 缺失 → lv:0（菜单端会跳过关卡名，不会渲染 undefined）
  wipe();
  mgRecordWrong({ currentExpr: '1 + 1', currentAnswer: 2 }, 3);
  out.lvFallback = log()[0].lv;

  // 8) 菜单端 getWrongLog 的过滤规则（无 q 的行会被丢）对写入的行不生效 —— 每行都带 q
  wipe();
  mgRecordWrong(eng('54 ÷ 9', 6, 4), 7);
  out.allRowsHaveQ = log().every(r => r && typeof r.q === 'string' && r.q.length > 0);
  wipe();
  return out;
})()`;

const { result } = await send('Runtime.evaluate', { expression: PROBE, returnByValue: true }, sessionId);
const r = result.value;
let fail = 0;
const P = (ok, label, extra) => { console.log((ok ? 'PASS ' : 'FAIL ') + label + (extra != null ? '  ' + extra : '')); if (!ok) fail++; };
console.log(JSON.stringify(r, null, 2));
console.log('\n===== VERDICTS =====');
P(r.fnType === 'function', 'mgRecordWrong is reachable on the game page', r.fnType);
P(!r.err, 'no page error while loading L1', JSON.stringify(r.err));
P(r.guardNoWrite, 'no record for null engine / empty currentExpr (nothing written at all)');
P(r.shape.keys === 'a,a2,b2,due,lv,n,op,q,rev,t,u', 'record keys = q,a,u,lv,t,n + 三元组 op,a2,b2 + 复习调度 rev,due', r.shape.keys);
P(r.shape.rev === 0 && r.shape.dueFresh, '新错题盖 rev:0 + due 立刻到期（遗忘曲线第 0 级）', 'rev=' + r.shape.rev + ' dueFresh=' + r.shape.dueFresh);
P(r.triple.op === '×' && r.triple.a2 === 7 && r.triple.b2 === 8, '三元组按算式解析存对（重练局不靠字符串）', JSON.stringify(r.triple));
P(r.unparsed.len === 1 && r.unparsed.q === '???' && !r.unparsed.hasOp, '算式解析不出来也照样落盘，只是少三元组', JSON.stringify(r.unparsed));
P(r.shape.q === '7 × 8' && r.shape.a === 56 && r.shape.u === 9 && r.shape.lv === 3 && r.shape.n === 1 && r.shape.tFresh, 'first record carries expr/answer/user/level/n=1/fresh t', JSON.stringify(r.shape));
P(JSON.stringify(r.nullU) === JSON.stringify([null, null, null, null]), 'non-finite userAns stored as null (never 0)', JSON.stringify(r.nullU));
P(r.dedupe.len === 2 && r.dedupe.firstQ === '9 × 9' && r.dedupe.firstN === 2 && r.dedupe.firstU === 18, 're-miss moves the row to the front with n++ and the new wrong answer', JSON.stringify(r.dedupe));
P(r.dedupe.secondQ === '2 × 2' && r.dedupe.secondN === 1, 'the other row keeps its own n', JSON.stringify(r.dedupe));
P(r.dedupeN3 === 3, 'n keeps climbing on the third miss', r.dedupeN3);
P(r.cap.len === 10 && r.cap.newestQ === '13 × 2' && r.cap.oldestQ === '4 × 2' && r.cap.hasDropped, 'capped at 10, newest first, oldest dropped', JSON.stringify(r.cap));
P(!r.threw && r.dirty.afterBadJson === 1 && r.dirty.afterNonArray === 1, 'corrupt / non-array storage is recovered, not thrown', JSON.stringify(r.dirty));
P(r.lvFallback === 0, 'missing level falls back to lv:0', r.lvFallback);
P(r.allRowsHaveQ, 'every written row has a q (survives the menu-side junk filter)');
console.log('\n===== ' + (fail === 0 ? 'ALL PASS' : fail + ' FAILURE(S)') + ' =====');
await send('Target.closeTarget', { targetId });
ws.close();
process.exit(fail === 0 ? 0 : 1);
