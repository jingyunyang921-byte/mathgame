// 方案A「每关都在暖蛋」闸门：L5 小海龟、L6 草窝蛋、通关「咔」、L4 不再是比赛。关内蛋位见 verify_egg_companion.mjs，结算舞台反应见 verify_egg_stage.mjs。
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
// 记下每次 mgEggFlyTo 的起点/终点（client 坐标）
const hookFly = `(() => { window.__fly = []; if (!window.__flyOrig) window.__flyOrig = window.mgEggFlyTo;
  window.mgEggFlyTo = function (fx, fy, tx, ty, done, lv) { window.__fly.push({ fx, fy, tx, ty, lv }); return window.__flyOrig.apply(this, arguments); }; return true; })()`;
const endRound = async (win) => {
  await b.ev(win ? `_mgWrong=0;_mgCorrect=10;_mgMaxStreak=10;_mgRoundStart=Date.now()-7000;debugEndGame(true);true` : `_mgWrong=3;_mgCorrect=4;_mgMaxStreak=2;_mgRoundStart=Date.now()-9000;debugEndGame(false);true`);
  await b.poll(`!!document.querySelector('#cs-stage .cs-chest')`, 7000);
};
const near = (a, c, tol) => Math.abs(a - c) <= tol;
try {
  await b.nav(b.menu); await b.preserve();
  await b.viewport(960, 576);

  // 1. L5 小海龟：领着船走，答对蹦一下；领养的孩子贝壳从海龟头顶飞向甲板蛋
  for (const adopted of [true, false]) {
    const tag = adopted ? '已领养' : '未领养';
    await b.ev(seed(adopted)); await b.boot(5, 'visual'); await b.sleep(900);
    await b.ev(hookFly);
    const t0 = await b.ev(`(() => { const g = window._currentGame, c = g.canvas; return { tp: g.turtlePos, w: c.width, h: c.height, hop: g.turtleHopAt }; })()`);
    P(t0.tp && Number.isFinite(t0.tp.x) && Number.isFinite(t0.tp.y) && t0.tp.x > 0 && t0.tp.x < t0.w && t0.tp.y > 0 && t0.tp.y < t0.h, `L5 ${tag}：小海龟在画布里`, t0);
    const r = await b.ev(`(() => { const g = window._currentGame; const d = g.choices.find(c => c.value === g.currentAnswer); g.locked = false; g._choose(d);
      const c = g.canvas, rc = c.getBoundingClientRect(), k = c.width ? rc.width / c.width : 1;
      return { hopped: performance.now() - g.turtleHopAt < 400, tp: { x: rc.left + g.turtlePos.x * k, y: rc.top + g.turtlePos.y * k }, fly: window.__fly.slice() }; })()`);
    P(r.hopped, `L5 ${tag}：答对小海龟蹦一下`, r);
    if (adopted) P(r.fly.length === 1 && near(r.fly[0].fx, r.tp.x, 12) && near(r.fly[0].fy, r.tp.y, 12), 'L5 已领养：贝壳从小海龟头顶飞出', r);
    else P(r.fly.length === 0, 'L5 未领养：只有海龟蹦、没有贝壳飞行', r);
    await b.sleep(1200);
    const w = await b.ev(`(() => { const g = window._currentGame; const d = g.choices.find(c => c.value !== g.currentAnswer); if (!d) return null; g.locked = false; g._choose(d); return performance.now() - g.turtleTiltAt < 400; })()`);
    if (w !== null) P(w === true, `L5 ${tag}：答错小海龟歪头，不蹦`, w);
  }

  // 2. L6 不摆蛋：刺猬旁边没有蛋/草窝；已孵化的数宝站在灯下、不挡灯笼；点灯动画（答对→灯亮+蹦+萤火从灯里放出）
  const greenN = `(() => { const c = document.getElementById('battle-arena-canvas'), ctx = c.getContext('2d'), W = c.width, H = c.height;
    const px = ctx.getImageData(Math.round(W * 0.3), Math.round(H * 0.62), Math.round(W * 0.25), Math.round(H * 0.34)).data; let n = 0;
    for (let i = 0; i < px.length; i += 4) if (Math.abs(px[i] - 127) < 14 && Math.abs(px[i + 1] - 208) < 14 && Math.abs(px[i + 2] - 127) < 14) n++; return n; })()`;
  for (const mode of ['adopted', 'plain', 'hatched']) {
    await b.ev(seed(mode !== 'plain'));
    if (mode === 'hatched') await b.ev(`(() => { const p = JSON.parse(localStorage.getItem('mathgamePet')); p.stage = 1; p.hatchDay = MG_PET.dayKey(new Date()); localStorage.setItem('mathgamePet', JSON.stringify(p)); return true; })()`);
    await b.boot(6, 'visual'); await b.sleep(900);
    await b.ev(hookFly);
    const tag = { adopted: '已领养未孵化', plain: '未领养', hatched: '已孵化' }[mode];
    const s = await b.ev(`(() => { const g = window._currentGame, c = document.getElementById('battle-arena-canvas'), W = c.width, H = c.height;
      const pose = g._hogPose(W, H), sz = pose.size * 0.78, lamp = g._hogLamp(pose.cx, pose.baseY, sz), arena = g._runArena.toString();
      return { W, H, on: MG_EGG.on, stage: MG_EGG.stage, lamp, sz, lanternBottom: lamp.y + sz * 0.33, petTop: H * 0.93 - H * 0.17 * 1.04,
        eggFns: ['mgEggL6Nest', 'mgEggL6U', 'mgEggL6X', 'mgEggDrawBuddy'].filter(k => typeof window[k] !== 'undefined'), arenaEgg: /mgEggL6|mgEggDrawBuddy/.test(arena) }; })()`);
    P(s.eggFns.length === 0 && !s.arenaEgg, `L6 ${tag}：草窝蛋的代码已删净`, s);
    const gn = await b.ev(greenN);
    if (mode === 'hatched') {
      P(gn > 150, 'L6 已孵化：数宝站在刺猬灯下', gn);
      P(s.petTop > s.lanternBottom + 4, 'L6 已孵化：数宝头顶低于灯笼底，不挡灯', [s.petTop, s.lanternBottom]);
    } else P(gn < 20, `L6 ${tag}：刺猬身边没有蛋也没有数宝`, gn);
    if (mode === 'adopted') {
      const r = await b.ev(`(() => { showAnswerMark('battle-answer-mark', 'correct', 900); return { fly: window.__fly.slice(), shown: MG_EGG.shown }; })()`);
      P(r.fly.length === 0 && r.shown === 1, 'L6：答对只记数，没有材料飞向任何地方', r);
      const k0 = await b.ev(`window._currentGame._lampKick`);
      await b.ev(`window._currentGame._sendKeyEnergy(); true`);
      const f = await b.ev(`(() => { const g = window._currentGame, e = g.energy[g.energy.length - 1], c = document.getElementById('battle-arena-canvas'), p = g._hogPose(c.width, c.height), sz = p.size * 0.78, l = g._hogLamp(p.cx, p.baseY, sz);
        return { ex: e.x, ey: e.y, lx: l.x, ly: l.y + l.len, kick: g._lampKick, fc: g.frameCount }; })()`);
      P(near(f.ex, f.lx, 1) && near(f.ey, f.ly, 1), 'L6：答对的萤火从小刺猬的灯里放出，飞向小屋', f);
      P(k0 < 0 && f.kick > 0 && f.fc - f.kick < 5, 'L6：答对记下点灯时刻（刺猬蹦、灯亮、灯晃）', [k0, f.kick, f.fc]);
      // 点灯后几帧灯被荡起来（答对那一帧摆角还是 0，从静止荡出去）；过了半秒回到轻晃
      const lit = await b.ev(`(() => { const g = window._currentGame, c = document.getElementById('battle-arena-canvas'), p = g._hogPose(c.width, c.height), sz = p.size * 0.78;
        const at = () => { const L = g._lampLook(p.cx, p.baseY, sz, g.frameCount * 0.05); return { sw: L.swing, kick: L.kick }; };
        g._lampKick = g.frameCount - 4; const a = at(); g._lampKick = g.frameCount - 200; const b0 = at(); return { kicked: a, idle: b0 }; })()`);
      P(lit.kicked.kick > 0.5 && lit.idle.kick === 0 && Math.abs(lit.kicked.sw) > 0.15 && Math.abs(lit.idle.sw) <= 0.06, 'L6：点灯后灯被荡起来，过后回到轻晃', lit);
      await b.ev(`window._currentGame._sendKeyEnergy(); true`);
      await b.sleep(1500);
      const far = await b.ev(`(() => { const g = window._currentGame; return g._lampKickState().kick; })()`);
      P(far === 0, 'L6：点灯动作约半秒后自己结束，不循环', far);
    }
  }
  // 减弱动态：灯不晃、刺猬不蹦
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await b.ev(seed(true)); await b.boot(6, 'visual'); await b.sleep(900);
  await b.ev(`window._currentGame._sendKeyEnergy(); true`);
  await b.sleep(120);
  const rm = await b.ev(`(() => { const g = window._currentGame, c = document.getElementById('battle-arena-canvas'), p = g._hogPose(c.width, c.height), sz = p.size * 0.78;
    return { rm: g._rm, swing: g._lampLook(p.cx, p.baseY, sz, g.frameCount * 0.05).swing, hop: g._hogHop }; })()`);
  P(rm.rm === true && rm.swing === 0 && rm.hop === 0, 'L6 减少动态：灯不晃、刺猬不蹦', rm);
  await b.send('Emulation.setEmulatedMedia', { features: [] });

  // 3. 通关「咔」：舞台上材料落进蛋的同时壳上裂一道小缝 + 「咔」气泡，之后自己消失；失败局/减少动态不出现
  await b.ev(seed(true)); await b.boot(1, 'visual'); await b.sleep(300);
  await endRound(true);
  await b.ev(`document.querySelector('#cs-stage .cs-chest').click();true`);
  await b.poll(`!!document.querySelector('#cs-stage .egg-crack')`, 6000);
  const ck = await b.ev(`(() => { const s = document.getElementById('cs-stage'), k = s.querySelector('.egg-ka'), e = s.querySelector('.egg-strip svg.egg'), c = s.querySelector('.egg-crack');
    return { crack: !!c, inSvg: !!(c && e && e.contains(c)), ka: k ? k.textContent : null, kaIn: !!(k && k.closest('.egg-strip')) }; })()`);
  P(ck.crack && ck.inSvg && ck.ka === '咔' && ck.kaIn, '通关：蛋壳裂一道小缝，旁边冒出「咔」', ck);
  await b.poll(`!document.querySelector('#cs-stage .egg-crack') && !document.querySelector('#cs-stage .egg-ka')`, 3000);
  P(await b.ev(`!document.querySelector('#cs-stage .egg-crack') && !document.querySelector('#cs-stage .egg-ka')`), '「咔」和裂缝播完自己消失，不留在蛋上');
  await b.poll(`!!document.querySelector('#cs-stage .cs-acts')`, 9000);
  P(await b.ev(`!!document.querySelector('#cs-stage .cs-acts')`), '带着「咔」的舞台仍按时走完（不超过兜底）');

  await b.ev(seed(true)); await b.boot(1, 'visual'); await b.sleep(300);
  await endRound(false);
  await b.ev(`document.querySelector('#cs-stage .cs-chest').click();true`);
  await b.poll(`!!document.querySelector('#cs-stage .cs-acts')`, 9000);
  P(await b.ev(`!document.querySelector('#cs-stage .egg-crack') && !document.querySelector('#cs-stage .egg-ka')`), '失败局：蛋只晃一晃，不裂缝、不「咔」');

  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await b.ev(seed(true)); await b.boot(1, 'visual'); await b.sleep(300);
  await endRound(true);
  let seen = false;
  await b.ev(`document.querySelector('#cs-stage .cs-chest').click();true`);
  for (let i = 0; i < 20 && !seen; i++) { seen = await b.ev(`!!document.querySelector('#cs-stage .egg-crack, #cs-stage .egg-ka')`); await b.sleep(300); }
  P(!seen, '减少动态：不播「咔」');
  await b.send('Emulation.setEmulatedMedia', { features: [] });

  // 4. L4 不再是比赛：只剩「我 n/10」进度药丸 + 场景名，没有对手药丸/红警报/封顶/等你横幅
  await b.ev(seed(true)); await b.boot(4, 'visual'); await b.sleep(900);
  const l4 = await b.ev(`(() => { const q = s => document.querySelector(s), vis = e => !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0;
    const g = window._currentGame, bn = q('#monster-full-banner');
    return { oppo: !!q('#race-prog-monster'), boxes: [...document.querySelectorAll('.race-prog-box')].filter(vis).length, tag: vis(q('#race-scene-tag')),
      banner: vis(bn), label: vis(q('#race-label')), monsterFields: ['monsterStep', 'monsterFinished', 'monsterTimer'].filter(k => g[k] !== undefined), start: typeof g._startMonster,
      calm: document.body.classList.contains('mg-calm') }; })()`);
  P(!l4.oppo && l4.boxes === 1 && l4.tag && !l4.banner, 'L4：只剩「我 n/10」药丸和「落叶山路」，没有对手药丸与横幅', l4);
  P(l4.monsterFields.length === 0 && l4.start === 'undefined', 'L4：RaceGame 里没有对手计时/步数', l4);
  await b.ev(`(() => { const g = window._currentGame; _mgWrong = 0; _mgCorrect = 10; _mgMaxStreak = 10; _mgRoundStart = Date.now() - 9000; g.playerStep = 10; g._endGame(); return true; })()`);
  await b.poll(`document.getElementById('overlay').classList.contains('show')`, 4000);
  await b.sleep(300);
  const ov = await b.ev(`(() => { const q = id => document.getElementById(id), g = window._currentGame;
    return { cls: q('overlay-title').className, msg: q('overlay-msg').textContent.trim(), stars: g._mgRoundSnap ? g._mgRoundSnap.stars : null }; })()`);
  P(ov.cls === 'win' && ov.stars === 3 && /小鹿陪你走到山顶啦/.test(ov.msg) && !/等到你|先到/.test(ov.msg), 'L4：全对 3 星不封顶，成绩行「小鹿陪你走到山顶啦」', ov);

  P(b.errors.length === 0, '无脚本异常', b.errors);
} finally {
  try { await b.send('Emulation.setEmulatedMedia', { features: [] }); await b.viewport(1000, 576); await b.restore(); } finally { await b.close(); }
}
finish('SCHEME A');
