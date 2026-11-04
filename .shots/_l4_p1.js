  _drawRaceScene() {
    this._drawStrip('race-left-canvas', true);
    this._drawStrip('race-right-canvas', false);
  }

  // L4「并肩上山」：左条=孩子和小鹿走同一条秋日山路，通向挂灯的落叶小亭；右条=落叶堆/蛋窝面板。
  _drawStrip(canvasId, left) {
    const cv = document.getElementById(canvasId);
    if (!cv || !cv.width || !cv.height) return;
    const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, tr = this._raceTrail(W, H);
    ctx.clearRect(0, 0, W, H);
    this._raceSkyBand(ctx, cv, tr, left);
    this._raceGround(ctx, W, H, tr.finishY);
    this._raceLitter(ctx, W, H, tr.finishY, left ? 5117 : 4421, left ? 14 : 18);
    if (left) {
      this._raceDrawPath(ctx, W, H, tr);
      this._raceTerrain(ctx, W, tr);
      this._raceMarks(ctx, W, tr);
      this._raceDrawPair(ctx, W, tr, false);
    } else this._raceDrawPanel(ctx, W, H, tr);
  }

  _raceU(W) {
    return Math.max(0.42, Math.min(2.2, W / 210, window.innerHeight / 520));
  }

  _raceTrail(W, H) {
    // 山路几何：t=0 在底部起点，t=1 在山顶小亭；底部与山顶收直，中段轻轻摆动
    const lerp = (a, b, t) => a + (b - a) * t, finishY = Math.round(window.innerHeight * 0.20);
    return {
      finishY, startY: H,
      cx: t => W * 0.5 + Math.sin(t * Math.PI * 1.5 + 0.3) * W * 0.075 * Math.sin(Math.min(t * 4, Math.PI / 2)) * (t > 0.85 ? 0.6 : 1),
      hw: t => lerp(W * 0.33, W * 0.19, t),
      y: t => lerp(H, finishY, t)
    };
  }

  _raceStepT(s) {
    return 0.1 + 0.87 * Math.min(1, s / RACE_TOTAL);
  }

  _raceSkyFill(ctx, fy) {
    const g = ctx.createLinearGradient(0, 0, 0, fy);
    g.addColorStop(0, '#F5C487'); g.addColorStop(0.6, '#FADBAB'); g.addColorStop(1, '#FDEBCB');
    ctx.fillStyle = g; ctx.fillRect(0, 0, ctx.canvas.width, fy);
  }

  _raceHills(ctx, fy, x0) {
    // 按整屏宽度的比例画，x0=本画布左缘，三块画布的山在接缝处对得上
    const T = window.innerWidth || 960;
    const hill = (f, rx, ry, col) => {
      ctx.fillStyle = col; ctx.beginPath();
      ctx.ellipse(T * f - x0, fy + 2, T * rx, fy * ry, 0, Math.PI, 0); ctx.fill();
    };
    hill(0.18, 0.30, 0.55, 'rgba(228,152,98,0.55)');
    hill(0.80, 0.32, 0.46, 'rgba(216,130,76,0.60)');
    hill(0.50, 0.36, 0.26, 'rgba(188,100,58,0.70)');
  }

  _raceCloud(ctx, x, y, r) {
    ctx.fillStyle = 'rgba(255,247,232,0.92)';
    [[0, 0, 1, 0.6], [-0.55, 0.18, 0.55, 0.4], [0.58, 0.2, 0.5, 0.36]].forEach(c => {
      ctx.beginPath(); ctx.ellipse(x + c[0] * r, y + c[1] * r, c[2] * r, c[3] * r, 0, 0, Math.PI * 2); ctx.fill();
    });
  }

  _raceLeaf(ctx, x, y, r, rot, col) {
    // 小枫叶：右半边轮廓镜像出左半边，朝上，r 是叶长的一半
    const P = [[0.2, -0.6], [0.52, -0.72], [0.42, -0.3], [0.95, -0.22], [0.62, 0.08], [0.78, 0.42], [0.28, 0.3], [0.06, 0.52]];
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(r, r);
    ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 0.14; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -1);
    for (let i = 0; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]);
    for (let i = P.length - 1; i >= 0; i--) ctx.lineTo(-P[i][0], P[i][1]);
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 0.4); ctx.lineTo(0, 1.05); ctx.stroke();
    ctx.restore();
  }

  _raceDriftLeaves(ctx, W, fy, n, u, ph) {
    // 天空带里横着飘过的几片叶子，位置只由相位决定（静态时停在 ph=0 的位置）
    for (let k = 0; k < n; k++) {
      const f = (((ph * (0.011 + k * 0.004) + k * 0.37) % 1) + 1) % 1;
      const x = -12 + (W + 24) * f, y = fy * (0.22 + 0.5 * ((k * 0.41 + f * 0.5) % 1)) + Math.sin(ph * 0.22 + k * 2) * 5;
      this._raceLeaf(ctx, x, y, 5.5 * u, ph * 0.13 + k, RACE_LEAF_COLORS[(k + 1) % 5]);
    }
  }

  _raceGround(ctx, W, H, fy) {
    const g = ctx.createLinearGradient(0, fy, 0, H);
    g.addColorStop(0, '#F1D5A0'); g.addColorStop(0.3, '#E6BF80'); g.addColorStop(0.7, '#D9A765'); g.addColorStop(1, '#CE9A5A');
    ctx.fillStyle = g; ctx.fillRect(0, fy, W, H - fy);
  }

  _raceLitter(ctx, W, H, fy, seed, n) {
    // 地上散落的小叶子（固定种子，重绘位置不变）
    const rnd = (s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(seed), u = this._raceU(W);
    ctx.globalAlpha = 0.8;
    for (let i = 0; i < n; i++) {
      const y = fy + 14 + rnd() * (H - fy - 24), s = (3.2 + rnd() * 2.6) * u * (0.7 + 0.5 * (y - fy) / (H - fy));
      this._raceLeaf(ctx, rnd() * W, y, s, rnd() * 6.28, RACE_LEAF_COLORS[i % 5]);
    }
    ctx.globalAlpha = 1;
  }

