// Local verify: 勋章成就墙 (#badgeModal/#badgeUnlockModal) — 判定派生自现有存档，解锁快照存 mathgameBadges。
// 两种存档：A=部分达成(通关+三星→2 枚)、B=全达成(6 枚全亮)。另测：解锁后条件回退仍不摘牌(永久性)、
// 档案弹窗「我的勋章墙」入口能打开、新解锁庆祝弹窗出现、升段庆祝占屏时庆祝让位。
// 断言：6 格渲染、lit 数、副标题计数、<use> 全解析、无 Chrome-91 禁用 token、无 emoji、
// 顶栏仍 4 钮齿轮最右(别打坏第 1 步)、卡片在视口内不溢出。
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
// 主探针：注入一组存档 → showBadges() → 读回每格状态。seed={stars,done,best,daily,pet,badges}。
const PROBE = seed => `(() => {
  const S = ${JSON.stringify(seed)};
  const put = (k, v) => { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); };
  put('mathgameStars', S.stars);
  if (S.done === null) localStorage.removeItem('mathgameMaxCompletedLevel'); else localStorage.setItem('mathgameMaxCompletedLevel', String(S.done));
  put('mathgameBest', S.best); put('mathgameDaily', S.daily); put('mathgamePet', S.pet); put('mathgameBadges', S.badges);
  showBadges();
  const modal = document.getElementById('badgeModal');
  const card = modal.querySelector('.locked-modal-card');
  const grid = document.getElementById('badgeGrid');
  const cells = [...grid.children];
  const cr = card.getBoundingClientRect();
  const litNames = [...grid.querySelectorAll('.badge-cell.lit .badge-name')].map(n => n.textContent);
  const bad = [...document.querySelectorAll('use')].map(u => u.getAttribute('href')).filter(h => h && !document.querySelector(h));
  let styleTxt = [...document.querySelectorAll('style')].map(s => s.textContent).join('\\n').replace(/\\/\\*[\\s\\S]*?\\*\\//g, '');
  const banned = styleTxt.match(/paint-order|:has\\(|@layer|color-mix\\(|oklch\\(|\\d(dvh|svh|lvh)/g);
  const btns = [...document.querySelector('.topbar-actions').querySelectorAll('.icon-btn')];
  const btnHrefs = btns.map(b => b.querySelector('use').getAttribute('href'));
  const bandR = document.querySelector('.topbar').getBoundingClientRect().right;
  const bLast = btns[btns.length - 1].getBoundingClientRect();
  const emoji = /[\\u{1F000}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{2190}-\\u{21FF}\\u{2B00}-\\u{2BFF}]/u.test(grid.innerText);
  return {
    iw: innerWidth, ih: innerHeight,
    open: modal.classList.contains('show') && modal.getAttribute('aria-hidden') === 'false',
    nCells: cells.length,
    nLit: grid.querySelectorAll('.badge-cell.lit').length,
    litNames,
    sub: document.getElementById('badgeSub').textContent,
    cell0Name: cells[0] ? cells[0].querySelector('.badge-name').textContent : '',
    gotCond: cells[0] ? cells[0].querySelector('.badge-cond').textContent : '',
    emojiInGrid: emoji, danglingUse: bad, bannedTokens: banned,
    gapTop: Math.round(cr.top), gapBottom: Math.round(innerHeight - cr.bottom),
    inViewport: cr.top >= -0.5 && cr.bottom <= innerHeight + 0.5,
    cardScrolls: card.scrollHeight - card.clientHeight > 1,
    nIconBtns: btns.length, btnOrder: btnHrefs.join(','),
    gearIsLast: btnHrefs[btnHrefs.length - 1] === '#i-gear',
    actsFlushRight: Math.abs(bandR - bLast.right) < 2,
    ui: getComputedStyle(document.documentElement).getPropertyValue('--ui').trim(),
  };
})()`;
// 永久性：解锁后把条件全部回退，但不碰 mathgameBadges → 快照仍在 → 仍点亮（勋章只升不降）。
const PROBE_PERM = `(() => {
  localStorage.removeItem('mathgameStars');
  localStorage.setItem('mathgameMaxCompletedLevel', '0');
  localStorage.removeItem('mathgameBest'); localStorage.removeItem('mathgameDaily'); localStorage.removeItem('mathgamePet');
  hideBadges(); showBadges();
  const grid = document.getElementById('badgeGrid');
  return { nLit: grid.querySelectorAll('.badge-cell.lit').length, sub: document.getElementById('badgeSub').textContent };
})()`;
// 入口：档案弹窗里的「我的勋章墙」按钮能关档案并打开勋章墙。
const PROBE_ENTRY = `(() => {
  hideBadges();
  showProfile();
  const pm = document.getElementById('profileModal');
  const btn = [...pm.querySelectorAll('.locked-modal-btn')].find(b => /勋章墙/.test(b.textContent));
  const hadBtn = !!btn; if (btn) btn.click();
  return { hadBtn, profileHid: !pm.classList.contains('show'), badgeOpen: document.getElementById('badgeModal').classList.contains('show') };
})()`;
// 庆祝：清空快照+只满足「初次启航」→ 恰好 1 枚新解锁 → 庆祝弹窗出现、文案含勋章名；
// 再测升段庆祝占屏时 maybeShowBadgeUp 让位（不弹）。
const PROBE_CELEB = `(() => {
  localStorage.removeItem('mathgameStars'); localStorage.removeItem('mathgameBest');
  localStorage.removeItem('mathgameDaily'); localStorage.removeItem('mathgamePet');
  localStorage.setItem('mathgameMaxCompletedLevel', '1'); localStorage.setItem('mathgameStars', JSON.stringify({1:1}));
  localStorage.removeItem('mathgameBadges');
  const fresh = evaluateBadges();
  maybeShowBadgeUp(fresh);
  const um = document.getElementById('badgeUnlockModal');
  const r = { freshN: fresh.length, unlockOpen: um.classList.contains('show'), msg: document.getElementById('badgeUnlockMsg').textContent };
  hideBadgeUnlock();
  localStorage.removeItem('mathgameBadges');
  const ru = document.getElementById('rankUpModal'); ru.classList.add('show');
  maybeShowBadgeUp(evaluateBadges());
  r.yielded = !um.classList.contains('show');
  ru.classList.remove('show');
  return r;
})()`;

