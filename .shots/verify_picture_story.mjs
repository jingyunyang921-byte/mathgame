// 图画书式界面：故事卡 = 一幅画 + 一句话（念出来，长文只留读屏）；手记 = 贴纸册；菜单不自动弹故事，红点和贴纸图标指路；结算舞台的牌子只剩图标和数字。
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
const MOCK = `(() => {
  window.__say = [];
  window.Capacitor = { isNativePlatform: () => true, Plugins: { Tts: { speak: o => { window.__say.push(o.text); return Promise.resolve(); }, stop: () => Promise.resolve(), prefetch: () => Promise.resolve() } } };
  return true; })()`;
// 看得见的字：跳过 .ps-sr（读屏专用）和 .quiet（整块收进读屏）
const VIS = `const visOf = el => { if (!el) return ''; let t = ''; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) { const n = w.currentNode; if (!n.parentElement.closest('.ps-sr,.quiet')) t += n.textContent; } return t.replace(/\\s+/g, ''); };`;
const clear = `MG_PET_STORY.close();document.querySelectorAll('.locked-modal.show').forEach(m=>{m.classList.remove('show');m.setAttribute('aria-hidden','true')});`;
const seed = `(() => { ['mathgamePet', 'mathgameStars', 'mathgameSettings'].forEach(k => localStorage.removeItem(k));
  MG_PET.adopt(); localStorage.setItem('mathgameStars', JSON.stringify({ 1: 1, 2: 1, 3: 1 })); [1, 2, 3].forEach(n => MG_PET.claimGift(n)); return MG_PET.get().stories.pending.slice(); })()`;
