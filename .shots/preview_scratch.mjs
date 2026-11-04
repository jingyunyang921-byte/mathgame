// Live-preview the scratch-area fix on the REAL device WITHOUT rebuilding the APK.
// Injects the new @media rules (canvas flex-grow + L1 padding-bottom reserve) as an
// override <style>, navigates L1 then L2 audio, waits for readygo to clear, remeasures
// deadGap/canvas, and screenshots each. Proves the exact on-device pixels before we build.
import { writeFileSync } from 'node:fs';
const CDP = 'http://localhost:9222';
const sleep = ms => new Promise(r => setTimeout(r, ms));
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
  throw new Error('connect failed');
}
const CSS = `@media (orientation: landscape) and (max-height: 640px){
  #lv1-voice-canvas-wrapper,#voice-canvas-wrapper{flex:1 1 0 !important;min-height:0 !important;}
  #lv1-voice-section{padding-bottom:96px !important;}
}`;
// Append to <body> LAST so it beats the packaged @media block (equal specificity+!important -> source order wins).
const INJECT = `(() => { let s=document.getElementById('__preview_fix'); if(s) s.remove(); s=document.createElement('style'); s.id='__preview_fix'; s.textContent=${JSON.stringify(CSS)}; document.body.appendChild(s); const w=document.getElementById('lv1-voice-canvas-wrapper')||document.getElementById('voice-canvas-wrapper'); window.dispatchEvent(new Event('resize')); return w?getComputedStyle(w).flexBasis+'|'+getComputedStyle(w).flexGrow:'no-wrap'; })()`;

async function run(level, wrapId, secId, ctlId, micId, micInFlow, outPng) {
  let c = await conn();
  await c.ev(`sessionStorage.setItem('gameLevel','${level}');sessionStorage.setItem('gameMode','audio');location.href='game.html';`, false).catch(() => {});
  c.close(); await sleep(2200);
  c = await conn(/game\.html/);
  await sleep(1000);
  for (let i = 0; i < 40; i++) {
    const ready = (await c.ev(`(() => { const w=document.getElementById('${wrapId}'); const rg=document.getElementById('readygo-overlay'); const rgOn = rg && getComputedStyle(rg).display!=='none'; return !!w && w.getBoundingClientRect().height>20 && !rgOn; })()`)).result.value;
    if (ready) break;
    await sleep(300);
  }
  const applied = (await c.ev(INJECT)).result.value;           // apply the fix live
  console.log(`  inject L${level}: wrapper flex(basis|grow)=${applied}`);
  await sleep(600);             // let flexbox relayout + canvas resize
  const R = (await c.ev(`(() => {
    const rc = id => { const el=document.getElementById(id); if(!el) return null; const r=el.getBoundingClientRect(); return {top:Math.round(r.top),bottom:Math.round(r.bottom),h:Math.round(r.height)}; };
    const wrap=rc('${wrapId}'), sec=rc('${secId}'), ctl=rc('${ctlId}'), mic=rc('${micId}');
    return { ih:innerHeight, ui:getComputedStyle(document.documentElement).getPropertyValue('--ui').trim(),
      section:sec, canvas:wrap, controls:ctl, mic,
      deadGap:(mic&&ctl)?(mic.top-ctl.bottom):null };
  })()`)).result.value;
  R._level = level; R._micInFlow = micInFlow;
  console.log(JSON.stringify(R, null, 2));
  const shot = await c.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(outPng, Buffer.from(shot.data, 'base64'));
  c.close();
  return R;
}

const r1 = await run(1, 'lv1-voice-canvas-wrapper', 'lv1-voice-section', 'lv1-voice-controls-row', 'float-voice-overlay', false, 'e:/mathgame/mathgame/.shots/preview_l1audio.png');
const r2 = await run(2, 'voice-canvas-wrapper', 'voice-section', 'voice-controls-row', 'voice-mic-area', true, 'e:/mathgame/mathgame/.shots/preview_l2audio.png');
console.log('\n=== SUMMARY ===');
console.log(`L1 canvas h=${r1.canvas&&r1.canvas.h}  deadGap(ctl->float mic)=${r1.deadGap}  (want small, ~6-12)`);
console.log(`L2 canvas h=${r2.canvas&&r2.canvas.h}  gap(ctl->in-flow mic)=${r2.deadGap}  (in-flow mic; gap should be tight)`);
process.exit(0);
