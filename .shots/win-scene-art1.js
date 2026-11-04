// 过关小剧场背景插画（960×576 坐标；<svg overflow:visible> 所以天空/地面向外多画一圈）
const A = {};
const SKY = (id, stops) => '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' + stops.map(([o, c]) => '<stop offset="' + o + '" stop-color="' + c + '"/>').join('') + '</linearGradient></defs><rect x="-400" y="-400" width="1760" height="1300" fill="url(#' + id + ')"/>';
const star4 = (x, y, s, c = '#fff', d = 0) => '<path class="tw" style="animation-delay:' + d + 's" fill="' + c + '" d="M' + x + ' ' + (y - s) + 'Q' + (x + s * .2) + ' ' + (y - s * .2) + ' ' + (x + s) + ' ' + y + 'Q' + (x + s * .2) + ' ' + (y + s * .2) + ' ' + x + ' ' + (y + s) + 'Q' + (x - s * .2) + ' ' + (y + s * .2) + ' ' + (x - s) + ' ' + y + 'Q' + (x - s * .2) + ' ' + (y - s * .2) + ' ' + x + ' ' + (y - s) + 'Z"/>';
const cloud = (x, y, k = 1, c = '#fff', o = .85) => '<g opacity="' + o + '" transform="translate(' + x + ' ' + y + ') scale(' + k + ')"><ellipse rx="62" ry="20" fill="' + c + '"/><ellipse cx="-20" cy="-16" rx="30" ry="22" fill="' + c + '"/><ellipse cx="22" cy="-22" rx="34" ry="26" fill="' + c + '"/></g>';
const tuft = (x, y, k, tip) => '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')" stroke-linecap="round" stroke-width="7" fill="none"><path d="M-14 0Q-18-22-24-34" stroke="#6FA83E"/><path d="M-4 0Q-4-30-6-46" stroke="#7DB84A"/><path d="M8 0Q12-28 18-40" stroke="#6FA83E"/><path d="M18 0Q24-18 32-26" stroke="#7DB84A"/><circle cx="-24" cy="-36" r="5" fill="' + tip + '" stroke="none"/><circle cx="-6" cy="-48" r="5.5" fill="' + tip + '" stroke="none"/><circle cx="18" cy="-42" r="5" fill="' + tip + '" stroke="none"/><circle cx="32" cy="-28" r="4.5" fill="' + tip + '" stroke="none"/></g>';
const flower = (x, y, c) => '<g transform="translate(' + x + ' ' + y + ')"><path d="M0 0V16" stroke="#6FA83E" stroke-width="3"/><circle cx="-5" cy="-3" r="5" fill="' + c + '"/><circle cx="5" cy="-3" r="5" fill="' + c + '"/><circle cx="0" cy="-9" r="5" fill="' + c + '"/><circle cx="0" cy="1" r="5" fill="' + c + '"/><circle r="3.5" fill="#FFE27A"/></g>';
const tree = (x, y, k, canopy, hi, trunk = '#8A5A34') => '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')"><rect x="-15" y="-130" width="30" height="150" rx="9" fill="' + trunk + '"/><circle cy="-180" r="84" fill="' + canopy + '"/><circle cx="-60" cy="-136" r="54" fill="' + canopy + '"/><circle cx="62" cy="-138" r="56" fill="' + canopy + '"/><circle cx="-22" cy="-206" r="36" fill="' + hi + '" opacity=".55"/><circle cx="36" cy="-160" r="22" fill="' + hi + '" opacity=".4"/></g>';
const acorn = (x, y, r = 1) => '<g transform="translate(' + x + ' ' + y + ') scale(' + r + ')"><ellipse cy="4" rx="8" ry="10" fill="#B9742F"/><path d="M-10-3Q0-14 10-3Z" fill="#7C4A22"/><rect x="-1.5" y="-12" width="3" height="5" rx="1.5" fill="#7C4A22"/></g>';

// 第1关 暖草坡：清晨、暖黄天空、嫩绿草坡、发光的暖草
A[1] = () => SKY('g1', [[0, '#FFF4D2'], [.62, '#FFE2A2']])
  + '<radialGradient id="g1s"><stop offset="0" stop-color="#FFE9A0" stop-opacity=".95"/><stop offset="1" stop-color="#FFE9A0" stop-opacity="0"/></radialGradient>'
  + '<circle cx="790" cy="124" r="130" fill="url(#g1s)"/><circle cx="790" cy="124" r="46" fill="#FFD866"/>'
  + cloud(170, 128, 1) + cloud(560, 86, .7) + cloud(880, 250, .55)
  + '<path d="M-400 400Q-60 290 200 360T560 340T900 350T1360 380V900H-400Z" fill="#D8EBA2"/>'
  + '<path d="M-400 450Q-40 372 240 420T620 412T960 420T1360 440V900H-400Z" fill="#B9DC78"/>'
  + '<path d="M-400 508Q100 456 480 490T1360 486V900H-400Z" fill="#94C65A"/>'
  + tuft(96, 520, 1.1, '#FFC94D') + tuft(214, 548, .9, '#FFD866') + tuft(756, 540, 1.05, '#FFC94D') + tuft(868, 516, 1.2, '#FFD866') + tuft(320, 556, .7, '#FFC94D')
  + flower(150, 470, '#FF9DB8') + flower(60, 548, '#fff') + flower(820, 470, '#fff') + flower(912, 560, '#FF9DB8') + flower(560, 552, '#FFB35C')
  + star4(250, 230, 12, '#FFE27A', .2) + star4(700, 240, 10, '#fff', .6) + star4(420, 190, 8, '#FFE27A', 1);

