// 真机闸门 去怪兽·L1-L3 PK「跟着小动物走」via :9222（Chrome 91 WebView）。需 App 已启动、已 adb forward。
// 断言：WebView=Chrome91；名牌 #companion-crown=本关动物(小兔/小松鼠/小鸟)、#companion-svg use=该动物精灵、#race-label=「跟着X走」；
// 旧影子 SVG/.vs-badge 已删；MG_CUE 无「怪兽/影子」且带 {n}；退出确认框已删；全<use>解析；
// L1/L2(Game)+L3(VoiceGame)胜负结算无「怪兽/影子」(负结算提到本关动物)；菜单设置无「影子速度」行、无「怪兽」。
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
const COMP = { 1: ['小兔', 'p-bunny'], 2: ['小松鼠', 'p-squirrel'], 3: ['小鸟', 'p-bird'] };
const GAME_PROBE = `(() => {
  const crown = document.getElementById('companion-crown');
  const cuse = document.querySelector('#companion-svg use');
  const rl = document.getElementById('race-label');
  const cueText = JSON.stringify(window.MG_CUE || {});
  const exitModal = !!document.getElementById('exit-modal');
  const dangling = [...document.querySelectorAll('use')].map(u => u.getAttribute('href') || u.getAttribute('xlink:href')).filter(h => h && !document.querySelector(h));
  return {
    ua: (navigator.userAgent.match(/Chrome\\/[\\d.]+/) || [])[0],
    gType: window._currentGame ? window._currentGame.constructor.name : null,
    crown: crown ? crown.textContent.trim() : null,
    href: cuse ? (cuse.getAttribute('href') || cuse.getAttribute('xlink:href')) : null,
    raceLabel: rl ? rl.textContent.trim() : null,
    oldShadow: !!document.getElementById('monster-svg-default') || !!document.getElementById('monster-svg-lv2') || document.querySelectorAll('.shadow-body').length > 0,
    vsBadge: document.querySelectorAll('.vs-badge').length,
    cueBad: /怪兽|影子/.test(cueText),
    cuePlaceholder: /\\{n\\}/.test(JSON.stringify([MG_CUE.lead, MG_CUE.finish])),
    picked: typeof mgPickCue === 'function' ? mgPickCue(MG_CUE.lead) : '',
    dangling, exitModal,
  };
})()`;
const RESULT_PROBE = `(() => {
  const t = id => (document.getElementById(id) ? document.getElementById(id).textContent : '');
  const h = id => (document.getElementById(id) ? document.getElementById(id).innerHTML : '');
  const all = [t('overlay-title'), h('overlay-msg'), t('overlay-sub')].join(' | ');
  return { shown: document.getElementById('overlay').classList.contains('show'), all, bad: /怪兽|影子/.test(all) };
})()`;
for (const c of [{ lv: 1, mode: 'visual', eng: 'Game' }, { lv: 2, mode: 'visual', eng: 'Game' }, { lv: 3, mode: 'audio', eng: 'VoiceGame' }]) {
  const tag = `L${c.lv}/${c.mode}`, [name, sym] = COMP[c.lv];
  jsErrs = [];
  await ev(`sessionStorage.setItem('gameLevel','${c.lv}');sessionStorage.setItem('gameMode','${c.mode}');location.href='game.html';`, false);
  await sleep(1600);
  await ev(`window._skipOcrLoading && window._skipOcrLoading();`, false);
  await sleep(5200);
  const g = await ev(GAME_PROBE);
  console.log(`\n-- ${tag}  (engine=${g.gType}) --`);
  if (c.lv === 1) ok(/Chrome\/(9[1-9]|1\d\d)\./.test(g.ua), `${tag} WebView >= Chrome/91`, g.ua);
  ok(g.gType === c.eng, `${tag} 引擎=${c.eng}`, g.gType);
  ok(g.crown === name, `${tag} 名牌=「${name}」`, JSON.stringify(g.crown));
  ok(g.href === '#' + sym, `${tag} 带路精灵=#${sym}`, JSON.stringify(g.href));
  ok(g.raceLabel === '跟着' + name + '走' || (g.raceLabel.startsWith('和' + name + '一起找') && g.raceLabel.length > name.length + 4), `${tag} 赛道标签=「跟着${name}走」或（已领养时）「和${name}一起找<材料>」`, JSON.stringify(g.raceLabel));
  ok(!g.oldShadow && g.vsBadge === 0, `${tag} 旧影子 SVG 与 .vs-badge 已删`, JSON.stringify([g.oldShadow, g.vsBadge]));
  ok(!g.cueBad && g.cuePlaceholder, `${tag} MG_CUE 无「怪兽/影子」且带 {n}`, g.cueBad ? 'FOUND' : 'ok');
  ok(g.picked.includes(name) && !/\{n\}/.test(g.picked), `${tag} mgPickCue 替成动物名`, g.picked);
  ok(g.dangling.length === 0, `${tag} 全 <use> 可解析`, JSON.stringify(g.dangling));
  ok(!g.exitModal, `${tag} 退出确认框已删`, g.exitModal);
  await ev('setDangerBorder(true)'); await sleep(400);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`.shots/out/deai_pk_dev_L${c.lv}_${c.mode}.png`, Buffer.from(shot.data, 'base64'));
  await ev('setDangerBorder(false)'); await sleep(200);
  for (const win of [true, false]) {
    await ev(`debugEndGame(${win});`); await sleep(600);
    const r = await ev(RESULT_PROBE);
    ok(r.shown && !r.bad, `${tag} ${win ? '胜' : '负'}结算无「怪兽/影子」`, r.all);
    if (!win) ok(r.all.includes(name), `${tag} 负结算提到「${name}」`, r.all);
    await ev(`document.getElementById('retry-btn') && document.getElementById('retry-btn').click();`, false); await sleep(400);
  }
  ok(jsErrs.length === 0, `${tag} 无 JS 错误`, jsErrs.join(' | ').slice(0, 200));
}
await ev(`location.href='index.html';`, false);
await sleep(1800);
const mp = await ev(`(() => { showSettings(); const m = document.getElementById('settingsModal');
  const txt = m ? m.innerText : '';
  return { open: !!m && m.classList.contains('show'), hasMonster: /怪兽/.test(txt), hasShadowSpeed: /影子速度/.test(txt), txt: txt.slice(0,300) }; })()`);
console.log('\n-- menu settings --');
ok(mp.open, '设置弹窗打开', String(mp.open));
ok(!mp.hasShadowSpeed, '设置已无「影子速度」行', String(mp.hasShadowSpeed));
ok(!mp.hasMonster, '设置面板无「怪兽」', mp.hasMonster ? mp.txt : 'ok');
{ const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync('.shots/out/deai_pk_dev_settings.png', Buffer.from(shot.data, 'base64')); }
await ev(`document.getElementById('settingsModal') && document.getElementById('settingsModal').classList.remove('show');`, false);
console.log('\n' + (fails ? `===== ${fails} FAILURE(S) =====` : '===== 真机 小动物带路 PK 验证全过 (DEVICE ALL PASS) ====='));
ws.close(); await sleep(150); process.exit(fails ? 1 : 0);
