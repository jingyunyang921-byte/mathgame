// 验证听算卡台撑满答题区 + L6 跳过落在收音卡台右下角。
// 本地 Chrome CDP :9333，服务器 :8000；跑 960×576（真机）、1920×1200（高屏）、900×500、800×480。
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
let fail = 0; const P = (ok, l, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + (x != null ? '  ' + JSON.stringify(x) : '')); if (!ok) fail++; };
async function load(lv, w, h) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false }, sessionId);
  await send('Page.navigate', { url: BASE }, sessionId); await sleep(250);
  await ev(`window.__err=null;addEventListener('error',e=>window.__err=String(e.message));
    sessionStorage.setItem('gameLevel','${lv}');sessionStorage.setItem('gameMode','audio');sessionStorage.removeItem('mgSprint');`);
  await send('Page.reload', {}, sessionId);
  for (let t = 0; t < 30; t++) { await sleep(250); if (await ev(`!!window._currentGame`)) break; }
  for (let t = 0; t < 16; t++) { await sleep(250); if (!(await ev(`(()=>{const b=document.getElementById('mg-countdown-badge');return b&&getComputedStyle(b).display!=='none';})()`))) break; }
  await ev(`(()=>{const g=window._currentGame; if(g){g._countdownActive=false; g.locked=false;} const b=document.getElementById('mg-countdown-badge'); if(b) b.style.display='none'; const ov=document.getElementById('float-voice-overlay')||document.getElementById('voice-mic-area'); if(ov) ov.style.display='flex'; return 1;})()`);
  await sleep(500);
}
const PROBE = `(()=>{
  const r = el => { if(!el) return null; const b=el.getBoundingClientRect(); return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height),right:Math.round(b.right),bottom:Math.round(b.bottom)}; };
  const vis = el => { if(!el) return false; const cs=getComputedStyle(el); const b=el.getBoundingClientRect(); return cs.display!=='none'&&cs.visibility!=='hidden'&&b.width>0&&b.height>0; };
  const ov = document.getElementById('float-voice-overlay');
  const vma = document.getElementById('voice-mic-area');
  const host = (ov && vis(ov)) ? ov : vma;
  const card = host ? host.querySelector('.mg-listen-card') : null;
  const skip = document.getElementById('mg-listen-skip');
  const lcSkip = card ? card.querySelector('.lc-skip') : null;
  const qs = document.getElementById('question-section');
  const bc = document.getElementById('battle-question-card');
  const stageBattle = document.body.classList.contains('mg-stage-battle');
  const ansTop = stageBattle ? (bc ? Math.round(bc.getBoundingClientRect().bottom) : null) : (qs ? Math.round(qs.getBoundingClientRect().bottom) : null);
  return { vw:innerWidth, vh:innerHeight, err:window.__err, body:document.body.className,
    ansTop, ov:r(host), card:r(card), bodySkipVis:vis(skip), lcSkipVis:vis(lcSkip),
    lcSkipRect:vis(lcSkip)?r(lcSkip):null, cardScroll:card?card.scrollHeight:null, cardClient:card?card.clientHeight:null,
    varTop:getComputedStyle(document.documentElement).getPropertyValue('--mg-ans-top').trim(),
    bl: (()=>{ const e=document.getElementById('battle-left'); if(!e||!vis(e)) return null; const cs=getComputedStyle(e), b=e.getBoundingClientRect(); return {l:Math.round(b.left+parseFloat(cs.paddingLeft)), r:Math.round(b.right-parseFloat(cs.paddingRight)), b:Math.round(b.bottom-parseFloat(cs.paddingBottom))}; })() };
})()`;

const CASES = [
  [1, 960, 576, 'std'], [2, 960, 576, 'std'], [3, 960, 576, 'std'], [4, 960, 576, 'std'], [6, 960, 576, 'battle'],
  [1, 1920, 1200, 'tall'], [4, 1920, 1200, 'tall'], [6, 1920, 1200, 'tall'],
  [1, 900, 500, 'small'], [4, 900, 500, 'small'], [6, 900, 500, 'small'],
  [1, 800, 480, 'tiny'], [6, 800, 480, 'tiny'],
];
for (const [lv, w, h, kind] of CASES) {
  await load(lv, w, h);
  const m = await ev(PROBE);
  const tag = `L${lv} ${w}x${h}`;
  P(m.err == null, tag + ' 无 JS 报错', m.err || undefined);
  const battleStage = /mg-stage-battle/.test(m.body); // L6 卡台与视算手写卡同框：下缘留 10px、上缘比题卡下缘低 36px
  P(m.ov && Math.abs(m.ov.bottom - (h - (battleStage ? 10 : 8))) <= 1, tag + ` 卡台下缘贴底(${battleStage ? 10 : 8}px)`, m.ov);
  const isBattle = /mg-stage-battle|mg-stage-race/.test(m.body); // 跳过收进卡台右下角(L4/L6)
  if (h >= 700) {
    P(m.card && m.card.h === 460, tag + ' 高屏卡台封顶 460px', m.card);
    P(m.card && m.card.y > m.ansTop + 11, tag + ' 高屏卡台贴底不拉伸', {ansTop:m.ansTop, cardY:m.card&&m.card.y});
  } else {
    P(m.card && m.card.h >= Math.min(242, h - m.ansTop - 18), tag + ' 卡台撑满答题区', {ansTop:m.ansTop, card:m.card});
    P(m.card && m.card.y <= m.ansTop + (battleStage ? 37 : 11) && m.card.y >= m.ansTop - 60, tag + ' 卡台上缘贴虚线(矮屏允许向上溢出)', {ansTop:m.ansTop, cardY:m.card&&m.card.y});
  }
  P(m.cardScroll == null || m.cardScroll <= m.cardClient + 1, tag + ' 卡内内容无溢出裁切', {scroll:m.cardScroll, client:m.cardClient});
  if (battleStage) P(m.bl && m.card && Math.abs(m.card.x - m.bl.l) <= 1 && Math.abs(m.card.right - m.bl.r) <= 1, tag + ' L6 卡台左右边缘与视算手写卡对齐(无缩进)', { card: m.card, bl: m.bl });
  if (isBattle) {
    P(!m.bodySkipVis, tag + ' body 级跳过隐藏');
    P(m.lcSkipVis, tag + ' 卡内跳过显示');
    if (m.lcSkipRect && m.card) {
      P(m.lcSkipRect.right <= m.card.right && m.card.right - m.lcSkipRect.right <= 20, tag + ' 跳过贴收音卡右缘', {skip:m.lcSkipRect, card:m.card});
      P(m.lcSkipRect.bottom <= m.card.bottom && m.card.bottom - m.lcSkipRect.bottom <= 20, tag + ' 跳过贴收音卡下缘', {skip:m.lcSkipRect, card:m.card});
    }
  } else {
    P(m.bodySkipVis, tag + ' body 级跳过显示(屏幕右下角)');
    P(!m.lcSkipVis, tag + ' 卡内跳过保持隐藏');
  }
  await shot(`verify_fill_L${lv}_${w}x${h}`);
}
console.log(fail ? `\n${fail} FAIL` : '\nALL PASS');
ws.close(); process.exit(fail ? 1 : 0);
