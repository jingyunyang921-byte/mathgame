// 闸门：学龄前语音 + 小手引导（孩子不识字也知道下一步）。
//   菜单：领养弹窗 / 小窝 / 领养后 / 空闲 4 秒出发提示（最多 2 次、有星不提示、弹窗开着顺延）/ 看题听题钮 / 六关岛 / 打卡领奖；
//   小手：落在目标钮上、始终 aria-hidden=true、碰屏即收、不挡点击；声音跟「读题语音」走（0 档不调 TTS，小手照出）；
//   离页：语音在播时先 Tts.stop 再延迟 150ms 跳，没在播就直接跳；
//   游戏页：开局规则卡只在「本关还没拿过星」时念，速算 / 错题重练 / 已有星不念；首题示范小手同步念一句；
//   结算舞台：第一次通关（或本关还没拿过星又没过）时，主按钮上伸小手并念一句去向；老关安静、0 档不出声、等引擎夸奖念完再念、收舞台不补念；
//   静态：菜单引导句和游戏页新增句都已打进 APK（assets/tts_bundled），游戏页新增句都登记在 mgTtsPrefetchLines。
// 用法：node .shots/verify_preread_guide.mjs（需要本地 headless Chrome :9333 + http.server :8000）
import { petBrowser, verdicts } from './pet_browser.mjs';
import { bundleMissing } from './bundle_tts.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
const MOCK = `(() => {
  window.__say = []; window.__stops = 0; window.__hang = false;
  window.Capacitor = { isNativePlatform: () => true, Plugins: { Tts: {
    speak: o => { window.__say.push(o.text); return window.__hang ? new Promise(() => {}) : Promise.resolve(); },
    stop: () => { window.__stops++; return Promise.resolve(); },
    prefetch: () => Promise.resolve() } } };
})()`;
await b.send('Page.addScriptToEvaluateOnNewDocument', { source: MOCK });
await b.viewport(1000, 576);
await b.nav(b.menu);
await b.preserve();

const SET = (voice, extra = '') => b.ev(`localStorage.clear();sessionStorage.clear();localStorage.setItem('mathgameSettings', JSON.stringify({ sfx: 3, bgm: 0, voice: ${voice} }));${extra};true`);
const load = async (voice, extra, wait = 1500) => { await SET(voice, extra); await b.nav(b.menu); await b.sleep(wait); };
const say = () => b.ev('window.__say.slice()');
const ADOPTED = `MG_PET.adopt()`;
// 小手落点：第一圈波纹的圆心就是指尖，必须落在目标钮的矩形里；小手整体不出屏。
const hand = id => b.ev(`(() => {
  const root = document.getElementById('mg-point'), t = typeof ${JSON.stringify(id)} === 'string' && ${JSON.stringify(id)}.startsWith('.') ? document.querySelector(${JSON.stringify(id)}) : document.getElementById(${JSON.stringify(id)});
  if (!root || !t) return { shown: false };
  const rip = root.querySelector('.pt-rip'), rr = rip.getBoundingClientRect(), tr = t.getBoundingClientRect(), hr = root.querySelector('.pt-hand').getBoundingClientRect();
  const cx = rr.left + rr.width / 2, cy = rr.top + rr.height / 2;
  return { shown: true, aria: root.getAttribute('aria-hidden'), pe: getComputedStyle(root).pointerEvents, anyFalse: !!root.querySelector('[aria-hidden="false"]'),
    inside: cx >= tr.left && cx <= tr.right && cy >= tr.top && cy <= tr.bottom, onScreen: hr.left >= 0 && hr.right <= innerWidth && hr.top >= 0 && hr.bottom <= innerHeight + 6, rects: [Math.round(cx), Math.round(cy), Math.round(tr.left), Math.round(tr.top), Math.round(tr.right), Math.round(tr.bottom)] };
})()`);
const hasHand = () => b.ev(`!!document.getElementById('mg-point')`);
const tap = () => b.ev(`document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); true`);

