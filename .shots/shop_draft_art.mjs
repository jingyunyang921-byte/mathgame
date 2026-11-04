// 小窝商店扩充·静态稿插画（仅草稿，不进产品）：摆件(地面左右) + 挂饰(顶部横幅)。
const G = s => `<g stroke-linejoin="round" stroke-linecap="round" stroke-width="1">${s}</g>`;
const svg24 = s => `<svg viewBox="0 0 24 24" aria-hidden="true">${G(s)}</svg>`;
const blade = (k, fill, stroke) => `<path d="M12 8L12 1.8L17 5.8Z" transform="rotate(${k * 90} 12 8)" fill="${fill}" stroke="${stroke}"/>`;
const petal = k => `<ellipse cx="12" cy="3.8" rx="1.7" ry="2.8" transform="rotate(${k * 45} 12 8)" fill="#F6C945" stroke="#D49B26"/>`;

export const GROUND = [
  { id: 'sunflower', side: 'L', name: '向日葵盆', cost: 80, art: svg24(
    '<path d="M12 11V17" stroke="#668C51" stroke-width="1.8"/><path d="M12 16Q8 16 6.8 13Q11 13 12 15.5Z" fill="#9CBC79" stroke="#668C51"/>'
    + [0, 1, 2, 3, 4, 5, 6, 7].map(petal).join('') + '<circle cx="12" cy="8" r="2.7" fill="#8A5E32" stroke="#6B4423"/>'
    + '<path d="M7 17.5H17L16 23H8Z" fill="#E59A6C" stroke="#B8682E"/><rect x="6.2" y="16.2" width="11.6" height="2.2" rx="1" fill="#EDAA7E" stroke="#B8682E"/>') },
  { id: 'books', side: 'L', name: '小书堆', cost: 120, art: svg24(
    '<rect x="3" y="17" width="18" height="5" rx="1" fill="#E9A08A" stroke="#B5675A"/><rect x="5" y="12.4" width="15" height="4.6" rx="1" fill="#8FC1C9" stroke="#5A8F99"/>'
    + '<rect x="4" y="8" width="14" height="4.4" rx="1" fill="#F3CD74" stroke="#C79A3A"/><path d="M6 19.5H19M7.5 14.7H18M6.5 10.2H16" stroke="#FFF3D6"/>'
    + '<path d="M11 8V5" stroke="#668C51" stroke-width="1.4"/><path d="M11 5Q8 4.4 7.4 2Q10.4 2 11 5Z" fill="#9CBC79" stroke="#668C51"/><path d="M11 5Q14 4.6 15 2.4Q12 2.2 11 5Z" fill="#B7D492" stroke="#668C51"/>') },
  { id: 'pumpkin', side: 'L', name: '小南瓜', cost: 160, art: svg24(
    '<path d="M12 6.5Q9 5 5.6 7.6Q2.6 10.6 3.6 16Q5 21.6 12 21.6Q19 21.6 20.4 16Q21.4 10.6 18.4 7.6Q15 5 12 6.5Z" fill="#F4A64C" stroke="#BE6F20"/>'
    + '<path d="M12 6.8Q9 10 9.6 21.2M12 6.8Q15 10 14.4 21.2" fill="none" stroke="#D98530"/><path d="M12 6.5V3.6Q13 2.2 14.6 2.6" stroke="#668C51" stroke-width="1.7" fill="none"/>'
    + '<path d="M14.6 5.2Q17.6 3.6 18.6 5.6Q16.6 6.6 14.6 5.2Z" fill="#9CBC79" stroke="#668C51"/>') },
  { id: 'fountain', side: 'L', name: '小喷泉', cost: 240, art: svg24(
    '<path d="M2.5 16.5H21.5Q21 21.8 12 21.8Q3 21.8 2.5 16.5Z" fill="#DCD2BF" stroke="#8F7E63"/><ellipse cx="12" cy="16.5" rx="9.5" ry="1.7" fill="#BFE3EE" stroke="#8F7E63"/>'
    + '<path d="M10.5 16V10H13.5V16Z" fill="#DCD2BF" stroke="#8F7E63"/><path d="M7 9.4H17Q16.4 12.4 12 12.4Q7.6 12.4 7 9.4Z" fill="#E8DFCE" stroke="#8F7E63"/>'
    + '<path d="M12 9V3.6M12 3.6Q9.4 3.6 8.4 7M12 3.6Q14.6 3.6 15.6 7" stroke="#79BCD6" stroke-width="1.5" fill="none"/><circle cx="7.6" cy="9" r=".9" fill="#79BCD6" stroke="none"/><circle cx="16.4" cy="9" r=".9" fill="#79BCD6" stroke="none"/>') },
  { id: 'mushroom', side: 'R', name: '红蘑菇', cost: 90, art: svg24(
    '<path d="M9.4 13.6H14.6L15.2 21H8.8Z" fill="#FFF3D6" stroke="#C8A877"/><path d="M2.6 14Q2 5 12 4Q22 5 21.4 14Q12 16 2.6 14Z" fill="#E8695B" stroke="#B0453A"/>'
    + '<circle cx="8" cy="9.6" r="1.7" fill="#FFF3D6" stroke="none"/><circle cx="13.6" cy="7.6" r="1.4" fill="#FFF3D6" stroke="none"/><circle cx="17.6" cy="11.6" r="1.5" fill="#FFF3D6" stroke="none"/><path d="M4.5 21.6H19.5" stroke="#9CBC79" stroke-width="1.8"/>') },
  { id: 'pinwheel', side: 'R', name: '小风车', cost: 130, art: svg24(
    '<path d="M12 9V22" stroke="#B38B51" stroke-width="1.9"/>' + blade(0, '#F08A6A', '#B8523A') + blade(1, '#F6CF5C', '#C79A3A') + blade(2, '#7EC4C4', '#4C8F8F') + blade(3, '#F2A4BF', '#BC6F8C')
    + '<circle cx="12" cy="8" r="1.3" fill="#FFF3D6" stroke="#B38B51"/>') },
  { id: 'mailbox', side: 'R', name: '小信箱', cost: 170, art: svg24(
    '<path d="M11 12.6H13V22H11Z" fill="#C9A06A" stroke="#8A5E32"/><path d="M4.5 12.8V8.6Q4.5 3.6 10 3.6H13Q18.5 3.6 18.5 8.6V12.8Z" fill="#8FC1C9" stroke="#5A8F99"/>'
    + '<path d="M15 4.2V12.8" stroke="#5A8F99"/><path d="M18.5 5V10" stroke="#B0453A"/><path d="M18.5 5.4H22V8.4H18.5Z" fill="#E8695B" stroke="#B0453A"/>'
    + '<path d="M7.4 8.6Q7.4 7.2 8.6 7.2Q9.4 7.2 9.6 8Q9.8 7.2 10.6 7.2Q11.8 7.2 11.8 8.6Q11.8 9.8 9.6 11Q7.4 9.8 7.4 8.6Z" fill="#FFF3D6" stroke="none"/><path d="M7 22H17" stroke="#9CBC79" stroke-width="1.8"/>') },
  { id: 'tent', side: 'R', name: '小帐篷', cost: 250, art: svg24(
    '<path d="M2.5 21.6L12 4L21.5 21.6Z" fill="#FFF3D6"/><path d="M12 4L2.5 21.6H7.6Z" fill="#F08A6A"/><path d="M12 4L21.5 21.6H16.4Z" fill="#F08A6A"/>'
    + '<path d="M12 12.4L9.2 21.6H14.8Z" fill="#6E4F3A"/><path d="M2.5 21.6L12 4L21.5 21.6Z" fill="none" stroke="#B8682E"/><path d="M12 4V1.4L15 2.6L12 3.8" fill="#F6CF5C" stroke="#C79A3A"/>') }
];
