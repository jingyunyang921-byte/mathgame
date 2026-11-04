// 临时截图：听算 L1/L3/L4/L6 当前布局 (1000x576 与 412x915)
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
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, userGesture: true }, sessionId);
  if (r.exceptionDetails) throw new Error('EVAL:' + ((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text)); return r.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }, sessionId); writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64')); };
async function load(lv, w, h) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false }, sessionId);
  await send('Page.navigate', { url: BASE }, sessionId); await sleep(250);
  await ev(`window.__err=null;addEventListener('error',e=>window.__err=String(e.message));
    sessionStorage.setItem('gameLevel','${lv}');sessionStorage.setItem('gameMode','audio');sessionStorage.removeItem('mgSprint');`);
  await send('Page.reload', {}, sessionId);
  for (let t = 0; t < 25; t++) { await sleep(250); if (await ev(`!!window._currentGame`)) break; }
  for (let t = 0; t < 16; t++) { await sleep(250); if (!(await ev(`(()=>{const b=document.getElementById('mg-countdown-badge');return b&&getComputedStyle(b).display!=='none';})()`))) break; }
  await ev(`(()=>{const g=window._currentGame; if(g){g._countdownActive=false; g.locked=false;} const ov=document.getElementById('float-voice-overlay')||document.getElementById('voice-mic-area'); if(ov) ov.style.display='flex'; return 1;})()`);
  await sleep(500);
}
for (const [lv, w, h] of [[1, 1000, 576], [3, 1000, 576], [4, 1000, 576], [6, 1000, 576], [1, 412, 915], [6, 412, 915]]) {
  await load(lv, w, h);
  await shot(`now_L${lv}_${w}x${h}`);
  const info = await ev(`(()=>{const r=el=>{if(!el)return null;const b=el.getBoundingClientRect();return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height),bottom:Math.round(b.bottom)}};
    const bq=document.getElementById('battle-question-area');
    return {vw:innerWidth,vh:innerHeight,body:document.body.className,
      qsec:r(document.getElementById('question-section')),qcard:r(document.getElementById('question-card')),
      ov:r(document.getElementById('float-voice-overlay')),card:r(document.querySelector('#float-voice-overlay .mg-listen-card, #voice-mic-area .mg-listen-card')),
      skip:r(document.getElementById('mg-listen-skip')),bq:r(bq),battleCard:r(document.getElementById('battle-question-card')),
      ansSec:r(document.getElementById('answer-section')),voSec:r(document.getElementById('lv1-voice-section')||document.getElementById('voice-section'))};})()`);
  console.log('L' + lv, w + 'x' + h, JSON.stringify(info));
}
ws.close(); process.exit(0);
