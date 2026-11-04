// 纯规则验证，无需浏览器：本地自然日、学习日、迁移、礼物、窝饰与备份失败回滚。
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const source = readFileSync(new URL('../pet-care.js', import.meta.url), 'utf8');
const twin = readFileSync(new URL('../www/pet-care.js', import.meta.url), 'utf8');
const plain = v => JSON.parse(JSON.stringify(v));
const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h);
const add = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);
function setup(initial = at(2026, 1, 1)) {
  let now = initial, writes = 0, failKey = null;
  const store = new Map();
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now.getTime()])); }
    static now() { return now.getTime(); }
  }
  const localStorage = {
    getItem: k => store.has(k) ? store.get(k) : null,
    setItem(k, v) {
      if (k === failKey) { failKey = null; throw new Error('模拟存储写入失败'); }
      writes++; store.set(k, String(v));
    },
    removeItem(k) { store.delete(k); }
  };
  const ctx = vm.createContext({ Date: Clock, localStorage });
  vm.runInContext(source, ctx, { filename: 'pet-care.js' });
  return { pet: ctx.MG_PET, store, localStorage,
    setNow(d) { now = d; }, failNext(k) { failKey = k; },
    writes: () => writes,
    put(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
    read(k) { return JSON.parse(localStorage.getItem(k)); } };
}
let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('PASS ' + name); }
  catch (e) { fail++; console.error('FAIL ' + name + '\n' + e.stack); }
}
// 一个「满额学习日」= 打卡 +4 与通关 +3 +3，当天吃满 10 点；90 个满额学习日 = 900 点（孵化只看能量，没有自然日门槛）。
function study(e, n, start = at(2026, 1, 1)) {
  for (let i = 0; i < n; i++) {
    e.setNow(add(start, i));
    assert.equal(e.pet.recordRound(5, 'day-' + i, undefined, true).counted, true);
    e.pet.recordRound(0, 'clear2-' + i, undefined, true);
  }
}

