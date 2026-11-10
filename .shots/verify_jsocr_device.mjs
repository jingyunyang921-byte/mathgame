// Device verify: pure-JS OCR replaces ONNX wasm. Measures visual-mode level-entry
// (loading-overlay lifetime = recognizer readiness) + confirms recognition works
// + asserts ort is gone / MnistNet present. CDP on :9222 (Chrome 91 WebView).
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
      const evR = async (expr, ret = true, tries = 40) => { for (let k = 0; k < tries; k++) { try { return await ev(expr, ret); } catch (e) { await sleep(200); } } throw new Error('evR timeout'); };
      return { ws, ev, evR, url: page.url, close: () => { try { ws.close(); } catch (e) {} } };
    } catch (e) { await sleep(400); }
  }
  throw new Error('connect failed');
}

// 1) connect, set mode, navigate to game.html visual L1
let c = await connect();
console.log('start target:', c.url);
await c.ev(`sessionStorage.setItem('gameLevel','1');sessionStorage.setItem('gameMode','visual');location.href='game.html';`, false).catch(() => {});
c.close();
await sleep(1500);

// 2) reconnect to game.html, watch the loading-overlay lifetime
c = await connect(/game\.html/);
console.log('reconnect target:', c.url);
let seenFlex = false, hideMs = null, t0 = Date.now();
while (Date.now() - t0 < 40000) {
  let s;
  try { s = (await c.ev(`(() => { const ov=document.getElementById('loading-overlay'); const d=ov?getComputedStyle(ov).display:'nil'; return { d, since: Math.round(Date.now()-performance.timing.navigationStart), rs: document.readyState }; })()`)).result.value; }
  catch (e) { await sleep(120); continue; }
  if (s && s.d === 'flex') seenFlex = true;
  if (s && seenFlex && s.d === 'none') { hideMs = s.since; break; }
  if (s && !seenFlex && s.rs === 'complete' && s.since > 1500) { hideMs = s.since; break; }
  await sleep(80);
}
console.log('\n[VISUAL] loading-overlay shown:', seenFlex, '| OCR ready at ~', hideMs, 'ms since navigationStart  (was ~21000ms with ort-wasm)');

// 3) assertions + full recognize() pipeline on a synthetic "1" (fresh DigitRecognizer)
const r = (await c.evR(`(async () => {
  try {
    const rep = { ortType: typeof window.ort, mnistType: typeof window.MnistNet };
    const t = performance.now();
    const rec = new DigitRecognizer();      // same class the game uses
    await rec.waitReady();
    rep.recReadyMs = Math.round(performance.now() - t);
    rep.recReady = rec.ready;
    // draw a thick vertical bar (a "1") on a real canvas -> full recognize() path
    const cv = document.createElement('canvas'); cv.width = 200; cv.height = 260;
    const g = cv.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0,0,cv.width,cv.height);
    g.strokeStyle = '#000'; g.lineWidth = 18; g.lineCap = 'round';
    g.beginPath(); g.moveTo(100,30); g.lineTo(100,230); g.stroke();
    const t2 = performance.now();
    rep.recognized = await rec.recognize(cv);
    rep.recognizeMs = Math.round(performance.now() - t2);
    return rep;
  } catch(e){ return { err: (e&&e.message)||String(e) }; }
})()`)).result.value;

console.log('[CHECK]', JSON.stringify(r, null, 2));

let fail = 0; const P = (ok, l, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
P(!r.err, 'verify ran (no error)', r.err);
P(typeof hideMs === 'number' && hideMs < 4000, 'level-entry OCR ready < 4000ms (was ~21000ms)', hideMs + 'ms');
P(r.ortType === 'undefined', 'window.ort is gone (no ONNX Runtime)', r.ortType);
P(r.mnistType === 'function', 'window.MnistNet present (pure-JS core)', r.mnistType);
P(r.recReady === true && typeof r.recReadyMs === 'number' && r.recReadyMs < 2000, 'DigitRecognizer ready fast', r.recReadyMs + 'ms');
P(typeof r.recognized === 'number' && r.recognized >= 0 && r.recognized <= 9, 'recognize() returns a digit (full pipeline)', 'got ' + r.recognized + ' in ' + r.recognizeMs + 'ms');
console.log('\n' + (fail === 0 ? '=== DEVICE JS-OCR VERIFY PASS ===' : '=== ' + fail + ' FAIL ===')); c.close(); process.exit(fail ? 1 : 0);
