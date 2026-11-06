// 新设备 = 全新进度。两层闸门：
//   静态：Android 清单关云备份/换机迁移（allowBackup=false + dataExtractionRules 两处全排除）、原生层不落任何持久存档、APK 外壳无服务器地址。
//   动态：用「全新浏览器上下文」（存储为空，等同新设备）打开菜单和游戏页，localStorage 只能有版本闸门，所有进度读数为 0。
// Needs: headless Chrome --remote-debugging-port=9333 + http.server :8000 in e:/mathgame/mathgame.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = 'e:/mathgame/mathgame';
const BROWSER = 'http://localhost:9333';
let fail = 0;
const P = (ok, label, extra) => { console.log((ok ? 'PASS ' : 'FAIL ') + label + (extra != null ? '  ' + extra : '')); if (!ok) fail++; };

// ---------- 静态：Android 外壳 ----------
console.log('\n-- 静态：Android 备份/迁移 --');
const manifest = readFileSync(ROOT + '/android/app/src/main/AndroidManifest.xml', 'utf8');
P(/android:allowBackup="false"/.test(manifest), '清单 allowBackup="false"');
P(/android:dataExtractionRules="@xml\/data_extraction_rules"/.test(manifest), '清单指向 data_extraction_rules（Android 12+ 换机迁移靠它拦）');
P(!/backupAgent|fullBackupContent|fullBackupOnly/.test(manifest), '清单没有 backupAgent / fullBackupContent / fullBackupOnly');
const rules = readFileSync(ROOT + '/android/app/src/main/res/xml/data_extraction_rules.xml', 'utf8').replace(/<!--[\s\S]*?-->/g, '');
for (const block of ['cloud-backup', 'device-transfer']) {
  const m = rules.match(new RegExp('<' + block + '>([\\s\\S]*?)</' + block + '>'));
  const body = m ? m[1] : '';
  const excluded = [...body.matchAll(/<exclude\s+domain="(\w+)"/g)].map(x => x[1]).sort();
  P(!!m, block + ' 段存在');
  P(['database', 'external', 'file', 'root', 'sharedpref'].every(d => excluded.includes(d)), block + ' 排除 root/file/database/sharedpref/external 五域', JSON.stringify(excluded));
  P(!/<include\b/.test(body), block + ' 没有 include 白名单');
}
const javaDir = ROOT + '/android/app/src/main/java';
const javaFiles = []; (function walk(d) { for (const n of readdirSync(d)) { const p = join(d, n); statSync(p).isDirectory() ? walk(p) : /\.(java|kt)$/.test(n) && javaFiles.push(p); } })(javaDir);
// 唯一放行：云端 TTS 请求参数 cuid 默认取 ANDROID_ID（用户已确认），它只拼进请求，不落盘、不进存档。
const javaSrc = javaFiles.map(f => readFileSync(f, 'utf8')).join('\n')
  .replace('id = Settings.Secure.getString(ctx.getContentResolver(), Settings.Secure.ANDROID_ID);', '');
P(javaFiles.length > 0, '扫到原生源码', javaFiles.length + ' 个文件');
P(!/SharedPreferences|getExternal|Environment\.|openFileOutput|Settings\.Secure|ANDROID_ID|UUID/.test(javaSrc), '原生层不写 SharedPreferences/外部存储/设备号（存档只在 WebView localStorage）');
const capCfg = JSON.parse(readFileSync(ROOT + '/capacitor.config.json', 'utf8'));
P(!capCfg.server, 'capacitor.config 没有 server 块（不连远端、不共享来源）');

// ---------- 动态：全新浏览器上下文 ----------
const ver = await (await fetch(BROWSER + '/json/version')).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let _id = 0; const pending = new Map(); const waiters = [];
ws.onmessage = e => { const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  else if (m.method) { for (let i = waiters.length - 1; i >= 0; i--) if (waiters[i].pred(m)) waiters.splice(i, 1)[0].res(m); } };
const send = (method, params, sessionId) => { const id = ++_id; const msg = { id, method, params: params || {} }; if (sessionId) msg.sessionId = sessionId;
  return new Promise((res, rej) => { pending.set(id, m => m.error ? rej(new Error(method + ':' + JSON.stringify(m.error))) : res(m.result)); ws.send(JSON.stringify(msg)); }); };
const waitEvent = (pred, ms = 15000) => new Promise((res, rej) => { const w = { pred, res }; waiters.push(w); setTimeout(() => { const i = waiters.indexOf(w); if (i >= 0) { waiters.splice(i, 1); rej(new Error('timeout')); } }, ms); });
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function freshDevice() {
  const { browserContextId } = await send('Target.createBrowserContext');
  const { targetId } = await send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId); await send('Runtime.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 576, deviceScaleFactor: 1, mobile: false }, sessionId);
  const ev = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId)).result.value;
  const nav = async (url, wait = 2000) => { const n = waitEvent(m => m.method === 'Page.loadEventFired' && m.sessionId === sessionId); await send('Page.navigate', { url }, sessionId); await n; await sleep(wait); };
  const close = async () => { await send('Target.closeTarget', { targetId }); await send('Target.disposeBrowserContext', { browserContextId }); };
  return { ev, nav, close };
}
const KEYS = `JSON.stringify(Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])))`;
const ALLOWED = { mathgameLevelsVer: '2' };
const onlyAllowed = o => Object.keys(o).every(k => k in ALLOWED && o[k] === ALLOWED[k]);