test('网页与APK使用同一份宠物规则', () => assert.equal(twin, source));
test('未领养不凭空创建存档；领养当天为第1天且重复领养无副作用', () => {
  const e = setup();
  assert.equal(e.pet.recordRound(10, 'unadopted'), null);
  assert.equal(e.store.has('mathgamePet'), false);
  e.pet.adopt(); const saved = e.store.get('mathgamePet');
  e.pet.adopt(); assert.equal(e.store.get('mathgamePet'), saved);
  assert.equal(e.pet.info().age, 1); assert.equal(e.pet.info().studyDays, 0);
  const writes = e.writes(); e.pet.get(); e.pet.get();
  assert.equal(e.writes(), writes, '同日读取不得逐帧写存储');
});
test('同日已结算答对累计5题；同局ID去重；所有模式合并且每日封顶1天', () => {
  const e = setup(); e.pet.adopt();
  assert.equal(e.pet.recordRound(2, 'visual').correct, 2);
  assert.equal(e.pet.recordRound(2, 'visual').correct, 2);
  assert.equal(e.pet.recordRound(0, 'zero').correct, 2);
  assert.equal(e.pet.recordRound(-5, 'negative').correct, 2);
  assert.equal(e.pet.recordRound(NaN, 'invalid').correct, 2);
  assert.equal(e.pet.recordRound(2, 'audio').correct, 4);
  assert.equal(e.pet.recordRound(1, 'review').counted, true);
  assert.equal(e.pet.recordRound(10, 'sprint').done, true);
  assert.equal(e.pet.recordRound(10, 'repeat').counted, false);
  assert.deepEqual(plain(e.pet.get().days), ['2026-01-01']);
});
test('89个满额日只有890点不能出生；第90个满额日攒满900点才可出生且仅出生一次', () => {
  const e = setup(); e.pet.adopt(); study(e, 89);
  e.setNow(at(2026, 3, 30)); // 从1月1日起第89天。
  assert.equal(e.pet.info().age, 89); assert.equal(e.pet.info().ready, false);
  assert.equal(e.pet.hatch(), false);
  e.setNow(at(2026, 3, 31));
  e.pet.recordRound(5, 'day-90a', undefined, true); e.pet.recordRound(0, 'day-90b', undefined, true);
  assert.equal(e.pet.info().age, 90); assert.equal(e.pet.info().ready, true);
  assert.equal(e.pet.get().stage, 0, '满足条件后等待出生仪式');
  assert.equal(e.pet.hatch(), true); assert.equal(e.pet.hatch(), false);
  assert.equal(e.pet.get().stage, 1); assert.equal(e.pet.get().hatchDay, '2026-03-31');
  assert.equal(e.pet.get().birthSeen, false);
  e.pet.seenBirth(); assert.equal(e.pet.get().birthSeen, true);
  e.pet.rename('  团团  '); assert.equal(e.pet.get().name, '团团');
});
test('只差几点能量不能出生；当天补满900点即可', () => {
  const e = setup(); e.pet.adopt(); study(e, 89);
  e.setNow(at(2026, 3, 31));
  assert.equal(e.pet.info().studyDays, 89); assert.equal(e.pet.hatch(), false);
  e.pet.recordRound(5, 'day-90');
  assert.equal(e.pet.info().ready, false, '只打卡 +4，890+4 点仍不足 900');
  e.pet.recordRound(0, 'clear-a', undefined, true); e.pet.recordRound(0, 'clear-b', undefined, true);
  assert.equal(e.pet.info().ready, true); assert.equal(e.pet.hatch(), true);
});
test('休息不清零；跨日不足5题不能结转到次日', () => {
  const e = setup(); e.pet.adopt(); e.pet.recordRound(4, 'partial');
  e.setNow(at(2026, 1, 2)); assert.equal(e.pet.recordRound(1, 'new-day').correct, 1);
  assert.equal(e.pet.info().studyDays, 0);
  e.pet.recordRound(4, 'new-day-2');
  e.setNow(at(2026, 4, 20));
  assert.equal(e.pet.info().studyDays, 1); assert.equal(e.pet.info().ready, false);
});
test('跨月、跨年、闰年和夏令时按本地日期计算', () => {
  for (const [start, next, age] of [
    [at(2026, 1, 31), at(2026, 2, 1), 2],
    [at(2026, 12, 31), at(2027, 1, 1), 2],
    [at(2024, 2, 28), at(2024, 3, 1), 3],
    [at(2025, 2, 28), at(2025, 3, 1), 2],
    [at(2026, 3, 7), at(2026, 3, 9), 3],
    [at(2026, 10, 31), at(2026, 11, 2), 3]
  ]) {
    const e = setup(start); e.pet.adopt(); e.pet.recordRound(5, 'before'); e.setNow(next);
    assert.equal(e.pet.info().age, age);
    assert.equal(e.pet.recordRound(5, 'after').counted, true);
    assert.equal(e.pet.info().studyDays, 2);
  }
  const e = setup(at(2026, 10, 19, 23)); e.pet.adopt();
  e.setNow(at(2026, 10, 20, 0)); assert.equal(e.pet.info().age, 2);
});
test('设备日期回拨不减天数、不重复记账；恢复日期后可以继续', () => {
  const e = setup(); e.pet.adopt(); e.pet.recordRound(5, 'one');
  e.setNow(at(2026, 1, 7)); e.pet.recordRound(5, 'seven');
  const before = e.store.get('mathgamePet');
  e.setNow(at(2026, 1, 2)); assert.equal(e.pet.recordRound(5, 'back').rollback, true);
  assert.equal(e.pet.info().age, 7); assert.equal(e.pet.info().studyDays, 2);
  assert.equal(e.store.get('mathgamePet'), before);
  e.setNow(at(2026, 1, 8)); assert.equal(e.pet.recordRound(5, 'eight').counted, true);
});
test('满足出生条件后日期回拨不写异常出生日期；恢复日期后出生和备份仍可用', () => {
  const e = setup(); e.pet.adopt(); study(e, 90);
  e.setNow(at(2026, 3, 31)); assert.equal(e.pet.info().ready, true);
  const before = e.store.get('mathgamePet');
  for (const date of [at(2025, 12, 31), at(2026, 3, 30)]) {
    e.setNow(date); assert.equal(e.pet.hatch(), false);
    assert.equal(e.store.get('mathgamePet'), before);
    assert.equal(e.pet.parseBackup(e.pet.backup()).data.mathgamePet, before);
  }
  e.setNow(at(2026, 3, 31)); assert.equal(e.pet.hatch(), true);
  assert.equal(e.pet.get().hatchDay, '2026-03-31');
  const b = e.pet.parseBackup(e.pet.backup()); e.pet.restore(b);
  assert.equal(e.pet.get().stage, 1);
});
test('八个阶段逐档验证：能量差一点不能提前进入，刚够就进入，与自然日无关', () => {
  const phases = setup().pet.phases;
  assert.equal(phases.length, 8);
  phases.slice(1).forEach((phase, k) => {
    const index = k + 1, n = Math.floor((phase.at - 1) / 10);
    const e = setup(); e.pet.adopt(); study(e, n);
    assert.ok(e.pet.get().phase < index, '能量不足: ' + phase.name);
    const f = setup(); f.pet.adopt(); study(f, n + 1);
    assert.equal(f.pet.get().phase, index, '能量够了: ' + phase.name);
  });
});
test('没有自然日门槛：领养当天能量满900就能出生', () => {
  const e = setup(); e.pet.adopt();
  const p = e.pet.get(); p.xp = 900; e.put('mathgamePet', p);
  assert.equal(e.pet.info().age, 1); assert.equal(e.pet.info().ready, true);
  assert.equal(e.pet.get().phase, 7); assert.equal(e.pet.hatch(), true);
});
test('旧蛋从启用当天起计时；旧幼年与成年形态保留且不自动弹出生', () => {
  for (const [exp, stage] of [[0, 0], [55, 0], [60, 1], [159, 1], [160, 2], [200, 2]]) {
    const e = setup(at(2026, 10, 19)); e.put('mathgamePet', { adopted: true, exp });
    const p = e.pet.get();
    assert.equal(p.stage, stage); assert.equal(p.legacy, true);
    assert.equal(p.adoptedDay, '2026-10-19'); assert.equal(p.days.length, 0);
    assert.equal(p.birthSeen, stage > 0);
    e.setNow(at(2026, 10, 20)); assert.equal(e.pet.get().adoptedDay, '2026-10-19');
  }
});
test('新宠物不按旧经验孵化或成年；免费互动不扣币也不代替学习', () => {
  const e = setup(); e.pet.adopt(); e.put('mathgameCoins', { coins: 120 });
  const p = e.pet.get(); p.exp = 160; e.put('mathgamePet', p);
  for (let i = 0; i < 20; i++) e.pet.care();
  assert.equal(e.pet.get().stage, 0); assert.equal(e.pet.get().days.length, 0);
  assert.equal(e.read('mathgameCoins').coins, 120); assert.equal(e.pet.hatch(), false);
  const baby = e.pet.get(); baby.stage = 1; baby.hatchDay = '2026-01-01';
  e.put('mathgamePet', baby); e.pet.care(); assert.equal(e.pet.get().stage, 1);
});
test('六份伙伴礼物只发一次；关卡星星必须有效；全通不替代出生条件', () => {
  const e = setup(); e.pet.adopt();
  assert.equal(e.pet.claimGift(1), false); e.put('mathgameStars', { 1: '3' });
  assert.equal(e.pet.claimGift(1), false); e.put('mathgameStars', { 1: 1, 2: 0 });
  assert.equal(e.pet.claimGift(1), true); assert.equal(e.pet.claimGift(1), false);
  assert.equal(e.pet.claimGift(2), false); assert.equal(e.pet.claimGift(7), false);
  e.put('mathgameStars', { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 });
  assert.equal(e.pet.syncGifts().gifts.length, 6); assert.equal(e.pet.hatch(), false);
  e.localStorage.removeItem('mathgameStars');
  assert.equal(e.pet.get().gifts.length, 6, '重置学习进度保留礼物');
});
test('窝饰只扣首次购买费用，余额不足不写记录且不加速日期', () => {
  const e = setup(); e.pet.adopt(); e.put('mathgameCoins', { coins: 120, marker: 'keep' });
  assert.equal(e.pet.chooseDecor('peach'), true); assert.equal(e.read('mathgameCoins').coins, 70);
  assert.equal(e.pet.chooseDecor('peach'), true); assert.equal(e.read('mathgameCoins').coins, 70);
  assert.equal(e.pet.chooseDecor('sea'), true); assert.equal(e.read('mathgameCoins').coins, 0);
  assert.equal(e.read('mathgameCoins').marker, 'keep'); assert.equal(e.pet.info().age, 1);
  assert.equal(e.pet.info().studyDays, 0); assert.equal(e.pet.chooseDecor('unknown'), false);
  const f = setup(); f.pet.adopt(); f.put('mathgameCoins', { coins: 49 });
  const saved = f.store.get('mathgamePet');
  assert.equal(f.pet.chooseDecor('peach'), false); assert.equal(f.store.get('mathgamePet'), saved);
});
test('购买窝饰遇到宠物或钱包写入失败，原存档和余额均保留', () => {
  for (const key of ['mathgamePet', 'mathgameCoins']) {
    const e = setup(); e.pet.adopt(); e.put('mathgameCoins', { coins: 80 });
    const before = [...e.store]; e.failNext(key);
    assert.throws(() => e.pet.chooseDecor('peach'), /存储/);
    assert.deepEqual([...e.store], before);
  }
});
test('摆件：首次买扣钱，同侧替换/收起/摆回免费，余额不足不写记录且不动学习日', () => {
  const e = setup(); e.pet.adopt(); e.put('mathgameCoins', { coins: 400, marker: 'keep' });
  const coins = () => e.read('mathgameCoins').coins, put = () => plain(e.pet.get().put);
  assert.equal(e.pet.chooseItem('sunflower'), true); assert.equal(coins(), 320);
  assert.deepEqual(put(), { L: 'sunflower', R: '', H: '' });
  assert.equal(e.pet.chooseItem('books'), true); assert.equal(coins(), 200);
  assert.deepEqual(put(), { L: 'books', R: '', H: '' });
  assert.equal(e.pet.chooseItem('sunflower'), true); assert.equal(coins(), 200);
  assert.equal(put().L, 'sunflower');
  assert.equal(e.pet.chooseItem('sunflower'), true); assert.equal(put().L, ''); assert.equal(coins(), 200);
  assert.equal(e.pet.chooseItem('mushroom'), true); assert.equal(coins(), 110);
  assert.equal(e.pet.chooseItem('bunting'), true); assert.equal(coins(), 10);
  assert.deepEqual(put(), { L: '', R: 'mushroom', H: 'bunting' });
  assert.deepEqual(plain(e.pet.get().items), ['sunflower', 'books', 'mushroom', 'bunting']);
  assert.equal(e.read('mathgameCoins').marker, 'keep');
  assert.equal(e.pet.chooseItem('unknown'), false);
  const saved = e.store.get('mathgamePet');
  assert.equal(e.pet.chooseItem('garland'), false);
  assert.equal(e.store.get('mathgamePet'), saved); assert.equal(coins(), 10);
  assert.equal(e.pet.info().age, 1); assert.equal(e.pet.info().studyDays, 0);
  assert.equal(setup().pet.chooseItem('sunflower'), false, '未领养不能买');
});
test('摆件：每个槽位只能放自己的摆件，价格单调且不超过 300', () => {
  const e = setup(); e.pet.adopt(); e.put('mathgameCoins', { coins: 2000 });
  const all = plain(e.pet.items), items = all.filter(i => !i.limited);
  assert.deepEqual(all.filter(i => i.limited).map(i => `${i.slot}:${i.id}:${i.cost}`), ['R:wishstar:0']);
  assert.equal(items.length, 12);
  assert.deepEqual(['L', 'R', 'H'].map(s => items.filter(i => i.slot === s).length), [4, 4, 4]);
  for (const s of ['L', 'R', 'H']) {
    const costs = items.filter(i => i.slot === s).map(i => i.cost);
    assert.deepEqual([...costs].sort((a, b) => a - b), costs); assert.ok(costs.every(c => c >= 80 && c <= 300));
  }
  for (const i of items) { assert.equal(e.pet.chooseItem(i.id), true); assert.equal(e.pet.get().put[i.slot], i.id); }
  assert.deepEqual(plain(e.pet.get().put), { L: 'fountain', R: 'tent', H: 'garland' });
});
test('限定摆件：签到奖品 grantItem 不扣星币、不替孩子摆出、重复与未领养都返回 false', () => {
  assert.equal(setup().pet.grantItem('wishstar'), false, '未领养不发');
  const e = setup(); e.pet.adopt(); e.put('mathgameCoins', { coins: 40 });
  assert.equal(e.pet.grantItem('ghost'), false);
  assert.equal(e.pet.grantItem('wishstar'), true);
  const p = e.pet.get();
  assert.deepEqual(plain(p.items), ['wishstar']); assert.deepEqual(plain(p.put), { L: '', R: '', H: '' });
  assert.equal(e.pet.coins(), 40, '不扣星币');
  assert.equal(e.pet.grantItem('wishstar'), false, '已有不重复发');
  assert.deepEqual(plain(e.pet.get().items), ['wishstar']);
});
test('摆件存档：脏数据被归一，put 必须是已拥有且槽位匹配', () => {
  const e = setup(); e.pet.adopt(); const p = e.read('mathgamePet');
  e.put('mathgamePet', { ...p, items: ['sunflower', 'sunflower', 'ghost', 7, 'mushroom'], put: { L: 'mushroom', R: 'mushroom', H: 'bunting', X: 'books' } });
  const g = e.pet.get();
  assert.deepEqual(plain(g.items), ['sunflower', 'mushroom']);
  assert.deepEqual(plain(g.put), { L: '', R: 'mushroom', H: '' });
  e.put('mathgamePet', { ...p, items: 'oops', put: null });
  assert.deepEqual(plain(e.pet.get().items), []); assert.deepEqual(plain(e.pet.get().put), { L: '', R: '', H: '' });
  const old = { ...p }; delete old.items; delete old.put; e.put('mathgamePet', old);
  assert.deepEqual(plain(e.pet.get().put), { L: '', R: '', H: '' });
});
test('购买摆件遇到宠物或钱包写入失败，原存档和余额均保留', () => {
  for (const key of ['mathgamePet', 'mathgameCoins']) {
    const e = setup(); e.pet.adopt(); e.put('mathgameCoins', { coins: 200 });
    const before = [...e.store]; e.failNext(key);
    assert.throws(() => e.pet.chooseItem('sunflower'), /存储/);
    assert.deepEqual([...e.store], before);
  }
});
test('备份带摆件可还原；摆件记录不正确时在写入前拒绝', () => {
  const e = setup(); e.pet.adopt(); e.put('mathgameCoins', { coins: 500 });
  e.pet.chooseItem('pinwheel'); e.pet.chooseItem('lantern');
  const before = e.store.get('mathgamePet'), b = e.pet.parseBackup(e.pet.backup());
  e.localStorage.removeItem('mathgamePet'); e.pet.restore(b);
  assert.equal(e.store.get('mathgamePet'), before);
  const saved = [...e.store];
  for (const patch of [p => { p.items = 'x'; }, p => { p.items = [1]; }, p => { p.put = 'x'; }, p => { p.put = { L: 5 }; }]) {
    const bad = plain(b), p = JSON.parse(bad.data.mathgamePet); patch(p); bad.data.mathgamePet = JSON.stringify(p);
    assert.throws(() => e.pet.restore(bad), /摆件/); assert.deepEqual([...e.store], saved);
  }
});
test('备份可还原宠物、学习与钱包；不包含其他业务键', () => {
  const e = setup(); e.pet.adopt(); e.pet.recordRound(5, 'a');
  e.put('mathgameCoins', { coins: 100 }); e.put('mathgameStars', { 1: 3 });
  e.put('unrelated', { private: true }); e.pet.chooseDecor('sea'); e.pet.claimGift(1);
  const before = e.store.get('mathgamePet'), b = e.pet.parseBackup(e.pet.backup());
  assert.equal(b.format, 'mathgame-travel'); assert.equal('unrelated' in b.data, false);
  e.put('mathgameCoins', { coins: 0 }); e.localStorage.removeItem('mathgamePet');
  e.put('mathgameTravelEndingSeen', 1); e.pet.restore(b);
  assert.equal(e.store.get('mathgamePet'), before); assert.equal(e.read('mathgameCoins').coins, 30);
  assert.equal(e.store.has('mathgameTravelEndingSeen'), false);
  assert.deepEqual(e.read('unrelated'), { private: true });
});
test('坏备份、越界日期、重复学习日、新版本与未知键在写入前拒绝', () => {
  const e = setup(); e.pet.adopt(); e.pet.recordRound(5, 'a');
  const original = e.pet.parseBackup(e.pet.backup()), saved = [...e.store];
  const bad = patch => {
    const b = plain(original), p = JSON.parse(b.data.mathgamePet);
    patch(p); b.data.mathgamePet = JSON.stringify(p);
    assert.throws(() => e.pet.restore(b)); assert.deepEqual([...e.store], saved);
  };
  bad(p => { p.adoptedDay = '2026-02-30'; });
  bad(p => { p.lastDay = '2025-12-31'; });
  bad(p => { p.days = ['2026-01-01', '2026-01-01']; });
  bad(p => { p.days = ['2026-01-02']; });
  bad(p => { p.daily.correct = 6; });
  bad(p => { p.daily.date = '2027-01-01'; });
  bad(p => { p.stage = 1; p.hatchDay = ''; });
  bad(p => { p.version = 3; });
  for (const text of ['{', '{}', 'x'.repeat(2000001), JSON.stringify({ ...original, data: {} }),
    JSON.stringify({ ...original, data: { unrelated: '{}' } }),
    JSON.stringify({ ...original, data: { mathgameWrongLog: '{}' } }),
    JSON.stringify({ ...original, data: { mathgameMaxCompletedLevel: '{}' } })]) {
    assert.throws(() => e.pet.parseBackup(text));
  }
  assert.deepEqual([...e.store], saved);
});
test('恢复写入失败逐键回滚，原宠物、钱包、星星仍在', () => {
  const e = setup(); e.pet.adopt(); e.put('mathgameCoins', { coins: 30 });
  e.put('mathgameStars', { 1: 2 }); const b = e.pet.parseBackup(e.pet.backup());
  e.put('mathgameCoins', { coins: 99 }); e.put('mathgameStars', { 6: 3 });
  const before = new Map(e.store); e.failNext('mathgameStars');
  assert.throws(() => e.pet.restore(b), /恢复未完成/);
  assert.deepEqual(e.store, before);
});
test('学习记录写入失败不虚记天数；存储恢复后可重新累计', () => {
  const e = setup(); e.pet.adopt(); const before = e.store.get('mathgamePet');
  e.failNext('mathgamePet'); assert.throws(() => e.pet.recordRound(5, 'failed'), /存储/);
  assert.equal(e.store.get('mathgamePet'), before); assert.equal(e.pet.info().studyDays, 0);
  assert.equal(e.pet.recordRound(5, 'failed').counted, true);
});
test('只登录90天不能代替学习；新版本存档读取报错且原样保留', () => {
  const e = setup(); e.pet.adopt(); e.setNow(at(2026, 3, 31));
  assert.equal(e.pet.info().age, 90); assert.equal(e.pet.info().studyDays, 0);
  assert.equal(e.pet.hatch(), false);
  const p = e.pet.get(); p.version = 3; e.put('mathgamePet', p);
  const before = e.store.get('mathgamePet'); assert.throws(() => e.pet.get(), /更新版本/);
  assert.equal(e.store.get('mathgamePet'), before);
});
if (!process.env.MG_PET_TZ_CHILD) {
  for (const zone of ['America/New_York', 'Asia/Shanghai']) test('完整规则在时区 ' + zone + ' 下保持一致', () => {
    const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], {
      env: { ...process.env, TZ: zone, MG_PET_TZ_CHILD: '1' }, encoding: 'utf8', timeout: 30000
    });
    if (child.error) throw child.error;
    assert.equal(child.status, 0, child.stdout + child.stderr);
  });
}
console.log(`\nPET CARE: pass=${pass} fail=${fail} timezone=${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
process.exitCode = fail ? 1 : 0;
