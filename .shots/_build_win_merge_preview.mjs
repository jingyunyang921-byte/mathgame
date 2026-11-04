// 宝箱舞台 × 过关场景 合并稿生成器：把 index.html 里的真符号（6 伙伴 + 宝箱 + 金币 + 对勾）内联进预览页
import { readFileSync, writeFileSync } from 'fs';
const src = readFileSync('index.html', 'utf8');
const ids = ['p-bunny', 'p-squirrel', 'p-bird', 'p-deer', 'p-turtle', 'p-hedgehog', 'chest-closed', 'chest-open', 'i-coin', 'i-check'];
const syms = ids.map(id => {
  const m = src.match(new RegExp('<symbol id="' + id + '"[\\s\\S]*?</symbol>'));
  if (!m) throw new Error('missing symbol ' + id);
  return m[0];
}).join('\n');
const tpl = readFileSync('.shots/win-merge-preview.tpl.html', 'utf8');
writeFileSync('.shots/win-merge-preview.html', tpl.replace('<!--SPRITES-->', syms));
console.log('built win-merge-preview.html', ids.length, 'symbols');
