// 二期（P2-a/b/c/d）真机闸门 via :9222（Chrome 91 WebView / V8 9.1）。
// 本地那套（verify_weak / verify_pace / verify_practice）跑的是 Chrome 153，守的是「算得对不对」。
// 这里只守真机独有的三件事 —— 全是本地绿了也可能在 91 上坏掉的：
//   1) 怪兽**真的会动**。本地 verify_pace 是打桩 setInterval 量那个毫秒数，证的是「接线对」；
//      接线对 + 定时器不跑（档位算出 NaN、V8 9.1 上某句语法不被接受导致整段挂掉）在本地一样全绿，
//      到真机就是「怪兽站着不动」或者「怪兽瞬间满格」—— 这正是这个项目吃过的那类哑巴 bug。
//      所以这里让真定时器跑，隔一段时间读 monsterScore / monsterStep 看它涨没涨。
//   2) 三个引擎（Game / RaceGame / VoiceGame）在 91 上各自构造起来之后档位都还在。
//   3) 🔧 面板的 👹 影子对手那一段在真机上渲染得出来、点一下能存住 —— 这个面板原来根本没人调用，
//      现在挂在 mgDebug 彩蛋上（跟速通按钮同一道闸）。
// 顺带把练习局（level 0）不污染进度在真机上也点一遍：那条路径牵着 sessionStorage + 五个 key。
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
await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__errs=[];window.addEventListener('error',function(e){try{window.__errs.push(String(e.message||e.error||e));}catch(_){}});` });
mkdirSync('.shots/out', { recursive: true });
let fail = 0; const P = (ok, l, x) => { console.log((ok ? '  PASS ' : '  FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };

async function boot(lv, mode, pre) {
  await ev(`sessionStorage.setItem('gameLevel','${lv}');sessionStorage.setItem('gameMode','${mode}');` +
    (pre || '') + `location.href='game.html';`);
  await sleep(1800);
  await ev(`window._skipOcrLoading && window._skipOcrLoading();`);
  for (let i = 0; i < 30; i++) { if (await ev(`!!window._currentGame`)) { await sleep(800); return true; } await sleep(400); }
  return false;
}
const setPace = o => ev(`localStorage.setItem('mathgamePace', ${JSON.stringify(JSON.stringify(o))});window.__errs=[];1`);

// ======== 1. 新代码在 V8 9.1 上整段活着 ========
// 一句不被老引擎接受就会把整个 <script> 打掉，后果不是报错而是「所有函数都 undefined」。
console.log('\n######## 1. 二期新函数在 Chrome 91 上都在 ########');
P(await boot(1, 'visual'), 'L1 已构造');
const apis = await ev(`(() => { const want = ['mgPickOp','mgWeakWeights','mgParseExpr','mgVariantGen','mgNextQuestion',
  'mgSetupPractice','mgMasterWrong','mgReadPace','mgUpdatePace','mgPaceK','mgMonsterSpeed','_ensureVoiceTuningUI'];
  const miss = want.filter(n => typeof window[n] !== 'function');
  return { miss, errs: window.__errs || [], v8: navigator.userAgent.match(/Chrome\\/[\\d.]+/)[0] }; })()`);
P(apis.miss.length === 0, '12 个新函数全部可调用', apis.miss.length ? 'MISSING ' + JSON.stringify(apis.miss) : apis.v8);
P(apis.errs.length === 0, '载入期无 JS 错误', JSON.stringify(apis.errs));

// ======== 2. 怪兽真的会动（真定时器，不打桩）========
// 档位压到下限 2600ms，等 6 秒至少该走 2 格。涨了 = 定时器在跑且延迟是个正常数；
// 一格都不涨 = 站着不动；一下满格 = 延迟算成了 NaN/0（setInterval(f,NaN) 在 91 上按 1ms 跑）。
console.log('\n######## 2. 怪兽真的在走（下限 2600ms，真表真定时器）########');
const MOVE = `(() => { const g = window._currentGame;
  return { pos: g.monsterScore !== undefined ? g.monsterScore : g.monsterStep,
    engine: g.constructor.name, lv: g.level, ended: !!g.gameEnded,
    ms: mgMonsterSpeed(g.level, g.currentAnswer), errs: window.__errs || [] }; })()`;
for (const [lv, mode, engine, label] of [[2, 'visual', 'Game', 'L2 视算 Game'],
  [4, 'visual', 'RaceGame', 'L4 RaceGame'], [3, 'audio', 'VoiceGame', 'L3 听算 VoiceGame']]) {
  console.log('-- ' + label);
  await setPace({ [lv]: { n: 20, ms: 1000 } });            // → 撞下限 2600
  P(await boot(lv, mode), label + ' 已构造');
  const a = await ev(MOVE);
  P(a.engine === engine && a.lv === lv, '引擎/关卡号对得上', a.engine + ' lv=' + a.lv);
  P(a.ms === 2600, '档位已按真表算出（撞下限）', String(a.ms));
  await ev(`(() => { const g = window._currentGame; clearInterval(g.monsterTimer); g._startMonster(); return 1; })()`);
  await sleep(6200);
  const b = await ev(MOVE);
  P(b.pos > a.pos, '怪兽真的往前走了（不是站着不动）', a.pos + ' → ' + b.pos);
  P(b.pos - a.pos <= 4, '也没有瞬间满格（延迟不是 NaN/0）', '6.2s 走了 ' + (b.pos - a.pos) + ' 格');
  P(b.errs.length === 0, '无 JS 错误', JSON.stringify(b.errs));
}

// ======== 3. 没数据回到出厂节奏；坏表不让怪兽瞎猜 ========
console.log('\n######## 3. 兜底在 91 上同样成立 ########');
P(await boot(2, 'visual'), 'L2 已构造');
await ev(`localStorage.removeItem('mathgameVoiceTuning');localStorage.removeItem('mathgamePace');window.__errs=[];1`);
P(JSON.stringify(await ev(`[mgMonsterSpeed(2,9), mgMonsterSpeed(2,10)]`)) === '[5000,6000]',
  '没表 → 原样 5000/6000（老用户第一局不变味道）');
for (const raw of ['not json', 'null', '[]', '{"1":{"n":20,"ms":0}}']) {
  await ev(`localStorage.setItem('mathgamePace', ${JSON.stringify(raw)});window.__errs=[];1`);
  const r = await ev(`[mgReadPace(2), mgMonsterSpeed(2,9), mgMonsterSpeed(2,10), (window.__errs||[]).length]`);
  P(r[0] === null && r[1] === 5000 && r[2] === 6000 && r[3] === 0, '坏表 ' + JSON.stringify(raw) + ' → 当没数据', JSON.stringify(r));
}
await setPace({ 2: { n: 20, ms: 4000 } });
P(JSON.stringify(await ev(`[mgMonsterSpeed(2,9), mgMonsterSpeed(2,10)]`)) === '[4200,5040]',
  '有表 → EMA×1.05，两位数再 ×1.2');
// 第 1 关（学前）在钳位之后再 ×1.4：同一张表（ms:4000）第 2 关 4200/5040，第 1 关 5880/7056
await setPace({ 1: { n: 20, ms: 4000 } });
P(JSON.stringify(await ev(`[mgMonsterSpeed(1,9), mgMonsterSpeed(1,10)]`)) === '[5880,7056]',
  '第 1 关同一张表再 ×1.4（学前松弛，钳位之后乘）');
await ev(`localStorage.removeItem('mathgamePace');1`);
P(JSON.stringify(await ev(`[mgMonsterSpeed(1,9), mgMonsterSpeed(1,10)]`)) === '[7000,8400]',
  '第 1 关没表 → 5000/6000 ×1.4 = 7000/8400');

// ======== 4. 薄弱点加权在 91 上真的偏过去 ========
// 只量「选哪个运算」的频率，范围/整除/不出负那套本地已经按关卡各验过（verify_weak）。
console.log('\n######## 4. 薄弱点加权（真机采样 6000 次）########');
const share = (gen, n) => ev(`(() => { const c = {}; for (let i = 0; i < ${n}; i++) { const q = ${gen}(); c[q.op] = (c[q.op]||0)+1; }
  const o = {}; for (const k in c) o[k] = +(c[k]/${n}).toFixed(3); return { o, errs: window.__errs || [] }; })()`);
await ev(`localStorage.removeItem('mathgameWrongLog');window.__errs=[];1`);
let s = await share('mgGenMulDivTable', 6000);
P(Math.abs((s.o['×'] || 0) - 0.5) < 0.03, '空错题本 → 乘除各半', JSON.stringify(s.o));
await ev(`localStorage.setItem('mathgameWrongLog', JSON.stringify([{q:'54 ÷ 9',a:6,u:7,op:'÷',a2:54,b2:9,lv:4,t:Date.now(),n:9}]));window.__errs=[];1`);
s = await share('mgGenMulDivTable', 6000);
P(Math.abs((s.o['÷'] || 0) - 0.7) < 0.03, '只错除法 → 除法 70%（上限，不许一边倒）', JSON.stringify(s.o));
P((s.o['×'] || 0) >= 0.27, '乘法仍保 30% 下限（不把练习变偏科）', JSON.stringify(s.o));
s = await share('mgGenMixed', 6000);
P(Math.abs((s.o['÷'] || 0) - 0.55) < 0.03 && ['+', '−', '×'].every(k => (s.o[k] || 0) >= 0.12),
  '四选一：弱项 55%、其余各保 15%', JSON.stringify(s.o));
P(s.errs.length === 0, '无 JS 错误', JSON.stringify(s.errs));

// ======== 5. 练习局（level 0）在真机上不污染进度 ========
console.log('\n######## 5. 练习局不写星星/不解锁 ########');
await ev(`localStorage.setItem('mathgameStars', JSON.stringify({1:3}));
  localStorage.setItem('mathgameMaxCompletedLevel','2');
  localStorage.setItem('mathgameWrongLog', JSON.stringify([{q:'7 × 8',a:56,u:9,op:'×',a2:7,b2:8,lv:4,t:Date.now(),n:2}]));1`);
// 塞进去的必须是**错题行原样**（menu.html retryWrong 就是 JSON.stringify(getWrongLog())），
// 不是已经算好的题目对象 —— 解析/重算/挑变式题全在游戏页 mgRowToQ 一处做。第一版这里自作聪明
// 递了 {a,b,op,answer,key}，mgRowToQ 认不出（没有 a2/b2，q 也不存在）就整条滤掉，于是练习局
// 退回随机出题、断言拿到一道 74 − 65。假失败，但它恰好证明了「菜单和游戏页的数据契约只有一份」。
const PRACTICE = `sessionStorage.setItem('mgPractice', JSON.stringify([{q:'7 × 8',a:56,u:9,op:'×',a2:7,b2:8,lv:4,t:Date.now(),n:2}]));`;
P(await boot(0, 'visual', PRACTICE), '练习局已构造');
const pr = await ev(`(() => { const g = window._currentGame;
  return { engine: g.constructor.name, lv: g.level, q: document.getElementById('question-display').textContent,
    practice: _mgPractice === true, hasGen: typeof _mgPracticeGen === 'function',
    variantOps: (() => { const c = {}; for (let i = 0; i < 300; i++) { const q = _mgPracticeGen(); c[q.op] = (c[q.op]||0)+1; } return c; })(),
    errs: window.__errs || [] }; })()`);
P(pr.engine === 'Game' && pr.lv === 0, '练习局走默认 Game、level=0', pr.engine + ' lv=' + pr.lv);
P(/7\s*×\s*8/.test(pr.q), '第一道就是那道错题', JSON.stringify(pr.q));
P(pr.practice && pr.hasGen, '练习局标记已置位（mgMasterWrong 靠它放行）');
P(Object.keys(pr.variantOps).join('') === '×', '补齐的 9 道全是同类变式（只出 ×）', JSON.stringify(pr.variantOps));
const shot0 = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('.shots/out/device_practice.png', Buffer.from(shot0.data, 'base64'));
await ev(`_mgWrong=0;_mgCorrect=10;_mgMaxStreak=10;_mgRoundStart=Date.now()-30000;debugEndGame(true);1`);
await sleep(1400);
const after = await ev(`(() => ({ stars: localStorage.getItem('mathgameStars'),
  maxLv: localStorage.getItem('mathgameMaxCompletedLevel'),
  pace0: (JSON.parse(localStorage.getItem('mathgamePace')||'{}')||{})[0] || null,
  title: document.getElementById('overlay-title').textContent,
  nextShown: getComputedStyle(document.getElementById('next-level-btn')).display !== 'none',
  errs: window.__errs || [] }))()`);
P(after.stars === '{"1":3}', '练习局没动星星表', after.stars);
P(after.maxLv === '2', '练习局没解锁新关', after.maxLv);
P(after.pace0 === null, '练习局不进影子对手的档位表', JSON.stringify(after.pace0));
P(!after.nextShown, '练习局不给「挑战下一关」', String(after.nextShown));
P(after.errs.length === 0, '无 JS 错误', JSON.stringify(after.errs));
const shot1 = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('.shots/out/device_practice_result.png', Buffer.from(shot1.data, 'base64'));

// ======== 6. 真跑一局写进档位表（闯关局）========
console.log('\n######## 6. 闯关局结算写档位 ########');
await ev(`localStorage.removeItem('mathgamePace');1`);
P(await boot(1, 'visual'), 'L1 已构造');
await ev(`_mgWrong=0;_mgCorrect=10;_mgMaxStreak=10;_mgRoundStart=Date.now()-40000;debugEndGame(true);1`);
await sleep(1400);
P(JSON.stringify(await ev(`(JSON.parse(localStorage.getItem('mathgamePace')||'{}')||{})[1]||null`)) === '{"n":10,"ms":4000}',
  '一局 10 题 40 秒 → {n:10, ms:4000}',
  JSON.stringify(await ev(`localStorage.getItem('mathgamePace')`)));

// ======== 7. 🔧 面板的 👹 影子对手一段（真机才是调参现场）========
// 这个面板原来定义了但没有任何调用点，等于那个旋钮谁也够不着。现在跟速通按钮同一道 mgDebug 闸。
console.log('\n######## 7. 🔧 调参面板 ########');
P(await boot(1, 'visual'), 'L1 已构造（无 mgDebug）');
P(await ev(`!document.getElementById('vtune-btn')`), '正式状态下 🔧 不出现（孩子碰不到）');
await ev(`sessionStorage.setItem('mgDebug','1');1`);
P(await boot(2, 'visual'), 'L1 已构造（mgDebug=1）');
const panel = await ev(`(() => {
  const b = document.getElementById('vtune-btn'); if (!b) return { noBtn: true };
  b.click();
  const p = document.getElementById('vtune-panel'), pk = document.getElementById('vtune-pk');
  const r = p ? p.getBoundingClientRect() : null;
  return { shown: !!p && getComputedStyle(p).display !== 'none',
    hasSection: !!p && p.textContent.indexOf('影子对手') >= 0,
    nBtns: pk ? pk.children.length : 0, labels: pk ? [...pk.children].map(c => c.textContent) : [],
    inView: !!r && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5,
    errs: window.__errs || [] }; })()`);
P(!panel.noBtn, 'mgDebug=1 时 🔧 按钮出现');
P(panel.shown && panel.hasSection, '点开后有「👹 影子对手」一段');
P(panel.nBtns === 5, '五个档位按钮都渲染出来了', JSON.stringify(panel.labels));
P(panel.inView, '面板完整在真机屏内（1000x576）');
const shot2 = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('.shots/out/device_vtune_pace.png', Buffer.from(shot2.data, 'base64'));
await setPace({ 2: { n: 20, ms: 4000 } });
P(await ev(`mgPaceK()`) === 1.05, '默认 1.05（怪兽比孩子平均慢 5%）');
const picked = await ev(`(() => { const pk = document.getElementById('vtune-pk');
  const b = [...pk.children].find(c => c.textContent.indexOf('0.8') === 0); b.click();
  return { k: mgPaceK(), ms: mgMonsterSpeed(2, 9), saved: localStorage.getItem('mathgameVoiceTuning'),
    active: [...document.getElementById('vtune-pk').children].map(c => c.style.background.indexOf('255, 140, 66') >= 0 || c.style.background.indexOf('#FF8C42') >= 0) }; })()`);
P(picked.k === 0.8 && picked.ms === 3200, '点「0.8 快」→ 怪兽真的变快了', 'k=' + picked.k + ' ms=' + picked.ms);
P(/paceK/.test(picked.saved || ''), '旋钮存进 mathgameVoiceTuning（下次开机还在）', picked.saved);
P(picked.active.filter(Boolean).length === 1, '只有选中的那个按钮高亮', JSON.stringify(picked.active));
P((await ev(`(() => { const g = window._currentGame; clearInterval(g.monsterTimer);
  const o = window.setInterval, seen = []; g.currentAnswer = 9;
  window.setInterval = function (f, d) { seen.push(d); return o(function () {}, 1e7); };
  try { g._startMonster(); } finally { window.setInterval = o; }
  clearInterval(g.monsterTimer); return seen[0]; })()`)) === 3200,
  '下一题的定时器真拿到了新档位（不用重开局）');

// 收摊：把调参和档位都擦掉，别让闸门自己留下状态影响下一个脚本 / 真人试玩。
await ev(`localStorage.removeItem('mathgamePace');localStorage.removeItem('mathgameVoiceTuning');
  localStorage.removeItem('mathgameWrongLog');localStorage.removeItem('mathgameStars');
  localStorage.removeItem('mathgameMaxCompletedLevel');localStorage.removeItem('mathgameBest');
  sessionStorage.removeItem('mgDebug');sessionStorage.removeItem('mgPractice');1`);

console.log('\n' + (fail === 0 ? '=== DEVICE P2 PASS ===' : '=== ' + fail + ' FAIL ==='));
ws.close(); process.exit(fail ? 1 : 0);
