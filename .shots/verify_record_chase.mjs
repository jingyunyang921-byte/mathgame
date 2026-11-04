// 速算「追纪录」闸门（本地 Chrome :9333 / 静态服 :8000）：
// ①HUD 纪录条的各个时刻(有纪录/没纪录)：旗位、条长、提示语、近/过线类 ②过线金牌每局只放一次、自清、不挡点击、在屏内
// ③开场卡「今天的目标」 ④结算卡金徽章/近了小进度框在矮屏不溢出 ⑤宝箱舞台「新纪录」chip ⑥减少动态下不再摆动。
import { mkdirSync, writeFileSync } from 'fs';
const CDP = 'http://localhost:9333';
const info = await (await fetch(CDP + '/json')).json();
const page = info.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || info[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p) => { const id = ++_id; return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify({ id, method: m, params: p || {} })); }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true });
  if (r.exceptionDetails) throw new Error('EVAL: ' + ((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text));
  return r.result.value;
};
await send('Page.enable'); await send('Runtime.enable');
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
mkdirSync('.shots/out', { recursive: true });
let fail = 0, total = 0;
const P = (ok, l, x) => { total++; console.log((ok ? '  PASS ' : '  FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
const GAME = 'http://localhost:8000/index.html';

const WIPE = `['mathgameSprintBest','mathgameDaily','mathgameDailyChest','mathgameStars','mathgameBest','mathgameMaxCompletedLevel',
  'mathgamePace','mathgameWrongLog'].forEach(k => localStorage.removeItem(k)); localStorage.setItem('mathgameRankSeen','999'); 1`;
async function bootSprint(w, h, best, reduce) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduce ? 'reduce' : 'no-preference' }] });
  await send('Page.navigate', { url: GAME }); await sleep(400);
  await ev(WIPE);
  await ev(`sessionStorage.setItem('gameLevel','0');sessionStorage.setItem('gameMode','visual');sessionStorage.setItem('mgSprint','1');
    ${best ? `localStorage.setItem('mathgameSprintBest','{"best":${best},"t":1}');` : ''}1`);
  await send('Page.reload'); await sleep(900);
  await ev(`window.__errs=[];addEventListener('error',e=>window.__errs.push(String(e.message)));window._skipOcrLoading && window._skipOcrLoading();1`);
  for (let i = 0; i < 30; i++) { if (await ev(`typeof mgRecordBurst === 'function' && !!window._currentGame`)) { await sleep(500); break; } await sleep(400); }
  await ev(`window.__bursts = []; const _o = mgRecordBurst; mgRecordBurst = (t, s) => { window.__bursts.push([t, s]); _o(t, s); }; 1`);
}
const setScore = (n) => ev(`(() => { const g = window._currentGame; g.playerScore = ${n}; g._updateHPBar(); return 1; })()`);
const HUD = `(() => {
  const hc = document.getElementById('monster-hp-container'), pin = hc.querySelector('.sr-pin'), zone = hc.querySelector('.sr-zone');
  const lab = document.getElementById('monster-hp-label');
  return { cls: hc.className, label: lab.textContent.replace(/\\s+/g, ' ').trim(), l: (lab.querySelector('.sr-l') || {}).textContent || '',
    r: (lab.querySelector('.sr-r') || {}).textContent || '', pinNum: pin ? pin.textContent : null,
    pinLeft: pin ? pin.style.left : null, zoneLeft: zone ? zone.style.left : null,
    fill: document.getElementById('monster-hp-fill').style.width, bursts: window.__bursts.length,
    burstDom: document.querySelectorAll('.sr-burst').length, errs: window.__errs || [] };
})()`;

