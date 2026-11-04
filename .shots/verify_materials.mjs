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
    P(g3.card.includes('长大啦') && g3.card.includes(gname), `${w}×${h} 收下后结算卡里有升级预告`, g3.card);
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
  // 3. 菜单小窝：今天想要 / 背包 / 用上 / 礼物成长
  // 菜单加载后会自动弹打卡 / 升段等弹窗盖在小窝上，先等它们出现再关掉，再打开小窝
  const openPet = async () => { await b.sleep(700); await b.ev(`document.querySelectorAll('.locked-modal.show').forEach(m => { m.classList.remove('show'); m.setAttribute('aria-hidden', 'true'); }); showPet(); true`); };
  await b.nav(b.menu); await b.viewport(960, 576);
  const menuSeed = { gifts: [1, 2], used: { 1: 9, 2: 4 }, bag: { 1: 2, 2: 1 } };
  await b.ev(seed(menuSeed)); await b.nav(b.menu); await openPet();
  const today = () => b.ev(`(() => { const w = document.getElementById('petWant'), bx = document.getElementById('petBagBox'), btn = document.getElementById('petStartBtn');
    const p = MG_PET.get(), un = [1, 2, 3, 4, 5, 6].filter(n => isLevelUnlocked(n)); let exp = 0; un.forEach(n => { if (!exp || (p.used[n] || 0) < (p.used[exp] || 0)) exp = n; });
    return { wantHidden: w.hidden, boxHidden: bx.hidden, want: w.textContent, btn: btn.textContent, chips: [...document.querySelectorAll('#petBag .pet-bag-chip')].map(n => n.textContent),
      note: document.getElementById('petBagNote').textContent, resp: document.getElementById('petResponse').textContent, lv: petWantLevel(), exp, un, p }; })()`);
  const t0 = await today();
  P(!t0.wantHidden && !t0.boxHidden && t0.lv === t0.exp && t0.want.includes('今天想要：') && t0.btn.includes('去第 ' + t0.lv + ' 关找「'), '“今天想要”指向用得最少的已解锁关，主按钮写明去哪一关找什么', t0);
  P(t0.chips.length === 2 && t0.chips[0].includes('暖草 ×2') && t0.chips[1].includes('松果 ×1') && t0.note.includes('今天还能用 3 份'), '背包按关卡列出材料与份数，说明今天还能用几份', t0);
  await b.shot('materials_today_960x576');

  await b.ev(`document.querySelectorAll('#petBag .pet-bag-chip')[1].click();true`);
  const t1 = await today();
  P(t1.resp.includes('用上了小松鼠的「松果」') && t1.resp.includes('3 点能量') && t1.chips.length === 1 && t1.p.used[2] === 5 && t1.p.xp === 23 && t1.note.includes('今天还能用 2 份'), '点背包里的松果：+3 点能量，礼物累计 5 份，背包少 1 份', t1);
  await b.ev(`document.querySelectorAll('#petBag .pet-bag-chip')[0].click();true`);
  await b.sleep(300);
  const t2 = await b.ev(`({ open: MG_PET_STORY.isOpen(), resp: document.getElementById('petResponse').textContent, p: MG_PET.get(), g: MG_PET.giftName(1, 1) })`);
  P(t2.open && t2.p.used[1] === 10 && t2.resp.includes('长大啦') && t2.resp.includes(t2.g), '用到第 10 份：礼物升级，自动弹出成长故事', t2);
  await b.ev(`MG_PET_STORY.close();true`); await b.sleep(300);
  await b.ev(`document.querySelectorAll('#petBag .pet-bag-chip')[0].click();true`);
  const t3 = await today();
  P(t3.chips.length === 0 && t3.note.includes('背包空空') && t3.p.xpDay.uses === 3 && t3.p.bag[1] === 0, '背包用完：显示“背包空空的”，今天已用 3 份', t3);
  const t3b = await b.ev(`(() => { const r = MG_PET.useMaterial(1); return r.reason; })()`);
  P(t3b === 'full', '今天已用满 3 份：再点用上给出 full 原因（先于背包空判断）', t3b);

  // 小窝页：礼物成长行
  await b.ev(`petTab('Nest');true`);
  const nest = await b.ev(`(() => { const rows = [...document.querySelectorAll('#petGifts .pet-gift')], own = rows.filter(r => r.classList.contains('owned')), r1 = own[0];
    return { n: rows.length, own: own.length, nested: document.querySelectorAll('#petGifts button button, #petGifts button.pet-gift, #petGifts button .pet-link').length,
      r1: r1 ? r1.textContent : '', btn1: r1 ? [...r1.querySelectorAll('button')].map(x => ({ t: x.textContent, dis: x.disabled })) : [], stars: r1 ? r1.querySelectorAll('.tier-stars').length : 0,
      r2: own[1] ? own[1].textContent : '', dashed: rows.filter(r => !r.classList.contains('owned')).every(r => r.textContent.includes('用场') || r.textContent.includes('获得')) }; })()`);
  const gn = await b.ev('[MG_PET.giftName(1, 1), MG_PET.giftName(2, 0)]');
  P(nest.n === 7 && nest.own === 2 && nest.nested === 0 && nest.dashed, '礼物 7 行：已有 2 份，没有按钮套按钮，没有的行写明怎么得到', nest);
  P(nest.r1.includes(gn[0]) && nest.r1.includes('已用上 11 份') && nest.r1.includes('再用 19 份') && nest.stars === 1 && nest.btn1[0].t === '背包空' && nest.btn1[0].dis && nest.btn1[1].t === '故事', '第 1 关礼物：新名字 + 星级 + 已用 11 份 + 再用 19 份升级；背包空时按钮灰掉', nest);
  P(nest.r2.includes('松果') && nest.r2.includes('已用上 5 份') && nest.r2.includes('再用 5 份'), '第 2 关礼物：已用 5 份，再用 5 份升级', nest.r2);
  await b.shot('materials_nest_960x576');

  // 按钮都走对的关卡（本地桩掉 startGame，只看选了哪一关）
  await b.ev(`window.__go = null; window.startGame = () => { window.__go = selectedLevel; }; showPet(); startPetTask(); true`);
  const go1 = await b.ev(`({ go: window.__go, want: petWantLevel() })`);
  P(go1.go === go1.want && go1.go > 0, '主按钮“去第 N 关找…”选中的就是“今天想要”的那一关', go1);
  await b.ev(`window.__go = null; startWantedLevel(); true`);
  P((await b.ev('window.__go')) === go1.want, '“去第 N 关”同样选中想要的那一关');

  // 三个视口下的小窝（今天页 / 小窝页）：卡片在屏内，没有横向溢出，主按钮可点
  const lay = () => b.ev(`(() => { const c = document.querySelector('#petModal .pet-card'), r = c.getBoundingClientRect(), pn = [...document.querySelectorAll('#petModal .pet-panel')].find(p => !p.hidden), pr = pn.getBoundingClientRect();
    const over = [...pn.querySelectorAll('*')].filter(n => { if (n.closest('#petDecors')) return false; const a = n.getBoundingClientRect(); return a.width > 0 && a.right > pr.right + 1; }).length;
    const chip = pn.id === 'petPanelToday' && document.querySelector('#petBag .pet-bag-chip'), ca = chip && chip.getBoundingClientRect(), chipIn = !chip || (ca.top >= pr.top - 1 && ca.bottom <= pr.bottom + 1), jr = document.querySelector('.pet-journal').getBoundingClientRect(), fr = document.querySelector('.pet-footer').getBoundingClientRect(), noOverlap = innerWidth <= 600 || jr.bottom <= fr.top + 1;
    const btn = document.getElementById('petStartBtn'); btn.scrollIntoView({ block: 'nearest' }); const a = btn.getBoundingClientRect(), e = document.elementFromPoint(a.x + a.width / 2, a.y + a.height / 2);
    return { inV: r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1, x: document.documentElement.scrollWidth <= innerWidth + 1, over, chipIn, noOverlap, btnHit: pn.id !== 'petPanelToday' || e === btn }; })()`);
  for (const [w, h] of (b.device ? [[960, 576]] : [[960, 576], [900, 500], [412, 915]])) {
    await b.viewport(w, h);
    await b.ev(seed(menuSeed)); await b.nav(b.menu); await openPet();
    const a = await lay();
    P(a.inV && a.x && a.over === 0 && a.btnHit && a.chipIn && a.noOverlap, `${w}×${h} 小窝“今天”页：卡片在屏内、无溢出、主按钮可点、背包材料不用滚动就看得见、右栏不压底部按钮`, a);
    await b.sleep(400); await b.shot(`materials_today_${w}x${h}`);
    await b.ev(`petTab('Nest');true`);
    const n = await lay();
    P(n.inV && n.x && n.over === 0, `${w}×${h} 小窝“小窝”页：礼物行不溢出`, n);
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
  await b.ev(`petTab('Nest');true`);
  const k2 = await tipOf('#petGifts .pet-gift.owned .pg-act button:not([disabled])');
  P(k2.n === 1 && k2.prev.includes('pet-gift') && k2.text.includes('今天已经用了 3 份') && k2.inPanel, '小窝“礼物”行的“用上 ×N”同样给提示，贴在这一行下面', k2);
  await b.ev(`petTab('Today');true`);
  const k2b = await b.ev(`document.querySelectorAll('#petModal .pet-use-tip').length`);
  P(k2b === 1, '提示只留一条（换位置时先收掉上一条）', k2b);
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

  // 没领养：不显示今天想要 / 背包，主按钮恢复原样
  await b.ev(`['mathgamePet'].forEach(k => localStorage.removeItem(k)); true`); await b.nav(b.menu); await openPet();
  const un = await today();
  P(un.wantHidden && un.boxHidden && un.btn === '做一轮小练习', '没领养萌蛋：不显示“今天想要”和背包', un);

  P(b.errors.length === 0, '材料背包全流程无浏览器脚本异常', b.errors);
} finally {
  try { await b.restore(); } finally { await b.close(); }
}
finish('MATERIALS');
