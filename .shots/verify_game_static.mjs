// Static verification of the game-page 去AI化 shared layer (no browser needed).
//  1) sprite integrity: every icon <use href="#i-*"> resolves to a <symbol id="i-*">
//  2) Chrome-91 banned-token scan across all <style> blocks
//  3) common chrome (题卡/结算/退出/开场 overlay) is free of "0 Npx 0 #hex" hard pedestals
import { readFileSync } from 'fs';
const html = readFileSync('e:/mathgame/mathgame/index.html', 'utf8');

const symIds = new Set([...html.matchAll(/<symbol\s+id="([^"]+)"/g)].map(m => m[1]));
// id 只允许 [a-z0-9-]：原来的 [^"]+ 会把 showAnswerMark 里拼接出来的
// href="#i-' + (type === 'correct' ? 'check' : 'cross') + '" 整段当成一个 id，
// 这个检查于是一直在误报 FAIL（静态扫不出来的动态 id 单列在 dynRefs 里断言）。
const iconRefs = [...new Set([...html.matchAll(/href="#(i-[a-z0-9-]+)"/g)].map(m => m[1]))];
const dynRefs = ['i-check', 'i-cross'];   // showAnswerMark 运行时拼接，静态只能点名核对
const missing = [...iconRefs, ...dynRefs].filter(r => !symIds.has(r));

const styleBlocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
const banned = styleBlocks.match(/paint-order|:has\(|color-mix\(|oklch\(|@layer|\d(?:dvh|svh|lvh)/g);

const block = (sel) => { const m = new RegExp('\\n\\s*' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{').exec(html); return m ? html.slice(m.index, m.index + 420) : ''; };
const pedRe = /0 [0-9.]+px 0 #/;
const commonSel = ['#question-card', '#overlay-content', '#battle-question-card'];
const stillPed = commonSel.filter(s => pedRe.test(block(s)));
const introInlinePed = /intro-box[\s\S]{0,320}0 12px 0 #/.test(html);
const introJsPed = /introBox\.style\.boxShadow\s*=\s*'0 12px 0/.test(html);
const overlayBgTok = /LEVEL_OVERLAY_BG[\s\S]{0,160}var\(--scene-lv1\)/.test(html);
const iconEmojiGone = !/id="question-icon"/.test(html);

console.log('symbols defined:', symIds.size, '| distinct icon refs:', iconRefs.length);
console.log('MISSING symbol for refs:', JSON.stringify(missing));
console.log('banned tokens:', banned ? JSON.stringify([...new Set(banned)]) : 'none');
console.log('common still-pedestal:', JSON.stringify(stillPed));
console.log('intro pedestal inline/js:', introInlinePed, '/', introJsPed);

let fail = 0;
const P = (ok, l) => { console.log((ok ? 'PASS ' : 'FAIL ') + l); if (!ok) fail++; };
P(missing.length === 0, 'all icon <use> resolve to a <symbol>');
P(!banned, 'no Chrome91-banned CSS tokens');
P(stillPed.length === 0, 'common chrome free of 0 Npx 0 hard pedestal');
P(!introInlinePed && !introJsPed, 'intro-box hard pedestal removed (inline + JS)');
P(overlayBgTok, 'LEVEL_OVERLAY_BG collapsed into var(--scene-lvN)');
P(iconEmojiGone, 'redundant question-icon 🧮 removed');
console.log(fail === 0 ? '\n=== ALL STATIC CHECKS PASS ===' : '\n=== ' + fail + ' FAIL ===');
process.exit(fail ? 1 : 0);
