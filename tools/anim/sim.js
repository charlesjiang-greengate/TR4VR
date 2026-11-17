// node sim.js <scenario> <variant> [out.png] [every]   scenarios: runjump | standjump | hop | climb | climbair | climblow | drop
const fs = require('fs'); const { T, Img, drawFig, jointPos, bonesOf } = require('./lib.js');
const scen = process.argv[2] || 'runjump', who = process.argv[3] || 'elder', out = process.argv[4] || (scen + '_' + who + '.png'), every = +(process.argv[5] || 3);
const DT = +(process.env.DT || 1 / 60);
const window = { JL: { ext: [] }, createHeroine: null }; global.window = window; global.JL = window.JL;
const load = f => new Function('window', 'JL', 'setTimeout', 'console', fs.readFileSync('/home/user/TR4VR/src/' + f, 'utf8'))(window, window.JL, (f) => 0, console);
load('heroine2.js');
const H = window.createHeroine2(T); H.setVariant(who);
const scene = new T.Scene(); scene.add(H.group);
// level: ground y=0, block: z 2..5 (face at z=2), x -2..2, top = BH
const BH = +(process.env.BH || 1.8);
const colliders = [{ x0: -50, y0: -0.5, z0: -50, x1: 50, y1: 0, z1: 50 }, { x0: -2, y0: 0, z0: 2, x1: 2, y1: BH, z1: 5 }];
const pl = { pos: new T.Vector3(0, 0, 0), vel: new T.Vector3(), yaw: 0, grounded: true, state: 'idle', hp: 100, climb: null, climbT: 0 };
const upd = []; const ctx = { THREE: T, heroine: H, colliders, pl, onUpdate: f => upd.push(f) }; window.JL.ctx = ctx;
load('ext_movement.js'); window.JL.ext.forEach(f => f(ctx));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
function groundY(x, z, y) { let g = -100; for (const b of colliders) if (x > b.x0 - 0.3 && x < b.x1 + 0.3 && z > b.z0 - 0.3 && z < b.z1 + 0.3 && b.y1 <= y + 0.45 && b.y1 > g) g = b.y1; return g; }
function tryMantle() { const fx = Math.sin(pl.yaw), fz = Math.cos(pl.yaw), px = pl.pos.x + fx * 0.68, pz = pl.pos.z + fz * 0.68; let best = null;
  for (const b of colliders) if (px > b.x0 && px < b.x1 && pz > b.z0 && pz < b.z1) { const h = b.y1 - pl.pos.y; if (h > 0.5 && h <= 1.95 && (!best || b.y1 > best.y1)) best = b; }
  if (!best) return false; pl.climb = { fx: pl.pos.x, fy: pl.pos.y, fz: pl.pos.z, ty: best.y1, tx: px, tz: pz }; pl.climbT = 0; pl.state = 'climb'; pl.vel.set(0, 0, 0); pl.grounded = false; return true; }
