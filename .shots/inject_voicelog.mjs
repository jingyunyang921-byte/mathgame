// 诊断「读72识别成7」：进 L1 听算，给 Vosk 事件 + _extractNumber + 提交点都挂上日志，
// 记录到 window.__vlog。之后请用户对着设备说「七十二」，再用 read_voicelog.mjs 读回，
// 就能区分：是 partial「七」抢先提交(抢答 bug)，还是 Vosk 声学根本没输出完整的「七十二」。
import { execSync } from 'node:child_process';
const CDP = 'http://localhost:9222';
const sleep = ms => new Promise(r => setTimeout(r, ms));
process.on('unhandledRejection', () => {}); process.on('uncaughtException', () => {});
function sh(c){ try { return execSync(c,{stdio:['ignore','pipe','ignore']}).toString().trim(); } catch(e){ return ''; } }
function relaunch(){
  sh('adb shell monkey -p com.mathgame.app -c android.intent.category.LAUNCHER 1');
  let pid='';
  for(let i=0;i<20;i++){ pid=sh('adb shell pidof com.mathgame.app').split(/\s+/)[0]||''; if(pid && sh('adb shell cat /proc/net/unix').includes('webview_devtools_remote_'+pid)) break; pid=''; execSync('sleep 0.4'); }
  if(pid){ sh('adb forward --remove-all'); sh(`adb forward tcp:9222 localabstract:webview_devtools_remote_${pid}`); }
  return pid;
}
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
      ws.onerror=()=>{}; ws.onclose=()=>{};
      const send=(m,p)=>{ const id=++_id; return new Promise((res,rej)=>{ pend.set(id,x=>x.error?rej(new Error(m+':'+JSON.stringify(x.error))):res(x.result)); ws.send(JSON.stringify({id,method:m,params:p||{}})); }); };
      await send('Page.enable'); await send('Runtime.enable');
      const ev=(expr)=>send('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true,userGesture:true});
      return { send, ev, url:page.url, close:()=>{ try{ws.close();}catch(e){} } };
    }catch(e){ await sleep(400); }
  }
  return null;
}
relaunch(); await sleep(2200);
let c=await conn(/index\.html|localhost\/$/); if(!c){ console.log('noconn menu'); process.exit(1); }
await c.ev(`sessionStorage.setItem('gameLevel','1');sessionStorage.setItem('gameMode','audio');location.href='game.html';`).catch(()=>{});
c.close(); await sleep(2800);
c=await conn(/game\.html/); if(!c){ console.log('lost game.html'); process.exit(1); }
let ready=null;
for(let i=0;i<60;i++){ ready=(await c.ev(`!!(window._currentGame&&window._currentGame._extractNumber)`)).result.value; if(ready) break; await sleep(150); }
if(!ready){ console.log('no listening engine'); c.close(); process.exit(1); }
const info=(await c.ev(`(()=>{
  window.__vlog = [];
  const g = window._currentGame;
  try {
    if (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Vosk && !window.__vlogVosk) {
      window.__vlogVosk = true;
      const fmt = d => ((d && d.words) || []).map(w => w.w + '(c' + (+w.c).toFixed(2) + ' ' + (+w.s).toFixed(2) + '-' + (+w.e).toFixed(2) + ')').join(' ');
      Capacitor.Plugins.Vosk.addListener('partialResult', d => window.__vlog.push({k:'partial', text:(d&&d.text)||'', words:fmt(d), t:Date.now()%100000}));
      Capacitor.Plugins.Vosk.addListener('result',        d => window.__vlog.push({k:'FINAL',   text:(d&&d.text)||'', words:fmt(d), t:Date.now()%100000}));
    }
  } catch(e){}
  if (g._extractNumber && !g.__vlogE) { g.__vlogE=true; const o=g._extractNumber.bind(g); g._extractNumber=function(t){const r=o(t); window.__vlog.push({k:'extract',in:JSON.stringify(t),out:r}); return r;}; }
  if (g._setVoiceHeard && !g.__vlogH) { g.__vlogH=true; const o=g._setVoiceHeard.bind(g); g._setVoiceHeard=function(t){ if(t) window.__vlog.push({k:'BOX',text:t}); return o(t); }; }
  for (const m of ['_processVoiceAnswer','_processVoiceResult']) {
    if (g[m] && !g['__vlog'+m]) { g['__vlog'+m]=true; const o=g[m].bind(g);
      g[m]=function(res){ let ts=[]; try{for(let i=0;i<res.length;i++)ts.push(res[i].transcript);}catch(e){} window.__vlog.push({k:'>>> COMMIT',texts:JSON.stringify(ts),answer:g.currentAnswer}); return o(res); }; }
  }
  return { level:g.level, isNative:!!g._isNativeVoice, answer:g.currentAnswer };
})()`)).result.value;
console.log('probe installed:', JSON.stringify(info), '| url:', c.url);
console.log('READY — 请对着设备清楚说目标数字（如「九」）几次，然后回复我。');
c.close(); process.exit(0);
