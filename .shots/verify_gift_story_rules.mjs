// 礼物剧情的长期边界：旧存档、去重、阶段门槛、出生快照与备份，不修改机器日期。
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../pet-care.js',import.meta.url),'utf8');
const plain=x=>JSON.parse(JSON.stringify(x));
const start=new Date(2026,0,1,12),day=n=>new Date(2026,0,n,12);
function setup(){
  let now=start,fail=false,writes=0;
  const store=new Map();
  class Clock extends Date{constructor(...args){super(...(args.length?args:[now.getTime()]));}}
  const storage={getItem:k=>store.get(k)??null,setItem(k,v){if(fail){fail=false;throw new Error('存储写入失败');}writes++;store.set(k,String(v));},removeItem:k=>store.delete(k)};
  const context=vm.createContext({Date:Clock,localStorage:storage});vm.runInContext(source,context);
  return {pet:context.MG_PET,store,put:(k,v)=>storage.setItem(k,JSON.stringify(v)),setDay:n=>{now=day(n);},failNext:()=>{fail=true;},writes:()=>writes};
}
function learn(e,n,from=1){for(let i=from;i<=n;i++){e.setDay(i);e.pet.recordRound(5,'round-'+i,undefined,true);e.pet.recordRound(0,'clear-'+i,undefined,true);}}
let pass=0,fail=0;
function test(name,fn){try{fn();pass++;console.log('PASS '+name);}catch(e){fail++;console.error('FAIL '+name+'\n'+e.stack);}}
test('未领养与未通关没有礼物故事，也不生成宠物存档',()=>{
  const e=setup();assert.equal(e.pet.story('gift-1'),null);assert.equal(e.pet.finishStory('gift-1'),false);assert.equal(e.store.size,0);
  e.pet.adopt();assert.equal(e.pet.claimGift(1),false);assert.equal(e.pet.get().stories.pending.length,0);
});
test('六关首次礼物各触发对应故事，重复领取与重看不会加天数或扣币',()=>{
  const e=setup();e.pet.adopt();e.put('mathgameStars',{1:1,2:1,3:1,4:1,5:1,6:1});e.put('mathgameCoins',{coins:80});
  for(let lv=1;lv<=6;lv++){assert.equal(e.pet.claimGift(lv),true);assert.equal(e.pet.claimGift(lv),false);assert.ok(e.pet.story('gift-'+lv));}
  assert.equal(e.pet.get().stories.pending.length,6);
  for(let lv=1;lv<=6;lv++){assert.equal(e.pet.finishStory('gift-'+lv),true);assert.equal(e.pet.finishStory('gift-'+lv),true);}
  const p=e.pet.get();assert.equal(p.stories.seen.length,6);assert.equal(p.stories.pending.length,0);assert.equal(p.stage,0);assert.equal(p.phase,0);
  assert.equal(e.pet.info().age,1);assert.equal(e.pet.info().studyDays,0);assert.equal(e.pet.hatch(),false);assert.equal(JSON.parse(e.store.get('mathgameCoins')).coins,80);
});
test('只点开或稍后再看不会吞未读故事；完成后重新读取不重复入队',()=>{
  const e=setup();e.pet.adopt();e.put('mathgameStars',{1:1});e.pet.claimGift(1);
  const before=e.store.get('mathgamePet');e.pet.story('gift-1');e.pet.story('gift-1');assert.equal(e.store.get('mathgamePet'),before);
  assert.equal(e.pet.get().stories.pending[0],'gift-1');e.pet.finishStory('gift-1');e.pet.get();const writes=e.writes();
  e.pet.get();e.pet.get();assert.equal(e.writes(),writes);assert.equal(e.pet.get().stories.pending.length,0);
});
test('既有六份礼物的旧宠物升级后可回看，不连续补弹历史剧情',()=>{
  const e=setup();e.pet.adopt();const p=e.pet.get();p.gifts=[1,2,3,4,5,6];delete p.stories;e.put('mathgamePet',p);
  const migrated=e.pet.get();assert.equal(migrated.stories.pending.length,0);assert.equal(migrated.stories.seen.length,6);assert.equal(e.pet.memories().length,6);
  const saved=e.store.get('mathgamePet');e.pet.get();assert.equal(e.store.get('mathgamePet'),saved);
});
test('领养前和升级前通关的礼物安静补齐，之后新礼物保留未读',()=>{
  const e=setup();e.put('mathgameStars',{1:3,2:2,3:1});e.pet.adopt();const p=e.pet.syncGifts();
  assert.deepEqual(plain(p.gifts),[1,2,3]);assert.equal(p.stories.pending.length,0);assert.equal(p.stories.seen.length,3);
  e.put('mathgameStars',{1:3,2:2,3:1,4:1});e.pet.claimGift(4);assert.deepEqual(plain(e.pet.get().stories.pending),['gift-4']);
  const f=setup();f.pet.adopt();const old=f.pet.get();delete old.stories;f.put('mathgamePet',old);f.put('mathgameStars',{1:1,2:1});
  assert.deepEqual(plain(f.pet.get().gifts),[1,2]);assert.equal(f.pet.get().stories.pending.length,0);assert.equal(f.pet.claimGift(1),false);
});
test('五个蛋期呼应各自要求已获礼物，并且能量刚好到该阶段刻度才出现',()=>{
  const events=[['rest-1',1,75],['basket-2',2,225],['song-3',3,525],['trail-4',4,675],['sea-5',5,825]];
  for(const [id,lv,at] of events){
    const n=Math.floor((at-1)/10),gifted=()=>{const x=setup();x.pet.adopt();x.put('mathgameStars',{[lv]:1});x.pet.claimGift(lv);x.pet.finishStory('gift-'+lv);return x;};
    const e=gifted();learn(e,n);assert.equal(e.pet.story(id),null,id+'能量少一点');
    const h=gifted();learn(h,n+1);assert.ok(h.pet.story(id),id+'能量刚够');assert.ok(h.pet.get().stories.pending.includes(id));
    h.pet.finishStory(id);assert.ok(!h.pet.get().stories.pending.includes(id));
    const g=setup();g.pet.adopt();learn(g,n+1);assert.equal(g.pet.story(id),null,id+'未拥有礼物');
  }
});
test('读故事、重播与收好回忆都不改变阶段，第一天集齐礼物也没有裂纹和灯光事件',()=>{
  const e=setup();e.pet.adopt();e.put('mathgameStars',{1:3,2:3,3:3,4:3,5:3,6:3});e.pet.syncGifts();
  for(let i=0;i<10;i++)for(let lv=1;lv<=6;lv++){e.pet.story('gift-'+lv);e.pet.finishStory('gift-'+lv);}
  assert.equal(e.pet.get().phase,0);assert.equal(e.pet.story('sea-5'),null);assert.equal(e.pet.story('light-6'),null);assert.equal(e.pet.hatch(),false);
});
test('出生只看攒满900点，纪念卡保存当时的礼物，后来获得的新礼物不会改写它',()=>{
  const e=setup();e.pet.adopt();e.put('mathgameStars',{1:1});e.pet.claimGift(1);learn(e,89);assert.equal(e.pet.hatch(),false);learn(e,90,90);
  assert.equal(e.pet.hatch(),true);assert.deepEqual(plain(e.pet.get().birthGifts),[1]);assert.deepEqual(plain(e.pet.memories(undefined,true).map(s=>s.level)),[1]);
  e.put('mathgameStars',{1:1,6:1});e.pet.claimGift(6);assert.deepEqual(plain(e.pet.memories().map(s=>s.level)),[1,6]);
  assert.deepEqual(plain(e.pet.memories(undefined,true).map(s=>s.level)),[1]);assert.equal(e.pet.get().stage,1);
});
test('礼物与未读/已读故事随备份恢复，清学习星星不丢失故事',()=>{
  const e=setup();e.pet.adopt();e.put('mathgameStars',{1:1,2:1});e.pet.claimGift(1);e.pet.claimGift(2);e.pet.finishStory('gift-1');
  const before=JSON.stringify(e.pet.get()),backup=e.pet.parseBackup(e.pet.backup());e.store.delete('mathgamePet');e.pet.restore(backup);
  assert.equal(JSON.stringify(e.pet.get()),before);e.store.delete('mathgameStars');assert.equal(e.pet.story('gift-1').level,1);assert.equal(e.pet.get().stories.pending[0],'gift-2');
});
test('损坏、重复、未知或尚不具备条件的故事备份在写入前被拒绝',()=>{
  const e=setup();e.pet.adopt();e.put('mathgameStars',{1:1});e.pet.claimGift(1);const original=e.pet.parseBackup(e.pet.backup()),before=[...e.store];
  for(const patch of [p=>p.stories={seen:['unknown'],pending:[]},p=>p.stories={seen:['gift-1'],pending:['gift-1']},p=>p.stories={seen:[],pending:['sea-5']},p=>p.birthGifts=[6]]){
    const backup=plain(original),p=JSON.parse(backup.data.mathgamePet);patch(p);backup.data.mathgamePet=JSON.stringify(p);
    assert.throws(()=>e.pet.restore(backup));assert.deepEqual([...e.store],before);
  }
});
test('领奖或收好回忆写入失败时不吞礼物与故事，恢复存储后可以重试',()=>{
  const e=setup();e.pet.adopt();e.put('mathgameStars',{1:1});const before=e.store.get('mathgamePet');e.failNext();
  assert.throws(()=>e.pet.claimGift(1),/存储/);assert.equal(e.store.get('mathgamePet'),before);assert.equal(e.pet.claimGift(1),true);
  const pending=e.store.get('mathgamePet');e.failNext();assert.throws(()=>e.pet.finishStory('gift-1'),/存储/);assert.equal(e.store.get('mathgamePet'),pending);
  assert.equal(e.pet.finishStory('gift-1'),true);assert.equal(e.pet.get().stories.pending.length,0);
});
test('首次礼物保存失败后自动补领仍是新故事，不冒充历史已读',()=>{
  const e=setup();e.pet.adopt();e.put('mathgameStars',{3:1});e.failNext();assert.throws(()=>e.pet.claimGift(3));
  const p=e.pet.syncGifts();assert.deepEqual(plain(p.gifts),[3]);assert.deepEqual(plain(p.stories.pending),['gift-3']);assert.equal(p.stories.seen.length,0);
});
test('欢迎灯在真正出生后才开放，攒满900点但仍是蛋时不能提前点亮',()=>{
  const e=setup();e.pet.adopt();e.put('mathgameStars',{6:1});e.pet.claimGift(6);learn(e,90);
  assert.equal(e.pet.info().ready,true);assert.equal(e.pet.story('light-6'),null);assert.ok(!e.pet.get().stories.pending.includes('light-6'));
  assert.equal(e.pet.hatch(),true);assert.ok(e.pet.story('light-6'));assert.ok(e.pet.get().stories.pending.includes('light-6'));
});
test('出生后才收到的贝壳只触发新礼物，不重新出现蛋壳裂纹；蛋期故事留作回忆',()=>{
  const e=setup();e.pet.adopt();e.put('mathgameStars',{1:1});e.pet.claimGift(1);learn(e,90);e.pet.hatch();
  assert.ok(e.pet.story('rest-1'));assert.ok(e.pet.get().stories.seen.includes('rest-1'));assert.ok(!e.pet.get().stories.pending.includes('rest-1'));
  e.put('mathgameStars',{1:1,5:1,6:1});e.pet.claimGift(5);e.pet.claimGift(6);
  assert.ok(e.pet.story('gift-5'));assert.equal(e.pet.story('sea-5'),null);assert.equal(e.pet.story('light-6'),null);
  assert.ok(!e.pet.get().stories.pending.includes('sea-5'));assert.ok(!e.pet.get().stories.pending.includes('light-6'));
});
test('旧版未出生萌蛋攒满900点正常孵化后，仍可开放欢迎灯出生故事',()=>{
  const e=setup();e.put('mathgamePet',{adopted:true,exp:10,gifts:[6]});assert.equal(e.pet.get().stage,0);
  learn(e,90);assert.equal(e.pet.hatch(),true);assert.ok(e.pet.story('light-6'));assert.ok(e.pet.get().stories.pending.includes('light-6'));
});
test('旧已出生档首次升级冻结纪念，之后领取礼物不改写；成年宠物不再入队蛋期故事',()=>{
  for(const old of [{adopted:true,exp:160,gifts:[1]},Object.assign(setup().pet.adopt(),{stage:1,hatchDay:'2026-01-01',gifts:[1]})]){
    const e=setup();delete old.stories;e.put('mathgamePet',old);assert.deepEqual(plain(e.pet.get().birthGifts),[1]);
    e.put('mathgameStars',{1:1,2:1});e.pet.claimGift(2);assert.deepEqual(plain(e.pet.memories(undefined,true).map(s=>s.level)),[1]);
    learn(e,60);e.setDay(90);assert.equal(e.pet.story('rest-1'),null);assert.equal(e.pet.story('basket-2'),null);
  }
});
console.log('GIFT STORY RULES: pass='+pass+' fail='+fail);process.exitCode=fail?1:0;