let inp = { fwd: 0, jump: false, hold: true, mantle: false };
function step(dt) {
  if (pl.climb) { const c = pl.climb; pl.climbT += dt / clamp(0.15 + 0.7 * (c.ty - c.fy), 0.4, 1.5); const t = pl.climbT; const a = clamp(t / 0.6, 0, 1), b = clamp((t - 0.5) / 0.5, 0, 1), ea = a * a * (3 - 2 * a), eb = b * b * (3 - 2 * b);
    pl.pos.y = lerp(c.fy, c.ty, ea); pl.pos.x = lerp(c.fx, c.tx, eb); pl.pos.z = lerp(c.fz, c.tz, eb);
    if (t >= 1) { pl.pos.set(c.tx, c.ty, c.tz); pl.climb = null; pl.grounded = true; pl.state = 'idle'; } return; }
  const maxV = 5.4, tz = inp.fwd * maxV, acc = pl.grounded ? 14 : 4, k = 1 - Math.exp(-acc * dt);
  pl.vel.z = lerp(pl.vel.z, tz, k);
  if (inp.jump) { inp.jump = false; if (inp.mantle && tryMantle()) { } else if (pl.grounded) { pl.vel.y = 6.7; pl.grounded = false; pl.jumped = true; pl.jcut = true; } }
  if (pl.jcut && !pl.grounded && !inp.hold) { if (pl.vel.y > 2) pl.vel.y = 2; pl.jcut = false; }
  if (pl.climb) return;
  const prevY = pl.pos.y; pl.pos.z += pl.vel.z * dt;
  if (pl.pos.y < BH - 0.08 && pl.pos.z > 2 - 0.34 && pl.pos.z < 5) pl.pos.z = 2 - 0.34;
  if (pl.grounded) { pl.jumped = false; const g = groundY(pl.pos.x, pl.pos.z, pl.pos.y); if (g < pl.pos.y - 0.5) { pl.grounded = false; pl.vel.y = 0; } else pl.pos.y = g; }
  else { pl.vel.y -= 20 * dt; pl.pos.y += pl.vel.y * dt; if (pl.vel.y <= 0) { const g = groundY(pl.pos.x, pl.pos.z, prevY); if (pl.pos.y <= g) { pl.pos.y = g; pl.vel.y = 0; pl.grounded = true; } }
    if (!pl.grounded && pl.jumped && inp.mantle && pl.vel.y < 4) tryMantle(); }
  const sp = Math.abs(pl.vel.z); pl.state = pl.climb ? 'climb' : !pl.grounded ? (pl.vel.y > 0 ? 'jump' : 'fall') : sp > 0.4 ? 'run' : 'idle';
}
const hs = { state: 'idle', speed: 0, vy: 0, climbT: 0, t: 0 }; let time = 0;
function frame(dt) { time += dt; step(dt); for (const f of upd) f(dt, time, pl); H.group.position.copy(pl.pos); H.group.rotation.y = pl.yaw;
  hs.state = pl.state; hs.speed = Math.abs(pl.vel.z); hs.vy = pl.vel.y; hs.climbT = clamp(pl.climbT, 0, 1); hs.t = time; H.update(dt, hs); scene.updateMatrixWorld(true); }
