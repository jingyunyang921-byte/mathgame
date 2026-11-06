// 闸门：听算识别框「只显示将要判分的数字」（十四五 -> 14），且不影响判分。
// 本地用假 SpeechRecognition 驱动 recognition.onresult：L1(VoiceMixin) 与 L3(VoiceGame) 各测
//   A. 显示（最终结果）：数字类转写显示解析值，命令词 / 无数字原样显示；
//   D. 原生 Vosk 的中间结果不进框（说「三十三」不会先冒出 30），最终结果才显示；
//   B. 提交等价：提交给判分函数的永远是识别原文（不是框里显示的文字），partial 防抖提交与 isFinal 都一样；
//   C. 端到端：「十四五」在答案 14 时判对、答案 15 时判错，提交后框里是「说的是：14」。
// 用法：node .shots/verify_heard_display.mjs
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
  window.webkitSpeechRecognition = window.SpeechRecognition = function () { this.start = () => {}; this.stop = () => {}; this.abort = () => {}; };
})()` });
await b.nav(b.menu);
await b.preserve();

const CASES = [
  ['十四五', '14'], ['十四', '14'], ['二十四五', '24'], ['四', '4'], ['三十六', '36'], ['两', '2'], ['十', '10'],
  ['五十四', '54'], ['七十', '70'], ['42', '42'],
  ['下一题', '下一题'], ['换一题', '换一题'], ['跳过', '跳过'], ['重复', '重复'], ['再说', '再说'], ['算了', '算了'], ['你好', '你好'],
];
const HEARD = lv => (lv === 3 ? 'voice-heard-text' : 'float-voice-heard');
// 在页面里造一次识别回调（res 是带 isFinal 的数组，和 VoskRecognition._feed 一致）
const FIRE = (t, fin) => `(() => { const g = window._currentGame; g._ttsEndTime = 0; const res = [{ transcript: ${JSON.stringify(t)} }]; res.isFinal = ${!!fin};
  g.recognition.onresult({ resultIndex: 0, results: [res] }); })()`;

for (const lv of [1, 3]) {
  const proc = lv === 3 ? '_processVoiceResult' : '_processVoiceAnswer';
  await b.boot(lv, 'audio');
  const ready = await b.ev(`!!(window._currentGame && window._currentGame.recognition && window._currentGame.recognition.onresult)`);
  P(ready, `L${lv} 假 recognition 就绪（onresult 已绑定）`);
  if (!ready) continue;
  await b.ev(`(() => { const g = window._currentGame; g._isNativeVoice = true; g._ttsEndTime = 0; g._ttsSpeaking = false; g.recognition.stop = () => {}; g.locked = false; true; })()`);

  // A. 显示（最终结果；_interimFired=true 让回调只更新显示、不提交）
  const bad = [];
  for (const [src, want] of CASES) {
    const got = await b.ev(`(() => { const g = window._currentGame; g._interimFired = true; ${FIRE(src, true)}; return document.getElementById('${HEARD(lv)}').textContent; })()`);
    if (got !== want) bad.push({ src, want, got });
  }
  P(bad.length === 0, `L${lv} 识别框显示：${CASES.length} 个转写全部符合预期`, bad);

  // B. 提交等价：判分函数收到的是原文
  await b.ev(`(() => { const g = window._currentGame; window.__proc = []; g.${proc} = r => { window.__proc.push([...r].map(x => x.transcript).join('|')); }; true; })()`);
  const bad2 = [];
  for (const [src] of CASES) {
    await b.ev(`(() => { const g = window._currentGame; g._interimFired = false; clearTimeout(g._commitTimer); window.__proc.length = 0; ${FIRE(src, true)}; return true; })()`);
    const got = await b.ev('window.__proc.slice()');
    if (got.length !== 1 || got[0] !== src) bad2.push({ src, got });
  }
  P(bad2.length === 0, `L${lv} isFinal：提交给判分的永远是识别原文（不是框里的文字）`, bad2);
  await b.ev(`(() => { const g = window._currentGame; g._interimFired = false; clearTimeout(g._commitTimer); window.__proc.length = 0; ${FIRE('十四五', false)}; return true; })()`);
  await b.sleep(900);
  const part = await b.ev('window.__proc.slice()');
  P(part.length === 1 && part[0] === '十四五', `L${lv} partial 防抖提交：只提交一次，内容是原文「十四五」`, part);

  // D. 中间结果不进框
  await b.ev(`(() => { const g = window._currentGame; g._interimFired = false; clearTimeout(g._commitTimer); window.__proc.length = 0; document.getElementById('${HEARD(lv)}').textContent = ''; true; })()`);
  const seen = [];
  for (const t of ['三', '三十', '三十三']) seen.push(await b.ev(`(() => { ${FIRE(t, false)}; return document.getElementById('${HEARD(lv)}').textContent; })()`));
  P(seen.every(s => s === ''), `L${lv} 说三十三：中间结果「三 / 三十 / 三十三」都不进识别框（不会先冒出 30）`, seen);
  const fin = await b.ev(`(() => { clearTimeout(window._currentGame._commitTimer); ${FIRE('三十三', true)}; return document.getElementById('${HEARD(lv)}').textContent; })()`);
  P(fin === '33', `L${lv} 最终结果「三十三」：框里是 33`, fin);

  // C. 端到端：真实判分
  await b.ev(`(() => { const g = window._currentGame; delete g.${proc}; window.__ok = 0; window.__bad = 0;
    window.mgOnCorrect = (o => function () { window.__ok++; return o.apply(this, arguments); })(window.mgOnCorrect);
    window.mgOnWrong = (o => function () { window.__bad++; return o.apply(this, arguments); })(window.mgOnWrong); true; })()`);
  await b.ev(`(() => { const g = window._currentGame; g.currentAnswer = 14; g.locked = false; g._interimFired = false; clearTimeout(g._commitTimer); ${FIRE('十四五', true)}; return true; })()`);
  await b.sleep(300);
  const ok = await b.ev(`({ ok: window.__ok, bad: window.__bad, heard: document.getElementById('${HEARD(lv)}').textContent })`);
  P(ok.ok === 1 && ok.bad === 0, `L${lv} 答案 14、识别「十四五」：判对`, ok);
  P(ok.heard === '说的是：14', `L${lv} 提交后框里是「说的是：14」`, ok.heard);
  await b.ev(`(() => { const g = window._currentGame; window.__ok = 0; window.__bad = 0; g.currentAnswer = 15; g.locked = false; g._interimFired = false; clearTimeout(g._commitTimer); ${FIRE('十四五', true)}; return true; })()`);
  await b.sleep(300);
  const wr = await b.ev(`({ ok: window.__ok, bad: window.__bad })`);
  P(wr.ok === 0 && wr.bad === 1, `L${lv} 答案 15、识别「十四五」：判错`, wr);
}
await b.restore();
P(b.errors.length === 0, '无页面脚本异常', b.errors.slice(0, 3));
await b.close();
finish('HEARD DISPLAY');
