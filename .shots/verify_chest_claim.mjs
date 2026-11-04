// 结算开宝箱：点开才入账、能量球飞入萌蛋、不点也会自动补领、幂等、三视口不溢出。
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
const seed = (kind) => `(() => {
  const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return MG_PET.dayKey(x); };
  const mk = (age, days, xp) => ({ version: 2, adopted: true, exp: 0, stage: 0, adoptedDay: d(1 - age), lastDay: d(0), xp,
    days: Array.from({ length: days }, (_, i) => d(-days + i)), phase: 0, daily: { date: d(0), correct: 0, rounds: [] }, gifts: [], decor: 'leaf', decors: ['leaf'],
    name: '数宝', hatchDay: '', birthSeen: false, affection: 0, stories: { seen: [], pending: [] } });
  const K = { open: mk(22, 9), phaseup: mk(22, 4, 70), none: null };
  ['mathgamePet', 'mathgameStars', 'mathgameCoins'].forEach(k => localStorage.removeItem(k));
  try { _mgPendingSnap = null; } catch (e) {}
  if (K['${kind}']) localStorage.setItem('mathgamePet', JSON.stringify(K['${kind}']));
  return true; })()`;
const end = (win, n) => `_mgWrong=${win ? 0 : 4};_mgCorrect=${n};_mgMaxStreak=${n};_mgRoundStart=Date.now()-9000;debugEndGame(${win});true`;
// 舞台在场时萌蛋条 / 奖励牌都在 #cs-stage 里，否则在结算卡的 #overlay-chest 里。
const state = () => b.ev(`(() => { const s = _mgChestSnap, e = document.getElementById('overlay-chest'), st = document.getElementById('cs-stage'), r = st || e, f = r.querySelector('.en-fill');
  return { coins: mgGetCoins(), pet: JSON.parse(localStorage.getItem('mathgamePet') || 'null'), stars: JSON.parse(localStorage.getItem('mathgameStars') || '{}'),
    cls: e.className, stage: st ? st.className : '', strips: document.querySelectorAll('.egg-strip,.egg-line').length, cardText: e.textContent, title: st && st.querySelector('.cs-title') ? st.querySelector('.cs-title').textContent : '',
    claimed: !!(s && s.claimed), snapCoins: s ? s.coins : 0, tap: !!document.querySelector('.chest-tap'), fly: !!document.querySelector('.flyorb'), go: !!document.querySelector('#cs-stage .cs-acts'),
    fill: f ? parseFloat(f.style.width) : null, now: r.querySelector('.en-bar') ? +r.querySelector('.en-bar').getAttribute('aria-valuenow') : null,
    em: r.querySelector('.l1 em') ? +r.querySelector('.l1 em').textContent : null, l2: (r.querySelector('.l2') || {}).textContent || '',
    up: !!r.querySelector('.l2.up'), chips: [...r.querySelectorAll('.chest-reward, .cs-chip')].map(n => n.textContent), egg: (r.querySelector('svg.egg') || {}).outerHTML || '' }; })()`);
