// 闸门：听算「说 9 后边多出 0」——Vosk 中间结果末尾的低置信尾音词（真机实录：九(1.00) 十(0.67)）不能进识别框，也不能被防抖提交成 90。
//   A. mgVoskText：中间结果去掉末尾低置信词；真词（置信度≥0.98）、首词（置信度可低到 0.56）、最终结果、缺 words 的旧插件原样保留；
//   B. VoskRecognition._feed 全程：尾音词被滤掉后只剩「九」，首词即使置信度低也照常上报；
//   C. L1(VoiceMixin) / L3(VoiceGame)：答案 9，只收到 partial「九 十(0.67)」后沉默，防抖提交的是「九」且判对；真「九十」(0.99) 仍提交 90；中间结果不进识别框。
// 样本数据来自 11-04 平板实录（.shots/inject_voicelog.mjs）。用法：node .shots/verify_vosk_tail.mjs
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
  window.webkitSpeechRecognition = window.SpeechRecognition = function () { this.start = () => {}; this.stop = () => {}; this.abort = () => {}; };
})()` });
await b.nav(b.menu);
await b.preserve();
await b.boot(1, 'audio');

const W = (...a) => a.map(([w, c]) => ({ w, c, s: 0, e: 0 }));
const CASES = [
  ['真机：说九时中间结果多出十(0.67)', 'partial', '九 十', W(['九', 1], ['十', 0.67]), '九'],
  ['真机：真「九十」中间结果(0.99)保留', 'partial', '九 十', W(['九', 1], ['十', 0.99]), '九 十'],
  ['真机：多出的两(0.68)被滤，真十(1.00)保留', 'partial', '九 十 两', W(['九', 1], ['十', 1], ['两', 0.68]), '九 十'],
  ['连续两个低置信尾词都滤掉', 'partial', '九 十 两', W(['九', 1], ['十', 0.67], ['两', 0.68]), '九'],
  ['真机：首词置信度低(0.84)也保留', 'partial', '九', W(['九', 0.84]), '九'],
  ['首词低置信，其后的低置信尾词仍滤掉', 'partial', '九 十', W(['九', 0.56], ['十', 0.67]), '九'],
  ['中间的低置信词不动（只管末尾）', 'partial', '七 十 二', W(['七', 1], ['十', 0.6], ['二', 1]), '七 十 二'],
  ['最终结果照单全收（二十，十=0.63）', 'final', '二 十', W(['二', 0.92], ['十', 0.63]), '二 十'],
  ['最终结果照单全收（四=0.56）', 'final', '四 五', W(['四', 0.56], ['五', 1]), '四 五'],
  ['旧插件没有 words：原样', 'partial', '九 十', undefined, '九 十'],
  ['空 words：原样', 'partial', '九 十', [], '九 十'],
];
const bad = [];
for (const [name, kind, text, words, want] of CASES) {
  const got = await b.ev(`mgVoskText(${JSON.stringify(text)}, ${kind === 'final'}, ${JSON.stringify(words)})`);
  if (got !== want) bad.push({ name, got, want });
}
P(bad.length === 0, `mgVoskText：${CASES.length} 个真机样本全部符合预期`, bad);

// B. 走真实的 VoskRecognition._feed
const feed = (kind, text, words) => b.ev(`(() => { const v = new VoskRecognition(); v._started = true; v.stop = () => {}; const out = [];
  v.onresult = e => out.push(e.results[0][0].transcript + '|' + e.results[0].isFinal);
  v._feed(${JSON.stringify(text)}, ${kind === 'final'}, ${JSON.stringify(words)}); return out; })()`);
let r = await feed('partial', '九 十', W(['九', 1], ['十', 0.67]));
P(r.length === 1 && r[0] === '九|false', '_feed：尾音词被滤，上报的是「九」', r);
r = await feed('partial', '九', W(['九', 0.84]));
P(r.length === 1 && r[0] === '九|false', '_feed：首词置信度 0.84 照常上报（真机实录，之前会被整条吞掉）', r);
r = await feed('final', '九 十', W(['九', 1], ['十', 1]));
P(r.length === 1 && r[0] === '九十|true', '_feed：最终结果「九十」原样上报', r);

// C. 两套 onresult（L1 VoiceMixin / L3 VoiceGame）：沉默后防抖提交
for (const lv of [1, 3]) {
  const proc = lv === 3 ? '_processVoiceResult' : '_processVoiceAnswer';
  const HEARD = lv === 3 ? 'voice-heard-text' : 'float-voice-heard';
  await b.boot(lv, 'audio');
  const ready = await b.ev(`!!(window._currentGame && window._currentGame.recognition && window._currentGame.recognition.onresult)`);
  P(ready, `L${lv} 假 recognition 就绪`);
  if (!ready) continue;
  await b.ev(`(() => { const g = window._currentGame; g._isNativeVoice = true; g._ttsEndTime = 0; g._ttsSpeaking = false; g.recognition.stop = () => {}; g.locked = false;
    window.__v = new VoskRecognition(); window.__v._started = true; window.__v.stop = () => {}; window.__v.onresult = g.recognition.onresult;
    window.__proc = []; g.${proc} = r => { window.__proc.push([...r].map(x => x.transcript).join('|')); }; true; })()`);
  const run = (text, words) => b.ev(`(() => { const g = window._currentGame; g._interimFired = false; clearTimeout(g._commitTimer); window.__proc.length = 0;
    window.__v._feed(${JSON.stringify(text)}, false, ${JSON.stringify(words)}); return document.getElementById('${HEARD}').textContent; })()`);
  const shown = await run('九 十', W(['九', 1], ['十', 0.67]));
  P(shown === '', `L${lv} 说九、中间结果多出十(0.67)：识别框不显示中间结果`, shown);
  await b.sleep(900);
  const p1 = await b.ev('window.__proc.slice()');
  P(p1.length === 1 && p1[0] === '九', `L${lv} 沉默后防抖提交的是「九」`, p1);
  const shown2 = await run('九 十', W(['九', 1], ['十', 0.99]));
  P(shown2 === '', `L${lv} 真「九十」(0.99) 的中间结果：识别框同样不显示`, shown2);
  await b.sleep(900);
  const p2 = await b.ev('window.__proc.slice()');
  P(p2.length === 1 && p2[0] === '九十', `L${lv} 真「九十」：防抖提交的是「九十」`, p2);
  await b.ev(`(() => { delete window._currentGame.${proc}; true; })()`);
  await b.ev(`(() => { const g = window._currentGame; window.__ok = 0; window.__bad = 0;
    window.mgOnCorrect = (o => function () { window.__ok++; return o.apply(this, arguments); })(window.mgOnCorrect);
    window.mgOnWrong = (o => function () { window.__bad++; return o.apply(this, arguments); })(window.mgOnWrong);
    g.currentAnswer = 9; g.locked = false; g._interimFired = false; clearTimeout(g._commitTimer);
    window.__v._feed('九 十', false, ${JSON.stringify(W(['九', 1], ['十', 0.67]))}); true; })()`);
  await b.sleep(900);
  const ok = await b.ev(`({ ok: window.__ok, bad: window.__bad, heard: document.getElementById('${HEARD}').textContent })`);
  P(ok.ok === 1 && ok.bad === 0, `L${lv} 答案 9、中间结果「九 十(0.67)」后沉默：判对`, ok);
  P(ok.heard === '说的是：9', `L${lv} 提交后框里是「说的是：9」`, ok.heard);
}
await b.restore();
P(b.errors.length === 0, '无页面脚本异常', b.errors.slice(0, 3));
await b.close();
finish('VOSK TAIL');
