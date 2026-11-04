// 三期 P3-a/P3-b：一分钟速算 + 每日任务/连续天数，本地 Chrome :9333 / 静态服 :8000。
// 守的是「代码读起来对、跑起来悄悄错」的那几处：
//   1) 速算复用的是 BattleGame，而 BATTLE_TOTAL/BATTLE_TIME 这两个常量原本被 14 处直接读。
//      改成实例字段(this.total/this.time)之后，只要漏改一处，第 6 关（巅峰对决）和速算局就会互相串味
//      —— 比如速算局在第 20 题突然「打死 BOSS 过关」，或者第 6 关变成 60 秒。所以两种局都量。
//   2) 速算局 level=0，星星/最佳/解锁/影子对手档位一个都不能写。写坏了不可逆（没有 git，
//      localStorage 里就是孩子真实的进度）。
//   3) 速算永远赢不了（总题数够不到），所以 win 恒 false。结算卡若按 win 分叉，答对 15 题
//      也会挂失败奖牌 + 「没打败怪兽」—— 这里断的是孩子真正看见的那几行字。
//   4) 连续天数只比 YYYY-MM-DD 字符串。用 (now-last)/86400000 算过一次，结果是「昨晚 23:50」
//      和「今早 8:00」算成同一天；这里按昨天/今天/前天/空/坏值五条分支各走一遍。
//   5) 两种 level=0 的局（错题重练 / 速算）不许互相捡对方的 sessionStorage 残留。
import { mkdirSync, writeFileSync } from 'fs';
const CDP = 'http://localhost:9333';
const info = await (await fetch(CDP + '/json')).json();
const page = info.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || info[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p) => { const id = ++_id; return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify({ id, method: m, params: p || {} })); }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true });
  if (r.exceptionDetails) throw new Error('EVAL: ' + ((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text));
  return r.result.value;
};
await send('Page.enable'); await send('Runtime.enable');
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });  // 新脚本一律禁缓存
mkdirSync('.shots/out', { recursive: true });
let fail = 0; const P = (ok, l, x) => { console.log((ok ? '  PASS ' : '  FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
const MENU = 'http://localhost:8000/menu.html';
const GAME = 'http://localhost:8000/index.html';
await send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 576, deviceScaleFactor: 1, mobile: false });

const WIPE = `['mathgameSprintBest','mathgameDaily','mathgameStars','mathgameBest',
  'mathgameMaxCompletedLevel','mathgamePace','mathgameWrongLog','mathgameRankSeen']
  .forEach(k => localStorage.removeItem(k)); 1`;
// 本地日历日，和菜单/游戏页里那两份 mgDayStr 必须算出同一个字符串
const DAY = `(off => { const d = new Date(); d.setDate(d.getDate() - off);
  const p = n => (n < 10 ? '0' : '') + n;
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); })`;

async function bootMenu(seed) {
  await send('Page.navigate', { url: MENU }); await sleep(500);
  await ev(WIPE);
  if (seed) await ev(seed);
  await send('Page.reload'); await sleep(800);
  return ev(`window.__errs=[];addEventListener('error',e=>window.__errs.push(String(e.message)));1`);
}
// 速算局：直接灌 sessionStorage.mgSprint（菜单那条点击路径在第 1 组验过）。
// **每次先 WIPE**：不擦的话上一组造的纪录/打卡会漏到下一组，断言跟着一起变味
// （第一版就被咬过：「0 题不写纪录」拿到的是前一组留下的 20 题纪录，假失败）。
async function bootSprint(pre) {
  await send('Page.navigate', { url: GAME }); await sleep(400);
  await ev(WIPE);
  await ev(`sessionStorage.setItem('gameLevel','0');sessionStorage.setItem('gameMode','visual');
    sessionStorage.setItem('mgSprint','1');` + (pre || '') + `1`);
  await send('Page.reload'); await sleep(900);
  await ev(`window.__errs=[];addEventListener('error',e=>window.__errs.push(String(e.message)));1`);
  await ev(`window._skipOcrLoading && window._skipOcrLoading();`);
  for (let i = 0; i < 30; i++) { if (await ev(`!!window._currentGame`)) { await sleep(500); return true; } await sleep(400); }
  return false;
}
async function bootLevel(lv, pre) {
  await send('Page.navigate', { url: GAME }); await sleep(400);
  await ev(WIPE);
  await ev(`sessionStorage.setItem('gameLevel','${lv}');sessionStorage.setItem('gameMode','visual');
    sessionStorage.removeItem('mgSprint');` + (pre || '') + `1`);
  await send('Page.reload'); await sleep(900);
  await ev(`window.__errs=[];addEventListener('error',e=>window.__errs.push(String(e.message)));1`);
  await ev(`window._skipOcrLoading && window._skipOcrLoading();`);
  for (let i = 0; i < 30; i++) { if (await ev(`!!window._currentGame`)) { await sleep(500); return true; } await sleep(400); }
  return false;
}
// 结算：先把答对数/统计摆成想要的样子，再强制收场。
// 速算局的真实结局只有「时间到」(win=false)，所以这里一律传 false —— 传 true 就不是在验产品了。
const endSprint = (score) => ev(`(() => { const g = window._currentGame;
  g.playerScore = ${score}; _mgCorrect = ${score}; _mgWrong = 1; _mgMaxStreak = ${Math.min(score, 7)};
  _mgRoundStart = Date.now() - 60000; debugEndGame(false); return 1; })()`);
const OVER = `(() => {
  const chips = [...document.querySelectorAll('#overlay-stats .ov-chip')].map(c => c.textContent.replace(/\\s+/g, ' ').trim());
  const stars = document.getElementById('overlay-stars');
  const ot = document.getElementById('overlay-title');
  return { title: ot.textContent, titleClass: ot.className,
    msg: document.getElementById('overlay-msg').innerText.replace(/\\n/g, ' | '),
    sub: document.getElementById('overlay-sub').textContent,
    rec: document.getElementById('overlay-rec').innerText.replace(/\\s+/g, ' ').trim(),
    recBadge: !!document.querySelector('#overlay-rec .rbg'), recNear: !!document.querySelector('#overlay-rec .nbx'),
    ribbon: (document.querySelector('#overlay-rec .ribbon') || {}).textContent || '',
    retry: document.getElementById('retry-btn').textContent.replace(/\\s+/g, ' ').trim(),
    chips: chips, starsShown: getComputedStyle(stars).display !== 'none', starsHtml: stars.innerHTML.length,
    nextShown: getComputedStyle(document.getElementById('next-level-btn')).display !== 'none',
    best: localStorage.getItem('mathgameSprintBest'), daily: localStorage.getItem('mathgameDaily'),
    stars_: localStorage.getItem('mathgameStars'), maxLv: localStorage.getItem('mathgameMaxCompletedLevel'),
    bestT: localStorage.getItem('mathgameBest'), pace: localStorage.getItem('mathgamePace'),
    errs: window.__errs || [] }; })()`;

// ======== 1. 菜单入口：pill 在屏内、点一下带着正确的 sessionStorage 跳过去 ========
console.log('\n######## 1. 菜单速算入口 ########');
await bootMenu();
let m = await ev(`(() => { const p = document.getElementById('sprintPill'), c = document.querySelector('.cta');
  const pr = p.getBoundingClientRect(), cr = c.getBoundingClientRect();
  const sc = document.getElementById('menuScreen');
  return { text: p.textContent.replace(/\\s+/g, ' ').trim(), meta: document.getElementById('sprintPillMeta').textContent,
    belowCta: pr.top >= cr.bottom - 0.5, centered: Math.abs((pr.left + pr.right) / 2 - innerWidth / 2) < 2,
    inScreen: pr.bottom <= innerHeight + 0.5 && pr.top >= -0.5, pillBottom: Math.round(pr.bottom), ih: innerHeight,
    gap: Math.round(pr.top - cr.bottom), scrollDelta: sc.scrollHeight - sc.clientHeight,
    streakShown: document.getElementById('streakPill').classList.contains('show'),
    nIconBtns: document.querySelectorAll('.topbar-actions .icon-btn').length,
    badgeBeforeBook: document.querySelector('.profile-badge').getBoundingClientRect().right
      < document.querySelectorAll('.topbar-actions .icon-btn')[0].getBoundingClientRect().left,
    errs: window.__errs || [] }; })()`);
P(/一分钟速算/.test(m.text), 'CTA 下方有「⚡ 一分钟速算」pill', JSON.stringify(m.text));
P(m.belowCta && m.centered, 'pill 在 CTA 正下方居中（不进 5 张岛卡网格）', 'gap=' + m.gap);
P(m.inScreen && m.scrollDelta <= 1, '1000×576 下 pill 完整在屏内且菜单不滚动',
  'pillBottom=' + m.pillBottom + '/' + m.ih + ' scrollDelta=' + m.scrollDelta);
P(m.meta === '今天可得 5 星币', '没打卡没存档 → 「今天可得 5 星币」（第 1 天的奖品）', JSON.stringify(m.meta));
P(!m.streakShown, '累计天数为 0 → 🔥 pill 整块不出现', String(m.streakShown));
P(m.nIconBtns === 4 && m.badgeBeforeBook, '顶栏是 4 个圆钮（萌宠/错题/图鉴/齿轮）、徽章在它们左边（没把 🔥 做成额外的钮）');
P(m.errs.length === 0, '无 JS 错误', JSON.stringify(m.errs));
let shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('.shots/out/sprint_menu_fresh.png', Buffer.from(shot.data, 'base64'));

// 先把「带什么过去」验干净：临时替掉唯一的跳转出口，当场读 sessionStorage，不用真跳一趟。
const handoff = await ev(`(() => { const old = mgGoGame; let jumped = false; mgGoGame = () => { jumped = true; };
  setMode('audio'); sessionStorage.removeItem('mgSprint');
  try { startSprint(); } finally { mgGoGame = old; }
  return { jumped, sprint: sessionStorage.getItem('mgSprint'), lv: sessionStorage.getItem('gameLevel'),
    mode: sessionStorage.getItem('gameMode'), practice: sessionStorage.getItem('mgPractice') }; })()`);
P(handoff.jumped, 'startSprint 走的是 mgGoGame（没有自己写第 2 个跳转点，孪生不变量靠这条）');
P(handoff.sprint === '1' && handoff.lv === '0' && handoff.mode === 'audio',
  '带着 mgSprint=1 / gameLevel=0 / 菜单上当前选的模式过去', JSON.stringify(handoff));
P(handoff.practice === null, '不夹带错题重练的钥匙', String(handoff.practice));

// 再真点一次（视算，本地没麦克风），确认这一下点击真的开出了速算局。
await bootMenu();
await ev(`document.getElementById('sprintPill').click();1`); await sleep(1200);
for (let i = 0; i < 30; i++) { if (await ev(`!!window._currentGame`)) { await sleep(500); break; } await sleep(400); }
let st = await ev(`(() => { const g = window._currentGame || {};
  return { url: location.pathname, lv: sessionStorage.getItem('gameLevel'), flag: _mgSprint,
    engine: g.constructor && g.constructor.name, sprint: !!g.sprint, glv: g.level }; })()`);
P(/index\.html$/.test(st.url), '点 pill 跳到游戏页', st.url);
P(st.flag === true && st.engine === 'BattleGame' && st.sprint === true,
  '菜单这一下点击真的开出了速算局（而不是普通闯关局）', st.engine + ' sprint=' + st.sprint);
P(st.glv === 0, '关卡号传 0（星星/解锁都写不进去）', 'game.level=' + st.glv);

// ======== 2. 三个旋钮真的只拧在速算局上（第 6 关一个字不变）========
console.log('\n######## 2. 速算 60 秒 / 总题数够不到 / 第 6 关不受影响 ########');
P(await bootSprint(), '速算局已构造');
let g = await ev(`(() => { const g = window._currentGame;
  return { engine: g.constructor.name, lv: g.level, sprint: g.sprint, total: g.total, time: g.time,
    timeLeft: g.timeLeft, hp: g.monsterHP, flag: _mgSprint, practice: _mgPractice,
    cd: document.getElementById('battle-countdown').textContent,
    score: document.getElementById('battle-score-num').textContent,
    hpLabel: document.getElementById('monster-hp-label').textContent.replace(/\\s+/g, ' ').trim(),
    hpText: document.getElementById('monster-hp-text').textContent,
    hpCls: document.getElementById('monster-hp-container').className,
    hpTextShown: getComputedStyle(document.getElementById('monster-hp-text')).display !== 'none',
    pin: !!document.querySelector('#monster-hp-container .sr-pin'), zone: !!document.querySelector('#monster-hp-container .sr-zone'),
    ground: document.getElementById('battle-ground-label').textContent,
    key: sessionStorage.getItem('mgSprint'), errs: window.__errs || [] }; })()`);
P(g.engine === 'BattleGame' && g.sprint === true && g.flag === true, '走的是 BattleGame + sprint 开关', g.engine);
P(g.lv === 0, '速算局 level=0（星星/解锁/档位的三个写入口都要靠它拦）', String(g.lv));
P(g.time === 60 && g.timeLeft === 60 && g.cd === '60', '60 秒（不是 90）', 'time=' + g.time + ' cd=' + g.cd);
P(g.total === 99, '总题数 99 —— 60 秒内够不到，于是「打死 BOSS」这条胜利线失效', String(g.total));
P(g.score === '0', '读数是纯答对数（不是 0/20）', JSON.stringify(g.score));
P(/\bsr\b/.test(g.hpCls) && /答对 0 题/.test(g.hpLabel) && /一分钟速算/.test(g.ground), '血条换成「纪录条」（.sr）+ 场地标题写速算',
  JSON.stringify(g.hpLabel) + ' ' + JSON.stringify(g.ground) + ' ' + g.hpCls);
P(/还差 10 题，立个纪录/.test(g.hpLabel) && g.pin && g.zone && !g.hpTextShown,
  '没纪录时旗插在 10 题处、写「还差 10 题，立个纪录」；旧的数字读数 #monster-hp-text 收起', JSON.stringify([g.hpLabel, g.pin, g.zone, g.hpTextShown]));
P(g.practice === false, '速算局不是练习局（mgMasterWrong 不会误消账错题）', String(g.practice));
P(g.key === null, 'mgSprint 读完即焚（刷新一次不会把闯关局变成速算局）', String(g.key));
P(g.errs.length === 0, '无 JS 错误', JSON.stringify(g.errs));
shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('.shots/out/sprint_arena.png', Buffer.from(shot.data, 'base64'));

P(await bootLevel(6), '第 6 关已构造');
let l6 = await ev(`(() => { const g = window._currentGame;
  return { sprint: g.sprint, lv: g.level, total: g.total, time: g.time, hp: g.monsterHP,
    cd: document.getElementById('battle-countdown').textContent,
    score: document.getElementById('battle-score-num').textContent,
    hpLabel: document.getElementById('monster-hp-label').textContent,
    hpText: document.getElementById('monster-hp-text').textContent,
    ground: document.getElementById('battle-ground-label').textContent, errs: window.__errs || [] }; })()`);
P(l6.sprint === false && l6.lv === 6 && l6.total === 20 && l6.time === 90,
  '第 6 关还是 20 题 / 90 秒 / level 6（常量没被改掉）', JSON.stringify([l6.total, l6.time]));
P(l6.cd === '90' && l6.score === '0/20' && l6.hpText === '0/20' && /欢迎灯/.test(l6.hpLabel) && /萤火小屋/.test(l6.ground),
  '第 6 关的读数/标题（标签已改「欢迎灯/萤火小屋」、进度条改答对填充从 0/20 起）', JSON.stringify([l6.cd, l6.score, l6.hpText, l6.hpLabel, l6.ground]));
P(l6.errs.length === 0, '无 JS 错误', JSON.stringify(l6.errs));

// ======== 3. 题目来自孩子自己那一关（不是一上来就四则混合）========
console.log('\n######## 3. 出题跟着已解锁的最高关走 ########');
const ops = (n) => ev(`(() => { const g = window._currentGame; const c = {};
  for (let i = 0; i < ${n}; i++) { const q = g.gen(); c[q.op] = (c[q.op] || 0) + 1; }
  return { lv: g.sprintLv, ops: Object.keys(c).sort().join(''), sample: g.currentExpr,
    maxA: (() => { let mx = 0; for (let i = 0; i < 3000; i++) mx = Math.max(mx, g.gen().answer); return mx; })() }; })()`);
// 速算题固定取第 1 关（10 以内加减）——给低龄孩子也能玩；通关进度（含坏值）都不改难度。
for (const done of [0, 1, 2, 3, 5, 6]) {
  P(await bootSprint(`localStorage.setItem('mathgameMaxCompletedLevel','${done}');`), '通关 ' + done + ' 关后开速算');
  const o = await ops(400);
  P(o.lv === 1, '题目永远取第 1 关的生成器（通关 ' + done + ' 关也不加难）', 'sprintLv=' + o.lv);
  P(o.ops.split('').sort().join('') === '+−'.split('').sort().join(''), '运算符只有 + −', o.ops + ' e.g. ' + o.sample);
  P(o.maxA <= 10, '答案不超过 10（学龄前也能做）', 'max=' + o.maxA);
}
P(await bootSprint(`localStorage.setItem('mathgameMaxCompletedLevel','not a number');`), '坏的解锁值也能开速算');
P((await ops(50)).lv === 1, '解锁值坏了 → 仍是第 1 关（不崩）');

// ======== 4. 倒计时真的在走（真定时器，不打桩）========
// 本地这一条量的是「接线对 + 延迟是个正常数」：若 timeLeft 从 this.time 读成了 undefined，
// 页面上会显示 NaN 并且一秒就归零，而代码读起来完全正常。
console.log('\n######## 4. 倒计时真的在走 ########');
P(await bootSprint(), '速算局已构造');
// 先等 3-2-1 开场放完、倒计时真正开跑再采样 —— 否则在 TTS「闯关马上开始」+3-2-1 还没落定时读，
// timeLeft 一直是满的（_countdownActive 冻结中），3.4 秒窗口会踩在开跑边界上假失败。
for (let i = 0; i < 40; i++) {
  if (await ev(`!!(window._currentGame && window._currentGame.countdownInterval && window._currentGame._countdownActive === false)`)) break;
  await sleep(300);
}
const t0 = await ev(`(() => ({ left: window._currentGame.timeLeft, cd: document.getElementById('battle-countdown').textContent }))()`);
await sleep(2400);
const t1 = await ev(`(() => ({ left: window._currentGame.timeLeft, cd: document.getElementById('battle-countdown').textContent,
  ended: !!window._currentGame.gameEnded, errs: window.__errs || [] }))()`);
P(t1.left < t0.left, '倒计时开跑后数字真的变小了', t0.left + ' → ' + t1.left);
P(t0.left - t1.left <= 5 && !t1.ended, '也没有一秒清零（延迟不是 NaN/0）', '走了 ' + (t0.left - t1.left) + ' 秒');
P(String(t1.cd) === String(t1.left) && !/NaN/.test(String(t1.cd)), '屏上数字和内部状态一致', JSON.stringify(t1.cd));

// ======== 5. 结算卡：答对 N 题 / 没有星星 / 进度一个字没写 ========
console.log('\n######## 5. 第一局结算 ########');
P(await bootSprint(`localStorage.setItem('mathgameStars', JSON.stringify({1:3}));
  localStorage.setItem('mathgameMaxCompletedLevel','2');localStorage.setItem('mathgameBest','{"1":{"t":30}}');`),
  '速算局已构造（带着已有进度）');
await endSprint(14); await sleep(1200);
let o = await ev(OVER);
P(o.title === '时间到！' && o.titleClass === 'win',
  '结算标题「时间到！」且按正面收场（速算 win 恒 false，不能照 win 分叉）', o.title + ' .' + o.titleClass);
P(/60 秒答对 14 题/.test(o.msg), '正文报的是答对题数', JSON.stringify(o.msg));
P(o.recBadge && o.ribbon === '第一个纪录' && /你的纪录 14 ?题/.test(o.rec),
  '第一次玩亮金徽章「第一个纪录 · 14 题」（不叫破纪录）', JSON.stringify([o.ribbon, o.rec]));
P(/今天的速算练完啦/.test(o.msg), '正文是「今天的速算练完啦」', JSON.stringify(o.msg));
P(o.retry === '再来一局！', '第一局按钮就是「再来一局！」（还没有纪录可破）', o.retry);
P(o.chips.some(c => /答对 14 题/.test(c)), '头把 chip = 答对 14 题', JSON.stringify(o.chips));
P(!o.chips.some(c => /秒/.test(c) && !/答对/.test(c)), '不挂「60 秒」chip（固定时长，说了是废话）', JSON.stringify(o.chips));
P(!o.chips.some(c => /新纪录/.test(c)), '第一局不挂「新纪录」角标（跟 newBestTime 同一个口径）', JSON.stringify(o.chips));
P(!o.starsShown, '星星那一排整块收起（星星是某一关的货币，速算不属于任何一关）', String(o.starsShown));
P(!o.nextShown, '不给「挑战下一关」', String(o.nextShown));
P(o.best === '{"best":14,"t":' + JSON.parse(o.best || '{}').t + '}' && JSON.parse(o.best).best === 14,
  '纪录写进 mathgameSprintBest', o.best);
P(o.stars_ === '{"1":3}' && o.maxLv === '2' && o.bestT === '{"1":{"t":30}}' && o.pace === null,
  '星星/解锁/最佳/影子对手档位一个字都没动', JSON.stringify([o.stars_, o.maxLv, o.bestT, o.pace]));
P(o.errs.length === 0, '无 JS 错误', JSON.stringify(o.errs));
shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('.shots/out/sprint_result_first.png', Buffer.from(shot.data, 'base64'));

console.log('\n######## 6. 破纪录 / 没追上 / 一题都没对 ########');
P(await bootSprint(`localStorage.setItem('mathgameSprintBest','{"best":14,"t":1}');`), '带着 14 题的纪录');
await endSprint(20); await sleep(1200);
o = await ev(OVER);
P(o.recBadge && o.ribbon === '新纪录' && /14 ?→ ?20 ?题/.test(o.rec) && o.chips.some(c => /答对 20 题/.test(c) && /新纪录/.test(c)),
  '超过旧纪录 → 金徽章「新纪录 · 14→20 题」+ 新纪录角标', JSON.stringify([o.ribbon, o.rec]) + ' ' + JSON.stringify(o.chips));
P(o.retry === '再来一局！', '破了纪录 → 按钮「再来一局！」', o.retry);
P(JSON.parse(o.best).best === 20, '纪录刷新到 20', o.best);
shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('.shots/out/sprint_result_record.png', Buffer.from(shot.data, 'base64'));

P(await bootSprint(`localStorage.setItem('mathgameSprintBest','{"best":20,"t":1}');`), '带着 20 题的纪录');
await endSprint(11); await sleep(1200);
o = await ev(OVER);
P(o.recNear && !o.recBadge && /纪录 20 ?题/.test(o.rec) && /离纪录还差 ?10 ?题/.test(o.rec) && /再冲一次/.test(o.rec),
  '没追上 → 小进度框报出「纪录 20 题 / 离纪录还差 10 题，再冲一次！」（不说「失败」）', JSON.stringify(o.rec));
P(o.retry === '再冲一次，破纪录！', '没追上 → 按钮「再冲一次，破纪录！」', o.retry);
P(JSON.parse(o.best).best === 20, '没破就不覆盖纪录', o.best);
P(o.title === '时间到！' && o.titleClass === 'win', '答对 11 题仍是正面结算', o.title + ' .' + o.titleClass);

P(await bootSprint(), '新机器开速算');
await endSprint(0); await sleep(1200);
o = await ev(OVER);
P(o.titleClass === 'lose' && /一道都没答对/.test(o.msg) && /慢一点也没关系/.test(o.msg),
  '一题都没对 → 唯一的负面分支，文案仍然不责备', JSON.stringify(o.msg));
P(o.best === null, '0 题不写纪录', String(o.best));
P(/今天的速算练完啦/.test(o.msg), '0 题也盖章（「今天练了」是习惯不是成绩）', JSON.stringify(o.msg));

// ======== 7. 每日打卡：昨天 / 今天 / 前天 / 空 / 坏值 ========
console.log('\n######## 7. 连续天数五条分支 + 累计天数 ########');
for (const [label, seed, wantStreak, wantBest, wantTotal] of [
  ['空（第一次玩）', '', 1, 1, 1],
  ['昨天来过 → 接上（老存档无 total，拿连签当起点）', `localStorage.setItem('mathgameDaily', JSON.stringify({last:${DAY}(1),streak:4,bestStreak:4}));`, 5, 5, 5],
  ['今天已盖章 → 天数不动', `localStorage.setItem('mathgameDaily', JSON.stringify({last:${DAY}(0),streak:3,bestStreak:9}));`, 3, 9, 3],
  ['前天（断了） → 连签从 1 重来，累计照样 +1', `localStorage.setItem('mathgameDaily', JSON.stringify({last:${DAY}(2),streak:30,bestStreak:30,total:40}));`, 1, 30, 41],
  ['坏值（不是 JSON）', `localStorage.setItem('mathgameDaily','{not json');`, 1, 1, 1],
  ['坏值（数组）', `localStorage.setItem('mathgameDaily','[1,2]');`, 1, 1, 1],
  ['坏值（streak 是字符串）', `localStorage.setItem('mathgameDaily', JSON.stringify({last:${DAY}(1),streak:'x'}));`, 1, 1, 1],
]) {
  P(await bootSprint(seed), '开速算：' + label);
  await endSprint(6); await sleep(1100);
  const d = await ev(`(() => { const o = JSON.parse(localStorage.getItem('mathgameDaily') || 'null');
    return { o, today: ${DAY}(0), msg: document.getElementById('overlay-msg').innerText, errs: window.__errs || [] }; })()`);
  P(!!d.o && d.o.last === d.today, '盖上今天的章', JSON.stringify(d.o));
  P(d.o && d.o.streak === wantStreak, '连续天数 = ' + wantStreak, 'streak=' + (d.o || {}).streak);
  P(d.o && d.o.bestStreak === wantBest, '最长记录 = ' + wantBest, 'bestStreak=' + (d.o || {}).bestStreak);
  P(d.o && d.o.total === wantTotal, '累计天数 = ' + wantTotal, 'total=' + (d.o || {}).total);
  P(d.msg.includes('累计打卡 ' + wantTotal + ' 天') && !/连续/.test(d.msg),
    '正文报「累计打卡 ' + wantTotal + ' 天」、不再报连续天数', JSON.stringify(d.msg));
  P(!/中断|可惜|别忘|坚持不下去/.test(d.msg),
    '断签不说一个字挽留（低龄产品不拿损失厌恶做留存）');
  P(d.errs.length === 0, '无 JS 错误', JSON.stringify(d.errs));
}

// 系统日期被拨回过（存档里的 last 比今天还晚）：这一局不累计、不改存档，免得来回拨日期无限刷打卡。
console.log('\n######## 7b. last 在未来：不累计、存档原样 ########');
const FUT_SEED = `localStorage.setItem('mathgameDaily', JSON.stringify({last:${DAY}(-1),streak:4,bestStreak:6,total:12}));`;
P(await bootSprint(FUT_SEED), '开速算：存档里的 last 是明天');
const futBefore = await ev(`localStorage.getItem('mathgameDaily')`);
await endSprint(6); await sleep(1100);
const fut = await ev(`(() => ({ raw: localStorage.getItem('mathgameDaily'), msg: document.getElementById('overlay-msg').innerText, errs: window.__errs || [] }))()`);
P(futBefore !== null && fut.raw === futBefore, '存档原样不动（天数 / last 都没变）', fut.raw);
P(fut.msg.includes('累计打卡 12 天') && !fut.msg.includes('13'), '结算卡仍报累计 12 天，没有 +1', JSON.stringify(fut.msg));
P(fut.errs.length === 0, '无 JS 错误', JSON.stringify(fut.errs));

// 中途退出不该盖章 ——「做了一半」不算今天练过。
console.log('\n######## 8. 中途退出不盖章 ########');
P(await bootSprint(), '速算局已构造');
await ev(`(() => { const g = window._currentGame; g.playerScore = 9;
  if (g.countdownInterval) clearInterval(g.countdownInterval); return 1; })()`);
const noStamp = await ev(`(() => ({ daily: localStorage.getItem('mathgameDaily'), best: localStorage.getItem('mathgameSprintBest') }))()`);
P(noStamp.daily === null && noStamp.best === null, '还没走到结算卡 → 既没纪录也没章', JSON.stringify(noStamp));

// ======== 9. 菜单回显：🔥 天数 + 今日已完成 ========
console.log('\n######## 9. 菜单回显 ########');
await bootMenu(`localStorage.setItem('mathgameSprintBest','{"best":23,"t":1}');
  localStorage.setItem('mathgameDaily', JSON.stringify({last:${DAY}(0),streak:6,bestStreak:6}));`);
m = await ev(`(() => { const sp = document.getElementById('streakPill'), p = document.getElementById('sprintPill');
  const sc = document.getElementById('menuScreen');
  return { streakShown: sp.classList.contains('show'), streakText: sp.textContent.replace(/\\s+/g, ' ').trim(),
    streakFlame: [...sp.querySelectorAll('use')].some(u => (u.getAttribute('href') || u.getAttribute('xlink:href') || '') === '#i-flame'),
    meta: document.getElementById('sprintPillMeta').textContent, done: p.classList.contains('done'),
    streakInBand: sp.getBoundingClientRect().right < document.querySelectorAll('.topbar-actions .icon-btn')[0].getBoundingClientRect().left,
    nIconBtns: document.querySelectorAll('.topbar-actions .icon-btn').length,
    ctaIn: document.querySelector('.cta').getBoundingClientRect().bottom <= innerHeight + 0.5,
    pillIn: p.getBoundingClientRect().bottom <= innerHeight + 0.5,
    scrollDelta: sc.scrollHeight - sc.clientHeight, errs: window.__errs || [] }; })()`);
P(m.streakShown && m.streakFlame && /6 天/.test(m.streakText), '顶栏出现 连签火焰(#i-flame SVG) 6 天', JSON.stringify([m.streakText, m.streakFlame]));
P(m.streakInBand && m.nIconBtns === 4, '连签 pill 在徽章右边、不是额外的圆钮（仍是 萌宠/错题/图鉴/齿轮 4 个）');
P(m.meta === '最高 23 题 · 再冲一次，破纪录？' && m.done,
  '今天做完了 → 「最高 23 题 · 再冲一次，破纪录？」+ 已打卡暖底', JSON.stringify(m.meta));
P(m.ctaIn && m.pillIn && m.scrollDelta <= 1, '加了 🔥 pill 之后 CTA 和速算 pill 仍在屏内、仍不滚动',
  'scrollDelta=' + m.scrollDelta);
P(m.errs.length === 0, '无 JS 错误', JSON.stringify(m.errs));
shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('.shots/out/sprint_menu_done.png', Buffer.from(shot.data, 'base64'));

await bootMenu(`localStorage.setItem('mathgameSprintBest','{"best":23,"t":1}');
  localStorage.setItem('mathgameDaily', JSON.stringify({last:${DAY}(1),streak:6,bestStreak:6}));`);
m = await ev(`(() => ({ streakShown: document.getElementById('streakPill').classList.contains('show'),
  streakText: document.getElementById('streakPill').textContent.replace(/\\s+/g, ' ').trim(),
  meta: document.getElementById('sprintPillMeta').textContent,
  done: document.getElementById('sprintPill').classList.contains('done'),
  body: document.body.innerText }))()`);
P(m.streakShown && /6 天/.test(m.streakText), '昨天来过 → pill 上还是 6 天（今天还没做）', JSON.stringify(m.streakText));
P(m.meta === '今天可得 30 星币 + 许愿星灯' && !m.done, '今天没做、累计 6 天 → 今天是一轮里的第 7 天 →「今天可得 30 星币 + 许愿星灯」', JSON.stringify(m.meta));
P(!/中断|可惜|别忘|快来|就要失去/.test(m.body), '菜单上也没有任何催促/挽留文案');

await bootMenu(`localStorage.setItem('mathgameDaily', JSON.stringify({last:${DAY}(3),streak:30,bestStreak:30,total:40}));`);
m = await ev(`(() => ({ shown: document.getElementById('streakPill').classList.contains('show'),
  num: document.getElementById('streakNum').textContent,
  meta: document.getElementById('sprintPillMeta').textContent, body: document.body.innerText }))()`);
P(m.shown && m.num === '40', '断了 3 天 → 🔥 pill 仍在、数字是累计 40（断签不清零）', 'shown=' + m.shown + ' num=' + m.num);
P(!/中断|可惜|30 天/.test(m.body), '断签不说一个字挽留、也不报旧的连签数 30', JSON.stringify(m.meta));

for (const raw of ['{not json', '[1,2]', 'null', '{"streak":-5}']) {
  await bootMenu(`localStorage.setItem('mathgameDaily', ${JSON.stringify(raw)});
    localStorage.setItem('mathgameSprintBest', ${JSON.stringify(raw)});`);
  const bad = await ev(`(() => ({ shown: document.getElementById('streakPill').classList.contains('show'),
    meta: document.getElementById('sprintPillMeta').textContent, errs: (window.__errs || []).length }))()`);
  P(!bad.shown && bad.meta === '今天可得 5 星币' && bad.errs === 0,
    '坏值 ' + raw + ' → 当没数据，菜单照样起来', JSON.stringify(bad));
}

// ======== 10. 两种 level=0 的局不互相捡残留 ========
console.log('\n######## 10. 速算 vs 错题重练（都是 level=0）########');
const WRONG = JSON.stringify([{ q: '7 × 8', a: 56, u: 9, op: '×', a2: 7, b2: 8, lv: 4, t: Date.now(), n: 2 }]);
P(await bootSprint(`sessionStorage.setItem('mgPractice', ${JSON.stringify(WRONG)});
  sessionStorage.setItem('mgPracticeOps','["×"]');localStorage.setItem('mathgameMaxCompletedLevel','0');`),
  '上一局练习的残留还在，这一局点的是速算');
let mix = await ev(`(() => { const g = window._currentGame; const c = {};
  for (let i = 0; i < 300; i++) { const q = g.gen(); c[q.op] = (c[q.op] || 0) + 1; }
  return { sprint: g.sprint, practice: _mgPractice, queue: _mgQueue, gen: !!_mgPracticeGen,
    ops: Object.keys(c).sort().join(''), pract: sessionStorage.getItem('mgPractice'),
    ops_: sessionStorage.getItem('mgPracticeOps') }; })()`);
P(mix.sprint === true && mix.practice === false && mix.queue === null && !mix.gen,
  '速算局不会被错题队列装弹', JSON.stringify([mix.practice, mix.queue, mix.gen]));
P(mix.ops === '+−', '出的是第 1 关的加减，不是上一局留下的「只出 ×」', mix.ops);
P(mix.pract === null && mix.ops_ === null, '顺手把残留的练习钥匙清掉（下一局不会再捡）');

P(await bootLevel(0, `sessionStorage.setItem('mgPractice', ${JSON.stringify(WRONG)});`), '现在点错题重练（没有 mgSprint）');
mix = await ev(`(() => { const g = window._currentGame;
  return { engine: g.constructor.name, lv: g.level, sprint: !!g.sprint, flag: _mgSprint,
    practice: _mgPractice, q: document.getElementById('question-display').textContent,
    intro: null, errs: window.__errs || [] }; })()`);
P(mix.engine === 'Game' && mix.lv === 0 && !mix.sprint && mix.flag === false,
  '练习局还是走默认 Game，没被速算劫走', mix.engine + ' sprint=' + mix.sprint);
P(/7\s*×\s*8/.test(mix.q), '第一道就是那道错题', JSON.stringify(mix.q));
P(mix.errs.length === 0, '无 JS 错误', JSON.stringify(mix.errs));

// ======== 11. 开场卡：两种 level=0 的局不能串 ========
console.log('\n######## 11. 开场卡 ########');
const intro = await ev(`(() => ({ sprint: [MG_SPRINT_INTRO.icon, MG_SPRINT_INTRO.title],
  practice: [LEVEL_INTROS[0] && LEVEL_INTROS[0].icon, LEVEL_INTROS[0] && LEVEL_INTROS[0].title],
  bg: !!LEVEL_OVERLAY_BG[6] }))()`);
P(/一分钟速算/.test(intro.sprint[1]) && intro.sprint[0] === 'i-bolt', '速算有自己的开场卡（图标是内联 SVG #i-bolt，非 emoji）', JSON.stringify(intro.sprint));
P(!/速算/.test(String(intro.practice[1])), '错题重练那一格没被速算占掉（两种局都是 level=0）', JSON.stringify(intro.practice));
P(intro.bg, '速算开场底色借第 6 关（level=0 那一格是练习局的）');

// ======== 12. 「再来一局」把两样东西都归零 ========
console.log('\n######## 12. 再来一局 ########');
P(await bootSprint(`localStorage.setItem('mathgameSprintBest','{"best":14,"t":1}');`), '带着 14 题的纪录');
await endSprint(18); await sleep(1200);
await ev(`(() => { const btn = document.getElementById('retry-btn'); if (btn) btn.click(); return !!btn; })()`);
await sleep(1200);
const again = await ev(`(() => { const g = window._currentGame;
  return { left: g.timeLeft, score: g.playerScore, best: g.sprintBest, ended: !!g.gameEnded,
    cd: document.getElementById('battle-countdown').textContent,
    num: document.getElementById('battle-score-num').textContent,
    hpLabel: document.getElementById('monster-hp-label').textContent.replace(/\\s+/g, ' ').trim(),
    pinNum: (document.querySelector('#monster-hp-container .sr-pin') || {}).textContent || '',
    width: document.getElementById('monster-hp-fill').style.width,
    shake: g.monsterShakeEnd, overlay: document.getElementById('overlay').classList.contains('show'),
    errs: window.__errs || [] }; })()`);
P(!again.overlay && !again.ended, '结算卡收起、新一局开始', 'overlay=' + again.overlay);
P(again.left >= 58 && again.left <= 60 && String(again.cd) === String(again.left),
  '倒计时从 60 重新起（不是接着上一局的秒数）', 'left=' + again.left + ' cd=' + again.cd);
P(again.score === 0 && again.num === '0', '答对数归零', JSON.stringify(again.num));
P(again.best === 18 && /还差 19 题，超过纪录/.test(again.hpLabel) && /18/.test(again.pinNum), '那根条追的是刚刷新的纪录（18，不是 14）：还差 19 题 + 旗上写 18', JSON.stringify([again.hpLabel, again.pinNum]));
P(again.width === '0%', '条从 0 格起（不是停在上一局的位置）', again.width);
P(again.shake === 0, 'P3-11：重开清掉 monsterShakeEnd', String(again.shake));
P(again.errs.length === 0, '无 JS 错误', JSON.stringify(again.errs));
shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('.shots/out/sprint_restart.png', Buffer.from(shot.data, 'base64'));

// ======== 13. 答错进错题本，关卡名不丢 ========
// 速算局 level=0，错题行若按 level 记就会缺关卡名，以后重练也只能退回按运算符的基件
// （表内乘法错的题会被推成两位数乘法）。所以记的是 sprintLv。
console.log('\n######## 13. 速算错题带着关卡号进本 ########');
P(await bootSprint(`localStorage.setItem('mathgameMaxCompletedLevel','3');`), '通关 3 关后开速算（sprintLv 仍固定 1）');
const rec = await ev(`(() => { const g = window._currentGame;
  mgRecordWrong(g, 999);
  const log = JSON.parse(localStorage.getItem('mathgameWrongLog') || '[]');
  return { row: log[0], sprintLv: g.sprintLv, lv: g.level, errs: window.__errs || [] }; })()`);
P(rec.row && rec.row.lv === 1, '错题行的 lv 记成 sprintLv=1（不是 level=0）', JSON.stringify(rec.row));
P(rec.row && rec.row.u === 999 && typeof rec.row.q === 'string' && rec.row.q.length > 0,
  '算式和孩子答的数都在', JSON.stringify(rec.row));
P(rec.errs.length === 0, '无 JS 错误', JSON.stringify(rec.errs));

await ev(WIPE + `;sessionStorage.clear();1`);
console.log('\n' + (fail === 0 ? '===== ALL PASS =====' : '===== ' + fail + ' FAILURE(S) ====='));
ws.close();
process.exit(fail === 0 ? 0 : 1);
