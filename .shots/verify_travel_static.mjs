// 无需浏览器：检查双端导航不变量、共享模块同步及页面内联JavaScript语法。
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8').replace(/\r\n/g,'\n');
let fail=0;
const test=(name,fn)=>{try{fn();console.log('PASS '+name);}catch(e){fail++;console.error('FAIL '+name+'\n'+e.message);}};
function equalTwin(actual, expected) {
  if (actual === expected) return;
  const a=actual.split('\n'),b=expected.split('\n');
  const line=a.findIndex((s,i)=>s!==b[i]);
  throw new Error('首处差异在第 '+(line+1)+' 行：\nAPK：'+a[line]+'\n根页：'+b[line]);
}
const menu=read('menu.html'),game=read('index.html');
test('菜单导航仅1处，APK菜单与根菜单一致',()=>{
  assert.equal((menu.match(/index\.html/g)||[]).length,1);
  equalTwin(read('www/index.html'),menu.split('index.html').join('game.html'));
});
test('游戏导航仅6处，APK游戏与根游戏一致',()=>{
  assert.equal((game.match(/menu\.html/g)||[]).length,6);
  equalTwin(read('www/game.html'),game.split('menu.html').join('index.html'));
});
test('宠物共享模块完全同步且语法有效',()=>{
  const source=read('pet-care.js');assert.equal(read('www/pet-care.js'),source);
  new vm.Script(source,{filename:'pet-care.js'});
});
test('礼物剧情脚本与样式完全同步且语法有效',()=>{
  for(const file of ['pet-story.js','pet-story.css'])assert.equal(read('www/'+file),read(file));
  new vm.Script(read('pet-story.js'),{filename:'pet-story.js'});
});
for(const file of ['menu.html','index.html','www/index.html','www/game.html'])test(file+'内联脚本语法与共享模块加载',()=>{
  const source=read(file);let count=0;
  for(const m of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
    if(/\bsrc\s*=/.test(m[1]))continue;
    if(/\btype\s*=\s*["'](?:application\/json|application\/ld\+json)["']/.test(m[1]))continue;
    new vm.Script(m[2],{filename:file+':script-'+(++count)});
  }
  assert.ok(count>0);assert.equal((source.match(/<script src="pet-care\.js"><\/script>/g)||[]).length,1);
  assert.equal((source.match(/<script src="pet-story\.js"><\/script>/g)||[]).length,1);
  assert.equal((source.match(/<link rel="stylesheet" href="pet-story\.css">/g)||[]).length,1);
});
console.log('TRAVEL STATIC: fail='+fail);process.exitCode=fail?1:0;
