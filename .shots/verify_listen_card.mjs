// 验证听算模式「听算卡」卡内组件 + 功能回归（方案B 聚光卡台的卡内细节，与 verify_listen_stage 的布局闸门互补）：
// 卡内声波条/识别框/聆听态绿麦/声波动画(含 reduced-motion 门控)、旧提示卡+旧行内跳过已隐藏、跳过点击使题目前进；
// 卡内不再有听算模式徽标；L1/L2/L3 跳过用 body 级 #mg-listen-skip(卡内 .lc-skip 隐藏)；L4/L6 跳过收进卡台右下角；L5 仍无麦克风。
// 本地 Chrome CDP :9333（1000×576），本地服务器 :8000。
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

// 载入某关听算模式，等引擎就绪 + 开场倒计时结束
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

// 读取当前可见的听算卡结构 + 几何
const CARD = `(()=>{
  const vis = el => { if(!el) return false; const cs=getComputedStyle(el); const r=el.getBoundingClientRect(); return cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0&&r.height>0; };
  const ov = document.getElementById('float-voice-overlay');
  const vma = document.getElementById('voice-mic-area');
  let card=null, container=null;
  if (ov && getComputedStyle(ov).display!=='none') { card = ov.querySelector('.mg-listen-card'); container='float-voice-overlay'; }
  else { const c = vma && vma.querySelector('.mg-listen-card'); if (c && vis(c)) { card=c; container='voice-mic-area'; } }
  if (!card) return { container:null };
  const q = s => card.querySelector(s);
  const rect = el => { const r=el.getBoundingClientRect(); return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]; };
  const badge=q('.lc-badge'), hero=q('.lc-hero'), mic=card.querySelector('[id$="mic-btn"]'),
        bars=card.querySelectorAll('.lc-bars i'), heard=card.querySelector('[id$="-heard"],[id$="-heard-text"]'),
        skip=q('.lc-skip'), bodySkip=document.getElementById('mg-listen-skip');
  const cr=card.getBoundingClientRect();
  // 旧割裂块是否已隐藏
  const cue = document.querySelector('#lv1-voice-section .mg-listen-cue:not([style*="display: none"]), #voice-section .mg-listen-cue');
  const cueShown = (() => { const els=[document.querySelector('#lv1-voice-section .mg-listen-cue'),document.querySelector('#voice-section .mg-listen-cue')]; return els.some(e=>e&&vis(e)); })();
  const oldSkipShown = ['lv1-voice-skip-btn','voice-skip-btn','race-scratch-skip-btn','battle-scratch-skip-btn'].some(id=>{const e=document.getElementById(id);return e&&vis(e);});
  const barAnim = bars.length? getComputedStyle(bars[0]).animationName : '';
  const micBg = mic? getComputedStyle(mic).backgroundImage : '';
  return { container, hasBadge:!!badge&&vis(badge), heroTxt:hero&&hero.textContent.trim(),
    micRect: mic&&rect(mic), bars: bars.length, hasHeard:!!heard&&vis(heard), heardId: heard&&heard.id,
    skipRect: skip&&rect(skip), cardSkipVis: !!skip&&vis(skip), bodySkipVis: !!bodySkip&&vis(bodySkip),
    bodySkipPos: bodySkip?getComputedStyle(bodySkip).position:null,
    cardRect:[Math.round(cr.x),Math.round(cr.y),Math.round(cr.width),Math.round(cr.height)],
    cueShown, oldSkipShown, barAnim, micListening: mic&&mic.classList.contains('listening'), micBg };
})()`;

async function testCardLevel(lv, label) {
  await load(lv);
  const c = await ev(CARD);
  console.log(`\n--- ${label} (L${lv}) --- container=${c.container}`);
  P(!!c.container, `${label} 听算卡可见`, c.container);
  if (!c.container) { await shot(`listen_card_L${lv}_idle`); return; }
  P(!c.hasBadge, `${label} 听算模式徽标已去除(方案B)`, c.hasBadge);
  P(c.heroTxt && c.heroTxt.includes('大声说出'), `${label} 卡内有标题`, c.heroTxt);
  P(c.bars === 5, `${label} 声波条 5 根`, c.bars);
  P(c.hasHeard, `${label} 识别框在卡内`, c.heardId);
  // L6 的跳过放在收音卡台右下角（收音区收在左半，屏幕右下角已越过欢迎小屋）；L4 的屏幕右下角压着右侧赛道，也收进卡台；其余关卡仍用 body 级屏角按钮。
  if (lv === 6 || lv === 4) {
    P(c.cardSkipVis, `${label} 卡内跳过显示(收音区右下角)`, c.cardSkipVis);
    P(!c.bodySkipVis, `${label} body 级跳过隐藏`, c.bodySkipVis);
  } else {
    P(!c.cardSkipVis, `${label} 卡内跳过已隐藏(改用 body 级)`, c.cardSkipVis);
    P(c.bodySkipVis && c.bodySkipPos === 'fixed', `${label} 跳过改为 body 级固定定位`, { vis: c.bodySkipVis, pos: c.bodySkipPos });
  }
  // 卡片整体在视口内
  const cr = c.cardRect;
  P(cr[1] >= 0 && cr[1] + cr[3] <= 577, `${label} 卡片未超出视口`, cr);
  // 旧割裂块已收起
  P(!c.cueShown, `${label} 旧提示卡已隐藏`);
  P(!c.oldSkipShown, `${label} 旧行内跳过已隐藏`);
  // 声波动画生效
  P(c.barAnim === 'lc-bar', `${label} 声波条有起伏动画`, c.barAnim);
  await shot(`listen_card_L${lv}_idle`);
  return c;
}

