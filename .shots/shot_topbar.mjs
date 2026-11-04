// One-off: clipped screenshot of the menu topbar (档案徽章 + 错题本钮 + 齿轮) at device metrics.
import { writeFileSync } from 'node:fs';
const ver = await (await fetch('http://localhost:9333/json/version')).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let _id = 0; const pend = new Map(); const waiters = [];
ws.onmessage = e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
  else if (m.method) { for (let i = waiters.length - 1; i >= 0; i--) if (waiters[i].pred(m)) waiters.splice(i, 1)[0].res(m); } };
const send = (method, params, sessionId) => { const id = ++_id; const msg = { id, method, params: params || {} }; if (sessionId) msg.sessionId = sessionId;
  return new Promise((res, rej) => { pend.set(id, m => m.error ? rej(new Error(method + ':' + JSON.stringify(m.error))) : res(m.result)); ws.send(JSON.stringify(msg)); }); };
const waitEvent = pred => new Promise(res => waiters.push({ pred, res }));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId); await send('Runtime.enable', {}, sessionId);
await send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 615, deviceScaleFactor: 2, mobile: false }, sessionId);
const nav = waitEvent(m => m.method === 'Page.loadEventFired' && m.sessionId === sessionId);
await send('Page.navigate', { url: 'http://localhost:8000/menu.html' }, sessionId);
await nav; await sleep(900);
const { result } = await send('Runtime.evaluate', { expression: `(() => { const r = document.querySelector('.topbar').getBoundingClientRect();
  return { x: Math.floor(r.left) - 6, y: Math.floor(r.top) - 6, w: Math.ceil(r.width) + 12, h: Math.ceil(r.height) + 12 }; })()`, returnByValue: true }, sessionId);
const c = result.value;
const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: c.x, y: c.y, width: c.w, height: c.h, scale: 2 } }, sessionId);
writeFileSync('e:/mathgame/mathgame/.shots/topbar_wronglog.png', Buffer.from(shot.data, 'base64'));
console.log('clip', JSON.stringify(c));
await send('Target.closeTarget', { targetId }); ws.close();
