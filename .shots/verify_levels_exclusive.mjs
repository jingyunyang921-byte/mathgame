// 各关题库互斥闸门：L1 ≤10 / L2 11–20 / L3 21–99 / L4 表内乘除 / L5 两位乘除 / L6 = L3 ∪ L5。
// 直接调页面里真的出题器（不是手抄本）；期望题库用独立的暴力枚举算出来，不靠出题器自己的池子。
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
const sample = (n) => `(() => {
  localStorage.removeItem(MG_WRONG_KEY);
  const tier = q => q.op === '+' ? (q.answer <= 10 ? 1 : q.answer <= 20 ? 2 : 3)
    : q.op === '−' ? (q.a <= 10 ? 1 : q.a <= 20 ? 2 : 3)
    : q.op === '×' ? ((q.a <= 9 && q.b <= 9) ? 4 : 5) : ((q.a <= 81 && q.answer <= 9) ? 4 : 5);
  const G = { 1: mgGenAddSub10, 2: mgGenAddSub20, 3: mgGenAddSub100, 4: mgGenMulDivTable, 5: mgGenMulDiv99, 6: mgGenMixed };
  const out = {};
  for (const lv of [1, 2, 3, 4, 5, 6]) {
    const tiers = {}, ops = {}, keys = {}; let bad = null;
    for (let i = 0; i < ${n}; i++) {
      const q = G[lv]();
      tiers[tier(q)] = (tiers[tier(q)] || 0) + 1; ops[q.op] = (ops[q.op] || 0) + 1; keys[q.key] = (keys[q.key] || 0) + 1;
      const ok = q.op === '+' ? q.a + q.b === q.answer : q.op === '−' ? q.a - q.b === q.answer : q.op === '×' ? q.a * q.b === q.answer : q.a / q.b === q.answer && q.a % q.b === 0;
      if (!ok || !(q.answer >= 0 && q.answer <= 99) || q.key !== q.a + q.op + q.b || (q.op === '−' && q.b > q.a) || q.a < 1 || q.b < 1) { bad = bad || JSON.stringify(q); }
    }
    out[lv] = { tiers, ops, keys, bad };
  }
  return out;
})()`;
// 独立暴力枚举：期望每关能出的全部题（L3 太大只验不越界）
const brute = `(() => {
  const L1 = new Set(), L2 = new Set(), L4 = new Set(), L5 = new Set();
  for (let a = 1; a <= 100; a++) for (let b = 1; b <= 100; b++) {
    if (a + b <= 10) L1.add(a + '+' + b); else if (a + b <= 20) L2.add(a + '+' + b);
    if (b <= a && a >= 2 && a <= 10) L1.add(a + '−' + b); else if (b <= a && a > 10 && a <= 20) L2.add(a + '−' + b);
    if (a <= 9 && b <= 9) L4.add(a + '×' + b); else if ((a >= 10 && a <= 99 && b >= 2 && b <= 9 && a * b <= 99) || (b >= 10 && b <= 99 && a >= 2 && a <= 9 && a * b <= 99)) L5.add(a + '×' + b);
    if (b >= 2 && b <= 9 && a % b === 0) { const q = a / b; if (a <= 81 && q >= 2 && q <= 9) L4.add(a + '÷' + b); else if (q >= 10 && a <= 99) L5.add(a + '÷' + b); }
  }
  return { L1: [...L1], L2: [...L2], L4: [...L4], L5: [...L5] };
})()`;
const maxRatio = (keys, filter) => { const v = Object.entries(keys).filter(([k]) => filter(k)).map(([, c]) => c); const m = v.reduce((x, y) => x + y, 0) / v.length; return Math.max(...v) / m; };
try {
  await b.nav(b.menu); await b.preserve();
  await b.boot(1, 'visual'); await b.sleep(500);
  const S = await b.ev(sample(200000)), E = await b.ev(brute);
  const only = (lv, ts) => Object.keys(S[lv].tiers).sort().join() === ts.join();
  P(only(1, ['1']) && only(2, ['2']) && only(3, ['3']) && only(4, ['4']) && only(5, ['5']), '前五关各自只出本档的题（L1≤10 / L2 11–20 / L3 21–99 / L4 表内 / L5 两位乘除）', Object.fromEntries([1, 2, 3, 4, 5].map(l => [l, S[l].tiers])));
  P(only(6, ['3', '5']), 'L6 只出 L3 与 L5 的题（不回放 10/20以内、表内乘除）', S[6].tiers);
  for (let lv = 1; lv <= 6; lv++) P(!S[lv].bad, `L${lv} 算式合法（等式成立/不出负/≤99/操作数≥1/key 正确）`, S[lv].bad);
  const share = (lv, op) => (S[lv].ops[op] || 0) / 200000;
  P(['+', '−', '×', '÷'].every(o => share(6, o) > 0.15 && share(6, o) < 0.36), 'L6 四种运算都出，且各占 15%~36%（空错题本≈25%）', ['+', '−', '×', '÷'].map(o => share(6, o).toFixed(3)));
  P(Math.abs(share(3, '+') - 0.5) < 0.02, 'L3 空错题本时加/减各约一半（重抽没带偏）', share(3, '+').toFixed(3));
  const cmp = (lv, ex) => { const got = Object.keys(S[lv].keys).sort(), want = [...ex].sort(); return got.length === want.length && got.every((k, i) => k === want[i]); };
  P(cmp(1, E.L1) && E.L1.length === 99, `L1 题库 = 暴力枚举的 ${E.L1.length} 种（期望 99），一道不少一道不多`);
  P(cmp(2, E.L2) && E.L2.length === 300, `L2 题库 = 暴力枚举的 ${E.L2.length} 种（期望 300）`);
  P(cmp(4, E.L4) && E.L4.length === 145, `L4 题库 = 暴力枚举的 ${E.L4.length} 种（期望 145）`);
  P(cmp(5, E.L5) && E.L5.length === 318, `L5 题库 = 暴力枚举的 ${E.L5.length} 种（期望 318 = 乘 212 + 除 106）`);
  const k = lv => new Set(Object.keys(S[lv].keys)), ks = [1, 2, 3, 4, 5].map(k);
  let dup = 0; for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) for (const x of ks[i]) if (ks[j].has(x)) dup++;
  P(dup === 0, '前五关两两之间没有一道相同的题（按算式）', dup);
  const k6 = k(6); let out6 = 0; for (const x of k6) if (ks[0].has(x) || ks[1].has(x) || ks[3].has(x)) out6++;
  P(out6 === 0, 'L6 的题没有一道落在 L1/L2/L4 的题库里', out6);
  const r1 = Math.max(maxRatio(S[1].keys, x => x.includes('+')), maxRatio(S[1].keys, x => x.includes('−')));
  const r2 = Math.max(maxRatio(S[2].keys, x => x.includes('+')), maxRatio(S[2].keys, x => x.includes('−')));
  const r5 = Math.max(maxRatio(S[5].keys, x => x.includes('×')), maxRatio(S[5].keys, x => x.includes('÷')));
  P(r1 < 1.3 && r2 < 1.4 && r5 < 1.4, '小题库关抽得均匀：最常见的题不超过同运算平均的 1.3/1.4/1.4 倍（旧版 9+1、10×9 是 2~3 倍）', [r1, r2, r5].map(x => x.toFixed(2)));
  // 薄弱点加权：错题本全是加法 → 加法占 0.6×0.5+0.4=70%；L3(重抽)与 L5(池子)都不能被带偏
  const w = await b.ev(`(() => {
    localStorage.setItem(MG_WRONG_KEY, JSON.stringify([{ op: '+', n: 5, q: '30+25' }, { op: '×', n: 5, q: '12×4' }]));
    const f = (g, op) => { let c = 0; for (let i = 0; i < 60000; i++) if (g().op === op) c++; return c / 60000; };
    const r = { l3: f(mgGenAddSub100, '+'), l5: f(mgGenMulDiv99, '×'), l6: f(mgGenMixed, '+') };
    localStorage.removeItem(MG_WRONG_KEY); return r; })()`);
  P(Math.abs(w.l3 - 0.7) < 0.02 && Math.abs(w.l5 - 0.7) < 0.02 && Math.abs(w.l6 - 0.35) < 0.02, '薄弱点加权照旧生效（L3 加法≈70%、L5 乘法≈70%、L6 加法≈35%（0.6/4+0.4×5/10））', w);
  const sp = await b.ev(`[1, 2, 3].every(l => mgSprintGen(l) === MG_LEVEL_GEN[l])`);
  P(sp, '一分钟速算三档沿用 L1/L2/L3 出题器（2 档只出 11–20，3 档只出 21–99）');
  // 真引擎：逐关取 60 题，按屏幕上的算式再分一次档
  for (const lv of [1, 2, 3, 4, 5, 6]) {
    await b.boot(lv, 'visual'); await b.sleep(500);
    const r = await b.ev(`(() => { const g = window._currentGame; const o = []; for (let i = 0; i < 60; i++) { g.nextQuestion(); o.push(String(g.currentExpr)); } return o; })()`);
    const want = { 1: [1], 2: [2], 3: [3], 4: [4], 5: [5], 6: [3, 5] }[lv];
    const t = e => { const m = e.match(/^(\d+)\s*(\S+)\s*(\d+)$/); if (!m) return -1; const a = +m[1], c = m[2], d = +m[3];
      return c === '+' ? (a + d <= 10 ? 1 : a + d <= 20 ? 2 : 3) : c === '−' ? (a <= 10 ? 1 : a <= 20 ? 2 : 3) : c === '×' ? ((a <= 9 && d <= 9) ? 4 : 5) : ((a <= 81 && a / d <= 9) ? 4 : 5); };
    const bad = r.filter(e => !want.includes(t(e)));
    P(bad.length === 0, `真引擎 L${lv} 60 题全在本关档内`, bad.slice(0, 3).join(' | ') || r[0]);
  }
  P(b.errors.length === 0, '无 JS 错误', b.errors.slice(0, 3));
} finally {
  try { await b.restore(); } finally { await b.close(); }
}
finish('verify_levels_exclusive');