console.log('===== 听算卡验证 =====');
const l1 = await testCardLevel(1, 'L1 Game');
const l3 = await testCardLevel(3, 'L3 VoiceGame');
const l4 = await testCardLevel(4, 'L4 Race');
const l6 = await testCardLevel(6, 'L6 Battle');

// L6 卡片不越过左半区(52%)进 BOSS 区
if (l6 && l6.cardRect) P(l6.cardRect[0] + l6.cardRect[2] <= 520, 'L6 卡片右边未越过左半区(52%=520)进 BOSS 区', l6.cardRect);
// 两套实现都覆盖到
P(l1 && l1.container === 'float-voice-overlay', 'L1 走共享 float-voice-overlay');
P(l3 && l3.container === 'voice-mic-area', 'L3 走 VoiceGame voice-mic-area');

// #float-combo 不与卡片交叠（量 L1 卡片 vs combo 槽位 right:14,bottom:150）
const combo = await ev(`(()=>{const el=document.getElementById('float-combo');const cs=getComputedStyle(el);
  // 临时显形量矩形
  const old=el.style.cssText; el.style.display='flex'; el.textContent='连对x3'; const r=el.getBoundingClientRect();
  const rect=[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]; el.style.cssText=old; el.textContent='';
  return rect;})()`);
if (l1 && l1.cardRect) {
  const [cx,cy,cw,ch]=l1.cardRect, [bx,by,bw,bh]=combo;
  const overlap = !(cx+cw<=bx || bx+bw<=cx || cy+ch<=by || by+bh<=cy);
  P(!overlap, 'L1 连对 pill 与卡片无交叠', { card:l1.cardRect, combo });
}

// 聆听态：手动加 .listening，确认麦克风转绿 + 截图
await ev(`(()=>{const m=document.querySelector('#float-voice-overlay [id$="mic-btn"]'); if(m)m.classList.add('listening'); return 1;})()`);
await sleep(200);
const greenBg = await ev(`(()=>{const m=document.querySelector('#float-voice-overlay [id$="mic-btn"]'); return m?getComputedStyle(m).backgroundImage:'';})()`);
P(greenBg.includes('67, 160') || greenBg.includes('46, 158') || greenBg.includes('35, 154'), '聆听态麦克风转绿', greenBg);
await shot('listen_card_listening');

// 跳过 pill 点击 → 题目前进、不报错（方案B：L1 点 body 级 #mg-listen-skip；重新载入 L1 Game 干净态比对 currentQuestion）
await load(1);
await ev(`window.__err=null;`);
const beforeSkip = await ev(`(()=>{const g=window._currentGame;return {q:g&&g.currentQuestion, ans:g&&g.currentAnswer};})()`);
await ev(`(()=>{const s=document.getElementById('mg-listen-skip'); if(s)s.click(); return 1;})()`);
await sleep(400);
const afterSkip = await ev(`(()=>{const g=window._currentGame;return {q:g&&g.currentQuestion, ans:g&&g.currentAnswer, err:window.__err};})()`);
P(!afterSkip.err, '跳过 pill 点击无报错', afterSkip.err);
P(afterSkip.q && afterSkip.q !== beforeSkip.q, '跳过 pill 点击使题目前进', { before: beforeSkip.q, after: afterSkip.q });

// reduced-motion：声波动画应静止
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }, sessionId);
await sleep(200);
const rmAnim = await ev(`(()=>{const b=document.querySelector('#float-voice-overlay .lc-bars i'); return b?getComputedStyle(b).animationName:'';})()`);
P(rmAnim === 'none', 'reduced-motion 下声波动画静止', rmAnim);
await send('Emulation.setEmulatedMedia', { features: [] }, sessionId);

// L5 回归：听算无麦克风、无卡片
await load(5);
const l5 = await ev(CARD);
P(!l5.container, 'L5 听算无听算卡(仍选门+TTS)', l5.container);
await shot('listen_card_L5_idle');

P(!(await ev('window.__err')), '全程无 JS 错误', await ev('window.__err'));
console.log('\n截图: ' + OUT + '/listen_card_L*.png');
console.log(fail === 0 ? '=== 听算卡验证全过 ===' : '=== ' + fail + ' FAIL ===');
ws.close(); process.exit(fail ? 1 : 0);