// scenario scripts: [pre-roll seconds, setup, record seconds]
const S = {
  runjump: () => { pl.pos.set(0, 0, -30); inp.fwd = 1; run(1.03); inp.jump = true; rec(1.05); },
  runjump2: () => { pl.pos.set(0, 0, -30); inp.fwd = 1; run(1.03 + 0.33); inp.jump = true; rec(1.05); },
  standjump: () => { pl.pos.set(0, 0, -30); run(0.5); inp.jump = true; rec(1.2); },
  hop: () => { pl.pos.set(0, 0, -30); inp.fwd = 1; run(1.0); inp.jump = true; inp.hold = false; rec(0.7); },
  climb: () => { pl.pos.set(0, 0, 2 - 0.34 - 2.0); inp.fwd = 1; run(0.6); inp.mantle = true; inp.jump = true; rec(1.25); },
  climbfar: () => { pl.pos.set(0, 0, 2 - 0.34 - 2.3); inp.fwd = 1; run(0.55); inp.mantle = true; inp.jump = true; rec(1.25); },
  climbstand: () => { pl.pos.set(0, 0, 2 - 0.34 - 0.02); inp.fwd = 1; run(0.3); inp.mantle = true; inp.jump = true; rec(1.25); },
  climbair: () => { pl.pos.set(0, 0, 2 - 0.34 - 3.2); inp.fwd = 1; run(0.5); inp.jump = true; run(0.02); inp.mantle = true; rec(1.5); },
  climbobl: () => { pl.pos.set(0.5, 0, 2 - 0.34 - 0.05); pl.yaw = 0.45; run(0.3); inp.mantle = true; inp.jump = true; rec(1.6); },
  drop: () => { pl.pos.set(0, BH, 4.2); pl.yaw = Math.PI; inp.fwd = -1; run(0.2); rec(1.3); },
};
const frames = [];
function run(sec) { const n = Math.round(sec / DT); for (let i = 0; i < n; i++) frame(DT); }
const Bn = () => bonesOf(H.group.children[0].children.find(c => c.visible));
let prevQ = null; const QK = ["L_Thigh", "R_Thigh", "L_Calf", "R_Calf", "L_UpperArm", "R_UpperArm", "L_Forearm", "R_Forearm", "L_Foot", "R_Foot", "L_Hand", "R_Hand", "Spine1", "Head"]; const stats = { maxAng: 0, maxAngBone: '', maxAngF: 0 };
function rec(sec) { const n = Math.round(sec / DT); { const B0 = Bn(); prevQ = {}; for (const k of QK) prevQ[k] = B0[k].getWorldQuaternion(new T.Quaternion()); } for (let i = 0; i < n; i++) { frame(DT);
  const root = H.group.children[0].children.find(c => c.visible), B = bonesOf(root);
  const P = {}; for (const k in B) { if (/Finger\d\d|Eye|Mouth|Lip|Cheek|brow|Jaw|Masseter|Caninus|Nose|Tongue/.test(k)) continue; P[k] = new T.Vector3().setFromMatrixPosition(B[k].matrixWorld); }
  P.HeadTop = new T.Vector3(0.13, 0, 0).applyMatrix4(B.Head.matrixWorld); for (const s of ['L', 'R']) P[s + '_Tip'] = new T.Vector3().copy(B[s + '_Finger2'].position).multiplyScalar(1.9).applyMatrix4(B[s + '_Hand'].matrixWorld);
  // angular change per bone (world)
  const Q = {}; for (const k of ['L_Thigh', 'R_Thigh', 'L_Calf', 'R_Calf', 'L_UpperArm', 'R_UpperArm', 'L_Forearm', 'R_Forearm', 'L_Foot', 'R_Foot', 'L_Hand', 'R_Hand', 'Spine1', 'Head']) Q[k] = B[k].getWorldQuaternion(new T.Quaternion());
  let worst = 0, wb = ''; if (prevQ) for (const k in Q) { const a = Q[k].angleTo(prevQ[k]) * 57.3; if (a > worst) { worst = a; wb = k; } } prevQ = Q;
  const A = H._anim; frames.push({ i, P, st: pl.state, pos: pl.pos.clone(), vy: pl.vel.y, ct: pl.climbT, worst, wb, plant: A.plant.slice(), hT: [A.hT[0].clone(), A.hT[1].clone()], ov: [A.ovL, A.ovA], Q });
} }
if (process.env.NOCTX) window.JL.ctx = null;
S[scen]();
// ---------- report ----------
const f2 = x => x.toFixed(2); let rep = [];
for (const f of frames) { let s = `${String(f.i).padStart(3)} ${f.st.padEnd(5)} y=${f2(f.pos.y)} z=${f2(f.pos.z)} vy=${f2(f.vy).padStart(6)} ct=${f2(f.ct)} dAng=${f.worst.toFixed(0).padStart(3)} ${f.wb.padEnd(10)}`;
  if (f.st === 'climb') { const e = [0, 1].map(h => f.plant[h] > 0.5 ? (f.P[(h ? 'R' : 'L') + '_Hand'].distanceTo(f.hT[h]) * 100).toFixed(1) + 'cm' : '-'); s += ` plant=${f2(f.plant[0])},${f2(f.plant[1])} handErr=${e.join(',')}`;
    // penetration into block: joints with z>2 (face) and y<BH
    const pen = []; for (const k of ['L_Calf', 'R_Calf', 'L_Foot', 'R_Foot', 'L_Toe0', 'R_Toe0', 'L_Forearm', 'R_Forearm', 'Head', 'Spine2', 'Pelvis', 'L_Hand', 'R_Hand']) { const p = f.P[k]; const dz = p.z - 2, dy = BH - p.y; if (dz > 0.01 && dy > 0.01) pen.push(k + ':' + (Math.min(dz, dy) * 100).toFixed(0)); } if (pen.length) s += ' PEN ' + pen.join(' '); }
  const fl = Math.min(f.P.L_Toe0.y, f.P.R_Toe0.y, f.P.L_Foot.y, f.P.R_Foot.y) - groundY(f.pos.x, f.pos.z, f.pos.y + 0.1); if (f.st === 'run' || f.st === 'idle') s += ` minFoot=${f2(fl)}`;
  rep.push(s); }
