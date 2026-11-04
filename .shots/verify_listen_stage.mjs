// 验证听算「方案B 聚光卡台」：悬浮麦克风卡升级成居中大卡台——去徽标、一行「大声说出你的答案吧」、
// 放大绿麦+波纹、识别框在下、聚光灯+暖背景；跳过移到屏幕右下角(body 级 #mg-listen-skip)。
// L1/L2/L3/L4 四关都用居中大卡台(body.mg-stage)；L6 右半是 BOSS 战，用 body.mg-stage-battle 收成
// 左半卡台(与视算手写卡同宽)；所有听算跳过统一在右下角；L5 无卡；题区放大仍只 L1/L2/L3(body.mg-listen)。
// 本地 Chrome CDP :9333(1000×576)，服务器 :8000。
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
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
// 卡台/标题/麦克风/跳过/识别框/装饰 状态探针
const PROBE = `(()=>{
  const vis = el => { if(!el) return false; const cs=getComputedStyle(el); const r=el.getBoundingClientRect(); return cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0&&r.height>0; };
  const listen = document.body.classList.contains('mg-listen');
  const stage = document.body.classList.contains('mg-stage');
  const stageBattle = document.body.classList.contains('mg-stage-battle');
  const ov = document.getElementById('float-voice-overlay');
  const vma = document.getElementById('voice-mic-area');
  const card = (ov && ov.querySelector('.mg-listen-card')) || (vma && vma.querySelector('.mg-listen-card'));
  const q = s => card ? card.querySelector(s) : null;
  const mic = document.getElementById('float-voice-mic-btn') && getComputedStyle(document.getElementById('float-voice-mic-btn')).display!=='none'
    ? document.getElementById('float-voice-mic-btn') : document.getElementById('voice-mic-btn');
  const title = q('.lc-stage-title');
  const badge = q('.lc-badge');
  const bodySkipEl = document.getElementById('mg-listen-skip');
  const cardSkipEl = q('.lc-skip');
  const heard = card ? card.querySelector('#float-voice-heard, #voice-heard-text') : null;
  const deco = document.querySelector('#lv1-voice-section .lc-deco, #voice-section .lc-deco');
  const msym = deco ? deco.querySelectorAll('.lc-msym').length : 0;
  const sec = document.getElementById('lv1-voice-section') || document.getElementById('voice-section');
  const bq = document.getElementById('battle-question-card');
  const r = el => { const b=el.getBoundingClientRect(); return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)}; };
  return { listen, stage, stageBattle,
    titleVis: title ? vis(title) : false, titleText: title ? title.textContent.trim() : null,
    badgeShown: badge ? getComputedStyle(badge).display!=='none' : null,
    micW: mic ? Math.round(mic.getBoundingClientRect().width) : null,
    bodySkipVis: bodySkipEl ? vis(bodySkipEl) : false,
    bodySkipPos: bodySkipEl ? getComputedStyle(bodySkipEl).position : null,
    bodySkipRect: (bodySkipEl && vis(bodySkipEl)) ? r(bodySkipEl) : null,
    cardSkipVis: cardSkipEl ? vis(cardSkipEl) : false,
    heardVis: heard ? vis(heard) : false, heardRect: heard ? r(heard) : null,
    micRect: mic ? r(mic) : null,
    cardW: card ? Math.round(card.getBoundingClientRect().width) : null,
    cardRect: card ? r(card) : null,
    bqRect: (bq && vis(bq)) ? r(bq) : null,
    secBg: sec ? getComputedStyle(sec).backgroundImage.slice(0,30) : null,
    msym };
})()`;
console.log('===== 方案B 聚光卡台验证 =====');

