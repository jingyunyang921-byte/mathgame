// L4 比谁快「赛道区域优化(探险闯关地图)」真机验证 via :9222（Chrome91 WebView，1000×576）。
// 断言：引擎就绪/无 JS 错误/画布有尺寸；蜿蜒/天空/路面金/中央更暗；旗 点亮金 vs 未点亮灰蓝；
//      奖励(宝箱/宝石/星星)点亮切换；门旗飘动(相位推进+像素变化)；空闲 fps≥40 且旗摆开启/停止差≤5。
import { writeFileSync } from 'fs';
const CDP = 'http://localhost:9222';
const info = await (await fetch(CDP + '/json')).json();
const page = info.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || info[0];
console.log('target:', page.title, '|', page.url);
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map(); let jsErrs = [];
ws.onmessage = e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
  else if (m.method === 'Runtime.exceptionThrown') jsErrs.push((m.params.exceptionDetails.exception || {}).description || m.params.exceptionDetails.text); };
const send = (m, p) => { const id = ++_id; return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify({ id, method: m, params: p || {} })); }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
await send('Page.enable'); await send('Runtime.enable');
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, userGesture: true });
  if (r.exceptionDetails) throw new Error('EVAL: ' + ((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text)); return r.result.value; };
const evp = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true });
  if (r.exceptionDetails) throw new Error('EVAL: ' + ((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text)); return r.result.value; };
