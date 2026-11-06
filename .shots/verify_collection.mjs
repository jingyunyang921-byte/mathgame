// Local verify: 图鉴「旅行伙伴」(#collectionModal) — 6 格伙伴派生自 mathgameStars + 解锁进度。
// 两种存档：A=混合进度(有镀金/点亮/已解锁未通关 dim/锁)、B=全新安装(只有第 1 关解锁)。
// 断言：6 格渲染、lit/gold/locked/dim 各态数目、副标题计数(已结识 N/6 位伙伴)、星条、<use> 全解析、
// 无 Chrome-91 禁用 token、无 emoji、顶栏 4 钮(萌宠/错题/图鉴/齿轮)齿轮仍最右、卡片在视口内不溢出。
// Needs: headless Chrome --remote-debugging-port=9333 + http.server :8000 in e:/mathgame/mathgame.
import { writeFileSync } from 'node:fs';
const BROWSER = 'http://localhost:9333';
const URL = 'http://localhost:8000/menu.html';
const VIEWPORTS = [
  { name: '1000x615', w: 1000, h: 615 },
  { name: '1000x576', w: 1000, h: 576 },
  { name: '900x500', w: 900, h: 500 },
  { name: '412x915', w: 412, h: 915 },
];

const ver = await (await fetch(BROWSER + '/json/version')).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let _id = 0; const pending = new Map(); const waiters = [];
ws.onmessage = e => { const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  else if (m.method) { for (let i = waiters.length - 1; i >= 0; i--) if (waiters[i].pred(m)) waiters.splice(i, 1)[0].res(m); } };
const send = (method, params, sessionId) => { const id = ++_id; const msg = { id, method, params: params || {} }; if (sessionId) msg.sessionId = sessionId;
  return new Promise((res, rej) => { pending.set(id, m => m.error ? rej(new Error(method + ':' + JSON.stringify(m.error))) : res(m.result)); ws.send(JSON.stringify(msg)); }); };
const waitEvent = (pred, ms = 8000) => new Promise((res, rej) => { const w = { pred, res }; waiters.push(w); setTimeout(() => { const i = waiters.indexOf(w); if (i >= 0) { waiters.splice(i, 1); rej(new Error('timeout')); } }, ms); });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);
await send('Network.enable', {}, sessionId);
await send('Network.setCacheDisabled', { cacheDisabled: true }, sessionId);

// 探针：注入一组存档 → showCollection() → 读回每格状态。seedJson 是 {stars, done} 的 JSON 文本。
const PROBE = seed => `(() => {
  const S = ${JSON.stringify(seed)};
  if (S.stars === null) localStorage.removeItem('mathgameStars'); else localStorage.setItem('mathgameStars', JSON.stringify(S.stars));
  if (S.done === null) localStorage.removeItem('mathgameMaxCompletedLevel'); else localStorage.setItem('mathgameMaxCompletedLevel', String(S.done));
  showCollection();
  const modal = document.getElementById('collectionModal');
  const card = modal.querySelector('.locked-modal-card');
  const grid = document.getElementById('collectionGrid');
  const cells = [...grid.children];
  const cr = card.getBoundingClientRect();
  const gridHTML = grid.innerHTML;
  const bad = [...document.querySelectorAll('use')].map(u => u.getAttribute('href')).filter(h => h && !document.querySelector(h));
  let styleTxt = [...document.querySelectorAll('style')].map(s => s.textContent).join('\\n');
  styleTxt = styleTxt.replace(/\\/\\*[\\s\\S]*?\\*\\//g, '');
  const banned = styleTxt.match(/paint-order|:has\\(|@layer|color-mix\\(|oklch\\(|\\d(dvh|svh|lvh)/g);
  const acts = document.querySelector('.topbar-actions');
  const btns = [...acts.querySelectorAll('.icon-btn')];
  const btnHrefs = btns.map(b => b.querySelector('use').getAttribute('href'));
  const bandR = document.querySelector('.topbar').getBoundingClientRect().right;
  const bLast = btns[btns.length - 1].getBoundingClientRect();
  const emoji = /[\\u{1F000}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{2190}-\\u{21FF}\\u{2B00}-\\u{2BFF}]/u.test(grid.innerText);
  return {
    iw: innerWidth, ih: innerHeight,
    open: modal.classList.contains('show') && modal.getAttribute('aria-hidden') === 'false',
    nCells: cells.length,
    nLit: grid.querySelectorAll('.stamp-cell.lit').length,
    nGold: grid.querySelectorAll('.stamp-cell.gold').length,
    nLocked: [...grid.querySelectorAll('.stamp-medal use')].filter(u => u.getAttribute('href') === '#i-lock').length,
    nDim: grid.querySelectorAll('.stamp-cell.dim').length,
    nOnStars: [...grid.querySelectorAll('.stamp-cell')].reduce((t, c) => t + c.querySelectorAll('.fr-row')[0].querySelectorAll('path[fill="#FFB62E"]').length, 0),
    sub: document.getElementById('collectionSub').textContent,
    cell0Name: cells[0] ? cells[0].querySelector('.stamp-name').textContent : '',
    emojiInGrid: emoji,
    danglingUse: bad, bannedTokens: banned,
    gapTop: Math.round(cr.top), gapBottom: Math.round(innerHeight - cr.bottom),
    inViewport: cr.top >= -0.5 && cr.bottom <= innerHeight + 0.5,
    cardScrolls: card.scrollHeight - card.clientHeight > 1,
    nIconBtns: btns.length,
    btnOrder: btnHrefs.join(','),
    hasAlbum: btnHrefs.includes('#i-album'),
    gearIsLast: btnHrefs[btnHrefs.length - 1] === '#i-gear',
    actsFlushRight: Math.abs(bandR - bLast.right) < 2,
    ui: getComputedStyle(document.documentElement).getPropertyValue('--ui').trim(),
  };
})()`;

