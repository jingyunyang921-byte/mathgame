// 「带蛋拜访朋友」静态稿生成器：把 index.html 里的真 SVG 符号内联进预览页（file:// 下 <use> 不能跨文件引用）。
import { readFileSync, writeFileSync } from 'fs';
const src = readFileSync('index.html', 'utf8');
const ids = ['p-bunny', 'p-squirrel', 'p-bird', 'p-deer', 'p-turtle', 'p-hedgehog'];
const syms = ids.map(id => {
  const m = src.match(new RegExp('<symbol id="' + id + '"[\\s\\S]*?</symbol>'));
  if (!m) throw new Error('missing symbol ' + id);
  return m[0];
}).join('\n');
const tpl = readFileSync('.shots/egg-companion-preview.tpl.html', 'utf8');
writeFileSync('.shots/egg-companion-preview.html', tpl.replace('<!--SPRITES-->', syms));
console.log('built egg-companion-preview.html', ids.length, 'symbols');
