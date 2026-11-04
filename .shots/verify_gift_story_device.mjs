// 真机专项串行执行，必须显式传入本轮安装前的新备份；外层兜底恢复并另连核验。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import { petBrowser } from './pet_browser.mjs';

process.env.PET_DEVICE = '1';
const backupFile = process.argv[2];
if (!backupFile) throw new Error('请传入本轮安装前的完整存档备份路径');
const original = JSON.parse(readFileSync(backupFile, 'utf8'));
for (const key of ['local', 'session']) {
  if (!original[key] || Array.isArray(original[key]) || typeof original[key] !== 'object' ||
      Object.values(original[key]).some(value => typeof value !== 'string'))
    throw new Error('备份格式不完整：' + key);
}
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const report = { backupFile, started: new Date().toISOString(), tests: [], restored: false, verified: false };
mkdirSync('.shots/out', { recursive: true });
const reportFile = '.shots/out/gift_device_report_' + stamp + '.json';
const scripts = [
  'verify_gift_story.mjs',
  'verify_pet.mjs',
  'verify_chest.mjs',
  'verify_chest_claim.mjs',
  'verify_chest_stage.mjs',
  'verify_chest_layout.mjs',
  'verify_travel_result_layout.mjs',
  'verify_pet_learning.mjs',
  'verify_story.mjs',
  'verify_intro_tts.mjs'
];
const saveReport = () => writeFileSync(reportFile, JSON.stringify(report, null, 2));
saveReport();
let failed = false;
try {
  for (const script of scripts) {
    const logFile = '.shots/out/device_' + script.replace('.mjs', '') + '_' + stamp + '.log';
    console.log('START ' + script);
    const result = await new Promise(resolve => {
      let output = '';
      const child = spawn(process.execPath, ['.shots/' + script], {
        env: { ...process.env, PET_DEVICE: '1' }, stdio: ['ignore', 'pipe', 'pipe']
      });
      let timedOut = false;
      const timer = setTimeout(() => { timedOut = true; child.kill(); }, 300000);
      child.stdout.on('data', chunk => { output += chunk; });
      child.stderr.on('data', chunk => { output += chunk; });
      child.on('error', error => { output += String(error); });
      child.on('close', (code, signal) => {
        clearTimeout(timer);
        writeFileSync(logFile, output);
        resolve({ script, code: timedOut ? 124 : code, signal, logFile, summary: output.trim().split(/\r?\n/).at(-1) || '' });
      });
    });
    report.tests.push(result); saveReport();
    console.log((result.code === 0 ? 'PASS ' : 'FAIL ') + script + ' :: ' + result.summary);
    if (result.code !== 0) { failed = true; break; }
  }
} catch (error) {
  failed = true; report.error = String(error); console.error(error);
} finally {
  let b;
  try {
    b = await petBrowser();
    const restoreRaw = () => b.ev(`(() => {
      const saved=${JSON.stringify(original)};
      localStorage.clear();sessionStorage.clear();
      for(const [key,value] of Object.entries(saved.local))localStorage.setItem(key,value);
      for(const [key,value] of Object.entries(saved.session))sessionStorage.setItem(key,value);
      return true;
    })()`);
    await b.ev("window.MG_PET_STORY && MG_PET_STORY.close();true");
    await b.send('Emulation.setEmulatedMedia', { features: [] });
    await restoreRaw();
    // 先让菜单显示原存档，再恢复原始字节，避免初始化迁移影响独立对比。
    try { await b.nav(b.menu); }
    finally { await restoreRaw(); }
    report.restored = true;
  } catch (error) {
    failed = true; report.restoreError = String(error); console.error('RESTORE FAIL ' + error);
  } finally {
    if (b) await b.close();
    saveReport();
  }
  let verifier;
  try {
    verifier = await petBrowser();
    const current = await verifier.ev('({local:{...localStorage},session:{...sessionStorage}})');
    report.verified = isDeepStrictEqual(current, original);
    report.storageKeys = { local: Object.keys(current.local).length, session: Object.keys(current.session).length };
    if (!report.verified) { failed = true; console.error('VERIFY FAIL 原存档与独立读取结果不一致'); }
    else console.log('STORAGE RESTORE PASS 独立连接逐键核对原始 localStorage/sessionStorage 完全一致');
  } catch (error) {
    failed = true; report.verifyError = String(error); console.error('VERIFY FAIL ' + error);
  } finally {
    if (verifier) await verifier.close();
    report.finished = new Date().toISOString(); saveReport();
  }
}
console.log('REPORT=' + reportFile);
console.log('GIFT DEVICE: tests=' + report.tests.length + ' fail=' + Number(failed) + ' restored=' + report.restored + ' verified=' + report.verified);
process.exitCode = failed ? 1 : 0;
