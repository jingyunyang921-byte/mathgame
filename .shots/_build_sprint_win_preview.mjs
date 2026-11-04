// 一分钟速算 + 胜利一拍 静态预览生成器：真符号内联 + 三段 CSS/HTML 拼接
import { readFileSync, writeFileSync } from 'fs';
const src = readFileSync('index.html', 'utf8');
const ids = ['p-bunny'];
const syms = ids.map(id => {
  const m = src.match(new RegExp('<symbol id="' + id + '"[\\s\\S]*?</symbol>'));
  if (!m) throw new Error('missing symbol ' + id);
  return m[0];
}).join('\n');
const css = ['', '2', '3'].map(n => readFileSync('.shots/sprint-win-preview' + n + '.css', 'utf8')).join('\n');
const html = ['a', 'b', 'c'].map(n => readFileSync('.shots/sprint-win-preview.' + n + '.html', 'utf8')).join('\n');
writeFileSync('.shots/sprint-win-preview.html', html.replace('/*CSS*/', () => css).replace('<!--SPRITES-->', () => syms));
console.log('built sprint-win-preview.html');
