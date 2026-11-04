// 小度AI老师 TTS 探测：按 Launcher/AiEye 的 TTsUtils 同一套签名发一次请求，看返回格式。
// 用法：BASE=… CLIENT_ID=… CUID=… SALT=… [SCENE=math] [STREAM=1] node tts_probe.mjs "要读的话"
import crypto from 'node:crypto';
import fs from 'node:fs';
const { BASE, CLIENT_ID, CUID, SALT, SCENE = 'math', STREAM = '' } = process.env;
if (!BASE || !CLIENT_ID || !CUID || !SALT) { console.error('缺 BASE/CLIENT_ID/CUID/SALT'); process.exit(2); }
const text = process.argv[2] || '你好呀，我们一起来答题吧';
const u = new URL(BASE);
const p = Object.fromEntries(u.searchParams);
Object.assign(p, { clientId: CLIENT_ID, cuid: CUID, per: 'system', ts: String(Math.floor(Date.now() / 1000)), text });
if (!p.scene) p.scene = SCENE;
if (STREAM) p.stream = 'true';
p.sign = crypto.createHash('md5').update(SALT + Object.keys(p).sort().map(k => k + '=' + p[k]).join('&')).digest('hex');
const base = u.origin + u.pathname;
const enc = encodeURIComponent;
let res;
if (STREAM) res = await fetch(base, { method: 'POST', headers: { accept: 'application/json, text/plain, */*', 'content-type': 'application/json' }, body: JSON.stringify(p) });
else res = await fetch(base + '?' + Object.entries(p).map(([k, v]) => enc(k) + '=' + enc(v)).join('&'), { redirect: process.env.MANUAL ? 'manual' : 'follow' });
const buf = Buffer.from(await res.arrayBuffer());
console.log('status', res.status, '| type', res.headers.get('content-type'), '| bytes', buf.length, '| redirected', res.redirected); const loc = res.headers.get('location'); if (loc) { const L = new URL(loc, base); console.log('location', L.protocol + '//' + L.host + L.pathname); }
fs.mkdirSync('out', { recursive: true });
fs.writeFileSync('out/tts_probe.bin', buf);
console.log('head', JSON.stringify(buf.subarray(0, 300).toString('latin1').replace(/[^\x20-\x7e]/g, '.')));
if (process.env.UPGRADE && loc) {
  const L = new URL(loc, base).href;
  for (const [label, url] of [['http', L], ['https-upgraded', L.replace(/^http:/, 'https:')]]) {
    try { const r = await fetch(url, { redirect: 'manual' }); const b = Buffer.from(await r.arrayBuffer()); const l2 = r.headers.get('location'); const N = l2 && new URL(l2, url); console.log(label, r.status, r.headers.get('content-type'), b.length, N ? 'location→' + N.protocol + '//' + N.host + N.pathname : ''); } catch (e) { console.log(label, 'ERR', String(e)); }
  }
}
