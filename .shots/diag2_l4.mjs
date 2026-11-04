// L4 强诊断：区分「canvas 真没画」vs「画了但 CDP 截图抓不到 GPU 合成层」。
// 干净重进 L4 + 注入 error 监听 + 找 game 实例 + getImageData 像素采样 + choices/raf 状态。
const CDP = 'http://localhost:9222';
const info = await (await fetch(CDP + '/json')).json();
const page = info.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || info[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p) => { const id = ++_id; return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify({ id, method: m, params: p || {} })); }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ev = (expr, ret = true) => send('Runtime.evaluate', { expression: expr, returnByValue: ret, awaitPromise: true, userGesture: true });
await send('Page.enable'); await send('Runtime.enable');
await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__errs=[];window.addEventListener('error',e=>{try{window.__errs.push(String(e.message||e.error||e));}catch(_){}}); ` });
await ev(`sessionStorage.setItem('gameLevel','4');sessionStorage.setItem('gameMode','visual');location.href='game.html';`, false);
await sleep(1600);
await ev(`window._skipOcrLoading && window._skipOcrLoading();`, false);
await sleep(5200);
const r = (await ev(`(() => {
  const cv = document.querySelector('#space-canvas'); if (!cv) return { noCanvas: true };
  const ctx = cv.getContext('2d');
  const keys = Object.keys(window).filter(k => { try { return window[k] && typeof window[k]._draw === 'function'; } catch (e) { return false; } });
  const g = keys.length ? window[keys[0]] : null;
  let drawErr = null; try { if (g) g._draw(); } catch (e) { drawErr = String(e.stack || e); }
  const sample = (x, y) => { try { const d = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data; return d[0] + ',' + d[1] + ',' + d[2] + ',' + d[3]; } catch (e) { return 'ERR:' + e.message; } };
  return { globalKeys: keys, choices: g ? (g.choices ? g.choices.length : 'none') : 'no-game',
    gameEnded: g ? g.gameEnded : null, hasRaf: g ? (g.rafId != null) : null,
    px_center: sample(cv.width / 2, cv.height / 2), px_topleft: sample(20, 20),
    px_doorRow: sample(cv.width / 2, cv.height * 0.72), px_shipRow: sample(cv.width * 0.1, cv.height * 0.35),
    errs: window.__errs || 'no-hook', cw: cv.width + 'x' + cv.height };
})()`)).result.value;
console.log(JSON.stringify(r, null, 2));
ws.close(); process.exit(0);
