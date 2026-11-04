// 游戏页截图 + 量 PK 区几何 via 本地 Chrome :9333 + 静态服 :8000。
// 用法：node .shots/shot_game_pk.mjs <页面> <关> <模式> <WxH> <输出名> [进度 p:m]
// 例：node .shots/shot_game_pk.mjs index.html 1 visual 960x576 pk_before_L1 3:1
const [PAGE = 'index.html', LV = '1', MODE = 'visual', DIM = '960x576', OUT = 'pk_shot', PROG = ''] = process.argv.slice(2);
import fs from 'node:fs';
const CDP = 'http://localhost:9333', BASE = 'http://localhost:8000/';
const ver = await (await fetch(CDP + '/json/version')).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map(); let jsErrs = [];
ws.onmessage = e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
  else if (m.method === 'Runtime.exceptionThrown') jsErrs.push((m.params.exceptionDetails.exception || {}).description || m.params.exceptionDetails.text); };
const send = (m, p, s) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (s) msg.sessionId = s;
  return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify(msg)); }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
for (const d of ['Page', 'Runtime', 'Network']) await send(d + '.enable', {}, sessionId);
await send('Network.setCacheDisabled', { cacheDisabled: true }, sessionId);
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true }, sessionId);
  if (r.exceptionDetails) throw new Error('EVAL: ' + ((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text));
  return r.result.value;
};
const [W, H] = DIM.split('x').map(Number);
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: false }, sessionId);
await send('Page.navigate', { url: BASE + PAGE }, sessionId); await sleep(500);
await ev(`sessionStorage.setItem('gameLevel','${LV}');sessionStorage.setItem('gameMode','${MODE}');1`);
await send('Page.reload', {}, sessionId);
for (let i = 0; i < 60; i++) { await sleep(300); if (await ev(`!!window._currentGame`)) break; }
await sleep(900);
if (PROG) {
  const [p, m] = PROG.split(':').map(Number);
  await ev(`(() => { const g = window._currentGame; clearInterval(g.monsterTimer); g.gameEnded = false;
    for (let i = 0; i < ${p}; i++) { g.playerScore++; g._fillDot('p', g.playerScore - 1); }
    for (let i = 0; i < ${m}; i++) { g.monsterScore++; g._fillDot('m', g.monsterScore - 1); }
    return 1; })()`);
  await sleep(700);
}
if (process.env.EXTRA) { await ev(process.env.EXTRA); await sleep(700); }
const M = await ev(`(() => {
  const R = e => { if (!e) return null; const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom].map(v => Math.round(v * 10) / 10).join(','); };
  const q = s => document.querySelector(s);
  return { iw: innerWidth, ih: innerHeight, ui: getComputedStyle(document.documentElement).getPropertyValue('--ui').trim(), padTop: getComputedStyle(document.body).paddingTop,
    pk: R(q('#pk-section')), pkPos: getComputedStyle(q('#pk-section')).position, back: R(q('#race-back-btn')), label: R(q('#race-label')),
    warrior: R(q('#warrior-wrap')), monster: R(q('#monster-wrap')), vs: R(q('.vs-badge')), pb: R(q('#player-blocks')), mb: R(q('#monster-blocks')),
    qs: R(q('#question-section')), as: R(q('#answer-section')), ctrl: R(q('#controls')), cw: R(q('#canvas-wrapper')),
    scrollH: document.documentElement.scrollHeight, blocks: document.querySelectorAll('.prog-block').length,
    lit: document.querySelectorAll('.prog-block.lit-p,.prog-block.lit-m').length };
})()`);
fs.mkdirSync('.shots/out', { recursive: true });
const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
const f = `.shots/out/${OUT}.png`; fs.writeFileSync(f, Buffer.from(shot.data, 'base64'));
console.log(JSON.stringify(M)); console.log('-> ' + f); if (jsErrs.length) console.log('JS ERRORS', jsErrs);
await send('Target.closeTarget', { targetId }); ws.close(); process.exit(0);
