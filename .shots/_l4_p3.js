  _raceMarks(ctx, W, tr) {
    // 路上还没捡的落叶：答对一题，对应那一片就收走（飞进右边的落叶堆/蛋窝）
    const u = this._raceU(W);
    for (let i = this.playerStep + 1; i <= RACE_TOTAL; i++) {
      const t = this._raceStepT(i), side = i % 2 ? -1 : 1;
      this._raceLeaf(ctx, tr.cx(t) + side * tr.hw(t) * 0.55, tr.y(t) + 2 * u, (7.5 - t * 2) * u, side * 0.5 + i, RACE_LEAF_COLORS[i % 5]);
    }
  }

  _raceDrawPair(ctx, W, tr, bandOnly) {
    // 孩子和小鹿走同一条路：孩子偏左，小鹿偏右、比孩子多半步，远的先画。bandOnly=只补画伸进天空带的那部分（不画影子）
    const u = this._raceU(W), fy = tr.finishY;
    const mk = kid => {
      const t = this._raceStepT(kid ? this.playerStep : this.monsterStep + 0.5);
      return { kid, x: tr.cx(t) + tr.hw(t) * (kid ? -0.28 : 0.42), y: tr.y(t), size: (kid ? 118 : 88) * u * (1 - 0.28 * t) };
    };
    ctx.save();
    if (bandOnly) { ctx.beginPath(); ctx.rect(0, 0, W, fy); ctx.clip(); }
    [mk(false), mk(true)].sort((a, b) => a.y - b.y).forEach(c => {
      if (bandOnly && c.y - c.size * 0.95 >= fy) return;
      if (!bandOnly && c.kid) {
        ctx.fillStyle = 'rgba(60,34,12,0.25)'; ctx.beginPath();
        ctx.ellipse(c.x, c.y + c.size * 0.04, c.size * 0.3, c.size * 0.07, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.save(); ctx.translate(c.x, c.y - c.size * 0.4);
      if (c.kid) this._drawRaceKid(ctx, 0, 0, c.size); else this._drawRaceBuddy(ctx, 0, 0, c.size);
      ctx.restore();
    });
    ctx.restore();
  }

  _raceDrawPanel(ctx, W, H, tr) {
    // 右条：一棵大枫树 + 树下的落叶堆（没领养）或蛋窝的落叶垫（领养了，蛋窝本体是 DOM）
    const u = this._raceU(W), fy = tr.finishY, nest = mgRaceNest(W, H), sc = nest.sc;
    ctx.save(); ctx.beginPath(); ctx.rect(0, fy, W, H - fy); ctx.clip(); this._raceBigTree(ctx, W, fy, false); ctx.restore();
    this._racePlant(ctx, 'bush', W * 0.14, fy + 128 * u, 1.5 * u);
    this._racePlant(ctx, 'rock', W * 0.86, fy + 150 * u, 1.3 * u);
    this._racePlant(ctx, 'tuft', W * 0.82, fy + 118 * u, 1.2 * u);
    const cx = W / 2, by = nest.y + 84 * sc, oval = (rx, ry, y, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(cx, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); };
    oval(74 * sc, 22 * sc, by + 6 * sc, 'rgba(176,96,52,0.35)'); oval(60 * sc, 16 * sc, by + 4 * sc, 'rgba(176,96,52,0.5)');
    if (typeof MG_EGG !== 'undefined' && MG_EGG.on) return;
    const n = Math.min(RACE_TOTAL, this.playerStep), rows = [4, 3, 2, 1], base = [0, 4, 7, 9];
    oval(58 * sc, 20 * sc, by - 2 * sc, '#A9582E');
    for (let i = 0; i < n; i++) {
      const row = i < 4 ? 0 : i < 7 ? 1 : i < 9 ? 2 : 3, col = i - base[row];
      this._raceLeaf(ctx, cx + (col - (rows[row] - 1) / 2) * 16 * sc, by - row * 10 * sc, 9.5 * sc, ((i * 1.7) % 6.28 - 3.14) * 0.5, RACE_LEAF_COLORS[i % 5]);
    }
    const pw = 76 * sc, ph = 24 * sc, px = cx - pw / 2, py = by + 24 * sc;
    ctx.fillStyle = '#FFF8E6'; ctx.strokeStyle = '#E7C98A'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(px, py, pw, ph, ph / 2); ctx.fill(); ctx.stroke();
    this._raceLeaf(ctx, px + 15 * sc, py + ph / 2, 7 * sc, 0.3, '#D9532B');
    ctx.fillStyle = '#8A531B'; ctx.font = '800 ' + Math.round(14 * Math.max(0.8, sc)) + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(n + '/' + RACE_TOTAL, px + pw * 0.62, py + ph / 2 + 1);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  _raceSkyBand(ctx, cv, tr, left) {
    // 天空带：晚霞天、远山、云、飘落的叶子，左条是山顶小亭、右条是大枫树的树冠；整段裁在带内，可单独重绘
    const W = cv.width, fy = tr.finishY, u = this._raceU(W), ph = this._racePhase || 0;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, fy); ctx.clip();
    this._raceSkyFill(ctx, fy);
    if (left) { this._raceCloud(ctx, W * 0.2, fy * 0.3, Math.max(8, W * 0.075)); this._raceCloud(ctx, W * 0.84, fy * 0.2, Math.max(6, W * 0.05)); }
    this._raceHills(ctx, fy, cv.getBoundingClientRect().left);
    if (left) this._racePavilion(ctx, tr.cx(1), fy, Math.min(fy - 6, 108 * u), Math.min(1, this.playerStep / RACE_TOTAL), ph);
    else this._raceBigTree(ctx, W, fy, true);
    this._raceDriftLeaves(ctx, W, fy, left ? 2 : 3, u, ph);
    ctx.restore();
  }

  _startRaceFlutter() {
    // 小亭灯笼轻轻晃、叶子慢慢飘：~11fps 只重绘两侧天空带（小区域，纯 canvas，不动 DOM
    // 合成层，避开弱 GPU 的 assumedOverlap 掉帧坑）。减弱动态效果时不启动。
    if (this._raceRAF) return;
    try { if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (e) {}
    const step = () => {
      this._raceRAF = null;
      const sec = document.getElementById('race-section');
      if (this.gameEnded || !sec || !sec.classList.contains('active')) return;
      const now = performance.now();
      if (now - (this._raceLast || 0) >= 85) {
        this._raceLast = now;
        this._racePhase = (this._racePhase || 0) + 1;
        this._redrawRaceSkyBands();
      }
      this._raceRAF = requestAnimationFrame(step);
    };
    this._raceRAF = requestAnimationFrame(step);
  }

  _redrawRaceSkyBands() {
    [['race-left-canvas', true], ['race-right-canvas', false]].forEach(([id, left]) => {
      const cv = document.getElementById(id);
      if (!cv || !cv.width || !cv.height) return;
      const ctx = cv.getContext('2d'), tr = this._raceTrail(cv.width, cv.height);
      this._raceSkyBand(ctx, cv, tr, left);
      if (left) this._raceDrawPair(ctx, cv.width, tr, true);
    });
  }

  _drawCenterScene() {
    // 中央答题区背景：延续两侧的晚霞天空和秋日远山，地面一样的暖色，再叠一层很浅的暖褐渐晕让白色题卡更突出
    const wrap = document.getElementById('race-canvas-wrap'), cv = document.getElementById('race-canvas');
    if (!wrap || !cv || wrap.clientWidth === 0) return;
    cv.width = wrap.clientWidth; cv.height = wrap.clientHeight;
    const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, fy = Math.round(window.innerHeight * 0.20);
    this._raceSkyFill(ctx, fy);
    this._raceCloud(ctx, W * 0.34, fy * 0.3, W * 0.045); this._raceCloud(ctx, W * 0.66, fy * 0.24, W * 0.035);
    this._raceHills(ctx, fy, 0);
    this._raceGround(ctx, W, H, fy);
    this._raceLitter(ctx, W, H, fy, 8081, 36);
    const vg = ctx.createLinearGradient(0, fy, 0, H);
    vg.addColorStop(0, 'rgba(110,64,28,0.08)'); vg.addColorStop(0.35, 'rgba(110,64,28,0.14)'); vg.addColorStop(1, 'rgba(90,50,20,0.20)');
    ctx.fillStyle = vg; ctx.fillRect(0, fy, W, H - fy);
  }

