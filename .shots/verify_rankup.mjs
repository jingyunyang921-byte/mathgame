// 一期 P1-d：升段庆祝(#rankUpModal) 验证 via 本地 Chrome :9333。
// 这玩意儿的全部难点在「只弹一次」——它是个有持久化副作用的一次性事件，容易出两种相反的 bug：
//   1) 重复弹：每次回菜单都庆祝一遍同一个段位（没写回 mathgameRankSeen 或写回时机错）；
//   2) 永不弹：mathgameRankSeen 默认值取错（取当前段位而不是 0 就永远跨不过去），
//      或者坏值兜底把它当成了一个大数。
// 所以这里不只看「弹没弹」，每条用例都连带断言 mathgameRankSeen 的落盘值，并且第二次 reload
// 必须安静 —— 「弹一次」和「第二次不弹」是同一个需求的两面，分开断会漏。
// 另外特意把首次安装(0 星 / 见习勇士 min:0)单列一条：首装就弹「恭喜升级成见习勇士」是很荒唐的。
const CDP = 'http://localhost:9333';
const URL = 'http://localhost:8000/menu.html';
const ver = await (await fetch(CDP + '/json/version')).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p, s) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (s) msg.sessionId = s;
  return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify(msg)); }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);
await send('Network.enable', {}, sessionId);
await send('Network.setCacheDisabled', { cacheDisabled: true }, sessionId);   // 新脚本一律禁缓存
await send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 576, deviceScaleFactor: 1, mobile: false }, sessionId);

