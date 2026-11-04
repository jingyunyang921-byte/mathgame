// 诊断：抓听算模式各关当前真实布局 + 各音频容器可见性/矩形，供重排方案参考。
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
for (const d of ['Page', 'Runtime']) await send(d + '.enable', {}, sessionId);
await send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 576, deviceScaleFactor: 1, mobile: false }, sessionId);
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, userGesture: true }, sessionId); if (r.exceptionDetails) throw new Error('EVAL:' + ((r.exceptionDetails.exception||{}).description || r.exceptionDetails.text)); return r.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }, sessionId); writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64')); };

const RECT = `(()=>{const ids=['lv1-voice-section','voice-section','voice-mic-area','float-voice-overlay','float-voice-mic-btn','float-voice-status','float-voice-heard','answer-section','battle-question-area'];
  const out={}; for(const id of ids){const el=document.getElementById(id); if(!el){out[id]='(no node)';continue;} const cs=getComputedStyle(el); const r=el.getBoundingClientRect();
  out[id]={disp:cs.display,pos:cs.position,vis:cs.display!=='none'&&r.width>0&&r.height>0,rect:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]};} return out;})()`;

for (const lv of [1, 3, 4, 5, 6]) {
  await send('Page.navigate', { url: BASE }, sessionId); await sleep(250);
  await ev(`sessionStorage.setItem('gameLevel','${lv}');sessionStorage.setItem('gameMode','audio');sessionStorage.removeItem('mgSprint');`);
  await send('Page.reload', {}, sessionId);
  for (let t = 0; t < 25; t++) { await sleep(250); if (await ev(`!!window._currentGame`)) break; }
  for (let t = 0; t < 16; t++) { await sleep(250); if (!(await ev(`(()=>{const b=document.getElementById('mg-countdown-badge');return b&&getComputedStyle(b).display!=='none';})()`))) break; }
  await ev(`(()=>{const g=window._currentGame; if(g){g._countdownActive=false; g.locked=false;} return 1;})()`);
  await sleep(400);
  console.log(`\n===== L${lv} audio =====`);
  console.log(JSON.stringify(await ev(RECT), null, 0));
  await shot(`cur_audio_L${lv}`);
}
console.log('\nshots: cur_audio_L*.png');
ws.close(); process.exit(0);
