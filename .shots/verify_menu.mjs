// Local layout/logic verification for menu.html via CDP (headless Chrome).
// NOTE: local Chrome is modern; Chrome-91 compat is covered separately by the
// static banned-token scan + on-device CDP. This harness checks LAYOUT + JS behavior.
const BROWSER = 'http://localhost:9333';
const URL = 'http://localhost:8000/menu.html';
const VIEWPORTS = [
  { name: '960x576 landscape', w: 960, h: 576, land: true },
  { name: '960x552 landscape', w: 960, h: 552, land: true },
  { name: '1280x800 landscape', w: 1280, h: 800, land: true },
  { name: '390x844 portrait', w: 390, h: 844, land: false },
];

const ver = await (await fetch(BROWSER + '/json/version')).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);

let _id = 0;
const pending = new Map();
const waiters = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  else if (m.method) { for (let i = waiters.length - 1; i >= 0; i--) if (waiters[i].pred(m)) { waiters.splice(i, 1)[0].res(m); } }
};
function send(method, params, sessionId) {
  const id = ++_id;
  const msg = { id, method, params: params || {} };
  if (sessionId) msg.sessionId = sessionId;
  return new Promise((res, rej) => { pending.set(id, m => m.error ? rej(new Error(method + ': ' + JSON.stringify(m.error))) : res(m.result)); ws.send(JSON.stringify(msg)); });
}
function waitEvent(pred, ms = 8000) {
  return new Promise((res, rej) => { const w = { pred, res }; waiters.push(w); setTimeout(() => { const i = waiters.indexOf(w); if (i >= 0) { waiters.splice(i, 1); rej(new Error('timeout')); } }, ms); });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);
await send('Network.enable', {}, sessionId);
// 禁缓存：这个脚本原来没加，而它的全部断言都建立在「页面是刚改的那一版」上 ——
// 命中旧 menu.html 会让改动看起来「已经过了」。verify_fourops.mjs:17 记过同一个坑。
await send('Network.setCacheDisabled', { cacheDisabled: true }, sessionId);

const ASSERT = `(() => {
  const q = s => document.querySelector(s);
  const cta = q('.cta'); const cr = cta && cta.getBoundingClientRect();
  const ms = q('#menuScreen');
  const bv = q('#btnVisual');
  const rect = el => el ? [Math.round(el.getBoundingClientRect().width), Math.round(el.getBoundingClientRect().height)] : null;
  const before = JSON.stringify(rect(bv));
  if (window.setMode) { setMode('audio'); setMode('visual'); }
  const after = JSON.stringify(rect(bv));
  const bad = [...document.querySelectorAll('use')].map(u => u.getAttribute('href')).filter(h => h && !document.querySelector(h));
  const c5 = q('#card6'); const c5r = c5 && c5.getBoundingClientRect();
  const gt = q('.game-title'); const cs = gt && getComputedStyle(gt);
  const c1 = q('#card1');
  const styleTxt = [...document.querySelectorAll('style')].map(s => s.textContent).join('\\n');
  const banned = styleTxt.match(/paint-order|:has\\(|@layer|color-mix\\(|oklch\\(|\\d(dvh|svh|lvh)/g);
  return {
    iw: innerWidth, ih: innerHeight,
    ctaBottom: cr ? Math.round(cr.bottom) : null, ctaTop: cr ? Math.round(cr.top) : null,
    ctaInScreen: !!cr && cr.bottom <= innerHeight + 0.5 && cr.top >= -0.5,
    scrollDelta: ms ? (ms.scrollHeight - ms.clientHeight) : null,
    shrinkStable: before === after, mode_before: before, mode_after: after,
    danglingUse: bad,
    card6Right: c5r ? Math.round(c5r.right) : null,
    card6RightLimit: innerWidth - 56,
    card6RightOk: c5r ? (c5r.right <= innerWidth - 56 + 0.5) : null,
    titleClip: cs ? (cs.webkitBackgroundClip || cs.backgroundClip) : null,
    titleFill: cs ? cs.webkitTextFillColor : null,
    card1PadTop: c1 ? getComputedStyle(c1).paddingTop : null,
    card1PadLeft: c1 ? getComputedStyle(c1).paddingLeft : null,
    sp2: getComputedStyle(document.documentElement).getPropertyValue('--sp-2').trim(),
    ui: getComputedStyle(document.documentElement).getPropertyValue('--ui').trim(),
    bannedTokens: banned
  };
})()`;

