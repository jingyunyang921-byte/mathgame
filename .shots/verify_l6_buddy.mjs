// L6 答题时左下角的数宝小挂件(#mg-pet-buddy)闸门：L6 和一分钟速算一样，答对欢呼/答错摇一摇；L1-L5 仍由蛋位负责，挂件不出现。
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
const MARK = { 1: 'answer-mark', 2: 'answer-mark', 3: 'answer-mark', 4: 'answer-mark', 5: 'space-answer-mark', 6: 'battle-answer-mark', 0: 'battle-answer-mark' };
const mark = (lv, type) => b.ev(`showAnswerMark('${MARK[lv]}', '${type}', 700); true`);
const buddy = `(() => {
  const el = document.getElementById('mg-pet-buddy');
  if (!el) return { exists: false, cls: document.body.className };
  const cs = getComputedStyle(el), u = el.querySelector('use');
  return { exists: true, display: cs.display, show: el.classList.contains('show'), cheer: el.classList.contains('cheer'), aww: el.classList.contains('aww'),
    href: u && u.getAttribute('href'), left: cs.left, bottom: cs.bottom, w: el.offsetWidth, cls: document.body.className,
    egg: { on: MG_EGG.on, n: MG_EGG.n, shown: MG_EGG.shown }, l6cls: document.body.classList.contains('mg-egg-l6'), eggOn: document.body.classList.contains('mg-egg-on') };
})()`;
const visible = s => s.exists && s.display !== 'none';
try {
  await b.nav(b.menu); await b.preserve();

  // 1. L6（已领养，数宝还是蛋）：多个视口
  for (const [w, h] of [[960, 576], [900, 500], [412, 915]]) {
    await b.viewport(w, h);
    await b.ev(seed(true)); await b.boot(6, 'visual'); await b.sleep(700);
    const tag = `${w}×${h} L6`;
    const s0 = await b.ev(buddy);
    P(!s0.exists || !s0.show, `${tag} 还没答题：挂件不显示`, s0);
    await mark(6, 'correct'); await b.sleep(150);
    const s1 = await b.ev(buddy);
    P(visible(s1) && s1.show && s1.cheer && !s1.aww, `${tag} 答对：左下角挂件弹出并欢呼`, s1);
    P(s1.href === '#pet-egg', `${tag} 挂件画的是数宝当前形态（蛋）`, s1.href);
    P(s1.left === '10px' && s1.bottom === '10px' && s1.w === 60, `${tag} 挂件固定在左下角 10px 处、60px 见方`, [s1.left, s1.bottom, s1.w]);
    P(s1.egg.on && s1.eggOn && s1.l6cls && s1.egg.n === 1 && s1.egg.shown === 1, `${tag} 蛋同行的计数/光晕脉冲照旧（n=1,shown=1）`, s1.egg);
    await b.sleep(1500);
    const s2 = await b.ev(buddy);
    P(s2.exists && !s2.show && !s2.cheer, `${tag} 1.3 秒后自动收起`, s2);
    await mark(6, 'wrong'); await b.sleep(150);
    const s3 = await b.ev(buddy);
    P(visible(s3) && s3.show && s3.aww && !s3.cheer, `${tag} 答错：挂件摇一摇安慰`, s3);
    await b.sleep(1500);
  }

  // 2. 其余路径不变
  await b.viewport(960, 576);
  await b.ev(seed(true)); await b.boot(0, 'visual', "sessionStorage.setItem('mgSprint','1')"); await b.sleep(700);
  await mark(0, 'correct'); await b.sleep(150);
  const sp = await b.ev(buddy);
  P(visible(sp) && sp.show && sp.cheer && !sp.l6cls && !sp.eggOn, '一分钟速算：挂件照旧、没有 L6 的蛋标记', sp);
  for (const lv of [1, 2, 3, 4, 5]) {
    await b.ev(seed(true)); await b.boot(lv, 'visual'); await b.sleep(600);
    await mark(lv, 'correct'); await b.sleep(150);
    const s = await b.ev(buddy);
    P((!s.exists || !visible(s)) && !s.l6cls, `L${lv} 已领养：蛋位负责，左下角挂件不出现`, s);
  }
  await b.ev(seed(false)); await b.boot(6, 'visual'); await b.sleep(700);
  await mark(6, 'correct'); await b.sleep(150);
  const un = await b.ev(buddy);
  P(!un.exists, 'L6 未领养：没有挂件', un);

  // 3. 收尾：卸载蛋同行时 L6 标记一并清掉；听算（卡台占底部）仍隐藏挂件
  await b.ev(seed(true)); await b.boot(6, 'visual'); await b.sleep(700);
  const had = await b.ev(`document.body.classList.contains('mg-egg-l6')`);
  await b.ev(`mgEggUnmount(); true`);
  const gone = await b.ev(`!document.body.classList.contains('mg-egg-l6') && !document.body.classList.contains('mg-egg-on')`);
  P(had && gone, 'mgEggUnmount 把 mg-egg-l6/mg-egg-on 一起清掉', { had, gone });
  await b.ev(seed(true)); await b.boot(6, 'audio'); await b.sleep(900);
  await mark(6, 'correct'); await b.sleep(150);
  const au = await b.ev(buddy);
  P(!au.exists || !visible(au), 'L6 听算：语音卡台占着底部，挂件隐藏', au);
  const shotOk = (await b.ev(`document.body.classList.contains('mg-stage')`));
  P(shotOk, 'L6 听算确实挂了 mg-stage（上一条不是假绿）');

  // 4. 取景：L6 视算答对瞬间
  await b.viewport(960, 576);
  await b.ev(seed(true)); await b.boot(6, 'visual'); await b.sleep(700);
  await mark(6, 'correct'); await b.sleep(260);
  await b.shot('l6_buddy_960x576');
  await b.viewport(412, 915);
  await b.ev(seed(true)); await b.boot(6, 'visual'); await b.sleep(700);
  await mark(6, 'correct'); await b.sleep(260);
  await b.shot('l6_buddy_412x915');
  P(b.errors.length === 0, '无 JS 错误', b.errors.slice(0, 3));
} finally {
  try { await b.viewport(1000, 576); await b.restore(); } finally { await b.close(); }
}
finish('verify_l6_buddy');
