// 验证润色包「方案A+C」：答对彩带 mgConfetti(注入后自动清零) + 题卡贴纸微倾/绿闪 +
// 运算符高亮 .eq-op(橙) + 视算关主角化 body.mg-visual 放大 + prefers-reduced-motion 下无彩带。
// 纯润色，不碰出题/判题/OCR/语音；本地 Chrome CDP :9333(1000×576)，服务器 :8000。
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
let fail = 0; const P = (ok, l, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + (x != null ? '  ' + JSON.stringify(x) : '')); if (!ok) fail++; };
async function load(lv, mode) {
  await send('Emulation.setEmulatedMedia', { features: [] }, sessionId);
  await send('Page.navigate', { url: BASE }, sessionId); await sleep(250);
  await ev(`window.__err=null;addEventListener('error',e=>window.__err=String(e.message));
    sessionStorage.setItem('gameLevel','${lv}');sessionStorage.setItem('gameMode','${mode}');sessionStorage.removeItem('mgSprint');`);
  await send('Page.reload', {}, sessionId);
  for (let t = 0; t < 25; t++) { await sleep(250); if (await ev(`!!window._currentGame`)) break; }
  for (let t = 0; t < 16; t++) { await sleep(250); if (!(await ev(`(()=>{const b=document.getElementById('mg-countdown-badge');return b&&getComputedStyle(b).display!=='none';})()`))) break; }
  await ev(`(()=>{const g=window._currentGame; if(g){g._countdownActive=false; g.locked=false;} return 1;})()`);
  await sleep(350);
}
console.log('===== 润色包 方案A+C 验证 =====');

// 读某个出题 display 的高亮/字号/卡片倾斜状态
const PROBE = id => `(()=>{
  const el = document.getElementById('${id}');
  const op = el ? el.querySelector('.eq-op') : null;
  const q  = el ? el.querySelector('.eq-q') : null;
  const card = document.getElementById('question-card');
  return {
    present: !!el,
    html: el ? el.innerHTML : '',
    hasOp: !!op, hasQ: !!q,
    opColor: op ? getComputedStyle(op).color : null,
    popInline: el ? String(el.style.animation).includes('question-pop') : false,
    font: el ? parseFloat(getComputedStyle(el).fontSize) : null,
    cardTransform: card ? getComputedStyle(card).transform : null,
    visual: document.body.classList.contains('mg-visual'),
    listen: document.body.classList.contains('mg-listen'),
  };
})()`;

// ---- 组1：公共渲染器 / 彩带 / 卡片反馈 / reduced-motion（载 L2 视算，题卡= #question-display）----
await load(2, 'visual');
console.log('\n--- 组1 公共润色件 (L2 视算) ---');
P(await ev(`typeof window.mgConfetti==='function'`), 'mgConfetti 为全局函数');
P(await ev(`typeof window.mgRenderEquation==='function'`), 'mgRenderEquation 为全局函数');

