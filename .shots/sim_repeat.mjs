// 本地模拟出题：校验折中版四则运算约束（无负数 / 整除 / 答案≤各关上限）+ 重复率（pickFresh 按算式避最近K道）。
// 只复刻出题数学，不碰 DOM。与 index.html 的 mgGen* 完全一致（sim 用 ans 字段）。
// 梯度：L1 10加减 / L2 20加减 / L3 100加减 / L4 表内乘除 / L5 两位乘除 / L6 四则混合。
//
// 这份是**手抄本**，不是从 index.html 抽出来的。所以它只配守「数值约束」和「重复率」这两件
// 跟抄写同步与否无关的事，不要往里加分布断言 —— P2-b 的薄弱点加权改的是「出哪个运算」的概率，
// 在抄本上量这个，验的是抄本自己跟自己一致，产品真改歪了照样全绿。那条闸门在浏览器里：
// `.shots/verify_weak.mjs` 调真的 mgPickOp / mgWeakWeights。
// 这里故意保持等概率：加权只改分支频率、不改分支输出，而 15% 的下限保证两边都采得到样，
// 所以下面这套约束在加权之后依然成立（verify_weak 里也按关卡各验了一遍同样的约束）。
const R = () => Math.random();
const rint = (n) => Math.floor(R()*n);       // 0..n-1
const mgRand = (lo, hi) => Math.floor(R()*(hi-lo+1))+lo;  // lo..hi

function pickFresh(recent, keep, makeCand) {
  let cand, tries = 0;
  do { cand = makeCand(); tries++; } while (recent.indexOf(cand.key) !== -1 && tries < 40);
  recent.push(cand.key);
  while (recent.length > keep) recent.shift();
  return cand;
}

// ---- 基件（与 index.html 完全一致）----
function mgGenAdd() {
  let a, b; const t = R();
  if (t < 0.2) { a = mgRand(1, 9); b = mgRand(1, 9); }
  else if (t < 0.55) { a = mgRand(10, 89); b = mgRand(1, Math.min(9, 99 - a)); }
  else { a = mgRand(10, 89); b = mgRand(10, 99 - a); }
  if (R() < 0.5) { const s = a; a = b; b = s; }
  return { a, b, op: '+', ans: a + b, key: a + '+' + b };
}
function mgGenSub() {
  let a, b;
  if (R() < 0.45) { a = mgRand(11, 99); b = mgRand(1, 9); }
  else { a = mgRand(20, 99); b = mgRand(10, a); }
  if (b > a) { const s = a; a = b; b = s; }
  return { a, b, op: '−', ans: a - b, key: a + '−' + b };
}
function mgGenMul() {
  if (R() < 0.5) { const a = mgRand(1, 9), b = mgRand(1, 9); return { a, b, op: '×', ans: a * b, key: a + '×' + b }; }
  const b = mgRand(2, 9), a = mgRand(10, Math.floor(99 / b));
  return R() < 0.5 ? { a: b, b: a, op: '×', ans: a * b, key: b + '×' + a } : { a, b, op: '×', ans: a * b, key: a + '×' + b };
}
function mgGenDiv() {
  const b = mgRand(2, 9), q = mgRand(2, Math.floor(99 / b)), a = b * q;
  return { a, b, op: '÷', ans: q, key: a + '÷' + b };
}

// ---- 关卡出题器（与 index.html 一致：各关题库互斥，L1/L2/L5 枚举题库均匀抽，L6 = L3 ∪ L5）----
const pools = { add1: [], sub1: [], add2: [], sub2: [], mul5: [], div5: [] };
{
  const mk = (a, b, op, ans) => ({ a, b, op, ans, key: a + op + b });
  for (let a = 1; a <= 19; a++) for (let b = 1; a + b <= 20; b++) (a + b <= 10 ? pools.add1 : pools.add2).push(mk(a, b, '+', a + b));
  for (let a = 2; a <= 20; a++) for (let b = 1; b <= a; b++) (a <= 10 ? pools.sub1 : pools.sub2).push(mk(a, b, '−', a - b));
  for (let b = 2; b <= 9; b++) for (let a = 10; a * b <= 99; a++) { pools.mul5.push(mk(a, b, '×', a * b)); pools.mul5.push(mk(b, a, '×', a * b)); }
  for (let b = 2; b <= 9; b++) for (let q = 10; q * b <= 99; q++) pools.div5.push(mk(q * b, b, '÷', q));
}
const pickOf = (arr) => Object.assign({}, arr[rint(arr.length)]);
function mgGenBig(op) {
  if (op === '×') return pickOf(pools.mul5);
  if (op === '÷') return pickOf(pools.div5);
  const gen = op === '+' ? mgGenAdd : mgGenSub; let c;
  do { c = gen(); } while ((op === '+' ? c.ans : c.a) <= 20);
  return c;
}
function mgGenAddSub10() { return pickOf(R() < 0.5 ? pools.add1 : pools.sub1); }     // L1
function mgGenAddSub20() { return pickOf(R() < 0.5 ? pools.add2 : pools.sub2); }     // L2
function mgGenAddSub100() { return mgGenBig(R() < 0.5 ? '+' : '−'); }                // L3
function mgGenMulDivTable() {    // L4
  if (R() < 0.5) { const a = mgRand(1, 9), b = mgRand(1, 9); return { a, b, op: '×', ans: a * b, key: a + '×' + b }; }
  const b = mgRand(2, 9), q = mgRand(2, 9), a = b * q;
  return { a, b, op: '÷', ans: q, key: a + '÷' + b };
}
function mgGenMulDiv99() { return mgGenBig(R() < 0.5 ? '×' : '÷'); }                // L5
function mgGenMixed() { return mgGenBig(['+', '−', '×', '÷'][rint(4)]); }            // L6

