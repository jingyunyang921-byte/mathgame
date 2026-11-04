// 影子速度「按关卡固定」真机闸门 via :9222（Chrome 91 WebView / V8 9.1）。
// 本地 verify_shadow_speed 打桩量毫秒，证的是「接线对」；这里只守真机独有、91 上才会坏的事：
//   1) 固定表这段新代码在 V8 9.1 上整段活着（一句不被老引擎接受 → 所有函数 undefined，而不是报错）。
//   2) 影子真的在走：boot L4（最快关），真定时器跑几秒，monsterScore 要涨、又不能瞬间满格
//      （延迟算成 NaN/0 时 setInterval 在 91 上按 1ms 跑 → 一下满格）。
//   3) 设置里确实没有「影子速度」行（真机 WebView 渲染一遍）。
// 附带给 L1/L4 各截一张图，肉眼对比影子起步位置。
import { writeFileSync, mkdirSync } from 'fs';
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
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true });
  if (r.exceptionDetails) throw new Error('EVAL: ' + ((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text));
  return r.result.value;
};
await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__errs=[];window.addEventListener('error',function(e){try{window.__errs.push(String(e.message||e.error||e));}catch(_){}});` });
mkdirSync('.shots/out', { recursive: true });
let fail = 0; const P = (ok, l, x) => { console.log((ok ? '  PASS ' : '  FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
const EXPECT = { 1: 5400, 2: 4800, 3: 4200, 4: 3600 };

async function boot(lv, mode) {
  await ev(`sessionStorage.setItem('gameLevel','${lv}');sessionStorage.setItem('gameMode','${mode}');location.href='game.html';`);
  await sleep(1800);
  await ev(`window._skipOcrLoading && window._skipOcrLoading();`);
  for (let i = 0; i < 30; i++) { if (await ev(`!!window._currentGame`)) { await sleep(800); return true; } await sleep(400); }
  return false;
}

// ======== 1. 固定表这段在 Chrome 91 上整段活着 ========
console.log('\n######## 1. 固定表新代码在 Chrome 91 上整段活着 ########');
P(await boot(1, 'visual'), 'L1 已构造');
const apis = await ev(`(() => {
  const okFn = typeof window.mgMonsterSpeed === 'function';
  const gone = ['mgReadPace','mgUpdatePace','mgPaceK','mgSpeedTier'].filter(n => typeof window[n] !== 'undefined');
  return { okFn, gone, errs: window.__errs || [], v8: (navigator.userAgent.match(/Chrome\\/[\\d.]+/) || ['?'])[0] };
})()`);
P(apis.okFn, 'mgMonsterSpeed 可调用', apis.v8);
P(apis.gone.length === 0, '旧调速函数(mgReadPace/mgUpdatePace/mgPaceK/mgSpeedTier)都已不在', JSON.stringify(apis.gone));
P(apis.errs.length === 0, '载入期无 JS 错误', JSON.stringify(apis.errs));

// ======== 2. 四关固定值在真机上算得对 ========
console.log('\n######## 2. 四关固定值在真机上算得对 ########');
const vals = await ev(`[mgMonsterSpeed(1),mgMonsterSpeed(2),mgMonsterSpeed(3),mgMonsterSpeed(4)]`);
for (const lv of [1, 2, 3, 4]) P(vals[lv - 1] === EXPECT[lv], `L${lv} = ${EXPECT[lv]}`, String(vals[lv - 1]));
P(vals[0] > vals[1] && vals[1] > vals[2] && vals[2] > vals[3], '单调递减（关越难影子越快）', JSON.stringify(vals));
P(await ev(`mgMonsterSpeed(9) === 4200 && mgMonsterSpeed(2, 99) === 4800`), '越界兜底 4200 / 第二参被忽略');

// ======== 3. 影子真的在走（真定时器，不打桩，用 L4 最快关） ========
console.log('\n######## 3. 影子真的在走（真定时器，L4 最快关） ########');
const MOVE = `(() => { const g = window._currentGame;
  return { pos: g.monsterScore !== undefined ? g.monsterScore : g.monsterStep,
    engine: g.constructor.name, lv: g.level, ended: !!g.gameEnded, errs: window.__errs || [] }; })()`;
P(await boot(4, 'visual'), 'L4 已构造');
const a = await ev(MOVE);
P(a.engine === 'RaceGame' && a.lv === 4, '引擎/关号对得上', a.engine + ' lv=' + a.lv);
await ev(`(() => { const g = window._currentGame; clearInterval(g.monsterTimer); g._startMonster(); return 1; })()`);
await sleep(8200);
const b = await ev(MOVE);
P(b.pos > a.pos, '影子真的往前走了（不是站着不动）', a.pos + ' → ' + b.pos);
P(b.pos - a.pos <= 6, '也没瞬间满格（延迟不是 NaN/0）', '8.2s 走了 ' + (b.pos - a.pos) + ' 格');
P(b.errs.length === 0, '无 JS 错误', JSON.stringify(b.errs));
const shot4 = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('.shots/out/device_shadow_L4.png', Buffer.from(shot4.data, 'base64'));

// ======== 4. L1 截图（最慢关，肉眼对比起步） ========
P(await boot(1, 'visual'), 'L1 已构造（截图用）');
const shot1 = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('.shots/out/device_shadow_L1.png', Buffer.from(shot1.data, 'base64'));

// ======== 5. 真机设置里没有「影子速度」行 ========
console.log('\n######## 5. 真机设置里没有「影子速度」行 ########');
await ev(`location.href='index.html';`); await sleep(1800);
for (let t = 0; t < 30; t++) { if (await ev(`typeof window.showSettings === 'function'`)) break; await sleep(300); }
await ev(`showSettings();`); await sleep(400);
const st = await ev(`(() => { const m = document.getElementById('settingsModal');
  const txt = m ? m.textContent : '';
  return { open: !!m && m.classList.contains('show'), noCtrl: !document.getElementById('setMSpeed'),
    noShadowSpeed: txt.indexOf('影子速度') === -1, noMonster: txt.indexOf('怪兽') === -1,
    errs: window.__errs || [] }; })()`);
P(st.open, '设置弹窗打开', String(st.open));
P(st.noCtrl, '#setMSpeed 控件不存在');
P(st.noShadowSpeed, '设置文本无「影子速度」');
P(st.noMonster, '设置文本无「怪兽」');
const shotS = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('.shots/out/device_shadow_settings.png', Buffer.from(shotS.data, 'base64'));
P(st.errs.length === 0, '无 JS 错误', JSON.stringify(st.errs));

console.log('\n' + (fail === 0 ? '=== DEVICE SHADOW SPEED PASS ===' : '=== ' + fail + ' FAIL ==='));
ws.close(); process.exit(fail ? 1 : 0);