console.log('\n-- 动态：全新设备打开菜单 --');
const dev = await freshDevice();
await dev.nav('http://localhost:8000/menu.html');
const menuKeys = JSON.parse(await dev.ev(KEYS));
P(onlyAllowed(menuKeys), '首次开菜单 localStorage 只有版本闸门 mathgameLevelsVer=2', JSON.stringify(menuKeys));
const st = JSON.parse(await dev.ev(`JSON.stringify({
  stars: getTotalStars(), done: getCompletedCount(), coins: getCoins(), rank: getRank(getTotalStars()).title,
  daily: getDaily(), pet: MG_PET.get(), wrong: getWrongLog().length, badges: Object.keys(getBadges() || {}).length,
  sprint: [getSprintBest(1), getSprintBest(2), getSprintBest(3)],
  shown: [...document.querySelectorAll('.modal.show, .overlay.show, [aria-hidden="false"]')].map(n => n.id || n.className).filter(Boolean),
  guide: document.getElementById('confirmTitle').textContent, dot: document.getElementById('petBtn').classList.contains('need-adopt')
})`));
P(st.stars === 0 && st.done === 0, '星星 0 / 通关数 0', JSON.stringify([st.stars, st.done]));
P(st.coins === 0, '星币 0', String(st.coins));
P(st.rank === '小小旅人', '段位=小小旅人', st.rank);
P(st.daily.last === '' && st.daily.streak === 0 && st.daily.total === 0 && st.daily.doneToday === false, '打卡：没有记录/连签 0/累计 0/今天未打', JSON.stringify(st.daily));
P(st.pet.adopted === false && st.pet.xp === 0 && st.pet.stage === 0 && st.pet.gifts.length === 0 && st.pet.items.length === 0 && st.pet.decors.length === 1 && st.pet.decors[0] === 'leaf',
  '数宝：未领养/能量 0/无礼物/无摆件/只有默认窝色', JSON.stringify({ a: st.pet.adopted, xp: st.pet.xp, g: st.pet.gifts.length, i: st.pet.items.length, d: st.pet.decors }));
P(Object.values(st.pet.bag).every(v => v === 0) && Object.values(st.pet.used).every(v => v === 0), '材料背包/已用份数全 0');
P(st.wrong === 0, '错题本为空', String(st.wrong));
P(st.badges === 0, '勋章墙无已解锁', String(st.badges));
P(st.sprint.every(v => !v), '速算三档纪录都没有', JSON.stringify(st.sprint));
P(st.shown.length === 1 && st.shown[0] === 'confirmModal' && st.guide === '先领一颗萌蛋吧', '没有庆祝类弹窗（大结局/升段/勋章/打卡日历/数宝出生）；唯一弹出的是领养萌蛋引导', JSON.stringify([st.shown, st.guide]));
P(st.dot === true, '顶栏萌宠钮亮着领养小红点');

console.log('\n-- 动态：全新设备进游戏页（第 1 关 / 第 6 关 / 一分钟速算）不写进度 --');
for (const [name, lv, extra] of [['L1', '1', ''], ['L6', '6', ''], ['速算', '0', `sessionStorage.setItem('mgSprint','1');sessionStorage.setItem('mgSprintTier','1');`]]) {
  await dev.ev(`sessionStorage.setItem('gameLevel','${lv}');sessionStorage.setItem('gameMode','visual');sessionStorage.setItem('mgIntroHeard','[1,2,3,4,5,6]');${extra}true`);
  await dev.nav('http://localhost:8000/index.html', 2500);
  const k = JSON.parse(await dev.ev(KEYS));
  P(onlyAllowed(k), name + ' 开局后 localStorage 仍只有版本闸门', JSON.stringify(k));
}
await dev.close();

console.log('\n-- 动态：两台「设备」互不相通（验证全新上下文这个测法本身有效） --');
const a = await freshDevice();
await a.nav('http://localhost:8000/menu.html', 800);
await a.ev(`localStorage.setItem('mathgameCoins', JSON.stringify({ coins: 999 })); true`);
const b = await freshDevice();
await b.nav('http://localhost:8000/menu.html', 800);
P(JSON.parse(await a.ev(KEYS)).mathgameCoins != null, '设备 A 写入星币成功');
P(await b.ev(`getCoins()`) === 0 && !('mathgameCoins' in JSON.parse(await b.ev(KEYS))), '设备 B 看不到 A 的星币（存储隔离）');
await a.close(); await b.close();

console.log('\n===== ' + (fail === 0 ? 'ALL PASS' : fail + ' FAILURE(S)') + ' =====');
ws.close();
process.exit(fail === 0 ? 0 : 1);
