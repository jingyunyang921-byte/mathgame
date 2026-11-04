// 验证 L5「扬帆寻宝岛」换皮：SpaceGame 由太空穿越 → 跨海群岛帆船。
// 只换皮，不动出题/判题/选门逻辑。本地 Chrome CDP :9333，静态服务器 :8000。
import { writeFileSync, mkdirSync } from 'fs';
const CDP = 'http://localhost:9333', BASE = 'http://localhost:8000/www/game.html';
const OUT = '.shots/out';
try { mkdirSync(OUT, { recursive: true }); } catch (e) {}
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
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }, sessionId); writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64')); };
let fail = 0;
const P = (ok, l, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + (x != null ? '  ' + JSON.stringify(x) : '')); if (!ok) fail++; };

// 启动 L5（SpaceGame），跳过倒计时
await send('Page.navigate', { url: BASE }, sessionId); await sleep(250);
await ev(`window.__err=null;addEventListener('error',e=>window.__err=String(e.message));
  sessionStorage.setItem('gameLevel','5');sessionStorage.setItem('gameMode','visual');sessionStorage.removeItem('mgSprint');`);
await send('Page.reload', {}, sessionId);
for (let t = 0; t < 30; t++) { await sleep(250); if (await ev(`!!window._currentGame`)) break; }
for (let t = 0; t < 16; t++) { await sleep(250); if (!(await ev(`(()=>{const b=document.getElementById('mg-countdown-badge');return b&&getComputedStyle(b).display!=='none';})()`))) break; }
await ev(`(()=>{const g=window._currentGame; if(g){g._countdownActive=false; g.locked=false;} return 1;})()`);
await sleep(400);
// __SAIL_P2__
// A. 引擎就绪 + 换皮方法齐全（旧 _drawBlackHole 应已改名）
P(await ev(`!!(window._currentGame && window._currentGame._drawShip && window._currentGame._drawGoalIsland && window._currentGame._drawDoors)`), 'A SpaceGame 就绪(有 _drawShip/_drawGoalIsland/_drawDoors)');
P(await ev(`typeof window._currentGame._drawBlackHole === 'undefined'`), 'A 旧 _drawBlackHole 已移除(改名 _drawGoalIsland)');
P(await ev(`!!(window._currentGame._drawDistantIslands && window._currentGame._drawCloud && window._currentGame._drawGull)`), 'A 新海景辅助方法已定义(远岛/云/海鸥)');

// B. _initStars 产出海洋场景字段
const sea = await ev(`(()=>{const g=window._currentGame;return {stars:g.stars.length,clouds:(g.clouds||[]).length,gulls:(g.gulls||[]).length};})()`);
P(sea.stars === 90 && sea.clouds === 3 && sea.gulls === 3, 'B 海面波光90/云3/海鸥3', sea);

// C. 4 道海门就绪
P(await ev(`window._currentGame.choices.length === 4`), 'C 4 道海门', await ev(`window._currentGame.choices.length`));

// D. 答对 → 帆船前进文案 + 白色浪花粒子；逻辑不变（done 自增）
const d = await ev(`(()=>{
  const g=window._currentGame;
  g.locked=false; g.gameEnded=false;
  const before=g.done;
  const correct=g.choices.find(c=>c.value===g.currentAnswer);
  g._choose(correct);
  const fb=document.getElementById('space-feedback').textContent;
  const pc=(g.particles[0]||{}).color;
  return {fb, pc, before, after:g.done};
})()`);
P(/帆船前进/.test(d.fb), 'D 答对文案「帆船前进」', d.fb);
P(d.pc === '#FFFFFF' || d.pc === '#ffffff', 'D 浪花粒子为白色', d.pc);
P(d.after === d.before + 1, 'D 答对 done 自增(判题逻辑未变)', d);

// E. 画一帧不抛错（海景+帆船+海门+宝藏岛全路径跑通）
await ev(`(()=>{const g=window._currentGame; g.gameEnded=false; for(let i=0;i<3;i++) g._draw(); return 1;})()`);
await sleep(250);
await shot('sail_scene');

// F. 结算文案海洋化
await ev(`(()=>{
  const g=window._currentGame;
  g.gameEnded=false; g.done=10;
  g._endGame(true);
  return 1; })()`);
await sleep(2000);
const f = await ev(`(()=>{
  return {title:(document.getElementById('overlay-title')||{}).textContent,
          msg:(document.getElementById('overlay-msg')||{}).innerHTML,
          sub:(document.getElementById('overlay-sub')||{}).textContent};
})()`);
P(f.title === '第5关通关！', 'F 胜利标题「第5关通关！」', f.title);
P(/宝藏岛/.test(f.msg) && /海门/.test(f.msg), 'F 胜利文案合并成一行（宝藏岛+海门）', f.msg);
P(f.sub === '', 'F 副标题已归并，不再重复一段', f.sub);

P(!(await ev('window.__err')), '无 JS 错误', await ev('window.__err'));

console.log(fail === 0 ? '\n=== L5 扬帆寻宝岛 验证全过 ===' : `\n!!! ${fail} 项未过`);
console.log('截图: ' + OUT + '/sail_scene.png');
ws.close(); process.exit(fail === 0 ? 0 : 1);
