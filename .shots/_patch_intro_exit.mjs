// 去开场白 TTS + 去退出确认弹窗（index.html，CRLF）
import { readFileSync, writeFileSync } from 'fs';
import { patch } from './_patchlib.mjs';
const F = 'index.html';

// 1) 标记区间整段删除 / 替换（必须各命中恰好一次）
let s = readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
const once = (str, needle, from = 0) => {
  const i = str.indexOf(needle, from);
  if (i < 0 || (from === 0 && str.indexOf(needle, i + 1) >= 0)) throw new Error('marker 不唯一/不存在: ' + needle.slice(0, 50));
  return i;
};
const cut = (startM, endM, repl, inclusiveEnd) => {
  const a = once(s, startM);
  const bi = s.indexOf(endM, a);
  if (bi < 0) throw new Error('end marker 不存在: ' + endM.slice(0, 50));
  const b = inclusiveEnd ? bi + endM.length : bi;
  s = s.slice(0, a) + repl + s.slice(b);
};

// 开场白念白三件套（MG_INTRO_SPEECH / mgIntroLine / mgIntroSpeak）
cut('// 每关开场白（只有 1~6 关的正式闯关会念）', '// Returns a promise that resolves after the rule card is shown and hidden.', '');

// runIntroSequence 里的念白等待
cut('    // 开场白：错题重练(level 0)', '.then(finish);\n',
`    const t0 = Date.now();
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      window._mgSkipIntro = null;
      introEl.onclick = null;
      introEl.style.display = 'none';
      resolve();
    };
    window._mgSkipIntro = finish;                                     // 硬件返回键也走这里
    introEl.onclick = () => { if (Date.now() - t0 > 600) finish(); };  // 点一下跳过（刚进场 0.6 秒内防误触）
    // 规则卡停 2 秒；3-2-1 在答题页渲染好之后（见 runCountdownOverlay()）。
    setTimeout(finish, 2000);
`, true);

// 退出弹窗：CSS / HTML
cut('/* ===== EXIT CONFIRM MODAL ===== */', '#exit-confirm-btn:active { transform: scale(0.96); }\n', '', true);
cut('<!-- ===== EXIT CONFIRM MODAL ===== -->', '<!-- ===== LEVEL 4 SPACE SCENE ===== -->', '');

// BattleGame 的退出块（含 P3-13 冻结倒计时注释）
cut('    // Exit button shared\n', "\n    document.getElementById('retry-btn')",
"    document.getElementById('exit-btn').addEventListener('click', () => this._forceEnd());\n", false);

writeFileSync(F, s.replace(/\n/g, '\r\n'));

// 2) 精确替换
const OLD4 = `    document.getElementById('exit-btn').addEventListener('click', () => {
      document.getElementById('exit-modal').classList.add('show');
    });
    document.getElementById('exit-cancel-btn').addEventListener('click', () => {
      document.getElementById('exit-modal').classList.remove('show');
    });
    document.getElementById('exit-confirm-btn').addEventListener('click', () => {
      document.getElementById('exit-modal').classList.remove('show');
      this._forceEnd();
    });
    document.getElementById('exit-modal-bg').addEventListener('click', () => {
      document.getElementById('exit-modal').classList.remove('show');
    });
`;
patch(F, [
  [OLD4, "    document.getElementById('exit-btn').addEventListener('click', () => this._forceEnd());\n", 4],
  ["return !['overlay', 'exit-modal'].some(id => document.getElementById(id).classList.contains('show'));",
   "return !document.getElementById('overlay').classList.contains('show');"],
  [`    <div id="intro-skip-hint" style="display:none;font-size:12px;font-weight:700;color:var(--c-ink-soft);opacity:0.8;">点一下跳过</div>\n`, ''],
]);
console.log('patch1 ok');
