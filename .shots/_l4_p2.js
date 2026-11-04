  _racePavilion(ctx, x, fy, h, lit, ph) {
    // 山顶落叶小亭：台基、柱子、翘角红顶、挂灯。lit=0..1 随答对越来越亮，ph 让灯轻轻晃
    const w = h * 1.18, pw = w * 0.07, eaves = fy - h * 0.56, top = fy - h;
    ctx.fillStyle = '#C9A06A'; ctx.beginPath(); ctx.roundRect(x - w * 0.5, fy - h * 0.1, w, h * 0.1 + 3, 3); ctx.fill();
    ctx.fillStyle = '#E3C08A'; ctx.fillRect(x - w * 0.5, fy - h * 0.1, w, h * 0.025);
    ctx.fillStyle = '#5E3A20'; ctx.fillRect(x - w * 0.36, fy - h * 0.58, w * 0.72, h * 0.48);
    ctx.fillStyle = '#8C5A2B';
    ctx.fillRect(x - w * 0.37, fy - h * 0.58, pw, h * 0.48); ctx.fillRect(x + w * 0.37 - pw, fy - h * 0.58, pw, h * 0.48);
    const ly = fy - h * 0.34, lr = h * 0.1, glow = lit * (0.88 + 0.12 * Math.sin(ph * 0.5));
    const gr = ctx.createRadialGradient(x, ly, 0, x, ly, h * 0.5);
    gr.addColorStop(0, 'rgba(255,205,120,' + (0.1 + 0.55 * glow).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(255,205,120,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, ly, h * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3F2A18'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, eaves); ctx.lineTo(x, ly - lr); ctx.stroke();
    ctx.fillStyle = '#B87A48'; ctx.beginPath(); ctx.ellipse(x, ly, lr * 0.82, lr, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,224,140,' + (0.25 + 0.75 * glow).toFixed(2) + ')';
    ctx.beginPath(); ctx.ellipse(x, ly, lr * 0.5, lr * 0.68, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3F2A18'; ctx.fillRect(x - lr * 0.4, ly - lr - 1.5, lr * 0.8, 2); ctx.fillRect(x - lr * 0.4, ly + lr - 0.5, lr * 0.8, 2);
    ctx.fillStyle = '#B5472E'; ctx.beginPath();
    ctx.moveTo(x - w * 0.58, eaves - h * 0.04);
    ctx.quadraticCurveTo(x - w * 0.3, eaves + h * 0.02, x - w * 0.14, top + h * 0.06);
    ctx.lineTo(x + w * 0.14, top + h * 0.06);
    ctx.quadraticCurveTo(x + w * 0.3, eaves + h * 0.02, x + w * 0.58, eaves - h * 0.04);
    ctx.quadraticCurveTo(x + w * 0.32, eaves + h * 0.1, x, eaves + h * 0.1);
    ctx.quadraticCurveTo(x - w * 0.32, eaves + h * 0.1, x - w * 0.58, eaves - h * 0.04);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8F3322'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#E9A92F'; ctx.beginPath(); ctx.roundRect(x - w * 0.16, top + h * 0.02, w * 0.32, h * 0.05, 2); ctx.fill();
  }

  _raceBigTree(ctx, W, fy, withCanopy) {
    // 右条那棵大枫树：树干横跨天空带和地面，冠只画在天空带里
    const u = this._raceU(W), cx = W * 0.5, top = fy * 0.7, foot = fy + Math.round(112 * u), tw = W * 0.055, bw = W * 0.095;
    ctx.fillStyle = '#7A4A28'; ctx.beginPath();
    ctx.moveTo(cx - tw, top); ctx.lineTo(cx + tw, top);
    ctx.quadraticCurveTo(cx + tw * 1.1, foot - 24 * u, cx + bw, foot);
    ctx.quadraticCurveTo(cx, foot + 6 * u, cx - bw, foot);
    ctx.quadraticCurveTo(cx - tw * 1.1, foot - 24 * u, cx - tw, top);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,220,170,0.18)'; ctx.fillRect(cx - tw * 0.55, top, tw * 0.5, foot - top - 6 * u);
    if (!withCanopy) return;
    const clump = (dx, dy, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx + dx * W, fy * dy, r * W, 0, Math.PI * 2); ctx.fill(); };
    clump(-0.27, 0.62, 0.20, '#C8502A'); clump(0.27, 0.60, 0.21, '#D45E2B');
    clump(0, 0.38, 0.27, '#E8832F'); clump(-0.18, 0.45, 0.16, '#EE9A3A');
    clump(0.2, 0.40, 0.15, '#EDB13A'); clump(-0.05, 0.30, 0.10, '#F4C25A');
  }

  _racePlant(ctx, kind, x, y, sc) {
    const oval = (cx, cy, rx, ry, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); };
    if (kind === 'rock') {
      oval(x, y - 4 * sc, 9 * sc, 6.5 * sc, '#B7A08A'); oval(x + 2 * sc, y - 1.5 * sc, 6 * sc, 3.5 * sc, '#8F7A68');
      oval(x - 2.5 * sc, y - 6.5 * sc, 4 * sc, 2 * sc, 'rgba(255,255,255,0.35)');
    } else if (kind === 'bush') {
      oval(x - 6 * sc, y - 6 * sc, 9 * sc, 7 * sc, '#B8582E'); oval(x + 6 * sc, y - 6 * sc, 10 * sc, 8 * sc, '#C8702A');
      oval(x, y - 10 * sc, 8 * sc, 6 * sc, '#D98A3A');
    } else if (kind === 'tuft') {
      ctx.strokeStyle = '#B8883F'; ctx.lineWidth = Math.max(1, 1.6 * sc); ctx.lineCap = 'round';
      [-5, -2, 1, 4].forEach((d, i) => { ctx.beginPath(); ctx.moveTo(x + d * sc, y); ctx.quadraticCurveTo(x + (d + (i % 2 ? 2 : -2)) * sc, y - 6 * sc, x + (d * 1.6) * sc, y - (11 + i % 2 * 3) * sc); ctx.stroke(); });
    } else {
      const pine = kind === 'pine', col = kind === 'maple' ? ['#D9532B', '#EE8A3A'] : kind === 'ginkgo' ? ['#E9A92F', '#F3C95E'] : ['#4F7A47', '#628F55'];
      ctx.fillStyle = '#7A4A28'; ctx.fillRect(x - 2.2 * sc, y - 14 * sc, 4.4 * sc, 14 * sc);
      if (pine) {
        [[0, 30, 15], [0, 22, 12], [0, 15, 9]].forEach(p => { ctx.fillStyle = col[p[2] > 10 ? 0 : 1]; ctx.beginPath(); ctx.moveTo(x - p[2] * sc, y - p[1] * sc * 0.55); ctx.lineTo(x, y - (p[1] + 14) * sc); ctx.lineTo(x + p[2] * sc, y - p[1] * sc * 0.55); ctx.closePath(); ctx.fill(); });
      } else {
        oval(x - 4 * sc, y - 21 * sc, 10 * sc, 9 * sc, col[0]); oval(x + 5 * sc, y - 23 * sc, 10 * sc, 9 * sc, col[0]); oval(x, y - 28 * sc, 9 * sc, 8 * sc, col[1]);
      }
    }
  }

  _raceTerrain(ctx, W, tr) {
    // 路两旁的树、灌木、石头：固定种子，沿 t 交替摆
    const u = this._raceU(W), fy = tr.finishY, kinds = ['rock', 'maple', 'tuft', 'pine', 'bush', 'ginkgo', 'tuft', 'maple', 'rock', 'pine', 'bush', 'tuft'];
    const rnd = (s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(5117);
    kinds.forEach((kd, k) => {
      const t = 0.04 + (k / kinds.length) * 0.8 + (rnd() - 0.5) * 0.04, side = (k + (rnd() < 0.3 ? 1 : 0)) % 2 ? 1 : -1;
      const x = tr.cx(t) + side * (tr.hw(t) + (5 + rnd() * 12) * u), sc = (1.5 - t * 0.6) * (0.8 + rnd() * 0.4) * u;
      if (x < 6 || x > W - 6 || tr.y(t) - 40 * sc < fy + 4) return;
      this._racePlant(ctx, kd, x, tr.y(t), sc);
    });
  }

  _raceDrawPath(ctx, W, H, tr) {
    const N = 24, u = this._raceU(W);
    const trace = k => {
      ctx.beginPath();
      for (let i = 0; i <= N; i++) { const t = i / N; ctx[i ? 'lineTo' : 'moveTo'](tr.cx(t) - tr.hw(t) * k, tr.y(t)); }
      for (let i = N; i >= 0; i--) { const t = i / N; ctx.lineTo(tr.cx(t) + tr.hw(t) * k, tr.y(t)); }
      ctx.closePath();
    };
    trace(1.1); ctx.fillStyle = '#D2A468'; ctx.fill();
    const g = ctx.createLinearGradient(0, tr.finishY, 0, H);
    g.addColorStop(0, '#F8E8C2'); g.addColorStop(1, '#F1D9A2');
    trace(1); ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = 'rgba(176,120,64,0.28)';
    for (let k = 0; k < 18; k++) {
      const t = (k + 0.5) / 18, x = tr.cx(t) + (((k * 7) % 5) - 2) / 2.5 * tr.hw(t) * 0.7, s = (1 - t * 0.4) * u;
      ctx.beginPath(); ctx.ellipse(x, tr.y(t), 2.8 * s, 1.5 * s, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

