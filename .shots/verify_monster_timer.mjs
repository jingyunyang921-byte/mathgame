// 验证怪兽计时根因修复：换题不再清零怪兽计时（旧 bug：答得比一步快的孩子每题重置 setInterval→怪兽卡第一格）。
// Game 引擎(L2 视算)：A 换题不重置 monsterTimer；B 高频换题下怪兽仍按步前进。本地 CDP :9333 / :8000。
import { mkdirSync } from 'fs';
const CDP = 'http://localhost:9333', BASE = 'http://localhost:8000/www/game.html';
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
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, userGesture: true }, sessionId);
  if (r.exceptionDetails) throw new Error('EVAL:' + ((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text)); return r.result.value; };
let fail = 0; const P = (ok, l, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + (x != null ? '  ' + JSON.stringify(x) : '')); if (!ok) fail++; };

// 启动 L2 视算（Game 引擎），跳过倒计时
await send('Page.navigate', { url: BASE }, sessionId); await sleep(250);
await ev(`window.__err=null;addEventListener('error',e=>window.__err=String(e.message));
  sessionStorage.setItem('gameLevel','2');sessionStorage.setItem('gameMode','visual');sessionStorage.removeItem('mgSprint');`);
await send('Page.reload', {}, sessionId);
for (let t = 0; t < 25; t++) { await sleep(250); if (await ev(`!!window._currentGame`)) break; }
for (let t = 0; t < 16; t++) { await sleep(250); if (!(await ev(`(()=>{const b=document.getElementById('mg-countdown-badge');return b&&getComputedStyle(b).display!=='none';})()`))) break; }
await ev(`(()=>{const g=window._currentGame; if(g){g._countdownActive=false; g.locked=false;} return 1;})()`);
await sleep(300);
P(await ev(`!!(window._currentGame && window._currentGame._startMonster && 'monsterScore' in window._currentGame)`), 'Game 引擎就绪(有 _startMonster/monsterScore)');

// L1-L3 现在是平静小画（body.mg-calm 下 _startMonster 直接返回）；本闸门测的是引擎自己的计时器（速算/将来复用时仍在用），所以先摘掉 mg-calm。
await ev(`document.body.classList.remove('mg-calm'); true`);

// A. 换题不重置 monsterTimer（速度调到极大，确保期间不触步，id 变化只可能来自重置）
const a = await ev(`(()=>{
  const g=window._currentGame;
  window.mgMonsterSpeed=()=>100000;
  g.gameEnded=false; g.monsterFinished=false; g.playerScore=0; g.monsterScore=0;
  g._startMonster();
  const id1=g.monsterTimer;
  g.nextQuestion();
  const id2=g.monsterTimer;
  clearInterval(g.monsterTimer);
  return {id1:String(id1), id2:String(id2), same:id1===id2};
})()`);
P(a.same, 'A 换题后 monsterTimer 不变(旧版会 clearInterval+重启→变)', a);

// B. 高频换题(每 40ms)下怪兽按步前进：步长 150ms，窗口 ~900ms 应走 ~5 步。
//    旧逻辑：每次 nextQuestion 清零 150ms 计时，40ms<150ms → 永远不触发，monsterScore 卡 0。
await ev(`(()=>{
  const g=window._currentGame;
  window.mgMonsterSpeed=()=>150;
  g.gameEnded=false; g.monsterFinished=false; g.playerScore=0; g.monsterScore=0;
  g._startMonster();
  window.__spam=setInterval(()=>{ if(!g.gameEnded && g.monsterScore<9) g.nextQuestion(); },40);
  return 1;
})()`);
await sleep(950);
const b = await ev(`(()=>{
  clearInterval(window.__spam);
  const g=window._currentGame;
  const sc=g.monsterScore;
  clearInterval(g.monsterTimer); g.gameEnded=true;
  return {sc};
})()`);
P(b.sc >= 4, 'B 高频换题下怪兽仍前进(monsterScore≥4，旧版=0)', b);
P(!(await ev('window.__err')), '无 JS 错误', await ev('window.__err'));

console.log(fail === 0 ? '\n=== 怪兽计时根因修复 验证全过 ===' : `\n!!! ${fail} 项未过`);
ws.close(); process.exit(fail === 0 ? 0 : 1);

