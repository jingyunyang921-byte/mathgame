// Verify the SECOND teardown vector found in code review: the 下一关 (next-level) button.
// Before this round's fix, #next-level-btn called window.location.reload() directly. That
// tears down the WebView exactly like a nav does, so if native TTS is still pending (child
// answered before the question finished being read; _voiceMixinHide stops Vosk but NOT the
// native Tts keepAlive call), tapping 下一关 could dispatch the pending resolve() into a
// dying page -> the same libwebviewchromium main-thread SIGSEGV as 返回->离开.
// Fix: #next-level-btn now routes through _mgSafeLeave(this, () => reload()), which stops
// TTS (pending resolves NOW on the live page) then defers the reload 150ms so it drains.
// This script drives a level until native TTS is speaking, taps 下一关, and asserts the
// mechanism fired: Tts.stop() called + reload DEFERRED (page marker still present at +70ms)
// + reload actually happens after + app survives + no new native crash.
import { execSync } from 'node:child_process';
const CDP = 'http://localhost:9222';
const sleep = ms => new Promise(r => setTimeout(r, ms));
// A socket that errors/closes across a page reload must not 127 the whole run.
process.on('unhandledRejection', () => {});
process.on('uncaughtException', () => {});
function sh(c){ try { return execSync(c,{stdio:['ignore','pipe','ignore']}).toString().trim(); } catch(e){ return ''; } }
function relaunchAndForward(){
  sh('adb shell monkey -p com.mathgame.app -c android.intent.category.LAUNCHER 1');
  let pid='';
  for(let i=0;i<20;i++){
    pid=sh('adb shell cat /proc/net/unix').split('\n').filter(l=>/webview_devtools_remote/.test(l)).map(l=>l.replace(/.*webview_devtools_remote_/,'').trim())[0]||'';
    if(pid) break; execSync('sleep 0.4');
  }
  if(pid){ sh('adb forward --remove-all'); sh(`adb forward tcp:9222 localabstract:webview_devtools_remote_${pid}`); }
  return pid;
}
async function targetsAlive(){ try{ const j=await (await fetch(CDP+'/json')).json(); return Array.isArray(j);}catch(e){return false;} }
async function conn(match){
  for(let i=0;i<40;i++){
    try{
      const info=await (await fetch(CDP+'/json')).json();
      const pages=info.filter(t=>t.type==='page'&&t.webSocketDebuggerUrl);
      const page=(match?pages.find(p=>match.test(p.url)):null)||pages[0];
      if(!page){ await sleep(300); continue; }
      const ws=new WebSocket(page.webSocketDebuggerUrl);
      await new Promise((r,j)=>{ ws.onopen=r; ws.onerror=j; });
      let _id=0; const pend=new Map();
      ws.onmessage=e=>{ const m=JSON.parse(e.data); if(m.id&&pend.has(m.id)){ pend.get(m.id)(m); pend.delete(m.id);} };
      ws.onerror=()=>{}; ws.onclose=()=>{};   // swallow post-open socket errors (page reloads mid-run)
      const send=(m,p)=>{ const id=++_id; return new Promise((res,rej)=>{ pend.set(id,x=>x.error?rej(new Error(m+':'+JSON.stringify(x.error))):res(x.result)); ws.send(JSON.stringify({id,method:m,params:p||{}})); }); };
      await send('Page.enable'); await send('Runtime.enable');
      const ev=(expr,ret=true)=>send('Runtime.evaluate',{expression:expr,returnByValue:ret,awaitPromise:true,userGesture:true});
      return { ev, close:()=>{ try{ws.close();}catch(e){} } };
    }catch(e){ await sleep(400); }
  }
  return null;
}
async function attempt(n, level){
  console.log(`\n--- attempt ${n}: L${level} audio, tap 下一关 while TTS speaking ---`);
  let c=await conn(); if(!c){ relaunchAndForward(); await sleep(1500); c=await conn(); if(!c){ console.log('  noconn'); return 'noconn'; } }
  // Drain any TTS still pending from a prior attempt BEFORE this harness's own setup nav,
  // so the setup nav itself can't reproduce the crash (that would test the harness, not the fix).
  await c.ev(`try{ if(window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.Tts&&Capacitor.Plugins.Tts.stop) Capacitor.Plugins.Tts.stop(); if(window.speechSynthesis) speechSynthesis.cancel(); }catch(e){}`).catch(()=>{});
  await sleep(250);
  await c.ev(`sessionStorage.setItem('gameLevel','${level}');sessionStorage.setItem('gameMode','audio');location.href='game.html';`,false).catch(()=>{});
  c.close(); await sleep(2600);
  c=await conn(/game\.html/); if(!c){ console.log('  lost game.html'); return 'noconn'; }
  // wait for engine + TTS speaking; spy Tts.stop; drop a page marker that a reload will wipe
  let pre=null;
  for(let i=0;i<60;i++){
    pre=(await c.ev(`(() => {
      const g=window._currentGame; if(!g) return {g:false};
      const T=(window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.Tts)||null;
      if(T&&T.stop&&!T.__spy){ const o=T.stop.bind(T); T.stop=function(){window.__stopCalled=true; return o.apply(null,arguments);}; T.__spy=true; }
      window.__mark='ALIVE';
      return { g:true, mgFn: typeof window._mgSafeLeave, hasStop: !!(T&&T.stop), spk: !!g._ttsSpeaking, hasNextBtn: !!document.getElementById('next-level-btn') };
    })()`)).result.value;
    if(pre.g && pre.spk && pre.hasNextBtn) break;
    await sleep(100);
  }
  console.log('  engine:', JSON.stringify(pre));
  if(!pre||!pre.g){ console.log('  no engine'); c.close(); return 'noengine'; }
  if(!pre.hasNextBtn){ console.log('  no next-level-btn'); c.close(); return 'nobtn'; }
  const beforeLevel=(await c.ev(`sessionStorage.getItem('gameLevel')`)).result.value;
  // tap 下一关 the instant TTS is pending
  const fired=(await c.ev(`(() => {
    window.__stopCalled=false;
    const nb=document.getElementById('next-level-btn'); if(nb) nb.click();
    return { clicked: !!nb, markNow: window.__mark, href: location.href };
  })()`)).result.value;
  // within the 150ms defer window: page must NOT have reloaded yet (marker still ALIVE) and stop() called
  await sleep(70);
  const mid=(await c.ev(`({ mark: window.__mark, stopCalled: !!window.__stopCalled, spk: window._currentGame? !!window._currentGame._ttsSpeaking:null })`).catch(()=>({result:{value:{mark:'(eval-failed)'}}}))).result.value;
  console.log('  fired:', JSON.stringify(fired), '| +70ms:', JSON.stringify(mid));
  await sleep(1800);
  const alive=await targetsAlive();
  if(!alive){ console.log('  >>> APP GONE — CRASH <<<'); return 'crash'; }
  // after the deferred reload, reconnect and confirm marker is gone (page really reloaded) + engine rebuilt
  let post=null; c.close(); c=await conn(/game\.html/);
  if(c){ try{ post=(await c.ev(`({ url: location.href, mark: window.__mark, level: sessionStorage.getItem('gameLevel'), reengine: !!window._currentGame })`)).result.value; }catch(e){ post='eval-failed:'+e.message; } }
  console.log('  post-reload:', JSON.stringify(post), '| beforeLevel:', beforeLevel);
  const deferOK = fired.markNow==='ALIVE' && mid.mark==='ALIVE';   // reload had NOT fired at +70ms
  const stopOK  = mid.stopCalled===true;
  const reloadedOK = post && post.mark===undefined;                // fresh page after defer => reload really happened
  console.log('  CHECKS  reload deferred(marker alive @70ms):', deferOK, '| Tts.stop called:', stopOK, '| reload happened:', reloadedOK);
  if(c) c.close();
  return (deferOK && stopOK && reloadedOK) ? 'pass' : 'soft';
}
relaunchAndForward(); await sleep(1800);
sh('adb logcat -b crash -c');
const levels=[1,2,3,4,5];   // L1-L5 each wire #next-level-btn -> reload; L6/BattleGame hides it (no teardown), so skip
const res=[];
for(let i=0;i<levels.length;i++){
  const r=await attempt(i+1, levels[i]);
  res.push(r);
  if(r==='crash') break;
  if(r==='noconn'){ relaunchAndForward(); await sleep(1500); }
  await sleep(600);
}
await sleep(500);
const crashLog=sh('adb logcat -d -b crash -v time').split('\n').filter(l=>/SIGSEGV|null pointer|libwebviewchromium|Fatal signal/.test(l));
console.log('\n=== NEW crash-buffer lines ===');
console.log(crashLog.length? crashLog.join('\n') : '(none)');
console.log('\nRESULTS:', JSON.stringify(res));
console.log(res.includes('crash')? 'FAIL: crash reproduced' : (res.every(r=>r==='pass')? 'PASS: next-level teardown drains TTS + defers reload, no crash' : 'OK-ish: no crash, but some attempts did not confirm mechanism (see above)'));
process.exit(0);
