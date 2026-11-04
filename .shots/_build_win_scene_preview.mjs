// 过关小剧场静态稿生成器：把 index.html 里的真伙伴 SVG 符号内联进预览页（file:// 下 <use> 不能跨文件引用）。
import { readFileSync, writeFileSync } from 'fs';
const src = readFileSync('index.html', 'utf8');
const ids = ['p-bunny', 'p-squirrel', 'p-bird', 'p-deer', 'p-turtle', 'p-hedgehog'];
const syms = ids.map(id => {
  const m = src.match(new RegExp('<symbol id="' + id + '"[\\s\\S]*?</symbol>'));
  if (!m) throw new Error('missing symbol ' + id);
  return m[0];
}).join('\n');
const tpl = readFileSync('.shots/win-scene-preview.tpl.html', 'utf8');
writeFileSync('.shots/win-scene-preview.html', tpl.replace('<!--SPRITES-->', syms));
console.log('built win-scene-preview.html', ids.length, 'symbols');