// L1 / L3 听算：卡台升级 —— 去徽标、一行标题、大麦克风、识别框在下、跳过固定右下、背景丰富
for (const [lv, label] of [[1, 'L1 Game'], [3, 'L3 VoiceGame']]) {
  await load(lv);
  // 让卡显出来(悬浮卡的运行时显隐靠语音计时器；强制 show 以稳定量尺寸)
  await ev(`(()=>{const ov=document.getElementById('float-voice-overlay');if(ov)ov.style.display='flex';
    const btn=document.getElementById('float-voice-mic-btn')||document.getElementById('voice-mic-btn');
    if(btn)btn.classList.add('listening'); return 1;})()`);
  await sleep(300);
  const c = await ev(PROBE);
  console.log(`\n--- ${label} (L${lv}) ---`);
  P(c.listen, `${label} body.mg-listen 已加`);
  P(c.titleVis && c.titleText === '大声说出你的答案吧', `${label} 一行标题「大声说出你的答案吧」`, c.titleText);
  P(c.badgeShown === false, `${label} 听算模式徽标已去除`, c.badgeShown);
  P(c.micW >= 80, `${label} 麦克风放大(>=80px，矮屏档88)`, c.micW);
  P(c.cardW >= 460, `${label} 卡台加宽(>=460px)`, c.cardW);
  P(c.bodySkipPos === 'fixed', `${label} 跳过固定定位(body 级)`, c.bodySkipPos);
  P(c.bodySkipRect && c.bodySkipRect.x > 760 && c.bodySkipRect.y > 480, `${label} 跳过在屏幕右下角`, c.bodySkipRect);
  P(c.cardSkipVis === false, `${label} 卡内跳过已隐藏(改用 body 级)`, c.cardSkipVis);
  // 识别框在麦克风下方
  P(c.heardVis && c.heardRect && c.micRect && c.heardRect.y > c.micRect.y, `${label} 识别框在麦克风下方`, { mic: c.micRect && c.micRect.y, heard: c.heardRect && c.heardRect.y });
  P(c.msym === 3, `${label} 底部漂浮运算符号 3 个`, c.msym);
  P(c.secBg && c.secBg.indexOf('gradient') >= 0, `${label} 底部区域有渐变背景`, c.secBg);
  // 跳过点击：复用 _skipQuestion，不报错
  await ev(`window.__err=null;`);
  await ev(`(()=>{const s=document.getElementById('mg-listen-skip'); if(s)s.click(); return 1;})()`);
  await sleep(300);
  P(!(await ev('window.__err')), `${label} 跳过点击无报错`, await ev('window.__err'));
  await shot(`listen_stage_L${lv}`);
}

// L4 Race 听算：居中大卡台(body.mg-stage，但不加 mg-listen → 题区不放大) + 跳过收进卡台右下角
await load(4);
await ev(`(()=>{const ov=document.getElementById('float-voice-overlay');if(ov)ov.style.display='flex';
  const btn=document.getElementById('float-voice-mic-btn');if(btn)btn.classList.add('listening');return 1;})()`);
await sleep(300);
{
  const c = await ev(PROBE);
  console.log(`\n--- L4 Race (L4) ---`);
  P(c.stage && !c.stageBattle, 'L4 加 mg-stage(非 battle 档)', { stage: c.stage, battle: c.stageBattle });
  P(!c.listen, 'L4 不加 mg-listen(题区不放大)', c.listen);
  P(c.titleVis && c.titleText === '大声说出你的答案吧', 'L4 一行标题「大声说出你的答案吧」', c.titleText);
  P(c.badgeShown === false, 'L4 徽标已去除', c.badgeShown);
  P(c.micW >= 80, 'L4 麦克风放大(>=80px)', c.micW);
  P(c.cardW >= 460, 'L4 卡台加宽(>=460px)', c.cardW);
  P(c.cardRect && (c.cardRect.x + c.cardRect.w / 2) > 400 && (c.cardRect.x + c.cardRect.w / 2) < 600, 'L4 卡台居中', c.cardRect);
  P(c.cardSkipVis === true && c.bodySkipVis === false, 'L4 跳过收进卡台右下角(body 级隐藏，不压右侧赛道)', { card: c.cardSkipVis, body: c.bodySkipVis });
  await ev(`window.__err=null;(()=>{const s=document.querySelector('#float-voice-overlay .mg-listen-card .lc-skip'); if(s)s.click(); return 1;})()`);
  await sleep(300);
  P(!(await ev('window.__err')), 'L4 跳过点击无报错', await ev('window.__err'));
  await shot('listen_stage_L4');
}

// L6 Battle 听算：左半窄卡台不越过屏幕中线，body 级跳过固定在右下角。
await load(6);
await ev(`(()=>{const ov=document.getElementById('float-voice-overlay');if(ov){ov.classList.add('battle-audio-mode');ov.style.display='flex';}
  const btn=document.getElementById('float-voice-mic-btn');if(btn)btn.classList.add('listening');return 1;})()`);
