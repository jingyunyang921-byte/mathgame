// 过关场景并入宝箱舞台：胜利局的 #cs-stage 以本关场景为底、伙伴站在宝箱左边；L6 随 合着→打开→收下 逐步点亮；失败局保持原来的深棕底。
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
const probe = String.raw`(() => {
  const s = document.getElementById('cs-stage'); if (!s) return { stage: '' };
  const r = e => e ? e.getBoundingClientRect() : null, q = k => s.querySelector(k);
  const sc = q('.cs-scene'), o = r(document.getElementById('overlay')), scr = r(sc), tr = r(q('.cs-title')), pr = r(q('.cs-partner')), cr = r(q('.cs-box'));
  const ref = q('.cs-partner use') ? q('.cs-partner use').getAttribute('href') : null;
  const inV = a => !!a && a.top >= -1 && a.left >= -1 && a.right <= innerWidth + 1 && a.bottom <= innerHeight + 1;
  const acts = [...s.querySelectorAll('.cs-act')], hitOf = el => { const a = el.getBoundingClientRect(), t = document.elementFromPoint(a.x + a.width / 2, a.y + a.height / 2); return t === el || el.contains(t); };
  const ids = sc ? [...sc.querySelectorAll('[id]')].map(e => e.id) : [], all = [...document.querySelectorAll('[id]')].map(e => e.id);
  const st = k => { const e = sc && sc.querySelector(k); return e ? getComputedStyle(e) : null; };
  const small = q('.cs-title small');
  return { stage: s.className, scene: !!sc, lv: sc ? sc.getAttribute('data-lv') : null, sceneCls: sc ? sc.className : '', first: !!sc && s.firstElementChild === sc,
    covers: !!scr && scr.width >= o.width - 1 && scr.height >= o.height - 1, kids: sc ? [...sc.children].map(n => n.tagName.toLowerCase() + '.' + (n.getAttribute('class') || '')) : [],
    bg: getComputedStyle(s).backgroundColor, scrim: sc ? getComputedStyle(sc.querySelector('.cs-scrim')).opacity : null, ref, refOk: !!ref && !!document.querySelector(ref),
    partner: !!pr, partnerIn: inV(pr), partnerLeft: !!pr && !!cr && pr.right <= cr.left + 4, titleIn: inV(tr), goIn: acts.length > 0 && acts.every(n => inV(r(n))), goHit: acts.length > 0 && acts.every(hitOf), nActs: acts.length,
    title: q('.cs-title') ? q('.cs-title').firstChild.textContent : '', sub: small ? small.textContent : '', mirror: sc ? sc.querySelector('svg.bg').innerHTML.includes('scale(-1 1)') : false,
    fxWill: st('svg.fx') ? st('svg.fx').willChange : null, bgAnim: sc ? [...sc.querySelectorAll('svg.bg *')].filter(n => getComputedStyle(n).animationName !== 'none').length : -1,
    fxAnim: sc ? [...sc.querySelectorAll('svg.fx *')].filter(n => getComputedStyle(n).animationName !== 'none').length : -1,
    dupIds: ids.filter(i => all.filter(a => a === i).length > 1), xScroll: document.documentElement.scrollWidth <= innerWidth + 1,
    win: st('.ws-win') ? st('.ws-win').fill : null, big: st('.ws-big') ? st('.ws-big').opacity : null, bulb: st('.ws-bulb') ? st('.ws-bulb').opacity : null, lamp: st('.ws-dlamp') ? st('.ws-dlamp').fill + '/' + st('.ws-dlamp').opacity : null };
})()`;
const end = (win, correct) => b.ev(`_mgWrong=${win ? 0 : 3};_mgCorrect=${correct};_mgMaxStreak=${correct};_mgRoundStart=Date.now()-7000;debugEndGame(${win});true`);
const restart = async () => { await b.ev('window._currentGame._restart();true'); await b.poll(`(document.getElementById('mg-countdown-badge')||{style:{}}).style.display==='none'`); };
const fresh = () => b.ev(`localStorage.removeItem('mathgamePet');localStorage.removeItem('mathgameStars');MG_PET.adopt();true`);
const stageUp = (cls = 'closed') => b.poll(`(document.getElementById('cs-stage')||{className:''}).className.includes('${cls}')`, 6000);
const openChest = async () => { await b.ev(`document.querySelector('#cs-stage .cs-chest').click();true`); await stageUp('opened'); };
const toDone = () => b.poll('!!document.querySelector("#cs-stage .cs-acts")', 12000);
const win = async () => { await fresh(); await end(true, 10); await stageUp('closed'); await b.sleep(900); };
try {
  await b.nav(b.menu); await b.preserve(); await b.viewport(960, 576);
  await b.boot(1);
  const plain =await b.ev(`[mgWsLv({win:true,level:0}),mgWsLv({win:false,level:1}),mgWsLv({win:true,level:7}),mgWsLv(null),mgWsLv({win:true,level:1}),mgWsLv({win:true,level:6})]`);
  P(JSON.stringify(plain) === '[0,0,0,0,1,6]', '只有胜利局且关卡 1..6 才配场景（失败 / 练习 / 越界 / 空都回到 0）', plain);

  // 1. 六关逐个：合着 → 打开 → 收下
  for (let lv = 1; lv <= 6; lv++) {
    await b.boot(lv); await win();
    const sym = await b.ev(`MG_PARTNERS[${lv}].sym`), cap = await b.ev(`MG_WS[${lv}].cap`);
    const c = await b.ev(probe);
    P(c.stage.includes('closed') && c.stage.includes('scened') && c.stage.includes('lv' + lv) && c.scene && c.lv === String(lv) && c.first && c.covers, `L${lv} 合着：舞台带场景，场景是第一个子节点并盖满屏`, c.stage + ' ' + c.lv);
    P(c.kids.join() === 'svg.bg,svg.fx,div.cs-scrim' && c.bg === 'rgba(0, 0, 0, 0)' && c.fxWill === 'transform' && c.bgAnim === 0, `L${lv} 场景分静态 bg / 动态 fx 两层，舞台底色透明，静态层不跑动画`, [c.kids, c.bg, c.fxWill, c.bgAnim]);
    P(c.partner && c.ref === '#' + sym && c.refOk && c.partnerIn && c.partnerLeft && c.titleIn, `L${lv} 伙伴 ${sym} 站在宝箱左边，图标可解析，标题与伙伴都在屏内`, [c.ref, c.partnerIn, c.partnerLeft, c.titleIn]);
    P(c.mirror === (lv === 4) && c.dupIds.length === 0 && c.fxAnim > 0, `L${lv} ${lv === 4 ? '山路镜像（scale(-1 1)）' : '不镜像'}，场景 id 不与页面撞名，fx 层有动画`, [c.mirror, c.dupIds, c.fxAnim]);
    P(c.sceneCls === 'cs-scene', `L${lv} 合着时场景没有亮灯类`, c.sceneCls);
    await b.shot(`ws_l${lv}_closed`);
    await b.ev(`window.__sc=document.querySelector('#cs-stage .cs-scene');true`);
    await openChest(); await b.sleep(1500);
    const o = await b.ev(probe);
    P(await b.ev(`window.__sc===document.querySelector('#cs-stage .cs-scene')`), `L${lv} 合着→打开复用同一个场景节点（不重建、不闪）`);
    P(o.sceneCls === (lv === 6 ? 'cs-scene w1 w2 dl' : 'cs-scene') && (lv !== 6 || (o.sub === '萤火飞出来啦，小屋亮起来啦' && o.win !== c.win && o.lamp !== c.lamp)), lv === 6 ? 'L6 打开：窗和门灯亮起，副标题改成萤火飞出来' : `L${lv} 打开：场景保持原样`, [o.sceneCls, o.sub, c.win, o.win]);
    await b.shot(`ws_l${lv}_opened`);
    await toDone(); await b.sleep(1600);
    const d = await b.ev(probe);
    P(d.stage.includes('done') && d.sub === cap && d.title === '第' + lv + '关通关！' && d.goHit && d.goIn && d.titleIn && d.partnerIn, `L${lv} 结算态：标题「第N关通关！」、副标题换成本关剧情句，按钮可点且在屏内`, [d.title, d.sub, d.goHit, d.goIn]);
    if (lv === 6) P(d.sceneCls === 'cs-scene w1 w2 dl all' && d.big > 0.5 && o.big < d.big && d.bulb > 0.5 && d.scrim === '0', 'L6 收下：串灯 / 大光晕全亮，夜色罩淡到 0', [d.sceneCls, o.big, d.big, d.bulb, d.scrim]);
    await b.shot(`ws_l${lv}_done`);
    await b.ev(`mgStageDismiss();true`); await b.sleep(300);
    P(await b.ev(`!document.getElementById('cs-stage') && !document.querySelector('.cs-scene')`), `L${lv} 收下后舞台连同场景一起移除`);
  }
  // 2. 失败局不配场景，保持原来的深棕底
  await b.boot(2); await fresh(); await end(false, 2); await stageUp('closed'); await b.sleep(700);
  const f = await b.ev(probe);
  P(!f.scene && !f.stage.includes('scened') && f.bg !== 'rgba(0, 0, 0, 0)' && f.partner === false && f.title === '宝箱来啦！', '失败局：没有场景和伙伴，舞台仍是不透明深棕底', [f.stage, f.bg, f.scene, f.partner]);
  await b.ev(`document.querySelector('#cs-stage .cs-chest').click();true`); await toDone(); await b.sleep(400);
  const f2 = await b.ev(probe);
  P(f2.title === '宝箱收好啦！' && !f2.scene && f2.goHit, '失败局收下态：标题不变、仍无场景，按钮可点', [f2.title, f2.scene, f2.goHit]);

  // 3. 落叶绕自己的中心转，不绕画面原点甩出屏外（transform-box: fill-box 的回归点）
  await b.boot(4); await win();
  const seen = [];
  for (let i = 0; i < 5; i++) { seen.push(await b.ev(`[...document.querySelectorAll('.cs-scene .ws-leaf')].map(n => { const a = n.getBoundingClientRect(); return [Math.round(a.x + a.width / 2), Math.round(a.y + a.height / 2)]; })`)); await b.sleep(650); }
  const flat = seen.flat();
  P(flat.length >= 5 && flat.every(([x, y]) => x > -80 && x < 960 + 80 && y > -80 && y < 576 + 80), 'L4 落叶 5 次采样都在屏内附近（没有绕画面原点甩飞）', flat.slice(0, 8));

  // 4. 减少动态效果：场景里所有动画关闭，画面仍完整
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await restart(); await win();
  const calm = await b.ev(probe);
  P(calm.scene && calm.fxAnim === 0 && calm.partner && calm.covers, '减少动态效果：场景 fx 层无动画，场景与伙伴仍在', [calm.fxAnim, calm.scene, calm.partner]);
  await b.send('Emulation.setEmulatedMedia', { features: [] });

  // 5. 四个视口：收下态下标题 / 伙伴 / 收下啦完整在屏内，伙伴不压宝箱
  for (const lv of [6, 1, 4]) {
    await b.boot(lv);
    for (const [w, h] of [[960, 576], [900, 500], [1000, 576], [412, 915]]) {
      await b.viewport(w, h); await restart(); await fresh(); await end(true, 10); await stageUp('closed'); await b.sleep(600);
      const c = await b.ev(probe);
      P(c.covers && c.titleIn && c.partnerIn && c.partnerLeft && c.xScroll, `L${lv} ${w}×${h} 合着：场景盖满、标题与伙伴在屏内、伙伴在宝箱左边`, [c.covers, c.titleIn, c.partnerIn, c.partnerLeft, c.xScroll]);
      await openChest(); await toDone(); await b.sleep(1500);
      const d = await b.ev(probe);
      P(d.goHit && d.goIn && d.titleIn && d.partnerIn && d.partnerLeft && d.xScroll, `L${lv} ${w}×${h} 结算态：按钮可点、标题与伙伴在屏内`, [d.goHit, d.goIn, d.titleIn, d.partnerIn, d.partnerLeft]);
      await b.shot(`ws_l${lv}_done_${w}x${h}`);
      await b.ev(`mgStageDismiss();true`); await b.sleep(250);
    }
  }
  P(b.errors.length === 0, '过关场景无浏览器脚本异常', b.errors);
} finally {
  try { await b.send('Emulation.setEmulatedMedia', { features: [] }); await b.restore(); } finally { await b.close(); }
}
finish('WIN SCENE');