// ======== 1. 有纪录（12 题）：纪录条各时刻 ========
console.log('\n######## 1. HUD 纪录条（纪录 12 题）########');
await bootSprint(1000, 576, 12);
await setScore(5);
let h = await ev(HUD);
P(/\bsr\b/.test(h.cls) && !/sr-near|sr-won/.test(h.cls), '刚开始：.sr，没有近/过线类', h.cls);
P(/答对 5 题/.test(h.l) && h.r === '还差 8 题，超过纪录', '刚开始：「答对 5 题」+「还差 8 题，超过纪录」', JSON.stringify([h.l, h.r]));
P(h.pinNum === '12' && h.zoneLeft === (12 / 15 * 100) + '%' && h.fill.startsWith('33.3'), '旗面写 12、目标区从 80% 起、条填 33.3%', JSON.stringify([h.pinNum, h.zoneLeft, h.fill]));
await setScore(10);
h = await ev(HUD);
P(/\bsr-near\b/.test(h.cls) && h.r === '只差 3 题！加油！', '差 3 题：进入「快追上了」(sr-near) + 「只差 3 题！加油！」', JSON.stringify([h.cls, h.r]));
await setScore(12);
h = await ev(HUD);
P(/\bsr-near\b/.test(h.cls) && !/sr-won/.test(h.cls) && h.r === '只差 1 题！加油！' && h.bursts === 0,
  '追平(12)还不算破纪录：仍是「只差 1 题！加油！」、没放金牌', JSON.stringify([h.cls, h.r, h.bursts]));
await setScore(13);
h = await ev(HUD);
P(/\bsr-won\b/.test(h.cls) && !/sr-near/.test(h.cls) && h.r === '新纪录！还在涨' && h.pinNum === '★',
  '13 题：过线(sr-won)、旗面换 ★、「新纪录！还在涨」', JSON.stringify([h.cls, h.r, h.pinNum]));
P(h.bursts === 1 && h.burstDom === 1, '过线那一刻放一次金牌', JSON.stringify([h.bursts, h.burstDom]));
const bt = await ev(`document.querySelector('.sr-burst').innerText.replace(/\\s+/g, ' ').trim()`);
P(bt === '破纪录啦！ 已经超过 12 题', '金牌字：「破纪录啦！」+「已经超过 12 题」', bt);
await sleep(700);
const bx = await ev(`(() => { const b = document.querySelector('.sr-burst'), r = b.querySelector('.bb').getBoundingClientRect(), cs = getComputedStyle(b);
  return { l: r.left, t: r.top, rr: r.right, b: r.bottom, iw: innerWidth, ih: innerHeight, pe: cs.pointerEvents, aria: b.getAttribute('aria-hidden') }; })()`);
P(bx.l >= 0 && bx.rr <= bx.iw && bx.t >= 0 && bx.b <= bx.ih, '金牌完整在屏内 1000×576', [bx.l, bx.t, bx.rr, bx.b].map(Math.round).join(','));
P(bx.pe === 'none' && bx.aria === 'true', '金牌不拦点击(pointer-events:none)、对读屏隐藏', JSON.stringify([bx.pe, bx.aria]));
await setScore(14); await setScore(15);
h = await ev(HUD);
P(h.bursts === 1, '继续涨分不重复放金牌（一局只放一次）', String(h.bursts));
await sleep(1300);
h = await ev(HUD);
P(h.burstDom === 0, '金牌约 1.7 秒后自清', String(h.burstDom));
P(h.errs.length === 0, '无 JS 错误', JSON.stringify(h.errs));
let s0 = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('.shots/out/rc_hud_won_1000x576.png', Buffer.from(s0.data, 'base64'));

// ======== 2. 没纪录：先追 10 题 ========
console.log('\n######## 2. HUD（还没纪录，先追 10 题）########');
await bootSprint(1000, 576, 0);
await setScore(0);
h = await ev(HUD);
P(h.r === '还差 10 题，立个纪录' && h.pinNum === '10' && h.fill === '0%', '开局：旗在 10、「还差 10 题，立个纪录」、条 0', JSON.stringify([h.r, h.pinNum, h.fill]));
await setScore(8);
h = await ev(HUD);
P(/\bsr-near\b/.test(h.cls) && h.r === '只差 2 题！加油！', '8 题：「只差 2 题！加油！」', JSON.stringify([h.cls, h.r]));
await setScore(10);
h = await ev(HUD);
P(/\bsr-won\b/.test(h.cls) && h.r === '第一个纪录！还在涨' && h.pinNum === '★', '10 题：「第一个纪录！还在涨」(没纪录时 10 题就算立下)', JSON.stringify([h.cls, h.r, h.pinNum]));
P(h.bursts === 1, '放一次金牌', String(h.bursts));
const bt2 = await ev(`document.querySelector('.sr-burst').innerText.replace(/\\s+/g, ' ').trim()`);
P(bt2 === '达成目标！ 这就是你的第一个纪录', '金牌字：「达成目标！」+「这就是你的第一个纪录」', bt2);