const gens = { L1: mgGenAddSub10, L2: mgGenAddSub20, L3: mgGenAddSub100, L4: mgGenMulDivTable, L5: mgGenMulDiv99, L6: mgGenMixed };

// ---- 正确性校验：大样本断言约束 ----
function validate(name, gen, max, n, allowedOps) {
  let maxAns = 0; const ops = new Set();
  for (let i = 0; i < n; i++) {
    const c = gen(); ops.add(c.op);
    if (!Number.isInteger(c.ans)) throw new Error(`${name}: 非整数 ${c.key}`);
    if (c.ans < 0) throw new Error(`${name}: 负数 ${c.key}=${c.ans}`);
    if (c.ans > max) throw new Error(`${name}: 答案>${max} ${c.key}=${c.ans}`);
    if (c.op === '÷' && (c.a % c.b !== 0 || c.a / c.b !== c.ans)) throw new Error(`${name}: 非整除 ${c.key}`);
    if (allowedOps && !allowedOps.includes(c.op)) throw new Error(`${name}: 运算越界 ${c.key}`);
    if (c.a > max || c.b > max) throw new Error(`${name}: 操作数>${max} ${c.key}`);
    maxAns = Math.max(maxAns, c.ans);
  }
  console.log(`✓ ${name} 校验通过（${n} 样本，最大答案 ${maxAns}，ops=${[...ops].join('')}）`);
}
console.log('=== 约束校验 ===');
validate('L1 10加减', mgGenAddSub10, 10, 300000, ['+', '−']);
validate('L2 20加减', mgGenAddSub20, 20, 300000, ['+', '−']);
validate('L3 100加减', mgGenAddSub100, 99, 300000, ['+', '−']);
validate('L4 表内乘除', mgGenMulDivTable, 81, 300000);
validate('L5 两位乘除', mgGenMulDiv99, 99, 300000);
validate('L6 四则混合', mgGenMixed, 99, 300000);

// ---- 重复率 ----
function runNew(gen, keep, N) {
  const recent = []; const seq = []; for (let i = 0; i < N; i++) seq.push(pickFresh(recent, keep, gen));
  return stats(seq);
}
function stats(seq) {
  let immediate = 0, windowDup = 0; const W = 8;
  for (let i = 1; i < seq.length; i++) {
    if (seq[i].key === seq[i-1].key) immediate++;
    for (let j = Math.max(0, i-W); j < i; j++) if (seq[j].key === seq[i].key) { windowDup++; break; }
  }
  return { distinct: new Set(seq.map(s => s.key)).size, immediate, windowDup };
}

const N = 40, ROUNDS = 400;
const cases = [
  ['L1 10加减',   'L1', 8],
  ['L2 20加减',   'L2', 8],
  ['L3 100加减',  'L3', 10],
  ['L4 表内乘除', 'L4', 8],
  ['L5 两位乘除', 'L5', 12],
  ['L6 四则混合', 'L6', 12],
];
console.log(`\n=== 重复率：每关连续 ${N} 道 × ${ROUNDS} 轮平均 ===`);
console.log('关卡'.padEnd(18), '| 即重复  窗口内重复  不同题');
for (const [name, g, keep] of cases) {
  let n = { immediate: 0, windowDup: 0, distinct: 0 };
  for (let r = 0; r < ROUNDS; r++) { const sn = runNew(gens[g], keep, N); n.immediate += sn.immediate; n.windowDup += sn.windowDup; n.distinct += sn.distinct; }
  const f = x => (x/ROUNDS).toFixed(1);
  console.log(name.padEnd(16), '|  ', f(n.immediate).padStart(4), '   ', f(n.windowDup).padStart(5), '   ', f(n.distinct).padStart(5));
}
