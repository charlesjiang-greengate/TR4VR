(function (JL) {
  'use strict';
  const T = THREE;
  const $ = id => document.getElementById(id);
  const CELL = 4, WALL_H = 5;
  const MAP = [
    '#################',
    '######.....######',
    '######.....######',
    '######.....######',
    '########.########',
    '#...#.......#...#',
    '#.#.#.~~~~~.#.#.#',
    '#.#.#.~~~~~.....#',
    '#.###.~~~~~.###.#',
    '#...#.~~~~~.#...#',
    '###.#.~~~~~.#.###',
    '#...#.......#...#',
    '#.######.####.#.#',
    '#.....##.#....#.#',
    '#####.##.######.#',
    '#.....##.#......#',
    '#.######.######.#',
    '#...............#',
    '#################'];
  const COLS = 17, ROWS = MAP.length;
  const at = (c, r) => (c < 0 || r < 0 || c >= COLS || r >= ROWS) ? '#' : MAP[r][c];
  const cx = c => (c + 0.5) * CELL, cz = r => (r + 0.5) * CELL;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = JL.rng(2026);

  const touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const lowQ = !!window.JL_LOWQ || (touch && Math.min(screen.width, screen.height) < 900);

  // ---------- renderer ----------
  const canvas = $('gl');
  const renderer = new T.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
  renderer.physicallyCorrectLights = true;
  renderer.outputEncoding = T.LinearEncoding;
  renderer.toneMapping = T.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(58, 1, 0.12, 900);

  const M = JL.makeMaterials(aniso, lowQ);
  M.redLacquer.color.setRGB(0.50, 0.075, 0.045); M.redLacquer.roughness = 0.42;
  const arch = window.createArchProps ? window.createArchProps(T, M) : {};
  const nature = window.createNatureProps ? window.createNatureProps(T, M) : {};
  const prop = (lib, name, ...a) => { try { if (lib[name]) return lib[name](...a); } catch (e) { console.warn('prop', name, e); } return new T.Group(); };
  const place = (g, x, y, z, ry, s) => { g.position.set(x, y, z); if (ry) g.rotation.y = ry; if (s) g.scale.setScalar(s); scene.add(g); return g; };
  // ---- extension context (see TASKS.md): src/ext_*.js files register JL.extPre / JL.ext callbacks ----
  const extUpd = [], backdrop = new T.Group(); scene.add(backdrop);
  const ctx = JL.ctx = { THREE: T, JL, scene, camera, renderer, M, arch, nature, prop, place, MAP, CELL, WALL_H, COLS, ROWS, cx, cz, at, rng: JL.rng, lowQ, backdrop, onUpdate: f => extUpd.push(f) };
  (JL.extPre || []).forEach(f => { try { f(ctx); } catch (e) { console.warn('extPre', e); } });

  // ---------- sky / sun / environment ----------
  const sunDir = new T.Vector3(-0.50, 0.80, -0.42).normalize();
  const sky = JL.makeSky(sunDir); scene.add(sky);
  {
    const pm = new T.PMREMGenerator(renderer), es = new T.Scene(); es.add(JL.makeSky(sunDir));
    scene.environment = pm.fromScene(es, 0.02).texture; pm.dispose();
  }
  const center = new T.Vector3(COLS * CELL / 2, 0, ROWS * CELL / 2);
  const sun = new T.DirectionalLight(new T.Color(1.0, 0.70, 0.42), 7.5);
  sun.position.copy(center).addScaledVector(sunDir, 130); sun.target.position.copy(center);
  sun.castShadow = true; sun.shadow.mapSize.set(lowQ ? 2048 : 4096, lowQ ? 2048 : 4096);
  const sc = sun.shadow.camera; sc.left = -60; sc.right = 60; sc.top = 60; sc.bottom = -60; sc.near = 20; sc.far = 260; sc.updateProjectionMatrix();
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.06;
  scene.add(sun, sun.target);
  scene.add(new T.HemisphereLight(0x6f8fb0, 0x2a2018, 0.35));
  if (JL.ANIME) {   // toon materials ignore the environment map: replace that fill with soft sky/ground light, warmer brighter sun
    scene.add(new T.HemisphereLight(0xa9c6ee, 0x8a7a5a, 1.6)); scene.add(new T.AmbientLight(0xfff2e0, 0.35));
    sun.color.setRGB(1.0, 0.86, 0.66); sun.intensity = 6.0;
  }
  if (JL.loadRealAssets) { try { JL.loadRealAssets(renderer, scene, M, sky, sunDir); } catch (e) { console.warn(e); } }

  // ---------- geometry builder ----------
  class GB {
    constructor() { this.p = []; this.n = []; this.u = []; this.i = []; }
    quad(a, b, c, d, n, uv) { const k = this.p.length / 3; this.p.push(...a, ...b, ...c, ...d); for (let j = 0; j < 4; j++) this.n.push(...n); this.u.push(...uv); this.i.push(k, k + 1, k + 2, k, k + 2, k + 3); }
    box(x0, y0, z0, x1, y1, z1, s) {
      s = s || 0.5;
      this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], [z1 * s, y0 * s, z0 * s, y0 * s, z0 * s, y1 * s, z1 * s, y1 * s]);
      this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], [z0 * s, y0 * s, z1 * s, y0 * s, z1 * s, y1 * s, z0 * s, y1 * s]);
      this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], [x0 * s, y0 * s, x1 * s, y0 * s, x1 * s, y1 * s, x0 * s, y1 * s]);
      this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], [x1 * s, y0 * s, x0 * s, y0 * s, x0 * s, y1 * s, x1 * s, y1 * s]);
      this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], [x0 * s, z1 * s, x1 * s, z1 * s, x1 * s, z0 * s, x0 * s, z0 * s]);
      this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], [x0 * s, z0 * s, x1 * s, z0 * s, x1 * s, z1 * s, x0 * s, z1 * s]);
    }
    mesh(mat) {
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(this.n, 3));
      g.setAttribute('uv', new T.Float32BufferAttribute(this.u, 2)); g.setIndex(this.i);
      const m = new T.Mesh(g, mat); m.castShadow = m.receiveShadow = true; scene.add(m); return m;
    }
  }
  const colliders = [];
  const col = (x0, y0, z0, x1, y1, z1) => { const b = { x0, y0, z0, x1, y1, z1, off: false }; colliders.push(b); return b; };

  // ---------- level ----------
  const gStone = new GB(), gPlaster = new GB(), gWood = new GB(), gTile = new GB(), gFloor = new GB(), gPool = new GB(), gRed = new GB(), gDark = new GB();
  for (let r = 0; r < ROWS; r++) {
    let c = 0;
    while (c < COLS) {
      if (at(c, r) !== '#') { c++; continue; }
      let c1 = c; while (c1 + 1 < COLS && at(c1 + 1, r) === '#') c1++;
      const x0 = c * CELL, x1 = (c1 + 1) * CELL, z0 = r * CELL, z1 = (r + 1) * CELL;
      gStone.box(x0 - 0.09, -0.2, z0 - 0.09, x1 + 0.09, 1.15, z1 + 0.09);
      gPlaster.box(x0, 1.15, z0, x1, 4.45, z1);
      gWood.box(x0 - 0.06, 4.45, z0 - 0.06, x1 + 0.06, 4.72, z1 + 0.06, 1);
      col(x0 - 0.09, -1, z0 - 0.09, x1 + 0.09, WALL_H, z1 + 0.09);
      c = c1 + 1;
    }
  }
  // tiled gable roofs along the wall tops + timber posts on wall faces
  {
    const inW = (c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS && MAP[r][c] === '#';
    const ori = (c, r) => { const h = (inW(c - 1, r) ? 1 : 0) + (inW(c + 1, r) ? 1 : 0), v = (inW(c, r - 1) ? 1 : 0) + (inW(c, r + 1) ? 1 : 0); return h >= v ? 'H' : 'V'; };
    const YE = 4.70, YR = 5.85, OV = 0.5;
    const V3 = (x, y, z) => new T.Vector3(x, y, z);
    const face = (gb, pts, uvs, hint) => {
      const n = pts[1].clone().sub(pts[0]).cross(pts[pts.length - 1].clone().sub(pts[0])).normalize();
      if (n.dot(hint) < 0) { pts.reverse(); uvs.reverse(); n.negate(); }
      const k = gb.p.length / 3; pts.forEach((p, i) => { gb.p.push(p.x, p.y, p.z); gb.n.push(n.x, n.y, n.z); gb.u.push(uvs[i][0], uvs[i][1]); });
      gb.i.push(k, k + 1, k + 2); if (pts.length === 4) gb.i.push(k, k + 2, k + 3);
    };
    const roof = (a0, a1, b0, b1, alongX) => {
      // a = along ridge, b = across
      const P = (a, y, b) => alongX ? V3(a, y, b) : V3(b, y, a);
      const H = (a, y, b) => alongX ? V3(a, y, b) : V3(b, y, a);
      const bc = (b0 + b1) / 2, e0 = b0 - OV, e1 = b1 + OV, A0 = a0 - OV, A1 = a1 + OV, sl = Math.hypot(e1 - bc, YR - YE);
      face(gTile, [P(A0, YE, e1), P(A1, YE, e1), P(A1, YR, bc), P(A0, YR, bc)], [[A0, 0], [A1, 0], [A1, sl], [A0, sl]], H(0, 1, 1));
      face(gTile, [P(A1, YE, e0), P(A0, YE, e0), P(A0, YR, bc), P(A1, YR, bc)], [[A1, 0], [A0, 0], [A0, sl], [A1, sl]], H(0, 1, -1));
      face(gPlaster, [P(a0, YE, b1), P(a0, YE, b0), P(a0, YR - 0.2, bc)], [[b1 / 2, YE / 2], [b0 / 2, YE / 2], [bc / 2, YR / 2]], H(-1, 0, 0));
      face(gPlaster, [P(a1, YE, b0), P(a1, YE, b1), P(a1, YR - 0.2, bc)], [[b0 / 2, YE / 2], [b1 / 2, YE / 2], [bc / 2, YR / 2]], H(1, 0, 0));
      if (alongX) { gDark.box(A0, YR - 0.1, bc - 0.16, A1, YR + 0.14, bc + 0.16, 1); gWood.box(A0, YE - 0.1, e0, A1, YE, e1, 1); }
      else { gDark.box(bc - 0.16, YR - 0.1, A0, bc + 0.16, YR + 0.14, A1, 1); gWood.box(e0, YE - 0.1, A0, e1, YE, A1, 1); }
    };
    for (let r = 0; r < ROWS; r++) { let c = 0; while (c < COLS) { if (!inW(c, r) || ori(c, r) !== 'H') { c++; continue; } let c1 = c; while (inW(c1 + 1, r) && ori(c1 + 1, r) === 'H') c1++; roof(c * CELL, (c1 + 1) * CELL, r * CELL, (r + 1) * CELL, true); c = c1 + 1; } }
    for (let c = 0; c < COLS; c++) { let r = 0; while (r < ROWS) { if (!inW(c, r) || ori(c, r) !== 'V') { r++; continue; } let r1 = r; while (inW(c, r1 + 1) && ori(c, r1 + 1) === 'V') r1++; roof(r * CELL, (r1 + 1) * CELL, c * CELL, (c + 1) * CELL, false); r = r1 + 1; } }
    const seen = {};
    const post = (x0, z0, x1, z1) => { const k = [x0, z0, x1, z1].map(v => v.toFixed(2)).join(); if (seen[k]) return; seen[k] = 1; gRed.box(x0, 1.15, z0, x1, 4.45, z1, 1); gStone.box(x0 - 0.05, 1.0, z0 - 0.05, x1 + 0.05, 1.32, z1 + 0.05); };
    const open = (c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS && MAP[r][c] !== '#';
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (!inW(c, r)) continue; const x0 = c * CELL, x1 = x0 + CELL, z0 = r * CELL, z1 = z0 + CELL;
      if (open(c + 1, r)) [z0, z1].forEach(z => post(x1, z - 0.14, x1 + 0.13, z + 0.14));
      if (open(c - 1, r)) [z0, z1].forEach(z => post(x0 - 0.13, z - 0.14, x0, z + 0.14));
      if (open(c, r + 1)) [x0, x1].forEach(x => post(x - 0.14, z1, x + 0.14, z1 + 0.13));
      if (open(c, r - 1)) [x0, x1].forEach(x => post(x - 0.14, z0 - 0.13, x + 0.14, z0));
    }
  }
  const PIT = { c: 15, r: 8 };
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const ch = at(c, r); if (ch === '#') continue;
    const x0 = c * CELL, x1 = x0 + CELL, z0 = r * CELL, z1 = z0 + CELL;
    if (ch === '~') {
      if (c === 8 && r === 8) { gStone.box(x0 + 0.2, -0.9, z0 + 0.2, x1 - 0.2, 0.3, z1 - 0.2); col(x0 + 0.2, -0.9, z0 + 0.2, x1 - 0.2, 0.3, z1 - 0.2); }
      gPool.box(x0, -1.4, z0, x1, -0.9, z1); col(x0, -1.4, z0, x1, -0.9, z1);
    } else if (c === PIT.c && r === PIT.r) {
      gFloor.box(x0, -0.5, z0, x1, 0, z0 + 0.6); col(x0, -0.5, z0, x1, 0, z0 + 0.6);
      gFloor.box(x0, -0.5, z1 - 0.6, x1, 0, z1); col(x0, -0.5, z1 - 0.6, x1, 0, z1);
      gDark.box(x0, -4.2, z0, x1, -3.6, z1); col(x0, -4.2, z0, x1, -3.6, z1);
      gDark.box(x0 - 0.3, -3.6, z0, x0, -0.2, z1); gDark.box(x1, -3.6, z0, x1 + 0.3, -0.2, z1);
      gDark.box(x0, -3.6, z0 + 0.3, x1, -0.5, z0 + 0.6); gDark.box(x0, -3.6, z1 - 0.6, x1, -0.5, z1 - 0.3);
    } else { gFloor.box(x0, -0.5, z0, x1, 0, z1); col(x0, -0.5, z0, x1, 0, z1); }
  }
  // pool rim
  gStone.box(23.7, -0.9, 23.7, 44.3, 0.12, 24); gStone.box(23.7, -0.9, 44, 44.3, 0.12, 44.3);
  gStone.box(23.7, -0.9, 24, 24, 0.12, 44); gStone.box(44, -0.9, 24, 44.3, 0.12, 44);
  // stepping stones to the island
  [[34.2, 42.9], [33.7, 41.0], [34.3, 39.1], [33.9, 37.3]].forEach(s => { gStone.box(s[0] - 0.6, -0.9, s[1] - 0.6, s[0] + 0.6, 0.03, s[1] + 0.6); col(s[0] - 0.6, -0.9, s[1] - 0.6, s[0] + 0.6, 0.03, s[1] + 0.6); });
  // climbing blocks (east wing)
  const blocks = [[61, 25, 64, 28, 1.8], [60.5, 20.3, 64, 25, 3.6], [52.3, 20.3, 57.5, 23.0, 3.6]];
  blocks.forEach(b => { gStone.box(b[0], 0, b[1], b[2], b[4] - 0.18, b[3]); gDark.box(b[0] - 0.08, b[4] - 0.18, b[1] - 0.08, b[2] + 0.08, b[4], b[3] + 0.08); col(b[0], 0, b[1], b[2], b[4], b[3]); });
  // great gate frame
  gRed.box(31.6, 4.2, 17.6, 36.4, 5.0, 18.4, 1); gRed.box(31.7, 0, 17.7, 32.0, 4.2, 18.3, 1); gRed.box(36.0, 0, 17.7, 36.3, 4.2, 18.3, 1);
  // beams over some corridors (striped light shafts)
  const beamCells = [[1, 6], [1, 7], [1, 8], [15, 12], [15, 13], [15, 14], [3, 13], [4, 13], [2, 13], [11, 13], [12, 13], [2, 17], [3, 17], [4, 17], [12, 17], [13, 17], [14, 17]];
  beamCells.forEach(([c, r]) => {
    const ns = at(c - 1, r) === '#' && at(c + 1, r) === '#';
    for (let k = 0; k < 4; k++) {
      const o = 0.5 + k;
      if (ns) gWood.box(c * CELL - 0.3, 4.5, r * CELL + o - 0.14, c * CELL + CELL + 0.3, 4.78, r * CELL + o + 0.14, 1);
      else gWood.box(c * CELL + o - 0.14, 4.5, r * CELL - 0.3, c * CELL + o + 0.14, 4.78, r * CELL + CELL + 0.3, 1);
    }
  });
  gStone.mesh(M.stone); gPlaster.mesh(M.plaster); gWood.mesh(M.wood); gTile.mesh(M.roofTile); gFloor.mesh(M.floor); gPool.mesh(M.poolFloor); gRed.mesh(M.redLacquer); gDark.mesh(M.darkStone);

  // outside ground + mountains
  {
    const g = new T.Mesh(new T.CircleGeometry(420, 48), new T.MeshStandardMaterial({ color: 0x1c2a1a, roughness: 1 }));
    g.rotation.x = -Math.PI / 2; g.position.set(center.x, -0.25, center.z); g.receiveShadow = true; scene.add(g);
    const ring = (R, h0, h1, color, seed) => {
      const rr = JL.rng(seed), seg = 120, p = [], idx = [], hs = [];
      let h = (h0 + h1) / 2;
      for (let i = 0; i < seg; i++) { h = clamp(h + (rr() - 0.5) * (h1 - h0) * 0.5, h0, h1); hs.push(h); }
      for (let i = 0; i <= seg; i++) { const a = i / seg * Math.PI * 2, hh = (hs[i % seg] + hs[(i + 1) % seg] + hs[(i + seg - 1) % seg]) / 3; p.push(Math.cos(a) * R, -2, Math.sin(a) * R, Math.cos(a) * R * 0.97, hh, Math.sin(a) * R * 0.97); }
      for (let i = 0; i < seg; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(p, 3)); geo.setIndex(idx);
      const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color, side: T.DoubleSide })); m.position.copy(center); backdrop.add(m);
    };
    ring(170, 12, 34, new T.Color(0.085, 0.12, 0.15), 3); ring(250, 30, 72, new T.Color(0.15, 0.20, 0.25), 4); ring(340, 55, 125, new T.Color(0.24, 0.30, 0.36), 5);
  }

  // ---------- props & lights ----------
  const lightSpots = [], flames = [], moteList = [];
  const addLight = (x, y, z, color, power) => lightSpots.push({ pos: new T.Vector3(x, y, z), color: new T.Color(color), power: power || 16, ph: rnd() * 10 });
  // torii procession (col 8, rows 12..16)
  {
    const proto = prop(arch, 'toriiGate', 3.5, 4.35);
    for (let i = 0; i < 8; i++) {
      const g = i === 0 ? proto : proto.clone(); place(g, 34, 0, 66.6 - i * 2.6);
      if (i % 3 === 1) { const l = prop(arch, 'paperLantern'); place(l, 34, 3.55, 66.6 - i * 2.6 + 1.3); addLight(34, 3.1, 66.6 - i * 2.6 + 1.3, 0xff7a33, 14); }
    }
  }
  // hanging lanterns in corridors
  const lanternProto = prop(arch, 'paperLantern');
  const ropeGeo = new T.CylinderGeometry(0.015, 0.015, 1, 5), ropeMat = new T.MeshStandardMaterial({ color: 0x1a120c, roughness: 1 });
  for (let r = 1; r < ROWS - 1; r++) for (let c = 1; c < COLS - 1; c++) {
    if (at(c, r) !== '.' || c === 8 && r >= 12 || r <= 4 || (c >= 5 && c <= 11 && r >= 5 && r <= 11)) continue;
    if ((c * 7 + r * 13) % 3 !== 0) continue;
    const ns = at(c - 1, r) === '#' && at(c + 1, r) === '#', ew = at(c, r - 1) === '#' && at(c, r + 1) === '#';
    if (!ns && !ew) continue;
    const x = cx(c), z = cz(r);
    const rope = new T.Mesh(ropeGeo, ropeMat); rope.scale.y = 4.2; rope.position.set(x, 4.3, z); rope.rotation.z = Math.PI / 2; if (!ns) rope.rotation.y = Math.PI / 2; scene.add(rope);
    for (let k = -1; k <= 1; k++) { const l = lanternProto.clone(); const o = k * 1.15; place(l, x + (ns ? o : 0), 4.3, z + (ns ? 0 : o)); l.scale.setScalar(k === 0 ? 1 : 0.7); }
    addLight(x, 3.5, z, 0xff7a33, 22);
  }
  // pool court
  const SL = [[23.2, 23.2], [44.8, 23.2], [23.2, 44.8], [44.8, 44.8], [31.5, 45.0], [36.5, 45.0], [23.0, 34], [45.0, 34]];
  { const proto = prop(arch, 'stoneLantern');
    SL.forEach((p, i) => { const g = i ? proto.clone() : proto; place(g, p[0], 0, p[1]); col(p[0] - 0.3, 0, p[1] - 0.3, p[0] + 0.3, 1.9, p[1] + 0.3); addLight(p[0], 1.5, p[1], 0xffa050, 9); });
    [[32.3, 69.5], [35.7, 69.5]].forEach(p => { place(proto.clone(), p[0], 0, p[1]); col(p[0] - 0.3, 0, p[1] - 0.3, p[0] + 0.3, 1.9, p[1] + 0.3); addLight(p[0], 1.5, p[1], 0xffa050, 9); });
  }
  place(prop(nature, 'cherryTree', 6.5, 3), 21.3, 0, 21.3); col(21.0, 0, 21.0, 21.6, 3, 21.6);
  place(prop(nature, 'cherryTree', 6, 8), 46.7, 0, 46.7); col(46.4, 0, 46.4, 47.0, 3, 47.0);
  place(prop(nature, 'bambooCluster', 11, 0.9, 8, 5), 46.4, 0, 21.6); col(45.7, 0, 20.9, 47.1, 3, 22.3); place(prop(nature, 'rock', 0.8, 9), 45.3, 0, 22.4);
  place(prop(nature, 'bambooCluster', 11, 0.9, 7.5, 6), 21.6, 0, 46.4); col(20.9, 0, 45.7, 22.3, 3, 47.1); place(prop(nature, 'rock', 0.7, 11), 22.7, 0, 45.4);
  [[29.3, 21.3], [38.7, 21.3]].forEach(p => { place(prop(nature, 'guardianLion'), p[0], 0, p[1]); col(p[0] - 0.65, 0, p[1] - 0.65, p[0] + 0.65, 2.3, p[1] + 0.65); });
  const brazierAt = (x, z) => { const b = prop(arch, 'brazier'); place(b, x, 0, z); col(x - 0.4, 0, z - 0.4, x + 0.4, 1.1, z + 0.4); const fp = b.userData.firePos ? b.userData.firePos.clone() : new T.Vector3(0, 1.05, 0); fp.add(b.position); flames.push(fp); addLight(x, fp.y + 0.5, z, 0xff6a20, 26); moteList.push({ pos: fp, radius: 0.18, h: 1.2, n: 14, color: [3.0, 1.1, 0.2], size: 0.035, rise: 1 }); };
  brazierAt(31.0, 20.9); brazierAt(37.0, 20.9); brazierAt(25.2, 5.2); brazierAt(42.8, 5.2); brazierAt(25.2, 14.8); brazierAt(42.8, 14.8);
  brazierAt(12.8, 31.0); brazierAt(44.6, 63.2); brazierAt(4.9, 71.1); brazierAt(63.1, 71.1);
  // island pavilion
  { const g = new GB(); [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]].forEach(o => { g.box(34 + o[0] - 0.16, 0.3, 34 + o[1] - 0.16, 34 + o[0] + 0.16, 3.5, 34 + o[1] + 0.16, 1); col(34 + o[0] - 0.16, 0.3, 34 + o[1] - 0.16, 34 + o[0] + 0.16, 3.5, 34 + o[1] + 0.16); });
    g.mesh(M.redLacquer); place(prop(arch, 'pavilionRoof', 3, 3, 2.0), 34, 3.5, 34); addLight(34, 2.9, 34, 0xffb060, 10); }
  // lotus + fireflies + rocks
  for (let i = 0; i < 16; i++) { const x = 25 + rnd() * 18, z = 25 + rnd() * 18; if (Math.abs(x - 34) < 3 && z > 31) continue; place(prop(nature, 'lotus'), x, -0.24, z, rnd() * 6.28, 0.8 + rnd() * 0.7); }
  moteList.push({ pos: new T.Vector3(34, 0.2, 34), radius: 10, h: 2.5, n: 70, color: [1.6, 2.4, 0.5], size: 0.03, rise: 0 });
  moteList.push({ pos: new T.Vector3(34, 0.3, 58), radius: 2, h: 4, n: 40, color: [0.9, 0.7, 0.45], size: 0.012, rise: 0 });
  moteList.push({ pos: new T.Vector3(34, 0.3, 10), radius: 7, h: 4, n: 60, color: [1.2, 0.9, 0.4], size: 0.014, rise: 0 });
  [[25.5, 43.2, 0.7], [42.6, 25.4, 0.9], [26.2, 26.0, 0.5], [43.0, 42.0, 0.6]].forEach((p, i) => place(prop(nature, 'rock', p[2], i + 1), p[0], -0.7, p[1]));
  // greenery on wall-top terraces & outside
  [[2, 7, 'b'], [6.5, 14, 'c'], [11, 12, 'b'], [10, 14, 'c'], [14, 8, 'b'], [4, 8, 'c'], [6.5, 12.6, 'b'], [13, 14, 'b'], [2, 12, 'c'], [3, 2, 'b'], [13, 2, 'c'], [12, 10, 'b'], [4, 10, 'b'], [4, 16, 'b'], [12, 16, 'c'], [14, 4, 'b'], [2, 4, 'p']].forEach((t, i) => {
    const x = cx(t[0]), z = cz(t[1]);
    if (t[2] === 'b') place(prop(nature, 'bambooCluster', 8, 1.2, 6 + rnd() * 3, i + 10), x, WALL_H - 0.05, z);
    else if (t[2] === 'c') place(prop(nature, 'cherryTree', 4.5 + rnd() * 1.5, i + 20), x, WALL_H - 0.05, z, rnd() * 6);
    else place(prop(nature, 'bambooCluster', 8, 1.2, 7, i + 30), x, WALL_H - 0.05, z);
  });
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + 0.2, R = 50 + rnd() * 12; place(prop(nature, 'bambooCluster', 9, 2, 11 + rnd() * 4, i + 50), center.x + Math.cos(a) * R * 0.95, 0, center.z + Math.sin(a) * R * 1.05); }
  place(prop(arch, 'pagoda', 4, 9), 34, 0, -16); place(prop(arch, 'pagoda', 3, 6), -14, 0, 20, 0.5); place(prop(arch, 'pagoda', 3, 6), 82, 0, 30, 0.3);
  place(prop(arch, 'bell'), 41.6, 0, 62, Math.PI / 2, 0.85); col(40.7, 0, 60.8, 42.6, 3, 63.2);
  { const b = prop(arch, 'incenseBurner'); place(b, 13.9, 0, 21.2); col(13.4, 0, 20.7, 14.4, 1, 21.7); moteList.push({ pos: new T.Vector3(13.9, 1.0, 21.2), radius: 0.1, h: 1.6, n: 16, color: [0.35, 0.35, 0.4], size: 0.05, rise: 0.5 }); }
  place(prop(arch, 'moonGate', 4, 4.4, 0.5, 1.55), 34, 0, 48.0); col(32, 0, 47.75, 32.7, 4.4, 48.25); col(35.3, 0, 47.75, 36, 4.4, 48.25);
  // spikes in the pit
  place(prop(nature, 'spikes', 3.6, 2.4), 62, -3.6, 34);

  // ---------- ground cover: grass tufts along wall bases, fallen petals ----------
  {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d'); const rr = JL.rng(404);
    for (let i = 0; i < 46; i++) { const x = 8 + rr() * 112, h = 40 + rr() * 80, lean = (rr() - 0.5) * 40; const gr = g.createLinearGradient(0, 128, 0, 128 - h); gr.addColorStop(0, 'rgb(' + (70 + rr() * 30 | 0) + ',' + (100 + rr() * 30 | 0) + ',40)'); gr.addColorStop(1, 'rgb(' + (150 + rr() * 60 | 0) + ',' + (185 + rr() * 50 | 0) + ',80)'); g.strokeStyle = gr; g.lineWidth = 1.5 + rr() * 2.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, 128); g.quadraticCurveTo(x + lean * 0.2, 128 - h * 0.6, x + lean, 128 - h); g.stroke(); }
    const tx = new T.CanvasTexture(cv); tx.encoding = T.sRGBEncoding;
    const gb = new GB(); for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3, dx = Math.cos(a) * 0.28, dz = Math.sin(a) * 0.28; gb.quad([-dx, 0, -dz], [dx, 0, dz], [dx, 0.42, dz], [-dx, 0.42, -dz], [0, 1, 0], [0, 0, 1, 0, 1, 1, 0, 1]); }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(gb.p, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(gb.n, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(gb.u, 2)); geo.setIndex(gb.i);
    const mat = new T.MeshStandardMaterial({ map: tx, alphaTest: 0.35, side: T.DoubleSide, roughness: 0.95 });
    const spots = [];
    const open = (c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS && MAP[r][c] === '.';
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (at(c, r) !== '#') continue; const x0 = c * CELL, z0 = r * CELL;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(d => { if (!open(c + d[0], r + d[1]) || (c + d[0] === PIT.c && r + d[1] === PIT.r)) return; const n = 3 + (rr() * 6 | 0);
        for (let i = 0; i < n; i++) { const t = rr() * CELL, o = 0.14 + rr() * rr() * 0.5; spots.push(d[0] ? [d[0] > 0 ? x0 + CELL + o : x0 - o, z0 + t] : [x0 + t, d[1] > 0 ? z0 + CELL + o : z0 - o]); } });
    }
    const im = new T.InstancedMesh(geo, mat, spots.length), m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), cc = new T.Color();
    spots.forEach((s, i) => { const sc = 0.4 + rr() * 0.7; e.set(0, rr() * 6.28, 0); q.setFromEuler(e); m4.compose(new T.Vector3(s[0], -0.01, s[1]), q, new T.Vector3(sc, sc * (0.7 + rr() * 0.7), sc)); im.setMatrixAt(i, m4); cc.setHSL(0.19 + rr() * 0.08, 0.32, 0.34 + rr() * 0.22); im.setColorAt(i, cc); });
    im.receiveShadow = true; im.frustumCulled = false; scene.add(im);
    // fallen petals
    const pg = new T.CircleGeometry(0.04, 5); pg.rotateX(-Math.PI / 2);
    const pm = new T.MeshStandardMaterial({ color: 0xffc0d2, roughness: 0.8, side: T.DoubleSide });
    const src = [[21.3, 21.3, 4.5, 260], [46.7, 46.7, 4.5, 240], [34, 58, 6, 420], [34, 68, 5, 160], [18, 62, 5, 120], [48, 56, 5, 120]]; let tot = 0; src.forEach(s => tot += s[3]);
    const pim = new T.InstancedMesh(pg, pm, tot); let k = 0;
    src.forEach(s => { for (let i = 0; i < s[3]; i++) { const a = rr() * 6.28, d = Math.sqrt(rr()) * s[2]; const sc = 0.6 + rr() * 0.9; e.set((rr() - 0.5) * 0.3, rr() * 6.28, (rr() - 0.5) * 0.3); q.setFromEuler(e); m4.compose(new T.Vector3(s[0] + Math.cos(a) * d, 0.012 + rr() * 0.01, s[1] + Math.sin(a) * d), q, new T.Vector3(sc, 1, sc * 1.5)); pim.setMatrixAt(k, m4); cc.setHSL(0.94 + rr() * 0.04, 0.8, 0.72 + rr() * 0.15); pim.setColorAt(k++, cc); } });
    pim.receiveShadow = true; pim.frustumCulled = false; scene.add(pim);
  }

  // ---------- water ----------
  let water = null;
  try {
    water = new T.Water(new T.PlaneGeometry(20, 20), { textureWidth: lowQ ? 512 : 1024, textureHeight: lowQ ? 512 : 1024, waterNormals: JL.waterNormals, sunDirection: sunDir.clone(), sunColor: 0x5a4630, waterColor: 0x0a2a24, distortionScale: 0.4, fog: false });
    water.rotation.x = -Math.PI / 2; water.position.set(34, -0.25, 34); water.material.uniforms.size.value = 0.35;
    water.material.uniforms.mirrorSampler.value.type = T.HalfFloatType;
    scene.add(water);
  } catch (e) { console.warn('water', e); }

  // ---------- particles ----------
  const petals = JL.makePetals(lowQ ? 350 : 800, new T.Vector3(34, 12, 34)); scene.add(petals);
  const flameFx = JL.makeFlames(flames, 1.25); scene.add(flameFx);

  // ---------- entities ----------
  const seals = [];
  const addSeal = (x, y, z, locked) => { const g = prop(nature, 'jadeSeal'); place(g, x, y, z); const s = { g, got: false, locked: !!locked, base: y }; seals.push(s); moteList.push({ pos: new T.Vector3(x, y - 0.3, z), radius: 0.5, h: 1.2, n: 14, color: [0.3, 1.8, 0.8], size: 0.02, rise: 0 }); return s; };
  { const p = prop(nature, 'pedestal'); place(p, 14, 0, 30); col(13.55, 0, 29.55, 14.45, 1, 30.45); addSeal(14, 1.5, 30); addLight(14, 2.2, 30, 0x50ffa0, 6); }
  addSeal(55, 4.25, 21.9); addLight(55, 4.9, 21.9, 0x50ffa0, 6);
  { const p = prop(nature, 'pedestal'); place(p, 34, 0.3, 34, 0, 0.8); }
  const seal3 = addSeal(34, 1.6, 34, true);
  // cage
  const cage = new T.Group(); { const bg = new T.CylinderGeometry(0.03, 0.03, 2.3, 6); for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; const b = new T.Mesh(bg, M.gold); b.position.set(Math.cos(a) * 0.8, 1.15, Math.sin(a) * 0.8); b.castShadow = true; cage.add(b); }
    const rg = new T.TorusGeometry(0.8, 0.045, 8, 28); [0.05, 1.2, 2.3].forEach(y => { const r = new T.Mesh(rg, M.gold); r.rotation.x = Math.PI / 2; r.position.y = y; cage.add(r); }); }
  place(cage, 34, 0.3, 34); const cageCol = col(33.15, 0.3, 33.15, 34.85, 2.65, 34.85); let cageOpen = false, cageY = 0;
  // lever
  const lever = prop(nature, 'lever'); place(lever, 42, 0, 54, Math.PI / 2); let leverOn = false, leverA = -0.6;
  addLight(41.5, 2.4, 54, 0xffa050, 8);
  // gate doors
  const doors = [];
  { const mk = (hx, sgn) => { const piv = new T.Group(); piv.position.set(hx, 0, 18); const d = new T.Mesh(new T.BoxGeometry(2, 4.2, 0.22), M.redLacquer); d.position.set(sgn * 1, 2.1, 0); d.castShadow = d.receiveShadow = true; piv.add(d);
      const sg = new T.SphereGeometry(0.07, 8, 6); for (let i = 0; i < 4; i++) for (let j = 0; j < 7; j++) { const s = new T.Mesh(sg, M.gold); s.position.set(sgn * (0.35 + i * 0.43), 0.5 + j * 0.55, 0.12); piv.add(s); }
      const ring = new T.Mesh(new T.TorusGeometry(0.16, 0.03, 8, 16), M.gold); ring.position.set(sgn * 1.7, 2.0, 0.14); piv.add(ring);
      scene.add(piv); doors.push({ piv, sgn }); };
    mk(32, 1); mk(36, -1); }
  const gateCol = col(32, 0, 17.75, 36, 5, 18.25); let gateOpen = false, gateA = 0;
  const sockets = []; for (let i = 0; i < 3; i++) { const m = new T.Mesh(new T.SphereGeometry(0.16, 16, 12), new T.MeshStandardMaterial({ color: 0x1a2a22, roughness: 0.3, emissive: 0x30ff90, emissiveIntensity: 0 })); m.position.set(33.2 + i * 0.8, 4.6, 18.42); scene.add(m); sockets.push(m); }
  // dragon idol
  { const p = prop(nature, 'pedestal'); place(p, 34, 0, 9.5, 0, 1.3); col(33.35, 0, 8.85, 34.65, 1.3, 10.15); }
  const idol = prop(nature, 'dragonIdol'); place(idol, 34, 1.3, 9.5); addLight(34, 3.4, 10.5, 0xffc060, 30);
  { const g = new GB(); [[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]].forEach(o => { g.box(34 + o[0] - 0.2, 0, 9.5 + o[1] - 0.2, 34 + o[0] + 0.2, 3.9, 9.5 + o[1] + 0.2, 1); col(34 + o[0] - 0.2, 0, 9.5 + o[1] - 0.2, 34 + o[0] + 0.2, 3.9, 9.5 + o[1] + 0.2); }); g.mesh(M.redLacquer);
    place(prop(arch, 'pavilionRoof', 4.4, 4.4, 2.4), 34, 3.9, 9.5);
    [[29.6, 12.2], [38.4, 12.2]].forEach(p => { place(prop(nature, 'guardianLion'), p[0], 0, p[1]); col(p[0] - 0.65, 0, p[1] - 0.65, p[0] + 0.65, 2.3, p[1] + 0.65); });
    const sl = prop(arch, 'stoneLantern'); [[31.2, 15.2], [36.8, 15.2], [26.2, 9.5], [41.8, 9.5]].forEach((p, i) => { place(i ? sl.clone() : sl, p[0], 0, p[1]); col(p[0] - 0.3, 0, p[1] - 0.3, p[0] + 0.3, 1.9, p[1] + 0.3); });
    const pl2 = prop(arch, 'paperLantern'); [[-1.6, 0], [1.6, 0], [0, 1.6], [0, -1.6]].forEach((o, i) => place(i ? pl2.clone() : pl2, 34 + o[0], 3.75, 9.5 + o[1], 0, 0.7));
    place(prop(nature, 'cherryTree', 5.5, 41), 26.6, 0, 5.6); place(prop(nature, 'cherryTree', 5, 42), 41.6, 0, 5.4); col(26.3, 0, 5.3, 26.9, 3, 5.9); col(41.3, 0, 5.1, 41.9, 3, 5.7); }
  // blades
  const blades = [[6, 26, 0], [6, 30, 1.3], [6, 34, 2.6]].map(b => { const g = prop(nature, 'blade', 3.3); place(g, b[0], 4.55, b[1]); return { g, x: b[0], z: b[1], ph: b[2] }; });
  // floor spikes
  const spikeTraps = [[57, 38, 0], [59, 38, 1.5]].map(s => { const g = prop(nature, 'spikes', 1.8, 3.6); place(g, s[0], -1, s[1]); return { g, x: s[0], z: s[1], ph: s[2], up: 0 }; });
  { const g = new GB(); spikeTraps.forEach(s => g.box(s.x - 0.95, 0, s.z - 1.85, s.x + 0.95, 0.02, s.z + 1.85)); const m = g.mesh(M.darkStone); m.castShadow = false; }

  const motes = JL.makeMotes(moteList); scene.add(motes);

  // point-light pool
  const NL = lowQ ? 4 : 6, plights = [];
  for (let i = 0; i < NL; i++) { const l = new T.PointLight(0xff8a3a, 0, 13, 2); scene.add(l); plights.push(l); }

  // ---------- heroine ----------
  let heroine;
  try { heroine = (window.createHeroine3 || window.createHeroine2 || window.createHeroine)(T); } catch (e) { console.warn('heroine', e); }
  if (!heroine) { const g = new T.Group(); const m = new T.Mesh(new T.CapsuleGeometry(0.3, 1.1, 4, 12), M.redLacquer); m.position.y = 0.85; m.castShadow = true; g.add(m); heroine = { group: g, update() { } }; }
  scene.add(heroine.group);

  // ---------- extensions (post-build) ----------
  Object.assign(ctx, { colliders, col, addLight, lightSpots, GB, sun, sunDir, sky, pl: null, heroine, getWater: () => water, setWater: w => { if (water) scene.remove(water); water = w; if (w) scene.add(w); } });
  JL.runExt = () => (JL.ext || []).forEach(f => { try { f(ctx); } catch (e) { console.warn('ext', e); } });

  // ---------- post ----------
  const post = new JL.Post(renderer, sun, lowQ);
  let scale = window.JL_FIXED_SCALE || Math.min(window.devicePixelRatio || 1, lowQ ? 1 : 1.5), maxScale = scale;
  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setPixelRatio(1); renderer.setSize(Math.max(2, Math.round(w * scale)), Math.max(2, Math.round(h * scale)), false);
    const W = renderer.domElement.width, H = renderer.domElement.height;
    post.setSize(W, H); camera.aspect = w / h; camera.fov = w < h ? 72 : 58; camera.updateProjectionMatrix();
    const ps = H / (2 * Math.tan(camera.fov * Math.PI / 360));
    petals.material.uniforms.scale.value = ps; motes.material.uniforms.scale.value = ps; flameFx.material.uniforms.scale.value = ps;
  }
  addEventListener('resize', resize); resize();

  // ---------- game state ----------
  const START = new T.Vector3(34, 0, 70);
  const pl = { pos: START.clone(), vel: new T.Vector3(), yaw: Math.PI, grounded: true, state: 'idle', hp: 100, climb: null, climbT: 0, inv: 0, dead: 0, safe: START.clone(), safeT: 0 };
  let mode = 'title', camYaw = Math.PI, camPitch = 0.22, camDist = 4.3, hurt = 0, fade = 1, sealsGot = 0, time = 0, winT = 0, msgT = 0;
  const camPos = new T.Vector3(34, 2, 74), camTarget = new T.Vector3();
  const keys = {}; let jumpQ = false, actQ = false; const joy = { x: 0, y: 0 };

  function say(t, d) { $('msg').textContent = t; $('msg').classList.add('on'); msgT = d || 4; }
  function setObjective() {
    $('obj').textContent = gateOpen ? 'Claim the Jade Dragon' : sealsGot >= 3 ? 'Bring the three seals to the Vermilion Gate' : 'Recover the three jade seals';
    document.querySelectorAll('#seals i').forEach((e, i) => e.classList.toggle('on', i < sealsGot));
  }

  function groundY(x, z, y, up) { if (up === undefined) up = 0.45; let g = -100; for (const b of colliders) { if (b.off) continue; if (x > b.x0 - 0.3 && x < b.x1 + 0.3 && z > b.z0 - 0.3 && z < b.z1 + 0.3 && b.y1 <= y + up && b.y1 > g) g = b.y1; } return g; }
  function collideXZ(p, r, st) {
    if (st === undefined) st = 0.45;
    for (let it = 0; it < 2; it++) for (const b of colliders) {
      if (b.off || b.y1 <= p.y + st || b.y0 >= p.y + 1.6) continue;
      const bw = b.x1 - b.x0, bd = b.z1 - b.z0;
      if (bw < 1.65 && bd < 1.65 && b.y1 - b.y0 < 4.5) { // small props collide as cylinders so the player slides around them
        const ccx = (b.x0 + b.x1) / 2, ccz = (b.z0 + b.z1) / 2, R = Math.max(bw, bd) * 0.5 + r; let ex = p.x - ccx, ez = p.z - ccz; const e2 = ex * ex + ez * ez;
        if (e2 < R * R) { if (e2 < 1e-6) { ex = 0.01; ez = 0.01; } const e = Math.sqrt(ex * ex + ez * ez); p.x = ccx + ex / e * R; p.z = ccz + ez / e * R; }
        continue;
      }
      const qx = clamp(p.x, b.x0, b.x1), qz = clamp(p.z, b.z0, b.z1), dx = p.x - qx, dz = p.z - qz, d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x = qx + dx / d * r; p.z = qz + dz / d * r; }
      else { const l = p.x - b.x0, rr = b.x1 - p.x, n = p.z - b.z0, f = b.z1 - p.z, m = Math.min(l, rr, n, f); if (m === l) p.x = b.x0 - r; else if (m === rr) p.x = b.x1 + r; else if (m === n) p.z = b.z0 - r; else p.z = b.z1 + r; }
    }
  }
  function tryMantle() {
    const fx = Math.sin(pl.yaw), fz = Math.cos(pl.yaw), px = pl.pos.x + fx * 0.68, pz = pl.pos.z + fz * 0.68; let best = null;
    for (const b of colliders) { if (b.off) continue; if (px > b.x0 && px < b.x1 && pz > b.z0 && pz < b.z1) { const h = b.y1 - pl.pos.y; if (h > 0.5 && h <= 1.95 && b.y1 < 4.8 && (!best || b.y1 > best.y1)) best = b; } }
    if (!best) return false; const ty = best.y1;
    for (const b of colliders) { if (b.off) continue; if (px > b.x0 - 0.2 && px < b.x1 + 0.2 && pz > b.z0 - 0.2 && pz < b.z1 + 0.2 && b.y0 < ty + 1.5 && b.y1 > ty + 0.05) return false; }
    pl.climb = { fx: pl.pos.x, fy: pl.pos.y, fz: pl.pos.z, ty, tx: px, tz: pz }; pl.climbT = 0; pl.state = 'climb'; pl.vel.set(0, 0, 0); pl.grounded = false; return true;
  }
  function damage(n, kx, kz) {
    if (pl.inv > 0 || mode !== 'play') return; pl.hp -= n; pl.hurtT = 0; pl.inv = 1.0; hurt = 1; pl.vel.x = kx * 6; pl.vel.z = kz * 6; pl.vel.y = 3; pl.grounded = false; pl.climb = null;
    if (pl.hp <= 0) die();
  }
  function die() { if (pl.dead > 0) return; pl.dead = 0.001; pl.state = 'dead'; pl.hp = 0; }

  function updatePlayer(dt) {
    if (pl.dead > 0) {
      pl.dead += dt; pl.vel.x *= 0.9; pl.vel.z *= 0.9;
      if (!pl.grounded) { pl.vel.y -= 20 * dt; pl.pos.y += pl.vel.y * dt; const g = groundY(pl.pos.x, pl.pos.z, pl.pos.y + 0.3); if (pl.pos.y <= g) { pl.pos.y = g; pl.grounded = true; } }
      fade = clamp(1 - (pl.dead - 0.9) / 0.8, 0, 1);
      if (pl.dead > 2.0) { pl.pos.copy(pl.safe); pl.vel.set(0, 0, 0); pl.hp = 100; pl.dead = 0; pl.state = 'idle'; pl.grounded = true; pl.inv = 1.5; say('The labyrinth spares you. For now.', 3); }
      return;
    }
    fade = Math.min(1, fade + dt * 1.5);
    pl.inv = Math.max(0, pl.inv - dt);
    pl.hurtT = (pl.hurtT || 0) + dt; if (pl.hurtT > 5 && pl.hp < 100) pl.hp = Math.min(100, pl.hp + dt * 6);
    if (pl.climb) {
      const c = pl.climb; pl.climbT += dt / clamp(0.15 + 0.7 * (c.ty - c.fy), 0.4, 1.5); const t = pl.climbT;   // climb time scales with ledge height: 0.5 m -> 0.5 s, 1.2 m -> 1.0 s, 1.8 m -> 1.4 s
      const a = clamp(t / 0.6, 0, 1), b = clamp((t - 0.5) / 0.5, 0, 1), ea = a * a * (3 - 2 * a), eb = b * b * (3 - 2 * b);
      pl.pos.y = lerp(c.fy, c.ty, ea); pl.pos.x = lerp(c.fx, c.tx, eb); pl.pos.z = lerp(c.fz, c.tz, eb);
      if (t >= 1) { pl.pos.set(c.tx, c.ty, c.tz); pl.climb = null; pl.grounded = true; pl.state = 'idle'; }
      return;
    }
    let ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + joy.x;
    let iy = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) + joy.y;
    if (mode !== 'play') { ix = iy = 0; jumpQ = false; }
    let il = Math.hypot(ix, iy); if (il > 1) { ix /= il; iy /= il; il = 1; }
    const fx = Math.sin(camYaw), fz = Math.cos(camYaw);
    const wade = pl.pos.y < -0.35;
    const maxV = (keys.ShiftLeft || keys.ShiftRight ? 2.0 : 5.4) * (wade ? 0.5 : 1);
    const tx = (fx * iy - fz * ix) * maxV, tz = (fz * iy + fx * ix) * maxV;
    const acc = pl.grounded ? 14 : 4, k = 1 - Math.exp(-acc * dt);
    pl.vel.x = lerp(pl.vel.x, tx, k); pl.vel.z = lerp(pl.vel.z, tz, k);
    if (il > 0.1) { const want = Math.atan2(tx, tz); let d = want - pl.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); pl.yaw += d * (1 - Math.exp(-12 * dt)); }
    // jump buffering + coyote time; wading auto-climbs out of the pool
    if (jumpQ) { jumpQ = false; pl.jbuf = 0.13; }
    pl.jbuf = (pl.jbuf || 0) - dt; pl.coy = pl.grounded ? 0.1 : (pl.coy || 0) - dt;
    if (pl.jbuf > 0) { if (il > 0.1 && tryMantle()) pl.jbuf = 0; else if (pl.coy > 0) { pl.vel.y = 6.7; pl.grounded = false; pl.jumped = true; pl.coy = 0; pl.jbuf = 0; pl.jcut = !!keys.Space; } }
    // variable jump height: releasing Space early gives a short hop (keyboard only; touch and scripted jumps are always full)
    if (pl.jcut && !pl.grounded && !keys.Space) { if (pl.vel.y > 2) pl.vel.y = 2; pl.jcut = false; }
    else if (pl.grounded && wade && il > 0.1) tryMantle();
    if (pl.climb) return;
    const prevY = pl.pos.y;
    pl.pos.x += pl.vel.x * dt; pl.pos.z += pl.vel.z * dt;
    // airborne: no step-up (prevents hopping onto 5 m wall tops from high ledges)
    const stepUp = (pl.grounded || (!pl.jumped && pl.coy > -0.15)) ? 0.45 : 0.08;
    collideXZ(pl.pos, 0.34, stepUp);
    if (pl.grounded) {
      pl.jumped = false;
      const g = groundY(pl.pos.x, pl.pos.z, pl.pos.y);
      if (g < pl.pos.y - 0.5) { pl.grounded = false; pl.vel.y = 0; } else pl.pos.y = lerp(pl.pos.y, g, 1 - Math.exp(-25 * dt));
    } else {
      pl.vel.y -= 20 * dt; pl.pos.y += pl.vel.y * dt;
      if (pl.vel.y <= 0) { const g = groundY(pl.pos.x, pl.pos.z, prevY, Math.max(0.12, stepUp)); if (pl.pos.y <= g) { pl.pos.y = g; pl.vel.y = 0; pl.grounded = true; } }
      if (!pl.grounded && pl.jumped && il > 0.1 && pl.vel.y < 4) tryMantle();
    }
    const sp = Math.hypot(pl.vel.x, pl.vel.z);
    pl.state = pl.climb ? 'climb' : !pl.grounded ? (pl.vel.y > 0 ? 'jump' : 'fall') : sp > 0.4 ? 'run' : 'idle';
    if (pl.pos.y < -2.3) die();
    // safe point
    pl.safeT += dt;
    if (pl.grounded && pl.pos.y > -0.1 && pl.safeT > 1.0) {
      let ok = Math.hypot(pl.pos.x - 62, pl.pos.z - 34) > 3.6;
      blades.forEach(b => { if (Math.abs(pl.pos.z - b.z) < 2.2 && Math.abs(pl.pos.x - b.x) < 2.5) ok = false; });
      spikeTraps.forEach(s => { if (Math.abs(pl.pos.x - s.x) < 2.2 && Math.abs(pl.pos.z - s.z) < 2.5) ok = false; });
      if (ok) { pl.safe.copy(pl.pos); pl.safeT = 0; }
    }
  }

  let prompt = '';
  function updateEntities(dt) {
    prompt = '';
    const px = pl.pos.x, py = pl.pos.y, pz = pl.pos.z;
    seals.forEach((s, i) => {
      if (s.got) return;
      s.g.rotation.y += dt * 1.2; s.g.position.y = s.base + Math.sin(time * 1.7 + i) * 0.08;
      if (!(s.locked && !cageOpen) && Math.hypot(px - s.g.position.x, pz - s.g.position.z) < 1.7 && Math.abs(py + 0.9 - s.g.position.y) < 1.4 && mode === 'play') {
        s.got = true; s.g.visible = false; sealsGot++; setObjective();
        say(sealsGot < 3 ? 'Jade seal recovered  ·  ' + sealsGot + ' of 3' : 'All three seals are yours. The Vermilion Gate awaits.', 4.5);
      }
    });
    // lever
    if (!leverOn && Math.hypot(px - 42, pz - 54) < 1.9) { prompt = 'Pull the bronze lever'; if (actQ) { leverOn = true; cageOpen = true; cageCol.off = true; say('Somewhere, gilded bars sink into the stone…', 4.5); } }
    leverA = lerp(leverA, leverOn ? 0.6 : -0.6, 1 - Math.exp(-6 * dt)); if (lever.userData.handle) lever.userData.handle.rotation.x = leverA;
    if (cageOpen && cageY > -2.6) { cageY -= dt * 1.2; cage.position.y = 0.3 + cageY; }
    // gate
    if (!gateOpen && Math.hypot(px - 34, pz - 19.6) < 2.6) {
      if (sealsGot >= 3) { prompt = 'Set the three seals into the gate'; if (actQ) { gateOpen = true; gateCol.off = true; setObjective(); say('The Vermilion Gate opens.', 4); } }
      else prompt = 'Sealed. Three jade sockets lie empty (' + sealsGot + '/3)';
    }
    sockets.forEach((s, i) => { s.material.emissiveIntensity = lerp(s.material.emissiveIntensity, gateOpen ? 4 : (i < sealsGot ? 0.6 : 0), dt * 2); });
    gateA = lerp(gateA, gateOpen ? 1.75 : 0, 1 - Math.exp(-1.2 * dt)); doors.forEach(d => d.piv.rotation.y = d.sgn * gateA);
    // idol
    idol.rotation.y += dt * 0.4;
    if (mode === 'play' && Math.hypot(px - 34, pz - 9.5) < 2.3) { prompt = 'Take the Jade Dragon'; if (actQ) { mode = 'win'; winT = 0; $('end').hidden = false; requestAnimationFrame(() => $('end').classList.add('on')); document.exitPointerLock && document.exitPointerLock(); } }
    // blades
    blades.forEach(b => {
      const th = Math.sin(time * 2.4 + b.ph) * 0.58; b.g.rotation.z = th;
      const tx = b.x + Math.sin(th) * 3.1, ty = 4.55 - Math.cos(th) * 3.1;
      if (Math.abs(pz - b.z) < 0.5 && Math.abs(px - tx) < 0.75 && py < ty + 0.8 && py + 1.7 > ty - 0.7) damage(35, Math.sign(Math.cos(time * 2.4 + b.ph)) * 0.6, pz > b.z ? 0.8 : -0.8);
    });
    spikeTraps.forEach(s => {
      const c = (time + s.ph) % 3.0; const tgt = c < 1.0 ? 1 : 0; s.up = lerp(s.up, tgt, 1 - Math.exp(-(tgt ? 22 : 5) * dt)); s.g.position.y = -1.0 + s.up * 1.0;
      if (s.up > 0.6 && Math.abs(px - s.x) < 1.1 && Math.abs(pz - s.z) < 1.9 && py < 0.7) damage(35, px > s.x ? 0.8 : -0.8, 0);
    });
    actQ = false;
    const pe = $('prompt');
    if (prompt && mode === 'play') { pe.textContent = (touch ? '' : 'E  ·  ') + prompt; pe.classList.add('on'); } else pe.classList.remove('on');
  }

  // ---------- camera ----------
  const tmp = new T.Vector3();
  function rayBoxes(o, d, len) {
    let best = len;
    for (const b of colliders) {
      if (b.off) continue;
      let t0 = 0, t1 = best;
      const ax = [[o.x, d.x, b.x0, b.x1], [o.y, d.y, b.y0, b.y1], [o.z, d.z, b.z0, b.z1]]; let hit = true;
      for (let i = 0; i < 3; i++) { const [oo, dd, mn, mx] = ax[i]; if (Math.abs(dd) < 1e-6) { if (oo < mn || oo > mx) { hit = false; break; } } else { let a = (mn - oo) / dd, c = (mx - oo) / dd; if (a > c) { const s = a; a = c; c = s; } t0 = Math.max(t0, a); t1 = Math.min(t1, c); if (t0 > t1) { hit = false; break; } } }
      if (hit && t0 < best) best = t0;
    }
    return best;
  }
  function updateCamera(dt) {
    if (mode === 'title') {
      const t = time * 0.06;
      camPos.set(32.4 + Math.sin(t) * 0.25, 1.35 + Math.sin(t * 1.7) * 0.06, 71.55); const por = camera.aspect < 1; camTarget.set(por ? 37.3 : 36.3, por ? 1.15 : 1.0, por ? 65.25 : 64); pl.yaw = -0.8 + Math.sin(time * 0.25) * 0.12;
      camera.position.copy(camPos); camera.lookAt(camTarget); return;
    }
    camPitch = clamp(camPitch, -0.55, 1.2);
    const tgt = tmp.set(pl.pos.x, pl.pos.y + 1.45, pl.pos.z);
    { const kxz = 1 - Math.exp(-14 * dt), ky = 1 - Math.exp(-(pl.grounded ? 8 : 12) * dt);   // softer vertical follow: no jitter on steps
      camTarget.x = lerp(camTarget.x, tgt.x, kxz); camTarget.z = lerp(camTarget.z, tgt.z, kxz); camTarget.y = lerp(camTarget.y, tgt.y, ky); }
    if (mode === 'win') { winT += dt; camYaw += dt * 0.25; }
    const cp = Math.cos(camPitch), d = new T.Vector3(-Math.sin(camYaw) * cp, Math.sin(camPitch), -Math.cos(camYaw) * cp);
    const want = mode === 'win' ? 3.4 : 4.3;
    const hit = rayBoxes(camTarget, d, want + 0.3) - 0.3;
    const nd = clamp(hit, 0.5, want);
    camDist = nd < camDist ? nd : lerp(camDist, nd, 1 - Math.exp(-4 * dt));
    camera.position.copy(camTarget).addScaledVector(d, camDist);
    camera.lookAt(camTarget.x, camTarget.y + 0.1, camTarget.z);
  }

  function updateLights() {
    const ref = mode === 'title' ? camera.position : pl.pos;
    lightSpots.forEach(l => { l.d = l.pos.distanceToSquared(ref); });
    const sorted = lightSpots.slice().sort((a, b) => a.d - b.d);
    for (let i = 0; i < NL; i++) {
      const s = sorted[i], L = plights[i]; if (!s) { L.intensity = 0; continue; }
      L.position.copy(s.pos); L.color.copy(s.color);
      const fl = 0.85 + 0.15 * Math.sin(time * 9 + s.ph) * Math.sin(time * 5.3 + s.ph * 2);
      L.intensity = s.power * fl * (1 - clamp((Math.sqrt(s.d) - 14) / 8, 0, 1)) * (JL.ANIME ? 0.45 : 1);
    }
  }

  // ---------- input ----------
  addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'Space') { jumpQ = true; e.preventDefault(); } if (e.code === 'KeyE' || e.code === 'Enter') actQ = true; if (e.code.startsWith('Arrow')) e.preventDefault(); });
  addEventListener('keyup', e => { keys[e.code] = false; });
  let dragging = false;
  canvas.addEventListener('mousedown', () => { dragging = true; if (mode === 'play' && !touch && canvas.requestPointerLock) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (e) { } } });
  addEventListener('mouseup', () => { dragging = false; });
  addEventListener('mousemove', e => { if (mode === 'title') return; if (document.pointerLockElement === canvas || dragging) { camYaw -= e.movementX * 0.0028; camPitch += e.movementY * 0.0022; } });
  if (touch) {
    document.body.classList.add('touch');
    let joyId = null, lookId = null, jx = 0, jy = 0, lx = 0, ly = 0;
    const stick = $('stick');
    canvas.addEventListener('touchstart', e => { e.preventDefault(); for (const t of e.changedTouches) { if (t.clientX < innerWidth * 0.45 && joyId === null) { joyId = t.identifier; jx = t.clientX; jy = t.clientY; stick.style.left = jx + 'px'; stick.style.top = jy + 'px'; stick.classList.add('on'); } else if (lookId === null) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; } } }, { passive: false });
    canvas.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) { if (t.identifier === joyId) { let dx = (t.clientX - jx) / 50, dy = (t.clientY - jy) / 50; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } joy.x = dx; joy.y = -dy; stick.firstElementChild.style.transform = 'translate(' + dx * 28 + 'px,' + dy * 28 + 'px)'; } else if (t.identifier === lookId) { camYaw -= (t.clientX - lx) * 0.006; camPitch += (t.clientY - ly) * 0.004; lx = t.clientX; ly = t.clientY; } } }, { passive: false });
    const end = e => { for (const t of e.changedTouches) { if (t.identifier === joyId) { joyId = null; joy.x = joy.y = 0; stick.classList.remove('on'); } if (t.identifier === lookId) lookId = null; } };
    canvas.addEventListener('touchend', end); canvas.addEventListener('touchcancel', end);
    $('bJump').addEventListener('touchstart', e => { e.preventDefault(); jumpQ = true; }, { passive: false });
    $('bAct').addEventListener('touchstart', e => { e.preventDefault(); actQ = true; }, { passive: false });
  }
  let variant = 'elder'; try { variant = localStorage.getItem('jl-hero') || 'elder'; } catch (e) { }
  const pick = v => { variant = v; document.querySelectorAll('#who button').forEach(b => { const on = b.dataset.v === v; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); }); try { if (heroine.setVariant) heroine.setVariant(v); } catch (e) { console.warn(e); } try { localStorage.setItem('jl-hero', v); } catch (e) { } };
  document.querySelectorAll('#who button').forEach(b => b.addEventListener('click', () => pick(b.dataset.v)));
  pick(variant);
  // art style links: plain navigation to ?anime / ?real (other query parameters kept)
  document.querySelectorAll('#look a').forEach(a => {
    const on = (a.dataset.s === 'anime') === !!JL.ANIME;
    a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page');
    const rest = location.search.replace(/^\?/, '').split('&').filter(k => k && !/^(real|anime)$/.test(k));
    a.href = '?' + [a.dataset.s].concat(rest).join('&') + location.hash;
  });
  $('start').addEventListener('click', () => {
    mode = 'play'; pl.yaw = Math.PI; $('title').classList.add('off'); $('hud').classList.add('on'); setObjective();
    camTarget.set(pl.pos.x, pl.pos.y + 1.45, pl.pos.z);
    say('Three jade seals guard the Vermilion Gate. Find them.', 6);
    if (!touch && canvas.requestPointerLock) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (e) { } }
  });
  $('again').addEventListener('click', () => { location.reload(); });

  // ---------- loop ----------
  ctx.pl = pl; ctx.post = post; JL.runExt();
  let last = performance.now(), fAcc = 0, fN = 0;
  const hs = { state: 'idle', speed: 0, vy: 0, climbT: 0, t: 0 };
  function frame(now) {
    window.__frames = (window.__frames || 0) + 1;
    if (window.JL_NORENDER) return;
    if (!window.JL_MANUAL) requestAnimationFrame(frame);
    const rdt = Math.max(0, (now - last) / 1000); last = now; const dt = Math.min(0.05, rdt); time += dt;
    updatePlayer(dt); updateEntities(dt);
    if (JL.ANIME) { if (((window.__frames | 0) % 30) === 0 || window.JL_MANUAL === 1) JL.toonify(scene); JL.toonSync(); }
    for (const f of extUpd) { try { f(dt, time, pl, camera); } catch (e) { if (!f.err) { f.err = 1; console.warn('ext update', e); } } }
    heroine.group.position.copy(pl.pos); heroine.group.rotation.y = pl.yaw;
    heroine.group.visible = !(pl.inv > 0 && pl.dead === 0 && Math.sin(time * 40) > 0.3);
    hs.state = pl.state; hs.speed = Math.hypot(pl.vel.x, pl.vel.z); hs.vy = pl.vel.y; hs.climbT = clamp(pl.climbT, 0, 1); hs.t = time;
    try { heroine.update(dt, hs); } catch (e) { if (!frame.err) { frame.err = 1; console.error('heroine.update', e); } }
    updateCamera(dt); updateLights();
    renderer.shadowMap.needsUpdate = ((window.__frames | 0) & 1) === 0 || window.JL_MANUAL === 1;
    petals.material.uniforms.time.value = time; petals.material.uniforms.origin.value.set(camTarget.x, 6, camTarget.z);
    motes.material.uniforms.time.value = time; flameFx.material.uniforms.time.value = time; sky.material.uniforms.time.value = time;
    sky.position.copy(camera.position);
    if (water && water.material.uniforms && water.material.uniforms.time && !water.userData.ownTime) water.material.uniforms.time.value = time * 0.35;
    hurt = Math.max(0, hurt - dt * 1.6);
    post.final.uniforms.uHurt.value = Math.max(hurt, pl.hp < 40 ? 0.25 + 0.1 * Math.sin(time * 5) : 0);
    post.final.uniforms.uFade.value = fade;
    post.render(scene, camera, time);
    $('hpbar').style.transform = 'scaleX(' + clamp(pl.hp / 100, 0, 1) + ')';
    if (msgT > 0) { msgT -= dt; if (msgT <= 0) $('msg').classList.remove('on'); }
    // adaptive resolution
    if (!window.JL_FIXED_SCALE) { fAcc += rdt; fN++; if (fAcc > 1.5) { const fps = fN / fAcc; fAcc = 0; fN = 0; if (fps < 33 && scale > 0.5) { scale = Math.max(0.5, scale * 0.85); resize(); } else if (fps > 56 && scale < maxScale) { scale = Math.min(maxScale, scale * 1.08); resize(); } } }
  }
  JL.debug = { pl, colliders, get mode() { return mode; }, set cam(v) { camYaw = v[0]; camPitch = v[1]; }, tp(x, y, z) { pl.pos.set(x, y, z); pl.vel.set(0, 0, 0); pl.climb = null; pl.grounded = true; pl.state = 'idle'; camTarget.set(x, y + 1.45, z); }, give() { sealsGot = 3; setObjective(); }, renderer };
  JL.debug.sim = function (sec, inp) {
    inp = inp || {}; const n = Math.round(sec * 60); let i = 0;
    for (; i < n; i++) {
      if (inp.camYaw !== undefined) camYaw = inp.camYaw;
      if (inp.to) camYaw = Math.atan2(inp.to[0] - pl.pos.x, inp.to[1] - pl.pos.z);
      keys.KeyW = (inp.fwd || 0) > 0 || !!inp.to; keys.KeyS = (inp.fwd || 0) < 0; keys.KeyD = (inp.right || 0) > 0; keys.KeyA = (inp.right || 0) < 0;
      if (i === 0 && inp.jump) jumpQ = true; if (i === 0 && inp.act) actQ = true;
      if (inp.jumpAt !== undefined && i === Math.round(inp.jumpAt * 60)) jumpQ = true;
      if (inp.jumpIf && inp.jumpIf(pl)) jumpQ = true;
      time += 1 / 60; updatePlayer(1 / 60); updateEntities(1 / 60);
      if (inp.to && Math.hypot(inp.to[0] - pl.pos.x, inp.to[1] - pl.pos.z) < (inp.tol || 0.35)) break;
      if (inp.until && inp.until(pl)) break;
    }
    keys.KeyW = keys.KeyS = keys.KeyA = keys.KeyD = false;
    return { x: +pl.pos.x.toFixed(2), y: +pl.pos.y.toFixed(2), z: +pl.pos.z.toFixed(2), g: pl.grounded, st: pl.state, hp: Math.round(pl.hp), dead: pl.dead > 0, seals: sealsGot, gate: gateOpen, cage: cageOpen, mode, t: +time.toFixed(2), steps: i, prompt };
  };
  JL.debug.water = water; JL.debug.scene = scene; JL.debug.post = post;
  JL.debug.snap = function (n) { let t = performance.now(); for (let i = 0; i < (n || 2); i++) { t += 50; frame(t); } return canvas.toDataURL("image/jpeg", 0.9); };
  requestAnimationFrame(frame);
})(window.JL);
