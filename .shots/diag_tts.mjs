// Diagnostic (no navigation): enter L1 audio, observe whether NATIVE TTS is actually used
// and how long _ttsSpeaking stays true, plus voice settings/volume. Tells us if the earlier
// repros were even hitting a real "TTS speaking" window.
const CDP = 'http://localhost:9222';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function conn(match) {
  for (let i = 0; i < 40; i++) {
    try {
      const info = await (await fetch(CDP + '/json')).json();
      const pages = info.filter(t => t.type === 'page' && t.webSocketDebuggerUrl);
      const page = (match ? pages.find(p => match.test(p.url)) : null) || pages[0];
      if (!page) { await sleep(300); continue; }
      const ws = new WebSocket(page.webSocketDebuggerUrl);
      await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
      let _id = 0; const pend = new Map();
      ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
      const send = (m, p) => { const id = ++_id; return new Promise((res, rej) => { pend.set(id, x => x.error ? rej(new Error(m + ':' + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify({ id, method: m, params: p || {} })); }); };
      await send('Page.enable'); await send('Runtime.enable');
      const ev = (expr, ret = true) => send('Runtime.evaluate', { expression: expr, returnByValue: ret, awaitPromise: true, userGesture: true });
      return { ev, send, url: page.url, close: () => { try { ws.close(); } catch (e) {} } };
    } catch (e) { await sleep(400); }
  }
  throw new Error('connect failed');
}
let c = await conn();
await c.ev(`sessionStorage.setItem('gameLevel','1');sessionStorage.setItem('gameMode','audio');location.href='game.html';`, false).catch(() => {});
c.close(); await sleep(2600);
c = await conn(/game\.html/);
const env = (await c.ev(`(() => ({
  hasCap: !!window.Capacitor, native: !!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform()),
  hasTts: !!(window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.Tts),
  hasTtsStop: !!(window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.Tts&&Capacitor.Plugins.Tts.stop),
  hasVosk: !!(window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.Vosk),
  voiceSetting: (function(){try{return (JSON.parse(localStorage.getItem('mathgameSettings')||'{}')).voice;}catch(e){return 'err';}})(),
  voiceVol: (typeof mgVol==='function')? mgVol('voice') : 'n/a'
}))()`)).result.value;
console.log('env:', JSON.stringify(env));
// Watch _ttsSpeaking over ~6s
const samples = [];
for (let i = 0; i < 60; i++) {
  const s = (await c.ev(`(() => { const g=window._currentGame; return { t:Date.now()%100000, g:!!g, spk: g? !!g._ttsSpeaking : null, isNat: g? !!g._isNativeVoice : null, status:(document.getElementById('float-voice-status')||{}).textContent||'' }; })()`)).result.value;
  samples.push(s);
  await sleep(100);
}
const spkTrue = samples.filter(s => s.spk).length;
console.log('isNativeVoice:', samples.find(s=>s.g)?.isNat);
console.log('_ttsSpeaking true in', spkTrue, 'of', samples.length, 'samples (~'+ (spkTrue*100) +'ms)');
console.log('status timeline:', [...new Set(samples.map(s=>s.status))].join(' | '));
// Now directly probe: call native Tts.speak with a long utterance and see if promise settles / how the plugin behaves
const ttsProbe = (await c.ev(`(async () => {
  if(!(window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.Tts)) return 'no-tts';
  const t0=Date.now(); let outcome='pending';
  try { await Capacitor.Plugins.Tts.speak({text:'一 二 三 四 五 六 七 八 九 十', rate:0.9, volume:1, lang:'zh-CN'}); outcome='resolved'; }
  catch(e){ outcome='rejected:'+(e&&e.message||e); }
  return outcome+' in '+(Date.now()-t0)+'ms';
})()`)).result.value;
console.log('direct Tts.speak:', ttsProbe);
c.close(); process.exit(0);
