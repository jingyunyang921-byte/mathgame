// 错题重练（第 0 关）的开场卡：和第 1~6 关同一套图画书风格——小兔头像 + 三步图示（看题/听题 → 写答案/说答案 → 错题变少）
// + 带萌蛋的奖励牌 + 一句规则语音（每次启动 App 只念第一回）。速算开场卡不变，答题页 / 结算 / 菜单错题本不动。
// 用法：node .shots/verify_review_intro.mjs（需要本地 headless Chrome :9333 + http.server :8000）
import { petBrowser, verdicts } from './pet_browser.mjs';
import { bundleMissing } from './bundle_tts.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();

const STUB = `(() => { window.__said = []; window._mgSpeakAwait = (t) => { window.__said.push(t); return Promise.resolve(); }; return true; })()`;
const OPEN = (lv, mode, sprint) => b.ev(`(() => { window.__said.length = 0; window.__done = false; runIntroSequence(${lv}, ${JSON.stringify(mode)}, ${sprint}).then(() => { window.__done = true; }); return true; })()`);
const INFO = `(() => {
  const box = document.getElementById('intro-box'), br = box.getBoundingClientRect(), vw = innerWidth, vh = innerHeight;
  const inView = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.left >= -1 && r.top >= -1 && r.right <= vw + 1 && r.bottom <= vh + 1; };
  const inBox = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.left >= br.left - 1 && r.right <= br.right + 1; };
  const st = [...box.querySelectorAll('.st')];
  const pr = document.getElementById('intro-prize');
  return {
    shown: getComputedStyle(document.getElementById('intro-overlay')).display !== 'none',
    steps: box.classList.contains('intro-steps'),
    title: document.getElementById('intro-title').textContent,
    avatar: (document.querySelector('#intro-icon use') || { getAttribute: () => null }).getAttribute('href'),
    labels: st.map(x => x.querySelector('span').textContent),
    nums: st.map(x => x.querySelector('i').textContent),
    uses: st.map(x => [...x.querySelectorAll('.st-c use')].map(u => u.getAttribute('href'))),
    badge: !!box.querySelector('.st-c > svg.st-ck'),
    eggInThird: !!box.querySelector('.st-egg'),
    prizeEgg: !!pr.querySelector('svg.in-egg'), prizeText: pr.textContent.trim(),
    okTitle: inView(document.getElementById('intro-title')), okRow: inView(box.querySelector('.st-row')), okPrize: inView(pr),
    labelsIn: st.every(x => inBox(x.querySelector('span'))),
    scroll: box.scrollHeight - box.clientHeight,
    said: window.__said.slice()
  };
})()`;
const realClick = async sel => {
  const pt = await b.ev(`(() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return { x: Math.round(r.left + 6), y: Math.round(r.top + 6) }; })()`);
  await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
  await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
};
const closeIntro = async () => { await b.ev(`window._mgSkipIntro && window._mgSkipIntro(); true`); await b.sleep(120); };

