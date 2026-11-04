// 真机验证：听算「5 秒没作答」提示。包一层真实 Tts.speak 记录起止；PET_DEVICE=1 node .shots/verify_idle_hint_device.mjs
// 前置：adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>。只验触发时机 / 次数 / 不叮 / 提示后开麦；声音好不好听要亲耳听。
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
if (!b.device) { console.log('请用 PET_DEVICE=1'); process.exit(0); }
await b.nav(b.menu);
await b.preserve();
const SPY = `(() => { window.__tts = []; window.__ding = []; window.__resume = [];
  const T = Capacitor.Plugins.Tts; if (!T.__orig) { T.__orig = T.speak.bind(T);
    T.speak = function (a) { const r = { t: String(a.text), s: Date.now(), e: 0 }; window.__tts.push(r);
      const p = T.__orig(a); p.then(() => { r.e = Date.now(); }, () => { r.e = Date.now(); r.err = 1; }); return p; }; }
  if (!window.__askPatched) { window.__askPatched = true; const f = mgPlayAskChime;
    mgPlayAskChime = function () { const r = f.apply(this, arguments); if (r) window.__ding.push(Date.now()); return r; }; }
  const g = window._currentGame; if (!g.__rp) { g.__rp = true; const r = g._ttsResume; g._ttsResume = function () { window.__resume.push(Date.now()); return r.apply(this, arguments); }; }
  return true; })()`;
const ANSWER = `(() => { const g = window._currentGame; const f = g._processVoiceAnswer || g._processVoiceResult; f.call(g, [{ transcript: String(g.currentAnswer) }]); return true; })()`;
const DOOR_OK = `(() => { const g = window._currentGame; g._choose(g.choices.find(d => d.value === g.currentAnswer)); return true; })()`;
const LOG = `window.__tts.map(r => ({ t: r.t, s: r.s, e: r.e }))`;
const until = async (t) => { const d = t - Date.now(); if (d > 0) await b.sleep(d); };
const POOL = await (async () => { await b.boot(1, 'audio'); return b.ev('({ voice: MG_IDLE_LINES, tap: MG_IDLE_TAP_LINES })'); })();
for (const lv of [1, 3, 5]) {
  const tap = lv === 5;
  await b.boot(lv, 'audio');
  await b.ev(SPY);
  // 真机 boot 返回时首题可能已经开始念，首条日志常是第一次提示。先等安静，再答对一题，以「下一题读完」为起点
  await b.poll(`(() => { const t = window.__tts, l = t[t.length - 1]; return !!l && !!l.e && Date.now() - l.e > 800; })()`, 25000).catch(() => {});
  const nAns = (await b.ev(LOG)).length;
  await b.ev(tap ? DOOR_OK : ANSWER);
  await b.poll(`(() => { const t = window.__tts, l = t[t.length - 1]; return t.length >= ${nAns + 2} && !!l.e && Date.now() - l.e > 300; })()`, 15000).catch(() => {});
  const log0 = await b.ev(LOG), n = log0.length, tEnd = log0[n - 1].e;
  const info = { q: log0[n - 1].t, sinceEndMs: Date.now() - tEnd };
  P(info.sinceEndMs < 4300, `真机 L${lv} 起点在读完题 4.3 秒内（测量前提）`, info);
  const d0 = (await b.ev('window.__ding')).length, r0 = (await b.ev('window.__resume')).length;
  await until(tEnd + 4300);
  P((await b.ev(LOG)).length === n, `真机 L${lv} 读完题 4.3 秒时还没提示`);
  await until(tEnd + 5000 + 1600);
  let log = await b.ev(LOG);
  P(log.length === n + 1, `真机 L${lv} 5 秒后念了一句提示`, log.slice(n).map(r => r.t));
  const h = log[n];
  if (h) {
    P((tap ? POOL.tap : POOL.voice).includes(h.t), `真机 L${lv} 提示句来自${tap ? '点门' : '开口'}句池`, h.t);
    P(h.s - tEnd >= 4700 && h.s - tEnd <= 5700, `真机 L${lv} 提示在读完题约 5 秒后`, h.s - tEnd);
    await b.poll(`window.__tts[${n}].e > 0`, 8000).catch(() => {});
    await b.sleep(700);   // 音乐在放时，念完后还要等 220ms 才放开麦克风
    P((await b.ev('window.__resume')).length >= r0 + 1 || tap, `真机 L${lv} 提示念完后放开麦克风`, { resumes: (await b.ev('window.__resume')).length - r0 });
  }
  P((await b.ev('window.__ding')).length === d0, `真机 L${lv} 提示不叮`);
  await b.sleep(6500);
  P((await b.ev(LOG)).length === n + 1, `真机 L${lv} 同一题再等 6.5 秒也不再提示（一题一次）`);
}
await b.restore();
P(b.errors.length === 0, '无页面脚本异常', b.errors.slice(0, 3));
await b.close();
finish('DEVICE IDLE HINT');
