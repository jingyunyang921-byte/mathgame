(function () {
  'use strict';
  const S = window.MG_PET_STORY;
  const mode = new URLSearchParams(location.search).get('f') || 'sheet';
  const STAR = '<svg viewBox="-6 -6 12 12" aria-hidden="true"><path d="M0-5L1.4-1.4 5 0 1.4 1.4 0 5-1.4 1.4-5 0-1.4-1.4Z" fill="#FFD23D"/></svg>';
  const sp = (x, y, s) => '<span class="spw" style="left:' + x + 'px;top:' + y + 'px;width:' + s + 'px;height:' + s + 'px">' + STAR + '</span>';
  const pin = (x, y, n) => '<b class="pin" style="left:' + x + 'px;top:' + y + 'px">' + n + '</b>';
  const fly = (lv, x, y, rot, sz) => '<span class="fly" style="left:' + x + 'px;top:' + y + 'px;width:' + sz + 'px;height:' + sz + 'px;transform:rotate(' + rot + 'deg)">' + S.matArt(lv) + '</span>';
  const trail = d => '<svg class="trail" viewBox="0 0 960 576" aria-hidden="true"><path class="b" d="' + d + '"/><path class="f" d="' + d + '"/></svg>';
  const NB = '<svg class="nestB" viewBox="0 0 112 46" aria-hidden="true"><ellipse cx="56" cy="12" rx="54" ry="10" fill="#D9B67E" stroke="#C39A67" stroke-width="2.2"/></svg>';
  const NF = '<svg class="nestF" viewBox="0 0 112 46" aria-hidden="true"><path d="M2 12Q56 28 110 12Q108 41 56 44Q4 41 2 12Z" fill="#EBCF9A" stroke="#C39A67" stroke-width="2.2" stroke-linejoin="round"/><path d="M16 22l12 4M40 30l10 2M66 31l10-2M90 24l9-5M28 36l9 2M74 37l10-2" fill="none" stroke="#C39A67" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const MAT_AT = [[6, 46], [26, 56], [54, 60], [78, 56], [98, 46]];
  function slot(o) {
    const n = o.n || 0;
    const mats = MAT_AT.slice(0, Math.min(n, 5)).map(p => '<span class="m" style="left:' + p[0] + 'px;top:' + p[1] + 'px">' + S.matArt(o.lv) + '</span>').join('');
    const tally = o.tally ? '<b class="tally">' + S.matArt(o.lv) + '<span><em>' + n + '</em> / ' + o.total + '</span></b>' : '';
    return '<div class="slot' + (o.cls ? ' ' + o.cls : '') + '" style="left:' + o.x + 'px;top:' + o.y + 'px"><i class="halo"></i>' + NB + '<span class="eggw">' + S.egg(0, 'eg') + '</span>' + NF + mats + tally + '</div>';
  }
  const frame = (key, base, inner) => '<div class="frame f-' + key + '" style="background-image:url(' + base + ')">' + inner + '</div>';
  const symbol = (id, cls) => '<svg class="' + cls + '" viewBox="0 0 24 24" aria-hidden="true"><use href="#' + id + '" width="24" height="24"/></svg>';

  const F = {
    L1: () => frame('L1', 'out/egg_base_play_L1.png',
      '<div class="ttl" style="left:366px;top:5px;width:228px">和小兔一起找暖草</div>'
      + slot({ x: 30, y: 150, lv: 1, n: 5, total: 10, tally: true })
      + trail('M410 104Q252 84 124 160') + fly(1, 229, 95, -28, 32)
      + sp(282, 96, 11) + sp(198, 117, 10) + sp(160, 134, 9)
      + pin(150, 146, 1) + pin(248, 74, 2) + pin(340, 8, 3)),
    L5: () => frame('L5', 'out/egg_base_play_L5.png',
      '<i class="halo abs" style="left:2px;top:160px;width:112px;height:112px"></i>'
      + '<span class="deckegg" style="left:44px;top:178px">' + S.egg(0, 'eg') + '</span>'
      + '<b class="tally" style="left:10px;top:272px">' + S.matArt(5) + '<span><em>4</em> / 10</span></b>'
      + trail('M184 282Q112 252 66 214') + fly(5, 97, 231, -14, 30) + sp(132, 252, 10) + sp(156, 268, 9)
      + pin(92, 176, 1) + pin(128, 214, 2) + pin(116, 270, 3)),
    L6: () => frame('L6', 'out/egg_base_play_L6.png',
      '<i class="halo abs" style="left:590px;top:372px;width:164px;height:164px"></i>'
      + fly(6, 626, 394, 0, 22) + fly(6, 706, 372, 0, 18) + fly(6, 612, 440, 0, 16)
      + trail('M716 432Q740 392 774 436') + fly(6, 726, 404, 0, 24)
      + sp(690, 398, 10) + sp(646, 372, 9)
      + pin(596, 392, 1) + pin(758, 384, 2)),
    R: () => frame('R', 'out/egg_base_stage_done.png',
      symbol('p-bunny', 'friend').replace('class="friend"', 'class="friend" style="left:290px;top:152px"')
      + slot({ x: 609, y: 150, lv: 1, n: 3, total: 10, tally: false, cls: 'big' })
      + trail('M540 186Q580 150 630 178') + fly(1, 567, 150, -20, 30)
      + sp(700, 150, 14) + sp(604, 150, 12) + sp(722, 214, 11)
      + pin(300, 140, 1) + pin(556, 126, 2) + pin(716, 176, 3))
  };

  const CAP = {
    L1: ['局内 · L1（视算）', '左侧留白处放「蛋位」：窝里坐着萌蛋，旁边是本关材料计数（暖草 5 / 10）。每答对一题，小兔递出一根暖草飞进窝里，蛋亮一圈。标题换成「和小兔一起找暖草」，不改出题和手写区。'],
    L5: ['局内 · L5（帆船）', '蛋坐在帆船甲板上一起出海。每答对一扇门，一枚小贝壳从那扇门飞到船上，蛋晃一下，计数 +1。进度条和终点灯塔保持原样。'],
    L6: ['局内 · L6（萤火小屋）', '这一关蛋本来就站在小刺猬旁边，只加动效：答对时萤火先绕蛋飞一圈、蛋身一暖，再飞进窗里点亮一格。进度条沿用现有的 9 / 20。'],
    R: ['结算 · 宝箱舞台（以 L1 为例）', '宝箱左边是送材料的朋友，右边是大一号的蛋。箱子打开，材料飞进蛋里，蛋弹一下发光，下方能量条再涨 +7。没通关时材料不飞，蛋原地晃一晃，卡上只写「再来一次，就能带回暖草」。']
  };
  const SIX = [
    ['L1', 'p-bunny', 1, '暖草坡', '小兔送暖草', '蛋亮起一圈暖光'],
    ['L2', 'p-squirrel', 2, '松果林', '小松鼠送松果', '蛋开心蹦一下'],
    ['L3', 'p-bird', 3, '音符谷', '小鸟送小音符', '蛋跟着拍子左右晃'],
    ['L4', 'p-deer', 4, '落叶山路', '小鹿送落叶', '蛋轻轻滚一圈'],
    ['L5', 'p-turtle', 5, '贝壳海岸', '小海龟送小贝壳', '蛋被水花溅得一抖'],
    ['L6', 'p-hedgehog', 6, '萤火小屋', '小刺猬送萤火', '壳上亮起一盏小灯']
  ];
  const root = document.getElementById('root');
  if (mode !== 'sheet') { document.body.classList.add('solo'); root.innerHTML = F[mode](); document.body.dataset.ready = '1'; return; }
  const cell = k => '<div class="cell"><div class="fwrap">' + F[k]() + '</div><h2>' + CAP[k][0] + '</h2><p>' + CAP[k][1] + '</p></div>';
  const six = SIX.map(r => '<div class="lv"><b class="tag">' + r[0] + '</b>' + symbol(r[1], 'fr') + '<i class="ar">→</i><span class="mi">' + S.matArt(r[2]) + '</span><div class="t"><b>' + r[3] + '</b>' + r[4] + '</div><div class="rx">' + r[5] + '</div></div>').join('');
  root.innerHTML = '<div class="sheet"><h1>带着蛋去拜访朋友 · 静态稿（方案B）</h1><div class="sub">底图是真实游戏 960×576 截图，橙色小圆点编号对应下方说明；场景名为暂定名。材料仍然只有通关才带回，局内飞入只是动画。</div>'
    + '<div class="grid">' + cell('L1') + cell('L5') + cell('L6') + cell('R') + '</div>'
    + '<div class="six"><h2>六关对照：朋友 → 材料 → 蛋的反应</h2>' + six + '</div></div>';
  document.body.dataset.ready = '1';
})();
