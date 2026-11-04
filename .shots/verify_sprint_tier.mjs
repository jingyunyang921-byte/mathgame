// 打卡改版闸门（2026-10-29）：累计天数 / 每天看得见的奖品 / 摆件奖励三分支 / 速算三档。
// 本地 Chrome :9333 + 静态服 :8000；用 petBrowser 开独立页签，结束时还原存档。
//   1 累计天数：pill 显示 total、断签不清零、老存档拿 streak 当起点；卡上「今天可得 <奖品>」；日历格带奖品
//   2 难度弹窗：#tierChip → #tierModal，三档各记各的纪录，选中即存 mathgameSprintTier，坏值回 1 档，startSprint 带 mgSprintTier
//   3 领奖：D3/D5/D7 送摆件（不自动摆出）、已有/没领养 → +15 星币、幂等；限定摆件不上架、拿到手才出现
//   4 游戏页：mgSprintTier → mgSprintLevel → 出题器；三档纪录各存各的 key；任何一档都算打卡
//   5 多视口：chip 与卡片不出界、不压 CTA；日历奖品格不溢出
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
const DAYJS = `(off => { const d = new Date(); d.setDate(d.getDate() - off); const p = n => (n < 10 ? '0' : '') + n;
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); })`;
const WIPE = `['mathgameSprintBest','mathgameSprintBest2','mathgameSprintBest3','mathgameSprintTier','mathgameDaily','mathgameDailyChest',
  'mathgameStars','mathgameBest','mathgameMaxCompletedLevel','mathgameWrongLog','mathgamePet','mathgameCoins','mathgameBadges']
  .forEach(k => localStorage.removeItem(k)); localStorage.setItem('mathgameLevelsVer','2'); localStorage.setItem('mathgameRankSeen','999'); true`;
const daily = (off, total, streak) => `localStorage.setItem('mathgameDaily', JSON.stringify({last:${DAYJS}(${off}),streak:${streak ?? 1},bestStreak:${streak ?? 1}${total == null ? '' : ',total:' + total}}));`;
const chestToday = `localStorage.setItem('mathgameDailyChest', JSON.stringify({claimed:${DAYJS}(0)}));`;
const pet = (extra) => `(() => { const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return MG_PET.dayKey(x); };
  localStorage.setItem('mathgamePet', JSON.stringify(Object.assign({ version: 2, adopted: true, exp: 0, stage: 0, adoptedDay: d(-22), lastDay: d(0), xp: 20, days: [d(-3), d(-2), d(-1), d(0)], phase: 0,
    daily: { date: d(0), correct: 0, rounds: [] }, gifts: [], decor: 'leaf', decors: ['leaf'], items: [], put: { L: '', R: '', H: '' }, name: '数宝', hatchDay: '', birthSeen: true, affection: 0,
    stories: { seen: [], pending: [] } }, ${JSON.stringify(extra || {})}))); return true; })();`;
async function menu(w, h, seed) {
  await b.viewport(w, h);
  await b.nav(b.menu);
  await b.ev(WIPE);
  if (seed) await b.ev(seed + ';true');
  await b.nav(b.menu); await b.sleep(900);
}
const card = () => b.ev(`(() => { const R = e => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
  const p = document.getElementById('sprintPill'), c = document.getElementById('tierChip'), sp = document.getElementById('streakPill'), cta = document.querySelector('.cta');
  const ms = document.getElementById('menuScreen');
  return { meta: document.getElementById('sprintPillMeta').textContent, title: document.getElementById('sprintPillTitle').textContent,
    metaEm: (document.querySelector('#sprintPillMeta em') || {}).textContent || '', chip: c.textContent.replace(/\\s+/g, ''), chipAria: c.getAttribute('aria-label'),
    chipTag: c.tagName, pillTag: p.tagName, chipParent: c.parentElement.className, pillParent: p.parentElement.className,
    pillShown: sp.classList.contains('show'), pillNum: document.getElementById('streakNum').textContent, pillAria: sp.getAttribute('aria-label'),
    rp: R(p), rc: R(c), rcta: R(cta), iw: innerWidth, ih: innerHeight, scrollDelta: ms.scrollHeight - ms.clientHeight, cw: ms.clientWidth,
    sprintBest: (JSON.parse(localStorage.getItem('mathgameSprintBest') || 'null') || {}).best || 0, errs: window.__errs || [] }; })()`);
