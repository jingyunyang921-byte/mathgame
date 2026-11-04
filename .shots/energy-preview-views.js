// 视图渲染：A 小窝弹窗 / B 八阶段外观 / C1-C3 结算开箱三帧
const S = STAGES;
const ic = (id, cls) => '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true"><use href="#' + id + '"/></svg>';
const sprite = (id) => '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#' + id + '"/></svg>';
function viewA() {
  const energy = 17, cur = 2, nx = 3, gap = S[nx].e - energy;
  return '<div class="scene"></div><div id="petModal" class="locked-modal"><div class="locked-modal-bg"></div><div class="locked-modal-card pet-card">'
    + '<div class="pet-eyebrow">一颗萌蛋 · 一起长大的约定</div><div class="locked-modal-title">数宝的旅行小窝</div><div class="pet-layout">'
    + '<div class="pet-home"><div class="pet-nest">' + BASKET + eggSVG(cur, 'pet-art') + '<span class="pet-nest-label">陪伴第 22 天</span></div>'
    + '<div class="pet-stage-name">' + S[cur].n + '</div><div class="pet-desc">' + S[cur].fx + '</div>'
    + '<div class="energy"><div class="en-head"><span class="t"><i class="orb"></i>成长能量</span><span><b>' + energy + '</b> / 60 格</span></div>'
    + barHTML(energy, nx, true)
    + '<div class="en-next"><div class="th">' + eggSVG(nx) + '<u>?</u></div><div><small>下一站</small><b>' + S[nx].n + '</b>'
    + '<span class="gap">还差 <em>' + gap + '</em> 格能量</span><span class="when">陪伴到第 ' + S[nx].d + ' 天开启</span></div></div></div></div>'
    + '<div class="pet-journal"><div class="pet-tabs"><span class="on">今天</span><span>小窝</span><span>手记</span><span>家长</span></div><div class="pet-panel">'
    + '<div class="pet-note-title">今天的能量：再答对 2 题</div><div class="today-dots"><s class="on"></s><s class="on"></s><s class="on"></s><s></s><s></s></div>'
    + '<div class="pet-note">答对 5 题，萌蛋就能吸收 1 格成长能量。</div><button class="locked-modal-btn">做一轮小练习</button>'
    + '<p class="pet-note">能量只来自你的学习，休息几天也不会掉。星币和礼物不会让蛋提前出生，但朋友们的礼物会在新阶段派上用场。</p></div></div></div>'
    + '<div class="locked-modal-btns pet-footer"><button class="locked-modal-btn ghost">收好手记</button><button class="locked-modal-btn">摸一摸，暖暖窝</button></div></div></div>';
}
function viewB() {
  const cur = 2;
  const cards = S.map((s, i) => '<div class="sc' + (i === cur ? ' cur' : '') + '"><span class="no">' + (i + 1) + '</span>' + (i === cur ? '<span class="tag">现在</span>' : '')
    + eggSVG(i) + '<h3>' + s.n + '</h3><div class="req"><i class="orb" style="width:9px;height:9px"></i>能量 ' + s.e + ' 格 · 第 ' + s.d + ' 天</div>'
    + (s.g ? '<div class="gf">' + sprite(s.g[0]) + s.g[1] + '</div>' : '<div class="gf none">' + (i ? '蛋自己的悄悄话（无礼物）' : '出发的起点') + '</div>')
    + '<div class="fx">' + s.fx + '</div></div>').join('');
  return '<div class="sb"><h1>萌蛋的 8 个成长阶段</h1><p class="sub">每攒够能量，蛋的样子就变一次；朋友送的礼物，会在对应阶段派上用场</p><div class="sg">' + cards + '</div></div>';
}
function strip(e, pulse) {
  const nx = 3, gap = S[nx].e - e;
  return '<div class="egg-strip' + (pulse ? ' pulse' : '') + '" id="strip">' + eggSVG(2) + '<div class="col"><div class="l1"><span>萌蛋能量</span><span><em>' + e + '</em> / 60 格</span></div>'
    + barHTML(e, nx, false) + '<div class="l2">再 ' + gap + ' 格 → ' + S[nx].n + '</div></div></div>';
}
function viewC(step) {
  const closed = step === 1, e = step === 3 ? 18 : 17;
  const chest = closed
    ? '<div class="cstage big" id="chest">' + ic('chest-closed') + '</div><div class="tapcue">点一点，打开奖励！</div>'
    : '<div class="cstage" id="chest">' + ic('chest-open') + '</div><div class="rw"><span class="rwc coin">' + ic('i-coin') + '+12 星币</span><span class="rwc en" id="enchip"><i class="orb"></i>+1 成长能量</span></div>';
  const story = '<div class="story" style="' + (closed ? 'visibility:hidden' : '') + '"><span>小兔送来「柔软窝垫」· 孵蛋时会用上</span><button>看故事</button></div>';
  return '<div class="scene game"></div><div class="ov"><div class="ov-bg"></div><div class="card" id="card">'
    + '<div class="medal">' + ic('i-star') + '</div><div class="ttl">闯关成功！</div>'
    + '<div class="stars">' + ic('i-star') + ic('i-star') + ic('i-star') + '</div><div class="stats">正确率 100% · 用时 38 秒 · 连对 8</div>'
    + '<div class="chestbox">' + chest + '</div>' + strip(e, step === 3) + story
    + '<div class="btns"><button class="b1">' + ic('i-play') + ' 挑战下一关！</button><button class="b2">' + ic('i-refresh') + ' 再来一局！</button><button class="b3">' + ic('i-back') + ' 休息一下</button></div>'
    + '</div></div><div class="note">' + ['', '① 待开启：宝箱晃动，点一下才发奖励', '② 已打开：星币+能量弹出，能量球飞向蛋', '③ 落进蛋里：进度条涨 1 格，蛋跳一下'][step] + '</div>';
}
function afterC(step) {
  if (step === 2) {
    const a = document.getElementById('enchip').getBoundingClientRect(), b = document.querySelector('#strip svg.egg').getBoundingClientRect(), c = document.getElementById('card').getBoundingClientRect();
    const sx = a.left + a.width / 2, sy = a.bottom, tx = b.left + b.width / 2, ty = b.top + b.height / 2;
    const px = sx + (tx - sx) * .55, py = sy + (ty - sy) * .55, ang = Math.atan2(sy - py, sx - px) * 180 / Math.PI - 180;
    const o = document.createElement('div'); o.className = 'flyorb'; o.style.left = (px - c.left - 8) + 'px'; o.style.top = (py - c.top - 8) + 'px';
    o.innerHTML = '<i class="orb" style="width:16px;height:16px;box-shadow:0 0 12px rgba(255,185,40,.95)"></i>';
    o.style.setProperty('--a', ang + 'deg'); document.getElementById('card').appendChild(o);
  }
  if (step === 3) {
    const f = document.querySelector('#strip .en-fill'), bar = f.parentNode;
    const s = document.createElement('div'); s.className = 'shine'; s.style.left = 'calc(' + (18 / 60 * 100) + '% - 22px)'; bar.appendChild(s);
    const t = document.createElement('div'); t.textContent = '+1'; t.style.cssText = 'position:absolute;left:calc(' + (18 / 60 * 100) + '% - 8px);top:-19px;font:900 13px var(--font-ui);color:#E8701A';
    bar.appendChild(t);
  }
}
(async () => {
  await loadSprites();
  const v = new URLSearchParams(location.search).get('v') || 'A';
  const root = document.getElementById('root');
  root.innerHTML = v === 'A' ? viewA() : v === 'B' ? viewB() : viewC(+v[1]);
  if (v[0] === 'C') afterC(+v[1]);
  document.body.dataset.ready = '1';
})();
