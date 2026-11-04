// 真机闸门：结算卡简化（Chrome 91 WebView, :9222）。
// 断言：L2 胜利=标题「第2关通关！」/单行数据条/无重复礼物 chip/精简故事卡/单行正文/无副标题/卡片不内滚且按钮可触达；
// L2 失败=标题与鼓励语单行；L6 胜利=标题「第6关通关！」不留空；L4 胜利=赛跑文案单行。
import { petBrowser, verdicts } from './pet_browser.mjs';
process.env.PET_DEVICE = '1';
const b = await petBrowser(), { check: P, finish } = verdicts();
const PROBE = `(() => {
  const q = id => document.getElementById(id);
  const card = q('overlay-content'), stats = q('overlay-stats'), chest = q('overlay-chest'), sub = q('overlay-sub');
  const box = card.getBoundingClientRect();
  const tops = [...stats.children].map(c => c.getBoundingClientRect().top);
  const visible = el => el && getComputedStyle(el).display !== 'none';
  const buttons = ['next-level-btn', 'retry-btn'].map(id => {
    const el = q(id);
    if (!visible(el)) return null;
    const r = el.getBoundingClientRect(), c = card.getBoundingClientRect();
    const hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
    return { id, reachable: r.top >= c.top - 1 && r.bottom <= c.bottom + 1 && r.bottom <= innerHeight + 1 && (hit === el || el.contains(hit)) };
  }).filter(Boolean);
  return {
    ua: (navigator.userAgent.match(/Chrome\\/[\\d.]+/) || [])[0],
    shown: q('overlay').classList.contains('show'),
    title: q('overlay-title').textContent, titleCls: q('overlay-title').className,
    msg: q('overlay-msg').textContent, sub: sub.textContent, subHidden: !visible(sub),
    statsShow: visible(stats), statsLines: new Set(tops.map(t => Math.round(t))).size,
    statsText: stats.textContent,
    chestText: chest.textContent,
    teaser: (chest.querySelector('.ps-teaser') || {}).textContent || '',
    teaserSpans: chest.querySelectorAll('.ps-teaser-copy span').length,
    giftChips: [...chest.querySelectorAll('.chest-reward')].filter(n => /礼物|收到/.test(n.textContent)).length,
    card: { client: card.clientHeight, scroll: card.scrollHeight, top: Math.round(box.top), bottom: Math.round(box.bottom), vw: innerWidth, vh: innerHeight },
    buttons,
  };
})()`;
const ended = async () => { await b.sleep(700); await b.takeChest(); return b.ev(PROBE); };
try {
  await b.nav(b.menu); await b.preserve();
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });

  await b.ev(`localStorage.removeItem('mathgamePet');localStorage.removeItem('mathgameStars');localStorage.removeItem('mathgameBest');MG_PET.adopt();true`);
  await b.boot(2);
  await b.ev(`_mgWrong=0;_mgCorrect=10;_mgMaxStreak=8;_mgRoundStart=Date.now()-9000;_currentGame.playerScore=10;_currentGame.monsterScore=6;debugEndGame(true);true`);
  const win = await ended();
  console.log('\n-- L2 win --');
  P(/Chrome\/91\./.test(win.ua || ''), '真机 WebView Chrome/91', win.ua);
  P(win.shown && win.title === '第2关通关！' && win.titleCls === 'win', 'L2 胜利标题=第2关通关', [win.title, win.titleCls]);
  P(win.statsShow && win.statsLines === 1, '数据条合并成一行小字', win.statsLines);
  P(/正确率/.test(win.statsText) && /连对/.test(win.statsText), '数据条保留正确率/用时/连对', win.statsText);
  P(win.giftChips === 0 && !/收到礼物/.test(win.chestText), '不再重复显示「收到礼物」chip', win.chestText);
  P(/小松鼠送来「收纳小篮」 · 第\d阶段用上/.test(win.teaser) && /看故事$/.test(win.teaser) && win.teaserSpans === 0, '故事卡只留「谁送来什么 · 第几阶段用上」+按钮', win.teaser);
  P(/萌蛋 \d+ \/ 900 点/.test(win.chestText) && /今天已吃/.test(win.chestText) && !/星币|今日学习完成|认识了/.test(win.chestText), '卡内只留萌蛋成长行+故事行（星币/伙伴/学习 chip 已并入宝箱舞台，不重复）', win.chestText);
  P(/你答对 10 题，比小松鼠先到终点啦/.test(win.msg) && !/影子/.test(win.msg), '成绩单行呈现（对手换成关卡小动物）', win.msg);
  P(win.sub === '' && win.subHidden, '空副标题不占高度', win.sub);
  P(win.card.scroll <= win.card.client + 1, '576 高结算卡无内部滚动', win.card);
  P(win.card.top >= 0 && win.card.bottom <= win.card.vh + 1, '结算卡完整在屏内', win.card);
  P(win.buttons.length >= 2 && win.buttons.every(x => x.reachable), '主按钮可触达', win.buttons);
  await b.shot('overlay_simplified_L2_win');

  await b.boot(2);
  await b.ev(`_mgWrong=4;_mgCorrect=4;_mgMaxStreak=3;_mgRoundStart=Date.now()-20000;_currentGame.playerScore=4;_currentGame.monsterScore=10;debugEndGame(false);true`);
  const lose = await ended();
  console.log('\n-- L2 lose --');
  P(lose.title === '这次没赢...' && lose.titleCls === 'lose', 'L2 失败标题=这次没赢...', lose.title);
  P(/小松鼠先到终点啦，在等你呢，再来一次吧/.test(lose.msg) && !/影子/.test(lose.msg), '失败鼓励语并入正文一行', lose.msg);
  P(lose.sub === '' && lose.subHidden && lose.statsShow && lose.statsLines === 1, '失败局无副标题，数据条仍是一行', [lose.sub, lose.statsShow, lose.statsLines]);
  P(lose.card.scroll <= lose.card.client + 1, '失败局卡片无内部滚动', lose.card);
  await b.shot('overlay_simplified_L2_lose');

  await b.ev(`localStorage.removeItem('mathgamePet');localStorage.removeItem('mathgameStars');MG_PET.adopt();true`);
  await b.boot(6);
  await b.ev(`_mgWrong=0;_mgCorrect=20;_mgMaxStreak=20;_currentGame.timeLeft=_currentGame.time-42;debugEndGame(true);true`);
  const finale = await ended();
  console.log('\n-- L6 win --');
  P(finale.title === '第6关通关！' && finale.titleCls === 'win', 'L6 终章胜利标题=第6关通关', [finale.title, finale.titleCls]);
  P(/小家的灯全亮/.test(finale.msg) && /秒/.test(finale.msg), 'L6 单行点灯文案', finale.msg);
  P(finale.sub === '' && finale.subHidden, 'L6 无副标题', finale.sub);
  P(!/怪兽|巨龙|打败|BOSS/.test([finale.title, finale.msg, finale.sub].join(' ')), 'L6 无打斗词', [finale.title, finale.msg]);
  P(finale.card.scroll <= finale.card.client + 1 && finale.card.bottom <= finale.card.vh + 1, 'L6 结算卡无内滚且在屏内', finale.card);
  await b.shot('overlay_simplified_L6_win');

  await b.boot(4);
  await b.ev(`_mgWrong=0;_mgCorrect=10;_mgMaxStreak=10;_currentGame.monsterStep=7;debugEndGame(true);true`);
  const race = await ended();
  console.log('\n-- L4 win --');
  P(/你先到终点/.test(race.msg) && race.sub === '' && race.subHidden, 'L4 胜利单行文案', [race.msg, race.sub]);
  P(race.card.scroll <= race.card.client + 1, 'L4 结算卡无内部滚动', race.card);
  await b.shot('overlay_simplified_L4_win');

  P(b.errors.length === 0, '全程无脚本异常', b.errors);
} finally {
  try { await b.send('Emulation.setEmulatedMedia', { features: [] }); await b.restore(); }
  finally { await b.close(); }
}
finish('OVERLAY SIMPLIFIED DEVICE');
