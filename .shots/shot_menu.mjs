// Verify the L4 除法进阶 ÷ icon centering on-device (CDP :9222).
// The card row scrolls horizontally, so locate the card whose text contains 除法进阶,
// scroll it to center, then clip-screenshot its icon badge. Also read the device's actual
// i-div-adv symbol geometry (÷ bar x1/x2) as objective proof the new centered symbol shipped.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const CDP = 'http://localhost:9222';
const sleep = ms => new Promise(r => setTimeout(r, ms));
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
      return { send, url:page.url, ev:(expr)=>send('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true}), close:()=>{ try{ws.close();}catch(e){} } };
    }catch(e){ await sleep(400); }
  }
  return null;
}
relaunch(); await sleep(2200);
let c=await conn(/index\.html|localhost\/$/); if(!c){ console.log('noconn'); process.exit(1); }
console.log('url:', c.url);
const found=(await c.ev(`(()=>{
  const cards=[...document.querySelectorAll('.island-card')];
  const el=cards.find(x=>/除法进阶/.test(x.textContent));
  if(!el) return {found:false, names:cards.map(x=>(x.textContent||'').replace(/\\s+/g,' ').trim().slice(0,10))};
  el.scrollIntoView({inline:'center',block:'center'});
  return {found:true, id:el.id};
})()`)).result.value;
console.log('locate:', JSON.stringify(found));
await sleep(800);
const geo=(await c.ev(`(()=>{
  const cards=[...document.querySelectorAll('.island-card')];
  const el=cards.find(x=>/除法进阶/.test(x.textContent));
  if(!el) return {found:false};
  const use=el.querySelector('use'); const href=use&&use.getAttribute('href');
  const svg=el.querySelector('svg.ic')||el.querySelector('svg');
  const r=svg.getBoundingClientRect();
  const sym=document.getElementById('i-div-adv');
  const line=sym&&sym.querySelector('line');
  const circles=sym?[...sym.querySelectorAll('circle')].map(c=>c.getAttribute('cx')):null;
  const stars=sym?[...sym.querySelectorAll('path')].map(p=>(p.getAttribute('d')||'').slice(0,6)):null;
  return { found:true, href, barX1:line&&line.getAttribute('x1'), barX2:line&&line.getAttribute('x2'),
           dotCx:circles, starD:stars,
           badge:{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)} };
})()`)).result.value;
console.log('geo:', JSON.stringify(geo));
let params={ format:'png' };
if(geo && geo.badge){ const b=geo.badge; params.clip={ x:Math.max(0,b.x-30), y:Math.max(0,b.y-30), width:b.w+60, height:b.h+60, scale:4 }; }
const shot=await c.send('Page.captureScreenshot', params);
fs.writeFileSync('.shots/menu_shot.png', Buffer.from(shot.data,'base64'));
console.log('saved .shots/menu_shot.png', Buffer.from(shot.data,'base64').length, 'bytes');
c.close(); process.exit(0);
