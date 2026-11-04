// FINAL device verify (real rebuilt APK, NO live injection): the scratch-area fix is baked in.
// Navigates L1 then L2 audio, waits for readygo to clear, measures canvas/deadGap, screenshots,
// and asserts: L1 canvas grew (>=170px) & float mic no longer leaves a big dead gap (<=24px);
// L2 canvas grew & in-flow mic anchored near the bottom; controls stay on-screen for both.
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
async function run(level, wrapId, secId, ctlId, micId, outPng) {
  let c = await conn();
  await c.ev(`sessionStorage.setItem('gameLevel','${level}');sessionStorage.setItem('gameMode','audio');location.href='game.html';`, false).catch(() => {});
  c.close(); await sleep(2400);
  c = await conn(/game\.html/);
  await sleep(1000);
  for (let i = 0; i < 40; i++) {
    const ready = (await c.ev(`(() => { const w=document.getElementById('${wrapId}'); const rg=document.getElementById('readygo-overlay'); const rgOn = rg && getComputedStyle(rg).display!=='none'; return !!w && w.getBoundingClientRect().height>20 && !rgOn; })()`)).result.value;
    if (ready) break;
    await sleep(300);
  }
  await sleep(400);
  const R = (await c.ev(`(() => {
    const rc = id => { const el=document.getElementById(id); if(!el) return null; const r=el.getBoundingClientRect(); return {top:Math.round(r.top),bottom:Math.round(r.bottom),h:Math.round(r.height)}; };
    const wrap=rc('${wrapId}'), sec=rc('${secId}'), ctl=rc('${ctlId}'), mic=rc('${micId}');
    return { ih:innerHeight, ui:getComputedStyle(document.documentElement).getPropertyValue('--ui').trim(),
      canvasH:wrap&&wrap.h, ctlBottom:ctl&&ctl.bottom, micTop:mic&&mic.top, micBottom:mic&&mic.bottom,
      deadGap:(mic&&ctl)?(mic.top-ctl.bottom):null, ctlOnScreen: ctl? ctl.bottom<=innerHeight+0.5:null };
  })()`)).result.value;
  const shot = await c.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(outPng, Buffer.from(shot.data, 'base64'));
  c.close();
  return R;
}
const r1 = await run(1, 'lv1-voice-canvas-wrapper', 'lv1-voice-section', 'lv1-voice-controls-row', 'float-voice-overlay', 'e:/mathgame/mathgame/.shots/verify_scratch_l1.png');
const r2 = await run(2, 'voice-canvas-wrapper', 'voice-section', 'voice-controls-row', 'voice-mic-area', 'e:/mathgame/mathgame/.shots/verify_scratch_l2.png');
console.log('L1', JSON.stringify(r1)); console.log('L2', JSON.stringify(r2));
let fail = 0; const P = (ok, l, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
console.log('\n=== L1 乘法入门 听算 ===');
P(r1.canvasH >= 170, 'L1 scratch canvas grew to fill (was 115px)', r1.canvasH + 'px');
P(r1.deadGap != null && r1.deadGap <= 24, 'L1 dead gap before float mic gone (was 94px)', r1.deadGap + 'px');
P(r1.ctlOnScreen && r1.micBottom <= r1.ih + 0.5, 'L1 controls + float mic on-screen', 'ctlBottom=' + r1.ctlBottom + ' micBottom=' + r1.micBottom + ' ih=' + r1.ih);
console.log('=== L2 除法入门 听算 (in-flow mic) ===');
P(r2.canvasH >= 170, 'L2 scratch canvas grew to fill', r2.canvasH + 'px');
P(r2.ctlOnScreen && r2.micBottom <= r2.ih + 0.5, 'L2 controls + in-flow mic on-screen', 'ctlBottom=' + r2.ctlBottom + ' micBottom=' + r2.micBottom + ' ih=' + r2.ih);
console.log('\n' + (fail === 0 ? '=== DEVICE SCRATCH-FIX VERIFY PASS ===' : '=== ' + fail + ' FAIL ==='));
process.exit(fail ? 1 : 0);