// 引擎真实出题已走 mgRenderEquation（含 .eq-op/.eq-q）
let c = await ev(PROBE('question-display'));
P(c.hasOp && c.hasQ, '引擎出题经 mgRenderEquation(含 .eq-op/.eq-q)', { hasOp: c.hasOp, hasQ: c.hasQ });
P(c.opColor === 'rgb(255, 138, 61)', '运算符高亮为活力橙 #FF8A3D', c.opColor);
P(c.popInline, '题目保留 question-pop 入场', c.popInline);
P(/matrix\(/.test(c.cardTransform || ''), '题卡贴纸微倾(rotate 矩阵)', c.cardTransform);

// 视算主角化：body.mg-visual + 字号放大
P(c.visual, 'L2 视算 body.mg-visual 已加');
P(!c.listen, 'L2 视算未加 mg-listen');
P(c.font >= 40, '视算题卡主角放大(>=40px)', c.font);

// 直接渲染器自检（确定性，不依赖引擎当前题）
let r = await ev(`(()=>{window.mgRenderEquation(document.getElementById('question-display'),7,'×',8);
  const op=document.querySelector('#question-display .eq-op');
  return {t:document.getElementById('question-display').textContent.replace(/\\s+/g,' ').trim(), c:op?getComputedStyle(op).color:null};})()`);
P(r.t === '7 × 8 = ?', 'mgRenderEquation 文本仍为「7 × 8 = ?」(排版不变)', r.t);
P(r.c === 'rgb(255, 138, 61)', '渲染器 .eq-op 橙', r.c);

// 彩带：注入 >0，2.3s 后自动清零
let inj = await ev(`(()=>{window.mgConfetti(26);return document.querySelectorAll('#mg-confetti-layer i').length;})()`);
P(inj > 0, '答对彩带注入节点(>0)', inj);
await shot('polish_confetti');
await sleep(2400);
let left = await ev(`document.querySelectorAll('#mg-confetti-layer i').length`);
P(left === 0, '彩带 2.3s 后自动清零', left);

// 卡片反馈：绿闪 toggle 一次性
let flash = await ev(`(()=>{const el=document.getElementById('question-display');window.mgFlashCard(el,'correct');
  return document.getElementById('question-card').classList.contains('mg-card-correct');})()`);
P(flash, 'mgFlashCard 答对→题卡加 .mg-card-correct', flash);
await sleep(650);
P(!(await ev(`document.getElementById('question-card').classList.contains('mg-card-correct')`)), '绿闪一次性回弹(类已移除)');

// reduced-motion 下彩带被门控：无新节点
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }, sessionId);
let rm = await ev(`(()=>{const L=document.getElementById('mg-confetti-layer');if(L)L.innerHTML='';window.mgConfetti(26);
  return document.querySelectorAll('#mg-confetti-layer i').length;})()`);
P(rm === 0, 'prefers-reduced-motion 下无彩带节点', rm);
await send('Emulation.setEmulatedMedia', { features: [] }, sessionId);
P(!(await ev('window.__err')), '组1 全程无 JS 错误', await ev('window.__err'));
await shot('polish_visual_L2');

// ---- 组2：听算模式不误加 mg-visual（Game 守卫 mode!=='audio'）----
await load(1, 'audio');
console.log('\n--- 组2 听算回归 (L1 听算) ---');
let a = await ev(PROBE('question-display'));
P(a.listen, 'L1 听算 body.mg-listen 已加');
P(!a.visual, 'L1 听算未误加 mg-visual(视算主角规则不越界)', a.visual);
P(a.hasOp, 'L1 听算出题同样走高亮渲染', a.hasOp);
P(!(await ev('window.__err')), '组2 无 JS 错误', await ev('window.__err'));

// ---- 组3：太空(L5)/Boss(L6) 自有 display 也接入高亮渲染 ----
console.log('\n--- 组3 太空/Boss 高亮渲染 ---');
await load(5, 'visual');
let s = await ev(PROBE('space-question-display'));
P(s.present, 'L5 #space-question-display 存在', s.present);
P(s.hasOp && s.hasQ, 'L5 太空出题经 mgRenderEquation', { hasOp: s.hasOp, hasQ: s.hasQ });
P(s.opColor === 'rgb(255, 138, 61)', 'L5 运算符橙', s.opColor);
await shot('polish_space_L5');

await load(6, 'visual');
let b = await ev(PROBE('battle-question-display'));
P(b.present, 'L6 #battle-question-display 存在', b.present);
P(b.hasOp && b.hasQ, 'L6 Boss 出题经 mgRenderEquation', { hasOp: b.hasOp, hasQ: b.hasQ });
P(b.opColor === 'rgb(255, 138, 61)', 'L6 运算符橙', b.opColor);
await shot('polish_battle_L6');

console.log('\n截图: ' + OUT + '/polish_*.png');
console.log(fail === 0 ? '=== 润色包 验证全过 ===' : '=== ' + fail + ' FAIL ===');
ws.close(); process.exit(fail ? 1 : 0);


