// 只读：量真机上 #petModal 当前几何（不改存档、不开关弹窗）。
const info = await (await fetch('http://localhost:9222/json')).json();
const ws = new WebSocket(info.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); const p = pend.get(m.id); if (p) { pend.delete(m.id); p(m.result); } };
const ev = expression => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: 'Runtime.evaluate', params: { expression, returnByValue: true } })); });
const r = await ev(`(() => { const q = s => document.querySelector(s), R = e => { if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; };
  const card = q('#petModal .pet-card'), lay = q('#petModal .pet-layout'), jr = q('#petModal .pet-journal'), pn = [...document.querySelectorAll('#petModal .pet-panel')].find(p => !p.hidden), ft = q('#petModal .pet-footer');
  const cs = e => e ? getComputedStyle(e) : {};
  return { ua: navigator.userAgent.match(/Chrome\\/[\\d.]+/)[0], vw: innerWidth, vh: innerHeight, dpr: devicePixelRatio, shown: q('#petModal').classList.contains('show'), zoom: cs(document.body).zoom, fs: cs(document.body).fontSize,
    card: R(card), cardScroll: card ? [card.scrollTop, card.scrollHeight, card.clientHeight] : null, lay: R(lay), jr: R(jr), jrContain: cs(jr).contain, jrMin: cs(jr).minHeight, jrMax: cs(jr).maxHeight,
    pn: R(pn), pnScroll: pn ? [pn.scrollTop, pn.scrollHeight, pn.clientHeight] : null, ft: R(ft), ftPos: cs(ft).position, cardOverflow: cs(card).overflowY, cardMax: cs(card).maxHeight }; })()`);
console.log(JSON.stringify(r.result.value));
ws.close();
