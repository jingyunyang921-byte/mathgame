// 三期（P3-a 一分钟速算 / P3-b 每日打卡）真机闸门 via :9222（Chrome 91 WebView / V8 9.1）。
// 本地那套（verify_sprint_daily）跑的是 Chrome 153，守的是「算得对不对、UI 长没长歪」。
// 这里只守真机独有、本地绿了也可能在 91 上坏掉的几件事：
//   1) 三期新函数在 V8 9.1 上整段活着。一句语法不被老引擎接受就会把整个 <script> 打掉，
//      后果不是报错而是「所有函数都 undefined」—— 这个项目吃过的正是这类哑巴 bug。
//   2) 60 秒倒计时**真的在走**。构造函数里 _startCountdown() 接线对 + 定时器不跑，在本地
//      一样全绿；到真机就是「秒数钉在 60 不动」或者「一秒跳三格」。所以这里让真表真定时器跑。
//   3) 「再来一局」在 91 上把 BattleGame 重置干净（P3-11 修过的 monsterShakeEnd / 倒计时重起）。
//      三期动的就是这个 1200 行的引擎，这条路径是风险最高处。
//   4) 速算局对闯关进度一个字都写不进去（星星 / 解锁 / 最佳 / 影子对手档位全不动）。
//   5) 菜单那两颗 pill（⚡ 速算 / 🔥 连续天数）在真机 1000×576 + --ui=.85 下不挤出屏外。
import { writeFileSync, mkdirSync } from 'fs';
const CDP = 'http://localhost:9222';
const info = await (await fetch(CDP + '/json')).json();
const page = info.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || info[0];
console.log('target:', page.title, '|', page.url);
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p) => { const id = ++_id; return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify({ id, method: m, params: p || {} })); }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
await send('Page.enable'); await send('Runtime.enable');
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true });
  if (r.exceptionDetails) throw new Error('EVAL: ' + ((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text));
  return r.result.value;
};
// 'error' 只接住抛出来的异常；**Promise 的 rejection 要另外接一次**。真机上就吃过一口：
// playReadySound 的 Tts.speak() 被引擎 reject('tts-error')，try/catch 接不住 Promise，
// 于是冒成 unhandledrejection → 屏底弹红色横幅，而只看 'error' 的闸门一路全绿。
// 顺手把 #mg-err-banner 也当断言对象：那条横幅是真机上唯一的错误出口，它亮了就是出事了。
await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__errs=[];
  window.addEventListener('error',function(e){try{window.__errs.push(String(e.message||e.error||e));}catch(_){}});
  window.addEventListener('unhandledrejection',function(e){try{var r=e&&e.reason;window.__errs.push('rejection: '+((r&&r.message)||r));}catch(_){}});` });
const errsOf = () => `(window.__errs||[]).concat(document.getElementById('mg-err-banner') ? ['banner: ' + document.getElementById('mg-err-banner').textContent.replace(/\\s+/g,' ')] : [])`;
mkdirSync('.shots/out', { recursive: true });
let fail = 0; const P = (ok, l, x) => { console.log((ok ? '  PASS ' : '  FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
const shot = async name => { const s = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync('.shots/out/' + name + '.png', Buffer.from(s.data, 'base64')); };

// 每组开头先擦干净：不擦的话上一组造的纪录/打卡会漏到下一组，断言跟着一起变味
//（本地 verify_sprint_daily 吃过这一口）。
const WIPE = `['mathgameSprintBest','mathgameDaily','mathgameStars','mathgameBest',
  'mathgameMaxCompletedLevel','mathgamePace','mathgameWrongLog','mathgameRankSeen']
  .forEach(k => localStorage.removeItem(k)); 1`;
const DAY = `(off => { const d = new Date(); d.setDate(d.getDate() - off);
  const p = n => (n < 10 ? '0' : '') + n;
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); })`;

// 开一局。sprint=true 走 mgSprint 装弹；pre 用来在导航前塞 localStorage 种子。
// 离页一律走项目自己的 _mgSafeLeave（停 Vosk / 停原生 TTS，延 150ms 再拆页）。直接写
// location.href 从 CDP 里跳，等于绕过这套兜底：上一局还在听算时跳走，原生回调会打进已销毁的
// WebView —— 这正是 game-exit-crash-fix 修过的那个 SIGSEGV，表现是整个 devtools 端点一起没了。
async function boot(opts) {
  const o = opts || {};
  const url = `game.html`;
  await ev(`(() => {
    sessionStorage.setItem('gameLevel','${o.lv == null ? 0 : o.lv}');
    sessionStorage.setItem('gameMode','${o.mode || 'visual'}');
    ${o.sprint ? `sessionStorage.setItem('mgSprint','1');` : `sessionStorage.removeItem('mgSprint');`}
    ${o.pre || ''}
    const go = () => { location.href = '${url}'; };
    if (window._mgSafeLeave) _mgSafeLeave(window._currentGame, go); else go();
    return 1; })()`);
  await sleep(2000);
  await ev(`window._skipOcrLoading && window._skipOcrLoading();`);
  for (let i = 0; i < 60; i++) { if (o.skipIntro) await ev(`window._mgSkipIntro && window._mgSkipIntro();`); if (await ev(`!!window._currentGame`)) { await sleep(700); return true; } await sleep(400); }
  return false;
}

// ======== 1. 三期新函数在 Chrome 91 上都在 ========
console.log('\n######## 1. 三期新函数 / 常量在 V8 9.1 上都在 ########');
await ev(WIPE);
P(await boot({ lv: 1, mode: 'visual' }), 'L1 已构造（先拿一页干净的游戏页探函数）');
const apis = await ev(`(() => { const want = ['mgSetupSprint','mgReadSprintBest','mgSaveSprintBest',
  'mgSprintLevel','mgSprintGen','mgDayStr','mgMarkDailyDone'];
  const miss = want.filter(n => typeof window[n] !== 'function');
  return { miss, time: MG_SPRINT_TIME, total: MG_SPRINT_TOTAL,
    introIcon: MG_SPRINT_INTRO.icon, introTitle: MG_SPRINT_INTRO.title,
    day: mgDayStr(new Date(2026, 0, 5)),
    errs: ${errsOf()}, v8: navigator.userAgent.match(/Chrome\\/[\\d.]+/)[0] }; })()`);
P(apis.miss.length === 0, '7 个新函数全部可调用', apis.miss.length ? 'MISSING ' + JSON.stringify(apis.miss) : apis.v8);
P(apis.time === 60 && apis.total === 99, '三个旋钮的常量值对（60 秒 / 99 题够不到）', apis.time + '/' + apis.total);
P(apis.day === '2026-01-05', 'mgDayStr 补零正确（91 上也不是 2026-1-5）', apis.day);
P(apis.introIcon === 'i-bolt' && /速算/.test(apis.introTitle), '速算开场卡文案在', apis.introIcon + ' ' + apis.introTitle);
P(apis.errs.length === 0, '载入期无 JS 错误', JSON.stringify(apis.errs));

// ======== 2. 速算局在真机上构造起来，三个旋钮都生效；第 6 关一点没变 ========
console.log('\n######## 2. 速算局 vs 第 6 关闯关局 ########');
const SNAP = `(() => { const g = window._currentGame;
  const t = id => { const el = document.getElementById(id); return el ? el.textContent.trim() : null; };
  return { engine: g.constructor.name, sprint: !!g.sprint, lv: g.level, sprintLv: g.sprintLv,
    total: g.total, time: g.time, left: g.timeLeft, cd: t('battle-countdown'),
    hpLabel: (document.getElementById('monster-hp-label').textContent || '').replace(/\\s+/g, ' ').trim(), hpText: t('monster-hp-text'),
    hpCls: document.getElementById('monster-hp-container').className,
    pinNum: (document.querySelector('#monster-hp-container .sr-pin') || {}).textContent || '',
    barW: document.getElementById('monster-hp-fill').style.width,
    gen: g.gen && g.gen.name, best: g.sprintBest, errs: ${errsOf()} }; })()`;
await ev(WIPE);
P(await boot({ sprint: true }), '速算局已构造');
let s = await ev(SNAP);
P(s.engine === 'BattleGame' && s.sprint === true, '复用 BattleGame（没新写第 6 个引擎）', s.engine);
P(s.lv === 0, '关卡号 0（星星 / 解锁 / 档位三个写入口全被 if (!level) 挡住）', String(s.lv));
P(s.total === 99 && s.time === 60, '旋钮挂在实例上：99 题 / 60 秒', s.total + ' / ' + s.time);
P(s.cd === '60' || s.cd === '59', '倒计时初值 60（真机上快照时可能已掉第一秒）', s.cd);
P(/\bsr\b/.test(s.hpCls) && /^答对 0 题/.test(s.hpLabel), 'HP 条换成「纪录条」，标签「答对 N 题」（99 滴血在 60 秒掉不完，条得改语义）', s.hpLabel + ' ' + s.hpCls);
P(/还差 10 题，立个纪录/.test(s.hpLabel) && s.barW === '0%', '没纪录时旗在 10 题处、条从 0 起', s.hpLabel + ' w=' + s.barW);
P(s.errs.length === 0, '无 JS 错误', JSON.stringify(s.errs));
await shot('device_sprint');
P(await boot({ lv: 6, mode: 'visual', skipIntro: true }), '第 6 关闯关局已构造');
s = await ev(SNAP);
P(s.sprint === false && s.lv === 6 && s.total === 20 && s.time === 90,
  '第 6 关一个字没动（20 题 / 90 秒 / level 6）', JSON.stringify([s.lv, s.total, s.time]));
P((s.cd === '90' || s.cd === '89') && /欢迎灯/.test(s.hpLabel) && s.hpText === '0/20',
  '第 6 关欢迎灯 0/20（小屋的窗从全灭起，去巨龙血量）', s.cd + ' ' + s.hpLabel + ' ' + s.hpText);

// ======== 3. 倒计时真的在走（真表真定时器，不打桩）========
// 本地那条断言读的是 timeLeft 字段和 setInterval 的接线；接线对 + 定时器不跑在本地一样绿，
// 到真机就是秒数钉在 60 不动（或者一秒跳三格）。这里等 4 秒看它掉了几秒。
console.log('\n######## 3. 60 秒倒计时真的在走 ########');
await ev(WIPE);
P(await boot({ sprint: true }), '速算局已构造');
// 开局有「闯关马上开始」报幕 + 3-2-1（真机 TTS 约 4~5 秒），计时器放行后才开始走
for (let i = 0; i < 40; i++) {
  if (await ev(`(() => { const g = _currentGame; return !!g && !g._countdownActive && g.countdownInterval != null; })()`)) break;
  await sleep(500);
}
const t0 = await ev(`(() => ({ left: _currentGame.timeLeft, cd: document.getElementById('battle-countdown').textContent }))()`);
await sleep(4200);
const t1 = await ev(`(() => ({ left: _currentGame.timeLeft, cd: document.getElementById('battle-countdown').textContent,
  ended: !!_currentGame.gameEnded, errs: ${errsOf()} }))()`);
P(t0.left - t1.left >= 3 && t0.left - t1.left <= 6, '4.2 秒掉了 3~6 秒（不是钉住也不是飞）', t0.left + ' → ' + t1.left);
P(String(t1.cd) === String(t1.left) && /^\d+$/.test(String(t1.cd)), '屏上那个数字跟着走且不是 NaN', JSON.stringify(t1.cd));
P(!t1.ended, '4 秒还没结束（60 秒不是被当成 60 毫秒）');
P(t1.errs.length === 0, '无 JS 错误', JSON.stringify(t1.errs));

// ======== 4. 题目跟着孩子已解锁的最高关走 ========
// 不无脑用 L6 的四则混合：刚玩到第 1 关的孩子一上来撞 72 ÷ 8，速算就成了劝退局。
console.log('\n######## 4. 出题 = 已解锁最高关（真机采样 300 道）########');
const sample = `(() => { const g = window._currentGame; const ops = {}; let max = 0, bad = 0;
  for (let i = 0; i < 300; i++) { const q = g.gen(); ops[q.op] = (ops[q.op] || 0) + 1;
    if (q.answer > max) max = q.answer;
    if (!Number.isInteger(q.answer) || q.answer < 0) bad++; }
  return { lv: g.sprintLv, gen: g.gen.name, ops: Object.keys(ops).sort().join(''), max, bad }; })()`;
for (const [done, lv, ops, cap] of [[0, 1, '+−', 10], [3, 1, '+−', 10], [5, 1, '+−', 10], [9, 1, '+−', 10]]) {
  await ev(WIPE);
  P(await boot({ sprint: true, pre: `localStorage.setItem('mathgameMaxCompletedLevel','${done}');` }),
    '通关 ' + done + ' 关 → 速算局已构造');
  const q = await ev(sample);
  P(q.lv === lv, '通关 ' + done + ' 关 → 速算题固定第 ' + lv + ' 关（10 以内加减，学龄前也能做）', 'sprintLv=' + q.lv + ' gen=' + q.gen);
  P(q.ops === ops, '运算符集合对', q.ops);
  P(q.max <= cap && q.bad === 0, '答案不超过 ' + cap + ' 且全是非负整数', 'max=' + q.max + ' bad=' + q.bad);
}
await ev(WIPE);
P(await boot({ sprint: true, pre: `localStorage.setItem('mathgameMaxCompletedLevel','not a number');` }), '坏值 → 已构造');
P((await ev(`_currentGame.sprintLv`)) === 1, '坏的通关数当 0 看（退回第 1 关，不是崩或者 NaN 关）');

// ======== 5. 结算：纪录落盘 + 盖今天的章 + 闯关进度一个字都没动 ========
console.log('\n######## 5. 速算结算（真机截图留档）########');
const endSprint = n => ev(`(() => { const g = window._currentGame;
  g.playerScore = ${n}; _mgCorrect = ${n}; _mgWrong = 1; _mgMaxStreak = ${Math.min(n, 7)};
  _mgRoundStart = Date.now() - 60000; debugEndGame(false); return 1; })()`);
const RESULT = `(() => {
  const t = id => { const el = document.getElementById(id); return el ? el.textContent.trim() : null; };
  const stars = document.getElementById('overlay-stars');
  return { title: t('overlay-title'), titleCls: document.getElementById('overlay-title').className,
    msg: t('overlay-msg'), sub: t('overlay-sub'), chips: t('overlay-stats'),
    rec: !!document.querySelector('#overlay-stats .rec'),
    recText: (document.getElementById('overlay-rec') || {innerText: ''}).innerText.replace(/\\s+/g, ' ').trim(),
    recBadge: !!document.querySelector('#overlay-rec .rbg'), recNear: !!document.querySelector('#overlay-rec .nbx'),
    ribbon: (document.querySelector('#overlay-rec .ribbon') || {}).textContent || '',
    starsShown: !!stars && getComputedStyle(stars).display !== 'none',
    nextShown: getComputedStyle(document.getElementById('next-level-btn')).display !== 'none',
    best: localStorage.getItem('mathgameSprintBest'), daily: localStorage.getItem('mathgameDaily'),
    starTable: localStorage.getItem('mathgameStars'), maxLv: localStorage.getItem('mathgameMaxCompletedLevel'),
    bestTable: localStorage.getItem('mathgameBest'), pace: localStorage.getItem('mathgamePace'),
    errs: ${errsOf()} }; })()`;
await ev(WIPE);
P(await boot({ sprint: true, pre: `localStorage.setItem('mathgameStars','{"1":3}');
  localStorage.setItem('mathgameMaxCompletedLevel','2');` }), '速算局已构造（带着 3 星 + 通关 2 关）');
await endSprint(14); await sleep(1400);
let r = await ev(RESULT);
P(r.title === '时间到！' && r.titleCls === 'win', '结算标题「时间到！」且是正面收场（总题数够不到，不能按输赢分叉）', r.title + ' .' + r.titleCls);
P(/答对 14 题/.test(r.chips || ''), '数据条第一个 chip = 答对 14 题', JSON.stringify(r.chips));
P(!/秒/.test(r.chips || ''), '不挂「60 秒」chip（时长固定，写了是废话）', JSON.stringify(r.chips));
P(!r.rec, '第一次玩不叫「破纪录」', String(r.rec));
P(!r.starsShown, '速算不发星星（星星是某一关的货币）', String(r.starsShown));
P(!r.nextShown, '不给「挑战下一关」', String(r.nextShown));
P(r.recBadge && r.ribbon === '第一个纪录', '结算卡亮「第一个纪录」金徽章（不叫破纪录）', JSON.stringify([r.ribbon, r.recText]));
P(JSON.parse(r.best || '{}').best === 14, '纪录落盘 best=14', r.best);
P(JSON.parse(r.daily || '{}').last === await ev(DAY + '(0)') && JSON.parse(r.daily || '{}').streak === 1,
  '盖上今天的章、连续天数从 1 起', r.daily);
P(r.starTable === '{"1":3}' && r.maxLv === '2' && r.bestTable === null && r.pace === null,
  '星星 / 解锁 / 最佳 / 影子对手档位全没动', [r.starTable, r.maxLv, r.bestTable, r.pace].join(' | '));
P(/今天的速算练完啦/.test(r.msg || '') && !/中断|可惜|别忘|坚持不下去/.test(r.msg || ''),
  '正文只说做完了，不说一个字挽留', JSON.stringify(r.msg));
P(r.errs.length === 0, '无 JS 错误', JSON.stringify(r.errs));
await shot('device_sprint_result');

// ======== 6. 纪录三条分支 + 打卡五条分支 ========
console.log('\n######## 6a. 破纪录 / 没追上 / 一道都没答对 ########');
await ev(WIPE);
P(await boot({ sprint: true, pre: `localStorage.setItem('mathgameSprintBest','{"best":10,"t":1}');` }), '带着旧纪录 10 开局');
await endSprint(23); await sleep(1400);
r = await ev(RESULT);
P(JSON.parse(r.best || '{}').best === 23 && r.recBadge && r.ribbon === '新纪录' && /10 ?→ ?23/.test(r.recText),
  '23 > 10 → 纪录刷新 + 金徽章「新纪录 10→23」', r.best + ' rec=' + r.recText);
await ev(WIPE);
P(await boot({ sprint: true, pre: `localStorage.setItem('mathgameSprintBest','{"best":30,"t":1}');` }), '带着旧纪录 30 开局');
await endSprint(5); await sleep(1400);
r = await ev(RESULT);
P(JSON.parse(r.best || '{}').best === 30 && r.recNear && !r.recBadge && /纪录 30 ?题/.test(r.recText),
  '5 < 30 → 纪录不动，小进度框给个追赶目标', r.best + ' ' + JSON.stringify(r.recText));
await ev(WIPE);
P(await boot({ sprint: true }), '空纪录开局（准备打 0 分）');
await endSprint(0); await sleep(1400);
r = await ev(RESULT);
P(r.best === null && r.titleCls === 'lose' && /一道都没答对/.test(r.msg || ''),
  '0 题不写纪录，文案也不假装庆祝', String(r.best));
P(JSON.parse(r.daily || '{}').streak === 1 && !/中断|可惜|别忘/.test(r.msg || ''),
  '0 题照样盖章（「今天练了」是习惯不是成绩），且不说一句挽留', r.daily);

console.log('\n######## 6b. 连续天数五条分支（真机 localStorage 直接读写）########');
const daily = async seed => ev(`(() => { ${seed}
  const o = mgMarkDailyDone(); return { o, raw: localStorage.getItem('mathgameDaily'),
    today: o.last === mgDayStr(new Date()) }; })()`);
for (const [label, seed, want] of [
  ['没有记录 → 从 1 起', `localStorage.removeItem('mathgameDaily');`, 1],
  ['昨天来过 → 接上 +1', `localStorage.setItem('mathgameDaily', JSON.stringify({last:` + DAY + `(1),streak:5,bestStreak:5}));`, 6],
  ['今天已盖章 → 不动', `localStorage.setItem('mathgameDaily', JSON.stringify({last:` + DAY + `(0),streak:6,bestStreak:6}));`, 6],
  ['前天来的 → 归零重数', `localStorage.setItem('mathgameDaily', JSON.stringify({last:` + DAY + `(2),streak:9,bestStreak:9}));`, 1],
  ['坏值（数组）→ 当没记录', `localStorage.setItem('mathgameDaily','[1,2]');`, 1],
  ['坏值（JSON 抛）→ 当没记录', `localStorage.setItem('mathgameDaily','{not json');`, 1],
  ['坏值（streak 负数）→ 当没记录', `localStorage.setItem('mathgameDaily', JSON.stringify({last:` + DAY + `(1),streak:-3}));`, 1],
]) {
  const d = await daily(seed);
  P(d.o.streak === want && d.today, label, JSON.stringify(d.raw));
}
P((await ev(`(() => { localStorage.setItem('mathgameDaily', JSON.stringify({last:` + DAY + `(1),streak:5,bestStreak:12}));
  return mgMarkDailyDone().bestStreak; })()`)) === 12, 'bestStreak 只升不降（历史最好成绩不该被今天抹掉）');

// ======== 7. 「再来一局」把 BattleGame 重置干净（P3-11 修过的那条路径）========
// 三期动的就是这个 1200 行引擎。重开漏清 monsterShakeEnd 的后果是「新局怪兽自己抖到上局残值
// 被追上」；倒计时不重起的后果是「第二局只剩几秒就结束」。两条在 91 上都只能真机看见。
console.log('\n######## 7. 再来一局（真机重置）########');
await ev(WIPE);
P(await boot({ sprint: true }), '速算局已构造');
await endSprint(18); await sleep(1400);
P(JSON.parse(await ev(`localStorage.getItem('mathgameSprintBest')`) || '{}').best === 18, '第一局把纪录写成 18');
await ev(`window.__errs=[]; (document.getElementById('mg-err-banner')||{remove(){}}).remove(); document.getElementById('retry-btn').click(); 1`);
await sleep(1500);
const again = await ev(`(() => { const g = window._currentGame;
  return { left: g.timeLeft, cd: document.getElementById('battle-countdown').textContent,
    danger: document.getElementById('battle-countdown').classList.contains('danger'),
    score: g.playerScore, ended: !!g.gameEnded, locked: !!g.locked,
    shake: g.monsterShakeEnd, best: g.sprintBest,
    hpText: (document.getElementById('monster-hp-label').textContent || '').replace(/\\s+/g, ' ').trim(),
    pinNum: (document.querySelector('#monster-hp-container .sr-pin') || {}).textContent || '',
    barW: document.getElementById('monster-hp-fill').style.width,
    overlay: document.getElementById('overlay').classList.contains('show'),
    errs: ${errsOf()} }; })()`);
P(again.left >= 57 && again.left <= 60 && String(again.cd) === String(again.left),
  '倒计时从 60 重新起（不是接着上一局的秒数）', again.cd);
P(!again.danger, '红色告急态已摘掉', String(again.danger));
P(again.score === 0 && !again.ended && !again.locked, '分数归零、局面解锁', JSON.stringify([again.score, again.ended, again.locked]));
P(again.shake === 0, 'monsterShakeEnd 清零（P3-11：不清就一直抖到上局残值被追上）', String(again.shake));
P(again.best === 18 && /还差 19 题，超过纪录/.test(again.hpText) && /18/.test(again.pinNum) && again.barW === '0%',
  '条改追**刚刷新的**纪录 18，从 0 格起', again.hpText + ' pin=' + again.pinNum + ' w=' + again.barW);
P(!again.overlay, '结算卡收起来了', String(again.overlay));
P(again.errs.length === 0, '无 JS 错误', JSON.stringify(again.errs));
const tick0 = again.left;
await sleep(3200);
const tick1 = await ev(`_currentGame.timeLeft`);
P(tick0 - tick1 >= 2, '第二局的倒计时也真的在走（定时器没被重开弄丢）', tick0 + ' → ' + tick1);

// ======== 8. 菜单那两颗 pill 在真机 1000x576（--ui=.85）下站得住 ========
// #menuScreen 里唯一能被压缩的孩子是 #levelGrid，所以新加一行都是从那片网格身上借高度。
// 借过头的表现不是报错而是「出发！」被挤出屏外 —— 四道闸门都在守 ctaInScreen + 不出滚动条。
console.log('\n######## 8. 菜单：⚡ 速算 pill + 🔥 连续天数 pill ########');
const MENU = `(() => {
  refreshLevelCards();
  const cta = document.querySelector('.cta').getBoundingClientRect();
  const pill = document.getElementById('sprintPill'), sp = document.getElementById('streakPill');
  const pr = pill.getBoundingClientRect(), wrap = document.querySelector('.cta-wrap').getBoundingClientRect();
  const sc = document.getElementById('menuScreen');
  const btns = [...document.querySelectorAll('.topbar-actions .icon-btn')];
  const b0 = btns[0].getBoundingClientRect(), b1 = btns[btns.length - 1].getBoundingClientRect();
  return { ui: getComputedStyle(document.documentElement).getPropertyValue('--ui').trim(),
    iw: innerWidth, ih: innerHeight,
    ctaBottom: Math.round(cta.bottom), pillTop: Math.round(pr.top), pillBottom: Math.round(pr.bottom),
    belowCta: pr.top >= cta.bottom - 0.5,
    centered: Math.abs((pr.left + pr.right) / 2 - (wrap.left + wrap.right) / 2) < 2,
    ctaInScreen: cta.bottom <= innerHeight + 0.5, pillInScreen: pr.bottom <= innerHeight + 0.5,
    scrollDelta: sc.scrollHeight - sc.clientHeight,
    meta: document.getElementById('sprintPillMeta').textContent,
    done: pill.classList.contains('done'),
    streakShown: sp.classList.contains('show') && getComputedStyle(sp).display !== 'none',
    streakTxt: sp.textContent.replace(/\\s+/g, ' ').trim(),
    streakInBar: sp.getBoundingClientRect().right <= document.querySelector('.topbar').getBoundingClientRect().right + 0.5,
    nIconBtns: btns.length, gearIsLast: b1.left > b0.left,
    noNag: !/中断|可惜|别忘|快来|就要失去|坚持不下去/.test(document.body.innerText),
    errs: ${errsOf()} }; })()`;
// mathgameRankSeen 一起种上：5 颗星会跨段，升段庆祝弹窗（P1-d）一开就盖住整个菜单，
// 截图只剩那张卡、两颗 pill 一个都看不见。升段那条路径由 verify_rankup 自己守。
await ev(`localStorage.setItem('mathgameSprintBest','{"best":23,"t":' + Date.now() + '}');
  localStorage.setItem('mathgameDaily', JSON.stringify({last:` + DAY + `(0),streak:6,bestStreak:9}));
  localStorage.setItem('mathgameStars','{"1":3,"2":2}');
  localStorage.setItem('mathgameRankSeen','999');
  localStorage.setItem('mathgameDailyChest', JSON.stringify({claimed: ` + DAY + `(0)}));
  localStorage.setItem('mathgameMaxCompletedLevel','2'); window.__errs=[];
  (() => { const go = () => { location.href = 'index.html'; };
    if (window._mgSafeLeave) _mgSafeLeave(window._currentGame, go); else go(); })(); 1`);
await sleep(2800);
const m = await ev(MENU);
console.log('  INFO ' + m.iw + 'x' + m.ih + ' ui=' + m.ui + ' ctaBottom=' + m.ctaBottom + ' pill=' + m.pillTop + '~' + m.pillBottom);
P(m.belowCta && m.centered, '速算 pill 在「出发！」下方、居中（不塞进 5 张岛卡网格）', 'ctaBottom=' + m.ctaBottom + ' pillTop=' + m.pillTop);
P(m.ctaInScreen && m.pillInScreen && m.scrollDelta <= 1,
  '加这一行没把 CTA 挤出屏外、也没出滚动条', 'scrollDelta=' + m.scrollDelta);
P(/最高 23 题 · 再冲一次，破纪录？/.test(m.meta) && m.done, '今天做完了 → pill 换暖底、只报成绩不再催', JSON.stringify(m.meta));
// 火焰已换成 #i-flame SVG（不再是 🔥 emoji），文本只剩「6 天」
P(m.streakShown && /6 天/.test(m.streakTxt) && m.streakInBar, '🔥 6 天 显示在顶栏内', JSON.stringify(m.streakTxt));
P(m.nIconBtns === 4 && m.gearIsLast, '顶栏是 4 个圆钮（萌宠/错题/图鉴/齿轮）、齿轮仍最右（🔥 是 span 不是圆钮）', String(m.nIconBtns));
P(m.noNag, '页面上没有任何「中断/可惜/别忘」之类的挽留文案');
P(m.errs.length === 0, '菜单无 JS 错误', JSON.stringify(m.errs));
P(!(await ev(`[...document.querySelectorAll('.locked-modal')].some(x => x.classList.contains('show'))`)),
  '菜单上没有弹窗挡着（截图是干净的菜单本体）');
await shot('device_sprint_menu');
const stale = await ev(`(() => { localStorage.setItem('mathgameDaily', JSON.stringify({last:` + DAY + `(3),streak:9,bestStreak:9}));
  localStorage.removeItem('mathgameSprintBest'); refreshSprintUI();
  return { shown: document.getElementById('streakPill').classList.contains('show'),
    num: document.getElementById('streakNum').textContent,
    meta: document.getElementById('sprintPillMeta').textContent,
    body: !/中断|可惜|别忘/.test(document.body.innerText) }; })()`);
P(stale.shown && stale.num === '9' && /今天可得/.test(stale.meta) && stale.body,
  '断签 3 天 → pill 仍显示累计打卡 9，不说中断/可惜/别忘', JSON.stringify(stale));

// ======== 9. 收摊：别让闸门自己留下状态影响下一个脚本 / 真人试玩 ========
await ev(`['mathgameSprintBest','mathgameDaily','mathgameStars','mathgameBest',
  'mathgameMaxCompletedLevel','mathgamePace','mathgameWrongLog','mathgameRankSeen']
  .forEach(k => localStorage.removeItem(k));
  ['mgSprint','mgPractice','mgPracticeOps','mgDebug'].forEach(k => sessionStorage.removeItem(k));
  typeof refreshLevelCards === 'function' && refreshLevelCards(); 1`);

console.log('\n截图：.shots/out/device_sprint{,_result,_menu}.png');
console.log(fail === 0 ? '=== DEVICE P3 PASS ===' : '=== ' + fail + ' FAIL ===');
ws.close(); process.exit(fail ? 1 : 0);
