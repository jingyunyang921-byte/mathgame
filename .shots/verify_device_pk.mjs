// 比谁快 PK 冒险地图 真机闸门 via :9222（Chrome 91 WebView）。需 App 已启动、已 adb forward。
// 断言：几何在屏内 / 亮点数=比分 / 角色随进度移动 / 返回键可点 / danger 开关 / 无 JS 错误；
// 量空闲与 danger+连续得分时的 rAF 帧率（弱 GPU 守门）并截图。
import { writeFileSync, mkdirSync } from 'fs';
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
const ev = async (expr, ret = true) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: ret, awaitPromise: true, userGesture: true });
  if (r.exceptionDetails) throw new Error('EVAL: ' + ((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text)); return r.result && r.result.value; };
let fails = 0; const ok = (c, n, d = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n + (d ? '  ' + d : '')); if (!c) fails++; };
mkdirSync('.shots/out', { recursive: true });

const MEASURE = `(() => { const q = s => document.querySelector(s); const g = window._currentGame;
  const tr = id => { const m = new DOMMatrix(getComputedStyle(q(id)).transform); return [m.m41, m.m42]; };
  const gates = [...document.querySelectorAll('.prog-block')], pk = q('#pk-section').getBoundingClientRect();
  const bk = q('#exit-btn').getBoundingClientRect(), t = document.elementFromPoint((bk.left + bk.right) / 2, (bk.top + bk.bottom) / 2);
  return { ua: (navigator.userAgent.match(/Chrome\\/[\\d.]+/) || [])[0], iw: innerWidth, ih: innerHeight, scrollH: document.documentElement.scrollHeight,
    disp: getComputedStyle(q('#pk-section')).display, pkH: pk.height, nGates: gates.length,
    gatesIn: (v => v.length === 10 && v.every(b => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.width > 4; }))(gates.filter(b => b.getBoundingClientRect().width > 0)),
    litP: document.querySelectorAll('.prog-block.lit-p').length, litM: document.querySelectorAll('.prog-block.lit-m').length,
    sP: g.playerScore, sM: g.monsterScore, tokP: tr('#pk-tok-p'), tokM: tr('#pk-tok-m'), backHit: !!t && (t.id === 'exit-btn' || !!t.closest('#exit-btn')),
    bad: [...document.querySelectorAll('use')].map(u => u.getAttribute('href')).filter(h => h && !document.querySelector(h)) }; })()`;
const PROG = (p, m) => `(() => { const g = window._currentGame; clearInterval(g.monsterTimer); g.gameEnded = false;
  for (let i = 0; i < ${p}; i++) { g.playerScore++; g._fillDot('p', g.playerScore - 1); }
  for (let i = 0; i < ${m}; i++) { g.monsterScore++; g._fillDot('m', g.monsterScore - 1); } return 1; })()`;
const FPS = ms => `new Promise(res => { let n = 0, t0 = 0; const f = t => { if (!t0) t0 = t; n++; if (t - t0 < ${ms}) requestAnimationFrame(f); else res(Math.round(n / ((t - t0) / 1000) * 10) / 10); }; requestAnimationFrame(f); })`;
for (const [lv, mode] of [[1, 'visual'], [2, 'visual'], [3, 'visual'], [3, 'audio']]) {
  const tag = `L${lv}/${mode}`;
  jsErrs = [];
  await ev(`sessionStorage.setItem('gameLevel','${lv}');sessionStorage.setItem('gameMode','${mode}');location.href='game.html';`, false);
  await sleep(1600);
  await ev(`window._skipOcrLoading && window._skipOcrLoading();`, false);
  await sleep(5200);
  const b = await ev(MEASURE);
  ok(/Chrome\/91\./.test(b.ua), `${tag} WebView Chrome/91`, b.ua);
  ok(b.disp !== 'none' && b.nGates === 20 && b.gatesIn, `${tag} 赛道显示、20 点、全在屏内`, `${b.iw}x${b.ih} pkH=${b.pkH}`);
  ok(b.scrollH <= b.ih + 1, `${tag} 无纵向溢出`, `scrollH=${b.scrollH}`);
  ok(b.backHit, `${tag} 返回键可点`);
  ok(b.bad.length === 0, `${tag} <use> 全解析`, JSON.stringify(b.bad));
  await ev(PROG(5, 3)); await sleep(1000);
  const m = await ev(MEASURE);
  ok(m.litP === m.sP && m.litM === m.sM && m.sP >= 5, `${tag} 亮点数=比分`, `lit=${m.litP}:${m.litM} score=${m.sP}:${m.sM}`);
  ok(m.tokP[0] > b.tokP[0] + 20 && m.tokM[0] > b.tokM[0] + 20, `${tag} 「我」与带路小动物同向沿路前进`, `P ${b.tokP[0].toFixed(0)}->${m.tokP[0].toFixed(0)}  M ${b.tokM[0].toFixed(0)}->${m.tokM[0].toFixed(0)}`);
  await ev('setDangerBorder(true)'); await sleep(300);
  const d1 = await ev(`document.querySelector('#pk-section').classList.contains('danger-mode')`);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`.shots/out/devpk_L${lv}_${mode}.png`, Buffer.from(shot.data, 'base64'));
  await ev('setDangerBorder(false)'); await sleep(300);
  const d0 = await ev(`document.querySelector('#pk-section').classList.contains('danger-mode')`);
  ok(d1 && !d0, `${tag} danger 开/关`);
  if (mode === 'visual' && lv === 1) {
    const idle = await ev(FPS(3000));
    await ev('setDangerBorder(true)');
    await ev(`window.__pkBurst = setInterval(() => { const g = window._currentGame; if (g.playerScore >= 10) { g.playerScore = 0; g.monsterScore = 0; g._buildDots(); } else { g.playerScore++; g._fillDot('p', g.playerScore - 1); } }, 350); 1`);
    const busy = await ev(FPS(3000));
    await ev('clearInterval(window.__pkBurst); setDangerBorder(false); 1');
    await ev(`document.querySelector('#pk-scene').style.display = 'none'; 1`);
    const noScene = await ev(FPS(3000));
    await ev(`document.querySelector('#pk-scene').style.display = ''; 1`);
    console.log(`INFO fps idle=${idle} danger+burst=${busy} sceneHidden=${noScene}`);
    ok(idle >= 40, `${tag} 空闲帧率 ≥40`, String(idle));
    ok(busy >= 30, `${tag} danger+连续得分帧率 ≥30`, String(busy));
  }
  ok(jsErrs.length === 0, `${tag} 无 JS 错误`, jsErrs.join(' | ').slice(0, 200));
}
await ev(`location.href='index.html'`, false);
console.log(fails ? `===== ${fails} FAILURE(S) =====` : '===== 真机 PK 冒险地图 验证全过 =====');
ws.close(); await sleep(150); process.exit(fails ? 1 : 0);
