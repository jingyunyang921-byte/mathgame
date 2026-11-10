// 本机日志闸门：平时不写存储；警告 / 错误才落盘并带上前面的事件；刷屏去重、条数封顶、存储满不抛错；
// 两个页面都装了钩子；TTS 朗读被拒会进日志。
import { readFileSync } from 'node:fs';
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
try {
  // ---------- A. 源码 ----------
  const game = readFileSync('index.html', 'utf8'), menu = readFileSync('menu.html', 'utf8');
  P(/<script src="mg-log\.js" data-page="game"><\/script>/.test(game) && game.indexOf('mg-log.js') < game.indexOf('<style'), '游戏页在 head 最前面载入 mg-log.js');
  P(/<script src="mg-log\.js" data-page="menu"><\/script>/.test(menu) && menu.indexOf('mg-log.js') < menu.indexOf('<style'), '菜单页在 head 最前面载入 mg-log.js');
  P(readFileSync('mg-log.js', 'utf8') === readFileSync('www/mg-log.js', 'utf8'), 'mg-log.js 与 www 里的孪生一致');
  P(/for f in [^\n]*\bmg-log\.js\b[^\n]*; do/.test(readFileSync('build-apk.sh', 'utf8')), 'build-apk.sh 构建前核对 mg-log.js 孪生');
  P(!/console\.(error|warn)\(/.test(game), '游戏页不再直接调 console.error / warn（走 mgLog，去重且落盘）');

  // ---------- B. 菜单页：平时不写存储 ----------
  await b.nav(b.menu); await b.preserve();
  await b.ev(`localStorage.removeItem('mathgameLog');true`);
  await b.nav(b.menu); await b.sleep(600);
  const quiet = await b.ev(`({ key: localStorage.getItem('mathgameLog'), recent: mgLog.recent() })`);
  P(quiet.key === null, '菜单页正常启动不写 mathgameLog', quiet.key);
  P(quiet.recent.length >= 1 && quiet.recent[0].g === 'boot' && quiet.recent[0].p === 'menu' && /native=false/.test(quiet.recent[0].m), '内存里有启动记录（页面、是否原生）', quiet.recent[0]);

  // ---------- C. 警告落盘并带上前文；刷屏去重 ----------
  const c = await b.ev(`(() => {
    mgLog.i('step', 'before'); mgLog.w('t', 'boom');
    const first = mgLog.dump();
    for (let i = 0; i < 20; i++) mgLog.w('t', 'boom');
    const all = mgLog.dump();
    mgLog.i('step', 'after'); const same = mgLog.dump().length === all.length;
    return { first, boomN: all.filter(x => x.m === 'boom').map(x => x.n || 1), same };
  })()`);
  P(c.first.length === 3 && c.first[0].g === 'boot' && c.first[1].m === 'before' && c.first[2].m === 'boom' && c.first[2].l === 'W', '警告落盘时带上它之前的事件（启动、前一步），顺序不乱', c.first);
  P(JSON.stringify(c.boomN) === '[1,10]', '同一条警告连发 21 次只留第 1、10 次（带次数）', c.boomN);
  P(c.same, '普通事件（I）不会单独写存储');

  // ---------- D. 全局钩子 ----------
  const d = await b.ev(`(async () => {
    mgLog.clear();
    window.dispatchEvent(new ErrorEvent('error', { message: 'synthetic', filename: 'http://x/y/z.js', lineno: 3, colno: 4, error: new Error('synthetic') }));
    window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', { promise: Promise.resolve(), reason: { errorMessage: 'rej-msg' } }));
    const img = document.createElement('img'); img.src = 'definitely-missing-file.png'; document.body.appendChild(img);
    await new Promise(r => setTimeout(r, 400)); img.remove();
    return mgLog.dump().map(x => x.g + '|' + x.l + '|' + x.m);
  })()`);
  P(d.some(s => /^js\|E\|synthetic @ z\.js:3:4/.test(s)), 'window error 进日志（文件名只留末段、带行列）', d);
  P(d.some(s => /^promise\|E\|rej-msg/.test(s)), 'unhandledrejection 进日志（取 errorMessage）', d);
  P(d.some(s => /^resource\|W\|img load failed .*definitely-missing-file\.png/.test(s)), '图片 / 资源加载失败进日志', d);

  // ---------- E. 封顶、存储满、怪参数 ----------
  const e = await b.ev(`(() => {
    mgLog.clear();
    for (let i = 0; i < 200; i++) mgLog.w('flood', 'm' + i);
    const a = mgLog.dump();
    let threw = null; const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function () { throw new DOMException('full', 'QuotaExceededError'); };
    try { mgLog.w('t', 'full'); mgLog.e('t', undefined); const circ = {}; circ.me = circ; mgLog.w('t', circ); mgLog.i('t', null); } catch (x) { threw = String(x); }
    Storage.prototype.setItem = orig;
    return { n: a.length, notice: a.filter(x => x.g === 'log').length, last: a[a.length - 1], threw };
  })()`);
  P(e.n <= 150 && e.notice === 1 && /记满 60/.test(e.last.m), '一页最多记 60 条，记满后留一条说明，其余丢弃', e);
  P(e.threw === null, '存储写满 / 怪参数时 mgLog 不抛错', e.threw);

  // ---------- F. 游戏页 ----------
  const errs0 = b.errors.length;
  await b.ev(`mgLog.clear();true`);
  await b.boot(1, 'audio'); await b.sleep(1500);
  const g1 = await b.ev(`({ key: localStorage.getItem('mathgameLog'), recent: mgLog.recent().map(x => x.p + '|' + x.g + '|' + x.m) })`);
  P(g1.key === null, '游戏页正常开局不写 mathgameLog', g1.key);
  P(g1.recent.some(s => /^game\|boot\|/.test(s)) && g1.recent.some(s => s === 'game|game|start L1 audio'), '内存里有游戏页启动与开局记录', g1.recent);
  const g2 = await b.ev(`(async () => {
    const g = window._currentGame;
    if (g.recognition) { const o = g.recognition; o.onend = o.onerror = o.onresult = o.onstart = null; try { o.abort(); } catch (e) {} }
    try { speechSynthesis.cancel(); } catch (e) {}
    window.Capacitor = { isNativePlatform: () => true, Plugins: { Tts: { speak: () => Promise.reject({ message: 'tts-error-3' }), stop: () => Promise.resolve(), prefetch: () => Promise.resolve() } } };
    g._playTTS('甲'); await new Promise(r => setTimeout(r, 500));
    delete window.Capacitor;
    return mgLog.dump().map(x => x.g + '|' + x.l + '|' + x.m);
  })()`);
  P(g2.some(s => /^tts\|W\|tts-error-3/.test(s)) && g2.some(s => s === 'game|I|start L1 audio'), '原生朗读被拒进日志，并带上「开局」前文', g2);
  P(b.errors.length === errs0, '游戏页没有未捕获异常', b.errors.slice(errs0));
  await b.ev(`mgLog.clear();true`);
} catch (err) {
  P(false, '闸门异常: ' + (err && err.message || err));
} finally {
  try { await b.restore(); } catch (x) {}
  await b.close();
}
finish('MG LOG');