let fail = 0;
const P = (ok, l, x) => { console.log((ok ? '  PASS ' : '  FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true }, sessionId);
  if (r.exceptionDetails) throw new Error('EVAL: ' + ((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text));
  return r.result.value;
};

const PROBE = `(() => {
  const m = document.getElementById('rankUpModal');
  if (!m) return { missing: true };
  const card = m.querySelector('.locked-modal-card');
  const btn = m.querySelector('.locked-modal-btn');
  const cs = getComputedStyle(m), cr = card ? card.getBoundingClientRect() : null;
  const bad = [...document.querySelectorAll('use')].map(u => u.getAttribute('href')).filter(h => h && !document.querySelector(h));
  return {
    shown: m.classList.contains('show'),
    display: cs.display, opacity: +cs.opacity, visible: cs.display !== 'none' && +cs.opacity > 0.5,
    aria: m.getAttribute('aria-hidden'),
    emoji: (document.getElementById('rankUpEmoji') || {}).textContent,
    title: (document.getElementById('rankUpTitle') || {}).textContent,
    msg: (document.getElementById('rankUpMsg') || {}).textContent,
    btnText: btn ? btn.textContent.trim() : null,
    cardInView: !!cr && cr.top >= -0.5 && cr.bottom <= innerHeight + 0.5 && cr.left >= -0.5 && cr.right <= innerWidth + 0.5,
    cardRect: cr ? [cr.left, cr.top, cr.width, cr.height].map(Math.round) : null,
    seen: localStorage.getItem('mathgameRankSeen'),
    total: getTotalStars(), rank: getRank(getTotalStars()),
    badgeText: (document.getElementById('rankBadge') || document.querySelector('.rank-badge') || {}).textContent,
    errs: window.__errs || []
  };
})()`;

// stars 对象只要总数对得上就行；按 3 星/关铺开（0..18 都能表示，六关）
const starsFor = (total) => { const o = {}; let t = total; for (let i = 1; i <= 6; i++) { const v = Math.min(3, Math.max(0, t)); o[i] = v; t -= v; } return o; };

// 先开一次页面拿到 localStorage 的同源上下文，之后每条用例注入 → reload
await send('Page.navigate', { url: URL }, sessionId); await sleep(700);

async function run(c) {
  console.log('\n######## ' + c.name + ' ########');
  await ev(`(() => { localStorage.setItem('mathgameLevelsVer', '2');   // 否则菜单会把这批「新格式」星星当旧档再平移一档
    localStorage.setItem('mathgameStars', JSON.stringify(${JSON.stringify(starsFor(c.total))}));
    ${c.seen === null ? `localStorage.removeItem('mathgameRankSeen');` : `localStorage.setItem('mathgameRankSeen', ${JSON.stringify(String(c.seen))});`}
    return 1; })()`);
  await send('Page.reload', {}, sessionId); await sleep(700);
  await ev(`window.__errs=[];addEventListener('error',e=>window.__errs.push(String(e.message)));`);
  const r = await ev(PROBE);
  P(!r.missing, '#rankUpModal 节点存在', r.missing ? 'MISSING!' : 'ok');
  if (r.missing) return;
  P(r.total === c.total, '星星总数注入生效', r.total + ' 星');
  P(r.rank.min === c.expMin, '段位算对', r.rank.emoji + ' ' + r.rank.title + '(min ' + r.rank.min + ')');

  if (c.fire) {
    P(r.shown && r.visible, '弹出且真的可见', r.display + ' op=' + r.opacity);
    P(r.aria === 'false', 'aria-hidden=false', r.aria);
    P(r.emoji === r.rank.emoji, '表情 = 新段位表情', JSON.stringify(r.emoji));
    P(r.msg.indexOf(r.rank.title) >= 0, '文案含新段位名', JSON.stringify(r.msg));
    P(r.title === '升级啦！' && r.btnText === '太棒了', '标题/按钮文案', r.title + ' / ' + r.btnText);
    P(r.cardInView, '弹窗卡片完整在视口内(1000x576)', JSON.stringify(r.cardRect));
    P(r.seen === String(c.expMin), 'mathgameRankSeen 落盘 = 新段位 min', String(r.seen));

    // 「太棒了」关掉
    await ev(`document.querySelector('#rankUpModal .locked-modal-btn').click();`); await sleep(420);
    const r2 = await ev(PROBE);
    P(!r2.shown && !r2.visible && r2.aria === 'true', '点「太棒了」关闭', r2.display + ' aria=' + r2.aria);

    // 再 reload 必须安静（这条是「只弹一次」的真闸门）
    await send('Page.reload', {}, sessionId); await sleep(700);
    const r3 = await ev(PROBE);
    P(!r3.shown && !r3.visible, '二次进入不再弹', r3.display + ' shown=' + r3.shown);
    P(r3.seen === String(c.expMin), '二次进入不改 mathgameRankSeen', String(r3.seen));
  } else {
    P(!r.shown && !r.visible, '不弹', r.display + ' shown=' + r.shown);
    P(r.aria === 'true', 'aria-hidden 保持 true', r.aria);
    P(r.seen === c.expSeen, '不弹时不写 mathgameRankSeen', JSON.stringify(r.seen) + ' (期望 ' + JSON.stringify(c.expSeen) + ')');
  }
  P(r.errs.length === 0, '无 JS 错误', JSON.stringify(r.errs));
}

await run({ name: '首次安装：0 星 / 无 RankSeen → 小小旅人不弹', total: 0,  seen: null, expMin: 0,  fire: false, expSeen: null });
await run({ name: '跨档：1 星 → 🌱探路新芽 弹一次',                total: 1,  seen: null, expMin: 1,  fire: true  });
await run({ name: '跨档：4 星 → 🌰松林向导 弹一次',               total: 4,  seen: '1',  expMin: 4,  fire: true  });
await run({ name: '档内加星：5 星 / 已见 4 → 不弹',               total: 5,  seen: '4',  expMin: 4,  fire: false, expSeen: '4' });
await run({ name: '连跳两档：13 星 / 已见 7 → 只弹最终档',        total: 13, seen: '7',  expMin: 13, fire: true  });
await run({ name: '15 星仍是 🏮提灯使者：已见 13 → 不弹（老玩家升级后不被打扰）', total: 15, seen: '13', expMin: 13, fire: false, expSeen: '13' });
await run({ name: '满星：18 星 → 🏝️数学岛主 弹一次',              total: 18, seen: '13', expMin: 18, fire: true  });
await run({ name: '封顶后：18 星 / 已见 18 → 不弹',               total: 18, seen: '18', expMin: 18, fire: false, expSeen: '18' });

// ---- 坏值兜底：RankSeen 被写成非数字时当 0，照 mgSaveStars 那套（不许崩、最多多弹一次）----
for (const junk of ['null', 'abc', '{}', '-5', '']) {
  await run({ name: '坏值 RankSeen=' + JSON.stringify(junk) + ' → 当 0，7 星照样弹', total: 7, seen: junk, expMin: 7, fire: true });
}

// ---- 星星表本身是坏值时也不该崩（getStars 已有兜底，这里只确认升段逻辑不被带崩）----
console.log('\n######## 坏值 mathgameStars 不崩 ########');
await ev(`localStorage.setItem('mathgameStars','not json');localStorage.removeItem('mathgameRankSeen');`);
await send('Page.reload', {}, sessionId); await sleep(700);
await ev(`window.__errs=[];addEventListener('error',e=>window.__errs.push(String(e.message)));`);
const rj = await ev(PROBE);
P(rj.total === 0 && !rj.shown, '坏星星表 → 0 星、不弹、不崩', 'total=' + rj.total + ' shown=' + rj.shown);
P(rj.errs.length === 0, '无 JS 错误', JSON.stringify(rj.errs));

// ---- 截图留档：一张跨档弹窗 ----
await ev(`localStorage.setItem('mathgameStars',JSON.stringify(${JSON.stringify(starsFor(10))}));localStorage.setItem('mathgameRankSeen','7');`);
await send('Page.reload', {}, sessionId); await sleep(800);
const { writeFileSync, mkdirSync } = await import('fs');
mkdirSync('.shots/out', { recursive: true });
const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
writeFileSync('.shots/out/rankup.png', Buffer.from(shot.data, 'base64'));
console.log('  shot → .shots/out/rankup.png');

// 跑完把 localStorage 恢复干净，别给后面的菜单脚本留一个「已满星」的档案
await ev(`localStorage.removeItem('mathgameStars');localStorage.removeItem('mathgameRankSeen');`);

console.log('\n' + (fail === 0 ? '=== RANKUP PASS ===' : '=== ' + fail + ' FAIL ==='));
await send('Target.closeTarget', { targetId });
ws.close(); process.exit(fail ? 1 : 0);
