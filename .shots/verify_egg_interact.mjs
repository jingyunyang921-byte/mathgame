// 蛋互动三件套闸门：1 答对加强（每题 + 第 3/6 题里程碑）/ 2a 开场三步图示 / 2b 首题示范小手 / 3a 结算星星飞进蛋 + 没通关标题。
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
const seed = (stars) => `(() => {
  const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return MG_PET.dayKey(x); };
  ['mathgamePet', 'mathgameStars', 'mathgameCoins'].forEach(k => localStorage.removeItem(k));
  try { _mgPendingSnap = null; } catch (e) {}
  localStorage.setItem('mathgamePet', JSON.stringify({ version: 2, adopted: true, exp: 0, stage: 0, adoptedDay: d(-22), lastDay: d(0), xp: 20,
    days: Array.from({ length: 4 }, (_, i) => d(-4 + i)), phase: 0, daily: { date: d(0), correct: 0, rounds: [] }, gifts: [], decor: 'leaf', decors: ['leaf'],
    name: '数宝', hatchDay: '', birthSeen: false, affection: 0, stories: { seen: [], pending: [] } }));
  ${stars ? `localStorage.setItem('mathgameStars', JSON.stringify(${JSON.stringify(stars)}));` : ''}
  return true; })()`;
const MARK = { 1: 'answer-mark', 2: 'answer-mark', 3: 'answer-mark', 4: 'answer-mark' };
try {
  await b.nav(b.menu); await b.preserve();
  await b.viewport(960, 576);

  // ---- 1. 答对加强：每题有光环 / 浮字，第 3、6 题多一只大蛋，L6 不弹大蛋 ----
  for (const lv of [1, 4]) {
    await b.ev(seed()); await b.boot(lv, 'visual'); await b.sleep(500);
    await b.ev(`window.__bigs = 0; window.__plus = 0; new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
      if (n.classList && n.classList.contains('es-big')) window.__bigs++;
      if (n.classList && n.classList.contains('es-plus')) window.__plus++; }))).observe(document.body, { childList: true }); true`);
    const seen = [];
    for (let i = 1; i <= 7; i++) {
      await b.ev(`showAnswerMark('${MARK[lv]}', 'correct', 900); true`);
      await b.sleep(1300);
      seen.push(await b.ev(`({ bigs: window.__bigs, plus: window.__plus })`));
    }
    P(seen[0].plus >= 1, `L${lv} 第1题有「+1 材料」浮字`, seen[0]);
    P(seen[0].bigs === 0 && seen[1].bigs === 0, `L${lv} 第1、2题不弹大蛋`, seen.slice(0, 2));
    P(seen[2].bigs === 1 && seen[5].bigs === 2, `L${lv} 第3、6题各弹一次大蛋`, [seen[2], seen[5]]);
    P(seen[6].bigs === 2, `L${lv} 第7题不再弹`, seen[6]);
  }

  // ---- 2a. 开场三步图示 ----
  const introAt = async (lv, mode) => {
    await b.ev(seed()); await b.boot(lv, mode); await b.sleep(300);
    await b.ev(`window.__introP = runIntroSequence(${lv}, '${mode}', false); true`);
    await b.sleep(900);
    const r = await b.ev(`(() => {
      const box = document.getElementById('intro-box'), row = document.querySelector('#intro-rule .st-row');
      const br = box.getBoundingClientRect(), rr = row ? row.getBoundingClientRect() : null;
      return { steps: row ? row.querySelectorAll('.st').length : 0, arrows: row ? row.querySelectorAll('.st-a').length : 0,
        cls: box.classList.contains('intro-steps'), labels: [...document.querySelectorAll('#intro-rule .st span')].map(n => n.textContent),
        icons: [...document.querySelectorAll('#intro-rule .st-c > svg.ic use')].map(n => n.getAttribute('href')),
        egg: !!document.querySelector('#intro-rule .st-egg svg.st-eg, #intro-rule .st-egg > svg'),
        fits: !rr || (rr.left >= br.left + 4 && rr.right <= br.right - 4), scrollOver: box.scrollHeight - box.clientHeight,
        inView: br.top >= 0 && br.bottom <= innerHeight, prize: document.getElementById('intro-prize').textContent };
    })()`);
    await b.ev(`document.getElementById('intro-overlay').click(); true`);
    return r;
  };
  for (const [lv, mode, l1, l2, total] of [[1, 'visual', '看题', '写答案', 10], [3, 'audio', '听题', '说答案', 10], [5, 'visual', '看题', '选对门', 10], [6, 'visual', '看题', '写答案', 20]]) {
    const r = await introAt(lv, mode);
    P(r.cls && r.steps === 3 && r.arrows === 2, `L${lv} ${mode} 开场卡 = 三步图示`, r);
    P(r.labels[0] === l1 && r.labels[1] === l2 && r.labels[2] === '材料进窝', `L${lv} ${mode} 三步文字`, r.labels);
    P(r.egg && r.fits && r.scrollOver <= 0 && r.inView, `L${lv} ${mode} 图示放得下（不溢出、不滚动）`, r);
    P(r.prize.includes('答对' + total + '题，送') && !/送小/.test(r.prize), `L${lv} 目标句「答对${total}题，送X给蛋」且 X 不带「小」`, r.prize);
  }
  {
    const r = await introAt(1, 'visual');
    P(/^(暖草)$/.test((r.prize.match(/送(.+)给蛋/) || [])[1] || ''), 'L1 目标句材料名 = 暖草', r.prize);
  }
  await b.viewport(412, 800);
  { const r = await introAt(1, 'visual'); P(r.fits && r.inView && r.scrollOver <= 0, '竖屏 412 宽：三步图示放得下', r); }
  await b.viewport(960, 576);
  // ---- 2b. 首题示范小手：没通关过的视算关出现，一碰屏幕就消失；通关过 / 听算 / 速算不出现 ----
  const demo = () => b.ev(`(() => { const n = document.getElementById('mg-demo'); return n ? { hand: !!n.querySelector('.dm-hand, .dm-tap'), tip: (n.querySelector('.dm-tip') || {}).textContent, rips: n.querySelectorAll('.dm-rip').length, ink: !!n.querySelector('.dm-ink') } : null; })()`);
  for (const [lv, tip] of [[1, '跟着小手写'], [4, '跟着小手写'], [5, '点对的门']]) {
    await b.ev(seed()); await b.boot(lv, 'visual'); await b.sleep(400);
    const d = await demo();
    P(d && d.hand && d.tip === tip, `L${lv} 首次进入：出现示范小手「${tip}」`, d);
    if (lv === 5) P(d && d.rips === 2, 'L5 示范：门上两圈波纹', d);
    else P(d && d.ink, `L${lv} 示范：有描红笔迹`, d);
    await b.ev(`document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); true`);
    await b.sleep(150);
    P((await demo()) === null, `L${lv} 孩子一落笔 / 一点屏幕，示范小手消失`, null);
  }
  await b.ev(seed({ 1: 2 })); await b.boot(1, 'visual'); await b.sleep(400);
  P((await demo()) === null, 'L1 已通关过：不再出示范', null);
  await b.ev(seed()); await b.boot(3, 'audio'); await b.sleep(400);
  P((await demo()) === null, 'L3 听算：不出示范', null);
  await b.ev(seed()); await b.boot(1, 'visual'); await b.sleep(400);
  await b.viewport(700, 520); await b.sleep(300);
  P((await demo()) === null, '窗口尺寸一变，示范小手自动撤掉（不留在错位上）', null);
  await b.viewport(960, 576);
  for (const lv of [1, 5]) {
    await b.ev(seed()); await b.boot(lv, 'visual'); await b.sleep(400);
    P((await demo()) !== null, `L${lv} 没碰屏幕：示范小手在场`, null);
    await b.ev(`debugEndGame(true); true`); await b.sleep(700);
    P((await demo()) === null, `L${lv} 没碰屏幕就结算了：示范小手不留在结算卡上`, null);
  }

  // ---- 3a. 结算星星飞进蛋：1/2/3 星各飞对应颗数、落完才出「收下啦」、通关只「咔」一次；没通关飞 1 颗小星 + 中性标题 ----
  const WRONG = { s1: [6, 4], s2: [1, 9], s3: [0, 10], fail: [3, 4] };
  for (const kind of ['s1', 's2', 's3', 'fail']) {
    await b.ev(seed()); await b.boot(1, 'visual'); await b.sleep(400);
    const [w, c] = WRONG[kind], win = kind !== 'fail';
    await b.ev(`_mgWrong=${w};_mgCorrect=${c};_mgMaxStreak=${win ? 5 : 2};_mgRoundStart=Date.now()-8000;debugEndGame(${win});true`);
    await b.poll(`!!document.querySelector('#cs-stage .cs-chest')`, 7000);
    await b.ev(`window.__st = { stars: 0, ka: 0, maxLive: 0, note: 0 }; window.__t0 = performance.now(); new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
      const c = n.classList; if (!c) return;
      if (c.contains('es-star')) { window.__st.stars++; window.__st.maxLive = Math.max(window.__st.maxLive, document.querySelectorAll('.es-star').length); }
      if (c.contains('egg-ka')) window.__st.ka++; if (c.contains('es-note')) window.__st.note++; }))).observe(document.body, { childList: true, subtree: true }); true`);
    await b.ev(`document.querySelector('#cs-stage .cs-chest').click(); true`);
    await b.poll(`!!document.querySelector('#cs-stage .cs-acts')`, 7000);
    const r = await b.ev(`(() => ({ ...window.__st, ms: Math.round(performance.now() - window.__t0), left: document.querySelectorAll('.es-star').length,
      title: (document.querySelector('#cs-stage .cs-title') || {}).textContent || '' }))()`);
    const want = { s1: 1, s2: 2, s3: 3, fail: 1 }[kind];
    P(r.stars === want, `${kind}：飞了 ${want} 颗星`, r);
    P(r.left === 0, `${kind}：结算按钮出现时星星都落完了`, r);
    P(r.ms < 4300, `${kind}：整段结算动画在兜底 4.2 秒内放完`, r.ms);
    if (kind === 'fail') {
      P(r.title.startsWith('宝箱收好啦') && !/通关！/.test(r.title), '没通关：标题不再说「第N关通关！」', r.title);
      P(r.ka === 0 && r.note >= 1, '没通关：蛋不裂缝，只有「抱紧星星」气泡', r);
    } else {
      P(/^第\d关通关！/.test(r.title), `${kind}：通关标题是「第N关通关！」`, r.title);
      P(r.ka === 1, `${kind}：蛋壳只「咔」一次（3 星归星星那一下，1/2 星归材料那一下）`, r);
    }
    await b.ev(`mgStageDismiss();true`);
    await b.sleep(200);
  }

  // ---- 3a'. 减少动态：不飞星星，照样能走到结算按钮 ----
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await b.ev(seed()); await b.boot(1, 'visual'); await b.sleep(400);
  await b.ev(`_mgWrong=0;_mgCorrect=10;_mgMaxStreak=10;_mgRoundStart=Date.now()-7000;debugEndGame(true);true`);
  await b.poll(`!!document.querySelector('#cs-stage .cs-chest')`, 7000);
  await b.ev(`window.__rs = 0; new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.classList && n.classList.contains('es-star')) window.__rs++; }))).observe(document.body, { childList: true }); document.querySelector('#cs-stage .cs-chest').click(); true`);
  await b.poll(`!!document.querySelector('#cs-stage .cs-acts')`, 7000);
  P((await b.ev(`window.__rs`)) === 0, '减少动态：不飞星星，仍能收下', null);
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });

  P(b.errors.length === 0, '全程无页面报错', b.errors.slice(0, 3));
  finish('verify_egg_interact');
} finally { try { await b.restore(); } finally { await b.close(); } }
