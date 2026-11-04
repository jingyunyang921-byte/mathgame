// 宝箱舞台静态稿：?s=closed（合着摇晃等点）| opened（点开 + 能量球飞行中）| done（球落进蛋 + 收下按钮）
const S = new URLSearchParams(location.search).get('s') || 'closed';
const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return MG_PET.dayKey(x); };
const mk = days => ({ version: 2, adopted: true, exp: 0, stage: 0, adoptedDay: d(1 - 22), lastDay: d(0),
  days: Array.from({ length: days }, (_, i) => d(-days + i)), phase: 0, daily: { date: d(0), correct: 0, rounds: [] },
  gifts: [], decor: 'leaf', decors: ['leaf'], name: '数宝', hatchDay: '', birthSeen: false, affection: 0, stories: { seen: [], pending: [] } });
localStorage.setItem('mathgamePet', JSON.stringify(mk(9)));  const before = MG_PET.growth();
localStorage.setItem('mathgamePet', JSON.stringify(mk(10))); const after = MG_PET.growth();
const g = S === 'done' ? after : before;
const ic = id => '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><use href="#' + id + '"/></svg>';
const line = '再 ' + after.next.gap + ' 格 → ' + after.next.name;
const l2 = S === 'closed' ? '再 ' + before.next.gap + ' 格 → ' + before.next.name : line;
const pct = g.energy / g.max * 100;
const strip = '<div class="egg-strip' + (S === 'opened' ? ' catch' : '') + '" role="group" aria-label="成长能量">' + MG_PET_STORY.egg(g.phase)
  + '<div class="col"><div class="l1"><span>萌蛋成长能量</span><span><em>' + g.energy + '</em> / ' + g.max + ' 格</span></div>'
  + MG_PET_STORY.energyBar(g, false).replace(/<\/div>$/, (S === 'done'
    ? '<i class="shine" style="left:calc(' + pct + '% - 24px)"></i><b class="plus1" style="left:' + pct + '%">+1</b>' : '') + '</div>')
  + '<div class="l2">' + l2 + '</div></div></div>';
const sparks = Array.from({ length: 12 }, (_, i) => {
  const a = i / 12 * Math.PI * 2, r = 86 + (i % 3) * 22, s = 12 + (i % 4) * 5;
  return '<i class="cs-spark" style="--x:' + Math.round(Math.cos(a) * r) + 'px;--y:' + Math.round(Math.sin(a) * r * 0.8 - 18) + 'px;--r:' + i * 17 + 'deg;--s:' + s + 'px"></i>';
}).join('');
const chips = '<div class="cs-chips"><span class="cs-chip en"><i class="orb"></i>+1 成长能量</span>'
  + '<span class="cs-chip coin">' + ic('i-coin') + '+12 星币</span>'
  + '<span class="cs-chip partner">' + ic('p-bunny') + '认识了小兔！</span></div>';
const titles = { closed: ['宝箱来啦！', '闯关成功，奖励都在宝箱里'], opened: ['太棒了！', '奖励收进来啦'], done: ['太棒了！', '萌蛋吃到能量，又长大一点点'] };
const chest = S === 'closed' ? 'chest-closed' : 'chest-open';
const root = document.getElementById('root');
root.innerHTML = '<div class="cs ' + S + '"><div class="cs-rays"></div>'
  + '<div class="cs-title">' + titles[S][0] + '<small>' + titles[S][1] + '</small></div>'
  + '<div class="cs-box"><div class="cs-glow"></div>' + (S === 'closed' ? '<i class="cs-ring r1"></i><i class="cs-ring r2"></i>' : sparks)
  + '<div class="cs-chest"><svg viewBox="8 9 48 50" aria-hidden="true"><use href="#' + chest + '" width="64" height="64"/></svg></div>'
  + (S === 'closed' ? '<i class="cs-tapfx"></i><svg class="cs-hand" viewBox="0 0 48 48" aria-hidden="true"><path d="M19 6.5a3.5 3.5 0 0 1 7 0V22l8.2 1.6c2.6.5 4.3 3 3.6 5.6l-2.4 9.6c-.6 2.5-2.8 4.2-5.3 4.2H21c-1.7 0-3.3-.9-4.2-2.3L9.6 30c-1-1.6-.5-3.7 1.2-4.6 1.4-.7 3-.4 4.1.8L19 30V6.5Z" fill="#fff" stroke="#8A531B" stroke-width="2.4" stroke-linejoin="round"/></svg>' : '')
  + '</div>'
  + (S === 'closed' ? '<div class="cs-cue">点一点，打开宝箱！</div>' : chips)
  + strip
  + (S === 'done' ? '<button class="cs-go" type="button">收下啦！</button>' : '')
  + '</div>';
if (S === 'opened') setTimeout(() => {
  const cs = root.querySelector('.cs'), box = cs.getBoundingClientRect(), a = cs.querySelector('.cs-chip.en').getBoundingClientRect(), b = cs.querySelector('svg.egg').getBoundingClientRect();
  const sx = a.left + a.width / 2 - box.left, sy = a.bottom - box.top - 2, ex = b.left + b.width / 2 - box.left, ey = b.top + b.height * 0.45 - box.top;
  const cx = (sx + ex) / 2 - 46, cy = Math.min(sy, ey) - 34, t = 0.55, u = 1 - t;
  const px = u * u * sx + 2 * u * t * cx + t * t * ex, py = u * u * sy + 2 * u * t * cy + t * t * ey;
  const dx = 2 * u * (cx - sx) + 2 * t * (ex - cx), dy = 2 * u * (cy - sy) + 2 * t * (ey - cy);
  const o = document.createElement('i'); o.className = 'flyorb';
  o.style.left = px + 'px'; o.style.top = py + 'px';
  o.style.setProperty('--a', Math.atan2(dy, dx) * 180 / Math.PI + 'deg');
  cs.appendChild(o);
  document.body.dataset.ready = '1';
}, 200);
else document.body.dataset.ready = '1';
