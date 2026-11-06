// 闸门：游戏里点萌蛋 / 小动物有互动 + 一句语音（六关各一遍）。
//   命中：L1-4 的蛋是页面元素，L5 的蛋是画布里的船、L6 是右下角的数宝，小动物都在画布里；点空白处什么都不发生；
//   反馈：点中冒一颗爱心；说一句本关专属的话（来自 MG_POKE_SAY），1.2 秒内连点只冒爱心不连念；
//   安静：读题语音 0 档不念、倒计时中 / 暂停弹窗开着 / 本局结束后不响应，听算识别中或正在读题时不抢话；
//   不拦截：点击事件照常往下传，不挡答题。
// 用法：node .shots/verify_poke_interact.mjs（需要本地 headless Chrome + http.server :8000）
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
  window.__say = [];
  window.Capacitor = { isNativePlatform: () => true, Plugins: { Tts: {
    speak: o => { window.__say.push(o.text); return Promise.resolve(); }, stop: () => Promise.resolve(), prefetch: () => Promise.resolve() } } };
})()` });
await b.viewport(960, 576);
await b.nav(b.menu);
await b.preserve();

const seed = (voice, stage = 0) => `(() => {
  const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return MG_PET.dayKey(x); };
  localStorage.clear();
  localStorage.setItem('mathgameSettings', JSON.stringify({ sfx: 3, bgm: 0, voice: ${voice} }));
  localStorage.setItem('mathgamePet', JSON.stringify({ version: 2, adopted: true, exp: 0, stage: ${stage}, adoptedDay: d(-22), lastDay: d(0), xp: 20,
    days: Array.from({ length: 4 }, (_, i) => d(-4 + i)), phase: 0, daily: { date: d(0), correct: 0, rounds: [] }, gifts: [], decor: 'leaf', decors: ['leaf'],
    name: '数宝', hatchDay: '', birthSeen: false, affection: 0, stories: { seen: [], pending: [] } }));
  return true; })()`;
const quiet = () => b.ev(`(() => { const g = window._currentGame; g.locked = false; g._ttsSpeaking = false; g.recognizing = false; MG_POKE.say = 0; window.__say.length = 0; window.__hearts = 0; return true; })()`);
const target = kind => b.ev(`(() => {
  if (${JSON.stringify(kind)} === 'egg' && MG_POKE.level <= 4) { const e = document.querySelector('#mg-egg-slot .es-egg'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  const s = MG_POKE.spots[${JSON.stringify(kind)}]; if (!s) return null;
  const r = s.cv.getBoundingClientRect();
  return { x: r.left + (s.x + s.w / 2) * r.width / s.cv.width, y: r.top + (s.y + s.h / 2) * r.height / s.cv.height };
})()`);
const click = async p => {
  await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1 });
  await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 });
};
const said = () => b.ev('window.__say.slice()');
const hearts = () => b.ev('window.__hearts');
const pools = lv => b.ev(`({ friend: MG_POKE_SAY.friend[${lv}] || [], egg: MG_POKE_SAY.egg[${lv}] || [], pet: MG_POKE_SAY.pet, stage: MG_EGG.stage })`);
const start = async (lv, mode = 'visual', voice = 3) => {
  await b.ev(seed(voice, lv === 6 ? 1 : 0));
  await b.boot(lv, mode);
  await b.sleep(1200);
  await b.ev(`window.__hearts = 0; new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.classList && n.classList.contains('es-heart')) window.__hearts++; }))).observe(document.body, { childList: true }); true`);
};

for (const lv of [1, 2, 3, 4, 5, 6]) {
  console.log(`\n-- 第 ${lv} 关 --`);
  await start(lv);
  const pl = await pools(lv);
  for (const kind of ['friend', 'egg']) {
    const name = kind === 'friend' ? '小动物' : (lv === 6 ? '数宝' : '萌蛋');
    if (kind === 'egg' && lv === 5) await b.sleep(600);
    const p = await target(kind);
    if (!p) { P(false, `L${lv} 找得到${name}的位置`, p); continue; }
    await quiet();
    await click(p);
    await b.sleep(250);
    const s = await said(), pool = kind === 'egg' && (pl.stage >= 1 || lv === 6) ? pl.pet : pl[kind];
    P(s.length === 1 && pool.includes(s[0]), `L${lv} 点${name}：念一句本关专属的话`, [s, pool]);
    P((await hearts()) === 1, `L${lv} 点${name}：冒一颗爱心`, await hearts());
    await click(p);
    await b.sleep(250);
    P((await said()).length === 1 && (await hearts()) === 2, `L${lv} 点${name}：1.2 秒内连点只冒爱心、不连念`, [await said(), await hearts()]);
  }
  if (lv === 3) {
    const p = await target('friend');
    await quiet();
    await b.ev(`window._currentGame.recognizing = true; true`);
    await click(p);
    await b.sleep(200);
    P((await said()).length === 0 && (await hearts()) === 1, 'L3 听算识别中：只冒爱心，不抢话', [await said(), await hearts()]);
    await quiet();
    await b.ev(`window._currentGame.locked = true; true`);
    await click(p);
    await b.sleep(200);
    P((await said()).length === 0, 'L3 答题锁定中：不抢话', await said());
  }
  if (lv === 1) {
    const p = await target('friend');
    await quiet();
    await click({ x: 6, y: 6 });
    await b.sleep(200);
    P((await hearts()) === 0 && (await said()).length === 0, 'L1 点空白处：什么都不发生', [await hearts(), await said()]);
    await b.ev(`window.__bubbled = 0; document.body.addEventListener('pointerdown', () => window.__bubbled++); true`);
    await click(p);
    await b.sleep(200);
    P((await b.ev('window.__bubbled')) === 1, 'L1 点小动物：点击事件照常往下传，不拦截', await b.ev('window.__bubbled'));
    await quiet();
    await b.ev(`document.getElementById('overlay').classList.add('show'); true`);
    await click(p);
    await b.sleep(200);
    P((await hearts()) === 0 && (await said()).length === 0, 'L1 暂停 / 弹窗开着：不响应', [await hearts(), await said()]);
    await b.ev(`document.getElementById('overlay').classList.remove('show'); window._currentGame.gameEnded = true; true`);
    await click(p);
    await b.sleep(200);
    P((await hearts()) === 0 && (await said()).length === 0, 'L1 本局结束后：不响应', [await hearts(), await said()]);
    await b.ev(`window._currentGame.gameEnded = false; true`);
  }
}

console.log('\n-- 读题语音 0 档 --');
await start(2, 'visual', 0);
{
  const p = await target('friend');
  await quiet();
  await click(p);
  await b.sleep(250);
  P((await said()).length === 0 && (await hearts()) === 1, 'L2 读题语音 0 档：不念，爱心照冒', [await said(), await hearts()]);
}

console.log('\n-- 退出清理 --');
await b.ev(`mgEggUnmount(); true`);
P(await b.ev(`MG_POKE.level === 0 && Object.keys(MG_POKE.spots).length === 0`), '离开游戏后命中记录清空，不再响应');

P(b.errors.length === 0, '无页面脚本异常', b.errors.slice(0, 3));
await b.restore();
await b.close();
finish('POKE INTERACT');
