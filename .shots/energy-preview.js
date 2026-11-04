// 成长能量静态稿 · 蛋外观生成与数据（仅预览用，落地时再并入 menu.html）
let _uid = 0;
const BASE = '<ellipse cx="32" cy="37" rx="19" ry="23" fill="#FFE6A8" stroke="#E7A740" stroke-width="2.6"/><path d="M15 40 q6 5 10 0 t8 0 t8 0" fill="none" stroke="#F3C564" stroke-width="2.2" stroke-linecap="round"/><circle cx="25" cy="27" r="2.6" fill="#FFCF6B"/><circle cx="38" cy="31" r="2" fill="#FFCF6B"/><ellipse cx="24" cy="24" rx="4" ry="5.5" fill="#FFF6DC" opacity="0.85"/>';
const PAT = '<path d="M19.5 47l4-5 4 5 4-5 4 5 4-5 4 5" fill="none" stroke="#D99E42" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 53h20" stroke="#E9B24E" stroke-width="1.6" stroke-dasharray="1 4" stroke-linecap="round"/>';
const CHEEK = '<ellipse cx="20.5" cy="35.5" rx="3" ry="2" fill="#FF9A8A" opacity=".6"/><ellipse cx="43.5" cy="35.5" rx="3" ry="2" fill="#FF9A8A" opacity=".6"/>';
const STAR = (x, y, s, c) => '<path transform="translate(' + x + ' ' + y + ') scale(' + s + ')" d="M0-5L1.4-1.4 5 0 1.4 1.4 0 5-1.4 1.4-5 0-1.4-1.4Z" fill="' + (c || '#FFD23D') + '"/>';
const HALO = (o) => '<circle cx="32" cy="37" r="33" fill="url(#halo)" opacity="' + o + '"/>';
const ZZ = 'L17 29L23 36L29 29L35 36L41 29L47 36L54 30';
function eggSVG(s, cls) {
  const id = 'e' + (++_uid);
  const defs = '<defs><radialGradient id="halo"><stop offset="0" stop-color="#FFF3B0" stop-opacity=".95"/><stop offset="1" stop-color="#FFF3B0" stop-opacity="0"/></radialGradient></defs>';
  const body = BASE + (s >= 2 ? PAT : '') + (s >= 4 ? CHEEK : '');
  let g = '', pre = '', post = '';
  if (s >= 5) pre = HALO(s === 5 ? .55 : s === 6 ? .8 : 1);
  if (s === 1) { g = '<g transform="rotate(-7 32 56)">' + body + '</g>';
    post = '<path d="M7 36q-3 5 0 11M2 33q-4 8 0 17M57 36q3 5 0 11M62 33q4 8 0 17" fill="none" stroke="#E7A740" stroke-width="2" stroke-linecap="round" opacity=".8"/>'; }
  else if (s === 4) { g = '<g transform="rotate(6 32 56)">' + body + '</g>';
    post = '<path transform="translate(54 12)" d="M0 7C-6 3-7-1-4.5-2.5-2.5-3.7-.5-2.5 0-1 .5-2.5 2.5-3.7 4.5-2.5 7-1 6 3 0 7Z" fill="#FF8A9A" stroke="#E86477" stroke-width="1"/>'
      + '<path d="M7 30q-3 4 0 8M3 27q-4 7 0 14" fill="none" stroke="#E7A740" stroke-width="1.8" stroke-linecap="round" opacity=".7"/>'; }
  else if (s === 7) {
    const tp = 'M-10-10H80V30L54 30L47 36L41 29L35 36L29 29L23 36L17 29L10 35H-10Z', bt = 'M-10 35H10L17 29L23 36L29 29L35 36L41 29L47 36L54 30H80V80H-10Z';
    defs2 = '<clipPath id="t' + id + '"><path d="' + tp + '"/></clipPath><clipPath id="b' + id + '"><path d="' + bt + '"/></clipPath>';
    const line = '<path d="M10 35' + ZZ + '" fill="none" stroke="#8A531B" stroke-width="1.5" stroke-linejoin="round"/>';
    g = '<g clip-path="url(#b' + id + ')">' + body + '</g><path d="M10 35' + ZZ + '" fill="none" stroke="#FFF3B0" stroke-width="6" stroke-linejoin="round"/>' + line
      + '<g transform="translate(0 -5) rotate(-6 32 30)"><g clip-path="url(#t' + id + ')">' + body + '</g>' + line + '</g>';
    post = '<path d="M7 30l-5-3M6 38l-6 1M57 30l5-3M58 38l6 1M32 21v-8" fill="none" stroke="#FFD23D" stroke-width="2" stroke-linecap="round"/>';
    return '<svg class="' + (cls || 'egg') + '" viewBox="-8 -8 80 80" aria-hidden="true"><defs><radialGradient id="halo"><stop offset="0" stop-color="#FFF3B0" stop-opacity=".95"/><stop offset="1" stop-color="#FFF3B0" stop-opacity="0"/></radialGradient>' + defs2 + '</defs>' + pre + g + post + '</svg>';
  }
  else {
    g = body;
    if (s === 3) post = '<g transform="translate(49 11)"><path d="M-8-6h16a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-9l-4 4v-4h-3a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3z" fill="#fff" stroke="#E7A740" stroke-width="1.4"/><circle cx="-4" cy="0" r="1.3" fill="#E7A740"/><circle cx="0" cy="0" r="1.3" fill="#E7A740"/><circle cx="4" cy="0" r="1.3" fill="#E7A740"/></g>';
    if (s === 2) post = STAR(50, 20, 1.2) + STAR(14, 52, .8, '#FFE48A');
    if (s === 5) post = STAR(8, 17, 1.2) + STAR(57, 26, 1) + STAR(10, 53, .9, '#FFE48A') + STAR(55, 55, .7, '#FFE48A');
    if (s === 6) post = '<path d="M31 15l-3 6 5 4-4 6 5 4" fill="none" stroke="#FFF3B0" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M31 15l-3 6 5 4-4 6 5 4" fill="none" stroke="#8A531B" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' + STAR(8, 17, 1) + STAR(57, 26, .9);
  }
  return '<svg class="' + (cls || 'egg') + '" viewBox="-8 -8 80 80" aria-hidden="true">' + defs + pre + g + post + '</svg>';
}
let defs2 = '';
const STAGES = [
  { n: '暖窝里的萌蛋', d: 1, e: 0, g: null, fx: '萌蛋住进暖窝，等你来陪它' },
  { n: '轻轻的回应', d: 7, e: 5, g: ['p-bunny', '小兔 · 柔软窝垫'], fx: '躺上窝垫，轻轻晃一晃回应你' },
  { n: '闪亮的新花纹', d: 21, e: 15, g: ['p-squirrel', '小松鼠 · 收纳小篮'], fx: '篮里的彩珠，在蛋壳上画出新花纹' },
  { n: '蛋里的悄悄话', d: 35, e: 25, g: null, fx: '蛋里传出第一声悄悄话' },
  { n: '认识你的声音', d: 50, e: 35, g: ['p-bird', '小鸟 · 音符挂饰'], fx: '听见熟悉的歌，脸蛋红扑扑' },
  { n: '朋友们的期待', d: 65, e: 45, g: ['p-deer', '小鹿 · 旅行背包'], fx: '朋友们都来了，蛋壳闪着光' },
  { n: '小小的裂纹', d: 80, e: 55, g: ['p-turtle', '小海龟 · 贝壳挂饰'], fx: '海风吹过，蛋壳裂开一道缝' },
  { n: '准备好见面啦', d: 90, e: 60, g: ['p-hedgehog', '小刺猬 · 欢迎小灯'], fx: '欢迎灯亮起，等你说“出来吧”' },
];
function barHTML(energy, nextIdx, withNums) {
  const marks = STAGES.slice(1).map((s, i) => {
    const k = i + 1, cls = energy >= s.e ? 'got' : (k === nextIdx ? 'nx' : '');
    return '<span class="en-mark ' + cls + '" style="left:' + (s.e / 60 * 100) + '%">' + (withNums ? '<i>' + s.e + '</i>' : '') + '</span>';
  }).join('');
  return '<div class="en-bar" role="progressbar" aria-valuemin="0" aria-valuemax="60" aria-valuenow="' + energy + '"><div class="en-fill" style="width:' + (energy / 60 * 100) + '%"></div>' + marks + '</div>';
}
async function loadSprites() {
  const keep = new Set(['pet-egg', 'chest-closed', 'chest-open', 'i-coin', 'i-star', 'i-bolt', 'i-trophy', 'i-play', 'i-refresh', 'i-back', 'p-bunny', 'p-squirrel', 'p-bird', 'p-deer', 'p-turtle', 'p-hedgehog']);
  let out = '', basket = '';
  for (const f of ['/index.html', '/menu.html']) {
    const doc = new DOMParser().parseFromString(await (await fetch(f)).text(), 'text/html');
    doc.querySelectorAll('symbol').forEach(s => { if (keep.has(s.id)) { keep.delete(s.id); out += s.outerHTML; } });
    if (!basket) { const b = doc.querySelector('.nest-basket'); if (b) basket = b.outerHTML; }
  }
  document.getElementById('sprites').innerHTML = out;
  window.BASKET = basket;
  window.MISSING = [...keep];
}
