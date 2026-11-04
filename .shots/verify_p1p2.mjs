// P1(OCR 加载屏去彩虹) + P2(✓/✗ answer-mark → SVG) 设备端 CDP 验证 via :9222 (真机 Chrome91 WebView)。
// P1: 导航 game.html 后立刻截 loading 屏(DOM/HTML 非 rAF canvas，CDP 截图能抓到)，断言标题/进度条彩虹 hex 已消失、改 var(--c-*) 暖色、机器人→🔮。
// P2: skip OCR → showAnswerMark correct/wrong → 断言 answer-mark innerHTML 含 <use #i-check/#i-cross> 且解析、computed color 绿/红、无 dangling。
import { writeFileSync } from 'fs';
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
const ev = (expr, ret = true) => send('Runtime.evaluate', { expression: expr, returnByValue: ret, awaitPromise: true, userGesture: true });
await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__errs=[];window.addEventListener('error',e=>{try{window.__errs.push(String(e.message||e.error||e));}catch(_){}});` });
let fail = 0; const P = (ok, l, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };

// ===== P1: OCR loading screen =====
await ev(`sessionStorage.setItem('gameLevel','1');sessionStorage.setItem('gameMode','visual');location.href='game.html';`, false);
await sleep(950); // loading screen still up (OCR engine init)
const shot1 = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('.shots/game_device_p1_loading.png', Buffer.from(shot1.data, 'base64'));
const p1 = (await ev(`(() => {
  const RB = /#FF6B6B|#FFD93D|#6BCB77|#4D96FF/i;
  const bar = document.getElementById('ld-bar');
  const title = [...document.querySelectorAll('div')].find(d => d.textContent.trim() === '识别引擎准备中');
  const mascot = [...document.querySelectorAll('div')].find(d => d.textContent.trim() === '🔮');
  const bs = bar ? bar.getAttribute('style') : null, ts = title ? title.getAttribute('style') : null;
  return { hasBar: !!bar, hasTitle: !!title, mascot: mascot ? mascot.textContent.trim() : '(none)',
    barRainbow: bs ? RB.test(bs) : null, titleRainbow: ts ? RB.test(ts) : null,
    barWarm: bs ? /var\\(--c-/.test(bs) : null, titleWarm: ts ? /var\\(--c-/.test(ts) : null, errs: window.__errs };
})()`)).result.value;
console.log('\n--- P1 loading ---', JSON.stringify(p1));
P(p1.hasTitle && p1.titleRainbow === false, 'P1 title rainbow hex gone', 'rainbow=' + p1.titleRainbow);
P(p1.titleWarm === true, 'P1 title uses var(--c-*) warm gradient', 'warm=' + p1.titleWarm);
P(p1.hasBar && p1.barRainbow === false, 'P1 progress-bar rainbow hex gone', 'rainbow=' + p1.barRainbow);
P(p1.barWarm === true, 'P1 progress-bar uses var(--c-*) warm gradient', 'warm=' + p1.barWarm);
P(p1.mascot === '🔮', 'P1 mascot de-robotized (🤖→🔮)', p1.mascot);

// ===== P2: answer-mark SVG =====
await ev(`window._skipOcrLoading && window._skipOcrLoading();`, false);
await sleep(5000);
await ev(`showAnswerMark('answer-mark','correct',6000);`, false);
await sleep(400);
const shot2 = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('.shots/game_device_p2_mark.png', Buffer.from(shot2.data, 'base64'));
const p2 = (await ev(`(() => {
  const el = document.getElementById('answer-mark');
  const useHrefs = e => e ? [...e.querySelectorAll('use')].map(u => u.getAttribute('href')) : [];
  const corrUse = useHrefs(el), corrColor = el ? getComputedStyle(el).color : null, corrHTML = el ? el.innerHTML : null;
  const corrResolve = corrUse.length > 0 && corrUse.every(h => !!document.querySelector(h));
  showAnswerMark('answer-mark','wrong',6000);
  const wrongUse = useHrefs(el), wrongColor = el ? getComputedStyle(el).color : null, wrongHTML = el ? el.innerHTML : null;
  const wrongResolve = wrongUse.length > 0 && wrongUse.every(h => !!document.querySelector(h));
  const dangling = [...document.querySelectorAll('use')].map(u => u.getAttribute('href')).filter(h => h && !document.querySelector(h));
  return { corrHTML, corrColor, corrUse, corrResolve, wrongHTML, wrongColor, wrongUse, wrongResolve,
    dangling, ua: navigator.userAgent, tap: getComputedStyle(document.documentElement).webkitTapHighlightColor, errs: window.__errs };
})()`)).result.value;
console.log('\n--- P2 answer-mark ---', JSON.stringify(p2, null, 2));
P(/Chrome\/91\./.test(p2.ua), 'P2 WebView Chrome/91', (p2.ua.match(/Chrome\/[\d.]+/) || [])[0]);
P(p2.corrUse.includes('#i-check'), 'P2 correct → <use #i-check>', JSON.stringify(p2.corrUse));
P(p2.corrResolve, 'P2 correct <use> resolves', String(p2.corrResolve));
P(p2.corrColor === 'rgb(22, 163, 74)', 'P2 correct color green #16a34a (state)', p2.corrColor);
P(p2.wrongUse.includes('#i-cross'), 'P2 wrong → <use #i-cross>', JSON.stringify(p2.wrongUse));
P(p2.wrongResolve, 'P2 wrong <use> resolves', String(p2.wrongResolve));
P(p2.wrongColor === 'rgb(220, 38, 38)', 'P2 wrong color red #dc2626 (state)', p2.wrongColor);
P(p2.dangling.length === 0, 'P2 no dangling <use> anywhere', JSON.stringify(p2.dangling));
P(Array.isArray(p2.errs) && p2.errs.length === 0, 'no JS errors', JSON.stringify(p2.errs));
console.log('\n' + (fail === 0 ? '=== P1+P2 DEVICE PASS ===' : '=== ' + fail + ' FAIL ===')); ws.close(); process.exit(fail ? 1 : 0);
