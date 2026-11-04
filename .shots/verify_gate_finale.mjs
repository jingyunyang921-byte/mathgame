// Local verify: L6 终章「欢迎灯」(小刺猬提灯 + 数宝并肩 + 等着点亮的小屋；去打斗)。
// L6 闯关 = BattleGame / sprint=false：进度条改「答对填充」(非削血)、小刺猬+数宝并肩在场、欢迎小屋在场、
//   答对→放萤火虫光点(this.energy)而非激光攻击(this.lasers 恒空)、光点抵达小屋触发 _gateFlash、窗随进度先后点亮、
//   monsterHP 不再被扣、胜=小家的灯全亮、负=欢迎灯还差一点点，全无「怪兽/巨龙/打败/BOSS」。
// 速算态 = 共享这套家园 canvas(数宝+大门、无怪兽)、标签仍中性(答对题数/一分钟速算)。
// 公共：#i-gate 无 emoji、无 Chrome-91 禁用 token、全 <use> 可解析、无 JS 错误。截图竞技场。
import { writeFileSync } from 'node:fs';
const CDP = 'http://localhost:9333', BASE = 'http://localhost:8000/';
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

// opts: { lv, mode, sprint }
async function open(w, h, opts) {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  for (const d of ['Page', 'Runtime', 'Network']) await send(d + '.enable', {}, sessionId);
  await send('Network.setCacheDisabled', { cacheDisabled: true }, sessionId);
  const ev = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true }, sessionId)).result.value;
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false }, sessionId);
  await send('Page.navigate', { url: BASE + 'index.html' }, sessionId); await sleep(400);
  const lv = opts.sprint ? '0' : String(opts.lv);
  await ev(`sessionStorage.setItem('gameLevel','${lv}');sessionStorage.setItem('gameMode','${opts.mode}');${opts.sprint ? "sessionStorage.setItem('mgSprint','1');" : "sessionStorage.removeItem('mgSprint');"}1`);
  await send('Page.reload', {}, sessionId); await sleep(600);
  await ev(`window._skipOcrLoading && window._skipOcrLoading();`);
  for (let i = 0; i < 40; i++) { if (await ev('!!window._currentGame')) break; await sleep(300); }
  await sleep(500);
  // 关掉开场倒计时 + 解锁，便于直调答题
  await ev(`(()=>{const g=window._currentGame; if(g){g._countdownActive=false; g.locked=false;} return 1;})()`);
  return { ev, shot: () => send('Page.captureScreenshot', { format: 'png' }, sessionId), close: () => send('Target.closeTarget', { targetId }) };
}
const STRUCT = `(() => {
  const EMOJI = /[\\u{1F300}-\\u{1FAFF}\\u{1F000}-\\u{1F2FF}\\u{2600}-\\u{27BF}\\u{2B00}-\\u{2BFF}\\u{FE0F}]/u;
  const g = window._currentGame;
  const hp = document.getElementById('monster-hp-label');
  const hpUse = hp ? hp.querySelector('use') : null;
  const ground = document.getElementById('battle-ground-label');
  const gate = document.getElementById('i-gate');
  const gateHTML = gate ? gate.outerHTML : '';
  const arenaSrc = (g && g._runArena) ? g._runArena.toString() : '';
  const fillSrc = (g && g._updateHPBar) ? g._updateHPBar.toString() : '';
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
    hasEnergyFn: !!(g && typeof g._sendKeyEnergy === 'function'),
    hasHedgehog: !!(g && typeof g._drawHedgehog === 'function' && /mgSymbolImage\\('p-hedgehog'\\)/.test(g._drawHedgehog.toString())),
    noWarrior: !!(g && typeof g._drawWarrior === 'undefined' && !/_warriorImg/.test(Object.getPrototypeOf(g).constructor.toString())),
    arenaDrawsHedgehog: /_drawHedgehog\\(/.test(arenaSrc),
    arenaDrawsPet: /_drawPetBuddy\\(/.test(arenaSrc),
    arenaDrawsGate: /_drawGoalGate\\(/.test(arenaSrc),
    arenaDrawsMonster: /_drawMonster\\(/.test(arenaSrc),
    fillUsesScore: /playerScore/.test(fillSrc) && !/monsterHP/.test(fillSrc),
    banned, dangling,
  };
})()`;
const RESULT = `(() => {
  const t = id => (document.getElementById(id) ? document.getElementById(id).textContent : '');
  const h = id => (document.getElementById(id) ? document.getElementById(id).innerHTML : '');
  return { shown: document.getElementById('overlay').classList.contains('show'),
    title: t('overlay-title'), msg: h('overlay-msg'), sub: t('overlay-sub') }; })()`;
const noCombat = s => !/怪兽|巨龙|打败|BOSS/.test(s);

