// 第4关 落叶山路：秋日、红橙山色、山顶灯亭、蜿蜒小路
const leaf = (x, y, c, r, d) => '<g class="leaf" style="animation-delay:-' + d + 's"><ellipse cx="' + x + '" cy="' + y + '" rx="11" ry="6" transform="rotate(' + r + ' ' + x + ' ' + y + ')" fill="' + c + '"/></g>';
A[4] = () => SKY('g4', [[0, '#FFE4C6'], [.6, '#FFC79E']])
  + '<radialGradient id="g4l"><stop offset="0" stop-color="#FFE27A" stop-opacity=".95"/><stop offset="1" stop-color="#FFE27A" stop-opacity="0"/></radialGradient>'
  + '<circle cx="480" cy="170" r="110" fill="#FFF0C8" opacity=".6"/>' + cloud(150, 130, .85, '#FFF4E4') + cloud(820, 110, .7, '#FFF4E4')
  + '<path d="M-400 440L-20 250Q60 210 140 250L420 440Z" fill="#E2A07C"/><path d="M1360 440L980 240Q900 200 820 250L540 440Z" fill="#E2A07C"/>'
  + '<path d="M470 470Q650 190 840 470Z" fill="#D9825A"/><path d="M60 470Q275 60 490 470Z" fill="#CB6E4E"/><path d="M190 470Q275 190 360 470Z" fill="#D9825A" opacity=".6"/>'
  + '<circle cx="275" cy="232" r="72" fill="url(#g4l)"/>'
  + '<g transform="translate(275 270)"><rect x="-22" y="-18" width="44" height="26" rx="3" fill="#F7E1B5"/><path d="M-30-16L0-42 30-16Z" fill="#B5483D"/><rect x="-6" y="-12" width="12" height="14" rx="2" fill="#FFD866"/></g>'
  + '<path d="M-400 478Q100 430 480 462T1360 458V900H-400Z" fill="#C06B3F"/>'
  + '<path d="M440 580C420 540 520 500 380 450S330 330 275 278" stroke="#F6DDA6" stroke-width="30" fill="none" stroke-linecap="round"/>'
  + '<path d="M440 580C420 540 520 500 380 450S330 330 275 278" stroke="#fff" stroke-opacity=".5" stroke-width="3" fill="none" stroke-dasharray="2 14" stroke-linecap="round"/>'
  + tree(90, 500, 1, '#E4572E', '#F59A52', '#7A4A2E') + tree(868, 498, 1, '#D9462B', '#F59A52', '#7A4A2E') + tree(742, 478, .62, '#F6B63A', '#FADB7E', '#7A4A2E')
  + leaf(330, 120, '#E8553B', -30, 0) + leaf(420, 40, '#F29A3A', 20, 2) + leaf(620, 70, '#F6C453', -50, 4) + leaf(720, 20, '#E8553B', 30, 1) + leaf(250, 30, '#F6C453', 10, 5) + leaf(560, 0, '#F29A3A', -20, 3) + leaf(150, 80, '#E8553B', 40, 6) + leaf(860, 60, '#F29A3A', -35, 2.5)
  + '<g fill="#E8553B"><ellipse cx="300" cy="520" rx="10" ry="5.5" transform="rotate(-20 300 520)"/><ellipse cx="640" cy="540" rx="10" ry="5.5" transform="rotate(25 640 540)"/></g><g fill="#F6C453"><ellipse cx="380" cy="556" rx="9" ry="5" transform="rotate(15 380 556)"/><ellipse cx="720" cy="520" rx="9" ry="5"/></g>';

