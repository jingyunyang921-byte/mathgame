// 静态稿 2a：开场卡改「三步图示卡」。用法：node .shots/_draft_eb_intro.mjs [lv:mode,..] [WxH]
// 做法：真实进游戏后，把 #intro-overlay 手动打开并改写内容（不改产品代码），再截图。
import { petBrowser } from './pet_browser.mjs';
import { SEED } from './_draft_eb_lib.mjs';
const specs = (process.argv[2] || '1:visual,3:audio,5:visual').split(',').map(s => s.split(':'));
const [W, H] = (process.argv[3] || '960x576').split('x').map(Number);
const CSS = `
#intro-box{max-width:420px!important;padding:22px 22px 20px!important}
#intro-icon{font-size:40px!important;margin-bottom:4px!important}#intro-icon .ic{width:52px!important;height:52px!important}
#intro-title{font-size:19px!important;margin-bottom:14px!important}
#intro-rule{margin:0 0 10px!important;line-height:1!important}
.st-row{display:flex;align-items:flex-start;justify-content:center;gap:2px}
.st{width:82px;display:flex;flex-direction:column;align-items:center;gap:6px;position:relative}
.st-c{width:60px;height:60px;border-radius:50%;background:#FFF1DC;border:3px solid #F2C48C;display:flex;align-items:center;justify-content:center;position:relative;box-sizing:border-box}
.st-c>svg.ic{width:34px;height:34px;color:var(--c-primary)}
.st i{position:absolute;left:4px;top:-5px;z-index:2;width:21px;height:21px;border-radius:50%;background:#FF8A3D;color:#fff;font:900 13px/21px system-ui,sans-serif;font-style:normal;text-align:center}
.st span{font-size:15px;font-weight:900;color:var(--c-ink);white-space:nowrap}
.st-a{width:12px;height:12px;margin:24px 0 0;border-top:4px solid #F2A65A;border-right:4px solid #F2A65A;transform:rotate(45deg) scale(.8);box-sizing:border-box;flex:none}
.st-egg>svg:first-child{width:58px!important;height:58px!important;display:block;overflow:visible}
.st-egg .mat-art{position:absolute;left:-12px;bottom:-7px;width:24px;height:24px;background:#fff;border-radius:50%;border:2px solid #F2C48C;box-sizing:content-box;padding:1px}
#intro-prize{margin-top:2px!important;font-size:14px!important;padding:6px 12px!important}#intro-prize .mat-art{width:24px;height:24px}
`;
const FILL = (lv, mode) => `(() => {
  const lv = ${lv}, mode = '${mode}', S = window.MG_PET_STORY, P = window.MG_PET;
  const st = document.createElement('style'); st.textContent = ${JSON.stringify(CSS)}; document.head.appendChild(st);
  const info = LEVEL_INTROS[lv], m = P.mats[lv];
  const ic = (id) => '<svg class="ic" viewBox="0 0 24 24"><use href="#' + id + '"/></svg>';
  const s1 = mode === 'audio' ? ['i-ear', '听题'] : ['i-eye', '看题'];
  const s2 = lv === 5 ? ['i-gate', '选对门'] : mode === 'audio' ? ['i-mic', '说答案'] : ['i-pencil', '写答案'];
  const ov = document.getElementById('intro-overlay');
  ov.style.background = LEVEL_OVERLAY_BG[lv]; ov.style.display = 'flex';
  document.getElementById('intro-icon').innerHTML = '<svg class="ic" viewBox="0 0 24 24"><use href="#' + info.icon + '"/></svg>';
  document.getElementById('intro-title').textContent = info.title;
  document.getElementById('intro-rule').innerHTML = '<div class="st-row">'
    + '<div class="st"><i>1</i><b class="st-c">' + ic(s1[0]) + '</b><span>' + s1[1] + '</span></div><em class="st-a"></em>'
    + '<div class="st"><i>2</i><b class="st-c">' + ic(s2[0]) + '</b><span>' + s2[1] + '</span></div><em class="st-a"></em>'
    + '<div class="st"><i>3</i><b class="st-c st-egg">' + S.egg(0, 'st-eg') + S.matArt(lv) + '</b><span>材料进窝</span></div></div>';
  document.getElementById('intro-prize').innerHTML = S.matArt(lv) + '<span>答对10题，送' + m.name + '给蛋</span>';
  return true; })()`;
const MEASURE = `(() => {
  const out = {};
  const box = document.getElementById('intro-box'), r = box.getBoundingClientRect(), row = document.querySelector('.st-row').getBoundingClientRect();
  out.box = [r.left | 0, r.top | 0, r.width | 0, r.height | 0]; out.rowW = row.width | 0; out.boxScroll = box.scrollHeight - box.clientHeight;
  out.rowFits = row.right <= r.right - 8 && row.left >= r.left + 8;
  return out; })()`;
const b = await petBrowser();
try {
  await b.nav(b.menu); await b.preserve();
  await b.viewport(W, H);
  for (const [lvS, mode] of specs) {
    const lv = Number(lvS);
    await b.ev(SEED);
    await b.boot(lv, mode);
    await b.sleep(500);
    await b.ev(FILL(lv, mode));
    await b.sleep(900);
    const info = await b.ev(MEASURE);
    console.log(`L${lv} ${mode} ${W}x${H}`, JSON.stringify(info));
    await b.shot(`eb_2a_L${lv}_${mode}_${W}x${H}`);
  }
  console.log('done, errors=', JSON.stringify(b.errors));
} finally { try { await b.restore(); } finally { await b.close(); } }
