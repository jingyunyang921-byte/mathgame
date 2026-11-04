// 验证「影子速度按关卡难度固定」：游戏页 mgMonsterSpeed(L1-L4) 是写死的固定表(单调递减/越界兜底)，
// 三引擎(Game/VoiceGame/RaceGame)的 _startMonster 真拿到那个固定值；旧的用户可调档 mgSpeedTier /
// mathgameSettings.mspeed、以及自适应配速 mgReadPace/mgUpdatePace 全部已去除。菜单页设置里不再有
// 「影子速度」行。本地 Chrome CDP :9333，静态服务器 :8000。
import { mkdirSync } from 'fs';
const CDP = 'http://localhost:9333', BASE = 'http://localhost:8000';
try { mkdirSync('.shots/out', { recursive: true }); } catch (e) {}
const ver = await (await fetch(CDP + '/json/version')).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p, s) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (s) msg.sessionId = s;
  return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify(msg)); }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
for (const d of ['Page', 'Runtime', 'Network']) await send(d + '.enable', {}, sessionId);
await send('Network.setCacheDisabled', { cacheDisabled: true }, sessionId);
await send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 576, deviceScaleFactor: 1, mobile: false }, sessionId);
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true }, sessionId);
  if (r.exceptionDetails) throw new Error('EVAL:' + ((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text)); return r.result.value; };
let fail = 0;
const ck = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fail++; };
const EXPECT = { 1: 5400, 2: 4800, 3: 4200, 4: 3600 };

// ===== A. 游戏页：mgMonsterSpeed 固定表 =====
await send('Page.navigate', { url: BASE + '/www/game.html' }, sessionId); await sleep(250);
await ev(`sessionStorage.setItem('gameLevel','2');sessionStorage.setItem('gameMode','visual');window.__err=null;addEventListener('error',e=>window.__err=String(e.message));`);
await send('Page.reload', {}, sessionId);
for (let t = 0; t < 30; t++) { await sleep(200); if (await ev(`typeof window.mgMonsterSpeed==='function'`)) break; }
ck('A 全局函数就绪', await ev(`typeof window.mgMonsterSpeed==='function' && typeof window.mgSettings==='function'`));
for (const lv of [1, 2, 3, 4]) {
  const got = await ev(`mgMonsterSpeed(${lv})`);
  ck(`A L${lv} 固定 = ${EXPECT[lv]}`, got === EXPECT[lv], { got });
}
const seq = await ev(`[mgMonsterSpeed(1),mgMonsterSpeed(2),mgMonsterSpeed(3),mgMonsterSpeed(4)]`);
ck('A 单调递减 L1>L2>L3>L4（关越难影子越快）', seq[0] > seq[1] && seq[1] > seq[2] && seq[2] > seq[3], seq);
ck('A 越界关号兜底 4200', await ev(`mgMonsterSpeed(9)===4200 && mgMonsterSpeed(0)===4200`));
ck('A 第二参数被忽略（只认 level）', await ev(`mgMonsterSpeed(2, 99)===4800 && mgMonsterSpeed(2)===4800`));
ck('A 旧可调档 mgSpeedTier 已删', await ev(`typeof window.mgSpeedTier==='undefined' && typeof mgSpeedTier==='undefined'`));
ck('A mgSettings 无 mspeed 字段', await ev(`!('mspeed' in mgSettings())`), { s: await ev(`JSON.stringify(mgSettings())`) });
ck('A 写 mspeed 也不改速度', await ev(`(()=>{const s=JSON.parse(localStorage.getItem('mathgameSettings')||'{}');s.mspeed=0;localStorage.setItem('mathgameSettings',JSON.stringify(s));return mgMonsterSpeed(2);})()`) === 4800);
ck('A 自适应配速函数已删', await ev(`typeof window.mgReadPace==='undefined' && typeof window.mgUpdatePace==='undefined'`));
ck('A 无 JS 错误', !(await ev('window.__err')), { err: await ev('window.__err') });

