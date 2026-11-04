// 成长能量静态稿截图：本地 Chrome CDP :9333，服务器 :8000
import { writeFileSync, mkdirSync } from 'fs';
const CDP = 'http://localhost:9333', BASE = 'http://localhost:8000/.shots/energy-preview.html';
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
for (const d of ['Page', 'Runtime', 'Network']) await send(d + '.enable', {}, sessionId);
await send('Network.setCacheDisabled', { cacheDisabled: true }, sessionId);
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId);
  if (r.exceptionDetails) throw new Error('EVAL:' + ((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text)); return r.result.value; };
const VIEWS = (process.argv[2] || 'A,B,C1,C2,C3').split(',');
const SIZES = (process.argv[3] || '960x576').split(',').map(s => s.split('x').map(Number));
for (const [w, h] of SIZES) for (const v of VIEWS) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false }, sessionId);
  await send('Page.navigate', { url: BASE + '?v=' + v }, sessionId);
  for (let t = 0; t < 40; t++) { await sleep(150); if (await ev(`document.body.dataset.ready==='1'`)) break; }
  await sleep(300);
  const m = await ev(`(()=>{const c=document.getElementById('card')||document.querySelector('.pet-card');return {missing:window.MISSING,cardScroll:c?c.scrollHeight:null,cardClient:c?c.clientHeight:null,cardH:c?Math.round(c.getBoundingClientRect().height):null,cardTop:c?Math.round(c.getBoundingClientRect().top):null}})()`);
  const r = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  const name = `energy_${v}_${w}x${h}`; writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64'));
  console.log(name, JSON.stringify(m));
}
ws.close(); process.exit(0);
