// 岛屿地图菜单版面闸门 via 本地 Chrome :9333 + 静态服 :8000（node .shots/verify_menu_map.mjs [页面]）。
// 在 6 个视口 × 通关数 0/3/6 下量：节点不出带/不叠/名牌不截/触控够大、锁定=雾+锁、桥段亮灭、选中旗、
// CTA 与任务条在屏内、完成印章、减少动画下新动画全停、禁用语法/悬空 <use>/箱影动画扫描。
import fs from 'node:fs';
const PAGE = process.argv[2] || 'menu.html';
const CDP = 'http://localhost:9333', URL = 'http://localhost:8000/' + PAGE;
const ver = await (await fetch(CDP + '/json/version')).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map(); let jsErrs = 0;
ws.onmessage = e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
  else if (m.method === 'Runtime.exceptionThrown') jsErrs++; };
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
const VIEWPORTS = [[960, 576], [960, 552], [1000, 576], [1280, 800], [800, 480], [390, 844]];
const COUNTS = [0, 3, 6];
const seedFor = n => {
  const s = {}; if (n > 0) { const st = {}; for (let i = 1; i <= n; i++) st[i] = 3; s.mathgameStars = JSON.stringify(st); s.mathgameMaxCompletedLevel = String(n); }
  if (n === 6) { s.mathgameSprintBest = '{"best":17,"t":1760000000000}'; s.__daily = 1; }
  return s;
};
async function load(w, h, n, reduce) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false }, sessionId);
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduce ? 'reduce' : 'no-preference' }] }, sessionId);
  await send('Page.navigate', { url: 'about:blank' }, sessionId); await sleep(120);
  await send('Page.navigate', { url: URL }, sessionId); await sleep(500);
  await ev(`(() => { for (const k of ${JSON.stringify(KEYS)}) localStorage.removeItem(k);
    const seed = ${JSON.stringify(seedFor(n))}; const day = mgDayStr(new Date());
    for (const k in seed) { if (k === '__daily') localStorage.setItem('mathgameDaily', JSON.stringify({ last: day, streak: 4, bestStreak: 6 })); else localStorage.setItem(k, seed[k]); }
    localStorage.setItem('mathgameLevelsVer', '2'); localStorage.setItem('mathgameRankSeen', '999'); return 1; })()`);
  await send('Page.reload', {}, sessionId); await sleep(1600);
  await ev(`(() => { selectLevel(${Math.min(n + 1, 6)}); return 1; })()`); await sleep(1000);
}
const MEASURE = `(() => {
  const R = e => { if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
  const ms = document.getElementById('menuScreen'), cs = (e, p) => getComputedStyle(e, p || null);
  const cards = [1,2,3,4,5,6].map(i => { const c = document.getElementById('card' + i);
    const t = c.querySelector('.lv-title'), s = c.querySelector('.lv-sub'), md = c.querySelector('.medallion');
    return { i, rect: R(c), art: R(c.querySelector('.isl-art')), plank: R(c.querySelector('.lv-plank')), locked: c.classList.contains('locked'),
      selected: c.classList.contains('selected'), clip: !!(t && s && (t.scrollWidth > t.clientWidth + 1 || s.scrollWidth > s.clientWidth + 1)),
      fx: cs(c.querySelector('.isl-fx')).display, lock: cs(c.querySelector('.ic-lock')).display, op: cs(c.querySelector('.ic-op')).display,
      flag: cs(md, '::after').display, flagAnim: cs(md, '::after').animationName, halo: cs(c, '::before').content, haloAnim: cs(c, '::before').animationName,
      stars: c.querySelectorAll('.star.on').length }; });
  const br = [1,2,3,4,5].map(i => { const g = document.getElementById('br' + i), p = g && g.querySelector('path');
    return { i, on: !!g && g.classList.contains('on'), d: p ? p.getAttribute('d') : null }; });
  const pill = document.getElementById('sprintPill'), stamp = pill.querySelector('.sp-stamp');
  const dangling = []; document.querySelectorAll('use').forEach(u => { const h = u.getAttribute('href') || u.getAttribute('xlink:href') || '';
    if (h.charAt(0) !== '#' || !document.getElementById(h.slice(1))) dangling.push(h); });
  const css = Array.from(document.querySelectorAll('style')).map(s => s.textContent).join('\\n');
  const banned = css.match(/paint-order|:has\\(|@layer|color-mix\\(|oklch\\(|\\d[dsl]vh|mix-blend-mode/g) || [];
  const kfBad = [], kfNote = []; for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules; } catch (e) { continue; }
    for (const r of rules) if (r.type === 7) { const props = new Set(); for (const f of r.cssRules) for (let k = 0; k < f.style.length; k++) props.add(f.style[k]);
      if (props.has('box-shadow')) kfBad.push(r.name); const other = [...props].filter(p => p !== 'transform' && p !== 'opacity'); if (other.length) kfNote.push(r.name + ':' + other.join('/')); } }
  const animating = []; document.querySelectorAll('body *').forEach(e => { for (const p of [null, '::before', '::after']) {
    const n = cs(e, p).animationName; if (n && n !== 'none') animating.push((e.id ? '#' + e.id : e.tagName.toLowerCase() + '.' + String(e.getAttribute('class') || '').split(' ')[0]) + (p || '') + '=' + n); } });
  const filtAnc = el => { for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) if (cs(a).filter !== 'none') return true; return false; };
  const animFilter = []; document.querySelectorAll('body *').forEach(e => { for (const p of [null, '::before', '::after']) { const c = cs(e, p);
    if (c.animationName !== 'none' && c.display !== 'none' && (c.filter !== 'none' || filtAnc(e))) animFilter.push((e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className || e.tagName) + (p || '')); } });
  const wrap = document.querySelector('.cta-wrap');
  return { iw: innerWidth, ih: innerHeight, ui: cs(document.documentElement).getPropertyValue('--ui').trim(), grid: R(document.getElementById('levelGrid')),
    cta: R(document.querySelector('.cta')), pillR: R(pill), wrap: R(wrap), title: R(document.querySelector('.title-wrap')), mode: R(document.querySelector('.mode-wrap')),
    scrollDelta: ms.scrollHeight - ms.clientHeight, cards, br, pillDone: pill.classList.contains('done'), stamp: stamp ? cs(stamp).display : 'MISSING',
    dangling, banned, kfBad, kfNote, animating, animFilter, selCount: document.querySelectorAll('.island-card.selected').length };
})()`;
let fail = 0, total = 0;
const P = (ok, l, x) => { total++; if (!ok) { fail++; console.log('FAIL ' + l + (x != null ? '  ' + x : '')); } };
const fmt = r => r ? [r.x, r.y, r.r, r.b].map(v => Math.round(v)).join(',') : 'null';
function check(tag, m, n, wide) {
  const un = Math.min(n + 1, 6), T = s => tag + ' ' + s;
  P(m.cards.length === 6, T('6 cards'), m.cards.length);
  const topMin = Math.max(m.title.b, m.mode.b) - 4;
  for (const c of m.cards) {
    const k = T('card' + c.i), a = c.rect;
    P(a.x >= 0 && a.r <= m.iw && a.y >= 0 && a.b <= m.ih, k + ' inside viewport', fmt(a));
    P(a.x >= m.grid.x - 8 && a.r <= m.grid.r + 8, k + ' inside grid band', fmt(a) + ' grid ' + fmt(m.grid));
    P(a.y >= topMin && a.b <= m.cta.y + 1, k + ' between header and CTA', fmt(a) + ' top>=' + Math.round(topMin) + ' cta.y=' + Math.round(m.cta.y));
    P(!c.clip, k + ' plank text not clipped');
    P(a.w >= 44 && a.h >= 44, k + ' touch target >=44', Math.round(a.w) + 'x' + Math.round(a.h));
    const lk = false;   // 没有通关解锁：六关一开始全部开放，锁/雾/锁图标永不出现
    P(c.locked === lk, k + ' locked class', c.locked);
    P((c.fx !== 'none') === lk, k + ' fog/chain visible iff locked', c.fx);
    P((c.lock !== 'none') === lk, k + ' lock icon visible iff locked', c.lock);
    P((c.op === 'none') === lk, k + ' operator glyph hidden iff locked', c.op);
    P(c.selected === (c.i === un), k + ' selected iff highest unlocked', c.selected);
    if (c.selected) { P(c.flag === 'block', k + ' flag shown'); P(c.halo !== 'none' && c.halo !== 'normal', k + ' halo present', c.halo); }
    else P(c.flag === 'none', k + ' no flag when unselected', c.flag);
    if (!lk) P(c.stars === (c.i <= n ? 3 : 0), k + ' stars', c.stars);
  }
  for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) { const a = m.cards[i].rect, b = m.cards[j].rect;
    const ox = Math.min(a.r, b.r) - Math.max(a.x, b.x), oy = Math.min(a.b, b.b) - Math.max(a.y, b.y);
    P(!(ox > 1 && oy > 1), T('card' + (i + 1) + ' vs card' + (j + 1) + ' no overlap'), fmt(a) + ' | ' + fmt(b)); }
  if (wide) P(m.cards[5].rect.r <= m.iw - 56, T('card6 right <= iw-56 (AI ball zone)'), Math.round(m.cards[5].rect.r) + ' iw=' + m.iw);
  for (const b of m.br) {
    P(b.on === true, T('bridge' + b.i + ' lit (all levels open)'), b.on);
    P(!!b.d && !/NaN/.test(b.d) && /^M/.test(b.d), T('bridge' + b.i + ' path d valid'), String(b.d).slice(0, 60));
  }
  P(m.selCount === 1, T('exactly one selected'), m.selCount);
  P(m.cta.x >= 0 && m.cta.r <= m.iw && m.cta.y >= 0 && m.cta.b <= m.ih, T('CTA inside viewport'), fmt(m.cta));
  P(m.pillR.x >= 0 && m.pillR.r <= m.iw && m.pillR.y >= m.cta.b - 1 && m.pillR.b <= m.ih, T('task scroll below CTA and inside viewport'), fmt(m.pillR) + ' cta ' + fmt(m.cta));
  P(Math.abs((m.pillR.x + m.pillR.r) / 2 - (m.wrap.x + m.wrap.r) / 2) <= 2, T('task scroll centred in cta-wrap'));
  P(m.scrollDelta <= 1, T('menuScreen no overflow'), m.scrollDelta);
  P(m.pillDone === (n === 6), T('daily done flag'), m.pillDone);
  P((m.stamp === 'flex') === (n === 6), T('stamp visible iff done'), m.stamp);
  P(!m.dangling.length, T('all <use> resolve'), JSON.stringify(m.dangling));
  P(!m.banned.length, T('no banned CSS tokens'), JSON.stringify(m.banned));
  P(!m.kfBad.length, T('no keyframe animates box-shadow'), JSON.stringify(m.kfBad));
  P(!m.animFilter.length, T('no CSS filter on an animated element (re-filters every frame on the weak GPU)'), JSON.stringify(m.animFilter));
}
let noted = false;
for (const [w, h] of VIEWPORTS) {
  for (const n of COUNTS) {
    const tag = '[' + w + 'x' + h + ' done=' + n + ']';
    await load(w, h, n, false);
    const m = await ev(MEASURE);
    if (!noted) { noted = true; console.log('NOTE keyframes animating props beyond transform/opacity: ' + (m.kfNote.join(', ') || 'none')); }
    check(tag, m, n, w >= 700);
    const an = m.animating.join(' ');
    P(/haloBreath/.test(an) && /flagWave/.test(an) && /twinkle/.test(an), tag + ' new animations are live without reduce-motion', an.slice(0, 160));
    console.log(tag + ' ui=' + m.ui + ' grid=' + fmt(m.grid) + ' cta.y=' + Math.round(m.cta.y) + ' scrollDelta=' + m.scrollDelta + ' animating=' + m.animating.length);
  }
  await load(w, h, 3, true);
  const r = await ev(MEASURE);
  P(r.animating.length === 0, '[' + w + 'x' + h + ' reduce-motion] every animation stopped', r.animating.slice(0, 6).join(' '));
  P(r.cards.every(c => c.rect.x >= 0 && c.rect.r <= r.iw), '[' + w + 'x' + h + ' reduce-motion] cards still laid out');
}
P(jsErrs === 0, 'no JS exceptions', jsErrs);
console.log('\n===== ' + (fail === 0 ? 'ALL PASS' : fail + ' FAILURE(S)') + ' (' + total + ' checks) =====');
await send('Target.closeTarget', { targetId }); ws.close(); process.exit(fail === 0 ? 0 : 1);
