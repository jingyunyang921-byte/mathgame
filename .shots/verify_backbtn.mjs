// 验证左上角返回按钮 #exit-btn 新箭头(i-back SVG)：解析/无 dangling + 全屏 + 放大特写截图。
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
const r = (await ev(`(() => {
  const b = document.getElementById('exit-btn');
  const use = b ? b.querySelector('use') : null; const href = use ? use.getAttribute('href') : null;
  const rect = b ? b.getBoundingClientRect() : null; const cs = b ? getComputedStyle(b) : null;
  const iBack = !!document.querySelector('#i-back');
  const dangling = [...document.querySelectorAll('use')].map(u => u.getAttribute('href')).filter(h => h && !document.querySelector(h));
  return { hasBtn: !!b, href, resolves: href ? !!document.querySelector(href) : false, iBack,
    w: cs ? cs.width : null, h: cs ? cs.height : null, color: cs ? cs.color : null,
    rect: rect ? { x: rect.x, y: rect.y, w: rect.width, h: rect.height } : null, dangling };
})()`)).result.value;
let fail = 0; const P = (ok, l, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
console.log('\n--- back btn ---', JSON.stringify(r));
P(r.hasBtn, 'exit-btn exists');
P(r.iBack, 'i-back symbol present');
P(r.href === '#i-back' && r.resolves, 'exit-btn uses #i-back and resolves', r.href);
P(r.dangling.length === 0, 'no dangling <use>', JSON.stringify(r.dangling));
// full screenshot
const s0 = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('.shots/game_device_backbtn_full.png', Buffer.from(s0.data, 'base64'));
// zoomed close-up around the button
if (r.rect) {
  const clip = { x: Math.max(0, r.rect.x - 8), y: Math.max(0, r.rect.y - 8), width: r.rect.w + 16, height: r.rect.h + 16, scale: 5 };
  const s1 = await send('Page.captureScreenshot', { format: 'png', clip });
  writeFileSync('.shots/game_device_backbtn_zoom.png', Buffer.from(s1.data, 'base64'));
  console.log('zoom clip:', JSON.stringify(clip));
}
console.log('\n' + (fail === 0 ? '=== BACK BTN PASS ===' : '=== ' + fail + ' FAIL ===')); ws.close(); process.exit(fail ? 1 : 0);
