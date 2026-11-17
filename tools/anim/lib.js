// Offline harness: stub GLTFLoader (skeleton + clips only), stick-figure PNG renderer.
const fs = require('fs'), zlib = require('zlib');
const THREE0 = require('/tmp/claude-0/-home-user-TR4VR/a99e0ae1-0cf8-51f9-84a5-45b135fc126b/scratchpad/node_modules/three/build/three.cjs');
const T = Object.assign({}, THREE0);
function readGlb(p) { const b = fs.readFileSync(p); const jl = b.readUInt32LE(12); const j = JSON.parse(b.slice(20, 20 + jl).toString()); const bin = b.slice(20 + jl + 8); return { j, bin }; }
function acc(g, i) { const a = g.j.accessors[i], bv = g.j.bufferViews[a.bufferView]; const n = { SCALAR: 1, VEC3: 3, VEC4: 4 }[a.type]; const off = (bv.byteOffset || 0) + (a.byteOffset || 0); const out = new Float32Array(a.count * n); for (let k = 0; k < out.length; k++) out[k] = g.bin.readFloatLE(off + k * 4); return out; }
const ROOT = '/home/user/TR4VR/';
T.GLTFLoader = class {
  load(url, ok, prog, err) {
    try {
      const g = readGlb(ROOT + url.replace(/\.wasm$/, ''));
      const joints = new Set(); (g.j.skins || []).forEach(s => s.joints.forEach(i => joints.add(i)));
      const nodes = g.j.nodes.map((n, i) => { const o = joints.has(i) ? new T.Bone() : new T.Object3D(); o.name = T.PropertyBinding.sanitizeNodeName(n.name || ''); if (n.translation) o.position.fromArray(n.translation); if (n.rotation) o.quaternion.fromArray(n.rotation); if (n.scale) o.scale.fromArray(n.scale); return o; });
      g.j.nodes.forEach((n, i) => (n.children || []).forEach(c => nodes[i].add(nodes[c])));
      const scene = new T.Group(); g.j.scenes[0].nodes.forEach(i => scene.add(nodes[i]));
      const animations = (g.j.animations || []).map(a => {
        const tracks = a.channels.map(c => { const s = a.samplers[c.sampler]; const times = acc(g, s.input), vals = acc(g, s.output); const nm = nodes[c.target.node].name; const p = c.target.path;
          if (p === 'rotation') return new T.QuaternionKeyframeTrack(nm + '.quaternion', times, vals);
          if (p === 'translation') return new T.VectorKeyframeTrack(nm + '.position', times, vals);
          return new T.VectorKeyframeTrack(nm + '.scale', times, vals); });
        return new T.AnimationClip(a.name, undefined, tracks); });
      ok({ scene, animations });
    } catch (e) { if (err) err(e); else throw e; }
  }
};
T.TextureLoader = class { load(u, cb) { const t = new T.Texture(); return t; } };

// ---------- tiny raster ----------
class Img {
  constructor(w, h) { this.w = w; this.h = h; this.d = Buffer.alloc(w * h * 3, 255); }
  px(x, y, c) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const i = (y * this.w + x) * 3; this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; }
  line(x0, y0, x1, y1, c, th) { th = th || 1; const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) + 1; for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; for (let a = 0; a < th; a++) for (let b = 0; b < th; b++) this.px(x + a - th / 2 + 0.5, y + b - th / 2 + 0.5, c); } }
  rect(x0, y0, x1, y1, c) { for (let y = Math.min(y0, y1) | 0; y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1) | 0; x <= Math.max(x0, x1); x++) this.px(x, y, c); }
  circle(cx, cy, r, c) { for (let a = 0; a < 64; a++) { const t = a / 64 * 6.2832, t2 = (a + 1) / 64 * 6.2832; this.line(cx + r * Math.cos(t), cy + r * Math.sin(t), cx + r * Math.cos(t2), cy + r * Math.sin(t2), c, 2); } }
  digit(x, y, ch, c) { const F = { '0': '757', '1': '222', '2': '636', '3': '737', '4': '571', '5': '363', '6': '377', '7': '711', '8': '777', '9': '773', '.': '002', '-': '070' }; // crude 3x3
    const SEG = { '0': [1,1,1,1,0,1,1,0,1,1,0,1,1,1,1], '1': [0,1,0,1,1,0,0,1,0,0,1,0,1,1,1], '2': [1,1,1,0,0,1,1,1,1,1,0,0,1,1,1], '3': [1,1,1,0,0,1,1,1,1,0,0,1,1,1,1], '4': [1,0,1,1,0,1,1,1,1,0,0,1,0,0,1], '5': [1,1,1,1,0,0,1,1,1,0,0,1,1,1,1], '6': [1,1,1,1,0,0,1,1,1,1,0,1,1,1,1], '7': [1,1,1,0,0,1,0,1,0,0,1,0,0,1,0], '8': [1,1,1,1,0,1,1,1,1,1,0,1,1,1,1], '9': [1,1,1,1,0,1,1,1,1,0,0,1,1,1,1], '.': [0,0,0,0,0,0,0,0,0,0,0,0,0,1,0], '-': [0,0,0,0,0,0,1,1,1,0,0,0,0,0,0] };
    const s = SEG[ch]; if (!s) return; for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if (s[r * 3 + q]) this.rect(x + q * 2, y + r * 2, x + q * 2 + 1, y + r * 2 + 1, c); }
  text(x, y, str, c) { for (let i = 0; i < str.length; i++) this.digit(x + i * 8, y, str[i], c || [0, 0, 0]); }
  save(p) { const raw = Buffer.alloc((this.w * 3 + 1) * this.h); for (let y = 0; y < this.h; y++) { raw[y * (this.w * 3 + 1)] = 0; this.d.copy(raw, y * (this.w * 3 + 1) + 1, y * this.w * 3, (y + 1) * this.w * 3); }
    const crcT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; }
    const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
    const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const cr = Buffer.alloc(4); cr.writeUInt32BE(crc(td)); return Buffer.concat([l, td, cr]); };
    const ih = Buffer.alloc(13); ih.writeUInt32BE(this.w, 0); ih.writeUInt32BE(this.h, 4); ih[8] = 8; ih[9] = 2;
    fs.writeFileSync(p, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])); }
}
// draw skeleton of `root` (bones by name suffix) into img cell. view: 'side' (h = z fwd → right, v = y) or 'front' (h = x, v = y). pts are group-local.
const SEGS = [['Pelvis', 'Spine', 0], ['Spine', 'Spine1', 0], ['Spine1', 'Spine2', 0], ['Spine2', 'Neck', 0], ['Neck', 'Head', 0],
  ['Neck', 'L_UpperArm', 1], ['L_UpperArm', 'L_Forearm', 1], ['L_Forearm', 'L_Hand', 1], ['L_Hand', 'L_Finger2', 1], ['Neck', 'R_UpperArm', 2], ['R_UpperArm', 'R_Forearm', 2], ['R_Forearm', 'R_Hand', 2], ['R_Hand', 'R_Finger2', 2],
  ['Pelvis', 'L_Thigh', 1], ['L_Thigh', 'L_Calf', 1], ['L_Calf', 'L_Foot', 1], ['L_Foot', 'L_Toe0', 1], ['Pelvis', 'R_Thigh', 2], ['R_Thigh', 'R_Calf', 2], ['R_Calf', 'R_Foot', 2], ['R_Foot', 'R_Toe0', 2]];
