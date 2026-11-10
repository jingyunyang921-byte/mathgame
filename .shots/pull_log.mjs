// 从真机取回日志：node .shots/pull_log.mjs [--clear] [--no-native]
// 1) WebView 里的 mathgameLog（页面错误、朗读被拒、语音加载失败……，每条前面带着出错前的事件）；
// 2) 原生 logcat 里本应用的几个标签（MgApp / MgTts / VoskPlugin / CloudTts / Capacitor/Console）和 crash 缓冲区。
// 多台设备时先设 ANDROID_SERIAL。需要调试包（debuggable），应用没开会先拉起来。
import { execFileSync } from 'node:child_process';
const PKG = 'com.mathgame.app', PORT = 9334;   // 避开闸门用的 9333 / 9222
const args = new Set(process.argv.slice(2));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const adb = (...a) => { try { return execFileSync('adb', a, { stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 }).toString(); } catch (e) { return ''; } };

if (!/\tdevice\b/.test(adb('devices'))) { console.log('没有已授权的设备（adb devices 里应是 device，不是 unauthorized / offline）'); process.exit(1); }

let pid = adb('shell', 'pidof', PKG).trim().split(/\s+/)[0];
if (!pid) { adb('shell', 'monkey', '-p', PKG, '-c', 'android.intent.category.LAUNCHER', '1'); await sleep(3000); pid = adb('shell', 'pidof', PKG).trim().split(/\s+/)[0]; }
if (!pid) { console.log('应用没有运行，也没能拉起来'); process.exit(1); }
adb('forward', `tcp:${PORT}`, `localabstract:webview_devtools_remote_${pid}`);

async function pageLog() {
  let page = null;
  for (let i = 0; i < 20 && !page; i++) {
    try { page = (await (await fetch(`http://localhost:${PORT}/json`)).json()).find(t => t.type === 'page' && t.webSocketDebuggerUrl); } catch (e) {}
    if (!page) await sleep(300);
  }
  if (!page) return null;
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pend = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
  const ev = expression => new Promise(res => { pend.set(++id, res); ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true } })); });
  const r = await ev(`localStorage.getItem('mathgameLog')`);
  if (args.has('--clear')) await ev(`localStorage.removeItem('mathgameLog')`);
  ws.close();
  return { url: page.url, raw: r.result && r.result.result && r.result.result.value };
}

const got = await pageLog().catch(() => null);
console.log('==== WebView 日志 (mathgameLog) ====');
if (!got) console.log('连不上 WebView 调试口（release 包默认关闭调试；装调试包再试）');
else {
  console.log('当前页面:', got.url);
  let list = [];
  try { list = JSON.parse(got.raw || '[]'); } catch (e) {}
  if (!list.length) console.log('（空：这个包没出过警告 / 错误，或还是没带日志功能的旧包）');
  let day = '';
  for (const x of list) {
    const d = new Date(x.t), ds = d.toLocaleDateString('zh-CN'), ts = d.toTimeString().slice(0, 8) + '.' + String(d.getMilliseconds()).padStart(3, '0');
    if (ds !== day) { day = ds; console.log('--- ' + ds); }
    console.log(`${ts} [${x.p}] ${x.l} ${x.g}: ${x.m}${x.n ? '  (共 ' + x.n + ' 次)' : ''}`);
  }
  if (args.has('--clear')) console.log('（已清空设备上的日志）');
}

if (!args.has('--no-native')) {
  const tail = (s, n) => s.split('\n').filter(Boolean).slice(-n).join('\n') || '（无）';
  console.log('\n==== 原生 logcat（本应用标签，最后 80 行） ====');
  console.log(tail(adb('logcat', '-d', '-v', 'time', '-s', 'MgApp:V', 'MgTts:V', 'VoskPlugin:V', 'CloudTts:V', 'Capacitor/Console:V', 'AndroidRuntime:E'), 80));
  console.log('\n==== 崩溃缓冲区 (logcat -b crash，最后 40 行) ====');
  console.log(tail(adb('logcat', '-b', 'crash', '-d', '-v', 'time'), 40));
}
adb('forward', '--remove', `tcp:${PORT}`);
