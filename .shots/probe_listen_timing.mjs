// 真机探针：量「读完题 -> 麦克风真正开始收音」各段耗时（不需要人说话）。
// 挂住 Tts.speak / Vosk.start / recognition.start / onstart / 读完叮，进听算 L<LEVEL>，放 SECS 秒后读回时间线。
// 用法：LEVEL=1 SECS=20 node .shots/probe_listen_timing.mjs   （需要 PATH 里有 adb）
import { execSync } from 'node:child_process';
const CDP = 'http://localhost:9222';
const LEVEL = process.env.LEVEL || '1', SECS = +(process.env.SECS || 20);
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
await c.ev(`sessionStorage.setItem('gameLevel','${LEVEL}');sessionStorage.setItem('gameMode','audio');location.href='game.html';`).catch(()=>{});
c.close(); await sleep(2800);
c=await conn(/game\.html/); if(!c){ console.log('lost game.html'); process.exit(1); }
let ready=false;
for(let i=0;i<60;i++){ ready=(await c.ev(`!!(window._currentGame&&window._currentGame.recognition)`)).result.value; if(ready) break; await sleep(150); }
if(!ready){ console.log('no listening engine'); c.close(); process.exit(1); }
await c.ev(`(() => {
  window.__tl = []; const T = () => Math.round(performance.now()); const L = (k, x) => window.__tl.push(Object.assign({ k, t: T() }, x || {}));
  const g = window._currentGame;
  const wrap = (obj, name, tag, pickArg) => { const o = obj[name]; if (!o || o.__w) return; const f = function () { L(tag + '>', pickArg ? pickArg.apply(null, arguments) : {}); const r = o.apply(this, arguments); if (r && r.then) r.then(() => L(tag + '<ok'), () => L(tag + '<rej')); return r; }; f.__w = 1; try { obj[name] = f; } catch (e) { L('wrapfail ' + tag); } };
  try { wrap(Capacitor.Plugins.Tts, 'speak', 'tts.speak', o => ({ text: String(o && o.text).slice(0, 12) })); } catch (e) { L('noTts'); }
  try { wrap(Capacitor.Plugins.Vosk, 'start', 'vosk.start'); wrap(Capacitor.Plugins.Vosk, 'stop', 'vosk.stop'); } catch (e) { L('noVosk'); }
  const r = g.recognition;
  { const o = r.start.bind(r); r.start = function () { L('rec.start()'); return o(); }; }
  { const o = r.onstart; r.onstart = function () { L('rec.onstart'); return o && o.apply(this, arguments); }; }
  { const o = window.mgPlayAskChime; window.mgPlayAskChime = function () { const x = o.apply(this, arguments); L('chime', { played: x }); return x; }; }
  try {
    const V = Capacitor.Plugins.Vosk;
    V.addListener('partialResult', d => { if (d && d.text) L('partial', { text: d.text }); });
    V.addListener('result', d => L('FINAL', { text: d && d.text }));
  } catch (e) {}
  true;
})()`);
await sleep(SECS * 1000);
const tl = (await c.ev('window.__tl')).result.value || [];
const t0 = tl.length ? tl[0].t : 0;
let prev = t0;
for (const e of tl) { console.log(String(e.t - t0).padStart(6) + 'ms  +' + String(e.t - prev).padStart(5) + '  ' + e.k + (e.text ? '  ' + e.text : '') + (e.played !== undefined ? '  played=' + e.played : '')); prev = e.t; }
c.close(); process.exit(0);
