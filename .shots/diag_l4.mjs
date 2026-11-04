// L4 设备诊断：为何 space-canvas 在真机 WebView 全黑（本地正常）。
// 探测 ctx.ellipse/roundRect 是否存在 + 手动调 game._draw() 捕获抛错。
const CDP = 'http://localhost:9222';
const info = await (await fetch(CDP + '/json')).json();
const page = info.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || info[0];
console.log('target:', page.title, '|', page.url);
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p) => { const id = ++_id; return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify({ id, method: m, params: p || {} })); }); };
await send('Runtime.enable');
const ev = expr => send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
const r = (await ev(`(() => {
  const cv = document.querySelector('#space-canvas'); if (!cv) return { noCanvas: true };
  const ctx = cv.getContext('2d');
  const probe = { ellipse: typeof ctx.ellipse, roundRect: typeof ctx.roundRect, arc: typeof ctx.arc };
  let drawErr = null;
  try { if (window.game && window.game._draw) window.game._draw(); } catch (e) { drawErr = String(e && (e.stack || e.message) || e); }
  let iconErr = null;
  try { if (window.game && window.game._drawDoorIcon) window.game._drawDoorIcon(ctx, 'planet', 50, 50, 10, false); } catch (e) { iconErr = String(e && (e.stack || e.message) || e); }
  return { probe, drawErr, iconErr, gameType: (window.game && window.game.constructor && window.game.constructor.name) || typeof window.game, cw: cv.width + 'x' + cv.height };
})()`)).result.value;
console.log(JSON.stringify(r, null, 2));
ws.close(); process.exit(0);
