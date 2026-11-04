// 把 1a/1b/2a/2b/3a 的草稿图拼成对比图（自起独立 headless Chrome :9445，不碰 :9333）。用法：node .shots/_draft_eb_sheet.mjs
import { spawn } from 'child_process';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
const PORT = 9445, DIR = resolve('.shots/out'), PROF = resolve('.shots/out/_sheet_profile');
mkdirSync(DIR, { recursive: true });
const SHEETS = {
  eb_sheet_1_answer: ['每题加强·L1（蛋在左列）|eb_1a_L1', '每题加强·L4（蛋在右侧）|eb_1a_L4', '里程碑大弹·L1（第3/6/10题）|eb_1b_L1', '里程碑大弹·L4|eb_1b_L4'],
  eb_sheet_2_intro: ['开场·视算 L1|eb_2a_L1_visual_960x576', '开场·听算 L3|eb_2a_L3_audio_960x576', '开场·L5 选门|eb_2a_L5_visual_960x576', '开场·竖屏 412 宽|eb_2a_L1_visual_412x800'],
  eb_sheet_3_demo: ['首题示范·视算 L1|eb_2b_L1_visual_960x576', '首题示范·L5 选门|eb_2b_L5_visual_960x576'],
  eb_sheet_4_stars: ['1 星|eb_3a_s1_L1_960x576', '2 星|eb_3a_s2_L1_960x576', '3 星|eb_3a_s3_L1_960x576', '没通关|eb_3a_fail_L1_960x576'],
};
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
  await send('Page.enable', {}, sessionId);
  for (const [name, items] of Object.entries(SHEETS)) {
    const cw = 640, cols = items.length === 2 ? 2 : 2, pad = 8;
    const cells = items.map(it => { const [cap, f] = it.split('|'); const portrait = f.includes('412x800');
      const w = portrait ? 300 : cw;
      return `<figure style="margin:0;width:${w}px"><img src="${f}.png" style="width:${w}px;display:block;border-radius:6px;border:1px solid #666"><figcaption style="color:#fff;font:700 15px/22px system-ui,sans-serif;padding:4px 2px">${cap}</figcaption></figure>`; }).join('');
    const html = `<body style="margin:0;background:#2b2b2b"><div style="display:flex;flex-wrap:wrap;gap:${pad}px;padding:${pad}px;width:${cols * cw + (cols + 1) * pad}px;align-items:flex-start">${cells}</div></body>`;
    writeFileSync(`${DIR}/_${name}.html`, html);
    const rows = Math.ceil(items.length / cols), sw = cols * cw + (cols + 1) * pad, sh = rows * (cw * 0.6 + 40) + pad * 2 + (name.includes('intro') ? 260 : 0);
    await send('Emulation.setDeviceMetricsOverride', { width: sw, height: Math.round(sh), deviceScaleFactor: 1, mobile: false }, sessionId);
    await send('Page.navigate', { url: pathToFileURL(`${DIR}/_${name}.html`).href }, sessionId); await sleep(1100);
    const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
    writeFileSync(`${DIR}/${name}.png`, Buffer.from(shot.data, 'base64'));
    console.log(name, sw + 'x' + Math.round(sh));
  }
} finally { try { ws.close(); } catch (e) {} ch.kill(); await sleep(500); try { rmSync(PROF, { recursive: true, force: true }); } catch (e) {} }
