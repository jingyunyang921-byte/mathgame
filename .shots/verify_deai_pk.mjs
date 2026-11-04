// Local verify: 项2 比谁快 L1-L3 PK 带路小动物（小兔/小松鼠/小鸟）—— 本地 Chrome :9333 + 静态服 :8000。
// 断言：名牌 #companion-crown=本关小动物名、#companion-svg use=该动物精灵、#race-label=「跟着X走」；
//   旧影子 SVG(#monster-svg-default/lv2)与 .vs-badge 已不在；MG_CUE 无「怪兽/影子」且 lead/finish 带 {n} 占位；
//   mgPickCue 替成本关动物名；L1/L2(Game)+L3(VoiceGame) 胜负结算无「怪兽/影子」、负结算提到本关动物；
//   退出确认框已删（#exit-modal 不在）；菜单设置无「影子速度」行；全 <use> 解析；4 视口截图。
// NOTE: L4 赛跑(canvas) 与 L6 终章分别由 verify_deai_race_boss / verify_gate_finale 负责。
import { writeFileSync } from 'node:fs';
const CDP = 'http://localhost:9333', BASE = 'http://localhost:8000/';
const VIEWPORTS = [
  { name: '1000x615', w: 1000, h: 615 },
  { name: '1000x576', w: 1000, h: 576 },
  { name: '900x500', w: 900, h: 500 },
  { name: '412x915', w: 412, h: 915 },
];
const COMP = { 1: ['小兔', 'p-bunny'], 2: ['小松鼠', 'p-squirrel'], 3: ['小鸟', 'p-bird'] };
const ver = await (await fetch(CDP + '/json/version')).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
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
    await sleep(400);
  } else { await sleep(300); }
  return { ev, shot: () => send('Page.captureScreenshot', { format: 'png' }, sessionId), close: () => send('Target.closeTarget', { targetId }) };
}
const GAME_PROBE = `(() => {
  const crown = document.getElementById('companion-crown');
  const cuse = document.querySelector('#companion-svg use');
  const rl = document.getElementById('race-label');
  const cueText = JSON.stringify(window.MG_CUE || {});
  const exitModal = !!document.getElementById('exit-modal');
  const dangling = [...document.querySelectorAll('use')].map(u => u.getAttribute('href') || u.getAttribute('xlink:href')).filter(h => h && !document.querySelector(h));
  const picked = typeof mgPickCue === 'function' ? mgPickCue(MG_CUE.lead) : '';
  return {
    gType: window._currentGame ? window._currentGame.constructor.name : null,
    crown: crown ? crown.textContent.trim() : null,
    crownBg: crown ? crown.style.background : '',
    href: cuse ? (cuse.getAttribute('href') || cuse.getAttribute('xlink:href')) : null,
    raceLabel: rl ? rl.textContent.trim() : null,
    oldShadow: !!document.getElementById('monster-svg-default') || !!document.getElementById('monster-svg-lv2') || document.querySelectorAll('.shadow-body').length > 0,
    vsBadge: document.querySelectorAll('.vs-badge').length,
    cueBad: /怪兽|影子/.test(cueText),
    cuePlaceholder: /\\{n\\}/.test(JSON.stringify([MG_CUE.lead, MG_CUE.finish])),
    picked, dangling,
    exitModal,
  };
})()`;
const RESULT_PROBE = `(() => {
  const t = id => (document.getElementById(id) ? document.getElementById(id).textContent : '');
  const h = id => (document.getElementById(id) ? document.getElementById(id).innerHTML : '');
  const all = [t('overlay-title'), h('overlay-msg'), t('overlay-sub')].join(' | ');
  return { shown: document.getElementById('overlay').classList.contains('show'), all, bad: /怪兽|影子/.test(all) };
})()`;
const MENU_PROBE = `(() => {
  showSettings();
  const modal = document.getElementById('settingsModal');
  const txt = modal ? modal.innerText : '';
  return { open: !!modal && modal.classList.contains('show'), hasMonster: /怪兽/.test(txt), hasShadowSpeed: /影子速度/.test(txt), txt: txt.slice(0, 400) };
})()`;
async function checkLevel(p, lv, eng) {
  const [name, sym] = COMP[lv];
  const g = await p.ev(GAME_PROBE);
  console.log('\n-- L' + lv + '  (engine=' + g.gType + ') --');
  P(g.gType === eng, 'L' + lv + ' 引擎=' + eng, g.gType);
  P(g.crown === name, 'L' + lv + ' 名牌=「' + name + '」', JSON.stringify(g.crown));
  P(g.href === '#' + sym, 'L' + lv + ' 带路精灵=#' + sym, JSON.stringify(g.href));
  P(!!g.crownBg, 'L' + lv + ' 名牌有该动物主色', g.crownBg);
  P(g.raceLabel === '跟着' + name + '走' || (g.raceLabel.startsWith('和' + name + '一起找') && g.raceLabel.length > name.length + 4), 'L' + lv + ' 赛道标签=「跟着' + name + '走」或（已领养时）「和' + name + '一起找<材料>」', JSON.stringify(g.raceLabel));
  P(!g.oldShadow, 'L' + lv + ' 旧影子 SVG 已删净', String(g.oldShadow));
  P(g.vsBadge === 0, 'L' + lv + ' 无 .vs-badge', String(g.vsBadge));
  P(!g.cueBad && g.cuePlaceholder, 'L' + lv + ' MG_CUE 无「怪兽/影子」且 lead/finish 带 {n}', g.cueBad ? 'FOUND' : 'ok');
  P(g.picked.includes(name) && !/\{n\}/.test(g.picked), 'L' + lv + ' mgPickCue 替成本关动物名', g.picked);
  P(g.dangling.length === 0, 'L' + lv + ' 全 <use> 可解析', JSON.stringify(g.dangling));
  P(!g.exitModal, 'L' + lv + ' 退出确认框已删（点返回直接离场）', g.exitModal);
  for (const win of [true, false]) {
    await p.ev('debugEndGame(' + win + ');'); await sleep(500);
    const r = await p.ev(RESULT_PROBE);
    P(r.shown && !r.bad, 'L' + lv + ' ' + (win ? '胜' : '负') + '结算无「怪兽/影子」', r.all);
    if (!win) P(r.all.includes(name), 'L' + lv + ' 负结算提到「' + name + '」', r.all);
  }
}
// L1 (Game, visual) 跑全 4 视口 + 截图。
for (let vi = 0; vi < VIEWPORTS.length; vi++) {
  const vp = VIEWPORTS[vi];
  const p = await open('index.html', vp.w, vp.h, 1, 'visual');
  console.log('\n===== @ ' + vp.name + ' =====');
  const shot = await p.shot();
  writeFileSync('e:/mathgame/mathgame/.shots/deai_pk_L1_' + vp.name + '.png', Buffer.from(shot.data, 'base64'));
  await checkLevel(p, 1, 'Game');
  await p.close();
}
// L2 (Game) + L3 (VoiceGame)
for (const c of [{ lv: 2, mode: 'visual', eng: 'Game' }, { lv: 3, mode: 'audio', eng: 'VoiceGame' }]) {
  const p = await open('index.html', 1000, 576, c.lv, c.mode);
  await checkLevel(p, c.lv, c.eng);
  await p.close();
}
// 菜单设置：设置里没有「影子速度」行，且面板无「怪兽」。
{
  const p = await open('menu.html', 1000, 576, null, null);
  const r = await p.ev(MENU_PROBE);
  console.log('\n-- menu settings --');
  P(r.open, '设置弹窗打开', String(r.open));
  P(!r.hasShadowSpeed, '设置已无「影子速度」行', String(r.hasShadowSpeed));
  P(!r.hasMonster, '设置面板无「怪兽」', r.hasMonster ? r.txt : 'ok');
  await p.close();
}
console.log('\n===== ' + (fail === 0 ? '小动物带路 PK PASS' : fail + ' FAILURE(S)') + ' =====');
ws.close(); await sleep(150); process.exit(fail === 0 ? 0 : 1);