// ===== 1) L6 闯关：结构 + 答对放能量(去打斗) + 胜/负结算 =====
{
  jsErrs = [];
  const p = await open(1000, 576, { lv: 6, mode: 'visual' });
  const g = await p.ev(STRUCT);
  console.log('\n-- L6 闯关 @ 1000x576  (engine=' + g.gType + ') --');
  P(g.gType === 'BattleGame', 'L6 引擎=BattleGame', g.gType);
  P(g.sprint === false, 'L6 闯关态 sprint=false', String(g.sprint));
  P(g.hpText === '欢迎灯' && g.groundText === '萤火小屋', 'L6 标签=欢迎灯/萤火小屋', JSON.stringify([g.hpText, g.groundText]));
  P(noCombat((g.hpText || '') + (g.groundText || '')), 'L6 标签无「怪兽/巨龙/打败/BOSS」', JSON.stringify([g.hpText, g.groundText]));
  P(g.hpHref === '#i-gate' && g.hasGateSym, 'L6 标签图标=#i-gate 且 symbol 存在', JSON.stringify(g.hpHref));
  P(g.hasPetFn && g.hasGateFn && g.hasEnergyFn, 'L6 _drawPetBuddy/_drawGoalGate/_sendKeyEnergy 就位', JSON.stringify([g.hasPetFn, g.hasGateFn, g.hasEnergyFn]));
  P(g.arenaDrawsPet && g.arenaDrawsGate && !g.arenaDrawsMonster, 'L6 _runArena 画数宝+小屋、不画怪兽', JSON.stringify([g.arenaDrawsPet, g.arenaDrawsGate, g.arenaDrawsMonster]));
  P(g.fillUsesScore, 'L6 进度条改答对填充(_updateHPBar 读 playerScore、无 monsterHP)', String(g.fillUsesScore));
  P(g.hasHedgehog && g.arenaDrawsHedgehog, 'L6 左侧是小刺猬(位图取自 #p-hedgehog 精灵、_runArena 调用 _drawHedgehog)', JSON.stringify([g.hasHedgehog, g.arenaDrawsHedgehog]));
  P(g.noWarrior, 'L6 勇士持剑已删净(无 _drawWarrior / _warriorImg)', String(g.noWarrior));
  P(!g.gtEmoji, '#i-gate 无 emoji', String(g.gtEmoji));
  P(g.banned === null, '#i-gate 无 Chrome-91 禁用 token', JSON.stringify(g.banned));
  P(g.dangling.length === 0, 'L6 全 <use> 可解析', JSON.stringify(g.dangling));
  const shot = await p.shot();
  writeFileSync('e:/mathgame/mathgame/.shots/gate_finale_L6.png', Buffer.from(shot.data, 'base64'));

  // 答对一题 → 放出钥匙能量光点、不发激光、不扣血
  const before = await p.ev(`(()=>{const g=window._currentGame;return {score:g.playerScore,energy:(g.energy||[]).length,lasers:(g.lasers||[]).length,mhp:g.monsterHP,flash:g._gateFlash||0};})()`);
  await p.ev(`window._currentGame._voiceOnCorrect()`);
  const t0 = await p.ev(`(()=>{const g=window._currentGame;return {score:g.playerScore,energy:(g.energy||[]).length,lasers:(g.lasers||[]).length,mhp:g.monsterHP,fillW:(document.getElementById('monster-hp-fill')||{style:{}}).style.width};})()`);
  P(t0.score === before.score + 1, '答对数 +1', JSON.stringify([before.score, t0.score]));
  P(t0.energy >= 1, '答对放出萤火虫光点(this.energy 增长)', JSON.stringify([before.energy, t0.energy]));
  P(t0.lasers === 0, '去打斗：不发激光(this.lasers 恒空)', String(t0.lasers));
  P(t0.mhp === before.mhp, '去打斗：不扣怪兽血(monsterHP 不变)', JSON.stringify([before.mhp, t0.mhp]));
  P(/[0-9]/.test(t0.fillW || ''), '进度条随答对填充(width 非空)', JSON.stringify(t0.fillW));
  await sleep(700);
  const t1 = await p.ev(`(()=>{const g=window._currentGame;return {flash:g._gateFlash||0};})()`);
  P(t1.flash > before.flash, '萤火虫抵达小屋触发闪光(_gateFlash>0)', JSON.stringify([before.flash, t1.flash]));

  // 胜：小家的灯全亮
  await p.ev('debugEndGame(true);'); await sleep(500);
  const rw = await p.ev(RESULT);
  const allW = [rw.title, rw.msg, rw.sub].join(' | ');
  P(rw.shown && /小家的灯全亮/.test(rw.msg) && /秒/.test(rw.msg) && rw.sub === '' && noCombat(allW),
    'L6 胜结算=小家的灯全亮(无打斗词，单行文案)', allW);
  // 负：欢迎灯还差一点点
  await p.ev('debugEndGame(false);'); await sleep(500);
  const rl = await p.ev(RESULT);
  const allL = [rl.title, rl.msg, rl.sub].join(' | ');
  P(rl.shown && /欢迎灯还差一点点/.test(rl.msg) && noCombat(allL), 'L6 负结算=欢迎灯还差一点点(无打斗词)', allL);
  P(jsErrs.length === 0, 'L6 闯关无 JS 错误', jsErrs.join(' | ').slice(0, 160));
  await p.close();
}

