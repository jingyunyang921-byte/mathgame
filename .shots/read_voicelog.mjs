// 配合 inject_voicelog.mjs：用户说完「七十二」后跑这个，把 window.__vlog 读回来看 Vosk 到底吐了什么。
import { execSync } from 'node:child_process';
const CDP = 'http://localhost:9222';
const sleep = ms => new Promise(r => setTimeout(r, ms));
process.on('unhandledRejection', () => {}); process.on('uncaughtException', () => {});
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
      await send('Runtime.enable');
      const ev=(expr)=>send('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true});
      return { ev, url:page.url, close:()=>{ try{ws.close();}catch(e){} } };
    }catch(e){ await sleep(400); }
  }
  return null;
}
let c=await conn(/game\.html/); if(!c){ console.log('noconn game.html（forward 可能已断）'); process.exit(1); }
const log=(await c.ev(`JSON.stringify(window.__vlog||null)`)).result.value;
console.log('url:', c.url);
if(log===null || log==='null'){ console.log('no __vlog — 页面可能重载了或未注入，需要重跑 inject'); c.close(); process.exit(1); }
const arr=JSON.parse(log);
console.log('=== __vlog', arr.length, 'events（按时间顺序）===');
for(const e of arr) console.log(JSON.stringify(e));
c.close(); process.exit(0);
