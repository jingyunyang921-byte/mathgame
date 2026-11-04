// Local verify: 步骤4 打卡日历 (#dailyModal) + 打卡 pill 红点 + 领奖发币 + 自动弹让位。
// 打卡=完成一分钟速算(游戏页写 mathgameDaily)；领取状态记在菜单侧独立 key mathgameDailyChest。
// 注入 mathgameDaily(streak/last，不带 total = 老存档) + mathgameDailyChest(已领/未领) + mathgameCoins 组合 → 开菜单断言：
//   streakPill 点开 #dailyModal；7 格 signed/today/gift 态与累计天数对应；副标题「已累计打卡 N 天」；
//   可领→按钮「领取：<奖品>」/第7天「领取第 7 天大奖：<奖品>」+ claimDaily() 发当天星币(D1=5/D7=30，摆件折 15) + 幂等(再点不多发)；
//   已领→「今天已领取 ✓」禁用 + 红点灭；未完成→「先完成一分钟速算」(onclick=startSprint)；
//   自动弹让位：大结局/升段/勋章占屏时 maybeShowDaily 不弹，无占屏时弹；
//   宝箱领取记在 claimedTotal（第几次打卡）不记日期：跨零点补得上、欠几份逐份领不跳天、跨一轮、旧存档迁移、坏值夹回、全新设备不落盘；
//   nIconBtns===4(不加第5钮)、week 格全内联 SVG 无 emoji、<use> 全解析、无 Chrome-91 禁词、无 JS 错误。
// Needs: headless Chrome --remote-debugging-port=9333 + http.server :8000 in e:/mathgame/mathgame.
import { writeFileSync } from 'node:fs';
const BROWSER = 'http://localhost:9333';
const URL = 'http://localhost:8000/menu.html';
const VIEWPORTS = [
  { name: '1000x615', w: 1000, h: 615 },
  { name: '1000x576', w: 1000, h: 576 },
  { name: '900x500', w: 900, h: 500 },
  { name: '412x915', w: 412, h: 915 },
];

const ver = await (await fetch(BROWSER + '/json/version')).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let _id = 0; const pending = new Map(); const waiters = [];
ws.onmessage = e => { const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  else if (m.method) { for (let i = waiters.length - 1; i >= 0; i--) if (waiters[i].pred(m)) waiters.splice(i, 1)[0].res(m); } };
const send = (method, params, sessionId) => { const id = ++_id; const msg = { id, method, params: params || {} }; if (sessionId) msg.sessionId = sessionId;
  return new Promise((res, rej) => { pending.set(id, m => m.error ? rej(new Error(method + ':' + JSON.stringify(m.error))) : res(m.result)); ws.send(JSON.stringify(msg)); }); };
const waitEvent = (pred, ms = 8000) => new Promise((res, rej) => { const w = { pred, res }; waiters.push(w); setTimeout(() => { const i = waiters.indexOf(w); if (i >= 0) { waiters.splice(i, 1); rej(new Error('timeout')); } }, ms); });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);
await send('Network.enable', {}, sessionId);
await send('Network.setCacheDisabled', { cacheDisabled: true }, sessionId);
// 页面加载后挂一次错误收集器（claimDaily/renderDaily 若抛错能被断言抓到）。
const ERRHOOK = `(() => { if (!window.__err) { window.__err = ''; addEventListener('error', e => { window.__err += '|' + (e.message || e.error); }); } return 1; })()`;

