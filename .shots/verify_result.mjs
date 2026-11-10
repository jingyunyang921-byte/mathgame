// 结算卡（胜/负）去 AI 化 + 悬浮麦克风遮挡「休息一下」修复 —— 本地 Chrome :9333 全矩阵验证。
// 覆盖 5 个引擎（六关编号）：L1/L2 Game / L3audio VoiceGame / L4 RaceGame / L5 SpaceGame / L6 BattleGame。
// 视口强制 1000x576（= 真机 CSS 尺寸），顺带验证矮横屏下整卡不溢出。
import { writeFileSync } from 'fs';
const CDP = 'http://localhost:9333';
const info = await (await fetch(CDP + '/json')).json();
const page = info.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || info[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p) => { const id = ++_id; return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify({ id, method: m, params: p || {} })); }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true })).result.value;
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 576, deviceScaleFactor: 1, mobile: false });

let fail = 0; const P = (ok, l, x) => { console.log((ok ? '  PASS ' : '  FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
const base = 'http://localhost:8000/index.html';

// 采样结算卡状态。emoji 正则含符号区(❤✨⭐)、旗/杂项、变体选择符。
const PROBE = `(() => {
  const EMOJI = /[\\u{1F300}-\\u{1FAFF}\\u{1F000}-\\u{1F2FF}\\u{2600}-\\u{27BF}\\u{2B00}-\\u{2BFF}\\u{FE0F}\\u{2190}-\\u{21FF}]/u;
  const g = id => document.getElementById(id);
  const txt = id => (g(id) ? g(id).textContent : '');
  const ov = g('overlay'), oc = g('overlay-content');
  const medalNode = !!(document.getElementById('overlay-emoji') || document.querySelector('.result-medal'));
  const btns = g('overlay-btns'), nb = g('next-level-btn'), rb = g('retry-btn'), hb = g('exit-btn');
  const homeGone = !g('home-btn');
  const fv = g('float-voice-overlay');
  const r = oc ? oc.getBoundingClientRect() : null;
  const hbr = hb ? hb.getBoundingClientRect() : null;
  let hit = null, hitOk = false;
  if (hbr && hbr.width) {
    const el = document.elementFromPoint(hbr.left + hbr.width / 2, hbr.top + hbr.height / 2);
    hit = el ? (el.id || el.tagName + '.' + el.className) : null;
    hitOk = !!el && (el === hb || hb.contains(el));
  }
  const all = [txt('overlay-title'), txt('overlay-msg'), txt('overlay-sub'), txt('next-level-btn'), txt('retry-btn')].join(' | ');
  const dangling = [...document.querySelectorAll('use')].map(u => u.getAttribute('href')).filter(h => h && !document.querySelector(h));
  return {
    shown: !!ov && ov.classList.contains('show'),
    title: txt('overlay-title'), titleCls: g('overlay-title') ? g('overlay-title').className : null,
    medalNode,
    allText: all, emoji: (all.match(EMOJI) || [])[0] || null,
    nextShown: !!nb && getComputedStyle(nb).display !== 'none',
    nextText: txt('next-level-btn'),
    hasNextCls: !!btns && btns.classList.contains('has-next'),
    retryBg: rb ? getComputedStyle(rb).backgroundColor : null,
    retryGrad: rb ? (getComputedStyle(rb).backgroundImage || '').slice(0, 24) : null,
    cardTop: r ? Math.round(r.top) : null, cardBottom: r ? Math.round(r.bottom) : null,
    vh: window.innerHeight,
    micDisplay: fv ? getComputedStyle(fv).display : '(none el)',
    homeHit: hit, homeHitOk: hitOk, homeGone,
    dangling, gType: window._currentGame ? window._currentGame.constructor.name : null,
    errs: window.__errs || []
  };
})()`;

const WIN_TITLE = ['', '第1关通关！', '第2关通关！', '第3关通关！', '第4关通关！', '第5关通关！', '第6关通关！'];
const CASES = [
  { lv: 1, mode: 'visual', name: 'L1 10以内 (Game)',            next: 2 },
  { lv: 1, mode: 'audio',  name: 'L1 听算 (Game+Mixin)',        next: 2, mic: true },
  { lv: 2, mode: 'audio',  name: 'L2 20以内听算 (Game+Mixin)',  next: 3, mic: true },
  { lv: 3, mode: 'audio',  name: 'L3 听算 (VoiceGame)',         next: 4, suffix: true },
  { lv: 4, mode: 'audio',  name: 'L4 赛跑听算 (RaceGame)',      next: 5, mic: true },
  { lv: 5, mode: 'visual', name: 'L5 太空 (SpaceGame)',         next: 6 },
  { lv: 6, mode: 'audio',  name: 'L6 巅峰听算 (BattleGame)',    next: 0, mic: true },
];


for (const c of CASES) {
  for (const win of [true, false]) {
    console.log('\n=== ' + c.name + ' | ' + (win ? 'WIN' : 'LOSE') + ' ===');
    await send('Page.navigate', { url: base }); await sleep(400);
    await ev(`window.__errs=[];addEventListener('error',e=>window.__errs.push(String(e.message)));` +
      `sessionStorage.setItem('gameLevel','${c.lv}');sessionStorage.setItem('gameMode','${c.mode}');`);
    await send('Page.reload'); await sleep(900);
    await ev(`window.__errs=[];addEventListener('error',e=>window.__errs.push(String(e.message)));`);
    await ev(`window._skipOcrLoading && window._skipOcrLoading();`);
    // 引擎在 runIntroSequence 之后才构造（本地约 3s），轮询等它出现，别用固定 sleep
    let ready = false;
    for (let i = 0; i < 30; i++) { if (await ev(`!!window._currentGame`)) { ready = true; break; } await sleep(400); }
    P(ready, '引擎已构造(轮询)', String(ready));
    await sleep(400);
    await ev(`debugEndGame(${win});`); await sleep(600);
    // 通关后先弹全屏宝箱舞台(#cs-stage)盖住结算卡；本脚本验的是结算卡本身，先把舞台收掉再采样
    if (win) { await ev(`typeof mgClaimPending==='function' && mgClaimPending();`); await sleep(500); }
    const r = await ev(PROBE);
    P(r.shown, 'overlay 显示', r.title + ' [' + r.titleCls + ']');
    P(r.gType !== null, '引擎类', r.gType);
    P(!r.medalNode, '结算卡不再挂皇冠/重试奖章', String(r.medalNode));
    P(win ? r.title === WIN_TITLE[c.lv] : /这次没赢|再试一次/.test(r.title), win ? '胜利标题按关卡讲材料「' + WIN_TITLE[c.lv] + '」' : '失败标题', r.title);
    P(r.titleCls === (win ? 'win' : 'lose'), '标题 class', r.titleCls);
    P(r.emoji === null, '结算文案无系统 emoji', r.emoji ? 'found ' + r.emoji + ' in: ' + r.allText : r.allText);
    const wantNext = win && c.next > 0;
    P(r.nextShown === wantNext, '下一关按钮 ' + (wantNext ? '显示' : '隐藏'), String(r.nextShown));
    P(r.hasNextCls === wantNext, 'has-next 层级 class', String(r.hasNextCls));
    if (wantNext) {
      P(/挑战第\d+关/.test(r.nextText), '下一关文案', r.nextText);
      P(r.retryBg === 'rgb(255, 246, 234)', '再来一局降为次级(奶油)', r.retryBg);
      if (c.suffix) P(/· 听算/.test(r.nextText), '听算后缀保留', r.nextText);
    } else {
      P(/linear-gradient/.test(r.retryGrad || ''), '再来一局仍是主 CTA(橙渐变)', r.retryGrad);
    }
    P(r.cardTop >= 0 && r.cardBottom <= r.vh, '结算卡在 576 高内不溢出', r.cardTop + '→' + r.cardBottom + ' / ' + r.vh);
    if (c.mic) P(r.micDisplay === 'none', '悬浮麦克风已收起', r.micDisplay);
    P(r.homeGone, '结算卡不再有「休息一下」按钮', String(r.homeGone));
    P(r.homeHitOk, '结算态左上角返回(#exit-btn)可点(命中测试无遮挡)', r.homeHit);
    P(r.dangling.length === 0, '无悬空 <use>', JSON.stringify(r.dangling));
    P(r.errs.length === 0, '无 JS 错误', JSON.stringify(r.errs));

    // 「再来一局」：overlay 收起、听算模式麦克风归位
    await ev(`document.getElementById('retry-btn').click();`); await sleep(500);
    const r2 = await ev(`(() => { const fv=document.getElementById('float-voice-overlay');
      return { shown: document.getElementById('overlay').classList.contains('show'),
        mic: fv ? getComputedStyle(fv).display : '(none el)',
        status: (document.getElementById('float-voice-status')||{}).textContent || null,
        errs: window.__errs || [] }; })()`);
    P(!r2.shown, '再来一局后 overlay 收起', String(r2.shown));
    if (c.mic) P(r2.mic === 'flex', '再来一局后麦克风归位', r2.mic + ' / ' + r2.status);
    P(r2.errs.length === 0, '再来一局无 JS 错误', JSON.stringify(r2.errs));

    if (c.lv === 1 && win) {
      await ev(`debugEndGame(true);`); await sleep(700);
      await ev(`typeof mgClaimPending==='function' && mgClaimPending();`); await sleep(500);
      const s = await send('Page.captureScreenshot', { format: 'png' });
      writeFileSync('.shots/result_win_local.png', Buffer.from(s.data, 'base64'));
    }
    if (c.lv === 1 && !win) {
      await ev(`debugEndGame(false);`); await sleep(700);
      const s = await send('Page.captureScreenshot', { format: 'png' });
      writeFileSync('.shots/result_lose_local.png', Buffer.from(s.data, 'base64'));
    }
  }
}
console.log('\n' + (fail === 0 ? '=== RESULT CARD LOCAL PASS ===' : '=== ' + fail + ' FAIL ==='));
ws.close(); process.exit(fail ? 1 : 0);
