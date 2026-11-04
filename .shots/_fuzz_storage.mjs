// scratch: garbage localStorage values -> menu + modals + game boot must not throw
const ver = await (await fetch('http://localhost:9333/json/version')).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let _id = 0; const pending = new Map(); const waiters = []; const errs = [];
ws.onmessage = e => { const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  else if (m.method) {
    if (m.method === 'Runtime.exceptionThrown') errs.push((m.params.exceptionDetails.exception || {}).description || m.params.exceptionDetails.text);
    for (let i = waiters.length - 1; i >= 0; i--) if (waiters[i].pred(m)) waiters.splice(i, 1)[0].res(m); } };
const send = (method, params, sessionId) => { const id = ++_id; const msg = { id, method, params: params || {} }; if (sessionId) msg.sessionId = sessionId;
  return new Promise((res, rej) => { pending.set(id, m => m.error ? rej(new Error(method + ':' + JSON.stringify(m.error))) : res(m.result)); ws.send(JSON.stringify(msg)); }); };
const waitEvent = (pred, ms = 15000) => new Promise((res, rej) => { const w = { pred, res }; waiters.push(w); setTimeout(() => { const i = waiters.indexOf(w); if (i >= 0) { waiters.splice(i, 1); rej(new Error('timeout')); } }, ms); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const { browserContextId } = await send('Target.createBrowserContext');
const { targetId } = await send('Target.createTarget', { url: 'about:blank', browserContextId });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId); await send('Runtime.enable', {}, sessionId);
await send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 576, deviceScaleFactor: 1, mobile: false }, sessionId);
const ev = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId)).result.value;
const nav = async (url, wait) => { const n = waitEvent(m => m.method === 'Page.loadEventFired' && m.sessionId === sessionId); await send('Page.navigate', { url }, sessionId); await n; await sleep(wait); };
const KEYS = ['Pet', 'Coins', 'Stars', 'Best', 'WrongLog', 'MaxCompletedLevel', 'LevelsVer', 'Settings', 'RankSeen', 'EndingSeen', 'SprintBest', 'SprintBest2', 'SprintBest3', 'SprintTier', 'Daily', 'DailyChest', 'Badges', 'TravelEndingSeen', 'Pace', 'VoiceTuning'];
const GAME_KEYS = ['Stars', 'Best', 'WrongLog', 'Settings', 'SprintBest', 'SprintBest2', 'SprintBest3', 'Daily', 'Pet', 'Coins', 'VoiceTuning', 'MaxCompletedLevel', 'Badges'].filter(k => !process.argv[3] || k === process.argv[3]);
const VALS = ['null', '[]', '{}', '"x"', '123', '-5', '{"a":1}', 'not json', '{"1":"x","2":null}', '{"last":5,"streak":"a","total":-3,"coins":"z","best":"q","xp":"n"}'];
const only = process.argv[2] || 'all';
let bad = 0, n = 0;
await nav('http://localhost:8000/menu.html', 600);
if (only !== 'game') for (const k of KEYS) for (const v of VALS) {
  errs.length = 0; n++;
  await ev('localStorage.clear(); localStorage.setItem("mathgame' + k + '", ' + JSON.stringify(v) + '); true');
  await nav('http://localhost:8000/menu.html', 900);
  const r = await ev(`(() => { const out = []; for (const f of ['showPet','showDaily','showProfile','showMistakes','showCollection','showBadges','showSettings','showTier']) { try { window[f](); } catch (e) { out.push(f + ':' + e.message); } } try { updateProfileBadge(); refreshSprintUI(); } catch (e) { out.push('refresh:' + e.message); } return out.join(' | ') + ' cards=' + document.querySelectorAll('.level-card, .island, [data-level]').length; })()`);
  await sleep(150);
  const bads = (/:/.test(r.split(' cards=')[0]) ? r : '') + (errs.length ? ' UNCAUGHT ' + errs.slice(0, 2).join(' || ') : '');
  if (bads) { bad++; console.log('MENU BAD mathgame' + k + ' = ' + v + '  ->  ' + bads.slice(0, 300)); }
}
console.log('menu cases', n, 'bad', bad);
if (only !== 'menu') {
  let gb = 0, gn = 0;
  for (const k of GAME_KEYS) for (const v of VALS) for (const lv of ['1', '0']) {
    errs.length = 0; gn++;
    await nav('http://localhost:8000/menu.html', 300);
    await ev('localStorage.clear(); localStorage.setItem("mathgame' + k + '", ' + JSON.stringify(v) + '); sessionStorage.setItem("gameLevel","' + lv + '"); sessionStorage.setItem("gameMode","visual"); sessionStorage.setItem("mgIntroHeard","[1,2,3,4,5,6]"); ' + (lv === '0' ? 'sessionStorage.setItem("mgSprint","1");' : '') + ' true');
    await nav('http://localhost:8000/index.html', 500);
    let ok = false;
    for (let i = 0; i < 24 && !ok; i++) { ok = await ev('(function(){ if (window._mgSkipIntro) { try { window._mgSkipIntro(); } catch (e) {} } return !!window._currentGame; })()'); if (!ok) await sleep(250); }
    await sleep(1500);
    if (!ok || errs.length) { gb++; console.log('GAME BAD mathgame' + k + ' = ' + v + ' lv' + lv + '  game=' + ok + ' ' + errs.slice(0, 2).join(' || ').slice(0, 300)); }
  }
  console.log('game cases', gn, 'bad', gb);
}
await ev('localStorage.clear(); true');
await send('Target.closeTarget', { targetId }); await send('Target.disposeBrowserContext', { browserContextId });
ws.close(); process.exit(0);