await sleep(300);
{
  const c = await ev(PROBE);
  console.log(`\n--- L6 Battle (L6) ---`);
  P(c.stage && c.stageBattle, 'L6 加 mg-stage + mg-stage-battle', { stage: c.stage, battle: c.stageBattle });
  P(!c.listen, 'L6 不加 mg-listen(题区不放大)', c.listen);
  P(c.titleVis && c.titleText === '大声说出你的答案吧', 'L6 一行标题「大声说出你的答案吧」', c.titleText);
  P(c.badgeShown === false, 'L6 徽标已去除', c.badgeShown);
  P(c.cardRect && Math.abs(c.cardRect.x - 56) <= 1 && Math.abs(c.cardRect.x + c.cardRect.w - (1000 * 0.52 - 12)) <= 1, 'L6 卡台左右与视算手写卡对齐(x=56，右缘=52%-12px，无缩进)', c.cardRect);
  P(c.cardRect && (c.cardRect.x + c.cardRect.w) <= 520, 'L6 卡台不越过左半区(52%)右缘(不盖 BOSS)', c.cardRect);
  P(c.bqRect && c.cardRect && (c.bqRect.y + c.bqRect.h) <= c.cardRect.y, 'L6 题卡在卡台之上不重叠', { q: c.bqRect, card: c.cardRect });
  P(c.cardSkipVis === true, 'L6 卡内跳过显示(收音区右下角)', c.cardSkipVis);
  P(c.bodySkipVis === false, 'L6 body 级跳过隐藏', c.bodySkipVis);
  const sk = await ev(`(()=>{const s=document.querySelector('#float-voice-overlay .mg-listen-card .lc-skip'),c=document.querySelector('#float-voice-overlay .mg-listen-card');
    const a=s.getBoundingClientRect(),b=c.getBoundingClientRect();
    return {sx:Math.round(a.x),sy:Math.round(a.y),sw:Math.round(a.width),sh:Math.round(a.height),
      cx:Math.round(b.x),cy:Math.round(b.y),cw:Math.round(b.width),ch:Math.round(b.height)};})()`);
  P(sk.sx >= sk.cx && sk.sy >= sk.cy && sk.sx + sk.sw <= sk.cx + sk.cw && sk.sy + sk.sh <= sk.cy + sk.ch &&
    sk.cx + sk.cw - (sk.sx + sk.sw) <= 20 && sk.cy + sk.ch - (sk.sy + sk.sh) <= 20,
    'L6 跳过落在收音卡右下角', sk);
  const before = await ev('window._currentGame.currentExpr');
  await ev("document.querySelector('#float-voice-overlay .mg-listen-card .lc-skip').click()");
  P((await ev('window._currentGame.currentExpr')) !== before, 'L6 收音区右下角跳过使题目前进');
  await shot('listen_stage_L6');
}

// L5 回归：无 mg-listen、无卡
await load(5);
const l5 = await ev(PROBE);
console.log(`\n--- L5 Space ---`);
P(!l5.listen, 'L5 未加 mg-listen');
P(l5.cardW == null || l5.titleVis === false, 'L5 无卡台/无标题');
await shot('listen_stage_L5');

// 视算回归：L1 视算不应加 mg-listen / 不显示一行标题
await send('Page.navigate', { url: BASE }, sessionId); await sleep(250);
await ev(`sessionStorage.setItem('gameLevel','1');sessionStorage.setItem('gameMode','visual');sessionStorage.removeItem('mgSprint');`);
await send('Page.reload', {}, sessionId);
for (let t = 0; t < 25; t++) { await sleep(250); if (await ev(`!!window._currentGame`)) break; }
await sleep(500);
const vis1 = await ev(PROBE);
console.log(`\n--- L1 视算回归 ---`);
P(!vis1.listen, 'L1 视算未加 mg-listen');
P(!vis1.titleVis, 'L1 视算不显示一行标题');

// Chrome91 禁用 token 扫描(仅我新增的方案B 段 + 卡台样式)
const html = readFileSync('index.html', 'utf8');
const banned = [':has(', 'color-mix(', 'oklch(', 'paint-order', '@layer', 'dvh', 'svh', 'lvh'];
const seg = html.slice(html.indexOf('方案B「聚光卡台」'), html.indexOf('局内连对 pill'));
const hits = banned.filter(t => seg.indexOf(t) >= 0);
P(hits.length === 0, 'Chrome91 禁用 token 扫描(方案B 段)', hits);

P(!(await ev('window.__err')), '全程无 JS 错误', await ev('window.__err'));
console.log('\n截图: ' + OUT + '/listen_stage_L*.png');
console.log(fail === 0 ? '=== 方案B 验证全过 ===' : '=== ' + fail + ' FAIL ===');
ws.close(); process.exit(fail ? 1 : 0);
