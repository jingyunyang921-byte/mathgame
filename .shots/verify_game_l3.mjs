// L4 (关4赛跑 RaceGame) 去AI化动态验证 via 本地 Chrome :9333。 —— 六关编号后 RaceGame 是 L4，文件名沿用旧编号 l3
// 断言 race 题卡/画布无绿身份色+无硬底座、back/prog 去蓝、token 解析、<use> 解析、无 JS 崩溃 + 截图。
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
  const back = document.querySelector('#race-back-btn'), qc = document.querySelector('#question-card');
  const qd = document.querySelector('#question-display'), cw = document.querySelector('#canvas-wrapper');
  const pl = document.querySelector('#race-prog-player'), ru = document.querySelector('#race-ui');
  const bad = [...document.querySelectorAll('use')].map(u => u.getAttribute('href')).filter(h => h && !document.querySelector(h));
  return { surface: tok('--c-surface'), grad: tok('--grad-angle'), primaryDeep: tok('--c-primary-deep'),
    raceUiShown: ru ? getComputedStyle(ru).display : '(no race-ui)',
    backColor: back ? getComputedStyle(back).color : '(no back)',
    qcShadow: qc ? getComputedStyle(qc).boxShadow : '(no qc)',
    qdColor: qd ? getComputedStyle(qd).color : '(no qd)',
    cwShadow: cw ? getComputedStyle(cw).boxShadow : '(no cw)',
    plColor: pl ? getComputedStyle(pl).color : '(no pl)',
    dangling: bad, err: window.__err || null };
})()`;
let fail = 0; const P = (ok, l, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
await send('Page.navigate', { url: base }); await sleep(400);
await send('Runtime.evaluate', { expression: `window.__err=null;addEventListener('error',e=>window.__err=String(e.message));sessionStorage.setItem('gameLevel','4');sessionStorage.setItem('gameMode','normal');` });
await send('Page.reload'); await sleep(5200);
const { result } = await send('Runtime.evaluate', { expression: METRICS, returnByValue: true });
const r = result.value;
const hardQc = /[1-9][0-9.]*px 0px 0px/.test(r.qcShadow), hardCw = /[1-9][0-9.]*px 0px 0px/.test(r.cwShadow);
console.log('\n--- L4 race ---', JSON.stringify(r));
P(!!r.surface, 'L4 --c-surface resolves', r.surface);
P(r.grad === '160deg', 'L4 --grad-angle=160deg', r.grad);
P(r.backColor !== 'rgb(27, 94, 32)', 'L4 race-back no deep-green identity', r.backColor);
P(!hardQc, 'L4 race question-card no hard pedestal', r.qcShadow);
P(r.qdColor !== 'rgb(46, 125, 50)', 'L4 race question-display no green identity', r.qdColor);
P(!hardCw, 'L4 race canvas-wrapper no hard pedestal', r.cwShadow);
P(r.plColor !== 'rgb(21, 101, 192)', 'L4 prog-player no blue identity', r.plColor);
P(r.dangling.length === 0, 'L4 all <use> resolve', JSON.stringify(r.dangling));
P(!r.err, 'L4 no JS error', r.err);
const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('.shots/game_L4_race.png', Buffer.from(shot.data, 'base64'));
console.log('\n' + (fail === 0 ? '=== L4 DYNAMIC PASS ===' : '=== ' + fail + ' FAIL ===')); ws.close(); process.exit(fail ? 1 : 0);
