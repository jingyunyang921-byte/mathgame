// 语法检查：把 html 里所有内联 <script>（无 src）拼起来，用 node --check 过一遍
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const file = process.argv[2] || 'index.wip.html';
const html = fs.readFileSync(path.resolve(file), 'utf8');
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
let m, n = 0, bad = 0;
while ((m = re.exec(html))) {
  if (m[1].trim().length < 50) continue;
  n++;
  const tmp = path.join(os.tmpdir(), 'mg_syntax_' + n + '.js');
  fs.writeFileSync(tmp, m[1]);
  const r = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
  if (r.status !== 0) { bad++; console.log('SYNTAX ERROR in script #' + n + '\n' + r.stderr.split('\n').slice(0, 8).join('\n')); }
  fs.unlinkSync(tmp);
}
console.log(bad ? 'FAIL' : 'OK', n + ' scripts checked');
process.exit(bad ? 1 : 0);
