// 「跳过这题」不再压在 L4 右侧赛道 / L6 场景上：L4 视算+听算、L6 视算收进手写卡/卡台右下角；
// L1~L3 与 L5 保持原位。本地 :9333 + :8000；PET_DEVICE=1 时跑真机（视口固定 960×576，只跑真机尺寸）。
import { petBrowser, verdicts } from './pet_browser.mjs';
const { check, finish } = verdicts();
const b = await petBrowser();

const PROBE = `(()=>{
  const rc = el => { if (!el) return null; const r = el.getBoundingClientRect(); return {x:r.x,y:r.y,r:r.right,b:r.bottom,w:r.width,h:r.height}; };
  const vis = el => { if (!el) return false; const cs = getComputedStyle(el), r = el.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
  const cands = [...document.querySelectorAll('#skip-btn, #battle-skip-btn, #mg-listen-skip, .lc-skip')].filter(vis);
  const sk = cands[0] || null;
  const hit = sk ? (() => { const r = sk.getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!(e && (e === sk || sk.contains(e))); })() : false;
  const cw = document.getElementById('canvas-wrapper'), bw = document.getElementById('battle-canvas-wrapper');
  const card = [...document.querySelectorAll('.mg-listen-card')].find(vis) || null;
  const pv = document.getElementById('recognize-preview'), bpv = document.getElementById('battle-recognize-preview');
  const tl = document.getElementById('race-track-left'), tr = document.getElementById('race-track-right');
  return { vw: innerWidth, vh: innerHeight, body: document.body.className, n: cands.length,
    sel: sk ? (sk.id || sk.className) : null, pos: sk ? getComputedStyle(sk).position : null,
    skip: rc(sk), hit,
    parentId: sk && sk.parentElement ? sk.parentElement.id : null,
    cw: vis(cw) ? rc(cw) : null, bw: vis(bw) ? rc(bw) : null, card: card ? rc(card) : null,
    pv: pv ? rc(pv) : null, bpv: bpv ? rc(bpv) : null,
    tl: vis(tl) ? rc(tl) : null, tr: vis(tr) ? rc(tr) : null,
    expr: window._currentGame ? window._currentGame.currentExpr : null };
})()`;

const hits = (a, c) => !!a && !!c && a.x < c.r && a.r > c.x && a.y < c.b && a.b > c.y;
const inside = (a, c, m = 0) => !!a && !!c && a.x >= c.x + m && a.r <= c.r - m && a.y >= c.y + m && a.b <= c.b - m;

async function skipAdvances(label, getExpr) {
  const before = await b.ev(getExpr);
  let after = before;
  for (let i = 0; i < 4 && after === before; i++) {
    await b.ev(`(()=>{const s=[...document.querySelectorAll('#skip-btn, #battle-skip-btn, #mg-listen-skip, .lc-skip')].find(e=>{const r=e.getBoundingClientRect();return getComputedStyle(e).display!=='none'&&r.width>0;});if(s)s.click();return 1;})()`);
    await b.sleep(350);
    after = await b.ev(getExpr);
  }
  check(after !== before, label + ' 点跳过后题目前进', { before, after });
}

const SIZES = b.device ? [[960, 576]] : [[960, 576], [900, 500], [800, 480], [412, 915]];

