// 听算四关统一「悬浮语音卡 + 识别数字框」动态验证 via 本地 Chrome :9333（1000×576）。
// 六关编号：L1/L2/L4/L6 共享 #float-voice-heard（_setVoiceHeard 写入，原本 DOM 缺失→静默丢弃，现补上）；
//        L3(VoiceGame) 麦克风区贴底悬浮(position:fixed)+补 🎧 提示卡，仍写自己的 #voice-heard-text；
//        L5(SpaceGame) 答案靠点门，听算模式已彻底去掉麦克风/识别框，只保留读题 TTS。每关截图 + 断言无 JS 错误。
import { writeFileSync, mkdirSync } from 'fs';
const CDP = 'http://localhost:9333';
const OUT = '.shots/out';
try { mkdirSync(OUT, { recursive: true }); } catch (e) {}
const info = await (await fetch(CDP + '/json')).json();
const page = info.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || info[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p) => { const id = ++_id; return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify({ id, method: m, params: p || {} })); }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const evalJS = async (expr, awaitP = false) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: awaitP })).result.value;
await send('Page.enable'); await send('Runtime.enable');
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 576, deviceScaleFactor: 1, mobile: false });
let fail = 0; const P = (ok, l, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
const base = 'http://localhost:8000/index.html';
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64')); };

// 载入某关听算模式，轮询等 window._currentGame 就绪
async function loadAudio(lv) {
  await send('Page.navigate', { url: base }); await sleep(300);
  await evalJS(`window.__err=null;addEventListener('error',e=>window.__err=String(e.message));sessionStorage.setItem('gameLevel','${lv}');sessionStorage.setItem('gameMode','audio');`);
  await send('Page.reload');
  for (let t = 0; t < 24; t++) { await sleep(600); if (await evalJS(`!!window._currentGame`)) return true; }
  return false;
}

// ---- L1 / L2 / L4 / L6：共享 #float-voice-heard，_setVoiceHeard 应写入且可见 ----
for (const lv of [1, 2, 4, 6]) {
  const ready = await loadAudio(lv);
  P(ready, `L${lv} 引擎就绪`);
  if (!ready) continue;
  const r = await evalJS(`(() => {
    const el = document.getElementById('float-voice-heard');
    if (!el) return { exists: false };
    window._currentGame._setVoiceHeard('说的是：42');
    const cs = getComputedStyle(el); const rc = el.getBoundingClientRect();
    const ov = document.getElementById('float-voice-overlay');
    return { exists: true, text: el.textContent, display: cs.display, w: Math.round(rc.width), h: Math.round(rc.height),
             ovShown: ov && getComputedStyle(ov).display !== 'none', battleMode: ov && ov.classList.contains('battle-audio-mode') };
  })()`);
  P(r.exists, `L${lv} #float-voice-heard 存在`);
  P(r.text === '说的是：42', `L${lv} _setVoiceHeard 写入识别框`, JSON.stringify(r.text));
  P(r.display !== 'none' && r.w > 0 && r.h > 0, `L${lv} 识别框可见`, `display=${r.display} ${r.w}x${r.h}`);
  P(r.ovShown, `L${lv} 悬浮语音卡显示`, 'battleMode=' + r.battleMode);
  P(!(await evalJS('window.__err')), `L${lv} 无 JS 错误`, await evalJS('window.__err'));
  await shot(`voice_L${lv}`);
}

// ---- L3：VoiceGame 自己的 #voice-heard-text + 麦克风区贴底悬浮 + 🎧 提示卡；#float-voice-overlay 不介入 ----
{
  const ready = await loadAudio(3);
  P(ready, 'L3 引擎就绪');
  if (ready) {
    const r = await evalJS(`(() => {
      const heard = document.getElementById('voice-heard-text');
      const cue = document.getElementById('voice-cue');
      const mic = document.getElementById('voice-mic-area');
      const ov = document.getElementById('float-voice-overlay');
      if (heard) heard.textContent = '说的是：42';
      const micCS = mic && getComputedStyle(mic);
      const hCS = heard && getComputedStyle(heard); const hr = heard && heard.getBoundingClientRect();
      return {
        hasHeard: !!heard, text: heard && heard.textContent,
        hasCue: !!cue, hasHeadphoneIc: !!(cue && cue.querySelector('.headphone-ic')),
        micFixed: micCS && micCS.position === 'fixed', micBottom: micCS && micCS.bottom,
        heardVisible: hCS && hCS.display !== 'none' && hr && hr.width > 0,
        floatOvHidden: ov && getComputedStyle(ov).display === 'none'
      };
    })()`);
    P(r.hasCue && r.hasHeadphoneIc, 'L3 听题提示卡(卡通耳机图标)存在', r.hasHeadphoneIc);
    P(r.micFixed, 'L3 麦克风区贴底悬浮(position:fixed)', 'bottom=' + r.micBottom);
    P(r.hasHeard && r.text === '说的是：42' && r.heardVisible, 'L3 识别框写入且可见', JSON.stringify(r.text));
    P(r.floatOvHidden, 'L3 不启用共享 #float-voice-overlay(无重复控件)');
    P(!(await evalJS('window.__err')), 'L3 无 JS 错误', await evalJS('window.__err'));
    await shot('voice_L3');
  }
}

// ---- L5：飞船选门答案靠点门，听算模式已彻底去掉麦克风/识别框，只保留读题 TTS ----
{
  const ready = await loadAudio(5);
  P(ready, 'L5 引擎就绪');
  if (ready) {
    const r = await evalJS(`(() => {
      const ov = document.getElementById('float-voice-overlay');
      const sp = document.getElementById('space-voice-heard');
      return {
        ovHidden: !ov || getComputedStyle(ov).display === 'none',
        noSpaceNode: !sp,
        noRecognition: !window._currentGame.recognition,
        noRepeatTimer: !('repeatTimer' in window._currentGame)
      };
    })()`);
    P(r.ovHidden, 'L5 悬浮麦克风/识别框不显示(已去除)');
    P(r.noSpaceNode, 'L5 #space-voice-heard 节点已移除');
    P(r.noRecognition && r.noRepeatTimer, 'L5 不再初始化语音识别状态');
    P(!(await evalJS('window.__err')), 'L5 无 JS 错误', await evalJS('window.__err'));
    await shot('voice_L5');
  }
}

console.log('\n截图已存至 ' + OUT + '/voice_L{1..6}.png');
console.log(fail === 0 ? '=== 听算识别框统一 验证全过 ===' : '=== ' + fail + ' FAIL ===');
ws.close(); process.exit(fail ? 1 : 0);