const results = [];
for (const vp of VIEWPORTS) {
  await send('Emulation.setDeviceMetricsOverride', { width: vp.w, height: vp.h, deviceScaleFactor: 1, mobile: false }, sessionId);
  const nav = waitEvent(m => m.method === 'Page.loadEventFired' && m.sessionId === sessionId);
  await send('Page.navigate', { url: URL }, sessionId);
  await nav;
  await sleep(1400); // 等入场动画走完：打卡卡 0.6s 延迟 + 0.5s 的 translateY(16px) 上滑，期间会临时撑出 2~5px 滚动高度（矮屏 552 才露头），不是版式问题
  const { result } = await send('Runtime.evaluate', { expression: ASSERT, returnByValue: true, awaitPromise: true }, sessionId);
  results.push({ vp, r: result.value });
}

console.log(JSON.stringify(results, null, 2));

// ---- verdicts ----
let fail = 0;
const P = (ok, label, extra) => { console.log((ok ? 'PASS ' : 'FAIL ') + label + (extra != null ? '  ' + extra : '')); if (!ok) fail++; };
console.log('\n===== VERDICTS =====');
for (const { vp, r } of results) {
  console.log('\n-- ' + vp.name + '  (reported ' + r.iw + 'x' + r.ih + ') --');
  P(r.iw === vp.w && r.ih === vp.h, 'viewport matches', r.iw + 'x' + r.ih);
  P(r.ctaInScreen, 'CTA in-screen', 'bottom=' + r.ctaBottom + ' top=' + r.ctaTop + ' ih=' + r.ih);
  P(r.scrollDelta <= 1, 'no #menuScreen overflow', 'scrollDelta=' + r.scrollDelta);
  P(r.shrinkStable, 'setMode shrink-bug dead', r.mode_before + ' -> ' + r.mode_after);
  P(Array.isArray(r.danglingUse) && r.danglingUse.length === 0, 'all <use> resolve', JSON.stringify(r.danglingUse));
  if (vp.land) P(r.card6RightOk, 'card6 right <= iw-56', 'right=' + r.card6Right + ' limit=' + r.card6RightLimit);
  else console.log('SKIP card6 right (portrait grid, gutter rule N/A)  right=' + r.card6Right);
  P(r.titleClip === 'text', 'title background-clip:text alive', r.titleClip);
  P(r.bannedTokens === null, 'no banned tokens in <style>', JSON.stringify(r.bannedTokens));
}
// --ui effective: card1 horizontal padding (var(--pad-card)) must differ between 576 and 800 height.
// NOTE: paddingTop is intentionally a fixed 32px (clearance for the absolute 44px medallion at top:-22px,
// a non-scaling "material" element), so padLeft is the correct probe for --ui reaching the card.
const r576 = results.find(x => x.vp.h === 576).r, r800 = results.find(x => x.vp.h === 800).r;
P(r576.card1PadLeft !== r800.card1PadLeft, '--ui effective (card1 padLeft 576 vs 800 differ)', r576.card1PadLeft + ' vs ' + r800.card1PadLeft);
P(r576.ui === '.85' && r800.ui === '1', '--ui knob flips per media query', '576->' + r576.ui + '  800->' + r800.ui);

// ============================================================================
// P0-a 调试彩蛋：标题 2 秒内连点 5 次 → sessionStorage.mgDebug='1' → 游戏页才显示速通按钮。
// 两头都要断，而且「默认不可见」比「彩蛋能开」更重要 —— 前者漏了就等于正式包里内置作弊键，
// 所以下面先验默认态，再验彩蛋，最后再验回默认态（证明它真的是会话级开关而不是一次性单程门）。
// 注意 sessionStorage 是 per-tab 的，菜单页点出来的标志位能直接被同一个标签页里的游戏页读到 ——
// 这正好就是真实路径，所以这里全程复用同一个 target，不另开页。
// ============================================================================
const evm = async (expr) => {
  const x = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true }, sessionId);
  if (x.exceptionDetails) throw new Error('EVAL: ' + ((x.exceptionDetails.exception || {}).description || x.exceptionDetails.text));
  return x.result.value;
};
const goto = async (url) => {
  const nav = waitEvent(m => m.method === 'Page.loadEventFired' && m.sessionId === sessionId);
  await send('Page.navigate', { url }, sessionId); await nav; await sleep(400);
};
// 游戏页用听算：视算会拉 OCR 加载屏，而速通按钮的显隐在 load 处理器开头就定了，不必等引擎。
const DBG_PROBE = `(() => {
  const el = document.getElementById('debug-end-btns');
  if (!el) return { missing: true };
  const cs = getComputedStyle(el), b = el.getBoundingClientRect();
  return { missing: false, display: cs.display, visible: cs.display !== 'none' && b.width > 0 && b.height > 0,
           rect: [b.left, b.top, b.width, b.height].map(Math.round),
           flag: sessionStorage.getItem('mgDebug'),
           hasFn: typeof debugEndGame === 'function' };
})()`;