// A=混合：通关 1-3(1 关三星)、第 4 关已解锁但未通关、5/6 还锁着。
const SEED_A = { stars: { 1: 3, 2: 2, 3: 1 }, done: 3 };
// B=全新安装：无星、无进度 → 只有第 1 关解锁(显示关号)，2-6 全锁。
const SEED_B = { stars: null, done: null };

const results = [];
for (const vp of VIEWPORTS) {
  await send('Emulation.setDeviceMetricsOverride', { width: vp.w, height: vp.h, deviceScaleFactor: 1, mobile: false }, sessionId);
  const nav = waitEvent(m => m.method === 'Page.loadEventFired' && m.sessionId === sessionId);
  await send('Page.navigate', { url: URL }, sessionId);
  await nav; await sleep(350);
  const a = await send('Runtime.evaluate', { expression: PROBE(SEED_A), returnByValue: true }, sessionId);
  await sleep(300);
  let shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync('e:/mathgame/mathgame/.shots/collection_A_' + vp.name + '.png', Buffer.from(shot.data, 'base64'));
  const b = await send('Runtime.evaluate', { expression: PROBE(SEED_B), returnByValue: true }, sessionId);
  await sleep(250);
  shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync('e:/mathgame/mathgame/.shots/collection_B_' + vp.name + '.png', Buffer.from(shot.data, 'base64'));
  results.push({ vp, a: a.result.value, b: b.result.value });
}

let fail = 0;
const P = (ok, label, extra) => { console.log((ok ? 'PASS ' : 'FAIL ') + label + (extra != null ? '  ' + extra : '')); if (!ok) fail++; };
console.log(JSON.stringify(results.map(x => ({ vp: x.vp.name, A: x.a, B: x.b })), null, 2));
console.log('\n===== VERDICTS =====');
for (const { vp, a, b } of results) {
  console.log('\n-- ' + vp.name + '  (ui=' + a.ui + ')  -> .shots/collection_A_' + vp.name + '.png / _B_');
  P(a.open, 'A: modal opens (show + aria-hidden=false)');
  P(a.nCells === 6, 'A: 6 stamp cells', 'nCells=' + a.nCells);
  P(a.nLit === 3, 'A: 3 lit (cleared) stamps', 'nLit=' + a.nLit);
  P(a.nGold === 1, 'A: 1 gold (3-star) stamp', 'nGold=' + a.nGold);
  P(a.nLocked === 0, 'A: no locked stamps (all levels open from the start)', 'nLocked=' + a.nLocked);
  P(a.nDim === 3, 'A: 3 open-but-not-cleared dim partners (L4/L5/L6)', 'nDim=' + a.nDim);
  P(a.nOnStars === 6, 'A: star row sums 3+2+1=6 lit stars', 'nOnStars=' + a.nOnStars);
  P(/已结识 3 \/ 6 位伙伴 · 1 位熟悉伙伴/.test(a.sub), 'A: subtitle counts rescued + intimate', JSON.stringify(a.sub));
  P(a.cell0Name === '小兔', 'A: cell0 shows MG_PARTNERS[1] name', JSON.stringify(a.cell0Name));
  P(!a.emojiInGrid, 'A: grid has no emoji (de-AI, inline SVG only)');
  P(Array.isArray(a.danglingUse) && a.danglingUse.length === 0, 'A: all <use> resolve (incl #i-album/#i-lock)', JSON.stringify(a.danglingUse));
  P(a.bannedTokens === null, 'A: no Chrome-91-banned CSS tokens', JSON.stringify(a.bannedTokens));
  P(a.inViewport && a.gapTop >= 6 && a.gapBottom >= 6, 'A: card inside viewport with room', 'top=' + a.gapTop + ' bottom=' + a.gapBottom);
  if (vp.h <= 500) console.log('INFO 900x500(very short): card internal scroll ' + (a.cardScrolls ? 'ON (allowed)' : 'off'));
  else P(!a.cardScrolls, 'A: card itself does not scroll');
  P(a.nIconBtns === 4 && a.hasAlbum && a.gearIsLast && a.actsFlushRight,
    'A: topbar 4 buttons incl 图鉴, gear last, flush right', a.btnOrder);
  // B 全新安装
  P(b.nCells === 6 && b.nLit === 0 && b.nGold === 0, 'B(fresh): 6 cells, nothing lit', 'lit=' + b.nLit + ' gold=' + b.nGold);
  P(b.nLocked === 0 && b.nDim === 6, 'B(fresh): all 6 open, all dim silhouettes, none locked', 'locked=' + b.nLocked + ' dim=' + b.nDim);
  P(/已结识 0 \/ 6 位伙伴/.test(b.sub) && !/熟悉/.test(b.sub), 'B(fresh): subtitle 0/6, no intimate clause', JSON.stringify(b.sub));
}
console.log('\n===== ' + (fail === 0 ? 'ALL PASS' : fail + ' FAILURE(S)') + ' =====');
await send('Target.closeTarget', { targetId });
ws.close();
process.exit(fail === 0 ? 0 : 1);