// ===== 1b) 欢迎灯：小屋两扇窗随答对数先后点亮（真像素，窗灭≈R77 / 亮≈R255） =====
{
  jsErrs = [];
  const p = await open(1000, 576, { lv: 6, mode: 'visual' });
  const probe = async n => {
    await p.ev(`(()=>{const g=window._currentGame; g.playerScore=${n}; g._gateFlash=0; g.energy=[]; g._runArena(); return 1;})()`);
    await sleep(200);
    return p.ev(`(()=>{
      const ac=document.getElementById('battle-arena-canvas'), c=ac.getContext('2d'), W=ac.width, H=ac.height;
      const s=H*0.82, cx=W*0.715, y=Math.round(H*0.96-0.21625*s);
      const r=x=>c.getImageData(Math.round(x),y,1,1).data[0];
      return { left:r(cx-0.1218*s-0.02125*s), right:r(cx+0.1218*s-0.02125*s) };
    })()`);
  };
  const total = await p.ev('window._currentGame.total');
  const mid = Math.round(total * 0.35);
  const a0 = await probe(0), a1 = await probe(mid), a2 = await probe(total);
  console.log('\n-- 欢迎灯 窗像素 @ 1000x576  (total=' + total + ', mid=' + mid + ') --');
  P(a0.left < 130 && a0.right < 130, '0 题：两扇窗都是灭的', JSON.stringify(a0));
  P(a1.left > 200 && a1.right < 130, '约 35%：左窗先亮、右窗仍灭', JSON.stringify(a1));
  P(a2.left > 200 && a2.right > 200, '全部答对：两扇窗都亮', JSON.stringify(a2));
  P(jsErrs.length === 0, '窗像素段无 JS 错误', jsErrs.join(' | ').slice(0, 160));
  await p.close();
}

// ===== 2) L6 闯关窄屏结构回归 @ 412x915 =====
{
  jsErrs = [];
  const p = await open(412, 915, { lv: 6, mode: 'visual' });
  const g = await p.ev(STRUCT);
  console.log('\n-- L6 闯关 @ 412x915 --');
  P(g.gType === 'BattleGame' && g.sprint === false, '引擎=BattleGame 闯关', g.gType);
  P(g.hpText === '欢迎灯' && g.groundText === '萤火小屋', '窄屏标签=欢迎灯/萤火小屋', JSON.stringify([g.hpText, g.groundText]));
  P(g.arenaDrawsPet && g.arenaDrawsGate && g.arenaDrawsHedgehog && !g.arenaDrawsMonster, '窄屏画小刺猬+数宝+小屋、不画怪兽', JSON.stringify([g.arenaDrawsPet, g.arenaDrawsGate, g.arenaDrawsMonster]));
  P(g.dangling.length === 0 && g.banned === null && !g.gtEmoji, '窄屏 <use> 可解析/无禁词/无 emoji', JSON.stringify([g.dangling, g.banned, g.gtEmoji]));
  const shot = await p.shot();
  writeFileSync('e:/mathgame/mathgame/.shots/gate_finale_L6_narrow.png', Buffer.from(shot.data, 'base64'));
  P(jsErrs.length === 0, '窄屏无 JS 错误', jsErrs.join(' | ').slice(0, 160));
  await p.close();
}

// ===== 3) 速算态：共享家园 canvas(小刺猬+数宝+小屋、无怪兽)、标签中性 =====
{
  jsErrs = [];
  const p = await open(1000, 576, { sprint: true, mode: 'visual' });
  const g = await p.ev(STRUCT);
  console.log('\n-- 一分钟速算 @ 1000x576  (sprint=' + g.sprint + ') --');
  P(g.gType === 'BattleGame' && g.sprint === true, '速算走 BattleGame + sprint', JSON.stringify([g.gType, g.sprint]));
  P(/^答对 0 题/.test(g.hpText) && g.groundText === '一分钟速算', '速算标签仍中性(纪录条「答对 0 题…」/一分钟速算)', JSON.stringify([g.hpText, g.groundText]));
  P(noCombat((g.hpText || '') + (g.groundText || '')), '速算标签无「怪兽/巨龙/打败/BOSS」', JSON.stringify([g.hpText, g.groundText]));
  P(g.arenaDrawsPet && g.arenaDrawsGate && g.arenaDrawsHedgehog && !g.arenaDrawsMonster, '速算共享家园场景：画小刺猬+数宝+小屋、不画怪兽(一起中性化)', JSON.stringify([g.arenaDrawsPet, g.arenaDrawsGate, g.arenaDrawsMonster]));
  P(g.dangling.length === 0 && g.banned === null, '速算 <use> 可解析/无禁词', JSON.stringify([g.dangling, g.banned]));
  const shot = await p.shot();
  writeFileSync('e:/mathgame/mathgame/.shots/gate_finale_sprint.png', Buffer.from(shot.data, 'base64'));
  P(jsErrs.length === 0, '速算无 JS 错误', jsErrs.join(' | ').slice(0, 160));
  await p.close();
}

console.log('\n===== ' + (fail === 0 ? '欢迎灯终章 PASS' : fail + ' FAILURE(S)') + ' =====');
ws.close(); await sleep(150); process.exit(fail === 0 ? 0 : 1);


