// 真机闸门：进游戏后云端音色把固定短句预下载进 cache/tts_cloud。
// 不清缓存：看 logcat 里 CloudTts 的「prefetch done: N new, M of K cached」，M 必须等于 K（整份清单都在缓存里，中途没失败），
// 且 .snd 文件数增加了 N 个。前置：app 已启动并 adb forward 9222；起跑前先 `adb logcat -c`。
// 用法：PET_DEVICE=1 node .shots/verify_tts_prefetch_device.mjs
import { execFileSync } from 'node:child_process';
import { petBrowser, verdicts } from './pet_browser.mjs';
const ADB = 'E:/sdk/platform-tools/adb.exe', SERIAL = process.env.ANDROID_SERIAL || '921264FBLSP2000115DF';
const adb = (...a) => execFileSync(ADB, ['-s', SERIAL, ...a], { encoding: 'utf8' });
const count = () => adb('shell', 'run-as', 'com.mathgame.app', 'ls', 'cache/tts_cloud').split(/\r?\n/).filter(n => n.endsWith('.snd')).length;
const b = await petBrowser(), { check: P, finish } = verdicts();
if (!b.device) { console.log('只能在真机上跑（PET_DEVICE=1）'); process.exit(2); }
await b.nav(b.menu);
await b.preserve();
const before = count();
await b.ev(`localStorage.setItem('mathgameSettings', JSON.stringify({ sfx: 3, bgm: 0, voice: 3 })); true`);
await b.boot(1, 'visual');
const t0 = Date.now();
let m = null;
while (Date.now() - t0 < 170000) {
  await b.sleep(3000);
  m = /prefetch done: (\d+) new, (\d+) of (\d+) cached/.exec(adb('logcat', '-d', '-s', 'CloudTts'));
  if (m) break;
}
const secs = Math.round((Date.now() - t0) / 1000), after = count();
P(!!m, `预下载跑完（用时约 ${secs} 秒，含 6 秒延迟）`, m && m[0]);
if (m) {
  P(+m[3] >= 50 && +m[2] === +m[3], `整份清单都在缓存里：${m[2]} / ${m[3]}`, m[0]);
  P(after - before === +m[1], `.snd 文件数 ${before} -> ${after}，增加了 ${m[1]} 个（和日志一致）`, { before, after });
}
const warn = adb('logcat', '-d', '-s', 'CloudTts').split(/\r?\n/).filter(l => /failed/.test(l));
P(warn.length === 0, '预下载期间没有云端失败告警', warn.slice(0, 2));
await b.restore();
await b.close();
finish('DEVICE TTS PREFETCH');
