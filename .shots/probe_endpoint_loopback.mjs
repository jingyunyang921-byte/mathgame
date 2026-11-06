// 真机探针：用平板自己的扬声器念数字、让自己的麦克风听，量「说完 -> Vosk 出最终结果」的耗时，对比不同 endSec（不需要人说话）。
// 用法：node .shots/probe_endpoint_loopback.mjs   环境变量 ENDS=0.5,0.3,0.2  TEXTS=三十三,七十二,九  REPS=3
import { execSync } from 'node:child_process';
const CDP = 'http://localhost:9222';
const ENDS = (process.env.ENDS || '0.5,0.3').split(',').map(Number);
const TEXTS = (process.env.TEXTS || '三十三,七十二,九,二十').split(',');
const REPS = +(process.env.REPS || 3);
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
sh('adb shell cmd media_session volume --stream 3 --set 15'); sh('adb shell media volume --stream 3 --set 15');
relaunch(); await sleep(2500);
const c = await conn(/index\.html|localhost\/$/); if (!c) { console.log('noconn'); process.exit(1); }
const r = await c.ev(`(async () => {
  const V = Capacitor.Plugins.Vosk, T = Capacitor.Plugins.Tts, sleep = ms => new Promise(r => setTimeout(r, ms));
  const G = JSON.stringify(['零 一 二 三 四 五 六 七 八 九 十 两 重复 再说 下一题 跳过 不会 换题 换一题 算了 [unk]']);
  await V.loadModel({ grammar: G });
  let ev = [];
  V.addListener('partialResult', d => ev.push({ k: 'p', t: performance.now(), x: d && d.text }));
  V.addListener('result', d => ev.push({ k: 'F', t: performance.now(), x: d && d.text, w: d && d.words }));
  const say = text => T.speak({ text, rate: 1.0, volume: 1.0, lang: 'zh-CN' });
  for (const t of ${JSON.stringify(TEXTS)}) await say(t);
  const rows = [];
  for (const endSec of ${JSON.stringify(ENDS)}) for (const text of ${JSON.stringify(TEXTS)}) for (let i = 0; i < ${REPS}; i++) {
    ev = [];
    await V.start({ grammar: G, endSec });
    const tStart = performance.now();
    await sleep(700);
    await say(text);
    const tOk = performance.now();
    let F = null;
    for (let k = 0; k < 60 && !F; k++) { await sleep(100); F = ev.find(e => e.k === 'F' && e.x); }
    const lastP = ev.filter(e => e.k === 'p' && e.x).pop();
    await V.stop().catch(() => {});
    const lastW = F && F.w && F.w.length ? F.w[F.w.length - 1] : null;
    rows.push({ endSec, text, got: F ? F.x : null, finalAfterSpeechMs: F ? Math.round(F.t - tOk) : null, lastPartialAfterSpeechMs: lastP ? Math.round(lastP.t - tOk) : null,
      finalAfterLastWordEndMs: F && lastW ? Math.round((F.t - tStart) - lastW.e * 1000) : null });
    await sleep(500);
  }
  return rows;
})()`);
if (r.exceptionDetails) { console.log('ERR', JSON.stringify(r.exceptionDetails).slice(0, 600)); process.exit(1); }
const rows = r.result.value || [];
for (const x of rows) console.log(JSON.stringify(x));
const by = {};
for (const x of rows) if (x.finalAfterSpeechMs != null) (by[x.endSec] ||= []).push(x.finalAfterSpeechMs);
for (const [k, a] of Object.entries(by)) { a.sort((p, q) => p - q); console.log(`endSec=${k}  n=${a.length}  median=${a[a.length >> 1]}ms  min=${a[0]}  max=${a[a.length - 1]}`); }
c.close(); process.exit(0);
