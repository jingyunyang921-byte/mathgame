// 最终真机收尾：先核对长期存档，只恢复测试切换的会话关卡/模式，再核对整份原快照。
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { petBrowser } from './pet_browser.mjs';
process.env.PET_DEVICE = '1';
const original = JSON.parse(readFileSync(new URL('./out/device_before_growth.json', import.meta.url), 'utf8'));
const b = await petBrowser();
try {
  const current = await b.ev('({local:{...localStorage},session:{...sessionStorage}})');
  assert.deepEqual(current.local, original.local, '长期存档与原快照不同，停止自动收尾');
  const keys = [...new Set([...Object.keys(original.session), ...Object.keys(current.session)])];
  const changed = keys.filter(k => original.session[k] !== current.session[k]);
  assert.ok(changed.every(k => ['gameLevel', 'gameMode'].includes(k)), '会话差异超出测试切换的关卡和模式，停止恢复');
  await b.ev(`(() => {
    const s=${JSON.stringify(original.session)};
    for(const k of ['gameLevel','gameMode'])
      if(Object.prototype.hasOwnProperty.call(s,k))sessionStorage.setItem(k,s[k]);
      else sessionStorage.removeItem(k);
    return true;
  })()`);
  const apk = await b.ev(`(async () => {
    const game=await(await fetch('./game.html',{cache:'no-store'})).text();
    return {
      dateGuard:MG_PET.hatch.toString().includes('today < v.pet.lastDay'),
      backup:!!MG_PET.parseBackup(MG_PET.backup()),
      cardWidth:game.includes('max-width: 380px !important'),
      cardHeight:game.includes('max-height: calc(100vh - 24px); overflow-y: auto;')
    };
  })()`);
  assert.ok(Object.values(apk).every(Boolean), '实际安装包的最终修复或备份解析不符');
  assert.deepEqual(await b.ev('({local:{...localStorage},session:{...sessionStorage}})'), original);
  console.log('FINAL APK CHECK: ' + JSON.stringify(apk));
  console.log('DEVICE STORAGE RESTORED: 原有 ' + Object.keys(original.local).length + ' 个长期存档键及全部会话数据逐项一致');
} finally {
  await b.close();
}
