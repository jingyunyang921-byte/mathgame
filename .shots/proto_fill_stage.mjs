// 原型试验：听算卡台「填满答题区」+ L6 跳过移到收音区右下角
// 用 CDP 往页面注入候选 CSS/JS，在 960×576（真机）与 1920×1200（高屏）截图对比。
import { writeFileSync } from 'fs';
const CDP = 'http://localhost:9333', BASE = 'http://localhost:8000/www/game.html';
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
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }, sessionId); writeFileSync(`.shots/out/${name}.png`, Buffer.from(r.data, 'base64')); };

const CSS = `
body.mg-stage #float-voice-overlay,
body.mg-stage #voice-mic-area,
body.mg-stage-battle #float-voice-overlay.battle-audio-mode {
  top: calc(var(--mg-ans-top, 40vh) + 10px) !important;
  bottom: 8px !important;
  transform: translateX(-50%) !important;
}
body.mg-stage-battle #float-voice-overlay.battle-audio-mode { top: calc(var(--mg-ans-top, 40vh) + 10px) !important; }
body.mg-stage #float-voice-overlay,
body.mg-stage #voice-mic-area { justify-content: flex-end; }
body.mg-stage #float-voice-overlay .mg-listen-card,
body.mg-stage #voice-mic-area .mg-listen-card {
  flex: 1 1 auto !important;
  max-height: 460px;
  justify-content: center !important;
}
body.mg-stage-battle #mg-listen-skip { display: none !important; }
body.mg-stage-battle .mg-listen-card { position: relative; padding-bottom: 54px; }
body.mg-stage-battle .mg-listen-card .lc-skip {
  display: inline-flex !important;
  position: absolute; right: 12px; bottom: 10px;
}
`;
async function load(lv, w, h) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false }, sessionId);
  await send('Page.navigate', { url: BASE }, sessionId); await sleep(250);
  await ev(`sessionStorage.setItem('gameLevel','${lv}');sessionStorage.setItem('gameMode','audio');sessionStorage.removeItem('mgSprint');`);
  await send('Page.reload', {}, sessionId);
  for (let t = 0; t < 30; t++) { await sleep(250); if (await ev(`!!window._currentGame`)) break; }
  for (let t = 0; t < 16; t++) { await sleep(250); if (!(await ev(`(()=>{const b=document.getElementById('mg-countdown-badge');return b&&getComputedStyle(b).display!=='none';})()`))) break; }
  await ev(`(()=>{const g=window._currentGame; if(g){g._countdownActive=false; g.locked=false;} const b=document.getElementById('mg-countdown-badge'); if(b) b.style.display='none'; const ov=document.getElementById('float-voice-overlay')||document.getElementById('voice-mic-area'); if(ov) ov.style.display='flex'; return 1;})()`);
  await sleep(300);
  // 注入候选样式 + 量答题区起点
  await ev(`(()=>{
    const s=document.createElement('style'); s.id='proto-css'; s.textContent=${JSON.stringify(CSS)}; document.head.appendChild(s);
    const body=document.body; let top;
    if(body.classList.contains('mg-stage-battle')){ const c=document.getElementById('battle-question-card'); top=c?c.getBoundingClientRect().bottom:0; }
    else { const q=document.getElementById('question-section'); top=q?q.getBoundingClientRect().bottom:0; }
    document.documentElement.style.setProperty('--mg-ans-top', Math.round(top)+'px');
    return top;})()`);
  await sleep(400);
}
for (const [lv, w, h] of [[1, 960, 576], [4, 960, 576], [6, 960, 576], [1, 1920, 1200], [4, 1920, 1200], [6, 1920, 1200], [1, 900, 500], [4, 900, 500], [6, 900, 500], [1, 800, 480], [6, 800, 480]]) {
  await load(lv, w, h);
  const info = await ev(`(()=>{const r=el=>{if(!el)return null;const b=el.getBoundingClientRect();return{x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height),bottom:Math.round(b.bottom)}};
    return {vw:innerWidth,vh:innerHeight,top:getComputedStyle(document.documentElement).getPropertyValue('--mg-ans-top'),
      ov:r(document.getElementById('float-voice-overlay')||document.getElementById('voice-mic-area')),
      card:r((document.getElementById('float-voice-overlay')||document.getElementById('voice-mic-area'))?.querySelector('.mg-listen-card')),
      qsec:r(document.getElementById('question-section')),bqc:r(document.getElementById('battle-question-card')),
      skip:r(document.getElementById('mg-listen-skip')),lcskip:r(document.querySelector('.mg-listen-card .lc-skip'))};})()`);
  console.log('L' + lv, w + 'x' + h, JSON.stringify(info));
  await shot(`proto_L${lv}_${w}x${h}`);
}
ws.close(); process.exit(0);
