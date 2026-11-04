// 「今日打卡」大卡（菜单 CTA 下方，原 #sprintPill 小卷轴升级）：本地 Chrome :9333 / 静态服 :8000。
// 守的是：①四种存档态各自的字（没打卡/有纪录/已打卡/已打卡无纪录） ②未打卡才有金光圈+红「!」、已打卡换红 ✓ 章
// ③四个视口下卡片完整在屏内、不挤掉 CTA、不让菜单滚动、文字不被截断 ④reduced-motion 下光圈不动
// ⑤点击仍走 startSprint → mgGoGame（孪生不变量），不夹带错题重练钥匙 ⑥无催促/挽留压力词。
import { mkdirSync, writeFileSync } from 'fs';
const CDP = 'http://localhost:9333';
const info = await (await fetch(CDP + '/json')).json();
const page = info.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || info[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p) => { const id = ++_id; return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify({ id, method: m, params: p || {} })); }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true });
  if (r.exceptionDetails) throw new Error('EVAL: ' + ((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text));
  return r.result.value;
};
await send('Page.enable'); await send('Runtime.enable');
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
mkdirSync('.shots/out', { recursive: true });
let fail = 0, total = 0;
const P = (ok, l, x) => { total++; console.log((ok ? '  PASS ' : '  FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
const MENU = 'http://localhost:8000/menu.html';

const WIPE = `['mathgameSprintBest','mathgameDaily','mathgameDailyChest','mathgameStars','mathgameBest','mathgameMaxCompletedLevel',
  'mathgamePace','mathgameWrongLog','mathgameRankSeen'].forEach(k => localStorage.removeItem(k));
  localStorage.setItem('mathgameLevelsVer','2'); localStorage.setItem('mathgameRankSeen','999'); 1`;
const DAY = `(off => { const d = new Date(); d.setDate(d.getDate() - off); const p = n => (n < 10 ? '0' : '') + n;
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); })`;
// 已打卡 = 今天写过 mathgameDaily；同时写「今天已领宝箱」，免得连签弹窗自动弹出来盖住卡片
const SEED_DONE = (best) => `${best ? `localStorage.setItem('mathgameSprintBest','{"best":${best},"t":1}');` : ''}
  localStorage.setItem('mathgameDaily', JSON.stringify({last:${DAY}(0),streak:4,bestStreak:4}));
  localStorage.setItem('mathgameDailyChest', JSON.stringify({claimed:${DAY}(0)}));`;
async function boot(w, h, seed, reduce) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduce ? 'reduce' : 'no-preference' }] });
  await send('Page.navigate', { url: 'about:blank' }); await sleep(100);
  await send('Page.navigate', { url: MENU }); await sleep(500);
  await ev(WIPE); if (seed) await ev(seed + ';1');
  await send('Page.reload'); await sleep(1500);
  await ev(`window.__errs=[];addEventListener('error',e=>window.__errs.push(String(e.message)));1`);
}
const MEASURE = `(() => {
  const cs = (e, p) => getComputedStyle(e, p || null), r = e => { const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
  const p = document.getElementById('sprintPill'), q = s => p.querySelector(s), t = document.getElementById('sprintPillTitle'), m = document.getElementById('sprintPillMeta');
  const ms = document.getElementById('menuScreen');
  return { done: p.classList.contains('done'), title: t.textContent, meta: m.textContent, go: document.getElementById('sprintPillGo').textContent,
    metaHasEm: !!m.querySelector('em'), text: p.innerText.replace(/\\s+/g, ' ').trim(),
    dot: cs(q('.sp-dot')).display, ring: cs(q('.sp-ring')).display, ringAnim: cs(q('.sp-ring')).animationName,
    bolt: cs(q('.sp-bolt')).display, stamp: cs(q('.sp-stamp')).display, dotHidden: q('.sp-dot').getAttribute('aria-hidden'),
    ringHidden: q('.sp-ring').getAttribute('aria-hidden'), ariaLabel: p.getAttribute('aria-label'),
    rect: r(p), cta: r(document.querySelector('.cta')), iw: innerWidth, ih: innerHeight, ui: cs(document.documentElement).getPropertyValue('--ui').trim(),
    scrollDelta: ms.scrollHeight - ms.clientHeight, cw: ms.clientWidth, clipB: t.scrollWidth > t.clientWidth + 1 || t.getBoundingClientRect().right > p.getBoundingClientRect().right,
    clipM: m.scrollWidth > m.clientWidth + 1 || m.getBoundingClientRect().right > p.getBoundingClientRect().right,
    goR: r(q('.sp-go')), txR: r(q('.sp-tx')), medalR: r(q('.sp-medal')), body: document.body.innerText, errs: window.__errs || [] };
})()`;
const BAD = /中断|可惜|别忘|快来|就要失去|错过|落后/;

