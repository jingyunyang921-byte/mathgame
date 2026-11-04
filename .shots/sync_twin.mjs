// 孪生同步：index.html(游戏 master) → www/game.html，仅把 6 处 nav 的 menu.html 换成 index.html。
// 保 CRLF（node utf8 读写不动行尾）。校验不变量：menu.html 恰好 6 处、diff 恰好 6 行（原 11 处，结算卡去掉「休息一下」后少了 5 个按钮监听）且全为 nav。
import { readFileSync, writeFileSync, copyFileSync } from 'fs';
const src = readFileSync('index.html', 'utf8');
const occ = (src.match(/menu\.html/g) || []).length;
const out = src.split('menu.html').join('index.html');
writeFileSync('www/game.html', out);
for (const name of ['pet-care.js', 'pet-story.js', 'pet-story.css']) copyFileSync(name, 'www/' + name);
const a = src.split(/\r?\n/), b = out.split(/\r?\n/);
let diff = 0, nav = 0;
for (let i = 0; i < Math.max(a.length, b.length); i++) {
  if (a[i] !== b[i]) { diff++; if ((a[i] || '').includes('menu.html') && (b[i] || '').includes('index.html')) nav++; }
}
console.log('CRLF:', src.includes('\r\n'), '| menu.html occ:', occ, '| diff lines:', diff, '| nav diffs:', nav);
if (!(occ === 6 && diff === 6 && nav === 6)) { console.log('!!! TWIN INVARIANT BROKEN'); process.exit(1); }
console.log('=== TWIN OK (diff=6, all nav) ===');
