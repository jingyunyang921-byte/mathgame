// Try CDP Page.captureScreenshot — goes through the renderer's compositor, which often
// bypasses FLAG_SECURE (that only blanks system-level `screencap`). If it returns content,
// we can actually SEE the refactored menu despite the secure flag.
const CDP = 'http://localhost:9222';
const fs = await import('node:fs');
const targets = await (await fetch(CDP + '/json')).json();
const page = targets.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || targets[0];
console.log('target:', page.title, '|', page.url);
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let _id = 0; const pending = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params) => { const id = ++_id; return new Promise((res, rej) => { pending.set(id, m => m.error ? rej(new Error(method + ':' + JSON.stringify(m.error))) : res(m.result)); ws.send(JSON.stringify({ id, method, params: params || {} })); }); };
await send('Page.enable');
try {
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  if (!data) { console.log('EMPTY screenshot data'); process.exit(1); }
  const buf = Buffer.from(data, 'base64');
  const out = 'e:/mathgame/mathgame/.shots/device-menu.png';
  fs.writeFileSync(out, buf);
  // quick blank-frame heuristic: sample how many distinct byte values -> a blank white png is tiny/low-entropy
  console.log('WROTE', out, buf.length, 'bytes');
} catch (e) {
  console.log('captureScreenshot FAILED:', e.message);
  process.exit(1);
}
ws.close(); process.exit(0);
