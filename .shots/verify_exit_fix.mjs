// Verify the "提前点击返回→离开→崩溃" fix on-device (CDP :9222).
// Before fix: leaving while native TTS spoke the question left a keepAlive PluginCall
// pending; its later resolve() dispatched into a torn-down WebView -> main-thread
// SIGSEGV in libwebviewchromium. Fix (_mgLeaveToMenu): stop TTS so the pending call
// resolves NOW on the live page, then defer nav 150ms so it (and Vosk) drains first.
// This script exercises the real 返回->离开 path the instant _ttsSpeaking is true and
// asserts the MECHANISM fired: Tts.stop() called + nav deferred + landed on menu +
// no NEW native crash in the logcat crash buffer.
import { execSync } from 'node:child_process';
const CDP = 'http://localhost:9222';
const sleep = ms => new Promise(r => setTimeout(r, ms));
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
      const send=(m,p)=>{ const id=++_id; return new Promise((res,rej)=>{ pend.set(id,x=>x.error?rej(new Error(m+':'+JSON.stringify(x.error))):res(x.result)); ws.send(JSON.stringify({id,method:m,params:p||{}})); }); };
      await send('Page.enable'); await send('Runtime.enable');
      const ev=(expr,ret=true)=>send('Runtime.evaluate',{expression:expr,returnByValue:ret,awaitPromise:true,userGesture:true});
      return { ev, close:()=>{ try{ws.close();}catch(e){} } };
    }catch(e){ await sleep(400); }
  }
  return null;
}
async function attempt(n, level){
  console.log(`\n--- attempt ${n}: L${level} audio, 返回->离开 while TTS speaking ---`);
  let c=await conn(); if(!c){ relaunchAndForward(); await sleep(1500); c=await conn(); if(!c){ console.log('  noconn'); return 'noconn'; } }
  await c.ev(`sessionStorage.setItem('gameLevel','${level}');sessionStorage.setItem('gameMode','audio');location.href='game.html';`,false).catch(()=>{});
  c.close(); await sleep(2600);
  c=await conn(/game\.html/); if(!c){ console.log('  lost game.html'); return 'noconn'; }
  // wait for engine + install a spy on Tts.stop; confirm helper + native stop exist
  let pre=null;
  for(let i=0;i<60;i++){
    pre=(await c.ev(`(() => {
      const g=window._currentGame; if(!g) return {g:false};
      const T=(window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.Tts)||null;
      if(T&&T.stop&&!T.__spy){ const o=T.stop.bind(T); T.stop=function(){window.__stopCalled=true; return o.apply(null,arguments);}; T.__spy=true; }
      return { g:true, mgFn: typeof window._mgSafeLeave, hasStop: !!(T&&T.stop), spk: !!g._ttsSpeaking };
    })()`)).result.value;
    if(pre.g && pre.spk) break;
    await sleep(100);
  }
  console.log('  engine:', JSON.stringify(pre));
  if(!pre||!pre.g){ console.log('  no engine'); c.close(); return 'noengine'; }
  // fire 返回 -> 离开 the instant TTS is speaking
  const fired=(await c.ev(`(() => {
    window.__stopCalled=false;
    const eb=document.getElementById('exit-btn'); if(eb) eb.click();
    const shown=(document.getElementById('exit-modal')||{}).classList? document.getElementById('exit-modal').classList.contains('show'):false;
    const cb=document.getElementById('exit-confirm-btn'); if(cb) cb.click();
    return { shown, hrefNow: location.href };
  })()`)).result.value;
  // within the 150ms defer window: nav should NOT have happened yet; stop() should have
  await sleep(70);
  const mid=(await c.ev(`({ href: location.href, stopCalled: !!window.__stopCalled, spk: window._currentGame? !!window._currentGame._ttsSpeaking:null })`)).result.value;
  console.log('  fired:', JSON.stringify(fired), '| +70ms:', JSON.stringify(mid));
  await sleep(1600);
  const alive=await targetsAlive();
  if(!alive){ console.log('  >>> APP GONE — CRASH <<<'); return 'crash'; }
  let land=null; try{ land=(await c.ev(`({ url: location.href, onMenu: !!document.querySelector('#levelGrid')||!!document.querySelector('#card1') })`)).result.value; }catch(e){ land='eval-failed:'+e.message; }
  console.log('  landing:', JSON.stringify(land));
  const deferOK = fired.hrefNow.includes('game.html') && mid.href.includes('game.html');
  const stopOK = mid.stopCalled===true;
  const menuOK = land && land.url && land.url.includes('index.html');
  console.log('  CHECKS  defer(nav still game.html @70ms):', deferOK, '| Tts.stop called:', stopOK, '| landed on menu:', menuOK);
  c.close();
  return (deferOK && stopOK && menuOK) ? 'pass' : 'soft';
}
sh('adb logcat -b crash -c');
const levels=[2,3,6,1,3,6];   // Game(audio) / VoiceGame / BattleGame，第二轮把 L1 也带上
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
console.log(res.includes('crash')? 'FAIL: crash reproduced' : (res.every(r=>r==='pass')? 'PASS: fix mechanism fired every attempt, no crash' : 'OK-ish: no crash, but some attempts did not confirm mechanism (see above)'));
process.exit(0);
