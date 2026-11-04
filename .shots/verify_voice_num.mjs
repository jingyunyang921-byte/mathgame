// 真机验证：设备上实际运行的听算解析函数 _extractNumber 对两位数是否全部解析正确。
// 进 L3 听算(VoiceGame)，拿 window._currentGame，喂一批中文数字断言结果。旧版对「X十Y」几乎全错
// (三十七→17、九十六→16…)，新算法应 0 错。这验证修复已随 APK 上到设备且在 Chrome91 里运行正常。
import { execSync } from 'node:child_process';
const CDP = 'http://localhost:9222';
const sleep = ms => new Promise(r => setTimeout(r, ms));
process.on('unhandledRejection', () => {});
process.on('uncaughtException', () => {});
function sh(c){ try { return execSync(c,{stdio:['ignore','pipe','ignore']}).toString().trim(); } catch(e){ return ''; } }
function relaunch(){
  sh('adb shell monkey -p com.mathgame.app -c android.intent.category.LAUNCHER 1');
  let pid='';
  for(let i=0;i<20;i++){ pid=sh('adb shell cat /proc/net/unix').split('\n').filter(l=>/webview_devtools_remote/.test(l)).map(l=>l.replace(/.*webview_devtools_remote_/,'').trim())[0]||''; if(pid) break; execSync('sleep 0.4'); }
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
const CASES=[['七',7],['十',10],['十三',13],['十五',15],['二十',20],['二十四',24],['三十',30],['三十七',37],
  ['四十二',42],['四十七',47],['五十三',53],['六十',60],['六十八',68],['七十二',72],['七十八',78],
  ['八十一',81],['九十',90],['九十六',96],['九十九',99],['二 十 四',24],['两',2],['零',0]];

relaunch(); await sleep(2200);
let c=await conn(/index\.html|localhost\/$/); if(!c){ console.log('noconn menu'); process.exit(1); }
await c.ev(`sessionStorage.setItem('gameLevel','3');sessionStorage.setItem('gameMode','audio');location.href='game.html';`).catch(()=>{});
c.close(); await sleep(2800);
c=await conn(/game\.html/); if(!c){ console.log('lost game.html'); process.exit(1); }
let ready=null;
for(let i=0;i<60;i++){
  ready=(await c.ev(`(()=>{ const g=window._currentGame; return { g:!!g, fn: g&&typeof g._extractNumber }; })()`)).result.value;
  if(ready.g && ready.fn==='function') break;
  await sleep(150);
}
console.log('engine:', JSON.stringify(ready), '| url:', c.url);
if(!ready || ready.fn!=='function'){ console.log('FAIL: no _extractNumber on device'); c.close(); process.exit(1); }
const out=(await c.ev(`(()=>{
  const g=window._currentGame;
  const cases=${JSON.stringify(CASES)};
  const rows=cases.map(([inp,exp])=>{ let got=null; try{ got=g._extractNumber([inp]); }catch(e){ got='ERR:'+e.message; } return [inp,exp,got,got===exp]; });
  return { pass: rows.every(r=>r[3]), fails: rows.filter(r=>!r[3]), n: rows.length };
})()`)).result.value;
// stop any TTS the level started, so leaving the page later is clean (don't tear down here)
await c.ev(`try{ if(window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.Tts&&Capacitor.Plugins.Tts.stop) Capacitor.Plugins.Tts.stop(); }catch(e){}`).catch(()=>{});
console.log('\n=== 设备端 _extractNumber 验证 ('+out.n+' 例) ===');
console.log(out.pass ? 'PASS: 全部解析正确（含 37/47/53/96 等旧版必错的两位数）'
                     : 'FAIL: 以下解析错误 → '+JSON.stringify(out.fails));
c.close(); process.exit(out.pass?0:1);