// ======== 3. 再来一局：金牌锁存复位 ========
console.log('\n######## 3. 再来一局复位 ########');
await ev(`(() => { const g = window._currentGame; g.playerScore = 15; _mgCorrect = 15; _mgWrong = 1; _mgMaxStreak = 7; _mgRoundStart = Date.now() - 60000; debugEndGame(false); return 1; })()`);
await sleep(1200);
await ev(`document.getElementById('retry-btn').click(); 1`); await sleep(1500);
const rs = await ev(`(() => { const g = window._currentGame, hc = document.getElementById('monster-hp-container');
  return { latch: g._recBurst, won: hc.classList.contains('sr-won'), near: hc.classList.contains('sr-near'), best: g.sprintBest,
    burstDom: document.querySelectorAll('.sr-burst').length, errs: window.__errs || [] }; })()`);
P(rs.latch === false && !rs.won && !rs.near && rs.best === 15 && rs.burstDom === 0, '新一局：金牌锁存清零、条回到起点、追的是刚刷新的 15', JSON.stringify(rs));
await setScore(16);
h = await ev(HUD);
P(h.bursts === 2, '新一局再次过线能再放一次（共 2 次）', String(h.bursts));

// ======== 4. 开场卡「今天的目标」 ========
console.log('\n######## 4. 开场卡目标 ########');
await bootSprint(1000, 576, 12);
let ip = await ev(`(() => { const d = document.createElement('div'); d.innerHTML = mgIntroPrize(0, true);
  const flag = (d.querySelector('.ig-flag .fn') || {}).textContent, ig = (d.querySelector('b.ig') || {}).textContent;
  const f = d.querySelector('.ig-flag'); if (f) f.remove();
  return { text: d.textContent.replace(/\\s+/g, ' ').trim(), flag, ig, emoji: /[\\u{1F300}-\\u{1FAFF}\\u2B50\\u26A1]/u.test(d.textContent) }; })()`);
P(ip.text === '今天的目标：答对 13 题，超过你的纪录 12 题！' && ip.flag === '12' && ip.ig === '13', '有纪录 12：目标 13 题、旗面 12', JSON.stringify(ip));
P(!ip.emoji, '目标行没有 emoji（旗是内联 SVG）');
await bootSprint(1000, 576, 0);
ip = await ev(`(() => { const d = document.createElement('div'); d.innerHTML = mgIntroPrize(0, true);
  const flag = (d.querySelector('.ig-flag .fn') || {}).textContent;
  const f = d.querySelector('.ig-flag'); if (f) f.remove();
  return { text: d.textContent.replace(/\\s+/g, ' ').trim(), flag }; })()`);
P(ip.text === '先答对 10 题，立下你的第一个纪录！' && ip.flag === '10', '没纪录：先答对 10 题、旗面 10', JSON.stringify(ip));
const dom = await ev(`document.getElementById('intro-prize').textContent.replace(/\\s+/g, ' ').trim()`);
P(/先答对 10 题/.test(dom), '开场卡 #intro-prize 里真的写着它', JSON.stringify(dom));

