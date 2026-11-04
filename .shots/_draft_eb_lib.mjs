// 「蛋互动加强 + 开场看懂 + 结算蛋参与」静态稿共用：往真实游戏页上叠一层“冻结帧”草稿，不改产品代码。
export const SEED = `(() => {
  const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return MG_PET.dayKey(x); };
  const p = { version: 2, adopted: true, exp: 0, stage: 0, adoptedDay: d(-22), lastDay: d(0), xp: 20,
    days: Array.from({ length: 4 }, (_, i) => d(-4 + i)), phase: 0, daily: { date: d(0), correct: 0, rounds: [] }, gifts: [], decor: 'leaf', decors: ['leaf'],
    name: '数宝', hatchDay: '', birthSeen: false, affection: 0, stories: { seen: [], pending: [] } };
  ['mathgamePet', 'mathgameStars', 'mathgameCoins'].forEach(k => localStorage.removeItem(k));
  try { _mgPendingSnap = null; } catch (e) {}
  localStorage.setItem('mathgamePet', JSON.stringify(p));
  return true; })()`;

export const CSS = `
.eb-abs{position:fixed;pointer-events:none;z-index:495}
.eb-ring{border-radius:50%;border:5px solid rgba(255,205,60,.9);box-sizing:border-box}
.eb-spark{background:#FFE680;clip-path:polygon(50% 0,60% 40%,100% 50%,60% 60%,50% 100%,40% 60%,0 50%,40% 40%)}
.eb-halo{border-radius:50%;background:radial-gradient(circle,rgba(255,226,140,.95) 0,rgba(255,226,140,0) 68%)}
.eb-disc{border-radius:50%;background:radial-gradient(circle,rgba(255,176,64,.62) 0,rgba(255,176,64,.3) 52%,rgba(255,176,64,0) 70%)}
.eb-rays{border-radius:50%;background:repeating-conic-gradient(from 0deg,rgba(255,226,140,.6) 0 9deg,rgba(255,226,140,0) 9deg 20deg);
  -webkit-mask:radial-gradient(circle,#000 18%,transparent 68%);mask:radial-gradient(circle,#000 18%,transparent 68%)}
.eb-plus{display:flex;align-items:center;gap:4px;padding:3px 13px 3px 6px;border-radius:999px;background:#fff;border:3px solid #FF9B3D;color:#D9560B;
  font-weight:900;font-size:20px;line-height:24px;box-shadow:0 4px 0 rgba(160,90,0,.3);white-space:nowrap}
.eb-plus .mat-art{width:26px;height:26px;display:block}
.eb-word{padding:1px 14px;border-radius:999px;background:#fff;border:3px solid #E7A740;color:#8A531B;font-weight:900;font-size:24px;line-height:30px;white-space:nowrap}
.eb-note{display:flex;align-items:center;gap:6px;padding:2px 12px;border-radius:999px;background:rgba(92,51,16,.82);color:#FFF3C4;font-weight:800;font-size:13px;line-height:20px;white-space:nowrap}
.eb-fly{width:46px;height:46px}.eb-fly svg{width:100%;height:100%;display:block}
.eb-bigegg svg{width:100%;height:100%;display:block;overflow:visible}
.eb-star{width:34px;height:34px}.eb-star svg{width:100%;height:100%;display:block}
.eb-tag{position:fixed;left:8px;top:8px;z-index:700;padding:3px 10px;border-radius:8px;background:rgba(0,0,0,.72);color:#fff;font:700 13px/18px system-ui,sans-serif;pointer-events:none}
`;

