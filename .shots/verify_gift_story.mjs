// 六份礼物：真实结算→互动→永久摆件→阶段呼应→出生回忆。PET_DEVICE=1 验证APK。
import {petBrowser,verdicts} from './pet_browser.mjs';
const b=await petBrowser(),{check:P,finish}=verdicts();
const titles=['第一次安稳入睡','第一次带蛋出门','约定一首歌','一起走过山路','把海风带回家','为你留一盏灯'];
const clearModals=`MG_PET_STORY.close();document.querySelectorAll('.locked-modal.show').forEach(m=>m.classList.remove('show'));`;
const bounds=String.raw`(() => {
  const card=document.querySelector('#petStoryModal .ps-card'),r=card.getBoundingClientRect(),button=document.getElementById('petStoryAction');
  button.scrollIntoView({block:'nearest'});const a=button.getBoundingClientRect(),hit=document.elementFromPoint(a.x+a.width/2,a.y+a.height/2);
  return {fit:r.top>=0&&r.bottom<=innerHeight+1&&r.left>=0&&r.right<=innerWidth+1,
    width:card.scrollWidth<=card.clientWidth+1,hit:hit===button||button.contains(hit),title:document.getElementById('petStoryTitle').textContent,
    text:document.getElementById('petStoryResponse').textContent,
    animations:[...document.querySelectorAll('#petStoryScene .ps-buddy,#petStoryScene .ps-prop')].map(n=>getComputedStyle(n).animationName),
    dangling:[...document.querySelectorAll('#petStoryModal use')].map(u=>u.getAttribute('href')).filter(h=>!document.querySelector(h))};
})()`;
try{
  await b.nav(b.menu);await b.preserve();await b.viewport(1000,576);
  await b.ev(`${clearModals}localStorage.removeItem('mathgamePet');localStorage.removeItem('mathgameStars');MG_PET.adopt();true`);
  await b.boot(1);
  const failedStars=await b.ev(`(() => {
    const original=Storage.prototype.setItem;let failed=false;
    Storage.prototype.setItem=function(k,v){if(k==='mathgameStars'&&!failed){failed=true;throw new Error('模拟星星保存失败');}return original.call(this,k,v);};
    try {_mgCorrect=10;debugEndGame(true);return {injected:failed};}
    finally {Storage.prototype.setItem=original;}
  })()`);
  await b.sleep(650);
  await b.takeChest();
  Object.assign(failedStars,await b.ev(`(() => {const snap=window._currentGame._mgRoundSnap;return {error:snap.petGiftError,replay:snap.petGiftNeedsReplay,gift:snap.petGift,owned:MG_PET.get().gifts.includes(1)};})()`));
  P(failedStars.injected&&failedStars.error&&failedStars.replay&&!failedStars.gift&&!failedStars.owned&&await b.ev(`document.getElementById('overlay-chest').textContent.includes('星星暂未保存')`),'首次通关星星写入失败明确提示重新挑战，不承诺无法兑现的补领',failedStars);
  for(let lv=1;lv<=6;lv++){
    await b.boot(lv);await b.ev('_mgCorrect=10;debugEndGame(true);true');await b.sleep(650);await b.takeChest();
    const result=await b.ev(`(() => {const box=document.querySelector('#overlay-chest .ps-teaser');return {teaser:!!box,line:box?.querySelector('.ps-teaser-line')?.textContent,gift:MG_PET.gifts[${lv}],phase:MG_PET.giftPhase[${lv}]+1,stage:MG_PET.get().stage,pending:MG_PET.get().stories.pending};})()`);
    P(result.teaser&&result.line.includes(result.gift)&&result.line.includes('第'+result.phase+'阶段用上')&&result.pending.includes('gift-'+lv),`L${lv}点开宝箱后结算页给出一行礼物与用上的阶段，并入新故事`,result);
    await b.ev(`document.querySelector('#overlay-chest .ps-teaser button').click();true`);
    const opened=await b.ev(bounds);P(opened.fit&&opened.width&&opened.hit&&opened.dangling.length===0,`L${lv}故事卡完整，互动按钮可点`,opened);
    const before=await b.ev(`({days:MG_PET.get().days.length,phase:MG_PET.get().phase,coins:mgGetCoins()})`);
    await b.ev(`document.getElementById('petStoryAction').click();true`);
    const response=await b.ev(`({text:document.getElementById('petStoryResponse').textContent,reacted:!!document.querySelector('#petStoryScene .ps-reacted'),days:MG_PET.get().days.length,phase:MG_PET.get().phase,coins:mgGetCoins()})`);
    P(response.text.length>10&&response.reacted&&response.days===before.days&&response.phase===before.phase&&response.coins===before.coins,`L${lv}使用礼物有回应，不改变学习日、阶段或星币`,response);
    if(lv===1||lv===5||lv===6)await b.shot('gift_story_L'+lv);
    await b.ev(`document.getElementById('petStoryAction').click();true`);
    P(await b.ev(`!MG_PET_STORY.isOpen()&&MG_PET.get().stories.seen.includes('gift-${lv}')&&!MG_PET.get().stories.pending.includes('gift-${lv}')`),`L${lv}完成故事只记一次，关闭后仍能继续结算操作`);
  }
  await b.nav(b.menu);await b.ev(`${clearModals}showPet();true`);
  const nest=await b.ev(`(() => {const p=MG_PET.get();return {items:document.querySelectorAll('#petNestItems button').length,lit:!!document.querySelector('#petNestItems .lit'),phase:p.phase,stage:p.stage};})()`);
  P(nest.items===6&&!nest.lit&&nest.phase===0&&nest.stage===0,'六份礼物永久摆进小窝；初期蛋无裂纹，欢迎灯不提前亮',nest);
  const views=b.device?[[1000,576]]:[[1000,576],[900,500],[412,915]];
  for(const [w,h] of views){
    await b.viewport(w,h);
    const items=await b.ev(`(() => {showPet();petTab('Nest');return [...document.querySelectorAll('#petNestItems button')].map(n=>{n.scrollIntoView({block:'nearest'});const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {name:n.getAttribute('aria-label'),hit:hit===n||n.contains(hit),w:r.width,h:r.height};});})()`);
    P(items.length===6&&items.every(i=>i.hit&&i.w>=28&&i.h>=28),`${w}×${h} 六个摆件都可点击`,items);
    for(let lv=1;lv<=6;lv++){
      await b.ev(`MG_PET_STORY.show('gift-${lv}');true`);
      let box=await b.ev(bounds);P(box.fit&&box.width&&box.hit,`${w}×${h} 第${lv}章卡片与按钮边界`,box);
      await b.ev(`document.getElementById('petStoryAction').click();true`);
      box=await b.ev(bounds);P(box.fit&&box.width&&box.hit&&box.text.length>10,`${w}×${h} 展开回应后按钮仍可触达`);
      await b.ev('MG_PET_STORY.close();true');
    }
    await b.shot('gift_nest_'+w+'x'+h);
  }
  await b.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await b.ev(`MG_PET_STORY.show('gift-3');document.getElementById('petStoryAction').click();true`);
  const rm=await b.ev(bounds);P(rm.animations.every(n=>n==='none')&&rm.text.length>10,'减少动态效果时保留完整故事与回应，取消摆动动画',rm);
  await b.ev('MG_PET_STORY.close();true');await b.send('Emulation.setEmulatedMedia',{features:[]});
  const migration=await b.ev(`(() => {const p=MG_PET.get();delete p.stories;localStorage.setItem('mathgamePet',JSON.stringify(p));MG_PET_STORY.maybe();showPet();petTab('Log');return {auto:MG_PET_STORY.isOpen(),pending:MG_PET.get().stories.pending.length,stories:document.querySelectorAll('.pet-story-entry').length};})()`);
  P(!migration.auto&&migration.pending===0&&migration.stories===6,'历史六礼物升级后留在手记，不连续弹旧故事',migration);

  await b.viewport(1000,576);
  const growth=await b.ev(`(() => {
    const p=MG_PET.get(),now=new Date(),ago=n=>new Date(now.getFullYear(),now.getMonth(),now.getDate()-n,12);
    p.adoptedDay=MG_PET.dayKey(ago(49));p.lastDay=MG_PET.dayKey(now);p.days=Array.from({length:35},(_,i)=>MG_PET.dayKey(ago(49-i)));p.xp=525;
    localStorage.setItem('mathgamePet',JSON.stringify(p));renderPet();petTab('Today');
    return {phase:MG_PET.get().phase,queued:MG_PET.get().stories.pending,invite:document.getElementById('petStoryInvite').textContent};
  })()`);
  P(growth.phase===4&&growth.queued.includes('song-3')&&!growth.queued.includes('sea-5')&&!growth.queued.includes('light-6'),'认识声音阶段解锁熟悉旋律，不提前触发裂纹或欢迎灯',growth);
  await b.ev(`MG_PET_STORY.show('song-3');document.getElementById('petStoryAction').click();true`);
  P(await b.ev(`document.getElementById('petStoryResponse').textContent.includes('回应你的声音')`),'音符挂饰在成长时再次呼应同一首歌');
  await b.shot('gift_growth_song');await b.ev('MG_PET_STORY.close();true');
  await b.ev(`${clearModals}document.getElementById('rankUpModal').classList.add('show');MG_PET_STORY.maybe();true`);
  P(await b.ev(`!MG_PET_STORY.isOpen()&&MG_PET.get().stories.pending.includes('song-3')`),'升段占屏时新故事让位，未读记录保留');
  await b.ev(`${clearModals}MG_PET_STORY.maybe();true`);P(await b.ev('MG_PET_STORY.isOpen()'),'庆祝结束后再次进入可展示一个未读故事');await b.ev('MG_PET_STORY.close();true');

  const readyLamp=await b.ev(`(() => {
    ${clearModals}const p=MG_PET.get(),now=new Date(),ago=n=>new Date(now.getFullYear(),now.getMonth(),now.getDate()-n,12);
    p.adoptedDay=MG_PET.dayKey(ago(89));p.days=Array.from({length:60},(_,i)=>MG_PET.dayKey(ago(89-i)));p.xp=900;
    localStorage.setItem('mathgamePet',JSON.stringify(p));MG_PET_STORY.show('gift-6');
    return {ready:MG_PET.info().ready,stage:MG_PET.get().stage,story:!!MG_PET.story('light-6'),lit:!!document.querySelector('#petStoryScene .ps-lit')};
  })()`);
  P(readyLamp.ready&&readyLamp.stage===0&&!readyLamp.story&&!readyLamp.lit,'同页达到出生条件但仍是蛋时，欢迎灯不提前点亮',readyLamp);
  await b.ev('MG_PET_STORY.close();true');
  const birth=await b.ev(`(() => {
    ${clearModals}localStorage.removeItem('mathgamePet');localStorage.removeItem('mathgameStars');
    const p=MG_PET.adopt(),now=new Date(),ago=n=>new Date(now.getFullYear(),now.getMonth(),now.getDate()-n,12);
    p.adoptedDay=MG_PET.dayKey(ago(89));p.lastDay=MG_PET.dayKey(now);p.days=Array.from({length:60},(_,i)=>MG_PET.dayKey(ago(89-i)));p.xp=900;p.gifts=[1,3];
    localStorage.setItem('mathgamePet',JSON.stringify(p));maybeShowPetBirth();MG_PET_STORY.maybe();
    return {birth:document.getElementById('petBirthModal').classList.contains('show'),story:MG_PET_STORY.isOpen(),stage:MG_PET.get().stage,
      friends:document.querySelectorAll('#petBirthFriends svg').length,memories:document.querySelectorAll('#petBirthJourney .birth-gift-row').length,
      text:document.getElementById('petBirthJourney').textContent,snapshot:MG_PET.get().birthGifts};
  })()`);
  P(birth.birth&&!birth.story&&birth.stage===1&&birth.friends===2&&birth.memories===2&&!birth.text.includes('小海龟')&&!birth.text.includes('小刺猬'),'只有两份礼物也能正常出生，回顾与庆祝只出现当时的经历',birth);
  const snapshot=await b.ev(`(() => {hidePetBirth();localStorage.setItem('mathgameStars',JSON.stringify({6:1}));MG_PET.claimGift(6);showPetBirth(true);return {rows:document.querySelectorAll('#petBirthJourney .birth-gift-row').length,lamp:!!document.querySelector('#petBirthJourney .ps-lit'),friends:document.querySelectorAll('#petBirthFriends svg').length};})()`);
  P(snapshot.rows===2&&snapshot.friends===2&&!snapshot.lamp,'出生后新获得礼物不会改写第一次出生纪念',snapshot);
  const lamp=await b.ev(`(() => {hidePetBirth();const p=MG_PET.get();p.birthGifts=[1,3,6];localStorage.setItem('mathgamePet',JSON.stringify(p));showPetBirth(true);return {lit:!!document.querySelector('#petBirthJourney .ps-lit'),text:document.getElementById('petBirthJourney').textContent};})()`);
  P(lamp.lit&&lamp.text.includes('今天终于亮起来'),'拥有欢迎灯时，出生纪念中点亮这盏灯',lamp);
  await b.shot('gift_birth_memories');
  const postBirth=await b.ev(`(() => {hidePetBirth();const p=MG_PET.get();p.birthGifts=[1,3];localStorage.setItem('mathgamePet',JSON.stringify(p));localStorage.setItem('mathgameStars',JSON.stringify({5:1}));MG_PET.claimGift(5);return {gift:!!MG_PET.story('gift-5'),sea:!!MG_PET.story('sea-5'),lamp:!!MG_PET.story('light-6'),pending:MG_PET.get().stories.pending};})()`);
  P(postBirth.gift&&!postBirth.sea&&!postBirth.lamp&&!postBirth.pending.includes('sea-5'),'出生后新领贝壳保留礼物故事，不重新触发孵化裂纹',postBirth);
  const oldBirth=await b.ev(`(() => {const p=MG_PET.get();p.gifts=[1];delete p.stories;delete p.birthGifts;localStorage.setItem('mathgameStars',JSON.stringify({1:1}));localStorage.setItem('mathgamePet',JSON.stringify(p));MG_PET.get();localStorage.setItem('mathgameStars',JSON.stringify({1:1,2:1}));MG_PET.claimGift(2);showPetBirth(true);return {snapshot:MG_PET.get().birthGifts,memories:document.querySelectorAll('#petBirthJourney .birth-gift-row').length,friends:document.querySelectorAll('#petBirthFriends svg').length};})()`);
  P(oldBirth.snapshot.join(',')==='1'&&oldBirth.memories===1&&oldBirth.friends===1,'旧已出生档首次升级固定纪念，后领礼物不追写出生当天',oldBirth);
  P(b.errors.length===0,'剧情、音效与所有新界面无浏览器脚本异常',b.errors);
}finally{
  try{await b.ev('MG_PET_STORY.close();true');await b.send('Emulation.setEmulatedMedia',{features:[]});await b.restore();}finally{await b.close();}
}
finish('GIFT STORIES');
