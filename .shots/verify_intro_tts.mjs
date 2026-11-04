// 每关开场：不念剧情开场白；规则卡 2.6 秒静默 + 点一下/返回键跳过；卡收起后只念「本关一句短话」+ 3-2-1。
// 规则卡里有「通关带回什么」奖励行（#intro-prize），说清练口算是为了帮朋友找材料。
// 本地用 speechSynthesis 桩记录念了什么；真机包一层 Capacitor Tts.speak 记录。
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
const LOCAL = !b.device;
const OPEN = { 1: '和小兔答题，给萌蛋找暖草！', 2: '和小松鼠答题，给萌蛋捡松果！', 3: '和小鸟答题，给萌蛋找音符！', 4: '和小鹿答题，给萌蛋捡落叶！', 5: '和小海龟答题，给萌蛋捡贝壳！', 6: '和小刺猬答题，给萌蛋找萤火！', sprint: '一分钟速算，冲呀！' };
const PRIZE = { 1: '暖草', 2: '松果', 3: '小音符', 4: '落叶', 5: '小贝壳', 6: '萤火' };
const MATS_FRIEND = { 1: '小兔', 2: '小松鼠', 3: '小鸟', 4: '小鹿', 5: '小海龟', 6: '小刺猬' };
const SCENE = { 1: '暖草坡', 2: '松果林', 3: '音符谷', 4: '落叶山路', 5: '贝壳海岸', 6: '萤火小屋' };
const TITLE = { 1: '10以内加减 · 暖草坡', 2: '20以内加减 · 松果林', 3: '100以内加减 · 音符谷', 4: '表内乘除 · 落叶山路', 5: '两位数乘除 · 贝壳海岸', 6: '四则综合 · 萤火小屋' };

const STUB = `(() => {
  window.__spoken = [];
  if (${LOCAL} && window.speechSynthesis) {
    const ss = window.speechSynthesis;
    ss.speak = u => { window.__spoken.push({ t: u.text, at: Date.now() }); setTimeout(() => u.onend && u.onend(), 300); };
    ss.cancel = () => {};
  }
  const T = (window.__intro = { shown: 0, hidden: 0, early: null });
  setInterval(() => {
    const tts = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Tts;
    if (tts && tts.speak && !tts.__spy) { const o = tts.speak.bind(tts); tts.speak = function (a) { window.__spoken.push({ t: a && a.text, at: Date.now() }); return o(a); }; tts.__spy = true; }
    const bd = document.getElementById('mg-countdown-badge'), cp = document.getElementById('mg-countdown-cap');
    if (bd && cp && bd.style.display === 'flex' && !T.capSeen) {
      T.capSeen = true; T.cap = cp.textContent; T.capShown = cp.style.display;
      const r = cp.getBoundingClientRect(), br = bd.getBoundingClientRect();
      T.capBelow = r.top >= br.bottom - 1; T.capIn = r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
    }
    const o = document.getElementById('intro-overlay'); if (!o) return;
    if (!o.__mo) { o.__mo = true; new MutationObserver(() => { if (T.shown && o.style.display !== 'flex' && !T.hidden) T.hidden = Date.now(); }).observe(o, { attributes: true, attributeFilter: ['style'] }); }
    const on = o.style.display === 'flex';
    if (on && !T.shown) {
      T.shown = Date.now();
      const pz = document.getElementById('intro-prize'); T.prize = pz ? pz.textContent.trim() : ''; T.prizeSvg = !!(pz && pz.querySelector('svg'));
      T.title = document.getElementById('intro-title').textContent;
      if (sessionStorage.getItem('__earlyClick') === '1') { o.click(); T.early = o.style.display; }
    }
    if (T.shown && !on && !T.hidden) T.hidden = Date.now();
  }, 10);
})()`;
let stubId;
const load = async (o = {}) => {
  const { level = 1, mode = 'visual', sprint = false, early = false } = o;
  await b.nav(b.menu);
  await b.ev(`(() => {
    ['mathgameStars', 'mathgamePet', 'mathgameSettings'].forEach(k => localStorage.removeItem(k));
    sessionStorage.clear();
    sessionStorage.setItem('gameLevel', '${sprint ? 0 : level}'); sessionStorage.setItem('gameMode', '${mode}');
    ${sprint ? `sessionStorage.setItem('mgSprint', '1');` : ''}
    ${early ? `sessionStorage.setItem('__earlyClick', '1');` : ''}
    return true; })()`);
  await b.nav(b.game);
  await b.ev('window._skipOcrLoading && window._skipOcrLoading();true');
  await b.poll('window.__intro && window.__intro.shown > 0', 20000);
};
const hidden = () => b.poll('window.__intro.hidden > 0', 20000);
const countdownDone = () => b.poll('!!window._currentGame && window._currentGame._countdownActive === false', 30000);
const info = () => b.ev(`(() => { const T = window.__intro;
  const pz = document.getElementById('intro-prize');
  return { dur: T.hidden ? T.hidden - T.shown : null, early: T.early, skipFn: typeof window._mgSkipIntro,
    before: window.__spoken.filter(x => !T.hidden || x.at < T.hidden - 50).map(x => x.t), all: window.__spoken.map(x => x.t),
    prize: T.prize || '', prizeSvg: !!T.prizeSvg }; })()`);
