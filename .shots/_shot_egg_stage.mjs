// 结算舞台里「材料飞进萌蛋」+ 失败局蛋晃一晃的取景截图。
// 用法：node .shots/_shot_egg_stage.mjs <前缀> [关卡,..] [win|lose] [WxH]
import { petBrowser } from './pet_browser.mjs';
const [pre = 'egst', lvArg = '1', kind = 'win', sz = '960x576'] = process.argv.slice(2);
const b = await petBrowser();
const seed = `(() => {
  const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return MG_PET.dayKey(x); };
  const p = { version: 2, adopted: true, exp: 0, stage: 0, adoptedDay: d(-22), lastDay: d(0), xp: 20,
    days: Array.from({ length: 4 }, (_, i) => d(-4 + i)), phase: 0, daily: { date: d(0), correct: 0, rounds: [] }, gifts: [], decor: 'leaf', decors: ['leaf'],
    name: '数宝', hatchDay: '', birthSeen: false, affection: 0, stories: { seen: [], pending: [] } };
  ['mathgamePet', 'mathgameStars', 'mathgameCoins'].forEach(k => localStorage.removeItem(k));
  try { _mgPendingSnap = null; } catch (e) {}
  localStorage.setItem('mathgamePet', JSON.stringify(p));
  return true; })()`;
try {
  await b.nav(b.menu); await b.preserve();
  const [w, h] = sz.split('x').map(Number);
  await b.viewport(w, h);
  for (const lv of lvArg.split(',').map(Number)) {
    await b.ev(seed);
    try { await b.boot(lv, 'visual'); } catch (e) { console.log('boot fail', lv, e.message); continue; }
    await b.sleep(400);
    if (kind === 'win') await b.ev(`_mgWrong=0;_mgCorrect=10;_mgMaxStreak=10;_mgRoundStart=Date.now()-7000;debugEndGame(true);true`);
    else await b.ev(`_mgWrong=3;_mgCorrect=4;_mgMaxStreak=2;_mgRoundStart=Date.now()-9000;debugEndGame(false);true`);
    await b.poll(`!!document.querySelector('#cs-stage .cs-chest')`, 6000);
    if (kind === 'lose') {
      await b.sleep(1000);
      console.log(`L${lv} lose stage`, JSON.stringify(await b.ev(`({ cls: (document.querySelector('#cs-stage .egg-strip svg.egg')||{getAttribute(){return null}}).getAttribute('class'), sub: document.querySelector('#cs-stage .cs-title small')?.textContent })`)));
      await b.shot(`${pre}_L${lv}_lose_stage_${w}x${h}`);
      await b.ev(`document.querySelector('#cs-stage .cs-chest').click();true`);
      await b.poll(`!!document.querySelector('#cs-stage .cs-go')`, 9000);
      console.log(`L${lv} lose done`, JSON.stringify(await b.ev(`document.querySelector('#cs-stage .cs-title')?.textContent`)));
      await b.ev(`document.querySelector('#cs-stage .cs-go').click();true`);
      await b.sleep(300);
      console.log(`L${lv} lose card`, JSON.stringify(await b.ev(`document.getElementById('overlay-sub').textContent`)));
      await b.shot(`${pre}_L${lv}_lose_card_${w}x${h}`);
    } else {
      await b.ev(`document.querySelector('#cs-stage .cs-chest').click();true`);
      await b.sleep(1020);
      await b.shot(`${pre}_L${lv}_fly_${w}x${h}`);
      await b.sleep(780);
      console.log(`L${lv} react`, JSON.stringify(await b.ev(`({ cls: document.querySelector('#cs-stage .egg-strip svg.egg')?.getAttribute('class'), fly: document.querySelectorAll('.es-fly').length })`)));
      await b.shot(`${pre}_L${lv}_react_${w}x${h}`);
      await b.poll(`!!document.querySelector('#cs-stage .cs-go')`, 9000);
      await b.shot(`${pre}_L${lv}_done_${w}x${h}`);
    }
  }
  console.log('done, errors=', JSON.stringify(b.errors));
} finally { try { await b.restore(); } finally { await b.close(); } }
