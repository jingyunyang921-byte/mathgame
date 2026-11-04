// 数宝成长旅行：免费照顾、旧宠物迁移、暖窝多视口、出生命名与挂件。PET_DEVICE=1 可验APK。
import { petBrowser, verdicts } from './pet_browser.mjs';
const b = await petBrowser(), { check: P, finish } = verdicts();
try {
  await b.nav(b.menu); await b.preserve();
  const m = await b.ev(`(() => {
    document.querySelectorAll('.locked-modal.show').forEach(n => n.classList.remove('show'));
    localStorage.removeItem('mathgamePet'); localStorage.removeItem('mathgameStars');setCoins(200);
    showPet();
    const visible = id => getComputedStyle(document.getElementById(id)).display !== 'none';
    const href = () => { const u = document.querySelector('#petArt use'); return u ? u.getAttribute('href') : (document.getElementById('petArt').classList.contains('egg-view') ? '#pet-egg' : null); };
    const before = {art:href(),adopt:visible('petAdoptBtn'),care:visible('petFeedBtn')};
    adoptPet();
    const adopted = getPet();
    for(let i=0;i<8;i++)feedPet();
    const after = getPet(), coins = getCoins();
    choosePetDecor('peach');
    const decor = {pet:getPet(),coins:getCoins(),pill:document.getElementById('coinCount').textContent};
    choosePetDecor('peach');const repeatCoins=getCoins();
    setCoins(0);renderPet();
    const freeAtZero=!document.getElementById('petFeedBtn').disabled;
    localStorage.setItem('mathgamePet',JSON.stringify({adopted:true,exp:60}));renderPet();
    const baby={art:href(),pet:getPet()};
    localStorage.setItem('mathgamePet',JSON.stringify({adopted:true,exp:160}));renderPet();
    const adult={art:href(),pet:getPet()};
    localStorage.removeItem('mathgamePet');MG_PET.adopt();
    const newer=MG_PET.get();newer.exp=160;localStorage.setItem('mathgamePet',JSON.stringify(newer));renderPet();
    return {before,adopted,after,coins,decor,repeatCoins,freeAtZero,baby,adult,newArt:href(),newStage:getPet().stage};
  })()`);
  P(m.before.art === '#pet-egg' && m.before.adopt && !m.before.care, '未领养显示萌蛋与领养入口');
  P(m.adopted.version === 2 && m.adopted.stage === 0 && m.adopted.adopted, '领养写入新版蛋存档');
  P(m.after.stage === 0 && m.after.exp === 0 && m.after.days.length === 0 && m.coins === 200, '摸蛋8次不扣币、不加经验或学习日、不孵化');
  P(m.decor.pet.decor === 'peach' && m.decor.coins === 150 && m.decor.pill === '150' && m.repeatCoins === 150, '窝饰首次扣50币且顶栏同步，重复选择免费');
  P(m.freeAtZero, '没有星币也能免费照顾');
  P(m.baby.art === '#pet-baby' && m.baby.pet.stage === 1 && m.baby.pet.birthSeen, '旧幼年保留形态且不自动重播出生');
  P(m.adult.art === '#pet-adult' && m.adult.pet.stage === 2, '旧成年保留形态');
  P(m.newArt === '#pet-egg' && m.newStage === 0, '新版160旧经验不会让蛋跳级');
  const cheer = await b.ev(`(async () => {
    showPet();const art=document.getElementById('petArt'),out=[];
    for(let i=0;i<4;i++){feedPet();out.push(art.getAnimations().map(a=>a.animationName+'@'+Math.round(a.currentTime)).join());await new Promise(r=>setTimeout(r,750));}
    return out;
  })()`);
  P(cheer.length === 4 && cheer.every(s => s === 'petCheer@0'), '连点摸一摸，每一次都重播弹跳动画（SVG不能靠offsetWidth强制重排）', cheer);
  const tabs = await b.ev(`({ tabs: document.querySelectorAll('#petModal .pet-tabs [role=tab]').length, panels: document.querySelectorAll('#petModal .pet-panel').length, parent: !!document.getElementById('petTabParent') || !!document.getElementById('petPanelParent') || !!document.getElementById('petBackupText'), ui: typeof exportPetBackup + typeof importPetBackup, data: typeof MG_PET.backup + typeof MG_PET.restore })`);
  P(tabs.tabs === 3 && tabs.panels === 3 && !tabs.parent && tabs.ui === 'undefinedundefined' && tabs.data === 'functionfunction', '小窝只剩 今天/小窝/手记 三个标签，家长页和备份界面已去除，数据层 backup/restore 保留', tabs);

  for (const [w,h] of (b.device ? [[1000,576]] : [[1000,576],[900,500],[412,915]])) {
    await b.viewport(w,h);
    for (const tab of ['Today','Nest','Log']) {
      const r = await b.ev(String.raw`(() => {
        showPet();petTab('${tab}');
        const card=document.querySelector('#petModal .pet-card'),r=card.getBoundingClientRect();
        document.getElementById('petFeedBtn').scrollIntoView({block:'nearest'});
        const f=document.getElementById('petFeedBtn').getBoundingClientRect();
        const styles=[...document.querySelectorAll('style')].map(n=>n.textContent).join('').replace(/\/\*[\s\S]*?\*\//g,'');
        return {card:r.top>=0&&r.bottom<=innerHeight+1&&r.left>=0&&r.right<=innerWidth+1,
          footer:f.top>=r.top&&f.bottom<=r.bottom+1,
          centered:getComputedStyle(document.getElementById('petFeedBtn')).justifyContent==='center',
          panel:!document.getElementById('petPanel${tab}').hidden,
          buttons:document.querySelectorAll('.topbar-actions .icon-btn').length,
          dangling:[...document.querySelectorAll('use')].map(u=>u.getAttribute('href')).filter(h=>h&&!document.querySelector(h)),
          banned:styles.match(/paint-order|:has\(|@layer|color-mix\(|oklch\(|\d(?:dvh|svh|lvh)/g)};
      })()`);
      P(r.card && r.footer && r.centered && r.panel, `${w}×${h} ${tab}卡片及居中的照顾按钮可见`, r);
      P(r.buttons === 4 && r.dangling.length === 0 && r.banned === null, '四按钮、SVG和Chrome91兼容检查', r);
    }
    await b.shot(`pet_parent_${w}x${h}`);
  }
  const reset = await b.ev(`(async () => {
    setCoins(100);MG_PET.recordRound(5,'reset-test');
    localStorage.setItem('mathgameStars',JSON.stringify({1:1}));renderPet();choosePetDecor('peach');
    const before=localStorage.getItem('mathgamePet'),confirm=mgConfirm;
    mgConfirm=async()=>true;
    try {await resetProgress();}finally{mgConfirm=confirm;}
    renderPet();return {same:before===localStorage.getItem('mathgamePet'),coins:getCoins(),pet:getPet(),
      stars:localStorage.getItem('mathgameStars'),visitor:document.getElementById('petVisitor').textContent};
  })()`);
  P(reset.same && reset.coins===50 && reset.stars===null && reset.pet.days.length===1 && reset.pet.gifts.includes(1) && reset.pet.decor==='peach', '普通学习重置保留星币、数宝学习日、礼物及窝饰', reset);
  P(reset.visitor.includes('小兔'), '重置后已结识朋友仍会来访', reset.visitor);

  const born = await b.ev(`(() => {
    localStorage.removeItem('mathgamePet');const p=MG_PET.adopt(),today=new Date();
    const ago=n=>new Date(today.getFullYear(),today.getMonth(),today.getDate()-n,12);
    p.adoptedDay=MG_PET.dayKey(ago(89));p.lastDay=MG_PET.dayKey(today);
    p.days=Array.from({length:60},(_,i)=>MG_PET.dayKey(ago(89-i)));p.xp=900;p.gifts=[1,3];
    localStorage.setItem('mathgamePet',JSON.stringify(p));localStorage.removeItem('mathgameStars');
    MG_PET.info();const before=localStorage.getItem('mathgamePet');
    const rollback=MG_PET.hatch(ago(90))===false && localStorage.getItem('mathgamePet')===before;
    const backup=MG_PET.parseBackup(MG_PET.backup()).data.mathgamePet===before;
    maybeShowPetBirth();
    const modal=document.getElementById('petBirthModal');
    const r={rollback,backup,shown:modal.classList.contains('show'),stage:getPet().stage,
      friends:document.querySelectorAll('#petBirthFriends use').length,seen:getPet().birthSeen};
    document.getElementById('petBirthName').value='团团';hidePetBirth();
    r.name=getPet().name;showPetBirth(true);r.replay=modal.classList.contains('show');hidePetBirth();
    localStorage.removeItem('mathgameBadges');r.badge=evaluateBadges().some(x=>x.id==='pet');
    return r;
  })()`);
  P(born.rollback && born.backup, '满足出生条件后回拨日期仍保留蛋，导出备份可以恢复', born);
  P(born.shown && born.stage === 1 && born.seen && born.friends === 2, '满足双条件出生，只邀请已结识的两位朋友', born);
  P(born.name === '团团' && born.replay && born.badge, '命名、回看和出生勋章有效', born);

  await b.boot(1);
  const g = await b.ev(`(() => {
    localStorage.removeItem('mathgamePet');mgPetReact('correct');
    const none=!document.getElementById('mg-pet-buddy');MG_PET.adopt();mgPetReact('correct');
    const buddy=document.getElementById('mg-pet-buddy'),art=()=>buddy.querySelector('use').getAttribute('href');
    const egg=art(),cheer=buddy.classList.contains('cheer');mgPetReact('wrong');const aww=buddy.classList.contains('aww');
    localStorage.setItem('mathgamePet',JSON.stringify({adopted:true,exp:60}));mgPetReact('correct');const baby=art();
    localStorage.setItem('mathgamePet',JSON.stringify({adopted:true,exp:160}));mgPetReact('correct');const adult=art();
    document.body.classList.add('mg-stage');const hidden=getComputedStyle(buddy).display==='none';document.body.classList.remove('mg-stage');
    return {none,egg,cheer,aww,baby,adult,hidden,z:parseInt(getComputedStyle(buddy).zIndex,10),pe:getComputedStyle(buddy).pointerEvents};
  })()`);
  P(g.none && g.egg === '#pet-egg' && g.cheer && g.aww, '未领养无挂件，领养后显示蛋并响应答对答错', g);
  P(g.baby === '#pet-baby' && g.adult === '#pet-adult', '游戏挂件沿用迁移后的宠物形态', g);
  P(g.hidden && g.z <= 480 && g.pe === 'none', '听算隐藏挂件，视算挂件不挡操作与结算', g);
  P(b.errors.length === 0, '无浏览器脚本异常', b.errors);
} finally {
  try { await b.restore(); } finally { await b.close(); }
}
finish('PET TRAVEL');
