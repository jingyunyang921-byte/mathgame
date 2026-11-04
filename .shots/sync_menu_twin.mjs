// 孪生同步：menu.html(菜单 master) → www/index.html，仅把那 1 处 nav 的 index.html 换成 game.html。
// 命名陷阱：根目录 index.html 是「游戏页」、menu.html 是「菜单页」；打到 www/ 里两者对调
// （www/index.html = 菜单 = Capacitor 入口，www/game.html = 游戏）。所以这条替换方向与
// sync_twin.mjs 恰好相反，两个脚本都要跑。
// 保 CRLF（node utf8 读写不动行尾）。校验不变量：index.html 恰好 1 处、diff 恰好 1 行且为 nav。
import { readFileSync, writeFileSync, copyFileSync } from 'fs';
const src = readFileSync('menu.html', 'utf8');
const occ = (src.match(/index\.html/g) || []).length;
const out = src.split('index.html').join('game.html');
writeFileSync('www/index.html', out);
for (const name of ['pet-care.js', 'pet-story.js', 'pet-story.css']) copyFileSync(name, 'www/' + name);
const a = src.split(/\r?\n/), b = out.split(/\r?\n/);
let diff = 0, nav = 0;
for (let i = 0; i < Math.max(a.length, b.length); i++) {
  if (a[i] !== b[i]) {
    diff++;
    if ((a[i] || '').includes('index.html') && (b[i] || '').includes('game.html')
        && (a[i] || '').includes('window.location.href')) nav++;
  }
}
console.log('CRLF:', src.includes('\r\n'), '| index.html occ:', occ, '| diff lines:', diff, '| nav diffs:', nav);
if (!(occ === 1 && diff === 1 && nav === 1)) { console.log('!!! MENU TWIN INVARIANT BROKEN'); process.exit(1); }
console.log('=== MENU TWIN OK (diff=1, nav) ===');
