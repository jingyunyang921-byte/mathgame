// verify_bugfix_batch.mjs — 验证「依此修复」批次
// P1-1 mgSaveBest 坏值守卫 / P1-2 结算先解锁+容错 / P2-1 循环启动器幂等 / P3 getStars 数组守卫 / 迁移幂等
// Needs: headless Chrome --remote-debugging-port=9333 + http.server :8000 in e:/mathgame/mathgame.
import { readFileSync } from 'node:fs';
const BROWSER = 'http://localhost:9333';
const GAME = 'http://localhost:8000/index.html';
const MENU = 'http://localhost:8000/menu.html';

let fail = 0;
const P = (ok, label, extra) => { console.log((ok ? 'PASS ' : 'FAIL ') + label + (extra != null ? '  ' + extra : '')); if (!ok) fail++; };

// ---------- 静态源码检查（5 个启动器 + 3 处结算重排 + 守卫） ----------
const src = readFileSync('index.html', 'utf8');
const menuSrc = readFileSync('menu.html', 'utf8');
console.log('===== 静态源码检查 =====');
P(/_startLoop\(\)\s*\{\s*cancelAnimationFrame\(this\.rafId\)/.test(src), 'SpaceGame._startLoop 先 cancelAnimationFrame');
P((src.match(/_startMonster\(\)\s*\{(?:\s*\/\/[^\n]*)*\s*clearInterval\(this\.monsterTimer\)/g) || []).length === 2, 'Game/Voice._startMonster 先 clearInterval(2处，注释行不算)');
P(/_startCountdown\(\)\s*\{\s*clearInterval\(this\.countdownInterval\)/.test(src), 'BattleGame._startCountdown 先 clearInterval');
P(/_runArena\(\)\s*\{\s*cancelAnimationFrame\(this\.arenaAnim\)/.test(src), 'BattleGame._runArena 先 cancelAnimationFrame');
const snapN = (src.match(/let snap = null;/g) || []).length;
P(snapN >= 4, '≥4 处结算用 try 包 mgFinishRound(Game/Race/Voice/Space)', '实际 ' + snapN);
P((src.match(/if \(!o \|\| typeof o !== 'object' \|\| Array\.isArray\(o\)\) o = \{\};/g) || []).length >= 2, 'mgSaveStars/mgSaveBest 均有坏值守卫');
P(/_drawHedgehog\(ctx, cx, baseY, size\) \{[\s\S]{0,700}?if \(im\.complete && im\.naturalWidth\) ctx\.drawImage\(im,/.test(src), '_drawHedgehog 有 complete&&naturalWidth 守卫');
P(/localStorage\.setItem\('mathgameLevelsVer', '2'\);[\s\S]{0,120}?for \(const \[k, v\] of writes\)/.test(menuSrc), 'menu 迁移：先置版本标记后落盘');
P(/return \(o && typeof o === 'object' && !Array\.isArray\(o\)\) \? o : \{\};/.test(menuSrc), 'menu getStars 有 !Array.isArray 守卫');

// ---------- CDP 启动 ----------
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

// ---------- 载入关4（RaceGame）：验 P1-1 / P2-1 / P1-2 ----------
await metrics(1000, 615);
let nav = waitEvent(m => m.method === 'Page.loadEventFired' && m.sessionId === sessionId);
await send('Page.navigate', { url: GAME }, sessionId);
await nav;
await ev(`sessionStorage.setItem('gameLevel','4');sessionStorage.setItem('gameMode','normal');window.__err=null;addEventListener('error',e=>window.__err=String(e.message&&e.message||e));`);
await send('Page.reload', {}, sessionId);
let ready = false;
for (let i = 0; i < 50 && !ready; i++) { await sleep(500); try { ready = await ev(`!!(window._currentGame && window._currentGame.level === 4)`); } catch (e) {} }
if (!ready) { console.log('FAIL: RaceGame 没起来'); await send('Target.closeTarget', { targetId }); ws.close(); process.exit(1); }

console.log('\n===== P1-1 mgSaveBest 坏值守卫 =====');
const b = await ev(`(() => {
  const K='mathgameBest'; const backup=localStorage.getItem(K);
  const run=(seed)=>{ if(seed===null)localStorage.removeItem(K); else localStorage.setItem(K,seed);
    let threw=null; try{ mgSaveBest(4,30,5); }catch(e){ threw=String(e); }
    return { raw: localStorage.getItem(K), threw }; };
  const out={ fnType: typeof mgSaveBest };
  out.badJson=run('{bad'); out.nullStr=run('null'); out.primitive=run('7'); out.arr=run('[1,2,3]');
  out.keepOther=run('{"2":{"t":12,"s":3}}');
  if(backup===null)localStorage.removeItem(K); else localStorage.setItem(K,backup);
  out.restored=localStorage.getItem(K)===backup; return out;
})()`);
console.log(JSON.stringify(b));
P(b.fnType === 'function', 'mgSaveBest 可达');
P(Object.keys(b).filter(k => b[k] && b[k].threw).length === 0, '五种输入全不抛', JSON.stringify(Object.keys(b).filter(k=>b[k]&&b[k].threw)));
P(b.badJson.raw === '{"4":{"t":30,"s":5}}', '坏 JSON → 当空表重开并写入', b.badJson.raw);
P(b.arr.raw === '{"4":{"t":30,"s":5}}', '数组 → 当空表重开（不往数组挂属性）', b.arr.raw);
P(b.primitive.raw === '{"4":{"t":30,"s":5}}', '原始量 7 → 当空表重开', b.primitive.raw);
P(JSON.stringify(JSON.parse(b.keepOther.raw)) === JSON.stringify({2:{t:12,s:3},4:{t:30,s:5}}), '正常表：只加本关，别关不丢', b.keepOther.raw);
P(b.restored, '测试后 mathgameBest 已还原');

console.log('\n===== P2-1 _startMonster 幂等（VoiceGame 原型；关4 RaceGame 已无怪兽计时） =====');
const im = await ev(`(() => {
  const g={ level:4, gameEnded:true, monsterTimer:null, _startMonster: VoiceGame.prototype._startMonster };
  const _si=window.setInterval,_ci=window.clearInterval; const live=new Set();
  window.setInterval=function(){const id=_si.apply(window,arguments);live.add(id);return id;};
  window.clearInterval=function(id){live.delete(id);return _ci.call(window,id);};
  const before=live.size; g._startMonster(); const after1=live.size; g._startMonster(); const after2=live.size;
  clearInterval(g.monsterTimer); window.setInterval=_si; window.clearInterval=_ci;
  return { d1: after1-before, d2: after2-after1 };
})()`);
console.log(JSON.stringify(im));
P(im.d1 === 1, '首次 _startMonster 建 1 个计时器', 'Δ='+im.d1);
P(im.d2 === 0, '再次 _startMonster 净增 0（旧实现会 +1 叠计时器）', 'Δ='+im.d2);

console.log('\n===== P1-2 结算先解锁+容错（关4 RaceGame） =====');
const ov = await ev(`(() => {
  const g=window._currentGame; g.gameEnded=false;
  localStorage.setItem('mathgameMaxCompletedLevel','0');
  const el=document.getElementById('overlay'); el.classList.remove('show');
  const _orig=window.mgFinishRound; window.mgFinishRound=function(){ throw new Error('boom-stats'); };
  window.__err=null; let threw=null;
  try { g._showOverlay(true); } catch(e){ threw=String(e.message||e); }
  window.mgFinishRound=_orig;
  return { threw, uncaught: window.__err, unlocked: localStorage.getItem('mathgameMaxCompletedLevel'), shown: el.classList.contains('show') };
})()`);
console.log(JSON.stringify(ov));
P(ov.threw === null, 'mgFinishRound 抛错时 _showOverlay 不外抛', ov.threw);
P(ov.unlocked === '4', '统计抛错也先把解锁写进去了（关4→maxCompleted=4）', ov.unlocked);
P(ov.shown === true, '结算遮罩照常显示（.show）');

// ---------- 载入 menu.html：验 P3 getStars ----------
console.log('\n===== P3 getStars 数组守卫（menu） =====');
nav = waitEvent(m => m.method === 'Page.loadEventFired' && m.sessionId === sessionId);
await send('Page.navigate', { url: MENU }, sessionId);
await nav; await sleep(400);
const gs = await ev(`(() => {
  const K='mathgameStars'; const backup=localStorage.getItem(K);
  const run=(seed)=>{ if(seed===null)localStorage.removeItem(K); else localStorage.setItem(K,seed);
    let v=null,threw=null; try{ v=getStars(); }catch(e){ threw=String(e); }
    return { isArr: Array.isArray(v), json: JSON.stringify(v), threw }; };
  const out={ fnType: typeof getStars };
  out.arr=run('[1,2,3]'); out.primitive=run('7'); out.ok=run('{"1":3,"2":2}'); out.bad=run('{bad');
  if(backup===null)localStorage.removeItem(K); else localStorage.setItem(K,backup);
  return out;
})()`);
console.log(JSON.stringify(gs));
P(gs.fnType === 'function', 'getStars 可达');
P(gs.arr.isArr === false && gs.arr.json === '{}', '数组 → 返回 {}（旧实现返回数组→getLevelStars 全 0）', gs.arr.json);
P(gs.primitive.json === '{}', '原始量 → 返回 {}', gs.primitive.json);
P(gs.ok.json !== '{}' && !gs.ok.isArr, '正常对象原样返回', gs.ok.json);
P(gs.bad.json === '{}', '坏 JSON → 返回 {}', gs.bad.json);

console.log('\n===== ' + (fail === 0 ? 'ALL PASS' : fail + ' FAILURE(S)') + ' =====');
await send('Target.closeTarget', { targetId });
ws.close();
process.exit(fail === 0 ? 0 : 1);

