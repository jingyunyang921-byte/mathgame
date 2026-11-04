// 萌蛋同行（方案B）闸门：关内蛋位（挂载规则/落材料/封顶/答错/重置/布局不遮挡）。结算舞台、失败局、减少动态见 verify_egg_stage.mjs。
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
const MARK = { 1: 'answer-mark', 2: 'answer-mark', 3: 'answer-mark', 4: 'answer-mark', 5: 'space-answer-mark', 6: 'battle-answer-mark' };
const MAT = { 1: '暖草', 2: '松果', 3: '小音符', 4: '落叶', 5: '小贝壳', 6: '萤火' };
const mark = (lv, type, n) => b.ev(`(async () => { for (let i = 0; i < ${n}; i++) { showAnswerMark('${MARK[lv]}', '${type}', 700); await new Promise(r => setTimeout(r, 120)); } return true; })()`);
const state = `(() => {
  const el = document.getElementById('mg-egg-slot'), r = el && el.getBoundingClientRect(), vis = !!el && el.style.display !== 'none';
  const hit = (sel, tol = 0) => [...document.querySelectorAll(sel)].some(n => { const q = n.getBoundingClientRect(); return vis && q.width > 20 && q.height > 20 && getComputedStyle(n).display !== 'none' && !(r.right <= q.left || r.left >= q.right || r.bottom <= q.top || r.top + tol >= q.bottom); });
  const buddy = document.getElementById('mg-pet-buddy');
  return { on: MG_EGG.on, level: MG_EGG.level, n: MG_EGG.n, shown: MG_EGG.shown, slot: !!el, vis, bodyCls: document.body.classList.contains('mg-egg-on'),
    mats: document.querySelectorAll('#mg-egg-slot .es-m').length, tally: el ? el.querySelector('.es-tally b').textContent : null,
    lit: el ? parseFloat(el.style.getPropertyValue('--lit')) : null, eggCls: el ? el.querySelector('.es-egg').className : '',
    inV: !r || !vis || (r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1),
    over: hit('#question-card') || hit('#canvas-wrapper') || hit('.mg-listen-card') || hit('#float-voice-overlay') || hit('#pk-section .pk-scene, #pk-scene', 10),
    buddyHidden: !buddy || getComputedStyle(buddy).display === 'none', label: (document.getElementById('race-label') || {}).textContent };
})()`;
try {
  await b.nav(b.menu); await b.preserve();
  // 1. 挂载规则
  await b.viewport(960, 576);
  for (const lv of [1, 2, 3, 4, 5, 6]) {
    await b.ev(seed(true)); await b.boot(lv, 'visual'); await b.sleep(300);
    const s = await b.ev(state);
    P(s.on && s.level === lv && s.bodyCls && s.slot === (lv <= 4) && s.buddyHidden, `L${lv} 已领养：蛋位在场（${lv <= 4 ? 'DOM 蛋位' : '画布内绘制'}），数宝小伙伴让位`, s);
    if (lv <= 3) P(s.label === '和' + (await b.ev('mgCompanion().name')) + '一起找' + MAT[lv], `L${lv} 赛道标签=「和X一起找${MAT[lv]}」`, s.label);
  }
  await b.ev(seed(false)); await b.boot(1, 'visual'); await b.sleep(300);
  const un = await b.ev(state);
  P(!un.on && !un.slot && !un.bodyCls && /^跟着.+走$/.test(un.label), '未领养：无蛋位，赛道标签仍是「跟着X走」', un);
  await b.ev(seed(true)); await b.boot(0, 'visual', "sessionStorage.setItem('mgSprint','1')"); await b.sleep(300);
  const sp = await b.ev(state);
  P(!sp.on && !sp.slot, '一分钟速算：不挂蛋位', sp);

  // 2. L1-L4 局内：落材料 / 封顶 / 答错 / 重置 / 不遮挡（多视口）
  for (const [w, h] of [[960, 576], [900, 500], [1280, 800], [412, 915]]) {
    await b.viewport(w, h);
    for (const lv of [1, 2, 3, 4]) {
      const tag = `${w}×${h} L${lv}`;
      await b.ev(seed(true)); await b.boot(lv, 'visual'); await b.sleep(500);
      const s0 = await b.ev(state);
      P(s0.inV && !s0.over, `${tag} 蛋位在屏内且不压题卡/手写卡/赛道（${s0.vis ? '显示' : '空间不够已收起'}）`, s0);
      if (w !== 960) continue;
      await mark(lv, 'correct', 3); await b.sleep(900);
      const s3 = await b.ev(state);
      P(s3.n === 3 && s3.shown === 3 && s3.mats === 3 && s3.tally === '3' && s3.lit > 0.25, `${tag} 答对 3 题：飞进 3 份材料，计数 3，蛋更亮`, s3);
      await mark(lv, 'correct', 4); await b.sleep(900);
      const s7 = await b.ev(state);
      P(s7.n === 7 && s7.mats === 5 && s7.tally === '7', `${tag} 答对 7 题：窝里最多摆 5 份，计数照样记到 7`, s7);
      await mark(lv, 'wrong', 1); await b.sleep(120);
      const sw = await b.ev(state);
      P(/fx-aww/.test(sw.eggCls) && sw.n === 7 && sw.mats === 5, `${tag} 答错：蛋晃一下，什么都不减`, sw);
      await b.ev(`document.getElementById('overlay').classList.add('show');true`); await b.sleep(80);
      await b.ev(`document.getElementById('overlay').classList.remove('show');true`); await b.sleep(150);
      const sr = await b.ev(state);
      P(sr.n === 0 && sr.shown === 0 && sr.mats === 0 && sr.tally === '0', `${tag} 结算卡关掉（再来一局）后蛋位清零`, sr);
    }
  }
  // 3. L5/L6 画布关：计数
  await b.viewport(960, 576);
  for (const lv of [5, 6]) {
    await b.ev(seed(true)); await b.boot(lv, 'visual'); await b.sleep(500);
    await mark(lv, 'correct', 3); await b.sleep(1100);
    const s = await b.ev(state);
    P(s.n === 3 && s.shown === 3, `L${lv} 答对 3 题：画布里的蛋/萤火计到 3`, s);
  }

  P(b.errors.length === 0, '无脚本异常', b.errors);
} finally {
  try { await b.send('Emulation.setEmulatedMedia', { features: [] }); await b.viewport(1000, 576); await b.restore(); } finally { await b.close(); }
}
finish('EGG COMPANION');
