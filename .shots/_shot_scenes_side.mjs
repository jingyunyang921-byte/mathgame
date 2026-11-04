// L1-L3 小画 + 两侧小景取景。用法：node .shots/_shot_scenes_side.mjs [前缀] [关:模式 ...]；环境变量 VPS="960x576,900x500" ANS=答对题数
import { petBrowser } from './pet_browser.mjs';
const [pre = 'side', ...modes0] = process.argv.slice(2);
const modes = modes0.length ? modes0 : ['1:visual', '2:visual', '3:visual', '1:audio', '3:audio'];
const vps = (process.env.VPS || '960x576').split(',').map(s => s.split('x').map(Number));
const ans = Number(process.env.ANS || 4);
const b = await petBrowser();
const seed = `(() => {
  const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return MG_PET.dayKey(x); };
  ['mathgamePet', 'mathgameStars', 'mathgameCoins'].forEach(k => localStorage.removeItem(k));
  try { _mgPendingSnap = null; } catch (e) {}
  if (${process.env.NOPET ? 'false' : 'true'}) localStorage.setItem('mathgamePet', JSON.stringify({ version: 2, adopted: true, exp: 0, stage: 0, adoptedDay: d(-22), lastDay: d(0), xp: 20,
    days: Array.from({ length: 4 }, (_, i) => d(-4 + i)), phase: 0, daily: { date: d(0), correct: 0, rounds: [] }, gifts: [], decor: 'leaf', decors: ['leaf'],
    name: '数宝', hatchDay: '', birthSeen: false, affection: 0, stories: { seen: [], pending: [] } }));
  return true; })()`;
const answer = mode => mode === 'audio'
  ? `(() => { const g = window._currentGame; if (typeof g._voiceOnCorrect === 'function') g._voiceOnCorrect(); else g._processVoiceResult([{ transcript: String(g.currentAnswer) }]); return true; })()`
  : `(async () => { const g = window._currentGame; g.hasContent = true; g.recognizer.recognize = async () => g.currentAnswer; await g._submit(); return g.playerScore; })()`;
const R = `(() => { const r = s => { const e = document.querySelector(s); if (!e || !e.getClientRects().length) return null; const q = e.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.top), Math.round(q.right), Math.round(q.bottom)]; };
  const qs = document.getElementById('question-section').getBoundingClientRect();
  return { qsBottom: Math.round(qs.bottom), scene: r('#mg-scene'), sideL: r('#mg-side .l'), sideR: r('#mg-side .r'), slot: r('#mg-egg-slot'), cw: r('#canvas-wrapper'), lc: r('.mg-listen-card'), skip: r('#skip-btn'), lskip: r('#mg-listen-skip') }; })()`;
try {
  await b.nav(b.menu); await b.preserve();
  for (const [w, h] of vps) {
    await b.viewport(w, h);
    for (const m of modes) {
      const [lv, mode] = m.split(':');
      await b.ev(seed); await b.boot(Number(lv), mode); await b.sleep(900);
      for (let i = 0; i < ans; i++) { await b.ev(answer(mode)); await b.sleep(1300); }
      await b.sleep(900);
      console.log(`${w}x${h} L${lv} ${mode}`, JSON.stringify(await b.ev(R)));
      await b.shot(`${pre}_L${lv}_${mode}_${w}x${h}`);
    }
  }
  console.log('errors=', JSON.stringify(b.errors));
} finally { try { await b.restore(); } finally { await b.close(); } }