// 探针：注入一组存档 → 复位全部弹窗 → refreshSprintUI → 按 action 操作 → 读回状态 + 去AI/健壮性扫描。
const PROBE = spec => `(() => {
  const S = ${JSON.stringify(spec)};
  const mgDay = d => { const p = n => (n < 10 ? '0' : '') + n; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
  const now = new Date();
  const today = mgDay(now);
  const yest = mgDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const old2 = mgDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2));
  if (S.daily === null) localStorage.removeItem('mathgameDaily');
  else { const last = S.daily.last === 'today' ? today : S.daily.last === 'yesterday' ? yest : S.daily.last;
    localStorage.setItem('mathgameDaily', JSON.stringify({ last: last, streak: S.daily.streak, bestStreak: S.daily.streak, total: S.daily.total })); }
  // chest：'today'/'yesterday'/'old' = 旧存档只记日期；{total:n} = 新存档领到第 n 次打卡；其余 = 没有这个 key
  if (S.chest === 'today') localStorage.setItem('mathgameDailyChest', JSON.stringify({ claimed: today }));
  else if (S.chest === 'yesterday') localStorage.setItem('mathgameDailyChest', JSON.stringify({ claimed: yest }));
  else if (S.chest === 'old') localStorage.setItem('mathgameDailyChest', JSON.stringify({ claimed: old2 }));
  else if (S.chest && typeof S.chest === 'object') localStorage.setItem('mathgameDailyChest', JSON.stringify({ claimed: yest, claimedTotal: S.chest.total }));
  else localStorage.removeItem('mathgameDailyChest');
  localStorage.setItem('mathgameCoins', JSON.stringify({ coins: S.coins || 0 }));
  localStorage.removeItem('mathgamePet');   // 第 7 天的"未领养折币"分支依赖没有数宝；别吃前一个闸门留下的领养存档
  ['dailyModal', 'endingModal', 'rankUpModal', 'badgeUnlockModal'].forEach(id => { const m = document.getElementById(id); if (m) { m.classList.remove('show'); m.setAttribute('aria-hidden', 'true'); } });
  refreshSprintUI();
  const modal = document.getElementById('dailyModal');
  const read = () => {
    const week = document.getElementById('dailyWeek'); const cells = week ? [...week.children] : [];
    const btn = document.getElementById('dailyBtn'); const sp = document.getElementById('streakPill');
    return {
      open: modal.classList.contains('show') && modal.getAttribute('aria-hidden') === 'false',
      sub: (document.getElementById('dailySub') || {}).textContent, cycle: dailyCycleDay(), nCells: cells.length,
      nSigned: week ? week.querySelectorAll('.day-cell.signed').length : 0,
      nToday: week ? week.querySelectorAll('.day-cell.today').length : 0,
      nClaimable: week ? week.querySelectorAll('.day-cell.claimable').length : 0,
      nGift: week ? week.querySelectorAll('.day-cell.gift').length : 0,
      btnText: btn ? btn.textContent : '', btnDisabled: btn ? !!btn.disabled : false,
      btnOnclick: btn ? (btn.getAttribute('onclick') || '') : '',
      dotOn: sp ? sp.classList.contains('has-reward') : false, pillShown: sp ? sp.classList.contains('show') : false,
      coins: getCoins(), chestTotal: getChestClaimedTotal(), owed: chestOwed(), claimable: isChestClaimable(),
      raw: localStorage.getItem('mathgameDailyChest'),
    };
  };
  const out = { action: S.action };
  if (S.action === 'show') { showDaily(); out.state = read(); }
  else if (S.action === 'claimSeq') {
    showDaily(); out.seq = [read()];
    for (let i = 0; i < S.n; i++) { claimDaily(); out.seq.push(read()); }
  } else if (S.action === 'claimTwice') {
    showDaily(); out.before = read();
    claimDaily(); out.after1 = read();
    claimDaily(); out.after2 = read();
  } else if (S.action === 'autopop') {
    if (S.block) { const bm = document.getElementById(S.block); if (bm) { bm.classList.add('show'); bm.setAttribute('aria-hidden', 'false'); } }
    maybeShowDaily(); out.state = read();
    if (S.block) { const bm = document.getElementById(S.block); if (bm) { bm.classList.remove('show'); bm.setAttribute('aria-hidden', 'true'); } }
  }
  // 去AI/健壮性扫描：emoji 只扫 week 格（全内联 SVG；按钮里的 ✓ 是沿用 sprintPill 的既有文本字形、不算 emoji）。
  const week = document.getElementById('dailyWeek');
  out.emojiInWeek = week ? /[\\u{1F000}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{2190}-\\u{21FF}\\u{2B00}-\\u{2BFF}]/u.test(week.innerText) : false;
  out.danglingUse = [...document.querySelectorAll('use')].map(u => u.getAttribute('href')).filter(h => h && !document.querySelector(h));
  let styleTxt = [...document.querySelectorAll('style')].map(s => s.textContent).join('\\n').replace(/\\/\\*[\\s\\S]*?\\*\\//g, '');
  out.bannedTokens = styleTxt.match(/paint-order|:has\\(|@layer|color-mix\\(|oklch\\(|\\d(dvh|svh|lvh)/g);
  out.nIconBtns = [...document.querySelector('.topbar-actions').querySelectorAll('.icon-btn')].length;
  out.jsErr = window.__err || '';
  return out;
})()`;
const SCEN = {
  s1_show:    { daily: { last: 'today', streak: 1 }, chest: 'none', coins: 50, action: 'show' },
  s1_claim:   { daily: { last: 'today', streak: 1 }, chest: 'none', coins: 50, action: 'claimTwice' },
  s7_claim:   { daily: { last: 'today', streak: 7 }, chest: 'none', coins: 0,  action: 'claimTwice' },
  s3_claimed: { daily: { last: 'today', streak: 3 }, chest: 'today', coins: 0, action: 'show' },
  s_notdone:  { daily: { last: 'yesterday', streak: 2 }, chest: 'yesterday', coins: 0, action: 'show' },
  s_yield:    { daily: { last: 'today', streak: 1 }, chest: 'none', coins: 0, action: 'autopop', block: 'endingModal' },
  s_auto:     { daily: { last: 'today', streak: 1 }, chest: 'none', coins: 0, action: 'autopop', block: null },
  // 跨零点：昨天做完速算、没回菜单，今天 00:10 才进来。第 3 天的宝箱（蘑菇）要补得上
  s_cross:    { daily: { last: 'yesterday', streak: 3, total: 3 }, chest: { total: 2 }, coins: 0, action: 'claimSeq', n: 2 },
  s_crossauto:{ daily: { last: 'yesterday', streak: 3, total: 3 }, chest: { total: 2 }, coins: 0, action: 'autopop', block: null },
  // 攒了三份（今天第 5 天 + 之前两份）：逐份领，不跳天
  s_backlog:  { daily: { last: 'today', streak: 5, total: 5 }, chest: { total: 2 }, coins: 0, action: 'claimSeq', n: 4 },
  // 欠的跨了一轮：先第 7 天大奖，再下一轮第 1 天
  s_wrap:     { daily: { last: 'yesterday', streak: 8, total: 8 }, chest: { total: 6 }, coins: 0, action: 'claimSeq', n: 2 },
  // 旧存档（只记日期）：领过最后一天 = 全领完；最后一天之前才领过 = 欠一份；都落成新字段
  s_leg_done: { daily: { last: 'yesterday', streak: 2, total: 2 }, chest: 'yesterday', coins: 0, action: 'show' },
  s_leg_owe:  { daily: { last: 'yesterday', streak: 2, total: 2 }, chest: 'old', coins: 0, action: 'show' },
  s_corrupt:  { daily: { last: 'today', streak: 2, total: 2 }, chest: { total: 99 }, coins: 0, action: 'show' },
  s_fresh:    { daily: null, chest: 'none', coins: 0, action: 'show' },
};

