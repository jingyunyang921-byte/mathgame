// 测量「关卡进入」加载耗时：视算(ONNX/OCR 10.9MB wasm)阻塞 vs 听算(Vosk)。
// 报告：导航→loading-overlay 消失(OCR 就绪)的真实毫秒；再单独热测 InferenceSession.create + 一次 recognize。
const CDP = 'http://localhost:9222';
const info = await (await fetch(CDP + '/json')).json();
const page = info.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || info[0];
console.log('target:', page.title, '|', page.url);
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p) => { const id = ++_id; return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify({ id, method: m, params: p || {} })); }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
await send('Page.enable'); await send('Runtime.enable');
const ev = (expr, ret = true) => send('Runtime.evaluate', { expression: expr, returnByValue: ret, awaitPromise: true, userGesture: true });

// ---- VISUAL 模式冷加载：导航到 game.html(视算)，不 skip，测 loading-overlay 存活时长 ----
await ev(`sessionStorage.setItem('gameLevel','1');sessionStorage.setItem('gameMode','visual');location.href='game.html';`, false);
await sleep(400);
let seenFlex = false, hideMs = null, t0 = Date.now();
while (Date.now() - t0 < 40000) {
  let s;
  try { s = (await ev(`(() => { const ov=document.getElementById('loading-overlay'); const d=ov?getComputedStyle(ov).display:'nil'; return { d, since: Math.round(Date.now()-performance.timing.navigationStart), rs: document.readyState }; })()`)).result.value; }
  catch (e) { await sleep(150); continue; }
  if (s.d === 'flex') seenFlex = true;
  if (seenFlex && s.d === 'none') { hideMs = s.since; break; }
  if (!seenFlex && s.rs === 'complete' && s.since > 2500) { hideMs = s.since; break; } // 万一没显示 overlay(极快就绪)
  await sleep(120);
}
console.log('\n[VISUAL] OCR loading-overlay shown:', seenFlex, '| ready at ~', hideMs, 'ms since navigationStart');

// ---- 热测：ort 运行时已初始化后，再建一个 session 只测「模型装载」本身(应极快，证明成本在 wasm 运行时) ----
await sleep(300);
const warm = (await ev(`(async () => {
  if (!window.ort) return { err: 'no ort' };
  const t = performance.now();
  const s = await ort.InferenceSession.create('./models/mnist-12.onnx', { executionProviders:['wasm'], graphOptimizationLevel:'all' });
  const create = performance.now() - t;
  // 一次推理耗时
  const input = new Float32Array(28*28);
  const t2 = performance.now();
  const out = await s.run({ Input3: new ort.Tensor('float32', input, [1,1,28,28]) });
  const infer = performance.now() - t2;
  return { create: Math.round(create), infer: Math.round(infer), wasmPaths: ort.env.wasm.wasmPaths, simd: ort.env.wasm.simd, threads: ort.env.wasm.numThreads };
})()`)).result.value;
console.log('[WARM] 2nd InferenceSession.create (runtime already up):', JSON.stringify(warm));

// ---- 参考：intro 时长常量 ----
console.log('[REF] intro ceremony ≈ 2000ms + READY/GO anim (~3-4s total), currently NOT overlapped with engine load');
ws.close(); process.exit(0);
