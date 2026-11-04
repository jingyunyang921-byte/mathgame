// L1-L3 主场景闸门：右侧空列里的小画（喂小兔 / 爬树摘松果 / 点亮旋律）随答对前进；
// 平静模式下小动物不当对手（不跑计时/不亮提示/不封顶星数）；摆位不压题卡/手写卡/听算卡。
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
const COMBOS = [
  { lv: 1, mode: 'visual' }, { lv: 2, mode: 'visual' }, { lv: 3, mode: 'visual' },
  { lv: 1, mode: 'audio' }, { lv: 2, mode: 'audio' }, { lv: 3, mode: 'audio' },
];
const WIN = { 1: /小兔吃得饱饱的/, 2: /小松鼠摘到松果啦/, 3: /小鸟唱完这首歌啦/ };
const info = `(() => {
  const el = document.getElementById('mg-scene'); if (!el) return null;
  const r = el.getBoundingClientRect(), cs = getComputedStyle(el), cv = el.querySelector('canvas');
  let opaque = 0, sig = 0;
  if (cv.width && cv.height) {
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 200) opaque++;
    for (let i = 0; i < d.length; i += 52) sig = (Math.imul(sig, 31) + d[i]) | 0;
    opaque /= d.length / 4;
  }
  const cards = ['#question-card', '#canvas-wrapper', '.mg-listen-card', '#float-voice-overlay'].map(s => document.querySelector(s)).filter(Boolean)
    .map(n => n.getBoundingClientRect()).filter(q => q.width > 40 && q.height > 20 && q.bottom > r.top);
  const skips = ['#mg-listen-skip', '#skip-btn'].map(s => document.querySelector(s)).filter(n => n && getComputedStyle(n).display !== 'none' && n.getBoundingClientRect().width > 0);
  const skipHit = skips.some(n => { const q = n.getBoundingClientRect(); return q.left < r.right && q.right > r.left && q.top < r.bottom && q.bottom > r.top; });
  const skipCovered = skips.some(n => { const q = n.getBoundingClientRect(), t = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return !(t && (t === n || n.contains(t))); });
  const qsb = Math.round(document.getElementById('question-section').getBoundingClientRect().bottom);
  const ans = ['#canvas-wrapper', '.mg-listen-card', '#float-voice-overlay', '#voice-mic-area'].map(s => document.querySelector(s)).filter(Boolean)
    .map(n => n.getBoundingClientRect()).filter(q => q.width > 40 && q.height > 40 && q.bottom > qsb);
  const aL = Math.round(Math.min(1e9, ...ans.map(q => q.left))), aR = Math.round(Math.max(0, ...ans.map(q => q.right)));
  const slot = document.getElementById('mg-egg-slot'), sq = slot && slot.getClientRects().length ? slot.getBoundingClientRect() : null;
  const sideCvs = Array.from(document.querySelectorAll('#mg-side canvas')).filter(c => getComputedStyle(c).display !== 'none');
  sideCvs.forEach(c => { c._pe = c.style.pointerEvents; c.style.pointerEvents = 'auto'; });
  const sideCovers = skips.some(n => { const q = n.getBoundingClientRect(), t = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return !(t && (t === n || n.contains(t))); });
  sideCvs.forEach(c => { c.style.pointerEvents = c._pe || ''; });
  const sides = sideCvs.map(c => { const q = c.getBoundingClientRect(); let op = 0;
    if (c.width && c.height) { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 4) if (d[i] > 200) op++; op /= d.length / 4; }
    return { side: c.className, l: Math.round(q.left), t: Math.round(q.top), r: Math.round(q.right), b: Math.round(q.bottom), op }; });
  return { shown: cs.display !== 'none', x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
    vw: innerWidth, vh: innerHeight, opaque, sig, maxRight: Math.round(Math.max(0, ...cards.map(q => q.right))), n: MG_SC.n,
    calm: document.body.classList.contains('mg-calm'), skips: skips.length, skipHit, skipCovered, qsb, aL, aR, sideCovers, sides,
    slot: sq && [Math.round(sq.left), Math.round(sq.top), Math.round(sq.right), Math.round(sq.bottom)] };
})()`;
const answer = mode => mode === 'audio'
  ? `(() => { const g = window._currentGame; if (typeof g._voiceOnCorrect === 'function') g._voiceOnCorrect(); else g._processVoiceResult([{ transcript: String(g.currentAnswer) }]); return true; })()`
  : `(async () => { const g = window._currentGame; g.hasContent = true; g.recognizer.recognize = async () => g.currentAnswer; await g._submit(); return g.playerScore; })()`;
