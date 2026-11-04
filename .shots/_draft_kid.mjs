// 小孩子精灵静态稿：大图 + 与小鹿并排的实际尺寸，截图到 .shots/out/kid_draft.png（用 :9333 的新 target）
import fs from 'node:fs';
const sym = fs.readFileSync('.shots/_kid_symbol.txt', 'utf8');
const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#EAD9B8;font:14px sans-serif">
<svg width="0" height="0" style="position:absolute"><defs>${sym}</defs></svg>
<div style="display:flex;gap:24px;align-items:flex-end;padding:16px">
<svg width="360" height="360" viewBox="0 0 24 24" style="background:#F6E9CE"><use href="#p-kid"/></svg>
<svg width="167" height="167" viewBox="0 0 24 24" style="background:#C9B38A"><use href="#p-kid"/></svg>
<svg width="64" height="64" viewBox="0 0 24 24" style="background:#fff"><use href="#p-kid"/></svg>
<svg width="22" height="22" viewBox="0 0 24 24" style="background:#fff"><use href="#p-kid"/></svg>
</div></body>`;
const ver = await (await fetch('http://localhost:9333/json/version')).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p, s) => { const i = ++id; const msg = { id: i, method: m, params: p || {} }; if (s) msg.sessionId = s; return new Promise((res, rej) => { pend.set(i, x => x.error ? rej(new Error(JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify(msg)); }); };
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId);
await send('Emulation.setDeviceMetricsOverride', { width: 760, height: 400, deviceScaleFactor: 1, mobile: false }, sessionId);
const { frameTree } = await send('Page.getFrameTree', {}, sessionId);
await send('Page.setDocumentContent', { frameId: frameTree.frame.id, html }, sessionId);
await new Promise(r => setTimeout(r, 400));
const s = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
fs.writeFileSync('.shots/out/kid_draft.png', Buffer.from(s.data, 'base64'));
await send('Target.closeTarget', { targetId });
ws.close(); console.log('ok');
