// 注：文件名沿用六关编号前的 l5，本脚本现在验的是第 6 关（六关编号）。
// L6 (关6 战斗 BattleGame) 设备端 CDP 验证 via :9222（真机 Chrome91 WebView）。
// 导航 game.html L6 + skip OCR；断言 token/题目/<use> 解析/触摸修复 + getImageData 证 canvas 真绘制（CDP 截图抓不到 rAF GPU 层）+ 截图。
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
await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__errs=[];window.addEventListener('error',e=>{try{window.__errs.push(String(e.message||e.error||e));}catch(_){}}); ` });
await ev(`sessionStorage.setItem('gameLevel','6');sessionStorage.setItem('gameMode','visual');location.href='game.html';`, false);
await sleep(1800);
await ev(`window._skipOcrLoading && window._skipOcrLoading();`, false);
await sleep(7000);
const METRICS = `(() => {
  const rs = getComputedStyle(document.documentElement), tok = n => rs.getPropertyValue(n).trim();
  const qd = document.querySelector('#battle-question-display');
  const sc = document.querySelector('#battle-scene'), ac = document.querySelector('#battle-arena-canvas'), bc = document.querySelector('#battle-canvas');
  const bad = [...document.querySelectorAll('use')].map(u => u.getAttribute('href')).filter(h => h && !document.querySelector(h));
  let sel = -1; try { const s = getSelection(); s.removeAllRanges(); document.execCommand('selectAll', false, null); sel = (s.toString() || '').trim().length; s.removeAllRanges(); } catch (e) { sel = -2; }
  const g = window._currentGame || null;
  const acx = ac && ac.getContext('2d');
  const smp = (cv, x, y) => { try { const d = cv.getContext('2d').getImageData(Math.floor(x), Math.floor(y), 1, 1).data; return d[0]+','+d[1]+','+d[2]+','+d[3]; } catch (e) { return 'ERR:' + e.message; } };
  return { ua: navigator.userAgent, surface: tok('--c-surface'), grad: tok('--grad-angle'),
    qdText: qd ? qd.textContent : '(no qd)', sceneDisp: sc ? getComputedStyle(sc).display : '(no sc)',
    arenaWH: ac ? (ac.width + 'x' + ac.height) : '(no ac)', canvasWH: bc ? (bc.width + 'x' + bc.height) : '(no bc)',
    arena_c: ac ? smp(ac, ac.width/2, ac.height/2) : 'n/a', arena_r: ac ? smp(ac, ac.width*0.72, ac.height*0.5) : 'n/a', arena_l: ac ? smp(ac, ac.width*0.28, ac.height*0.55) : 'n/a',
    gType: g ? (g.constructor && g.constructor.name) : 'no-game', hasRaf: g ? (g.rafId != null || g._rafId != null || g.animId != null) : null, ended: g ? g.gameEnded : null,
    dangling: bad, tapHtml: getComputedStyle(document.documentElement).webkitTapHighlightColor, selLen: sel, errs: window.__errs || 'no-hook', url: location.pathname };
})()`;
let fail = 0; const P = (ok, l, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
const r = (await ev(METRICS)).result.value;
console.log('\n--- L6 device ---', JSON.stringify(r, null, 2));
P(/Chrome\/(9[1-9]|1\d\d)\./.test(r.ua), 'L6 WebView >= Chrome/91', (r.ua.match(/Chrome\/[\d.]+/) || [])[0]);
P(!!r.surface, 'L6 --c-surface resolves', r.surface);
P(r.grad === '160deg', 'L6 grad 160deg', r.grad);
// 减号是排版用的 U+2212「−」而不是 ASCII 连字符 —— 四则运算改版后 L6 会出减法题，
// 原来的字符类只写了 ASCII '-'，于是一道合法的「89 − 6 = ?」把这条断言判成了失败。
P(/[×÷+\-−]/.test(r.qdText), 'L6 question renders', r.qdText);
P(r.arenaWH !== '0x0' && r.arenaWH !== '(no ac)', 'L6 arena canvas sized', r.arenaWH);
P(/^[1-9]|,[1-9]/.test(r.arena_c) || /[1-9]/.test((r.arena_c||'').split(',').slice(0,3).join('')), 'L6 arena drawn (getImageData center non-black)', r.arena_c);
P(r.dangling.length === 0, 'L6 all <use> resolve (i-timer/i-pencil/…)', JSON.stringify(r.dangling));
P(Array.isArray(r.errs) && r.errs.length === 0, 'L6 no JS errors', JSON.stringify(r.errs));
P(r.tapHtml === 'rgba(0, 0, 0, 0)' || r.tapHtml === 'transparent', 'L6 tap-highlight transparent', r.tapHtml);
P(r.selLen === 0, 'L6 long-press selects nothing', 'chars=' + r.selLen);
const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('.shots/game_device_L5.png', Buffer.from(shot.data, 'base64'));
console.log('\n' + (fail === 0 ? '=== L6 DEVICE PASS ===' : '=== ' + fail + ' FAIL ===')); ws.close(); process.exit(fail ? 1 : 0);
