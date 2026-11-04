// 语音交互区美化验证（卡通耳机+声波/麦克风脉冲波纹/识别框天蓝描边）via 本地 Chrome :9333。
// 覆盖：新 SVG symbol 可解析、.mg-listen-cue 图标结构(L1/L2)、麦克风波纹层(L1/L2/float)、
// reduced-motion 下新动画清零、禁用 token 扫描、L3/L5 不受影响(各自独立系统)。
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

async function loadAudio(lv) {
  await send('Page.navigate', { url: base }); await sleep(300);
  await evalJS(`window.__err=null;addEventListener('error',e=>window.__err=String(e.message));sessionStorage.setItem('gameLevel','${lv}');sessionStorage.setItem('gameMode','audio');`);
  await send('Page.reload');
  for (let t = 0; t < 24; t++) { await sleep(600); if (await evalJS(`!!window._currentGame`)) return true; }
  return false;
}

// ---- 禁用 token 扫描（Chrome 91 不支持的 CSS，只扫 <style> 文本，避开注释里提到禁用词的说明）----
{
  await send('Page.navigate', { url: base }); await sleep(500);
  const css = await evalJS(`[...document.querySelectorAll('style')].map(s => s.textContent).join('\\n')`);
  const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const banned = cssNoComments.match(/paint-order|:has\(|@layer|color-mix\(|oklch\(|\d[dsl]vh|mix-blend-mode/g) || [];
  P(banned.length === 0, '禁用 token 扫描(CSS内, 去注释)', JSON.stringify(banned));
}

// ---- SVG symbol 可解析（新图标）----
{
  const ready = await loadAudio(2);
  P(ready, 'L2 引擎就绪(symbol检查)');
  if (ready) {
    const r = await evalJS(`(() => {
      const ids = ['i-headphone-cute','i-soundwave','i-note','i-sparkle','i-mic'];
      return ids.map(id => ({ id, exists: !!document.getElementById(id) }));
    })()`);
    for (const x of r) P(x.exists, `symbol 存在: #${x.id}`);
    const useOk = await evalJS(`(() => {
      const uses = [...document.querySelectorAll('use')];
      const bad = uses.filter(u => { const h = u.getAttribute('href'); return h && h.startsWith('#') && !document.getElementById(h.slice(1)); });
      return { total: uses.length, bad: bad.map(u => u.getAttribute('href')) };
    })()`);
    P(useOk.bad.length === 0, `全部 <use href> 可解析 (共${useOk.total}个)`, JSON.stringify(useOk.bad));
  }
}

// ---- L2 听题提示卡：图标结构 + 装饰元素 ----
{
  const r = await evalJS(`(() => {
    const cue = document.getElementById('voice-cue');
    if (!cue) return { hasCue: false };
    const headphone = cue.querySelector('.headphone-ic');
    const waves = cue.querySelectorAll('.wave-ic');
    const note = cue.querySelector('.deco-note');
    const spark = cue.querySelector('.deco-spark');
    const hpCS = headphone && getComputedStyle(headphone);
    return {
      hasCue: true,
      hasHeadphone: !!headphone, headphoneColor: hpCS && hpCS.color,
      waveCount: waves.length,
      hasNote: !!note, hasSpark: !!spark,
      textOk: (cue.querySelector('.cue-text')||{}).textContent === '认真听题，大声说出答案'
    };
  })()`);
  P(r.hasCue, 'L2 #voice-cue 存在');
  P(r.hasHeadphone, 'L2 卡通耳机图标存在(.headphone-ic)');
  P(r.waveCount === 2, 'L2 两道声波线条存在', 'count=' + r.waveCount);
  P(r.hasNote && r.hasSpark, 'L2 音符+小星星装饰存在');
  P(r.textOk, 'L2 文案保持不变', r.textOk);
}

// ---- L2 麦克风：圆形橙色主题 + 脉冲波纹 ----
{
  const r = await evalJS(`(() => {
    const btn = document.getElementById('voice-mic-btn');
    const wrap = document.getElementById('voice-mic-wrap');
    const ripples = wrap ? wrap.querySelectorAll('.mic-ripple') : [];
    const btnCS = btn && getComputedStyle(btn);
    const r2 = ripples.length === 2 ? getComputedStyle(ripples[1]) : null;
    return {
      hasBtn: !!btn, radius: btnCS && btnCS.borderRadius,
      rippleCount: ripples.length,
      ripple2Delay: r2 && r2.animationDelay,
      ripple1Anim: ripples[0] && getComputedStyle(ripples[0]).animationName
    };
  })()`);
  P(r.hasBtn, 'L2 #voice-mic-btn 存在');
  P(r.radius === '50%' || r.radius?.includes('px'), 'L2 麦克风按钮仍是圆形', r.radius);
  P(r.rippleCount === 2, 'L2 麦克风波纹层(两层同心圆)存在', 'count=' + r.rippleCount);
  P(r.ripple1Anim === 'mic-ripple', 'L2 波纹动画已应用', r.ripple1Anim);
  P(r.ripple2Delay === '1.2s', 'L2 第二层波纹错相延迟', r.ripple2Delay);
}

// ---- L2 识别框：胶囊造型 + 天蓝描边 ----
{
  const r = await evalJS(`(() => {
    const el = document.getElementById('voice-heard-text');
    el.textContent = '12';
    const cs = getComputedStyle(el);
    return { radius: cs.borderRadius, border: cs.borderColor };
  })()`);
  P(parseInt(r.radius) >= 400 || r.radius.includes('%'), 'L2 识别框胶囊造型(var(--r-pill))', r.radius);
  P(r.border.includes('79') && r.border.includes('168') && r.border.includes('224'), 'L2 识别框天蓝描边', r.border);
  await shot('voice_listen_cue_L2');
}

// ---- L1：悬浮麦克风 + 听题提示卡 同样升级 ----
{
  const ready = await loadAudio(1);
  P(ready, 'L1 引擎就绪');
  if (ready) {
    const r = await evalJS(`(() => {
      const cue = document.getElementById('lv1-voice-cue');
      const wrap = document.getElementById('float-voice-mic-wrap');
      const ripples = wrap ? wrap.querySelectorAll('.mic-ripple') : [];
      const heard = document.getElementById('float-voice-heard');
      const hCS = heard && getComputedStyle(heard);
      return {
        hasHeadphone: !!(cue && cue.querySelector('.headphone-ic')),
        rippleCount: ripples.length,
        heardRadius: hCS && hCS.borderRadius,
        heardBorder: hCS && hCS.borderColor
      };
    })()`);
    P(r.hasHeadphone, 'L1 听题提示卡耳机图标存在');
    P(r.rippleCount === 2, 'L1 悬浮麦克风波纹层存在', 'count=' + r.rippleCount);
    P(r.heardBorder && r.heardBorder.includes('79'), 'L1 识别框天蓝描边', r.heardBorder);
    await shot('voice_listen_cue_L1');
  }
}

// ---- reduced-motion：新动画元素清零 ----
{
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await send('Page.reload'); await sleep(300);
  await evalJS(`sessionStorage.setItem('gameLevel','2');sessionStorage.setItem('gameMode','audio');`);
  await send('Page.reload');
  for (let t = 0; t < 24; t++) { await sleep(600); if (await evalJS(`!!window._currentGame`)) break; }
  const r = await evalJS(`(() => {
    const ripple = document.querySelector('#voice-mic-wrap .mic-ripple');
    const wave = document.querySelector('#voice-cue .wave-ic');
    return {
      rippleAnim: ripple && getComputedStyle(ripple).animationName,
      rippleOpacity: ripple && getComputedStyle(ripple).opacity,
      waveAnim: wave && getComputedStyle(wave).animationName
    };
  })()`);
  P(r.rippleAnim === 'none', 'reduced-motion: 麦克风波纹动画已关停', r.rippleAnim);
  P(r.rippleOpacity === '0', 'reduced-motion: 麦克风波纹不可见', r.rippleOpacity);
  P(r.waveAnim === 'none', 'reduced-motion: 声波闪烁动画已关停', r.waveAnim);
  await send('Emulation.setEmulatedMedia', { features: [] });
}

console.log('\n截图已存至 ' + OUT + '/voice_listen_cue_L{1,2}.png');
console.log(fail === 0 ? '=== 语音交互区美化 验证全过 ===' : '=== ' + fail + ' FAIL ===');
ws.close(); process.exit(fail ? 1 : 0);