const days = () => b.ev(`(() => { const cells = [...document.querySelectorAll('#dailyWeek .day-cell')];
  return { sub: document.getElementById('dailySub').textContent, n: cells.length,
    num: cells.map(c => c.querySelector('.day-num').textContent), pz: cells.map(c => c.querySelector('.day-pz').textContent),
    art: cells.map(c => !!c.querySelector('.day-disc.art svg')), coin: cells.map(c => { const u = c.querySelector('.day-disc use'); return u ? u.getAttribute('href') : ''; }),
    cls: cells.map(c => c.className), btn: document.getElementById('dailyBtn').textContent,
    over: cells.map(c => c.scrollWidth - c.clientWidth), weekOver: document.getElementById('dailyWeek').scrollWidth - document.getElementById('dailyWeek').clientWidth }; })()`);

try {
  // ======== 1. 累计天数 + 每日奖品 ========
  console.log('\n######## 1. 累计天数与每日奖品 ########');
  await b.nav(b.menu); await b.preserve();
  await menu(1000, 576, null);
  let c = await card();
  P(!c.pillShown, '没打过卡：打卡 pill 不出现');
  P(c.title === '今日打卡 · 一分钟速算' && c.meta === '今天可得 5 星币' && c.metaEm === '5 星币', '没打过卡：卡上写「今天可得 5 星币」，奖品高亮', [c.title, c.meta]);
  P(c.chip === '10以内' && /选择速算难度.*10 以内/.test(c.chipAria || ''), '难度 chip 默认「10以内」，读屏标签说清楚', [c.chip, c.chipAria]);
  P(c.chipTag === 'BUTTON' && c.pillTag === 'BUTTON' && c.chipParent === 'sp-box' && c.pillParent === 'sp-box',
    'chip 与打卡卡是同级的两个 button（没有 button 套 button）', [c.chipParent, c.pillParent]);

  await menu(1000, 576, daily(5, 10, 3) + chestToday);
  c = await card();
  P(c.pillShown && c.pillNum === '10', '断了 5 天：pill 仍在，数字是累计 10（断签不清零）', [c.pillShown, c.pillNum]);
  P(c.meta === '今天可得 8 星币', '累计 10 → 今天是一轮里的第 4 天 →「今天可得 8 星币」', c.meta);

  await menu(1000, 576, daily(1, null, 6) + chestToday);
  c = await card();
  P(c.pillShown && c.pillNum === '6' && c.meta === '今天可得 30 星币 + 许愿星灯', '老存档（没有 total）：拿连签 6 当起点 → pill 6、今天是第 7 天大奖', [c.pillNum, c.meta]);

  await menu(1000, 576, daily(0, 12, 2) + chestToday);
  c = await card();
  P(c.title === '今日已打卡 · 一分钟速算' && c.meta === '再来一局，立个纪录？', '今天已打卡：回到「再来一局」，不再报奖品', [c.title, c.meta]);

  await menu(1000, 576, daily(0, 3, 3) + 'localStorage.setItem("mathgameSprintBest", \'{"best":14,"t":1}\');' + chestToday);
  c = await card();
  P(c.meta === '最高 14 题 · 再冲一次，破纪录？', '已打卡 + 有纪录：「最高 14 题 · 再冲一次，破纪录？」', c.meta);

  await menu(1000, 576, '');
  await b.ev('showDaily(); true'); await b.sleep(150);
  let d = await days();
  P(d.n === 7 && JSON.stringify(d.pz) === JSON.stringify(['+5', '+6', '+7', '+8', '+10', '+12', '+30']), '日历 7 格各写着当天星币 +5/+6/+7/+8/+10/+12/+30', d.pz);
  P(JSON.stringify(d.num) === JSON.stringify(['D1', 'D2', 'D3', 'D4', 'D5', 'D6', '大奖']), '格子顺序：序号在上、奖品在下', d.num);
  P(JSON.stringify(d.art) === JSON.stringify([false, false, true, false, true, false, true]), '第 3/5/7 天画摆件缩略图，其余画星币', d.art);
  P(d.coin.filter(x => x === '#i-coin').length === 4, '其余 4 天是星币图标 #i-coin', d.coin);
  P(d.sub === '已累计打卡 0 天', '副标题「已累计打卡 0 天」', d.sub);
  await b.ev('hideDaily(); true');

  await menu(1000, 576, daily(0, 12, 2));
  await b.ev('showDaily(); true'); await b.sleep(150);
  d = await days();
  P(d.sub === '已累计打卡 12 天', '累计 12 天：副标题「已累计打卡 12 天」', d.sub);
  P(d.cls.slice(0, 4).every(x => /signed/.test(x)) && /today/.test(d.cls[4]) && /claimable/.test(d.cls[4]) && !/signed/.test(d.cls[5]),
    '累计 12 → 一轮里第 5 天可领：前 4 格盖章、第 5 格高亮可领', d.cls);
  P(d.btn === '领取：10 星币 + 彩旗串', '按钮写明奖品「领取：10 星币 + 彩旗串」', d.btn);
  await b.ev('hideDaily(); true');

  // ======== 2. 难度弹窗 ========
  console.log('\n######## 2. 难度弹窗 ########');
  await menu(1000, 576, `localStorage.setItem('mathgameSprintBest', '{"best":11,"t":1}'); localStorage.setItem('mathgameSprintBest2', '{"best":7,"t":1}');` + chestToday);
  await b.ev(`document.getElementById('tierChip').click(); true`); await b.sleep(150);
  let t = await b.ev(`(() => { const m = document.getElementById('tierModal'); const o = [...document.querySelectorAll('#tierList .tier-opt')];
    return { open: m.classList.contains('show') && m.getAttribute('aria-hidden') === 'false', n: o.length, name: o.map(x => x.querySelector('b').textContent),
      best: o.map(x => x.querySelector('.to-best').textContent), sel: o.map(x => x.classList.contains('sel')), aria: o.map(x => x.getAttribute('aria-checked')),
      title: document.getElementById('tierTitle').textContent }; })()`);
  P(t.open && t.n === 3, '点 chip 打开难度弹窗，三个选项', t);
  P(JSON.stringify(t.name) === JSON.stringify(['10以内加减', '20以内加减', '100以内加减']), '三档名称', t.name);
  P(JSON.stringify(t.best) === JSON.stringify(['最高 11 题', '最高 7 题', '还没有纪录']), '三档纪录各记各的：11 / 7 / 还没有', t.best);
  P(JSON.stringify(t.sel) === JSON.stringify([true, false, false]) && t.aria[0] === 'true', '当前档（默认 1 档）高亮且 aria-checked', [t.sel, t.aria]);
  await b.ev(`document.querySelector('#tierList .tier-opt[data-tier="3"]').click(); true`); await b.sleep(150);
  c = await card();
  const closed = await b.ev(`(() => { const m = document.getElementById('tierModal'); return { show: m.classList.contains('show'), hid: m.getAttribute('aria-hidden'), saved: localStorage.getItem('mathgameSprintTier') }; })()`);
  P(!closed.show && closed.hid === 'true' && closed.saved === '3', '点第 3 档：弹窗关闭，存下 mathgameSprintTier=3', closed);
  P(c.chip === '100以内' && /100 以内/.test(c.chipAria), 'chip 随之变成「100以内」', [c.chip, c.chipAria]);
  await b.nav(b.menu); await b.sleep(700);
  c = await card();
  P(c.chip === '100以内', '重新进菜单后档位还在', c.chip);
  for (const bad of ['9', 'x', '0', '-1', '']) {
    const r = await b.ev(`localStorage.setItem('mathgameSprintTier', ${JSON.stringify(bad)}); refreshSprintUI(); getSprintTier() + '|' + document.getElementById('tierChipTx').textContent`);
    P(r === '1|10以内', `坏值 ${JSON.stringify(bad)} → 当 1 档`, r);
  }
  await b.ev(`localStorage.setItem('mathgameSprintTier', '2'); refreshSprintUI(); true`);
  await b.ev(`document.getElementById('tierChip').click(); true`); await b.sleep(120);
  await b.ev(`[...document.querySelectorAll('#tierModal .locked-modal-btn')].find(x => /关闭/.test(x.textContent)).click(); true`); await b.sleep(120);
  P(await b.ev(`!document.getElementById('tierModal').classList.contains('show') && localStorage.getItem('mathgameSprintTier') === '2'`), '「关闭」只关弹窗、不改档位');

  await menu(1000, 576, daily(0, 3, 3) + chestToday + `localStorage.setItem('mathgameSprintBest', '{"best":11,"t":1}'); localStorage.setItem('mathgameSprintBest2', '{"best":7,"t":1}'); localStorage.setItem('mathgameSprintTier','2');`);
  c = await card();
  P(c.meta === '最高 7 题 · 再冲一次，破纪录？', '已打卡 + 2 档：卡上显示 2 档自己的纪录 7（不是 1 档的 11）', c.meta);
  await b.ev(`localStorage.setItem('mathgameSprintTier','3'); refreshSprintUI(); true`);
  c = await card();
  P(c.meta === '再来一局，立个纪录？', '已打卡 + 3 档没纪录：「再来一局，立个纪录？」', c.meta);
  const hand = await b.ev(`(() => { const old = mgGoGame; let jumped = 0; mgGoGame = () => { jumped++; };
    localStorage.setItem('mathgameSprintTier','2'); sessionStorage.removeItem('mgSprint'); sessionStorage.removeItem('mgSprintTier');
    try { document.getElementById('sprintPill').click(); } finally { mgGoGame = old; }
    return { jumped, sprint: sessionStorage.getItem('mgSprint'), tier: sessionStorage.getItem('mgSprintTier'), lv: sessionStorage.getItem('gameLevel') }; })()`);
  P(hand.jumped === 1 && hand.sprint === '1' && hand.tier === '2' && hand.lv === '0', '点打卡卡：带 mgSprint=1、mgSprintTier=2、gameLevel=0 跳去游戏页', hand);
  // ======== 3. 领奖三分支 ========
  console.log('\n######## 3. 领奖：摆件 / 已有 / 没领养 ########');
  const claimCase = async (total, petExtra) => {
    await menu(1000, 576, daily(0, total, Math.min(total, 2)) + `localStorage.setItem('mathgameCoins', JSON.stringify({coins:100}));` + (petExtra === undefined ? '' : pet(petExtra)));
    await b.ev('showDaily(); true'); await b.sleep(120);
    const before = await days();
    await b.ev('claimDaily(); true'); await b.sleep(150);
    const rd = () => b.ev(`(() => { const p = JSON.parse(localStorage.getItem('mathgamePet') || '{}'); const btn = document.getElementById('dailyBtn');
      return { coins: JSON.parse(localStorage.getItem('mathgameCoins')).coins, msg: document.getElementById('dailyRewardMsg').textContent,
        items: p.items || [], put: p.put || {}, btn: btn.textContent, dis: btn.disabled, claimed: JSON.parse(localStorage.getItem('mathgameDailyChest') || '{}').claimed }; })()`);
    const r = await rd();
    await b.ev('claimDaily(); claimDaily(); true'); await b.sleep(100);
    const again = await rd();
    return { before, r, again };
  };
  const today = await b.ev(`${DAYJS}(0)`);
  let k = await claimCase(3, {});
  P(k.before.btn === '领取：7 星币 + 红蘑菇', '第 3 天开箱前：按钮写「领取：7 星币 + 红蘑菇」', k.before.btn);
  P(k.r.coins === 107 && k.r.msg === '+7 星币！获得「红蘑菇」，去小窝摆出来吧', '第 3 天：+7 星币，提示「获得红蘑菇」', [k.r.coins, k.r.msg]);
  P(k.r.items.join() === 'mushroom' && !k.r.put.L && !k.r.put.R && !k.r.put.H, '摆件收进小窝但不替孩子摆出来（put 全空）', [k.r.items, k.r.put]);
  P(k.r.claimed === today && k.r.dis && k.r.btn === '今天已领取 ✓', '领完：存下领取日、按钮变「今天已领取 ✓」', [k.r.claimed, k.r.btn]);
  P(k.again.coins === 107 && k.again.items.join() === 'mushroom', '连点两下 claimDaily 也只发一次（幂等）', [k.again.coins, k.again.items]);

  k = await claimCase(5, {});
  P(k.r.coins === 110 && k.r.items.join() === 'bunting' && k.r.msg === '+10 星币！获得「彩旗串」，去小窝摆出来吧' && !k.r.put.H,
    '第 5 天：+10 星币 + 彩旗串，不自动挂', [k.r.coins, k.r.items, k.r.msg]);

  k = await claimCase(7, {});
  P(k.before.btn === '领取第 7 天大奖：30 星币 + 许愿星灯' && /gift/.test(k.before.cls[6]), '第 7 天：按钮「领取第 7 天大奖：30 星币 + 许愿星灯」，最后一格是大奖格', [k.before.btn, k.before.cls[6]]);
  P(k.r.coins === 130 && k.r.items.join() === 'wishstar' && k.r.msg === '+30 星币！获得「许愿星灯」，去小窝摆出来吧' && !k.r.put.R,
    '第 7 天：+30 星币 + 许愿星灯，不自动摆', [k.r.coins, k.r.items, k.r.msg]);

  k = await claimCase(14, {});
  P(k.before.btn === '领取第 7 天大奖：30 星币 + 许愿星灯' && k.r.coins === 130, '累计 14 天 = 第二轮的第 7 天，奖品和第一轮一样', [k.before.btn, k.r.coins]);

  k = await claimCase(3, { items: ['mushroom'] });
  P(k.r.coins === 122 && k.r.items.join() === 'mushroom' && k.r.msg === '+22 星币！「红蘑菇」已经有啦，换成 15 星币',
    '摆件已拥有：折成 +15 星币（7+15=22），不重复收', [k.r.coins, k.r.items, k.r.msg]);

  k = await claimCase(3);
  P(k.r.coins === 122 && !k.r.items.length && k.r.msg === '+22 星币！领养数宝后才能收摆件，先换成 15 星币',
    '还没领养数宝：折成 +15 星币，提示先领养', [k.r.coins, k.r.items, k.r.msg]);

  k = await claimCase(1, {});
  P(k.r.coins === 105 && k.r.msg === '+5 星币！' && !k.r.items.length, '第 1 天：只有 +5 星币，没有摆件说明', [k.r.coins, k.r.msg]);
  // ======== 3b. 限定摆件不上架、拿到手才出现 ========
  console.log('\n######## 3b. 许愿星灯是限定款 ########');
  await menu(1000, 576, pet({}) + `localStorage.setItem('mathgameCoins', JSON.stringify({coins:500}));`);
  let sh = await b.ev(`(() => { const p = MG_PET.get(); return { ids: petShelfItems(1, p).map(i => i.id), hang: petShelfItems(2, p).map(i => i.id), all: MG_PET.items.length }; })()`);
  P(!sh.ids.includes('wishstar') && sh.ids.length === 8 && sh.hang.length === 4 && sh.all === 13, '没拿到手：货架摆件格只有 8 件，许愿星灯不上架（总表 13 件）', sh);
  await menu(1000, 576, pet({ items: ['wishstar'] }) + `localStorage.setItem('mathgameCoins', JSON.stringify({coins:500}));`);
  await b.ev(`showPet(); petTab('Nest'); petShelf(1); true`); await b.sleep(300);
  sh = await b.ev(`(() => { const c = document.querySelector('#petDecors .pet-decor[data-item="wishstar"]');
    return { ids: petShelfItems(1, MG_PET.get()).map(i => i.id), cards: document.querySelectorAll('#petDecors .pet-decor').length, has: !!c,
      state: c ? c.querySelector('.pd-state').textContent : '', dis: c ? c.disabled : null, svg: c ? !!c.querySelector('.pd-prev svg') : false,
      count: document.querySelectorAll('#petShelves .pet-shelf i')[1].textContent }; })()`);
  P(sh.ids.includes('wishstar') && sh.cards === 9 && sh.has && sh.count === '1/9', '拿到手之后：摆件格出现许愿星灯，计数 1/9', sh);
  P(sh.state === '点我摆出' && sh.dis === false && sh.svg, '许愿星灯卡可点、写「点我摆出」、有插画预览', sh);
  await b.ev(`document.querySelector('#petDecors .pet-decor[data-item="wishstar"]').click(); true`); await b.sleep(250);
  const put = await b.ev(`(() => { const p = JSON.parse(localStorage.getItem('mathgamePet')); return { put: p.put, coins: JSON.parse(localStorage.getItem('mathgameCoins')).coins,
    nest: [...document.querySelectorAll('#petNestItems .nest-prop')].map(e => e.dataset.item).join() }; })()`);
  P(put.put.R === 'wishstar' && put.coins === 500 && put.nest === 'wishstar', '点一下摆到右边小窝里，不扣星币', put);
  await b.ev(`hidePet(); true`);

  // ======== 4. 游戏页：档位 → 出题器 → 纪录 key → 打卡 ========
  console.log('\n######## 4. 游戏页三档 ########');
  const SPR = tier => `sessionStorage.setItem('mgSprint','1');` + (tier == null ? '' : `sessionStorage.setItem('mgSprintTier',${JSON.stringify(String(tier))});`);
  const bootG = async (lv, pre, extra) => { await b.nav(b.menu); await b.ev(WIPE); if (pre) await b.ev(pre + ';true'); await b.boot(lv, 'visual', extra || ''); };
  const SEEDBEST = `localStorage.setItem('mathgameSprintBest','{"best":20,"t":1}'); localStorage.setItem('mathgameSprintBest2','{"best":7,"t":1}');`;
  const gprobe = () => b.ev(`(() => { const g = window._currentGame, ds = []; for (let i = 0; i < 400; i++) ds.push(g.gen());
    return { engine: g.constructor.name, lv: g.level, sprint: !!g.sprint, flag: _mgSprint, tier: _mgSprintTier, sl: mgSprintLevel(), genName: g.gen.name, sprintLv: g.sprintLv,
      key: sessionStorage.getItem('mgSprintTier'), mk: sessionStorage.getItem('mgSprint'), bestKey: mgSprintBestKey(), sb: g.sprintBest,
      maxOp: Math.max(...ds.map(q => Math.max(q.a, q.b))), maxAns: Math.max(...ds.map(q => q.answer)), minAns: Math.min(...ds.map(q => q.answer)),
      bigSum: ds.some(q => q.op === '+' && q.answer > 10), bigOp: ds.some(q => q.a > 20), ops: [...new Set(ds.map(q => q.op))].sort().join('') }; })()`);
  const endSprint = score => b.ev(`(() => { const g = window._currentGame; g.playerScore = ${score}; _mgCorrect = ${score}; _mgWrong = 1; _mgMaxStreak = ${Math.min(score, 7)};
    _mgRoundStart = Date.now() - 60000; debugEndGame(false); return 1; })()`);
  const after = () => b.ev(`(() => { const j = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return 'bad'; } };
    return { b1: (j('mathgameSprintBest') || {}).best || 0, b2: (j('mathgameSprintBest2') || {}).best || 0, b3: (j('mathgameSprintBest3') || {}).best || 0,
      daily: j('mathgameDaily'), msg: document.getElementById('overlay-msg').textContent, title: document.getElementById('overlay-title').textContent,
      stars: localStorage.getItem('mathgameStars'), maxLv: localStorage.getItem('mathgameMaxCompletedLevel') }; })()`);

  await bootG(0, SEEDBEST + daily(5, 10, 3), SPR(2));
  let g = await gprobe();
  P(g.engine === 'BattleGame' && g.lv === 0 && g.sprint && g.flag && g.tier === 2 && g.sl === 2 && g.sprintLv === 2, '选 2 档：速算局 mgSprintLevel()=2、关卡号仍是 0', g);
  P(g.genName === 'mgGenAddSub20' && g.maxOp <= 20 && g.maxAns <= 20 && g.minAns >= 0 && g.bigSum && g.ops === '+−', '2 档出 20 以内加减：操作数/答案 ≤20，且确实出现过 >10 的和', [g.genName, g.maxOp, g.maxAns, g.bigSum]);
  P(g.key === null && g.mk === null, '档位钥匙和速算钥匙读完即焚（刷新不会把普通局变速算局）', [g.key, g.mk]);
  P(g.bestKey === 'mathgameSprintBest2' && g.sb === 7, '2 档追的是自己的纪录 7（不是 1 档的 20）', [g.bestKey, g.sb]);
  await endSprint(9); await b.sleep(500);
  let a = await after();
  P(a.b2 === 9 && a.b1 === 20 && a.b3 === 0, '2 档打出 9 题：只写 mathgameSprintBest2（1 档 20 不动、3 档仍空）', a);
  P(a.daily && a.daily.total === 11 && a.daily.streak === 1 && a.daily.bestStreak === 3, '断了 5 天后再打卡：累计 10→11，连签重新从 1 算、最佳连签 3 保留', a.daily);
  P(/累计打卡 11 天/.test(a.msg), '结算语写「累计打卡 11 天！」', a.msg);
  P(a.stars === null && a.maxLv === null, '速算局不写星星/通关进度', [a.stars, a.maxLv]);
  await bootG(0, SEEDBEST + daily(1, 4, 4), SPR(3));
  g = await gprobe();
  P(g.tier === 3 && g.sl === 3 && g.genName === 'mgGenAddSub100' && g.bestKey === 'mathgameSprintBest3' && g.sb === 0, '选 3 档：出 100 以内加减、纪录 key 是 Best3、还没纪录', [g.genName, g.bestKey, g.sb]);
  P(g.bigOp && g.maxAns <= 99 && g.minAns >= 0 && g.maxOp <= 99, '3 档确实出现 20 以上的操作数，答案始终在 0~99', [g.bigOp, g.maxOp, g.maxAns, g.minAns]);
  await endSprint(8); await b.sleep(500);
  a = await after();
  P(a.b3 === 8 && a.b1 === 20 && a.b2 === 7, '3 档第一次打出 8 题：只写 Best3（1/2 档纪录原样）', a);
  P(a.daily && a.daily.total === 5 && a.daily.streak === 5 && /累计打卡 5 天/.test(a.msg), '昨天打过的接着打：累计 4→5、连签 4→5、结算语「累计打卡 5 天」', [a.daily, a.msg]);

  await bootG(0, SEEDBEST, SPR(1));
  g = await gprobe();
  P(g.tier === 1 && g.genName === 'mgGenAddSub10' && g.maxOp <= 10 && g.maxAns <= 10 && !g.bigSum && g.bestKey === 'mathgameSprintBest' && g.sb === 20,
    '选 1 档：出 10 以内加减（没有 >10 的和）、沿用老 key mathgameSprintBest', [g.genName, g.maxOp, g.maxAns, g.bestKey, g.sb]);
  for (const bad of ['9', 'x', '0']) {
    await bootG(0, SEEDBEST, SPR(bad));
    g = await gprobe();
    P(g.tier === 1 && g.genName === 'mgGenAddSub10' && g.bestKey === 'mathgameSprintBest' && g.key === null, `游戏页收到坏档位 ${JSON.stringify(bad)} → 当 1 档`, [g.tier, g.genName, g.key]);
  }
  await bootG(0, SEEDBEST, SPR(null));
  g = await gprobe();
  P(g.tier === 1 && g.genName === 'mgGenAddSub10', '老入口（没带档位）→ 默认 1 档', [g.tier, g.genName]);

  await bootG(3, SEEDBEST, `sessionStorage.setItem('mgSprintTier','3');`);
  g = await b.ev(`(() => { const g = window._currentGame; return { lv: g.level, sprint: !!g.sprint, flag: _mgSprint, tier: _mgSprintTier, key: sessionStorage.getItem('mgSprintTier') }; })()`);
  P(g.lv === 3 && !g.sprint && g.flag === false && g.tier === 1 && g.key === null, '普通闯关局不吃档位：第 3 关照常、档位钥匙被清掉', g);
  P(b.errors.length === 0, '无脚本异常', b.errors);

  // ======== 5. 多视口 ========
  console.log('\n######## 5. 多视口：chip 与卡不出界、不压 CTA ########');
  const seedUi = daily(1, 10, 3) + `localStorage.setItem('mathgameSprintTier','3');`;
  for (const [w, h] of [[960, 576], [900, 500], [780, 420], [390, 844], [412, 915], [360, 800]]) {
    const tag = `${w}×${h}`;
    await menu(w, h, seedUi);
    c = await card();
    const ov = (r1, r2, tol = 1) => Math.min(r1.r, r2.r) - Math.max(r1.x, r2.x) > tol && Math.min(r1.b, r2.b) - Math.max(r1.y, r2.y) > tol;
    P(c.rc.x >= -0.5 && c.rc.r <= c.iw + 0.5 && c.rp.x >= -0.5 && c.rp.r <= c.iw + 0.5, `${tag}：chip 与打卡卡都在屏幕左右边界内`, [c.rc, c.rp].map(r => [Math.round(r.x), Math.round(r.r)]));
    P(c.rc.y >= -0.5, `${tag}：chip 不顶出屏幕上沿`, Math.round(c.rc.y));
    // 360×800 这类更窄更矮的手机，菜单本来就要滚（隐藏 chip 后同样 40px，实测过），只在不滚的视口里断言卡落在屏内
    if (c.scrollDelta <= 1) P(c.rp.b <= c.ih + 0.5, `${tag}：卡的下沿在屏内`, [Math.round(c.rp.b), c.ih]);
    else console.log(`INFO ${tag}：菜单本身可滚(${c.scrollDelta}px)，卡下沿 ${Math.round(c.rp.b)} / 屏高 ${c.ih}（与 chip 无关）`);
    P(!ov(c.rc, c.rcta), `${tag}：chip 不压 CTA「开始」按钮`, [c.rc, c.rcta].map(r => [Math.round(r.y), Math.round(r.b)]));
    const tx = await b.ev(`(() => { const R = e => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom }; };
      return { chip: R(document.getElementById('tierChip')), t: R(document.getElementById('sprintPillTitle')), m: R(document.getElementById('sprintPillMeta')) }; })()`);
    P(!ov(tx.chip, tx.t, 3) && !ov(tx.chip, tx.m, 3), `${tag}：chip 不盖在卡上的标题/奖品文字上（容 3px 行距）`, [tx.chip, tx.t, tx.m].map(r => [Math.round(r.x), Math.round(r.y), Math.round(r.r), Math.round(r.b)]));
    if (w === 960) P(c.scrollDelta <= 1, `${tag}：菜单不滚动（加了 chip 没把页面撑高）`, c.scrollDelta);
    else console.log(`INFO ${tag}：菜单内部滚动余量 ${c.scrollDelta}px`);
    await b.shot(`sprint_tier_menu_${w}x${h}`);
  }
} finally { try { await b.viewport(1000, 576); await b.restore(); } finally { await b.close(); } }
finish('SPRINT TIER');
