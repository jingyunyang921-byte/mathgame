// 真机高屏(1920×1200，非短横屏档)下给 L4/L6 听算卡台截图并量「卡台 vs 题卡 vs 屏幕」纵向位置，
// 验证「别贴屏幕底」改动(top:62% 纵向居中)。本地 Chrome CDP :9333，服务器 :8000。
import { writeFileSync, mkdirSync } from 'fs';
const CDP = 'http://localhost:9333', BASE = 'http://localhost:8000/www/game.html';
const OUT = '.shots/out';
try { mkdirSync(OUT, { recursive: true }); } catch (e) {}
const W = 1920, H = 1200;
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
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false }, sessionId);
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, userGesture: true }, sessionId);
  if (r.exceptionDetails) throw new Error('EVAL:' + ((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text)); return r.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }, sessionId); writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64')); };
async function load(lv) {
  await send('Page.navigate', { url: BASE }, sessionId); await sleep(250);
  await ev(`sessionStorage.setItem('gameLevel','${lv}');sessionStorage.setItem('gameMode','audio');sessionStorage.removeItem('mgSprint');`);
  await send('Page.reload', {}, sessionId);
  for (let t = 0; t < 25; t++) { await sleep(250); if (await ev(`!!window._currentGame`)) break; }
  for (let t = 0; t < 16; t++) { await sleep(250); if (!(await ev(`(()=>{const b=document.getElementById('mg-countdown-badge');return b&&getComputedStyle(b).display!=='none';})()`))) break; }
  await ev(`(()=>{const g=window._currentGame; if(g){g._countdownActive=false; g.locked=false;} return 1;})()`);
  await sleep(300);
}
const MEAS = `(()=>{
  const vis = el => { if(!el) return false; const cs=getComputedStyle(el); const r=el.getBoundingClientRect(); return cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0&&r.height>0; };
  const ov = document.getElementById('float-voice-overlay');
  const card = ov && ov.querySelector('.mg-listen-card');
  const qc = [document.getElementById('battle-question-card'), document.getElementById('question-card')].find(e=>e&&vis(e));
  const r = el => el ? (b=>({y:Math.round(b.y),bottom:Math.round(b.y+b.height),h:Math.round(b.height),x:Math.round(b.x),right:Math.round(b.x+b.width),w:Math.round(b.width)}))(el.getBoundingClientRect()) : null;
  return { vh: innerHeight, card: r(card), q: r(qc) };
})()`;
for (const [lv, label] of [[1, 'L1'], [3, 'L3'], [4, 'L4'], [6, 'L6']]) {
  await load(lv);
  await ev(`(()=>{const ov=document.getElementById('float-voice-overlay');if(ov){ov.classList.add(${lv === 6 ? "'battle-audio-mode'" : "'noop'"});ov.style.display='flex';}
    const btn=document.getElementById('float-voice-mic-btn');if(btn)btn.classList.add('listening');return 1;})()`);
  await sleep(300);
  const m = await ev(MEAS);
  const gapTop = m.card && m.q ? m.card.y - m.q.bottom : null;
  const gapBottom = m.card ? m.vh - m.card.bottom : null;
  console.log(`${label} (1920×1200)  题卡 bottom=${m.q && m.q.bottom}  卡台 y=${m.card && m.card.y}..${m.card && m.card.bottom}  题下空隙=${gapTop}  底空隙=${gapBottom}`);
  await shot(`stage_tall_${label}`);
}
console.log('截图: ' + OUT + '/stage_tall_L*.png');
ws.close(); process.exit(0);