const COL = [[30, 30, 30], [215, 40, 40], [40, 80, 220]];
function bonesOf(root) { const m = {}; root.traverse(o => { if (o.isBone) { const k = o.name.replace(/^Bip0\d_/, ''); m[k] = o; } }); return m; }
function jointPos(group, root) { const B = bonesOf(root), inv = new T.Matrix4().copy(group.matrixWorld).invert(), out = {}; for (const k in B) { if (/Finger\d\d|Eye|Mouth|Lip|Cheek|brow|Jaw|Masseter|Caninus|Nose|Tongue/.test(k)) continue; out[k] = new T.Vector3().setFromMatrixPosition(B[k].matrixWorld).applyMatrix4(inv); }
  // head top: head bone local +x*0.2
  if (B.Head) out.HeadTop = new T.Vector3(0.13, 0, 0).applyMatrix4(B.Head.matrixWorld).applyMatrix4(inv);
  for (const s of ['L', 'R']) { const h = B[s + '_Hand'], f = B[s + '_Finger2']; if (h && f) { out[s + '_Tip'] = new T.Vector3().copy(f.position).multiplyScalar(1.9).applyMatrix4(h.matrixWorld).applyMatrix4(inv); } }
  return out; }
function drawFig(img, P, ox, oy, sc, view, extra) {
  const pr = p => view === 'side' ? [ox + p.z * sc, oy - p.y * sc] : view === 'top' ? [ox + p.x * sc, oy - p.z * sc] : [ox - p.x * sc, oy - p.y * sc];
  if (extra) extra(pr);
  const order = view === 'side' ? [2, 0, 1] : [0, 1, 2];
  for (const cc of order) for (const s of SEGS) { if (s[2] !== cc) continue; const a = P[s[0]], b = P[s[1]]; if (!a || !b) continue; const A = pr(a), B = pr(b); img.line(A[0], A[1], B[0], B[1], COL[s[2]], 3); }
  for (const s of ['L', 'R']) { const a = P[s + '_Hand'], b = P[s + '_Tip']; if (a && b) { const A = pr(a), B = pr(b); img.line(A[0], A[1], B[0], B[1], COL[s === 'L' ? 1 : 2], 2); } }
  if (P.Head && P.HeadTop) { const A = pr(P.Head), B = pr(P.HeadTop); const cx = (A[0] + B[0]) / 2 + (B[0] - A[0]) * 0.2, cy = (A[1] + B[1]) / 2 + (B[1] - A[1]) * 0.2; img.circle(cx, cy, 0.1 * sc, COL[0]); if (view === 'side') { const n = { x: P.Head.x + (P.HeadTop.x - P.Head.x) * 0.6, y: P.Head.y + (P.HeadTop.y - P.Head.y) * 0.6, z: P.Head.z + (P.HeadTop.z - P.Head.z) * 0.6 + 0.13 }; const N = pr(n); img.line(cx, cy, N[0], N[1], COL[0], 2); } }
}
module.exports = { T, Img, drawFig, jointPos, bonesOf, readGlb, ROOT };
