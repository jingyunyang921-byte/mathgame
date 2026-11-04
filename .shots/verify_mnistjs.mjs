// 对拍：纯 JS MnistNet vs 设备端 ONNX Runtime。稳健版：导航后重连到新 target。
import { readFileSync } from 'fs';
const coreJs = readFileSync('.shots/mnist_forward.js', 'utf8');
const CDP = 'http://localhost:9222';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function connect(matchUrl) {
  for (let i = 0; i < 30; i++) {
    try {
      const info = await (await fetch(CDP + '/json')).json();
      const pages = info.filter(t => t.type === 'page' && t.webSocketDebuggerUrl);
      const page = (matchUrl ? pages.find(p => matchUrl.test(p.url)) : null) || pages[0];
      if (!page) { await sleep(300); continue; }
      const ws = new WebSocket(page.webSocketDebuggerUrl);
      await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
      let _id = 0; const pend = new Map();
      ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
      const send = (m, p) => { const id = ++_id; return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify({ id, method: m, params: p || {} })); }); };
      await send('Page.enable'); await send('Runtime.enable');
      const ev = (expr, ret = true) => send('Runtime.evaluate', { expression: expr, returnByValue: ret, awaitPromise: true, userGesture: true });
      const evR = async (expr, ret = true, tries = 40) => { for (let k = 0; k < tries; k++) { try { return await ev(expr, ret); } catch (e) { await sleep(250); } } throw new Error('evR timeout'); };
      return { ws, ev, evR, url: page.url, close: () => { try { ws.close(); } catch (e) {} } };
    } catch (e) { await sleep(400); }
  }
  throw new Error('connect failed');
}

// 1) 连当前页 → 设置模式 + 导航到 game.html(visual)
let c = await connect();
console.log('start target:', c.url);
await c.ev(`sessionStorage.setItem('gameLevel','1');sessionStorage.setItem('gameMode','visual');location.href='game.html';`, false).catch(() => {});
c.close();
await sleep(3500);

// 2) 重连到 game.html
c = await connect(/game\.html/);
console.log('reconnect target:', c.url);
for (let i = 0; i < 50; i++) { const ok = (await c.evR(`typeof window.ort==='object' && !!ort.InferenceSession && document.readyState==='complete'`)).result.value; if (ok) break; await sleep(300); }
await c.evR(coreJs, false);
const present = (await c.evR(`typeof window.MnistNet==='function' && typeof window.ort==='object'`)).result.value;
console.log('MnistNet+ort present:', present, '| url:', (await c.evR(`location.pathname`)).result.value);

// 3) 对拍
const r = (await c.evR(`(async () => {
  try {
    const buf = await (await fetch('./models/mnist-12.onnx')).arrayBuffer();
    const net = window.MnistNet(new Uint8Array(buf));
    const sess = await ort.InferenceSession.create('./models/mnist-12.onnx', { executionProviders:['wasm'], graphOptimizationLevel:'all' });
    const inputs = [];
    for (let n=0;n<20;n++){ const a=new Float32Array(784); const dens=Math.random(); for(let i=0;i<784;i++) a[i]= Math.random()<dens ? Math.random()*255 : 0; inputs.push(a); }
    { const a=new Float32Array(784); for(let y=4;y<24;y++) for(let x=13;x<16;x++) a[y*28+x]=255; inputs.push(a); }
    { const a=new Float32Array(784); for(let t=4;t<24;t++){ a[t*28+t]=255; a[t*28+t+1]=200; } inputs.push(a); }
    inputs.push(new Float32Array(784));
    { const a=new Float32Array(784).fill(255); inputs.push(a); }
    let maxDiff=0, mism=0, worst=null; const rows=[];
    for (let k=0;k<inputs.length;k++){
      const inp=inputs[k];
      const jr=net.predict(inp);
      const out=await sess.run({ Input3: new ort.Tensor('float32', inp, [1,1,28,28]) });
      const od=out.Plus214_Output_0.data;
      let oi=0,ov=-Infinity; for(let i=0;i<10;i++){ if(od[i]>ov){ov=od[i];oi=i;} }
      let d=0; for(let i=0;i<10;i++){ const dd=Math.abs(od[i]-jr.logits[i]); if(dd>d)d=dd; }
      if(d>maxDiff){maxDiff=d;worst={k,d:+d.toFixed(5),jsArg:jr.arg,onnxArg:oi};}
      if(jr.arg!==oi){mism++;rows.push({k,js:jr.arg,onnx:oi,diff:+d.toFixed(4)});}
    }
    return { count:inputs.length, maxDiff:+maxDiff.toFixed(6), mism, worst, sampleMismatches:rows.slice(0,6) };
  } catch(e){ return { err: (e&&e.message)||String(e) }; }
})()`)).result.value;

console.log('\n--- PARITY ---', JSON.stringify(r, null, 2));
let fail = 0; const P = (ok, l, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
P(!r.err, 'comparison ran (no error)', r.err);
P(r.mism === 0, 'argmax matches ONNX on all inputs', r.mism + ' mismatches');
P(typeof r.maxDiff === 'number' && r.maxDiff < 1e-2, 'max logit abs-diff < 1e-2', r.maxDiff);
console.log('\n' + (fail === 0 ? '=== MNIST JS PARITY PASS ===' : '=== ' + fail + ' FAIL ===')); c.close(); process.exit(fail ? 1 : 0);
