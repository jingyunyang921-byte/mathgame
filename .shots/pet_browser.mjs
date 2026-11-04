// 宠物验证共用CDP连接；PET_DEVICE=1 时操作真机APK，否则使用本地独立页签。
import { mkdirSync, writeFileSync } from 'node:fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
export async function petBrowser() {
  const device = process.env.PET_DEVICE === '1';
  const cdp = process.env.CDP || (device ? 'http://localhost:9222' : 'http://localhost:9333');
  let targetId, sessionId;
  const info = await (await fetch(cdp + (device ? '/json' : '/json/version'))).json();
  const endpoint = device ? info.find(t => t.type === 'page' && t.webSocketDebuggerUrl)?.webSocketDebuggerUrl : info.webSocketDebuggerUrl;
  if (!endpoint) throw new Error('没有可用的CDP页面');
  const ws = new WebSocket(endpoint);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0;
  const pending = new Map(), listeners = new Set(), errors = [];
  ws.onmessage = event => {
    const m = JSON.parse(event.data), p = pending.get(m.id);
    if (p) {
      pending.delete(m.id); clearTimeout(p.timer);
      if (m.error) p.reject(new Error(JSON.stringify(m.error))); else p.resolve(m.result);
    } else if (m.method && (!sessionId || m.sessionId === sessionId)) {
      if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
      for (const cb of listeners) cb(m);
    }
  };
  function send(method, params = {}) {
    const seq = ++id, msg = { id: seq, method, params };
    if (sessionId) msg.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(seq); reject(new Error('CDP超时: ' + method)); }, 30000);
      pending.set(seq, { resolve, reject, timer }); ws.send(JSON.stringify(msg));
    });
  }
  if (!device) {
    ({ targetId } = await send('Target.createTarget', { url: 'about:blank' }));
    ({ sessionId } = await send('Target.attachToTarget', { targetId, flatten: true }));
  }
  for (const domain of ['Page', 'Runtime', 'Network']) await send(domain + '.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  const ev = async expression => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const base = device ? 'https://localhost/' : 'http://localhost:8000/';
  const menu = base + (device ? 'index.html' : 'menu.html');
  const game = base + (process.env.PET_GAME || (device ? 'game.html' : 'index.html'));
  const nav = async url => {
    await ev(`typeof window._mgSafeLeave==='function' && window._currentGame ? new Promise(resolve=>window._mgSafeLeave(window._currentGame,resolve)) : true`);
    let listener, timer;
    const loaded = new Promise((resolve, reject) => {
      listener = m => { if (m.method === 'Page.loadEventFired') resolve(); };
      listeners.add(listener); timer = setTimeout(() => reject(new Error('页面加载超时: ' + url)), 30000);
    });
    try { await Promise.all([send('Page.navigate', { url }), loaded]); }
    finally { listeners.delete(listener); clearTimeout(timer); }
    await sleep(150);
  };
  const poll = async (expression, timeout = 15000) => {
    const until = Date.now() + timeout;
    do { if (await ev(expression)) return true; await sleep(150); } while (Date.now() < until);
    throw new Error('等待条件超时: ' + expression);
  };
  const boot = async (level, mode = 'visual', extra = '') => {
    await ev(`sessionStorage.setItem('gameLevel',${JSON.stringify(String(level))});sessionStorage.setItem('gameMode',${JSON.stringify(mode)});sessionStorage.removeItem('mgSprint');sessionStorage.removeItem('mgPractice');sessionStorage.removeItem('mgPracticeOps');sessionStorage.removeItem('mgReview');sessionStorage.setItem('mgIntroHeard','[1,2,3,4,5,6]');${extra};true`);
    await nav(game);
    await ev('window._skipOcrLoading && window._skipOcrLoading();true');
    await poll('!!window._currentGame', 30000);
    await poll('window._currentGame._countdownActive === false', 30000);
  };
  // 结算宝箱：等舞台弹出 → 点开 → 等「再来一局 / 下一关」按钮出现 → 记下舞台上的奖励牌 → 收起舞台（等同硬件返回键），回到静态结算卡。
  // 本局没有可开的宝箱返回 false；否则返回 { chips: [{ text, kind, href }] }（奖励牌只在舞台上，收起后卡里不再重复）。
  const takeChest = async (timeout = 9000) => {
    const pending = await ev(`typeof _mgChestSnap !== 'undefined' && !!_mgChestSnap && !_mgChestSnap.claimed`);
    if (!pending) return false;
    await poll(`!!document.querySelector('#cs-stage .chest-tap')`, timeout);
    await ev(`document.querySelector('#cs-stage .chest-tap').click();true`);
    await poll(`!!document.querySelector('#cs-stage .cs-acts')`, timeout);
    const chips = await ev(`[...document.querySelectorAll('#cs-stage .cs-chip')].map(n => ({ text: n.textContent, kind: n.className, href: (n.querySelector('use') || { getAttribute: () => null }).getAttribute('href') }))`);
    const stage = await ev(`document.getElementById('cs-stage').innerText.replace(/\\s+/g, ' ')`);
    await ev(`mgStageDismiss();true`);
    await sleep(200);
    return { chips, stage };
  };
  const viewport = async (width, height) => {
    if (!device) await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  };
  let saved;
  const preserve = async () => { saved = await ev(`({local:{...localStorage},session:{...sessionStorage}})`); };
  const restore = async () => {
    if (!saved) return;
    await ev(`(() => { const s=${JSON.stringify(saved)};localStorage.clear();sessionStorage.clear();for(const [k,v] of Object.entries(s.local))localStorage.setItem(k,v);for(const [k,v] of Object.entries(s.session))sessionStorage.setItem(k,v);return true;})()`);
    if (device) await nav(menu);
  };
  const shot = async name => {
    mkdirSync('.shots/out', { recursive: true });
    const result = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync('.shots/out/' + (device ? 'device_' : '') + name + '.png', Buffer.from(result.data, 'base64'));
  };
  const close = async () => {
    try { if (targetId) { sessionId = undefined; await send('Target.closeTarget', { targetId }); } }
    finally { ws.close(); }
  };
  return { device, ev, nav, poll, boot, viewport, takeChest, shot, preserve, restore, close, send, errors, sleep, menu, game };
}
export function verdicts() {
  let fail = 0, pass = 0;
  return {
    check(ok, name, data) {
      if (ok) pass++; else fail++;
      console.log((ok ? 'PASS ' : 'FAIL ') + name + (data == null ? '' : ' ' + JSON.stringify(data)));
    },
    finish(name) { console.log(`${name}: pass=${pass} fail=${fail}`); process.exitCode = fail ? 1 : 0; }
  };
}
