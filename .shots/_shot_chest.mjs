// 结算开宝箱截图（本地）：node .shots/_shot_chest.mjs [states] [WxH,...]
// states: closed,open,phaseup,none,hatched,lose
import { petBrowser } from './pet_browser.mjs';
const states = (process.argv[2] || 'closed,open').split(',');
const sizes = (process.argv[3] || '1000x576').split(',').map(s => s.split('x').map(Number));
const b = await petBrowser();
const seed = (kind) => `(() => {
  const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return MG_PET.dayKey(x); };
  const mk = (age, days, extra) => Object.assign({ version: 2, adopted: true, exp: 0, stage: 0, adoptedDay: d(1 - age), lastDay: d(0),
    days: Array.from({ length: days }, (_, i) => d(-days + i)), phase: 0, daily: { date: d(0), correct: 0, rounds: [] }, gifts: [], decor: 'leaf', decors: ['leaf'],
    name: '数宝', hatchDay: '', birthSeen: false, affection: 0, stories: { seen: [], pending: [] } }, extra);
  const K = { open: mk(22, 9), phaseup: mk(22, 4), hatched: mk(100, 61, { stage: 1, hatchDay: d(0), birthSeen: true }), none: null };
  localStorage.removeItem('mathgamePet'); localStorage.removeItem('mathgameStars'); localStorage.removeItem('mathgameCoins');
  const pet = K['${kind}'] === undefined ? K.open : K['${kind}'];
  if (pet) localStorage.setItem('mathgamePet', JSON.stringify(pet));
  return true; })()`;
const end = (win, correct) => `_mgWrong=${win ? 0 : 4};_mgCorrect=${correct};_mgMaxStreak=${correct};_mgRoundStart=Date.now()-9000;debugEndGame(${win});true`;
try {
  await b.nav(b.menu); await b.preserve();
  for (const [w, h] of sizes) for (const st of states) {
    await b.viewport(w, h);
    await b.ev('try{_mgPendingSnap=null}catch(e){};true');
    await b.ev(seed(st === 'closed' ? 'open' : st === 'lose' ? 'open' : st));
    await b.boot(1);
    await b.ev(end(st !== 'lose', st === 'lose' ? 4 : 10));
    await b.sleep(900);
    const m1 = await b.ev(`(() => { const c = document.getElementById('overlay-content'); return { cls: document.getElementById('overlay-chest').className, ch: c.clientHeight, sh: c.scrollHeight, vh: innerHeight,
      btns: [...document.querySelectorAll('#overlay-btns button')].map(x => { const r = x.getBoundingClientRect(); return Math.round(r.bottom); }) }; })()`);
    console.log(st, w + 'x' + h, 'pre', JSON.stringify(m1));
    if (st === 'closed') { await b.shot(`chest_closed_${w}x${h}`); continue; }
    await b.ev(`(() => { const t = document.querySelector('.chest-tap'); if (t) t.click(); return true; })()`);
    await b.sleep(2600);
    const m2 = await b.ev(`(() => { const c = document.getElementById('overlay-content'); const e = document.getElementById('overlay-chest');
      return { cls: e.className, ch: c.clientHeight, sh: c.scrollHeight, text: e.textContent.replace(/\\s+/g, ' ').slice(0, 160),
      btns: [...document.querySelectorAll('#overlay-btns button')].map(x => { const r = x.getBoundingClientRect(); return Math.round(r.bottom); }) }; })()`);
    console.log(st, w + 'x' + h, 'post', JSON.stringify(m2));
    await b.shot(`chest_${st}_${w}x${h}`);
  }
  console.log('errors=', JSON.stringify(b.errors));
} finally { try { await b.restore(); } finally { await b.close(); } }
