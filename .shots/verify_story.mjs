// 成长旅行剧情：六位向导、首次结识与重复陪练、旅行图鉴、新家结局与出生分别庆祝。
import { petBrowser, verdicts } from './pet_browser.mjs';
const b=await petBrowser(),{check:P,finish}=verdicts();
const partners=[['p-bunny','小兔'],['p-squirrel','小松鼠'],['p-bird','小鸟'],['p-deer','小鹿'],['p-turtle','小海龟'],['p-hedgehog','小刺猬']];
const collection=String.raw`(() => {
  showCollection();const grid=document.getElementById('collectionGrid');
  return {title:document.getElementById('collectionTitle').textContent,sub:document.getElementById('collectionSub').textContent,
    lit:grid.querySelectorAll('.lit').length,gold:grid.querySelectorAll('.gold').length,dim:grid.querySelectorAll('.dim').length,
    locked:[...grid.querySelectorAll('.stamp-medal use')].filter(u=>u.getAttribute('href')==='#i-lock').length,
    buttons:document.querySelectorAll('.topbar-actions .icon-btn').length};
})()`;
const ending=String.raw`(() => {
  const em=document.getElementById('endingModal');return {shown:em.classList.contains('show'),
    title:document.getElementById('endingTitle').textContent,family:em.querySelectorAll('.ending-family use').length,
    seen:localStorage.getItem('mathgameTravelEndingSeen'),rankSeen:localStorage.getItem('mathgameRankSeen'),
    rank:document.getElementById('rankUpModal').classList.contains('show'),birth:document.getElementById('petBirthModal').classList.contains('show'),
    pet:MG_PET.get()};
})()`;
try{
  await b.nav(b.menu);await b.preserve();await b.viewport(1000,576);
  await b.ev(`localStorage.removeItem('mathgamePet');localStorage.removeItem('mathgameStars');MG_PET.adopt();true`);
  for(let level=1;level<=6;level++){
    await b.boot(level);
    const [sym,name]=partners[level-1];
    const intro=await b.ev(`(() => {
      const info=LEVEL_INTROS[${level}],s=document.getElementById('${sym}');
      return {icon:info.icon,rule:info.rule,exists:!!s,
        dangling:[...document.querySelectorAll('use')].map(u=>u.getAttribute('href')).filter(h=>h&&!document.querySelector(h))};
    })()`);
    P(intro.exists && intro.icon===sym && intro.rule.includes(name) && !/被困|救回|救出|得救/.test(intro.rule),`L${level}介绍是朋友向导`,intro);
    P(intro.dangling.length===0,`L${level}SVG引用可解析`);
    await b.ev(`_mgCorrect=10;debugEndGame(true);true`);await b.sleep(650);
    const taken=await b.takeChest();const pc=(taken?taken.chips:[]).find(c=>c.kind.includes('partner'));
    const result={text:pc?.text,href:pc?.href,stage:await b.ev('MG_PET.get().stage')};
    P(result.text===`认识了${name}！` && result.href==='#'+sym,`L${level}首次通关结识伙伴`,result);
    P(result.stage===0,`L${level}通关不提前孵化`);
    if(level===1||level===6)await b.shot('travel_story_L'+level);
  }
  await b.boot(1);await b.ev('_mgCorrect=10;debugEndGame(true);true');await b.sleep(650);
  const repeat=(await b.takeChest()).chips.find(c=>c.kind.includes('partner'));
  P(!repeat,'重复通关不再出现伙伴牌（只有首次通关才认识）',repeat);

  await b.nav(b.menu);
  await b.ev(`document.querySelectorAll('.locked-modal.show').forEach(n=>n.classList.remove('show'));localStorage.setItem('mathgameStars',JSON.stringify({1:3,2:2,3:1}));localStorage.setItem('mathgameMaxCompletedLevel','3');true`);
  const c=await b.ev(collection);
  P(c.title==='旅行伙伴' && c.lit===3 && c.gold===1 && c.dim===3 && c.locked===0,'旅行伙伴图鉴：6关全开放，未通关的3格是剪影、无上锁格',c);
  P(c.sub==='已结识 3 / 6 位伙伴 · 1 位熟悉伙伴' && c.buttons===4,'图鉴文案与四按钮入口一致',c);
  await b.shot('travel_collection');
  await b.ev(`localStorage.setItem('mathgameStars',JSON.stringify({1:3,2:3,3:3,4:3,5:3,6:3}));localStorage.setItem('mathgameMaxCompletedLevel','6');localStorage.removeItem('mathgameTravelEndingSeen');localStorage.setItem('mathgameRankSeen','999');true`);
  await b.nav(b.menu);const e1=await b.ev(ending);
  P(e1.shown && e1.title==='新家准备好啦！' && e1.family===6 && e1.seen==='1','全通关只庆祝新家准备完成',e1);
  P(e1.pet.stage===0 && !e1.birth,'第六关与新家结局均不让蛋提前出生',e1);
  await b.nav(b.menu);const e2=await b.ev(ending);P(!e2.shown,'新家结局只自动弹一次');
  await b.ev(`localStorage.setItem('mathgameStars',JSON.stringify({1:3,2:3,3:3,4:3,5:3,6:3}));localStorage.removeItem('mathgameTravelEndingSeen');localStorage.removeItem('mathgameRankSeen');true`);
  await b.nav(b.menu);const e3=await b.ev(ending);
  P(e3.shown && !e3.rank && e3.rankSeen===null,'新家结局优先于升段且不吞升段记录',e3);
  await b.nav(b.menu);const e4=await b.ev(ending);P(!e4.shown && e4.rank,'下一次进入菜单补弹升段');
  await b.ev(`(() => {
    const p=MG_PET.get(),now=new Date(),ago=n=>new Date(now.getFullYear(),now.getMonth(),now.getDate()-n,12);
    p.adoptedDay=MG_PET.dayKey(ago(89));p.lastDay=MG_PET.dayKey(now);p.days=Array.from({length:60},(_,i)=>MG_PET.dayKey(ago(89-i)));p.xp=900;
    localStorage.setItem('mathgamePet',JSON.stringify(p));localStorage.removeItem('mathgameTravelEndingSeen');localStorage.removeItem('mathgameRankSeen');return true;
  })()`);
  await b.nav(b.menu);const e5=await b.ev(ending);
  P(e5.birth && !e5.shown && !e5.rank && e5.seen===null && e5.rankSeen===null,'满足出生时优先出生仪式，新家与升段保留待下次展示',e5);
  await b.shot('travel_birth_priority');
  P(b.errors.length===0,'剧情与庆祝无脚本异常',b.errors);
}finally{
  try{await b.restore();}finally{await b.close();}
}
finish('TRAVEL STORY');
