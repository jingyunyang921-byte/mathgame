// 一期 P1-c：局内连对 pill(#float-combo) 六关验证 via 本地 Chrome :9333。
// 要点 1：节点必须真实存在 —— #float-voice-heard 当初就是漏了节点，当时三关的识别数字被静默丢弃，
//         所以不只看「显不显示」，还要确认 mgShowCombo 真的写进了那个 DOM 节点。
// 要点 2：不许遮挡。这里不用手写 HUD 名单（第一版就是因为名单漏项，放过了太空关压题目、巅峰关压 0/20），
//         改成泛扫：所有可见且「带自有文字」或在活读数白名单里的元素，与 pill 矩形交集必须为空。
//         装饰性 canvas（赛道/竞技场）压上去无所谓，所以不进扫描口径。
//         pill 最终落点 right:14px / bottom:150px 不是挑的，是 .shots/diag_combo_slot4.mjs 在
//         6 关卡模式 × 5 视口 = 30 个场景上扫出来的唯一全空角位（正底部要让开 131px 高的麦克风卡）。
// 要点 3：连对断了不给负反馈 —— mgOnWrong 之后 pill 不能冒出来。
// 要点 4：prefers-reduced-motion:reduce 下动画关停，但 pill 和星星仍要可见（靠动画 opacity 上场的
//         元素一关动画就等于关显示，这条是单独的回归闸门）。
import { writeFileSync, mkdirSync } from 'fs';
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
  if (r.exceptionDetails) throw new Error('EVAL: ' + (r.exceptionDetails.exception || {}).description);
  return r.result.value;
};
await send('Page.enable'); await send('Runtime.enable');
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });  // 新脚本一律禁缓存
mkdirSync('.shots/out', { recursive: true });
let fail = 0; const P = (ok, l, x) => { console.log((ok ? '  PASS ' : '  FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
const base = 'http://localhost:8000/index.html';
const vp = (w, h) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });

const PROBE = `(() => {
  const el = document.getElementById('float-combo');
  if (!el) return { missing: true };
  const st = getComputedStyle(el), r = el.getBoundingClientRect(), u = el.querySelector('use');
  // 活读数白名单：这些就算自己没有文字节点（数字在子节点里 / 是容器）也必须躲开
  const LIVE = ['#question-card','#question-display','#battle-question-card','#battle-question-display',
                '#space-question-display','#feedback-msg','#battle-feedback','#answer-mark','#battle-answer-mark',
                '#battle-score-display','#battle-score-num','#battle-countdown','#monster-hp-container',
                '#float-voice-overlay','#voice-mic-area','#exit-btn','#submit-btn','#clear-btn','#skip-btn',
                '#race-prog-player','#race-prog-monster','#space-progress-label'];
  const hits = [];
  if (r.width > 0) for (const e of document.querySelectorAll('body *')) {
    if (e === el || el.contains(e)) continue;
    const s = getComputedStyle(e), b = e.getBoundingClientRect();
    if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.02) continue;
    if (b.width <= 0 || b.height <= 0) continue;
    if (e.closest('#overlay') || e.closest('#exit-modal')) continue;
    // .bg-deco 是满屏飘的壁纸字符(✨🌟 等)：position:fixed / z-index:0 / opacity:.18 / 14s 无限
    // 动画，层级在 pill(280) 之下，本来就不是内容。不排掉它这条断言是不确定的 —— 同一个位置
    // 连跑两次量到的交集会从 43x22 变成 44x19，因为它一直在飘（见 diag_sparkle.mjs）。
    if (e.classList.contains('bg-deco')) continue;
    // .lc-deco 是听算卡(方案B 聚光卡台)的装饰层：pointer-events:none / z-index:0 / 文字 rgba(140,100,60,0.09)
    // 近乎透明的飘浮「?」「＋×÷」星点，整层压在内容之下。pill(z280) 盖住它不算遮挡内容 —— 同 .bg-deco。
    if (e.closest('.lc-deco')) continue;
    if (b.width * b.height > window.innerWidth * window.innerHeight * 0.5) continue;
    const own = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
    if (!own && !LIVE.some(sel => e.matches(sel))) continue;
    const ox = Math.min(r.right, b.right) - Math.max(r.left, b.left);
    const oy = Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top);
    if (ox > 2 && oy > 2) hits.push((e.id ? '#' + e.id : e.tagName) + (own ? ':' + JSON.stringify(own.slice(0, 12)) : '')
                                   + '(' + Math.round(ox) + 'x' + Math.round(oy) + ')');
  }
  let topAt = null, notCovered = true;
  if (r.width > 0) {
    // pill 是 pointer-events:none，elementFromPoint 命中的是它「下面」那位；真正要防的是被更高层
    // 的 fixed 元素盖住，所以只看命中者的层级有没有爬到 280 以上。
    const e2 = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    topAt = e2 ? (e2.id || e2.tagName) : null;
    notCovered = !e2 || !(getComputedStyle(e2).position === 'fixed' && (+getComputedStyle(e2).zIndex || 0) > 280);
  }
  return {
    display: st.display, zIndex: st.zIndex, opacity: +st.opacity, animName: st.animationName,
    text: el.textContent, href: u ? u.getAttribute('href') : null,
    hrefResolves: !!(u && document.querySelector(u.getAttribute('href'))),
    animT: (el.getAnimations && el.getAnimations()[0]) ? Math.round(el.getAnimations()[0].currentTime) : -1,
    rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
    inView: r.top >= 0 && r.left >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight,
    hits, topAt, notCovered, streak: _mgStreak,
    gType: window._currentGame ? window._currentGame.constructor.name : null, errs: window.__errs || []
  };
})()`;

async function boot(lv, mode) {
  await send('Page.navigate', { url: base }); await sleep(400);
  await ev(`sessionStorage.setItem('gameLevel','${lv}');sessionStorage.setItem('gameMode','${mode}');`);
  await send('Page.reload'); await sleep(900);
  await ev(`window.__errs=[];addEventListener('error',e=>window.__errs.push(String(e.message)));`);
  await ev(`window._skipOcrLoading && window._skipOcrLoading();`);
  for (let i = 0; i < 30; i++) { if (await ev(`!!window._currentGame`)) { await sleep(500); return true; } await sleep(400); }
  return false;
}

const CASES = [
  { lv: 1, mode: 'visual', name: 'L1 视算 (Game 10以内)', gType: 'Game' },
  { lv: 1, mode: 'audio',  name: 'L1 听算 (Game+Mixin)',  gType: 'Game' },
  { lv: 2, mode: 'visual', name: 'L2 视算 (Game 20以内)', gType: 'Game' },
  { lv: 3, mode: 'audio',  name: 'L3 听算 (VoiceGame)',   gType: 'VoiceGame' },
  { lv: 4, mode: 'audio',  name: 'L4 听算 (RaceGame)',    gType: 'RaceGame' },
  { lv: 5, mode: 'visual', name: 'L5 视算 (SpaceGame)',   gType: 'SpaceGame' },
  { lv: 6, mode: 'audio',  name: 'L6 听算 (BattleGame)',  gType: 'BattleGame' },
];

await vp(1000, 576);                                   // 真机 CSS 尺寸
for (const c of CASES) {
  console.log('\n######## ' + c.name + ' @1000x576 ########');
  const ok = await boot(c.lv, c.mode);
  P(ok, '引擎已构造(轮询)', String(ok));
  if (!ok) continue;

  const n0 = await ev(PROBE);
  P(!n0.missing, '#float-combo 节点存在于 DOM', n0.missing ? 'MISSING!' : 'ok');
  if (n0.missing) continue;
  P(n0.display === 'none', '初始不显示', n0.display);

  await ev(`_mgStreak=0;_mgMaxStreak=0;mgOnCorrect();`); await sleep(120);
  let r = await ev(PROBE);
  P(r.display === 'none' && r.streak === 1, '连对 1 不打扰', r.display + ' streak=' + r.streak);
  await ev(`mgOnCorrect();`); await sleep(120);
  r = await ev(PROBE);
  P(r.display === 'none' && r.streak === 2, '连对 2 不打扰', r.display + ' streak=' + r.streak);
  await ev(`mgOnCorrect();`); await sleep(150);
  r = await ev(PROBE);
  P(r.display === 'flex', '连对 3 弹出', r.display);
  P(r.streak === 3 && r.text === '连对 3！', '文案跟 _mgStreak 同步', JSON.stringify(r.text));
  P(r.href === '#i-flame' && r.hrefResolves, '火苗图标解析', r.href);
  P(r.zIndex === '280', 'z-index 280(压在悬浮麦克风 300 之下)', r.zIndex);
  P(r.opacity > 0.3, '动画中确实可见', String(r.opacity));
  P(r.animName === 'combo-pop', '动画已挂上', r.animName);
  P(r.inView, 'pill 完整在视口内', JSON.stringify(r.rect));
  P(r.hits.length === 0, '不遮挡任何文字/活读数', JSON.stringify(r.hits));
  P(r.notCovered, 'pill 未被更高层 fixed 元素盖住', String(r.topAt));

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const f = '.shots/out/combo_L' + c.lv + '_' + c.mode + '.png';
  writeFileSync(f, Buffer.from(shot.data, 'base64')); console.log('  shot → ' + f);

  await ev(`mgOnCorrect();`); await sleep(80);
  r = await ev(PROBE);
  P(r.text === '连对 4！' && r.display === 'flex', '连对 4 文案递增', JSON.stringify(r.text));
  P(r.animT >= 0 && r.animT < 400, '动画从头重播(currentTime 归零)', r.animT + 'ms');
  await sleep(1200);
  r = await ev(PROBE);
  P(r.display === 'none', '0.9s 后自动收起', r.display);
  await ev(`mgOnWrong();`); await sleep(200);
  r = await ev(PROBE);
  P(r.display === 'none' && r.streak === 0, '答错不弹负反馈、连对归零', r.display + ' streak=' + r.streak);
  P(r.errs.length === 0, '无 JS 错误', JSON.stringify(r.errs));
}

// ---- 视口扫描：底部最拥挤的两关(L1 视算有清除/跳过按钮、L6 左栏到底) × 竖屏/小横屏 ----
for (const [w, h] of [[412, 915], [900, 500], [1280, 720]]) {
  await vp(w, h);
  for (const c of [{ lv: 1, mode: 'visual' }, { lv: 6, mode: 'audio' }]) {
    console.log('\n######## L' + c.lv + ' ' + c.mode + ' @' + w + 'x' + h + ' ########');
    if (!(await boot(c.lv, c.mode))) { P(false, '引擎已构造'); continue; }
    await ev(`_mgStreak=0;mgOnCorrect();mgOnCorrect();mgOnCorrect();`); await sleep(200);
    const r = await ev(PROBE);
    P(r.display === 'flex', 'pill 弹出', r.display);
    P(r.inView, 'pill 完整在视口内', JSON.stringify(r.rect) + ' / ' + w + 'x' + h);
    P(r.hits.length === 0, '不遮挡任何文字/活读数', JSON.stringify(r.hits));
    P(r.errs.length === 0, '无 JS 错误', JSON.stringify(r.errs));
  }
}

// ---- 减弱动态效果：动画关停但仍可见（L1 单测）----
console.log('\n######## prefers-reduced-motion: reduce ########');
await vp(1000, 576);
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
if (await boot(1, 'visual')) {
  await ev(`_mgStreak=0;mgOnCorrect();mgOnCorrect();mgOnCorrect();`); await sleep(200);
  const rm = await ev(PROBE);
  P(rm.animName === 'none', 'combo 动画已关停', rm.animName);
  P(rm.display === 'flex' && rm.opacity > 0.9, 'combo 静态仍可见(没被动画连带关掉)', rm.display + ' op=' + rm.opacity);
  P(rm.hits.length === 0, '静态态也不遮挡', JSON.stringify(rm.hits));
  await ev(`_mgWrong=0;_mgCorrect=10;_mgMaxStreak=10;_mgRoundStart=Date.now()-8000;debugEndGame(true);`); await sleep(500);
  const rs = await ev(`(() => { const ss=[...document.querySelectorAll('#overlay-stars .star')];
    return { n: ss.length, anim: ss.map(s=>getComputedStyle(s).animationName).join(','),
             op: ss.map(s=>+getComputedStyle(s).opacity).join(','),
             w: ss.map(s=>Math.round(s.getBoundingClientRect().width)).join(',') }; })()`);
  P(rs.n === 3 && /^none(,none)*$/.test(rs.anim), '星星动画已关停', rs.anim);
  P(/^1(,1)*$/.test(rs.op) && !/\b0\b/.test(rs.w), '星星静态仍可见', 'op=' + rs.op + ' w=' + rs.w);
} else P(false, '引擎已构造');
await send('Emulation.setEmulatedMedia', { features: [] });

console.log('\n' + (fail === 0 ? '=== COMBO PASS ===' : '=== ' + fail + ' FAIL ==='));
ws.close(); process.exit(fail ? 1 : 0);
