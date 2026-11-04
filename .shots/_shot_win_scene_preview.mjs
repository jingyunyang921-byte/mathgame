// 过关小剧场静态稿截图：自起独立 headless Chrome（:9444），不碰套件用的 :9333。
// 用法：node .shots/_shot_win_scene_preview.mjs [WxH,...]   输出 .shots/out/ws_*.png
import { spawn } from 'child_process';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
const PORT = 9444, DIR = resolve('.shots/out'), PROF = resolve('.shots/out/_prev_profile');
mkdirSync(DIR, { recursive: true });
const sizes = (process.argv[2] || '960x576').split(',').map(s => s.split('x').map(Number));
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
  const base = pathToFileURL(resolve('.shots/win-scene-preview.html')).href;
  const jobs = [['sheet', '?s=sheet', 978, 410], ...[1, 2, 3, 4, 5].map(n => ['s' + n, '?s=' + n + '&static=1']), ...[0, 1, 2].map(f => ['s6_f' + f, '?s=6&static=1&f=' + f])];
  for (const [tag, qs, fw, fh] of jobs) for (const [w0, h0] of (fw ? [[fw, fh]] : sizes)) {
    const w = w0, h = h0;
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false }, sessionId);
    await send('Page.navigate', { url: base + qs }, sessionId);
    for (let t = 0; t < 40; t++) { await sleep(150); const r = await send('Runtime.evaluate', { expression: "document.body.dataset.ready==='1'", returnByValue: true }, sessionId); if (r.result.value) break; }
    await sleep(tag === 'sheet' ? 900 : 300);
    const m = await send('Runtime.evaluate', { returnByValue: true, expression: `(()=>{const q=s=>document.querySelector(s),r=e=>e?e.getBoundingClientRect():null,t=r(q('.ws-title')),c=r(q('.ws-cap')),g=r(q('.ws-go')),h=r(q('.ws-hero')),d=r(q('.ws-dots'));
      return {vw:innerWidth,vh:innerHeight,titleT:t&&Math.round(t.top),capB:c&&Math.round(c.bottom),goR:g&&Math.round(g.right),goB:g&&Math.round(g.bottom),heroT:h&&Math.round(h.top),dotsR:d&&Math.round(d.right)}})()` }, sessionId);
    const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
    writeFileSync(`${DIR}/ws_${tag}_${w}x${h}.png`, Buffer.from(shot.data, 'base64'));
    console.log(tag, w + 'x' + h, JSON.stringify(m.result.value));
  }
} finally { try { ws.close(); } catch (e) {} ch.kill(); await sleep(500); try { rmSync(PROF, { recursive: true, force: true }); } catch (e) {} }