try {
  await b.nav(b.menu); await b.preserve();
  await b.viewport(960, 576);
  for (const c of COMBOS) {
    const tag = `L${c.lv} ${c.mode}`;
    await b.boot(c.lv, c.mode);
    await b.sleep(500);
    const i0 = await b.ev(info);
    P(i0 && i0.shown && i0.calm, `${tag}：场景小画已挂上且是平静模式`, i0);
    P(i0 && i0.w >= 150 && i0.h >= 84 && i0.x + i0.w <= i0.vw && i0.y + i0.h <= i0.vh, `${tag}：尺寸够大且完整在视口内`, i0 && [i0.x, i0.y, i0.w, i0.h]);
    P(i0 && i0.y + i0.h <= i0.qsb, `${tag}：小画不超出出题区（底边不过虚线）`, i0 && [i0.y + i0.h, i0.qsb]);
    P(i0 && i0.x >= i0.maxRight, `${tag}：不压题卡/手写卡/听算卡`, i0 && [i0.x, i0.maxRight]);
    const sl = i0 && i0.sides.find(s => s.side === 'l'), sr = i0 && i0.sides.find(s => s.side === 'r');
    P(sl && sr, `${tag}：答题区左右两侧都有小景`, i0 && i0.sides.map(s => s.side));
    P(sl && sr && sl.r <= i0.aL && sr.l >= i0.aR && sl.t >= i0.qsb && sr.t >= i0.qsb && sl.b <= i0.vh && sr.b <= i0.vh, `${tag}：两侧小景在答题区内且不压答题卡`, i0 && [sl, sr, i0.aL, i0.aR, i0.qsb]);
    P(sl && sr && sl.op > 0.2 && sr.op > 0.2, `${tag}：两侧小景有实际画面（山坡+物件）`, sl && sr && [sl.op, sr.op]);
    P(sl && (!i0.slot || sl.t >= i0.slot[3] || sl.r <= i0.slot[0] || sl.l >= i0.slot[2]), `${tag}：左侧小景不压蛋位`, i0 && [sl, i0.slot]);
    P(i0 && !i0.sideCovers, `${tag}：两侧小景不盖住「跳过这题」（含 pointer-events 打开后的命中检测）`, i0 && i0.sideCovers);
    P(i0 && !i0.skipHit && !i0.skipCovered, `${tag}：「跳过这题」不被小画压住/遮挡（可见 ${i0 && i0.skips} 个）`, i0 && [i0.skips, i0.skipHit, i0.skipCovered]);
    P(i0 && i0.opaque > 0.98, `${tag}：画布铺满不透明`, i0 && i0.opaque);
    const calm = await b.ev(`(() => { const g = window._currentGame, tok = document.getElementById('pk-tok-m');
      setDangerBorder(true);
      return { tokHidden: getComputedStyle(tok).display === 'none', timer: g.monsterTimer == null, ms: g.monsterScore,
        danger: document.getElementById('pk-section').classList.contains('danger-mode'), urgent: document.getElementById('race-label').classList.contains('urgent') }; })()`);
    P(calm.tokHidden && calm.timer && calm.ms === 0, `${tag}：小动物不当对手（token 隐藏/计时器不跑）`, calm);
    P(!calm.danger && !calm.urgent, `${tag}：setDangerBorder(true) 也不亮提示`, calm);
    // 逐题前进：每答对一题，场景数字 +1 且画面变化
    const sigs = [i0.sig];
    for (let k = 1; k <= 3; k++) {
      await b.ev(answer(c.mode)); await b.sleep(1500);
      const ik = await b.ev(info);
      P(ik && ik.n === k && !sigs.includes(ik.sig), `${tag}：答对第 ${k} 题 → 场景前进到 ${k}，画面变化`, ik && [ik.n, ik.sig]);
      sigs.push(ik.sig);
      if (k === 2) await b.shot(`scene_l${c.lv}_${c.mode}_${k}`);
    }
    await b.ev(`(() => { const g = window._currentGame; g.playerScore = 9; for (let i = 0; i < 9; i++) g._fillDot('p', i); return true; })()`);
    await b.sleep(300);
    await b.ev(answer(c.mode));
    await b.poll(`document.getElementById('overlay').classList.contains('show')`, 6000);
    await b.sleep(500);
    const end = await b.ev(`(() => { const q = id => document.getElementById(id), g = window._currentGame;
      return { shown: q('overlay').classList.contains('show'), title: q('overlay-title').className, msg: q('overlay-msg').textContent.trim(), n: MG_SC.n,
        stars: document.querySelectorAll('#overlay-stars .star.on').length }; })()`);
    P(end.shown && end.title === 'win' && WIN[c.lv].test(end.msg), `${tag}：通关成绩行是本关口吻`, end);
    P(end.n === 10, `${tag}：十题满，场景数字 10`, end.n);
    await b.shot(`scene_l${c.lv}_${c.mode}_done`);
  }

  // 小动物先到终点不再封顶（L1-L3）：全对 → 3 星
  await b.boot(1, 'visual');
  await b.ev(`(() => { const g = window._currentGame;
    _mgWrong = 0; _mgCorrect = 10; _mgMaxStreak = 10; _mgRoundStart = Date.now() - 9000; g.monsterFinished = true; g.playerScore = 10;
    g._endGame(); return true; })()`);
  await b.poll(`document.getElementById('overlay').classList.contains('show')`, 4000);
  const st = await b.ev(`(() => { const g = window._currentGame; return g._mgRoundSnap ? g._mgRoundSnap.stars : null; })()`);
  P(st === 3, 'L1：即使 monsterFinished=true，全对仍是 3 星（不再封顶）', st);

  // L4 不挂小画、不是平静模式、没有小鹿计时（并肩上山，不是比赛）
  await b.boot(4, 'visual');
  const l4 = await b.ev(`({ scene: !!document.getElementById('mg-scene'), calm: document.body.classList.contains('mg-calm'), timer: window._currentGame.monsterTimer !== undefined })`);
  P(!l4.scene && !l4.calm && !l4.timer, 'L4：没有场景小画、非平静模式、没有小鹿计时', l4);

  // 竖屏 412×915：放不下就收起来，绝不压卡
  await b.viewport(412, 915);
  await b.boot(1, 'visual'); await b.sleep(500);
  const pt = await b.ev(info);
  P(pt && (!pt.shown || pt.x >= pt.maxRight), '412×915 竖屏：小画收起或不压卡', pt);
  await b.shot('scene_l1_portrait');
  await b.viewport(960, 576);

  P(b.errors.length === 0, '无脚本异常', b.errors);
} finally {
  try { await b.restore(); } finally { await b.close(); }
}
finish('SCENES L1-L3');