// ======== 1. 四种存档态的字 ========
console.log('\n######## 1. 四种存档态 ########');
await boot(1000, 576, null);
let m = await ev(MEASURE);
P(!m.done && m.title === '今日打卡 · 一分钟速算', '没打卡：标题「今日打卡 · 一分钟速算」', m.title);
P(m.meta === '今天可得 5 星币' && m.metaHasEm, '没打卡没存档（累计 0 天 → 第 1 天）：「今天可得 5 星币」且奖品高亮', m.meta);
P(m.go === '去打卡', '没打卡：按钮「去打卡」', m.go);
P(m.dot === 'flex' && m.ring === 'block' && m.ringAnim === 'spRing', '没打卡：红「!」点 + 金光圈（spRing 呼吸）都在', [m.dot, m.ring, m.ringAnim].join('/'));
P(m.bolt !== 'none' && m.stamp === 'none', '没打卡：金章里是闪电、没有红 ✓', [m.bolt, m.stamp].join('/'));
P(m.dotHidden === 'true' && m.ringHidden === 'true' && m.ariaLabel === null, '红点/光圈 aria-hidden，按钮无写死的 aria-label（读屏读的是标题+说明）');
P(/一分钟速算/.test(m.text), '卡里仍写着「一分钟速算」', m.text);
shot0: { const s = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync('.shots/out/checkin_undone_1000x576.png', Buffer.from(s.data, 'base64')); }

await boot(1000, 576, `localStorage.setItem('mathgameSprintBest','{"best":23,"t":1}');
  localStorage.setItem('mathgameDaily', JSON.stringify({last:${DAY}(3),streak:30,bestStreak:30,total:30}))`);
m = await ev(MEASURE);
P(!m.done && m.meta === '今天可得 7 星币 + 红蘑菇' && m.metaHasEm, '没打卡、累计 30 天（断签不清零 → 第 31 天 = 一轮里第 3 天）：「今天可得 7 星币 + 红蘑菇」', m.meta);
P(m.dot === 'flex' && m.go === '去打卡', '没打卡有纪录：红点、「去打卡」仍在');

await boot(1000, 576, SEED_DONE(12));
m = await ev(MEASURE);
P(m.done && m.title === '今日已打卡 · 一分钟速算', '已打卡：标题「今日已打卡 · 一分钟速算」', m.title);
P(m.meta === '最高 12 题 · 再冲一次，破纪录？', '已打卡有纪录：「最高 12 题 · 再冲一次，破纪录？」', m.meta);
P(m.go === '再冲一次', '已打卡：按钮「再冲一次」', m.go);
P(m.dot === 'none' && m.ring === 'none', '已打卡：红点与金光圈都收起', [m.dot, m.ring].join('/'));
P(m.bolt === 'none' && m.stamp === 'flex', '已打卡：金章换红 ✓ 章', [m.bolt, m.stamp].join('/'));
shot1: { const s = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync('.shots/out/checkin_done_1000x576.png', Buffer.from(s.data, 'base64')); }

await boot(1000, 576, SEED_DONE(0));
m = await ev(MEASURE);
P(m.done && m.meta === '再来一局，立个纪录？', '已打卡但没纪录（0 题收场）：「再来一局，立个纪录？」', m.meta);
P(!BAD.test(m.body), '菜单上没有催促/挽留压力词');

