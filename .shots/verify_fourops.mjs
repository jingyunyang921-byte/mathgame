// 六关四则运算动态验证 via 本地 Chrome :9333。梯度：L1 10加减 / L2 20加减 / L3 100加减 / L4 表内乘除 / L5 两位乘除 / L6 四则混合。
// A: 直接调用页面内全局出题器大样本，断言 无负数/整除/答案≤各关上限/op集合正确且混合运算都出现。
// B: 逐关(视算)真跑引擎，连调 nextQuestion() 采样 currentExpr/currentAnswer，断言 op 与范围 + 无 JS 崩溃。
// C: 菜单页断言 <use> 全解析(含新 #i-addsub/#i-muldiv) + 卡片标题已更新。
import { writeFileSync } from 'fs';
const CDP = 'http://localhost:9333';
const info = await (await fetch(CDP + '/json')).json();
const page = info.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || info[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p) => { const id = ++_id; return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify({ id, method: m, params: p || {} })); }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const evalJS = async (expr, awaitP = false) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: awaitP })).result.value;
await send('Page.enable'); await send('Runtime.enable');
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true }); // 避免旧 menu.html 命中缓存
let fail = 0; const P = (ok, l, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
const base = 'http://localhost:8000/index.html';

// ---- A: 全局出题器大样本约束 ----
await send('Page.navigate', { url: base }); await sleep(1000);
const A = await evalJS(`(() => {
  const gens = { L1: mgGenAddSub10, L2: mgGenAddSub20, L3: mgGenAddSub100, L4: mgGenMulDivTable, L5: mgGenMulDiv99, L6: mgGenMixed };
  const want = { L1: ['+','−'], L2: ['+','−'], L3: ['+','−'], L4: ['×','÷'], L5: ['×','÷'], L6: ['+','−','×','÷'] };
  const bound = { L1: 10, L2: 20, L3: 99, L4: 81, L5: 99, L6: 99 };
  const out = {};
  for (const k in gens) {
    let maxAns = 0, bad = null; const ops = new Set();
    for (let i = 0; i < 50000; i++) {
      const c = gens[k]();
      ops.add(c.op);
      if (!Number.isInteger(c.answer)) { bad = '非整数 ' + c.key; break; }
      if (c.answer < 0) { bad = '负数 ' + c.key + '=' + c.answer; break; }
      if (c.answer > bound[k]) { bad = '答案>' + bound[k] + ' ' + c.key + '=' + c.answer; break; }
      if (c.op === '÷' && (c.a % c.b !== 0 || c.a / c.b !== c.answer)) { bad = '非整除 ' + c.key; break; }
      if (!want[k].includes(c.op)) { bad = 'op越界 ' + c.op; break; }
      if (c.answer > maxAns) maxAns = c.answer;
    }
    out[k] = { bad, maxAns, ops: [...ops].join(''), wordOk: want[k].every(o => !!MG_OP_WORD[o]), sawAll: want[k].every(o => ops.has(o)) };
  }
  return out;
})()`);
console.log('\n--- A 出题器约束 ---');
for (const k in A) {
  P(!A[k].bad, `A ${k} 约束`, A[k].bad || `maxAns=${A[k].maxAns} ops=${A[k].ops}`);
  P(A[k].wordOk, `A ${k} 口述词齐全`);
  P(A[k].sawAll, `A ${k} 混合运算齐全`, 'ops=' + A[k].ops);
}

// ---- B: 逐关真跑引擎 ----
const expectOp = { 1: ['+','−'], 2: ['+','−'], 3: ['+','−'], 4: ['×','÷'], 5: ['×','÷'], 6: ['+','−','×','÷'] };
const expectMax = { 1: 10, 2: 20, 3: 99, 4: 81, 5: 99, 6: 99 };
for (const lv of [1, 2, 3, 4, 5, 6]) {
  await send('Page.navigate', { url: base }); await sleep(300);
  await evalJS(`window.__err=null;addEventListener('error',e=>window.__err=String(e.message));sessionStorage.setItem('gameLevel','${lv}');sessionStorage.setItem('gameMode','visual');`);
  await send('Page.reload');
  // 轮询等引擎就绪（intro + OCR 预热）
  let ready = false;
  for (let t = 0; t < 24; t++) { await sleep(600); if (await evalJS(`!!window._currentGame`)) { ready = true; break; } }
  P(ready, `B L${lv} 引擎就绪`);
  if (!ready) continue;
  const r = await evalJS(`(() => {
    const g = window._currentGame; const rows = [];
    for (let i = 0; i < 40; i++) { g.nextQuestion(); rows.push({ expr: g.currentExpr, ans: g.currentAnswer }); }
    return rows;
  })()`);
  let bad = null; const ops = new Set();
  for (const row of r) {
    const m = String(row.expr).match(/^(\d+)\s*(\S+)\s*(\d+)$/);
    if (!m) { bad = '算式解析失败 ' + row.expr; break; }
    const op = m[2]; ops.add(op);
    if (!expectOp[lv].includes(op)) { bad = 'op错 ' + row.expr; break; }
    if (!(row.ans >= 0 && row.ans <= expectMax[lv])) { bad = '答案越界 ' + row.expr + '=' + row.ans; break; }
  }
  P(!bad, `B L${lv} 40题 op/范围`, bad || `ops=${[...ops].join('')} 例:${r[0].expr}=${r[0].ans}`);
  P(!(await evalJS(`window.__err`)), `B L${lv} 无 JS 错误`, await evalJS(`window.__err`));
}

// ---- C: 菜单页 ----
await send('Page.navigate', { url: 'http://localhost:8000/menu.html' }); await sleep(1200);
const C = await evalJS(`(() => {
  const bad = [...document.querySelectorAll('use')].map(u => u.getAttribute('href')).filter(h => h && !document.querySelector(h));
  const titles = [1,2,3,4,5,6].map(n => (document.querySelector('#card'+n+' .lv-title')||{}).textContent);
  const addsubOk = !!document.querySelector('#i-addsub'), muldivOk = !!document.querySelector('#i-muldiv');
  return { bad, titles, addsubOk, muldivOk };
})()`);
P(C.bad.length === 0, 'C 菜单 <use> 全解析', JSON.stringify(C.bad));
P(C.addsubOk && C.muldivOk, 'C 新符号 #i-addsub/#i-muldiv 存在');
P(C.titles.join('|') === '启蒙加减法|基础加减法|进阶加减法|基础乘除法|进阶乘除法|四则综合', 'C 卡片标题已更新', JSON.stringify(C.titles));

console.log('\n' + (fail === 0 ? '=== 折中版四则运算 验证全过 ===' : '=== ' + fail + ' FAIL ==='));
ws.close(); process.exit(fail ? 1 : 0);
