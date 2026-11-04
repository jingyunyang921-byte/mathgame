// 真机 WebView：进入听算 L1/L6 并量布局 + 截图（960×576）
import { writeFileSync } from 'fs';
const list = await (await fetch('http://localhost:9222/json/list')).json();
const t = list.find(x => x.type === 'page');
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p = {}) => { const id = ++_id;
  return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify({ id, method: m, params: p })); }); };
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true });
  if (r.exceptionDetails) throw new Error('EVAL:' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)); return r.result.value; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`.shots/out/${name}.png`, Buffer.from(r.data, 'base64')); };
await send('Page.enable');
const MEAS = `(()=>{const r=el=>{if(!el)return null;const b=el.getBoundingClientRect();return{x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height),bottom:Math.round(b.bottom)}};
  const vis=el=>{if(!el)return false;const cs=getComputedStyle(el);return cs.display!=='none'&&cs.visibility!=='hidden'&&el.getBoundingClientRect().width>0;};
  const qs=document.getElementById('question-section');
  return {w:innerWidth,h:innerHeight,body:document.body.className,
    qsec:r(qs),qcard:r(document.getElementById('question-card')),
    ov:r(document.getElementById('float-voice-overlay')),card:r(document.querySelector('#float-voice-overlay .mg-listen-card, #voice-mic-area .mg-listen-card')),
    skip:r(document.getElementById('mg-listen-skip')),skipVis:vis(document.getElementById('mg-listen-skip')),
    bq:r(document.getElementById('battle-question-area')),bqc:r(document.getElementById('battle-question-card')),
    ans:r(document.getElementById('answer-section'))};})()`;
for (const lv of [2, 3, 4, 5]) {
  await ev(`sessionStorage.setItem('gameLevel','${lv}');sessionStorage.setItem('gameMode','audio');sessionStorage.removeItem('mgSprint');location.href='game.html';`);
  for (let i = 0; i < 60; i++) { await sleep(300); const ok = await ev(`!!window._currentGame && /game\\.html/.test(location.pathname)`).catch(() => false); if (ok) break; }
  await ev(`(()=>{const g=window._currentGame;if(g){g._countdownActive=false;g.locked=false;} const b=document.getElementById('mg-countdown-badge'); if(b) b.style.display='none'; const ov=document.getElementById('float-voice-overlay')||document.getElementById('voice-mic-area'); if(ov) ov.style.display='flex'; return 1;})()`).catch(e => console.log('e', e.message));
  await sleep(800);
  console.log('L' + lv, await ev(MEAS));
  await shot('dev_listen_L' + lv);
  // 回菜单，便于下一关重置
  await ev(`location.href='index.html'`);
  await sleep(1200);
}
ws.close(); process.exit(0);
