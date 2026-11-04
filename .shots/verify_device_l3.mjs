// 注：文件名沿用六关编号前的 l3，本脚本现在验的是第 4 关（六关编号）。
// L4 (关4赛跑 RaceGame) 设备端 CDP 验证 via :9222（真机 Chrome91 WebView）。
// 导航 game.html + skip Vosk loader；断言 race 题卡/画布去绿身份+无硬底座、back/prog 去蓝、token、<use>、触摸修复 + 截图。
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
  const back = document.querySelector('#race-back-btn'), qc = document.querySelector('#question-card');
  const qd = document.querySelector('#question-display'), cw = document.querySelector('#canvas-wrapper');
  const pl = document.querySelector('#race-prog-player');
  const bad = [...document.querySelectorAll('use')].map(u => u.getAttribute('href')).filter(h => h && !document.querySelector(h));
  let sel = -1; try { const s = getSelection(); s.removeAllRanges(); document.execCommand('selectAll', false, null); sel = (s.toString() || '').trim().length; s.removeAllRanges(); } catch (e) { sel = -2; }
  return { ua: navigator.userAgent, surface: tok('--c-surface'), grad: tok('--grad-angle'),
    backColor: back ? getComputedStyle(back).color : '(no back)',
    qcShadow: qc ? getComputedStyle(qc).boxShadow : '(no qc)',
    qdColor: qd ? getComputedStyle(qd).color : '(no qd)',
    cwShadow: cw ? getComputedStyle(cw).boxShadow : '(no cw)',
    plColor: pl ? getComputedStyle(pl).color : '(no pl)',
    dangling: bad, tapHtml: getComputedStyle(document.documentElement).webkitTapHighlightColor, selLen: sel, url: location.pathname };
})()`;
let fail = 0; const P = (ok, l, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
await ev(`sessionStorage.setItem('gameLevel','4');sessionStorage.setItem('gameMode','normal');location.href='game.html';`, false);
await sleep(1600);
await ev(`window._skipOcrLoading && window._skipOcrLoading();`, false);
await sleep(5200);
const r = (await ev(METRICS)).result.value;
const hardQc = /[1-9][0-9.]*px 0px 0px/.test(r.qcShadow), hardCw = /[1-9][0-9.]*px 0px 0px/.test(r.cwShadow);
console.log('\n--- L4 device ---', JSON.stringify(r));
P(/Chrome\/91\./.test(r.ua), 'L4 WebView Chrome/91', (r.ua.match(/Chrome\/[\d.]+/) || [])[0]);
P(!!r.surface, 'L4 --c-surface resolves', r.surface);
P(r.grad === '160deg', 'L4 grad 160deg', r.grad);
P(r.backColor !== 'rgb(27, 94, 32)', 'L4 race-back no deep-green identity', r.backColor);
P(!hardQc, 'L4 race question-card no hard pedestal', r.qcShadow);
P(r.qdColor !== 'rgb(46, 125, 50)', 'L4 race question-display no green identity', r.qdColor);
P(!hardCw, 'L4 race canvas-wrapper no hard pedestal', r.cwShadow);
P(r.plColor !== 'rgb(21, 101, 192)', 'L4 prog-player no blue identity', r.plColor);
P(r.dangling.length === 0, 'L4 all <use> resolve', JSON.stringify(r.dangling));
P(r.tapHtml === 'rgba(0, 0, 0, 0)' || r.tapHtml === 'transparent', 'L4 tap-highlight transparent', r.tapHtml);
P(r.selLen === 0, 'L4 long-press selects nothing', 'chars=' + r.selLen);
const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('.shots/game_device_L3.png', Buffer.from(shot.data, 'base64'));
console.log('\n' + (fail === 0 ? '=== L4 DEVICE PASS ===' : '=== ' + fail + ' FAIL ===')); ws.close(); process.exit(fail ? 1 : 0);
