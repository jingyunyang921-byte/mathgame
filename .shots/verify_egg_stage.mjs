// 萌蛋同行（方案B）结算舞台闸门：6 关材料飞进萌蛋 + 本关性格反应；失败局晃一晃与文案；减少动态。关内蛋位见 verify_egg_companion.mjs。
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
const seed = (adopted = true) => `(() => {
  const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return MG_PET.dayKey(x); };
  ['mathgamePet', 'mathgameStars', 'mathgameCoins'].forEach(k => localStorage.removeItem(k));
  try { _mgPendingSnap = null; } catch (e) {}
  if (${adopted}) localStorage.setItem('mathgamePet', JSON.stringify({ version: 2, adopted: true, exp: 0, stage: 0, adoptedDay: d(-22), lastDay: d(0), xp: 20,
    days: Array.from({ length: 4 }, (_, i) => d(-4 + i)), phase: 0, daily: { date: d(0), correct: 0, rounds: [] }, gifts: [], decor: 'leaf', decors: ['leaf'],
    name: '数宝', hatchDay: '', birthSeen: false, affection: 0, stories: { seen: [], pending: [] } }));
  return true; })()`;
const MAT = { 1: '暖草', 2: '松果', 3: '小音符', 4: '落叶', 5: '小贝壳', 6: '萤火' };
const KIND = { 1: 'fx-warm', 2: 'fx-hop', 3: 'fx-sway', 4: 'fx-roll', 5: 'fx-warm', 6: 'fx-warm' };
const stageProbe = `(() => { const s = document.getElementById('cs-stage'), e = s && s.querySelector('.egg-strip svg.egg');
  return { eggCls: e ? e.getAttribute('class') : null, title: s && s.querySelector('.cs-title') ? s.querySelector('.cs-title').textContent : '', mat: !!(s && s.querySelector('.cs-chip.mat')), fly: document.querySelectorAll('.es-fly').length, sub: document.getElementById('overlay-sub').textContent }; })()`;
const endRound = async (win) => {
  await b.ev(win ? `_mgWrong=0;_mgCorrect=10;_mgMaxStreak=10;_mgRoundStart=Date.now()-7000;debugEndGame(true);true` : `_mgWrong=3;_mgCorrect=4;_mgMaxStreak=2;_mgRoundStart=Date.now()-9000;debugEndGame(false);true`);
  await b.poll(`!!document.querySelector('#cs-stage .cs-chest')`, 7000);
};
try {
  await b.nav(b.menu); await b.preserve();
  await b.viewport(960, 576);

  // 1. 结算舞台：6 关材料飞进蛋 + 本关性格反应
  for (const lv of [1, 2, 3, 4, 5, 6]) {
    await b.ev(seed(true)); await b.boot(lv, 'visual'); await b.sleep(300);
    await endRound(true);
    await b.ev(`document.querySelector('#cs-stage .cs-chest').click();true`);
    await b.poll(`!!document.querySelector('#cs-stage .cs-acts')`, 9000);
    const st = await b.ev(stageProbe);
    P(st.mat && st.eggCls && st.eggCls.split(/\s+/).includes(KIND[lv]) && st.fly === 0, `L${lv} 舞台：${MAT[lv]}飞进萌蛋，蛋回应 ${KIND[lv]}，收尾后无残留飞行物`, st);
  }

  // 2. 失败局：萌蛋晃一晃 + 「再来一次，就能带回X」
  for (const lv of [1, 4]) {
    await b.ev(seed(true)); await b.boot(lv, 'visual'); await b.sleep(300);
    await endRound(false);
    await b.sleep(1000);
    const st = await b.ev(stageProbe);
    P(st.eggCls && /fx-aww/.test(st.eggCls) && !st.mat, `L${lv} 失败局：舞台上萌蛋晃一晃，没有材料牌（不给也不拿）`, st);
    await b.ev(`document.querySelector('#cs-stage .cs-chest').click();true`);
    await b.poll(`!!document.querySelector('#cs-stage .cs-acts')`, 9000);
    const dn = await b.ev(stageProbe);
    const LOSE = { 1: '差 10 根，就能攒成一捆暖草', 4: '差 10 片，就能攒成一叠落叶' }[lv];
    P(dn.title.includes(LOSE), `L${lv} 失败局：舞台收尾小字「${LOSE}」（本关一捆 10 份，空蛋位差 10）`, dn.title);
    await b.ev(`mgStageDismiss();true`); await b.sleep(250);
    const cd = await b.ev(stageProbe);
    P(cd.sub === LOSE, `L${lv} 失败局：结算卡小字同一句`, cd.sub);
  }

  // 3. 减少动态：不飞、不晃，但流程照常走完
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await b.ev(seed(true)); await b.boot(1, 'visual'); await b.sleep(300);
  await endRound(true);
  await b.ev(`document.querySelector('#cs-stage .cs-chest').click();true`);
  await b.poll(`!!document.querySelector('#cs-stage .cs-acts')`, 9000);
  const rm = await b.ev(`(() => { const e = document.querySelector('#cs-stage .egg-strip svg.egg'); return { cls: e && e.getAttribute('class'), anim: e ? getComputedStyle(e).animationName : '', fly: document.querySelectorAll('.es-fly').length }; })()`);
  P(rm.anim === 'none' && rm.fly === 0, '减少动态：舞台蛋不播动画、没有飞行物，流程走完', rm);
  await b.send('Emulation.setEmulatedMedia', { features: [] });
  P(b.errors.length === 0, '无脚本异常', b.errors);
} finally {
  try { await b.send('Emulation.setEmulatedMedia', { features: [] }); await b.viewport(1000, 576); await b.restore(); } finally { await b.close(); }
}
finish('EGG STAGE');