// 第5关 贝壳海岸：晴空、青蓝海面、帆船、沙滩与贝壳
const shell = (x, y, k, c) => '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')"><path d="M0 14L-18-2Q-14-18 0-20 14-18 18-2Z" fill="' + c + '"/><path d="M0 14L-9-14M0 14V-18M0 14L9-14" stroke="#fff" stroke-opacity=".7" stroke-width="2.2" fill="none"/></g>';
A[5] = () => SKY('g5', [[0, '#BFECFF'], [.5, '#E6F9FF']])
  + '<circle cx="150" cy="110" r="100" fill="#FFF3C2" opacity=".5"/><circle cx="150" cy="110" r="40" fill="#FFE48A"/>' + cloud(480, 100, .9) + cloud(820, 170, .65) + cloud(330, 190, .5)
  + '<defs><linearGradient id="g5s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6CCBDD"/><stop offset="1" stop-color="#9BE6EA"/></linearGradient></defs>'
  + '<rect x="-400" y="270" width="1760" height="200" fill="url(#g5s)"/>'
  + '<g stroke="#fff" stroke-opacity=".75" stroke-width="3" fill="none" stroke-linecap="round"><path d="M60 310q15-9 30 0t30 0"/><path d="M260 346q15-9 30 0t30 0"/><path d="M800 322q15-9 30 0t30 0"/><path d="M590 380q15-9 30 0t30 0"/><path d="M110 410q15-9 30 0t30 0"/><path d="M850 400q15-9 30 0t30 0"/></g>'
  + '<g transform="translate(690 330)"><path d="M-46 0H46L30 22H-30Z" fill="#B8754A"/><path d="M0-84V-4" stroke="#8A5A34" stroke-width="4"/><path d="M4-80Q40-44 36-12H4Z" fill="#fff"/><path d="M-4-70Q-34-40-32-12H-4Z" fill="#FFE3B3"/><path d="M0-84l22 7-22 7Z" fill="#FF7A59"/></g>'
  + '<path d="M-400 462Q200 410 480 436T1360 440V900H-400Z" fill="#fff" opacity=".8"/>'
  + '<path d="M-400 474Q200 424 480 448T1360 452V900H-400Z" fill="#FBE3B0"/>'
  + '<path d="M-400 530Q200 506 520 520T1360 516V900H-400Z" fill="#F4D49A"/>'
  + shell(120, 520, 1.1, '#FFB4C6') + shell(230, 556, .9, '#FFD9A0') + shell(790, 530, 1.1, '#FFC4B0') + shell(880, 560, .9, '#FFB4C6') + shell(60, 560, .7, '#fff') + shell(600, 556, .75, '#FFD9A0')
  + '<g fill="#fff" fill-opacity=".8" stroke="#BFEAF5" stroke-width="2"><circle cx="300" cy="230" r="9"/><circle cx="326" cy="204" r="6"/><circle cx="270" cy="206" r="5"/></g>'
  + star4(560, 250, 9, '#fff', .3) + star4(380, 300, 8, '#fff', .9) + star4(860, 270, 10, '#fff', .5);

