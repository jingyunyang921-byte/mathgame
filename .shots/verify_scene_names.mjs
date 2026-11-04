// L4-L6 局内常驻场景名闸门：L4 天空条药丸「落叶山路」、L5 岛上标签「贝壳海岸」（不被画布边缘切掉）、L6 说明条「萤火小屋」（速算仍是「一分钟速算」）。
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
const seed = (adopted = true) => `(() => {
  const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return MG_PET.dayKey(x); };
  ['mathgamePet', 'mathgameStars', 'mathgameCoins'].forEach(k => localStorage.removeItem(k));
  try { _mgPendingSnap = null; } catch (e) {}
  if (${adopted}) localStorage.setItem('mathgamePet', JSON.stringify({ version: 2, adopted: true, exp: 0, stage: 0, adoptedDay: d(-22), lastDay: d(0), xp: 20,
    days: Array.from({ length: 4 }, (_, i) => d(-4 + i)), phase: 0, daily: { date: d(0), correct: 0, rounds: [] }, gifts: [], decor: 'leaf', decors: ['leaf'],
    name: '数宝', hatchDay: '', birthSeen: false, affection: 0, stories: { seen: [], pending: [] } }));
  return true; })()`;
const tagState = `(() => {
  const t = document.getElementById('race-scene-tag'), r = t && t.getBoundingClientRect(), shown = !!t && t.getClientRects().length > 0;
  const hit = (a, id) => { const n = document.getElementById(id); if (!n || !n.getClientRects().length) return false; const q = n.getBoundingClientRect();
    return !(a.right <= q.left || a.left >= q.right || a.bottom <= q.top || a.top >= q.bottom); };
  const slot = document.getElementById('mg-egg-slot'), sr = slot && slot.style.display !== 'none' ? slot.getBoundingClientRect() : null;
  return { text: t ? t.textContent : null, shown, egg: document.body.classList.contains('mg-egg-on'), anim: t ? getComputedStyle(t).animationName : '',
    inV: !!r && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
    cx: r ? Math.round((r.left + r.right) / 2) : 0, vw: innerWidth, right: r ? Math.round(r.right) : 0,
    slotGap: r && sr ? Math.round(sr.left - r.right) : null,
    over: !!r && shown && (hit(r, 'race-prog-player') || hit(r, 'race-prog-monster') || hit(r, 'question-card') || hit(r, 'monster-full-banner')) };
})()`;
try {
  await b.nav(b.menu); await b.preserve();

  // 1. L4 药丸：多视口 × 已领养/未领养
  const VPS = b.device ? [[await b.ev('innerWidth'), await b.ev('innerHeight')]] : [[960, 576], [900, 500], [1280, 800], [412, 915]];
  for (const [w, h] of VPS) {
    await b.viewport(w, h);
    for (const adopted of [true, false]) {
      const tag = `${w}×${h} L4 ${adopted ? '已领养' : '未领养'}`;
      await b.nav(b.menu); await b.sleep(200);   // 先回菜单：游戏页卸载时会把内存里的萌宠回写，会让「未领养」种子被冲掉
      await b.ev(seed(adopted)); await b.boot(4, 'visual'); await b.sleep(600);
      const s = await b.ev(tagState);
      if (adopted && w <= 640) {
        P(s.egg && (!s.shown || (s.inV && !s.over && (s.slotGap === null || s.slotGap >= 8))), `${tag}：窄屏有蛋位时药丸收起，或留在屏内且不挤蛋位`, s);
        continue;
      }
      P(s.shown && s.text === '落叶山路' && s.inV && !s.over && s.anim === 'none', `${tag}：药丸「落叶山路」在屏内、不压进度牌/题卡、无动画`, s);
      if (adopted) P(s.slotGap === null || s.slotGap >= 8, `${tag}：药丸让在蛋位左侧不相碰`, s);
      else P(Math.abs(s.cx - s.vw / 2) <= 2 && !s.egg, `${tag}：没有蛋位时药丸居中`, s);
    }
  }
  await b.viewport(960, 576);
  await b.ev(seed(true)); await b.boot(4, 'visual'); await b.sleep(500); await b.shot('scene_tag_L4_960x576');

  // 2. 其余关不应出现 L4 药丸
  await b.ev(seed(true)); await b.boot(1, 'visual'); await b.sleep(300);
  const l1 = await b.ev(tagState);
  P(!l1.shown, 'L1：不显示 L4 药丸', l1);

  // 3. L6 说明条 / 速算
  await b.ev(seed(true)); await b.boot(6, 'visual'); await b.sleep(300);
  const l6 = await b.ev(`(() => { const n = document.getElementById('battle-ground-label'); return { text: n.textContent.trim(), shown: n.getClientRects().length > 0 }; })()`);
  P(l6.shown && l6.text === '萤火小屋', 'L6：说明条「萤火小屋」', l6);
  await b.ev(seed(true)); await b.boot(0, 'visual', "sessionStorage.setItem('mgSprint','1')"); await b.sleep(300);
  const sp = await b.ev(`document.getElementById('battle-ground-label').textContent.trim()`);
  P(sp === '一分钟速算', '一分钟速算：说明条仍是「一分钟速算」', sp);

  // 4. L5 画布标签：真画布 + 窄画布都不被边缘切掉
  await b.ev(seed(true)); await b.boot(5, 'visual'); await b.sleep(400);
  const l5 = await b.ev(`(() => {
    const g = window._currentGame, out = [];
    for (const W of [g.canvas.width, 480, 300]) {
      const c = document.createElement('canvas'); c.width = W; c.height = 300;
      const ctx = c.getContext('2d'), calls = [], orig = ctx.fillText.bind(ctx);
      ctx.fillText = (t, x, y) => { calls.push({ t, x, y }); orig(t, x, y); };
      g._drawGoalIsland(ctx, W * 0.96, 150, Math.min(W, 300) * 0.13);
      const k = calls.filter(q => q.t === MG_SCENE[5])[0];
      let lw = 0; if (k) { ctx.font = 'bold ' + Math.max(11, Math.min(W, 300) * 0.13 * 0.34) + 'px Nunito,sans-serif'; lw = ctx.measureText(k.t).width; }
      out.push({ W, has: !!k, left: k ? Math.round(k.x - lw / 2) : null, right: k ? Math.round(k.x + lw / 2) : null, old: calls.some(q => q.t === '终点') });
    }
    return { out, scene: MG_SCENE[5] };
  })()`);
  P(l5.scene === '贝壳海岸' && l5.out.every(o => o.has && !o.old && o.left >= 0 && o.right <= o.W), 'L5：岛上标签「贝壳海岸」，画布 3 种宽度都不被切掉，旧「终点」已去', l5);
  await b.shot('scene_tag_L5_960x576');

  P(b.errors.length === 0, '无脚本异常', b.errors);
} finally {
  try { await b.viewport(1000, 576); await b.restore(); } finally { await b.close(); }
}
finish('SCENE NAMES');
