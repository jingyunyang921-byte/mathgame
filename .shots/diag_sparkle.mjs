// 查清 verify_combo 里那个撞上来的 DIV:"✨" 到底是谁 —— 它的尺寸每次跑都在变（25x19 / 25x17 /
// 43x22 / 44x19），强烈暗示是个一直在飘的装饰层；若是，这条断言本身就是不确定的，不该当闸门。
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
  const out = [];
  for (const e of document.querySelectorAll('body *')) {
    const own = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
    if (own !== '✨') continue;
    const s = getComputedStyle(e), b = e.getBoundingClientRect();
    out.push({ cls: e.className, parent: (e.parentElement.id || e.parentElement.tagName) + '.' + e.parentElement.className,
               pos: s.position, z: s.zIndex, op: +s.opacity, anim: s.animationName, dur: s.animationDuration,
               rect: [b.left, b.top, b.width, b.height].map(Math.round) });
  }
  return out;
})()`;

await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://localhost:8000/index.html' }); await sleep(400);
await ev(`sessionStorage.setItem('gameLevel','1');sessionStorage.setItem('gameMode','visual');`);
await send('Page.reload'); await sleep(1000);
await ev(`window._skipOcrLoading && window._skipOcrLoading();`);
for (let i = 0; i < 30; i++) { if (await ev(`!!window._currentGame`)) break; await sleep(400); }
await sleep(600);
for (let k = 0; k < 3; k++) {
  console.log('--- t+' + k * 900 + 'ms ---');
  console.log(JSON.stringify(await ev(DUMP), null, 1));
  await sleep(900);
}
ws.close();
