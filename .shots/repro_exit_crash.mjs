// Repro "early 返回 -> 离开 -> crash". For a given level+mode: navigate, then hammer #exit-btn
// every 80ms from the moment the page loads so it fires the INSTANT its listener binds
// (earliest possible = "提前"); once the modal shows, wait a realistic gap (voice finishes
// loading / recognition starts), then tap 离开. Captures Runtime.exceptionThrown + Log.error +
// console.error + #mg-err-banner, and reports where we landed. CDP :9222.
const CDP = 'http://localhost:9222';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function conn(match) {
  for (let i = 0; i < 40; i++) {
    try {
      const info = await (await fetch(CDP + '/json')).json();
      const pages = info.filter(t => t.type === 'page' && t.webSocketDebuggerUrl);
      const page = (match ? pages.find(p => match.test(p.url)) : null) || pages[0];
      if (!page) { await sleep(300); continue; }
      const ws = new WebSocket(page.webSocketDebuggerUrl);
      await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
      let _id = 0; const pend = new Map(); const evs = [];
      ws.onmessage = e => { const m = JSON.parse(e.data);
        if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
        else if (m.method) evs.push(m); };
      const send = (m, p) => { const id = ++_id; return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify({ id, method: m, params: p || {} })); }); };
      await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
      const ev = (expr, ret = true) => send('Runtime.evaluate', { expression: expr, returnByValue: ret, awaitPromise: true, userGesture: true });
      return { ev, send, evs, url: page.url, close: () => { try { ws.close(); } catch (e) {} } };
    } catch (e) { await sleep(400); }
  }
  throw new Error('connect failed');
}
function dumpEvents(evs, tag) {
  const out = [];
  for (const m of evs) {
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      const t = d.exception && (d.exception.description || d.exception.value);
      out.push('EXCEPTION: ' + (d.text || '') + ' | ' + (t || '') + ' @' + (d.url ? d.url.split('/').pop() : '') + ':' + d.lineNumber);
    } else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
      out.push('LOG.error: ' + m.params.entry.text + ' @' + (m.params.entry.url ? m.params.entry.url.split('/').pop() : '') + ':' + (m.params.entry.lineNumber || '?'));
    } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      out.push('console.error: ' + m.params.args.map(a => a.value || a.description || '').join(' '));
    }
  }
  if (out.length) { console.log('  --- captured errors ' + tag + ' ---'); out.forEach(x => console.log('    ' + x)); }
  else console.log('  (no errors captured ' + tag + ')');
  return out;
}
async function trial(level, gap, mode = 'audio') {
  console.log(`\n===== L${level} ${mode}, gap=${gap}ms before 离开 =====`);
  let c = await conn();
  await c.ev(`sessionStorage.setItem('gameLevel','${level}');sessionStorage.setItem('gameMode','${mode}');location.href='game.html';`, false).catch(() => {});
  c.close(); await sleep(400);
  c = await conn(/game\.html/);
  // Hammer exit-btn from the earliest moment until the modal actually shows (= listener bound).
  let shown = false, tries = 0, firstState = null;
  for (let i = 0; i < 160; i++) {
    const r = (await c.ev(`(() => {
      const eb=document.getElementById('exit-btn'); if(eb) eb.click();
      const m=document.getElementById('exit-modal');
      const gm=window._currentGame;
      const ld=document.getElementById('loading-overlay');
      return { modalShown: m? m.classList.contains('show'):false,
        gameType: gm? gm.constructor.name : null,
        loadingShown: ld? getComputedStyle(ld).display!=='none':false,
        voiceStatus:(document.getElementById('float-voice-status')||document.getElementById('voice-status-text')||{}).textContent||'',
        recogExists: gm? !!gm.recognition : null };
    })()`)).result.value;
    tries++;
    if (!firstState && r.gameType) firstState = r;
    if (r.modalShown) { shown = true; console.log(`  modal shown after ${tries} clicks; ${JSON.stringify(r)}`); break; }
    await sleep(80);
  }
  if (!shown) { console.log('  modal never shown — exit not bindable?'); c.close(); return; }
  await sleep(gap); // realistic pause: voice may finish loading / recognition may start
  const pre = (await c.ev(`({ voiceStatus:(document.getElementById('float-voice-status')||document.getElementById('voice-status-text')||{}).textContent||'', recogExists: window._currentGame? !!window._currentGame.recognition:null, gameEnded: window._currentGame? window._currentGame.gameEnded:null })`)).result.value;
  console.log('  pre-confirm:', JSON.stringify(pre));
  const clickRes = (await c.ev(`(() => {
    const before=location.href;
    const cb=document.getElementById('exit-confirm-btn'); if(cb) cb.click();
    return { before, after: location.href, banner:(document.getElementById('mg-err-banner')||{}).textContent||null };
  })()`)).result.value;
  console.log('  confirm click:', JSON.stringify(clickRes));
  await sleep(1600);
  dumpEvents(c.evs, 'after 离开');
  const land = (await c.ev(`({ url: location.href, hasMenu: !!document.querySelector('#levelGrid')||!!document.querySelector('#card1'), banner:(document.getElementById('mg-err-banner')||{}).textContent||null, bodyLen: document.body? document.body.innerHTML.length:0 })`)).result.value;
  console.log('  landing:', JSON.stringify(land));
  c.close();
}
await trial(1, 300, 'visual');
await sleep(400);
await trial(3, 300, 'visual');
await sleep(400);
await trial(4, 300, 'visual');
await sleep(400);
await trial(5, 300, 'visual');
await sleep(400);
await trial(2, 300, 'visual');
process.exit(0);
