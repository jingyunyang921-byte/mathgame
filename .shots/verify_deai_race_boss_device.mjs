// 真机闸门 去怪兽·L4 赛跑同伴「小鹿」(canvas) + L6 终章「欢迎灯·小刺猬提灯」(去打斗) via :9222(Chrome 91 WebView)。
// 需 App 已启动、已 adb forward tcp:9222。
// 断言：WebView=Chrome91；L4 RaceGame（并肩上山）：没有 #race-prog-monster 对手药丸、
//   _drawRaceBuddy 取 #p-deer 位图、旧 _drawRaceMonster 已删且无旧鸟配色、胜负结算无「怪兽/影子」(负结算「没走到山顶」)；
// L6 BattleGame：sprint=false、#monster-hp-label=「欢迎灯」/#battle-ground-label=「萤火小屋」use=#i-gate 无打斗词、
//   _runArena 画小刺猬+数宝+小屋不画怪兽、_updateHPBar 读 playerScore 答对填充(非削血)、
//   win 结算=小家的灯全亮、lose=欢迎灯还差一点点，全无「怪兽/巨龙/打败/BOSS」。截图赛道 + 竞技场。
import { writeFileSync, mkdirSync } from 'fs';
const CDP = 'http://localhost:9222';
const info = await (await fetch(CDP + '/json')).json();
const page = info.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || info[0];
console.log('target:', page.title, '|', page.url);
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map(); let jsErrs = [];
ws.onmessage = e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
  else if (m.method === 'Runtime.exceptionThrown') jsErrs.push((m.params.exceptionDetails.exception || {}).description || m.params.exceptionDetails.text); };
const send = (m, p) => { const id = ++_id; return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify({ id, method: m, params: p || {} })); }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
await send('Page.enable'); await send('Runtime.enable');
const ev = async (expr, ret = true) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: ret, awaitPromise: true, userGesture: true });
  if (r.exceptionDetails) throw new Error('EVAL: ' + ((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text)); return r.result && r.result.value; };
let fails = 0; const ok = (c, n, d = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n + (d ? '  ' + d : '')); if (!c) fails++; };
mkdirSync('.shots/out', { recursive: true });
const L4_PROBE = `(() => {
  const EMOJI = /[\\u{1F300}-\\u{1FAFF}\\u{1F000}-\\u{1F2FF}\\u{2600}-\\u{27BF}\\u{2B00}-\\u{2BFF}\\u{FE0F}]/u;
  const g = window._currentGame;
  const prog = document.getElementById('race-prog-monster');
  const progUse = prog ? prog.querySelector('use') : null;
  const banner = document.getElementById('monster-full-banner');
  const sh = document.getElementById('p-deer');
  const drawSrc = (g && g._drawRaceBuddy) ? g._drawRaceBuddy.toString() : '';
  const dangling = [...document.querySelectorAll('use')].map(u => u.getAttribute('href') || u.getAttribute('xlink:href')).filter(h => h && !document.querySelector(h));
  return {
    ua: (navigator.userAgent.match(/Chrome\\/[\\d.]+/) || [])[0],
    gType: g ? g.constructor.name : null,
    progText: prog ? prog.textContent.replace(/\\s+/g, '') : null,
    progHref: progUse ? (progUse.getAttribute('href') || progUse.getAttribute('xlink:href')) : null,
    bannerText: banner ? banner.textContent : null,
    hasShadowSym: !!sh, shEmoji: sh ? EMOJI.test(sh.outerHTML) : false,
    drawHasSentinel: /mgSymbolImage\\('p-deer'\\)/.test(drawSrc),
    oldMonsterGone: !!g && typeof g._drawRaceMonster === 'undefined',
    drawHasBird: /#2196F3|#FF4499|#00C8FF|#1565C0|#FF6B35/i.test(drawSrc),
    dangling,
  };
})()`;
const L6_PROBE = `(() => {
  const EMOJI = /[\\u{1F300}-\\u{1FAFF}\\u{1F000}-\\u{1F2FF}\\u{2600}-\\u{27BF}\\u{2B00}-\\u{2BFF}\\u{FE0F}]/u;
  const g = window._currentGame;
  const hp = document.getElementById('monster-hp-label');
  const hpUse = hp ? hp.querySelector('use') : null;
  const ground = document.getElementById('battle-ground-label');
  const gate = document.getElementById('i-gate');
  const arenaSrc = (g && g._runArena) ? g._runArena.toString() : '';
  const fillSrc = (g && g._updateHPBar) ? g._updateHPBar.toString() : '';
  const dangling = [...document.querySelectorAll('use')].map(u => u.getAttribute('href') || u.getAttribute('xlink:href')).filter(h => h && !document.querySelector(h));
  return {
    gType: g ? g.constructor.name : null,
    sprint: g ? !!g.sprint : null,
    hpText: hp ? hp.textContent.replace(/\\s+/g, ' ').trim() : null,
    hpHref: hpUse ? (hpUse.getAttribute('href') || hpUse.getAttribute('xlink:href')) : null,
    groundText: ground ? ground.textContent.replace(/\\s+/g, ' ').trim() : null,
    hasGateSym: !!gate, gtEmoji: gate ? EMOJI.test(gate.outerHTML) : false,
    arenaDrawsPet: /_drawPetBuddy\\(/.test(arenaSrc),
    arenaDrawsGate: /_drawGoalGate\\(/.test(arenaSrc),
    arenaDrawsHedgehog: /_drawHedgehog\\(/.test(arenaSrc),
    arenaDrawsMonster: /_drawMonster\\(/.test(arenaSrc),
    fillUsesScore: /playerScore/.test(fillSrc) && !/monsterHP/.test(fillSrc),
    dangling,
  };
})()`;
const RESULT_PROBE = `(() => {
  const t = id => (document.getElementById(id) ? document.getElementById(id).textContent : '');
  const h = id => (document.getElementById(id) ? document.getElementById(id).innerHTML : '');
  return { shown: document.getElementById('overlay').classList.contains('show'),
    title: t('overlay-title'), msg: h('overlay-msg'), sub: t('overlay-sub') }; })()`;