let fail = 0; const P = (ok, l, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`.shots/out/${name}.png`, Buffer.from(r.data, 'base64')); };
// 导航到 L4 视算并等引擎就绪
await ev(`sessionStorage.setItem('gameLevel','4');sessionStorage.setItem('gameMode','visual');location.href='game.html';`);
await sleep(1600);
await ev(`window._skipOcrLoading && window._skipOcrLoading();`);
for (let t = 0; t < 30; t++) { await sleep(600); if (await ev(`!!window._currentGame`)) break; }
await sleep(1200);
P(/Chrome\/91\./.test(await ev('navigator.userAgent')), 'WebView Chrome/91', (await ev('navigator.userAgent')).match(/Chrome\/[\d.]+/)[0]);
P(jsErrs.length === 0, '无 JS 错误', jsErrs.join(' | ') || 'clean');
// rAF 前置自检：屏幕灭/页面不可见时 rAF 停摆，直接失败退出而不是挂死
const rafOk = await Promise.race([
  evp(`new Promise(res => requestAnimationFrame(() => res(true)))`),
  sleep(2500).then(() => false),
]);
P(rafOk, 'rAF 响应(屏幕已亮、页面可见)', rafOk ? 'ok' : '亮屏后重跑: adb shell input keyevent KEYCODE_WAKEUP && adb shell wm dismiss-keyguard');
if (!rafOk) { console.log('=== RACE DEVICE ABORTED (display off) ==='); process.exit(2); }
// 页内像素探针（与本地 verify_race_map 同一套，避开角色占位）
const r = await ev(`(() => {
  const g = window._currentGame;
  if (g.monsterTimer) clearInterval(g.monsterTimer);
  g.gameEnded = false; g.playerStep = 0; g.monsterStep = 0;
  const px = (id, x, y) => { const cv = document.getElementById(id);
    const d = cv.getContext('2d').getImageData(Math.round(x), Math.round(y), 1, 1).data; return [d[0], d[1], d[2]]; };
  const lc = document.getElementById('race-left-canvas'), rc = document.getElementById('race-right-canvas');
  const W = lc.width, H = lc.height;
  const trL = g._raceTrail(W, H, true), trR = g._raceTrail(rc.width, rc.height, false);
  const cpsR = g._raceCps(trR);
  const flagPt = c => { const rr = Math.max(6, 12 - c.i * 0.55), fw = rr * 1.9, fh = rr * 2.5;
    return [c.eR[0] - 3 - fw * 0.5, c.y - fh + fw * 0.45]; };
  const out = {};
  out.canvasWH = W + 'x' + H;
  out.sway = Math.round(Math.abs(trL.cx(0.3) - trL.cx(0.7)));
  out.sky = px('race-left-canvas', W * 0.5, 8);
  out.gold = px('race-left-canvas', trL.cx(0.35) + trL.hw(0.35) * 0.25, trL.y(0.35));
  out.center = px('race-canvas', document.getElementById('race-canvas').width * 0.5, H * 0.70);
  out.ground = px('race-left-canvas', 4, H * 0.70);
  const sample = step => { g.monsterStep = step; g._updateRaceTrack();
    const p2 = flagPt(cpsR[1]), p5 = flagPt(cpsR[4]);
    return { f2: px('race-right-canvas', p2[0], p2[1]), f5: px('race-right-canvas', p5[0], p5[1]),
      chest: px('race-right-canvas', trR.cx(0.42), trR.y(0.42) - 2),
      gem: px('race-right-canvas', trR.cx(0.62), trR.y(0.62) - 6),
      star: px('race-right-canvas', trR.cx(0.90), trR.y(0.90) - 8) }; };
  out.lit = sample(9);
  out.dim = sample(0);
  const h = Math.max(24, trR.finishY * 0.42), topY = trR.finishY - h, fw = h * 0.62;
  const fx = trR.cx(1) + trR.hw(1) + 2; const pts = [];
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++)
    pts.push(px('race-right-canvas', fx + 2 + i * fw / 4, topY + 2 + j * h * 0.5 / 4));
  out.band1 = pts;
  out.phase1 = g._racePhase || 0;
  return out;
})()`);
await sleep(400);
const r2 = await ev(`(() => {
  const g = window._currentGame, rc = document.getElementById('race-right-canvas');
  const trR = g._raceTrail(rc.width, rc.height, false);
  const px = (x, y) => { const d = rc.getContext('2d').getImageData(Math.round(x), Math.round(y), 1, 1).data; return [d[0], d[1], d[2]]; };
  const h = Math.max(24, trR.finishY * 0.42), topY = trR.finishY - h, fw = h * 0.62;
  const fx = trR.cx(1) + trR.hw(1) + 2; const pts = [];
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) pts.push(px(fx + 2 + i * fw / 4, topY + 2 + j * h * 0.5 / 4));
  return { band2: pts, phase2: g._racePhase || 0 };
})()`);
const dmax = (a, b) => Math.max(Math.abs(a[0]-b[0]), Math.abs(a[1]-b[1]), Math.abs(a[2]-b[2]));
const rg = c => c[0] - c[1];
P(r.canvasWH !== '0x0', '画布有尺寸', r.canvasWH);
P(r.sway >= 15, '路径蜿蜒(摆幅≥15px)', r.sway + 'px');
P(r.sky[2] > 130 && r.sky[0] < 150, '天空蓝', JSON.stringify(r.sky));
P(r.gold[0] >= 200 && rg(r.gold) >= 20 && r.gold[2] <= 140, '路面金', JSON.stringify(r.gold));
P(r.center[0] <= r.ground[0] - 10 && r.center[1] <= r.ground[1] - 10, '中央答题区更暗', `center ${r.center} vs ground ${r.ground}`);
P(rg(r.lit.f2) >= 40 && r.lit.f2[0] >= 230, '检查点旗 点亮=金', JSON.stringify(r.lit.f2));
P(rg(r.dim.f2) <= 22 && r.dim.f2[2] >= 105, '检查点旗 未点亮=灰蓝半透明', JSON.stringify(r.dim.f2));
P(rg(r.lit.f5) >= 40 && dmax(r.lit.f5, r.dim.f5) >= 40, 'cp5 旗随进度点亮', `lit ${r.lit.f5} dim ${r.dim.f5}`);
P(r.lit.chest[0] >= 225 && dmax(r.lit.chest, r.dim.chest) >= 40, '宝箱 第4题后点亮', `lit ${r.lit.chest} dim ${r.dim.chest}`);
P(r.lit.gem[2] >= 200 && r.lit.gem[1] >= 180 && dmax(r.lit.gem, r.dim.gem) >= 40, '蓝宝石 第6题后点亮', `lit ${r.lit.gem} dim ${r.dim.gem}`);
P(r.lit.star[0] >= 180 && r.lit.star[2] <= 110 && dmax(r.lit.star, r.dim.star) >= 40, '星星 第9题后点亮', `lit ${r.lit.star} dim ${r.dim.star}`);
P(r2.phase2 > r.phase1, '旗摆循环运行(相位推进)', `${r.phase1}->${r2.phase2}`);
P(r.band1.some((p, i) => dmax(p, r2.band2[i]) > 12), '门旗随时间飘动(像素变化)');
await shot('race_device_start');
// 进度 9:8 截图（奖励全点亮）
await ev(`(() => { const g = window._currentGame; g.playerStep = 9; g.monsterStep = 8; g._updateRaceTrack(); return 1; })()`);
await sleep(300);
await shot('race_device_late');
// fps：旗摆运行 vs 停止（各 2s）
const fpsRun = await Promise.race([
  evp(`new Promise(res => { let n = 0; const t0 = performance.now();
    const loop = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(loop); else res(Math.round(n / 2)); };
    requestAnimationFrame(loop); })`),
  sleep(6000).then(() => -1),
]);
if (fpsRun === -1) { P(false, 'fps 测量挂起(rAF 停摆)', 'display off?'); process.exit(2); }
await ev('window._currentGame.gameEnded = true');
await sleep(400);
const fpsStop = await Promise.race([
  evp(`new Promise(res => { let n = 0; const t0 = performance.now();
    const loop = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(loop); else res(Math.round(n / 2)); };
    requestAnimationFrame(loop); })`),
  sleep(6000).then(() => -1),
]);
if (fpsStop === -1) { P(false, 'fps 测量挂起(rAF 停摆)', 'display off?'); process.exit(2); }
P(fpsRun >= 40, '旗摆运行时空闲 fps≥40', fpsRun + 'fps');
P(fpsStop >= 40, '旗摆停止后空闲 fps≥40', fpsStop + 'fps');
P(fpsRun >= fpsStop - 5, '旗摆动画不拖帧(运行与停止差≤5)', `run ${fpsRun} vs stop ${fpsStop}`);
P(jsErrs.length === 0, '全程无 JS 错误', jsErrs.join(' | ') || 'clean');
console.log(fail === 0 ? '=== RACE DEVICE ALL GREEN ===' : `=== RACE DEVICE FAIL x${fail} ===`);
process.exit(fail === 0 ? 0 : 1);
