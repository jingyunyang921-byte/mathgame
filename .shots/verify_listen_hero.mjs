// 验证听算「方案A」：题目升级成主角大卡(厚橙描边+放大字号) + 再听一遍按钮 + 中段星光；
// 仅 L1/L2/L3 听算(body.mg-listen)生效，L4/L6 不放大、L5 无卡；合并麦克风卡保持可见(回归)。
// 本地 Chrome CDP :9333(1000×576)，服务器 :8000。
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
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, userGesture: true }, sessionId);
  if (r.exceptionDetails) throw new Error('EVAL:' + ((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text)); return r.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }, sessionId); writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64')); };
let fail = 0; const P = (ok, l, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + (x != null ? '  ' + JSON.stringify(x) : '')); if (!ok) fail++; };
async function load(lv) {
  await send('Page.navigate', { url: BASE }, sessionId); await sleep(250);
  await ev(`window.__err=null;addEventListener('error',e=>window.__err=String(e.message));
    sessionStorage.setItem('gameLevel','${lv}');sessionStorage.setItem('gameMode','audio');sessionStorage.removeItem('mgSprint');`);
  await send('Page.reload', {}, sessionId);
  for (let t = 0; t < 25; t++) { await sleep(250); if (await ev(`!!window._currentGame`)) break; }
  for (let t = 0; t < 16; t++) { await sleep(250); if (!(await ev(`(()=>{const b=document.getElementById('mg-countdown-badge');return b&&getComputedStyle(b).display!=='none';})()`))) break; }
  await ev(`(()=>{const g=window._currentGame; if(g){g._countdownActive=false; g.locked=false;} return 1;})()`);
  await sleep(350);
}
// 读题卡/再听/星光/合并卡状态
const PROBE = `(()=>{
  const vis = el => { if(!el) return false; const cs=getComputedStyle(el); const r=el.getBoundingClientRect(); return cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0&&r.height>0; };
  const listen = document.body.classList.contains('mg-listen');
  const qc = document.getElementById('question-card');
  const qd = document.getElementById('question-display');
  const rep = document.querySelector('.q-replay');
  const deco = document.querySelector('#lv1-voice-section .lc-deco, #voice-section .lc-deco');
  const stars = deco ? deco.querySelectorAll('.lc-star').length : 0;
  // 合并卡回归：卡节点存在且未被(我的)CSS 隐藏即算在；fixed overlay 的运行时显隐由语音计时器决定(有竞态)，专项门 verify_listen_card.mjs 已覆盖，这里不依赖它。
  const ov = document.getElementById('float-voice-overlay');
  const vma = document.getElementById('voice-mic-area');
  const card = (ov && ov.querySelector('.mg-listen-card')) || (vma && vma.querySelector('.mg-listen-card'));
  const cardPresent = !!card && getComputedStyle(card).display !== 'none';
  const overlayShown = !!((ov && vis(ov)) || (vma && vis(vma)));
  return { listen,
    qcBorder: qc ? getComputedStyle(qc).borderTopWidth : null,
    qdFont: qd ? parseFloat(getComputedStyle(qd).fontSize) : null,
    repVis: rep ? vis(rep) : false,
    decoStars: stars, cardPresent, overlayShown };
})()`;
console.log('===== 方案A 主角题卡验证 =====');

// L1 / L3 听算：题卡放大 + 再听一遍 + 星光，合并卡仍在
for (const [lv, label] of [[1, 'L1 Game'], [3, 'L3 VoiceGame']]) {
  await load(lv);
  const c = await ev(PROBE);
  console.log(`\n--- ${label} (L${lv}) ---`);
  P(c.listen, `${label} body.mg-listen 已加`);
  P(c.qcBorder === '4px', `${label} 题卡厚橙描边(4px)`, c.qcBorder);
  P(c.qdFont >= 44, `${label} 题目字号放大(>=44px, 视算档约42)`, c.qdFont);
  P(c.repVis, `${label} 再听一遍按钮可见`);
  P(c.decoStars === 3, `${label} 中段星光 3 颗`, c.decoStars);
  P(c.cardPresent, `${label} 合并麦克风卡仍可见(回归)`);
  // 再听一遍点击：复用 _speakQuestion，不报错
  await ev(`window.__err=null;`);
  await ev(`(()=>{const r=document.querySelector('.q-replay'); if(r)r.click(); return 1;})()`);
  await sleep(300);
  P(!(await ev('window.__err')), `${label} 再听一遍点击无报错`, await ev('window.__err'));
  await shot(`listen_hero_L${lv}`);
}

// L4 Race / L6 Battle 听算：不加 mg-listen → 题目不放大、再听一遍隐藏；合并卡仍在
for (const [lv, label] of [[4, 'L4 Race'], [6, 'L6 Battle']]) {
  await load(lv);
  const c = await ev(PROBE);
  console.log(`\n--- ${label} (L${lv}) ---`);
  P(!c.listen, `${label} 未加 mg-listen(题目保持原样)`, c.listen);
  P(!c.repVis, `${label} 再听一遍不显示`);
  P(c.cardPresent, `${label} 合并麦克风卡仍可见`);
  await shot(`listen_hero_L${lv}`);
}

// L5 回归：无 mg-listen、无卡
await load(5);
const l5 = await ev(PROBE);
P(!l5.listen, 'L5 未加 mg-listen');
P(!l5.overlayShown, 'L5 无听算卡(两容器均未显示)');
await shot('listen_hero_L5');

// 视算回归：L1 视算不应放大题目 / 不显示再听一遍
await send('Page.navigate', { url: BASE }, sessionId); await sleep(250);
await ev(`sessionStorage.setItem('gameLevel','1');sessionStorage.setItem('gameMode','visual');sessionStorage.removeItem('mgSprint');`);
await send('Page.reload', {}, sessionId);
for (let t = 0; t < 25; t++) { await sleep(250); if (await ev(`!!window._currentGame`)) break; }
await sleep(500);
const vis1 = await ev(PROBE);
P(!vis1.listen, 'L1 视算未加 mg-listen');
P(!vis1.repVis, 'L1 视算不显示再听一遍');

P(!(await ev('window.__err')), '全程无 JS 错误', await ev('window.__err'));
console.log('\n截图: ' + OUT + '/listen_hero_L*.png');
console.log(fail === 0 ? '=== 方案A 验证全过 ===' : '=== ' + fail + ' FAIL ===');
ws.close(); process.exit(fail ? 1 : 0);