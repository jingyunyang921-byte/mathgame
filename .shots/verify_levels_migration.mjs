// 六关编号迁移（menu.html 的 migrateToSixLevels）验证 via 本地 Chrome :9333。
// 「10以内加减」插成第 1 关，老存档里凡是以关卡号为键/值的都要 +1；这是个有持久化副作用的一次性动作，
// 两种相反的坏法都要盯：没迁（老玩家星星挂错关、少算一关通关）和迁两次（每次进菜单都再顺延一档）。
// 所以每条用例先 reload 一次看迁移结果，再 reload 一次看「第二次不动」，两面是同一个需求。
// 新装机器和坏值也要稳：新装只落闸门不造数据；坏 JSON 不许把菜单带崩。
const CDP = 'http://localhost:9333';
const URL = 'http://localhost:8000/menu.html';
const ver = await (await fetch(CDP + '/json/version')).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p, s) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (s) msg.sessionId = s;
  return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify(msg)); }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);
await send('Network.enable', {}, sessionId);
await send('Network.setCacheDisabled', { cacheDisabled: true }, sessionId);   // 新脚本一律禁缓存
await send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 576, deviceScaleFactor: 1, mobile: false }, sessionId);

let fail = 0;
const P = (ok, l, x) => { console.log((ok ? '  PASS ' : '  FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true }, sessionId);
  if (r.exceptionDetails) throw new Error('EVAL: ' + ((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text));
  return r.result.value;
};

const KEYS = ['mathgameStars', 'mathgameBest', 'mathgamePace', 'mathgameMaxCompletedLevel', 'mathgameWrongLog',
  'mathgameLevelsVer', 'mathgameRankSeen', 'mathgameSprintBest', 'mathgameDaily'];
const DAILY = '{"last":"2026-10-09","streak":3,"bestStreak":5}', SPRINT = '{"best":17,"t":1760000000000}';

// 种档 → reload（迁移在脚本顶层同步跑）→ 读回。errs 在 reload 之后才能挂，只能抓到之后的错误，
// 所以另外用「六张卡都渲染出来」当菜单没被迁移带崩的硬证据。
const READ = `(() => {
  const o = { cards: document.querySelectorAll('#levelGrid .level-card, #levelGrid [id^="card"]').length,
    unlocked: typeof unlockedLevel === 'number' ? unlockedLevel : null, errs: window.__errs || [] };
  for (const k of ${JSON.stringify(KEYS)}) o[k] = localStorage.getItem(k);
  return o; })()`;
async function load(seed) {
  await send('Page.navigate', { url: 'about:blank' }, sessionId); await sleep(150);
  await send('Page.navigate', { url: URL }, sessionId); await sleep(500);
  await ev(`(() => { for (const k of ${JSON.stringify(KEYS)}) localStorage.removeItem(k);
    const seed = ${JSON.stringify(seed)};
    for (const k in seed) localStorage.setItem(k, seed[k]);
    localStorage.setItem('mathgameRankSeen', '999');   // 压住升段庆祝弹窗，也顺带当「别的 key 没被碰」的哨兵
    localStorage.setItem('mathgameSprintBest', ${JSON.stringify(SPRINT)});
    localStorage.setItem('mathgameDaily', ${JSON.stringify(DAILY)});
    return 1; })()`);
  await send('Page.reload', {}, sessionId); await sleep(700);
  await ev(`window.__errs=[];addEventListener('error',e=>window.__errs.push(String(e.message)));`);
  return ev(READ);
}
const J = s => { try { return JSON.parse(s); } catch (e) { return undefined; } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const untouched = (r, label) => P(r.mathgameRankSeen === '999' && r.mathgameSprintBest === SPRINT && r.mathgameDaily === DAILY,
  label + '：RankSeen / SprintBest / Daily 一个字没动（它们不是关卡号为键的）');

// ======== 1. 老存档（无闸门）：全部 +1，闸门落下 ========
console.log('\n######## 1. 老存档整体顺延一关 ########');
const legacy = {
  mathgameStars: '{"1":3,"2":2,"5":1}',
  mathgameBest: '{"1":{"t":12,"s":8},"3":{"t":20,"s":4}}',
  mathgamePace: '{"2":{"n":20,"ms":4000}}',
  mathgameMaxCompletedLevel: '3',
  mathgameWrongLog: JSON.stringify([{ q: '7 × 8', a: 56, u: 9, lv: 3, n: 2 }, { q: '2 + 3', a: 5, u: 4, lv: 1, n: 1 },
    { q: '9 × 9', a: 81, u: 1, lv: 5, n: 1 }, { q: '练习局来的', a: 1, u: 0, lv: 0, n: 1 }, { q: '没有 lv', a: 1, u: 0, n: 1 }]),
};
let r = await load(legacy);
P(r.cards === 6, '菜单渲染出六张关卡卡（迁移没把菜单带崩）', String(r.cards));
P(same(J(r.mathgameStars), { 2: 3, 3: 2, 6: 1 }), '星星表键 +1', r.mathgameStars);
P(same(J(r.mathgameBest), { 2: { t: 12, s: 8 }, 4: { t: 20, s: 4 } }), '最佳成绩表键 +1（值原样）', r.mathgameBest);
P(same(J(r.mathgamePace), { 3: { n: 20, ms: 4000 } }), '配速表键 +1（值原样）', r.mathgamePace);
P(r.mathgameMaxCompletedLevel === '4', '已通关数 3 → 4', r.mathgameMaxCompletedLevel);
P(r.unlocked === 6, '没有通关解锁：无论通关数多少，六关始终全部开放', String(r.unlocked));
const log = J(r.mathgameWrongLog) || [];
P(same(log.map(x => x.lv), [4, 2, 6, 0, undefined]), '错题本 lv +1；练习局(0)与缺 lv 的行不动', JSON.stringify(log.map(x => x.lv)));
P(log.length === 5 && log[0].q === '7 × 8' && log[0].n === 2, '错题本其它字段原样', JSON.stringify(log[0]));
P(r.mathgameLevelsVer === '2', '闸门 mathgameLevelsVer = 2', r.mathgameLevelsVer);
untouched(r, '老存档');
P(r.errs.length === 0, '无 JS 错误', JSON.stringify(r.errs));

// 第二次进菜单必须安静 —— 「只迁一次」的真闸门
await send('Page.reload', {}, sessionId); await sleep(700);
const r2 = await ev(READ);
P(r2.mathgameStars === r.mathgameStars && r2.mathgameBest === r.mathgameBest && r2.mathgamePace === r.mathgamePace
  && r2.mathgameMaxCompletedLevel === r.mathgameMaxCompletedLevel && r2.mathgameWrongLog === r.mathgameWrongLog,
  '再进一次菜单：五份数据一字不动（没有迁第二次）');
await send('Page.reload', {}, sessionId); await sleep(700);
const r3 = await ev(READ);
P(r3.mathgameMaxCompletedLevel === '4' && r3.mathgameStars === r.mathgameStars, '第三次也一样', r3.mathgameMaxCompletedLevel);

// ======== 2. 新装机器：只落闸门，不凭空造数据 ========
console.log('\n######## 2. 全新安装只落闸门 ########');
r = await load({});
P(r.mathgameLevelsVer === '2', '闸门落下', r.mathgameLevelsVer);
P(r.mathgameStars === null && r.mathgameBest === null && r.mathgamePace === null
  && r.mathgameMaxCompletedLevel === null && r.mathgameWrongLog === null, '五份关卡数据仍是 null（没造出空表）',
  JSON.stringify([r.mathgameStars, r.mathgameBest, r.mathgamePace, r.mathgameMaxCompletedLevel, r.mathgameWrongLog]));
P(r.cards === 6 && r.unlocked === 6, '六张卡、全新安装也六关全开放', r.cards + ' / ' + r.unlocked);
untouched(r, '新装');

// ======== 3. 边界：通关数 0 不动；全通关封顶 6；已有闸门不再迁 ========
console.log('\n######## 3. 边界 ########');
r = await load({ mathgameMaxCompletedLevel: '0', mathgameStars: '{"1":2}' });
P(r.mathgameMaxCompletedLevel === '0' && r.unlocked === 6, '通关数 0 保持 0（不能迁成 1 凭空多记一关通关）', r.mathgameMaxCompletedLevel);
P(same(J(r.mathgameStars), { 2: 2 }), '同档的星星照常顺延', r.mathgameStars);
r = await load({ mathgameMaxCompletedLevel: '5' });
P(r.mathgameMaxCompletedLevel === '6' && r.unlocked === 6, '老全通关 5 → 6，第 6 关开放', r.mathgameMaxCompletedLevel + ' / ' + r.unlocked);
r = await load({ mathgameMaxCompletedLevel: '9' });
P(r.mathgameMaxCompletedLevel === '6', '离谱的大值封顶 6（不越过 TOTAL_LEVELS）', r.mathgameMaxCompletedLevel);
r = await load({ mathgameLevelsVer: '2', mathgameStars: '{"1":3}', mathgameMaxCompletedLevel: '3', mathgameWrongLog: '[{"q":"1 + 1","lv":2}]' });
P(r.mathgameStars === '{"1":3}' && r.mathgameMaxCompletedLevel === '3' && J(r.mathgameWrongLog)[0].lv === 2,
  '已是六关编号（闸门 = 2）：数据原样，不再顺延');
r = await load({ mathgameLevelsVer: 'abc', mathgameStars: '{"1":3}' });
P(same(J(r.mathgameStars), { 2: 3 }) && r.mathgameLevelsVer === '2', '闸门是坏值（非 2）→ 当没迁过，迁完落成 2', r.mathgameStars + ' / ' + r.mathgameLevelsVer);
r = await load({ mathgameStars: '{"0":3,"x":2,"1":1,"-4":3}' });
P(same(J(r.mathgameStars), { 2: 1 }), '星星表里非关卡键(0 / 字母 / 负数)被丢掉，只留有效关', r.mathgameStars);

// ======== 4. 坏值：不崩、闸门照落、坏数据不被「修」成别的东西 ========
console.log('\n######## 4. 坏值不崩 ########');
const junk = {
  mathgameStars: 'not json', mathgameBest: '[]', mathgamePace: 'null',
  mathgameMaxCompletedLevel: 'abc', mathgameWrongLog: '{"x":1}',
};
r = await load(junk);
P(r.cards === 6, '五份全是坏值，菜单照样渲染六张卡', String(r.cards));
P(r.mathgameLevelsVer === '2', '闸门照落（否则每次进菜单都重试一遍）', r.mathgameLevelsVer);
P(r.mathgameStars === 'not json' && r.mathgameBest === '[]' && r.mathgamePace === 'null'
  && r.mathgameMaxCompletedLevel === 'abc' && r.mathgameWrongLog === '{"x":1}', '坏值原样留着（读取侧各自有兜底，迁移不拿它们瞎改）',
  JSON.stringify([r.mathgameStars, r.mathgameBest, r.mathgamePace, r.mathgameMaxCompletedLevel, r.mathgameWrongLog]));
P(r.unlocked === 6, '坏的通关数 → 六关照样全开放', String(r.unlocked));
P(r.errs.length === 0, '无 JS 错误', JSON.stringify(r.errs));
untouched(r, '坏值');
r = await load({ mathgameStars: '{"1":3}', mathgameWrongLog: '[null, 7, {"q":"a","lv":"2"}, {"lv":-1}]' });
const lg = J(r.mathgameWrongLog);
P(Array.isArray(lg) && lg.length === 4 && lg[0] === null && lg[1] === 7 && lg[2].lv === 3 && lg[3].lv === -1,
  '错题本里混着 null / 数字 / 字符串 lv / 负 lv：不崩，字符串 "2" 转成 3，负数不动', r.mathgameWrongLog);

// 跑完把 localStorage 恢复干净，别给后面的脚本留一份「带哨兵」的档案
await ev(`for (const k of ${JSON.stringify(KEYS)}) localStorage.removeItem(k); 1`);

console.log('\n' + (fail === 0 ? '=== LEVELS MIGRATION PASS ===' : '=== ' + fail + ' FAIL ==='));
await send('Target.closeTarget', { targetId });
ws.close(); process.exit(fail ? 1 : 0);
