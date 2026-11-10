// Device verify: profile modal (#profileModal) breathing room + button always visible.
// Opens showProfile() on the REAL on-device progress (no localStorage mutation),
// measures card vs viewport + 好的 button, screenshots via CDP (screencap is FLAG_SECURE-blank).
// CDP on :9222 (Chrome 91 WebView).
import { writeFileSync } from 'node:fs';
const CDP = 'http://localhost:9222';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function connect(matchExpr) {
  for (let i = 0; i < 30; i++) {
    try {
      const info = await (await fetch(CDP + '/json')).json();
      const pages = info.filter(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (!pages.length) { await sleep(300); continue; }
      // try each page; keep the first whose DOM has #card1 (the menu)
      for (const page of pages) {
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        try { await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; }); } catch (e) { continue; }
        let _id = 0; const pend = new Map();
        ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
        const send = (m, p) => { const id = ++_id; return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify({ id, method: m, params: p || {} })); }); };
        await send('Page.enable'); await send('Runtime.enable');
        const ev = (expr, ret = true) => send('Runtime.evaluate', { expression: expr, returnByValue: ret, awaitPromise: true, userGesture: true });
        const has = (await ev(`!!document.querySelector('#card1')||!!document.querySelector('#levelGrid')`)).result.value;
        if (has || matchExpr) return { ws, ev, send, url: page.url, close: () => { try { ws.close(); } catch (e) {} } };
        ws.close();
      }
      await sleep(300);
    } catch (e) { await sleep(400); }
  }
  throw new Error('no menu page target found');
}

const c = await connect();
console.log('menu target:', c.url);
// ensure we are on the menu (index.html); if not, navigate there
const onMenu = (await c.ev(`!!document.querySelector('#card1')`)).result.value;
if (!onMenu) { await c.ev(`location.href='index.html'`, false).catch(() => {}); await sleep(1500); }

const R = (await c.ev(`(() => {
  showProfile();
  const card = document.querySelector('#profileModal .locked-modal-card');
  const list = document.querySelector('#profileModal #profileLevels');
  const btn = document.querySelector('#profileModal .locked-modal-btn');
  const emoji = document.querySelector('#profileModal .modal-emoji');
  const cr = card.getBoundingClientRect(); const br = btn.getBoundingClientRect(); const er = emoji.getBoundingClientRect();
  const bad = [...document.querySelectorAll('#profileModal use')].map(u => u.getAttribute('href')).filter(h => h && !document.querySelector(h));
  return {
    ua: navigator.userAgent.match(/Chrome\\/[0-9]+/)?.[0],
    iw: innerWidth, ih: innerHeight, dpr: window.devicePixelRatio,
    rank: document.getElementById('profileTitle').textContent, stars: document.getElementById('profileStars').textContent,
    cardTop: Math.round(cr.top), cardBottom: Math.round(cr.bottom), cardH: Math.round(cr.height),
    gapTop: Math.round(cr.top), gapBottom: Math.round(innerHeight - cr.bottom),
    inViewport: cr.top >= -0.5 && cr.bottom <= innerHeight + 0.5,
    cardScrolls: card.scrollHeight - card.clientHeight > 1,
    listScrolls: list.scrollHeight - list.clientHeight > 1, listOver: list.scrollHeight - list.clientHeight,
    emojiTop: Math.round(er.top), btnTop: Math.round(br.top), btnBottom: Math.round(br.bottom),
    btnInView: br.bottom <= innerHeight + 0.5 && br.top >= -0.5,
    danglingUse: bad,
  };
})()`)).result.value;

await sleep(400); // let emoji bounce settle
const shot = await c.send('Page.captureScreenshot', { format: 'png' });
writeFileSync('e:/mathgame/mathgame/.shots/profile_device.png', Buffer.from(shot.data, 'base64'));

console.log(JSON.stringify(R, null, 2));
let fail = 0; const P = (ok, l, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
P(/Chrome\/(9[1-9]|1\d\d)/.test(R.ua || ''), 'WebView >= Chrome 91', R.ua);
P(R.inViewport, 'card fully inside viewport (no top/bottom jam)', 'top=' + R.cardTop + ' bottom=' + R.cardBottom + ' ih=' + R.ih);
P(R.gapTop >= 6 && R.gapBottom >= 6, 'breathing room top & bottom (>=6px)', 'gapTop=' + R.gapTop + ' gapBottom=' + R.gapBottom);
P(!R.cardScrolls, 'card itself does not scroll (header+footer pinned)');
P(R.btnInView, '好的 button always visible', 'btnBottom=' + R.btnBottom + ' ih=' + R.ih);
P(Array.isArray(R.danglingUse) && R.danglingUse.length === 0, 'all <use> resolve in modal', JSON.stringify(R.danglingUse));
console.log('INFO real progress: ' + R.rank + ' ★' + R.stars + ' | vp ' + R.iw + 'x' + R.ih + ' dpr' + R.dpr + ' | list scroll ' + (R.listScrolls ? 'ON over=' + R.listOver : 'off'));
console.log('\n' + (fail === 0 ? '=== DEVICE PROFILE-MODAL VERIFY PASS ===' : '=== ' + fail + ' FAIL ==='));
c.close(); process.exit(fail ? 1 : 0);
