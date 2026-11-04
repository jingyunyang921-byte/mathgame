// 所有关卡与模式共用正常结算记账；答题中、离开前不提前记学习日。PET_DEVICE=1 可验APK。
import { petBrowser, verdicts } from './pet_browser.mjs';
const b=await petBrowser(),{check:P,finish}=verdicts();
const rows=[{q:'2 + 3',a:5,a2:2,b2:3,op:'+',lv:1,n:1,rev:0,due:0}];
const cases=[];
for(let level=1;level<=6;level++)for(const mode of ['visual','audio'])cases.push({level,mode,label:`L${level} ${mode}`});
for(const mode of ['visual','audio']){
  cases.push({level:0,mode,label:`速算 ${mode}`,extra:`sessionStorage.setItem('mgSprint','1')`});
  cases.push({level:0,mode,label:`复习 ${mode}`,extra:`sessionStorage.setItem('mgPractice',${JSON.stringify(JSON.stringify(rows))});sessionStorage.setItem('mgReview','1')`});
}
try{
  await b.nav(b.menu);await b.preserve();
  for(const c of cases){
    await b.ev(`localStorage.removeItem('mathgamePet');MG_PET.adopt();true`);
    await b.boot(c.level,c.mode,c.extra||'');
    const result=await b.ev(`(() => {
      const game=window._currentGame;_mgWrong=0;_mgCorrect=0;_mgMaxStreak=0;
      for(let i=0;i<5;i++)mgOnCorrect();
      const before=MG_PET.info().studyDays;
      debugEndGame(false);
      const s=game._mgRoundSnap;
      const pending=MG_PET.info().studyDays;
      mgClaimRound(s);
      return {before,pending,engine:game.constructor.name,level:game.level,sprint:!!game.sprint,review:_mgReview,
        correct:s&&s.correct,care:s&&s.petCare,gift:s&&s.petGift,pet:MG_PET.get()};
    })()`);
    P(result.before===0 && result.pending===0 && result.correct===5 && result.care?.done && result.pet.days.length===1 && result.pet.stage===0,
      c.label+'：正常输局5题，点开宝箱前不记账、入账后记1天',result);
    P(!result.gift,c.label+'：未获胜不发通关礼物');
    if(c.label.startsWith('速算'))P(result.sprint,c.label+'：真实速算入口');
    if(c.label.startsWith('复习'))P(result.review,c.label+'：真实复习入口');
  }
  P(b.errors.length===0,'所有模式无脚本异常',b.errors);
}finally{
  try{await b.restore();}finally{await b.close();}
}
finish('PET LEARNING MODES');
