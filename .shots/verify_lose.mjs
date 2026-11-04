// 验证「失败结算」lose 标题去紫(#7B1FA2)→暖棕 var(--c-ink)=#5C3310=rgb(92,51,16)。
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
await ev(`sessionStorage.setItem('gameLevel','1');sessionStorage.setItem('gameMode','visual');location.href='game.html';`, false);
await sleep(1600); await ev(`window._skipOcrLoading && window._skipOcrLoading();`, false); await sleep(5000);
await ev(`debugEndGame(false);`, false);
await sleep(700);
const s1 = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('.shots/game_device_lose_after.png', Buffer.from(s1.data, 'base64'));
const r = (await ev(`(() => {
  const t = document.getElementById('overlay-title'); const ct = t ? getComputedStyle(t) : null;
  return { shown: document.getElementById('overlay').classList.contains('show'),
    title: t ? t.textContent : null, cls: t ? t.className : null, color: ct ? ct.color : null, shadow: ct ? ct.textShadow : null };
})()`)).result.value;
let fail = 0; const P = (ok, l, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
console.log('\n--- LOSE after ---', JSON.stringify(r));
P(r.shown && r.cls === 'lose', 'lose overlay shown', r.title);
P(r.color === 'rgb(92, 51, 16)', 'lose title is warm ink (was purple)', r.color);
P(!/128|purple|rgb\(123, 31, 162\)/.test(r.color) && !/123, 31, 162/.test(r.shadow), 'no purple hue remains', r.shadow);
console.log('\n' + (fail === 0 ? '=== LOSE FIX PASS ===' : '=== ' + fail + ' FAIL ===')); ws.close(); process.exit(fail ? 1 : 0);
