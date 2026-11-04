// 二期 P2-b：薄弱点加权出题，本地 Chrome :9333 / 静态服 :8000。
// 为什么不按计划书「扩展 sim_repeat.mjs」：那个文件是把出题数学手抄了一份（字段都还叫 ans 不叫
// answer），在抄本上断言分布，验的是抄本自己跟自己一致 —— 产品真改歪了它照样全绿，是个假闸门。
// 所以这条闸门必须在浏览器里调真的 mgGen* / mgPickOp / mgWeakWeights。
// 守三件事：
//   1) 错题本为空（新装的机器）时退化成等概率 —— 「首次体验不变」是这一期的硬要求；
//   2) 有错题时偏向错得多的运算，但占比永远落在 [15%,70%]（一边倒会把练习变成偏科）；
//   3) 加权只改「出哪个运算」，各关的数值约束（不出负 / 恒整除 / 答案≤99 / 不越量级）一条都不许破。
// 两条边界：错的运算不在本关候选里（表内乘除关却只错加法）要退回等概率；错题本坏值不崩。
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
const GAME = 'http://localhost:8000/index.html';

// 20000 次采样：p≈0.7 时标准误 0.0032，所以 ±0.02 的容差是 6σ 开外，不会随机失败。
const N = 20000, TOL = 0.02;
// 各关的量级上限（操作数不许越过）：L1 10以内、L2 20以内、L4 表内(积≤81)、其余 100以内。
const GENS = [
  ['mgGenAddSub10', 'L1 10以内加减', ['+', '−'], 10],
  ['mgGenAddSub20', 'L2 20以内加减', ['+', '−'], 20],
  ['mgGenAddSub100', 'L3 100以内加减', ['+', '−'], 99],
  ['mgGenMulDivTable', 'L4 表内乘除', ['×', '÷'], 81],
  ['mgGenMulDiv99', 'L5 两位数乘除', ['×', '÷'], 99],
  ['mgGenMixed', 'L6 四则混合', ['+', '−', '×', '÷'], 99],
];
// 一次 evaluate 在页内跑完 N 道，不来回 20000 趟 CDP。顺手把数值约束一并验了 ——
// 这里调的是产品真代码，所以这几条断言比 sim_repeat 里那份抄本更有资格叫闸门。
const MEASURE = (gen, lim) => `(() => {
  const c = { '+': 0, '−': 0, '×': 0, '÷': 0 }; const bad = [];
  for (let i = 0; i < ${N}; i++) {
    const q = ${gen}();
    if (c[q.op] === undefined) { bad.push('怪运算 ' + q.op); break; }
    c[q.op]++;
    if (!Number.isFinite(q.answer) || q.answer < 0 || q.answer > 99 || q.answer % 1 !== 0) bad.push('答案越线 ' + q.key + '=' + q.answer);
    else if (q.a > ${lim} || q.b > ${lim}) bad.push('越量级 ' + q.key);
    else if (q.op === '÷' && (q.b === 0 || q.a % q.b !== 0)) bad.push('除不尽 ' + q.key);
    else if (q.op === '−' && q.a < q.b) bad.push('负数 ' + q.key);
    if (bad.length > 3) break;
  }
  const out = {}; for (const k in c) if (c[k]) out[k] = +(c[k] / ${N}).toFixed(4);
  return { out, bad, errs: window.__errs || [] };
})()`;

