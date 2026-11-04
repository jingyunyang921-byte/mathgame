// P3-14（关4 四道门窄屏溢出）+ P3-12（mgSaveStars 坏值覆盖整表）修复验证。
// 门的几何在一次页面加载里切多个视口宽度反复量（_resize + _genChoices），不重复开页。
// Needs: headless Chrome --remote-debugging-port=9333 + http.server :8000 in e:/mathgame/mathgame.
const BROWSER = 'http://localhost:9333';
const URL = 'http://localhost:8000/index.html';

const ver = await (await fetch(BROWSER + '/json/version')).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let _id = 0; const pending = new Map(); const waiters = [];
ws.onmessage = e => { const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  else if (m.method) { for (let i = waiters.length - 1; i >= 0; i--) if (waiters[i].pred(m)) waiters.splice(i, 1)[0].res(m); } };
const send = (method, params, sessionId) => { const id = ++_id; const msg = { id, method, params: params || {} }; if (sessionId) msg.sessionId = sessionId;
  return new Promise((res, rej) => { pending.set(id, m => m.error ? rej(new Error(method + ':' + JSON.stringify(m.error))) : res(m.result)); ws.send(JSON.stringify(msg)); }); };
const waitEvent = (pred, ms = 15000) => new Promise((res, rej) => { const w = { pred, res }; waiters.push(w); setTimeout(() => { const i = waiters.indexOf(w); if (i >= 0) { waiters.splice(i, 1); rej(new Error('timeout')); } }, ms); });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);
const metrics = (w, h) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false }, sessionId);
const ev = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId)).result.value;

await metrics(1000, 615);
const nav = waitEvent(m => m.method === 'Page.loadEventFired' && m.sessionId === sessionId);
await send('Page.navigate', { url: URL }, sessionId);
await nav;
// 关5（SpaceGame，六关编号后是 L5）normal 模式
await ev(`sessionStorage.setItem('gameLevel','5');sessionStorage.setItem('gameMode','normal');window.__err=null;addEventListener('error',e=>window.__err=String(e.message));`);
await send('Page.reload', {}, sessionId);
let ready = false;
for (let i = 0; i < 40 && !ready; i++) { await sleep(500); try { ready = await ev(`!!(window._currentGame && window._currentGame.choices && window._currentGame.choices.length === 4)`); } catch (e) {} }
if (!ready) { console.log('FAIL: SpaceGame 没起来'); process.exit(1); }

// ---- P3-14: 多个宽度下量门的几何 ----
const PROBE_DOORS = `(() => {
  const g = window._currentGame;
  g._resize(); g._genChoices(7);
  const W = g.canvas.width, c = g.choices;
  const left = Math.min(...c.map(d => d.x)), right = Math.max(...c.map(d => d.x + d.w));
  // 旧公式（修复前）同宽下的总宽，用来证明这些宽度确实曾经溢出
  const oldW = Math.min(W * 0.21, 140) * 4 + Math.min(W * 0.08, 36) * 3;
  return { W, iw: innerWidth, doorW: +c[0].w.toFixed(2), gap: +(c[1].x - c[0].x - c[0].w).toFixed(2),
    left: +left.toFixed(2), right: +right.toFixed(2), fits: left >= 0 && right <= W,
    oldOver: +(oldW - W).toFixed(2), n: c.length, err: window.__err || null };
})()`;
const WIDTHS = [1000, 900, 800, 700, 668, 667, 600, 500, 450, 412, 360, 320];
const doors = [];
for (const w of WIDTHS) {
  await metrics(w, w < 500 ? 915 : 576);
  await sleep(260);
  doors.push(await ev(PROBE_DOORS));
}
await metrics(1000, 615);
await sleep(200);

// ---- P3-12: mgSaveStars 对坏值的处理 ----
const PROBE_STARS = `(() => {
  const K = 'mathgameStars';
  const backup = localStorage.getItem(K);
  const run = (seed, level, stars) => {
    if (seed === null) localStorage.removeItem(K); else localStorage.setItem(K, seed);
    let threw = null;
    try { mgSaveStars(level, stars); } catch (e) { threw = String(e); }
    return { raw: localStorage.getItem(K), threw };
  };
  const out = { fnType: typeof mgSaveStars };
  out.badJson   = run('{not json', 4, 3);          // JSON.parse 抛
  out.nullStr   = run('null', 4, 3);               // 旧代码在 o[level] 上抛 → catch 清表
  out.primitive = run('7', 4, 3);                  // 能 parse 但不是对象：旧代码静默不存
  out.arr       = run('[1,2,3]', 4, 3);            // 数组也当空表重开
  out.keepOther = run('{"1":3,"2":2,"5":1}', 3, 2);// 正常表：别碰其他关
  out.noDown    = run('{"1":3}', 1, 1);            // 低分不覆盖高分
  out.falsy     = run('{"1":3}', 0, 3);            // level 为 0 → 不写
  if (backup === null) localStorage.removeItem(K); else localStorage.setItem(K, backup);
  out.restored = localStorage.getItem(K) === backup;
  return out;
})()`;
const s = await ev(PROBE_STARS);

