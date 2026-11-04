// 全量去AI化审计（只读）：首页 menu.html + 游戏页 index.html。
// 扫 4 类：残留 emoji 清单 / 硬底座 0 Npx 0 / 非160deg装饰渐变 / 弹窗提示元素定位。
import { readFileSync, existsSync } from 'fs';
const FILES = ['menu.html', 'index.html'];
// emoji-ish：astral 代理对 + 常见 BMP 符号区（箭头/技术符号/dingbats/杂项符号）
const EMO = /[←-⇿⌀-➿⬀-⯿☀-⛿⤀-⥿]|[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
const PED = /box-shadow:[^;"}]*?\b0\s+[1-9][0-9]?px\s+0(px)?\s+(#|rgb)/;
const GRAD = /linear-gradient\(\s*(135|45|225|315|90|180)deg/;
const POP = /(id|class)\s*=\s*["'][^"']*(overlay|modal|toast|dialog|banner|popup|tooltip|confirm|intro|ready|countdown|hint|vtune|error-card|snackbar)[^"']*["']/i;
for (const f of FILES) {
  if (!existsSync(f)) { console.log('\n##### ' + f + ' —— 不存在，跳过'); continue; }
  const lines = readFileSync(f, 'utf8').split(/\r?\n/);
  console.log('\n##### ' + f + ' (' + lines.length + ' 行) #####');
  // 1) emoji 清单
  const emap = new Map();
  lines.forEach((ln, i) => { const m = ln.match(EMO); if (m) for (const c of m) { if (c === '️') continue; const e = emap.get(c) || { n: 0, L: [] }; e.n++; if (e.L.length < 6) e.L.push(i + 1); emap.set(c, e); } });
  console.log('\n[1] emoji 清单（字符 ×次数  行号）:');
  [...emap.entries()].sort((a, b) => b[1].n - a[1].n).forEach(([c, e]) => console.log('   ' + c + '  ×' + e.n + '  @' + e.L.join(',') + (e.n > 6 ? '…' : '')));
  // 2) 硬底座
  const peds = []; lines.forEach((ln, i) => { if (PED.test(ln)) peds.push((i + 1) + ': ' + ln.trim().slice(0, 90)); });
  console.log('\n[2] 硬底座 0 Npx 0（应=0）: ' + peds.length); peds.forEach(p => console.log('   ' + p));
  // 3) 非160装饰渐变
  const grads = []; lines.forEach((ln, i) => { if (GRAD.test(ln)) grads.push((i + 1) + ': ' + ln.trim().slice(0, 100)); });
  console.log('\n[3] 非160deg 渐变（判物理/装饰）: ' + grads.length); grads.forEach(p => console.log('   ' + p));
  // 4) 弹窗提示元素
  const pops = []; lines.forEach((ln, i) => { if (POP.test(ln)) pops.push((i + 1) + ': ' + ln.trim().slice(0, 100)); });
  console.log('\n[4] 弹窗/提示元素定位: ' + pops.length); pops.forEach(p => console.log('   ' + p));
  // 5) 一致性计数（内联字面 radius/shadow 未 token 化）
  let litR = 0, litS = 0; lines.forEach(ln => { (ln.match(/border-radius:\s*\d/g) || []).forEach(() => litR++); (ln.match(/box-shadow:\s*0/g) || []).forEach(() => litS++); });
  console.log('\n[5] 一致性：内联字面 border-radius:Npx = ' + litR + ' 处；box-shadow:0… 字面 = ' + litS + ' 处（含软阴影，仅供参考）');
}
console.log('\n=== AUDIT DONE ===');
