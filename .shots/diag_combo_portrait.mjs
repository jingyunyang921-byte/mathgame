// 诊断：竖屏 412x915 下 L5 的 pill 跟麦克风到底怎么撞的。
const CDP = 'http://localhost:9333';
const info = await (await fetch(CDP + '/json')).json();
const page = info.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || info[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p) => { const id = ++_id; return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify({ id, method: m, params: p || {} })); }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ev = async (e) => {
  const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true, userGesture: true });
  if (r.exceptionDetails) return 'THROW: ' + (r.exceptionDetails.exception || {}).description;
  return r.result.value;
};
await send('Page.enable'); await send('Runtime.enable');
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });

const DUMP = `(() => {
  const R = s => { const e = document.querySelector(s); if (!e) return s + ' (none)';
    const b = e.getBoundingClientRect(), c = getComputedStyle(e);
    return s + ' [' + [b.left, b.top, b.width, b.height].map(Math.round).join(',') + '] disp=' + c.display + ' left=' + c.left + ' bottom=' + c.bottom; };
  return ['vw=' + innerWidth + ' vh=' + innerHeight,
          R('#float-combo'), R('#float-voice-overlay'), R('#voice-mic-area'),
          R('#battle-question-card'), R('#battle-scratch-skip-btn'), R('#clear-btn'), R('#skip-btn')].join('\\n');
})()`;

for (const [w, h, lv, mode] of [[412, 915, 5, 'audio'], [412, 915, 1, 'visual'], [360, 740, 5, 'audio']]) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:8000/index.html' }); await sleep(400);
  await ev(`sessionStorage.setItem('gameLevel','${lv}');sessionStorage.setItem('gameMode','${mode}');`);
  await send('Page.reload'); await sleep(1000);
  await ev(`window._skipOcrLoading && window._skipOcrLoading();`);
  for (let i = 0; i < 30; i++) { if (await ev(`!!window._currentGame`)) break; await sleep(400); }
  await sleep(700);
  await ev(`_mgStreak=0;mgOnCorrect();mgOnCorrect();mgOnCorrect();`); await sleep(200);
  console.log('\n=== ' + w + 'x' + h + ' L' + lv + ' ' + mode + ' ===\n' + await ev(DUMP));
}
ws.close();
