// 宝箱舞台 × 过关场景 合并稿：?s=closed|opened|done（沿用 chest-stage-preview.js 画好舞台）&lv=1..6，再把场景铺成舞台背景、伙伴站到宝箱旁
(() => {
  const Q = new URLSearchParams(location.search), N = +Q.get('lv') || 1;
  delete document.body.dataset.ready;
  if (Q.get('live') !== '1') document.body.classList.add('static');
  const LV = [null,
    { t: '暖草找齐啦！', cap: '小兔抱着暖草笑了，草坡暖烘烘的。', p: 'p-bunny', dy: 92 },
    { t: '松果运回来啦！', cap: '小松鼠的篮子满满的，冬天不怕啦。', p: 'p-squirrel', dy: 92 },
    { t: '小音符找到啦！', cap: '音符回到五线谱，小鸟唱起了歌。', p: 'p-bird', dy: 92 },
    { t: '落叶收好啦！', cap: '山路铺满落叶，小鹿点亮了山顶的灯。', p: 'p-deer', dy: 92, mir: 1 },
    { t: '小贝壳捡到啦！', cap: '小海龟划着船，把贝壳送到了岸边。', p: 'p-turtle', dy: 92 },
    { t: '小屋亮起来啦！', cap: '萤火虫点亮了小屋，大家都回家了。', p: 'p-hedgehog', dy: 56 }];
  const L = LV[N], M = MG_PET.mats[N], cs = document.querySelector('.cs'), box = cs.querySelector('.cs-box');
  cs.classList.add('lv' + N);

  let art;
  if (N === 6) {
    const others = ['p-bunny', 'p-squirrel', 'p-bird', 'p-deer', 'p-turtle'];
    const crowd = '<g class="cs-crowd">' + others.map((id, i) => {
      const x = 733 + i * 41;
      return '<ellipse cx="' + (x + 20) + '" cy="470" rx="17" ry="4" fill="rgba(0,0,0,.3)"/><use href="#' + id + '" x="' + x + '" y="432" width="40" height="38"/>';
    }).join('') + '</g>';
    art = '<g transform="translate(0 -' + L.dy + ')">' + A6base() + '</g><g transform="translate(451 31) scale(.8)">' + A6house() + '</g>'
      + '<g transform="translate(0 -' + L.dy + ')">' + crowd + A6ff() + '</g>';
  } else if (L.mir) art = '<g transform="translate(960 -' + L.dy + ') scale(-1 1)">' + A[N]() + '</g>';
  else art = '<g transform="translate(0 -' + L.dy + ')">' + A[N]() + '</g>';
  const lit = N === 6 ? { closed: '', opened: ' w1 w2 dl', done: ' w1 w2 dl all' }[S] : '';
  cs.insertAdjacentHTML('afterbegin', '<div class="cs-scene' + lit + '"><svg viewBox="0 0 960 576" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + art + '</svg><div class="cs-scrim"></div></div>');

  box.insertAdjacentHTML('beforeend', '<div class="cs-partner' + (N === 6 ? ' lamp' : '') + '"><i class="sh"></i><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#' + L.p + '"/></svg></div>');

  const sub = {
    closed: N === 6 ? '小屋黑漆漆的，萤火都在宝箱里' : L.t + '奖励都在宝箱里',
    opened: N === 6 ? '萤火飞出来啦，小屋亮起来啦' : '奖励收进来啦',
    done: L.cap }[S];
  cs.querySelector('.cs-title').innerHTML = cs.querySelector('.cs-title').firstChild.textContent + '<small>' + sub + '</small>';

  const chips = cs.querySelector('.cs-chips');
  if (chips) {
    const en = chips.querySelector('.en').outerHTML, coin = chips.querySelector('.coin').outerHTML;
    chips.innerHTML = '<span class="cs-chip mat">' + MG_PET_STORY.matArt(N) + M.name + ' ×1</span>' + en + coin
      + (Q.get('first') === '0' ? '' : '<span class="cs-chip partner">' + ic(L.p) + '认识了' + M.friend + '！</span>');
  }
  setTimeout(() => { document.body.dataset.ready = '1'; }, 420);
})();
