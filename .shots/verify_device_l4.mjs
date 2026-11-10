// 注：文件名沿用六关编号前的 l4，本脚本现在验的是第 5 关（六关编号）。
// L5 (关5太空 SpaceGame) 设备端 CDP 验证 via :9222（真机 Chrome91 WebView）。
// 导航 game.html + skip Vosk loader；断言 token、题目渲染、深空 scene、<use>、触摸修复、门 path 无崩溃 + 截图。
import { writeFileSync } from 'fs';
const CDP = 'http://localhost:9222';
const info = await (await fetch(CDP + '/json')).json();
const page = info.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || info[0];
console.log('target:', page.title, '|', page.url);
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p) => { const id = ++_id; return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify({ id, method: m, params: p || {} })); }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
await send('Page.enable'); await send('Runtime.enable');
const ev = (expr, ret = true) => send('Runtime.evaluate', { expression: expr, returnByValue: ret, awaitPromise: true, userGesture: true });
const METRICS = `(() => {
  const rs = getComputedStyle(document.documentElement), tok = n => rs.getPropertyValue(n).trim();
  const qd = document.querySelector('#space-question-display');
  const sc = document.querySelector('#space-scene'), cv = document.querySelector('#space-canvas');
  const bad = [...document.querySelectorAll('use')].map(u => u.getAttribute('href')).filter(h => h && !document.querySelector(h));
  let sel = -1; try { const s = getSelection(); s.removeAllRanges(); document.execCommand('selectAll', false, null); sel = (s.toString() || '').trim().length; s.removeAllRanges(); } catch (e) { sel = -2; }
  return { ua: navigator.userAgent, surface: tok('--c-surface'), grad: tok('--grad-angle'),
    qdText: qd ? qd.textContent : '(no qd)', sceneActive: sc ? sc.classList.contains('active') : false,
    canvasWH: cv ? (cv.width + 'x' + cv.height) : '(no cv)',
    dangling: bad, tapHtml: getComputedStyle(document.documentElement).webkitTapHighlightColor, selLen: sel, url: location.pathname };
})()`;
let fail = 0; const P = (ok, l, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
await ev(`sessionStorage.setItem('gameLevel','5');sessionStorage.setItem('gameMode','visual');location.href='game.html';`, false);
await sleep(1600);
await ev(`window._skipOcrLoading && window._skipOcrLoading();`, false);
await sleep(5200);
const r = (await ev(METRICS)).result.value;
console.log('\n--- L5 device ---', JSON.stringify(r));
P(/Chrome\/(9[1-9]|1\d\d)\./.test(r.ua), 'L5 WebView >= Chrome/91', (r.ua.match(/Chrome\/[\d.]+/) || [])[0]);
P(!!r.surface, 'L5 --c-surface resolves', r.surface);
P(r.grad === '160deg', 'L5 grad 160deg', r.grad);
P(r.sceneActive, 'L5 space-scene active', r.sceneActive);
P(/\d+\s*[×÷]\s*\d+/.test(r.qdText), 'L5 question renders (× or ÷)', r.qdText);
P(r.canvasWH !== '0x0' && r.canvasWH !== '(no cv)', 'L5 canvas sized', r.canvasWH);
P(r.dangling.length === 0, 'L5 all <use> resolve', JSON.stringify(r.dangling));
P(r.tapHtml === 'rgba(0, 0, 0, 0)' || r.tapHtml === 'transparent', 'L5 tap-highlight transparent', r.tapHtml);
P(r.selLen === 0, 'L5 long-press selects nothing', 'chars=' + r.selLen);
const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('.shots/game_device_L4.png', Buffer.from(shot.data, 'base64'));
console.log('\n' + (fail === 0 ? '=== L5 DEVICE PASS ===' : '=== ' + fail + ' FAIL ===')); ws.close(); process.exit(fail ? 1 : 0);
