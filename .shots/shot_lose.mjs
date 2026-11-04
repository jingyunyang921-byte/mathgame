// 截当前屏 + 触发「失败结算」overlay 截图，报告 lose 标题等计算样式，评估 AI 化点。
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

// 1) current screen
const s0 = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('.shots/game_device_current.png', Buffer.from(s0.data, 'base64'));

// 2) game instance? if none, (re)enter L1 visual
let g = (await ev(`window._currentGame ? window._currentGame.constructor.name : null`)).result.value;
if (!g) {
  await ev(`sessionStorage.setItem('gameLevel','1');sessionStorage.setItem('gameMode','visual');location.href='game.html';`, false);
  await sleep(1600); await ev(`window._skipOcrLoading && window._skipOcrLoading();`, false); await sleep(5000);
  g = (await ev(`window._currentGame ? window._currentGame.constructor.name : null`)).result.value;
}
console.log('game instance:', g);

// 3) trigger lose overlay
await ev(`debugEndGame(false);`, false);
await sleep(700);
const s1 = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('.shots/game_device_lose_before.png', Buffer.from(s1.data, 'base64'));

const r = (await ev(`(() => {
  const t = document.getElementById('overlay-title'), m = document.getElementById('overlay-msg'), sub = document.getElementById('overlay-sub'), em = document.getElementById('overlay-emoji'), bg = document.getElementById('overlay-bg');
  const cs = e => e ? getComputedStyle(e) : null;
  const ct = cs(t), cm = cs(m), csub = cs(sub), cbg = cs(bg);
  return { shown: document.getElementById('overlay').classList.contains('show'),
    title: t ? t.textContent : null, titleClass: t ? t.className : null, titleColor: ct ? ct.color : null, titleShadow: ct ? ct.textShadow : null,
    emoji: em ? em.textContent : null, msg: m ? m.innerHTML : null, msgColor: cm ? cm.color : null,
    sub: sub ? sub.textContent : null, subColor: csub ? csub.color : null,
    bgBg: cbg ? cbg.background.slice(0,80) : null };
})()`)).result.value;
console.log('\n--- LOSE overlay ---\n', JSON.stringify(r, null, 2));
ws.close(); process.exit(0);
