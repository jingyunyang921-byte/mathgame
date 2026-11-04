// Pure-JS forward pass for mnist-12.onnx (no ONNX Runtime, no WASM, fully offline).
// Graph (confirmed via .shots/parse_onnx.mjs):
//   Conv(5x5,SAME) Parameter5[8,1,5,5] + Parameter6 -> Relu -> MaxPool2x2/2   (28->14)
//   Conv(5x5,SAME) Parameter87[16,8,5,5] + Parameter88 -> Relu -> MaxPool3x3/3 (14->4)
//   flatten NCHW -> MatMul Parameter193[16,4,4,10] + Parameter194 -> 10 logits
// Input is the SAME 784-float (ink 0..255) that _toMnistInput already produces.
(function () {
  // --- minimal ONNX protobuf reader (one independent reader per submessage) ---
  function Reader(u8, dv, start, end) {
    let p = start;
    const varint = () => { let x = 0, s = 1; while (true) { const b = u8[p++]; x += (b & 0x7f) * s; if (!(b & 0x80)) break; s *= 128; } return x; };
    return {
      eof: () => p >= end,
      tag: () => { const t = varint(); return { field: t >>> 3, wire: t & 7 }; },
      vint: varint,
      range: () => { const len = varint(); const s = p; p += len; return { s, e: s + len }; },
      utf8: () => { const len = varint(); let str = ''; for (let i = 0; i < len; i++) str += String.fromCharCode(u8[p++]); return str; },
      floats: () => { const len = varint(); const cnt = len / 4; const a = new Float32Array(cnt); for (let i = 0; i < cnt; i++) { a[i] = dv.getFloat32(p, true); p += 4; } return a; },
      skip: (w) => { if (w === 0) varint(); else if (w === 2) { const len = varint(); p += len; } else if (w === 5) p += 4; else if (w === 1) p += 8; else throw new Error('wire ' + w); },
    };
  }
  // TensorProto: dims=1(int64 rep), data_type=2, float_data=4(packed f32), name=8, raw_data=9(bytes)
  function parseTensor(u8, dv, s, e) {
    const r = Reader(u8, dv, s, e); const t = { dims: [], dtype: 0, name: '', data: null };
    while (!r.eof()) {
      const { field, wire } = r.tag();
      if (field === 1 && wire === 0) t.dims.push(r.vint());
      else if (field === 1 && wire === 2) { const rr = r.range(); const sub = Reader(u8, dv, rr.s, rr.e); while (!sub.eof()) t.dims.push(sub.vint()); }
      else if (field === 2) t.dtype = r.vint();
      else if (field === 8) t.name = r.utf8();
      else if (field === 9) t.data = r.floats();            // raw_data
      else if (field === 4 && wire === 2) t.data = r.floats(); // float_data (packed)
      else r.skip(wire);
    }
    return t;
  }
  function parseWeights(u8) {
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    const top = Reader(u8, dv, 0, u8.length);
    let g = null;                                   // ModelProto.graph = field 7
    while (!top.eof()) { const { field, wire } = top.tag(); if (field === 7 && wire === 2) { g = top.range(); break; } else top.skip(wire); }
    if (!g) throw new Error('no graph');
    const gr = Reader(u8, dv, g.s, g.e); const W = {}; // GraphProto.initializer = field 5
    while (!gr.eof()) { const { field, wire } = gr.tag(); if (field === 5 && wire === 2) { const r = gr.range(); const t = parseTensor(u8, dv, r.s, r.e); if (t.dtype === 1 && t.data) W[t.name] = t; } else gr.skip(wire); }
    return W;
  }

  function relu(a) { for (let i = 0; i < a.length; i++) if (a[i] < 0) a[i] = 0; return a; }

  // stride-1, SAME (pad = (K-1)/2 each side, K odd). in/out: [C,H,W] flat. weight [Co,Ci,K,K], bias [Co].
  function convSame(inp, Ci, H, Wd, wt, Co, K, bias) {
    const pad = (K - 1) >> 1, out = new Float32Array(Co * H * Wd);
    for (let o = 0; o < Co; o++) {
      const b = bias[o];
      for (let y = 0; y < H; y++) for (let x = 0; x < Wd; x++) {
        let acc = b;
        for (let ci = 0; ci < Ci; ci++) {
          const inBase = ci * H * Wd, wBase = ((o * Ci) + ci) * K * K;
          for (let ky = 0; ky < K; ky++) {
            const iy = y + ky - pad; if (iy < 0 || iy >= H) continue;
            for (let kx = 0; kx < K; kx++) {
              const ix = x + kx - pad; if (ix < 0 || ix >= Wd) continue;
              acc += inp[inBase + iy * Wd + ix] * wt[wBase + ky * K + kx];
            }
          }
        }
        out[(o * H + y) * Wd + x] = acc;
      }
    }
    return out;
  }

  // max pool, no padding, floor. in [C,H,W] -> out [C,OH,OW]
  function maxPool(inp, C, H, Wd, k, s) {
    const OH = Math.floor((H - k) / s) + 1, OW = Math.floor((Wd - k) / s) + 1, out = new Float32Array(C * OH * OW);
    for (let c = 0; c < C; c++) {
      const inBase = c * H * Wd;
      for (let oy = 0; oy < OH; oy++) for (let ox = 0; ox < OW; ox++) {
        let m = -Infinity;
        for (let ky = 0; ky < k; ky++) for (let kx = 0; kx < k; kx++) { const v = inp[inBase + (oy * s + ky) * Wd + (ox * s + kx)]; if (v > m) m = v; }
        out[(c * OH + oy) * OW + ox] = m;
      }
    }
    return out;
  }

  function MnistNet(u8onnx) {
    const W = parseWeights(u8onnx);
    const need = ['Parameter5', 'Parameter6', 'Parameter87', 'Parameter88', 'Parameter193', 'Parameter194'];
    for (const n of need) if (!W[n] || !W[n].data) throw new Error('missing weight ' + n);
    const w1 = W['Parameter5'].data, b1 = W['Parameter6'].data;   // [8,1,5,5],[8]
    const w2 = W['Parameter87'].data, b2 = W['Parameter88'].data; // [16,8,5,5],[16]
    const fc = W['Parameter193'].data, fb = W['Parameter194'].data; // [16,4,4,10],[10]
    return {
      // input: Float32Array(784), ink 0..255 (same as _toMnistInput output)
      predict(input) {
        let a = convSame(input, 1, 28, 28, w1, 8, 5, b1); relu(a);
        a = maxPool(a, 8, 28, 28, 2, 2);                 // [8,14,14]
        a = convSame(a, 8, 14, 14, w2, 16, 5, b2); relu(a);
        a = maxPool(a, 16, 14, 14, 3, 3);                // [16,4,4]
        const logits = new Float32Array(10);
        for (let o = 0; o < 10; o++) { let acc = fb[o]; for (let idx = 0; idx < 256; idx++) acc += a[idx] * fc[idx * 10 + o]; logits[o] = acc; }
        let mi = 0, mv = -Infinity; for (let i = 0; i < 10; i++) if (logits[i] > mv) { mv = logits[i]; mi = i; }
        return { logits: logits, arg: mi };
      }
    };
  }

  if (typeof window !== 'undefined') window.MnistNet = MnistNet;
  if (typeof module !== 'undefined' && module.exports) module.exports = { MnistNet, parseWeights };
})();