// A=部分达成：通关 2 关(第 1 关三星) → 解锁「初次启航」+「闪耀三星」= 2 枚，其余 4 枚锁。
const SEED_A = { stars: { 1: 3, 2: 1 }, done: 2, best: null, daily: null, pet: null, badges: null };
// B=全达成：六关全三星 + 连对10 + 连签7 + 新版stage=1出生即解锁，不要求成年。
const today = new Date();
const localDay = d => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
const adoptedDay = localDay(new Date(today.getFullYear(), today.getMonth(), today.getDate()-89));
const SEED_B = { stars: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3 }, done: 6, best: { 1: { t: 5, s: 10 } }, daily: { bestStreak: 7, streak: 7 },
  pet: { version: 2, adopted: true, exp: 0, stage: 1, adoptedDay, lastDay: localDay(today), hatchDay: localDay(today), birthSeen: true, days: [] }, badges: null };
const ev = (expr) => send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId).then(r => r.result.value);
const results = [];
for (let vi = 0; vi < VIEWPORTS.length; vi++) {
  const vp = VIEWPORTS[vi];
  await send('Emulation.setDeviceMetricsOverride', { width: vp.w, height: vp.h, deviceScaleFactor: 1, mobile: false }, sessionId);
  const nav = waitEvent(m => m.method === 'Page.loadEventFired' && m.sessionId === sessionId);
  await send('Page.navigate', { url: URL }, sessionId);
  await nav; await sleep(350);
  // 上一个视口留下的 SEED_B 打卡存档会让顶栏多出一颗累计天数 pill，窄竖屏下挤顶栏：这里只测勋章墙，先清掉
  await ev(`localStorage.removeItem('mathgameDaily'); refreshSprintUI(); 1`);
  const a = await ev(PROBE(SEED_A));
  await sleep(260);
  let shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync('e:/mathgame/mathgame/.shots/badges_A_' + vp.name + '.png', Buffer.from(shot.data, 'base64'));
  const perm = vi === 0 ? await ev(PROBE_PERM) : null;
  const b = await ev(PROBE(SEED_B));
  await sleep(260);
  shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync('e:/mathgame/mathgame/.shots/badges_B_' + vp.name + '.png', Buffer.from(shot.data, 'base64'));
  const entry = vi === 0 ? await ev(PROBE_ENTRY) : null;
  const celeb = vi === 0 ? await ev(PROBE_CELEB) : null;
  results.push({ vp, a, b, perm, entry, celeb });
}
let fail = 0;
const P = (ok, label, extra) => { console.log((ok ? 'PASS ' : 'FAIL ') + label + (extra != null ? '  ' + extra : '')); if (!ok) fail++; };
console.log(JSON.stringify(results.map(x => ({ vp: x.vp.name, A: x.a, B: x.b, perm: x.perm, entry: x.entry, celeb: x.celeb })), null, 2));
console.log('\n===== VERDICTS =====');
for (const { vp, a, b, perm, entry, celeb } of results) {
  console.log('\n-- ' + vp.name + '  (ui=' + a.ui + ')  -> .shots/badges_A_' + vp.name + '.png / _B_');
  P(a.open, 'A: badge modal opens (show + aria-hidden=false)');
  P(a.nCells === 6, 'A: 6 badge cells', 'nCells=' + a.nCells);
  P(a.nLit === 2, 'A: 2 unlocked (first + gold)', 'nLit=' + a.nLit + ' ' + JSON.stringify(a.litNames));
  P(a.litNames.includes('初次启航') && a.litNames.includes('闪耀三星'), 'A: unlocked set = 初次启航 + 闪耀三星');
  P(/已获得 2 \/ 6 枚勋章/.test(a.sub), 'A: subtitle 2/6', JSON.stringify(a.sub));
  P(a.cell0Name === '初次启航' && a.gotCond === '已获得', 'A: cell0 is unlocked 初次启航', JSON.stringify([a.cell0Name, a.gotCond]));
  P(!a.emojiInGrid, 'A: grid has no emoji (inline SVG only)');
  P(Array.isArray(a.danglingUse) && a.danglingUse.length === 0, 'A: all <use> resolve (incl #i-medal)', JSON.stringify(a.danglingUse));
  P(a.bannedTokens === null, 'A: no Chrome-91-banned CSS tokens', JSON.stringify(a.bannedTokens));
  P(a.inViewport && a.gapTop >= 6 && a.gapBottom >= 6, 'A: card inside viewport with room', 'top=' + a.gapTop + ' bottom=' + a.gapBottom);
  if (vp.h <= 500) console.log('INFO 900x500(very short): card internal scroll ' + (a.cardScrolls ? 'ON (allowed)' : 'off'));
  else P(!a.cardScrolls, 'A: card itself does not scroll');
  P(a.nIconBtns === 4 && a.gearIsLast && a.actsFlushRight, 'A: topbar still 4 buttons, gear last, flush right', a.btnOrder);
  P(b.nCells === 6 && b.nLit === 6, 'B(all done): 6 cells all unlocked', 'nLit=' + b.nLit);
  P(b.litNames.includes('数宝出生'), 'B: 新版stage=1且exp=0即可解锁数宝出生');
  P(/已获得 6 \/ 6 枚勋章/.test(b.sub), 'B: subtitle 6/6', JSON.stringify(b.sub));
  if (perm) {
    P(perm.nLit === 2 && /已获得 2 \/ 6/.test(perm.sub), 'PERM: badges stay lit after condition rollback', 'nLit=' + perm.nLit + ' ' + JSON.stringify(perm.sub));
  }
  if (entry) {
    P(entry.hadBtn && entry.profileHid && entry.badgeOpen, 'ENTRY: profile 我的勋章墙 opens badge wall', JSON.stringify(entry));
  }
  if (celeb) {
    P(celeb.freshN === 1 && celeb.unlockOpen && /初次启航/.test(celeb.msg), 'CELEB: new-unlock modal shows with badge name', JSON.stringify(celeb));
    P(celeb.yielded === true, 'CELEB: yields when rank-up modal is already showing');
  }
}
console.log('\n===== ' + (fail === 0 ? 'BADGES PASS' : fail + ' FAILURE(S)') + ' =====');
await send('Target.closeTarget', { targetId });
ws.close();
process.exit(fail === 0 ? 0 : 1);




