import { petBrowser } from './pet_browser.mjs';
const b = await petBrowser();
try {
  await b.nav(b.menu); await b.preserve(); await b.viewport(960, 576);
  for (const lv of [1, 2, 3]) {
    await b.boot(lv, 'audio'); await b.sleep(1200);
    console.log('L' + lv, JSON.stringify(await b.ev(`(() => [...document.querySelectorAll('.mg-listen-card, #float-voice-overlay, #voice-mic-area, #float-voice-heard, [id*=listen], [class*=listen-card]')].map(e => { const q = e.getBoundingClientRect(), s = getComputedStyle(e); return [e.id || e.className, Math.round(q.left), Math.round(q.top), Math.round(q.right), Math.round(q.bottom), s.display, s.visibility, s.opacity]; }))()`)));
  }
} finally { try { await b.restore(); } finally { await b.close(); } }
