// 解析 mnist-12.onnx：转储图节点(op_type/输入输出/属性) + initializer(名/形状/类型/存储方式)。
import { readFileSync } from 'fs';
const buf = readFileSync('models/mnist-12.onnx');

function Reader(b, start = 0, end = b.length) {
  let p = start;
  const varint = () => { let x = 0n, s = 0n; while (true) { const c = b[p++]; x |= BigInt(c & 0x7f) << s; if (!(c & 0x80)) break; s += 7n; } return x; };
  const vint = () => Number(varint());
  return {
    eof: () => p >= end,
    tag: () => { const t = vint(); return { field: t >>> 3, wire: t & 7 }; },
    vint, varint,
    bytes: () => { const len = vint(); const s = p; p += len; return b.subarray(s, p); },
    f32: () => { const v = b.readFloatLE(p); p += 4; return v; },
    skip: (wire) => { if (wire === 0) varint(); else if (wire === 2) { const len = vint(); p += len; } else if (wire === 5) p += 4; else if (wire === 1) p += 8; else throw new Error('wire ' + wire); },
    pos: () => p,
  };
}

// TensorProto: dims=1(int64 rep), data_type=2, float_data=4(packed f32 or rep), name=8(str), raw_data=9(bytes)
function parseTensor(b) {
  const r = Reader(b); const t = { dims: [], data_type: 0, name: '', rawLen: 0, floatCount: 0 };
  while (!r.eof()) {
    const { field, wire } = r.tag();
    if (field === 1 && wire === 0) t.dims.push(r.vint());
    else if (field === 1 && wire === 2) { const sub = Reader(r.bytes()); while (!sub.eof()) t.dims.push(sub.vint()); } // packed
    else if (field === 2) t.data_type = r.vint();
    else if (field === 8) t.name = Buffer.from(r.bytes()).toString('utf8');
    else if (field === 9) t.rawLen = r.bytes().length;
    else if (field === 4 && wire === 2) t.floatCount = r.bytes().length / 4;
    else if (field === 4 && wire === 5) { t.floatCount++; r.skip(5); }
    else r.skip(wire);
  }
  return t;
}

// AttributeProto: name=1(str), i=3(int64), s=4(bytes), ints=8(rep/packed int64)
function parseAttr(b) {
  const r = Reader(b); const a = { name: '', i: null, s: null, ints: [] };
  while (!r.eof()) {
    const { field, wire } = r.tag();
    if (field === 1) a.name = Buffer.from(r.bytes()).toString('utf8');
    else if (field === 3) a.i = r.vint();
    else if (field === 4) a.s = Buffer.from(r.bytes()).toString('utf8');
    else if (field === 8 && wire === 0) a.ints.push(r.vint());
    else if (field === 8 && wire === 2) { const sub = Reader(r.bytes()); while (!sub.eof()) a.ints.push(sub.vint()); }
    else r.skip(wire);
  }
  return a;
}

// NodeProto: input=1(str rep), output=2(str rep), name=3, op_type=4, attribute=5(rep)
function parseNode(b) {
  const r = Reader(b); const n = { input: [], output: [], op_type: '', attrs: [] };
  while (!r.eof()) {
    const { field, wire } = r.tag();
    if (field === 1) n.input.push(Buffer.from(r.bytes()).toString('utf8'));
    else if (field === 2) n.output.push(Buffer.from(r.bytes()).toString('utf8'));
    else if (field === 4) n.op_type = Buffer.from(r.bytes()).toString('utf8');
    else if (field === 5) n.attrs.push(parseAttr(r.bytes()));
    else r.skip(wire);
  }
  return n;
}

// ModelProto: graph=7. GraphProto: node=1(rep), initializer=5(rep)
const top = Reader(buf); let graphBytes = null;
while (!top.eof()) { const { field, wire } = top.tag(); if (field === 7) graphBytes = top.bytes(); else top.skip(wire); }
const g = Reader(graphBytes); const nodes = [], inits = [];
while (!g.eof()) { const { field, wire } = g.tag(); if (field === 1) nodes.push(parseNode(g.bytes())); else if (field === 5) inits.push(parseTensor(g.bytes())); else g.skip(wire); }

console.log('=== NODES (in order) ===');
for (const n of nodes) console.log(n.op_type.padEnd(9), 'in[' + n.input.join(',') + ']', '->', n.output.join(','), '  attrs:', n.attrs.map(a => a.name + '=' + (a.s != null ? a.s : a.i != null ? a.i : '[' + a.ints.join(',') + ']')).join(' '));
console.log('\n=== INITIALIZERS ===');
for (const t of inits) console.log(t.name.padEnd(14), 'dims=[' + t.dims.join(',') + ']', 'dtype=' + t.data_type, 'raw=' + t.rawLen + 'B', 'floatData=' + t.floatCount);
