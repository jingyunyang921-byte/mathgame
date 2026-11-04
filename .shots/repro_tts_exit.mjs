// Targeted repro: leave the level WHILE the native TTS (Baidu engine) is still speaking
// the question aloud ("提前" = early, before the child answers). Hypothesis: _forceEnd
// navigates away without stopping native TTS, so the in-flight Tts.speak(...) completion
// callback fires into the torn-down WebView bridge -> main-thread null-deref SIGSEGV in
// libwebviewchromium.so (matches the 09-23 crash log). We poll _ttsSpeaking and fire
// 返回 -> 离开 the instant it's true, then check whether the app process survived.
import { execSync } from 'node:child_process';
const CDP = 'http://localhost:9222';
const sleep = ms => new Promise(r => setTimeout(r, ms));
function sh(cmd) { try { return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) { return ''; } }
function relaunchAndForward() {
  sh('adb shell monkey -p com.mathgame.app -c android.intent.category.LAUNCHER 1');
  let pid = '';
  for (let i = 0; i < 20; i++) {
    pid = sh(`adb shell cat /proc/net/unix`).split('\n').filter(l => /webview_devtools_remote/.test(l)).map(l => l.replace(/.*webview_devtools_remote_/, '').trim())[0] || '';
    if (pid) break;
    execSync('sleep 0.4');
  }
  if (pid) { sh('adb forward --remove-all'); sh(`adb forward tcp:9222 localabstract:webview_devtools_remote_${pid}`); }
  return pid;
}
async function targetsAlive() { try { const j = await (await fetch(CDP + '/json')).json(); return Array.isArray(j); } catch (e) { return false; } }
async function conn(match) {
  for (let i = 0; i < 40; i++) {
    try {
      const info = await (await fetch(CDP + '/json')).json();
      const pages = info.filter(t => t.type === 'page' && t.webSocketDebuggerUrl);
      const page = (match ? pages.find(p => match.test(p.url)) : null) || pages[0];
      if (!page) { await sleep(300); continue; }
      const ws = new WebSocket(page.webSocketDebuggerUrl);
      await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
      let _id = 0; const pend = new Map();
      ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
      const send = (m, p) => { const id = ++_id; return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify({ id, method: m, params: p || {} })); }); };
      await send('Page.enable'); await send('Runtime.enable');
      const ev = (expr, ret = true) => send('Runtime.evaluate', { expression: expr, returnByValue: ret, awaitPromise: true, userGesture: true });
      return { ev, send, url: page.url, close: () => { try { ws.close(); } catch (e) {} } };
    } catch (e) { await sleep(400); }
  }
  return null;
}
async function attempt(n, level) {
  console.log(`\n--- attempt ${n}: L${level} audio, leave while TTS speaking ---`);
  let c = await conn();
  if (!c) { console.log('  no connection; relaunch'); relaunchAndForward(); await sleep(1500); c = await conn(); if (!c) return 'noconn'; }
  await c.ev(`sessionStorage.setItem('gameLevel','${level}');sessionStorage.setItem('gameMode','audio');location.href='game.html';`, false).catch(() => {});
  c.close(); await sleep(2600);
  c = await conn(/game\.html/);
  if (!c) { console.log('  lost game.html target'); return 'noconn'; }
  // Poll for TTS actively speaking; fire the instant it is.
  let fired = false, snap = null;
  for (let i = 0; i < 120; i++) {
    let r;
    try {
      r = (await c.ev(`(() => {
        const gm=window._currentGame; if(!gm) return {g:false};
        const speaking = !!gm._ttsSpeaking || (window.speechSynthesis && window.speechSynthesis.speaking);
        if (speaking && !gm.gameEnded) {
          const eb=document.getElementById('exit-btn'); if(eb) eb.click();
          const cb=document.getElementById('exit-confirm-btn'); if(cb) cb.click();
          return { g:true, fired:true, speaking:true };
        }
        return { g:true, fired:false, speaking, status:(document.getElementById('float-voice-status')||{}).textContent||'' };
      })()`)).result.value;
    } catch (e) { console.log('  eval threw (page may be gone): ' + e.message); break; }
    if (r && r.fired) { fired = true; snap = r; console.log('  FIRED 返回+离开 while TTS speaking'); break; }
    await sleep(50);
  }
  if (!fired) console.log('  never caught TTS-speaking window (voice off? too fast?)');
  await sleep(1500);
  const alive = await targetsAlive();
  if (!alive) { console.log('  >>> APP PROCESS GONE — CRASH REPRODUCED <<<'); return 'crash'; }
  let land = null;
  try { land = (await c.ev(`({ url: location.href, hasMenu: !!document.querySelector('#levelGrid')||!!document.querySelector('#card1') })`)).result.value; } catch (e) { land = 'eval-failed:' + e.message; }
  console.log('  survived, landing:', JSON.stringify(land));
  c.close();
  return 'ok';
}
sh('adb logcat -b crash -c');   // clear crash buffer so we can spot a NEW one
let crashed = false;
for (let i = 1; i <= 6 && !crashed; i++) {
  const r = await attempt(i, i % 2 ? 1 : 4);
  if (r === 'crash') { crashed = true; break; }
  if (r === 'noconn') { relaunchAndForward(); await sleep(1500); }
  await sleep(600);
}
await sleep(500);
const crashLog = sh('adb logcat -d -b crash -v time').split('\n').filter(l => /SIGSEGV|null pointer|libwebviewchromium|Fatal signal/.test(l));
console.log('\n=== NEW crash-buffer lines ===');
console.log(crashLog.length ? crashLog.join('\n') : '(none — no native crash captured this run)');
console.log('\nRESULT:', crashed ? 'CRASH REPRODUCED' : 'no crash reproduced this run');
process.exit(0);
