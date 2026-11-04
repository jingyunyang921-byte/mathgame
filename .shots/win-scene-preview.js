// 过关小剧场静态稿：?s=1..6 | sheet（总览）；&f=0|1|2 仅第6关点亮进度；&static=1 关动画（截图用）
const Q = new URLSearchParams(location.search), S = Q.get('s') || 'sheet';
if (Q.get('static') === '1') document.body.classList.add('static');
const LV = [null,
  { t: '暖草找齐啦！', cap: '小兔抱着暖草笑了，草坡暖烘烘的。', p: 'p-bunny', c: '#FF9A3D', m: '暖草', sky: '#FFE2A2' },
  { t: '松果运回来啦！', cap: '小松鼠的篮子满满的，冬天不怕啦。', p: 'p-squirrel', c: '#C98240', m: '松果', sky: '#FFD39C' },
  { t: '小音符找到啦！', cap: '音符回到五线谱，小鸟唱起了歌。', p: 'p-bird', c: '#9B7FE0', m: '小音符', sky: '#FFD8E6' },
  { t: '落叶收好啦！', cap: '山路铺满落叶，小鹿点亮了山顶的灯。', p: 'p-deer', c: '#E4572E', m: '落叶', sky: '#FFC79E' },
  { t: '小贝壳捡到啦！', cap: '小海龟划着船，把贝壳送到了岸边。', p: 'p-turtle', c: '#26A9C4', m: '小贝壳', sky: '#E6F9FF' },
  { t: '小屋亮起来啦！', cap: '萤火虫点亮了小屋，大家都回家了。', p: 'p-hedgehog', c: '#FFC94D', m: '萤火', sky: '#3A4388' }];
const PS = LV.slice(1).map(x => x.p);
const sv = (id, cls) => '<svg viewBox="0 0 24 24" aria-hidden="true"' + (cls ? ' class="' + cls + '"' : '') + '><use href="#' + id + '"/></svg>';

function scene(n, f) {
  const L = LV[n], fin = n === 6;
  const cls = 'ws' + (fin ? ['', ' w1 w2', ' w1 w2 dl all'][f] : '');
  let h = '<div class="' + cls + '" style="--c:' + L.c + ';background:' + L.sky + '"><div class="ws-stage" style="transform:scale(var(--kb))"><svg class="ws-bg" viewBox="0 0 960 576" aria-hidden="true">' + A[n]() + '</svg></div><div class="ws-stage" style="transform:scale(var(--ku))">';
  h += '<div class="ws-ribbon"><div class="ws-title" style="' + (fin ? 'background:#2A3270;color:#FFF3C4;border-color:#FFC94D' : '') + '">' + L.t + '</div>'
    + '<span class="ws-cap" style="' + (fin ? 'background:rgba(30,36,90,.78);color:#FFF3C4' : '') + '">' + L.cap + '</span></div>';
  if (fin) {
    const xs = [120, 225, 330, 630, 735, 840], order = [0, 1, 2, 5, 3, 4];
    h += '<div class="ws-row">' + order.map((pi, i) => '<i class="sh" style="left:' + xs[i] + 'px"></i><div class="p' + (pi === 5 ? ' lamp' : '') + '" style="left:' + xs[i] + 'px">' + sv(PS[pi]) + '</div>').join('') + '</div>';
    h += '<button class="ws-go" style="color:#3A2A00;left:410px;top:518px">继续</button>';
  } else {
    h += '<div class="ws-halo"></div><div class="ws-shadow"></div><div class="ws-hero">' + sv(L.p) + '</div>';
    h += '<div class="ws-pile">' + [0, 1, 2].map(() => '<i class="ws-m">' + MG_PET_STORY.matArt(n) + '</i>').join('') + '</div><div class="ws-chip">带回 ' + L.m + '</div>';
    h += '<div class="ws-dl">已找回 ' + n + '/6</div><div class="ws-dots">' + PS.map((p, i) => '<span class="d' + (i + 1 < n ? '' : i + 1 === n ? ' now' : ' off') + '">' + sv(p) + '</span>').join('') + '</div>';
    h += '<button class="ws-go">继续</button>';
  }
  return h + '</div></div>';
}
function fit() {
  const w = innerWidth, hh = innerHeight, land = w / hh >= 1.4;
  const st = document.documentElement.style, ku = Math.min(w / 960, hh / 576);
  st.setProperty('--ku', ku.toFixed(4)); st.setProperty('--kb', (land ? Math.max(w / 960, hh / 576) : ku).toFixed(4));
}
const root = document.getElementById('root');
if (S === 'sheet') {
  root.innerHTML = '<div class="sheet">' + [1, 2, 3, 4, 5, 6].map(n => '<div class="c"><iframe src="?s=' + n + '&static=1"></iframe></div>').join('') + '</div>';
  document.body.style.overflow = 'auto'; document.documentElement.style.overflow = 'auto'; document.body.dataset.ready = '1';
} else {
  const n = +S, f = +(Q.get('f') || 2);
  root.innerHTML = scene(n, f); fit(); addEventListener('resize', fit);
  if (n === 6 && Q.get('f') === null && Q.get('static') !== '1') {
    const ws = root.firstChild, seq = [[600, 'w1'], [1300, 'w2'], [2000, 'dl'], [2600, 'all']];
    ws.className = 'ws'; seq.forEach(([t, c]) => setTimeout(() => ws.classList.add(c), t));
  }
  document.body.dataset.ready = '1';
}
