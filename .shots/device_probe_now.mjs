// 连真机 WebView CDP，量听算布局 + 截图（设备当前停在哪页就先看哪页）
import { writeFileSync } from 'fs';
const list = await (await fetch('http://localhost:9222/json/list')).json();
const t = list.find(x => x.type === 'page');
if (!t) { console.log('NO PAGE'); process.exit(1); }
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p = {}) => { const id = ++_id;
  return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify({ id, method: m, params: p })); }); };
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, userGesture: true });
  if (r.exceptionDetails) throw new Error('EVAL:' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)); return r.result.value; };
console.log(await ev(`JSON.stringify({w:innerWidth,h:innerHeight,dpr:devicePixelRatio,url:location.href,body:document.body.className,title:document.title})`));
const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('.shots/out/device_now.png', Buffer.from(shot.data, 'base64'));
console.log('shot saved');
ws.close(); process.exit(0);
