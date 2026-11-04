// 速算+胜利一拍预览截图：自起独立 headless Chrome（:9444），不碰套件用的 :9333。
// 用法：node .shots/_shot_sprint_win_preview.mjs [WxH]   输出 .shots/out/sw_<panel>.png + sw_sheet.png
import { spawn } from 'child_process';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
const PORT = 9444, DIR = resolve('.shots/out'), PROF = resolve('.shots/out/_prev_profile');
mkdirSync(DIR, { recursive: true });
const [W, H] = (process.argv[2] || '960x576').split('x').map(Number);
const panels = ['entry1', 'entry2', 'intro', 'hud', 'result1', 'result2', 'win'];
const ch = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROF, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ver; for (let i = 0; i < 40; i++) { try { ver = await (await fetch('http://localhost:' + PORT + '/json/version')).json(); break; } catch (e) { await sleep(250); } }
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p, s) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (s) msg.sessionId = s;
  return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify(msg)); }); };
try {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId); await send('Runtime.enable', {}, sessionId);
  const base = pathToFileURL(resolve('.shots/sprint-win-preview.html')).href;
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false }, sessionId);
  for (const p of panels) {
    await send('Page.navigate', { url: base + '?p=' + p }, sessionId);
    for (let t = 0; t < 40; t++) { await sleep(150); const r = await send('Runtime.evaluate', { expression: "document.body.dataset.ready==='1'", returnByValue: true }, sessionId); if (r.result.value) break; }
    await sleep(250);
    const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
    writeFileSync(`${DIR}/sw_${p}.png`, Buffer.from(shot.data, 'base64'));
    console.log('shot', p);
  }
  const cw = Math.round(W * 0.5), chh = Math.round(H * 0.5);
  writeFileSync(`${DIR}/_sw_sheet.html`, `<body style="margin:0;background:#333"><div style="display:grid;grid-template-columns:repeat(2,${cw}px);gap:4px;padding:4px;width:${2 * cw + 12}px">${panels.map(p => `<img src="sw_${p}.png" width="${cw}" height="${chh}">`).join('')}</div></body>`);
  const sw = 2 * cw + 12, sh = Math.ceil(panels.length / 2) * (chh + 4) + 4;
  await send('Emulation.setDeviceMetricsOverride', { width: sw, height: sh, deviceScaleFactor: 1, mobile: false }, sessionId);
  await send('Page.navigate', { url: pathToFileURL(`${DIR}/_sw_sheet.html`).href }, sessionId); await sleep(900);
  const sheet = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(`${DIR}/sw_sheet.png`, Buffer.from(sheet.data, 'base64'));
  console.log('sheet', sw + 'x' + sh);
} finally { try { ws.close(); } catch (e) {} ch.kill(); await sleep(500); try { rmSync(PROF, { recursive: true, force: true }); } catch (e) {} }