// ===== B. 三引擎 _startMonster 真拿到那个固定值（防「常量对了但没用它」）=====
const PROBE = `(() => {
  const g = window._currentGame;
  document.body.classList.remove('mg-calm');   // L1-L3 平静小画下 _startMonster 直接返回；这里测的是引擎一旦启动计时器拿到的速度
  clearInterval(g.monsterTimer);
  const oi = window.setInterval, ot = window.setTimeout; const seen = [];
  window.setInterval = function (f, d) { seen.push(d); return oi(function () {}, 1e7); };
  window.setTimeout = function (f, d) { seen.push(d); return ot(function () {}, 1e7); };
  try { g._startMonster(); } finally { window.setInterval = oi; window.setTimeout = ot; }
  clearInterval(g.monsterTimer);
  return { ms: seen.length === 1 ? seen[0] : seen, engine: g.constructor.name, lv: g.level, errs: window.__errs || [] };
})()`;
async function boot(lv, mode) {
  await send('Page.navigate', { url: BASE + '/index.html' }, sessionId); await sleep(400);
  await ev(`sessionStorage.setItem('gameLevel','${lv}');sessionStorage.setItem('gameMode','${mode}');`);
  await send('Page.reload', {}, sessionId); await sleep(900);
  await ev(`window.__errs=[];addEventListener('error',e=>window.__errs.push(String(e.message)));localStorage.removeItem('mathgameSettings');`);
  await ev(`window._skipOcrLoading && window._skipOcrLoading();`);
  for (let i = 0; i < 30; i++) { if (await ev(`!!window._currentGame`)) { await sleep(400); return true; } await sleep(400); }
  return false;
}
for (const [lv, mode, engine] of [[1, 'visual', 'Game'], [2, 'visual', 'Game'], [3, 'audio', 'VoiceGame']]) {
  ck(`B L${lv} ${engine} 已构造`, await boot(lv, mode));
  const r = await ev(PROBE);
  ck(`B L${lv} 引擎/关号对得上`, r.engine === engine && r.lv === lv, { engine: r.engine, lv: r.lv });
  ck(`B L${lv} 定时器拿到固定值 ${EXPECT[lv]}`, r.ms === EXPECT[lv], { ms: r.ms });
  ck(`B L${lv} 无 JS 错误`, (r.errs || []).length === 0, r.errs);
}
// L4 并肩上山不是比赛：RaceGame 里没有小鹿的计时器（表里的 L4 值只留给 mgMonsterSpeed 的单调性）
ck('B L4 RaceGame 已构造', await boot(4, 'visual'));
ck('B L4 RaceGame 没有 _startMonster/monsterTimer', await ev(`(() => { const g = window._currentGame; return g.constructor.name === 'RaceGame' && typeof g._startMonster === 'undefined' && g.monsterTimer === undefined; })()`));

// ===== C. 菜单页：设置里不再有「影子速度」行 =====
await send('Page.navigate', { url: BASE + '/www/index.html' }, sessionId); await sleep(250);
await ev(`localStorage.setItem('mathgameSettings','{}');window.__err=null;addEventListener('error',e=>window.__err=String(e.message));`);
await send('Page.reload', {}, sessionId);
for (let t = 0; t < 30; t++) { await sleep(200); if (await ev(`typeof window.showSettings==='function'`)) break; }
await ev(`showSettings()`); await sleep(200);
ck('C #setMSpeed 控件不存在', await ev(`!document.getElementById('setMSpeed')`));
const sm = await ev(`(()=>{const m=document.getElementById('settingsModal');return m?m.textContent:'';})()`);
ck('C 设置文本无「影子速度」', sm.indexOf('影子速度') === -1, { snippet: sm.replace(/\s+/g, '').slice(0, 60) });
ck('C 设置文本无「怪兽」', sm.indexOf('怪兽') === -1);
ck('C getSettings 结果无 mspeed', await ev(`!('mspeed' in getSettings())`), { s: await ev(`JSON.stringify(getSettings())`) });
ck('C 菜单无 JS 错误', !(await ev('window.__err')), { err: await ev('window.__err') });

console.log(fail === 0 ? '\n===== SHADOW SPEED PASS =====' : `\n!!! ${fail} 项未过`);
ws.close(); process.exit(fail === 0 ? 0 : 1);