if (!process.env.QUIET) console.log(rep.join('\n'));
const big = frames.filter(f => f.worst > 20).map(f => f.i + ':' + f.wb + ':' + f.worst.toFixed(0)); console.log('frames with >20deg/frame:', big.join(' ') || 'none');
// ---------- sheet ----------
const sel = frames.filter((f, i) => i % every === 0 && i <= +(process.env.MAXF || 1e9)); const W = 230, Hh = 330, cols = Math.min(sel.length, 12), rows = Math.ceil(sel.length / cols), sc = 95;
const img = new Img(W * cols, Hh * rows * 2);
sel.forEach((f, n) => { const cx = (n % cols) * W, cy = Math.floor(n / cols) * Hh * 2; const base = scen.startsWith('climb') || scen === 'drop' ? 0 : f.pos.y; const oz = f.pos.z;
  const world = p => ({ x: p.x, y: p.y - 0, z: p.z - oz });
  const P = {}; for (const k in f.P) P[k] = world(f.P[k]);
  const env = view => pr => { const yg = 0; let A = pr({ x: -1, y: yg, z: -1.1 }), B = pr({ x: 1, y: yg, z: 1.1 }); img.line(A[0], A[1], B[0], B[1], [150, 150, 150], 1);
    if (view === 'side') { const z0 = 2 - oz; if (z0 < 1.2 && z0 > -1.3) { const a = pr({ x: 0, y: 0, z: z0 }), b = pr({ x: 0, y: BH, z: z0 }), c = pr({ x: 0, y: BH, z: Math.min(1.2, 5 - oz) }); img.line(a[0], a[1], b[0], b[1], [0, 150, 0], 2); img.line(b[0], b[1], c[0], c[1], [0, 150, 0], 2); } }
    else if (2 - oz < 1.2 && oz < 5) { const a = pr({ x: -1, y: BH, z: 0 }), b = pr({ x: 1, y: BH, z: 0 }); img.line(a[0], a[1], b[0], b[1], [0, 150, 0], 2); } };
  const oyS = cy + Hh - 20 , oyF = cy + 2 * Hh - 20;
  const scl = (scen.startsWith('climb') || scen === 'drop') ? 78 : sc;
  drawFig(img, P, cx + W / 2, oyS, scl, 'side', env('side')); drawFig(img, P, cx + W / 2, oyF, scl, 'front', env('front'));
  img.text(cx + 4, cy + 4, String(f.i)); img.text(cx + 40, cy + 4, f.st === 'climb' ? f2(f.ct) : f2(f.vy)); });
img.save(out); console.log('saved', out, 'frames', sel.map(f => f.i).join(','));
if (process.env.DBG) for (const f of frames) console.log(f.i, f.st, 'ov', f.ov.map(f2).join(','), 'pelv', f2(f.P.Pelvis.y - f.pos.y), 'LF', f2(f.P.L_Foot.y - f.pos.y), f2(f.P.L_Foot.z - f.pos.z), 'RF', f2(f.P.R_Foot.y - f.pos.y), f2(f.P.R_Foot.z - f.pos.z), 'LH', f2(f.P.L_Hand.y - f.pos.y), 'RH', f2(f.P.R_Hand.y - f.pos.y));