const capInfo = () => b.ev(`(() => { const T = window.__intro; return { title: T.title, cap: T.cap, capShown: T.capShown, capBelow: T.capBelow, capIn: T.capIn }; })()`);
try {
  await b.nav(b.menu); await b.preserve();
  ({ identifier: stubId } = await b.send('Page.addScriptToEvaluateOnNewDocument', { source: STUB }));

  // ---------- 念白代码已删干净 ----------
  await load({ level: 1 }); await hidden();
  const st = await b.ev(`({ speech: typeof MG_INTRO_SPEECH, line: typeof mgIntroLine, speak: typeof mgIntroSpeak,
    hint: !!document.getElementById('intro-skip-hint'), heard: sessionStorage.getItem('mgIntroHeard') })`);
  P(st.speech === 'undefined' && st.line === 'undefined' && st.speak === 'undefined', '开场白念白函数/文案表已删除', st);
  P(!st.hint && st.heard === null, '没有「点一下跳过」提示行，也不再记「念过完整版」', st);

  // ---------- 第 1 关：规则卡 2.6 秒，期间一个字都不念；卡收起后只念本关一句短话 ----------
  const a1 = await info();
  P(a1.dur >= 2400 && a1.dur < 3600, '第 1 关规则卡停满约 2.6 秒', a1.dur);
  P(a1.before.length === 0, '规则卡显示期间不念任何话', a1.before);
  await countdownDone();
  const a1b = await b.ev(`window.__spoken.map(x => x.t)`);
  P(a1b.length === 1 && a1b[0] === OPEN[1], '卡收起后只念「本关一句短话」+ 3-2-1，不再是通用的一句', a1b);
  P(a1b[0].length <= 15 && /^和.+答题，给萌蛋.+！$/.test(a1b[0]), '开场句式「和谁答题，给萌蛋找什么」且在 15 字以内（不含标点约 10~12 字）', a1b[0]);
  P(a1.prizeSvg && a1.prize.includes(PRIZE[1].replace(/^小/, '')) && /答对\d+题，送.+给蛋/.test(a1.prize), '第 1 关规则卡有目标行：答对几题送什么给蛋', a1.prize);
  const c1 = await capInfo();
  P(c1.title === TITLE[1] && c1.cap === SCENE[1] && c1.capShown === 'block' && c1.capBelow && c1.capIn, '第 1 关：规则卡标题「运算 · 场景名」，3-2-1 圆圈下方有场景小字且在屏内', c1);

  // ---------- 2~6 关各念各的 ----------
  for (const lv of [2, 3, 4, 5, 6]) {
    await load({ level: lv }); await hidden();
    const r = await info();
    await countdownDone();
    const sp = await b.ev(`window.__spoken.map(x => x.t)`);
    P(r.before.length === 0 && r.dur >= 2400 && r.dur < 3600, `第 ${lv} 关：规则卡 2.6 秒、静默`, { dur: r.dur, before: r.before });
    P(sp.length === 1 && sp[0] === OPEN[lv], `第 ${lv} 关：卡收起后念「${OPEN[lv]}」`, sp);
    P(sp[0].length <= 15 && sp[0].startsWith('和' + MATS_FRIEND[lv]) && sp[0].includes(PRIZE[lv].replace(/^小/, '')), `第 ${lv} 关：开场句带本关小动物和材料，15 字以内`, sp[0]);
    P(r.prizeSvg && r.prize.includes(PRIZE[lv].replace(/^小/, '')) && /答对\d+题，送.+给蛋/.test(r.prize), `第 ${lv} 关规则卡有目标行：${PRIZE[lv]}`, r.prize);
    const c = await capInfo();
    P(c.title === TITLE[lv] && c.cap === SCENE[lv] && c.capShown === 'block' && c.capBelow && c.capIn, `第 ${lv} 关：标题「${TITLE[lv]}」，倒计时小字「${SCENE[lv]}」`, c);
  }

  // ---------- 第 3 关视算：标题同样是「音符谷」（图标仍是铅笔） ----------
  await load({ level: 3, mode: 'visual' }); await hidden(); await countdownDone();
  const c3v = await capInfo();
  P(c3v.title === TITLE[3] && c3v.cap === SCENE[3], '第 3 关视算：标题与场景小字同第 3 关听算', c3v);

  // ---------- 速算冲刺 ----------
  await load({ sprint: true }); await hidden();
  const sp = await info();
  await countdownDone();
  const spAll = await b.ev(`window.__spoken.map(x => x.t)`);
  const csp = await capInfo();
  P(sp.before.length === 0 && sp.dur < 3600, '一分钟速算：开场卡不念', sp);
  P(spAll.length === 1 && spAll[0] === OPEN.sprint, '一分钟速算：卡收起后念「一分钟速算，冲呀！」', spAll);
  P(csp.cap === '' && csp.capShown === 'none', '一分钟速算：倒计时下没有场景小字', csp);
  P(sp.prizeSvg && /纪录/.test(sp.prize) && !/给蛋/.test(sp.prize), '速算规则卡的奖励行讲追纪录目标（旗是 SVG，没有材料）', sp.prize);

  // ---------- 跳过：刚进场 0.6s 内忽略，之后点一下收卡 ----------
  await load({ level: 4, early: true });
  await b.sleep(700);
  const e1 = await info();
  P(e1.early === 'flex' && e1.dur === null && e1.skipFn === 'function', '刚进场就点（防误触）：不跳过', e1);
  await b.ev(`document.getElementById('intro-overlay').click();true`);
  await hidden();
  const e2 = await info();
  P(e2.dur >= 600 && e2.dur < 1500 && e2.skipFn === 'object', '之后点一下：规则卡立刻收，_mgSkipIntro 清空', e2);
  await b.poll('!!window._currentGame', 20000);

  // ---------- 返回键：硬件返回走 _mgSkipIntro ----------
  await load({ level: 5 });
  await b.sleep(700);
  const k1 = await b.ev(`typeof window._mgSkipIntro`);
  await b.ev(`window._mgSkipIntro();true`); await hidden();
  const k2 = await info();
  P(k1 === 'function' && k2.skipFn === 'object' && k2.dur < 1500, '开场卡期间返回键 = 跳过', { k1, k2 });

  // ---------- 开场卡不溢出 ----------
  const lay = () => b.ev(`(() => { const bx = document.getElementById('intro-box'), r = bx.getBoundingClientRect();
    return { vw: innerWidth, vh: innerHeight, top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), over: bx.scrollHeight - bx.clientHeight }; })()`);
  for (const [w, h] of (LOCAL ? [[1000, 576], [900, 500], [412, 915]] : [[960, 576]])) {
    await b.viewport(w, h);
    for (const lv of [6, 3]) {
      await load({ level: lv });
      await b.sleep(900);
      const m = await lay();
      P(m.top >= 0 && m.bottom <= m.vh && m.left >= 0 && m.right <= m.vw && m.over <= 1, `${w}×${h} 第 ${lv} 关开场卡：不溢出`, m);
      if (lv === 6) await b.shot(`intro_${w}x${h}`);
      await b.ev(`document.getElementById('intro-overlay').click();true`);
      await hidden();
    }
  }
  await b.viewport(1000, 576);

  // ---------- 通关那句话：和本关朋友把材料带回来给萌蛋，不再说「闯关成功」 ----------
  const win = await b.ev(`(() => { const r = {}; for (let i = 0; i < 40; i++) for (const lv of [0, 1, 2, 3, 4, 5, 6]) (r[lv] = r[lv] || new Set()).add(mgWinCue(lv)); const o = {}; for (const k in r) o[k] = [...r[k]]; return o; })()`);
  for (const lv of [1, 2, 3, 4, 5, 6]) {
    const ls = win[lv];
    P(ls.length >= 2 && ls.every(t => t.includes(PRIZE[lv]) && !/闯关/.test(t) && t.length <= 14), `第 ${lv} 关通关那句话：都点到「${PRIZE[lv]}」、不说闯关、不超过 14 字`, ls);
    P(ls.some(t => t.includes(MATS_FRIEND[lv])), `第 ${lv} 关通关那句话：有一句点到朋友「${MATS_FRIEND[lv]}」`, ls);
  }
  P(win[0].length >= 1 && win[0].every(t => !/闯关|萌蛋收到|送给萌蛋|找到/.test(t)), '错题重练通关：只念通用夸奖，不带材料故事', win[0]);

  P(b.errors.length === 0, '开场全流程无脚本异常', b.errors);
} finally {
  try { if (stubId) await b.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: stubId }); } catch (e) {}
  try { await b.viewport(1000, 576); await b.restore(); } finally { await b.close(); }
}
finish('INTRO TTS');