console.log('\n-- 调试彩蛋 / 速通按钮 --');
await send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 576, deviceScaleFactor: 1, mobile: false }, sessionId);
await goto('http://localhost:8000/menu.html');
await evm(`sessionStorage.removeItem('mgDebug');`);

// 1) 默认态：没点过彩蛋，游戏页不能有速通按钮
await goto('http://localhost:8000/index.html');
let d = await evm(DBG_PROBE);
P(!d.missing, '#debug-end-btns 节点存在于 DOM', d.missing ? 'MISSING!' : 'ok');
P(!d.visible && d.display === 'none', '默认进游戏页速通按钮不可见(正式包无作弊键)', d.display + ' flag=' + JSON.stringify(d.flag));
P(d.hasFn, 'debugEndGame 仍是全局函数(CDP 脚本靠它，不靠按钮)', String(d.hasFn));

// 2) 点不够 5 次不开
await goto('http://localhost:8000/menu.html');
P(!!(await evm(`!!document.querySelector('.title-wrap[onclick]')`)), '标题挂着 onclick=mgDebugTap()', 'ok');
await evm(`for (let i = 0; i < 4; i++) document.querySelector('.title-wrap').click();`);
P((await evm(`sessionStorage.getItem('mgDebug')`)) === null, '连点 4 次不开启', JSON.stringify(await evm(`sessionStorage.getItem('mgDebug')`)));

// 3) 点慢了也不开：3 下 → 停 2.1s → 2 下，计数器应该已经重置。
//    必须先 reload：上一条用例已经攒了 4 下，接着点就是第 5 下，会把这条验的东西整个盖掉
//    （第一版就是这么挂的 —— 测出「跨窗口也开了」，其实是前一条的连击还没散）。
await goto('http://localhost:8000/menu.html');
await evm(`sessionStorage.removeItem('mgDebug');`);
await evm(`for (let i = 0; i < 3; i++) document.querySelector('.title-wrap').click();`);
await sleep(2100);
await evm(`for (let i = 0; i < 2; i++) document.querySelector('.title-wrap').click();`);
P((await evm(`sessionStorage.getItem('mgDebug')`)) === null, '跨过 2 秒窗口计数重置，5 下也不开', JSON.stringify(await evm(`sessionStorage.getItem('mgDebug')`)));

// 4) 2 秒内连点 5 次才开，且给出可见回执
await goto('http://localhost:8000/menu.html');
const bannerBefore = await evm(`document.querySelector('.title-banner').textContent`);
await evm(`for (let i = 0; i < 5; i++) document.querySelector('.title-wrap').click();`);
P((await evm(`sessionStorage.getItem('mgDebug')`)) === '1', '连点 5 次 → sessionStorage.mgDebug==="1"', JSON.stringify(await evm(`sessionStorage.getItem('mgDebug')`)));
P((await evm(`document.querySelector('.title-banner').textContent`)) === '调试模式已开启', '副标题给出回执', JSON.stringify(await evm(`document.querySelector('.title-banner').textContent`)));
await sleep(1600);
P((await evm(`document.querySelector('.title-banner').textContent`)) === bannerBefore, '回执 1.4s 后复原', JSON.stringify(bannerBefore));

// 5) 带着标志位进游戏页 → 按钮出现（证明彩蛋真的通了，不是「永远隐藏」蒙对的）
await goto('http://localhost:8000/index.html');
d = await evm(DBG_PROBE);
P(d.visible && d.display === 'flex', '开启后游戏页速通按钮可见', d.display + ' ' + JSON.stringify(d.rect) + ' flag=' + JSON.stringify(d.flag));

// 6) 清掉标志位再进 → 回到隐藏（会话级开关，不是单程门）
await evm(`sessionStorage.removeItem('mgDebug');`);
await goto('http://localhost:8000/index.html');
d = await evm(DBG_PROBE);
P(!d.visible && d.display === 'none', '清掉标志位后又隐藏', d.display + ' flag=' + JSON.stringify(d.flag));

console.log('\n===== ' + (fail === 0 ? 'ALL PASS' : fail + ' FAILURE(S)') + ' =====');
await send('Target.closeTarget', { targetId });
ws.close();
process.exit(fail === 0 ? 0 : 1);
