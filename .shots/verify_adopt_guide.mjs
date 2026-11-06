// 闸门：首次进菜单、还没领萌蛋 -> 弹一次领养引导 + 顶栏萌宠钮亮小红点。
//   A. 全新设备：弹出引导（标题/按钮文字），小红点亮，会话标记已写；
//   B. 点「先去玩」：弹窗关闭、小窝不开；同一会话再进菜单不再弹，小红点仍在；
//   C. 新会话点「去领养」：打开小窝，领养钮在可视范围内，提示语指向它；点领养后小红点消失；
//   D. 已领养：新会话不再弹、没有小红点；
//   E. 别的庆祝正占屏：引导让位，不写会话标记（下次进菜单再弹）。
// 用法：node .shots/verify_adopt_guide.mjs（需要本地 headless Chrome :9333 + http.server :8000）
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
await b.viewport(1000, 576);
await b.nav(b.menu);
await b.preserve();
const snap = () => b.ev(`({
  confirm: document.getElementById('confirmModal').classList.contains('show'),
  title: document.getElementById('confirmTitle').textContent, ok: document.getElementById('confirmOkBtn').textContent, cancel: document.getElementById('confirmCancelBtn').textContent,
  dot: document.getElementById('petBtn').classList.contains('need-adopt'),
  dotShown: getComputedStyle(document.querySelector('#petBtn .icon-dot')).display,
  flag: sessionStorage.getItem('mgAdoptGuide'),
  pet: document.getElementById('petModal').classList.contains('show'),
  adopted: MG_PET.info().pet.adopted
})`);
const fresh = async () => { await b.ev(`localStorage.clear();sessionStorage.clear();true`); await b.nav(b.menu); await b.sleep(500); };

await fresh();
let s = await snap();
P(s.confirm && s.title === '先领一颗萌蛋吧' && s.ok === '去领养' && s.cancel === '先去玩', 'A 全新设备弹出领养引导', [s.title, s.ok, s.cancel]);
P(s.dot && s.dotShown === 'block', 'A 顶栏萌宠钮小红点亮着', [s.dot, s.dotShown]);
P(s.flag === '1' && !s.pet && !s.adopted, 'A 会话标记已写、小窝没自动打开、尚未领养', s);
await b.shot('adopt_guide_modal');

await b.ev(`document.getElementById('confirmCancelBtn').click();true`);
await b.sleep(200);
s = await snap();
P(!s.confirm && !s.pet && s.dot, 'B 点「先去玩」：弹窗关闭、小窝不开、小红点仍在', s);
await b.nav(b.menu); await b.sleep(500);
s = await snap();
P(!s.confirm && s.dot, 'B 同一会话再进菜单：不再弹，小红点仍在', s);

await b.ev(`sessionStorage.removeItem('mgAdoptGuide');true`);
await b.nav(b.menu); await b.sleep(500);
await b.ev(`document.getElementById('confirmOkBtn').click();true`);
await b.sleep(300);
s = await snap();
P(!s.confirm && s.pet, 'C 点「去领养」：引导关闭、小窝打开', s);
const view = await b.ev(`(() => { const a = document.getElementById('petAdoptBtn'), r = a.getBoundingClientRect();
  return { shown: getComputedStyle(a).display !== 'none', top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, label: a.getAttribute('aria-label'), text: a.textContent.trim(), entries: document.querySelectorAll('#petModal [onclick*="adoptPet"]').length, hand: !!document.querySelector('#mg-point[aria-hidden="false"]') }; })()`);
P(view.shown && view.top >= 0 && view.bottom <= view.vh, 'C 领养钮在可视范围内', view);
P(view.label === '领养萌蛋' && view.text === '领养' && view.entries === 1, 'C 领养药丸写着「领养」、读屏念「领养萌蛋」，小窝里只有这一个领养入口', view);
await b.shot('adopt_guide_pet');
const pt = await b.ev(`(() => { const r = document.getElementById('petAdoptBtn').getBoundingClientRect(); window.__says = []; window.__sayOrig = window.mgSay; window.mgSay = t => { window.__says.push(t); }; return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
await b.sleep(400);
const after = await b.ev(`(() => { const r = { says: window.__says.slice(), hand: !!document.querySelector('#mg-point[aria-hidden="false"]'), cheer: document.getElementById('petArt').classList.contains('cheer'), hearts: document.querySelectorAll('#petNest .pet-heart').length,
  tab: document.querySelector('#petModal .pet-tabs [aria-selected=true]').id, adVis: getComputedStyle(document.getElementById('petAdoptBtn')).display !== 'none', hello: MG_SAY.hello }; window.mgSay = window.__sayOrig; return r; })()`);
P(after.says.length === 1 && after.says[0] === after.hello && !after.hand && after.cheer && after.hearts >= 3 && after.tab === 'petTabToday' && !after.adVis, 'C 真实点领养药丸：萌蛋欢呼冒爱心、念「你好呀」一句、没有小手、自动切到「喂蛋」标签、药丸收起', after);
s = await snap();
P(s.adopted && !s.dot, 'C 领养后小红点立刻消失', s);

await b.ev(`hidePet();sessionStorage.clear();true`);
await b.nav(b.menu); await b.sleep(500);
s = await snap();
P(!s.confirm && !s.dot && s.flag === null, 'D 已领养：新会话不弹、没有小红点、不写标记', s);

await fresh();
await b.ev(`document.getElementById('confirmCancelBtn').click();sessionStorage.removeItem('mgAdoptGuide');
  document.getElementById('badgeUnlockModal').setAttribute('aria-hidden','false');true`);
await b.ev(`maybeGuideAdopt()`);
s = await snap();
P(!s.confirm && s.flag === null && s.dot, 'E 别的庆祝占屏：引导让位、不写会话标记、小红点仍亮', s);

await b.restore();
P(b.errors.length === 0, '无页面脚本异常', b.errors.slice(0, 3));
await b.close();
finish('ADOPT GUIDE');