async function boot(lv, mode) {
  jsErrs = [];
  await ev(`sessionStorage.setItem('gameLevel','${lv}');sessionStorage.setItem('gameMode','${mode}');location.href='game.html';`, false);
  await sleep(1600);
  await ev(`window._skipOcrLoading && window._skipOcrLoading();`, false);
  for (let i = 0; i < 80; i++) {
    await ev(`window._mgSkipIntro && window._mgSkipIntro();`, false);
    if (await ev('!!window._currentGame')) break;
    await sleep(500);
  }
  await sleep(2500);
}
// ===== L4 RaceGame（visual, level 4）=====
await boot(4, 'visual');
{
  const g = await ev(L4_PROBE);
  console.log(`\n-- L4 visual  (engine=${g.gType}) --`);
  ok(/Chrome\/(9[1-9]|1\d\d)\./.test(g.ua), 'L4 WebView >= Chrome/91', g.ua);
  ok(g.gType === 'RaceGame', 'L4 引擎=RaceGame', g.gType);
  ok(g.progText === null && g.progHref === null, 'L4 没有对手进度药丸 #race-prog-monster（小鹿并肩上山，不是对手）', JSON.stringify([g.progText, g.progHref]));
  ok(g.bannerText === '小鹿在终点等你啦，慢慢来！', 'L4 #monster-full-banner 换成小鹿', JSON.stringify(g.bannerText));
  ok(g.hasShadowSym && !g.shEmoji, '#p-deer symbol 存在且无 emoji', 'sym=' + g.hasShadowSym + ' emoji=' + g.shEmoji);
  ok(g.drawHasSentinel, 'L4 _drawRaceBuddy 取 #p-deer 位图', String(g.drawHasSentinel));
  ok(g.oldMonsterGone && !g.drawHasBird, 'L4 旧 _drawRaceMonster 已删且无旧鸟配色', 'gone=' + g.oldMonsterGone + ' bird=' + g.drawHasBird);
  ok(g.dangling.length === 0, 'L4 全 <use> 可解析', JSON.stringify(g.dangling));
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync('.shots/out/deai_race_boss_dev_L4.png', Buffer.from(shot.data, 'base64'));
  for (const win of [true, false]) {
    await ev(`debugEndGame(${win});`); await sleep(600);
    const r = await ev(RESULT_PROBE);
    const all = [r.title, r.msg, r.sub].join(' | ');
    ok(r.shown && !/怪兽|影子/.test(all), `L4 ${win ? '胜' : '负'}结算无「怪兽/影子」`, all);
    if (!win) ok(/没走到山顶/.test(r.msg), 'L4 负结算文案说「没走到山顶」', JSON.stringify(r.msg));
    await ev(`document.getElementById('retry-btn') && document.getElementById('retry-btn').click();`, false); await sleep(400);
  }
  ok(jsErrs.length === 0, 'L4 无 JS 错误', jsErrs.join(' | ').slice(0, 160));
}
// ===== L6 BattleGame（visual, level 6）：欢迎灯 · 小刺猬数宝并肩 · 去打斗 =====
await boot(6, 'visual');
{
  const g = await ev(L6_PROBE);
  console.log(`\n-- L6 visual  (engine=${g.gType}) --`);
  ok(g.gType === 'BattleGame', 'L6 引擎=BattleGame', g.gType);
  ok(g.sprint === false, 'L6 闯关态 sprint=false', String(g.sprint));
  ok(g.hpText === '欢迎灯' && g.groundText === '萤火小屋', 'L6 标签=欢迎灯/萤火小屋', JSON.stringify([g.hpText, g.groundText]));
  ok(!/怪兽|巨龙|打败|BOSS|血量/.test((g.hpText || '') + (g.groundText || '')), 'L6 标签无打斗词', JSON.stringify([g.hpText, g.groundText]));
  ok(g.hpHref === '#i-gate', 'L6 标签图标=#i-gate', JSON.stringify(g.hpHref));
  ok(g.hasGateSym && !g.gtEmoji, '#i-gate symbol 存在且无 emoji', 'sym=' + g.hasGateSym + ' emoji=' + g.gtEmoji);
  ok(g.arenaDrawsPet && g.arenaDrawsGate && g.arenaDrawsHedgehog && !g.arenaDrawsMonster, 'L6 _runArena 画小刺猬+数宝+小屋、不画怪兽', JSON.stringify([g.arenaDrawsHedgehog, g.arenaDrawsPet, g.arenaDrawsGate, g.arenaDrawsMonster]));
  ok(g.fillUsesScore, 'L6 进度条改答对填充(读 playerScore、无 monsterHP)', String(g.fillUsesScore));
  ok(g.dangling.length === 0, 'L6 全 <use> 可解析', JSON.stringify(g.dangling));
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync('.shots/out/deai_race_boss_dev_L6.png', Buffer.from(shot.data, 'base64'));
  await ev(`debugEndGame(true);`); await sleep(600);
  const rw = await ev(RESULT_PROBE); const allW = [rw.title, rw.msg, rw.sub].join(' | ');
  ok(rw.shown && /小家的灯全亮/.test(rw.msg) && /秒/.test(rw.msg) && rw.sub === '' && !/怪兽|巨龙|打败|BOSS/.test(allW), 'L6 胜结算=小家的灯全亮(无打斗词，单行文案)', allW);
  await ev(`document.getElementById('retry-btn') && document.getElementById('retry-btn').click();`, false); await sleep(400);
  await ev(`debugEndGame(false);`); await sleep(600);
  const rl = await ev(RESULT_PROBE); const allL = [rl.title, rl.msg, rl.sub].join(' | ');
  ok(rl.shown && /欢迎灯还差一点点/.test(rl.msg) && !/怪兽|巨龙|打败|BOSS/.test(allL), 'L6 负结算=欢迎灯还差一点点(无打斗词)', allL);
  ok(jsErrs.length === 0, 'L6 无 JS 错误', jsErrs.join(' | ').slice(0, 160));
}
console.log('\n' + (fails ? `===== ${fails} FAILURE(S) =====` : '===== 真机 去怪兽 赛跑+欢迎灯 验证全过 (DEVICE ALL PASS) ====='));
ws.close(); await sleep(150); process.exit(fails ? 1 : 0);

