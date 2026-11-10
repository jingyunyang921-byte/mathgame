// 本机日志，不联网、不上传。平时只在内存里记最近 40 条事件（页面启动、进出后台、开局……）；
// 一旦出现警告或错误，才把这些事件连同出错那条写进 localStorage 的 mathgameLog（最多 150 条）。
// 正常玩一局不写存储，新装机的 localStorage 仍只有版本闸门。
// 取日志：电脑上 node .shots/pull_log.mjs；或在 chrome://inspect 的控制台里 mgLog.dump()。
(function (root) {
  'use strict';
  if (root.mgLog) return;
  var KEY = 'mathgameLog', MAX = 150, TRAIL = 40, LEN = 300, BUDGET = 60;
  var PAGE = 'page';
  try { PAGE = document.currentScript.getAttribute('data-page') || PAGE; } catch (e) {}
  var trail = [], seen = {}, written = 0;

  function frames(stack) {
    return String(stack).split('\n').slice(1, 4).map(function (s) { return s.trim(); }).join(' | ')
      .replace(/https?:\/\/[^\s)]*\//g, '');
  }
  function text(v) {
    var s = v && (v.message || v.errorMessage);
    if (s == null) { try { s = typeof v === 'string' ? v : JSON.stringify(v); } catch (e) { s = String(v); } }
    s = String(s == null ? '' : s);
    if (v && v.stack) s += ' | ' + frames(v.stack);
    s = s.replace(/\s+/g, ' ');
    return s.length > LEN ? s.slice(0, LEN) + '…' : s;
  }
  function stored() {
    try { var a = JSON.parse(root.localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  function persist(list) {
    try {
      var all = stored().concat(list);
      if (all.length > MAX) all = all.slice(all.length - MAX);
      root.localStorage.setItem(KEY, JSON.stringify(all));
    } catch (e) { /* 存储满或被禁用：日志不能连累游戏 */ }
  }
  function pub(e) {
    var o = { t: e.t, p: e.p, l: e.l, g: e.g, m: e.m };
    if (e.n) o.n = e.n;
    return o;
  }
  function log(level, tag, msg) {
    try {
      var e = { t: Date.now(), p: PAGE, l: level, g: String(tag), m: text(msg) };
      if (level !== 'I') {
        if (written >= BUDGET) return;
        var k = e.g + '|' + e.m, n = seen[k] = (seen[k] || 0) + 1;
        if (n > 1 && n !== 10 && n !== 100 && n !== 1000) return;   // 同一条刷屏只留第 1、10、100、1000 次
        if (n > 1) e.n = n;
      }
      trail.push(e);
      if (trail.length > TRAIL) trail.shift();
      try { (root.console[level === 'E' ? 'error' : level === 'W' ? 'warn' : 'log']).call(root.console, '[mg] ' + PAGE + ' ' + e.g + ' ' + e.m); } catch (x) {}
      if (level === 'I') return;
      var out = [];
      for (var i = 0; i < trail.length; i++) if (!trail[i].s) { trail[i].s = 1; out.push(pub(trail[i])); }
      written += 1;
      if (written >= BUDGET) out.push({ t: Date.now(), p: PAGE, l: 'W', g: 'log', m: '本页已记满 ' + BUDGET + ' 条，之后的不再记录' });
      persist(out);
    } catch (x) { /* 记日志不许抛错 */ }
  }

  root.mgLog = {
    i: function (tag, msg) { log('I', tag, msg); },
    w: function (tag, msg) { log('W', tag, msg); },
    e: function (tag, msg) { log('E', tag, msg); },
    dump: stored,
    recent: function () { return trail.map(pub); },
    clear: function () { try { root.localStorage.removeItem(KEY); } catch (e) {} }
  };

  root.addEventListener('error', function (ev) {
    try {
      var t = ev && ev.target;
      if (t && t !== root && t.tagName) { log('W', 'resource', t.tagName.toLowerCase() + ' load failed ' + (t.currentSrc || t.src || t.href || '')); return; }
      var where = ev.filename ? String(ev.filename).split('/').pop() + ':' + ev.lineno + ':' + ev.colno : '';
      log('E', 'js', text(ev.message) + ' @ ' + where + (ev.error && ev.error.stack ? ' | ' + frames(ev.error.stack) : ''));
    } catch (x) {}
  }, true);
  root.addEventListener('unhandledrejection', function (ev) { log('E', 'promise', ev && ev.reason); });
  document.addEventListener('visibilitychange', function () { log('I', 'vis', document.hidden ? 'hidden' : 'visible'); });

  var native = false;
  try { native = !!(root.Capacitor && root.Capacitor.isNativePlatform && root.Capacitor.isNativePlatform()); } catch (e) {}
  log('I', 'boot', 'native=' + native + ' size=' + root.innerWidth + 'x' + root.innerHeight + ' dpr=' + root.devicePixelRatio +
    ' q=' + (root.location.search || '-') + ' ua=' + root.navigator.userAgent.replace(/^Mozilla\/5\.0 /, ''));
})(window);
