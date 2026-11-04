// 成长旅行结算：礼物替代经验；输局记录学习；重复结算幂等；新一局仍可正常结算。
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
const probe = String.raw`(() => {
  const box=document.getElementById('overlay-chest'),card=document.getElementById('overlay-content').getBoundingClientRect();
  return {shown:box.classList.contains('show'),pop:box.classList.contains('pop'),
    stage:box.querySelector('.chest-stage use')?.getAttribute('href'),text:box.textContent,
    rewards:[...box.querySelectorAll('.chest-reward')].map(n=>({text:n.textContent,kind:n.className})),
    pet:JSON.parse(localStorage.getItem('mathgamePet')||'null'),snap:window._currentGame._mgRoundSnap,
    particles:document.getElementById('mg-confetti-layer')?.children.length||0,
    fits:card.top>=0&&card.bottom<=innerHeight+1,
    dangling:[...document.querySelectorAll('use')].map(u=>u.getAttribute('href')).filter(h=>h&&!document.querySelector(h))};
})()`;
const end = async (win, correct) => b.ev(`_mgWrong=${win?0:3};_mgCorrect=${correct};_mgMaxStreak=${correct};_mgRoundStart=Date.now()-7000;debugEndGame(${win});true`);
// 奖励牌和萌蛋进度只在舞台上出现：走完舞台后把牌并进 rewards、舞台文字放进 stage，卡里的文字单独看 text。
const settled = async (wait = 300) => {
  await b.sleep(700); const t = await b.takeChest(); await b.sleep(wait);
  const p = await b.ev(probe); p.rewards = [...(t ? t.chips : []).map(c => ({ text: c.text, kind: c.kind })), ...p.rewards]; p.stageText = t ? t.stage : ''; return p;
};
// 点开后立刻取样舞台（彩带 / 单份萌蛋条 / 卡里已清空），再走完舞台回到静态卡。
const openProbe = async () => {
  await b.sleep(700); await b.ev(`document.querySelector('.chest-tap').click();true`); await b.sleep(300);
  const o = await b.ev(`({stage:(document.getElementById('cs-stage')||{}).className||'',particles:document.getElementById('mg-confetti-layer')?.children.length||0,strips:document.querySelectorAll('.egg-strip,.egg-line').length,card:document.getElementById('overlay-chest').className})`);
  await b.poll(`!!document.querySelector('#cs-stage .cs-acts')`, 9000);
  const chips = await b.ev(`[...document.querySelectorAll('#cs-stage .cs-chip')].map(n => ({ text: n.textContent, kind: n.className }))`);
  const stageText = await b.ev(`document.getElementById('cs-stage').innerText.replace(/\\s+/g, ' ')`);
  await b.ev(`mgStageDismiss();true`); await b.sleep(300);
  const p = await b.ev(probe); p.rewards = [...chips, ...p.rewards]; p.stageText = stageText;
  return { o, p };
};
try {
  await b.nav(b.menu); await b.preserve(); await b.viewport(1000,576);
  await b.ev(`localStorage.removeItem('mathgamePet');localStorage.removeItem('mathgameStars');MG_PET.adopt();true`);
  await b.boot(1);
  await b.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await end(true,10); const a=await settled(300);
  P(a.shown && !a.stage && a.particles===0 && !a.text.includes('点一点'), '减少动态效果时收下后卡里只剩礼物故事预告（没有宝箱图），不放彩带',a);
  P(a.text.includes('柔软窝垫') && a.text.includes('小兔'), '首次通关显示具体礼物和送礼的新朋友',a.text);
  P(a.snap.chestExp===0 && a.pet.stage===0 && a.pet.exp===0 && a.pet.days.length===1 && a.pet.xp===7, '答对10题通关：打卡+4、通关+3 = 7 点，不按经验孵化',a.pet);
  P(a.stageText.includes('再 68 点') && a.stageText.includes('今天已吃 7 / 10 点') && !a.text.includes('萌蛋') && a.rewards.some(r=>r.kind.includes('coin')) && a.rewards.some(r=>r.kind.includes('en') && r.text.includes('+7')), '学习日、星币与 +7 成长能量反馈齐全（都在舞台上讲，卡里不重复萌蛋进度）',[a.stageText,a.text]);
  P(a.fits && a.dangling.length===0, '576高结算卡不溢出且SVG可解析');
  const duplicate=await b.ev(`(() => {const before={coins:localStorage.getItem('mathgameCoins'),pet:localStorage.getItem('mathgamePet')},g=window._currentGame,s=g._mgRoundSnap;
    const same=mgFinishRound(1,true,10,g)===s;return {same,coins:before.coins===localStorage.getItem('mathgameCoins'),pet:before.pet===localStorage.getItem('mathgamePet')};})()`);
  P(duplicate.same && duplicate.coins && duplicate.pet, '同一局再次结算复用快照，不重复发币或记学习',duplicate);
  await b.send('Emulation.setEmulatedMedia',{features:[]});
  await b.ev('window._currentGame._restart();true');
  P(await b.ev('window._currentGame._mgRoundSnap===null'), '重开会清除本局结算快照');
  await b.poll(`(document.getElementById('mg-countdown-badge')||{style:{}}).style.display==='none'`);
  await end(true,10); const { o: stg, p: repeat } = await openProbe();
  P(repeat.snap.correct===10 && repeat.snap.firstPartner===false && !repeat.snap.petGift, '新一局正常计分，重复通关不重复发礼物',repeat.snap);
  P(!repeat.text.includes('送来「柔软窝垫」') && repeat.rewards.some(r=>r.kind.includes('en') && r.text.includes('+3')) && repeat.pet.xp===10 && repeat.stageText.includes('今天吃饱啦'), '同天第二次通关再吃 +3 点到每日上限 10；不再重复送同一份礼物',[repeat.text,repeat.stageText]);
  P(stg.stage.includes('opened') && stg.particles>0 && stg.strips===1 && stg.card==='', '普通模式点开后舞台放彩带，页面里只有一份萌蛋条，卡里先清空',stg);
  await b.shot('travel_chest_win');
  await b.ev('window._currentGame._restart();true');
  await b.poll(`(document.getElementById('mg-countdown-badge')||{style:{}}).style.display==='none'`);
  await end(true,10); const full=await settled(300);
  P(full.pet.xp===10 && !full.rewards.some(r=>r.kind.includes('en')) && full.rewards.some(r=>r.kind.includes('coin')) && full.stageText.includes('今天吃饱啦'), '吃饱后再通关不涨能量也不说丧气话，星币照常',full.stageText);

  await b.ev(`localStorage.removeItem('mathgamePet');MG_PET.adopt();true`);
  await b.boot(1); await end(false,4); const loss=await settled();
  P(!loss.shown && loss.text.trim()==='' && loss.snap.petCare.correct===4 && loss.pet.days.length===0, '输局4题照常累计，但还不是有效学习日；收下后卡里不再重复萌蛋进度',[loss.text,loss.stageText]);
  P(loss.stageText.includes('今天再答对 1 题') && !loss.rewards.some(r=>r.kind.includes('snack')), '输局在宝箱舞台上显示实际学习进度，不发通关礼物',loss.stageText);
  await b.boot(1); await end(false,1); const enough=await settled();
  P(enough.snap.petCare.done && enough.pet.days.length===1, '同一天两局输局4+1题可记录一个学习日',enough.snap);
  await b.shot('travel_chest_loss');

  await b.ev(`localStorage.removeItem('mathgamePet');true`);
  await b.boot(1); await end(true,10); const none=await settled();
  P(none.pet===null && none.snap.petCare===null && !none.snap.petGift && !none.shown && none.rewards.some(r=>r.kind.includes('coin')) && !none.rewards.some(r=>r.kind.includes('en')) && !none.text.includes('成长能量'), '未领养只给正常奖励（星币牌在舞台上），不凭空领养或喂经验，卡里没有学习进度也没有空宝箱',none.snap);

  await b.ev(`MG_PET.adopt();true`); await b.boot(1);
  await b.ev(`window.__oldRec=MG_PET.recordRound;MG_PET.recordRound=()=>{throw new Error('模拟存储失败')};_mgCorrect=5;debugEndGame(false);true`);
  let error; try { error=await settled(); } finally { await b.ev(`MG_PET.recordRound=window.__oldRec;true`); }
  P(error.snap.petCareError && error.text.includes('学习记录未保存'), '保存失败时结算明确显示错误，不伪装成已记录',error.text);
  P(b.errors.length===0, '结算各场景无脚本异常',b.errors);
} finally {
  try { await b.send('Emulation.setEmulatedMedia',{features:[]});await b.restore(); } finally { await b.close(); }
}
finish('TRAVEL CHEST');