// ======== 2. 多视口：完整在屏内、不挤 CTA、不滚动、不截字 ========
console.log('\n######## 2. 多视口布局 ########');
const VPS = [[1000, 576], [960, 552], [900, 500], [1920, 1200], [412, 915], [360, 800], [360, 640]];
for (const [w, h] of VPS) {
  // 360 宽的竖屏本来就装不下整张岛屿地图(菜单自己会滚，与本卡无关)，那两档只守水平不出界+不截字，不要求不滚动
  const tiny = w === 360;
  for (const [name, seed] of [['undone', `localStorage.setItem('mathgameSprintBest','{"best":123,"t":1}')`], ['done', SEED_DONE(123)]]) {
    await boot(w, h, seed);
    m = await ev(MEASURE);
    const T = `[${w}x${h} ${name}] `, a = m.rect, c = m.cta;
    P(a.x >= 6 && a.r <= m.iw - 6, T + '卡片左右各留 ≥6px', [a.x, a.r].map(Math.round).join(','));
    P(Math.abs((a.x + a.r) / 2 - m.cw / 2) <= 2, T + '居中（相对菜单可视宽，滚动条不算）', `cx=${Math.round((a.x + a.r) / 2)} cw=${m.cw}`);
    P(a.y >= c.b - 1, T + '卡在 CTA 下方', `cta.b=${Math.round(c.b)} card.y=${Math.round(a.y)}`);
    if (!tiny) {
      P(a.y >= 0 && a.b <= m.ih && c.b <= m.ih, T + '卡片与 CTA 完整在屏内', `card.b=${Math.round(a.b)} ih=${m.ih}`);
      P(m.scrollDelta <= 1, T + '菜单不滚动', String(m.scrollDelta));
    }
    P(!m.clipB && !m.clipM, T + '标题/说明没被截断', `clipB=${m.clipB} clipM=${m.clipM}`);
    P(a.h >= 38, T + '卡片够高好点（≥38px），比旧卷轴显眼', a.h.toFixed(1));
    P(m.goR.r <= a.r + 0.5 && m.txR.r <= m.goR.x + 0.5, T + '按钮在卡内、不压住文字', `go.x=${Math.round(m.goR.x)} tx.r=${Math.round(m.txR.r)}`);
    P(m.errs.length === 0, T + '无 JS 错误', JSON.stringify(m.errs));
    if (name === 'undone' && (w === 412 || w === 900)) {
      const s = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`.shots/out/checkin_${name}_${w}x${h}.png`, Buffer.from(s.data, 'base64'));
    }
    if (w === 360 && h === 800) {
      const s = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`.shots/out/checkin_${name}_${w}x${h}.png`, Buffer.from(s.data, 'base64'));
    }
  }
}

// ======== 3. reduced-motion ========
console.log('\n######## 3. reduced-motion ########');
await boot(1000, 576, null, true);
m = await ev(MEASURE);
P(m.ringAnim === 'none' && m.dot === 'flex', '减少动态：光圈不再呼吸，但红点光圈仍显示', [m.ringAnim, m.dot].join('/'));

// ======== 4. 点击：只走 startSprint → mgGoGame ========
console.log('\n######## 4. 点击带的东西 ########');
await boot(1000, 576, null);
const h = await ev(`(() => { const old = mgGoGame; let jumped = 0; mgGoGame = () => { jumped++; };
  setMode('audio'); sessionStorage.removeItem('mgSprint'); sessionStorage.setItem('mgPractice', 'x'); sessionStorage.removeItem('mgPractice');
  try { document.getElementById('sprintPill').click(); } finally { mgGoGame = old; }
  return { jumped, sprint: sessionStorage.getItem('mgSprint'), lv: sessionStorage.getItem('gameLevel'),
    mode: sessionStorage.getItem('gameMode'), practice: sessionStorage.getItem('mgPractice') }; })()`);
P(h.jumped === 1 && h.sprint === '1' && h.lv === '0' && h.mode === 'audio' && h.practice === null,
  '点卡片 → mgGoGame 恰好一次，带 mgSprint=1/gameLevel=0/当前模式，不夹带错题重练钥匙', JSON.stringify(h));

await send('Emulation.setEmulatedMedia', { features: [] });
console.log('\n===== ' + (fail === 0 ? 'ALL PASS' : fail + ' FAILURE(S)') + ' (' + total + ' checks) =====');
ws.close(); process.exit(fail === 0 ? 0 : 1);