const row = (o, n) => JSON.stringify(Object.assign({ u: null, lv: 4, n: n || 1, t: Date.now() }, o));
const mkLog = rows => '[' + rows.map(r => row(r, r.n)).join(',') + ']';
const setLog = raw => ev(`localStorage.setItem('mathgameWrongLog', ${JSON.stringify(raw)});window.__errs=[];`);
const near = (a, b) => Math.abs(a - b) <= TOL;
// 期望值直接按口径算：0.6/k 的底 + 0.4 × 这个运算在错题里的占比。候选运算一道都没错过
// （tot=0）时退回等概率，所以期望就是 1/k。
const expect = (cands, w) => {
  let tot = 0; for (const op of cands) tot += w[op] || 0;
  const base = 0.6 / cands.length, out = {};
  for (const op of cands) out[op] = tot ? base + 0.4 * (w[op] || 0) / tot : 1 / cands.length;
  return out;
};
const fmt = o => Object.keys(o).map(k => k + ':' + (typeof o[k] === 'number' ? o[k].toFixed(3) : o[k])).join(' ');
// 一个场景 = 一份错题本 + 对若干生成器的期望占比。envelope 那条每个场景都验：
// 不管错题本长什么样，单个运算的占比都不许越过 [15%,70%]。
async function scene(title, raw, w, which) {
  console.log('\n######## ' + title + ' ########');
  await setLog(raw);
  for (const [gen, name, cands, lim] of GENS) {
    if (which && which.indexOf(gen) === -1) continue;
    const r = await ev(MEASURE(gen, lim));
    const exp = w === null ? null : expect(cands, w);
    const got = cands.map(op => r.out[op] || 0);
    P(Object.keys(r.out).length === cands.length, name + '：只出本关的运算', fmt(r.out));
    if (exp) P(cands.every(op => near(r.out[op] || 0, exp[op])), name + '：占比落在口径上',
      '实测 ' + fmt(r.out) + ' | 期望 ' + fmt(exp));
    P(got.every(v => v >= 0.15 - TOL && v <= 0.70 + TOL), name + '：没有一边倒（15%~70% 包络）', fmt(r.out));
    P(r.bad.length === 0, name + '：数值约束一条没破', JSON.stringify(r.bad));
    P(r.errs.length === 0, name + '：无 JS 错误', JSON.stringify(r.errs));
  }
}

// gameLevel 给 1（不是 0）：练习局会装上 _mgPracticeGen 顶掉本关生成器，而这条闸门要量的是
// 关卡出题器本身。mgSetupPractice(1) 顺手把上个脚本留下的 mgPractice* key 清掉。
await send('Page.navigate', { url: GAME }); await sleep(400);
await ev(`sessionStorage.setItem('gameLevel','1');sessionStorage.setItem('gameMode','visual');`);
await send('Page.reload'); await sleep(900);
await ev(`window.__errs=[];addEventListener('error',e=>window.__errs.push(String(e.message)));`);
await ev(`window._skipOcrLoading && window._skipOcrLoading();`);
let ready = false;
for (let i = 0; i < 30 && !ready; i++) { ready = await ev(`typeof mgPickOp === 'function' && typeof mgWeakWeights === 'function'`); if (!ready) await sleep(400); }
P(ready, '加权出题函数已就位');
if (!ready) { console.log('\n=== 1 FAIL ==='); ws.close(); process.exit(1); }

await scene('1. 错题本为空 → 等概率（跟加权之前逐字节同效）', '[]', { '+': 0, '−': 0, '×': 0, '÷': 0 });

await scene('2. 只错乘法 → 乘除关乘法顶格，加减关退回等概率',
  mkLog([{ q: '7 × 8', op: '×', n: 3 }, { q: '9 × 6', op: '×', n: 5 }, { q: '6 × 4', op: '×', n: 2 }]),
  { '+': 0, '−': 0, '×': 10, '÷': 0 });

await scene('3. 四种都错、次数 1:2:3:4 → 按比例抬',
  mkLog([{ q: '3 + 4', op: '+', n: 1 }, { q: '9 − 5', op: '−', n: 2 },
    { q: '7 × 8', op: '×', n: 3 }, { q: '45 ÷ 5', op: '÷', n: 4 }]),
  { '+': 1, '−': 2, '×': 3, '÷': 4 });

await scene('4. 老数据只有算式字符串 → 回退解析也照样加权（升级不丢）',
  mkLog([{ q: '7 × 8', a: 56 }, { q: '8 × 7', a: 56 }, { q: '45 ÷ 5', a: 9 }]),
  { '×': 2, '÷': 1 }, ['mgGenMulDivTable', 'mgGenMixed']);

