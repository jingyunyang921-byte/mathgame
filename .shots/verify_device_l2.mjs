// 注：文件名沿用六关编号前的 l2，本脚本现在验的是第 3 关（六关编号）。
// L3 (关3听算 VoiceGame · audio) 设备端 CDP 验证 via :9222（真机 Chrome91 WebView）。
// 导航 game.html + skip Vosk loader；断言 voice-mic 无硬底座/渐变面/i-mic、token、<use>、触摸修复 + 截图。
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
  const mic = document.querySelector('#voice-mic-btn') || document.querySelector('#float-voice-mic-btn');
  const bad = [...document.querySelectorAll('use')].map(u => u.getAttribute('href')).filter(h => h && !document.querySelector(h));
  const micIc = mic ? mic.querySelector('.ic use') : null;
  let sel = -1; try { const s = getSelection(); s.removeAllRanges(); document.execCommand('selectAll', false, null); sel = (s.toString() || '').trim().length; s.removeAllRanges(); } catch (e) { sel = -2; }
  return { ua: navigator.userAgent, surface: tok('--c-surface'), grad: tok('--grad-angle'),
    micShadow: mic ? getComputedStyle(mic).boxShadow : '(no mic)', micBg: mic ? getComputedStyle(mic).backgroundImage.slice(0, 44) : '(no mic)',
    micIcHref: micIc ? micIc.getAttribute('href') : '(no ic)', dangling: bad,
    tapHtml: getComputedStyle(document.documentElement).webkitTapHighlightColor, selLen: sel, url: location.pathname };
})()`;
let fail = 0; const P = (ok, l, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
await ev(`sessionStorage.setItem('gameLevel','3');sessionStorage.setItem('gameMode','audio');location.href='game.html';`, false);
await sleep(1600);
await ev(`window._skipOcrLoading && window._skipOcrLoading();`, false);
await sleep(5200);
const r = (await ev(METRICS)).result.value;
const hardPed = /[1-9][0-9.]*px 0px 0px/.test(r.micShadow);
console.log('\n--- L3 device ---', JSON.stringify(r));
P(/Chrome\/91\./.test(r.ua), 'L3 WebView Chrome/91', (r.ua.match(/Chrome\/[\d.]+/) || [])[0]);
P(!!r.surface, 'L3 --c-surface resolves', r.surface);
P(r.grad === '160deg', 'L3 grad 160deg', r.grad);
P(!hardPed, 'L3 voice-mic no hard pedestal', r.micShadow);
P(/gradient/.test(r.micBg), 'L3 voice-mic gradient surface', r.micBg);
P(r.micIcHref === '#i-mic', 'L3 voice-mic uses i-mic', r.micIcHref);
P(r.dangling.length === 0, 'L3 all <use> resolve', JSON.stringify(r.dangling));
P(r.tapHtml === 'rgba(0, 0, 0, 0)' || r.tapHtml === 'transparent', 'L3 tap-highlight transparent', r.tapHtml);
P(r.selLen === 0, 'L3 long-press selects nothing', 'chars=' + r.selLen);
const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('.shots/game_device_L2.png', Buffer.from(shot.data, 'base64'));
console.log('\n' + (fail === 0 ? '=== L3 DEVICE PASS ===' : '=== ' + fail + ' FAIL ===')); ws.close(); process.exit(fail ? 1 : 0);