try {
  await b.nav(b.menu); await b.preserve();
  await b.viewport(960, 600);
  await b.boot(1, 'visual');
  await b.poll(`getComputedStyle(document.getElementById('intro-overlay')).display === 'none'`, 8000).catch(() => {});
  await b.ev(STUB);
  const errs0 = b.errors.length;

  // ---------- A. 视算：图画书开场卡 ----------
  await b.ev(`sessionStorage.removeItem('mgReviewSaid'); true`);
  await OPEN(0, 'visual', false);
  await b.sleep(150);
  let r = await b.ev(INFO);
  P(r.shown && r.steps, 'A 第 0 关开场卡出现，用三步图示版式（intro-steps）', r);
  P(r.title === '错题重练 · 再来一遍', 'A 标题不变', r.title);
  P(r.avatar === '#p-bunny', 'A 头像是小兔（和答题页的朋友一致）', r.avatar);
  P(JSON.stringify(r.labels) === JSON.stringify(['看题', '写答案', '错题变少']) && JSON.stringify(r.nums) === '["1","2","3"]', 'A 三步：看题 → 写答案 → 错题变少', [r.labels, r.nums]);
  P(r.uses[0].includes('#i-eye') && r.uses[1].includes('#i-pencil') && r.uses[2].includes('#i-book') && r.uses[2].includes('#i-check') && r.badge, 'A 三步都有图：眼睛 / 铅笔 / 书 + 对勾小徽章', r.uses);
  P(!r.eggInThird, 'A 第三步不是「材料进窝」的蛋（错题重练不带材料）', r);
  P(r.prizeEgg && /萌蛋 \+\d+ 点能量/.test(r.prizeText) && /累计答对 5 题/.test(r.prizeText), 'A 奖励牌：萌蛋图 + 「累计答对 5 题打卡，萌蛋 +N 点能量」', r.prizeText);
  P(r.okTitle && r.okRow && r.okPrize && r.labelsIn, 'A 960×600：标题、三步、奖励牌都在屏内，字不出卡', r);
  P(JSON.stringify(r.said) === JSON.stringify(['写对答案，错题变少！']), 'A 第一次：念「写对答案，错题变少！」', r.said);
  P(await b.ev(`sessionStorage.getItem('mgReviewSaid') === '1' && localStorage.getItem('mgReviewSaid') === null`), 'A 「已念过」只记在 sessionStorage，不新增 localStorage 键');

  // ---------- B. 点一下跳过：0.6 秒内忽略，之后收卡 ----------
  // 中间不能夹截图：真机截图要好几秒，会越过 0.6 秒防误触线甚至 2.6 秒自动收卡
  await realClick('#intro-overlay');
  await b.sleep(100);
  P(await b.ev(`getComputedStyle(document.getElementById('intro-overlay')).display !== 'none' && window.__done === false`), 'B 刚进场就点：不跳过（防误触）');
  await b.sleep(600);
  await realClick('#intro-overlay');
  await b.poll(`window.__done === true`, 3000).catch(() => {});
  P(await b.ev(`window.__done === true && getComputedStyle(document.getElementById('intro-overlay')).display === 'none'`), 'B 过了 0.6 秒真点一下：卡收起，流程继续');

  // ---------- C. 同一次启动里第二回：不再念，卡还是一样 ----------
  await OPEN(0, 'visual', false);
  await b.sleep(150);
  r = await b.ev(INFO);
  P(r.steps && r.said.length === 0 && r.labels[2] === '错题变少', 'C 第二回：图示照旧，规则语音不再念', r.said);
  await b.shot('review_intro_visual');
  await closeIntro();

  // ---------- D. 听算：说答案 + 另一句语音 ----------
  await b.ev(`sessionStorage.removeItem('mgReviewSaid'); true`);
  await OPEN(0, 'audio', false);
  await b.sleep(150);
  r = await b.ev(INFO);
  P(JSON.stringify(r.labels) === JSON.stringify(['听题', '说答案', '错题变少']) && r.uses[0].includes('#i-ear') && r.uses[1].includes('#i-mic'), 'D 听算：听题 → 说答案 → 错题变少', [r.labels, r.uses]);
  P(JSON.stringify(r.said) === JSON.stringify(['说对答案，错题变少！']), 'D 听算念「说对答案，错题变少！」', r.said);
  await closeIntro();

  // ---------- E. 不该变的 ----------
  await OPEN(1, 'visual', false);
  await b.sleep(150);
  r = await b.ev(INFO);
  P(r.steps && r.eggInThird && r.labels.length === 3 && r.avatar === '#p-bunny', 'E 第 1 关开场卡仍是「材料进窝」版', r);
  await closeIntro();
  P(await b.ev(`mgIntroSteps(0, 'visual', true) === null`), 'E 一分钟速算开场卡不用三步图示');
  await OPEN(0, 'visual', true);
  await b.sleep(150);
  r = await b.ev(INFO);
  P(r.shown && !r.steps, 'E 速算开场卡仍是文字规则版式', r);
  await closeIntro();

  // ---------- F. 小屏幕 / 竖屏 ----------
  for (const [w, h] of [[1000, 576], [900, 500], [800, 480], [412, 915]]) {
    await b.viewport(w, h);
    for (const mode of ['visual', 'audio']) {
      await b.ev(`sessionStorage.removeItem('mgReviewSaid'); true`);
      await OPEN(0, mode, false);
      await b.sleep(200);
      r = await b.ev(INFO);
      P(r.okTitle && r.okRow && r.okPrize && r.labelsIn && r.scroll <= 1, `F ${w}×${h} ${mode}：标题、三步、奖励牌在屏内，卡内不用滚动`, r);
      if (mode === 'audio') await b.shot(`review_intro_${w}x${h}`);
      await closeIntro();
    }
  }

  // ---------- G. 语音登记且已内置 ----------
  const rule = await b.ev(`[MG_RULE_SAY[0].visual, MG_RULE_SAY[0].audio]`);
  const lines = await b.ev(`mgTtsPrefetchLines()`);
  P(rule.length === 2 && rule.every(s => lines.includes(s)), 'G 两句规则语音都登记在 mgTtsPrefetchLines（离线可念）', rule);
  P(bundleMissing(rule).length === 0, 'G 两句规则语音都已打进 APK（缺了就跑 node .shots/bundle_tts.mjs）', bundleMissing(rule));
  P(rule.every(s => s.split(/[，。！？、]/).filter(Boolean).every(t => t.length <= 10)), 'G 每个小句不超过 10 字', rule);

  P(b.errors.length === errs0, '全程没有未捕获异常', b.errors.slice(errs0));
} catch (err) {
  P(false, '闸门异常: ' + (err && err.message || err));
} finally {
  try { await b.restore(); } catch (x) {}
  await b.close();
}
finish('REVIEW INTRO');
