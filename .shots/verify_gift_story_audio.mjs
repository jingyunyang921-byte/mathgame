// 通过故事的公开互动入口验证两页静音、短音效自然结束和离页释放；不启动浏览器。
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const care=read('pet-care.js'),story=read('pet-story.js');
function setup(page,sfx=3,rejectResume=false){
  const html=read(page),store=new Map(),nodes=new Map(),events={},contexts=[];
  const localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v))};
  localStorage.setItem('mathgameSettings',JSON.stringify({sfx}));
  let document;
  function node(){const classes=new Set();return {hidden:false,isConnected:true,textContent:'',innerHTML:'',classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k)},setAttribute(){},addEventListener(){},scrollIntoView(){},focus(){document.activeElement=this;},querySelector(selector){return element(selector);}};}
  function element(selector){if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector);}
  document={hidden:false,activeElement:null,body:{appendChild:m=>nodes.set('#petStoryModal',m)},createElement:()=>node(),getElementById:id=>nodes.get('#'+id)||null,querySelector:element,addEventListener:(name,fn)=>events[name]=fn};
  ['petStoryEyebrow','petStoryTitle','petStoryScene','petStoryText','petStoryResponse','petStoryLater','petStoryAction'].forEach(id=>element('#'+id));
  class AudioContext{
    constructor(){this.currentTime=0;this.sampleRate=8;this.destination={};this.sources=[];this.gains=[];this.closeCalls=0;contexts.push(this);}
    resume(){return rejectResume?Promise.reject(new Error('无法播放')):Promise.resolve();}
    close(){this.closeCalls++;return Promise.resolve();}
    createOscillator(){const s={frequency:{value:0},connect(){},start(){},stop(){}};this.sources.push(s);return s;}
    createGain(){const levels=[];this.gains.push(levels);return {connect(){},gain:{setValueAtTime:v=>levels.push(v),linearRampToValueAtTime:v=>levels.push(v),exponentialRampToValueAtTime:v=>levels.push(v)}};}
    createBuffer(){return {getChannelData:()=>new Float32Array(8)};}
    createBufferSource(){const s={connect(){},start(){}};this.sources.push(s);return s;}
    createBiquadFilter(){return {frequency:{value:0},connect(){}};}
  }
  const root={localStorage,document,AudioContext,addEventListener:(name,fn)=>events[name]=fn};root.window=root;
  const context=vm.createContext(root);vm.runInContext(care,context);vm.runInContext(story,context);
  const first=page==='menu.html'?'function normLevel(':'function mgLevel(';
  const last=page==='menu.html'?'function saveSettings(':'// 保存每关最高星级';
  const start=html.indexOf(first),end=page==='menu.html'?html.indexOf(last,start):html.indexOf('function mgSaveStars(',start);
  assert.ok(start>=0&&end>start,'设置函数可定位');vm.runInContext(html.slice(start,end),context);
  root.MG_PET.adopt();localStorage.setItem('mathgameStars',JSON.stringify({3:1,5:1}));root.MG_PET.claimGift(3);root.MG_PET.claimGift(5);
  return {root,contexts,events,document,play(level){assert.equal(root.MG_PET_STORY.show('gift-'+level),true);element('#petStoryAction').onclick();},end(){const sources=contexts.at(-1).sources;for(const s of sources)s.onended?.();}};
}
let pass=0,fail=0;
async function test(name,fn){try{await fn();pass++;console.log('PASS '+name);}catch(e){fail++;console.error('FAIL '+name+'\n'+e.stack);}}
for(const page of ['menu.html','index.html']){
  await test(page+'：两种短音效遵守现有静音和兼容设置',()=>{
    for(const value of [0,false,'0',null,-1])for(const level of [3,5]){const e=setup(page,value);e.play(level);assert.equal(e.contexts.length,0,JSON.stringify(value));}
  });
  await test(page+'：音量档位沿用设置归一化，旋律和海浪自然结束后释放',()=>{
    for(const value of [1,2,3,true,'2',9])for(const level of [3,5]){
      const e=setup(page,value);e.play(level);const ctx=e.contexts[0];assert.ok(ctx);assert.equal(ctx.closeCalls,0);
      const expected=(value===true?3:Math.min(3,Number(value)))/3;assert.ok(Math.abs(Math.max(...ctx.gains.flat())-(level===3?.08:.12)*expected)<1e-9);
      e.end();assert.equal(ctx.closeCalls,1);e.root.MG_PET_STORY.close();assert.equal(ctx.closeCalls,1);
    }
  });
  await test(page+'：关闭、换故事、后台和离页都及时释放，旧回调不会关闭新音效',()=>{
    for(const reason of ['close','switch','background','pagehide']){
      const e=setup(page);e.play(3);const old=e.contexts[0];
      if(reason==='close')e.root.MG_PET_STORY.close();
      if(reason==='switch')e.root.MG_PET_STORY.show('gift-5');
      if(reason==='background'){e.document.hidden=true;e.events.visibilitychange();}
      if(reason==='pagehide')e.events.pagehide();
      assert.equal(old.closeCalls,1,reason);e.play(5);for(const s of old.sources)s.onended?.();assert.equal(e.contexts[1].closeCalls,0);e.end();assert.equal(e.contexts[1].closeCalls,1);
    }
  });
  await test(page+'：音频恢复失败后释放资源，绘本仍可继续阅读',async()=>{
    const e=setup(page,3,true);e.play(3);await Promise.resolve();await Promise.resolve();assert.equal(e.contexts[0].closeCalls,1);assert.equal(e.root.MG_PET_STORY.isOpen(),true);
  });
}
console.log('GIFT STORY AUDIO: pass='+pass+' fail='+fail);process.exitCode=fail?1:0;
