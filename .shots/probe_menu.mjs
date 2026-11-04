// Interaction/runtime probe: exercise the rewritten JS handlers and confirm no exceptions.
const BROWSER = 'http://localhost:9333';
const URL = 'http://localhost:8000/menu.html';
const ver = await (await fetch(BROWSER + '/json/version')).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let _id = 0; const pending = new Map(); const waiters = [];
ws.onmessage = e => { const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  else if (m.method) for (let i = waiters.length - 1; i >= 0; i--) if (waiters[i].pred(m)) waiters.splice(i, 1)[0].res(m); };
const send = (method, params, sessionId) => { const id = ++_id; const msg = { id, method, params: params || {} }; if (sessionId) msg.sessionId = sessionId;
  return new Promise((res, rej) => { pending.set(id, m => m.error ? rej(new Error(method + ':' + JSON.stringify(m.error))) : res(m.result)); ws.send(JSON.stringify(msg)); }); };
const waitEvent = (pred, ms = 8000) => new Promise((res, rej) => { const w = { pred, res }; waiters.push(w); setTimeout(() => { const i = waiters.indexOf(w); if (i >= 0) { waiters.splice(i, 1); rej(new Error('timeout')); } }, ms); });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);
const errors = [];
ws.onmessage && waiters; // noop
// capture console errors + page exceptions
const origOnMessage = ws.onmessage;
ws.onmessage = e => { const m = JSON.parse(e.data);
  if (m.method === 'Runtime.exceptionThrown') errors.push('EXC: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('CONSOLE.error: ' + m.params.args.map(a => a.value || a.description).join(' '));
  origOnMessage(e); };
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }, sessionId);
// seed some progress so profile/stars have content
const nav = waitEvent(m => m.method === 'Page.loadEventFired' && m.sessionId === sessionId);
await send('Page.navigate', { url: URL }, sessionId);
await nav; await sleep(300);
await send('Runtime.evaluate', { expression: "localStorage.setItem('mathgameMaxCompletedLevel','3');localStorage.setItem('mathgameStars',JSON.stringify({1:3,2:2,3:1}));localStorage.setItem('mathgameBest',JSON.stringify({1:{t:12,s:8}}));location.reload()", sessionId }, sessionId);
await waitEvent(m => m.method === 'Page.loadEventFired' && m.sessionId === sessionId); await sleep(300);

const PROBE = `(() => {
  const out = {};
  const disp = id => { const e = document.getElementById(id); return e ? getComputedStyle(e).display : 'MISSING'; };
  // profile
  showProfile();
  out.profileShown = disp('profileModal');
  out.profileEmoji = (document.getElementById('profileEmoji')||{}).textContent;
  out.profRows = document.querySelectorAll('#profileModal .prof-row').length;
  out.profStarSvgs = document.querySelectorAll('#profileModal .prof-stars use').length;
  hideProfile(); out.profileHidden = disp('profileModal');
  // settings
  showSettings();
  out.settingsShown = disp('settingsModal');
  out.segButtons = document.querySelectorAll('#settingsModal .seg-btn').length;      // expect 12 (3 rows x 4)
  out.segOn = document.querySelectorAll('#settingsModal .seg-btn.on').length;         // expect 3
  setSetting('sfx', 0);
  out.sfxAfterMute = JSON.parse(localStorage.getItem('mathgameSettings')).sfx;        // expect 0
  out.muteBtnActive = !!document.querySelector('#setSfx .seg-btn.mute.on');           // expect true
  hideSettings(); out.settingsHidden = disp('settingsModal');
  // locked modal
  showLockedModal(5); out.lockedShown = disp('lockedModal');
  hideLockedModal(); out.lockedHidden = disp('lockedModal');
  // stars in a card (level1 = 3 stars, all 'on')
  out.card1StarsOn = document.querySelectorAll('#stars1 .star.on').length;            // expect 3
  out.card1StarSvgs = document.querySelectorAll('#stars1 use').length;                // expect 3
  // no emoji left on main screen (scan visible text nodes of menuScreen)
  const emoji = (document.getElementById('menuScreen').innerText.match(/[\\u{1F000}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/gu) || []);
  out.mainScreenEmoji = emoji;
  // gear has accessible name
  out.gearAria = (document.querySelector('[onclick*=showSettings]')||{}).getAttribute && document.querySelector('[onclick*=showSettings]').getAttribute('aria-label');
  return out;
})()`;
const { result } = await send('Runtime.evaluate', { expression: PROBE, returnByValue: true }, sessionId);
console.log(JSON.stringify(result.value, null, 2));
console.log('\\nJS ERRORS:', errors.length ? errors : 'none');

const r = result.value; let fail = 0;
const P = (ok, l, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
console.log('\\n===== VERDICTS =====');
P(r.profileShown === 'flex', 'profile opens', r.profileShown);
P(r.profileHidden === 'none', 'profile closes', r.profileHidden);
P(r.profRows === 6, 'profile shows 6 level rows', r.profRows);
P(r.profStarSvgs > 0, 'profile stars are SVG', r.profStarSvgs);
P(r.profileEmoji && r.profileEmoji.length > 0, 'profileEmoji rank glyph kept (textContent)', JSON.stringify(r.profileEmoji));
P(r.settingsShown === 'flex', 'settings opens', r.settingsShown);
P(r.segButtons === 12, 'settings 12 seg buttons', r.segButtons);
P(r.sfxAfterMute === 0, 'setSetting mute writes 0', r.sfxAfterMute);
P(r.muteBtnActive, 'mute button turns active', r.muteBtnActive);
P(r.settingsHidden === 'none', 'settings closes', r.settingsHidden);
P(r.lockedShown === 'flex', 'locked modal opens (no inline style)', r.lockedShown);
P(r.lockedHidden === 'none', 'locked modal closes', r.lockedHidden);
P(r.card1StarsOn === 3, 'card1 renders 3 filled stars', r.card1StarsOn);
P(r.card1StarSvgs === 3, 'card1 stars are SVG', r.card1StarSvgs);
P(r.mainScreenEmoji.length === 0, 'no emoji on main screen', JSON.stringify(r.mainScreenEmoji));
P(!!r.gearAria, 'gear button has aria-label', JSON.stringify(r.gearAria));
P(errors.length === 0, 'no JS exceptions/console errors', errors.length);
console.log('\\n===== ' + (fail === 0 ? 'ALL PASS' : fail + ' FAILURE(S)') + ' =====');
await send('Target.closeTarget', { targetId }); ws.close(); process.exit(fail === 0 ? 0 : 1);
