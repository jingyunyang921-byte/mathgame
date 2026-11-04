// 验证 L6 Boss 受击只染龙身、不染背景（修 source-atop 把背景一起染的 bug）。
// 本地 Chrome CDP :9333，服务器 :8000。抓两帧：正常 / 强制受击，肉眼看背景有没有变色方块。
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

await send('Page.navigate', { url: BASE }, sessionId); await sleep(250);
await ev(`sessionStorage.setItem('gameLevel','6');sessionStorage.setItem('gameMode','visual');sessionStorage.removeItem('mgSprint');window.__err=null;addEventListener('error',e=>window.__err=String(e.message));`);
await send('Page.reload', {}, sessionId);
for (let t = 0; t < 30; t++) { await sleep(250); if (await ev(`!!window._currentGame`)) break; }
for (let t = 0; t < 16; t++) { await sleep(250); if (!(await ev(`(()=>{const b=document.getElementById('mg-countdown-badge');return b&&getComputedStyle(b).display!=='none';})()`))) break; }
await ev(`(()=>{const g=window._currentGame; if(g){g._countdownActive=false; g.locked=false;} return 1;})()`);
await sleep(500);
console.log('battleReady:', await ev(`!!(window._currentGame && window._currentGame._drawMonster)`));
console.log('tintCanvasField:', await ev(`'_monTintCanvas' in (window._currentGame||{})`));
await shot('monhit_normal');
// 强制受击：直接设 monsterHitEnd，让 rAF 下几帧走 hitFlash 分支
await ev(`(()=>{const g=window._currentGame; g.monsterHitEnd = g.frameCount + 16; return g.frameCount;})()`);
await sleep(120);
await shot('monhit_flash');
// 再抓一帧确认闪红窗口内
await ev(`(()=>{const g=window._currentGame; g.monsterHitEnd = g.frameCount + 16; return 1;})()`);
await sleep(60);
await shot('monhit_flash2');
console.log('err:', await ev('window.__err'));
console.log('截图: ' + OUT + '/monhit_normal.png / monhit_flash.png / monhit_flash2.png');
ws.close(); process.exit(0);
