// 验证「去预备/开始，改规则卡→答题页渲染好→半透明321倒计时」功能。
// 覆盖 6 关 × 2 模式 + 1 次速算 = 13 组合，经本地 Chrome CDP :9333（1000×576）驱动。
import { writeFileSync, mkdirSync } from 'fs';
const CDP = 'http://localhost:9333';
const OUT = '.shots/out';
try { mkdirSync(OUT, { recursive: true }); } catch (e) {}
const info = await (await fetch(CDP + '/json')).json();
const page = info.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || info[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p) => { const id = ++_id; return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify({ id, method: m, params: p || {} })); }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const evalJS = async (expr, awaitP = false) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: awaitP })).result.value;
await send('Page.enable'); await send('Runtime.enable');
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 576, deviceScaleFactor: 1, mobile: false });
let fail = 0; const P = (ok, l, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
const base = 'http://localhost:8000/www/game.html';
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64')); };

async function load(lv, mode, sprint = false) {
  await send('Page.navigate', { url: base }); await sleep(300);
  const levelToSet = sprint ? 0 : lv;
  await evalJS(`window.__err=null;addEventListener('error',e=>window.__err=String(e.message));
    sessionStorage.setItem('mgIntroHeard','[1,2,3,4,5,6]');sessionStorage.setItem('gameLevel','${levelToSet}');sessionStorage.setItem('gameMode','${mode}');
    ${sprint ? "sessionStorage.setItem('mgSprint','1');" : "sessionStorage.removeItem('mgSprint');"}`);
  await send('Page.reload');
  // 等规则卡出现(intro-overlay display!=none)，再等它消失(规则卡 2s 后 resolve)
  for (let t = 0; t < 20; t++) { await sleep(300); if (await evalJS(`document.getElementById('intro-overlay') && getComputedStyle(document.getElementById('intro-overlay')).display !== 'none'`)) break; }
  for (let t = 0; t < 20; t++) { await sleep(300); if (await evalJS(`!!window._currentGame`)) break; }
  const ready = await evalJS(`!!window._currentGame`);
  return ready;
}

async function testCombo(label, lv, mode, sprint = false) {
  const ready = await load(lv, mode, sprint);
  P(ready, `${label} 引擎就绪`);
  if (!ready) return;

  // 1) 构造完那一刻应处于 _countdownActive=true，计分/计时定时器为 null，答案区已可见(第一题已渲染)
  const snap0 = await evalJS(`(() => {
    const g = window._currentGame;
    return {
      countdownActive: g._countdownActive === true,
      monsterTimerNull: g.monsterTimer == null,
      countdownIntervalNull: !('countdownInterval' in g) || g.countdownInterval == null,
      locked: g.locked === true,
      playerScore: g.playerScore ?? g.done ?? 0,
      badgeShown: (() => { const b = document.getElementById('mg-countdown-badge'); return b && getComputedStyle(b).display !== 'none'; })(),
      readygoGone: !document.getElementById('readygo-overlay'),
    };
  })()`);
  P(snap0.countdownActive, `${label} 构造完即 _countdownActive=true`);
  P(snap0.monsterTimerNull && snap0.countdownIntervalNull, `${label} 计分/计时定时器构造时为 null（未偷跑）`);
  P(snap0.locked, `${label} 倒计时期间 locked=true（不接受答题）`);
  P(snap0.badgeShown, `${label} 倒计时徽标已显示`);
  P(snap0.readygoGone, `${label} 旧 #readygo-overlay 已不存在`);

  // 2) 音频模式：倒计时期间（~2.1s 内）不应提前进入听的状态（麦克风/识别开启）
  let micEarly = false;
  if (mode === 'audio') {
    await sleep(900); // 倒计时中段
    micEarly = await evalJS(`(() => {
      const btn = document.getElementById('float-voice-mic-btn');
      return !!(btn && btn.classList.contains('listening'));
    })()`);
  }

  // 3) 等倒计时结束（badge 消失）
  for (let t = 0; t < 20; t++) { await sleep(200); if (!(await evalJS(`document.getElementById('mg-countdown-badge').style.display !== 'none'`))) break; }
  await sleep(200);

  const snap1 = await evalJS(`(() => {
    const g = window._currentGame;
    return {
      countdownActive: g._countdownActive === true,
      monsterTimerSet: g.monsterTimer != null,
      countdownIntervalSet: ('countdownInterval' in g) ? g.countdownInterval != null : true,
      locked: g.locked === true,
      playerScore: g.playerScore ?? g.done ?? 0,
      badgeHidden: (() => { const b = document.getElementById('mg-countdown-badge'); return !b || getComputedStyle(b).display === 'none'; })(),
    };
  })()`);
  P(!snap1.countdownActive, `${label} 倒计时结束后 _countdownActive=false`);
  P(snap1.badgeHidden, `${label} 倒计时徽标已隐藏`);
  P(!snap1.locked, `${label} 倒计时结束后 locked=false（可答题）`);
  P(snap1.playerScore === snap0.playerScore, `${label} 倒计时期间分数未变化`, `${snap0.playerScore}->${snap1.playerScore}`);
  if (mode === 'audio') {
    // L5(SpaceGame) 没有 monsterTimer/countdownInterval 这类计分计时器
    const hasTimer = (lv === 5 && !sprint) ? true : (snap1.monsterTimerSet || snap1.countdownIntervalSet);
    P(hasTimer, `${label} 倒计时结束后计分/计时定时器已放行启动`);
    P(!micEarly, `${label} 听算倒计时期间麦克风未提前开启`);
  }
  P(!(await evalJS('window.__err')), `${label} 无 JS 错误`, await evalJS('window.__err'));
  await shot(`countdown_${label.replace(/[^a-zA-Z0-9]/g, '_')}`);
}

// prefers-reduced-motion 检查（独立跑一次，用 L1 visual）
async function testReducedMotion() {
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  const ready = await load(1, 'visual');
  P(ready, 'reduced-motion L1 引擎就绪');
  if (ready) {
    await sleep(200);
    const anim = await evalJS(`getComputedStyle(document.getElementById('mg-countdown-num')).animationName`);
    P(anim === 'none', 'reduced-motion 下倒计时数字 animationName=none', anim);
  }
  await send('Emulation.setEmulatedMedia', { features: [] });
}

// Chrome91 禁用 token 扫描（扫新增 HTML/CSS 片段，去注释后扫）
async function testBannedTokens() {
  const src = await evalJS(`fetch('/www/game.html').then(r=>r.text())`, true);
  const noComments = src.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const badgeIdx = noComments.indexOf('mg-countdown-badge');
  const region = noComments.slice(Math.max(0, badgeIdx - 200), badgeIdx + 4000);
  const banned = ['paint-order', ':has(', '@layer', 'color-mix(', 'oklch(', 'dvh', 'svh', 'lvh'];
  const found = banned.filter(tok => region.includes(tok));
  P(found.length === 0, 'Chrome91 禁用 token 扫描（倒计时新增片段）', JSON.stringify(found));
}

// 布局不扰动检查：倒计时出现前后，题目/答题区 rect 应不变
async function testLayoutStable() {
  const ready = await load(1, 'visual');
  P(ready, '布局检查 L1 引擎就绪');
  if (!ready) return;
  const rect0 = await evalJS(`(() => {
    const q = document.getElementById('question-section');
    const a = document.getElementById('answer-section');
    const r = el => { const x = el && el.getBoundingClientRect(); return x && { x: Math.round(x.x), y: Math.round(x.y), w: Math.round(x.width), h: Math.round(x.height) }; };
    return { q: r(q), a: r(a) };
  })()`);
  for (let t = 0; t < 20; t++) { await sleep(200); if (!(await evalJS(`document.getElementById('mg-countdown-badge').style.display !== 'none'`))) break; }
  await sleep(200);
  const rect1 = await evalJS(`(() => {
    const q = document.getElementById('question-section');
    const a = document.getElementById('answer-section');
    const r = el => { const x = el && el.getBoundingClientRect(); return x && { x: Math.round(x.x), y: Math.round(x.y), w: Math.round(x.width), h: Math.round(x.height) }; };
    return { q: r(q), a: r(a) };
  })()`);
  P(JSON.stringify(rect0) === JSON.stringify(rect1), '倒计时前后题目/答题区布局不变', JSON.stringify(rect0) + ' vs ' + JSON.stringify(rect1));
}

for (const lv of [1, 2, 3, 4, 5, 6]) {
  await testCombo(`L${lv}_visual`, lv, 'visual');
  await testCombo(`L${lv}_audio`, lv, 'audio');
}
await testCombo('sprint_visual', 6, 'visual', true);

await testReducedMotion();
await testBannedTokens();
await testLayoutStable();

console.log('\n截图已存至 ' + OUT + '/countdown_*.png');
console.log(fail === 0 ? '=== 倒计时功能验证全过 ===' : '=== ' + fail + ' FAIL ===');
ws.close(); process.exit(fail ? 1 : 0);