// 第6关 萤火小屋（终章）：夜空，窗/门灯/灯串依次点亮
const win = (x, cls) => '<rect class="win ' + cls + '" x="' + x + '" y="382" width="46" height="44" rx="5"/><path d="M' + (x + 23) + ' 382V426M' + x + ' 404H' + (x + 46) + '" stroke="#7A4B3A" stroke-width="3.5"/><rect x="' + (x - 3) + '" y="379" width="52" height="50" rx="7" fill="none" stroke="#7A4B3A" stroke-width="4"/>';
const FF = [[330, 330, 5, 0], [610, 300, 4, .6], [250, 400, 4, 1.1], [720, 380, 5, .3], [420, 250, 3.5, 1.5], [560, 250, 4, .9], [180, 330, 4, 2], [790, 320, 3.5, 1.2], [470, 330, 3, 2.2], [650, 440, 4, .4], [310, 450, 4, 1.7], [880, 420, 3.5, 2.4]];
const BULB = ['#FF8FB1', '#FFD866', '#7BD1B5', '#8FB5FF', '#FF8FB1', '#FFD866', '#7BD1B5'];
const A6base = () => SKY('g6', [[0, '#1B2150'], [.7, '#3A4388']])
  + '<radialGradient id="g6g"><stop offset="0" stop-color="#FFD866" stop-opacity=".6"/><stop offset="1" stop-color="#FFD866" stop-opacity="0"/></radialGradient>'
  + '<radialGradient id="g6w"><stop offset="0" stop-color="#FFE9A0" stop-opacity=".85"/><stop offset="1" stop-color="#FFE9A0" stop-opacity="0"/></radialGradient>'
  + '<circle cx="170" cy="110" r="38" fill="#FFF3C4"/><circle cx="188" cy="101" r="34" fill="#2C346F"/>'
  + [[60, 60, 6], [300, 70, 8], [420, 130, 5], [620, 60, 7], [780, 120, 6], [880, 50, 8], [540, 170, 5], [250, 190, 6], [840, 220, 5]].map(([x, y, s], i) => star4(x, y, s, '#FFF3C4', i * .25)).join('')
  + '<path d="M-400 420Q-80 330 240 392T620 372T1360 400V900H-400Z" fill="#26405A"/>'
  + '<path d="M-400 462Q200 420 480 446T1360 450V900H-400Z" fill="#2F5A47"/>'
  + '<path d="M-400 520Q200 494 520 510T1360 506V900H-400Z" fill="#2A4F3E"/>';
const A6house = () => '<path d="M430 576L452 456H508L530 576Z" fill="#E9D4A0" opacity=".28"/>'
  + '<circle class="bigglow" cx="480" cy="390" r="300" fill="url(#g6g)"/>'
  + '<g class="cot"><rect x="548" y="288" width="28" height="64" fill="#8C5A45"/><g class="smoke" fill="#E8E4F5"><circle cx="562" cy="270" r="9"/><circle cx="574" cy="248" r="12"/><circle cx="592" cy="224" r="15"/></g>'
  + '<rect x="370" y="350" width="220" height="106" rx="6" fill="#F2D3A0"/><path d="M346 358L480 258 614 358Z" fill="#B85A4B"/><path d="M346 358L480 258 614 358" stroke="#8E3F34" stroke-width="5" fill="none" stroke-linejoin="round"/><g class="nt" fill="#1B2150"><rect x="370" y="350" width="220" height="106" rx="6"/><path d="M346 358L480 258 614 358Z"/><rect x="548" y="288" width="28" height="62"/></g>'
  + '<circle class="wglow a" cx="419" cy="404" r="62" fill="url(#g6w)"/><circle class="wglow b" cx="541" cy="404" r="62" fill="url(#g6w)"/>'
  + win(396, 'a') + win(518, 'b')
  + '<path d="M458 456V412a22 22 0 0 1 44 0V456Z" fill="#8A5238"/><circle cx="494" cy="436" r="3" fill="#FFD866"/>'
  + '<circle class="dlglow" cx="480" cy="384" r="44" fill="url(#g6w)"/><circle class="dlamp" cx="480" cy="386" r="9"/>'
  + '<path d="M352 362Q480 392 608 362" stroke="#6B5A66" stroke-width="2.5" fill="none"/>' + BULB.map((c, i) => '<circle class="bulb" style="--bc:' + c + '" cx="' + (370 + i * 36.6) + '" cy="' + (373 + Math.sin(i / 6 * Math.PI) * 14) + '" r="5.5"/>').join('') + '</g>';
const A6ff = () => '<g class="ffs" fill="#EAF77A">' + FF.map(([x, y, r, d]) => '<circle class="ff" style="animation-delay:-' + d + 's" cx="' + x + '" cy="' + y + '" r="' + r + '"/><circle cx="' + x + '" cy="' + y + '" r="' + r * 3 + '" opacity=".18"/>').join('') + '</g>';
A[6] = () => A6base() + A6house() + A6ff();
