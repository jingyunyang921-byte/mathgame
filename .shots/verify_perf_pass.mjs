// 性能小整理闸门：小窝渲染不反复读存档、L6 绘制循环不读存档、听写麦克风光环只动 transform/opacity、vercel 带上萌宠文件。
import { readFileSync, readdirSync } from 'node:fs';
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
const root = new URL('../', import.meta.url);
const seed = (stage, adopted = true) => `(() => {
  const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return MG_PET.dayKey(x); };
  ['mathgamePet', 'mathgameStars', 'mathgameCoins'].forEach(k => localStorage.removeItem(k));
  localStorage.setItem('mathgameStars', JSON.stringify({1:3,2:3,3:3,4:3,5:3,6:3}));
  if (${adopted}) localStorage.setItem('mathgamePet', JSON.stringify({ version: 2, adopted: true, exp: 0, stage: ${stage}, adoptedDay: d(-120), lastDay: d(0), xp: ${stage ? 900 : 20},
    days: [d(-1), d(0)], phase: ${stage ? 7 : 0}, daily: { date: d(0), correct: 0, rounds: [] }, gifts: [1, 2, 3, 4, 5, 6], used: {1: 30, 2: 10, 3: 5, 4: 0, 5: 60, 6: 12},
    decor: 'leaf', decors: ['leaf'], name: '数宝', hatchDay: ${stage ? 'd(-2)' : "''"}, birthSeen: ${!!stage}, affection: 0, stories: { seen: [], pending: [] } }));
  return true; })()`;
const countReads = ms => b.ev(`new Promise(res => { const o = Storage.prototype.getItem; let n = 0;
  Storage.prototype.getItem = function (k) { if (k === 'mathgamePet') n++; return o.apply(this, arguments); };
  setTimeout(() => { Storage.prototype.getItem = o; res(n); }, ${ms}); })`);
try {
  // 静态：关键帧不含 box-shadow；vercel 构建清单覆盖所有 pet-* 文件
  const html = readFileSync(new URL('index.html', root), 'utf8');
  const kf = n => (html.match(new RegExp('@keyframes ' + n + '\\s*\\{[\\s\\S]*?\\n\\}')) || [''])[0];
  P(kf('mic-pulse').includes('scale(1.08)') && !/box-shadow|filter/.test(kf('mic-pulse')), 'mic-pulse 关键帧只剩 transform，不含 box-shadow');
  P(/transform/.test(kf('mic-pulse-ring')) && /opacity/.test(kf('mic-pulse-ring')) && !/box-shadow|filter/.test(kf('mic-pulse-ring')), 'mic-pulse-ring 关键帧只动 transform + opacity');
  const builds = JSON.parse(readFileSync(new URL('vercel.json', root), 'utf8')).builds.map(x => x.src);
  const re = s => new RegExp('^' + s.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$');
  const petFiles = readdirSync(root).filter(f => /^pet-.*\.(js|css)$/.test(f));
  P(petFiles.length >= 3 && petFiles.every(f => builds.some(s => re(s).test(f))), 'vercel.json 构建清单覆盖全部 pet-* 文件', { petFiles, builds });

  await b.viewport(1000, 576);
  await b.nav(b.menu); await b.preserve();

  // 小窝：整屏渲染只读很少几次存档（原先每个故事/礼物各读一次，几十次）
  await b.ev(seed(1)); await b.nav(b.menu); await b.sleep(500);
  const r = await b.ev(`(() => { const o = Storage.prototype.getItem; let n = 0; Storage.prototype.getItem = function (k) { if (k === 'mathgamePet') n++; return o.apply(this, arguments); };
    try { renderPet(); } finally { Storage.prototype.getItem = o; }
    const q = s => document.querySelectorAll(s).length; return { reads: n, logs: q('#petLog .alb-s:not(.lock)'), eggs: q('#petLog .alb-egg'), gifts: q('#petGifts .pet-gift'), nest: q('#petNestItems .nest-item') }; })()`);
  P(r.reads <= 3, `renderPet 只读 ${r.reads} 次存档（≤3）`, r);
  P(r.logs >= 12 && r.eggs === 8 && r.gifts === 6 && r.nest === 6, '贴纸册/礼物/小窝礼物照常画出来', r);
  await b.ev(`(() => { showPet(); const e = [...document.querySelectorAll('#petNestItems .nest-item')][0]; e.click(); return true; })()`); await b.sleep(300);
  P(await b.ev(`document.getElementById('petStoryModal').classList.contains('show') && !!document.getElementById('petStoryTitle').textContent`), '点小窝里的礼物仍能打开故事');

  // L6：开局读一次阶段，绘制循环里不再读存档
  await b.ev(seed(1)); await b.boot(6, 'visual'); await b.sleep(600);
  P(await b.ev(`_currentGame.constructor.name === 'BattleGame' && _currentGame._petStage === 1`), 'L6：开局记下数宝阶段', await b.ev(`_currentGame._petStage`));
  const n6 = await countReads(1500);
  P(n6 === 0, `L6：画 1.5 秒（约 90 帧）读存档 ${n6} 次`);
  await b.ev(`_currentGame._restart(); true`); await b.sleep(300);
  P(await b.ev(`_currentGame._petStage === 1`), 'L6：再来一局后阶段仍在');
  await b.ev(seed(0, false)); await b.boot(6, 'visual'); await b.sleep(400);
  P(await b.ev(`_currentGame._petStage === 0`), 'L6：没领养时阶段为 0（不画伙伴）');

  // 听写光环：listening 时按钮与光环都挂对动画；减弱动态时停掉
  const ring = `(() => { const out = {}; ['float-voice-mic-btn', 'voice-mic-btn'].forEach(id => { const el = document.getElementById(id); if (!el) return;
    el.classList.remove('inactive'); el.classList.add('listening'); const cs = getComputedStyle(el), ca = getComputedStyle(el, '::after');
    out[id] = { btn: cs.animationName, ring: ca.animationName, content: ca.content, pos: ca.position, pe: ca.pointerEvents }; el.classList.remove('listening'); }); return out; })()`;
  let m = await b.ev(ring);
  const ids = Object.keys(m);
  P(ids.length >= 1 && ids.every(id => m[id].btn === 'mic-pulse' && m[id].ring === 'mic-pulse-ring' && m[id].pos === 'absolute' && m[id].pe === 'none'), '听写中：按钮脉冲 + 外圈光环动画已挂上，光环不拦点击', m);
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  m = await b.ev(ring);
  P(ids.every(id => m[id] && m[id].btn === 'none' && m[id].ring === 'none'), '减弱动态：脉冲与光环都停', m);
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  P(b.errors.length === 0, '无脚本异常', b.errors);
} finally { try { await b.send('Emulation.setEmulatedMedia', { features: [] }).catch(() => 0); await b.viewport(1000, 576); await b.restore(); } finally { await b.close(); } }
finish('PERF PASS');
