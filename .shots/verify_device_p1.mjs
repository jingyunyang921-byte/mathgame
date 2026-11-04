// 一期（P1-a/b/c）真机验证 via :9222（Chrome 91 WebView）。
// 为什么必须上真机：本地那套跑的是 Chrome 153，而这个项目吃过亏的地方全在 91 —— ctx.roundRect
// 缺失曾把关 3/4/5 画崩（见 apk-webview-chrome91-cdp）。新加的东西里有两类 91 相关风险：
//   1) 结算卡的星星/数据条用了 var() 嵌套 + SVG <use>，91 对 <use> 跨 symbol 继承 stroke 有脾气；
//   2) 连对 pill 是 position:fixed + animation，91 的 fixed 合成层在 WebView 里跟桌面不完全一样，
//      量出来的「不遮挡」坐标要在真机屏(1000x576)上再确认一次。
// 所以这里不重跑本地那套矩阵，只在真机唯一的那个视口上，把两件事各验一遍并截图。
import { writeFileSync, mkdirSync } from 'fs';
const CDP = 'http://localhost:9222';
const info = await (await fetch(CDP + '/json')).json();
const page = info.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || info[0];
console.log('target:', page.title, '|', page.url);
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p) => { const id = ++_id; return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify({ id, method: m, params: p || {} })); }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
await send('Page.enable'); await send('Runtime.enable');
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true });
  if (r.exceptionDetails) throw new Error('EVAL: ' + ((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text));
  return r.result.value;
};
await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__errs=[];window.addEventListener('error',function(e){try{window.__errs.push(String(e.message||e.error||e));}catch(_){}});` });
mkdirSync('.shots/out', { recursive: true });
let fail = 0; const P = (ok, l, x) => { console.log((ok ? '  PASS ' : '  FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };

// 遮挡口径跟 diag_combo_slot4 对齐：只认「真正不能挡的东西」，装饰招牌/画布不算。
const COMBO = `(() => {
  const el = document.getElementById('float-combo');
  if (!el) return { missing: true };
  const st = getComputedStyle(el), r = el.getBoundingClientRect(), u = el.querySelector('use');
  const SACRED = ['#question-card','#question-display','#battle-question-card','#battle-question-display',
    '#space-question-display','#feedback-msg','#battle-feedback','#answer-mark','#battle-answer-mark',
    '#battle-countdown','#battle-score-num','#battle-score-display','#monster-hp-text','#space-done',
    '#race-player-step','#race-monster-step','#race-prog-player','#race-prog-monster','#space-progress-label',
    '#float-voice-overlay','#voice-mic-area','#float-voice-heard','#voice-status-text','button','[onclick]'];
  const hits = [];
  if (r.width > 0) for (const e of document.querySelectorAll('body *')) {
    if (e === el || el.contains(e) || e.closest('#float-combo')) continue;
    const s = getComputedStyle(e), b = e.getBoundingClientRect();
    if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.02) continue;
    if (b.width <= 0 || b.height <= 0) continue;
    if (e.closest('#overlay') || e.closest('#exit-modal')) continue;
    if (!SACRED.some(sel => e.matches(sel))) continue;
    const ox = Math.min(r.right, b.right) - Math.max(r.left, b.left);
    const oy = Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top);
    if (ox > 0 && oy > 0) hits.push((e.id ? '#' + e.id : e.tagName) + '(' + Math.round(ox) + 'x' + Math.round(oy) + ')');
  }
  return { display: st.display, zIndex: st.zIndex, opacity: +st.opacity, animName: st.animationName,
    text: el.textContent, href: u ? u.getAttribute('href') : null,
    iconResolves: !!(u && document.querySelector(u.getAttribute('href'))),
    iconBox: u ? (() => { const ib = u.getBoundingClientRect(); return [Math.round(ib.width), Math.round(ib.height)]; })() : null,
    rect: [r.left, r.top, r.width, r.height].map(Math.round),
    inView: r.top >= 0 && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
    hits, streak: _mgStreak, vw: innerWidth, vh: innerHeight };
})()`;

const OVERLAY = `(() => {
  const ov = document.getElementById('overlay');
  const sw = document.getElementById('overlay-stars');
  const sb = document.getElementById('overlay-stats');
  const card = document.getElementById('overlay-content');
  const cr = card ? card.getBoundingClientRect() : null;
  // 星位是 <span class="star pop [on]">，不是自造的 .ov-star —— 直接数 children，口径跟
  // verify_overlay_stats.mjs:52 一致（第一版写了个不存在的类名，于是三关各假失败两条）。
  const stars = sw ? [...sw.children] : [];
  const chips = sb ? [...sb.children] : [];
  const bad = [...document.querySelectorAll('use')].map(u => u.getAttribute('href')).filter(h => h && !document.querySelector(h));
  return {
    ovShown: !!ov && getComputedStyle(ov).display !== 'none',
    starsDisplay: sw ? getComputedStyle(sw).display : '(none)',
    nStars: stars.length,
    onCount: stars.filter(s => s.classList.contains('on')).length,
    starBoxes: stars.map(s => Math.round(s.getBoundingClientRect().width)).join(','),
    starHrefs: stars.map(s => { const u = s.querySelector('use'); return u ? u.getAttribute('href') : null; }).join(','),
    starAria: sw ? sw.getAttribute('aria-label') : null,
    statsDisplay: sb ? getComputedStyle(sb).display : '(none)',
    chips: chips.map(c => c.innerText.replace(/\\n/g, ' ')),
    chipIcons: chips.map(c => { const u = c.querySelector('use'); return u ? u.getAttribute('href') : null; }),
    chipIconBoxes: chips.map(c => { const u = c.querySelector('use'); return u ? Math.round(u.getBoundingClientRect().width) : -1; }),
    rec: chips.map(c => c.classList.contains('rec')),
    cardTop: cr ? Math.round(cr.top) : null, cardBottom: cr ? Math.round(cr.bottom) : null,
    noOverflow: !!cr && cr.top >= -0.5 && cr.bottom <= innerHeight + 0.5,
    dangling: bad, snap: window.__snap || null, errs: window.__errs || [], vh: innerHeight };
})()`;

async function boot(lv, mode) {
  await ev(`sessionStorage.setItem('gameLevel','${lv}');sessionStorage.setItem('gameMode','${mode}');location.href='game.html';`);
  await sleep(1800);
  await ev(`window._skipOcrLoading && window._skipOcrLoading();`);
  for (let i = 0; i < 30; i++) { if (await ev(`!!window._currentGame`)) { await sleep(900); return true; } await sleep(400); }
  return false;
}

for (const [lv, mode, total, name] of [[1, 'visual', 10, 'L1 视算'], [5, 'visual', 10, 'L5 深空'], [6, 'audio', 20, 'L6 魔域']]) {
  console.log('\n######## ' + name + ' (真机 Chrome91) ########');
  P(await boot(lv, mode), '引擎已构造', 'L' + lv + ' ' + mode);

  // ---- P1-c 连对 pill ----
  await ev(`_mgStreak=0;_mgMaxStreak=0;mgOnCorrect();mgOnCorrect();`); await sleep(150);
  let c = await ev(COMBO);
  P(!c.missing, '#float-combo 节点存在', c.missing ? 'MISSING!' : 'ok');
  if (c.missing) continue;
  P(c.display === 'none', '连对 2 不打扰', c.display);
  await ev(`mgOnCorrect();`); await sleep(200);
  c = await ev(COMBO);
  P(c.display === 'flex', '连对 3 弹出', c.display);
  P(c.text === '连对 3！' && c.streak === 3, '文案跟 _mgStreak 同步', JSON.stringify(c.text));
  P(c.iconResolves && c.iconBox && c.iconBox[0] > 0, '火苗图标在 91 上真有尺寸', c.href + ' ' + JSON.stringify(c.iconBox));
  P(c.zIndex === '280', 'z-index 280（让开悬浮麦克风 300）', c.zIndex);
  P(c.opacity > 0.3, '动画中确实可见', String(c.opacity));
  P(c.inView, 'pill 完整在真机屏内', JSON.stringify(c.rect) + ' / ' + c.vw + 'x' + c.vh);
  P(c.hits.length === 0, '不挡题目/读数/控件/麦克风', JSON.stringify(c.hits));
  const s1 = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync('.shots/out/device_combo_L' + lv + '.png', Buffer.from(s1.data, 'base64'));
  await sleep(1100);
  P((await ev(COMBO)).display === 'none', '0.9s 后自动收起');

  // ---- P1-a/b 结算卡（0 错 → 3 星 + 新纪录）----
  await ev(`(() => {
    if (!window.__snapPatched) { const o = window.mgFinishRound;
      window.mgFinishRound = function () { const r = o.apply(this, arguments); window.__snap = r; return r; }; window.__snapPatched = 1; }
    window.__snap = null;
    try { localStorage.setItem('mathgameBest', JSON.stringify({ "${lv}": { t: 99, s: 2 } })); } catch (e) {}
    _mgWrong = 0; _mgCorrect = ${total}; _mgStreak = 0; _mgMaxStreak = 8; _mgRoundStart = Date.now() - 9000;
    debugEndGame(true); return 1; })()`);
  await sleep(1400);
  const o = await ev(OVERLAY);
  P(o.ovShown, '结算卡弹出');
  P(!!o.snap && o.snap.stars === 3 && o.snap.acc === 100 && o.snap.sec === 9,
    'mgFinishRound 快照正确', JSON.stringify(o.snap && { stars: o.snap.stars, acc: o.snap.acc, sec: o.snap.sec, maxStreak: o.snap.maxStreak }));
  P(o.starsDisplay !== 'none' && o.nStars === 3 && o.onCount === 3, '三颗星全亮', o.onCount + '/' + o.nStars + ' ' + o.starsDisplay);
  P(!/\b0\b/.test(o.starBoxes) && o.starBoxes.split(',').length === 3, '星星在 91 上真有尺寸', 'w=' + o.starBoxes);
  P(o.starHrefs === '#i-star,#i-star,#i-star', '三颗星都指向 #i-star', o.starHrefs);
  P(o.starAria === '本局 3 / 3 星', '星星区 aria 正确', JSON.stringify(o.starAria));
  P(o.statsDisplay !== 'none' && o.chips.length === 3, '三个数据 chip', JSON.stringify(o.chips));
  P(/100%/.test(o.chips[0]) && /9/.test(o.chips[1]) && /8/.test(o.chips[2]), 'chip 数值跟快照一致', JSON.stringify(o.chips));
  P(o.chipIconBoxes.slice(1).every(w => w > 0), 'chip 图标在 91 上真有尺寸', JSON.stringify(o.chipIconBoxes));
  P(o.rec[1] && o.rec[2], '破纪录的两个 chip 挂上 .rec', JSON.stringify(o.rec));
  P(o.noOverflow, '结算卡不溢出真机屏', o.cardTop + '→' + o.cardBottom + ' / ' + o.vh);
  P(o.dangling.length === 0, '无悬空 <use>', JSON.stringify(o.dangling));
  P(o.errs.length === 0, '无 JS 错误', JSON.stringify(o.errs));
  const s2 = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync('.shots/out/device_overlay_L' + lv + '.png', Buffer.from(s2.data, 'base64'));

  // ---- 失败局：星星区整块隐藏，不给低龄孩子「0 分」视觉 ----
  await ev(`_mgWrong=3;_mgCorrect=4;_mgMaxStreak=2;_mgRoundStart=Date.now()-15000;debugEndGame(false);`);
  await sleep(1300);
  const l = await ev(OVERLAY);
  P(l.starsDisplay === 'none', '失败局星星区整块隐藏', l.starsDisplay);
  P(l.starAria === null, '失败局不留上一局的 aria-label', JSON.stringify(l.starAria));
  P(l.statsDisplay !== 'none' && l.chips.length === 3, '失败局仍给数据条', JSON.stringify(l.chips));
  P(l.noOverflow, '失败局结算卡不溢出', l.cardTop + '→' + l.cardBottom + ' / ' + l.vh);
  P(l.errs.length === 0, '失败局无 JS 错误', JSON.stringify(l.errs));
}

console.log('\n' + (fail === 0 ? '=== DEVICE P1 PASS ===' : '=== ' + fail + ' FAIL ==='));
ws.close(); process.exit(fail ? 1 : 0);
