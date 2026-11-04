// 小窝弹窗成长能量截图（本地）：node .shots/_shot_pet_energy.mjs [state] [WxH,...]
import { petBrowser } from './pet_browser.mjs';
const states = (process.argv[2] || 'mid').split(',');
const sizes = (process.argv[3] || '960x576').split(',').map(s => s.split('x').map(Number));
const b = await petBrowser();
await b.preserve().catch(() => {});
const seed = (name) => `(() => {
  const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return MG_PET.dayKey(x); };
  const mk = (age, days, extra) => Object.assign({ version: 2, adopted: true, exp: 0, stage: 0, adoptedDay: d(1 - age), lastDay: d(0),
    days: Array.from({ length: days }, (_, i) => d(1 - age + i)), phase: 0, daily: { date: d(0), correct: 0, rounds: [] }, gifts: [], decor: 'leaf', decors: ['leaf'],
    name: '数宝', hatchDay: '', birthSeen: false, affection: 0, stories: { seen: [], pending: [] } }, extra);
  const S = {
    fresh: [null, {}],
    mid: [mk(22, 17, { daily: { date: d(0), correct: 3, rounds: ['a', 'b', 'c'] }, gifts: [1, 2] }), { 1: 3, 2: 3 }],
    done: [mk(40, 28, { daily: { date: d(0), correct: 5, rounds: ['a'] }, gifts: [1, 2, 3, 4] }), { 1: 3, 2: 3, 3: 3, 4: 3 }],
    wait: [mk(10, 17, { gifts: [1] }), { 1: 3 }],
    ready: [mk(92, 61, { gifts: [1, 2, 3, 4, 5, 6] }), { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3 }],
    baby: [mk(100, 61, { stage: 1, hatchDay: d(0), birthSeen: true, gifts: [1, 2, 3, 4, 5, 6], birthGifts: [1, 2, 3, 4, 5, 6] }), { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3 }]
  };
  const [pet, stars] = S['${name}'];
  localStorage.removeItem('mathgamePet'); localStorage.removeItem('mathgameStars');
  if (pet) { localStorage.setItem('mathgamePet', JSON.stringify(pet)); localStorage.setItem('mathgameStars', JSON.stringify(stars)); }
  const p = MG_PET.get(); (p.stories.pending || []).forEach(id => MG_PET.finishStory(id));
  document.querySelectorAll('.locked-modal.show,.pet-story-modal.show').forEach(m => m.classList.remove('show'));
  showPet(); return true; })()`;
try {
  for (const [w, h] of sizes) for (const st of states) {
    await b.viewport(w, h);
    await b.nav(b.menu); await b.sleep(500);
    await b.ev(seed(st)); await b.sleep(350);
    const m = await b.ev(`(() => { const c = document.querySelector('#petModal .pet-card'); const r = document.getElementById('petEnergy').getBoundingClientRect();
      return { st: '${st}', cardH: c.clientHeight, cardScroll: c.scrollHeight, energyBottom: Math.round(r.bottom), homeBottom: Math.round(document.querySelector('.pet-home').getBoundingClientRect().bottom), footTop: Math.round(document.querySelector('.pet-footer').getBoundingClientRect().top), vh: innerHeight }; })()`);
    console.log(w + 'x' + h, JSON.stringify(m));
    await b.shot(`pet_energy_${st}_${w}x${h}`);
    if (st === 'mid') { await b.ev(`petTab('Today')`); }
  }
} finally { await b.restore().catch(() => {}); await b.close(); }
