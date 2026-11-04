// 成长能量模型（纯规则，无浏览器）：打卡 +4、通关 +3、日封顶 10、总 900 点、孵化只看能量；网页与 APK 孪生一致。
import { readFileSync } from 'fs';
const F = process.argv[2] || new URL('../pet-care.js', import.meta.url);
if (!process.argv[2] && readFileSync(F, 'utf8') !== readFileSync(new URL('../www/pet-care.js', import.meta.url), 'utf8')) { console.log('FAIL 网页与 APK 的 pet-care.js 不一致'); process.exit(1); }
const store = {};
globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
(0, eval)(readFileSync(F, 'utf8'));
const P = globalThis.MG_PET;
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } else console.log('ok  ', m); };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + '  期望 ' + JSON.stringify(b) + ' 实际 ' + JSON.stringify(a));
const D = n => new Date(2026, 0, 1 + n, 12, 0, 0);
const reset = () => { for (const k of Object.keys(store)) delete store[k]; };
const key = n => P.dayKey(D(n));
const feed = (from, to, tag, wins) => { for (let d = from; d < to; d++) for (let i = 0; i < wins; i++) P.recordRound(5, tag + d + '-' + i, D(d), true); };

// 0. 刻度表：900 点、8 个阶段，没有自然日字段
eq(P.phases.map(x => x.at), [0, 75, 225, 375, 525, 675, 825, 900], '阶段刻度 0/75/225/375/525/675/825/900');
ok(P.energyMax === 900 && P.phases.every(x => !('day' in x) && !('days' in x)) && !('cell' in P), '总量 900，阶段不再带自然日/格数字段');

// 1. 老存档迁移：12 个学习日 → 120 点（仍是每学习日 10 点），今天已打过卡 → 今天视为吃饱
reset();
store.mathgamePet = JSON.stringify({ version: 2, adopted: true, exp: 0, stage: 0, adoptedDay: key(0), lastDay: key(20),
  days: Array.from({ length: 12 }, (_, i) => key(i + 9)), phase: 0, daily: { date: key(20), correct: 5, rounds: ['x'] },
  gifts: [], decor: 'leaf', decors: ['leaf'], name: '数宝', hatchDay: '', birthSeen: false, affection: 0, stories: { seen: [], pending: [] } });
let g = P.growth(D(20));
eq([g.energy, g.max, g.phase], [120, 900, 1], '迁移：12 学习日 = 120 点，总量 900，已过 75 点刻度');
eq([g.today, g.dayFull], [10, true], '迁移当天视为已吃饱（无意外加成）');
let r = P.recordRound(5, 'm1', D(20), true);
eq([r.gain, r.capped], [0, true], '迁移当天再通关：不再涨能量、capped');
g = P.growth(D(21)); eq([g.today, g.dayFull], [0, false], '次日额度重置');

// 2. 新领养：打卡 +4、通关 +3、每天封顶 10
reset(); P.adopt(D(0));
r = P.recordRound(3, 'a', D(0), false); eq([r.gain, r.counted], [0, false], '答对 3 题未满 5：不入账');
r = P.recordRound(2, 'b', D(0), true); eq([r.checkin, r.clear, r.gain, r.counted], [4, 3, 7, true], '补到 5 题：打卡 +4 且通关 +3 = 7');
r = P.recordRound(5, 'c', D(0), true); eq([r.gain, r.capped], [3, false], '第二次通关 +3，刚好吃满 10');
r = P.recordRound(5, 'd', D(0), true); eq([r.gain, r.capped], [0, true], '第三次通关：吃饱了 +0，capped');
r = P.recordRound(5, 'd', D(0), true); eq([r.gain, r.capped], [0, false], '同一局 id 重复提交：不重复入账、不 capped');
g = P.growth(D(0)); eq([g.energy, g.today, g.dayFull, g.clears], [10, 10, true, 3], '当天 growth：10 点 / 吃饱 / 通关 3 次');
r = P.recordRound(5, 'e', D(1), true); eq([r.checkin, r.clear], [4, 3], '次日：打卡 + 通关各自重新计');
ok(P.info(D(1)).pet.days.length === 2, '学习日 = 2');

// 3. 只打卡不通关：每天 4 点；每天 1 次通关：每天 7 点，第 129 天攒满
reset(); P.adopt(D(0));
for (let d = 0; d < 10; d++) P.recordRound(5, 'k' + d, D(d), false);
eq(P.growth(D(9)).energy, 40, '10 天只打卡 = 40 点');
reset(); P.adopt(D(0)); feed(0, 128, 'w', 1);
eq(P.growth(D(127)).energy, 896, '128 天每天通关 1 次 = 896 点（未满）');
ok(P.info(D(127)).ready === false, '896 点：还没到孵化');
P.recordRound(5, 'w128', D(128), true); eq(P.growth(D(128)).energy, 900, '第 129 天攒满 900（最后一天只吃 4 点）');
ok(P.info(D(128)).ready === true, '能量满：ready（不再看自然日）');
ok(P.recordRound(5, 'w129', D(129), true).gain === 0, '能量满之后继续玩：+0');

