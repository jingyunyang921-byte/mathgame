// L4 赛跑「我」换成小孩子：#p-kid 精灵在、能解码；进度条图标用它；赛道画布真画出小孩（去掉就少一大片像素）；旧战士手绘已删。
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
try {
  await b.nav(b.menu); await b.preserve();
  for (const [w, h] of (b.device ? [[960, 576]] : [[960, 576], [1280, 800]])) {
    await b.viewport(w, h);
    await b.boot(4, 'visual');
    const r = await b.ev(`(async () => {
      const g = window._currentGame;
      if (g.monsterTimer) clearInterval(g.monsterTimer);
      g.gameEnded = false; g.playerStep = 2; g.monsterStep = 2;
      const sym = document.querySelectorAll('symbol#p-kid');
      const im = mgSymbolImage('p-kid');
      for (let i = 0; i < 40 && !(im.complete && im.naturalWidth); i++) await new Promise(r => setTimeout(r, 50));
      const use = document.querySelector('#race-prog-player use');
      const dangling = [...document.querySelectorAll('use')].map(u => u.getAttribute('href')).filter(h => h && !document.querySelector(h));
      const cv = document.getElementById('race-left-canvas'), cx = cv.getContext('2d');
      const grab = () => cx.getImageData(0, 0, cv.width, cv.height).data;
      g._updateRaceTrack();
      const withKid = grab();
      const orig = RaceGame.prototype._drawRaceKid;
      RaceGame.prototype._drawRaceKid = function () {};
      g._updateRaceTrack();
      const noKid = grab();
      RaceGame.prototype._drawRaceKid = orig;
      g._updateRaceTrack();
      let diff = 0, jacket = 0;
      for (let i = 0; i < withKid.length; i += 4) {
        if (Math.abs(withKid[i] - noKid[i]) + Math.abs(withKid[i + 1] - noKid[i + 1]) + Math.abs(withKid[i + 2] - noKid[i + 2]) > 40) {
          diff++;
          if (Math.abs(withKid[i] - 255) < 20 && Math.abs(withKid[i + 1] - 138) < 25 && Math.abs(withKid[i + 2] - 61) < 30) jacket++;
        }
      }
      return { sym: sym.length, viewBox: sym[0] && sym[0].getAttribute('viewBox'), decoded: !!(im.complete && im.naturalWidth),
        useHref: use && use.getAttribute('href'), dangling,
        hasKid: typeof RaceGame.prototype._drawRaceKid, warrior: typeof RaceGame.prototype._drawRaceWarrior,
        canvasArea: cv.width * cv.height, diff, jacket };
    })()`);
    const tag = `${w}×${h}`;
    P(r.sym === 1 && r.viewBox === '0 0 24 24', `${tag} #p-kid 精灵在且只有一个`, { sym: r.sym, vb: r.viewBox });
    P(r.decoded, `${tag} mgSymbolImage('p-kid') 解码成功`, r.decoded);
    P(r.useHref === '#p-kid', `${tag} 进度条「我」图标换成小孩子`, r.useHref);
    P(r.hasKid === 'function' && r.warrior === 'undefined', `${tag} 战士手绘已删、_drawRaceKid 在`, { k: r.hasKid, w: r.warrior });
    P(r.diff > r.canvasArea * 0.02 && r.jacket > 200, `${tag} 赛道上真画出了小孩子（差异像素 ${r.diff}，橙外套 ${r.jacket}）`, { area: r.canvasArea });
    P(r.dangling.length === 0, `${tag} 无悬空 <use>`, r.dangling);
    if (w === 960) await b.shot('kid_gate_L4');
  }
  P(b.errors.length === 0, '无脚本异常', b.errors);
} finally {
  try { await b.viewport(1000, 576); await b.restore(); } finally { await b.close(); }
}
finish('KID SPRITE');