try {
  await b.nav(b.menu); await b.preserve();
  await b.ev(`localStorage.setItem('mathgameIntroSeen','1');true`);
  const errs0 = b.errors.length;

  for (const [w, h] of SIZES) {
    await b.viewport(w, h);
    const tag = `${w}x${h}`;

    // ---- L4 视算：跳过在手写卡右下角，不压赛道 ----
    await b.boot(4, 'visual');
    await b.sleep(500);
    let m = await b.ev(PROBE);
    check(/mg-skip-card/.test(m.body), `L4 视算 ${tag} body.mg-skip-card`, m.body);
    check(m.n === 1 && m.sel === 'skip-btn', `L4 视算 ${tag} 仅一个可见跳过钮`, { n: m.n, sel: m.sel });
    check(m.parentId === 'controls' && await b.ev(`document.getElementById('controls').parentElement.id`) === 'canvas-wrapper', `L4 视算 ${tag} 跳过钮挂在手写卡内`);
    check(inside(m.skip, m.cw, 2), `L4 视算 ${tag} 跳过钮落在手写卡内`, { skip: m.skip, cw: m.cw });
    check(m.cw && m.skip && m.cw.r - m.skip.r <= 20 && m.cw.b - m.skip.b <= 20, `L4 视算 ${tag} 贴手写卡右下角`, { skip: m.skip, cw: m.cw });
    check(!hits(m.skip, m.tl) && !hits(m.skip, m.tr), `L4 视算 ${tag} 不压左右赛道`, { skip: m.skip, tl: m.tl, tr: m.tr });
    check(m.hit, `L4 视算 ${tag} 跳过钮可点中(无遮挡)`);
    await b.ev(`(()=>{const p=document.getElementById('recognize-preview');p.textContent='88';p.style.opacity='1';return 1;})()`);
    m = await b.ev(PROBE);
    check(!hits(m.pv, m.skip), `L4 视算 ${tag} 识别预览不与跳过钮重叠`, { pv: m.pv, skip: m.skip });
    check(inside(m.pv, m.cw, 0), `L4 视算 ${tag} 识别预览仍在手写卡内`, { pv: m.pv, cw: m.cw });
    await b.ev(`document.getElementById('recognize-preview').style.opacity='';true`);
    if (w === 960 || w === 412) await b.shot(`skip_inline_L4_visual_${tag}`);
    if (w === 960) await skipAdvances(`L4 视算 ${tag}`, 'window._currentGame.currentExpr');

    // ---- L4 听算：跳过在卡台右下角 ----
    await b.boot(4, 'audio');
    await b.ev(`(()=>{const ov=document.getElementById('float-voice-overlay'); if(ov) ov.style.display='flex'; return 1;})()`);
    await b.sleep(700);
    m = await b.ev(PROBE);
    check(/mg-stage-race/.test(m.body) && /mg-stage/.test(m.body), `L4 听算 ${tag} body.mg-stage-race`, m.body);
    check(m.n === 1 && String(m.sel).includes('lc-skip'), `L4 听算 ${tag} 仅卡内一个跳过钮(body 级隐藏)`, { n: m.n, sel: m.sel });
    check(inside(m.skip, m.card, 2), `L4 听算 ${tag} 跳过钮落在卡台内`, { skip: m.skip, card: m.card });
    check(m.card && m.skip && m.card.r - m.skip.r <= 24 && m.card.b - m.skip.b <= 24, `L4 听算 ${tag} 贴卡台右下角`, { skip: m.skip, card: m.card });
    const cardOnTrack = hits(m.card, m.tl) || hits(m.card, m.tr); // 窄视口下卡台本身就盖到赛道边，此时只要求钮不出卡
    check(cardOnTrack || (!hits(m.skip, m.tl) && !hits(m.skip, m.tr)), `L4 听算 ${tag} 不压左右赛道(卡台未触赛道时)`, { skip: m.skip, tl: m.tl, tr: m.tr, cardOnTrack });
    check(m.hit, `L4 听算 ${tag} 跳过钮可点中(无遮挡)`);
    if (w === 960 || w === 412) await b.shot(`skip_inline_L4_audio_${tag}`);
    if (w === 960) await skipAdvances(`L4 听算 ${tag}`, 'window._currentGame.currentExpr');

    // ---- L6 视算：跳过在手写卡右下角，不压右侧场景 ----
    await b.boot(6, 'visual');
    await b.sleep(500);
    m = await b.ev(PROBE);
    check(/mg-skip-card/.test(m.body), `L6 视算 ${tag} body.mg-skip-card`, m.body);
    check(m.n === 1 && m.sel === 'battle-skip-btn', `L6 视算 ${tag} 仅一个可见跳过钮`, { n: m.n, sel: m.sel });
    check(m.parentId === 'battle-controls' && await b.ev(`document.getElementById('battle-controls').parentElement.id`) === 'battle-canvas-wrapper', `L6 视算 ${tag} 跳过钮挂在手写卡内`);
    check(inside(m.skip, m.bw, 2), `L6 视算 ${tag} 跳过钮落在手写卡内`, { skip: m.skip, bw: m.bw });
    check(m.bw && m.skip && m.bw.r - m.skip.r <= 20 && m.bw.b - m.skip.b <= 20, `L6 视算 ${tag} 贴手写卡右下角`, { skip: m.skip, bw: m.bw });
    check(m.skip && m.skip.r <= m.vw * 0.55, `L6 视算 ${tag} 在左半屏内(不压右侧场景)`, { right: m.skip && m.skip.r, vw: m.vw });
    check(m.hit, `L6 视算 ${tag} 跳过钮可点中(无遮挡)`);
    await b.ev(`(()=>{const p=document.getElementById('battle-recognize-preview');p.textContent='88';p.style.opacity='1';return 1;})()`);
    m = await b.ev(PROBE);
    check(!hits(m.bpv, m.skip), `L6 视算 ${tag} 识别预览不与跳过钮重叠`, { pv: m.bpv, skip: m.skip });
    check(inside(m.bpv, m.bw, 0), `L6 视算 ${tag} 识别预览仍在手写卡内`, { pv: m.bpv, bw: m.bw });
    await b.ev(`document.getElementById('battle-recognize-preview').style.opacity='';true`);
    if (w === 960 || w === 412) await b.shot(`skip_inline_L6_visual_${tag}`);
    if (w === 960) await skipAdvances(`L6 视算 ${tag}`, 'window._currentGame.currentExpr');
  }

  // ---- 回归：L1~L3 仍在屏幕右下角(那里是空白底)，不带 mg-skip-card ----
  await b.viewport(960, 576);
  for (const lv of [1, 2, 3]) {
    await b.boot(lv, 'visual'); await b.sleep(400);
    let m = await b.ev(PROBE);
    check(!/mg-skip-card|mg-stage-race/.test(m.body), `L${lv} 视算 不带 mg-skip-card`, m.body);
    check(m.n === 1 && m.sel === 'skip-btn' && m.parentId === 'controls', `L${lv} 视算 跳过钮仍是原 #controls`, { n: m.n, sel: m.sel });
    check(m.skip && m.skip.x > 780 && m.skip.y > 480, `L${lv} 视算 跳过仍在屏幕右下角`, m.skip);
    await b.boot(lv, 'audio');
    await b.ev(`(()=>{const ov=document.getElementById('float-voice-overlay')||document.getElementById('voice-mic-area'); if(ov) ov.style.display='flex'; return 1;})()`);
    await b.sleep(500);
    m = await b.ev(PROBE);
    check(!/mg-stage-race|mg-stage-battle/.test(m.body), `L${lv} 听算 不带 mg-stage-race`, m.body);
    check(m.n === 1 && m.sel === 'mg-listen-skip' && m.pos === 'fixed', `L${lv} 听算 仍是 body 级屏角跳过`, { n: m.n, sel: m.sel, pos: m.pos });
  }

  check(b.errors.length === errs0, '全程无 JS 报错', b.errors.slice(errs0));
} finally {
  try { await b.restore(); } finally { await b.close(); }
  finish('verify_skip_inline');
}