// 4. 最快路径：每天 10 点 → 恰好 90 天
reset(); P.adopt(D(0)); feed(0, 89, 'f', 2);
eq(P.growth(D(88)).energy, 890, '每天吃满 10 点，第 89 天 890 点');
ok(P.info(D(88)).ready === false, '890 点：还差 10 点，不能孵化');
feed(89, 90, 'f', 2);
eq(P.growth(D(89)).energy, 900, '第 90 天攒满 900（不可能更快）');
ok(P.info(D(89)).ready === true, '第 90 天 ready');
feed(89, 90, 'x', 3);
eq(P.growth(D(89)).energy, 900, '同一天狂刷不会超过上限');

// 5. 阶段只看能量：70 点还是蛋的第 1 阶段，80 点（第 8 天）进入第 2 阶段
reset(); P.adopt(D(0)); feed(0, 7, 'p', 2);
g = P.growth(D(6)); eq([g.energy, g.phase], [70, 0], '7 天 70 点：第 2 阶段(75 点)还差一点');
eq([g.next.gap, g.next.energyAt], [5, 75], '下一阶段还差 5 点 / 刻度 75');
feed(7, 8, 'p', 2); g = P.growth(D(7)); eq(g.phase, 1, '80 点 → 进入第 2 阶段');
eq(P.info(D(7)).progress, Math.floor(80 / 900 * 100), '孵化进度只按能量折算（80/900）');

// 5b. 没有自然日门槛：领养当天能量够也直接 ready、阶段到顶
reset(); P.adopt(D(0));
let raw = JSON.parse(store.mathgamePet); raw.xp = 900; store.mathgamePet = JSON.stringify(raw);
g = P.growth(D(0)); eq([g.ready, g.phase, g.age], [true, 7, 1], '第 1 个自然日能量满 900：直接 ready、阶段 8');
ok(P.hatch(D(0)) === true && P.get(D(0)).stage === 1, '自然日不足也能孵化（只看能量）');

// 6. 已孵化：不再涨能量，但不报错
reset(); P.adopt(D(0));
raw = JSON.parse(store.mathgamePet); raw.stage = 1; raw.hatchDay = key(0); raw.birthGifts = []; store.mathgamePet = JSON.stringify(raw);
r = P.recordRound(5, 'h1', D(0), true); eq([r.gain, r.capped], [0, false], '已孵化：不涨能量也不 capped');

// 7. 时钟回拨
reset(); P.adopt(D(5)); ok(P.recordRound(5, 'z', D(2), true).rollback === true, '时钟回拨：rollback');

// 8. 备份校验
reset(); P.adopt(D(0)); P.recordRound(5, 'b1', D(0), true);
const good = P.backup();
ok((() => { try { P.parseBackup(good); return true; } catch (e) { return false; } })(), '新备份可通过校验');
const bad = (mut, m) => { const b = JSON.parse(good), pet = JSON.parse(b.data.mathgamePet); mut(pet); b.data.mathgamePet = JSON.stringify(pet);
  try { P.parseBackup(JSON.stringify(b)); ok(false, m); } catch (e) { ok(/成长能量/.test(e.message), m + '（' + e.message + '）'); } };
bad(p => { p.xp = 901; }, 'xp>900 被拒');
bad(p => { p.xp = -1; }, 'xp<0 被拒');
bad(p => { p.xpDay.got = 11; }, 'xpDay.got>10 被拒');
bad(p => { p.xpDay.date = 'abc'; }, 'xpDay.date 非法被拒');
const oldB = JSON.parse(good), op = JSON.parse(oldB.data.mathgamePet); delete op.xp; delete op.xpDay; oldB.data.mathgamePet = JSON.stringify(op);
ok((() => { try { P.parseBackup(JSON.stringify(oldB)); return true; } catch (e) { return false; } })(), '没有 xp 的旧备份仍可恢复');
const b6 = JSON.parse(good), p6 = JSON.parse(b6.data.mathgamePet); p6.xp = 650; b6.data.mathgamePet = JSON.stringify(p6);
ok((() => { try { P.parseBackup(JSON.stringify(b6)); return true; } catch (e) { return false; } })(), '旧 600 制存档里 650 点以内的备份仍可恢复');

// 9. 礼物文案的点数与对应阶段刻度一致，且不再提天数
ok(P.stories.every(s => !/格成长能量|陪伴满|90 天/.test(s.text)), '礼物故事里不再有「N 格」「陪伴满 90 天」');
for (const lv of [1, 2, 3, 4, 5, 6, 7]) {
  const need = P.phases[P.giftPhase[lv]].at + ' 点成长能量';
  ok(P.stories.find(s => s.id === 'gift-' + lv).text.includes(need), 'gift-' + lv + ' 文案 = ' + need);
}
console.log(fail ? '\n失败 ' + fail + ' 项' : '\n=== 成长能量模型 全过 ===');
process.exit(fail ? 1 : 0);
