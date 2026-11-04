// 「带蛋拜访朋友」静态稿截图：自起独立 headless Chrome（:9444），不碰套件用的 :9333。
// 用法：node .shots/_shot_egg_companion_preview.mjs
import { spawn } from 'child_process';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
const PORT = 9444, DIR = resolve('.shots/out'), PROF = resolve('.shots/out/_prev_profile_egg');
mkdirSync(DIR, { recursive: true });
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
  const base = pathToFileURL(resolve('.shots/egg-companion-preview.html')).href;
  const jobs = [['L1', 960, 576], ['L5', 960, 576], ['L6', 960, 576], ['R', 960, 576], ['sheet', 1472, 900]];
  for (const [f, w, h0] of jobs) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h0, deviceScaleFactor: 1, mobile: false }, sessionId);
    await send('Page.navigate', { url: base + '?f=' + f }, sessionId);
    for (let t = 0; t < 40; t++) { await sleep(150); const r = await send('Runtime.evaluate', { expression: "document.body.dataset.ready==='1'", returnByValue: true }, sessionId); if (r.result.value) break; }
    await sleep(300);
    let h = h0;
    if (f === 'sheet') {
      const r = await send('Runtime.evaluate', { expression: 'document.documentElement.scrollHeight', returnByValue: true }, sessionId);
      h = r.result.value;
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false }, sessionId);
      await sleep(300);
    }
    const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
    writeFileSync(`${DIR}/egg_draft_${f}.png`, Buffer.from(shot.data, 'base64'));
    console.log('shot', f, w + 'x' + h);
  }
} finally { try { ws.close(); } catch (e) {} ch.kill(); await sleep(500); try { rmSync(PROF, { recursive: true, force: true }); } catch (e) {} }
