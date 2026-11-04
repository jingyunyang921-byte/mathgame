// Inspect L1 audio-mode layout on device: which sections are visible, their rects,
// the scratch wrapper's flex/size, and the dead-space gap before the floating mic.
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
let c = await conn();
await c.ev(`sessionStorage.setItem('gameLevel','1');sessionStorage.setItem('gameMode','audio');location.href='game.html';`, false).catch(() => {});
c.close(); await sleep(2000);
c = await conn(/game\.html/);
await sleep(1200);
// wait for readygo/intro to clear and the scratch canvas to lay out (non-zero height)
for (let i = 0; i < 40; i++) {
  const ready = (await c.ev(`(() => { const w=document.getElementById('lv1-voice-canvas-wrapper'); const rg=document.getElementById('readygo-overlay'); const rgOn = rg && getComputedStyle(rg).display!=='none'; return !!w && w.getBoundingClientRect().height>20 && !rgOn; })()`)).result.value;
  if (ready) break;
  await sleep(300);
}
await sleep(300);
const R = (await c.ev(`(() => {
  const info = (id) => { const el = document.getElementById(id); if (!el) return {id, missing:true}; const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    return {id, disp: cs.display, flex: cs.flex, top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), w: Math.round(r.width)}; };
  const ids = ['game-container','pk-section','question-section','answer-section','lv1-voice-section','voice-section',
    'lv1-voice-scratch-label','lv1-voice-canvas-wrapper','lv1-voice-controls-row','float-voice-overlay','float-voice-mic-btn'];
  const rows = ids.map(info).filter(x => !x.missing && x.disp !== 'none');
  // find the visible scratch section + its parent chain
  const sec = document.getElementById('lv1-voice-section');
  const secCS = sec ? getComputedStyle(sec) : null;
  const parent = sec && sec.parentElement;
  const pInfo = parent ? {id: parent.id||parent.className, disp: getComputedStyle(parent).display, dir: getComputedStyle(parent).flexDirection, h: Math.round(parent.getBoundingClientRect().height), justify: getComputedStyle(parent).justifyContent, align: getComputedStyle(parent).alignItems, gap: getComputedStyle(parent).gap} : null;
  const canvasWrap = document.getElementById('lv1-voice-canvas-wrapper');
  const mic = document.getElementById('float-voice-overlay');
  const micTop = mic ? Math.round(mic.getBoundingClientRect().top) : null;
  const lastCtl = document.getElementById('lv1-voice-controls-row');
  const ctlBottom = lastCtl ? Math.round(lastCtl.getBoundingClientRect().bottom) : null;
  return { iw: innerWidth, ih: innerHeight, ui: getComputedStyle(document.documentElement).getPropertyValue('--ui').trim(),
    lv1SectionCS: secCS ? {flex: secCS.flex, minH: secCS.minHeight, pad: secCS.padding, gap: secCS.gap, dir: secCS.flexDirection, justify: secCS.justifyContent} : null,
    lv1CanvasFlex: canvasWrap ? getComputedStyle(canvasWrap).flex : null,
    parent: pInfo, rows, micTop, ctlBottom, deadGap: (micTop!=null && ctlBottom!=null) ? (micTop - ctlBottom) : null };
})()`)).result.value;
console.log(JSON.stringify(R, null, 2));
const shot = await c.send('Page.captureScreenshot', { format: 'png' });
writeFileSync('e:/mathgame/mathgame/.shots/inspect_l1audio.png', Buffer.from(shot.data, 'base64'));
c.close(); process.exit(0);
