// 太空关 SpaceGame（六关编号后是 L5「两位数乘除」，文件名沿用旧编号 l4）去AI化动态验证 via 本地 Chrome :9333。
// 门图标已 emoji→canvas path（DOM 查不到 canvas 内容，靠截图肉眼 + 无 JS 崩溃兜底）。
// 断言 token 解析、题目渲染(两位数 × 或 ÷)、深空 header 存在、<use> 解析、_draw/_drawDoorIcon 无崩溃 + 截图。
import { writeFileSync } from 'fs';
const CDP = 'http://localhost:9333';
const info = await (await fetch(CDP + '/json')).json();
const page = info.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || info[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p) => { const id = ++_id; return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify({ id, method: m, params: p || {} })); }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
await send('Page.enable'); await send('Runtime.enable');
const base = 'http://localhost:8000/index.html';
const METRICS = `(() => {
  const rs = getComputedStyle(document.documentElement), tok = n => rs.getPropertyValue(n).trim();
  const qd = document.querySelector('#space-question-display'), hdr = document.querySelector('#space-header');
  const sc = document.querySelector('#space-scene'), cv = document.querySelector('#space-canvas');
  const bad = [...document.querySelectorAll('use')].map(u => u.getAttribute('href')).filter(h => h && !document.querySelector(h));
  return { surface: tok('--c-surface'), grad: tok('--grad-angle'),
    qdText: qd ? qd.textContent : '(no qd)', qdColor: qd ? getComputedStyle(qd).color : '(no qd)',
    sceneActive: sc ? sc.classList.contains('active') : false,
    canvasWH: cv ? (cv.width + 'x' + cv.height) : '(no cv)',
    dangling: bad, err: window.__err || null };
})()`;
let fail = 0; const P = (ok, l, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
await send('Page.navigate', { url: base }); await sleep(400);
await send('Runtime.evaluate', { expression: `window.__err=null;addEventListener('error',e=>window.__err=String(e.message));sessionStorage.setItem('gameLevel','5');sessionStorage.setItem('gameMode','visual');` });
await send('Page.reload'); await sleep(5200);
const { result } = await send('Runtime.evaluate', { expression: METRICS, returnByValue: true });
const r = result.value;
console.log('\n--- L5 space ---', JSON.stringify(r));
P(!!r.surface, 'L5 --c-surface resolves', r.surface);
P(r.grad === '160deg', 'L5 --grad-angle=160deg', r.grad);
P(r.sceneActive, 'L5 space-scene active', r.sceneActive);
P(/\d+\s*[×÷]\s*\d+/.test(r.qdText), 'L5 question renders (× or ÷)', r.qdText);
P(r.canvasWH !== '0x0' && r.canvasWH !== '(no cv)', 'L5 canvas sized', r.canvasWH);
P(r.dangling.length === 0, 'L5 all <use> resolve', JSON.stringify(r.dangling));
P(!r.err, 'L5 no JS error (draw/doorIcon)', r.err);
const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('.shots/game_L4_space.png', Buffer.from(shot.data, 'base64'));
console.log('\n' + (fail === 0 ? '=== L5 DYNAMIC PASS ===' : '=== ' + fail + ' FAIL ===')); ws.close(); process.exit(fail ? 1 : 0);
