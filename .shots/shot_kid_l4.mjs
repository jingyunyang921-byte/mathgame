// L4 小孩子形象截图（草稿用）：node .shots/shot_kid_l4.mjs
import { petBrowser } from './pet_browser.mjs';
const b = await petBrowser();
try {
  await b.nav(b.menu); await b.preserve();
  for (const [w, h] of [[960, 576], [412, 915]]) {
    await b.viewport(w, h);
    for (const mode of ['visual', 'audio']) {
      await b.boot(4, mode);
      for (const step of [0, 4]) {
        await b.ev(`(() => { const g = window._currentGame; if (g.monsterTimer) clearInterval(g.monsterTimer);
          g.gameEnded = false; g.playerStep = ${step}; g.monsterStep = ${step ? 3 : 0}; g._updateRaceTrack(); return true; })()`);
        await b.sleep(500);
        await b.shot(`kid_L4_${mode}_${w}x${h}_s${step}`);
      }
    }
  }
  console.log('errors:', JSON.stringify(b.errors));
} finally {
  try { await b.viewport(1000, 576); await b.restore(); } finally { await b.close(); }
}
