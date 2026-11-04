import {petBrowser} from './pet_browser.mjs';
const b=await petBrowser();
try{
  await b.nav(b.menu); await b.preserve(); await b.viewport(1000,576);
  await b.ev("localStorage.removeItem('mathgamePet');localStorage.removeItem('mathgameStars');MG_PET.adopt();true");
  await b.boot(2);
  await b.ev("localStorage.setItem('mathgameBest',JSON.stringify({2:{t:99,s:2}}));_mgWrong=0;_mgCorrect=10;_mgMaxStreak=8;_mgRoundStart=Date.now()-9000;debugEndGame(true);true");
  await b.sleep(900);
  const r=await b.ev(`(() => {
    const oc=document.getElementById('overlay-content');
    const kids=[...oc.children].filter(n=>getComputedStyle(n).display!=='none').map(n=>({id:n.id||n.tagName,h:n.getBoundingClientRect().height,mt:getComputedStyle(n).marginTop,mb:getComputedStyle(n).marginBottom}));
    const stats=document.getElementById('overlay-stats');
    return {client:oc.clientHeight,scroll:oc.scrollHeight,ocH:oc.getBoundingClientRect().height,kids,
      statsW:stats.getBoundingClientRect().width,statsH:stats.getBoundingClientRect().height,
      statsLines:[...stats.children].map(c=>c.textContent.trim()),
      cardW:oc.getBoundingClientRect().width,
      subH:(document.getElementById('overlay-sub')||{}).getBoundingClientRect?document.getElementById('overlay-sub').getBoundingClientRect().height:null};
  })()`);
  console.log(JSON.stringify(r,null,1));
  await b.shot('simplify_probe');
}finally{try{await b.restore();}finally{await b.close();}}
