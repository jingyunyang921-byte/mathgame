// 第 5、6 关没通关的小剧场鼓励页：同一幅插画不亮灯 + 朋友 + 鼓励标题 + 一个大按钮 + 一句鼓励语音。
// 速算局 / 前四关 / 通关局不受影响；答对过的局先开宝箱再落到同一页；返回键回到静态结算卡。
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();

const STUB_SAY = `(() => { window.__said = []; const g = window._currentGame; const o = g._playTTS.bind(g); g._playTTS = (t, q) => { window.__said.push(t); return o(t, q); }; return true; })()`;
const INFO = `(() => {
  const s = document.getElementById('cs-stage'), q = x => s ? s.querySelector(x) : null, vw = innerWidth, vh = innerHeight;
  const inView = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.left >= -1 && r.top >= -1 && r.right <= vw + 1 && r.bottom <= vh + 1; };
  const sc = q('.cs-scene');
  return {
    cls: s ? s.className : null,
    title: (q('.cs-title') || {}).childNodes ? q('.cs-title').childNodes[0].textContent : null,
    sub: (q('.cs-title small') || {}).textContent || null,
    scene: sc ? sc.className : null,
    acts: s ? [...s.querySelectorAll('.cs-act')].map(x => ({ t: x.textContent.trim(), go: x.getAttribute('data-go'), pri: x.classList.contains('pri') })) : [],
    partner: !!q('.cs-partner'), dots: s ? s.querySelectorAll('.ls-dots i').length : 0, lit: s ? s.querySelectorAll('.ls-dots i.on').length : 0,
    said: window.__said || [],
    okTitle: inView(q('.cs-title')), okAct: inView(q('.cs-act')), okPartner: inView(q('.cs-lone .cs-partner') || q('.cs-partner')),
    scrollOver: document.documentElement.scrollHeight - vh
  };
})()`;
const POOL = lv => `[MG_LOSE[${lv}].say].concat(MG_LOSE_SAY)`;
const startLose = async (lv, ok) => {
  await b.boot(lv, 'visual');
  await b.ev(STUB_SAY);
  await b.ev(`(() => { for (let i = 0; i < ${ok}; i++) mgOnCorrect(); debugEndGame(false); return true; })()`);
};
const realClick = async sel => {
  const pt = await b.ev(`(() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
  await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
  await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
};

try {
  await b.nav(b.menu); await b.preserve();
  await b.viewport(960, 600);
  const errs0 = b.errors.length;

  // ---------- A. 一道没答对：直接落在鼓励页 ----------
  for (const lv of [5, 6]) {
    await startLose(lv, 0);
    await b.sleep(900);
    const r = await b.ev(INFO), want = await b.ev(`MG_LOSE[${lv}]`), pool = await b.ev(POOL(lv));
    P(/\bdone\b/.test(r.cls) && /\blose\b/.test(r.cls) && new RegExp('\\bscened lv' + lv + '\\b').test(r.cls), `L${lv} 0 分：舞台是「done lose scened lv${lv}」`, r.cls);
    P(r.title === want.title && r.sub === want.sub, `L${lv} 0 分：鼓励标题与副句`, [r.title, r.sub]);
    P(r.scene === 'cs-scene', `L${lv} 0 分：插画不亮灯`, r.scene);
    P(r.partner, `L${lv} 0 分：朋友在场`, r.partner);
    P(r.acts.length === 1 && r.acts[0].go === 'retry' && r.acts[0].pri && /再来一局/.test(r.acts[0].t), `L${lv} 0 分：只有一个主按钮「再来一局」，没有「下一关」`, r.acts);
    const enc = r.said.filter(s => pool.includes(s));
    P(enc.length === 1, `L${lv} 0 分：只念了一句鼓励语音，且在登记过的句子里`, r.said);
    P(r.okTitle && r.okAct && r.okPartner, `L${lv} 0 分 960×600：标题、朋友、按钮都在屏内`, r);
    if (r.dots) P(r.lit === 0, `L${lv} 0 分：小圆点一颗不亮`, r);
    await b.shot(`lose_gate_L${lv}_zero`);

    // 真点击「再来一局」：舞台撤掉，新一局开始
    await realClick('#cs-stage .cs-act');
    await b.poll(`!document.getElementById('cs-stage')`, 3000).catch(() => {});
    await b.sleep(500);
    const after = await b.ev(`({ stage: !!document.getElementById('cs-stage'), shown: document.getElementById('overlay').classList.contains('show') })`);
    P(!after.stage && !after.shown, `L${lv} 真点「再来一局」：舞台与结算卡都收起，回到对局`, after);
  }

  // ---------- B. 答对过：先开宝箱，再落到同一页 ----------
  for (const lv of [5, 6]) {
    await startLose(lv, 4);
    await b.poll(`!!document.querySelector('#cs-stage .cs-chest')`, 6000);
    const first = await b.ev(INFO);
    P(!/\blose\b/.test(first.cls) || first.acts.length === 0, `L${lv} 答对 4 题：先是宝箱，不直接出鼓励页`, first.cls);
    await realClick('#cs-stage .cs-chest');
    await b.poll(`!!document.querySelector('#cs-stage .cs-acts')`, 8000);
    await b.sleep(300);
    const r = await b.ev(INFO), want = await b.ev(`MG_LOSE[${lv}]`), pool = await b.ev(POOL(lv));
    P(/\blose\b/.test(r.cls) && new RegExp('\\bscened lv' + lv + '\\b').test(r.cls), `L${lv} 开完宝箱：落在 lose 小剧场上`, r.cls);
    P(r.title === want.title, `L${lv} 开完宝箱：标题换成鼓励话`, r.title);
    P(r.scene === 'cs-scene', `L${lv} 开完宝箱：插画仍不亮灯`, r.scene);
    P(r.acts.length === 1 && r.acts[0].go === 'retry' && r.acts[0].pri, `L${lv} 开完宝箱：只有一个主按钮「再来一局」`, r.acts);
    P(r.said.filter(s => pool.includes(s)).length === 1, `L${lv} 开完宝箱：只念了一句鼓励语音`, r.said);
    P(r.okTitle && r.okAct, `L${lv} 开完宝箱：标题与按钮在屏内`, r);
    await b.shot(`lose_gate_L${lv}_some`);

    // 硬件返回键：收起舞台回到静态结算卡，卡上标题也是鼓励话
    const back = await b.ev(`mgStageBack()`);
    await b.sleep(250);
    const card = await b.ev(`({ stage: !!document.getElementById('cs-stage'), title: document.getElementById('overlay-title').textContent, retry: getComputedStyle(document.getElementById('retry-btn')).display !== 'none', next: getComputedStyle(document.getElementById('next-level-btn')).display !== 'none' })`);
    P(back === true && !card.stage && card.title === want.title && card.retry && !card.next, `L${lv} 返回键：回到静态结算卡（鼓励标题 + 再来一局，无下一关）`, card);
  }

  // ---------- C. 不该变的 ----------
  const pure = await b.ev(`({
    sprint: mgLoseLv({ win: false, level: 5, sprintN: 3 }), l1: mgLoseLv({ win: false, level: 1 }), l4: mgLoseLv({ win: false, level: 4 }),
    win5: mgLoseLv({ win: true, level: 5 }), wsWin6: mgWsLv({ win: true, level: 6 }), wsWin1: mgWsLv({ win: true, level: 1 }), nul: mgWsLv(null),
    lose5: mgWsLv({ win: false, level: 5 }), lose6: mgWsLv({ win: false, level: 6 })
  })`);
  P(pure.sprint === 0 && pure.l1 === 0 && pure.l4 === 0 && pure.win5 === 0, '速算局 / 前四关 / 通关局不进 lose 小剧场', pure);
  P(pure.wsWin6 === 6 && pure.wsWin1 === 1 && pure.nul === 0 && pure.lose5 === 5 && pure.lose6 === 6, '通关场景判定不变，lose 只认 5、6 关', pure);
  const lines = await b.ev(`mgTtsPrefetchLines()`);
  const reg = await b.ev(`[5, 6].map(l => MG_LOSE[l].say).concat(MG_LOSE_SAY)`);
  P(reg.length === 4 && reg.every(s => lines.includes(s)), '4 句鼓励语音都登记在预取清单里（离线可念）', reg.filter(s => !lines.includes(s)));
  await b.boot(1, 'visual');
  await b.ev(`debugEndGame(false); true`); await b.sleep(900);
  const l1 = await b.ev(INFO);
  P(!/\blose\b/.test(l1.cls || '') && !/scened/.test(l1.cls || ''), 'L1 失败局：仍是旧的宝箱舞台，不进鼓励页', l1.cls);

  // ---------- D. 小屏幕 / 竖屏 / 减少动效 ----------
  for (const [w, h] of [[900, 500], [800, 480], [412, 915]]) {
    await b.viewport(w, h);
    for (const lv of [5, 6]) {
      await startLose(lv, 0); await b.sleep(900);
      const r = await b.ev(INFO);
      P(r.okTitle && r.okAct && r.okPartner && r.scrollOver <= 0, `L${lv} ${w}×${h}：标题、朋友、按钮在屏内，页面不滚动`, r);
      if (lv === 6) await b.shot(`lose_gate_${w}x${h}`);
    }
  }
  await b.viewport(960, 600);
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await startLose(6, 0); await b.sleep(900);
  const rm = await b.ev(`(() => { const p = document.querySelector('#cs-stage .cs-lone .cs-partner'); return p ? getComputedStyle(p).animationName : null; })()`);
  P(rm === 'none', '减少动效：朋友不再上下晃', rm);
  await b.send('Emulation.setEmulatedMedia', { features: [] });

  P(b.errors.length === errs0, '全程没有未捕获异常', b.errors.slice(errs0));
} catch (err) {
  P(false, '闸门异常: ' + (err && err.message || err));
} finally {
  try { await b.restore(); } catch (x) {}
  await b.close();
}
finish('LOSE SCENE');
