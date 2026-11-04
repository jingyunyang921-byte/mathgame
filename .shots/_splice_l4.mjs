// 把 _l4_p1/2/3.js 拼成新的 L4 绘制段，替换 index.wip.html 里 _drawRaceScene 到 _drawRaceKid 之前的旧段（CRLF 保持）
import fs from 'node:fs';
const f = new URL('../index.wip.html', import.meta.url), here = p => new URL(p, import.meta.url);
const src = fs.readFileSync(f, 'utf8'), lines = src.split('\r\n');
const a = lines.findIndex(l => l === '  _drawRaceScene() {'), b = lines.findIndex(l => l === '  _drawRaceKid(ctx, cx, cy, size) {');
if (a < 0 || b < 0 || b < a) throw new Error('anchors not found ' + a + ' ' + b);
if (lines.filter(l => l === '  _drawRaceScene() {').length !== 1) throw new Error('anchor not unique');
const neu = ['_l4_p1.js', '_l4_p2.js', '_l4_p3.js'].map(n => fs.readFileSync(here(n), 'utf8').replace(/\r\n/g, '\n')).join('').replace(/\n+$/, '\n').split('\n');
if (neu[neu.length - 1] === '') neu.pop();
neu.push('');
const out = lines.slice(0, a).concat(neu, lines.slice(b)).join('\r\n');
fs.writeFileSync(f, out);
console.log('replaced lines', a + 1, '..', b, 'with', neu.length, 'lines');
