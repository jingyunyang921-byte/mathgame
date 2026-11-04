// 听算语音交互区预览截图 via 本地 Chrome :9333 + 静态服 :8000。
// 用法：node .shots/shot_voice_preview.mjs <页面> <关> <WxH> <输出名>
// 例：node .shots/shot_voice_preview.mjs voice-preview.html 1 960x576 voice_preview_L1
const [PAGE = 'voice-preview.html', LV = '1', DIM = '960x576', OUT = 'voice_preview'] = process.argv.slice(2);
import fs from 'node:fs';
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
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
for (const d of ['Page', 'Runtime', 'Network']) await send(d + '.enable', {}, sessionId);
await send('Network.setCacheDisabled', { cacheDisabled: true }, sessionId);
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true }, sessionId);
  if (r.exceptionDetails) throw new Error('EVAL: ' + ((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text));
  return r.result.value;
};
const [W, H] = DIM.split('x').map(Number);
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: false }, sessionId);
await send('Page.navigate', { url: BASE + PAGE }, sessionId); await sleep(500);
await ev(`sessionStorage.setItem('gameLevel','${LV}');sessionStorage.setItem('gameMode','audio');1`);
await send('Page.reload', {}, sessionId);
for (let i = 0; i < 60; i++) { await sleep(300); if (await ev(`!!window._currentGame`)) break; }
await sleep(900);
// 模拟"正在聆听"态：点亮麦克风按钮，露出识别数字框的脉冲+呼吸波纹效果
await ev(`(() => {
  const mb = document.getElementById('voice-mic-btn') || document.getElementById('float-voice-mic-btn');
  if (mb) mb.classList.add('listening');
  const ht = document.getElementById('voice-heard-text') || document.getElementById('float-voice-heard');
  if (ht) ht.textContent = '12';
})()`);
await sleep(500);
fs.mkdirSync('.shots/out', { recursive: true });
const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
const f = `.shots/out/${OUT}.png`; fs.writeFileSync(f, Buffer.from(shot.data, 'base64'));
console.log('-> ' + f); if (jsErrs.length) console.log('JS ERRORS', jsErrs);
await send('Target.closeTarget', { targetId }); ws.close(); process.exit(0);
