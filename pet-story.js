/* 礼物的短故事与成长能量的共用件：两页共用插画、萌蛋 8 种外观、能量条与回看；不调用原生语音，也不改变成长进度。 */
(function (root) {
  'use strict';
  const FRIENDS = ['', '小兔', '小松鼠', '小鸟', '小鹿', '小海龟', '小刺猬'];
  const SYMS = ['', 'p-bunny', 'p-squirrel', 'p-bird', 'p-deer', 'p-turtle', 'p-hedgehog'];
  const PATHS = [
    '', '<path d="M2 11Q3 5 12 6Q22 5 22 11V18Q12 23 2 18Z" fill="#F3CA8A" stroke="#BA8755"/><path d="M5 12Q12 9 19 12M5 17H19" fill="none" stroke="#D89D68"/><path d="M7 7L8 10M17 7L16 10" stroke="#FFF0CE"/>',
    '<path d="M3 10H21L18 22H6Z" fill="#DDB781" stroke="#A77B4C"/><path d="M7 10V7A5 5 0 0117 7V10M5 14H19M7 18H17M9 11V21M15 11V21" fill="none" stroke="#A77B4C"/><path d="M8 9L6 6L10 4L13 9" fill="#ADD0A1"/>',
    '<path d="M12 0V4M10 17V6L20 4V15" fill="none" stroke="#CE9652" stroke-width="2"/><circle cx="7" cy="18" r="4" fill="#EAA860"/><circle cx="17" cy="16" r="4" fill="#EAA860"/><path d="M3 4L4 7L7 8L4 9L3 12L2 9L0 8L2 7Z" fill="#F3CD74"/>',
    '<path d="M5 11Q0 12 3 20M19 11Q24 12 21 20" fill="none" stroke="#7F9B62" stroke-width="2"/><rect x="5" y="6" width="14" height="17" rx="4" fill="#9CBC79" stroke="#668C51"/><path d="M9 7V3H15V7" fill="none" stroke="#668C51" stroke-width="2"/><rect x="8" y="14" width="8" height="6" rx="2" fill="#D7DBA4"/><path d="M10 8H14V12H10Z" fill="#EBC68B"/>',
    '<path d="M12 23V19M12 19Q0 12 3 6Q7 0 12 4Q17 0 21 6Q24 13 12 19Z" fill="#F1C0A7" stroke="#C58D73"/><path d="M12 6V18M6 7L11 18M18 7L13 18" stroke="#C58D73" fill="none"/><path d="M12 1V3" stroke="#A77B4C"/>',
    '<path d="M9 3V1H15V3M12 16V22M7 22H17" fill="none" stroke="#B38B51" stroke-width="2"/><path d="M8 4H16L21 16H3Z" fill="#F5D69E" stroke="#B38B51"/><path d="M12 7V13" stroke="#FFF7D9" stroke-width="2"/>',
    '<path d="M3 9.5L15 4.5V19.5L3 14.5Z" fill="#F3C96C" stroke="#B38B51" stroke-linejoin="round"/><rect x="2" y="9" width="3" height="6" rx="1.5" fill="#E9A860" stroke="#B38B51"/><path d="M17.5 8.5Q19.5 12 17.5 15.5M20 6.5Q22.5 12 20 17.5" fill="none" stroke="#C99A52" stroke-width="1.5" stroke-linecap="round"/>'
  ];
  // 每关通关送来的「材料」小图（24 视窗）：暖草 / 松果 / 小音符 / 落叶 / 小贝壳 / 萤火。
  const MAT_PATHS = [
    '',
    '<path d="M12 22Q10 13 5 5Q13 8 14 17Z" fill="#9CBC79" stroke="#668C51" stroke-linejoin="round"/><path d="M12 22Q14 12 20 6Q20 16 12 22Z" fill="#B7D492" stroke="#668C51" stroke-linejoin="round"/><path d="M8 21.5H16" stroke="#C99A52" stroke-width="2" stroke-linecap="round"/>',
    '<path d="M12 3C7 3 5 9 6 14C7 19 10 22 12 22C14 22 17 19 18 14C19 9 17 3 12 3Z" fill="#C99A62" stroke="#8A5E32"/><path d="M7 9L12 12L17 9M6.5 13L12 16.5L17.5 13M8.5 17.5L12 20L15.5 17.5" fill="none" stroke="#8A5E32"/><path d="M12 3V1" stroke="#668C51" stroke-width="2" stroke-linecap="round"/>',
    '<path d="M9 18V5L19 3V16" fill="none" stroke="#CE9652" stroke-width="2" stroke-linejoin="round"/><ellipse cx="7" cy="18.5" rx="3.6" ry="3" fill="#EAA860" stroke="#B87A3A"/><ellipse cx="17" cy="16.5" rx="3.6" ry="3" fill="#EAA860" stroke="#B87A3A"/>',
    '<path d="M12 22C4 18 2 10 5 4C12 4 20 8 20 15C20 18 17 21 12 22Z" fill="#F0A25A" stroke="#B8682E" stroke-linejoin="round"/><path d="M5 5C9 10 12 15 12 22M12 14L17 12M10 10L14 8" fill="none" stroke="#B8682E" stroke-linecap="round"/>',
    '<path d="M12 21L3 12C3 6 7 3 12 3S21 6 21 12Z" fill="#F7C9AE" stroke="#C58D73" stroke-linejoin="round"/><path d="M12 21V4M12 21L7 5M12 21L17 5M12 21L4 9M12 21L20 9" fill="none" stroke="#C58D73"/><path d="M8 22H16" stroke="#C58D73" stroke-width="2" stroke-linecap="round"/>',
    '<circle cx="12" cy="12" r="9" fill="#FFE48A" opacity=".45"/><circle cx="12" cy="12" r="4.5" fill="#F5C842" stroke="#D4A12A"/><path d="M12 1.5V4M12 20V22.5M1.5 12H4M20 12H22.5M4.5 4.5L6.3 6.3M17.7 17.7L19.5 19.5M19.5 4.5L17.7 6.3M6.3 17.7L4.5 19.5" stroke="#E9B24E" stroke-linecap="round"/>'
  ];
  const STAR5 = 'M0-4L1-1.38 3.8-1.24 1.62.53 2.35 3.24 0 1.7-2.35 3.24-1.62.53-3.8-1.24-1-1.38Z';
  let current = null, previousFocus = null, audio = null, eggUid = 0;
  function giftArt(level) { return '<svg viewBox="0 0 24 24"' + (level === 1 ? ' preserveAspectRatio="none"' : '') + ' aria-hidden="true">' + (PATHS[level] || '') + '</svg>'; }
  function matArt(level) { return '<svg class="mat-art" viewBox="0 0 24 24" aria-hidden="true">' + (MAT_PATHS[level] || '') + '</svg>'; }
  // 礼物升级星：n 颗金星；all 为真时画满三格，没升到的画成浅色。
  function tierStars(n, all) {
    n = Math.max(0, Math.min(3, Math.floor(Number(n)) || 0));
    if (!n && !all) return '';
    let g = '';
    for (let i = 0; i < 3; i++) {
      if (i >= n && !all) break;
      g += '<path transform="translate(' + (5 + i * 10) + ' 5)" d="' + STAR5 + '" fill="' + (i < n ? '#F3C255' : '#E7DDC6') + '"/>';
    }
    return '<svg class="tier-stars" viewBox="0 0 30 10" aria-hidden="true">' + g + '</svg>';
  }
  // 萌蛋的 8 种外观（下标 = 成长阶段）；渐变与裁剪路径的 id 每次生成都唯一，同页可以放多只蛋。
  const EGG_BASE = '<ellipse cx="32" cy="37" rx="19" ry="23" fill="#FFE6A8" stroke="#E7A740" stroke-width="2.6"/><path d="M15 40 q6 5 10 0 t8 0 t8 0" fill="none" stroke="#F3C564" stroke-width="2.2" stroke-linecap="round"/><circle cx="25" cy="27" r="2.6" fill="#FFCF6B"/><circle cx="38" cy="31" r="2" fill="#FFCF6B"/><ellipse cx="24" cy="24" rx="4" ry="5.5" fill="#FFF6DC" opacity="0.85"/>';
  const EGG_PAT = '<path d="M19.5 47l4-5 4 5 4-5 4 5 4-5 4 5" fill="none" stroke="#D99E42" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 53h20" stroke="#E9B24E" stroke-width="1.6" stroke-dasharray="1 4" stroke-linecap="round"/>';
  const EGG_CHEEK = '<ellipse cx="20.5" cy="35.5" rx="3" ry="2" fill="#FF9A8A" opacity=".6"/><ellipse cx="43.5" cy="35.5" rx="3" ry="2" fill="#FF9A8A" opacity=".6"/>';
  const EGG_ZZ = 'L17 29L23 36L29 29L35 36L41 29L47 36L54 30';
  const eggStar = (x, y, s, c) => '<path transform="translate(' + x + ' ' + y + ') scale(' + s + ')" d="M0-5L1.4-1.4 5 0 1.4 1.4 0 5-1.4 1.4-5 0-1.4-1.4Z" fill="' + (c || '#FFD23D') + '"/>';
  function eggInner(s) {
    s = Math.max(0, Math.min(7, Math.floor(Number(s)) || 0));
    const id = 'eg' + (++eggUid), body = EGG_BASE + (s >= 2 ? EGG_PAT : '') + (s >= 4 ? EGG_CHEEK : '');
    let defs = '', pre = '', g = body, post = '';
    if (s >= 5) {
      defs = '<radialGradient id="h' + id + '"><stop offset="0" stop-color="#FFF3B0" stop-opacity="1"/><stop offset=".55" stop-color="#FFE680" stop-opacity=".7"/><stop offset="1" stop-color="#FFE680" stop-opacity="0"/></radialGradient>';
      pre = '<circle class="eg-halo" cx="32" cy="37" r="' + (s === 5 ? 32 : s === 6 ? 34 : 35) + '" fill="url(#h' + id + ')" opacity="' + (s === 5 ? .75 : .95) + '"/>';
    }
    if (s === 1) {
      g = '<g transform="rotate(-10 32 56)">' + body + '</g>';
      post = '<path d="M6 34q-4 6 0 13M0 30q-6 11 0 21M58 34q4 6 0 13M64 30q6 11 0 21" fill="none" stroke="#E7A740" stroke-width="3" stroke-linecap="round"/>';
    } else if (s === 2) post = eggStar(50, 18, 2) + eggStar(12, 52, 1.4, '#FFE48A') + eggStar(56, 46, 1);
    else if (s === 3) post = '<g transform="translate(48 5) scale(1.45)"><path d="M-8-6h16a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-9l-4 4v-4h-3a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3z" fill="#fff" stroke="#E7A740" stroke-width="1.5"/><circle cx="-4" cy="0" r="1.5" fill="#E7A740"/><circle cx="0" cy="0" r="1.5" fill="#E7A740"/><circle cx="4" cy="0" r="1.5" fill="#E7A740"/></g>';
    else if (s === 4) {
      g = '<g transform="rotate(9 32 56)">' + body + '</g>';
      const heart = 'M0 7C-6 3-7-1-4.5-2.5-2.5-3.7-.5-2.5 0-1 .5-2.5 2.5-3.7 4.5-2.5 7-1 6 3 0 7Z';
      post = '<path transform="translate(55 8) scale(2)" d="' + heart + '" fill="#FF8A9A" stroke="#E86477" stroke-width="1"/><path transform="translate(9 24) scale(1.2)" d="' + heart + '" fill="#FFB3BD" stroke="#E86477" stroke-width="1"/><path d="M5 38q-4 5 0 10M0 34q-6 11 0 20" fill="none" stroke="#E7A740" stroke-width="2.6" stroke-linecap="round"/>';
    } else if (s === 5) {
      g = body + '<ellipse cx="32" cy="37" rx="22.5" ry="26.5" fill="none" stroke="#FFD23D" stroke-width="3.4" opacity=".8"/>';
      post = eggStar(7, 16, 1.9) + eggStar(58, 24, 1.6) + eggStar(9, 54, 1.3, '#FFE48A') + eggStar(56, 56, 1.1, '#FFE48A') + eggStar(32, 2, 1.2, '#FFE48A');
    } else if (s === 6) {
      const main = 'M30 14l-4 8 7 5-6 8 7 5-4 7', side = 'M26 22l-8 2-4 6M33 27l8-2 3-5M27 35l-9 3';
      const cr = (d, a, b) => '<path d="' + d + '" fill="none" stroke="#FFF3B0" stroke-width="' + a + '" stroke-linecap="round" stroke-linejoin="round"/><path d="' + d + '" fill="none" stroke="#7A4414" stroke-width="' + b + '" stroke-linecap="round" stroke-linejoin="round"/>';
      g = '<g transform="rotate(-5 32 56)">' + body + cr(main, 7.5, 2.6) + cr(side, 5, 1.9) + '</g>';
      post = '<path d="M46 9l5-4 1 6zM16 10l-5 2 3 5z" fill="#FFE6A8" stroke="#E7A740" stroke-width="1.4" stroke-linejoin="round"/>' + eggStar(6, 20, 1.6) + eggStar(59, 30, 1.4) + eggStar(8, 54, 1.1, '#FFE48A') + eggStar(57, 56, 1.2, '#FFE48A');
    } else if (s === 7) {
      const tp = 'M-10-10H80V30L54 30L47 36L41 29L35 36L29 29L23 36L17 29L10 35H-10Z', bt = 'M-10 35H10L17 29L23 36L29 29L35 36L41 29L47 36L54 30H80V80H-10Z';
      const line = '<path d="M10 35' + EGG_ZZ + '" fill="none" stroke="#7A4414" stroke-width="2" stroke-linejoin="round"/>';
      defs += '<clipPath id="t' + id + '"><path d="' + tp + '"/></clipPath><clipPath id="b' + id + '"><path d="' + bt + '"/></clipPath><radialGradient id="l' + id + '"><stop offset="0" stop-color="#FFFDE8"/><stop offset=".6" stop-color="#FFF3B0" stop-opacity=".9"/><stop offset="1" stop-color="#FFE680" stop-opacity="0"/></radialGradient>';
      const rays = '<path d="M9 27L-2 22M8 33L-3 35M55 27L66 22M56 33L67 35M13 22L4 13M51 20L60 11" fill="none" stroke="#FFD23D" stroke-width="3.2" stroke-linecap="round"/>';
      g = rays + '<g clip-path="url(#b' + id + ')">' + body + '</g><ellipse cx="34" cy="27" rx="22" ry="11" fill="url(#l' + id + ')"/><path d="M10 35' + EGG_ZZ + '" fill="none" stroke="#FFF3B0" stroke-width="7" stroke-linejoin="round" opacity=".8"/>' + line
        + '<g class="eg-lid"><g transform="translate(-1 -11) rotate(-11 32 30)"><g clip-path="url(#t' + id + ')">' + body + '</g>' + line + '</g></g>';
      post = '<path d="M58 14l4 2-3 4zM6 12l-4 3 3 3z" fill="#FFE6A8" stroke="#E7A740" stroke-width="1.4" stroke-linejoin="round"/>' + eggStar(6, 5, 1.6) + eggStar(59, 4, 1.4) + eggStar(63, 40, 1.2) + eggStar(1, 44, 1.1, '#FFE48A');
    }
    return (defs ? '<defs>' + defs + '</defs>' : '') + pre + g + post;
  }
  function egg(s, cls) { return '<svg class="' + (cls || 'egg') + '" viewBox="-8 -8 80 80" aria-hidden="true">' + eggInner(s) + '</svg>'; }
  // 成长能量条：满 900 点、7 个阶段刻度；刻度状态跟随真实阶段（已达成 / 下一站），不单看能量数。
  function energyBar(g, withNums) {
    const nx = g.next ? g.next.index : -1;
    const marks = root.MG_PET.phases.slice(1).map((x, i) => {
      const k = i + 1, cls = g.hatched || g.phase >= k ? 'got' : (k === nx ? 'nx' : '');
      return '<span class="en-mark ' + cls + '" style="left:' + (x.at / g.max * 100) + '%">' + (withNums ? '<i>' + x.at + '</i>' : '') + '</span>';
    }).join('');
    return '<div class="en-bar" role="progressbar" aria-label="成长能量" aria-valuemin="0" aria-valuemax="' + g.max + '" aria-valuenow="' + g.energy + '"><div class="en-fill" style="width:' + (g.energy / g.max * 100) + '%"></div>' + marks + '</div>';
  }
  // 小窝成长小路：上排 7 颗里程碑小蛋（各占一种彩虹色圈），下面一条彩虹能量条，已走过的段落是饱和色、没走到的是淡色；已到的蛋实心圈、下一颗带光圈、没到的虚线圈。不放数字，读屏看 aria-label。
  function energyPath(g) {
    const ph = root.MG_PET.phases, n = ph.length - 1, nx = g.next ? g.next.index : -1;
    let j = 0;
    while (j < n && g.energy >= ph[j + 1].at) j++;
    const cx = k => k ? (k - .5) / n * 100 : 0;
    const w = j >= n ? cx(n) : cx(j) + (g.energy - ph[j].at) / (ph[j + 1].at - ph[j].at) * (cx(j + 1) - cx(j));
    const cls = k => g.hatched || g.phase >= k ? 'got' : (k === nx ? 'nx' : 'far');
    const stops = ph.slice(1).map((x, i) => '<span class="en-stop ' + cls(i + 1) + '"><b>' + egg(i + 1) + '</b></span>').join('');
    const ticks = ph.slice(1).map((x, i) => '<s class="en-tk ' + cls(i + 1) + '" style="left:' + cx(i + 1).toFixed(2) + '%"></s>').join('');
    const say = !g.adopted ? '领养萌蛋，答对题让它长大' : g.hatched ? '见面啦！一起学了 ' + g.studyDays + ' 天' : g.ready ? '出生的时刻到啦！' : (g.next ? '下一站：' + g.next.name : '快要出生啦');
    return '<div class="en-path' + (g.ready ? ' ready' : '') + '" role="progressbar" aria-label="成长能量，' + say + '" aria-valuemin="0" aria-valuemax="' + g.max + '" aria-valuenow="' + g.energy + '"><div class="en-stops">' + stops
      + '</div><div class="en-trk"><span class="en-fill" style="width:' + w.toFixed(1) + '%;background-size:' + Math.round(10000 / Math.max(w, 1)) + '% 100%"></span>' + ticks + '<i class="orb en-tip" style="left:' + w.toFixed(1) + '%"></i></div></div>';
  }
  // 小窝摆件插画：地面件 24×24 视窗，挂饰 300×40 横幅；id 与 MG_PET.items 一一对应。
  const ITEM_G = s => '<g stroke-linejoin="round" stroke-linecap="round" stroke-width="1">' + s + '</g>';
  const PETAL = k => '<ellipse cx="12" cy="3.8" rx="1.7" ry="2.8" transform="rotate(' + k * 45 + ' 12 8)" fill="#F6C945" stroke="#D49B26"/>';
  const BLADE = (k, fill, stroke) => '<path d="M12 8L12 1.8L17 5.8Z" transform="rotate(' + k * 90 + ' 12 8)" fill="' + fill + '" stroke="' + stroke + '"/>';
  const PROP_ART = {
    sunflower: '<path d="M12 11V17" stroke="#668C51" stroke-width="1.8"/><path d="M12 16Q8 16 6.8 13Q11 13 12 15.5Z" fill="#9CBC79" stroke="#668C51"/>'
      + [0, 1, 2, 3, 4, 5, 6, 7].map(PETAL).join('') + '<circle cx="12" cy="8" r="2.7" fill="#8A5E32" stroke="#6B4423"/>'
      + '<path d="M7 17.5H17L16 23H8Z" fill="#E59A6C" stroke="#B8682E"/><rect x="6.2" y="16.2" width="11.6" height="2.2" rx="1" fill="#EDAA7E" stroke="#B8682E"/>',
    books: '<rect x="3" y="17" width="18" height="5" rx="1" fill="#E9A08A" stroke="#B5675A"/><rect x="5" y="12.4" width="15" height="4.6" rx="1" fill="#8FC1C9" stroke="#5A8F99"/>'
      + '<rect x="4" y="8" width="14" height="4.4" rx="1" fill="#F3CD74" stroke="#C79A3A"/><path d="M6 19.5H19M7.5 14.7H18M6.5 10.2H16" stroke="#FFF3D6"/>'
      + '<path d="M11 8V5" stroke="#668C51" stroke-width="1.4"/><path d="M11 5Q8 4.4 7.4 2Q10.4 2 11 5Z" fill="#9CBC79" stroke="#668C51"/><path d="M11 5Q14 4.6 15 2.4Q12 2.2 11 5Z" fill="#B7D492" stroke="#668C51"/>',
    pumpkin: '<path d="M12 6.5Q9 5 5.6 7.6Q2.6 10.6 3.6 16Q5 21.6 12 21.6Q19 21.6 20.4 16Q21.4 10.6 18.4 7.6Q15 5 12 6.5Z" fill="#F4A64C" stroke="#BE6F20"/>'
      + '<path d="M12 6.8Q9 10 9.6 21.2M12 6.8Q15 10 14.4 21.2" fill="none" stroke="#D98530"/><path d="M12 6.5V3.6Q13 2.2 14.6 2.6" stroke="#668C51" stroke-width="1.7" fill="none"/>'
      + '<path d="M14.6 5.2Q17.6 3.6 18.6 5.6Q16.6 6.6 14.6 5.2Z" fill="#9CBC79" stroke="#668C51"/>',
    fountain: '<path d="M2.5 16.5H21.5Q21 21.8 12 21.8Q3 21.8 2.5 16.5Z" fill="#DCD2BF" stroke="#8F7E63"/><ellipse cx="12" cy="16.5" rx="9.5" ry="1.7" fill="#BFE3EE" stroke="#8F7E63"/>'
      + '<path d="M10.5 16V10H13.5V16Z" fill="#DCD2BF" stroke="#8F7E63"/><path d="M7 9.4H17Q16.4 12.4 12 12.4Q7.6 12.4 7 9.4Z" fill="#E8DFCE" stroke="#8F7E63"/>'
      + '<path d="M12 9V3.6M12 3.6Q9.4 3.6 8.4 7M12 3.6Q14.6 3.6 15.6 7" stroke="#79BCD6" stroke-width="1.5" fill="none"/><circle cx="7.6" cy="9" r=".9" fill="#79BCD6" stroke="none"/><circle cx="16.4" cy="9" r=".9" fill="#79BCD6" stroke="none"/>',
    mushroom: '<path d="M9.4 13.6H14.6L15.2 21H8.8Z" fill="#FFF3D6" stroke="#C8A877"/><path d="M2.6 14Q2 5 12 4Q22 5 21.4 14Q12 16 2.6 14Z" fill="#E8695B" stroke="#B0453A"/>'
      + '<circle cx="8" cy="9.6" r="1.7" fill="#FFF3D6" stroke="none"/><circle cx="13.6" cy="7.6" r="1.4" fill="#FFF3D6" stroke="none"/><circle cx="17.6" cy="11.6" r="1.5" fill="#FFF3D6" stroke="none"/><path d="M4.5 21.6H19.5" stroke="#9CBC79" stroke-width="1.8"/>',
    pinwheel: '<path d="M12 9V22" stroke="#B38B51" stroke-width="1.9"/>' + BLADE(0, '#F08A6A', '#B8523A') + BLADE(1, '#F6CF5C', '#C79A3A') + BLADE(2, '#7EC4C4', '#4C8F8F') + BLADE(3, '#F2A4BF', '#BC6F8C')
      + '<circle cx="12" cy="8" r="1.3" fill="#FFF3D6" stroke="#B38B51"/>',
    mailbox: '<path d="M11 12.6H13V22H11Z" fill="#C9A06A" stroke="#8A5E32"/><path d="M4.5 12.8V8.6Q4.5 3.6 10 3.6H13Q18.5 3.6 18.5 8.6V12.8Z" fill="#8FC1C9" stroke="#5A8F99"/>'
      + '<path d="M15 4.2V12.8" stroke="#5A8F99"/><path d="M18.5 5V10" stroke="#B0453A"/><path d="M18.5 5.4H22V8.4H18.5Z" fill="#E8695B" stroke="#B0453A"/>'
      + '<path d="M7.4 8.6Q7.4 7.2 8.6 7.2Q9.4 7.2 9.6 8Q9.8 7.2 10.6 7.2Q11.8 7.2 11.8 8.6Q11.8 9.8 9.6 11Q7.4 9.8 7.4 8.6Z" fill="#FFF3D6" stroke="none"/><path d="M7 22H17" stroke="#9CBC79" stroke-width="1.8"/>',
    tent: '<path d="M2.5 21.6L12 4L21.5 21.6Z" fill="#FFF3D6"/><path d="M12 4L2.5 21.6H7.6Z" fill="#F08A6A"/><path d="M12 4L21.5 21.6H16.4Z" fill="#F08A6A"/>'
      + '<path d="M12 12.4L9.2 21.6H14.8Z" fill="#6E4F3A"/><path d="M2.5 21.6L12 4L21.5 21.6Z" fill="none" stroke="#B8682E"/><path d="M12 4V1.4L15 2.6L12 3.8" fill="#F6CF5C" stroke="#C79A3A"/>',
    wishstar: '<path d="M11 16V19.2H13V16Z" fill="#A57A47" stroke="#6B4423"/><path d="M7.4 22.2H16.6L15.4 19H8.6Z" fill="#C9A06A" stroke="#6B4423"/>'
      + '<path d="M12 1.5L14.12 7.09L20.08 7.37L15.42 11.11L17 16.88L12 13.6L7 16.88L8.58 11.11L3.92 7.37L9.88 7.09Z" fill="#F6C945" stroke="#D49B26"/>'
      + '<circle cx="12" cy="9.6" r="2" fill="#FFF3D6" stroke="none"/><path d="M21 1.6V4M19.8 2.8H22.2M3 1.6V4M1.8 2.8H4.2" stroke="#F6C945" stroke-width=".9"/>'
  };
  const HANG_CUR = t => 2 + 24 * t * (1 - t), HANG_X = t => 8 + 284 * t, HANG_STRING = 'M8 2Q150 14 292 2';
  const HANG_PTS = (n, a, b) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
  const HANG_STAR = 'M0-4L1-1.38 3.8-1.24 1.62.53 2.35 3.24 0 1.7-2.35 3.24-1.62.53-3.8-1.24-1-1.38Z';
  const HANG_COL = [['#F08A6A', '#B8523A'], ['#F6CF5C', '#C79A3A'], ['#7EC4C4', '#4C8F8F'], ['#F2A4BF', '#BC6F8C'], ['#9CBC79', '#668C51']];
  const HANG_ART = {
    bunting: '<path d="' + HANG_STRING + '" fill="none" stroke="#A57A47" stroke-width="1.4"/>'
      + HANG_PTS(9, .1, .9).map((t, i) => { const x = HANG_X(t), y = HANG_CUR(t), c = HANG_COL[i % 5]; return '<path d="M' + (x - 9) + ' ' + (y - .4) + 'L' + (x + 9) + ' ' + (y + .4) + 'L' + x + ' ' + (y + 15) + 'Z" fill="' + c[0] + '" stroke="' + c[1] + '"/>'; }).join(''),
    starlight: '<path d="' + HANG_STRING + '" fill="none" stroke="#A57A47" stroke-width="1.4"/>'
      + HANG_PTS(7, .08, .92).map((t, i) => { const x = HANG_X(t), y = HANG_CUR(t); return '<path d="M' + x + ' ' + y + 'V' + (y + 4) + '" stroke="#A57A47"/><path transform="translate(' + x + ' ' + (y + 12) + ') scale(' + (i % 2 ? 1.9 : 2.5) + ')" d="' + HANG_STAR + '" fill="#F6CF5C" stroke="#D49B26" stroke-width=".42"/>'; }).join(''),
    lantern: '<path d="' + HANG_STRING + '" fill="none" stroke="#A57A47" stroke-width="1.4"/>'
      + [.11, .37, .63, .89].map(t => '<g transform="translate(' + HANG_X(t) + ' ' + HANG_CUR(t) + ') scale(1.3)"><path d="M0 0V3" stroke="#A57A47"/><rect x="-3" y="3" width="6" height="2" rx="1" fill="#C79A3A" stroke="#A57A47"/>'
        + '<ellipse cx="0" cy="10.5" rx="8" ry="5.8" fill="#F08A6A" stroke="#B8523A"/><path d="M0 5V16M-4.4 5.6Q-6 10.5 -4.4 15.4M4.4 5.6Q6 10.5 4.4 15.4" fill="none" stroke="#B8523A" stroke-width=".7"/>'
        + '<rect x="-3" y="15.6" width="6" height="2" rx="1" fill="#C79A3A" stroke="#A57A47"/><path d="M0 17.6V23" stroke="#E9B24E" stroke-width="1.5"/></g>').join(''),
    garland: '<path d="' + HANG_STRING + '" fill="none" stroke="#668C51" stroke-width="2.6"/>'
      + HANG_PTS(15, .04, .96).map((t, i) => {
        const x = HANG_X(t), y = HANG_CUR(t);
        if (i % 3 === 1) {
          const c = i % 2 ? '#F6A5C2' : '#F9C46B';
          return '<g transform="translate(' + x + ' ' + (y + 3) + ')">' + [0, 72, 144, 216, 288].map(a => '<circle cx="0" cy="-3.6" r="2.7" transform="rotate(' + a + ')" fill="' + c + '" stroke="#D77F9F" stroke-width=".7"/>').join('') + '<circle r="1.7" fill="#FFF3D6" stroke="#D49B26" stroke-width=".7"/></g>';
        }
        return '<ellipse cx="' + x + '" cy="' + (y + 4) + '" rx="2.4" ry="5.2" transform="rotate(' + (i % 2 ? 28 : -28) + ' ' + x + ' ' + (y + 4) + ')" fill="#9CBC79" stroke="#668C51"/>';
      }).join('')
  };
  function itemArt(id) {
    if (PROP_ART[id]) return '<svg viewBox="0 0 24 24" aria-hidden="true">' + ITEM_G(PROP_ART[id]) + '</svg>';
    if (HANG_ART[id]) return '<svg viewBox="0 0 300 40" preserveAspectRatio="xMidYMin meet" aria-hidden="true">' + ITEM_G(HANG_ART[id]) + '</svg>';
    return '';
  }
  // 商店货架里的迷你预览：摆件站在地线上，挂饰截取横幅中段。
  function itemPrev(id) {
    if (PROP_ART[id]) return '<svg viewBox="0 0 84 50" aria-hidden="true"><path d="M8 45.5H76" stroke="#D9C39E" stroke-width="2" stroke-linecap="round"/><svg x="22" y="4" width="40" height="40" viewBox="0 0 24 24">' + ITEM_G(PROP_ART[id]) + '</svg></svg>';
    if (HANG_ART[id]) return '<svg viewBox="104 -1 92 50" aria-hidden="true">' + ITEM_G(HANG_ART[id]) + '</svg>';
    return '';
  }
  function nestItems(p) {
    const put = p.put || {}, prop = s => put[s] ? '<div class="nest-prop nest-prop-' + s + '" data-item="' + put[s] + '" aria-hidden="true">' + itemArt(put[s]) + '</div>' : '';
    const decor = (put.H ? '<div class="nest-hang" data-item="' + put.H + '" aria-hidden="true">' + itemArt(put.H) + '</div>' : '') + prop('L') + prop('R');
    const list = p.gifts.slice(); if (root.MG_PET.storyFor(p, 'gift-7')) list.push(7);
    return decor + list.map(lv => {
      const t = lv < 7 ? root.MG_PET.tierFor(p, lv) : 0, name = lv < 7 ? root.MG_PET.giftName(lv, t) : root.MG_PET.gifts[lv];
      return '<button type="button" class="nest-item nest-item-' + lv + (lv === 6 && p.stage ? ' lit' : '') + '" aria-label="' + name + '，重看礼物故事" title="' + name + '" onclick="MG_PET_STORY.show(\'gift-' + lv + '\')">' + giftArt(lv) + (t ? '<span class="nest-tier">' + tierStars(t) + '</span>' : '') + '</button>';
    }).join('');
  }
  function scene(level, p, birth, tier) {
    let land = '<path d="M0 146Q80 106 158 140Q235 108 320 145V180H0Z" fill="#D4DDB0"/><path d="M56 143Q160 103 265 143L242 163H78Z" fill="#E8CC9C" stroke="#C39A67" stroke-width="2"/>';
    if (level === 4) land = '<path d="M0 124L67 34L135 120L210 20L320 126V180H0Z" fill="#BCD0AE"/><path d="M50 180Q36 143 109 132T238 94" fill="none" stroke="#F2DCB2" stroke-width="19"/><path d="M57 48L67 34L79 50M196 38L210 20L225 40" fill="#F9F1DD"/>';
    if (level === 5) land = '<path d="M0 91Q80 75 160 91T320 91V180H0Z" fill="#A9D6D8"/><path class="ps-tide" d="M0 111Q40 99 80 111T160 111T240 111T320 111M0 132Q40 120 80 132T160 132T240 132T320 132" fill="none" stroke="#F2FCF5" stroke-width="3"/><path d="M0 161Q160 121 320 164V180H0Z" fill="#EFD5AC"/>';
    const marks = !p.stage && p.phase >= 2 ? '<path d="M19 35q13-9 26 0M22 43q10-7 20 0" fill="none" stroke="#D99E42" stroke-width="1.5"/>' : '';
    const crack = !p.stage && p.phase >= 6 ? '<path d="M36 15l-5 8 6 5-5 8 5 6" fill="none" stroke="#AD8753" stroke-width="1.4"/>' : '';
    return '<div class="ps-scene ps-gift-' + level + (birth || (level === 6 && p.stage) ? ' ps-lit' : '') + '">'
      + '<svg class="ps-landscape" viewBox="0 0 320 180" aria-hidden="true"><rect width="320" height="180" rx="24" fill="' + (level === 5 ? '#E5F2EC' : '#F5E9D1') + '"/><circle cx="263" cy="36" r="18" fill="#F4CF83"/><path d="M22 41Q28 31 36 38Q47 30 53 42Z" fill="#FFFCF1"/>' + land + '</svg>'
      + (SYMS[level] ? '<svg class="ps-friend" viewBox="0 0 24 24" aria-hidden="true"><use href="#' + SYMS[level] + '"/></svg>' : '')
      + '<svg class="ps-buddy" viewBox="0 0 64 64" aria-hidden="true"><use href="#' + ['pet-egg', 'pet-baby', 'pet-adult'][p.stage] + '"/>' + marks + crack + '</svg>'
      + '<div class="ps-prop">' + giftArt(level) + '</div>'
      + (tier ? '<div class="ps-tier">' + tierStars(tier) + '</div>' : '')
      + (level === 3 ? '<span class="ps-note ps-note-a" aria-hidden="true">♪</span><span class="ps-note ps-note-b" aria-hidden="true">♫</span>' : '')
      + (level === 7 ? '<span class="ps-whisper" aria-hidden="true">…</span>' : '')
      + '<span class="ps-spark" aria-hidden="true">✧</span></div>';
  }
  function sound(level) {
    stopSound();
    if (level !== 3 && level !== 5) return;
    try {
      const volume = typeof root.mgVol === 'function' ? root.mgVol('sfx') : root.getSettings().sfx / 3;
      if (volume <= 0) return;
      const Context = root.AudioContext || root.webkitAudioContext;
      if (!Context) return;
      const ctx = audio = new Context(), start = ctx.currentTime + .03;
      const release = function () { if (audio === ctx) stopSound(); };
      ctx.resume().catch(release);
      if (level === 3) [523.25, 659.25, 783.99, 659.25, 523.25].forEach((hz, i) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain(), t = start + i * .2;
        osc.type = 'sine'; osc.frequency.value = hz;
        gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(.08 * volume, t + .025); gain.gain.exponentialRampToValueAtTime(.001, t + .18);
        if (i === 4) osc.onended = release;
        osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t + .2);
      });
      else {
        const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
        source.buffer = buffer; filter.type = 'lowpass'; filter.frequency.value = 600;
        gain.gain.setValueAtTime(.001, start); gain.gain.linearRampToValueAtTime(.12 * volume, start + .4); gain.gain.linearRampToValueAtTime(0, start + 1);
        source.onended = release;
        source.connect(filter); filter.connect(gain); gain.connect(ctx.destination); source.start(start);
      }
    } catch (ignored) { stopSound(); }
  }
  function stopSound() { if (audio) { const old = audio; audio = null; old.close().catch(function () {}); } }
  // 故事卡 = 一幅画 + 一句话：这句话同时显示和朗读；原来的长段文字只留给读屏（.ps-sr）。
  const REACT = ['萌蛋晃一晃，真开心！', '数宝笑啦，真开心！'];
  const ICON_X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
  const ICON_OK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5L10 17.5L19 7" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function sayFor(s) {
    const P = root.MG_PET;
    if (s.grow) return s.title;
    if (s.level === 7) return '蛋壳里有悄悄话！';
    return s.phase ? P.gifts[s.level] + '派上用场啦！' : FRIENDS[s.level] + '送来' + P.gifts[s.level] + '！';
  }
  // 点灰色贴纸时念的「怎么解锁」：还没拿到礼物 → 过第几关；拿到了 → 用上几份材料；其余 → 答题喂萌蛋。
  const CN = ['', '一', '二', '三', '四', '五', '六'];
  const FEED_LINE = '答题喂萌蛋，就解锁！', HATCH_LINE = '等萌蛋出生，就解锁！';
  const passLine = lv => '过第' + CN[lv] + '关，就有礼物！';
  const tierLine = (lv, row) => '用上' + root.MG_PET.tiers[row - 1] + '份' + root.MG_PET.mats[lv].name + '！';
  function lockLine(p, lv, row) {
    if (lv <= 6 && !p.gifts.includes(lv)) return passLine(lv);
    if (typeof row === 'number') return tierLine(lv, row);
    return lv === 6 && row === 'echo' ? HATCH_LINE : FEED_LINE;
  }
  function sayLines() {
    const P = root.MG_PET, set = new Set(REACT);
    P.stories.forEach(s => set.add(sayFor(s)));
    P.phases.forEach(x => set.add(x.name));
    for (let lv = 1; lv <= 6; lv++) { set.add(passLine(lv)); for (let r = 1; r <= 3; r++) set.add(tierLine(lv, r)); }
    set.add(FEED_LINE); set.add(HATCH_LINE);
    return Array.from(set);
  }
  function speak(text) {
    try {
      if (typeof root.mgSay === 'function') root.mgSay(text);
      else if (typeof root._mgSpeakAwait === 'function') root._mgSpeakAwait(text, 1.0, 'zh-CN');
    } catch (ignored) {}
  }
  function hush() { try { if (typeof root.mgSayStop === 'function') root.mgSayStop(); } catch (ignored) {} }
  // 手记 = 贴纸册：上面一排蛋蛋长大的 8 张贴纸，下面按朋友分列，每列依次是礼物、长大后的回声、三档升级。
  const ECHO = { 1: 'rest-1', 2: 'basket-2', 3: 'song-3', 4: 'trail-4', 5: 'sea-5', 6: 'light-6' };
  const ALB_COLS = [1, 2, 7, 3, 4, 5, 6];
  function album(p) {
    const P = root.MG_PET, pending = p.stories.pending, st = p.stage;
    const eggs = P.phases.map((x, i) => {
      const got = st || i <= p.phase;
      return '<button type="button" class="alb-egg' + (got ? '' : ' lock') + (!st && i === p.phase ? ' now' : '') + '"' + (got ? ' onclick="MG_PET_STORY.hear(' + i + ')" aria-label="' + x.name + '"' : ' aria-disabled="true" data-hint="' + FEED_LINE + '" onclick="MG_PET_STORY.lockHint(this)" aria-label="' + FEED_LINE + '"') + '>' + egg(i, 'alb-art') + '</button>';
    }).join('');
    const cell = (lv, row) => {
      const id = row === 'gift' ? 'gift-' + lv : row === 'echo' ? ECHO[lv] : 'grow-' + lv + '-' + row;
      if (lv === 7 && row !== 'gift') return '<i class="alb-gap"></i>';
      const s = P.storyFor(p, id), mark = row === 'echo' ? '<u class="alb-mark">✧</u>' : row === 'gift' ? '' : '<span class="alb-stars">' + tierStars(row) + '</span>';
      if (!s) { const hint = lockLine(p, lv, row); return '<button type="button" class="alb-s lock" aria-disabled="true" data-hint="' + hint + '" aria-label="' + hint + '" onclick="MG_PET_STORY.lockHint(this)">' + giftArt(lv) + '</button>'; }
      const fresh = pending.includes(id);
      return '<button type="button" class="alb-s' + (fresh ? ' new' : '') + '" aria-label="' + s.title + (fresh ? '，新贴纸' : '') + '" onclick="MG_PET_STORY.show(\'' + id + '\')">' + giftArt(lv) + mark + (fresh ? '<b class="alb-dot"></b>' : '') + '</button>';
    };
    const rows = ['gift', 'echo', 1, 2, 3].map(r => ALB_COLS.map(lv => cell(lv, r)).join('')).join('');
    return '<div class="alb"><div class="alb-eggs" role="group" aria-label="蛋蛋长大的贴纸">' + eggs + '</div><div class="alb-grid" role="group" aria-label="朋友们的礼物贴纸">' + rows + '</div></div>';
  }
  function lockHint(el) {
    const line = el.getAttribute('data-hint') || FEED_LINE;
    speak(line);
    try { if (typeof root.petMessage === 'function') root.petMessage(line); } catch (ignored) {}
    el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope');
    clearTimeout(el._nopeT); el._nopeT = setTimeout(function () { el.classList.remove('nope'); }, 520);
  }
  function hear(i) {
    const P = root.MG_PET, p = P.get(), x = P.phases[i];
    if (x && (p.stage || i <= p.phase)) speak(x.name);
  }
  function mount() {
    let m = document.getElementById('petStoryModal');
    if (m) return m;
    m = document.createElement('div'); m.id = 'petStoryModal'; m.className = 'pet-story-modal'; m.setAttribute('aria-hidden', 'true');
    m.innerHTML = '<div class="ps-shade"></div><div class="ps-card" role="dialog" aria-modal="true" aria-labelledby="petStoryTitle"><button type="button" id="petStoryLater" class="ps-close" aria-label="关上">' + ICON_X + '</button><div id="petStoryScene"></div><h2 id="petStoryTitle" class="ps-say"></h2><p id="petStoryText" class="ps-sr"></p><p id="petStoryResponse" class="ps-sr" aria-live="polite"></p><div class="ps-actions"><button type="button" id="petStoryAction" class="ps-action"></button></div></div>';
    document.body.appendChild(m);
    m.querySelector('.ps-shade').onclick = dismiss;
    m.querySelector('#petStoryLater').onclick = dismiss;
    m.querySelector('#petStoryAction').onclick = act;
    m.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); dismiss(); }
      if (e.key !== 'Tab') return;
      const buttons = Array.from(m.querySelectorAll('button')).filter(b => !b.hidden), first = buttons[0], last = buttons[buttons.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    return m;
  }
  function show(id) {
    try {
      const p = root.MG_PET.get(), s = root.MG_PET.storyFor(p, id); if (!s) return false;
      const m = mount();
      stopSound();
      if (!current) previousFocus = document.activeElement;
      current = { id, reacted: false };
      const P = root.MG_PET, grown = s.grow ? P.tiers.indexOf(s.grow) + 1 : 0, tier = s.level < 7 ? (grown || P.tierFor(p, s.level)) : 0;
      const say = sayFor(s), action = document.getElementById('petStoryAction');
      document.getElementById('petStoryTitle').textContent = say;
      document.getElementById('petStoryScene').innerHTML = scene(s.level, s.phase && s.phase < 7 ? Object.assign({}, p, { stage: 0, phase: s.phase }) : p, false, tier);
      document.getElementById('petStoryText').textContent = s.title + '。' + s.text;
      document.getElementById('petStoryResponse').textContent = '';
      action.innerHTML = '<i>' + giftArt(s.level) + '</i><span>点点看</span>'; action.setAttribute('aria-label', s.action); action.classList.add('nudge');
      m.classList.add('show'); m.setAttribute('aria-hidden', 'false');
      m.querySelector('.ps-card').scrollTop = 0; action.focus();
      speak(say);
      return true;
    } catch (e) { report(e); return false; }
  }
  function act() {
    if (!current) return;
    try {
      const s = root.MG_PET.story(current.id); if (!s) { close(); return; }
      if (current.reacted) {
        root.MG_PET.finishStory(s.id); close(); refreshView();
        return;
      }
      const p = root.MG_PET.get(), action = document.getElementById('petStoryAction'), line = REACT[p.stage ? 1 : 0];
      document.getElementById('petStoryResponse').textContent = p.stage && s.baby ? s.baby : s.response;
      document.getElementById('petStoryTitle').textContent = line;
      document.querySelector('#petStoryScene .ps-scene').classList.add('ps-reacted');
      action.innerHTML = '<i>' + ICON_OK + '</i><span>收好啦</span>'; action.setAttribute('aria-label', '收好这段回忆'); action.classList.remove('nudge');
      current.reacted = true; sound(s.level); speak(line);
    } catch (e) { report(e); }
  }
  function report(e) {
    const el = document.getElementById('petStoryTitle');
    if (el) el.textContent = e.message || '这段回忆还没有保存，请稍后再试。';
  }
  function close() {
    const m = document.getElementById('petStoryModal'); if (m) { m.classList.remove('show'); m.setAttribute('aria-hidden', 'true'); }
    if (current) hush();
    current = null; stopSound();
    if (previousFocus && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    previousFocus = null;
  }
  // 孩子主动关掉（按钮 / 点空白 / Esc / 返回键）就算看过：故事留在手记里，不再弹出；程序性关闭仍用 close。
  function dismiss() {
    const id = current && current.id;
    close();
    if (id) { try { root.MG_PET.finishStory(id); } catch (ignored) {} refreshView(); }
  }
  function refreshView() {
    try {
      const m = document.getElementById('petModal');
      if (typeof root.renderPet === 'function' && m && m.classList.contains('show')) root.renderPet();
      if (typeof root.refreshPetDot === 'function') root.refreshPetDot();
    } catch (ignored) {}
  }
  function isOpen() { return !!current; }
  // 结算卡里的故事行：小图标 + 一句话 + 进入按钮，不再讲一遍剧情。
  function teaser(id) {
    const s = root.MG_PET.story(id); if (!s) return '';
    return '<div class="ps-teaser"><i class="ps-teaser-ico">' + giftArt(s.level) + '</i><span class="ps-teaser-line">' + sayFor(s).replace(/！$/, '') + '</span><button type="button" onclick="MG_PET_STORY.show(\'' + s.id + '\')">看看</button></div>';
  }
  root.addEventListener('pagehide', stopSound);
  document.addEventListener('visibilitychange', function () { if (document.hidden) stopSound(); });
  root.MG_PET_STORY = { giftArt, matArt, tierStars, nestItems, itemArt, itemPrev, scene, show, close, dismiss, isOpen, teaser, sayFor, sayLines, speak, hear, lockHint, lockLine, album, egg, eggInner, energyBar, energyPath };
})(window);
