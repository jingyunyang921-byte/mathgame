// 通关「胜利一拍」闸门（本地 Chrome :9333 / 静态服 :8000）：
// ①六关 + 三个听算入口答完 10 题先放一拍、再直接接宝箱舞台，牌/本局真实星数/本关伙伴都对，一拍不讲奖励 ②时间窗约 1.5 秒 ③点一下跳过(前 450ms 忽略)
// ④失败 / 速算 / 调试速通不放（这些局保留「卡先露 0.55 秒再弹宝箱」） ⑤放的时候离场：补跑结算、奖励入账 ⑥减少动态 ⑦动画只动 transform/opacity ⑧三种视口完整在屏内 ⑨音效随开关
// ⑩三屏分工：庆祝归一拍、奖励归宝箱、结算卡只留成绩（标题「第N关通关！」、无萌蛋进度行、不重复材料 / 星币）
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
const WATCH = `(() => { const ov = document.getElementById('overlay'); window.__tShow = 0; window.__tStage = 0; window.__chime = 0;
  if (!window.__chimeW) { const o = window.mgPlayStarChime; window.mgPlayStarChime = function () { window.__chime++; return o.apply(this, arguments); }; window.__chimeW = true; }
  if (window.__mo) window.__mo.disconnect();
  if (window.__mo2) window.__mo2.disconnect();
  window.__mo = new MutationObserver(() => { if (ov.classList.contains('show') && !window.__tShow) window.__tShow = performance.now(); });
  window.__mo.observe(ov, { attributes: true, attributeFilter: ['class'] });
  window.__mo2 = new MutationObserver(() => { if (document.getElementById('cs-stage') && !window.__tStage) window.__tStage = performance.now(); });
  window.__mo2.observe(ov, { childList: true }); return true; })()`;
// 不走 debugEndGame（它故意绕过这一拍），直接调引擎自己的 _endGame，等于孩子答完第 10 题后的真实路径
const endRound = (wrong, call = '_endGame(true)') => b.ev(`(() => { ${WATCH}; _mgWrong=${wrong};_mgCorrect=10;_mgMaxStreak=10;_mgRoundStart=Date.now()-7000;
  window.__t0 = performance.now(); window._currentGame.${call}; return true; })()`);
