// 安装前备份真机当前完整存档（localStorage + sessionStorage），只读不改。
import { writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { petBrowser } from './pet_browser.mjs';
process.env.PET_DEVICE = '1';
mkdirSync('.shots/out', { recursive: true });
const b = await petBrowser();
try {
  const snap = await b.ev('({local:{...localStorage},session:{...sessionStorage}})');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = '.shots/out/device_before_' + (process.argv[2] || 'overlay_simplify') + '_' + stamp + '.json';
  const raw = JSON.stringify(snap, null, 2);
  writeFileSync(file, raw);
  const hash = createHash('sha256').update(raw).digest('hex');
  console.log('BACKUP=' + file);
  console.log('KEYS local=' + Object.keys(snap.local).length + ' session=' + Object.keys(snap.session).length);
  console.log('SHA256=' + hash);
} finally { await b.close(); }
