// 闸门：点首页「听算模式」就申请话筒权限（不用等进了关卡读题时才弹）。
//   没授权（prompt / prompt-with-rationale）→ 点一次问一次，且等「听题，说答案」念完再弹；已授权 / 永久拒绝 / 点口算 → 不问；
//   连点只问一次、系统弹窗没回应时不重复叠；被拒后下次点还能再问；读题语音静音时立刻问；网页（无原生插件）点了不报错、模式照切。
// 用法：node .shots/verify_mic_prompt.mjs（需要本地 headless Chrome :9333 + http.server :8000）
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
const MOCK = `(() => {
  window.__log = []; window.__micState = 'prompt'; window.__req = 'grant'; window.__speakMs = 400;
  const t = () => Math.round(performance.now());
  window.Capacitor = { isNativePlatform: () => true, Plugins: {
    Tts: { speak: o => { window.__log.push(['speak', t()]); return new Promise(r => setTimeout(() => { window.__log.push(['speakEnd', t()]); r(); }, window.__speakMs)); }, stop: () => Promise.resolve(), prefetch: () => Promise.resolve() },
    Vosk: { checkPermissions: () => { window.__log.push(['check', t()]); return Promise.resolve({ microphone: window.__micState }); },
      requestPermissions: o => { window.__log.push(['request', t(), JSON.stringify(o)]); if (window.__req === 'hang') return new Promise(() => {}); if (window.__req === 'reject') return Promise.reject(new Error('denied')); window.__micState = 'granted'; return Promise.resolve({ microphone: 'granted' }); } } } };
})()`;
await b.send('Page.addScriptToEvaluateOnNewDocument', { source: MOCK });
await b.viewport(1000, 576);
await b.nav(b.menu);
await b.preserve();

const fresh = async (voice, st = 'prompt', req = 'grant') => {
  await b.ev(`localStorage.clear();sessionStorage.clear();localStorage.setItem('mathgameSettings', JSON.stringify({ sfx: 3, bgm: 0, voice: ${voice} }));MG_PET.adopt();true`);
  await b.nav(b.menu); await b.sleep(1200);
  await b.ev(`window.__log.length = 0; window.__micState = ${JSON.stringify(st)}; window.__req = ${JSON.stringify(req)}; true`);
};
const click = async id => {
  const r = await b.ev(`(() => { const e = document.getElementById(${JSON.stringify(id)}); const r = e.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2, top = document.elementFromPoint(x, y);
    return [x, y, !!top && (top === e || e.contains(top))]; })()`);
  if (!r[2]) throw new Error(id + ' 被别的元素挡住，点不到');
  for (const type of ['mousePressed', 'mouseReleased']) await b.send('Input.dispatchMouseEvent', { type, x: r[0], y: r[1], button: 'left', clickCount: 1 });
};
const log = () => b.ev('window.__log.slice()');
const reqs = l => l.filter(x => x[0] === 'request');
const at = (l, k) => (l.find(x => x[0] === k) || [])[1];

console.log('\n-- 没授权：点听算 --');
await fresh(3);
await click('btnAudio'); await b.sleep(1500);
let l = await log();
P(reqs(l).length === 1 && reqs(l)[0][2] === '{"permissions":["microphone"]}', '点听算弹一次话筒申请，只要 microphone', l);
P(at(l, 'request') >= at(l, 'speakEnd'), '等「听题，说答案」念完才弹，不盖住声音', l);
P(await b.ev(`document.getElementById('btnAudio').getAttribute('aria-pressed')`) === 'true', '模式照常切到听算');

console.log('\n-- 不该问的情况 --');
for (const [st, label] of [['granted', '已授权'], ['denied', '永久拒绝（系统不会再弹）']]) {
  await fresh(3, st); await click('btnAudio'); await b.sleep(900);
  l = await log(); P(reqs(l).length === 0, label + '：不问', l);
}
await fresh(3, 'prompt'); await click('btnVisual'); await b.sleep(900);
l = await log(); P(reqs(l).length === 0 && l.every(x => x[0] !== 'check'), '点口算模式：不碰话筒', l);

console.log('\n-- 被拒过一次（可再弹） --');
await fresh(3, 'prompt-with-rationale'); await click('btnAudio'); await b.sleep(1500);
l = await log(); P(reqs(l).length === 1, 'prompt-with-rationale：再问一次', l);

console.log('\n-- 连点 / 弹窗没回应 --');
await fresh(3, 'prompt', 'hang');
await click('btnAudio'); await b.sleep(100); await click('btnAudio'); await click('btnAudio'); await b.sleep(1800);
l = await log(); P(reqs(l).length === 1, '系统弹窗还没回应时连点，只问一次', l);

console.log('\n-- 申请失败后还能再问 --');
await fresh(3, 'prompt', 'reject');
await click('btnAudio'); await b.sleep(1500);
await b.ev(`window.__req = 'grant'; true`);
await click('btnAudio'); await b.sleep(1500);
l = await log(); P(reqs(l).length === 2, '申请被拒/出错后，下次点听算还会再问', l);

console.log('\n-- 读题语音静音 --');
await fresh(0);
await click('btnAudio'); await b.sleep(700);
l = await log(); P(reqs(l).length === 1 && l.every(x => x[0] !== 'speak'), '语音 0 档：没有念，话筒申请立刻弹', l);

console.log('\n-- 网页（无原生插件） --');
await fresh(3);
await b.ev(`window.Capacitor = undefined; true`);
await click('btnAudio'); await b.sleep(500);
P(await b.ev(`document.getElementById('btnAudio').getAttribute('aria-pressed')`) === 'true' && b.errors.length === 0, '没有原生插件：不报错，模式照切', b.errors);

try { await b.restore(); } finally { await b.close(); }
finish('MIC PROMPT');
