// 把云端音色（小度AI老师）的音频打进 APK：android/app/src/main/assets/tts_bundled/<sha1>.snd
// 内容 = 游戏页固定短句（mgTtsPrefetchLines）+ 菜单页引导语（menu.html 的 mgGuideLines）+ L1/L2/L4/L5 全部题目句子（QUESTION_EXPR，862 句，约 7.7MB 未压缩）。
// 文件名与 CloudTts.cacheFile 一致（sha1(scene|stream|整句文本)），APK 里首次念到时直接复制进缓存，不联网。
// 缺的句子用 android/local.properties 里的云端配置下载（凭证只读，不写入、不打印），失败自动重试 3 次，已有的跳过，所以中断后重跑即可续传。
// 新增或改动固定短句、或改了 L1/L2/L4/L5 题库范围后重跑一次，再重新打包。用法：node .shots/bundle_tts.mjs（需要本地 9333 Chrome 与 8000 静态服务）
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const BUNDLE_DIR = path.join(ROOT, 'android/app/src/main/assets/tts_bundled');

export function readProps() {
  const p = {};
  try {
    for (const line of fs.readFileSync(path.join(ROOT, 'android/local.properties'), 'utf8').split(/\r?\n/)) {
      const m = /^\s*([^#=\s][^=]*?)\s*=\s*(.*?)\s*$/.exec(line);
      if (m) p[m[1]] = m[2];
    }
  } catch (e) { /* 没有 local.properties：用默认 scene，下载会报缺配置 */ }
  return p;
}

// 页面里求值的表达式：固定短句清单 / 会念的全部题目句子（句式同 _genQuestion）：
//   L1/L2 取自 mgPools 的 add1/sub1/add2/sub2，L5 取自 mul5/div5，L4（表内乘除）照 mgGenMulDivTable 的取值范围枚举。L3/L6 题目太多（约 9300 句）不内置。
export const FIXED_EXPR = 'mgTtsPrefetchLines()';
export const MENU_EXPR = 'mgGuideLines()';   // 在菜单页求值（学龄前语音引导）；这些句子不进 mgTtsPrefetchLines，否则会被当成多余项
export const QUESTION_EXPR = `(() => {
  const p = mgPools(), t = [];
  for (let a = 1; a <= 9; a++) for (let b = 1; b <= 9; b++) t.push({ a, b, op: '×' });
  for (let b = 2; b <= 9; b++) for (let q = 2; q <= 9; q++) t.push({ a: b * q, b, op: '÷' });
  return [].concat(p.add1, p.sub1, p.add2, p.sub2, t, p.mul5, p.div5).map(c => c.a + ' ' + MG_OP_WORD[c.op] + ' ' + c.b + ' 等于');
})()`;

export function bundleName(text, props = readProps()) {
  const scene = props['tts.scene'] || 'math', stream = props['tts.stream'] === 'true';
  return crypto.createHash('sha1').update(`${scene}|${stream}|${text}`, 'utf8').digest('hex') + (stream ? '.wav' : '.snd');
}

export function bundleMissing(lines) {
  const props = readProps();
  return lines.filter(t => { try { return fs.statSync(path.join(BUNDLE_DIR, bundleName(t, props))).size === 0; } catch (e) { return true; } });
}

const md5 = s => crypto.createHash('md5').update(s, 'utf8').digest('hex');
const enc = s => encodeURIComponent(s);

async function download(text, props) {
  const u = new URL(props['tts.url']);
  const p = Object.fromEntries(u.searchParams);
  Object.assign(p, { clientId: props['tts.clientId'], cuid: props['tts.cuid'] || 'mathgame-bundle', per: 'system', ts: String(Math.floor(Date.now() / 1000)), text });
  if (!p.scene) p.scene = props['tts.scene'] || 'math';
  p.sign = md5(props['tts.salt'] + Object.keys(p).sort().map(k => k + '=' + p[k]).join('&'));
  let url = u.origin + u.pathname + '?' + Object.entries(p).map(([k, v]) => enc(k) + '=' + enc(v)).join('&');
  for (let hop = 0; hop < 4; hop++) {
    const r = await fetch(url, { redirect: 'manual' });
    const loc = r.headers.get('location');
    if (r.status >= 300 && r.status < 400 && loc) { url = new URL(loc, url).href.replace(/^http:/, 'https:'); continue; }
    const buf = Buffer.from(await r.arrayBuffer()), type = r.headers.get('content-type') || '';
    if (r.status !== 200 || !/audio|octet-stream/.test(type) || buf.length < 512) throw new Error(`http ${r.status} ${type} ${buf.subarray(0, 120).toString('utf8').replace(/\s+/g, ' ')}`);
    return buf;
  }
  throw new Error('too many redirects');
}

async function readLines() {
  const { petBrowser } = await import('./pet_browser.mjs');
  const b = await petBrowser();
  try {
    await b.nav(b.menu);
    await b.preserve();
    const menu = await b.ev(MENU_EXPR);
    await b.boot(1, 'visual');
    const fixed = await b.ev(FIXED_EXPR), questions = await b.ev(QUESTION_EXPR);
    await b.restore();
    return { fixed, menu, questions };
  } finally { await b.close(); }
}

async function main() {
  const props = readProps();
  if (props['tts.stream'] === 'true') { console.error('tts.stream=true 暂不支持打包（流式要先转 WAV）'); process.exit(2); }
  const { fixed, menu, questions } = await readLines();
  const lines = [...new Set([...fixed, ...menu, ...questions])];
  fs.mkdirSync(BUNDLE_DIR, { recursive: true });
  const todo = bundleMissing(lines);
  console.log(`清单 ${lines.length} 句（游戏页固定短句 ${fixed.length} + 菜单引导 ${menu.length} + 题目 ${questions.length}），已打包 ${lines.length - todo.length}，待下载 ${todo.length}`);
  if (todo.length && !(props['tts.url'] && props['tts.clientId'] && props['tts.salt'])) { console.error('缺 android/local.properties 里的 tts.url / tts.clientId / tts.salt，无法下载'); process.exit(2); }
  let ok = 0, bytes = 0;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  for (const t of todo) {
    let buf = null, err = null;
    for (let attempt = 0; attempt < 3 && !buf; attempt++) {
      try { buf = await download(t, props); } catch (e) { err = e; await wait(1000); }
    }
    if (!buf) { console.error('下载失败：' + t + ' ← ' + err.message); break; }
    fs.writeFileSync(path.join(BUNDLE_DIR, bundleName(t, props)), buf);
    ok++; bytes += buf.length;
    if (ok % 50 === 0) console.log(`  已下载 ${ok} / ${todo.length}`);
    await wait(200);
  }
  const names = new Set(lines.map(t => bundleName(t, props)));
  const stale = fs.readdirSync(BUNDLE_DIR).filter(n => !names.has(n));
  const left = bundleMissing(lines);
  console.log(`新下载 ${ok} 句（${Math.round(bytes / 1024)}KB），仍缺 ${left.length}，目录里多余 ${stale.length} 个`);
  process.exit(left.length ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