// 第2关 松果林：午后、琥珀色天空、秋林与松果
A[2] = () => SKY('g2', [[0, '#FFEBCB'], [.6, '#FFD39C']])
  + '<circle cx="480" cy="300" r="260" fill="#FFE7BC" opacity=".5"/>'
  + cloud(190, 110, .9, '#FFF6E6') + cloud(740, 150, .75, '#FFF6E6')
  + '<path d="M-400 420Q0 340 300 400T700 392T1360 410V900H-400Z" fill="#E7C27E"/>'
  + tree(118, 470, 1.1, '#E0872F', '#F5B452') + tree(250, 440, .78, '#C8742A', '#EFA94A') + tree(846, 466, 1.05, '#D9792B', '#F5B452') + tree(722, 436, .7, '#E8982F', '#F7C46A')
  + '<path d="M-400 490Q80 450 480 478T1360 476V900H-400Z" fill="#D49A5B"/>'
  + '<path d="M-400 530Q200 506 520 524T1360 520V900H-400Z" fill="#C4864A"/>'
  + acorn(170, 520, 1.1) + acorn(236, 556, .9) + acorn(780, 530, 1.1) + acorn(860, 556, .9) + acorn(70, 556, .8) + acorn(560, 560, .8)
  + '<g fill="#E8553B" opacity=".9"><ellipse cx="300" cy="500" rx="9" ry="5" transform="rotate(-25 300 500)"/><ellipse cx="690" cy="512" rx="9" ry="5" transform="rotate(20 690 512)"/><ellipse cx="900" cy="500" rx="8" ry="4.5"/></g>'
  + star4(330, 200, 11, '#fff', .1) + star4(640, 250, 9, '#FFF1B8', .7) + star4(500, 150, 8, '#fff', 1.2);

// 第3关 音符谷：黄昏紫粉天空、五线谱上点亮的音符
const note = (x, y, c, d) => '<g class="tw" style="animation-delay:' + d + 's" transform="translate(' + x + ' ' + y + ')"><ellipse rx="11" ry="8" transform="rotate(-20)" fill="' + c + '"/><rect x="8" y="-34" width="3.5" height="34" rx="1.7" fill="' + c + '"/><path d="M11.5-34Q24-28 21-16Q18-24 11.5-24Z" fill="' + c + '"/></g>';
A[3] = () => SKY('g3', [[0, '#E3D6FA'], [.62, '#FFD8E6']])
  + '<circle cx="190" cy="108" r="40" fill="#FFF3D0"/><circle cx="206" cy="100" r="34" fill="#E7DAFB"/>'
  + [140, 155, 170, 185, 200].map(y => '<path d="M40 ' + y + 'Q480 ' + (y - 34) + ' 920 ' + y + '" stroke="#fff" stroke-opacity=".8" stroke-width="2.6" fill="none"/>').join('')
  + note(150, 192, '#FF8FB1', 0) + note(250, 170, '#FFC94D', .3) + note(350, 160, '#7BD1B5', .6) + note(560, 160, '#8FB5FF', .9) + note(660, 172, '#FF8FB1', 1.2) + note(770, 192, '#FFC94D', 1.5)
  + cloud(120, 280, .8, '#fff', .7) + cloud(850, 300, .7, '#fff', .7)
  + '<path d="M-400 420Q-80 330 220 392T600 380T1360 400V900H-400Z" fill="#C4B3EF"/>'
  + '<path d="M-400 462Q-20 392 300 440T700 430T1360 450V900H-400Z" fill="#AA97E2"/>'
  + '<path d="M-400 510Q120 466 480 496T1360 494V900H-400Z" fill="#917FD2"/>'
  + [[90, 522, '#8FB5FF'], [200, 552, '#FF9DB8'], [770, 526, '#FFC94D'], [880, 552, '#8FB5FF'], [320, 560, '#fff']].map(([x, y, c]) => flower(x, y, c)).join('')
  + star4(300, 100, 10, '#fff', .2) + star4(520, 80, 8, '#FFF1B8', .8) + star4(700, 110, 11, '#fff', .4) + star4(60, 60, 8, '#fff', 1);
