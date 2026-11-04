// Local verify: 去怪兽·L4 赛跑同伴「小鹿」(canvas) + L6 终章「欢迎灯」(小刺猬提灯·数宝并肩·去打斗)。
// 本地 Chrome :9333 + 静态服 :8000；4 视口。
// L4(RaceGame，并肩上山)：引擎=RaceGame；没有 #race-prog-monster 对手药丸；
//   _drawRaceBuddy 取 #p-deer 位图、旧 _drawRaceMonster 已删且无旧鸟配色；
//   debugEndGame(win/lose) 结算无「怪兽/影子」(负结算文案「没走到山顶」)。
// L6(BattleGame): 引擎=BattleGame、sprint=false；#monster-hp-label='欢迎灯'+#battle-ground-label='萤火小屋' 且 <use href>=#i-gate；
//   _runArena 画小刺猬+数宝并肩+欢迎小屋、不画怪兽；_updateHPBar 读 playerScore 填充（无 monsterHP 血量）；
//   胜利=小家的灯全亮；未完成时提示「欢迎灯还差一点点」；全无打斗叙事。
// 公共：#p-deer/#i-gate 无 emoji、无 Chrome-91 禁用 token、全 <use> 可解析、无 JS 错误。截图赛道 + 竞技场。
import { writeFileSync } from 'node:fs';
const CDP = 'http://localhost:9333', BASE = 'http://localhost:8000/';
const VIEWPORTS = [
  { name: '1000x615', w: 1000, h: 615 },
  { name: '1000x576', w: 1000, h: 576 },
  { name: '900x500', w: 900, h: 500 },
  { name: '412x915', w: 412, h: 915 },
];
const ver = await (await fetch(CDP + '/json/version')).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map(); let jsErrs = [];
ws.onmessage = e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
  else if (m.method === 'Runtime.exceptionThrown') jsErrs.push((m.params.exceptionDetails.exception || {}).description || m.params.exceptionDetails.text); };
const send = (m, p, s) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (s) msg.sessionId = s;
  return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify(msg)); }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fail = 0; const P = (ok, l, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };

async function open(page, w, h, lv, mode) {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  for (const d of ['Page', 'Runtime', 'Network']) await send(d + '.enable', {}, sessionId);
  await send('Network.setCacheDisabled', { cacheDisabled: true }, sessionId);
  const ev = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true }, sessionId)).result.value;
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false }, sessionId);
  await send('Page.navigate', { url: BASE + page }, sessionId); await sleep(400);
  if (lv != null) {
    await ev(`sessionStorage.setItem('gameLevel','${lv}');sessionStorage.setItem('gameMode','${mode}');1`);
    await send('Page.reload', {}, sessionId); await sleep(600);
    await ev(`window._skipOcrLoading && window._skipOcrLoading();`);
    for (let i = 0; i < 40; i++) { if (await ev('!!window._currentGame')) break; await sleep(300); }
    await sleep(500);
  } else { await sleep(300); }
  return { ev, shot: () => send('Page.captureScreenshot', { format: 'png' }, sessionId), close: () => send('Target.closeTarget', { targetId }) };
}
const L4_PROBE = `(() => {
  const EMOJI = /[\\u{1F300}-\\u{1FAFF}\\u{1F000}-\\u{1F2FF}\\u{2600}-\\u{27BF}\\u{2B00}-\\u{2BFF}\\u{FE0F}]/u;
  const g = window._currentGame;
  const prog = document.getElementById('race-prog-monster');
  const progUse = prog ? prog.querySelector('use') : null;
  const banner = document.getElementById('monster-full-banner');
  const sh = document.getElementById('p-deer');
  const shHTML = sh ? sh.outerHTML : '';
  const drawSrc = (g && g._drawRaceBuddy) ? g._drawRaceBuddy.toString() : '';
  const dangling = [...document.querySelectorAll('use')].map(u => u.getAttribute('href') || u.getAttribute('xlink:href')).filter(h => h && !document.querySelector(h));
  const banned = shHTML.match(/paint-order|:has\\(|@layer|color-mix\\(|oklch\\(|\\d(?:dvh|svh|lvh)|mix-blend-mode/g);
  return {
    gType: g ? g.constructor.name : null,
    progText: prog ? prog.textContent.replace(/\\s+/g, '') : null,
    progHref: progUse ? (progUse.getAttribute('href') || progUse.getAttribute('xlink:href')) : null,
    bannerText: banner ? banner.textContent : null,
    hasShadowSym: !!sh, shEmoji: EMOJI.test(shHTML),
    drawHasSentinel: /mgSymbolImage\\('p-deer'\\)/.test(drawSrc),
    oldMonsterGone: !!g && typeof g._drawRaceMonster === 'undefined',
    drawHasBird: /#2196F3|#FF4499|#00C8FF|#1565C0|#FF6B35/i.test(drawSrc),
    banned, dangling,
  };
})()`;
const L6_PROBE = `(() => {
  const EMOJI = /[\\u{1F300}-\\u{1FAFF}\\u{1F000}-\\u{1F2FF}\\u{2600}-\\u{27BF}\\u{2B00}-\\u{2BFF}\\u{FE0F}]/u;
  const g = window._currentGame;
  const hp = document.getElementById('monster-hp-label');
  const hpUse = hp ? hp.querySelector('use') : null;
  const ground = document.getElementById('battle-ground-label');
  const gate = document.getElementById('i-gate');
  const gateHTML = gate ? gate.outerHTML : '';
  const arenaSrc = (g && g._runArena) ? g._runArena.toString() : '';
  const dangling = [...document.querySelectorAll('use')].map(u => u.getAttribute('href') || u.getAttribute('xlink:href')).filter(h => h && !document.querySelector(h));
  const banned = gateHTML.match(/paint-order|:has\\(|@layer|color-mix\\(|oklch\\(|\\d(?:dvh|svh|lvh)|mix-blend-mode/g);
  return {
    gType: g ? g.constructor.name : null,
    sprint: g ? !!g.sprint : null,
    hpText: hp ? hp.textContent.replace(/\\s+/g, ' ').trim() : null,
    hpHref: hpUse ? (hpUse.getAttribute('href') || hpUse.getAttribute('xlink:href')) : null,
    groundText: ground ? ground.textContent.replace(/\\s+/g, ' ').trim() : null,
    hasGateSym: !!gate, gtEmoji: EMOJI.test(gateHTML),
    hasPetFn: !!(g && typeof g._drawPetBuddy === 'function'),
    hasGateFn: !!(g && typeof g._drawGoalGate === 'function'),
    arenaDrawsPet: /_drawPetBuddy\\(/.test(arenaSrc),
    arenaDrawsGate: /_drawGoalGate\\(/.test(arenaSrc),
    arenaDrawsHedgehog: /_drawHedgehog\\(/.test(arenaSrc),
    arenaDrawsMonster: /_drawMonster\\(/.test(arenaSrc),
    fillSrc: (g && g._updateHPBar) ? g._updateHPBar.toString() : '',
    banned, dangling,
  };
})()`;
const RESULT_PROBE = `(() => {
  const t = id => (document.getElementById(id) ? document.getElementById(id).textContent : '');
  const h = id => (document.getElementById(id) ? document.getElementById(id).innerHTML : '');
  return { shown: document.getElementById('overlay').classList.contains('show'),
    title: t('overlay-title'), msg: h('overlay-msg'), sub: t('overlay-sub') }; })()`;