const results = [];
let snap = null;   // 进场时的 localStorage 快照，收尾还原：否则"今天已打卡未领"会留下来，让后面所有闸门一开菜单就弹打卡日历
for (const vp of VIEWPORTS) {
  await send('Emulation.setDeviceMetricsOverride', { width: vp.w, height: vp.h, deviceScaleFactor: 1, mobile: false }, sessionId);
  const nav = waitEvent(m => m.method === 'Page.loadEventFired' && m.sessionId === sessionId);
  await send('Page.navigate', { url: URL }, sessionId);
  await nav; await sleep(350);
  if (snap === null) snap = (await send('Runtime.evaluate', { expression: 'JSON.stringify({...localStorage})', returnByValue: true }, sessionId)).result.value;
  await send('Runtime.evaluate', { expression: ERRHOOK, returnByValue: true }, sessionId);
  const r = {};
  for (const [k, spec] of Object.entries(SCEN)) {
    const res = await send('Runtime.evaluate', { expression: PROBE(spec), returnByValue: true }, sessionId);
    r[k] = res.result.value;
    await sleep(60);
  }
  // 截图：日历打开态（跑一次 s1_show 的渲染给视觉存档）
  await send('Runtime.evaluate', { expression: PROBE(SCEN.s1_show), returnByValue: true }, sessionId);
  await sleep(250);
  const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync('e:/mathgame/mathgame/.shots/daily_' + vp.name + '.png', Buffer.from(shot.data, 'base64'));
  await send('Runtime.evaluate', { expression: PROBE({ ...SCEN.s_backlog, action: 'show' }), returnByValue: true }, sessionId);
  await sleep(250);
  const shot2 = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync('e:/mathgame/mathgame/.shots/daily_backlog_' + vp.name + '.png', Buffer.from(shot2.data, 'base64'));
  results.push({ vp, r });
}