// 页面侧小工具：window.__eb
export const HELPERS = `(() => {
  if (window.__eb) return true;
  const st = document.createElement('style'); st.textContent = ${JSON.stringify(CSS)}; document.head.appendChild(st);
  const E = window.__eb = {};
  E.rect = (sel) => { const n = document.querySelector(sel); if (!n) return null; const r = n.getBoundingClientRect(); return r.width ? r : null; };
  E.add = (cls, css, html) => { const d = document.createElement('div'); d.className = 'eb-abs ' + cls; d.style.cssText = css; d.innerHTML = html || ''; document.body.appendChild(d); return d; };
  E.box = (cx, cy, w, h) => 'left:' + Math.round(cx - w / 2) + 'px;top:' + Math.round(cy - h / 2) + 'px;width:' + w + 'px;height:' + h + 'px;';
  E.mat = (lv) => MG_PET_STORY.matArt(lv);
  E.sparks = (cx, cy, rad, n, size, rot) => { for (let i = 0; i < n; i++) { const a = rot + i / n * Math.PI * 2, r = rad * (0.85 + (i % 3) * 0.18), s = size * (0.7 + (i % 4) * 0.22);
    E.add('eb-spark', E.box(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.85, s, s) + 'transform:rotate(' + (i * 23) + 'deg);'); } };
  E.trail = (fx, fy, tx, ty, t, lv, big) => {
    const lift = Math.min(90, 40 + Math.abs(tx - fx) * 0.12), q = (u) => ({ x: fx + (tx - fx) * u, y: fy + (ty - fy) * u - Math.sin(u * Math.PI) * lift * 1.6 });
    for (let k = 7; k >= 1; k--) { const p = q(Math.max(0, t - k * 0.055)), s = 6 + (8 - k) * 1.7; E.add('eb-spark', E.box(p.x, p.y, s, s) + 'opacity:' + (0.25 + (8 - k) * 0.09).toFixed(2) + ';transform:rotate(' + k * 30 + 'deg);'); }
    const p = q(t); E.add('eb-fly', E.box(p.x, p.y, big, big) + 'transform:rotate(40deg);', E.mat(lv)); return p;
  };
  E.star = (cx, cy, s, rot, op) => E.add('eb-star', E.box(cx, cy, s, s) + 'transform:rotate(' + rot + 'deg);opacity:' + (op == null ? 1 : op) + ';',
    '<svg viewBox="-12 -12 24 24"><path d="M0-11L3.2-3.6 11-3.4 4.9 1.5 7 9.2 0 4.8-7 9.2-4.9 1.5-11-3.4-3.2-3.6Z" fill="#FFC63D" stroke="#B86E00" stroke-width="1.6" stroke-linejoin="round"/></svg>');
  E.hand = (cx, cy, w, rot) => E.add('eb-hand', E.box(cx, cy, w, w * 1.2) + 'transform:rotate(' + (rot || 0) + 'deg);',
    '<svg viewBox="0 0 40 48" width="100%" height="100%" style="display:block;overflow:visible"><g fill="#fff" stroke="#C9792E" stroke-width="2.4" stroke-linejoin="round">'
    + '<rect x="14" y="2" width="9" height="28" rx="4.5"/><rect x="8" y="22" width="27" height="23" rx="9"/>'
    + '<rect x="24" y="19" width="7" height="14" rx="3.5" transform="rotate(8 27 26)"/><rect x="2" y="26" width="11" height="14" rx="5.5" transform="rotate(-22 7 33)"/></g>'
    + '<path d="M13 31v7M20 31v7M27 31v7" stroke="#E9C79B" stroke-width="2" stroke-linecap="round" fill="none" transform="translate(0 2)"/></svg>');
  E.tag = (t) => { const d = document.createElement('div'); d.className = 'eb-tag'; d.textContent = t; document.body.appendChild(d); };
  E.anchor = () => { for (const s of ['#canvas-wrapper', '.mg-listen-card', '#answer-section']) { const r = E.rect(s); if (r && r.width > 120) return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; } return { x: innerWidth / 2, y: innerHeight * 0.62 }; };
  E.freeze = () => document.getAnimations().forEach(a => { try { a.pause(); } catch (e) {} });
  return true; })()`;
