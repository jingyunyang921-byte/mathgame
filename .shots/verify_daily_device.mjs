// Device acceptance for 步骤4「连签日历 + 连签宝箱」on the real tablet (Chrome 91 WebView, :9222).
// Prereq: app foreground + `adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>` + screen awake
//   (svc power stayon true + KEYCODE_WAKEUP + wm dismiss-keyguard — else captureScreenshot hangs).
// 菜单页(index.html=menu 孪生)：注入 mathgameDaily(streak/last)+mathgameDailyChest+mathgameCoins → reload →
//   showDaily() 断日历 7 格/副标题/按钮三态/pill 红点；claimDaily() 断 +8(第7天 +30) + 幂等；截图。
import { writeFileSync } from 'node:fs';
const CDP = 'http://localhost:9222', BASE = 'https://localhost/';
const targets = await (await fetch(CDP + '/json')).json();
const page = targets.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || targets[0];
console.log('target:', JSON.stringify(page.title), '|', page.url);
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let _id = 0; const pend = new Map(); let jsErrs = [];
ws.onmessage = e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
  else if (m.method === 'Runtime.exceptionThrown') jsErrs.push((m.params.exceptionDetails.exception || {}).description || m.params.exceptionDetails.text); };
const send = (me, pa) => { const i = ++_id; return new Promise(res => { pend.set(i, res); ws.send(JSON.stringify({ id: i, method: me, params: pa || {} })); }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ev = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, userGesture: true, awaitPromise: true })).result.value;
const shotTo = async f => { const s = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(f, Buffer.from(s.data, 'base64')); };
await send('Page.enable'); await send('Runtime.enable');
let fail = 0; const P = (ok, l, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
// 注入一组存档（在页面里算 today/yest，和 mgDayStr 口径一致）。
const SEED = (last, streak, chest, coins) => `(() => {
  const p = n => (n < 10 ? '0' : '') + n;
  const mgDay = d => d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  const now = new Date(); const today = mgDay(now);
  const yest = mgDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const L = '${last}' === 'today' ? today : '${last}' === 'yesterday' ? yest : '${last}';
  localStorage.setItem('mathgameDaily', JSON.stringify({ last: L, streak: ${streak}, bestStreak: ${streak} }));
  if ('${chest}' === 'today') localStorage.setItem('mathgameDailyChest', JSON.stringify({ claimed: today }));
  else localStorage.removeItem('mathgameDailyChest');
  localStorage.setItem('mathgameCoins', JSON.stringify({ coins: ${coins} }));
  return 1;
})()`;
const READ = `(() => {
  const week = document.getElementById('dailyWeek'); const btn = document.getElementById('dailyBtn');
  const sp = document.getElementById('streakPill'); const m = document.getElementById('dailyModal');
  const emoji = week ? /[\\u{1F000}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{2190}-\\u{21FF}\\u{2B00}-\\u{2BFF}]/u.test(week.innerText) : false;
  const bad = [...document.querySelectorAll('use')].map(u => u.getAttribute('href') || u.getAttribute('xlink:href')).filter(h => h && !document.querySelector(h));
  return { open: !!(m && m.classList.contains('show')), sub: (document.getElementById('dailySub') || {}).textContent,
    cycle: dailyCycleDay(), nCells: week ? week.children.length : 0,
    nSigned: week ? week.querySelectorAll('.day-cell.signed').length : 0, nGift: week ? week.querySelectorAll('.day-cell.gift').length : 0,
    nClaimable: week ? week.querySelectorAll('.day-cell.claimable').length : 0,
    btnText: btn ? btn.textContent : '', btnDisabled: btn ? !!btn.disabled : false, btnOnclick: btn ? (btn.getAttribute('onclick') || '') : '',
    dotOn: sp ? sp.classList.contains('has-reward') : false, coins: getCoins(), chestDay: getChestClaimedDay(),
    claimable: isChestClaimable(), nIconBtns: document.querySelectorAll('.topbar-actions .icon-btn').length,
    emojiInWeek: emoji, dangling: bad.length, nBtns: 0 };
})()`;
async function load(last, streak, chest, coins) {
  await send('Page.navigate', { url: BASE }); await sleep(900);
  await ev(SEED(last, streak, chest, coins));
  await send('Page.reload', {}); await sleep(1100);
}
// ===== Phase 1: streak1 今天已做速算、未领 → 可领今日宝箱 +8 =====
jsErrs = [];
await load('today', 1, 'none', 50);
console.log('\n-- streak1 可领今日宝箱 (+8) --');
await ev('showDaily();'); await sleep(300);
let s = await ev(READ);
P(s.open, '1: streakPill 点开日历', JSON.stringify(s.open));
P(s.nCells === 7 && s.nGift === 1, '1: 7 格 + 第7天礼盒', JSON.stringify([s.nCells, s.nGift]));
P(/已连签 1 天/.test(s.sub), '1: 副标题 已连签 1 天', JSON.stringify(s.sub));
P(s.cycle === 1 && s.nClaimable === 1, '1: cycle1 今日可领', JSON.stringify([s.cycle, s.nClaimable]));
P(s.btnText === '领取今日宝箱' && /claimDaily/.test(s.btnOnclick), '1: 按钮=领取今日宝箱', JSON.stringify(s.btnText));
P(s.dotOn === true, '1: pill 红点亮');
P(s.nIconBtns === 4, '1: 顶栏仍 4 钮', 'n=' + s.nIconBtns);
P(!s.emojiInWeek && s.dangling === 0, '1: week 无 emoji + <use> 全解析', JSON.stringify([s.emojiInWeek, s.dangling]));
await shotTo('e:/mathgame/mathgame/.shots/out/device_daily_open.png');
await ev('claimDaily();'); await sleep(400);
let s2 = await ev(READ);
P(s2.coins === 58, '1: 领取后 +8 币 (50→58)', 'coins=' + s2.coins);
P(s2.chestDay !== '' && s2.claimable === false, '1: 记 claimed + 不再可领');
P(s2.btnText === '今天已领取 ✓' && s2.btnDisabled && s2.dotOn === false, '1: 领后按钮禁用 + 红点灭', JSON.stringify(s2.btnText));
await ev('claimDaily();'); await sleep(300);
let s3 = await ev(READ);
P(s3.coins === 58, '1: 再点不多发 (幂等, 仍 58)', 'coins=' + s3.coins);
await shotTo('e:/mathgame/mathgame/.shots/out/device_daily_claimed.png');
// ===== Phase 2: streak7 → 第7天大宝箱 +30 =====
await load('today', 7, 'none', 0);
console.log('\n-- streak7 第7天大宝箱 (+30) --');
await ev('showDaily();'); await sleep(300);
let g = await ev(READ);
P(g.cycle === 7 && g.nSigned === 6 && g.nGift === 1, '2: cycle7 6签 第7天礼盒', JSON.stringify([g.cycle, g.nSigned, g.nGift]));
P(g.btnText === '领取第 7 天大宝箱', '2: 按钮=领取第 7 天大宝箱', JSON.stringify(g.btnText));
await ev('claimDaily();'); await sleep(400);
let g2 = await ev(READ);
P(g2.coins === 30, '2: 大宝箱 +30 币 (0→30)', 'coins=' + g2.coins);
await ev('claimDaily();'); await sleep(300);
let g3 = await ev(READ);
P(g3.coins === 30, '2: 再点不多发 (幂等, 仍 30)', 'coins=' + g3.coins);
await shotTo('e:/mathgame/mathgame/.shots/out/device_daily_week7.png');
// ===== Phase 3: 未完成今天速算 → 按钮=先完成一分钟速算 =====
await load('yesterday', 2, 'none', 0);
console.log('\n-- 未完成任务 → 先完成一分钟速算 --');
await ev('showDaily();'); await sleep(300);
let d = await ev(READ);
P(d.btnText === '先完成一分钟速算' && /startSprint/.test(d.btnOnclick), '3: 按钮=先完成一分钟速算 → startSprint', JSON.stringify(d.btnText));
P(d.claimable === false && d.dotOn === false, '3: 不可领 + 无红点');
P(jsErrs.length === 0, '全程无 JS 错误', jsErrs.join(' | ').slice(0, 120));
console.log('\n===== ' + (fail === 0 ? 'DEVICE DAILY ALL PASS' : fail + ' FAILURE(S)') + ' =====');
console.log('shots: device_daily_open / _claimed / _week7 (.shots/out/)');
ws.close(); process.exit(fail === 0 ? 0 : 1);
