// Dynamic verify of the shared 去AI化 layer in a real Chrome via CDP :9333.
// Confirms design-system var() tokens actually resolve, no JS crash, <use> icons resolve,
// question-card has no 0-blur hard pedestal — per level (亮 L1 / 深空 L5 / 战斗 L6，六关编号) + screenshots.
import { writeFileSync } from 'fs';
const CDP = 'http://localhost:9333';
const info = await (await fetch(CDP + '/json')).json();
const page = info.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || info[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params) => { const id = ++_id; return new Promise((res, rej) => { pend.set(id, m => m.error ? rej(new Error(method + ':' + JSON.stringify(m.error))) : res(m.result)); ws.send(JSON.stringify({ id, method, params: params || {} })); }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
await send('Page.enable'); await send('Runtime.enable');
const base = 'http://localhost:8000/index.html';
const METRICS = `(() => {
  const rs = getComputedStyle(document.documentElement); const tok = n => rs.getPropertyValue(n).trim();
  const qc = document.querySelector('#question-card') || document.querySelector('#battle-question-card');
  const bad = [...document.querySelectorAll('use')].map(u=>u.getAttribute('href')).filter(h=>h && !document.querySelector(h));
  return { surface: tok('--c-surface'), grad: tok('--grad-angle'), shadowCard: tok('--shadow-card'),
    scene4: tok('--scene-lv4'), qcShadow: qc ? getComputedStyle(qc).boxShadow : '(no qc)',
    danglingUse: bad, err: window.__err || null };
})()`;
let fail = 0; const P = (ok, l, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
for (const lv of [1, 5, 6]) {
  await send('Page.navigate', { url: base }); await sleep(400);
  await send('Runtime.evaluate', { expression: `window.__err=null;addEventListener('error',e=>window.__err=String(e.message));sessionStorage.setItem('gameLevel','${lv}');sessionStorage.setItem('gameMode','visual');` });
  await send('Page.reload'); await sleep(4800);
  const { result } = await send('Runtime.evaluate', { expression: METRICS, returnByValue: true });
  const r = result.value; const hardPed = /[1-9][0-9.]*px 0px 0px/.test(r.qcShadow);
  console.log('\n--- L' + lv + ' ---', JSON.stringify(r));
  P(!!r.surface, 'L' + lv + ' --c-surface resolves', r.surface);
  P(r.grad === '160deg', 'L' + lv + ' --grad-angle=160deg', r.grad);
  P(!!r.scene4, 'L' + lv + ' --scene-lv4 resolves', r.scene4.slice(0, 24));
  P(!hardPed, 'L' + lv + ' question-card no 0-blur hard pedestal', r.qcShadow);
  P(r.danglingUse.length === 0, 'L' + lv + ' all <use> resolve', JSON.stringify(r.danglingUse));
  P(!r.err, 'L' + lv + ' no JS error', r.err);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync('.shots/game_L' + lv + '.png', Buffer.from(shot.data, 'base64'));
}
console.log('\n' + (fail === 0 ? '=== ALL DYNAMIC PASS ===' : '=== ' + fail + ' FAIL ===')); ws.close(); process.exit(fail ? 1 : 0);
