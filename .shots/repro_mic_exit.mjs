// Repro with the mic ACTIVELY LISTENING (native Vosk audio open), then exit->离开.
// This is the one path the earlier synthetic repro skipped: it never started the mic,
// so recognition.stop() was a no-op. Here we start the mic, confirm the native stream
// is live (mic-btn '.listening' / recognizing=true), THEN tap 返回 -> 离开 and watch
// whether the WebView survives (clean nav) or the native process dies (crash). CDP :9222.
const CDP = 'http://localhost:9222';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function targets() { try { return await (await fetch(CDP + '/json')).json(); } catch (e) { return null; } }
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
function dump(evs, tag) {
  const out = [];
  for (const m of evs) {
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; out.push('EXCEPTION: ' + (d.text || '') + ' | ' + ((d.exception && (d.exception.description || d.exception.value)) || '') + ' @' + (d.url ? d.url.split('/').pop() : '') + ':' + d.lineNumber); }
    else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') out.push('LOG.error: ' + m.params.entry.text);
    else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') out.push('console.error: ' + m.params.args.map(a => a.value || a.description || '').join(' '));
  }
  console.log(out.length ? '  errors ' + tag + ':\n    ' + out.join('\n    ') : '  (no JS errors ' + tag + ')');
}

let c = await conn();
await c.ev(`sessionStorage.setItem('gameLevel','1');sessionStorage.setItem('gameMode','audio');location.href='game.html';`, false).catch(() => {});
c.close(); await sleep(2600);
c = await conn(/game\.html/);
// wait for game + voice engine ready ("点击麦克风开始")
for (let i = 0; i < 50; i++) {
  const s = (await c.ev(`(() => { const gm=window._currentGame; return { g:!!gm, st:(document.getElementById('float-voice-status')||{}).textContent||'' }; })()`)).result.value;
  if (s.g && /点击麦克风开始/.test(s.st)) break;
  await sleep(200);
}
// tap the mic to START listening (native Vosk .start)
await c.ev(`(() => { const b=document.getElementById('float-voice-mic-btn'); if(b) b.click(); return true; })()`);
let listening = null;
for (let i = 0; i < 30; i++) {
  listening = (await c.ev(`(() => { const gm=window._currentGame; const mb=document.getElementById('float-voice-mic-btn'); return { recognizing: gm? gm.recognizing:null, started: (gm&&gm.recognition)? gm.recognition._started:null, listeningClass: mb? mb.classList.contains('listening'):null, status:(document.getElementById('float-voice-status')||{}).textContent||'' }; })()`)).result.value;
  if (listening.recognizing || listening.listeningClass || listening.started) break;
  await sleep(200);
}
console.log('mic state before exit:', JSON.stringify(listening));
await sleep(600);
// tap 返回 -> 离开 while the native audio stream is (hopefully) live
const res = (await c.ev(`(() => {
  const eb=document.getElementById('exit-btn'); if(eb) eb.click();
  const shown=document.getElementById('exit-modal').classList.contains('show');
  return { shown };
})()`)).result.value;
console.log('exit modal:', JSON.stringify(res));
await sleep(400);
let confirmErr = null, confirmRes = null;
try {
  confirmRes = (await c.ev(`(() => { const before=location.href; const cb=document.getElementById('exit-confirm-btn'); if(cb) cb.click(); return { before, after: location.href }; })()`)).result.value;
} catch (e) { confirmErr = String(e); }
console.log('confirm 离开:', confirmErr ? 'EVAL FAILED: ' + confirmErr : JSON.stringify(confirmRes));
await sleep(1800);
dump(c.evs, 'after 离开 (mic was live)');
// Did the WebView survive? Probe target list + try to read landing.
const tg = await targets();
if (!tg) { console.log('  >>> CDP endpoint DEAD — native process likely CRASHED <<<'); process.exit(2); }
console.log('  targets now:', tg.filter(t => t.type === 'page').map(t => t.url).join(' , '));
let land = null, landErr = null;
try { land = (await c.ev(`({ url: location.href, hasMenu: !!document.querySelector('#levelGrid')||!!document.querySelector('#card1'), banner:(document.getElementById('mg-err-banner')||{}).textContent||null })`)).result.value; }
catch (e) { landErr = String(e); }
console.log('  landing:', landErr ? 'EVAL FAILED (page gone/reloaded): ' + landErr : JSON.stringify(land));
c.close(); process.exit(0);
