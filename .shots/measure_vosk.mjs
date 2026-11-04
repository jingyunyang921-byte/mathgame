// 测量听算(audio/Vosk)路径冷加载：导航→ensureVoskLoaded() 解析的真实毫秒(相对 navigationStart)。
const CDP = 'http://localhost:9222';
const info = await (await fetch(CDP + '/json')).json();
const page = info.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || info[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p) => { const id = ++_id; return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify({ id, method: m, params: p || {} })); }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
await send('Page.enable'); await send('Runtime.enable');
const ev = (expr, ret = true) => send('Runtime.evaluate', { expression: expr, returnByValue: ret, awaitPromise: true, userGesture: true });

await ev(`sessionStorage.setItem('gameLevel','2');sessionStorage.setItem('gameMode','audio');location.href='game.html';`, false);
await sleep(600);
// 等 ensureVoskLoaded 定义好，立刻冷计时(比页面自身在 intro 后才调用更早，测纯冷成本)
await ev(`(function poll(){ if (typeof ensureVoskLoaded==='function' && window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Vosk){ window.__vT0=performance.timing.navigationStart; window.__vs='loading'; ensureVoskLoaded().then(()=>{window.__vReadyMs=Date.now()-window.__vT0; window.__vs='ready';}).catch(e=>{window.__vs='fail:'+((e&&(e.message||e.errorMessage))||e);}); } else { setTimeout(poll,80); } })();`, false);
let t0 = Date.now(), r = null;
while (Date.now() - t0 < 60000) {
  r = (await ev(`({ vs: window.__vs||'?', ms: window.__vReadyMs||null, vosk: !!(window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.Vosk) })`)).result.value;
  if (r.vs === 'ready' || (r.vs && r.vs.startsWith('fail'))) break;
  await sleep(200);
}
console.log('[AUDIO/Vosk] voskAvailable:', r && r.vosk, '| status:', r && r.vs, '| ready at ~', r && r.ms, 'ms since navigationStart');
ws.close(); process.exit(0);
