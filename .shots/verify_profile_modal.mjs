// Local verify: profile modal (#profileModal) no longer jams against top/bottom.
// Seeds a maxed profile (★18/18, six levels, all levels best-time -> tallest possible content),
// opens showProfile(), measures the card rect vs viewport across short landscapes,
// asserts top/bottom breathing room + no viewport overflow, and screenshots each.
// Needs: headless Chrome --remote-debugging-port=9333 + http.server :8000.
import { writeFileSync } from 'node:fs';
const BROWSER = 'http://localhost:9333';
const URL = 'http://localhost:8000/menu.html';
const VIEWPORTS = [
  { name: '1000x615', w: 1000, h: 615 },   // ~real device (DPR2 -> 2000x1230)
  { name: '1000x576', w: 1000, h: 576 },
  { name: '960x552', w: 960, h: 552 },
  { name: '900x500', w: 900, h: 500 },     // very short: internal scroll allowed
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

const SEED_AND_OPEN = `(() => {
  localStorage.setItem('mathgameLevelsVer','2'); localStorage.setItem('mathgameRankSeen','18');
  localStorage.setItem('mathgameMaxCompletedLevel','6');
  localStorage.setItem('mathgameStars', JSON.stringify({1:3,2:3,3:3,4:3,5:3,6:3}));
  localStorage.setItem('mathgameBest', JSON.stringify({1:{t:30,s:8},2:{t:42,s:8},3:{t:55,s:7},4:{t:63,s:9},5:{t:71,s:6},6:{t:88,s:9}}));
  showProfile();
  const card = document.querySelector('#profileModal .locked-modal-card');
  const list = document.querySelector('#profileModal #profileLevels');
  const btn = document.querySelector('#profileModal .locked-modal-btn');
  const emoji = document.querySelector('#profileModal .modal-emoji');
  const cr = card.getBoundingClientRect(); const br = btn.getBoundingClientRect(); const er = emoji.getBoundingClientRect();
  const bad = [...document.querySelectorAll('#profileModal use')].map(u => u.getAttribute('href')).filter(h => h && !document.querySelector(h));
  const styleTxt = [...document.querySelectorAll('style')].map(s => s.textContent).join('\\n');
  const banned = styleTxt.match(/paint-order|:has\\(|@layer|color-mix\\(|oklch\\(|\\d(dvh|svh|lvh)/g);
  return {
    iw: innerWidth, ih: innerHeight,
    cardTop: Math.round(cr.top), cardBottom: Math.round(cr.bottom), cardH: Math.round(cr.height),
    gapTop: Math.round(cr.top), gapBottom: Math.round(innerHeight - cr.bottom),
    inViewport: cr.top >= -0.5 && cr.bottom <= innerHeight + 0.5,
    cardScrolls: card.scrollHeight - card.clientHeight > 1,
    listScrolls: list.scrollHeight - list.clientHeight > 1,
    listOver: list.scrollHeight - list.clientHeight,
    emojiTop: Math.round(er.top),
    btnBottom: Math.round(br.bottom), btnInView: br.bottom <= innerHeight + 0.5 && br.top >= -0.5,
    rank: document.getElementById('profileTitle').textContent,
    stars: document.getElementById('profileStars').textContent,
    danglingUse: bad, bannedTokens: banned,
    ui: getComputedStyle(document.documentElement).getPropertyValue('--ui').trim(),
    sp3: getComputedStyle(document.documentElement).getPropertyValue('--sp-3').trim(),
  };
})()`;

const results = [];
for (const vp of VIEWPORTS) {
  await send('Emulation.setDeviceMetricsOverride', { width: vp.w, height: vp.h, deviceScaleFactor: 1, mobile: false }, sessionId);
  const nav = waitEvent(m => m.method === 'Page.loadEventFired' && m.sessionId === sessionId);
  await send('Page.navigate', { url: URL }, sessionId);
  await nav; await sleep(350);
  const { result } = await send('Runtime.evaluate', { expression: SEED_AND_OPEN, returnByValue: true }, sessionId);
  await sleep(250); // let modal + emoji bounce settle for the shot
  const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  const file = 'e:/mathgame/mathgame/.shots/profile_' + vp.name + '.png';
  writeFileSync(file, Buffer.from(shot.data, 'base64'));
  results.push({ vp, r: result.value, file });
}

console.log(JSON.stringify(results.map(x => ({ vp: x.vp.name, ...x.r })), null, 2));

let fail = 0;
const P = (ok, label, extra) => { console.log((ok ? 'PASS ' : 'FAIL ') + label + (extra != null ? '  ' + extra : '')); if (!ok) fail++; };
console.log('\n===== VERDICTS =====');
for (const { vp, r, file } of results) {
  console.log('\n-- ' + vp.name + '  (rank=' + r.rank + ' ★' + r.stars + ' ui=' + r.ui + ' sp3=' + r.sp3 + ') -> ' + file);
  P(r.rank === '数学岛主' && r.stars === '18', 'maxed profile rendered (tallest state)', r.rank + ' ★' + r.stars);
  P(r.inViewport, 'card fully inside viewport (no top/bottom jam)', 'top=' + r.cardTop + ' bottom=' + r.cardBottom + ' ih=' + r.ih);
  P(r.gapTop >= 6 && r.gapBottom >= 6, 'breathing room top & bottom (>=6px each)', 'gapTop=' + r.gapTop + ' gapBottom=' + r.gapBottom);
  P(Array.isArray(r.danglingUse) && r.danglingUse.length === 0, 'all <use> resolve', JSON.stringify(r.danglingUse));
  P(r.bannedTokens === null, 'no Chrome-91-banned tokens', JSON.stringify(r.bannedTokens));
  P(!r.cardScrolls, 'card itself never scrolls (header+footer pinned)', 'cardScrollOver check');
  P(r.btnInView, '好的 button always visible (not below fold)', 'btnBottom=' + r.btnBottom + ' ih=' + r.ih);
  console.log('INFO level-list internal scroll ' + (r.listScrolls ? 'ON (list too tall -> scrolls, header+button stay put)' : 'off (everything fits)') + '  listOver=' + r.listOver);
}
console.log('\n===== ' + (fail === 0 ? 'ALL PASS' : fail + ' FAILURE(S)') + ' =====');
await send('Target.closeTarget', { targetId });
ws.close();
process.exit(fail === 0 ? 0 : 1);
