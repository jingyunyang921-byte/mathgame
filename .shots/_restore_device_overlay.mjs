// 恢复安装前备份并另起连接逐键核验（localStorage + sessionStorage 完全一致）。
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { petBrowser } from './pet_browser.mjs';
process.env.PET_DEVICE = '1';
const backupFile = process.argv[2];
if (!backupFile) throw new Error('请传入安装前的完整存档备份路径');
const original = JSON.parse(readFileSync(backupFile, 'utf8'));
const write = b => b.ev(`(() => {
  const saved=${JSON.stringify(original)};
  localStorage.clear();sessionStorage.clear();
  for(const [key,value] of Object.entries(saved.local))localStorage.setItem(key,value);
  for(const [key,value] of Object.entries(saved.session))sessionStorage.setItem(key,value);
  return true;
})()`);
let b = await petBrowser();
try {
  await b.ev("window.MG_PET_STORY && MG_PET_STORY.close();true");
  await b.send('Emulation.setEmulatedMedia', { features: [] });
  await write(b);
  try { await b.nav(b.menu); } finally { await write(b); }
} finally { await b.close(); }
await new Promise(r => setTimeout(r, 300));
const v = await petBrowser();
try {
  const current = await v.ev('({local:{...localStorage},session:{...sessionStorage}})');
  const same = isDeepStrictEqual(current, original);
  console.log('RESTORE keys local=' + Object.keys(current.local).length + ' session=' + Object.keys(current.session).length);
  console.log(same ? 'STORAGE RESTORE PASS 独立连接逐键核对完全一致' : 'STORAGE RESTORE FAIL 与原备份不一致');
  if (!same) {
    const keys = new Set([...Object.keys(current.local), ...Object.keys(original.local)]);
    for (const k of keys) if (current.local[k] !== original.local[k]) console.log('DIFF local.' + k);
    const sk = new Set([...Object.keys(current.session), ...Object.keys(original.session)]);
    for (const k of sk) if (current.session[k] !== original.session[k]) console.log('DIFF session.' + k);
    process.exitCode = 1;
  }
} finally { await v.close(); }
