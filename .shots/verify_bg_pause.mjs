// 闸门：切到后台（document.hidden）时背景音乐暂停、各种计时器不走，回来再接着。
//   背景音乐：BGM.pause() 挂起自己的 AudioContext，BGM.resume() 恢复；没在放时切后台 / 回前台不会把它唤醒；
//   倒计时（L6 / 速算）：隐藏期间 timeLeft 不降，回前台继续降；
//   小动物赛跑（Game._startMonster 自排程链）：隐藏期间不前进，回前台继续；
//   5 秒没作答的语音提示：隐藏时到点不念、也不记「已提示」。
// 用法：node .shots/verify_bg_pause.mjs（需要本地 headless Chrome :9333 + http.server :8000）
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
  window.__hid = false; window.__say = [];
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.__hid });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (window.__hid ? 'hidden' : 'visible') });
  window.AudioContext = window.webkitAudioContext = function () {
    const c = new OfflineAudioContext(1, 44100 * 5, 44100);
    let st = 'running';
    Object.defineProperty(c, 'state', { get: () => st });
    c.suspend = () => { st = 'suspended'; return Promise.resolve(); };
    c.resume = () => { st = 'running'; return Promise.resolve(); };
    return c;
  };
})()` });
await b.viewport(1000, 576);
await b.nav(b.menu);
await b.preserve();
const SET = (bgm, voice = 0) => b.ev(`localStorage.clear(); sessionStorage.clear(); localStorage.setItem('mathgameSettings', JSON.stringify({ sfx: 0, bgm: ${bgm}, voice: ${voice} })); true`);
const hide = h => b.ev(`window.__hid = ${h}; document.dispatchEvent(new Event('visibilitychange')); true`);
const dbg = () => b.ev('BGM.debug()');

console.log('\n-- 背景音乐 --');
await SET(3);
await b.boot(6, 'visual');
await b.ev('BGM.stop(); mgBgmStart(window._currentGame); true');
await b.sleep(300);
let d = await dbg();
P(d.running && d.state === 'running' && !d.paused, 'A 前台：背景音乐在放', d);
await hide(true);
d = await dbg();
P(d.running && d.state === 'suspended' && d.paused, 'A 切后台：音频被挂起、标记已暂停（仍算在放，回来要续上）', d);
await hide(false);
d = await dbg();
P(d.running && d.state === 'running' && !d.paused, 'A 回前台：恢复播放', d);
await hide(true); await hide(true); await hide(false);
d = await dbg();
P(d.state === 'running' && !d.paused, 'A 连切两次后台再回来：只要回来一次就恢复', d);
await b.ev('BGM.stop(); true');
await hide(true); await hide(false);
d = await dbg();
P(!d.running && !d.paused, 'A 背景音乐没在放：切后台 / 回前台不会把它唤醒', d);
await b.ev('mgBgmStart(window._currentGame); true');
await b.sleep(200);
d = await dbg();
P(d.running && d.state === 'running' && !d.paused, 'A 之后重新起播：正常放，不带着旧的暂停标记', d);
await hide(true);
await b.ev('BGM.stop(); mgBgmStart(window._currentGame); true');
d = await dbg();
P(d.running && !d.paused, 'A 在后台时重开背景音乐：以新起播为准，不留暂停标记', d);
await hide(false);

console.log('\n-- 倒计时（L6）--');
await SET(0);
await b.boot(6, 'visual');
await hide(false);
const tl = () => b.ev('window._currentGame.timeLeft');
const t0 = await tl();
await b.sleep(2300);
const t1 = await tl();
P(t1 <= t0 - 1, 'B 前台：倒计时在走', [t0, t1]);
await hide(true);
const h0 = await tl();
await b.sleep(2600);
P((await tl()) === h0, 'B 切后台 2.6 秒：倒计时不降', [h0, await tl()]);
await hide(false);
await b.sleep(2300);
P((await tl()) <= h0 - 1, 'B 回前台：接着倒数', [h0, await tl()]);

console.log('\n-- 小动物赛跑计时（Game，L2）--');
await SET(0);
await b.boot(2, 'visual');
await b.ev(`document.body.classList.remove('mg-calm'); window.mgMonsterSpeed = () => 250; const g = window._currentGame; g.monsterScore = 0; g._startMonster(); true`);
await b.sleep(900);
const m0 = await b.ev('window._currentGame.monsterScore');
P(m0 >= 2, 'C 前台：小动物在前进', m0);
await hide(true);
const m1 = await b.ev('window._currentGame.monsterScore');
await b.sleep(1500);
P((await b.ev('window._currentGame.monsterScore')) === m1, 'C 切后台 1.5 秒：原地不动', m1);
await hide(false);
await b.sleep(900);
P((await b.ev('window._currentGame.monsterScore')) > m1, 'C 回前台：继续前进', m1);
await b.ev('clearTimeout(window._currentGame.monsterTimer); true');

console.log('\n-- 5 秒没作答提示 --');
await SET(0, 3);
await b.boot(2, 'visual');
await b.ev(`window.Capacitor = { isNativePlatform: () => true, Plugins: { Tts: {
  speak: o => { window.__say.push(o.text); return Promise.resolve(); }, stop: () => Promise.resolve(), prefetch: () => Promise.resolve() } } };
  const g = window._currentGame; g.mode = 'audio'; g.sprint = false; g.gameEnded = false; g.locked = false; g._ttsSpeaking = false; g._hintQ = null; g.currentQuestion = '1 加 1 等于'; window.__say.length = 0; true`);
await hide(true);
await b.ev('mgIdleArm(window._currentGame); true');
await b.sleep(6500);
P((await b.ev('window._currentGame._hintQ')) == null && (await b.ev('window.__say.length')) === 0, 'D 到点时人在后台：不念提示，也不记「这道题已提示过」', await b.ev('window.__say'));
await hide(false);
await b.ev('mgIdleArm(window._currentGame); true');
await b.sleep(6500);
P((await b.ev('window._currentGame._hintQ')) === '1 加 1 等于', 'D 回前台再起计时：到点照常提示（对照）', await b.ev('window.__say'));

await b.restore();
P(b.errors.length === 0, '无页面脚本异常', b.errors.slice(0, 3));
await b.close();
finish('BG PAUSE');
