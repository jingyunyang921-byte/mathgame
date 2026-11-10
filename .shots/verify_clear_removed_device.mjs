// 真机验收：听算/视算各模式里「清除 / 清空草稿」按钮应彻底消失，跳过按钮仍在。
// 通过 CDP(:9222) 逐关进游戏页，断言 6 个旧 clear 按钮 id 都不存在 + 用 <use href="#i-reset"> 的按钮也扫不到。
const CDP = 'http://localhost:9222';
const info = await (await fetch(CDP + '/json')).json();
const page = info.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || info[0];
console.log('target:', page.title, '|', page.url);
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p) => { const id = ++_id; return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify({ id, method: m, params: p || {} })); }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
await send('Page.enable'); await send('Runtime.enable');
const ev = (expr, ret = true) => send('Runtime.evaluate', { expression: expr, returnByValue: ret, awaitPromise: true, userGesture: true });
const sleep2 = sleep;

// 等待游戏页真正就绪（真机冷启动可能 >20s）
async function goto(level, mode) {
  await ev(`sessionStorage.setItem('gameLevel','${level}');sessionStorage.setItem('gameMode','${mode}');location.href='game.html';`, false);
  for (let i = 0; i < 40; i++) {
    await sleep(700);
    const r = await ev(`({ ready: document.readyState, path: location.pathname, hasGame: !!window._currentGame })`);
    const v = r.result.value || {};
    if (v.ready === 'complete' && /game\.html/.test(v.path) && v.hasGame) break;
  }
  await ev(`window._skipOcrLoading && window._skipOcrLoading();`, false);
  await sleep(3500);
}

const CLEAR_IDS = ['clear-btn', 'race-scratch-clear-btn', 'lv1-voice-clear-btn', 'voice-clear-btn', 'battle-clear-btn', 'battle-scratch-clear-btn'];
const PROBE = `(() => {
  const ids = ${JSON.stringify(CLEAR_IDS)};
  const presentIds = ids.filter(id => document.getElementById(id));
  // 兜底：任何可见按钮里挂 #i-reset 或文案含 清除/清空草稿 的
  const bad = [];
  for (const b of document.querySelectorAll('button')) {
    const txt = (b.textContent || '').replace(/\\s+/g, '');
    const use = b.querySelector('use') ? b.querySelector('use').getAttribute('href') : '';
    const cs = getComputedStyle(b);
    const vis = cs.display !== 'none' && cs.visibility !== 'hidden' && b.getBoundingClientRect().width > 0;
    if ((txt.includes('清除') || txt.includes('清空草稿') || use === '#i-reset') && vis) bad.push({ id: b.id, txt, use });
  }
  // 跳过按钮应保留（每个模式至少有一个可见的）
  const skips = [...document.querySelectorAll('button[id$="skip-btn"], #mg-listen-skip')]
    .filter(b => { const cs = getComputedStyle(b); return cs.display !== 'none' && b.getBoundingClientRect().width > 0; })
    .map(b => b.id);
  return { url: location.pathname, presentIds, bad, skips, ua: navigator.userAgent };
})()`;

let fail = 0;
const P = (ok, l, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };

// L1 视算 / L1 听算 / L3 听算(赛跑) / L6 听算(BOSS) 四个代表性入口
const CASES = [
  [1, 'visual', 'L1 视算'],
  [1, 'audio', 'L1 听算'],
  [3, 'audio', 'L3 听算(赛跑)'],
  [6, 'audio', 'L6 听算(BOSS)'],
];
for (const [lv, mode, label] of CASES) {
  await goto(lv, mode);
  const r = (await ev(PROBE)).result.value;
  console.log('\n--- ' + label + ' ---', JSON.stringify({ presentIds: r.presentIds, bad: r.bad, skips: r.skips }));
  P(/Chrome\/(9[1-9]|1\d\d)\./.test(r.ua), label + ' WebView', (r.ua.match(/Chrome\/[\d.]+/) || [])[0]);
  P(r.presentIds.length === 0, label + ' 六个 clear 按钮 id 全部不存在', JSON.stringify(r.presentIds));
  P(r.bad.length === 0, label + ' 无可见的清除/清空草稿/i-reset 按钮', JSON.stringify(r.bad));
}
console.log('\n' + (fail === 0 ? '=== DEVICE CLEAR-BUTTON REMOVED ALL PASS ===' : '=== ' + fail + ' FAIL ==='));
ws.close(); process.exit(fail ? 1 : 0);
