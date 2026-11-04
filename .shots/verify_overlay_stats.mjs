// 一期 P1-a/P1-b：结算卡「本局星星 + 数据条」五引擎全矩阵验证 via 本地 Chrome :9333。
// 对账思路：给 mgFinishRound 挂一层代理拿到真实快照(window.__snap)，再拿渲染出来的 DOM 与快照
// 逐项核对 —— 断言的是「渲染 == 结算」，而不是把期望值在脚本里抄第二遍(抄错了两边一起错)；
// 快照自身的 stars/acc 另外对着独立算的期望值核一遍，两头都不放过。
// 「播放一局」不用真答题：顶层 let 计数器(_mgWrong/_mgCorrect/_mgMaxStreak/_mgRoundStart)可从
// Runtime.evaluate 直接赋值，seed + debugEndGame 放在同一个表达式里是原子的，不给引擎定时器插队。
// 视口 1000x576 = 真机 CSS 尺寸，顺带盯新插的两行会不会把结算卡顶出屏幕(P3-14 的老伤)。
import { writeFileSync, mkdirSync } from 'fs';
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
  if (r.exceptionDetails) throw new Error('EVAL: ' + (r.exceptionDetails.exception || {}).description);
  return r.result.value;
};
await send('Page.enable'); await send('Runtime.enable');
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });  // 新脚本一律禁缓存
await send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 576, deviceScaleFactor: 1, mobile: false });
mkdirSync('.shots/out', { recursive: true });

