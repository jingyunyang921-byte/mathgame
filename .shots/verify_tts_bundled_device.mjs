// 真机闸门：固定短句和 L1/L2/L4/L5 题目的音频已内置进 APK，缓存里没有时从 APK 复制，不靠联网下载。
// 前置（手动）：force-stop 后把设备缓存挪开 `run-as com.mathgame.app mv cache/tts_cloud cache/tts_cloud_hold`，
//   再启动 app、adb forward 9222、`adb logcat -c`。设备缓存里还有这些句子时本脚本直接报前置不满足（那样测不出内置路径）。
// 用法：PET_DEVICE=1 node .shots/verify_tts_bundled_device.mjs
//   设备断网时加 OFFLINE=1（`adb shell svc wifi disable`，测完 enable）：这时内置句子（含 L1/L2/L4/L5 题目）必须照样能念；L3/L6 的题目没内置会回落系统音，所以不查失败告警。
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { petBrowser, verdicts } from './pet_browser.mjs';
import { BUNDLE_DIR, bundleName, FIXED_EXPR, QUESTION_EXPR } from './bundle_tts.mjs';
const ADB = 'E:/sdk/platform-tools/adb.exe', SERIAL = process.env.ANDROID_SERIAL || '921264FBLSP2000115DF', PKG = 'com.mathgame.app';
const adb = (...a) => execFileSync(ADB, ['-s', SERIAL, ...a], { encoding: 'utf8' });
const cacheList = () => adb('shell', 'run-as', PKG, 'ls', 'cache/tts_cloud').split(/\r?\n/).filter(n => n.endsWith('.snd'));
const pull = name => execFileSync(ADB, ['-s', SERIAL, 'exec-out', 'run-as', PKG, 'cat', 'cache/tts_cloud/' + name], { maxBuffer: 1 << 24 });
const b = await petBrowser(), { check: P, finish } = verdicts();
if (!b.device) { console.log('只能在真机上跑（PET_DEVICE=1）'); process.exit(2); }

const bundled = fs.readdirSync(BUNDLE_DIR).filter(n => n.endsWith('.snd'));
const before = cacheList();
const preset = bundled.filter(n => before.includes(n));
P(preset.length === 0, `前置：设备缓存里没有这 ${bundled.length} 句（缓存共 ${before.length} 个文件）`, preset.length);
if (preset.length) { await b.close(); finish('DEVICE TTS BUNDLED (前置不满足)'); process.exit(2); }

await b.nav(b.menu);
await b.preserve();
await b.ev(`localStorage.setItem('mathgameSettings', JSON.stringify({ sfx: 3, bgm: 0, voice: 3 })); true`);
await b.boot(1, 'visual');
const lines = await b.ev(FIXED_EXPR), questions = await b.ev(QUESTION_EXPR);
P(questions.length > 0 && questions.every(t => bundled.includes(bundleName(t))), `L1/L2/L4/L5 全部 ${questions.length} 道题的念题句子都在内置目录里`);
const t0 = Date.now();
let m = null;
while (Date.now() - t0 < 60000) {
  await b.sleep(1500);
  m = /prefetch done: (\d+) new, (\d+) of (\d+) cached \((\d+) in apk\)/.exec(adb('logcat', '-d', '-s', 'CloudTts'));
  if (m) break;
}
P(!!m, `预下载跑完（用时约 ${Math.round((Date.now() - t0) / 1000)} 秒）`, m && m[0]);
if (m) {
  P(+m[1] === 0, '没有联网下载任何一句（0 new）', m[0]);
  P(+m[2] === +m[3] && +m[4] === lines.length, `整份固定短句清单（${lines.length} 句）都覆盖，且全部来自 APK`, m[0]);
}
const pick = [lines[0], lines[Math.floor(lines.length / 2)], lines[lines.length - 1], questions[0], questions[Math.floor(questions.length / 2)], questions[questions.length - 1]];
for (const text of pick) {
  const name = bundleName(text), t = Date.now();
  const r = await b.ev(`(async()=>{try{await Capacitor.Plugins.Tts.speak({text:${JSON.stringify(text)},rate:1,volume:0.3,lang:'zh-CN'});return {ok:true}}catch(e){return {ok:false,err:String(e&&e.message||e)}}})()`);
  const ms = Date.now() - t;
  let same = false, size = 0;
  try { const got = pull(name); size = got.length; same = got.equals(fs.readFileSync(path.join(BUNDLE_DIR, name))); } catch (e) { /* 文件不存在 */ }
  P(r.ok && same, `念「${text}」：播放完成（${ms}ms），缓存里的文件与 APK 内置的逐字节一致`, { ok: r.ok, err: r.err, size });
}
const warn = adb('logcat', '-d', '-s', 'CloudTts').split(/\r?\n/).filter(l => /failed|fall back/.test(l));
if (!process.env.OFFLINE) P(warn.length === 0, '期间没有云端失败或回落告警', warn.slice(0, 2));
const cacheNames = cacheList();
P(cacheNames.length >= pick.length && pick.every(t => cacheNames.includes(bundleName(t))), `念过的 ${pick.length} 句都已按需复制进缓存（游戏自己念题时也会往缓存里写别的句子，所以不比总数）`);
await b.restore();
await b.close();
finish('DEVICE TTS BUNDLED');