// 一道题错 999 次不该把同关另一种运算挤到看不见 —— 所以每行按 MG_WRONG_MAX 封顶再累加。
await scene('5. 单行 n 封顶 10',
  mkLog([{ q: '7 × 8', op: '×', n: 999 }, { q: '45 ÷ 5', op: '÷', n: 1 }]),
  { '×': 10, '÷': 1 }, ['mgGenMulDivTable']);

// 坏错题本 → 权重全 0 → 等概率。孩子机器上这张表是手写不了的，但升级/回滚后的残留是真的。
// 注意这几行要「连算式都解析不出来」才算全坏：op 字段烂掉但算式能读的行会走回退解析照样计入
// （见下面第 7 组），那是老数据路径在干正事，不是漏网。
for (const [raw, label] of [['null', 'null'], ['{"a":1}', '对象不是数组'], ['not json', '不是 JSON'],
  ['[null,{},{"q":"bad"},{"q":"1 ? 2"},{"q":"7 ? 8","op":"??"}]', '整行坏 / 怪运算符']])
  await scene('6. 坏错题本（' + label + '）→ 退回等概率不崩', raw, { '+': 0, '−': 0, '×': 0, '÷': 0 },
    ['mgGenMulDivTable', 'mgGenMixed']);

// ======== 7. mgWeakWeights 的口径（分布之外单独钉死，省得靠 20000 次采样反推） ========
console.log('\n######## 7. mgWeakWeights 直接口径 ########');
await setLog(mkLog([{ q: '45 ÷ 5', op: '÷', n: 4 }]));
const u = await ev(`(() => {
  const z = w => Object.keys(w).every(k => w[k] === 0);
  return {
    cap: mgWeakWeights([{ q: '7 × 8', op: '×', n: 999 }])['×'],
    noN: mgWeakWeights([{ q: '7 × 8', op: '×' }])['×'],
    badN: mgWeakWeights([{ q: '7 × 8', op: '×', n: 'abc' }])['×'],
    old: mgWeakWeights([{ q: '45 ÷ 5' }])['÷'],
    badOp: mgWeakWeights([{ q: '7 × 8', op: '??' }])['×'],
    zJunk: z(mgWeakWeights('not an array')), zEmpty: z(mgWeakWeights([])),
    zSkip: z(mgWeakWeights([{ q: '1 ? 2' }, {}, null])),
    fromStore: mgWeakWeights()['÷'], keys: Object.keys(mgWeakWeights([])).join(''),
    errs: window.__errs || [] }; })()`);
P(u.cap === 10, '单行 n 按 MG_WRONG_MAX 封顶', String(u.cap));
P(u.noN === 1 && u.badN === 1, 'n 缺失 / 坏值一律当 1（不猜、也不丢这条错题）', u.noN + ' ' + u.badN);
P(u.old === 1, '没有 op 字段时靠 mgParseExpr 回退', String(u.old));
// op 字段烂了但算式还读得出来 → 按算式算，不整行丢。错题本是孩子真实的练习史，能救就救。
P(u.badOp === 1, 'op 字段坏掉也回退到算式（不整行丢）', String(u.badOp));
P(u.zJunk && u.zEmpty && u.zSkip, '非数组 / 空表 / 全坏行一律零权重', `junk=${u.zJunk} empty=${u.zEmpty} skip=${u.zSkip}`);
P(u.fromStore === 4, '不传参时读 mathgameWrongLog（线上那条路）', String(u.fromStore));
P(u.keys === '+−×÷', '四个运算的键恒在（不会因为没错过就缺键）', u.keys);
P(u.errs.length === 0, '无 JS 错误', JSON.stringify(u.errs));

await ev(`localStorage.removeItem('mathgameWrongLog');
  sessionStorage.removeItem('mgPractice');sessionStorage.removeItem('mgPracticeOps');`);

console.log('\n' + (fail === 0 ? '=== WEAK PASS ===' : '=== ' + fail + ' FAIL ==='));
ws.close(); process.exit(fail ? 1 : 0);
