// 菜单无障碍小闸门：设置分段钮的中文读法 + aria-pressed、关卡岛卡片可聚焦/可按键、商店 ‹› 钮点击热区 ≥ 44px。
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
try {
  await b.viewport(1000, 576);
  await b.nav(b.menu); await b.sleep(500);

  await b.ev(`showSettings(); true`); await b.sleep(250);
  const seg = () => b.ev(`(() => { const q = id => [...document.querySelectorAll('#' + id + ' .seg-btn')].map(x => ({ l: x.getAttribute('aria-label'), p: x.getAttribute('aria-pressed'), on: x.classList.contains('on') }));
    return { sfx: q('setSfx'), bgm: q('setBgm'), voice: q('setVoice') }; })()`);
  let s = await seg();
  P(s.sfx.length === 4 && s.bgm.length === 4 && s.voice.length === 4, '三排音量钮各 4 个', [s.sfx.length, s.bgm.length, s.voice.length]);
  P(s.sfx[0].l.startsWith('音效 ') && s.bgm[0].l.startsWith('背景音乐 ') && s.voice[0].l.startsWith('读题语音 '), '读屏标签用中文行名，不再念 setSfx 这类变量名', [s.sfx[0].l, s.bgm[0].l, s.voice[0].l]);
  P(['sfx', 'bgm', 'voice'].every(k => s[k].filter(x => x.p === 'true').length === 1 && s[k].every(x => (x.p === 'true') === x.on)), 'aria-pressed 与选中态一致且每排恰好一个', s);
  await b.ev(`setSetting('bgm', 0); true`); await b.sleep(150);
  s = await seg();
  P(s.bgm[0].p === 'true' && s.bgm[0].on && s.bgm.slice(1).every(x => x.p === 'false'), '切换后 aria-pressed 跟着走', s.bgm);
  await b.ev(`setSetting('bgm', 2); hideSettings && hideSettings(); true`);

  const cards = () => b.ev(`[...document.querySelectorAll('.island-card')].map(c => ({ role: c.getAttribute('role'), tab: c.tabIndex, p: c.getAttribute('aria-pressed'), sel: c.classList.contains('selected') }))`);
  let c = await cards();
  P(c.length === 6 && c.every(x => x.role === 'button' && x.tab === 0), '六座岛都是可聚焦按钮', c);
  P(c.every(x => (x.p === 'true') === x.sel) && c.filter(x => x.p === 'true').length === 1, '岛卡片 aria-pressed 与选中一致', c);
  await b.ev(`document.getElementById('card4').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); true`); await b.sleep(150);
  c = await cards();
  P(c[3].sel && c[3].p === 'true' && c.filter(x => x.sel).length === 1, 'Enter 键选中第 4 关', c.map(x => x.sel));
  await b.ev(`document.getElementById('card2').dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })); true`); await b.sleep(150);
  c = await cards();
  P(c[1].sel && c.filter(x => x.sel).length === 1, '空格键选中第 2 关', c.map(x => x.sel));
  await b.ev(`document.getElementById('card5').dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true })); true`); await b.sleep(100);
  c = await cards();
  P(c[1].sel && !c[4].sel, '其它按键不触发选关', c.map(x => x.sel));

  const hit = await b.ev(`(() => { const e = document.createElement('div'); e.innerHTML = '<button type="button" class="pet-shop-btn">›</button>'; const btn = e.firstChild; document.body.appendChild(btn);
    const r = btn.getBoundingClientRect(), a = getComputedStyle(btn, '::after'); const out = { w: r.width, h: r.height, pos: a.position, aw: parseFloat(a.width), ah: parseFloat(a.height), pe: a.pointerEvents }; btn.remove(); return out; })()`);
  P(hit.w === 26 && hit.h === 26, '商店箭头钮视觉尺寸不变（26px）', hit);
  P(hit.pos === 'absolute' && hit.ah >= 44 && hit.aw >= 34, '隐形热区：高 ≥ 44px、宽 ≥ 34px（左右各只让 4px，不压到 8px 间距另一侧的邻钮）', hit);
  P(b.errors.length === 0, '无脚本异常', b.errors);
} finally { try { await b.restore(); } finally { await b.close(); } }
finish('A11Y MENU PASS');
