// L4「并肩上山」秋日山路闸门：同一条山路孩子+小鹿并肩、山顶挂灯小亭随答对点亮、右条大枫树+落叶堆/蛋窝。
// 旧的彩虹门/START/灰色幽灵旗/奖励点/第二条赛道已删；小亭灯笼与落叶轻轻动（减弱动态不启动、结束即停）。
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
const warm = c => c[0] >= 200 && c[0] - c[2] >= 40;
const PROBE = `(() => {
  const g = window._currentGame;
  if (g.monsterTimer) clearInterval(g.monsterTimer);
  g.gameEnded = false; g.playerStep = 0; g.monsterStep = 0; g.locked = true;
  const lc = document.getElementById('race-left-canvas'), rc = document.getElementById('race-right-canvas'), mc = document.getElementById('race-canvas');
  const W = lc.width, H = lc.height, trL = g._raceTrail(W, H), trR = g._raceTrail(rc.width, rc.height);
  const px = (cv, x, y) => { const d = cv.getContext('2d').getImageData(Math.round(x), Math.round(y), 1, 1).data; return [d[0], d[1], d[2]]; };
  const grab = cv => cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
  const diffRows = (a, b, w, y0, y1) => { let n = 0; for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4;
    if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 40) n++; } return n; };
  g._updateRaceTrack();
  const s0 = grab(lc), r0 = grab(rc);
  const swayTs = Array.from({ length: 12 }, (_, i) => 0.05 + i * 0.05), swayXs = swayTs.map(t => trL.cx(t));
  const spec = g._raceTreeSpec(rc.getContext('2d'), rc.width, trR.finishY), nestG = mgRaceNest(rc.width, rc.height);
  const out = { W, H, finishY: trL.finishY, sway: Math.round(Math.max(...swayXs) - Math.min(...swayXs)),
    sky: px(lc, W * 0.5, 6), path: px(lc, trL.cx(0.35) + trL.hw(0.35) * 0.25, trL.y(0.35)), ground: px(lc, 3, H * 0.8),
    maple: px(rc, rc.width * 0.5, trR.finishY * 0.38 + spec.dc), center: px(mc, mc.width * 0.5, mc.height * 0.7),
    treeFoot: spec.foot, horizon: trR.finishY, nestY: Math.round(nestG.y), nestH: Math.round(136 * nestG.sc) };
  // 孩子和小鹿走同一条路：起点处并排两个角色（路面被遮掉一大片）；走到山顶后起点空了、小亭附近变了
  g.playerStep = 10; g.monsterStep = 10; g._updateRaceTrack();
  const s1 = grab(lc);
  out.startDiff = diffRows(s0, s1, W, Math.round(H * 0.62), H);
  out.topDiff = diffRows(s0, s1, W, Math.max(0, trL.finishY - 120), trL.finishY + 8);
  g.playerStep = 0; g.monsterStep = 0; g._updateRaceTrack();
  // 小亭画法单测：灯暗 vs 灯亮，灯笼中心颜色要变亮
  const sc = document.createElement('canvas'); sc.width = 200; sc.height = 160; const sx = sc.getContext('2d');
  const lantern = lit => { sx.clearRect(0, 0, 200, 160); g._racePavilion(sx, 100, 150, 100, lit, 0); const d = sx.getImageData(100, 150 - 34, 1, 1).data; return [d[0], d[1], d[2]]; };
  out.lampOff = lantern(0); out.lampOn = lantern(1);
  // 旧元素删净
  out.legacy = ['_raceCps', '_drawRaceGate', '_raceFlag', '_raceReward'].filter(k => typeof g[k] === 'function');
  out.srcStart = /START|rainbow|彩虹/.test(Object.getOwnPropertyNames(Object.getPrototypeOf(g)).map(n => typeof g[n] === 'function' && n.startsWith('_race') ? g[n].toString() : '').join('\\n'));
  // 蛋窝：在右条里、没压题卡/手写卡
  const egg = document.getElementById('mg-egg-slot'), er = egg && egg.getBoundingClientRect(), rr = document.getElementById('race-track-right').getBoundingClientRect();
  out.egg = egg && getComputedStyle(egg).display !== 'none' ? { l: Math.round(er.left), r: Math.round(er.right), t: Math.round(er.top), b: Math.round(er.bottom), rl: Math.round(rr.left), rr: Math.round(rr.right), rt: Math.round(rr.top), rb: Math.round(rr.bottom) } : null;
  out.join = Math.round(Math.abs(trL.cx(1) - trL.pav));
  const cen = s => { const e = document.querySelector(s); if (!e || !e.getClientRects().length) return null; const q = e.getBoundingClientRect(); return Math.round((q.left + q.right) / 2); };
  out.vw = innerWidth; out.tagC = cen('#race-scene-tag'); out.progC = cen('#race-prog-player');
  return out;
})()`;
try {
  await b.nav(b.menu); await b.preserve();
  for (const [w, h] of (b.device ? [[960, 576]] : [[960, 576], [1280, 800], [1920, 1200]])) {
    const tag = `${w}×${h}`;
    await b.viewport(w, h);
    await b.boot(4, 'visual');
    await b.sleep(900);
    const r = await b.ev(PROBE);
    P(r.sway >= 15, `[${tag}] 山路蜿蜒（摆幅≥15px）`, r.sway);
    P(r.join <= 1, `[${tag}] 山路尽头正对小亭门（路中心=小亭中心）`, r.join);
    P(r.tagC != null && Math.abs(r.tagC - r.vw / 2) <= 3 && r.progC != null && Math.abs(r.progC - r.vw / 2) <= 3, `[${tag}] 场景名牌和进度药丸水平居中`, [r.vw, r.tagC, r.progC]);
    P(warm(r.sky) && r.sky[2] < 175, `[${tag}] 天空是秋日晚霞（暖色，不是蓝）`, r.sky);
    P(r.path[0] >= 225 && r.path[2] <= 205 && r.path[0] - r.path[2] >= 30, `[${tag}] 山路是米黄土路`, r.path);
    P(r.ground[0] >= 190 && r.ground[0] - r.ground[2] >= 40, `[${tag}] 地面是暖褐`, r.ground);
    P(r.maple[0] >= 200 && r.maple[2] <= 120, `[${tag}] 右条大枫树冠是橙红`, r.maple);
    P(r.treeFoot >= r.nestY + 0.3 * r.nestH && r.treeFoot <= r.nestY + 0.8 * r.nestH && r.treeFoot > r.horizon, `[${tag}] 大枫树根坐在蛋窝底座里（树根在蛋窝范围中段，被碗/落叶垫遮住）`, [r.horizon, r.treeFoot, r.nestY, r.nestH]);
    P(r.center[0] >= 170 && r.center[0] - r.center[2] >= 25, `[${tag}] 中央答题区也是暖秋色`, r.center);
    P(r.startDiff > 300, `[${tag}] 起点处有孩子+小鹿（走远后这里变空）`, r.startDiff);
    P(r.topDiff > 300, `[${tag}] 走到山顶：小亭前出现角色/灯亮`, r.topDiff);
    P(r.lampOn[0] >= 235 && r.lampOn[1] >= 190 && r.lampOn[1] - r.lampOff[1] >= 25, `[${tag}] 小亭灯笼随进度点亮`, [r.lampOff, r.lampOn]);
    P(r.legacy.length === 0 && !r.srcStart, `[${tag}] 彩虹门/START/幽灵旗/奖励点已删净`, [r.legacy, r.srcStart]);
    if (r.egg) P(r.egg.l >= r.egg.rl && r.egg.r <= r.egg.rr && r.egg.t >= r.egg.rt && r.egg.b <= r.egg.rb, `[${tag}] 蛋窝完整落在右条里`, r.egg);
    // 真走一题：答对 → playerStep+1，路上的落叶少一片（起点附近像素变化）
    const st = await b.ev(`(async () => { const g = window._currentGame; g.locked = false; g.gameEnded = false; g.hasContent = true; g.recognizer.recognize = async () => g.currentAnswer;
      const s = g.playerStep; await g._submit(); return [s, g.playerStep]; })()`);
    P(st[1] === st[0] + 1, `[${tag}] 答对一题 → 前进一格`, st);
    await b.sleep(900);
    // 轻轻动：相位推进，天空带像素在变
    const f = await b.ev(`(async () => { const g = window._currentGame, cv = document.getElementById('race-left-canvas'), fy = g._raceTrail(cv.width, cv.height).finishY;
      const snap = () => cv.getContext('2d').getImageData(0, 0, cv.width, Math.max(1, fy - 2)).data;
      const p1 = g._racePhase || 0, a = snap(); await new Promise(r => setTimeout(r, 420)); const p2 = g._racePhase || 0, c = snap();
      let d = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - c[i]) + Math.abs(a[i + 1] - c[i + 1]) + Math.abs(a[i + 2] - c[i + 2]) > 12) d++;
      return { p1, p2, d }; })()`);
    P(f.p2 > f.p1 && f.d > 0, `[${tag}] 灯笼/落叶轻轻动（相位推进+天空带像素变化）`, f);
    await b.shot(`race_autumn_${w}`);
    if (w === 960) {
      await b.ev('window._currentGame.gameEnded = true;true');
      await b.sleep(350);
      const a = await b.ev('window._currentGame._racePhase || 0'); await b.sleep(400);
      const c = await b.ev('window._currentGame._racePhase || 0');
      P(a > 0 && a === c, '[960×576] 结束后动效循环停摆', [a, c]);
      for (const [vw, vh] of [[412, 915], [900, 500]]) {
        await b.viewport(vw, vh); await b.boot(4, 'visual'); await b.sleep(700);
        const o = await b.ev(`({ canvases: ['race-left-canvas', 'race-right-canvas', 'race-canvas'].map(id => { const c = document.getElementById(id), r = c.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }) })`);
        P(o.canvases.every(c => c[0] > 0 && c[1] > 0), `[${vw}×${vh}] 三块画布都有尺寸`, o);
        await b.shot(`race_autumn_${vw}x${vh}`);
      }
      await b.viewport(960, 576);
    }
  }
  // 减弱动态效果：不启动循环
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  try {
    await b.boot(4, 'visual'); await b.sleep(1200);
    const p1 = await b.ev('window._currentGame._racePhase || 0'); await b.sleep(450);
    const p2 = await b.ev('window._currentGame._racePhase || 0');
    P(p1 === 0 && p2 === 0, '[reduce-motion] 动效循环未启动', [p1, p2]);
  } finally { await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] }); }
  P(b.errors.length === 0, '无脚本异常', b.errors);
} finally {
  try { await b.restore(); } finally { await b.close(); }
}
finish('RACE AUTUMN');
