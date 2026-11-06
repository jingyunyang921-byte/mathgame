// 闸门：视算「发呆示范」。孩子在一道题上停着不动约 8 秒，没拿过星的关再放一次示范小手并念一句（每道题最多一次）。
//   触发：本关还没拿过星 + 视算（非速算）+ 这道题上没碰过屏幕 + 当前没有示范小手 + 人在前台；
//   不触发：已有星的关、听算、速算、碰过屏幕的题、切后台期间（回来重新计时）；
//   声音：跟「读题语音」走，0 档不出声、小手照出。
// 用法：node .shots/verify_visual_idle.mjs（需要本地 headless Chrome :9333 + http.server :8000，约 2 分钟）
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
  window.__say = []; window.__hid = false;
  window.Capacitor = { isNativePlatform: () => true, Plugins: { Tts: {
    speak: o => { window.__say.push(o.text); return Promise.resolve(); },
    stop: () => Promise.resolve(), prefetch: () => Promise.resolve() } } };
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.__hid });
})()` });
await b.viewport(1000, 576);
await b.nav(b.menu);
await b.preserve();
const WRITE = '跟着小手写！', DOOR = '点对的门！';
const SET = (voice, stars = {}) => b.ev(`localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('mathgameSettings', JSON.stringify({ sfx: 0, bgm: 0, voice: ${voice} }));
  localStorage.setItem('mathgameStars', JSON.stringify(${JSON.stringify(stars)})); true`);
const demoUp = () => b.ev(`!!document.getElementById('mg-demo')`);
const said = line => b.ev(`window.__say.filter(t => t === ${JSON.stringify(line)}).length`);
const quiet = ms => b.sleep(ms);
const next = () => b.ev('window._currentGame.nextQuestion(); true');
const hide = h => b.ev(`window.__hid = ${h}; true`);

console.log('\n-- L1 视算、没拿过星、读题语音开 --');
await SET(3);
await b.boot(1, 'visual');
await b.ev('mgDemoStop(); true');
P((await said(WRITE)) === 1, '开局示范念过一次', await said(WRITE));
await quiet(5000);
P(!(await demoUp()), 'A 才静止 5 秒：还没到 8 秒，不放示范');
await b.poll(`!!document.getElementById('mg-demo')`, 5000);
P(await demoUp() && (await said(WRITE)) === 2, 'A 静止约 8 秒：再放示范小手，并念一句「跟着小手写！」', await said(WRITE));
await b.shot('visual_idle_demo');
await b.ev('mgDemoStop(); true');
await quiet(9800);
P(!(await demoUp()) && (await said(WRITE)) === 2, 'B 同一道题只提示一次：示范收起后再静止，也不再放', await said(WRITE));
await next();
await b.poll(`!!document.getElementById('mg-demo')`, 12000);
P((await said(WRITE)) === 3, 'B 换了一道题：重新计时，再发呆又放一次', await said(WRITE));
await b.ev('mgDemoStop(); true');
await next();
await quiet(800);
await b.ev(`document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); true`);
await quiet(9800);
P(!(await demoUp()) && (await said(WRITE)) === 3, 'C 这道题上碰过屏幕：说明在动手，不打扰', await said(WRITE));

console.log('\n-- 切后台期间不计时 --');
await next();
await quiet(800);
await hide(true);
await quiet(9500);
P(!(await demoUp()), 'D 人在后台 9.5 秒：不放');
await hide(false);
await quiet(2500);
P(!(await demoUp()), 'D 回前台后 2.5 秒：从头重新计时，仍不放');
await b.poll(`!!document.getElementById('mg-demo')`, 9000);
P(await demoUp(), 'D 回前台后再静止 8 秒：放');
await b.ev('mgDemoStop(); true');

console.log('\n-- 不该触发的情形 --');
await SET(3, { 1: 2 });
await b.boot(1, 'visual');
await quiet(10000);
P(!(await demoUp()) && (await said(WRITE)) === 0, 'E 本关已有星：不放、不念', await said(WRITE));
await SET(3);
await b.boot(1, 'visual');
await b.ev('mgDemoStop(); true');
const spies = (lvl, mode, sprint) => b.ev(`(() => {
  const orig = window.setInterval; let n = 0;
  window.setInterval = function () { n++; return orig.apply(this, arguments); };
  try { mgVisualIdleStart(${lvl}, ${JSON.stringify(mode)}, ${sprint}, window._currentGame); } finally { window.setInterval = orig; }
  const armed = n === 1; clearInterval(_mgVisIdle); return armed;
})()`);
P((await spies(1, 'audio', false)) === false, 'F 听算：不起发呆计时');
P((await spies(1, 'visual', true)) === false, 'F 一分钟速算：不起发呆计时');
P((await spies(0, 'visual', false)) === false, 'F 错题重练（第 0 关）：不起发呆计时');
P((await spies(1, 'visual', false)) === true, 'F 视算第 1 关：起发呆计时（对照）');

console.log('\n-- 第 5 关（点门） / 读题语音 0 档 --');
await SET(3);
await b.boot(5, 'visual');
await b.ev('mgDemoStop(); true');
await b.poll(`!!document.getElementById('mg-demo')`, 12000);
P(await demoUp() && (await said(DOOR)) === 2, 'G 第 5 关发呆：再放点门示范并念「点对的门！」', await said(DOOR));
await SET(0);
await b.boot(1, 'visual');
await b.ev('mgDemoStop(); window.__say.length = 0; true');
await b.poll(`!!document.getElementById('mg-demo')`, 12000);
P(await demoUp() && (await b.ev('window.__say.length')) === 0, 'H 读题语音 0 档：小手照出，一次 TTS 都不调', await b.ev('window.__say'));

await b.restore();
P(b.errors.length === 0, '无页面脚本异常', b.errors.slice(0, 3));
await b.close();
finish('VISUAL IDLE');
