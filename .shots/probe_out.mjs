// 探针：ONNX session 的真实输入/输出名 + run 后的 keys。
const CDP = 'http://localhost:9222';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const info = await (await fetch(CDP + '/json')).json();
const page = info.filter(t => t.type === 'page' && t.webSocketDebuggerUrl).find(p => /game\.html/.test(p.url)) || info[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p) => { const id = ++_id; return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify({ id, method: m, params: p || {} })); }); };
await send('Runtime.enable');
const ev = expr => send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
console.log('url:', page.url);
const r = (await ev(`(async () => {
  try {
    const sess = await ort.InferenceSession.create('./models/mnist-12.onnx', { executionProviders:['wasm'], graphOptimizationLevel:'all' });
    const inp = new Float32Array(784); for (let i=300;i<500;i++) inp[i]=200;
    const out = await sess.run({ Input3: new ort.Tensor('float32', inp, [1,1,28,28]) });
    const keys = Object.keys(out);
    return { inputNames: sess.inputNames, outputNames: sess.outputNames, runKeys: keys, firstLen: out[keys[0]] ? out[keys[0]].data.length : null, firstVals: out[keys[0]] ? Array.from(out[keys[0]].data).map(v=>+v.toFixed(3)) : null };
  } catch(e){ return { err: (e&&e.message)||String(e) }; }
})()`)).result.value;
console.log(JSON.stringify(r, null, 2));
ws.close(); process.exit(0);
