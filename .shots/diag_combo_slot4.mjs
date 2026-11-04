// 诊断 4：选位终局。判据收紧到「真正不能挡的东西」= 题目/反馈/✓✗、活的数字读数、可点控件、麦克风。
// 静态装饰标签(⚡比谁快⚡ / ⚔️BATTLE ARENA / 👾BOSS血量 这种纯文字招牌)和草稿画布不算 ——
// 连对 pill 只亮 0.9s，盖住一块招牌没有代价，盖住题目或刚变的分数才有代价。
// 盒子按实测 pill 尺寸 + 6px 余量放大，矩阵 6 关卡/模式 × 4 视口。
const CDP = 'http://localhost:9333';
const info = await (await fetch(CDP + '/json')).json();
const page = info.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || info[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p) => { const id = ++_id; return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify({ id, method: m, params: p || {} })); }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true, userGesture: true })).result.value;
await send('Page.enable'); await send('Runtime.enable');
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });

const SCAN = `(() => {
  const W = 142, H = 50, vw = innerWidth, vh = innerHeight;      // 实测 pill 最大 127x41 + 余量
  const CAND = {
    'BL   左下':        [14, vh - 10 - H],
    'BR   右下':        [vw - 14 - W, vh - 10 - H],
    'BL120 左下抬120':  [14, vh - 120 - H],
    'BR120 右下抬120':  [vw - 14 - W, vh - 120 - H],
    'BL150 左下抬150':  [14, vh - 150 - H],
    'BR150 右下抬150':  [vw - 14 - W, vh - 150 - H],
  };
  const SACRED = ['#question-card','#question-display','#battle-question-card','#battle-question-display',
    '#space-question-display','#feedback-msg','#battle-feedback','#answer-mark','#battle-answer-mark',
    '#battle-countdown','#battle-score-num','#battle-score-display','#monster-hp-text','#space-done',
    '#race-player-step','#race-monster-step','#race-prog-player','#race-prog-monster','#space-progress-label',
    '#float-voice-overlay','#voice-mic-area','#float-voice-heard','#voice-status-text','button','[onclick]'];
  const keep = [];
  for (const e of document.querySelectorAll('body *')) {
    const s = getComputedStyle(e), b = e.getBoundingClientRect();
    if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.02) continue;
    if (b.width <= 0 || b.height <= 0 || b.width * b.height > vw * vh * 0.5) continue;
    if (e.id === 'float-combo' || e.closest('#float-combo') || e.closest('#overlay') || e.closest('#exit-modal')) continue;
    if (!SACRED.some(sel => e.matches(sel))) continue;
    keep.push({ n: (e.id ? '#' + e.id : e.tagName + '.' + (typeof e.className === 'string' ? e.className.split(' ')[0] : '')), b });
  }
  const out = {};
  for (const k in CAND) {
    const [x, y] = CAND[k], r = { left: x, top: y, right: x + W, bottom: y + H };
    out[k] = keep.filter(o => (Math.min(r.right, o.b.right) - Math.max(r.left, o.b.left)) > 0
                           && (Math.min(r.bottom, o.b.bottom) - Math.max(r.top, o.b.top)) > 0).map(o => o.n);
  }
  return out;
})()`;

const CASES = [[1, 'visual'], [1, 'audio'], [2, 'audio'], [3, 'audio'], [4, 'visual'], [5, 'audio']];
const VPS = [[1000, 576], [412, 915], [900, 500], [1280, 720], [800, 480]];
const agg = {};
for (const [w, h] of VPS) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  for (const [lv, mode] of CASES) {
    await send('Page.navigate', { url: 'http://localhost:8000/index.html' }); await sleep(400);
    await ev(`sessionStorage.setItem('gameLevel','${lv}');sessionStorage.setItem('gameMode','${mode}');`);
    await send('Page.reload'); await sleep(1000);
    await ev(`window._skipOcrLoading && window._skipOcrLoading();`);
    for (let i = 0; i < 30; i++) { if (await ev(`!!window._currentGame`)) break; await sleep(400); }
    await sleep(600);
    const r = await ev(SCAN);
    const tag = w + 'x' + h + ' L' + lv + ' ' + mode;
    for (const k in r) { (agg[k] = agg[k] || []).push({ tag, hit: r[k] }); if (r[k].length) console.log('  ' + k.padEnd(16) + tag.padEnd(22) + r[k].join(' ').slice(0, 100)); }
  }
}
console.log('\n=== 汇总 ===');
for (const k in agg) {
  const bad = agg[k].filter(x => x.hit.length);
  console.log('  ' + k.padEnd(16) + (bad.length ? bad.length + '/' + agg[k].length + ' 碰撞  例: ' + bad[0].tag + ' ' + bad[0].hit.join(' ').slice(0, 60)
                                                : '✓ ' + agg[k].length + ' 场景全空   <<<<<<'));
}
ws.close();
