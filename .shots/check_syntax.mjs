// 快速语法自检：抽出 index.html（或传入的文件）里的经典 <script> 块，用 new Function 解析，
// 只查语法（不解析 document/window 等浏览器全局的引用）。改完 onresult/防抖后跑一遍再打包。
import { readFileSync } from 'node:fs';
const file = process.argv[2] || 'index.html';
const html = readFileSync(file, 'utf8');
const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
let m, i = 0, errs = 0;
while ((m = re.exec(html))) {
  const attrs = m[1] || '';
  if (/\bsrc\s*=/.test(attrs)) continue;            // 外链脚本
  if (/\btype\s*=/.test(attrs) && !/text\/javascript|application\/javascript/i.test(attrs)) continue; // 非经典 JS（module/json 等）
  const code = m[2];
  i++;
  try { new Function(code); }
  catch (e) { errs++; console.log(`script #${i} SYNTAX ERROR: ${e.message}`); }
}
console.log(errs ? `FAIL: ${errs} 个 inline script 块有语法错误` : `OK: ${i} 个 inline script 块全部通过语法解析`);
process.exit(errs ? 1 : 0);
