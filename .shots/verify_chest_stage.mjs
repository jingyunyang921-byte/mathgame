// 结算宝箱舞台：出现→点开→能量球飞→收下→卡里静态结果；自动补领、返回键、吃饱文案、升段、减少动态、三视口。
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
const probe = String.raw`(() => {
  const s = document.getElementById('cs-stage'), ov = document.getElementById('overlay'), card = document.getElementById('overlay-chest');
  const o = ov.getBoundingClientRect(), r = s ? s.getBoundingClientRect() : null;
  const hit = el => { if (!el) return false; el.scrollIntoView({ block: 'nearest' }); const a = el.getBoundingClientRect(), t = document.elementFromPoint(a.x + a.width / 2, a.y + a.height / 2); return a.top >= 0 && a.bottom <= innerHeight + 1 && a.left >= 0 && a.right <= innerWidth + 1 && (t === el || el.contains(t)); };
  const strip = s && s.querySelector('.egg-strip'), sr = strip ? strip.getBoundingClientRect() : null;
  return { stage: s ? s.className : '', inOverlay: !!s && s.parentNode === ov, role: s ? s.getAttribute('role') : '',
    covers: !!r && r.width >= o.width - 1 && r.height >= o.height - 1, strips: document.querySelectorAll('.egg-strip,.egg-line').length,
    cardCls: card.className, cardEmpty: card.innerHTML === '', cardText: card.textContent, cardTap: !!card.querySelector('.chest-tap'), cardChips: card.querySelectorAll('.chest-reward:not(.care)').length, lines: card.querySelectorAll('.egg-line').length,
    title: s && s.querySelector('.cs-title') ? s.querySelector('.cs-title').textContent : '', text: s ? s.textContent : '',
    chips: [...document.querySelectorAll('.cs-chip')].map(n => n.textContent),
    chestHit: hit(s && s.querySelector('.cs-chest')), goHit: !!s && [...s.querySelectorAll('.cs-act')].length > 0 && [...s.querySelectorAll('.cs-act')].every(hit), hasGo: !!(s && s.querySelector('.cs-acts')), hasOldGo: !!(s && s.querySelector('.cs-go')),
    stripIn: !!sr && sr.top >= 0 && sr.bottom <= innerHeight + 1 && sr.left >= 0 && sr.right <= innerWidth + 1,
    em: s && s.querySelector('.egg-strip em') ? s.querySelector('.egg-strip em').textContent : '',
    xScroll: document.documentElement.scrollWidth <= innerWidth + 1,
    pet: JSON.parse(localStorage.getItem('mathgamePet') || 'null'), snap: window._currentGame._mgRoundSnap && { claimed: window._currentGame._mgRoundSnap.claimed },
    dangling: [...document.querySelectorAll('use')].map(u => u.getAttribute('href')).filter(h => h && !document.querySelector(h)) };
})()`;
const end = (win, correct) => b.ev(`_mgWrong=${win ? 0 : 3};_mgCorrect=${correct};_mgMaxStreak=${correct};_mgRoundStart=Date.now()-7000;debugEndGame(${win});true`);
const restart = async () => { await b.ev('window._currentGame._restart();true'); await b.poll(`(document.getElementById('mg-countdown-badge')||{style:{}}).style.display==='none'`); };
const fresh = () => b.ev(`localStorage.removeItem('mathgamePet');localStorage.removeItem('mathgameStars');MG_PET.adopt();true`);
const stageUp = (cls = 'closed') => b.poll(`(document.getElementById('cs-stage')||{className:''}).className.includes('${cls}')`, 4000);
const watchOrb = () => b.ev(`window.__orb=false;new MutationObserver(()=>{if(document.querySelector('.flyorb'))window.__orb=true}).observe(document.body,{childList:true,subtree:true});true`);
const rules = /没有|不能|失败|已满|上限|用完|不再/;
try {
  await b.nav(b.menu); await b.preserve(); await b.viewport(960, 576);
  await fresh(); await b.boot(1); await watchOrb();

  // 1. 完整流程：首次通关（+7 点能量、星币、首次礼物）。strips = 页面里的萌蛋进度份数，只在舞台里有一份；收下后卡里不再重复（0 份）。
  await end(true, 10); await b.sleep(300);
  const early = await b.ev(probe);
  P(early.stage === '' && early.cardCls === '' && early.cardEmpty && !early.cardTap && early.strips === 0, '结算卡里不再摆合着的宝箱，舞台约 0.55 秒后才出现，此时页面里还没有萌蛋进度', early);
  await stageUp('closed');
  const up = await b.ev(probe);
  P(up.inOverlay && up.covers && up.role === 'dialog' && up.cardEmpty && up.strips === 1, '舞台挂在 #overlay 下盖满屏，卡里清空，页面里仍只有一份萌蛋条', up);
  P(up.chestHit && up.stripIn && up.text.includes('点一点') && up.dangling.length === 0, '大宝箱在最上层可点，提示语与萌蛋条完整在屏内，SVG 可解析', up);
  await b.shot('stage_closed_960x576');
  await b.ev(`document.querySelector('#cs-stage .cs-chest').click();true`); await b.sleep(250);
  const opened = await b.ev(probe);
  P(opened.stage.includes('opened') && opened.chips.some(t => t.includes('+7 成长能量')) && opened.chips.some(t => t.includes('星币')) && opened.strips === 1, '点开后舞台进入 opened：+7 成长能量与星币牌，仍只有一份萌蛋条', opened);
  await b.poll('!!document.querySelector("#cs-stage .cs-acts")', 9000);
  const done = await b.ev(probe);
  P(await b.ev('window.__orb'), '能量球确实飞过（普通模式）');
  P(done.stage.includes('done') && done.em === '7' && done.goHit && done.stripIn && done.title.includes('第1关通关') && !done.hasOldGo, '动画结束：条涨到 7，标题「第1关通关！」，再来一局 / 下一关按钮可点且不被遮挡', done);
  P(done.pet.xp === 7 && done.pet.xpDay.got === 7 && done.pet.stage === 0, '入账 7 点，不孵化', done.pet);
  await b.shot('stage_done_960x576');
  await b.ev(`mgStageDismiss();true`); await b.sleep(250);
  const card = await b.ev(probe);
  P(card.stage === '' && card.cardCls === 'show open' && card.strips === 0 && card.lines === 0 && card.cardChips === 0 && !card.cardTap && !card.cardText.includes('萌蛋') && card.cardText.includes('柔软窝垫'), '收下后舞台消失，卡里只剩礼物故事预告（没有第二个宝箱、没有重复的奖励牌、不再重复萌蛋进度）', card);

  // 2. 硬件返回键：舞台在场时先补领再收舞台，留在结算卡；舞台不在场时不拦截
  await restart(); await fresh(); await end(true, 10); await stageUp('closed');
  const back = await b.ev(`(() => { const r1 = mgStageBack(), s = window._currentGame._mgRoundSnap, xp = JSON.parse(localStorage.getItem('mathgamePet')).xp;
    return { r1, stage: !!document.getElementById('cs-stage'), claimed: s.claimed, xp, r2: mgStageBack(), card: document.getElementById('overlay-chest').className, strips: document.querySelectorAll('.egg-strip,.egg-line').length }; })()`);
  P(back.r1 === true && !back.stage && back.claimed && back.xp === 7 && back.r2 === false && back.card === 'show open' && back.strips === 0, '返回键：没点开也先补领 +7、收起舞台、卡里出静态结果；舞台已收时不再拦截', back);

  // 3. 不点宝箱就离开：舞台还没弹出（200ms）与已弹出时，补领后都不能留下点了没反应的合着宝箱
  for (const [wait, label] of [[200, '舞台弹出前'], [1300, '舞台已弹出']]) {
    await restart(); await fresh(); await end(true, 10); await b.sleep(wait);
    const auto = await b.ev(`(() => { document.getElementById('overlay-btns').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const card = document.getElementById('overlay-chest'), s = window._currentGame._mgRoundSnap;
      return { stage: !!document.getElementById('cs-stage'), claimed: s.claimed, xp: JSON.parse(localStorage.getItem('mathgamePet')).xp,
        card: card.className, tap: !!document.querySelector('.chest-tap'), strips: document.querySelectorAll('.egg-strip,.egg-line').length }; })()`);
    P(!auto.stage && auto.claimed && auto.xp === 7 && auto.card === 'show open' && !auto.tap && auto.strips === 0, label + '点结算按钮离开：自动补领 +7，卡里是静态结果而不是合着的宝箱', auto);
    await b.sleep(1100);
    P(await b.ev(`!document.getElementById('cs-stage') && !document.querySelector('.chest-tap')`), label + '补领后迟到的舞台定时器不会再弹出舞台');
  }

  // 4. 吃饱当天再通关：不涨能量、不说丧气话，星币照常；舞台标题给出下一步
  await restart(); await fresh();
  await b.ev(`MG_PET.recordRound(5, 'seed-a', undefined, true); MG_PET.recordRound(5, 'seed-b', undefined, true); true`);
  await end(true, 10); await stageUp('closed');
  await b.ev(`document.querySelector('#cs-stage .cs-chest').click();true`); await b.poll('!!document.querySelector("#cs-stage .cs-acts")', 9000);
  const full = await b.ev(probe);
  P(full.title.includes('今天吃饱啦') && (full.text.match(/明天在小窝里用上/g) || []).length === 1 && (full.text.match(/收进背包/g) || []).length === 1 && !rules.test(full.text) && full.chips.some(t => t.includes('星币')) && full.chips.some(t => t.includes('暖草')) && !full.chips.some(t => t.includes('成长能量')), '吃饱后通关：标题“今天吃饱啦”，材料先收进背包明天用（副标题不重复这句），没有能量牌、没有丧气话，星币照常', full);
  P(full.pet.xp === 10 && full.goHit, '吃饱后能量仍是 10 点，结算按钮可点', full.pet);
  await b.ev(`mgStageDismiss();true`);

  // 5. 跨阶段：舞台标题与卡里都提示萌蛋长大
  await restart(); await fresh();
  await b.ev(`(() => { const p = MG_PET.get(), now = new Date(), ago = n => new Date(now.getFullYear(), now.getMonth(), now.getDate() - n, 12);
    p.adoptedDay = MG_PET.dayKey(ago(9)); p.xp = 70; p.days = [MG_PET.dayKey(ago(9))]; localStorage.setItem('mathgamePet', JSON.stringify(p)); return true; })()`);
  await end(true, 10); await stageUp('closed');
  await b.ev(`document.querySelector('#cs-stage .cs-chest').click();true`); await b.poll('!!document.querySelector("#cs-stage .cs-acts")', 9000);
  const g2 = await b.ev(probe), name = await b.ev('MG_PET.phases[1].name');
  P(g2.title.includes('萌蛋长大啦') && g2.title.includes(name) && g2.pet.xp === 77 && g2.pet.phase === 1 && g2.pet.stage === 0, '跨过 75 点：标题“萌蛋长大啦”并报新阶段名，仍是蛋（没有提前孵化）', g2);
  await b.shot('stage_phase_up_960x576');
  await b.ev(`mgStageDismiss();true`);

  // 6. 减少动态效果：不飞球、不放彩带、舞台元素无动画，但内容与按钮完整
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await restart(); await fresh(); await b.ev('window.__orb=false;true'); await end(true, 10); await stageUp('closed');
  const calm = await b.ev(`(() => { const names = [...document.querySelectorAll('#cs-stage .cs-ring,#cs-stage .cs-chest,#cs-stage .cs-hand,#cs-stage .cs-cue')].map(n => getComputedStyle(n).animationName); return { names, n: names.length }; })()`);
  P(calm.n > 0 && calm.names.every(n => n === 'none'), '减少动态效果：舞台上的光环 / 宝箱 / 手势 / 提示都不播放动画', calm);
  await b.ev(`document.querySelector('#cs-stage .cs-chest').click();true`); await b.poll('!!document.querySelector("#cs-stage .cs-acts")', 9000);
  const rm = await b.ev(probe);
  P(!(await b.ev('window.__orb')) && rm.chips.some(t => t.includes('+7 成长能量')) && rm.em === '7' && rm.goHit && rm.strips === 1, '减少动态效果：不飞球，数字与按钮完整，条直接到 7', rm);
  await b.ev(`mgStageDismiss();true`);
  await b.send('Emulation.setEmulatedMedia', { features: [] });

  // 7. 三个视口：合着与结算两个状态下，宝箱 / 萌蛋条 / 收下啦都完整在屏内且可点
  for (const [w, h] of (b.device ? [[960, 576]] : [[960, 576], [900, 500], [412, 915]])) {
    await b.viewport(w, h); await restart(); await fresh(); await end(true, 10); await stageUp('closed'); await b.sleep(500);
    const c = await b.ev(probe);
    P(c.covers && c.chestHit && c.stripIn && c.xScroll && c.strips === 1, `${w}×${h} 合着的宝箱：盖满屏、宝箱可点、萌蛋条在屏内`, c);
    await b.shot(`stage_closed_${w}x${h}`);
    await b.ev(`document.querySelector('#cs-stage .cs-chest').click();true`); await b.poll('!!document.querySelector("#cs-stage .cs-acts")', 9000);
    const d = await b.ev(probe);
    P(d.covers && d.goHit && d.stripIn && d.xScroll && d.strips === 1 && d.em === '7' && d.dangling.length === 0, `${w}×${h} 结算态：结算按钮可点、萌蛋条在屏内、条涨到 7`, d);
    await b.shot(`stage_done_${w}x${h}`);
    await b.ev(`mgStageDismiss();true`); await b.sleep(250);
    P(await b.ev(`!document.getElementById('cs-stage') && document.getElementById('overlay-chest').className==='show open'`), `${w}×${h} 收下后回到静态结算卡`);
  }
  P(b.errors.length === 0, '宝箱舞台无浏览器脚本异常', b.errors);
} finally {
  try { await b.send('Emulation.setEmulatedMedia', { features: [] }); await b.restore(); } finally { await b.close(); }
}
finish('CHEST STAGE');
