// 上线前 bug 修复闸门：连点跳过只读一次题、强制离场后不再结算、L5 绘制异常不拖死循环、
// rAF 重试有上限、petError 不露英文、mgConfirm 叠开收尾、硬件返回键走各弹窗自己的 hide。
import { readFileSync } from 'node:fs';
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
const FAKE = `(() => { window.Capacitor = window.Capacitor || { Plugins: { App: { addListener: (n, cb) => { (window.__backCbs = window.__backCbs || {})[n] = cb; return Promise.resolve({ remove() {} }); } } } }; })()`;
let stubId;
try {
  // ---------- A. 源码里的保护都在 ----------
  const game = readFileSync('index.html', 'utf8');
  P(/const tick = \(\) => \{\s*this\.rafId = requestAnimationFrame\(tick\);\s*if \(this\.gameEnded\) return;\s*try \{ this\._draw\(\);/.test(game), 'SpaceGame 循环先排下一帧，再 try/catch 画面');
  P(/stripTries < 180/.test(game) && /ansTries < 180/.test(game) && /bcTries < 180/.test(game), '三处等布局的 rAF 重试都有上限');
  P((game.match(/this\._nqSeq = \(this\._nqSeq \|\| 0\) \+ 1/g) || []).length === 4, '四个引擎的听算读题定时器都带题号');
  P(/_endGame\(\) \{\s*if \(this\.gameEnded\) return;[\s\S]{0,120}clearInterval\(this\.monsterTimer\);\s*this\._cancelAutoSubmit\(\);/.test(game), 'Game._endGame 有重入保护');
  P(/_endGame\(\) \{\s*if \(this\.gameEnded\) return;[\s\S]{0,120}this\._cancelRepeatTimer\(\);/.test(game), 'VoiceGame._endGame 有重入保护');
  P(/this\._updateRaceTrack\(\);\s*this\._startRaceFlutter\(\);\s*this\.nextQuestion\(\);/.test(game), 'RaceGame._restart 重启灯笼落叶动画');
  P((game.match(/addEventListener\('touchcancel'/g) || []).length === 7 && (game.match(/addEventListener\('touchend'/g) || []).length === 8, '七块手写板都接了 touchcancel（L5 点门的 touchend 不接）');

  const J = 'android/app/src/main/java/com/mathgame/app/';
  const vosk = readFileSync(J + 'VoskPlugin.java', 'utf8'), tts = readFileSync(J + 'TtsPlugin.java', 'utf8'), main = readFileSync(J + 'MainActivity.java', 'utf8');
  const body = (s, head) => { const i = s.indexOf(head); return i < 0 ? '' : s.slice(i, s.indexOf('\n    }\n', i)); };
  P(/bridgeBuilder\.addWebViewListener/.test(main) && /onPageStarted/.test(main) && (main.match(/dropPageCalls\(\)/g) || []).length === 2, '页面一开始跳转就作废旧页面没完成的原生调用（监听器挂在 Builder 上）');
  const vd = body(vosk, 'void dropPageCalls()'), td = body(tts, 'void dropPageCalls()');
  P(/loadWaiters\.clear\(\)/.test(vd) && /stopCapture/.test(vd) && !/\.(resolve|reject)\(/.test(vd), 'Vosk：跳页只作废等待的 loadModel、放掉话筒，不 resolve');
  P(/pending\.clear\(\)/.test(td) && /cloudCall = null/.test(td) && !/\.(resolve|reject)\(/.test(td), 'Tts：跳页只作废未完成的朗读，不 resolve');
  P(/handleOnStop\(\) \{\s*getBridge\(\)\.execute\(this::stopCapture\)/.test(vosk) && /handleOnDestroy\(\) \{\s*synchronized \(loadWaiters\)/.test(vosk), 'Vosk：切后台放开话筒，销毁时丢掉等待者');
  P(/handleOnStop\(\) \{\s*if \(getActivity\(\) != null && getActivity\(\)\.isFinishing\(\)\) dropPageCalls\(\);\s*else stopSpeech\(\);/.test(tts) && /handleOnDestroy\(\) \{\s*dropPageCalls\(\);/.test(tts), 'Tts：切后台停声（退出中不 resolve），销毁走 dropPageCalls');
  P((game.match(/_isNativeVoice && \(this\._ttsSpeaking \|\| document\.hidden\)/g) || []).length === 2, '两处 _startVoice 在后台不开麦');
  P(/function _mgSpeakNative\([^)]*\) \{\s*if \(document\.hidden\) \{ if \(cue\) self\._qMiss = text; return; \}/.test(game) && /if \(document\.hidden\) \{ if \(cue\) self\._qMiss = text; done\(\); return; \}/.test(game), '_mgSpeakNative 在后台不开口（调用时、排队等完时各查一次）');
  P(/if \(_nativeTtsAvailable\(\)\) \{\s*if \(document\.hidden\) \{ end\(\); return; \}/.test(game), '_mgSpeakAwait（开场报幕）在后台不念');
  P(/const live = spoke && !self\.gameEnded && !self\.locked && !document\.hidden;/.test(game), '_mgSpeakNative 后台念完的不叮、不重新计时');

  // ---------- B. 游戏页 ----------
  await b.nav(b.menu); await b.preserve();
  await b.ev(`localStorage.setItem('mathgameIntroSeen','1');true`);
  const errs0 = b.errors.length;

  for (const lv of [1, 2, 3, 4, 6]) {
    await b.boot(lv, 'audio'); await b.sleep(1600);
    const r = await b.ev(`(async () => {
      const g = window._currentGame; let sp = 0, vo = 0;
      g._speakQuestion = function () { sp++; }; g._startVoice = function () { vo++; };
      if (g._stopVoice) g._stopVoice(); await new Promise(r => setTimeout(r, 800)); sp = 0; vo = 0;
      g.locked = false; g.nextQuestion(); g.nextQuestion(); g.nextQuestion();
      await new Promise(r => setTimeout(r, 1900));
      const a = { sp, vo }; sp = 0; vo = 0;
      g.nextQuestion();
      await new Promise(r => setTimeout(r, 1900));
      return { name: g.constructor.name, multi: a, single: { sp, vo } };
    })()`);
    P(r.multi.sp === 1 && r.multi.vo === 1, `L${lv} ${r.name} 连换三题只读 1 次、开 1 次麦`, r);
    P(r.single.sp === 1 && r.single.vo === 1, `L${lv} ${r.name} 单次换题照常读题开麦`, r);
  }

  for (const lv of [1, 3, 6]) {
    await b.boot(lv, 'audio'); await b.sleep(1600);
    const r = await b.ev(`(async () => {
      const g = window._currentGame, wait = ms => new Promise(r => setTimeout(r, ms));
      if (g.recognition) { const o = g.recognition; o.onend = o.onerror = o.onresult = o.onstart = null; try { o.abort(); } catch (e) {} }
      try { speechSynthesis.cancel(); } catch (e) {}
      await wait(500);
      let st = 0, sp = 0; g.recognition = { start() { st++; }, stop() { sp++; } };
      g._isNativeVoice = true; g._ttsSpeaking = false; g.locked = false; g.recognizing = false;
      const hide = h => { if (h) Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); else delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); };
      hide(true); g._startVoice(); g._ttsResume(); const bg = { st, sp };
      hide(false); await wait(700); const back = { st, sp };
      g.recognizing = true; hide(true); hide(false); await wait(700); const stale = { st, sp };
      g._isNativeVoice = false; hide(true); g._startVoice(); hide(false); await wait(500);
      return { name: g.constructor.name, bg, back, stale, web: { st, sp } };
    })()`);
    P(r.bg.st === 0 && r.bg.sp === 1, `L${lv} ${r.name} 切后台放开话筒，后台的 _startVoice / 读完题的 _ttsResume 都不开麦`, r.bg);
    P(r.back.st === 1 && r.back.sp === 1, `L${lv} ${r.name} 回前台接着听`, r.back);
    P(r.stale.st === 1 && r.stale.sp === 3, `L${lv} ${r.name} 回前台时还以为在听的先收尾，交给 onend 重开，不重复 start`, r.stale);
    P(r.web.st === 2 && r.web.sp === 3, `L${lv} ${r.name} 网页语音不受影响（后台不停、_startVoice 照开）`, r.web);
  }

  // 后台不出声：切后台时调用或排队等着的朗读都不开口，没念成的题回前台补读一次；L5 没有话筒，只补读
  for (const lv of [1, 3, 5, 6]) {
    await b.boot(lv, 'audio'); await b.sleep(1600);
    await b.ev(`(async () => {
      const g = window._currentGame;
      if (g.recognition) { const o = g.recognition; o.onend = o.onerror = o.onresult = o.onstart = null; try { o.abort(); } catch (e) {} }
      try { speechSynthesis.cancel(); } catch (e) {}
      await new Promise(r => setTimeout(r, 500));
      window.__say = []; window.__hold = false; window.__rel = null; window.__st = 0;
      window.Capacitor = { isNativePlatform: () => true, Plugins: { Tts: {
        speak: o => { window.__say.push(o.text); return new Promise(r => { if (window.__hold) window.__rel = r; else setTimeout(r, 60); }); },
        stop: () => Promise.resolve(), prefetch: () => Promise.resolve() } } };
      if (${lv} !== 5) { g.recognition = { start() { window.__st++; }, stop() {} }; g._isNativeVoice = true; }
      g._ttsSpeaking = false; g.locked = false; g.recognizing = false;
      window.__hide = h => { if (h) Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); else delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); };
      return true;
    })()`);
    const mic = lv === 5 ? 0 : 1;
    const run = (body) => b.ev(`(async () => { const g = window._currentGame, w = ms => new Promise(r => setTimeout(r, ms)), Q = g.currentQuestion;
      __say.length = 0; __st = 0; g._qMiss = null; ${body} })()`);
    const snap = `{ say: __say.slice(), miss: g._qMiss, st: __st, speaking: g._ttsSpeaking }`;
    const A = await run(`__hide(true); g._speakQuestion(); g._playTTS('甲'); await w(100);
      const hid = ${snap}; __hide(false); await w(1300); return { Q, hid, back: ${snap} };`);
    P(A.hid.say.length === 0 && A.hid.speaking === false && A.hid.miss === A.Q, `L${lv} 后台调用读题 / 短句：一句不念，题记为没念成`, A.hid);
    P(A.back.say.length === 1 && A.back.say[0] === A.Q && A.back.miss == null && A.back.st === mic, `L${lv} 回前台补读这道题一次，读完才开麦`, A.back);
    const B = await run(`__hold = true; g._playTTS('甲'); g._speakQuestion(true); await w(50);
      __hide(true); __hold = false; __rel(); await w(150);
      const hid = ${snap}; __hide(false); await w(1300); return { Q, hid, back: ${snap} };`);
    P(B.hid.say.length === 1 && B.hid.say[0] === '甲' && B.hid.speaking === false && B.hid.miss === B.Q, `L${lv} 排队等上一句时切后台：排着的题不开口，记为没念成`, B.hid);
    P(B.back.say.length === 2 && B.back.say[1] === B.Q && B.back.miss == null && B.back.st === mic, `L${lv} 排着的题回前台补读一次`, B.back);
    const C = await run(`__hold = true; g._speakQuestion(); await w(50); const mid = __say.length;
      const orig = mgPlayAskChime; let dings = 0; mgPlayAskChime = function () { dings++; return orig.apply(this, arguments); };
      __hide(true); __hold = false; __rel(); await w(300);
      const hid = ${snap}; hid.dings = dings; __hide(false); await w(1300); mgPlayAskChime = orig; return { Q, mid, hid, back: ${snap} };`);
    P(C.mid === 1 && C.hid.say.length === 1 && C.hid.speaking === false && C.hid.miss === C.Q && C.hid.st === 0 && C.hid.dings === 0, `L${lv} 题念到一半被切后台打断：记为没念成，后台不叮、不开麦`, C);
    P(C.back.say.length === 2 && C.back.say[1] === C.Q && C.back.miss == null && C.back.st === mic, `L${lv} 被打断的题回前台补读一次`, C.back);
    const D = await run(`g._speakQuestion(); await w(1300); const first = ${snap};
      __hide(true); __hide(false); await w(900); return { Q, first, again: ${snap} };`);
    P(D.first.say.length === 1 && D.first.say[0] === D.Q && D.first.miss == null && D.again.say.length === 1, `L${lv} 前台读题照常，来回切后台不重读已念完的题`, D);
    const E = await run(`__hide(true); await _mgSpeakAwait('开场'); const s1 = __say.length;
      __hide(false); await _mgSpeakAwait('开场'); return { s1, s2: __say.slice() };`);
    P(E.s1 === 0 && E.s2.length === 1, `L${lv} 开场报幕：后台不念，前台照念`, E);
    await b.ev(`delete document.hidden; delete window.Capacitor; true`);
  }

  for (const [lv, mode] of [[1, 'visual'], [2, 'audio']]) {
    await b.boot(lv, mode);
    const KEYS = `['mathgameStars','mathgameMaxCompletedLevel','mathgameCoins','mathgameDaily','mathgameDailyChest']`;
    const r = await b.ev(`(async () => {
      const g = window._currentGame, snap = () => JSON.stringify(${KEYS}.map(k => localStorage.getItem(k)));
      const before = snap(); g.gameEnded = true; let threw = null;
      try { g._endGame(); } catch (e) { threw = String(e); }
      await new Promise(r => setTimeout(r, 2200));
      return { threw, same: snap() === before, overlay: document.getElementById('overlay').classList.contains('show') };
    })()`);
    P(!r.threw && r.same && !r.overlay, `L${lv} ${mode} 强制离场后迟到的 _endGame 不结算、不弹卡`, r);
    await b.boot(lv, mode);
    const ok = await b.ev(`(async () => { const g = window._currentGame; g.playerScore = 10; g._endGame(); await new Promise(r => setTimeout(r, 2600)); return document.getElementById('overlay').classList.contains('show'); })()`);
    P(ok === true, `L${lv} ${mode} 正常 _endGame 仍然弹结算卡`);
  }

  await b.boot(1, 'visual');
  const tc = await b.ev(`(async () => {
    const g = window._currentGame, c = g.canvas; let sched = 0;
    g._scheduleAutoSubmit = function () { sched++; }; g.locked = false;
    const r = c.getBoundingClientRect(), mk = (type, list) => new TouchEvent(type, { cancelable: true, bubbles: true, touches: list, changedTouches: list });
    const t = new Touch({ identifier: 1, target: c, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
    c.dispatchEvent(mk('touchstart', [t])); c.dispatchEvent(mk('touchmove', [t]));
    const during = g.drawing; c.dispatchEvent(mk('touchcancel', []));
    return { during, after: g.drawing, sched };
  })()`);
  P(tc.during === true && tc.after === false && tc.sched === 1, 'L1 手写板被系统打断（touchcancel）后收笔并照常安排自动提交', tc);

  await b.boot(5, 'visual');
  const sp = await b.ev(`(async () => { const g = window._currentGame; let n = 0; g._draw = function () { n++; throw new Error('boom'); }; await new Promise(r => setTimeout(r, 600)); return n; })()`);
  P(sp >= 5, 'L5 单帧绘制抛错后循环照样往下跑', sp);
  P(b.errors.length === errs0, '游戏页没有未捕获异常', b.errors.slice(errs0));

  // ---------- C. 菜单 ----------
  ({ identifier: stubId } = await b.send('Page.addScriptToEvaluateOnNewDocument', { source: FAKE }));
  await b.nav(b.menu);
  await b.ev(`sessionStorage.setItem('mgAdoptGuide','1');true`);
  await b.nav(b.menu);
  const pe = await b.ev(`(() => {
    const msg = () => document.getElementById('confirmMsg').textContent;
    petError(new DOMException('Failed to execute setItem on Storage: quota', 'QuotaExceededError')); const en = msg(); hideConfirm(false);
    petError(new Error('这不是支持的数学岛备份。')); const zh = msg(); hideConfirm(false);
    petError(null); const nul = msg(); hideConfirm(false);
    return { en, zh, nul };
  })()`);
  P(!/[A-Za-z]{4,}/.test(pe.en) && /存档|存储/.test(pe.en), 'petError 遇到英文系统错误改说中文', pe.en);
  P(pe.zh === '这不是支持的数学岛备份。', 'petError 自家的中文报错原样显示', pe.zh);
  P(/存档/.test(pe.nul), 'petError(null) 不抛错', pe.nul);

  const cf = await b.ev(`(async () => {
    const p1 = mgConfirm({ title: '甲' }), p2 = mgConfirm({ title: '乙' });
    const first = await Promise.race([p1, new Promise(r => setTimeout(() => r('hang'), 300))]);
    const title = document.getElementById('confirmTitle').textContent;
    hideConfirm(true);
    const second = await Promise.race([p2, new Promise(r => setTimeout(() => r('hang'), 300))]);
    return { first, second, title, shown: document.getElementById('confirmModal').classList.contains('show') };
  })()`);
  P(cf.first === false && cf.second === true && cf.title === '乙' && !cf.shown, 'mgConfirm 叠开时上一个按取消收尾，新的照常作答', cf);

  const bk = await b.ev(`(async () => {
    let stops = 0; const orig = window.mgPointStop; window.mgPointStop = function () { stops++; return orig && orig.apply(this, arguments); };
    const pet = document.getElementById('petModal'), set = document.getElementById('settingsModal');
    document.querySelectorAll('.locked-modal.show').forEach(m => m.classList.remove('show'));   // 开机可能自带当日打卡弹窗（DOM 里排最后），先收起，免得吃掉第一次返回
    pet.classList.add('show'); set.classList.add('show');
    await window.__backCbs.backButton();
    const r1 = { pet: pet.classList.contains('show'), set: set.classList.contains('show'), confirm: document.getElementById('confirmModal').classList.contains('show') };
    await window.__backCbs.backButton();
    const r2 = { pet: pet.classList.contains('show'), set: set.classList.contains('show'), stops, aria: pet.getAttribute('aria-hidden') };
    window.mgPointStop = orig;
    return { r1, r2 };
  })()`);
  P(bk.r1.set === false && bk.r1.pet === true && bk.r1.confirm === false, '返回键先关 DOM 里排最后（最上层）的弹窗', bk.r1);
  P(bk.r2.pet === false && bk.r2.stops >= 1 && bk.r2.aria === 'true', '返回键关小窝走 hidePet（收小手）', bk.r2);
} catch (e) {
  P(false, '闸门异常: ' + (e && e.message || e));
} finally {
  try { if (stubId) await b.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: stubId }); } catch (e) {}
  try { await b.restore(); } catch (e) {}
  await b.close();
}
finish('RELEASE FIXES');
