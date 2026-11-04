const BROWSER='http://localhost:9333'; const URL='http://localhost:8000/menu.html';
const ver=await(await fetch(BROWSER+'/json/version')).json();
const ws=new WebSocket(ver.webSocketDebuggerUrl); await new Promise(r=>ws.onopen=r);
let _id=0; const pending=new Map(); const waiters=[];
ws.onmessage=e=>{const m=JSON.parse(e.data); if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);} else if(m.method){for(let i=waiters.length-1;i>=0;i--)if(waiters[i].pred(m))waiters.splice(i,1)[0].res(m);}};
const send=(method,params,sid)=>{const id=++_id;const msg={id,method,params:params||{}};if(sid)msg.sessionId=sid;return new Promise((res,rej)=>{pending.set(id,m=>m.error?rej(new Error(method+':'+JSON.stringify(m.error))):res(m.result));ws.send(JSON.stringify(msg));});};
const waitEvent=(pred,ms=8000)=>new Promise((res,rej)=>{const w={pred,res};waiters.push(w);setTimeout(()=>{const i=waiters.indexOf(w);if(i>=0){waiters.splice(i,1);rej(new Error('timeout'));}},ms);});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const {targetId}=await send('Target.createTarget',{url:'about:blank'});
const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
await send('Page.enable',{},sessionId); await send('Runtime.enable',{},sessionId);
for(const vp of [{name:'412x915',w:412,h:915},{name:'360x780',w:360,h:780}]){
  await send('Emulation.setDeviceMetricsOverride',{width:vp.w,height:vp.h,deviceScaleFactor:1,mobile:false},sessionId);
  const nav=waitEvent(m=>m.method==='Page.loadEventFired'&&m.sessionId===sessionId);
  await send('Page.navigate',{url:URL},sessionId); await nav; await sleep(300);
  const r=await send('Runtime.evaluate',{expression:`(()=>{
    const tb=document.querySelector('.topbar'), acts=document.querySelector('.topbar-actions');
    const badge=document.querySelector('.profile-badge'), coin=document.getElementById('coinPill');
    const btns=[...acts.querySelectorAll('.icon-btn')];
    const R=el=>{const b=el.getBoundingClientRect();return {l:Math.round(b.left),r:Math.round(b.right),t:Math.round(b.top),bt:Math.round(b.bottom),w:Math.round(b.width)};};
    return {iw:innerWidth, tb:R(tb), acts:R(acts), badge:R(badge), coin:R(coin),
      btnTops:btns.map(b=>Math.round(b.getBoundingClientRect().top)),
      actsWrapped: acts.getBoundingClientRect().top > badge.getBoundingClientRect().bottom - 2,
      tbScrollW: tb.scrollWidth, tbClientW: tb.clientWidth};
  })()`,returnByValue:true},sessionId);
  console.log(vp.name, JSON.stringify(r.result.value));
}
await send('Target.closeTarget',{targetId}); ws.close(); process.exit(0);