let fail = 0;
const P = (ok, label, extra) => { console.log((ok ? 'PASS ' : 'FAIL ') + label + (extra != null ? '  ' + extra : '')); if (!ok) fail++; };
console.log('\n===== VERDICTS =====');
for (const { vp, r } of results) {
  console.log('\n-- ' + vp.name + '  -> .shots/daily_' + vp.name + '.png');
  const a = r.s1_show.state;
  P(a.open, 'streakPill 点开 #dailyModal (show + aria-hidden=false)');
  P(a.nCells === 7, '7 天格', 'nCells=' + a.nCells);
  P(/已累计打卡 1 天/.test(a.sub), '副标题 已累计打卡 1 天（老存档没有 total，拿 streak 当起点）', JSON.stringify(a.sub));
  P(a.cycle === 1 && a.nSigned === 0 && a.nToday === 1 && a.nClaimable === 1 && a.nGift === 1,
    'streak1: cycle1/0签/今日高亮/可领/第7天礼盒', JSON.stringify([a.cycle, a.nSigned, a.nToday, a.nClaimable, a.nGift]));
  P(a.btnText === '领取：5 星币' && /claimDaily/.test(a.btnOnclick) && !a.btnDisabled, '可领按钮=领取：5 星币（第 1 天奖品）', JSON.stringify(a.btnText));
  P(a.dotOn === true && a.pillShown === true, '可领时 pill 红点亮 + pill 显示');
  P(!r.s1_show.emojiInWeek, 'week 格无 emoji (全内联 SVG)');
  P(Array.isArray(r.s1_show.danglingUse) && r.s1_show.danglingUse.length === 0, '全 <use> 可解析 (含 #i-gift/#i-check)', JSON.stringify(r.s1_show.danglingUse));
  P(r.s1_show.bannedTokens === null, '无 Chrome-91 禁用 token', JSON.stringify(r.s1_show.bannedTokens));
  P(r.s1_show.nIconBtns === 4, '顶栏仍 4 钮 (不加第 5 钮)', 'nIconBtns=' + r.s1_show.nIconBtns);
  P(!r.s1_show.jsErr, '无 JS 错误', JSON.stringify(r.s1_show.jsErr));
  // 领取第 1 天 +5 + 幂等
  const b = r.s1_claim;
  P(b.before.coins === 50 && b.after1.coins === 55, '领第 1 天 +5 币 (50→55)', JSON.stringify([b.before.coins, b.after1.coins]));
  P(b.after1.chestTotal === 1 && b.after1.claimable === false, '领后记 claimedTotal=1 + 不再可领', JSON.stringify([b.after1.chestTotal, b.after1.claimable]));
  P(b.after1.btnText === '今天已领取 ✓' && b.after1.btnDisabled === true, '领后按钮=今天已领取 ✓ 禁用', JSON.stringify(b.after1.btnText));
  P(b.after1.dotOn === false, '领后红点灭');
  P(b.after2.coins === 55, '再点 claimDaily 不多发币 (幂等, 仍 55)', 'coins=' + b.after2.coins);
  // 第 7 天大奖：30 币 + 许愿星灯；这里没领养数宝 → 摆件折 15 币（领到摆件的分支在 verify_sprint_tier 里测）
  const g = r.s7_claim;
  P(g.before.cycle === 7 && g.before.nSigned === 6 && g.before.nGift === 1, 'streak7: cycle7/6签/第7天礼盒', JSON.stringify([g.before.cycle, g.before.nSigned, g.before.nGift]));
  P(g.before.btnText === '领取第 7 天大奖：30 星币 + 许愿星灯', '第7天按钮=领取第 7 天大奖：30 星币 + 许愿星灯', JSON.stringify(g.before.btnText));
  P(g.before.coins === 0 && g.after1.coins === 45, '第7天未领养 → 30 + 15 折币 = 45 (0→45)', JSON.stringify([g.before.coins, g.after1.coins]));
  P(g.after2.coins === 45, '第7天再点不多发 (幂等, 仍 45)', 'coins=' + g.after2.coins);
  // 已领态：今天这格也盖上 ✓
  const c = r.s3_claimed.state;
  P(c.cycle === 3 && c.nSigned === 3 && c.claimable === false, 'streak3 已领: cycle3/3签(含今天)/不可领', JSON.stringify([c.cycle, c.nSigned, c.claimable]));
  P(c.btnText === '今天已领取 ✓' && c.btnDisabled === true && c.dotOn === false, '已领态按钮禁用 + 红点灭', JSON.stringify(c.btnText));
  // 未完成任务态
  const d = r.s_notdone.state;
  P(d.btnText === '先完成一分钟速算' && /startSprint/.test(d.btnOnclick), '未完成任务按钮=先完成一分钟速算 → startSprint', JSON.stringify(d.btnText));
  P(d.claimable === false && d.dotOn === false, '未完成任务不可领 + 无红点');
  // 自动弹让位 / 自动弹
  P(r.s_yield.state.open === false, '让位: 大结局占屏时 maybeShowDaily 不弹');
  P(r.s_auto.state.open === true, '自动弹: 无占屏且可领时 maybeShowDaily 弹出日历');

  // 跨零点：昨天打完没领，今天才进菜单 —— 补得上，不要求是今天打的卡
  const x = r.s_cross.seq, rawN = s => { try { return JSON.parse(s).claimedTotal; } catch (e) { return null; } };
  P(x[0].claimable && x[0].owed === 1 && x[0].dotOn === true, '跨零点: 昨天的宝箱今天仍可领 + 红点亮', JSON.stringify([x[0].claimable, x[0].owed, x[0].dotOn]));
  P(/^补领：7 星币 \+ /.test(x[0].btnText) && /claimDaily/.test(x[0].btnOnclick), '跨零点: 按钮=补领第 3 天奖品（7 星币 + 摆件）', JSON.stringify(x[0].btnText));
  P(x[0].nSigned === 2 && x[0].nClaimable === 1 && x[0].nToday === 0, '跨零点: 日历前 2 天盖章、第 3 天可领、没有"今天"高亮', JSON.stringify([x[0].nSigned, x[0].nClaimable, x[0].nToday]));
  P(/已累计打卡 3 天，之前的宝箱还有 1 份没领/.test(x[0].sub), '跨零点: 副标题提示之前还有 1 份没领', JSON.stringify(x[0].sub));
  P(x[1].coins === 22 && x[1].chestTotal === 3 && x[1].claimable === false && x[1].dotOn === false, '跨零点: 补领 7 + 摆件折 15 = 22 币，记 3，红点灭', JSON.stringify([x[1].coins, x[1].chestTotal, x[1].claimable, x[1].dotOn]));
  P(x[1].btnText === '先完成一分钟速算' && /startSprint/.test(x[1].btnOnclick) && x[1].sub === '已累计打卡 3 天', '跨零点: 领完回到"先完成一分钟速算"', JSON.stringify([x[1].btnText, x[1].sub]));
  P(x[2].coins === 22 && x[2].chestTotal === 3, '跨零点: 再点不多发（幂等）', JSON.stringify([x[2].coins, x[2].chestTotal]));
  P(r.s_crossauto.state.open === true, '跨零点: 今天还没打卡也会自动弹日历补领');

  // 攒了三份：按顺序一份一份领（D3 → D4 → D5），每次点一下只给一份
  const k = r.s_backlog.seq;
  P(k[0].owed === 3 && /还有 2 份没领/.test(k[0].sub) && /^补领：7 星币/.test(k[0].btnText) && k[0].nSigned === 2 && k[0].nToday === 0,
    '欠三份: 先补第 3 天（nSigned 2、提示还有 2 份）', JSON.stringify([k[0].owed, k[0].sub, k[0].btnText, k[0].nSigned, k[0].nToday]));
  P(k[1].coins === 22 && k[1].chestTotal === 3 && k[1].owed === 2 && k[1].btnText === '补领：8 星币' && /还有 1 份没领/.test(k[1].sub),
    '领一次只给一份: D3=22 币(含摆件折币)，下一份是 D4 8 币', JSON.stringify([k[1].coins, k[1].chestTotal, k[1].owed, k[1].btnText, k[1].sub]));
  P(k[2].coins === 30 && k[2].chestTotal === 4 && /^领取：10 星币 \+ /.test(k[2].btnText) && !/之前/.test(k[2].sub) && k[2].nToday === 1 && k[2].nSigned === 4,
    '到了今天这份: 按钮改回"领取"，D5 高亮，副标题不再提欠款', JSON.stringify([k[2].coins, k[2].chestTotal, k[2].btnText, k[2].sub, k[2].nToday, k[2].nSigned]));
  P(k[3].coins === 55 && k[3].chestTotal === 5 && k[3].btnText === '今天已领取 ✓' && k[3].btnDisabled === true && k[3].dotOn === false && k[3].nSigned === 5,
    '三份领完: 共 7+15+8+10+15=55 币，按钮"今天已领取 ✓"禁用，红点灭', JSON.stringify([k[3].coins, k[3].chestTotal, k[3].btnText, k[3].dotOn, k[3].nSigned]));
  P(k[4].coins === 55 && k[4].chestTotal === 5, '领完再点不多发（幂等）', JSON.stringify([k[4].coins, k[4].chestTotal]));

  // 欠的跨了一轮：第 7 天大奖在前、下一轮第 1 天在后
  const w = r.s_wrap.seq;
  P(/^补领第 7 天大奖：30 星币 \+ /.test(w[0].btnText) && w[0].nSigned === 6 && w[0].nGift === 1 && w[0].owed === 2, '跨一轮: 先补第 7 天大奖', JSON.stringify([w[0].btnText, w[0].nSigned, w[0].owed]));
  P(w[1].coins === 45 && w[1].btnText === '补领：5 星币' && w[1].nSigned === 0 && w[1].nClaimable === 1, '跨一轮: 领完大奖(30+15)后换到下一轮第 1 天(5 币)', JSON.stringify([w[1].coins, w[1].btnText, w[1].nSigned, w[1].nClaimable]));
  P(w[2].coins === 50 && w[2].chestTotal === 8 && w[2].btnText === '先完成一分钟速算', '跨一轮: 两份领完共 50 币', JSON.stringify([w[2].coins, w[2].chestTotal, w[2].btnText]));

  // 旧存档迁移 + 坏值 + 全新设备
  const ld = r.s_leg_done.state, lo = r.s_leg_owe.state, cr = r.s_corrupt.state, fr = r.s_fresh.state;
  P(ld.claimable === false && ld.chestTotal === 2 && rawN(ld.raw) === 2, '旧存档(最后一天已领): 不欠，落成 claimedTotal=2', JSON.stringify([ld.claimable, ld.chestTotal, ld.raw]));
  P(lo.claimable === true && lo.owed === 1 && lo.chestTotal === 1 && rawN(lo.raw) === 1 && /^补领：6 星币/.test(lo.btnText), '旧存档(最后一天没领): 补一份(第 2 天 6 币)，落成 claimedTotal=1', JSON.stringify([lo.claimable, lo.owed, lo.raw, lo.btnText]));
  P(cr.claimable === false && cr.chestTotal === 2 && rawN(cr.raw) === 2, '坏值 claimedTotal=99 > 累计 2: 夹回 2 并落盘，不会让以后的打卡领不到', JSON.stringify([cr.claimable, cr.chestTotal, cr.raw]));
  P(fr.raw === null && fr.claimable === false && /已累计打卡 0 天/.test(fr.sub), '全新设备: 读宝箱不写存档(key 不出现)', JSON.stringify([fr.raw, fr.claimable, fr.sub]));
}
console.log('\n===== ' + (fail === 0 ? 'ALL PASS' : fail + ' FAILURE(S)') + ' =====');
if (snap !== null) await send('Runtime.evaluate', { expression: `(() => { const s = JSON.parse(${JSON.stringify(snap)}); localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); return 1; })()`, returnByValue: true }, sessionId);
await send('Target.closeTarget', { targetId });
ws.close();
process.exit(fail === 0 ? 0 : 1);