let fail = 0; const P = (ok, l, x) => { console.log((ok ? '  PASS ' : '  FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
const base = 'http://localhost:8000/index.html';

const CASES = [
  { lv: 1, mode: 'visual', total: 10, name: 'L1 (Game 10以内)', gType: 'Game' },
  { lv: 2, mode: 'visual', total: 10, name: 'L2 (Game 20以内)', gType: 'Game' },
  { lv: 3, mode: 'audio',  total: 10, name: 'L3 (VoiceGame)',  gType: 'VoiceGame' },
  { lv: 4, mode: 'audio',  total: 10, name: 'L4 (RaceGame)',   gType: 'RaceGame' },
  { lv: 5, mode: 'visual', total: 10, name: 'L5 (SpaceGame)',  gType: 'SpaceGame' },
  { lv: 6, mode: 'audio',  total: 20, name: 'L6 (BattleGame)', gType: 'BattleGame' },
];
// wrong 取 0 / 20% / 50%，正好打穿 mgComputeStars 的 3 / 2 / 1 三档（L5 total=20 也按比例走）。
const SCEN = t => ([
  { key: '3star', win: true,  wrong: 0,                   correct: t, streak: t, sec: 7,  best: null },
  { key: '2star', win: true,  wrong: Math.round(t * 0.2), correct: t, streak: 4, sec: 12, best: null },
  { key: '1star', win: true,  wrong: Math.round(t * 0.5), correct: t, streak: 2, sec: 30, best: null },
  { key: 'rec',   win: true,  wrong: 0,                   correct: t, streak: 8, sec: 9,  best: { t: 99, s: 2 } },
  { key: 'lose',  win: false, wrong: 3,                   correct: 4, streak: 2, sec: 15, best: null },
]);
const expStars = (win, wrong, total) => !win ? 0 : (wrong > 0 ? ((wrong / total) <= 0.2 ? 2 : 1) : 3);

const PROBE = `(() => {
  const g = id => document.getElementById(id);
  const cs = el => el ? getComputedStyle(el).display : '(no el)';
  const starsEl = g('overlay-stars'), statsEl = g('overlay-stats'), oc = g('overlay-content');
  const stars = [...(starsEl ? starsEl.children : [])].map(s => {
    const u = s.querySelector('use');
    return { on: s.classList.contains('on'), pop: s.classList.contains('pop'),
             href: u ? u.getAttribute('href') : null,
             w: Math.round(s.getBoundingClientRect().width) };
  });
  const chips = [...(statsEl ? statsEl.querySelectorAll('.ov-chip') : [])].map(c => {
    const u = c.querySelector('use'), tg = c.querySelector('.rec-tag');
    return { text: c.textContent, rec: c.classList.contains('rec'),
             icon: u ? u.getAttribute('href') : null, tag: tg ? tg.textContent : null };
  });
  const r = oc ? oc.getBoundingClientRect() : null;
  return {
    snap: window.__snap || null,
    shown: !!g('overlay') && g('overlay').classList.contains('show'),
    starsDisplay: cs(starsEl), statsDisplay: cs(statsEl),
    starsAria: starsEl ? starsEl.getAttribute('aria-label') : null,
    starsRole: starsEl ? starsEl.getAttribute('role') : null,
    stars, chips,
    kids: oc ? [...oc.children].map(e => e.id || e.tagName) : [],
    cardTop: r ? Math.round(r.top) : null, cardBottom: r ? Math.round(r.bottom) : null, vh: window.innerHeight,
    dangling: [...document.querySelectorAll('use')].map(u => u.getAttribute('href')).filter(h => h && !document.querySelector(h)),
    gType: window._currentGame ? window._currentGame.constructor.name : null,
    errs: window.__errs || []
  };
})()`;

const seedAndEnd = (sc, lv) => `(() => {
  window.__errs = [];
  if (!window.__snapPatched) {
    const o = window.mgFinishRound;
    window.mgFinishRound = function () { const r = o.apply(this, arguments); window.__snap = r; return r; };
    window.__snapPatched = 1;
  }
  window.__snap = null;
  try { ${sc.best ? `localStorage.setItem('mathgameBest', JSON.stringify({ "${lv}": ${JSON.stringify(sc.best)} }));`
                  : `localStorage.removeItem('mathgameBest');`} } catch (e) {}
  _mgWrong = ${sc.wrong}; _mgCorrect = ${sc.correct}; _mgStreak = 0; _mgMaxStreak = ${sc.streak};
  _mgRoundStart = Date.now() - ${sc.sec * 1000};
  debugEndGame(${sc.win});
  return true;
})()`;

for (const c of CASES) {
  console.log('\n######## ' + c.name + ' ########');
  await send('Page.navigate', { url: base }); await sleep(400);
  await ev(`sessionStorage.setItem('gameLevel','${c.lv}');sessionStorage.setItem('gameMode','${c.mode}');`
         + `localStorage.removeItem('mathgameBest');localStorage.removeItem('mathgameStars');`);
  await send('Page.reload'); await sleep(900);
  await ev(`window.__errs=[];addEventListener('error',e=>window.__errs.push(String(e.message)));`);
  await ev(`window._skipOcrLoading && window._skipOcrLoading();`);
  let ready = false;
  for (let i = 0; i < 30; i++) { if (await ev(`!!window._currentGame`)) { ready = true; break; } await sleep(400); }
  P(ready, '引擎已构造(轮询)', String(ready));
  if (!ready) continue;
  await sleep(400);

  for (const sc of SCEN(c.total)) {
    console.log('\n--- ' + c.name + ' / ' + sc.key + ' ---');
    await ev(seedAndEnd(sc, c.lv));
    await sleep(800);                                  // 等三颗星 stagger(0/160/320ms) + pop 动画跑完
    const r = await ev(PROBE);
    const s = r.snap || {};
    const es = expStars(sc.win, sc.wrong, c.total);
    const tries = sc.correct + sc.wrong;
    const acc = Math.round(sc.correct * 100 / tries);

    P(r.shown, 'overlay 显示', r.gType + ' / ' + (r.gType === c.gType ? '引擎符合' : '引擎不符 期望' + c.gType));
    P(r.gType === c.gType, '引擎类正确', r.gType);
    P(!!r.snap, 'mgFinishRound 返回了快照', JSON.stringify(s));
    P(s.stars === es, '快照 stars', s.stars + ' / 期望 ' + es);
    P(s.tries === tries && s.acc === acc, '快照 tries/acc', s.tries + '次 ' + s.acc + '% / 期望 ' + tries + '次 ' + acc + '%');
    P(s.sec === sc.sec, '快照 sec', s.sec + ' / 期望 ' + sc.sec);
    P(s.maxStreak === sc.streak, '快照 maxStreak', s.maxStreak + ' / 期望 ' + sc.streak);
    P(s.newBestTime === !!sc.best && s.newBestStreak === !!sc.best,
      '快照 破纪录标记', s.newBestTime + '/' + s.newBestStreak + ' 期望 ' + !!sc.best);

    if (es > 0) {
      P(r.starsDisplay === 'flex', '星星区显示', r.starsDisplay);
      P(r.stars.length === 3, '永远 3 个星位', String(r.stars.length));
      P(r.stars.filter(x => x.on).length === s.stars, '点亮数 == 快照 stars', r.stars.map(x => x.on ? '★' : '☆').join(''));
      P(r.stars.every(x => x.href === '#i-star'), 'use 指向 #i-star', JSON.stringify(r.stars.map(x => x.href)));
      P(r.stars.every(x => x.w >= 20), '星星有尺寸(非 0)', JSON.stringify(r.stars.map(x => x.w)));
      P(r.starsAria === '本局 ' + s.stars + ' / 3 星' && r.starsRole === 'img', 'aria 可读', r.starsRole + ' | ' + r.starsAria);
    } else {
      P(r.starsDisplay === 'none', '失败局星星区隐藏(不给 0 分视觉)', r.starsDisplay);
      P(r.stars.length === 0, '星星节点已清空', String(r.stars.length));
      P(r.starsAria === null && r.starsRole === null, '上一局 aria-label 未残留', r.starsRole + ' | ' + r.starsAria);
    }

    const want = [];
    if (s.tries > 0) want.push({ t: '正确率 ' + s.acc + '%', icon: null, rec: false });
    if (s.sec > 0) want.push({ t: s.sec + ' 秒', icon: '#i-timer', rec: s.newBestTime });
    if (s.maxStreak > 1) want.push({ t: '连对 ' + s.maxStreak, icon: '#i-flame', rec: s.newBestStreak });
    P(r.statsDisplay === 'flex', '数据条显示', r.statsDisplay);
    P(r.chips.length === want.length, 'chip 数量', r.chips.length + ' / ' + want.length);
    want.forEach((w, i) => {
      const ch = r.chips[i] || {};
      const bare = (ch.text || '').replace('新纪录', '');
      P(bare === w.t, 'chip#' + i + ' 文案 == 快照', JSON.stringify(ch.text) + ' / 期望 ' + JSON.stringify(w.t));
      P((ch.icon || null) === w.icon, 'chip#' + i + ' 图标', String(ch.icon));
      P(!!ch.rec === w.rec && (w.rec ? ch.tag === '新纪录' : ch.tag === null), 'chip#' + i + ' 新纪录态', ch.rec + ' | ' + ch.tag);
    });

    const ki = r.kids.indexOf('overlay-title'), ks = r.kids.indexOf('overlay-stars');
    const kt = r.kids.indexOf('overlay-stats'), km = r.kids.indexOf('overlay-msg');
    P(ki >= 0 && ki < ks && ks < kt && kt < km, 'DOM 顺序 标题<星星<数据条<文案', r.kids.join(','));
    P(r.cardTop >= 0 && r.cardBottom <= r.vh, '结算卡在 576 高内不溢出', r.cardTop + '→' + r.cardBottom + ' / ' + r.vh);
    P(r.dangling.length === 0, '无悬空 <use>', JSON.stringify(r.dangling));
    P(r.errs.length === 0, '无 JS 错误', JSON.stringify(r.errs));

    if (sc.key === '3star' || (c.lv === 1 && sc.key === 'lose')) {
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const f = '.shots/out/overlay_L' + c.lv + (sc.key === 'lose' ? '_lose' : '') + '.png';
      writeFileSync(f, Buffer.from(shot.data, 'base64'));
      console.log('  shot → ' + f);
    }

    // 「再来一局」原地重开，进下一个场景（不整页 reload，省一轮 intro + OCR 等待）
    await ev(`document.getElementById('retry-btn').click();`); await sleep(700);
    for (let i = 0; i < 20; i++) { if (!(await ev(`document.getElementById('overlay').classList.contains('show')`))) break; await sleep(300); }
    await ev(`window._skipOcrLoading && window._skipOcrLoading();`);
    for (let i = 0; i < 25; i++) { if (await ev(`!!window._currentGame`)) break; await sleep(300); }
  }
}
console.log('\n' + (fail === 0 ? '=== OVERLAY STATS PASS ===' : '=== ' + fail + ' FAIL ==='));
ws.close(); process.exit(fail ? 1 : 0);
