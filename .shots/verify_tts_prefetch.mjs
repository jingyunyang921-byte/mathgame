// 闸门：云端音色固定短句预下载。游戏页加载 6 秒后，只调一次 Capacitor.Plugins.Tts.prefetch({texts})：
//   1. 清单覆盖游戏里「会随机抽到」的每一句固定短句（答对 / 答错 / 提示 / 夸奖 / 各关通关故事 / 小动物带路与到终点），不含未替换的 {n}{m}；
//   2. 答对 / 答错排在最前（第一局最先用到）；
//   3. 声音开关关了不预下载；浏览器（非原生）不调用。
// 用法：node .shots/verify_tts_prefetch.mjs
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
const NATIVE = process.env.NATIVE_OFF ? '' : `window.Capacitor = { isNativePlatform: () => true, Plugins: { Tts: {
  speak: () => Promise.resolve(), stop: () => Promise.resolve(),
  prefetch: o => { (window.__pf = window.__pf || []).push(o.texts); return Promise.resolve(); } } } };`;
await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { ${NATIVE} })()` });
await b.nav(b.menu);
await b.preserve();
const SET_VOICE = v => b.ev(`localStorage.setItem('mathgameSettings', JSON.stringify({ sfx: 3, bgm: 0, voice: ${v} })); true`);

await SET_VOICE(3);
await b.boot(1, 'visual');
await b.poll('window.__pf && window.__pf.length > 0', 12000).catch(() => {});
const calls = await b.ev('window.__pf ? window.__pf.length : 0');
P(calls === 1, '进游戏后只调用一次 prefetch', calls);
const L = await b.ev('(window.__pf && window.__pf[0]) || []');
P(L.length > 40 && L.length < 90, '清单条数合理（约 54 句，每句约 10KB）', L.length);
P(L.every(s => typeof s === 'string' && s.length > 0 && !/[{}]/.test(s)), '每条都是非空文本，没有没替换的 {n} / {m}', L.filter(s => /[{}]/.test(s)));
P(new Set(L).size === L.length, '没有重复句子');

// 运行时会抽到的每一句都必须在清单里（用真实函数抽样）
const miss = await b.ev(`(() => {
  const set = new Set(window.__pf[0]), out = new Set();
  const need = s => { if (!set.has(s)) out.add(s); };
  [MG_WRONG_LINES, MG_BINGO_LINES, MG_IDLE_LINES, MG_IDLE_TAP_LINES, MG_CUE.win].forEach(a => a.forEach(need));
  need('好的，换下一题！'); need('太棒了，速算完成！');
  const lv0 = sessionStorage.getItem('gameLevel');
  for (let lv = 1; lv <= 6; lv++) {
    sessionStorage.setItem('gameLevel', String(lv));
    for (let i = 0; i < 120; i++) { need(mgWinCue(lv)); need(mgPickCue(MG_CUE.finish)); need(mgPickCue(MG_CUE.lead)); need(mgPickCue(MG_CUE.win)); }
  }
  if (lv0 == null) sessionStorage.removeItem('gameLevel'); else sessionStorage.setItem('gameLevel', lv0);
  return [...out];
})()`);
P(miss.length === 0, '通关故事（六关）/ 带路 / 到终点 / 夸奖 / 答对答错 / 提示：运行时抽到的每一句都在清单里', miss);
const head = await b.ev(`(() => ({ first: window.__pf[0].slice(0, 10), wb: [...MG_WRONG_LINES, ...MG_BINGO_LINES] }))()`);
P(head.first.every(s => head.wb.includes(s)), '答对 / 答错的 10 句排在最前', head.first);
P(b.errors.length === 0, '无页面脚本异常', b.errors.slice(0, 3));
await b.restore();
await b.close();

// 声音开关关了：不预下载
const b2 = await petBrowser();
await b2.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { ${NATIVE} })()` });
await b2.nav(b2.menu);
await b2.preserve();
await b2.ev(`localStorage.setItem('mathgameSettings', JSON.stringify({ sfx: 3, bgm: 0, voice: 0 })); true`);
await b2.boot(1, 'visual');
await b2.sleep(8000);
P((await b2.ev('window.__pf ? window.__pf.length : 0')) === 0, '声音开关关了：不预下载');
P(b2.errors.length === 0, '无页面脚本异常', b2.errors.slice(0, 3));
await b2.restore();
await b2.close();
finish('TTS PREFETCH');