const BEAT = String.raw`(() => {
  const ov = document.getElementById('overlay').classList.contains('show'), el = document.getElementById('mg-vbeat');
  if (!el) return { has: false, overlay: ov };
  const r = e => e ? e.getBoundingClientRect() : null, q = k => el.querySelector(k), cs = getComputedStyle(el);
  const inV = a => !!a && a.top >= -1 && a.left >= -1 && a.right <= innerWidth + 1 && a.bottom <= innerHeight + 1;
  const use = q('.vb-partner use'), ref = use ? use.getAttribute('href') : null, c = r(el), hit = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
  return { has: true, overlay: ov, z: cs.zIndex, pe: cs.pointerEvents, aria: el.getAttribute('aria-hidden'), cls: el.className,
    covers: c.width >= innerWidth - 1 && c.height >= innerHeight - 1, hit: !!hit && el.contains(hit),
    plaque: q('.vb-plaque').textContent, on: el.querySelectorAll('.vb-stars svg.on').length, all: el.querySelectorAll('.vb-stars svg').length,
    ref, refOk: !!ref && !!document.querySelector(ref), noReward: !q('.vb-sub') && !/暖草|松果|音符|落叶|贝壳|萤火|攒成|萌蛋|能量|星币/.test(el.textContent),
    inV: [q('.vb-plaque'), q('.vb-stars'), q('.vb-partner')].every(n => inV(r(n))),
    fw: el.querySelectorAll('.vb-fw').length, confetti: document.querySelectorAll('#mg-confetti-layer i').length,
    pAnim: getComputedStyle(q('.vb-plaque')).animationName, fwDisp: getComputedStyle(q('.vb-fw')).display };
})()`;
const shown = () => b.ev(`document.getElementById('overlay').classList.contains('show')`);
const beatGone = () => b.ev(`!document.getElementById('mg-vbeat') && _mgBeat === null`);
const restart = async () => { await b.ev('window._currentGame._restart();true'); await b.poll(`(document.getElementById('mg-countdown-badge')||{style:{}}).style.display==='none'`); };
const ovStars = () => b.ev(`document.querySelectorAll('#overlay-stars .star.on').length`);
try {
  await b.nav(b.menu); await b.preserve(); await b.viewport(1000, 576);
  await b.ev(`localStorage.removeItem('mathgameStars');true`);

  // 1. 六关视算 + 三个听算入口：一拍的内容、时间窗、与结算卡的衔接
  const ENTRIES = [[1, 'visual'], [2, 'visual'], [3, 'visual'], [4, 'visual'], [5, 'visual'], [6, 'visual'], [1, 'audio'], [2, 'audio'], [3, 'audio']];
  for (const [lv, mode] of ENTRIES) {
    const T = `L${lv}${mode === 'audio' ? '听算' : ''} `;
    await b.boot(lv, mode);
    const eng = await b.ev('window._currentGame.constructor.name');
    await endRound(0);
    await b.sleep(150);
    const a = await b.ev(BEAT);
    P(a.has && !a.overlay, T + `(${eng}) 答完第 10 题：先出现胜利一拍，结算卡还没弹`, [a.has, a.overlay]);
    P(a.z === '475' && a.pe === 'auto' && a.aria === 'true' && a.covers && a.hit, T + '一拍层盖满屏、在彩带层(480)之下、拦点击、对读屏隐藏', [a.z, a.pe, a.aria, a.covers, a.hit]);
    P(a.plaque === '太棒啦！' && a.on === 3 && a.all === 3, T + '全对：「太棒啦！」+ 3 颗亮星', [a.plaque, a.on, a.all]);
    P(a.ref === '#' + await b.ev(`MG_PARTNERS[${lv}].sym`) && a.refOk, T + '本关小伙伴图标可解析', [a.ref, a.refOk]);
    P(a.noReward, T + '一拍不讲奖励（没有材料句，不出现材料 / 萌蛋 / 能量 / 星币）', a.noReward);
    P(a.fw === 4 && a.confetti > 0, T + '4 朵烟花 + 彩带已放', [a.fw, a.confetti]);
    await b.sleep(950);
    const m = await b.ev(BEAT);
    P(m.has && !m.overlay && m.inV, T + '放到约 1.1 秒：牌 / 星 / 伙伴都完整在屏内，结算卡仍没弹', [m.has, m.overlay, m.inV]);
    if (lv === 1 && mode === 'visual') await b.shot('vb_l1_1000x576');
    if (lv === 6 && mode === 'visual') await b.shot('vb_l6_1000x576');
    await b.poll(`document.getElementById('overlay').classList.contains('show')`, 3000);
    const dt = await b.ev('Math.round(window.__tShow - window.__t0)');
    P(dt >= 1350 && dt <= 1750, T + '从答完到结算卡弹出 ≈1.5 秒', dt + 'ms');
    await b.sleep(500);
    const sg = await b.ev(`({ dStage: Math.round(window.__tStage - window.__tShow), cls: (document.getElementById('cs-stage') || {}).className || '', anim: (document.getElementById('cs-stage') || { style: {} }).style.animationName || '', chime: window.__chime })`);
    P(sg.cls.startsWith('cs closed') && sg.dStage >= 0 && sg.dStage < 200, T + '一拍之后宝箱舞台紧接着盖上（不先露结算卡 0.55 秒）', sg);
    P(sg.anim === 'none' && sg.chime === 0, T + '舞台不再自己淡入；结算卡不再补放星星音（一拍已放过小号）', sg);
    P(await beatGone(), T + '结算卡出来后一拍层淡出并移除，_mgBeat 清空');
    P((await ovStars()) === 3, T + '结算卡星数与一拍一致(3)', await ovStars());
    P(b.errors.length === 0, T + '无脚本异常', b.errors.slice(-2));
  }

  // 2. 星数是本局真实成绩：错 2 次=2 星「真不错！」，错 6 次=1 星「过关啦！」，结算卡上的星数与它一致
  await b.boot(1);
  for (const [wrong, stars, word] of [[2, 2, '真不错！'], [6, 1, '过关啦！']]) {
    await endRound(wrong); await b.sleep(200);
    const s = await b.ev(BEAT);
    P(s.has && s.on === stars && s.all === 3 && s.plaque === word, `错 ${wrong} 次：${stars} 颗亮星 + 「${word}」`, [s.on, s.plaque]);
    await b.poll(`document.getElementById('overlay').classList.contains('show')`, 3000); await b.sleep(500);
    P((await ovStars()) === stars, `错 ${wrong} 次：结算卡也是 ${stars} 星`, await ovStars());
    await restart();
  }

  // 3. 点一下跳过：前 450ms 的点击被忽略，之后一点就弹结算卡并收掉一拍
  await endRound(0); await b.sleep(120);
  await b.ev(`document.getElementById('mg-vbeat').click();true`); await b.sleep(120);
  P(!(await shown()) && (await b.ev(BEAT)).has, '前 450ms 点击被忽略(防抢答连点吞掉它)');
  await b.sleep(450);
  await b.ev(`document.getElementById('mg-vbeat').click();true`); await b.sleep(150);
  const sk = await b.ev('Math.round(window.__tShow - window.__t0)');
  P((await shown()) && sk > 0 && sk < 1100, '过了 450ms 再点：立刻弹结算卡(远早于 1.5 秒)', sk + 'ms');
  await b.sleep(500);
  P(await beatGone(), '跳过后一拍层淡出并移除');
  await restart();

  // 4. 不该放的局：调试速通、失败局、速算
  await endRound(0, '_noBeat=true;window._currentGame._endGame(true)'); await b.sleep(120);
  let n = await b.ev(BEAT);
  P(!n.has && n.overlay, '带 _noBeat 标记的结局：直接弹结算卡，不放一拍');
  await b.sleep(900);
  const nb = await b.ev(`({ dStage: Math.round(window.__tStage - window.__tShow), chime: window.__chime, anim: (document.getElementById('cs-stage') || { style: {} }).style.animationName || '' })`);
  P(nb.dStage >= 450 && nb.dStage < 900 && nb.chime === 1 && nb.anim !== 'none', '不放一拍的局保持老样子：卡先露约 0.55 秒再弹宝箱，卡上补放星星音，舞台自己淡入', nb);
  await restart();
  await b.ev(`debugEndGame(true);true`); await b.sleep(120);
  n = await b.ev(BEAT);
  P(!n.has && n.overlay, 'L1 debugEndGame(true)：直接结算卡(速通按钮不被一拍拖慢)');
  await restart();
  await endRound(0); await b.sleep(120);
  P((await b.ev(BEAT)).has, '速通之后下一局的真实通关照常放一拍(_noBeat 一次性)');
  await b.poll(`document.getElementById('overlay').classList.contains('show')`, 3000);
  await b.boot(5);
  await b.ev(`debugEndGame(true);true`); await b.sleep(120);
  n = await b.ev(BEAT);
  P(!n.has && n.overlay && (await b.ev('window._currentGame._noBeat')) === false, 'L5 帆船 debugEndGame(true)：直接结算卡，标记用完即清', [n.has, n.overlay]);
  await b.boot(6);
  await endRound(3, '_endGame(false)'); await b.sleep(150);
  n = await b.ev(BEAT);
  P(!n.has && n.overlay, 'L6 失败局：直接结算卡，不放一拍');
  await b.boot(0, 'visual', `sessionStorage.setItem('mgSprint','1')`);
  await endRound(0); await b.sleep(150);
  n = await b.ev(BEAT);
  P(!n.has && n.overlay, '一分钟速算(level 0)：直接结算卡，不放一拍');

  // 5. 一拍放到一半离场(返回键)：补跑结算，星星 / 宝箱照常入账，一拍层收掉，定时器不会离页后再弹卡
  await b.ev(`localStorage.removeItem('mathgameStars');true`);
  await b.boot(1);
  await endRound(0); await b.sleep(300);
  await b.ev(`window.__left = 0; _mgSafeLeave(window._currentGame, () => { window.__left++; }); true`);
  const lv5 = await b.ev(`({ gone: !document.getElementById('mg-vbeat') && _mgBeat === null, ov: document.getElementById('overlay').classList.contains('show'),
    star: (JSON.parse(localStorage.getItem('mathgameStars') || '{}'))[1], pending: _mgPendingSnap })`);
  P(lv5.gone && lv5.ov && lv5.star === 3 && lv5.pending === null, '一拍中离场：结算补跑、3 星已落盘、宝箱已补领、一拍层已收', lv5);
  await b.sleep(1800);
  P((await b.ev('window.__left')) === 1 && !(await b.ev(BEAT)).has, '离场后定时器不再二次弹卡');

  // 5b. 一拍放到一半切后台 / 页面被收走：和返回键一样当场补跑结算，不指望 1.5 秒后的定时器
  for (const how of ['visibilitychange', 'pagehide']) {
    await b.ev(`localStorage.removeItem('mathgameStars');true`);
    await b.boot(1);
    await endRound(0); await b.sleep(300);
    await b.ev(how === 'pagehide' ? `window.dispatchEvent(new Event('pagehide'));true`
      : `Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); delete document.hidden; true`);
    const bg = await b.ev(`({ gone: !document.getElementById('mg-vbeat') && _mgBeat === null, ov: document.getElementById('overlay').classList.contains('show'),
      star: (JSON.parse(localStorage.getItem('mathgameStars') || '{}'))[1], pending: _mgPendingSnap })`);
    P(bg.gone && bg.ov && bg.star === 3 && bg.pending === null, `一拍中${how === 'pagehide' ? '页面被收走(pagehide)' : '切后台(visibilitychange)'}：结算补跑、3 星已落盘、宝箱已补领、一拍层已收`, bg);
  }

  // 5c. L6 总题数是 20：错 3 题 = 3/20 → 2 星，一拍要和结算卡一致（曾按 10 题算成 1 星）
  await b.boot(6);
  await endRound(3); await b.sleep(200);
  const l6 = await b.ev(BEAT);
  P(l6.has && l6.on === 2 && l6.plaque === '真不错！', 'L6 错 3 题(共 20 题)：一拍 2 颗亮星 + 「真不错！」', [l6.on, l6.plaque]);
  await b.poll(`document.getElementById('overlay').classList.contains('show')`, 3000); await b.sleep(500);
  P((await ovStars()) === 2, 'L6 错 3 题：结算卡也是 2 星（与一拍一致）', await ovStars());

  // 6. 减少动态：不播动画 / 不放烟花彩带，静态停约 1.2 秒
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await b.boot(1);
  await endRound(0); await b.sleep(150);
  const rm = await b.ev(BEAT);
  P(rm.has && rm.pAnim === 'none' && rm.fwDisp === 'none' && rm.confetti === 0, '减少动态：牌不播动画、烟花隐藏、没有彩带', [rm.pAnim, rm.fwDisp, rm.confetti]);
  await b.poll(`document.getElementById('overlay').classList.contains('show')`, 3000);
  const rdt = await b.ev('Math.round(window.__tShow - window.__t0)');
  P(rdt >= 1050 && rdt <= 1450, '减少动态：停约 1.2 秒就弹结算卡', rdt + 'ms');
  await b.send('Emulation.setEmulatedMedia', { features: [] });

  // 7. 关键帧只动 transform / opacity
  const kf = await b.ev(`(() => { const out = {}; for (const ss of document.styleSheets) { let rules; try { rules = ss.cssRules; } catch (e) { continue; }
    for (const r of rules) if (r.type === CSSRule.KEYFRAMES_RULE && /^vb-/.test(r.name)) { const props = new Set();
      for (const k of r.cssRules) for (let i = 0; i < k.style.length; i++) props.add(k.style[i]); out[r.name] = [...props]; } } return out; })()`);
  const bad = Object.entries(kf).filter(([, p]) => p.some(x => x !== 'transform' && x !== 'opacity'));
  P(Object.keys(kf).length === 8 && bad.length === 0, '8 组 vb-* 关键帧只动 transform / opacity', bad.length ? bad : Object.keys(kf).length);

  // 8. 另两种视口（矮横屏 / 竖屏）：一拍内容完整在屏内
  for (const [w, h] of [[900, 500], [412, 915]]) {
    await b.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
    for (const lv of [1, 6]) {
      await b.boot(lv);
      await endRound(0); await b.sleep(1100);
      const v = await b.ev(BEAT);
      P(v.has && v.inV && v.covers, `L${lv} ${w}×${h}：牌 / 星 / 伙伴完整在屏内`, [v.has, v.inV, v.covers]);
      await b.shot(`vb_l${lv}_${w}x${h}`);
    }
  }
  await b.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 576, deviceScaleFactor: 1, mobile: false });

  // 9. 小号只在音效开着时响
  await b.ev(`window.__ac = 0; window.mgSfxCtx = () => { window.__ac++; return null; }; localStorage.setItem('mathgameSettings', JSON.stringify({ sfx: 3, bgm: 0, voice: 0 })); mgPlayWinFanfare(); true`);
  const on1 = await b.ev('window.__ac');
  await b.ev(`localStorage.setItem('mathgameSettings', JSON.stringify({ sfx: 0, bgm: 0, voice: 0 })); mgPlayWinFanfare(); true`);
  P(on1 === 1 && (await b.ev('window.__ac')) === 1, '音效开：小号取一次音频上下文；音效关：不响', [on1, await b.ev('window.__ac')]);

  // 10. 三屏分工：一拍(庆祝) → 宝箱舞台(奖励) → 结算卡(成绩)，卡上不再重复讲奖励
  await b.ev(`localStorage.removeItem('mathgameSettings');localStorage.removeItem('mathgameStars');true`);
  await b.boot(1);
  await endRound(0);
  await b.poll(`!!document.querySelector('#cs-stage .cs-chest')`, 5000); await b.sleep(300);
  const f0 = await b.ev(`(() => { const st = document.getElementById('cs-stage'); return { cls: st.className, inline: st.style.animationName || '', txt: st.innerText.replace(/\\s+/g, ' ') }; })()`);
  P(f0.cls.startsWith('cs closed') && f0.inline === 'none', '10 一拍之后先是合着的宝箱（舞台没有自己的淡入）', f0);
  await b.ev(`document.querySelector('#cs-stage .cs-chest').click();true`);
  await b.poll(`!!document.querySelector('#cs-stage.done')`, 8000); await b.sleep(400);
  const f1 = await b.ev(`document.getElementById('cs-stage').innerText.replace(/\\s+/g, ' ')`);
  P(/暖草/.test(f1), '10 奖励在宝箱舞台里讲（材料）', f1);
  await b.ev(`mgStageDismiss();true`);
  await b.poll(`!document.getElementById('cs-stage')`, 3000); await b.sleep(300);
  const f2 = await b.ev(`(() => { const ov = document.getElementById('overlay'), q = id => document.getElementById(id);
    return { shown: ov.classList.contains('show'), title: q('overlay-title').textContent.trim(), eggLines: ov.querySelectorAll('.egg-line').length,
      txt: ov.innerText.replace(/\\s+/g, ' '), stars: document.querySelectorAll('#overlay-stars .star.on').length }; })()`);
  P(f2.shown && f2.title === '第1关通关！' && f2.stars === 3, '10 收下之后的结算卡：标题「第1关通关！」+ 3 星', [f2.title, f2.stars]);
  P(f2.eggLines === 0 && !/萌蛋|成长|暖草|星币|能量/.test(f2.txt), '10 结算卡不再重复萌蛋进度 / 材料 / 星币', [f2.eggLines, f2.txt]);
  await b.shot('vb_flow_card_after');
  P(b.errors.length === 0, '10 三屏走完无脚本异常', b.errors.slice(-2));
  P(b.errors.length === 0, '全程无浏览器脚本异常', b.errors);
}
finally {
  try { await b.send('Emulation.setEmulatedMedia', { features: [] }); await b.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 576, deviceScaleFactor: 1, mobile: false }); await b.restore(); } finally { await b.close(); }
}
finish('VICTORY BEAT');
