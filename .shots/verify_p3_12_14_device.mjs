// 真机（DuerOS WebView, Chrome 91）验 P3-14 门几何 + P3-12 mgSaveStars。
// 会先备份设备上真实的 mathgameStars，验完原样写回。
// Needs: adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>
import { writeFileSync } from 'node:fs';
const targets = await (await fetch('http://localhost:9222/json')).json();
const page = targets.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
if (!page) { console.log('no page target'); process.exit(1); }
console.log('target:', page.title, '|', page.url);
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let _id = 0; const pending = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params) => { const id = ++_id;
  return new Promise((res, rej) => { pending.set(id, m => m.error ? rej(new Error(method + ':' + JSON.stringify(m.error))) : res(m.result)); ws.send(JSON.stringify({ id, method, params: params || {} })); }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ev = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true })).result.value;
await send('Page.enable'); await send('Runtime.enable');

// 冷启动可能 >20s：轮询到目标就绪为止
const goto = async (url, readyExpr, ms = 90000) => {
  try { await ev(`location.href='${url}'`); } catch (e) {}
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { await sleep(900);
    try { if (await ev(`location.pathname.indexOf('${url}')>=0 && document.readyState==='complete' && (${readyExpr})`)) return; } catch (e) {} }
  throw new Error('nav timeout: ' + url);
};

await ev(`sessionStorage.setItem('gameLevel','5');sessionStorage.setItem('gameMode','normal')`);
await goto('game.html', `typeof mgSaveStars==='function'`);
let ready = false;
for (let i = 0; i < 40 && !ready; i++) { await sleep(700); try { ready = await ev(`!!(window._currentGame && window._currentGame.choices && window._currentGame.choices.length===4)`); } catch (e) {} }
if (!ready) { console.log('FAIL: SpaceGame 没起来'); process.exit(1); }

const d = await ev(`(() => {
  const g = window._currentGame; g._genChoices(7);
  const W = g.canvas.width, c = g.choices;
  const ctx = g.canvas.getContext('2d');
  const px = ctx.getImageData(Math.round(c[0].x + c[0].w / 2), Math.round(c[0].y + c[0].h / 2), 1, 1).data;
  return { ua: navigator.userAgent.match(/Chrome\\/[0-9]+/)[0], W, H: g.canvas.height, iw: innerWidth, dpr: devicePixelRatio,
    doorW: +c[0].w.toFixed(2), gap: +(c[1].x - c[0].x - c[0].w).toFixed(2),
    left: +Math.min(...c.map(x => x.x)).toFixed(2), right: +Math.max(...c.map(x => x.x + x.w)).toFixed(2),
    n: c.length, rafAlive: g.rafId != null, doorPx: [...px].join(','),
    errBanner: !!document.querySelector('#mg-err-banner') };
})()`);

const s = await ev(`(() => {
  const K = 'mathgameStars', backup = localStorage.getItem(K);
  const run = (seed, level, stars) => { if (seed === null) localStorage.removeItem(K); else localStorage.setItem(K, seed);
    let threw = null; try { mgSaveStars(level, stars); } catch (e) { threw = String(e); }
    return { raw: localStorage.getItem(K), threw }; };
  const out = { backup: backup };
  out.nullStr = run('null', 4, 3); out.primitive = run('7', 4, 3);
  out.keepOther = run('{"1":3,"2":2,"5":1}', 3, 2); out.noDown = run('{"1":3}', 1, 1);
  if (backup === null) localStorage.removeItem(K); else localStorage.setItem(K, backup);
  out.restored = localStorage.getItem(K) === backup;
  return out;
})()`);
await sleep(500);
const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('e:/mathgame/mathgame/.shots/device_l4_doors.png', Buffer.from(shot.data, 'base64'));

let fail = 0;
const P = (ok, label, extra) => { console.log((ok ? 'PASS ' : 'FAIL ') + label + (extra != null ? '  ' + extra : '')); if (!ok) fail++; };
console.log('\nDOORS ' + JSON.stringify(d));
console.log('STARS ' + JSON.stringify(s));
console.log('\n===== DEVICE (' + d.ua + ', canvas ' + d.W + 'x' + d.H + ' dpr' + d.dpr + ') =====');
P(d.n === 4 && d.left >= 0 && d.right <= d.W, '4 道门在画布内', 'left=' + d.left + ' right=' + d.right + ' W=' + d.W);
P(Math.abs(d.doorW - 140) < 0.01 && Math.abs(d.gap - 36) < 0.01, '真机几何与修复前一致：doorW=140 gap=36', d.doorW + '/' + d.gap);
P(d.rafAlive, 'rAF 循环还活着（canvas 真在画）');
P(d.doorPx !== '0,0,0,0' && d.doorPx.split(',')[3] !== '0', '门中心像素已绘制（CDP 截图里 canvas 黑是已知现象）', d.doorPx);
P(!d.errBanner, '没有弹 #mg-err-banner');
P(!s.nullStr.threw && s.nullStr.raw === '{"4":3}', 'Chrome 91: "null" 坏值不抛、当空表重开', JSON.stringify(s.nullStr));
P(!s.primitive.threw && s.primitive.raw === '{"4":3}', 'Chrome 91: "7" 非对象坏值也能真的存进去', JSON.stringify(s.primitive));
P(JSON.stringify(JSON.parse(s.keepOther.raw)) === JSON.stringify({ 1: 3, 2: 2, 3: 2, 5: 1 }), '正常表：其他关星星一个不少', s.keepOther.raw);
P(s.noDown.raw === '{"1":3}', '低分不覆盖高分', s.noDown.raw);
P(s.restored, '设备上真实星星数据已还原', s.backup === null ? '(none)' : s.backup);
console.log('\nshot: .shots/device_l4_doors.png');
console.log('===== ' + (fail === 0 ? 'ALL PASS' : fail + ' FAILURE(S)') + ' =====');
ws.close();
process.exit(fail === 0 ? 0 : 1);
