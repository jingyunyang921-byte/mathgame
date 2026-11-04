// 倒计时场景小字取景：用法 node .shots/_shot_scene_cd.mjs <前缀> [关卡,..] [WxH,..]
import { petBrowser } from './pet_browser.mjs';
const [pre = 'scd', lvArg = '1,2,3,4,5,6', szArg = '960x576'] = process.argv.slice(2);
const b = await petBrowser();
try {
  await b.nav(b.menu); await b.preserve();
  for (const sz of szArg.split(',')) {
    const [w, h] = sz.split('x').map(Number);
    await b.viewport(w, h);
    for (const lv of lvArg.split(',').map(Number)) {
      await b.nav(b.menu);
      await b.ev(`sessionStorage.clear(); sessionStorage.setItem('gameLevel','${lv}'); sessionStorage.setItem('gameMode','visual'); true`);
      await b.nav(b.game);
      await b.ev('window._skipOcrLoading && window._skipOcrLoading();true');
      await b.poll(`document.getElementById('intro-overlay').style.display === 'flex'`, 20000);
      await b.sleep(900);
      await b.shot(`${pre}_intro_L${lv}_${w}x${h}`);
      await b.poll(`document.getElementById('mg-countdown-badge').style.display === 'flex'`, 20000);
      await b.sleep(150);
      await b.shot(`${pre}_cd_L${lv}_${w}x${h}`);
      console.log(`L${lv} ${w}x${h}`, JSON.stringify(await b.ev(`({ cap: document.getElementById('mg-countdown-cap').textContent, title: document.getElementById('intro-title').textContent })`)));
    }
  }
  console.log('done, errors=', JSON.stringify(b.errors));
} finally { try { await b.viewport(1000, 576); await b.restore(); } finally { await b.close(); } }
