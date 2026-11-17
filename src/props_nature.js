/* Procedural nature / statue / relic / trap props. three.js r147 (global THREE). */
window.createNatureProps = function (THREE, M) {
  M = M || {};
  const V3 = THREE.Vector3;
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const mat = {
    stone: M.stone || std({ color: 0x8d8a82, roughness: 0.9 }),
    darkStone: M.darkStone || std({ color: 0x3b3a38, roughness: 0.95 }),
    gold: M.gold || std({ color: 0xffc84a, roughness: 0.28, metalness: 1 }),
    wood: M.wood || std({ color: 0x5a3a22, roughness: 0.8 }),
    bark: M.bark || std({ color: 0x3a2a22, roughness: 0.95 }),
    jade: M.jade || std({ color: 0x3fae7a, roughness: 0.25, metalness: 0.1 }),
    bronze: M.bronze || std({ color: 0x8a6a3a, roughness: 0.45, metalness: 0.9 }),
    moss: M.moss || std({ color: 0x4d6b2f, roughness: 1 }),
    leaf: M.leaf || std({ color: 0x4f8a3a, roughness: 0.7 }),
    blossom: M.blossom || std({ color: 0xffb9d2, roughness: 0.75 }),
    bamboo: M.bamboo || std({ color: 0x6f9a3c, roughness: 0.45 }),
    steel: M.steel || std({ color: 0xb8bcc4, roughness: 0.3, metalness: 1 }),
    redLacquer: M.redLacquer || std({ color: 0x9c1c14, roughness: 0.35 }),
  };

  /* ---------- helpers ---------- */
  function RNG(seed) {
    let a = (seed === undefined ? 1337 : seed) >>> 0;
    a = (a * 2654435761 + 0x9e3779b9) >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  function makeNoise(rnd) {
    const k = [];
    for (let i = 0; i < 6; i++) {
      const f = 1 + i * 0.7;
      k.push([(rnd() * 2 - 1) * f, (rnd() * 2 - 1) * f, (rnd() * 2 - 1) * f, rnd() * 6.283, 1 / (1 + i * 0.6)]);
    }
    return function (x, y, z) {
      let s = 0, w = 0;
      for (let i = 0; i < 6; i++) { const q = k[i]; s += Math.sin(x * q[0] + y * q[1] + z * q[2] + q[3]) * q[4]; w += q[4]; }
      return s / w;
    };
  }

  // merge to one non-indexed geometry (position, normal, uv, optional color)
  function merge(list) {
    const gs = list.map((g) => {
      if (!g.attributes.normal) g.computeVertexNormals();
      return g.index ? g.toNonIndexed() : g;
    });
    let n = 0;
    gs.forEach((g) => (n += g.attributes.position.count));
    const hasCol = gs.some((g) => g.attributes.color);
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    const col = hasCol ? new Float32Array(n * 3).fill(1) : null;
    let o = 0;
    gs.forEach((g) => {
      const c = g.attributes.position.count, a = g.attributes;
      pos.set(a.position.array.subarray(0, c * 3), o * 3);
      nor.set(a.normal.array.subarray(0, c * 3), o * 3);
      if (a.uv) uv.set(a.uv.array.subarray(0, c * 2), o * 2);
      if (col && a.color) col.set(a.color.array.subarray(0, c * 3), o * 3);
      o += c;
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    out.computeBoundingSphere();
    return out;
  }

  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
  // place geometry: scale -> rotate -> translate
  function P(g, pos, rot, scl) {
    _e.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0);
    _q.setFromEuler(_e);
    const s = scl === undefined ? [1, 1, 1] : typeof scl === 'number' ? [scl, scl, scl] : scl;
    _m.compose(new V3(pos[0], pos[1], pos[2]), _q, new V3(s[0], s[1], s[2]));
    g.applyMatrix4(_m);
    return g;
  }
  const sph = (r, pos, scl, rot, ws, hs) => P(new THREE.SphereGeometry(r, ws || 12, hs || 9), pos, rot, scl);
  const box = (w, h, d, pos, rot) => P(new THREE.BoxGeometry(w, h, d), pos, rot);
  const cyl = (rt, rb, h, pos, rot, seg) => P(new THREE.CylinderGeometry(rt, rb, h, seg || 12), pos, rot);
  const cone = (r, h, pos, rot, seg) => P(new THREE.ConeGeometry(r, h, seg || 8), pos, rot);
  // geometry authored along +Y from origin, pointed from a to b
  function between(g, a, b) {
    const d = new V3().subVectors(b, a), len = d.length();
    _q.setFromUnitVectors(new V3(0, 1, 0), d.normalize());
    _m.compose(a.clone().add(b).multiplyScalar(0.5), _q, new V3(1, len, 1));
    g.applyMatrix4(_m);
    return g;
  }
  const limb = (a, b, r0, r1, seg) => between(new THREE.CylinderGeometry(r1, r0, 1, seg || 8), a, b);

  function mesh(geo, material) {
    const m = new THREE.Mesh(geo, material);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  function weld(g) {
    const p = g.attributes.position, map = new Map(), remap = [], out = [];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const key = Math.round(x * 1e4) + ',' + Math.round(y * 1e4) + ',' + Math.round(z * 1e4);
      let k = map.get(key);
      if (k === undefined) { k = out.length / 3; out.push(x, y, z); map.set(key, k); }
      remap.push(k);
    }
    let idx = remap;
    if (g.index) idx = Array.from(g.index.array, (i) => remap[i]);
    const ng = new THREE.BufferGeometry();
    ng.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
    ng.setIndex(idx);
    return ng;
  }

  // welded, noise-displaced icosphere with smooth normals + spherical uv
  function lumpy(detail, rnd, amp, freq) {
    const g = weld(new THREE.IcosahedronGeometry(1, detail));
    const p = g.attributes.position, nz = makeNoise(rnd), f = freq || 1.4;
    const uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const d = 1 + amp * nz(x * f, y * f, z * f);
      p.setXYZ(i, x * d, y * d, z * d);
      uv[i * 2] = Math.atan2(z, x) / 6.283 + 0.5; uv[i * 2 + 1] = y * 0.5 + 0.5;
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }

  // tube along curve with radius function r(u)
  function taperTube(curve, rFn, tub, rad) {
    const fr = curve.computeFrenetFrames(tub, false);
    const pos = [], nor = [], uv = [], idx = [];
    const len = curve.getLength();
    for (let i = 0; i <= tub; i++) {
      const u = i / tub, C = curve.getPointAt(u), N = fr.normals[i], B = fr.binormals[i], r = rFn(u);
      for (let j = 0; j <= rad; j++) {
        const a = (j / rad) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
        const nx = c * N.x + s * B.x, ny = c * N.y + s * B.y, nzz = c * N.z + s * B.z;
        pos.push(C.x + nx * r, C.y + ny * r, C.z + nzz * r);
        nor.push(nx, ny, nzz);
        uv.push(j / rad, u * len);
      }
    }
    for (let i = 0; i < tub; i++) for (let j = 0; j < rad; j++) {
      const a = i * (rad + 1) + j, b = a + rad + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  }

  function tint(g, r, gg, b) {
    const n = g.attributes.position.count, c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { c[i * 3] = r; c[i * 3 + 1] = gg; c[i * 3 + 2] = b; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return g;
  }

  /* ---------- cherry tree ---------- */
  function cherryTree(height, seed) {
    height = height || 6;
    const rnd = RNG(seed === undefined ? 11 : seed);
    const group = new THREE.Group();
    const branches = [], clumps = [];
    let maxY = 0;
    function grow(start, dir, len, r, depth) {
      const side = new V3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).cross(dir).normalize();
      const mid = start.clone().addScaledVector(dir, len * 0.5).addScaledVector(side, len * (0.1 + rnd() * 0.14));
      const end = start.clone().addScaledVector(dir, len).addScaledVector(side, -len * 0.06);
      end.y += len * 0.06;
      const curve = new THREE.CatmullRomCurve3([start, mid, end]);
      const r1 = depth >= 3 ? r * 0.3 : r * 0.64;
      branches.push(taperTube(curve, (u) => lerp(r, r1, u) * (depth === 0 ? 1 + 0.7 * Math.pow(1 - u, 4) : 1), depth === 0 ? 8 : 5, depth < 2 ? 8 : 5));
      if (depth >= 2) {
        const nC = depth === 3 ? 11 : 3;
        for (let i = 0; i < nC; i++) {
          const u = depth === 3 ? 0.45 + rnd() * 0.6 : 0.5 + rnd() * 0.5;
          const c = curve.getPoint(Math.min(1, u));
          const sp = depth === 3 ? 0.13 : 0.07;
          c.x += (rnd() - 0.5) * height * sp * 2; c.y += (rnd() - 0.3) * height * sp; c.z += (rnd() - 0.5) * height * sp * 2;
          clumps.push([c, height * (0.03 + rnd() * 0.04)]);
          maxY = Math.max(maxY, c.y + height * 0.08);
        }
      }
      if (depth >= 3) return;
      const n = depth === 0 ? 3 + (rnd() < 0.5 ? 1 : 0) : 2 + (rnd() < 0.45 ? 1 : 0);
      const a0 = rnd() * 6.283;
      for (let i = 0; i < n; i++) {
        const a = a0 + (i / n) * 6.283 + (rnd() - 0.5) * 0.9;
        const spread = depth === 0 ? 0.75 + rnd() * 0.35 : 0.6 + rnd() * 0.5;
        const nd = dir.clone().multiplyScalar(0.75).add(new V3(Math.cos(a) * spread, 0.28 + rnd() * 0.3, Math.sin(a) * spread)).normalize();
        grow(end, nd, len * (0.7 + rnd() * 0.18), r1, depth + 1);
      }
    }
    grow(new V3(0, 0, 0), new V3((rnd() - 0.5) * 0.25, 1, (rnd() - 0.5) * 0.25).normalize(), height * 0.27, height * 0.042, 0);
    const k = height / Math.max(maxY, 0.001);
    const inner = new THREE.Group();
    inner.scale.setScalar(k);
    inner.add(mesh(merge(branches), mat.bark));
    const cg = lumpy(1, rnd, 0.3, 2.6);
    const im = new THREE.InstancedMesh(cg, mat.blossom.clone(), clumps.length);
    const d = new THREE.Object3D(), col = new THREE.Color();
    clumps.forEach((c, i) => {
      d.position.copy(c[0]);
      d.rotation.set(rnd() * 6, rnd() * 6, rnd() * 6);
      d.scale.set(c[1] * (0.9 + rnd() * 0.5), c[1] * (0.65 + rnd() * 0.3), c[1] * (0.9 + rnd() * 0.5));
      d.updateMatrix();
      im.setMatrixAt(i, d.matrix);
      const t = rnd(), b = 0.86 + rnd() * 0.3;
      col.setRGB(b, b * lerp(1.02, 0.62, t * t), b * lerp(1.02, 0.78, t * t));
      im.setColorAt(i, col);
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = true; im.receiveShadow = true;
    // instanced canopy: give the shared geometry bounds that cover every clump so culling/Box3 work
    cg.boundingSphere = new THREE.Sphere(new V3(0, maxY * 0.55, 0), maxY * 0.85);
    cg.boundingBox = new THREE.Box3(new V3(-maxY * 0.8, 0, -maxY * 0.8), new V3(maxY * 0.8, maxY * 1.02, maxY * 0.8));
    inner.add(im);
    group.add(inner);
    group.userData.canopy = im;
    return group;
  }

  /* ---------- bamboo ---------- */
  function leafQuad(len, w) {
    const g = new THREE.BufferGeometry();
    // diamond leaf lying in XY plane, base at origin, tip at +Y, slight fold
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -w, len * 0.35, w * 0.4, 0, len, 0, w, len * 0.35, w * 0.4, 0, len * 0.3, 0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0.5, 0, 0, 0.35, 0.5, 1, 1, 0.35, 0.5, 0.3], 2));
    g.setIndex([0, 4, 1, 1, 4, 2, 0, 3, 4, 4, 3, 2]);
    g.computeVertexNormals();
    return g;
  }
  function bambooCluster(n, radius, height, seed) {
    n = n || 14; radius = radius || 1.6; height = height || 9;
    const rnd = RNG(seed === undefined ? 23 : seed);
    const group = new THREE.Group(), stalks = [], leaves = [];
    for (let s = 0; s < n; s++) {
      const a = rnd() * 6.283, rr = Math.sqrt(rnd()) * radius;
      const h = height * (0.6 + rnd() * 0.4), r0 = 0.035 + rnd() * 0.03;
      const base = new V3(Math.cos(a) * rr, 0, Math.sin(a) * rr);
      const la = a + (rnd() - 0.5) * 1.5, lean = 0.05 + rnd() * 0.16;
      const top = base.clone().add(new V3(Math.cos(la) * h * lean, h, Math.sin(la) * h * lean));
      const mid = base.clone().lerp(top, 0.5); mid.x -= Math.cos(la) * h * lean * 0.3; mid.z -= Math.sin(la) * h * lean * 0.3;
      const curve = new THREE.QuadraticBezierCurve3(base, mid, top);
      const segs = Math.round(h / 0.5);
      const b = 0.8 + rnd() * 0.35, yel = rnd() * 0.25;
      const cr = b * (0.9 + yel), cgn = b, cb = b * (0.85 - yel);
      const rF = (u) => r0 * (1 - 0.55 * u) * (1 + 0.1 * Math.pow(Math.abs(Math.sin(u * segs * Math.PI)), 12));
      stalks.push(tint(taperTube(curve, rF, segs * 2, 6), cr, cgn, cb));
      for (let i = 1; i < segs; i++) {
        const u = i / segs, c = curve.getPointAt(u), t = curve.getTangentAt(u);
        const ring = new THREE.CylinderGeometry(r0 * (1 - 0.55 * u) * 1.18, r0 * (1 - 0.55 * u) * 1.18, 0.022, 6);
        _q.setFromUnitVectors(new V3(0, 1, 0), t);
        _m.compose(c, _q, new V3(1, 1, 1)); ring.applyMatrix4(_m);
        stalks.push(tint(ring, cr * 0.6, cgn * 0.62, cb * 0.5));
        if (u > 0.45 && rnd() < 0.85) {
          // leaf spray
          const sprays = 1 + (rnd() < 0.5 ? 1 : 0);
          for (let k = 0; k < sprays; k++) {
            const ba = rnd() * 6.283, bl = 0.35 + rnd() * 0.5;
            const bd = new V3(Math.cos(ba), 0.25 + rnd() * 0.3, Math.sin(ba)).normalize();
            const be = c.clone().addScaledVector(bd, bl);
            stalks.push(tint(limb(c, be, 0.007, 0.003, 4), cr * 0.8, cgn * 0.8, cb * 0.7));
            const nl = 4 + Math.floor(rnd() * 4);
            for (let l = 0; l < nl; l++) {
              const lp = c.clone().lerp(be, 0.35 + 0.65 * (l / (nl - 1)));
              const lg = leafQuad(0.3 + rnd() * 0.22, 0.028 + rnd() * 0.014);
              const ld = bd.clone().add(new V3((rnd() - 0.5) * 1.6, -0.5 - rnd() * 0.7, (rnd() - 0.5) * 1.6)).normalize();
              _q.setFromUnitVectors(new V3(0, 1, 0), ld);
              _m.compose(lp, _q, new V3(1, 1, 1)); lg.applyMatrix4(_m);
              const lb = 0.75 + rnd() * 0.5;
              leaves.push(tint(lg, lb * 0.95, lb, lb * 0.8));
            }
          }
        }
      }
    }
    const sm = mat.bamboo.clone(); sm.vertexColors = true;
    group.add(mesh(merge(stalks), sm));
    const lm = mat.leaf.clone(); lm.vertexColors = true; lm.side = THREE.DoubleSide;
    group.add(mesh(merge(leaves), lm));
    return group;
  }

  /* ---------- pine ---------- */
  function pine(height, seed) {
    height = height || 5;
    const rnd = RNG(seed === undefined ? 37 : seed);
    const group = new THREE.Group(), woodG = [], pads = [];
    const h = height, sx = rnd() < 0.5 ? 1 : -1;
    const tc = new THREE.CatmullRomCurve3([
      new V3(0, 0, 0), new V3(0.14 * h * sx, 0.22 * h, 0.05 * h), new V3(-0.06 * h * sx, 0.45 * h, -0.08 * h),
      new V3(0.12 * h * sx, 0.66 * h, 0.03 * h), new V3(0.02 * h * sx, 0.84 * h, 0.08 * h), new V3(0.1 * h * sx, 0.93 * h, 0.02 * h)]);
    woodG.push(taperTube(tc, (u) => h * lerp(0.05, 0.012, u) * (1 + 0.6 * Math.pow(1 - u, 5)), 28, 8));
    function pad(c, r) {
      const g = lumpy(2, rnd, 0.3, 2.4), p = g.attributes.position, col = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        let y = p.getY(i); if (y < 0) y *= 0.35;
        p.setY(i, y);
        const t = sstep(-0.3, 0.9, y), v = 0.55 + 0.75 * t + (rnd() - 0.5) * 0.12;
        col[i * 3] = v * 0.9; col[i * 3 + 1] = v; col[i * 3 + 2] = v * 0.85;
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.computeVertexNormals();
      pads.push(P(g, [c.x, c.y, c.z], [0, rnd() * 6.283, (rnd() - 0.5) * 0.25], [r * (1 + rnd() * 0.3), r * 0.42, r * (0.8 + rnd() * 0.3)]));
    }
    const nb = 6;
    for (let i = 0; i < nb; i++) {
      const u = 0.38 + (i / (nb - 1)) * 0.55;
      const s = tc.getPointAt(u), a = i * 2.4 + rnd() * 0.8;
      const bl = h * lerp(0.36, 0.14, (u - 0.38) / 0.55) * (0.85 + rnd() * 0.3);
      const e = s.clone().add(new V3(Math.cos(a) * bl, bl * (0.05 + rnd() * 0.15), Math.sin(a) * bl));
      const m = s.clone().lerp(e, 0.5); m.y -= bl * 0.12;
      const bc = new THREE.CatmullRomCurve3([s, m, e]);
      const br = h * lerp(0.05, 0.012, u) * 0.55;
      woodG.push(taperTube(bc, (t) => lerp(br, br * 0.35, t), 6, 6));
      const pr = bl * 0.62;
      pad(e.clone().add(new V3(0, pr * 0.1, 0)), pr);
      pad(s.clone().lerp(e, 0.55).add(new V3((rnd() - 0.5) * pr, pr * 0.22, (rnd() - 0.5) * pr)), pr * 0.7);
    }
    const top = tc.getPointAt(1);
    pad(top.clone().add(new V3(0, h * 0.02, 0)), h * 0.16);
    group.add(mesh(merge(woodG), mat.bark));
    const pm = mat.leaf.clone(); pm.vertexColors = true; pm.color = new THREE.Color(0x2c5a2e); pm.roughness = 0.9;
    group.add(mesh(merge(pads), pm));
    return group;
  }

  /* ---------- rock ---------- */
  function rock(size, seed) {
    size = size || 1;
    const rnd = RNG(seed === undefined ? 51 : seed);
    const g = lumpy(7, rnd, 0.34, 1.3), p = g.attributes.position, v = new V3();
    const nz2 = makeNoise(rnd);
    const sc = [0.9 + rnd() * 0.4, 0.6 + rnd() * 0.3, 0.8 + rnd() * 0.4];
    const planes = [];
    for (let i = 0; i < 14; i++) planes.push([new V3(rnd() - 0.5, rnd() - 0.4, rnd() - 0.5).normalize(), 0.55 + rnd() * 0.3]);
    const floor = -0.42;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      for (const pl of planes) { const d = v.dot(pl[0]) - pl[1]; if (d > 0) v.addScaledVector(pl[0], -d * 0.95); }
      { const l = v.length(), q = 1 + 0.07 * nz2(v.x * 6, v.y * 6, v.z * 6) + 0.035 * nz2(v.x * 13, v.z * 13, v.y * 13); v.multiplyScalar(q); void l; }
      v.set(v.x * sc[0], v.y * sc[1], v.z * sc[2]);
      if (v.y < floor) v.y = floor + (v.y - floor) * 0.05;
      p.setXYZ(i, v.x * size, (v.y - floor) * size, v.z * size);
    }
    g.computeVertexNormals();
    const nz = makeNoise(rnd), nr = g.attributes.normal, col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) / size, y = p.getY(i) / size, z = p.getZ(i) / size;
      const m = sstep(0.45, 0.85, nr.getY(i) + nz(x * 3, y * 3, z * 3) * 0.35);
      const ao = lerp(0.55, 1, sstep(0, 0.35, y)) * (0.92 + 0.1 * nz(x * 7, y * 7, z * 7));
      col[i * 3] = lerp(1, 0.5, m) * ao; col[i * 3 + 1] = lerp(1, 0.78, m) * ao; col[i * 3 + 2] = lerp(1, 0.34, m) * ao;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const rm = mat.stone.clone(); rm.vertexColors = true;
    const group = new THREE.Group();
    group.add(mesh(g, rm));
    return group;
  }

  /* ---------- lotus ---------- */
  function lotus() {
    const group = new THREE.Group();
    const padG = new THREE.CircleGeometry(0.3, 28, 0.16, Math.PI * 2 - 0.32);
    const pp = padG.attributes.position;
    for (let i = 1; i < pp.count; i++) pp.setZ(i, 0.012 + 0.006 * Math.sin(i * 1.7)); // slightly upturned rim
    padG.rotateX(-Math.PI / 2); padG.translate(0, 0.004, 0); padG.computeVertexNormals();
    const pm = mat.leaf.clone(); pm.color = new THREE.Color(0x2f6b36); pm.side = THREE.DoubleSide; pm.roughness = 0.45;
    group.add(mesh(padG, pm));
    const petals = [];
    function ring(count, tilt, len, w, y, off) {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * 6.283 + off;
        const g = new THREE.SphereGeometry(1, 8, 6), p = g.attributes.position, col = new Float32Array(p.count * 3);
        for (let j = 0; j < p.count; j++) {
          const t = p.getY(j) * 0.5 + 0.5; // 0 base .. 1 tip
          const wd = Math.sin(Math.pow(t, 0.7) * Math.PI) * 0.9 + 0.1;
          const x = p.getX(j) * w * wd, z = p.getZ(j) * w * 0.14 * wd + x * x / w * 0.9 - t * t * len * 0.18;
          p.setXYZ(j, x, t * len, z);
          col[j * 3] = 1.05; col[j * 3 + 1] = lerp(1.15, 0.72, t); col[j * 3 + 2] = lerp(1.1, 0.8, t);
        }
        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        g.computeVertexNormals();
        g.rotateX(tilt); g.translate(0, 0, 0.022); g.rotateY(a); g.translate(0.03, y, 0);
        petals.push(g);
      }
    }
    ring(9, 1.2, 0.17, 0.055, 0.02, 0);
    ring(8, 0.85, 0.16, 0.052, 0.028, 0.35);
    ring(6, 0.5, 0.14, 0.046, 0.034, 0.1);
    ring(5, 0.22, 0.12, 0.04, 0.04, 0.6);
    const fm = mat.blossom.clone(); fm.vertexColors = true; fm.side = THREE.DoubleSide; fm.roughness = 0.55;
    group.add(mesh(merge(petals), fm));
    const core = [cyl(0.03, 0.02, 0.05, [0.03, 0.06, 0], null, 10)];
    for (let i = 0; i < 10; i++) core.push(sph(0.007, [0.03 + Math.cos(i * 0.628) * 0.034, 0.075, Math.sin(i * 0.628) * 0.034], 1, null, 5, 4));
    group.add(mesh(merge(core), mat.gold));
    return group;
  }

  /* ---------- guardian lion (shishi) ---------- */
  function guardianLion() {
    const group = new THREE.Group(), S = [], D = [], G = [];
    const rnd = RNG(77);
    // plinth
    S.push(box(1.2, 0.2, 1.5, [0, 0.1, 0]), box(1.0, 0.1, 1.3, [0, 0.25, 0]), box(0.92, 0.36, 1.22, [0, 0.48, 0]),
      box(1.02, 0.08, 1.32, [0, 0.7, 0]), box(1.16, 0.14, 1.46, [0, 0.81, 0]));
    for (let i = -2; i <= 2; i++) { // carved panels
      S.push(box(0.14, 0.24, 0.03, [i * 0.17, 0.48, 0.612]), box(0.14, 0.24, 0.03, [i * 0.17, 0.48, -0.612]));
    }
    for (let i = -3; i <= 3; i++) S.push(box(0.03, 0.24, 0.13, [0.462, 0.48, i * 0.16]), box(0.03, 0.24, 0.13, [-0.462, 0.48, i * 0.16]));
    const Y = 0.88;
    // body, haunches
    S.push(sph(0.4, [0, Y + 0.48, -0.1], [0.95, 1.2, 1.0], [-0.3, 0, 0], 16, 12));
    S.push(sph(0.3, [0, Y + 0.72, 0.14], [1.05, 1.0, 0.9], null, 14, 10)); // chest
    for (const s of [-1, 1]) {
      S.push(sph(0.26, [s * 0.3, Y + 0.24, -0.2], [0.8, 1.0, 1.15]));
      S.push(sph(0.11, [s * 0.34, Y + 0.08, 0.12], [1.0, 0.75, 1.7]));
      for (let t = -1; t <= 1; t++) S.push(sph(0.04, [s * 0.34 + t * 0.06, Y + 0.07, 0.3], [1, 0.9, 1.3], null, 6, 5));
    }
    // front legs: right (-x) straight to ground; left (+x) rests on ball
    const ballC = new V3(0.27, Y + 0.17, 0.44);
    S.push(limb(new V3(-0.22, Y + 0.72, 0.24), new V3(-0.24, Y + 0.1, 0.42), 0.12, 0.095, 10));
    S.push(sph(0.12, [-0.24, Y + 0.08, 0.46], [1.05, 0.7, 1.4]));
    S.push(limb(new V3(0.22, Y + 0.74, 0.24), new V3(0.26, Y + 0.4, 0.44), 0.12, 0.095, 10));
    S.push(sph(0.115, [0.27, Y + 0.37, 0.47], [1.05, 0.7, 1.35]));
    for (let t = -1; t <= 1; t++) {
      S.push(sph(0.04, [-0.24 + t * 0.065, Y + 0.06, 0.6], [1, 0.9, 1.3], null, 6, 5));
      S.push(sph(0.04, [0.27 + t * 0.065, Y + 0.34, 0.6], [1, 0.9, 1.3], null, 6, 5));
    }
    S.push(sph(0.17, [ballC.x, ballC.y, ballC.z], 1, null, 14, 10));
    for (let i = 0; i < 3; i++) S.push(P(new THREE.TorusGeometry(0.172, 0.012, 5, 20), [ballC.x, ballC.y, ballC.z], [i * 1.05, i * 1.05, 0]));
    // head
    const H = Y + 1.1, hz = 0.22;
    S.push(sph(0.3, [0, H, hz], [1.05, 0.95, 0.95], null, 16, 12));
    S.push(sph(0.17, [0, H - 0.02, hz + 0.24], [1.15, 0.75, 1.0])); // upper snout
    S.push(sph(0.07, [0, H + 0.05, hz + 0.4], [1.5, 0.8, 0.8])); // nose
    S.push(sph(0.15, [0, H - 0.2, hz + 0.2], [1.05, 0.38, 1.0], [0.35, 0, 0])); // lower jaw
    D.push(sph(0.12, [0, H - 0.115, hz + 0.24], [1.05, 0.5, 0.9])); // mouth cavity
    for (const s of [-1, 1]) {
      S.push(sph(0.085, [s * 0.14, H - 0.02, hz + 0.3], [1, 0.8, 1])); // cheeks/whisker pads
      S.push(sph(0.055, [s * 0.125, H + 0.1, hz + 0.25], 1, null, 8, 6)); // eyes
      S.push(sph(0.07, [s * 0.13, H + 0.165, hz + 0.23], [1.5, 0.5, 0.9], [0, 0, s * -0.35])); // brow
      S.push(sph(0.09, [s * 0.27, H + 0.12, hz - 0.02], [0.5, 1, 0.9], [0, 0, s * -0.5])); // ears
      for (let t = 0; t < 2; t++) S.push(cone(0.025, 0.07, [s * (0.05 + t * 0.07), H - 0.1, hz + 0.34 - t * 0.03], [Math.PI, 0, 0], 5)); // fangs
    }
    D.push(sph(0.022, [-0.125, H + 0.1, hz + 0.3], 1, null, 6, 5), sph(0.022, [0.125, H + 0.1, hz + 0.3], 1, null, 6, 5));
    // mane curls: rows around head back & down the neck/chest
    for (let row = 0; row < 5; row++) {
      const n = 9 + row, rr = 0.3 + row * 0.02;
      for (let i = 0; i < n; i++) {
        const a = -0.55 + (i / (n - 1)) * (Math.PI + 1.1); // over the top from side to side
        const x = Math.cos(a) * rr * 1.05, y = Math.sin(a) * rr, z = hz + 0.04 - row * 0.1;
        S.push(sph(0.075 + rnd() * 0.015, [x, H + y - row * 0.05, z], [1, 1, 0.9], [rnd(), rnd(), rnd()], 8, 6));
      }
    }
    for (let row = 0; row < 3; row++) for (let i = -2 + (row > 1 ? 1 : 0); i <= 2 - (row > 1 ? 1 : 0); i++)
      S.push(sph(0.07, [i * 0.11, H - 0.33 - row * 0.1, hz + 0.16 - row * 0.02 - Math.abs(i) * 0.04], 1, null, 8, 6));
    // tail: flame-like tuft up the back
    for (let i = 0; i < 5; i++) S.push(sph(0.13 - i * 0.012, [Math.sin(i * 1.3) * 0.05, Y + 0.42 + i * 0.15, -0.5 + i * 0.035], [1, 1.2, 0.8], null, 8, 6));
    S.push(cone(0.07, 0.2, [0, Y + 1.2, -0.35], [0.5, 0, 0], 8));
    // collar + bell
    G.push(P(new THREE.TorusGeometry(0.27, 0.028, 6, 24), [0, H - 0.3, hz - 0.02], [Math.PI / 2 - 0.45, 0, 0]));
    G.push(sph(0.065, [0, H - 0.46, hz + 0.21], 1, null, 10, 8));
    group.add(mesh(merge(S), mat.stone));
    group.add(mesh(merge(D), mat.darkStone));
    const bell = mesh(merge(G), mat.bronze);
    group.add(bell);
    return group;
  }

  /* ---------- dragon idol ---------- */
  function dragonIdol() {
    const group = new THREE.Group(), G = [], J = [];
    // base
    G.push(cyl(0.34, 0.37, 0.05, [0, 0.025, 0], null, 28), cyl(0.3, 0.33, 0.035, [0, 0.067, 0], null, 28), cyl(0.27, 0.27, 0.02, [0, 0.094, 0], null, 28));
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * 6.283;
      G.push(P(new THREE.SphereGeometry(1, 8, 6), [Math.cos(a) * 0.33, 0.05, Math.sin(a) * 0.33], [0, -a + Math.PI / 2, 0.35], [0.055, 0.05, 0.022]));
    }
    // jade pillar the dragon coils around
    J.push(cyl(0.05, 0.13, 0.72, [0, 0.46, 0], null, 12));
    J.push(cyl(0.15, 0.17, 0.03, [0, 0.115, 0], null, 16));
    // body spiral
    const pts = [], N = 70;
    for (let i = 0; i <= N; i++) {
      const t = i / N, a = Math.PI + t * Math.PI * 4.5, r = 0.25 - 0.13 * t;
      pts.push(new V3(Math.cos(a) * r, 0.165 + 0.62 * t + 0.012 * Math.sin(t * 40), Math.sin(a) * r));
    }
    pts.push(new V3(0.085, 0.83, -0.075), new V3(0.105, 0.89, 0.0), new V3(0.075, 0.955, 0.04), new V3(0.04, 1.0, 0.075), new V3(0.03, 1.03, 0.12));
    const curve = new THREE.CatmullRomCurve3(pts);
    const rB = (u) => lerp(0.01, 0.064, sstep(0, 0.3, u)) * (1 - 0.18 * sstep(0.86, 1, u));
    G.push(taperTube(curve, (u) => rB(u) * (1 + 0.05 * Math.sin(u * 420)), 260, 12));
    const up0 = new V3(0, 1, 0);
    const NF = 86;
    for (let i = 1; i < NF; i++) {
      const u = i / NF * 0.97, c = curve.getPointAt(u), t = curve.getTangentAt(u);
      const up = up0.clone().addScaledVector(t, -t.y).normalize();
      const b = new V3().crossVectors(t, up).normalize();
      const r = rB(u), s = r / 0.064;
      const fu = up.clone().addScaledVector(t, -0.55).normalize();
      const g = new THREE.ConeGeometry(0.03, 0.05, 4);
      g.translate(0, 0.02, 0);
      const mm = new THREE.Matrix4().makeBasis(t.clone().multiplyScalar(s * 1.1), fu.multiplyScalar(s * (0.8 + 0.3 * Math.sin(i * 1.9))), b.multiplyScalar(s * 0.3));
      mm.setPosition(c.clone().addScaledVector(up, r * 0.9));
      g.applyMatrix4(mm);
      G.push(g);
      // belly plates hint: small side whorls every few
      if (i % 9 === 4 && u > 0.2 && u < 0.9) {
        const out = new V3(c.x, 0, c.z).normalize();
        G.push(P(new THREE.TorusGeometry(0.018 * s, 0.006 * s, 4, 10), [c.x + out.x * r * 0.96, c.y, c.z + out.z * r * 0.96], [0, Math.atan2(out.x, out.z), 0]));
      }
    }
    // tail tuft
    { const c = curve.getPointAt(0), t = curve.getTangentAt(0).negate();
      for (let i = 0; i < 5; i++) { const e = c.clone().addScaledVector(t, 0.07).add(new V3(0, (i - 1.5) * 0.03, 0).addScaledVector(new V3(c.x, 0, c.z).normalize(), (i % 2) * 0.03)); G.push(limb(c, e, 0.012, 0.001, 5)); } }
    // legs
    [0.3, 0.42, 0.58, 0.7].forEach((u, li) => {
      const c = curve.getPointAt(u), r = rB(u), out = new V3(c.x, 0, c.z).normalize();
      const t = curve.getTangentAt(u);
      const sh = c.clone().addScaledVector(out, r * 0.7);
      const el = sh.clone().addScaledVector(out, 0.07).add(new V3(0, 0.03, 0)).addScaledVector(t, 0.02);
      const pw = el.clone().addScaledVector(out, 0.05).add(new V3(0, -0.075, 0)).addScaledVector(t, 0.03);
      G.push(limb(sh, el, 0.026, 0.02, 6), limb(el, pw, 0.02, 0.015, 6), sph(0.02, [el.x, el.y, el.z], 1, null, 6, 5), sph(0.019, [pw.x, pw.y, pw.z], 1, null, 6, 5));
      for (let k = -1; k <= 1; k++) {
        const cl = pw.clone().addScaledVector(out, 0.04).addScaledVector(t, k * 0.03).add(new V3(0, -0.035, 0));
        G.push(limb(pw, cl, 0.009, 0.001, 5));
      }
    });
    // head (local: faces +Z, up +Y), then transformed onto curve end
    const Hd = [], Ey = [];
    Hd.push(sph(0.07, [0, 0.01, 0], [0.95, 0.85, 1.15]));
    Hd.push(sph(0.05, [0, 0.0, 0.1], [0.95, 0.62, 1.7])); // upper snout
    Hd.push(sph(0.014, [0.026, 0.024, 0.17], [1, 0.8, 1.2], null, 6, 5), sph(0.014, [-0.026, 0.024, 0.17], [1, 0.8, 1.2], null, 6, 5)); // nostrils
    Hd.push(sph(0.042, [0, -0.07, 0.075], [0.9, 0.32, 1.9], [0.5, 0, 0])); // jaw
    Hd.push(cone(0.018, 0.07, [0, -0.1, 0.03], [Math.PI - 0.4, 0, 0], 5)); // beard
    for (const s of [-1, 1]) {
      Hd.push(sph(0.026, [s * 0.045, 0.05, 0.05], [1.3, 0.6, 1.5], [0, 0, s * -0.4], 6, 5)); // brow
      Ey.push(sph(0.014, [s * 0.047, 0.032, 0.06], 1, null, 6, 5));
      // antler horns
      const hc = new THREE.CatmullRomCurve3([new V3(s * 0.03, 0.05, 0.0), new V3(s * 0.05, 0.11, -0.05), new V3(s * 0.065, 0.14, -0.12), new V3(s * 0.06, 0.2, -0.17)]);
      Hd.push(taperTube(hc, (u) => lerp(0.014, 0.003, u), 8, 6));
      Hd.push(limb(new V3(s * 0.055, 0.12, -0.07), new V3(s * 0.09, 0.17, -0.06), 0.008, 0.002, 5));
      // whiskers
      const wc = new THREE.CatmullRomCurve3([new V3(s * 0.035, 0.0, 0.16), new V3(s * 0.09, 0.02, 0.2), new V3(s * 0.14, -0.03, 0.17), new V3(s * 0.17, 0.02, 0.1), new V3(s * 0.21, 0.06, 0.09)]);
      Hd.push(taperTube(wc, (u) => lerp(0.007, 0.0015, u), 14, 5));
      // mane spikes + teeth
      for (let k = 0; k < 4; k++) Hd.push(P(new THREE.ConeGeometry(0.022, 0.12 - k * 0.012, 5), [s * (0.06 - k * 0.004), 0.03 - k * 0.03, -0.07], [-1.75 + k * 0.12, 0, s * -0.45 - k * s * 0.12], [1, 1, 0.4]));
      for (let k = 0; k < 3; k++) Hd.push(cone(0.006, 0.022, [s * 0.03, -0.035, 0.09 + k * 0.03], [Math.PI, 0, 0], 4));
    }
    for (let k = 0; k < 3; k++) Hd.push(P(new THREE.ConeGeometry(0.018, 0.09, 4), [0, 0.065 - k * 0.006, -0.03 - k * 0.04], [-1.0, 0, 0], [0.4, 1, 1]));
    const f = curve.getTangentAt(1); f.x = 0; f.y = 0.22; f.z = 1; f.normalize();
    const hu = up0.clone().addScaledVector(f, -f.y).normalize(), hr = new V3().crossVectors(hu, f).normalize();
    const hs = 1.75, hm = new THREE.Matrix4().makeBasis(hr.clone().multiplyScalar(hs), hu.clone().multiplyScalar(hs), f.clone().multiplyScalar(hs));
    const hp = curve.getPointAt(1).addScaledVector(f, 0.05);
    hm.setPosition(hp);
    const headG = merge(Hd); headG.applyMatrix4(hm); G.push(headG);
    const eyeG = merge(Ey); eyeG.applyMatrix4(hm);
    group.add(mesh(merge(G), mat.gold));
    group.add(mesh(merge(J), mat.jade));
    const em = mat.redLacquer.clone(); em.emissive = new THREE.Color(0xff2a10); em.emissiveIntensity = 1.6;
    group.add(mesh(eyeG, em));
    // pearl held in the jaws
    const pm = mat.jade.clone(); pm.emissive = new THREE.Color(0x35ff9a); pm.emissiveIntensity = 1.4; pm.roughness = 0.12;
    const pearl = mesh(new THREE.SphereGeometry(0.052, 20, 14), pm);
    pearl.position.copy(new V3(0, -0.035, 0.135).applyMatrix4(hm));
    group.add(pearl);
    group.userData.pearl = pearl;
    return group;
  }

  /* ---------- jade seal ---------- */
  function jadeSeal() {
    const group = new THREE.Group(), J = [], G = [], R = [];
    J.push(box(0.2, 0.17, 0.2, [0, -0.075, 0]), box(0.215, 0.025, 0.215, [0, -0.15, 0]), box(0.17, 0.02, 0.17, [0, 0.02, 0]));
    G.push(box(0.212, 0.03, 0.212, [0, -0.045, 0]));
    for (const s of [-1, 1]) for (const t of [-1, 1]) G.push(sph(0.012, [s * 0.1, 0.012, t * 0.1], 1, null, 6, 5));
    R.push(box(0.18, 0.008, 0.18, [0, -0.165, 0]));
    // turtle knob
    J.push(sph(0.075, [0, 0.055, -0.005], [1, 0.62, 1.2], null, 12, 8));
    J.push(sph(0.03, [0, 0.07, 0.105], [1, 0.85, 1.2], null, 8, 6), limb(new V3(0, 0.05, 0.06), new V3(0, 0.068, 0.1), 0.022, 0.02, 6));
    for (const s of [-1, 1]) for (const t of [-1, 1]) J.push(sph(0.024, [s * 0.07, 0.035, t * 0.06], [1, 0.6, 1.2], null, 6, 5));
    J.push(cone(0.012, 0.04, [0, 0.04, -0.1], [-1.9, 0, 0], 5));
    for (let i = 0; i < 6; i++) { const a = i * 1.047; G.push(sph(0.011, [Math.cos(a) * 0.04, 0.097 - 0.006, Math.sin(a) * 0.05 - 0.005], [1, 0.4, 1], null, 5, 4)); }
    G.push(sph(0.014, [0, 0.101, -0.005], [1, 0.5, 1], null, 6, 4));
    const g1 = merge(J), g2 = merge(G), g3 = merge(R);
    [g1, g2, g3].forEach((g) => g.translate(0, 0.03, 0));
    const jm = mat.jade.clone(); jm.emissive = new THREE.Color(0x0c5a34); jm.emissiveIntensity = 0.55;
    group.add(mesh(g1, jm), mesh(g2, mat.gold), mesh(g3, mat.redLacquer));
    return group;
  }

  /* ---------- lever ---------- */
  function lever() {
    const group = new THREE.Group();
    group.add(mesh(merge([box(0.56, 0.1, 0.56, [0, 0.05, 0]), box(0.46, 0.08, 0.46, [0, 0.14, 0])]), mat.darkStone));
    const B = [box(0.16, 0.025, 0.38, [0, 0.19, 0])];
    for (const s of [-1, 1]) {
      B.push(box(0.03, 0.14, 0.1, [s * 0.08, 0.25, 0]), cyl(0.05, 0.05, 0.03, [s * 0.08, 0.3, 0], [0, 0, Math.PI / 2], 12));
      for (const t of [-1, 1]) B.push(sph(0.014, [s * 0.05, 0.205, t * 0.15], 1, null, 6, 4));
    }
    group.add(mesh(merge(B), mat.bronze));
    const handle = new THREE.Group();
    handle.position.set(0, 0.3, 0);
    handle.add(mesh(merge([cyl(0.022, 0.03, 0.62, [0, 0.31, 0], null, 10), cyl(0.03, 0.03, 0.2, [0, 0, 0], [0, 0, Math.PI / 2], 10),
      cyl(0.036, 0.036, 0.03, [0, 0.12, 0], null, 10), cyl(0.034, 0.034, 0.03, [0, 0.54, 0], null, 10)]), mat.bronze));
    handle.add(mesh(P(new THREE.SphereGeometry(0.065, 14, 10), [0, 0.66, 0]), mat.gold));
    handle.rotation.x = -0.6;
    group.add(handle);
    group.userData.handle = handle;
    return group;
  }

  /* ---------- pendulum blade ---------- */
  function blade(length) {
    length = length || 3.2;
    const group = new THREE.Group();
    const R = Math.min(1.0, length * 0.3), cy = -length + R, a0 = 0.38;
    const sh = new THREE.Shape();
    const lx = Math.cos(Math.PI + a0) * R, ly = cy + Math.sin(Math.PI + a0) * R;
    sh.moveTo(lx, ly);
    sh.absarc(0, cy, R, Math.PI + a0, Math.PI * 2 - a0, false);
    sh.quadraticCurveTo(R * 0.3, cy - R * 0.62, R * 0.12, cy - R * 0.4);
    sh.lineTo(-R * 0.12, cy - R * 0.4);
    sh.quadraticCurveTo(-R * 0.3, cy - R * 0.62, lx, ly);
    const bg = new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.022, bevelSize: 0.05, bevelOffset: -0.05, bevelSegments: 2, curveSegments: 28 });
    bg.translate(0, 0, -0.006);
    group.add(mesh(bg, mat.steel));
    const top = cy - R * 0.42;
    group.add(mesh(cyl(0.035, 0.035, -top, [0, top / 2, 0], null, 10), mat.wood));
    const B = [cyl(0.09, 0.09, 0.22, [0, 0, 0], [Math.PI / 2, 0, 0], 14), cyl(0.05, 0.05, 0.3, [0, 0, 0], [Math.PI / 2, 0, 0], 10),
      box(R * 0.32, 0.16, 0.1, [0, top - 0.02, 0]), cyl(0.05, 0.05, 0.08, [0, top + 0.14, 0], null, 10), cyl(0.05, 0.05, 0.08, [0, -0.2, 0], null, 10)];
    for (const s of [-1, 1]) B.push(sph(0.022, [s * R * 0.1, top - 0.02, 0.055], 1, null, 6, 4), sph(0.022, [s * R * 0.1, top - 0.02, -0.055], 1, null, 6, 4));
    group.add(mesh(merge(B), mat.bronze));
    return group;
  }

  /* ---------- floor spikes ---------- */
  function spikes(w, d) {
    w = w || 2; d = d || 2;
    const group = new THREE.Group(), S = [];
    const nx = Math.max(2, Math.round(w / 0.34)), nz = Math.max(2, Math.round(d / 0.34));
    const rnd = RNG(91);
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const x = ((i + 0.5) / nx - 0.5) * w, z = ((j + 0.5) / nz - 0.5) * d, h = 0.82 + rnd() * 0.14;
      S.push(cone(0.055, h, [x, h / 2, z], [0, rnd() * 3, 0], 6), cyl(0.07, 0.075, 0.05, [x, 0.025, z], null, 6));
    }
    group.add(mesh(merge(S), mat.steel));
    group.add(mesh(box(w, 0.05, d, [0, -0.025, 0]), mat.darkStone));
    return group;
  }

  /* ---------- pedestal ---------- */
  function pedestal() {
    const group = new THREE.Group(), S = [], G = [];
    S.push(box(0.9, 0.12, 0.9, [0, 0.06, 0]), box(0.78, 0.06, 0.78, [0, 0.15, 0]), box(0.62, 0.56, 0.62, [0, 0.46, 0]),
      box(0.74, 0.06, 0.74, [0, 0.77, 0]), box(0.84, 0.05, 0.84, [0, 0.825, 0]), box(0.9, 0.15, 0.9, [0, 0.925, 0]));
    for (const s of [-1, 1]) for (const t of [-1, 1]) {
      S.push(cyl(0.055, 0.055, 0.56, [s * 0.31, 0.46, t * 0.31], null, 10));
      G.push(cyl(0.062, 0.062, 0.03, [s * 0.31, 0.21, t * 0.31], null, 10), cyl(0.062, 0.062, 0.03, [s * 0.31, 0.71, t * 0.31], null, 10));
    }
    // gold inlay: band + diamond medallions on each face, fret on top slab
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
      const dia = box(0.16, 0.16, 0.012, [0, 0.46, 0.312], [0, 0, Math.PI / 4]); dia.rotateY(a); G.push(dia);
      const dia2 = box(0.07, 0.07, 0.02, [0, 0.46, 0.312], [0, 0, Math.PI / 4]); dia2.rotateY(a); S.push(dia2);
      const band = box(0.5, 0.018, 0.012, [0, 0.66, 0.312]); band.rotateY(a); G.push(band);
      const band2 = box(0.5, 0.018, 0.012, [0, 0.26, 0.312]); band2.rotateY(a); G.push(band2);
      const fret = box(0.8, 0.03, 0.012, [0, 0.925, 0.452]); fret.rotateY(a); G.push(fret);
      void c; void s;
    }
    G.push(P(new THREE.TorusGeometry(0.2, 0.018, 6, 28), [0, 1.0, 0], [Math.PI / 2, 0, 0]));
    group.add(mesh(merge(S), mat.stone));
    group.add(mesh(merge(G), mat.gold));
    group.add(mesh(cyl(0.19, 0.19, 0.012, [0, 0.998, 0], null, 24), mat.darkStone));
    group.userData.top = 1.0;
    return group;
  }

  return { cherryTree, bambooCluster, pine, rock, lotus, guardianLion, dragonIdol, jadeSeal, lever, blade, spikes, pedestal };
};
