// 真机 WebView(Chrome91, 960×576) 验证：听算卡台撑满答题区 + L6 跳过落在收音卡右下角。
// 前置：adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>；先发 KEYCODE_WAKEUP。
import { writeFileSync, mkdirSync } from 'fs';
const OUT = '.shots/out';
try { mkdirSync(OUT, { recursive: true }); } catch (e) {}
const list = await (await fetch('http://localhost:9222/json/list')).json();
const t = list.find(x => x.type === 'page');
if (!t) { console.log('NO PAGE TARGET'); process.exit(1); }
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p = {}) => { const id = ++_id;
  return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify({ id, method: m, params: p })); }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true });
  if (r.exceptionDetails) throw new Error('EVAL:' + ((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text)); return r.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64')); };
let fail = 0; const P = (ok, l, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + (x != null ? '  ' + JSON.stringify(x) : '')); if (!ok) fail++; };
await send('Page.enable');
await send('Runtime.enable');

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
  return { vw:innerWidth, vh:innerHeight, chrome:/Chrome\\/(\\d+)/.test(navigator.userAgent)?RegExp.$1:'?',
    body:document.body.className, stageBattle,
    ansTop: stageBattle ? (bc?Math.round(bc.getBoundingClientRect().bottom):null) : (qs?Math.round(qs.getBoundingClientRect().bottom):null),
    ov:r(host), card:r(card), bodySkipVis:vis(skip), lcSkipVis:vis(lcSkip), lcSkipRect:vis(lcSkip)?r(lcSkip):null,
    cardScroll: card?card.scrollHeight:null, cardClient: card?card.clientHeight:null,
    varTop: getComputedStyle(document.documentElement).getPropertyValue('--mg-ans-top').trim() };
})()`;

for (const lv of [1, 4, 6]) {
  await ev(`sessionStorage.setItem('gameLevel','${lv}');sessionStorage.setItem('gameMode','audio');sessionStorage.removeItem('mgSprint');location.href='game.html';`);
  let ok = false;
  for (let i = 0; i < 60; i++) { await sleep(300); ok = await ev(`!!window._currentGame && /game\\.html/.test(location.pathname)`).catch(() => false); if (ok) break; }
  if (!ok) { console.log(`FAIL L${lv} 引擎未就绪`); fail++; continue; }
  await ev(`(()=>{const g=window._currentGame;if(g){g._countdownActive=false;g.locked=false;}
    const b=document.getElementById('mg-countdown-badge'); if(b) b.style.display='none';
    const ov=document.getElementById('float-voice-overlay')||document.getElementById('voice-mic-area'); if(ov) ov.style.display='flex'; return 1;})()`);
  await sleep(900);
  const m = await ev(PROBE);
  const tag = `L${lv}`;
  console.log(`\n--- ${tag} 真机 --- Chrome${m.chrome}`);
  P(m.vw === 960 && m.vh === 576, tag + ' 视口 960x576', { w: m.vw, h: m.vh });
  P(m.ov && Math.abs(m.ov.bottom - (m.vh - (m.stageBattle ? 10 : 8))) <= 2, tag + ` 卡台下缘贴底(${m.stageBattle ? 10 : 8}px)`, m.ov);
  P(m.card && Math.abs(m.card.bottom - m.ov.bottom) <= 2, tag + ' 卡台填满悬浮层', m.card);
  P(m.card && m.card.y <= m.ansTop + (m.stageBattle ? 38 : 14) && m.card.y >= m.ansTop - 60, tag + ' 卡台上缘贴虚线/题卡下缘', { ansTop: m.ansTop, cardY: m.card && m.card.y });
  P(m.cardScroll == null || m.cardScroll <= m.cardClient + 1, tag + ' 卡内内容无溢出裁切', { scroll: m.cardScroll, client: m.cardClient, varTop: m.varTop });
  if (lv === 6) P(m.card && Math.abs(m.card.x - 56) <= 1 && Math.abs(m.card.right - (m.vw * 0.52 - 12)) <= 1, tag + ' 卡台左右边缘与视算手写卡对齐(x=56，右缘=52%-12px)', m.card);
  if (lv === 6 || lv === 4) {
    P(!m.bodySkipVis, tag + ' body 级跳过隐藏');
    P(m.lcSkipVis, tag + ' 卡内跳过显示(收音区右下角)');
    if (m.lcSkipRect && m.card) {
      P(m.lcSkipRect.right <= m.card.right && m.card.right - m.lcSkipRect.right <= 20, tag + ' 跳过贴收音卡右缘', { skip: m.lcSkipRect, card: m.card });
      P(m.lcSkipRect.bottom <= m.card.bottom && m.card.bottom - m.lcSkipRect.bottom <= 20, tag + ' 跳过贴收音卡下缘', { skip: m.lcSkipRect, card: m.card });
    }
  } else {
    P(m.bodySkipVis, tag + ' body 级跳过显示(屏幕右下角)');
    P(!m.lcSkipVis, tag + ' 卡内跳过保持隐藏');
  }
  await shot(`dev_fill_L${lv}`);
  console.log(tag + ' rect', JSON.stringify({ ov: m.ov, card: m.card, skip: m.lcSkipRect }));
  await ev(`location.href='index.html'`).catch(() => {});
  await sleep(1200);
}
console.log('\n截图: ' + OUT + '/dev_fill_L*.png');
console.log(fail === 0 ? '=== 真机 听算撑满+跳过 验证全过 ===' : `=== ${fail} FAIL ===`);
ws.close(); process.exit(fail ? 1 : 0);
