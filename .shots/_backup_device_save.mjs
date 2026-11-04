// 只读：把真机当前 localStorage / sessionStorage 导出到 .shots/out/device_save_backup.json，不写手机
import fs from 'node:fs';
const pages = await (await fetch('http://localhost:9222/json')).json();
const pg = pages.find(p => p.type === 'page');
const ws = new WebSocket(pg.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
const res = await new Promise(resolve => {
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id === 1) resolve(m); });
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { returnByValue: true,
    expression: 'JSON.stringify({ url: location.href, local: Object.fromEntries(Object.entries(localStorage)), session: Object.fromEntries(Object.entries(sessionStorage)) })' } }));
});
ws.close();
const data = JSON.parse(res.result.result.value);
fs.mkdirSync('.shots/out', { recursive: true });
fs.writeFileSync('.shots/out/device_save_backup.json', JSON.stringify(data, null, 1));
console.log('backup ok:', data.url, 'local keys', Object.keys(data.local).length, 'session keys', Object.keys(data.session).length);