// 只等到结算卡出现、舞台计时（约 0.55 秒）还没到：此时卡里没有宝箱，奖励还没入账。
const play = async (kind, win = true, n = 10, wait = 300) => {
  await b.ev(seed(kind)); await b.boot(1);
  await b.ev(end(win, n)); await b.sleep(wait);
  return state();
};
const toStage = async () => { await b.poll(`!!document.querySelector('#cs-stage .chest-tap')`, 4000); return state(); };
const tap = async () => { await b.poll(`!!document.querySelector('#cs-stage .chest-tap')`, 4000); await b.ev(`document.querySelector('#cs-stage .chest-tap').click();true`); };
const stageDone = async () => { await b.poll(`!!document.querySelector('#cs-stage .cs-acts')`, 9000); };
const dismiss = async () => { await stageDone(); await b.ev(`mgStageDismiss();true`); await b.sleep(250); };
const claimedOnce = (s0, s1, why) => P(s1.claimed && s1.coins === s0.coins + s0.snapCoins && s1.pet.days.length === 10 && s1.pet.gifts.includes(1), why, { s0: s0.coins, s1: s1.coins, days: s1.pet.days.length, gifts: s1.pet.gifts });
try {
  await b.nav(b.menu); await b.preserve(); await b.viewport(1000, 576);

  const s0 = await play('open');
  P(!s0.claimed && s0.cls === '' && !s0.tap && s0.strips === 0 && s0.coins === 0 && s0.pet.days.length === 9 && !s0.pet.gifts.includes(1), '结算卡里没有宝箱也没有萌蛋进度：星币、学习日、礼物都还没入账', s0);
  P((s0.stars[1] || 0) >= 1, '星星与最佳成绩不等点箱，结算当下就保存', s0.stars);

  const sg = await toStage();
  P(sg.now === 90 && Math.abs(sg.fill - 10) < 0.1, '开箱前舞台上的能量条停在入账前的 90 点', { now: sg.now, fill: sg.fill });
  P(/closed/.test(sg.stage) && sg.cls === '' && sg.strips === 1 && !sg.claimed && sg.tap && sg.coins === 0, '约 0.55 秒后弹出全屏宝箱舞台：卡里清空、只有一份萌蛋条、仍未入账', sg);

  await tap(); await b.sleep(400);
  const s1 = await state();
  claimedOnce(s0, s1, '点开宝箱后：星币 / 学习日 / 首次礼物一次入账');
  P(/opened/.test(s1.stage) && s1.strips === 1 && s1.chips.some(t => t.includes('星币')) && s1.chips.some(t => t.includes('+7 成长能量')) && s1.chips.some(t => t.includes('认识了小兔')), '开箱后舞台出现星币牌、新伙伴牌和 +7 成长能量牌', s1.chips);
  await b.poll(`!!document.querySelector('.flyorb')`, 3000).catch(() => {});
  const mid = await state();
  P(mid.fly && mid.fill < 10.1, '能量球飞行时条还没涨（球落进蛋后才涨）', { fly: mid.fly, fill: mid.fill });
  await stageDone();
  const s2 = await state();
  P(!s2.fly && s2.now === 97 && s2.em === 97 && Math.abs(s2.fill - 97 / 9) < 0.1 && /done/.test(s2.stage), '球落进萌蛋后：条涨到 97 点、数字同步、飞球清掉、舞台摆出结算按钮', { fly: s2.fly, now: s2.now, em: s2.em, fill: s2.fill, stage: s2.stage });
  P(s2.l2.includes('再 128 点 → 闪亮的新花纹') && s2.l2.includes('今天已吃 7 / 10 点'), '蛋下一行给出今天进度与下一站还差几点', s2.l2);
  await dismiss();
  const s3 = await state();
  P(s3.stage === '' && s3.cls === 'show open' && s3.strips === 0 && !s3.tap && s3.chips.length === 0 && !s3.cardText.includes('萌蛋') && s3.cardText.includes('柔软窝垫'), '收下后舞台收起，结算卡里只剩礼物故事预告（没有宝箱、没有重复奖励牌、没有萌蛋进度行）', s3);

  const raw0 = await b.ev(`localStorage.getItem('mathgamePet')+'|'+mgGetCoins()`);
  await b.ev(`mgOpenChest();mgClaimRound(_mgChestSnap);mgClaimPending();true`);
  P(raw0 === await b.ev(`localStorage.getItem('mathgamePet')+'|'+mgGetCoins()`), '重复点开 / 重复补领不二次入账（幂等）');

  const paths = {
    '点「再来一局」': `document.getElementById('retry-btn').click();true`,
    '切到后台': `Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;true`,
    '关页（pagehide）': `window.dispatchEvent(new Event('pagehide'));true`,
    '下一局结算开始': `_mgWrong=0;_mgCorrect=10;_mgMaxStreak=10;_mgRoundStart=Date.now()-9000;window._currentGame._mgRoundSnap=null;mgFinishRound(1,true,10,window._currentGame);true`
  };
  for (const [name, js] of Object.entries(paths)) {
    const a0 = await play('open');
    await b.ev(js); await b.sleep(250);
    const a1 = name === '下一局结算开始' ? { ...(await state()), claimed: true } : await state();
    const first = name === '下一局结算开始' ? await b.ev(`({coins: mgGetCoins(), days: JSON.parse(localStorage.getItem('mathgamePet')).days.length, gift: JSON.parse(localStorage.getItem('mathgamePet')).gifts.includes(1)})`) : null;
    if (first) P(!a0.claimed && first.coins >= a0.snapCoins && first.days === 10 && first.gift, `不点宝箱、${name}：上一局奖励自动补领`, first);
    else claimedOnce(a0, a1, `不点宝箱、${name}：奖励自动补领不丢`);
  }
  // 舞台已经弹出、还合着时离开：补领 + 舞台一起收起，不留遮罩
  const t0 = await play('open', true, 10, 1300);
  P(/closed/.test(t0.stage) && !t0.claimed, '（前置）舞台已弹出且合着', t0);
  await b.ev(`document.getElementById('retry-btn').click();true`); await b.sleep(250);
  const t1 = await state();
  claimedOnce(t0, t1, '舞台合着时点「再来一局」：奖励补领不丢');
  P(t1.stage === '' && await b.ev(`!document.getElementById('cs-stage')`), '舞台合着时离开：舞台随补领一起收起', t1.stage);
  const src = await b.ev(`_mgSafeLeave.toString()`);
  P(/mgClaimPending\(\)/.test(src), '左上角返回走的 _mgSafeLeave 开头先补领');
  // 升阶：蛋换成新阶段的样子，并出现「萌蛋长大啦」
  await play('phaseup');
  const u0 = await toStage();
  await tap(); await stageDone();
  const u1 = await state();
  P(u1.up && u1.l2.includes('萌蛋长大啦') && u1.title.includes('萌蛋长大啦') && u1.egg && u1.egg !== u0.egg && u1.now === 77, '跨阶段：换成新阶段的蛋，提示「萌蛋长大啦」', { l2: u1.l2, title: u1.title, now: u1.now, same: u1.egg === u0.egg });

  // 八种蛋外观互不相同
  const eggs = await b.ev(`Array.from({length: 8}, (_, i) => MG_PET_STORY.egg(i))`);
  P(new Set(eggs).size === 8, '八个阶段的蛋外观各不相同', new Set(eggs).size);

  // 没东西可开的局：不摆宝箱，直接入账
  await b.ev(seed('none')); await b.boot(1);
  await b.ev(`window.__oldCoins = mgCoinsForRound; window.mgCoinsForRound = () => 0; true`);
  await b.ev(end(false, 0)); await b.sleep(1300);
  const z = await state();
  await b.ev(`window.mgCoinsForRound = window.__oldCoins; true`);
  P(z.claimed && z.cls === '' && z.stage === '', '未领养且没有星币的局：不摆空宝箱也不弹舞台，当场结清', z);

  // 减少动态效果：仍要点一下才入账，但不放飞球，条照样涨
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await play('open');
  const r0 = await toStage();
  P(!r0.claimed && r0.tap, '减少动态效果：舞台上的宝箱仍等孩子点一下', r0);
  await tap(); await stageDone();
  const r1 = await state();
  P(r1.claimed && !r1.fly && r1.now === 97 && /done/.test(r1.stage), '减少动态效果：无飞球，条直接涨到新点数，舞台照样摆出结算按钮', r1);
  await b.send('Emulation.setEmulatedMedia', { features: [] });

  P(b.errors.length === 0, '开箱全流程无脚本异常', b.errors);
} finally {
  try { await b.send('Emulation.setEmulatedMedia', { features: [] }); await b.restore(); } finally { await b.close(); }
}
finish('CHEST CLAIM');
