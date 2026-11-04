// 确认弹窗（替代原生 confirm）验证 via 本地 Chrome :9333（1000×576）。
// 断言 #confirmModal 存在 + mgConfirm/hideConfirm 行为（显隐/文案/取消=false/确定=true）+ 清空错题本/重置进度真流程 + 无 JS 错误 + 截图。
import { writeFileSync, mkdirSync } from 'fs';
const CDP = 'http://localhost:9333';
const OUT = '.shots/out';
try { mkdirSync(OUT, { recursive: true }); } catch (e) {}
const info = await (await fetch(CDP + '/json')).json();
const page = info.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || info[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let _id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p) => { const id = ++_id; return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify({ id, method: m, params: p || {} })); }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const evalJS = async (expr, awaitP = false) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: awaitP })).result.value;
await send('Page.enable'); await send('Runtime.enable');
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 576, deviceScaleFactor: 1, mobile: false });
let fail = 0; const P = (ok, l, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + (x != null ? '  ' + x : '')); if (!ok) fail++; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64')); };

await send('Page.navigate', { url: 'http://localhost:8000/menu.html' }); await sleep(400);
// 预埋 5 道错题，重载让错题本有「清空」入口
await evalJS(`window.__err=null;addEventListener('error',e=>window.__err=String(e.message));
  localStorage.setItem('mathgameWrongLog', JSON.stringify([1,2,3,4,5].map(i=>({q:(60+i)+' − '+i,a:60,u:i,lv:2,n:1,t:Date.now()}))));`);
await send('Page.reload'); await sleep(900);

// 基础存在性
const base = await evalJS(`({ hasModal: !!document.getElementById('confirmModal'), hasFn: typeof mgConfirm==='function' && typeof hideConfirm==='function',
   noNativeConfirm: !/\\bconfirm\\(/.test(clearWrongLog.toString()) && !/\\bconfirm\\(/.test(resetProgress.toString()) })`);
P(base.hasModal, '#confirmModal 节点存在');
P(base.hasFn, 'mgConfirm/hideConfirm 已定义');
P(base.noNativeConfirm, 'clearWrongLog/resetProgress 不再调用原生 confirm');

// 直接调 mgConfirm：显示 + 文案 + 危险键
const shown = await evalJS(`(() => {
  window.__p = mgConfirm({ title:'确定要清空错题本吗？', msg:'这 5 道错题记录会被删除，且无法恢复。', okText:'清空', cancelText:'取消' });
  const m = document.getElementById('confirmModal');
  const okBtn = document.getElementById('confirmOkBtn');
  return { visible: m.classList.contains('show') && getComputedStyle(m).display==='flex',
    title: document.getElementById('confirmTitle').textContent, msg: document.getElementById('confirmMsg').textContent,
    ok: okBtn.textContent, cancel: document.getElementById('confirmCancelBtn').textContent,
    danger: okBtn.classList.contains('danger'), ghost: document.getElementById('confirmCancelBtn').classList.contains('ghost'),
    z: getComputedStyle(m).zIndex };
})()`);
await sleep(150);
P(shown.visible, 'mgConfirm 显示弹窗(.show/display:flex)', 'z=' + shown.z);
P(shown.title === '确定要清空错题本吗？' && shown.msg.includes('5 道') && shown.ok === '清空' && shown.cancel === '取消', '文案/按钮文字正确', JSON.stringify([shown.title, shown.ok, shown.cancel]));
P(shown.danger && shown.ghost, '确认键 danger / 取消键 ghost 样式', 'danger=' + shown.danger + ' ghost=' + shown.ghost);
await shot('confirm_clear');

// 取消 → Promise 解析 false + 弹窗隐藏
const cancelRes = await evalJS(`(async () => { hideConfirm(false); const r = await window.__p; const m = document.getElementById('confirmModal'); return { r, hidden: !m.classList.contains('show') }; })()`, true);
P(cancelRes.r === false && cancelRes.hidden, '点取消→resolve(false) 且弹窗隐藏', JSON.stringify(cancelRes));

// 确定 → Promise 解析 true
const okRes = await evalJS(`(async () => { const p = mgConfirm({ title:'t', msg:'m' }); hideConfirm(true); return await p; })()`, true);
P(okRes === true, '点确定→resolve(true)');

// 真流程：清空错题本（showMistakes 打开错题本，clearWrongLog 弹确认叠在其上）
await evalJS(`showMistakes();`); await sleep(200);
await evalJS(`window.__clr = clearWrongLog();`); await sleep(200);
await shot('confirm_over_mistake');
const clrFlow = await evalJS(`(async () => {
  const m = document.getElementById('confirmModal'); const over = m.classList.contains('show');
  hideConfirm(true); await window.__clr;
  return { over, logLen: JSON.parse(localStorage.getItem('mathgameWrongLog')||'[]').length };
})()`, true);
P(clrFlow.over, '清空错题本：确认弹窗叠加在错题本之上');
P(clrFlow.logLen === 0, '清空错题本：确定后错题记录已删除', 'len=' + clrFlow.logLen);

// 真流程：重置进度（设置弹窗里触发）截图
await evalJS(`localStorage.setItem('mathgameWrongLog','[]'); showSettings();`); await sleep(150);
await evalJS(`resetProgress();`); await sleep(200);
await shot('confirm_over_settings');
const rstOver = await evalJS(`document.getElementById('confirmModal').classList.contains('show')`);
P(rstOver, '重置进度：确认弹窗叠加在设置之上');
await evalJS(`hideConfirm(false);`);

// 退出游戏确认：帆船图标 + 暖橙确认键；随后默认调用必须回到垃圾桶 + 红色 danger（不被上一次污染）
const probe = `(() => { const m = document.getElementById('confirmModal'), ok = document.getElementById('confirmOkBtn'), b = m.querySelector('.modal-icon');
  return { icon: b.querySelector('use').getAttribute('href'), badge: b.className, danger: ok.classList.contains('danger'),
    okBg: getComputedStyle(ok).backgroundImage, sprite: !!document.querySelector('symbol#i-sail') }; })()`;
await evalJS(`window.__p = mgConfirm({ title:'要退出游戏吗？', msg:'下次再来闯关大冒险吧！', okText:'退出', cancelText:'再玩一会', icon:'i-sail', tone:'warm' });`);
await sleep(300);
const exitDlg = await evalJS(probe);
await shot('confirm_exit');
await evalJS(`hideConfirm(false);`);
P(exitDlg.sprite && exitDlg.icon === '#i-sail' && /warm/.test(exitDlg.badge) && !/danger/.test(exitDlg.badge) && !exitDlg.danger && exitDlg.okBg.includes('255, 138, 61'), '退出弹窗：帆船图标 + 暖橙确认键（非红色）', JSON.stringify(exitDlg));
await evalJS(`window.__p = mgConfirm({ title:'t', msg:'m' });`);
const dfl = await evalJS(probe);
await evalJS(`hideConfirm(false);`);
P(dfl.icon === '#i-reset' && /danger/.test(dfl.badge) && dfl.danger, '默认调用恢复垃圾桶 + 红色 danger', JSON.stringify(dfl));

P(!(await evalJS('window.__err')), '无 JS 错误', await evalJS('window.__err'));

console.log('\n截图：' + OUT + '/confirm_{clear,over_mistake,over_settings}.png');
console.log(fail === 0 ? '=== 确认弹窗 验证全过 ===' : '=== ' + fail + ' FAIL ===');
ws.close(); process.exit(fail ? 1 : 0);
