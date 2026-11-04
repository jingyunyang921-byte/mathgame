// 前三关「我」图标替换方案对比图：在真实 L1 画面里临时改 DOM（不动产品代码），裁出带路条拍 4 种。
import { writeFileSync } from 'fs';
import { petBrowser } from './pet_browser.mjs';
const b = await petBrowser();
const seed = `(() => {
  const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return MG_PET.dayKey(x); };
  const days = 9;
  const p = { version: 2, adopted: true, exp: 0, stage: 0, adoptedDay: d(1 - 22), lastDay: d(0), xp: 0,
    days: Array.from({ length: days }, (_, i) => d(-days + i)), phase: 0, daily: { date: d(0), correct: 0, rounds: [] }, gifts: [], decor: 'leaf', decors: ['leaf'],
    name: '数宝', hatchDay: '', birthSeen: false, affection: 0, stories: { seen: [], pending: [] } };
  ['mathgamePet', 'mathgameStars', 'mathgameCoins'].forEach(k => localStorage.removeItem(k));
  try { _mgPendingSnap = null; } catch (e) {}
  localStorage.setItem('mathgamePet', JSON.stringify(p));
  return true; })()`;
const KID = `(() => { const w = document.getElementById('warrior-wrap'); const s = w.querySelector('.character-svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.innerHTML = '<use href="#p-kid"/>'; return true; })()`;
const BACK = `(() => { const w = document.getElementById('warrior-wrap'); const S = window.MG_PET_STORY;
  const e = document.createElement('span'); e.id = 'bk-egg';
  e.style.cssText = 'position:absolute;left:-17px;top:14px;width:32px;height:32px;z-index:0';
  e.innerHTML = '<span style="position:absolute;left:0;top:-4px;width:32px;height:32px">' + S.egg(0, 'eg').replace('<svg', '<svg style="width:100%;height:100%;display:block"') + '</span>'
    + '<svg viewBox="0 0 30 14" style="position:absolute;left:1px;bottom:2px;width:30px;height:14px"><path d="M1 3Q15 9 29 3Q28 12 15 13Q2 12 1 3Z" fill="#EBCF9A" stroke="#C39A67" stroke-width="1.2"/></svg>';
  w.appendChild(e); w.querySelector('.character-svg').style.position = 'relative'; w.querySelector('.character-svg').style.zIndex = '1'; return true; })()`;
const EGG = `(() => { const w = document.getElementById('warrior-wrap'); const S = window.MG_PET_STORY;
  const s = w.querySelector('.character-svg'); s.style.display = 'none';
  const e = document.createElement('span'); e.id = 'egg-walker';
  e.style.cssText = 'position:relative;display:block;width:54px;height:54px';
  e.innerHTML = '<span style="position:absolute;left:-12px;top:-16px;width:78px;height:78px">' + S.egg(0, 'eg').replace('<svg', '<svg style="width:100%;height:100%;display:block"') + '</span>'
    + '<svg viewBox="0 0 54 54" style="position:absolute;left:0;top:0;width:54px;height:54px"><ellipse cx="21" cy="52" rx="6" ry="3" fill="#E8742A"/><ellipse cx="33" cy="52" rx="6" ry="3" fill="#E8742A"/>'
    + '<circle cx="22" cy="30" r="2" fill="#3A2010"/><circle cx="32" cy="30" r="2" fill="#3A2010"/><path d="M24 36Q27 39 30 36" fill="none" stroke="#C07040" stroke-width="1.5" stroke-linecap="round"/>'
    + '<ellipse cx="18" cy="35" rx="3" ry="2" fill="#FFB0A0" opacity=".6"/><ellipse cx="36" cy="35" rx="3" ry="2" fill="#FFB0A0" opacity=".6"/></svg>';
  w.appendChild(e); return true; })()`;
const clipOf = `(() => { const r = e => document.getElementById(e).getBoundingClientRect(); const a = r('warrior-wrap'), c = r('monster-wrap');
  const x = Math.max(0, Math.min(a.left, c.left) - 34), y = Math.max(0, Math.min(a.top, c.top) - 30);
  return { x, y, width: Math.max(a.right, c.right) + 34 - x, height: 128 - y }; })()`;
const names = ['now', 'kid', 'kidegg', 'eggwalk'];
const steps = [null, KID, BACK, EGG];
const shots = [];
try {
  await b.nav(b.menu); await b.preserve();
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await b.viewport(960, 576);
  for (let i = 0; i < 4; i++) {
    await b.ev(seed); await b.boot(1);
    await b.ev(`(() => { const g = window._currentGame; g.playerScore = 5; g.monsterScore = 4; for (let i = 0; i < 5; i++) g._fillDot('p', i); for (let i = 0; i < 4; i++) g._fillDot('m', i); return true; })()`);
    if (i === 3) { /* 蛋形主角：不再叠小孩 */ }
    if (i === 2) { await b.ev(KID); }
    if (steps[i]) await b.ev(steps[i]);
    await b.sleep(700);
    const clip = (await b.send('Runtime.evaluate', { expression: clipOf, returnByValue: true })).result.value;
    const r = await b.send('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 3 } });
    shots.push(r.data); writeFileSync('.shots/out/hero_' + names[i] + '.png', Buffer.from(r.data, 'base64'));
    if (i === 1) await b.shot('hero_kid_full');
  }
  const lab = ['现在：金头盔勇士', '方案A：换成小孩子（同L4）', '方案B：小孩背着萌蛋', '方案C：萌蛋自己走（蛋当主角）'];
  const html = '<body style="margin:0;background:#FBF3DF;font-family:Microsoft YaHei,sans-serif"><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:16px;width:1280px">'
    + shots.map((d, i) => '<div style="background:#fff;border-radius:12px;padding:8px 10px;box-shadow:0 2px 8px rgba(120,90,40,.2)"><div style="font:800 18px sans-serif;color:#8A531B;margin-bottom:6px">' + lab[i] + '</div><img style="display:block;max-width:100%" src="data:image/png;base64,' + d + '"></div>').join('') + '</div></body>';
  await b.send('Emulation.setDeviceMetricsOverride', { width: 1312, height: 760, deviceScaleFactor: 1, mobile: false });
  await b.ev('document.open();document.write(' + JSON.stringify(html) + ');document.close();true');
  await b.sleep(700);
  const h = (await b.send('Runtime.evaluate', { expression: 'document.documentElement.scrollHeight', returnByValue: true })).result.value;
  const r = await b.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1312, height: h, scale: 1 }, captureBeyondViewport: true });
  writeFileSync('.shots/out/hero_swap_compare.png', Buffer.from(r.data, 'base64'));
  console.log('done, errors=', JSON.stringify(b.errors));
} finally { try { await b.send('Emulation.setEmulatedMedia', { features: [] }); await b.restore(); } finally { await b.close(); } }
