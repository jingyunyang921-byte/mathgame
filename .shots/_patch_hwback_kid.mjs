// 硬件返回键直接离场 + L4「我」换小孩子（index.html，CRLF）
import { readFileSync, writeFileSync } from 'fs';
import { patch } from './_patchlib.mjs';
const F = 'index.html';
let s = readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
const idx = (needle, from = 0) => { const i = s.indexOf(needle, from); if (i < 0) throw new Error('缺 marker: ' + needle.slice(0, 50)); return i; };
const cut = (startM, endM, repl) => { const a = idx(startM); if (s.indexOf(startM, a + 1) >= 0) throw new Error('不唯一: ' + startM.slice(0, 40)); const b = idx(endM, a); s = s.slice(0, a) + repl + s.slice(b); };

// 硬件返回：对局进行中 = 点左上角返回
cut("      var em = document.getElementById('exit-modal');", "    } catch (e) {}\n  });\n})();",
`      // 宝箱舞台在场：返回键先收舞台（没点开就先补领），留在结算卡上
      if (mgStageBack()) return;
      // 已经在结算遮罩上 → 返回键等于点「回主页」，复用主页按钮的安全离场
      var ov = document.getElementById('overlay');
      if (ov && ov.classList.contains('show')) {
        var h = document.getElementById('home-btn');
        if (h) h.click();
        return;
      }
      // 对局进行中 → 等同点左上角返回（直接 _forceEnd 安全离场，不再弹确认框）
      var eb = document.getElementById('exit-btn');
      if (eb) eb.click();
`);

// 小孩子精灵：插在 p-hedgehog 之后
const kid = readFileSync('.shots/_kid_symbol.txt', 'utf8').replace(/\r?\n$/, '');
const hh = idx('<symbol id="p-hedgehog"');
const hhEnd = idx('</symbol>', hh) + '</symbol>'.length;
s = s.slice(0, hhEnd) + '\n' + kid + s.slice(hhEnd);

// L4 的「我」：战士手绘整段换成小孩子位图（脚底对齐 charY，与小鹿同一套 mgSymbolImage 通路）
cut('  _drawRaceWarrior(ctx, cx, cy, size) {', '  _drawRaceBuddy(ctx, cx, cy, size) {',
`  _drawRaceKid(ctx, cx, cy, size) {
    // 小孩子：位图来自 #p-kid 精灵（24 格里脚底在 y≈23.4），按 cy+0.4*size 对齐脚底；没解码好就跳过
    const im = mgSymbolImage('p-kid');
    if (!(im.complete && im.naturalWidth)) return;
    const w = size * 0.88;
    ctx.drawImage(im, cx - w / 2, cy + size * 0.4 - w * 0.975, w, w);
  }

`);
// 起点「抓路沿的手臂」是战士的，小孩子自带手
cut("    // 战士在起点时补一条「抓住路径边缘」的手臂", "    ctx.textBaseline = 'alphabetic';\n  }\n\n  _startRaceFlutter", '');
s = s.replace("  _startRaceFlutter", "  _startRaceFlutter");
writeFileSync(F, s.replace(/\n/g, '\r\n'));

patch(F, [
  ['// 默认返回键会直接退出 App；游戏页改成：按返回 = 弹出页面既有的「离开」确认框，\n// 风格与页内退出按钮完全一致，确认后仍走原有 _forceEnd → 安全离场流程（不新增跳转）。',
   '// 默认返回键会直接退出 App；游戏页改成：按返回 = 点页内左上角返回（直接走 _forceEnd → 安全离场，不新增跳转）。'],
  ['（此时关卡还没建好，退出确认框的按钮也还没接线）', '（此时关卡还没建好，左上角返回也还没接线）'],
  ['if (isWarrior) this._drawRaceWarrior(ctx, 0, 0, charSize);', 'if (isWarrior) this._drawRaceKid(ctx, 0, 0, charSize);'],
  ["['p-deer', 'p-hedgehog'].forEach(mgSymbolImage);", "['p-deer', 'p-hedgehog', 'p-kid'].forEach(mgSymbolImage);"],
  ['<use href="#i-sword"/></svg> 我 <span id="race-player-step">', '<use href="#p-kid"/></svg> 我 <span id="race-player-step">'],
  ['const charSize = isWarrior ? 190 : 100; // warrior larger, monster smaller', 'const charSize = isWarrior ? 190 : 100; // 小孩子（我）大一些，小鹿小一些'],
]);
console.log('patch2 ok');
