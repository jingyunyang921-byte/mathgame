// Verify the mobile-WebView touch fixes on-device via CDP:
//  1) tap-highlight blue flash removed  -> -webkit-tap-highlight-color: transparent (rgba(0,0,0,0))
//  2) long-press copy/paste callout off -> -webkit-touch-callout: none (inherited from body)
//  3) long-press text selection off     -> user-select / -webkit-user-select: none (inherited)
// Plus a few regression asserts so we know the refactor didn't break while adding these.
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
  const cs = el => el ? getComputedStyle(el) : null;
  const html = document.documentElement, body = document.body;
  const cta = document.querySelector('.cta');
  const card = document.querySelector('.island-card') || document.querySelector('[id^="card"]');
  const title = document.querySelector('.game-title');
  const seg = document.getElementById('btnVisual') || document.querySelector('.seg-btn,.mode-btn');
  const tap = el => { const c = cs(el); return c ? (c.webkitTapHighlightColor || c.getPropertyValue('-webkit-tap-highlight-color')) : null; };
  const usel = el => { const c = cs(el); return c ? (c.webkitUserSelect || c.userSelect || c.getPropertyValue('user-select')) : null; };
  const call = el => { const c = cs(el); return c ? (c.webkitTouchCallout || c.getPropertyValue('-webkit-touch-callout')) : null; };
  const cr = cta && cta.getBoundingClientRect();
  const bad = [...document.querySelectorAll('use')].map(u => u.getAttribute('href')).filter(h => h && !document.querySelector(h));
  const gt = cs(title);
  let selLen = -1;
  try { const s = getSelection(); s.removeAllRanges(); document.execCommand('selectAll', false, null); selLen = (s.toString() || '').trim().length; s.removeAllRanges(); } catch (e) { selLen = -2; }
  return {
    ua: navigator.userAgent, iw: innerWidth, ih: innerHeight,
    tapHtml: tap(html), tapBody: tap(body), tapCta: tap(cta), tapCard: tap(card), tapSeg: tap(seg),
    selBody: usel(body), selCta: usel(cta), selCard: usel(card), selTitle: usel(title),
    calloutBody: call(body), calloutCta: call(cta),
    ctaInScreen: !!cr && cr.bottom <= innerHeight + 0.5 && cr.top >= -0.5, ctaBottom: cr ? Math.round(cr.bottom) : null,
    danglingUse: bad,
    titleClip: gt ? (gt.webkitBackgroundClip || gt.backgroundClip) : null,
    selLen: selLen
  };
})()`;

const { result } = await send('Runtime.evaluate', { expression: EXPR, returnByValue: true, awaitPromise: true, userGesture: true });
const r = result.value;
console.log(JSON.stringify(r, null, 2));

let fail = 0;
const P = (ok, l, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
const N = (l, x) => console.log('NOTE ' + l + '  ' + x);
const isTransparent = v => v === 'rgba(0, 0, 0, 0)' || v === 'transparent';
const isNone = v => v === 'none';
console.log('\\n===== TOUCH-FIX VERDICTS =====');
P(/Chrome\/91\./.test(r.ua), 'WebView is Chrome/91', r.ua.match(/Chrome\/[\d.]+/)?.[0]);
N('viewport', r.iw + 'x' + r.ih);
// 1) tap-highlight transparent everywhere (set on *)
P(isTransparent(r.tapHtml), 'tap-highlight transparent @html', r.tapHtml);
P(isTransparent(r.tapBody), 'tap-highlight transparent @body', r.tapBody);
P(isTransparent(r.tapCta), 'tap-highlight transparent @.cta (button)', r.tapCta);
P(isTransparent(r.tapCard), 'tap-highlight transparent @card', r.tapCard);
if (r.tapSeg != null) P(isTransparent(r.tapSeg), 'tap-highlight transparent @mode-btn', r.tapSeg); else N('mode-btn not found (skip tap assert; * rule already proven above)', '');
// 2) user-select none (inherited from body across the tree)
P(isNone(r.selBody), 'user-select:none @body', r.selBody);
P(isNone(r.selCta), 'user-select:none inherited @.cta', r.selCta);
P(isNone(r.selCard), 'user-select:none inherited @card', r.selCard);
P(isNone(r.selTitle), 'user-select:none inherited @.game-title', r.selTitle);
// 3) long-press copy/paste menu: on Android WebView (Blink) this IS the text-selection menu,
//    governed by user-select:none (proven above). -webkit-touch-callout is a WebKit/iOS-only
//    property Blink ignores (computed reads empty) -> kept in CSS as harmless iOS coverage.
N('touch-callout (Blink ignores -webkit-touch-callout; kept for iOS WKWebView, harmless here)', 'body="' + r.calloutBody + '" cta="' + r.calloutCta + '"');
P(r.selLen === 0, 'long-press selects nothing (selectAll -> 0 chars) => no copy/paste menu', 'selectedChars=' + r.selLen);
// regression guardrails
console.log('\\n===== REGRESSION (unchanged by this fix) =====');
P(r.ctaInScreen, 'CTA still in-screen', 'bottom=' + r.ctaBottom + ' ih=' + r.ih);
P(Array.isArray(r.danglingUse) && r.danglingUse.length === 0, 'all <use> resolve', JSON.stringify(r.danglingUse));
P(r.titleClip === 'text', 'title background-clip:text alive', r.titleClip);
console.log('\\n===== ' + (fail === 0 ? 'ALL PASS' : fail + ' FAILURE(S)') + ' =====');
ws.close(); process.exit(fail === 0 ? 0 : 1);