// ======== 5. 结算卡：金徽章 / 小进度框 在各视口都放得下 ========
console.log('\n######## 5. 结算卡多视口 ########');
const CARD = `(() => {
  const card = document.getElementById('overlay-content') || document.querySelector('#overlay > *'), rec = document.getElementById('overlay-rec'),
    rb = document.getElementById('retry-btn'), r = e => e.getBoundingClientRect();
  const c = r(card), x = r(rec), b = r(rb), kid = rec.firstElementChild ? r(rec.firstElementChild) : null;
  return { iw: innerWidth, ih: innerHeight, card: [c.left, c.top, c.right, c.bottom].map(Math.round), btnB: Math.round(b.bottom),
    kind: rec.querySelector('.rbg') ? 'badge' : rec.querySelector('.nbx') ? 'near' : 'none',
    kidIn: kid ? kid.left >= c.left - 0.5 && kid.right <= c.right + 0.5 : null,
    cardScroll: card.scrollHeight - card.clientHeight, ribbonIn: (() => { const rbn = rec.querySelector('.ribbon'); if (!rbn) return null; const q = r(rbn); return q.top >= 0 && q.left >= c.left - 14; })(),
    errs: window.__errs || [] };
})()`;
for (const [w, hh] of [[1000, 576], [960, 552], [900, 500], [412, 915]]) {
  for (const [name, best, score, want] of [['破纪录', 14, 20, 'badge'], ['差一点', 20, 18, 'near'], ['差很多', 20, 8, 'near'], ['首个纪录', 0, 14, 'badge']]) {
    await bootSprint(w, hh, best);
    await ev(`(() => { const g = window._currentGame; g.playerScore = ${score}; _mgCorrect = ${score}; _mgWrong = 1; _mgMaxStreak = ${Math.min(score, 7)}; _mgRoundStart = Date.now() - 60000; debugEndGame(false); return 1; })()`);
    await sleep(350);
    const c = await ev(CARD), T = `[${w}x${hh} ${name}] `;
    P(c.kind === want, T + '结算卡里是' + (want === 'badge' ? '金徽章' : '小进度框'), c.kind);
    P(c.kidIn === true, T + '徽章/进度框没超出卡片左右', JSON.stringify(c.card));
    P(c.btnB <= c.ih && c.card[3] <= c.ih && c.card[1] >= 0, T + '卡片与「再来一局」按钮完整在屏内', `card.b=${c.card[3]} btn.b=${c.btnB} ih=${c.ih}`);
    P(c.cardScroll <= 1, T + '卡片内部不出滚动条', String(c.cardScroll));
    if (c.ribbonIn !== null) P(c.ribbonIn, T + '斜角标「新纪录」没被卡片左缘切掉');
    P(c.errs.length === 0, T + '无 JS 错误', JSON.stringify(c.errs));
    if (name === '破纪录' || (name === '差一点' && w !== 960)) {
      await ev(`(() => { const b = document.getElementById('mg-countdown-badge'); if (b) b.style.display = 'none'; return 1; })()`);
      const s = await send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(`.shots/out/rc_result_${name === '破纪录' ? 'rec' : 'near'}_${w}x${hh}.png`, Buffer.from(s.data, 'base64'));
    }
  }
}

// ======== 6. 舞台「新纪录」chip ========
console.log('\n######## 6. 宝箱舞台 chip ########');
await bootSprint(1000, 576, 14);
const ch = await ev(`(() => { const t = h => { const d = document.createElement('div'); d.innerHTML = h; return d; };
  const a = t(mgChestChips({ sprintN: 20, sprintRec: true, coins: 0, win: false, level: 0 }, {}));
  const b = t(mgChestChips({ sprintN: 20, sprintRec: false, coins: 0, win: false, level: 0 }, {}));
  return { rec: a.querySelector('.cs-chip.rec') ? a.querySelector('.cs-chip.rec').textContent.trim() : null, svg: !!a.querySelector('.cs-chip.rec use'),
    none: !!b.querySelector('.cs-chip.rec') }; })()`);
P(ch.rec === '新纪录 20 题' && ch.svg, '破纪录 → 舞台奖励牌多一张金色「新纪录 20 题」(内联 SVG 星)', JSON.stringify(ch));
P(ch.none === false, '没破纪录/第一次玩 → 没有这张牌');

// ======== 7. 减少动态 ========
console.log('\n######## 7. 减少动态 ########');
await bootSprint(1000, 576, 12, true);
await setScore(11);
const rm = await ev(`(() => { const pin = document.querySelector('#monster-hp-container .sr-pin'); return { pinAnim: getComputedStyle(pin).animationName, near: document.getElementById('monster-hp-container').classList.contains('sr-near') }; })()`);
P(rm.near && rm.pinAnim === 'none', '减少动态：快追上了，旗不再摆动', JSON.stringify(rm));
await setScore(13); await sleep(300);
const rb2 = await ev(`(() => { const b = document.querySelector('.sr-burst .bb'); return b ? getComputedStyle(b).animationName : 'NO-BURST'; })()`);
P(rb2 === 'none', '减少动态：金牌不播弹出动画(静态出现再自清)', rb2);

await send('Emulation.setEmulatedMedia', { features: [] });
await ev(WIPE + `;sessionStorage.clear();1`);
console.log('\n===== ' + (fail === 0 ? 'ALL PASS' : fail + ' FAILURE(S)') + ' (' + total + ' checks) =====');
ws.close(); process.exit(fail === 0 ? 0 : 1);
