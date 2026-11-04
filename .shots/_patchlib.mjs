// 对 CRLF/LF 文件做「必须恰好命中 N 次」的精确替换（避开 Edit 工具对 CRLF 文件的坑）
import { readFileSync, writeFileSync } from 'fs';
export function patch(file, edits, opts = {}) {
  let s = readFileSync(file, 'utf8');
  const crlf = s.includes('\r\n');
  s = s.replace(/\r\n/g, '\n');
  for (const [a, b, times] of edits) {
    if (a instanceof RegExp) {
      const g = new RegExp(a.source, 'g'), n = (s.match(g) || []).length;
      if (n !== (times || 1)) throw new Error(file + ': 期望命中 ' + (times || 1) + ' 次，实际 ' + n + ' 次 → ' + a);
      s = s.replace(g, b);
      continue;
    }
    const n = s.split(a).length - 1;
    if (n !== (times || 1)) throw new Error(file + ': 期望命中 ' + (times || 1) + ' 次，实际 ' + n + ' 次 → ' + a.slice(0, 70).replace(/\n/g, '\\n'));
    s = s.split(a).join(b);
  }
  if (crlf) s = s.replace(/\n/g, '\r\n');
  if (!opts.dry) writeFileSync(file, s);
  return s.length;
}
