// On-device verification via CDP (device WebView >= Chrome/91; screencap is FLAG_SECURE-blank).
// Requires: adb forward tcp:9222 localabstract:webview_devtools_remote_<pid> already set up.
const CDP = 'http://localhost:9222';
const targets = await (await fetch(CDP + '/json')).json();
const page = targets.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || targets[0];
if (!page) { console.log('NO PAGE TARGET'); process.exit(2); }
console.log('target:', page.title, '|', page.url);
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let _id = 0; const pending = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params) => { const id = ++_id; return new Promise((res, rej) => { pending.set(id, m => m.error ? rej(new Error(method + ':' + JSON.stringify(m.error))) : res(m.result)); ws.send(JSON.stringify({ id, method, params: params || {} })); }); };
await send('Runtime.enable');

const EXPR = `(() => {
  const q = s => document.querySelector(s);
  const cta = q('.cta'); const cr = cta && cta.getBoundingClientRect();
  const ms = q('#menuScreen');
  const c5 = q('#card5'); const c5r = c5 && c5.getBoundingClientRect();
  const gt = q('.game-title'); const cs = gt && getComputedStyle(gt);
  const bad = [...document.querySelectorAll('use')].map(u => u.getAttribute('href')).filter(h => h && !document.querySelector(h));
  const rc = getComputedStyle(document.documentElement);
  const c1 = q('#card1');
  const accentUse = q('#card3 .medallion .ic-op use') || q('#card3 .medallion use');
  const accentIc = q('#card3 .medallion .ic-op') || q('#card3 .medallion .ic');
  const styleTxt = [...document.querySelectorAll('style')].map(s => s.textContent).join('\\n');
  const banned = styleTxt.match(/paint-order|:has\\(|@layer|color-mix\\(|oklch\\(|\\d(dvh|svh|lvh)/g);
  return {
    ua: navigator.userAgent,
    iw: innerWidth, ih: innerHeight, dpr: devicePixelRatio,
    mq700: matchMedia('(max-height:700px)').matches, mq560: matchMedia('(max-height:560px)').matches,
    ui: rc.getPropertyValue('--ui').trim(), sp2: rc.getPropertyValue('--sp-2').trim(), gutterX: rc.getPropertyValue('--gutter-x').trim(),
    ctaBottom: cr ? Math.round(cr.bottom) : null, ctaTop: cr ? Math.round(cr.top) : null,
    ctaInScreen: !!cr && cr.bottom <= innerHeight + 0.5 && cr.top >= -0.5,
    scrollDelta: ms ? (ms.scrollHeight - ms.clientHeight) : null,
    danglingUse: bad,
    card5Right: c5r ? Math.round(c5r.right) : null, card5Limit: innerWidth - 56, card5Ok: c5r ? (c5r.right <= innerWidth - 56 + 0.5) : null,
    titleClip: cs ? (cs.webkitBackgroundClip || cs.backgroundClip) : null, titleFill: cs ? cs.webkitTextFillColor : null,
    card1PadTop: c1 ? getComputedStyle(c1).paddingTop : null, card1PadLeft: c1 ? getComputedStyle(c1).paddingLeft : null,
    accentUseStroke: accentUse ? getComputedStyle(accentUse).stroke : 'NO-USE',
    accentIcVar: accentIc ? getComputedStyle(accentIc).getPropertyValue('--icon-accent').trim() : 'NO-IC',
    bannedTokens: banned
  };
})()`;

const { result } = await send('Runtime.evaluate', { expression: EXPR, returnByValue: true, awaitPromise: true, userGesture: true });
const r = result.value;
console.log(JSON.stringify(r, null, 2));

let fail = 0;
const P = (ok, l, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
const N = (l, x) => console.log('NOTE ' + l + '  ' + x);
console.log('\\n===== DEVICE VERDICTS =====');
P(/Chrome\/(9[1-9]|1\d\d)\./.test(r.ua), 'WebView >= Chrome/91', r.ua.match(/Chrome\/[\d.]+/)?.[0]);
N('viewport', r.iw + 'x' + r.ih + ' dpr=' + r.dpr + '  mq(<=700)=' + r.mq700 + ' mq(<=560)=' + r.mq560 + '  --ui=' + r.ui + ' --sp-2=' + r.sp2 + ' --gutter-x=' + r.gutterX);
P(r.ctaInScreen, 'CTA in-screen', 'bottom=' + r.ctaBottom + ' top=' + r.ctaTop + ' ih=' + r.ih);
P(r.scrollDelta <= 1, '#menuScreen no overflow (absorber works)', 'scrollDelta=' + r.scrollDelta);
P(Array.isArray(r.danglingUse) && r.danglingUse.length === 0, 'all <use> resolve', JSON.stringify(r.danglingUse));
P(r.card5Ok, 'card5 right <= iw-56 (AI-widget clearance)', 'right=' + r.card5Right + ' limit=' + r.card5Limit);
P(r.titleClip === 'text', 'title background-clip:text alive (not dropped)', r.titleClip + ' fill=' + r.titleFill);
P(r.bannedTokens === null, 'no banned Chrome91-incompatible tokens', JSON.stringify(r.bannedTokens));
N('card1 padTop/padLeft', r.card1PadTop + ' / ' + r.card1PadLeft);
N('two-tone icon accent', 'use.stroke=' + r.accentUseStroke + '  --icon-accent=' + r.accentIcVar + '  (gold #FFC63D = rgb(255,198,61))');
console.log('\\n===== ' + (fail === 0 ? 'ALL PASS' : fail + ' FAILURE(S)') + ' =====');
ws.close(); process.exit(fail === 0 ? 0 : 1);