// ===== L4 RaceGame（visual, level 4）：4 视口断言 + 结算无「怪兽」+ 赛道截图 =====
for (let vi = 0; vi < VIEWPORTS.length; vi++) {
  const vp = VIEWPORTS[vi];
  jsErrs = [];
  const p = await open('index.html', vp.w, vp.h, 4, 'visual');
  const g = await p.ev(L4_PROBE);
  console.log('\n-- L4 visual @ ' + vp.name + '  (engine=' + g.gType + ') --');
  P(g.gType === 'RaceGame', 'L4 引擎=RaceGame', g.gType);
  P(g.progText === null && g.progHref === null, 'L4 没有对手进度药丸 #race-prog-monster（小鹿并肩上山，不是对手）', JSON.stringify([g.progText, g.progHref]));
  P(g.bannerText === '小鹿在终点等你啦，慢慢来！', 'L4 #monster-full-banner 换成小鹿', JSON.stringify(g.bannerText));
  P(g.hasShadowSym, '#p-deer symbol 存在', String(g.hasShadowSym));
  P(g.drawHasSentinel, 'L4 _drawRaceBuddy 取 #p-deer 位图', String(g.drawHasSentinel));
  P(g.oldMonsterGone, 'L4 旧 _drawRaceMonster 已删(只剩 _drawRaceBuddy)', String(g.oldMonsterGone));
  P(!g.drawHasBird, 'L4 _drawRaceBuddy 无旧鸟配色', String(g.drawHasBird));
  P(!g.shEmoji, '#p-deer 无 emoji', String(g.shEmoji));
  P(g.banned === null, '#p-deer 无 Chrome-91 禁用 token', JSON.stringify(g.banned));
  P(g.dangling.length === 0, 'L4 全 <use> 可解析', JSON.stringify(g.dangling));
  if (vi < 2) {
    const shot = await p.shot();
    writeFileSync('e:/mathgame/mathgame/.shots/deai_race_L4_' + vp.name + '.png', Buffer.from(shot.data, 'base64'));
  }
  for (const win of [true, false]) {
    await p.ev('debugEndGame(' + win + ');'); await sleep(500);
    const r = await p.ev(RESULT_PROBE);
    const all = [r.title, r.msg, r.sub].join(' | ');
    P(r.shown && !/怪兽|影子/.test(all), 'L4 ' + (win ? '胜' : '负') + '结算无「怪兽/影子」', all);
    if (!win) P(/没走到山顶/.test(r.msg), 'L4 负结算文案说「没走到山顶」', JSON.stringify(r.msg));
  }
  P(jsErrs.length === 0, 'L4 无 JS 错误', jsErrs.join(' | ').slice(0, 160));
  await p.close();
}
// ===== L6 BattleGame（visual, level 6）：欢迎灯 HUD/结算 + 小刺猬数宝并肩 + 竞技场截图 =====
for (const vp of [{ name: '1000x576', w: 1000, h: 576 }, { name: '412x915', w: 412, h: 915 }]) {
  jsErrs = [];
  const p = await open('index.html', vp.w, vp.h, 6, 'visual');
  const g = await p.ev(L6_PROBE);
  console.log('\n-- L6 visual @ ' + vp.name + '  (engine=' + g.gType + ') --');
  P(g.gType === 'BattleGame', 'L6 引擎=BattleGame', g.gType);
  P(g.sprint === false, 'L6 闯关态 sprint=false', String(g.sprint));
  P(g.hpText === '欢迎灯', 'L6 #monster-hp-label=「欢迎灯」', JSON.stringify(g.hpText));
  P(g.groundText === '萤火小屋', 'L6 #battle-ground-label=「萤火小屋」', JSON.stringify(g.groundText));
  P(!/怪兽|巨龙|BOSS|血量/.test((g.hpText || '') + (g.groundText || '')), 'L6 标签无「怪兽/巨龙/BOSS/血量」', JSON.stringify([g.hpText, g.groundText]));
  P(g.hpHref === '#i-gate', 'L6 标签图标=#i-gate', JSON.stringify(g.hpHref));
  P(g.hasGateSym, '#i-gate symbol 存在', String(g.hasGateSym));
  P(!g.gtEmoji, '#i-gate 无 emoji', String(g.gtEmoji));
  P(g.banned === null, '#i-gate 无 Chrome-91 禁用 token', JSON.stringify(g.banned));
  P(g.dangling.length === 0, 'L6 全 <use> 可解析（#i-gate 已被标签引用）', JSON.stringify(g.dangling));
  P(g.hasPetFn && g.hasGateFn, 'L6 _drawPetBuddy/_drawGoalGate 函数就位', JSON.stringify([g.hasPetFn, g.hasGateFn]));
  P(g.arenaDrawsPet && g.arenaDrawsGate && g.arenaDrawsHedgehog, 'L6 _runArena 画小刺猬 + 数宝并肩 + 欢迎小屋', JSON.stringify([g.arenaDrawsHedgehog, g.arenaDrawsPet, g.arenaDrawsGate]));
  P(!g.arenaDrawsMonster, 'L6 _runArena 不再画怪兽（去打斗）', String(g.arenaDrawsMonster));
  P(/playerScore/.test(g.fillSrc) && !/monsterHP/.test(g.fillSrc), 'L6 进度条改答对填充（_updateHPBar 读 playerScore、无 monsterHP 血量语义）', String(/playerScore/.test(g.fillSrc) && !/monsterHP/.test(g.fillSrc)));
  const shot = await p.shot();
  writeFileSync('e:/mathgame/mathgame/.shots/gate_L6_' + vp.name + '.png', Buffer.from(shot.data, 'base64'));
  // 胜：小家的灯全亮
  await p.ev('debugEndGame(true);'); await sleep(500);
  const rw = await p.ev(RESULT_PROBE);
  const allW = [rw.title, rw.msg, rw.sub].join(' | ');
  P(rw.shown && /小家的灯全亮/.test(rw.msg) && /秒/.test(rw.msg) && rw.sub === '' && !/怪兽|巨龙|打败|BOSS/.test(allW),
    'L6 胜结算=小家的灯全亮（无打斗词，单行文案）', allW);
  // 负：欢迎灯还差一点点
  await p.ev('debugEndGame(false);'); await sleep(500);
  const rl = await p.ev(RESULT_PROBE);
  const allL = [rl.title, rl.msg, rl.sub].join(' | ');
  P(rl.shown && /欢迎灯还差一点点/.test(rl.msg) && !/怪兽|巨龙|打败|BOSS/.test(allL),
    'L6 负结算=欢迎灯还差一点点（无「怪兽/巨龙/打败/BOSS」）', allL);
  P(jsErrs.length === 0, 'L6 无 JS 错误', jsErrs.join(' | ').slice(0, 160));
  await p.close();
}
console.log('\n===== ' + (fail === 0 ? '去怪兽 赛跑+欢迎灯 PASS' : fail + ' FAILURE(S)') + ' =====');
ws.close(); await sleep(150); process.exit(fail === 0 ? 0 : 1);
