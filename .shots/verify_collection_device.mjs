// Device acceptance for 图鉴「旅行伙伴」(#collectionModal) over CDP on the real learning tablet.
// Prereq: app in foreground (parent/STANDARD mode) + `adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>`.
// Injects a mixed-progress save (L1 三星/L2 二星/L3 一星/L4 已解锁未通关 dim/L5-6 锁) → showCollection() →
// reads back per-cell state + captures a PNG (CDP bypasses FLAG_SECURE). Asserts the same invariants
// the local verify checks, but on the device's actual WebView (Chrome 91/109).
import { writeFileSync } from 'node:fs';
const CDP = 'http://localhost:9222';
const targets = await (await fetch(CDP + '/json')).json();
const page = targets.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || targets[0];
console.log('target:', JSON.stringify(page.title), '|', page.url);
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let _id = 0; const pending = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params) => { const id = ++_id; return new Promise((res, rej) => { pending.set(id, m => m.error ? rej(new Error(method + ':' + JSON.stringify(m.error))) : res(m.result)); ws.send(JSON.stringify({ id, method, params: params || {} })); }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
await send('Page.enable');
await send('Runtime.enable');

const SEED = { stars: { 1: 3, 2: 2, 3: 1 }, done: 3 };
const PROBE = `(() => {
  const S = ${JSON.stringify(SEED)};
  localStorage.setItem('mathgameStars', JSON.stringify(S.stars));
  localStorage.setItem('mathgameMaxCompletedLevel', String(S.done));
  showCollection();
  const modal = document.getElementById('collectionModal');
  const card = modal.querySelector('.locked-modal-card');
  const grid = document.getElementById('collectionGrid');
  const cr = card.getBoundingClientRect();
  const bad = [...document.querySelectorAll('use')].map(u => u.getAttribute('href')).filter(h => h && !document.querySelector(h));
  let styleTxt = [...document.querySelectorAll('style')].map(s => s.textContent).join('\\n').replace(/\\/\\*[\\s\\S]*?\\*\\//g, '');
  const banned = styleTxt.match(/paint-order|:has\\(|@layer|color-mix\\(|oklch\\(|\\d(dvh|svh|lvh)/g);
  const btns = [...document.querySelector('.topbar-actions').querySelectorAll('.icon-btn')];
  const btnHrefs = btns.map(b => b.querySelector('use').getAttribute('href'));
  const emoji = /[\\u{1F000}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{2190}-\\u{21FF}\\u{2B00}-\\u{2BFF}]/u.test(grid.innerText);
  return {
    iw: innerWidth, ih: innerHeight,
    open: modal.classList.contains('show') && modal.getAttribute('aria-hidden') === 'false',
    nCells: grid.children.length,
    nLit: grid.querySelectorAll('.stamp-cell.lit').length,
    nGold: grid.querySelectorAll('.stamp-cell.gold').length,
    nLocked: [...grid.querySelectorAll('.stamp-medal use')].filter(u => u.getAttribute('href') === '#i-lock').length,
    nDim: grid.querySelectorAll('.stamp-cell.dim').length,
    nOnStars: grid.querySelectorAll('.star.on').length,
    sub: document.getElementById('collectionSub').textContent,
    cell0Name: grid.children[0] ? grid.children[0].querySelector('.stamp-name').textContent : '',
    emojiInGrid: emoji, danglingUse: bad, bannedTokens: banned,
    inViewport: cr.top >= -0.5 && cr.bottom <= innerHeight + 0.5,
    gapTop: Math.round(cr.top), gapBottom: Math.round(innerHeight - cr.bottom),
    nIconBtns: btns.length, btnOrder: btnHrefs.join(','),
    hasAlbum: btnHrefs.includes('#i-album'), gearIsLast: btnHrefs[btnHrefs.length - 1] === '#i-gear',
    ua: navigator.userAgent,
  };
})()`;

const r = (await send('Runtime.evaluate', { expression: PROBE, returnByValue: true, userGesture: true })).result.value;
await sleep(400);
const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('e:/mathgame/mathgame/.shots/device_collection.png', Buffer.from(shot.data, 'base64'));
console.log(JSON.stringify(r, null, 2));

let fail = 0;
const P = (ok, label, extra) => { console.log((ok ? 'PASS ' : 'FAIL ') + label + (extra != null ? '  ' + extra : '')); if (!ok) fail++; };
console.log('\n===== DEVICE VERDICTS (' + r.iw + 'x' + r.ih + ') =====');
P(r.open, 'modal opens (show + aria-hidden=false)');
P(r.nCells === 6, '6 stamp cells', 'nCells=' + r.nCells);
P(r.nLit === 3, '3 lit (cleared) stamps', 'nLit=' + r.nLit);
P(r.nGold === 1, '1 gold (3-star) stamp', 'nGold=' + r.nGold);
P(r.nLocked === 0, 'no locked stamps (all levels open from the start)', 'nLocked=' + r.nLocked);
P(r.nDim === 3, '3 open-but-not-cleared dim partners (L4/L5/L6)', 'nDim=' + r.nDim);
P(r.nOnStars === 6, 'star row sums 3+2+1=6', 'nOnStars=' + r.nOnStars);
P(/已结识 3 \/ 6 位伙伴 · 1 位熟悉伙伴/.test(r.sub), 'subtitle counts rescued + intimate', JSON.stringify(r.sub));
P(r.cell0Name === '小兔', 'cell0 = MG_PARTNERS[1] name', JSON.stringify(r.cell0Name));
P(!r.emojiInGrid, 'grid has no emoji (inline SVG only)');
P(Array.isArray(r.danglingUse) && r.danglingUse.length === 0, 'all <use> resolve (incl #i-album/#i-lock)', JSON.stringify(r.danglingUse));
P(r.bannedTokens === null, 'no Chrome-91-banned CSS tokens', JSON.stringify(r.bannedTokens));
P(r.inViewport && r.gapTop >= 6 && r.gapBottom >= 6, 'card inside device viewport with room', 'top=' + r.gapTop + ' bottom=' + r.gapBottom);
P(r.nIconBtns === 4 && r.hasAlbum && r.gearIsLast, 'topbar 4 buttons incl 图鉴, gear last', r.btnOrder);
console.log('\nUA: ' + r.ua);
console.log('shot: .shots/device_collection.png');
console.log('\n===== ' + (fail === 0 ? 'DEVICE ALL PASS' : fail + ' FAILURE(S)') + ' =====');
ws.close();
process.exit(fail === 0 ? 0 : 1);
