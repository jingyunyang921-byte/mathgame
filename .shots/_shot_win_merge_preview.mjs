// 宝箱舞台 × 过关场景 合并稿截图：自起独立 headless Chrome（:9444），不碰套件用的 :9333。
// 用法：node .shots/_shot_win_merge_preview.mjs [WxH,...] [lv,lv,...]   输出 .shots/out/wm_L<lv>_<state>_<WxH>.png + wm_sheet_<WxH>.png
import { spawn } from 'child_process';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
const PORT = 9444, DIR = resolve('.shots/out'), PROF = resolve('.shots/out/_prev_profile');
mkdirSync(DIR, { recursive: true });
const sizes = (process.argv[2] || '960x576').split(',').map(s => s.split('x').map(Number));
const lvs = (process.argv[3] || '1,4,6').split(',').map(Number);
const states = ['closed', 'opened', 'done'];
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
  const base = pathToFileURL(resolve('.shots/win-merge-preview.html')).href;
  const ready = async () => { for (let t = 0; t < 40; t++) { await sleep(150); const r = await send('Runtime.evaluate', { expression: "document.body.dataset.ready==='1'", returnByValue: true }, sessionId); if (r.result.value) break; } await sleep(250); };
  const metrics = "(()=>{const q=s=>document.querySelector(s),r=e=>e?e.getBoundingClientRect():null,R=e=>{const b=r(e);return b&&[Math.round(b.left),Math.round(b.top),Math.round(b.right),Math.round(b.bottom)]};"
    + "const t=R(q('.cs-title')),p=R(q('.cs-partner')),c=R(q('.cs-chips')),e=R(q('.egg-strip')),g=R(q('.cs-go')),x=R(q('.cs-box'));"
    + "const hit=(a,b)=>a&&b&&a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];"
    + "return {vw:innerWidth,vh:innerHeight,title:t,partner:p,box:x,chips:c,egg:e,go:g,partnerHitsTitle:hit(p,t),partnerHitsChips:hit(p,c),partnerHitsEgg:hit(p,e),partnerOff:p&&(p[0]<0||p[1]<0)}})()";
  for (const [w, h] of sizes) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false }, sessionId);
    for (const lv of lvs) for (const s of states) {
      await send('Page.navigate', { url: base + '?s=' + s + '&lv=' + lv }, sessionId);
      await ready();
      const m = await send('Runtime.evaluate', { returnByValue: true, expression: metrics }, sessionId);
      const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
      writeFileSync(`${DIR}/wm_L${lv}_${s}_${w}x${h}.png`, Buffer.from(shot.data, 'base64'));
      console.log('L' + lv, s, w + 'x' + h, JSON.stringify(m.result.value));
    }
    const k = 0.5, cw = Math.round(w * k), chh = Math.round(h * k);
    const cells = lvs.map(lv => states.map(s => `<img src="wm_L${lv}_${s}_${w}x${h}.png" width="${cw}" height="${chh}">`).join('')).join('');
    writeFileSync(`${DIR}/_wm_sheet.html`, `<body style="margin:0;background:#333"><div style="display:grid;grid-template-columns:repeat(3,${cw}px);gap:4px;padding:4px;width:${3 * cw + 16}px">${cells}</div></body>`);
    const sw = 3 * cw + 16, sh = lvs.length * (chh + 4) + 4;
    await send('Emulation.setDeviceMetricsOverride', { width: sw, height: sh, deviceScaleFactor: 1, mobile: false }, sessionId);
    await send('Page.navigate', { url: pathToFileURL(`${DIR}/_wm_sheet.html`).href }, sessionId); await sleep(900);
    const sheet = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
    writeFileSync(`${DIR}/wm_sheet_${lvs.join('')}_${w}x${h}.png`, Buffer.from(sheet.data, 'base64'));
    console.log('sheet', w + 'x' + h, sw + 'x' + sh);
  }
} finally { try { ws.close(); } catch (e) {} ch.kill(); await sleep(500); try { rmSync(PROF, { recursive: true, force: true }); } catch (e) {} }
