// 材料背包与礼物成长：数据层（当场用上 / 收进背包 / 吃饱 / 上限 / 升档）+ 结算舞台（材料牌与说明）+ 菜单小窝（今天想要 / 背包 / 用上 / 礼物成长）。
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
// 种一只养了 22 天的萌蛋：o.xp 能量 / o.got 今天已吃 / o.uses 今天已用材料 / o.bag、o.used 各关份数 / o.gifts 已有礼物 / o.stage 是否已孵化
const seed = (o = {}) => `(() => {
  const o = ${JSON.stringify(o)}, d = n => { const x = new Date(); x.setDate(x.getDate() + n); return MG_PET.dayKey(x); };
  const cnt = v => { const r = {}; for (let i = 1; i <= 6; i++) r[i] = (v && v[i]) || 0; return r; };
  ['mathgamePet', 'mathgameStars', 'mathgameCoins', 'mathgameBadges', 'mathgameWrongLog'].forEach(k => localStorage.removeItem(k));
  try { _mgPendingSnap = null; } catch (e) {}
  const gifts = o.gifts || [], stars = {}; gifts.forEach(g => { stars[g] = 3; });
  localStorage.setItem('mathgameStars', JSON.stringify(stars));
  localStorage.setItem('mathgamePet', JSON.stringify({ version: 2, adopted: true, exp: 0, stage: o.stage || 0, adoptedDay: d(-22), lastDay: d(0), xp: o.xp == null ? 20 : o.xp,
    days: Array.from({ length: 4 }, (_, i) => d(-4 + i)), phase: 0, daily: { date: d(0), correct: 0, rounds: [] }, gifts, decor: 'leaf', decors: ['leaf'],
    name: '数宝', hatchDay: o.stage ? d(-1) : '', birthSeen: !!o.stage, affection: 0, stories: { seen: [], pending: [] },
    xpDay: { date: d(0), got: o.got || 0, checkin: false, clears: 0, uses: o.uses || 0 }, bag: cnt(o.bag), used: cnt(o.used) }));
  return true; })()`;
