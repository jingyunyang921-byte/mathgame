// 成长旅行结算的高度边界：首次礼物、学习反馈和两项新纪录同时出现，所有按钮仍可操作。
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
try {
  await b.nav(b.menu); await b.preserve();
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  const sizes = b.device ? [[1000, 576]] : [[1000, 576], [900, 500], [412, 915]];
  for (const [w, h] of sizes) {
    await b.viewport(w, h);
    for (const level of [2, 5]) {
      await b.ev("localStorage.removeItem('mathgamePet');localStorage.removeItem('mathgameStars');MG_PET.adopt();true");
      await b.boot(level);
      await b.ev(`localStorage.setItem('mathgameBest',JSON.stringify({${level}:{t:99,s:2}}));_mgWrong=0;_mgCorrect=10;_mgMaxStreak=8;_mgRoundStart=Date.now()-9000;debugEndGame(true);true`);
      await b.sleep(800);
      await b.takeChest();
      const r = await b.ev(`(() => {
        const card=document.getElementById('overlay-content'),rect=card.getBoundingClientRect();
        const s=window._currentGame._mgRoundSnap;
        const bounds={width:innerWidth,height:innerHeight,top:rect.top,bottom:rect.bottom};
        const fits=rect.top>=0&&rect.bottom<=innerHeight+1&&rect.left>=0&&rect.right<=innerWidth+1&&card.scrollWidth<=card.clientWidth+1;
        const buttons=['next-level-btn','retry-btn'].map(id=>{
          const el=document.getElementById(id);
          if(!el||getComputedStyle(el).display==='none')return null;
          el.scrollIntoView({block:'nearest'});
          const r=el.getBoundingClientRect(),c=card.getBoundingClientRect(),hit=document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2);
          return {id,reachable:r.top>=c.top&&r.bottom<=c.bottom+1&&r.top>=0&&r.bottom<=innerHeight+1&&(hit===el||el.contains(hit))};
        }).filter(Boolean);
        return {fits,bounds,buttons,seed:s.newBestTime&&s.newBestStreak&&s.petGift&&s.petCare.done};
      })()`);
      const label=`L${level} ${b.device ? '真机' : w+'×'+h}`;
      P(r.seed, label+' 首次礼物、学习反馈和两项新纪录同时出现', r);
      P(r.fits, label+' 结算卡完整位于屏幕内且不横向溢出', r.bounds);
      P(r.buttons.length===2&&r.buttons.every(x=>x.reachable), label+' 下一关与重玩按钮均可触达', r.buttons);
      await b.shot(`travel_result_L${level}_${w}x${h}`);
    }
  }
  P(b.errors.length===0, '结算布局无浏览器脚本异常', b.errors);
} finally {
  try { await b.send('Emulation.setEmulatedMedia', { features: [] }); await b.restore(); }
  finally { await b.close(); }
}
finish('TRAVEL RESULT LAYOUT');