let fail = 0;
const P = (ok, label, extra) => { console.log((ok ? 'PASS ' : 'FAIL ') + label + (extra != null ? '  ' + extra : '')); if (!ok) fail++; };
console.log('===== P3-14 四道门几何 =====');
console.log('  W   doorW   gap    left   right  fits  旧公式超出');
for (const d of doors) console.log(
  String(d.W).padStart(5) + String(d.doorW).padStart(8) + String(d.gap).padStart(7) +
  String(d.left).padStart(8) + String(d.right).padStart(8) + String(d.fits).padStart(7) +
  String(d.oldOver > 0 ? '+' + d.oldOver : d.oldOver).padStart(10));
const wide = doors.find(d => d.W >= 990), narrow = doors.filter(d => d.oldOver > 0);
console.log('\n===== VERDICTS =====');
P(doors.every(d => !d.err), '关4 加载 + 多次 _genChoices 无 JS 错误', JSON.stringify(doors.map(d => d.err).filter(Boolean)));
P(doors.every(d => d.n === 4), '每个宽度都还是 4 道门');
P(doors.every(d => d.fits), '所有宽度下 4 道门都在画布内（left≥0 且 right≤W）',
  JSON.stringify(doors.filter(d => !d.fits).map(d => d.W)));
P(doors.every(d => d.doorW > 0 && d.gap > 0), '门宽与间隙始终为正（没缩成负数/0）');
P(doors.every(d => Math.abs((d.W - d.right) - d.left) < 0.6), '仍然水平居中（左右留白相等）');
P(!!wide && Math.abs(wide.doorW - 140) < 0.01 && Math.abs(wide.gap - 36) < 0.01,
  '宽屏（真机 ~1000px）几何完全没变：doorW=140 gap=36', wide && wide.doorW + '/' + wide.gap);
P(narrow.length > 0 && narrow.every(d => d.fits), '曾经溢出的宽度现在都放得下了',
  '受影响宽度 ' + JSON.stringify(narrow.map(d => d.W)));
P(narrow.length > 0 && Math.max(...narrow.map(d => d.W)) >= 667, '溢出阈值确认在 ~668px（不是 ~360px）',
  '最宽的溢出点 W=' + (narrow.length ? Math.max(...narrow.map(d => d.W)) : '-'));
console.log('\n===== P3-12 mgSaveStars =====');
console.log(JSON.stringify(s, null, 1));
P(s.fnType === 'function', 'mgSaveStars 可达', s.fnType);
P(Object.keys(s).filter(k => s[k] && s[k].threw).length === 0, '七种输入全都不抛',
  JSON.stringify(Object.keys(s).filter(k => s[k] && s[k].threw)));
P(s.badJson.raw === '{"4":3}', '坏 JSON → 当空表重开并写入', s.badJson.raw);
P(s.nullStr.raw === '{"4":3}', '"null" → 当空表重开（旧代码会在这抛进 catch）', s.nullStr.raw);
P(s.primitive.raw === '{"4":3}', '"7" 这种能 parse 的非对象 → 真的存进去了（旧代码静默丢失）', s.primitive.raw);
P(s.arr.raw === '{"4":3}', '数组 → 当空表重开，不往数组上挂星星', s.arr.raw);
// 整数样的键 JSON.stringify 会按数值重排，别比字符串，比对象
P(JSON.stringify(JSON.parse(s.keepOther.raw)) === JSON.stringify({ 1: 3, 2: 2, 3: 2, 5: 1 }),
  '正常表：只加本关，其他关一个不少', s.keepOther.raw);
P(s.noDown.raw === '{"1":3}', '低分不覆盖已有高分', s.noDown.raw);
P(s.falsy.raw === '{"1":3}', 'level 为假值 → 一个字节都不写', s.falsy.raw);
P(s.restored, '测试结束后本机真实星星数据已还原');
console.log('\n===== ' + (fail === 0 ? 'ALL PASS' : fail + ' FAILURE(S)') + ' =====');
await send('Target.closeTarget', { targetId });
ws.close();
process.exit(fail === 0 ? 0 : 1);
