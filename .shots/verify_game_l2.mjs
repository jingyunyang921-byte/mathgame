// L3 (关3听算 VoiceGame · audio) 去AI化动态验证 via 本地 Chrome :9333。 —— 六关编号后听算 VoiceGame 是 L3，文件名沿用旧编号 l2
// 断言 voice-mic 无硬底座 + 渐变面 + i-mic SVG、token 解析、<use> 解析、无 JS 崩溃 + 截图。
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
  const mic = document.querySelector('#voice-mic-btn') || document.querySelector('#float-voice-mic-btn');
  const heard = document.querySelector('#voice-heard-text'), vs = document.querySelector('#voice-section');
  const bad = [...document.querySelectorAll('use')].map(u => u.getAttribute('href')).filter(h => h && !document.querySelector(h));
  const micIc = mic ? mic.querySelector('.ic use') : null;
  return { surface: tok('--c-surface'), grad: tok('--grad-angle'),
    micShadow: mic ? getComputedStyle(mic).boxShadow : '(no mic)',
    micBg: mic ? getComputedStyle(mic).backgroundImage.slice(0, 44) : '(no mic)',
    micIcHref: micIc ? micIc.getAttribute('href') : '(no ic)',
    heardColor: heard ? getComputedStyle(heard).color : '(no heard)',
    vsBg: vs ? getComputedStyle(vs).backgroundImage.slice(0, 44) : '(no vs)',
    dangling: bad, err: window.__err || null };
})()`;
let fail = 0; const P = (ok, l, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
await send('Page.navigate', { url: base }); await sleep(400);
await send('Runtime.evaluate', { expression: `window.__err=null;addEventListener('error',e=>window.__err=String(e.message));sessionStorage.setItem('gameLevel','3');sessionStorage.setItem('gameMode','audio');` });
await send('Page.reload'); await sleep(5200);
const { result } = await send('Runtime.evaluate', { expression: METRICS, returnByValue: true });
const r = result.value; const hardPed = /[1-9][0-9.]*px 0px 0px/.test(r.micShadow);
console.log('\n--- L3 audio ---', JSON.stringify(r));
P(!!r.surface, 'L3 --c-surface resolves', r.surface);
P(r.grad === '160deg', 'L3 --grad-angle=160deg', r.grad);
P(!hardPed, 'L3 voice-mic no 0-blur hard pedestal', r.micShadow);
P(/gradient/.test(r.micBg), 'L3 voice-mic gradient surface', r.micBg);
P(r.micIcHref === '#i-mic', 'L3 voice-mic uses i-mic SVG', r.micIcHref);
P(r.dangling.length === 0, 'L3 all <use> resolve', JSON.stringify(r.dangling));
P(!r.err, 'L3 no JS error', r.err);
const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('.shots/game_L2_audio.png', Buffer.from(shot.data, 'base64'));
console.log('\n' + (fail === 0 ? '=== L3 DYNAMIC PASS ===' : '=== ' + fail + ' FAIL ===')); ws.close(); process.exit(fail ? 1 : 0);
