// 截图 listen-preview.html（听算三方案对比），headless Chrome CDP :9333，服务器 :8000。
import { writeFileSync, mkdirSync } from 'fs';
const CDP = 'http://localhost:9333', URL = 'http://localhost:8000/.shots/listen-preview.html';
const OUT = '.shots/out';
try { mkdirSync(OUT, { recursive: true }); } catch (e) {}
const ver = await (await fetch(CDP + '/json/version')).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p, s) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (s) msg.sessionId = s;
  return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify(msg)); }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId); await send('Runtime.enable', {}, sessionId);
await send('Emulation.setDeviceMetricsOverride', { width: 1240, height: 780, deviceScaleFactor: 2, mobile: false }, sessionId);
await send('Page.navigate', { url: URL }, sessionId);
await sleep(900);
const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }, sessionId);
writeFileSync(`${OUT}/listen_options.png`, Buffer.from(r.data, 'base64'));
console.log('saved ' + OUT + '/listen_options.png');
ws.close(); process.exit(0);
