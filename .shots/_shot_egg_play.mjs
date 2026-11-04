// 蛋位验收截图：种子=已领养未孵化，答对 n 次（直接触发 showAnswerMark）后截图。
// 用法：node .shots/_shot_egg_play.mjs <前缀> [关卡,..] [模式,..] [WxH,..] [n]
import { petBrowser } from './pet_browser.mjs';
const [pre = 'eggp', lvArg = '1,2,3,4,5,6', modeArg = 'visual', szArg = '960x576', nArg = '3'] = process.argv.slice(2);
const MARK = { 1: 'answer-mark', 2: 'answer-mark', 3: 'answer-mark', 4: 'answer-mark', 5: 'space-answer-mark', 6: 'battle-answer-mark' };
const b = await petBrowser();
const seed = `(() => {
  const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return MG_PET.dayKey(x); };
  const days = 9;
  const p = { version: 2, adopted: true, exp: 0, stage: 0, adoptedDay: d(1 - 22), lastDay: d(0), xp: 0,
    days: Array.from({ length: days }, (_, i) => d(-days + i)), phase: 0, daily: { date: d(0), correct: 0, rounds: [] }, gifts: [], decor: 'leaf', decors: ['leaf'],
    name: '数宝', hatchDay: '', birthSeen: false, affection: 0, stories: { seen: [], pending: [] } };
  ['mathgamePet', 'mathgameStars', 'mathgameCoins'].forEach(k => localStorage.removeItem(k));
  try { _mgPendingSnap = null; } catch (e) {}
  localStorage.setItem('mathgamePet', JSON.stringify(p));
  return true; })()`;
try {
  await b.nav(b.menu); await b.preserve();
  for (const sz of szArg.split(',')) {
    const [w, h] = sz.split('x').map(Number);
    await b.viewport(w, h);
    for (const lv of lvArg.split(',').map(Number)) for (const mode of modeArg.split(',')) {
      await b.ev(seed);
      try { await b.boot(lv, mode); } catch (e) { console.log('boot fail', lv, mode, e.message); continue; }
      await b.sleep(500);
      for (let i = 0; i < Number(nArg); i++) {
        await b.ev(`showAnswerMark('${MARK[lv]}', 'correct', 900); true`);
        await b.sleep(850);
      }
      await b.sleep(300);
      console.log(`L${lv} ${mode} ${w}x${h}`, JSON.stringify(await b.ev(`({ n: MG_EGG.n, shown: MG_EGG.shown, on: MG_EGG.on, mats: document.querySelectorAll('#mg-egg-slot .es-m').length })`)));
      await b.shot(`${pre}_L${lv}_${mode}_${w}x${h}`);
    }
  }
  console.log('done, errors=', JSON.stringify(b.errors));
} finally { try { await b.restore(); } finally { await b.close(); } }
