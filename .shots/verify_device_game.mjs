// On-device (Chrome91 WebView) CDP verify of the shared 去AI化 layer via :9222.
// Page.captureScreenshot bypasses FLAG_SECURE. Navigates to game.html per level (亮 L1 / 深空 L4 / 战斗 L5).
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
  const rs=getComputedStyle(document.documentElement),tok=n=>rs.getPropertyValue(n).trim();
  const qc=document.querySelector('#question-card')||document.querySelector('#battle-question-card');
  const bad=[...document.querySelectorAll('use')].map(u=>u.getAttribute('href')).filter(h=>h&&!document.querySelector(h));
  const cs=el=>el?getComputedStyle(el):null;
  let sel=-1;try{const s=getSelection();s.removeAllRanges();document.execCommand('selectAll',false,null);sel=(s.toString()||'').trim().length;s.removeAllRanges();}catch(e){sel=-2;}
  return {ua:navigator.userAgent,iw:innerWidth,ih:innerHeight,surface:tok('--c-surface'),grad:tok('--grad-angle'),
    qcShadow:qc?cs(qc).boxShadow:'(none)',dangling:bad,tapHtml:cs(document.documentElement).webkitTapHighlightColor,
    selBody:cs(document.body).webkitUserSelect||cs(document.body).userSelect,selLen:sel,url:location.pathname};
})()`;
let fail = 0; const P = (ok, l, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
for (const lv of [1, 5, 6]) {   // Game / SpaceGame / BattleGame
  await ev(`sessionStorage.setItem('gameLevel','${lv}');sessionStorage.setItem('gameMode','visual');location.href='game.html';`, false);
  await sleep(1600);
  await ev(`window._skipOcrLoading && window._skipOcrLoading();`, false);
  await sleep(5200);
  const r = (await ev(METRICS)).result.value;
  const hardPed = /[1-9][0-9.]*px 0px 0px/.test(r.qcShadow);
  console.log('\n--- L' + lv + ' ---', JSON.stringify(r));
  P(/Chrome\/91\./.test(r.ua), 'L' + lv + ' WebView Chrome/91', (r.ua.match(/Chrome\/[\d.]+/) || [])[0]);
  P(!!r.surface, 'L' + lv + ' --c-surface resolves', r.surface);
  P(r.grad === '160deg', 'L' + lv + ' grad 160deg', r.grad);
  P(!hardPed, 'L' + lv + ' question-card no hard pedestal', r.qcShadow);
  P(r.dangling.length === 0, 'L' + lv + ' all <use> resolve', JSON.stringify(r.dangling));
  P(r.tapHtml === 'rgba(0, 0, 0, 0)' || r.tapHtml === 'transparent', 'L' + lv + ' tap-highlight transparent', r.tapHtml);
  P(r.selLen === 0, 'L' + lv + ' long-press selects nothing', 'chars=' + r.selLen);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync('.shots/game_device_L' + lv + '.png', Buffer.from(shot.data, 'base64'));
}
console.log('\n' + (fail === 0 ? '=== DEVICE ALL PASS ===' : '=== ' + fail + ' FAIL ===')); ws.close(); process.exit(fail ? 1 : 0);
