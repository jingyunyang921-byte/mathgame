// 岛屿地图静态稿截图 + 量尺寸 via 本地 Chrome :9333。用法：node .shots/shot_menu_preview.mjs [页面] [场景:尺寸 ...]
// 例：node .shots/shot_menu_preview.mjs menu-preview.html progress:960x576 fresh:960x576
const PAGE = process.argv[2] || 'menu-preview.html';
const JOBS = process.argv.slice(3);
const CDP = 'http://localhost:9333', BASE = 'http://localhost:8000/';
import fs from 'node:fs';
const ver = await (await fetch(CDP + '/json/version')).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p, s) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (s) msg.sessionId = s;
  return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify(msg)); }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
for (const d of ['Page', 'Runtime', 'Network']) await send(d + '.enable', {}, sessionId);
await send('Network.setCacheDisabled', { cacheDisabled: true }, sessionId);
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true }, sessionId);
  if (r.exceptionDetails) throw new Error('EVAL: ' + ((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text));
  return r.result.value;
};
const KEYS = ['mathgameStars', 'mathgameBest', 'mathgamePace', 'mathgameMaxCompletedLevel', 'mathgameWrongLog', 'mathgameLevelsVer',
  'mathgameRankSeen', 'mathgameSprintBest', 'mathgameDaily'];
const SCEN = {
  fresh: { sel: 1, seed: {} },
  progress: { sel: 3, seed: { mathgameStars: '{"1":3,"2":2}', mathgameMaxCompletedLevel: '2' } },
  allclear: { sel: 6, seed: { mathgameStars: '{"1":3,"2":3,"3":3,"4":3,"5":3,"6":3}', mathgameMaxCompletedLevel: '6',
    mathgameSprintBest: '{"best":17,"t":1760000000000}', __daily: 1 } },
};
const MEASURE = `(() => {
  const r = e => { if (!e) return null; const b = e.getBoundingClientRect(); return { x: +b.left.toFixed(1), y: +b.top.toFixed(1), r: +b.right.toFixed(1), b: +b.bottom.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
  const ms = document.getElementById('menuScreen'), g = document.getElementById('levelGrid');
  const cards = [1,2,3,4,5,6].map(i => { const c = document.getElementById('card' + i); const art = c.querySelector('.isl-art'), pl = c.querySelector('.lv-plank');
    const t = c.querySelector('.lv-title'), s = c.querySelector('.lv-sub');
    return { i, art: r(art), plank: r(pl), clip: !!(t && s && (t.scrollWidth > t.clientWidth + 1 || s.scrollWidth > s.clientWidth + 1)), cls: c.className.replace(/anim-slide|island-card/g, '').trim() }; });
  return { iw: innerWidth, ih: innerHeight, ui: getComputedStyle(document.documentElement).getPropertyValue('--ui').trim(),
    grid: r(g), cta: r(document.querySelector('.cta')), pill: r(document.getElementById('sprintPill')), mode: r(document.querySelector('.mode-wrap')),
    topbar: r(document.querySelector('.topbar')), title: r(document.querySelector('.title-wrap')), badge: r(document.querySelector('.profile-badge')),
    scrollDelta: ms.scrollHeight - ms.clientHeight, brOn: [1,2,3,4,5].map(i => document.getElementById('br' + i).classList.contains('on') ? 1 : 0).join(''),
    brD: (document.querySelector('#br1 path') || {}).getAttribute ? document.querySelector('#br1 path').getAttribute('d') : null, cards };
})()`;
fs.mkdirSync('.shots/out', { recursive: true });
for (const job of JOBS) {
  const [name, dim] = job.split(':'); const [W, H] = dim.split('x').map(Number); const sc = SCEN[name];
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false }, sessionId);
  await send('Page.navigate', { url: 'about:blank' }, sessionId); await sleep(120);
  await send('Page.navigate', { url: BASE + PAGE }, sessionId); await sleep(500);
  await ev(`(() => { for (const k of ${JSON.stringify(KEYS)}) localStorage.removeItem(k);
    const seed = ${JSON.stringify(sc.seed)}; const day = typeof mgDayStr === 'function' ? mgDayStr(new Date()) : '';
    for (const k in seed) { if (k === '__daily') localStorage.setItem('mathgameDaily', JSON.stringify({ last: day, streak: 4, bestStreak: 6 })); else localStorage.setItem(k, seed[k]); }
    localStorage.setItem('mathgameLevelsVer', '2'); localStorage.setItem('mathgameRankSeen', '999'); return 1; })()`);
  await send('Page.reload', {}, sessionId); await sleep(1500);
  await ev(`(() => { selectLevel(${sc.sel}); return 1; })()`); await sleep(900);
  const m = await ev(MEASURE);
  const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  const f = `.shots/out/menu_preview_${name}_${W}x${H}.png`;
  fs.writeFileSync(f, Buffer.from(shot.data, 'base64'));
  console.log('\n== ' + job + ' -> ' + f);
  console.log(JSON.stringify({ ...m, cards: undefined }));
  for (const c of m.cards) console.log('  card' + c.i, 'art', JSON.stringify(c.art), 'plank', JSON.stringify(c.plank), c.clip ? 'CLIPPED' : '', c.cls);
}
await send('Target.closeTarget', { targetId });
ws.close(); process.exit(0);