const reload = async () => { await b.nav(b.menu); await b.sleep(900); await b.ev(clear + 'true'); await b.ev(MOCK); };
try {
  await b.nav(b.menu); await b.preserve(); await b.viewport(1000, 576);
  const pending = await b.ev(seed);
  P(pending.includes('gift-1') && pending.includes('gift-2') && pending.includes('gift-3'), '准备：领到 3 份礼物，三张贴纸排在“新”里', pending);

  // 1. 菜单不自动弹故事；红点 + 贴纸图标指路
  await reload();
  const dots = await b.ev(`(() => { ${VIS} showPet(); const inv = document.getElementById('petStoryInvite'), today = document.getElementById('petPanelToday');
    return { open: MG_PET_STORY.isOpen(), btn: document.getElementById('petBtn').classList.contains('has-new'), tab: document.getElementById('petTabLog').classList.contains('has-new'),
      shown: !inv.hidden, inHead: !!inv.closest('.today-head'), art: !!inv.querySelector('svg'), vis: visOf(inv), aria: (inv.querySelector('button') || inv).getAttribute('aria-label'), label: document.getElementById('petTabLog').textContent }; })()`);
  P(!dots.open && dots.btn && dots.tab && dots.shown && dots.inHead && dots.art && dots.vis === '' && dots.aria === '新贴纸，点开看看', '进菜单不弹故事：小窝钮和“贴纸”标签亮红点，今天页右上角是一枚只有图 + 红点的贴纸钮（文字只在读屏里）', dots);
  P(dots.label.includes('贴纸'), '标签叫“贴纸”', dots.label);

  // 2. 故事卡：一幅画 + 一句话，念出来；长文只留读屏
  await b.ev(`document.querySelector('#petStoryInvite button').click();true`);
  const card = await b.ev(`(() => { ${VIS} const s = MG_PET.story('gift-1'), say = MG_PET_STORY.sayFor(s);
    return { open: MG_PET_STORY.isOpen(), title: document.getElementById('petStoryTitle').textContent, say, said: window.__say.slice(), vis: visOf(document.querySelector('#petStoryModal .ps-card')),
      sr: document.getElementById('petStoryText').textContent.length, srCls: document.getElementById('petStoryText').classList.contains('ps-sr'), scene: !!document.querySelector('#petStoryScene svg') }; })()`);
  P(card.open && card.title === card.say && card.said.at(-1) === card.say && card.scene, '点贴纸图标：打开第一张，大图下面一句话，同时念出来', card);
  P(card.vis.length <= 14 && card.vis.includes('点点看') && card.sr > 20 && card.srCls, '卡上看得见的字只有那句话和“点点看”，原来的长故事收进读屏', card);
  await b.ev(`document.getElementById('petStoryAction').click();true`);
  const react = await b.ev(`(() => ({ title: document.getElementById('petStoryTitle').textContent, said: window.__say.at(-1), reacted: !!document.querySelector('#petStoryScene .ps-reacted'),
    resp: document.getElementById('petStoryResponse').textContent.length, srCls: document.getElementById('petStoryResponse').classList.contains('ps-sr'), btn: document.getElementById('petStoryAction').textContent }))()`);
  P(react.title === react.said && react.title.includes('真开心') && react.reacted && react.resp > 10 && react.srCls && react.btn.includes('收好啦'), '点一下：画面动起来，换成一句回应并念出来；按钮变“收好啦”', react);
  await b.ev(`document.getElementById('petStoryAction').click();true`);
  P(await b.ev(`!MG_PET_STORY.isOpen() && MG_PET.get().stories.seen.includes('gift-1') && !MG_PET.get().stories.pending.includes('gift-1')`), '再点一下收好：故事记为看过，从“新”里移走');

  // 3. 读题语音设为 0：卡片照样出来，但一句话也不念
  await b.ev(`localStorage.setItem('mathgameSettings', JSON.stringify({ sfx: 0, bgm: 0, voice: 0 })); window.__say.length = 0; MG_PET_STORY.show('gift-2'); true`);
  const mute = await b.ev(`({ open: MG_PET_STORY.isOpen(), said: window.__say.length, title: document.getElementById('petStoryTitle').textContent })`);
  P(mute.open && mute.title && mute.said === 0, '读题语音为 0：故事卡照常显示，不发声', mute);
  await b.ev(`MG_PET_STORY.close();localStorage.removeItem('mathgameSettings');true`);

  // 4. 贴纸册：8 张蛋蛋贴纸 + 7×5 朋友贴纸，没拿到的是灰轮廓，不放字
  const views = b.device ? [[1000, 576]] : [[1000, 576], [900, 500], [412, 915]];
  for (const [w, h] of views) {
    await b.viewport(w, h);
    const alb = await b.ev(`(() => { ${VIS} ${clear} showPet(); petTab('Log');
      const eggs = [...document.querySelectorAll('#petLog .alb-egg')], grid = document.querySelector('#petLog .alb-grid'), cells = [...grid.children], own = [...document.querySelectorAll('#petLog .alb-s:not(.lock)')];
      const tap = [...document.querySelectorAll('#petLog .alb-egg:not(.lock), #petLog .alb-s:not(.lock)')].map(n => { n.scrollIntoView({ block: 'nearest' }); const r = n.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { hit: hit === n || n.contains(hit), w: r.width, h: r.height }; });
      return { eggs: eggs.length, eggsOpen: eggs.filter(e => !e.classList.contains('lock')).length, cells: cells.length, own: own.length, locks: grid.querySelectorAll('.alb-s.lock').length, lockTap: grid.querySelectorAll('button.alb-s.lock[data-hint][aria-disabled="true"]').length,
        fresh: own.filter(n => n.classList.contains('new')).length, dots: grid.querySelectorAll('.alb-dot').length, text: visOf(document.getElementById('petLog')).replace(/✧/g, ''), tap }; })()`);
    P(alb.eggs === 8 && alb.eggsOpen >= 1 && alb.cells === 35 && alb.own === 3 && alb.locks > 0 && alb.lockTap === alb.locks, `${w}×${h} 贴纸册：8 张蛋蛋 + 7×5 格，领到的 3 张是图，其余是灰轮廓、无字、点一下念怎么解锁`, alb);
    P(alb.fresh === alb.dots && alb.fresh === 2 && alb.text === '', `${w}×${h} 没看过的贴纸带红点（2 张），册子里没有可见文字`, alb);
    P(alb.tap.every(t => t.hit && t.w >= 28 && t.h >= 28), `${w}×${h} 每张已有的贴纸都点得到（≥28px）`, alb.tap.filter(t => !t.hit || t.w < 28 || t.h < 28));
  }
  await b.viewport(1000, 576);
  await b.ev(`${clear} showPet(); petTab('Log'); window.__say.length = 0; document.querySelector('#petLog .alb-egg:not(.lock)').click(); true`);
  P(await b.ev(`window.__say.at(-1) === MG_PET.phases[0].name`), '点蛋蛋贴纸：念出这一站的名字');
  // 4b. 点灰色贴纸：念“怎么解锁”，晃一下，不打开故事；声音设为 0 时只显示文字不发声
  const lockTap = await b.ev(`(() => { const grid = document.querySelector('#petLog .alb-grid'), cn = ['', '一', '二', '三', '四', '五', '六'], sl = MG_PET_STORY.sayLines();
    const cellAt = (r, c) => grid.children[r * 7 + c];
    const tapEl = n => { window.__say.length = 0; n.click(); return { said: window.__say.slice(), hint: n.getAttribute('data-hint'), label: n.getAttribute('aria-label'), nope: n.classList.contains('nope'), open: MG_PET_STORY.isOpen(), msg: document.getElementById('petResponse').textContent }; };
    const tier = (lv, k) => '用上' + MG_PET.tiers[k] + '份' + MG_PET.mats[lv].name + '！';
    const cases = [['没拿到礼物的朋友（第四关）', cellAt(0, 4), '过第' + cn[4] + '关，就有礼物！'], ['回声行，朋友也没拿到（第六关）', cellAt(1, 6), '过第' + cn[6] + '关，就有礼物！'], ['悄悄话礼物', cellAt(0, 2), '答题喂萌蛋，就解锁！'],
      ['回声行，礼物已有（第一关）', cellAt(1, 0), '答题喂萌蛋，就解锁！'], ['升级一档，礼物已有（第一关）', cellAt(2, 0), tier(1, 0)], ['升级三档，礼物已有（第三关）', cellAt(4, 3), tier(3, 2)], ['升级一档，没拿到礼物（第五关）', cellAt(2, 5), '过第' + cn[5] + '关，就有礼物！'],
      ['还没长到的蛋蛋', document.querySelector('#petLog .alb-egg.lock'), '答题喂萌蛋，就解锁！']];
    return cases.map(([name, n, want]) => Object.assign({ name, want, inBundle: sl.includes(want), len: want.length }, tapEl(n))); })()`);
  for (const c of lockTap) P(c.said.length === 1 && c.said[0] === c.want && c.hint === c.want && c.label === c.want && c.nope && !c.open && c.msg === c.want && c.inBundle && c.len <= 10, `点灰贴纸（${c.name}）：念“${c.want}”、晃一下、不开故事、文字同步、句子已进内置语音`, c);
  await b.sleep(700);
  P(await b.ev(`!document.querySelector('#petLog .nope')`), '晃动结束后自动收起');
  await b.ev(`localStorage.setItem('mathgameSettings', JSON.stringify({ sfx: 0, bgm: 0, voice: 0 })); window.__say.length = 0; document.querySelector('#petLog .alb-s.lock').click(); true`);
  P(await b.ev(`window.__say.length === 0 && document.getElementById('petResponse').textContent.length > 4 && document.getElementById('petResponse').classList.contains('ps-sr')`), '读题语音为 0：点灰贴纸不发声，提示只进读屏区（画面上不放字，格子照样晃一下）');
  await b.ev(`localStorage.removeItem('mathgameSettings');true`);
  await b.ev(`document.querySelector('#petLog .alb-s.new').click();true`);
  const sticker = await b.ev(`({ open: MG_PET_STORY.isOpen(), title: document.getElementById('petStoryTitle').textContent, sayFor: MG_PET_STORY.sayFor(MG_PET.story('gift-2')) })`);
  P(sticker.open && sticker.title === sticker.sayFor, '点一张新贴纸：打开它的故事卡', sticker);
  await b.ev(`document.getElementById('petStoryLater').click();true`);
  const left = await b.ev(`({ open: MG_PET_STORY.isOpen(), dots: document.querySelectorAll('#petLog .alb-dot').length, pending: MG_PET.get().stories.pending.length, tab: document.getElementById('petTabLog').classList.contains('has-new') })`);
  P(!left.open && left.dots === 1 && left.pending === 1 && left.tab, '点右上角 X 关掉：这张记为看过，红点少一个，还有一张时标签红点仍在', left);

  // 5. 结算舞台：牌子只剩图标和数字，说明收进读屏；平时不出现的文字行不占地方
  for (const [w, h] of [[1000, 576], [412, 915]]) {
    await b.viewport(w, h);
    await b.ev(`localStorage.clear(); sessionStorage.clear(); localStorage.setItem('mathgameSettings', JSON.stringify({ sfx: 0, bgm: 0, voice: 0 })); MG_PET.adopt(); true`);
    await b.boot(3);
    await b.ev('_mgCorrect=10;debugEndGame(true);true'); await b.sleep(650);
    await b.poll(`!!document.querySelector('#cs-stage .chest-tap')`, 9000);
    await b.ev(`document.querySelector('#cs-stage .chest-tap').click();true`);
    await b.poll(`!!document.querySelector('#cs-stage .cs-acts')`, 9000);
    await b.sleep(1500);
    const st = await b.ev(`(() => { ${VIS} const s = document.getElementById('cs-stage'), strip = s.querySelector('.egg-strip'), l2 = strip && strip.querySelector('.l2'), why = s.querySelector('.cs-why');
      const chips = [...s.querySelectorAll('.cs-chip')].map(c => ({ vis: visOf(c), all: c.textContent.replace(/\\s+/g, '') }));
      const tall = el => !el ? 0 : el.getBoundingClientRect().height;
      return { chips, whyQuiet: !!why && why.classList.contains('quiet'), whyH: tall(why), whyVis: visOf(why), l1n: strip ? visOf(strip.querySelector('.l1')) : '', l2Quiet: !!l2 && l2.classList.contains('quiet'), l2Vis: visOf(l2),
        hasEnergy: s.textContent.includes('成长能量'), hasCoin: s.textContent.includes('星币'), out: ['.cs-title', '.cs-chips', '.egg-strip', '.cs-act'].filter(q => { const e = s.querySelector(q); if (!e) return true; const r = e.getBoundingClientRect(), R = s.getBoundingClientRect(); return !(r.top >= R.top - 1 && r.bottom <= R.bottom + 1 && r.left >= R.left - 1 && r.right <= R.right + 1); }) }; })()`);
    const num = st.chips.filter(c => c.all.includes('成长能量') || c.all.includes('星币'));
    P(num.length === 2 && num.every(c => /^[+×\d]*$/.test(c.vis)), `${w}×${h} 舞台上的能量牌和星币牌只显示图标 + 数字，“成长能量 / 星币”留给读屏`, st.chips);
    P(st.whyQuiet && st.whyVis === '' && st.hasEnergy && st.hasCoin, `${w}×${h} 没升级时说明行整块收进读屏，不显示一段话`, st);
    P(/^\d+\/\d+$/.test(st.l1n) && st.l2Quiet && st.l2Vis === '' && st.out.length === 0, `${w}×${h} 萌蛋条只看到“能量 / 总数”，日常提示行收起，标题、牌子、萌蛋条、按钮都在屏内`, st);
    await b.ev('mgStageDismiss();true'); await b.sleep(300);
  }
  P(b.errors.length === 0, '新界面无浏览器脚本异常', b.errors);
} finally {
  try { await b.ev('MG_PET_STORY.close();true').catch(() => {}); await b.restore(); } finally { await b.close(); }
}
finish('PICTURE STORY');