const run = async (o, code) => { await b.ev(seed(o)); return b.ev(`(() => { ${code} })()`); };
try {
  await b.nav(b.menu); await b.preserve(); await b.viewport(960, 576);

  // 1. 数据层
  const s1 = await run({}, `const r = [1, 2, 3, 4].map(i => MG_PET.recordRound(0, 'a' + i, undefined, true, 1)), p = MG_PET.get();
    return { r: r.map(x => ({ mu: x.matUsed, bk: x.banked, clear: x.clear, bag: x.bagCount, used: x.usedCount })), xp: p.xp, uses: p.xpDay.uses, bag: p.bag[1], usedN: p.used[1] };`);
  P(s1.r.slice(0, 3).every(x => x.mu && !x.bk && x.clear === 3) && !s1.r[3].mu && s1.r[3].bk && s1.r[3].bag === 1, '每天最多当场用 3 份：前 3 局用上各 +3，第 4 局收进背包', s1);
  P(s1.xp === 29 && s1.uses === 3 && s1.bag === 1 && s1.usedN === 3, '入账：能量 +9、已用 3 份、背包 1 份', s1);

  const s2 = await run({ bag: { 1: 9 }, uses: 3 }, `const r = MG_PET.recordRound(0, 'f1', undefined, true, 1), p = MG_PET.get(); return { bagFull: r.bagFull, banked: r.banked, bag: p.bag[1] };`);
  P(s2.bagFull && !s2.banked && s2.bag === 9, '背包每种最多 9 份，满了不再多收', s2);

  const s3 = await run({ got: 10 }, `const r = MG_PET.recordRound(0, 'g1', undefined, true, 2), p = MG_PET.get(); return { mu: r.matUsed, bk: r.banked, bag: p.bag[2], used: p.used[2], xp: p.xp };`);
  P(!s3.mu && s3.bk && s3.bag === 1 && s3.used === 0 && s3.xp === 20, '今天吃饱了：材料不浪费，收进背包，能量与已用份数都不动', s3);

  const s4 = await run({ used: { 1: 9 }, gifts: [1] }, `const r = MG_PET.recordRound(0, 'h1', undefined, true, 1), p = MG_PET.get(); return { tierUp: r.tierUp, tier: r.tier, nextAt: r.nextAt, pending: p.stories.pending, t: MG_PET.tier(1), name: MG_PET.giftName(1, 1) };`);
  P(s4.tierUp && s4.tier === 1 && s4.nextAt === 30 && s4.t === 1 && s4.pending.includes('grow-1-1'), '用到第 10 份：礼物升到第 1 档，下一档 30，新故事进待看', s4);
  const s4b = await run({ used: { 1: 59 }, gifts: [1], bag: { 1: 1 } }, `const r = MG_PET.useMaterial(1), p = MG_PET.get(); return { ok: r.ok, tier: r.tier, tierUp: r.tierUp, nextAt: r.nextAt, pending: p.stories.pending };`);
  P(s4b.ok && s4b.tier === 3 && s4b.tierUp && s4b.nextAt === 0 && s4b.pending.includes('grow-1-3'), '第 60 份：升到最高档，不再有下一档', s4b);

  const s5 = await run({ bag: { 2: 2 } }, `const a = MG_PET.useMaterial(2), p = MG_PET.get(); return { a, xp: p.xp, bag: p.bag[2], empty: MG_PET.useMaterial(3).reason, lv: MG_PET.useMaterial(9).reason };`);
  P(s5.a.ok && s5.a.gain === 3 && s5.a.left === 1 && s5.xp === 23 && s5.bag === 1 && s5.empty === 'empty' && s5.lv === 'level', '背包里用上一份：+3 点，剩 1 份；没有的材料 / 非法关卡给出原因', s5);
  const s5b = await run({ bag: { 2: 1 }, uses: 3 }, `return MG_PET.useMaterial(2).reason;`);
  const s5c = await run({ bag: { 2: 1 }, got: 10 }, `const r = MG_PET.useMaterial(2); return { reason: r.reason, bag: MG_PET.get().bag[2] };`);
  P(s5b === 'full' && s5c.reason === 'fed' && s5c.bag === 1, '今天已用满 3 份 → full；今天吃饱 → fed 且背包不扣', { s5b, s5c });

  const s6 = await run({ stage: 1, bag: { 1: 1 }, used: { 1: 9 }, gifts: [1], xp: 900 }, `const r = MG_PET.useMaterial(1), p = MG_PET.get(); return { ok: r.ok, gain: r.gain, tierUp: r.tierUp, xp: p.xp };`);
  P(s6.ok && s6.gain === 0 && s6.tierUp && s6.xp === 900, '孵化后用材料：不再加能量，礼物照样升级', s6);

  const s7 = await run({}, `const r = MG_PET.recordRound(0, 'x1', undefined, true), p = MG_PET.get(); return { clear: r.clear, material: r.material, bag: p.bag[1] + p.bag[2] };`);
  P(s7.clear === 3 && s7.material === 0 && s7.bag === 0, '速算等不带关卡号的通关：直接 +3，不产生材料', s7);

  const s8 = await run({ bag: { 3: 4 }, used: { 3: 12 }, gifts: [3] }, `const t = MG_PET.backup(); localStorage.removeItem('mathgamePet'); MG_PET.restore(JSON.parse(t)); const p = MG_PET.get(); return { bag: p.bag[3], used: p.used[3] };`);
  P(s8.bag === 4 && s8.used === 12, '备份再恢复：背包与已用份数不丢', s8);

  // 2. 结算舞台：材料牌 + 说明两行（用上 / 收进背包 / 升级 / 背包满），各视口不溢出
  const probe = String.raw`(() => {
    const s = document.getElementById('cs-stage'), why = s && s.querySelector('.cs-why'), acts = s ? [...s.querySelectorAll('.cs-act')] : [], mat = s && s.querySelector('.cs-chip.mat');
    const inV = el => { if (!el) return false; const a = el.getBoundingClientRect(); return a.top >= 0 && a.bottom <= innerHeight + 1 && a.left >= 0 && a.right <= innerWidth + 1; };
    const hit = acts.length > 0 && acts.every(go => { const a = go.getBoundingClientRect(), e = document.elementFromPoint(a.x + a.width / 2, a.y + a.height / 2); return e === go || go.contains(e); });
    return { title: s && s.querySelector('.cs-title') ? s.querySelector('.cs-title').textContent : '', chips: [...(s ? s.querySelectorAll('.cs-chip') : [])].map(n => n.textContent),
      whyText: why ? why.textContent : '', whyUp: !!(why && why.querySelector('p.up')), whyIn: inV(why), goHit: !!hit && acts.every(inV), matSvg: !!(mat && mat.querySelector('svg')),
      xScroll: document.documentElement.scrollWidth <= innerWidth + 1, dangling: [...document.querySelectorAll('use')].map(u => u.getAttribute('href')).filter(h => h && !document.querySelector(h)),
      grow: (() => { const n = s && s.querySelector('.g-new'), o = s && s.querySelector('.g-old'); if (!n || !o) return null;
        const cs = getComputedStyle(n), art = n.querySelector('.g-art svg'), ring = n.querySelector('.g-ring'), sp = n.querySelector('.cs-spark');
        return { oldSvg: !!o.querySelector('svg'), artW: art ? Math.round(art.getBoundingClientRect().width) : 0, stars: n.querySelectorAll('.tier-stars path').length, ring: !!ring, sparks: n.querySelectorAll('.cs-spark').length,
          anim: cs.animationName, opacity: cs.opacity, settled: cs.transform === 'none' || cs.transform === 'matrix(1, 0, 0, 1, 0, 0)', ringShown: ring ? getComputedStyle(ring).display !== 'none' : false,
          sparkShown: sp ? getComputedStyle(sp).display !== 'none' : false, inV: inV(n) && inV(o), txt: n.textContent }; })(),
      pet: JSON.parse(localStorage.getItem('mathgamePet') || 'null') };
  })()`;
  const play = async (o, lv = 1, dismiss = true, shot = '', wait = 0) => {
    await b.ev(seed(o)); await b.boot(lv);
    await b.ev(`_mgWrong=0;_mgCorrect=10;_mgMaxStreak=10;_mgRoundStart=Date.now()-7000;debugEndGame(true);true`);
    await b.poll(`!!document.querySelector('#cs-stage .cs-chest')`, 6000);
    await b.ev(`document.querySelector('#cs-stage .cs-chest').click();true`);
    await b.poll(`!!document.querySelector('#cs-stage .cs-acts')`, 9000);
    if (wait) await b.sleep(wait);
    const r = await b.ev(probe);
    if (shot) await b.shot(shot);
    if (dismiss) { await b.ev(`mgStageDismiss();true`); await b.sleep(250); r.card = await b.ev(`(document.getElementById('overlay-chest') || {}).textContent || ''`); }
    return r;
  };
  for (const [w, h] of (b.device ? [[960, 576]] : [[960, 576], [900, 500], [412, 915]])) {
    await b.viewport(w, h);
    const g1 = await play({}, 1, true, h === 576 && w === 960 ? 'materials_stage_960x576' : '');
    P(g1.chips.some(t => t.includes('暖草 ×1')) && g1.matSvg && g1.chips.some(t => t.includes('+7 成长能量')) && g1.dangling.length === 0, `${w}×${h} 当场用上：舞台有「暖草 ×1」牌（带图）和 +7 成长能量，SVG 可解析`, g1);
    P(g1.whyText.includes('小兔送来的「暖草」已铺进窝垫') && g1.whyText.includes('萌蛋吃到 3 点能量') && g1.whyText.includes('再用 9 份'), `${w}×${h} 说明两行：材料是什么、拿它做了什么、还差几份升级`, g1.whyText);
    P(g1.whyIn && g1.goHit && g1.xScroll, `${w}×${h} 说明两行在屏内，结算按钮可点不被遮挡`, g1);
    P(g1.pet.used[1] === 1 && g1.pet.xpDay.uses === 1 && g1.pet.bag[1] === 0 && g1.pet.xp === 27, `${w}×${h} 入账：已用 1 份、能量 +7`, g1.pet);

    const g3 = await play({ used: { 1: 9 }, gifts: [1] }, 1, true, h === 576 && w === 960 ? 'materials_tierup_960x576' : '', 900);
    const gname = await b.ev('MG_PET.giftName(1, 1)'), gold = await b.ev('MG_PET.giftName(1, 0)');
    P(g3.title.includes('礼物升级啦') && g3.title.includes(gname) && g3.whyUp && g3.whyText.includes('升级成「' + gname + '」'), `${w}×${h} 升级：标题“礼物升级啦”，说明点名新礼物`, { title: g3.title, why: g3.whyText });
    P(g3.whyText.includes('「' + gold + '」升级成「' + gname + '」啦！'), `${w}×${h} 升级行文字顺序：「旧」升级成「新」啦！`, g3.whyText);
    P(g1.grow === null, `${w}×${h} 没升级的局：不出现升档动画`, g1.grow);
    P(g3.grow && g3.grow.oldSvg && g3.grow.artW >= 28 && g3.grow.stars === 1 && g3.grow.ring && g3.grow.sparks === 8 && g3.grow.anim === 'cs-grow-pop', `${w}×${h} 升档动画：旧礼物图 + 新礼物大图 + 1 颗金星 + 金环 + 8 颗星火`, g3.grow);
    P(g3.grow && g3.grow.settled && g3.grow.opacity === '1' && g3.grow.inV && g3.grow.txt.includes(gname), `${w}×${h} 动画落定后：新礼物完整在屏内、不透明、没留缩放`, g3.grow);
    P(g3.whyIn && g3.goHit && g3.xScroll && g3.pet.stories.pending.includes('grow-1-1'), `${w}×${h} 升级态布局完整，新故事进了待看`, g3);
    const growSay = await b.ev(`(() => { const s = MG_PET.story('grow-1-1'); return s ? MG_PET_STORY.sayFor(s).replace(/！$/, '') : ''; })()`);
    P(growSay && g3.card.includes(growSay) && g3.card.includes('看看'), `${w}×${h} 收下后结算卡里有升级预告（一句话 + “看看”）`, { card: g3.card, growSay });
  }
  await b.viewport(960, 576);

  // 升档动画：最高档 3 颗星 / 孵化后照样庆祝 / 减少动态效果时无动画但内容完整 / 抓一张弹出瞬间的截图
  const g3t = await play({ used: { 1: 59 }, gifts: [1] }, 1, true, '', 900);
  P(g3t.grow && g3t.grow.stars === 3 && g3t.grow.inV && g3t.goHit, '第 60 份升到最高档：金星 3 颗，布局完整', g3t.grow);
  const g3h = await play({ stage: 1, used: { 1: 9 }, gifts: [1], xp: 900 }, 1, true, '', 900);
  P(g3h.grow && g3h.grow.inV && g3h.goHit && g3h.title.includes('礼物升级啦'), '孵化后升档：升档动画照样出现，结算按钮可点', g3h);
  const g3m = await (async () => {
    await b.ev(seed({ used: { 1: 9 }, gifts: [1] })); await b.boot(1);
    await b.ev(`_mgWrong=0;_mgCorrect=10;_mgMaxStreak=10;_mgRoundStart=Date.now()-7000;debugEndGame(true);true`);
    await b.poll(`!!document.querySelector('#cs-stage .cs-chest')`, 6000);
    await b.ev(`document.querySelector('#cs-stage .cs-chest').click();true`);
    await b.sleep(1450);
    await b.shot('materials_grow_mid_960x576');
    return b.ev(`(() => { const n = document.querySelector('#cs-stage .g-new'), r = document.querySelector('#cs-stage .g-ring'); return { op: n ? getComputedStyle(n).opacity : null, ring: r ? getComputedStyle(r).opacity : null, conf: document.querySelectorAll('#mg-confetti-layer i').length }; })()`);
  })();
  P(g3m.op !== null && Number(g3m.op) > 0 && g3m.conf > 0, '弹出瞬间：新礼物已显形、彩带在飘', g3m);
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  const g3r = await play({ used: { 1: 9 }, gifts: [1] }, 1, true, '', 200);
  await b.send('Emulation.setEmulatedMedia', { features: [] });
  P(g3r.grow && g3r.grow.anim === 'none' && g3r.grow.opacity === '1' && !g3r.grow.ringShown && !g3r.grow.sparkShown && g3r.grow.inV && g3r.goHit, '减少动态效果：升档行直接完整显示，金环 / 星火不出现', g3r.grow);

  const g2 = await play({ uses: 3 });
  P(g2.title.includes('通关！') && g2.whyText.includes('先收进背包') && g2.whyText.includes('明天在小窝里用上它') && g2.chips.some(t => t.includes('暖草 ×1')) && g2.pet.bag[1] === 1 && g2.pet.used[1] === 0 && g2.goHit, '今天用满 3 份：舞台说清“先收进背包、明天用”，背包 +1', g2);
  const g4 = await play({ bag: { 1: 9 }, uses: 3 });
  P(g4.whyText.includes('装满 9 份') && g4.pet.bag[1] === 9 && g4.goHit, '背包已满：说明讲清楚，不再多收', g4);
  const g5 = await play({ got: 10 });
  P(g5.title.includes('今天吃饱啦') && g5.whyText.includes('先收进背包') && g5.pet.xp === 20 && g5.pet.bag[1] === 1, '今天吃饱：标题“今天吃饱啦”，材料收进背包，能量不动', g5);

  for (const lv of [2, 3, 4, 5, 6]) {
    const m = await b.ev(`MG_PET.mats[${lv}]`);
    const g = await play({ gifts: [] }, lv);
    P(g.chips.some(t => t.includes(m.name + ' ×1')) && g.whyText.includes(m.friend + '送来的「' + m.name + '」已' + m.use) && g.goHit && g.pet.used[lv] === 1, `第 ${lv} 关：${m.friend}的「${m.name}」，${m.use}`, { chips: g.chips, why: g.whyText });
  }
  // 3. 菜单小窝：喂蛋页背包 / 用上 / 礼物成长
  // 菜单加载后会自动弹打卡 / 升段等弹窗盖在小窝上，先等它们出现再关掉，再打开小窝
  const openPet = async () => { await b.sleep(700); await b.ev(`document.querySelectorAll('.locked-modal.show').forEach(m => { m.classList.remove('show'); m.setAttribute('aria-hidden', 'true'); }); showPet(); true`); };
  await b.nav(b.menu); await b.viewport(960, 576);
  const menuSeed = { gifts: [1, 2], used: { 1: 9, 2: 4 }, bag: { 1: 2, 2: 1 } };
  await b.ev(seed(menuSeed)); await b.nav(b.menu); await openPet();
  const today = () => b.ev(`(() => { const bx = document.getElementById('petBagBox'), bw = document.getElementById('petTodayBowls'), p = MG_PET.get();
    return { boxHidden: bx.hidden, bowlsHidden: bw.hidden, bowls: bw.querySelectorAll('.bw').length, bowlsOn: bw.querySelectorAll('.bw.on').length, bowlsAria: bw.getAttribute('aria-label'),
      tiles: document.querySelectorAll('#petBag > button').length, slots: document.querySelectorAll('#petBag .pet-bag-slot').length, chips: [...document.querySelectorAll('#petBag .pet-bag-chip')].map(n => n.textContent),
      empty: document.querySelectorAll('#petBag.pe .pe-cell').length === 6, go: !!document.querySelector('.pe-go'), pals: document.querySelectorAll('#petBag .pet-bag-chip .pbc-pal use').length,
      note: document.getElementById('petBagNote').textContent, resp: document.getElementById('petResponse').textContent, p }; })()`);
  const t0 = await today();
  P(!t0.boxHidden && !t0.bowlsHidden && t0.tiles === 6 && t0.chips.length === 2 && t0.slots === 4 && t0.chips[0] === '×2' && t0.chips[1] === '×1' && t0.note.includes('今天还能用 3 份'), '背包固定 6 格：有材料的格子显示图与份数，没有的是灰格；说明今天还能用几份', t0);
  P(t0.bowls === 3 && t0.bowlsOn === 0 && t0.bowlsAria === '今天已用上 0 份材料，最多 3 份，点一点听说明', '今天页有 3 只小碗，一份没用时全是空碗', t0);
  const todayOld = await b.ev(`({ want: !!document.getElementById('petWant'), start: !!document.getElementById('petStartBtn'), review: !!document.getElementById('petReviewBtn'), task: !!document.querySelector('.pet-task'), feed: !!document.getElementById('petFeedBtn'), wantFn: typeof petWantLevel, startFn: typeof startPetTask, revFn: typeof startPetReview })`);
  P(!todayOld.want && !todayOld.start && !todayOld.review && !todayOld.task && !todayOld.feed && todayOld.wantFn === 'undefined' && todayOld.startFn === 'undefined' && todayOld.revFn === 'undefined', '今天页不再有“今天想要”、去第 N 关、复习、摸一摸这些钮和函数', todayOld);
  const slotSay = await b.ev(`(() => { const calls = [], orig = window.mgSay; window.mgSay = t => { calls.push(t); }; const slots = [...document.querySelectorAll('#petBag .pet-bag-slot')]; slots.forEach(s => s.click()); window.mgSay = orig;
    return { n: slots.length, calls, uniq: new Set(calls).size, inSet: calls.every(c => Object.values(MG_SAY.bagFriend).includes(c)), ariaSame: slots.every((s, i) => s.getAttribute('aria-label') === calls[i]) }; })()`);
  P(slotSay.n > 0 && slotSay.calls.length === slotSay.n && slotSay.uniq === slotSay.n && slotSay.inSet && slotSay.ariaSame, '点灰格：每个灰格念自己那位朋友的话（各不相同），读屏标签和语音是同一句', slotSay);
  await b.shot('materials_today_960x576');

  P(t0.pals === 2, '有材料的格子左下角各带一个送材料的朋友小头像', t0.pals);
  await b.ev(`window.__says = []; window.__sayOrig = window.mgSay; window.mgSay = t => { window.__says.push(t); }; document.querySelectorAll('#petBag .pet-bag-chip')[1].click();true`);
  const f1 = await b.ev(`({ fly: document.querySelectorAll('.pet-fly').length, says: window.__says.length, gain: document.querySelectorAll('#petNest .pet-gain').length, left: document.querySelectorAll('#petBag .pet-bag-chip').length })`);
  P(f1.fly === 1 && f1.says === 0 && f1.gain === 0 && f1.left === 1, '点材料：存档与背包立刻更新，同时有一个材料图标起飞，落到萌蛋之前不冒「+3」、不念话', f1);
  const t1 = await today();
  P(t1.resp.includes('用上了小松鼠的「松果」') && t1.resp.includes('3 点能量') && t1.chips.length === 1 && t1.p.used[2] === 5 && t1.p.xp === 23 && t1.note.includes('今天还能用 2 份') && t1.bowlsOn === 1, '点背包里的松果：+3 点能量，礼物累计 5 份，背包少 1 份，亮 1 只小碗', t1);
  await b.sleep(1000);
  const f2 = await b.ev(`({ fly: document.querySelectorAll('.pet-fly').length, says: window.__says.slice(), ate: MG_SAY.ate, gain: [...document.querySelectorAll('#petNest .pet-gain')].map(n => n.textContent), hearts: document.querySelectorAll('#petNest .pet-heart').length, cheer: document.getElementById('petArt').classList.contains('cheer') })`);
  P(f2.fly === 0 && f2.says.length === 1 && f2.says[0] === f2.ate && f2.gain.join() === '+3' && f2.hearts >= 3 && f2.cheer, '约 1 秒内飞完：图标已移除；萌蛋欢呼、冒爱心、浮出「+3」，再念「吃到啦」一句', f2);
  await b.ev(`window.mgSay = window.__sayOrig; document.querySelectorAll('#petBag .pet-bag-chip')[0].click();true`);
  const t2a = await b.ev(`({ open: MG_PET_STORY.isOpen(), fly: document.querySelectorAll('.pet-fly').length, resp: document.getElementById('petResponse').textContent, used: MG_PET.get().used[1] })`);
  P(!t2a.open && t2a.fly === 1 && t2a.used === 10 && t2a.resp.includes('长大啦'), '用到第 10 份：存档立刻升档，成长故事等材料飞到萌蛋再弹', t2a);
  await b.sleep(1000);
  const t2 = await b.ev(`({ open: MG_PET_STORY.isOpen(), fly: document.querySelectorAll('.pet-fly').length, resp: document.getElementById('petResponse').textContent, p: MG_PET.get(), g: MG_PET.giftName(1, 1) })`);
  P(t2.open && t2.fly === 0 && t2.p.used[1] === 10 && t2.resp.includes('长大啦') && t2.resp.includes(t2.g), '飞到之后：礼物升级，自动弹出成长故事', t2);
  await b.ev(`MG_PET_STORY.close();true`); await b.sleep(300);
  await b.ev(`document.querySelectorAll('#petBag .pet-bag-chip')[0].click();true`); await b.sleep(1000);
  const t3 = await today();
  P(t3.chips.length === 0 && t3.empty && !t3.go && t3.slots === 0 && t3.tiles === 6 && t3.note.includes('背包空空') && t3.p.xpDay.uses === 3 && t3.p.bag[1] === 0 && t3.bowlsOn === 3 && t3.bowlsAria === '今天已用上 3 份材料，最多 3 份，点一点听说明', '背包用完：6 个灰格换成 6 位朋友的礼物小画廊（礼物气泡 + 朋友），“背包空空的”进读屏，3 只小碗都亮了，今天已用 3 份', t3);
  const emp = await b.ev(`(() => { const cells = [...document.querySelectorAll('#petBag .pe-cell')], rs = cells.map(c => c.getBoundingClientRect()), calls = [], orig = window.mgSay; window.mgSay = t => { calls.push(t); };
    cells.forEach(c => c.click()); window.mgSay = orig; const pal = c => c.querySelector('.pe-pal').getBoundingClientRect(), mr = c => c.querySelector('.pe-mound').getBoundingClientRect();
    const hop = cells.every(c => !!c.querySelector('svg.pe-an.hop')) && cells.every(c => !c.querySelector('.pe-mound.hop'));
    const want = cells.map((c, i) => MG_SAY.bagFriend[i + 1]);
    return { n: cells.length, gifts: cells.filter(c => c.querySelector('.pe-gift .mat-art')).length, pals: cells.filter(c => c.querySelector('.pe-pal svg.pe-an use')).length, mounds: cells.filter(c => c.querySelectorAll('.pe-pal .pe-mound').length === 1 && !c.querySelector('.pe-mound use')).length,
      moundArt: new Set(cells.map(c => c.querySelector('.pe-mound').innerHTML)).size, moundFit: cells.every(c => { const a = pal(c), m = mr(c); return m.width >= 40 && m.height >= 14 && Math.abs(m.bottom - a.bottom) <= 1 && m.left >= a.left - 1 && m.right <= a.right + 1; }),
      minW: Math.round(Math.min(...rs.map(r => r.width))), minH: Math.round(Math.min(...rs.map(r => r.height))), old: document.querySelectorAll('#petBag .pe-empty, #petBag .pe-bubble, #petBag .pe-sail, #petBag .pe-mats').length,
      calls, want, uniq: new Set(calls).size, hop, mats: cells.every((c, i) => want[i].includes(MG_PET.mats[i + 1].name) && want[i].includes('过第')), aria: cells.map(c => c.getAttribute('aria-label')) }; })()`);
  P(emp.n === 6 && emp.gifts === 6 && emp.pals === 6 && emp.minW > 80 && emp.minH >= 80 && emp.old === 0, '空包小画廊：6 位朋友各带一份礼物气泡，旧的帆船→材料卡已删', emp);
  P(emp.calls.length === 6 && JSON.stringify(emp.calls) === JSON.stringify(emp.want) && emp.uniq === 6 && emp.mats && emp.hop && emp.aria.every((a, i) => a === emp.want[i] && !a.includes('闯关')), '点每位朋友念各自的话（6 句互不相同，带材料名和“过第N关”），只有朋友蹦一下、脚下的地面不动，读屏标签就是这句', { calls: emp.calls, aria: emp.aria, hop: emp.hop });
  P(emp.mounds === 6 && emp.moundArt === 6 && emp.moundFit, '每位朋友脚下一块不同的小地面（6 张图互不相同、不含 use 引用、贴着朋友底边、不超出）', { mounds: emp.mounds, moundArt: emp.moundArt, moundFit: emp.moundFit });
  await b.shot('materials_empty_960x576');
  // 喂蛋页底部：箱子一直铺到面板底，不留空白，也不用滚动
  const fill = await b.ev(`(() => { const pn = document.getElementById('petPanelToday'), bx = document.getElementById('petBagBox').getBoundingClientRect(), p = pn.getBoundingClientRect(), bag = document.getElementById('petBag').getBoundingClientRect();
    return { gap: Math.round(p.bottom - bx.bottom), bagGap: Math.round(p.bottom - bag.bottom), scroll: pn.scrollHeight - pn.clientHeight }; })()`);
  P(fill.gap >= 0 && fill.gap <= 10 && fill.bagGap <= 12 && fill.scroll <= 1, '喂蛋页空包：箱子底边离面板底边不超过 10px（原来空出约 90px），面板不用滚动', fill);
  // 5 个圆点 / 3 只小碗：真点击出提示（语音一句、弹一下、顶部木条下贴一行字）
  const rect = sel => b.ev(`(() => { const r = document.querySelector('${sel}').getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) }; })()`);
  const click = async pt => { await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pt.x, y: pt.y, button: 'left', clickCount: 1 }); await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x, y: pt.y, button: 'left', clickCount: 1 }); await b.sleep(120); };
  const hint = async sel => {
    await b.ev(`window.__says = []; window.__sayOrig = window.mgSay; window.mgSay = t => { window.__says.push(t); }; true`);
    const pt = await rect(sel); await click(pt);
    const r = await b.ev(`(() => { const e = document.querySelector('${sel}'), t = document.querySelector('#petPanelToday .pet-head-tip'), h = document.querySelector('#petPanelToday .today-head').getBoundingClientRect(), q = t && t.getBoundingClientRect();
      const out = { says: window.__says.slice(), tap: e.classList.contains('tap'), tips: [...document.querySelectorAll('#petPanelToday .pet-head-tip')].map(n => n.textContent), below: !!q && q.top >= h.bottom - 1, tag: e.tagName };
      window.mgSay = window.__sayOrig; return out; })()`);
    return { ...r, pt };
  };
  const say = await b.ev(`({ dots: MG_SAY.dots, bowls: MG_SAY.bowls, friend: Object.values(MG_SAY.bagFriend), old: MG_SAY.bagEmpty, full: MG_SAY.full })`);
  {
    const seen = [];
    for (const n of [1, 4, 6]) {
      await b.ev(`window.__says = []; window.__sayOrig = window.mgSay; window.mgSay = t => { window.__says.push(t); }; true`);
      await click(await rect(`#petBag .pe-cell:nth-child(${n})`));
      seen.push(await b.ev(`(() => { const o = { says: window.__says.slice(), hop: !!document.querySelector('#petBag .pe-cell:nth-child(${n}) svg.pe-an.hop') }; window.mgSay = window.__sayOrig; return o; })()`));
    }
    P(seen.every((s, i) => s.says.length === 1 && s.hop && s.says[0] === say.friend[[0, 3, 5][i]]) && new Set(seen.map(s => s.says[0])).size === 3, '真点击三位朋友（兔、鹿、刺猬）：各念自己的一句，各自蹦一下', seen);
  }
  const dh = await hint('#petTodayDots');
  P(dh.pt.h >= 44 && dh.tag === 'BUTTON' && dh.says.length === 1 && dh.says[0] === say.dots && dh.tap && dh.tips.length === 1 && /答对 \d \/ 5 题|5 题都答对/.test(dh.tips[0]) && dh.below, '点 5 个小太阳：按钮≥44px，真点击念“答对五题，给萌蛋暖一暖！”、太阳弹一下、木条下贴一行说明', dh);
  P(say.dots === '答对五题，给萌蛋暖一暖！' && !/吃|喂/.test(say.dots), '圆点的话讲“暖一暖”（孵蛋），不再提“长大”，更不提吃喂', say.dots);
  const sun = await b.ev(`(() => { const d = document.getElementById('petTodayDots'), s = [...d.querySelectorAll('s')], st = e => getComputedStyle(e);
    return { n: s.length, svgs: d.querySelectorAll('s > svg').length, lit: s.map(x => !!x.querySelector('circle[fill="#FFD25A"]')), on: s.map(x => x.classList.contains('on')), want: +d.dataset.n,
      plain: s.every(x => st(x).backgroundImage === 'none' && st(x).borderTopLeftRadius === '0px'), w: Math.round(s[0].getBoundingClientRect().width), hid: s.every(x => x.querySelector('svg').getAttribute('aria-hidden') === 'true') }; })()`);
  P(sun.n === 5 && sun.svgs === 5 && sun.plain && sun.w >= 22 && sun.hid && sun.on.filter(Boolean).length === sun.want && sun.lit.every((v, i) => v === sun.on[i]), '5 个圆点是小太阳（不是金球）：亮的有笑脸太阳、没亮的是浅色空轮廓，数量 = 今天答对数；无球形底色、图标对读屏隐藏', sun);
  const bh = await hint('#petTodayBowls');
  P(bh.pt.h >= 44 && bh.tag === 'BUTTON' && bh.says.length === 1 && bh.says[0] === say.full && bh.tap && bh.tips.length === 1 && bh.tips[0].includes('喂满 3 份') && bh.below, '点 3 只小碗（今天已用满）：念“今天吃饱啦，明天再来！”、小碗弹一下、贴一行说明，圆点那条被换掉', bh);
  const lines = await b.ev(`mgGuideLines()`);
  P(['dots', 'bowls'].every(k => lines.includes(say[k])) && say.friend.length === 6 && say.friend.every(l => lines.includes(l) && l.split(/[，。！？、]/).every(c => c.length <= 10)) && say.old === undefined && lines.every(l => !l.includes('闯关')), '新语音都登记进 mgGuideLines（6 句朋友话，每小句 ≤10 字），旧的“玩游戏，朋友送材料！”已删，没有一句还带“闯关”', lines.filter(l => l.includes('闯关')));
  const t3b = await b.ev(`(() => { const r = MG_PET.useMaterial(1); return r.reason; })()`);
  P(t3b === 'full', '今天已用满 3 份：再点用上给出 full 原因（先于背包空判断）', t3b);

  // 小窝页：礼物成长行
  await b.ev(`petTab('Nest');true`);
  const nest = await b.ev(`(() => { const rows = [...document.querySelectorAll('#petGifts .pet-gift')], own = rows.filter(r => r.classList.contains('owned')), lock = rows.filter(r => r.classList.contains('lock'));
    const pick = r => r ? { art: r.querySelector('.pg-art').getAttribute('aria-label'), bar: r.querySelector('.pg-bar').getAttribute('aria-label'), fill: r.querySelector('.pg-bar i').style.width, stars: r.querySelectorAll('.tier-stars').length,
      btns: r.querySelectorAll('button').length, text: r.textContent } : null;
    return { n: rows.length, own: own.length, nested: document.querySelectorAll('#petGifts button button, #petGifts button .pet-link').length, noUse: document.querySelectorAll('#petGifts .pg-use, #petGifts .pg-act, #petGifts .mat-art').length,
      r1: pick(own[0]), r2: pick(own[1]), locks: lock.length, lockOk: lock.every(r => { const h = r.getBoundingClientRect(); return r.tagName === 'BUTTON' && r.getAttribute('aria-disabled') === 'true' && !!r.dataset.hint && r.querySelector('.pg-art').getAttribute('aria-hidden') === 'true' && r.getAttribute('aria-label').includes('还没有') && r.getAttribute('aria-label').includes(r.dataset.hint) && !r.querySelector('button') && h.height >= 44; }) }; })()`);
  const gn = await b.ev('[MG_PET.giftName(1, 1), MG_PET.giftName(2, 0)]');
  P(nest.n === 7 && nest.own === 2 && nest.nested === 0 && nest.locks === 5 && nest.lockOk, '礼物 7 行：已有 2 份，没有按钮套按钮，没有的 5 行是灰轮廓按钮（≥44px 高、aria-disabled、带提示句）', nest);
  {
    const lk = await b.ev(`[...document.querySelectorAll('#petGifts .pet-gift.lock')].map((r, i) => i)`);
    const outs = [];
    for (const i of lk) {
      await b.ev(`window.__says = []; window.__sayOrig = window.mgSay; window.mgSay = t => { window.__says.push(t); }; true`);
      await b.ev(`document.querySelectorAll('#petGifts .pet-gift.lock')[${i}].scrollIntoView({ block: 'nearest' }); true`);
      await click(await b.ev(`(() => { const r = document.querySelectorAll('#petGifts .pet-gift.lock')[${i}].getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`));
      outs.push(await b.ev(`(() => { const e = document.querySelectorAll('#petGifts .pet-gift.lock')[${i}], o = { says: window.__says.slice(), hint: e.dataset.hint, nope: e.classList.contains('nope') }; window.mgSay = window.__sayOrig; return o; })()`));
    }
    const wantLines = await b.ev(`(() => { const p = MG_PET.get(); return [1, 2, 7, 3, 4, 5, 6].filter(lv => !(lv <= 6 ? p.gifts.includes(lv) : p.gifts.includes(7))).map(lv => MG_PET_STORY.lockLine(p, lv)); })()`);
    P(outs.length === 5 && outs.every(o => o.says.length === 1 && o.says[0] === o.hint && o.nope) && JSON.stringify(outs.map(o => o.hint)) === JSON.stringify(wantLines) && wantLines[0] === '答题喂萌蛋，就解锁！' && wantLines.slice(1).every(l => /^过第.关，就有礼物！$/.test(l)),
      '布置页没拿到的礼物：真点击各念一句怎么拿到（第3~6关念“过第N关，就有礼物！”，传声筒那份念“答题喂萌蛋，就解锁！”），并晃一下', { outs, wantLines });
  }
  P(nest.r1.art.includes(gn[0]) && nest.r1.bar === '已用上 11 份' && nest.r1.stars === 1 && nest.r1.btns === 1, '第 1 关礼物：图 + 星级 + 进度条（已用 11 份），整行只有点图看故事这一个按钮', nest.r1);
  P(nest.r2.art.includes(gn[1]) && nest.r2.bar === '已用上 5 份' && Math.abs(parseFloat(nest.r2.fill) - 5 / 60 * 100) < 0.01, '第 2 关礼物：已用 5 份，进度条按 5/60 填', nest.r2);
  P(nest.r1.text.replace(/\s/g, '') === gn[0] && nest.noUse === 0, '小窝礼物行只展示、不能用材料（用材料只在今天页）：没有“用上 ×N”按钮和材料图标，只剩礼物名（读屏）', { text: nest.r1.text, noUse: nest.noUse });
  await b.ev(`document.querySelector('#petGifts .owned .pg-art').click();true`);
  P(await b.ev(`MG_PET_STORY.isOpen()`), '点礼物图：打开它的故事卡');
  await b.ev(`MG_PET_STORY.close();true`);
  await b.shot('materials_nest_960x576');

  // 右上角圆形关闭钮：不再占底部一整条；已领养时底部整条收起
  await b.ev(`petTab('Today');true`);
  const closeBtn = await b.ev(`(() => { const x = document.getElementById('petCloseBtn'), r = x.getBoundingClientRect(), c = document.querySelector('#petModal .pet-card').getBoundingClientRect(), s = getComputedStyle(x);
    return { inCard: !!x.closest('.pet-top'), w: Math.round(r.width), h: Math.round(r.height), round: s.borderRadius, top: r.top - c.top < 24, right: c.right - r.right < 24, aria: x.getAttribute('aria-label'), footerShown: !!document.querySelector('#petModal .pet-footer'), adoptShown: getComputedStyle(document.getElementById('petAdoptBtn')).display !== 'none' }; })()`);
  P(closeBtn.inCard && closeBtn.w >= 44 && closeBtn.h >= 44 && closeBtn.top && closeBtn.right && closeBtn.aria === '收好手记' && !closeBtn.footerShown && !closeBtn.adoptShown, '已领养：关闭钮是右上角 44px 圆钮，底部整条收起', closeBtn);
  await b.ev(`document.getElementById('petCloseBtn').click();true`);
  P(await b.ev(`!document.getElementById('petModal').classList.contains('show')`), '点右上角圆钮：关闭小窝');
  await b.ev(`showPet();true`);

  // 三个视口下的小窝（今天页 / 小窝页）：卡片在屏内，没有横向溢出，6 个材料格与关闭钮都点得到
  const lay = () => b.ev(`(() => { const c = document.querySelector('#petModal .pet-card'), r = c.getBoundingClientRect(), pn = [...document.querySelectorAll('#petModal .pet-panel')].find(p => !p.hidden), pr = pn.getBoundingClientRect();
    const over = [...pn.querySelectorAll('*')].filter(n => { if (n.closest('#petDecors')) return false; const a = n.getBoundingClientRect(); return a.width > 0 && a.right > pr.right + 1; }).length;
    const today = pn.id === 'petPanelToday', tiles = today ? [...document.querySelectorAll('#petBag > button')] : [], tb = tiles.map(t => t.getBoundingClientRect());
    const tilesIn = !today || (tb.length === 6 && tb.every(a => a.width >= 60 && a.height >= 60 && a.top >= pr.top - 1 && a.bottom <= pr.bottom + 1 && a.right <= pr.right + 1));
    const x = document.getElementById('petCloseBtn'), xa = x.getBoundingClientRect(), xe = document.elementFromPoint(xa.x + xa.width / 2, xa.y + xa.height / 2), xHit = x.contains(xe), xIn = xa.top >= 0 && xa.right <= innerWidth && xa.width >= 44;
    return { inV: r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1, x: document.documentElement.scrollWidth <= innerWidth + 1, over, tilesIn, xHit, xIn, tile: tb[0] && [Math.round(tb[0].width), Math.round(tb[0].height)] }; })()`);
  for (const [w, h] of (b.device ? [[960, 576]] : [[960, 576], [900, 500], [412, 915]])) {
    await b.viewport(w, h);
    await b.ev(seed(menuSeed)); await b.nav(b.menu); await openPet();
    const a = await lay();
    P(a.inV && a.x && a.over === 0 && a.tilesIn && a.xHit && a.xIn, `${w}×${h} 小窝“今天”页：卡片在屏内、无溢出、6 个材料格不用滚动就看得见、右上角关闭钮点得到`, a);
    await b.sleep(400); await b.shot(`materials_today_${w}x${h}`);
    await b.ev(`petTab('Nest');true`);
    const n = await lay();
    P(n.inV && n.x && n.over === 0 && n.xHit, `${w}×${h} 小窝“小窝”页：礼物行不溢出，关闭钮仍在`, n);
    await b.shot(`materials_nest_${w}x${h}`);
    await b.ev(`hidePet();true`);
  }
  await b.viewport(960, 576);

  // 今天用不了：点背包材料 / 礼物行的“用上”，提示贴在被点的东西旁边，材料与能量都不动
  const tipOf = (sel) => b.ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); el.click(); const tips = [...document.querySelectorAll('#petModal .pet-use-tip')], t = tips[0], pn = [...document.querySelectorAll('#petModal .pet-panel')].find(x => !x.hidden), pr = pn.getBoundingClientRect(), tr = t ? t.getBoundingClientRect() : null, p = MG_PET.get();
    return { n: tips.length, text: t ? t.textContent : '', prev: t && t.previousElementSibling ? t.previousElementSibling.id || t.previousElementSibling.className : '', inPanel: !!tr && tr.top >= pr.top - 1 && tr.bottom <= pr.bottom + 1 && tr.width > 0, bag: p.bag, xp: p.xp, uses: p.xpDay.uses, used: p.used }; })()`);
  await b.ev(seed({ bag: { 1: 2, 2: 1 }, uses: 3, gifts: [1, 2], used: { 1: 3 } })); await b.nav(b.menu); await openPet();
  const k1 = await tipOf('#petBag .pet-bag-chip');
  P(k1.n === 1 && k1.prev === 'petBag' && k1.text.includes('今天已经用了 3 份') && k1.text.includes('明天再用') && k1.inPanel && k1.bag[1] === 2 && k1.xp === 20 && k1.uses === 3 && k1.used[1] === 3,
    '今天已用满 3 份：点背包材料，紧贴背包出一条提示，材料/能量/份数都不动，且在可见区内', k1);
  await b.shot('materials_tip_full_960x576');
  const k2 = await tipOf('#petBag .pet-bag-chip');
  P(k2.n === 1 && k2.prev === 'petBag', '再点一次背包材料：提示仍只留一条（先收掉上一条）', k2);
  P((await b.ev(`petTab('Nest'); document.querySelectorAll('#petGifts button:not(.pg-art):not(.lock)').length`)) === 0, '小窝礼物行里没有“用上”按钮：材料只能在今天页用');
  await b.ev(`petTab('Today');true`);
  await b.ev(`renderPet();true`);
  P((await b.ev(`document.querySelectorAll('#petModal .pet-use-tip').length`)) === 0, '重新渲染小窝后提示收起，不留旧提示');
  await b.ev(seed({ bag: { 2: 1 }, got: 10, gifts: [2] })); await b.nav(b.menu); await openPet();
  const k3 = await tipOf('#petBag .pet-bag-chip');
  P(k3.n === 1 && k3.text.includes('吃饱') && k3.text.includes('10 点') && k3.text.includes('明天再用') && k3.bag[2] === 1 && k3.xp === 20 && k3.used[2] === 0, '萌蛋今天吃饱：提示写明每天最多 10 点、明天再用，材料留在背包', k3);
  await b.ev(seed({ bag: { 2: 1 }, xp: 900, gifts: [2] })); await b.ev(`showPet();true`);
  const k4 = await tipOf('#petBag .pet-bag-chip');
  P(k4.n === 1 && k4.text.includes('攒满') && !k4.text.includes('10 点') && k4.bag[2] === 1, '能量已攒满等出生：提示不再说“吃饱”，改说等出生以后再用', k4);
  await b.ev(seed({ bag: { 2: 1 }, uses: 3, stage: 1, gifts: [2] })); await b.nav(b.menu); await openPet();
  const k5 = await tipOf('#petBag .pet-bag-chip');
  P(k5.n === 1 && k5.text.includes('今天已经用了 3 份'), '已孵化的萌蛋同样适用“每天最多 3 份”', k5);
  await b.ev(seed({ bag: { 2: 2 }, gifts: [2] })); await b.nav(b.menu); await openPet();
  const k6 = await tipOf('#petBag .pet-bag-chip');
  P(k6.n === 0 && k6.used[2] === 1 && k6.bag[2] === 1, '今天能用时：点一下正常用上，不出提示', k6);

  // 减少动态效果：不飞，直接欢呼冒爱心
  await b.ev(seed({ bag: { 1: 1 }, gifts: [1] })); await b.nav(b.menu); await openPet();
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await b.ev(`window.__says = []; window.__sayOrig = window.mgSay; window.mgSay = t => { window.__says.push(t); }; document.querySelector('#petBag .pet-bag-chip').click(); true`);
  const rmv = await b.ev(`({ fly: document.querySelectorAll('.pet-fly').length, hearts: document.querySelectorAll('#petNest .pet-heart').length, gain: document.querySelectorAll('#petNest .pet-gain').length, says: window.__says.length, xp: MG_PET.get().xp })`);
  await b.send('Emulation.setEmulatedMedia', { features: [] });
  await b.ev('window.mgSay = window.__sayOrig; true');
  P(rmv.fly === 0 && rmv.hearts >= 3 && rmv.gain === 1 && rmv.says === 1 && rmv.xp === 23, '减少动态效果：不飞行图标，萌蛋当场欢呼、冒爱心、浮「+3」、念一句', rmv);

  // 没领养：没有底部长条和旧的“去领养”卡；蛋下面一个领养药丸；标签与面板收起，右侧是只有图的旅程预告；背包不渲染
  await b.ev(`['mathgamePet'].forEach(k => localStorage.removeItem(k)); true`); await b.nav(b.menu); await openPet();
  const un = await b.ev(`(() => { const vis = e => getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0, a = document.getElementById('petAdoptBtn'), pv = document.getElementById('petPreview');
    return { footer: !!document.querySelector('#petModal .pet-footer'), go: !!document.querySelector('.pe-go'), adopt: vis(a), inHome: !!a.closest('.pet-home'), text: a.textContent.trim(), aria: a.getAttribute('aria-label'),
      tabs: vis(document.querySelector('#petModal .pet-tabs')), panels: [...document.querySelectorAll('#petModal .pet-panel')].filter(vis).length, pv: vis(pv), steps: pv.querySelectorAll('.pj-step').length, arrows: pv.querySelectorAll('.pj-arrow').length,
      pvText: pv.textContent.trim(), pvOnclick: pv.querySelectorAll('[onclick]').length, bag: document.getElementById('petBag').innerHTML, energy: vis(document.getElementById('petEnergy')),
      entries: [...document.querySelectorAll('#petModal [onclick*="adoptPet"]')].filter(vis).length }; })()`);
  P(!un.footer && !un.go && un.adopt && un.inHome && un.text === '领养' && un.aria === '领养萌蛋' && un.entries === 1, '没领养：没有底部长条、没有“去领养”卡，只有蛋下面一个「领养」药丸', un);
  P(!un.tabs && un.panels === 0 && un.pv && un.steps === 4 && un.arrows === 3 && un.pvText === '' && un.pvOnclick === 0 && un.bag === '' && !un.energy, '没领养：标签和面板收起，右侧是玩游戏→材料→喂蛋→数宝 4 张图（无字、不可点），背包不渲染，成长小路收起', un);
  await b.shot('materials_unadopted_960x576');
  const pt = await b.ev(`(() => { const r = document.getElementById('petAdoptBtn').getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
  await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
  await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x, y: pt.y, button: 'left', clickCount: 1 }); await b.sleep(300);
  const unc = await b.ev(`({ adopted: MG_PET.get().adopted, adopt: getComputedStyle(document.getElementById('petAdoptBtn')).display !== 'none', empty: document.querySelectorAll('#petBag.pe .pe-cell').length === 6, bowls: !document.getElementById('petTodayBowls').hidden, tab: document.querySelector('#petModal .pet-tabs [aria-selected=true]').id, hand: !!document.getElementById('mg-point') })`);
  P(unc.adopted && !unc.adopt && unc.empty && unc.bowls && unc.tab === 'petTabToday' && !unc.hand, '真点「领养」药丸：领养成功，药丸收起，切到「喂蛋」页，空包插画卡与小碗出现，没有小手', unc);

  P(b.errors.length === 0, '材料背包全流程无浏览器脚本异常', b.errors);
} finally {
  try { await b.restore(); } finally { await b.close(); }
}
finish('MATERIALS');
