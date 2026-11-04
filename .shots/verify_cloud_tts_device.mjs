// 真机验证云端音色：经 CDP 调 Capacitor 的 Tts.speak，量耗时（首次=联网合成，二次=命中缓存）。
// 前置：adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>
const pages = await (await fetch('http://localhost:9222/json')).json();
const page = pages.find(p => p.type === 'page') || pages[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const wait = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); } });
const ev = expr => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method: 'Runtime.evaluate', params: { expression: expr, awaitPromise: true, returnByValue: true } })); });
const text = process.argv[2] || '你好呀，我们一起来答题吧';
const run = () => ev(`(async()=>{const t=performance.now();try{await Capacitor.Plugins.Tts.speak({text:${JSON.stringify(text)},rate:1,volume:1,lang:'zh-CN'});return {ok:true,ms:Math.round(performance.now()-t)}}catch(e){return {ok:false,err:String(e&&e.message||e),ms:Math.round(performance.now()-t)}}})()`);
console.log('url', page.url);
console.log('1st', JSON.stringify((await run()).result.result.value));
console.log('2nd', JSON.stringify((await run()).result.result.value));
ws.close();
