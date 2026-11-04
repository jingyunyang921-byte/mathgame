import {petBrowser} from './pet_browser.mjs';
const b=await petBrowser();
const seed=`localStorage.removeItem('mathgamePet');localStorage.removeItem('mathgameStars');localStorage.removeItem('mathgameBest');MG_PET.adopt();true`;
try{
  await b.nav(b.menu); await b.preserve();
  await b.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  for (const [w,h] of [[1000,576],[900,500],[412,915]]) {
    await b.viewport(w,h);
    await b.ev(seed);
    await b.boot(2);
    await b.ev(`localStorage.setItem('mathgameBest',JSON.stringify({2:{t:99,s:2}}));window._currentGame.playerScore=10;window._currentGame.monsterScore=6;_mgWrong=0;_mgCorrect=10;_mgMaxStreak=8;_mgRoundStart=Date.now()-9000;debugEndGame(true);true`);
    await b.sleep(900);
    await b.shot(`simplified_L2_win_${w}x${h}`);
  }
  await b.viewport(1000,576);
  await b.ev(seed); await b.boot(2);
  await b.ev(`window._currentGame.playerScore=6;window._currentGame.monsterScore=10;_mgWrong=4;_mgCorrect=6;_mgMaxStreak=3;_mgRoundStart=Date.now()-20000;debugEndGame(false);true`);
  await b.sleep(900); await b.shot('simplified_L2_lose_1000x576');
  await b.ev(seed); await b.boot(4);
  await b.ev(`window._currentGame.playerStep=10;window._currentGame.monsterStep=7;_mgWrong=0;_mgCorrect=10;_mgMaxStreak=10;_mgRoundStart=Date.now()-8000;debugEndGame(true);true`);
  await b.sleep(900); await b.shot('simplified_L4_win_1000x576');
  await b.ev(seed); await b.boot(6);
  await b.ev(`window._currentGame.playerScore=20;window._currentGame.timeLeft=18;window._currentGame.time=60;_mgWrong=0;_mgCorrect=20;_mgMaxStreak=20;_mgRoundStart=Date.now()-42000;debugEndGame(true);true`);
  await b.sleep(900); await b.shot('simplified_L6_win_1000x576');
  console.log('shots done, errors=',JSON.stringify(b.errors));
}finally{try{await b.send('Emulation.setEmulatedMedia',{features:[]});await b.restore();}finally{await b.close();}}
