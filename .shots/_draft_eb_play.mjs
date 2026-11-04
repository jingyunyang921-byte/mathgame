// 静态稿 1a/1b：答对后蛋的互动加强（每题加强 + 里程碑大弹）。用法：node .shots/_draft_eb_play.mjs [关卡,..]
import { petBrowser } from './pet_browser.mjs';
import { SEED, HELPERS } from './_draft_eb_lib.mjs';
const lvArg = process.argv[2] || '1,4';
const MARK = { 1: 'answer-mark', 2: 'answer-mark', 3: 'answer-mark', 4: 'answer-mark' };
const b = await petBrowser();
try {
  await b.nav(b.menu); await b.preserve();
  await b.viewport(960, 576);
  for (const lv of lvArg.split(',').map(Number)) {
    for (const kind of ['1a', '1b']) {
      await b.ev(SEED);
      await b.boot(lv, 'visual');
      await b.sleep(400);
      // 先真实答对 2 题（窝里已有 2 份），第 3 题的瞬间做草稿帧
      for (let i = 0; i < 2; i++) { await b.ev(`showAnswerMark('${MARK[lv]}', 'correct', 900); true`); await b.sleep(900); }
      await b.ev(`showAnswerMark('${MARK[lv]}', 'correct', 900); true`);
      await b.sleep(330);
      await b.ev(HELPERS);
      const info = await b.ev(`(() => {
        const E = window.__eb, fly = document.querySelector('.es-fly'), mk = document.getElementById('${MARK[lv]}');
        const slot = E.rect('#mg-egg-slot'), egg = E.rect('#mg-egg-slot .es-egg'), mats = E.rect('#mg-egg-slot .es-mats');
        E.freeze();
        if (!slot || !egg) return { err: 'no slot' };
        const ec = { x: egg.left + egg.width / 2, y: egg.top + egg.height * 0.55 };
        const fr = fly ? fly.getBoundingClientRect() : null, mr = mk ? mk.getBoundingClientRect() : null;
        if (fly) fly.style.display = 'none';
        const lvl = ${lv};
        const matName = MG_PET.mats[lvl].name;
        if (${kind === '1a'}) {
          // 1a：蛋位整体弹起放大 + 外扩光环 + 大材料带星屑 + 浮字 + “叮”
          const eg = document.querySelector('#mg-egg-slot .es-egg'); eg.style.animation = 'none';
          eg.style.transform = 'translateY(-20px) scale(1.24) rotate(-5deg)';
          E.add('eb-halo', E.box(ec.x, ec.y - 6, 250, 250) + 'opacity:.95;');
          E.add('eb-ring', E.box(ec.x, ec.y, 170, 170) + 'opacity:.9;');
          E.add('eb-ring', E.box(ec.x, ec.y, 236, 236) + 'opacity:.4;border-width:3px;');
          E.sparks(ec.x, ec.y - 8, 100, 9, 20, 0.2);
          const from = mr ? { x: mr.left + mr.width / 2, y: mr.top + mr.height / 2 } : { x: ec.x + 260, y: ec.y - 150 };
          const t = fr ? { x: fr.left + fr.width / 2, y: fr.top + fr.height / 2 } : null;
          E.trail(from.x, from.y, mats.left + mats.width / 2, mats.top + mats.height * 0.55, 0.66, lvl, 46);
          // 蛋在左列（L1-3）：浮字放蛋下方，免得压 PK 条；蛋在右侧（L4）：浮字放蛋上方，“叮”翻到蛋左边免得出屏
          const leftSide = ec.x < innerWidth / 2;
          E.add('eb-plus', 'left:' + Math.round(ec.x - 52) + 'px;top:' + Math.round(leftSide ? slot.bottom + 8 : ec.y - 142) + 'px;', E.mat(lvl) + '+1 ' + matName);
          E.add('eb-note', 'left:' + Math.round(leftSide ? ec.x + 60 : ec.x - 138) + 'px;top:' + Math.round(ec.y - (leftSide ? 70 : 96)) + 'px;', '♪ 叮！');
          E.tag('1a 每题加强（冻结帧：材料在飞、蛋弹起、光环外扩）');
        } else {
          // 1b：里程碑（第 3 份）— 答题区中央弹出大蛋 + 光芒 + “咚！” + 进度牌；小窝照常
          const a = E.anchor();
          E.add('eb-rays', E.box(a.x, a.y - 6, 420, 420) + 'opacity:.9;');
          E.add('eb-disc', E.box(a.x, a.y - 10, 300, 300));
          E.add('eb-halo', E.box(a.x, a.y, 330, 330));
          E.add('eb-bigegg', E.box(a.x, a.y - 14, 190, 190) + 'transform:rotate(-7deg) scale(1.04,.97);', MG_PET_STORY.egg(0, 'eb-big'));
          E.sparks(a.x, a.y - 10, 150, 12, 24, 0.1);
          E.add('eb-word', 'left:' + Math.round(a.x + 70) + 'px;top:' + Math.round(a.y - 128) + 'px;transform:rotate(8deg);', '咚！');
          E.add('eb-plus', 'left:' + Math.round(a.x - 78) + 'px;top:' + Math.round(a.y + 92) + 'px;', E.mat(lvl) + matName + ' 3 / 10');
          E.tag('1b 里程碑大弹（第 3 / 6 / 10 题，约 0.9 秒后缩回小窝；冻结帧）');
        }
        return { slot: [slot.left | 0, slot.top | 0, slot.width | 0, slot.height | 0], mark: !!mk, fly: !!fr };
      })()`);
      console.log(`L${lv} ${kind}`, JSON.stringify(info));
      await b.shot(`eb_${kind}_L${lv}`);
    }
  }
  console.log('done, errors=', JSON.stringify(b.errors));
} finally { try { await b.restore(); } finally { await b.close(); } }