console.log('\n-- 菜单：全新设备 --');
await load(3);
let h = await hand('confirmOkBtn');
P(JSON.stringify(await say()) === JSON.stringify(['欢迎来到数学岛！先领一颗萌蛋吧！']), 'A 领养弹窗出现时念一句，且只念这一句', await say());
P(h.shown && h.aria === 'true' && h.pe === 'none' && !h.anyFalse, 'A 小手存在、aria-hidden=true、不接收点击', h);
P(h.inside && h.onScreen, 'A 小手指尖落在「去领养」钮上、整只手在屏内', h.rects);
P(await b.ev(`!document.querySelector('#mg-point[aria-hidden="false"]')`), 'A 小手不会被 [aria-hidden=false] 判成占屏');
await b.shot('preread_adopt_hand');
await tap();
P(!(await hasHand()), 'A 碰一下屏幕小手立刻收起');

console.log('\n-- 菜单：读题语音 0 档 --');
await load(0);
h = await hand('confirmOkBtn');
P((await say()).length === 0 && (await b.ev('window.__stops')) === 0, 'B 语音 0 档：一次 TTS 都不调（也不 stop）', await say());
P(h.shown && h.inside, 'B 语音 0 档：小手照常出现在「去领养」钮上', h.rects);

console.log('\n-- 菜单：领养流程 --');
await load(3);
await b.ev(`document.getElementById('confirmOkBtn').click();true`);
await b.sleep(1100);
await b.shot('preread_pet_hand');
let s = await say();
P(s[s.length - 1] === '点一下，领养萌蛋！' && !(await hasHand()), 'C 点「去领养」进小窝：念「点一下，领养萌蛋！」，不再出小手（领养药丸自己轻轻脉冲）', s);
const pt = await b.ev(`(() => { const r = document.getElementById('petAdoptBtn').getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
await b.sleep(300);
s = await say();
P(s[s.length - 1] === '你好呀，萌蛋！一起玩吧！' && !(await hasHand()), 'C 真点领养药丸后念「你好呀，萌蛋！一起玩吧！」，没有小手', s);
await b.sleep(2300);
P(!(await hasHand()), 'C 领养后过了 2 秒仍然没有小手指向关闭钮（右上角圆钮自己就够显眼）');
await b.ev(`hidePet();true`);
P(!(await hasHand()), 'C 关闭小窝后小手收起');

console.log('\n-- 菜单：看题 / 听题 / 六关 --');
await load(3, ADOPTED, 800);
P((await say()).length === 0, 'D 已领养、有星前：进菜单不自己念', await say());
await b.ev(`document.getElementById('btnAudio').click();true`);
await b.ev(`document.getElementById('btnVisual').click();true`);
s = await say();
P(JSON.stringify(s) === JSON.stringify(['听题，说答案！', '看题，写答案！']), 'D 点听算钮念「听题，说答案！」、点口算钮念「看题，写答案！」', s);
const LV_POOLS = await b.ev(`MG_SAY.levels`);
await b.ev(`window.__say.length = 0; for (let n = 1; n <= 6; n++) selectLevel(n); true`);
s = await say();
P(s.length === 6 && s.every((t, k) => LV_POOLS[k].includes(t)), 'D 点关卡岛依次念各关内容简介（每关两句之一）', s);

console.log('\n-- 菜单：空闲提示（已领养、总星数 0） --');
await load(3, ADOPTED, 3000);
P(!(await hasHand()) && (await say()).length === 0, 'E 地图静止 3 秒：还不提示', await say());
await b.sleep(2800);
h = await hand('.cta');
s = await say();
P(JSON.stringify(s) === JSON.stringify(['点出发，开始玩吧！']) && h.shown && h.inside && h.onScreen, 'E 静止约 5 秒：念「点出发，开始玩吧！」，小手落在「出发」钮上', [s, h]);
P(await b.ev(`!document.querySelector('[aria-hidden="false"]') && _hintN === 1`), 'E 第一次提示：小手不算占屏、计数 1');
await b.shot('preread_idle_hand');
await tap();
P(!(await hasHand()), 'E 碰屏后小手收起');
await b.sleep(4900);
h = await hand('.cta');
s = await say();
P(s.length === 2 && h.shown && h.inside && (await b.ev('_hintN')) === 2, 'E 再静止 4 秒：第二次提示（共 2 次）', [s.length, h.shown]);
await tap();
await b.ev(`mgArmHint(200);true`);
await b.sleep(700);
P((await say()).length === 2 && !(await hasHand()) && (await b.ev('_hintN')) === 2, 'E 每次进菜单最多提示 2 次，第 3 次不出', await say());

await b.ev(`_hintN = 0; localStorage.setItem('mathgameStars', JSON.stringify({ 1: 1 })); window.__say.length = 0; mgIdleHint(); true`);
await b.sleep(900);
P(!(await hasHand()) && (await say()).length === 0 && (await b.ev('_hintN')) === 0, 'E 总星数 > 0：不提示', await say());
await b.ev(`localStorage.removeItem('mathgameStars'); document.getElementById('confirmModal').setAttribute('aria-hidden', 'false'); mgIdleHint(); true`);
await b.sleep(900);
P(!(await hasHand()) && (await say()).length === 0 && (await b.ev('_hintN')) === 0, 'E 弹窗开着：顺延，不提示也不计数', await say());
await b.ev(`document.getElementById('confirmModal').setAttribute('aria-hidden', 'true'); clearTimeout(_hintTimer); true`);

await load(3, `sessionStorage.setItem('mgAdoptGuide', '1')`, 800);
await b.ev(`mgIdleHint(); true`);
await b.sleep(400);
h = await hand('petBtn');
s = await say();
P(s[s.length - 1] === '先领一颗萌蛋吧！' && h.shown && h.inside, 'E 还没领养：空闲提示改指顶栏萌宠钮，念「先领一颗萌蛋吧！」', [s, h.rects]);

console.log('\n-- 菜单：打卡领奖 --');
await load(3, `${ADOPTED}; localStorage.setItem('mathgameDaily', JSON.stringify({ last: mgDayStr(new Date()), streak: 1, total: 1, bestStreak: 1 }))`, 1200);
await b.ev(`if (typeof hideDaily === 'function') hideDaily(); mgPointStop(); window.__say.length = 0; true`);
P(await b.ev(`isChestClaimable()`), 'F 前置：有一份宝箱可领');
await b.ev(`showDaily(); true`);
await b.sleep(900);
h = await hand('dailyBtn');
s = await say();
P(JSON.stringify(s) === JSON.stringify(['今天的奖励来啦，点领取！']) && h.shown && h.inside && h.onScreen, 'F 打卡日历开着且可领奖：念一句，小手指向「领取」钮', [s, h]);
await b.ev(`hideDaily(); true`);
P(!(await hasHand()), 'F 关闭日历后小手收起');
await b.ev(`localStorage.removeItem('mathgameDaily'); window.__say.length = 0; showDaily(); true`);
await b.sleep(900);
P(!(await hasHand()) && (await say()).length === 0, 'F 没有可领的奖：不念、不指', await say());
await b.ev(`hideDaily(); true`);

console.log('\n-- 菜单：离页 --');
await load(3, ADOPTED, 800);
const leave = hang => b.ev(`(() => {
  window.__hang = ${hang}; window.__stops = 0; if (${hang}) mgSay('点出发，开始玩吧！');
  const delays = [], orig = window.setTimeout;
  window.setTimeout = function (f, ms) { delays.push(ms); return orig.apply(this, arguments); };
  try { mgGoGame(); } finally { window.setTimeout = orig; }
  return { stops: window.__stops, delayed: delays.includes(150) };
})()`);
let lv = await leave(false);
P(lv.stops === 0 && !lv.delayed, 'G 没有语音在播：直接跳，不 stop、不多等', lv);
await b.sleep(1500);
await load(3, ADOPTED, 800);
lv = await leave(true);
P(lv.stops === 1 && lv.delayed, 'G 语音正在播：先 Tts.stop 一次，再延迟 150ms 才跳（防原生回调撞上销毁的页面）', lv);
await b.sleep(1500);

console.log('\n-- 游戏页：开局规则卡 / 首题示范小手（真实开局流程） --');
const OPEN = { 1: ['暖草坡到啦，小兔等你！', '十以内加减，找暖草去！'], 5: ['扬起帆，去贝壳海岸！', '两位数乘除，扬帆拾贝壳！'] };
const openOk = (line, lv) => OPEN[lv].includes(line);
const playFrom = async (level, mode, stars, extra = '') => {
  await SET(3, `localStorage.setItem('mathgameStars', JSON.stringify(${JSON.stringify(stars)}))`);
  await b.boot(level, mode, extra);
  return say();
};
s = await playFrom(1, 'visual', {});
P(s.length === 3 && s[0] === '小兔出题，写下答案！' && openOk(s[1], 1) && s[2] === '跟着小手写！', 'I 第 1 关视算、没拿过星：规则卡念「小兔出题，写下答案！」→ 报幕（两句轮换之一）→ 示范小手念「跟着小手写！」', s);
P(await b.ev(`!!document.getElementById('mg-demo')`), 'I 示范小手在屏上');
s = await playFrom(1, 'visual', { 1: 2 });
P(s.length === 1 && openOk(s[0], 1), 'I 第 1 关已有星：只念报幕，规则卡和示范小手都不出声', s);
P(await b.ev(`!document.getElementById('mg-demo')`), 'I 已有星：没有示范小手');
s = await playFrom(5, 'visual', {});
P(s.length === 3 && s[0] === '看清题目，选对小门！' && openOk(s[1], 5) && s[2] === '点对的门！', 'I 第 5 关视算、没拿过星：规则卡念「看清题目，选对小门！」，示范念「点对的门！」', s);
s = await playFrom(0, 'visual', {}, `sessionStorage.setItem('mgSprint','1');sessionStorage.setItem('mgSprintTier','1')`);
P(s.length === 1 && ['一分钟速算，冲呀！', '看谁算得快，冲刺啦！'].includes(s[0]), 'I 一分钟速算：只念速算开场句，不念规则、没有示范', s);

console.log('\n-- 游戏页：规则卡念哪句、念多久（直接调 runIntroSequence） --');
await playFrom(1, 'visual', {});
const intro = (lvl, mode, sprint, stars, hang = false) => b.ev(`(async () => {
  localStorage.setItem('mathgameStars', JSON.stringify(${JSON.stringify(stars)}));
  window.__hang = ${hang}; window.__say.length = 0;
  const t0 = performance.now(), p = runIntroSequence(${lvl}, ${JSON.stringify(mode)}, ${sprint});
  const said = window.__say.slice();
  if (!${hang}) { window._mgSkipIntro && window._mgSkipIntro(); }
  await p; window.__hang = false;
  return { said, ms: Math.round(performance.now() - t0) };
})()`);
let r = await intro(1, 'audio', false, {});
P(JSON.stringify(r.said) === JSON.stringify(['小兔念题，你说答案！']), 'J 第 1 关听算、没拿过星：念「小兔念题，你说答案！」', r.said);
r = await intro(5, 'audio', false, {});
P(JSON.stringify(r.said) === JSON.stringify(['听清题目，选对小门！']), 'J 第 5 关听算：念「听清题目，选对小门！」', r.said);
r = await intro(5, 'visual', false, {});
P(JSON.stringify(r.said) === JSON.stringify(['看清题目，选对小门！']), 'J 第 5 关视算：念「看清题目，选对小门！」', r.said);
r = await intro(3, 'visual', false, { 3: 1 });
P(r.said.length === 0, 'J 本关已有星：规则卡不念', r.said);
r = await intro(3, 'visual', true, {});
P(r.said.length === 0, 'J 一分钟速算：规则卡不念', r.said);
r = await intro(0, 'visual', false, {});
P(r.said.length === 0, 'J 错题重练（第 0 关）：规则卡不念', r.said);
r = await intro(3, 'visual', false, {}, true);
P(r.ms >= 2900 && r.ms <= 3600, 'J 要念且语音挂起：规则卡最长 3 秒（_mgSpeakAwait 保险）收起，不会卡死', r.ms);
r = await intro(3, 'visual', false, { 3: 1 }, true);
P(r.ms >= 2500 && r.ms <= 2950, 'J 不用念时：规则卡仍是原来的 2.6 秒', r.ms);

console.log('\n-- 游戏页：结算舞台的小手与念句（第一次通关 / 还没拿过星才引导） --');
const RES = { next: '过关啦！点这里，去下一关！', winAgain: '过关啦！点这里，再来一局！', again: '点这里，再来一局！' };
const resultRound = async (level, win, stars, voice = 3, vp = [1000, 576]) => {
  await b.viewport(vp[0], vp[1]);
  await SET(voice);
  await b.boot(level, 'visual');
  await b.ev(`localStorage.removeItem('mathgamePet'); localStorage.setItem('mathgameStars', JSON.stringify(${JSON.stringify(stars)})); MG_PET.adopt(); window.__say.length = 0;
    _mgWrong=${win ? 0 : 3};_mgCorrect=${win ? 10 : 2};_mgMaxStreak=${win ? 10 : 2};_mgRoundStart=Date.now()-9000;debugEndGame(${win});true`);
  await b.poll(`(document.getElementById('cs-stage')||{className:''}).className.includes('closed')`, 8000);
  await b.sleep(700);
};
const openChest = async () => {
  await b.ev(`document.querySelector('#cs-stage .cs-chest').click();true`);
  await b.poll('!!document.querySelector("#cs-stage .cs-acts")', 12000);
};
const resSays = async () => (await say()).filter(t => Object.values(RES).includes(t));
const stageProbe = () => b.ev(`(() => {
  const s = document.getElementById('cs-stage'), pri = s.querySelector('.cs-act.pri'), hd = pri && pri.querySelector('.cs-act-hand');
  const hands = s.querySelectorAll('.cs-act-hand').length;
  if (!hd) return { hand: false, hands, go: pri && pri.dataset.go };
  const r = hd.getBoundingClientRect(), p = pri.getBoundingClientRect(), sec = s.querySelector('.cs-act.sec');
  let ov = 0;
  if (sec) { const q = sec.getBoundingClientRect(), w = Math.min(r.right, q.right) - Math.max(r.left, q.left), h = Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top); ov = w > 0 && h > 0 ? Math.round(w * h * 100 / (r.width * r.height)) : 0; }
  return { hand: true, hands, go: pri.dataset.go, label: pri.textContent.trim(), aria: hd.getAttribute('aria-hidden'), pe: getComputedStyle(hd).pointerEvents, op: getComputedStyle(hd).opacity,
    onScreen: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, belowBtn: r.top > p.top + p.height / 2, ov,
    rect: [r, p].map(x => [x.left, x.top, x.right, x.bottom].map(Math.round)) };
})()`);

await resultRound(1, true, {});
await openChest();
await b.sleep(1400);
let hp = await stageProbe(), rs = await resSays();
P(hp.hand && hp.hands === 1 && hp.go === 'next' && /挑战第2关/.test(hp.label), 'L 第 1 关第一次通关：小手只有一只，伸在主按钮「挑战第2关」上', hp);
P(hp.aria === 'true' && hp.pe === 'none' && hp.op === '1' && hp.onScreen && hp.belowBtn, 'L 小手 aria-hidden=true、不接收点击、已伸出、整只手在屏内、落在按钮下半部', hp);
P(JSON.stringify(rs) === JSON.stringify([RES.next]), 'L 同时念一句「过关啦！点这里，去下一关！」，且只念一次', rs);
await b.shot('preread_result_hand');
for (const vp of [[900, 500], [412, 915]]) {
  await resultRound(1, true, {}, 3, vp);
  await openChest();
  await b.sleep(1400);
  hp = await stageProbe();
  P(hp.hand && hp.onScreen && hp.ov <= (vp[0] >= 900 ? 0 : 40), `L ${vp[0]}×${vp[1]} 小手在屏内${vp[0] >= 900 ? '、不压到次按钮' : '、压到次按钮不超过 40%'}`, hp);
  await b.shot(`preread_result_hand_${vp[0]}x${vp[1]}`);
}
await b.viewport(1000, 576);

await resultRound(6, true, {});
await openChest();
await b.sleep(1400);
hp = await stageProbe(); rs = await resSays();
P(hp.hand && hp.go === 'retry' && JSON.stringify(rs) === JSON.stringify([RES.winAgain]), 'L 第 6 关通关（没有下一关）：小手伸在「再来一局」上，念「过关啦！点这里，再来一局！」', [hp.go, rs]);

await resultRound(1, false, {});
await openChest();
await b.sleep(1400);
hp = await stageProbe(); rs = await resSays();
P(hp.hand && hp.go === 'retry' && JSON.stringify(rs) === JSON.stringify([RES.again]), 'L 第 1 关没过、本关还没拿过星：小手伸在「再来一局」上，念「点这里，再来一局！」', [hp.go, rs]);
await resultRound(1, true, { 1: 2 });
await openChest();
await b.sleep(1400);
hp = await stageProbe(); rs = await resSays();
P(!hp.hand && hp.hands === 0 && hp.go === 'next' && rs.length === 0, 'M 第 1 关已拿过星再通关：没有小手、不念（老关保持安静）', [hp, rs]);
await resultRound(1, false, { 1: 1 });
await openChest();
await b.sleep(1400);
hp = await stageProbe(); rs = await resSays();
P(!hp.hand && hp.hands === 0 && rs.length === 0, 'M 第 1 关已拿过星、这局没过：没有小手、不念', [hp, rs]);
P(await b.ev(`(() => { const sn = _mgChestSnap; sn.level = 0; sn.win = true; sn.firstPartner = true; const r = mgResultFresh(); return r === false; })()`), 'M 练习 / 复习 / 速算（第 0 关）：不引导');

await resultRound(1, true, {}, 0);
await openChest();
await b.sleep(1400);
hp = await stageProbe();
P(hp.hand && hp.op === '1' && (await say()).length === 0, 'N 读题语音 0 档：一次 TTS 都不调，小手照常伸出', [hp.hand, await say()]);

await resultRound(1, true, {});
await openChest();
await b.ev(`mgStageDismiss(); true`);
await b.sleep(1400);
P((await resSays()).length === 0, 'O 句子还没念出（约 0.5 秒）就收起舞台：不再补念', await resSays());

await resultRound(1, true, {});
await b.ev(`window._currentGame._ttsLast = new Promise(r => { window.__rel = r; }); true`);
await openChest();
await b.sleep(1300);
P((await resSays()).length === 0, 'P 引擎的通关夸奖还没念完：先等，不打断', await resSays());
await b.ev(`window.__rel(); true`);
await b.sleep(400);
P(JSON.stringify(await resSays()) === JSON.stringify([RES.next]), 'P 夸奖念完后紧接着念去向', await resSays());

await resultRound(1, true, {});
await b.ev(`window._currentGame._ttsLast = new Promise(() => {}); true`);
await openChest();
await b.sleep(2500);
P((await resSays()).length === 0, 'Q 夸奖挂住不返回：2.5 秒内仍在等', await resSays());
await b.sleep(1500);
P(JSON.stringify(await resSays()) === JSON.stringify([RES.next]), 'Q 最多等 3 秒，之后照念（不会一直不出声）', await resSays());

await resultRound(1, true, {});
await b.ev(`window._currentGame._ttsLast = new Promise(r => { window.__rel = r; }); true`);
await openChest();
await b.sleep(900);
await b.ev(`_mgSafeLeave(window._currentGame, () => {}); window.__rel(); true`);
await b.sleep(700);
P((await resSays()).length === 0, 'R 还在等夸奖念完时点「下一关」（_mgSafeLeave 先 Tts.stop）：夸奖被打断后不能再补念去向，否则 stop 之后又起新语音', await resSays());
await b.viewport(1000, 576);

console.log('\n-- 静态：新增语音句都已内置，且字数短 --');
const G = await b.ev(`({ lines: mgTtsPrefetchLines(), open: mgFlat(MG_OPEN_LINE), sp: MG_SPRINT_OPEN_LINE.concat([MG_READY_LINE]), rule: mgFlat(MG_RULE_SAY), poke: mgFlat(MG_POKE_SAY), demo: Object.values(MG_DEMO_SAY), res: Object.values(MG_RESULT_SAY) })`);
const gameNew = [].concat(G.open, G.sp, G.rule, G.poke, G.demo, G.res);
P(G.res.length === 3 && G.res.every(t => Object.values(RES).includes(t)), 'K 结算去向 3 句与本关用到的一致', G.res);
P(gameNew.every(t => G.lines.includes(t)), 'K 游戏页新增句（每关两句报幕 + 速算两句 + 准备好了 + 每关视算/听算规则 + 点萌蛋/小动物的回应 + 示范 2 + 结算去向 3）都登记在 mgTtsPrefetchLines', gameNew.filter(t => !G.lines.includes(t)));
P(bundleMissing(gameNew).length === 0, 'K 游戏页新增句都已打进 APK（缺了就跑 node .shots/bundle_tts.mjs）', bundleMissing(gameNew));
P(G.lines.length > 40 && G.lines.length < 160, 'K 预下载清单仍在 40-160 句之内（每句约 10KB）', G.lines.length);
await b.nav(b.menu);
const M = await b.ev(`mgGuideLines()`);
const SL = await b.ev(`MG_PET_STORY.sayLines()`);
const SAYS = await b.ev(`(() => { const f = o => Object.keys(o).reduce((a, k) => a.concat(typeof o[k] === 'string' ? [o[k]] : f(o[k])), []); return f(MG_SAY); })()`);
P(SAYS.length > 60 && SAYS.every(t => M.includes(t)) && SL.every(t => M.includes(t)) && bundleMissing(M).length === 0, 'K 菜单引导 MG_SAY ' + SAYS.length + ' 句 + 故事卡/贴纸句 ' + SL.length + ' 句都登记在 mgGuideLines 且已打进 APK', [M.length, SAYS.length, SL.length, bundleMissing(M).slice(0, 5)]);
const longest = gameNew.concat(M).flatMap(t => t.split(/[，。！？、]/)).filter(Boolean).reduce((a, t) => (t.length > a.length ? t : a), '');
P(longest.length <= 10, 'K 每个小句不超过 10 字', longest);
P(!(await b.ev(`mgGuideLines().some(t => mgGuideLines().filter(u => u === t).length > 1)`)), 'K 菜单引导句没有重复');

await b.restore();
P(b.errors.length === 0, '无页面脚本异常', b.errors.slice(0, 3));
await b.close();
finish('PREREAD GUIDE');
