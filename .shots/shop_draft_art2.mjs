// 挂饰：顶部横幅(300×34)，沿一条下垂的弧线挂；中间被萌蛋盖住一点没关系(挂饰在蛋后面)。
const CUR = t => 2 + 24 * t * (1 - t);
const X = t => 8 + 284 * t;
const STRING = 'M8 2Q150 14 292 2';
const wrap = s => `<svg viewBox="0 0 300 34" preserveAspectRatio="xMidYMin meet" aria-hidden="true"><g stroke-linejoin="round" stroke-linecap="round" stroke-width="1">${s}</g></svg>`;
const STAR = 'M0-4L1-1.38 3.8-1.24 1.62.53 2.35 3.24 0 1.7-2.35 3.24-1.62.53-3.8-1.24-1-1.38Z';
const COL = [['#F08A6A', '#B8523A'], ['#F6CF5C', '#C79A3A'], ['#7EC4C4', '#4C8F8F'], ['#F2A4BF', '#BC6F8C'], ['#9CBC79', '#668C51']];
const pts = (n, a, b) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));

export const HANG = [
  { id: 'bunting', name: '彩旗串', cost: 100, art: wrap(
    `<path d="${STRING}" fill="none" stroke="#A57A47" stroke-width="1.4"/>`
    + pts(9, .1, .9).map((t, i) => { const x = X(t), y = CUR(t), c = COL[i % 5]; return `<path d="M${x - 9} ${y - .4}L${x + 9} ${y + .4}L${x} ${y + 15}Z" fill="${c[0]}" stroke="${c[1]}"/>`; }).join('')) },
  { id: 'starlight', name: '星星灯串', cost: 160, art: wrap(
    `<path d="${STRING}" fill="none" stroke="#A57A47" stroke-width="1.4"/>`
    + pts(7, .08, .92).map((t, i) => { const x = X(t), y = CUR(t); return `<path d="M${x} ${y}V${y + 4}" stroke="#A57A47"/><path transform="translate(${x} ${y + 12}) scale(${i % 2 ? 1.9 : 2.5})" d="${STAR}" fill="#F6CF5C" stroke="#D49B26" stroke-width=".42"/>`; }).join('')) },
  { id: 'lantern', name: '纸灯笼', cost: 220, art: wrap(
    `<path d="${STRING}" fill="none" stroke="#A57A47" stroke-width="1.4"/>`
    + [.11, .37, .63, .89].map(t => { const x = X(t), y = CUR(t);
      return `<g transform="translate(${x} ${y})"><path d="M0 0V3" stroke="#A57A47"/><rect x="-3" y="3" width="6" height="2" rx="1" fill="#C79A3A" stroke="#A57A47"/>`
        + `<ellipse cx="0" cy="10.5" rx="8" ry="5.8" fill="#F08A6A" stroke="#B8523A"/><path d="M0 5V16M-4.4 5.6Q-6 10.5 -4.4 15.4M4.4 5.6Q6 10.5 4.4 15.4" fill="none" stroke="#B8523A" stroke-width=".7"/>`
        + `<rect x="-3" y="15.6" width="6" height="2" rx="1" fill="#C79A3A" stroke="#A57A47"/><path d="M0 17.6V23" stroke="#E9B24E" stroke-width="1.5"/></g>`; }).join('')) },
  { id: 'garland', name: '花环', cost: 280, art: wrap(
    `<path d="${STRING}" fill="none" stroke="#668C51" stroke-width="2.6"/>`
    + pts(15, .04, .96).map((t, i) => { const x = X(t), y = CUR(t);
      if (i % 3 === 1) { const c = i % 2 ? '#F6A5C2' : '#F9C46B'; return `<g transform="translate(${x} ${y + 3})">${[0, 72, 144, 216, 288].map(a => `<circle cx="0" cy="-3.6" r="2.7" transform="rotate(${a})" fill="${c}" stroke="#D77F9F" stroke-width=".7"/>`).join('')}<circle r="1.7" fill="#FFF3D6" stroke="#D49B26" stroke-width=".7"/></g>`; }
      return `<ellipse cx="${x}" cy="${y + 4}" rx="2.4" ry="5.2" transform="rotate(${i % 2 ? 28 : -28} ${x} ${y + 4})" fill="#9CBC79" stroke="#668C51"/>`; }).join('')) }
];

// 现有 12 款窝色涨价（旧价→新价，约 1.7 倍取整到 5/10）。
export const NEST_PRICES = { peach: [30, 50], sea: [40, 70], mint: [50, 90], lavender: [60, 110], lemon: [60, 110], sunset: [80, 150], candy: [80, 150], star: [100, 190], cloud: [100, 190], flower: [120, 240], rainbow: [150, 300] };
