// Procedural East-Asian architecture props (three.js r147 UMD global).
// window.createArchProps(THREE, M) -> { toriiGate, pagoda, pavilionRoof, moonGate,
//   stoneLantern, paperLantern, bell, brazier, incenseBurner }
window.createArchProps = function (THREE, M) {
  M = M || {};
  const V3 = THREE.Vector3, V2 = THREE.Vector2;
  const std = (color, rough, metal, extra) =>
    new THREE.MeshStandardMaterial(Object.assign({ color: color, roughness: rough, metalness: metal || 0 }, extra || {}));

  const mat = {
    stone: M.stone || std(0x8a8880, 0.92),
    darkStone: M.darkStone || std(0x4a4a48, 0.95),
    red: M.redLacquer || std(0xa3201a, 0.45, 0.05),
    gold: M.gold || std(0xd9a441, 0.3, 1.0),
    wood: M.wood || std(0x4a3222, 0.8),
    tile: M.roofTile || std(0x2c3a3c, 0.6, 0.1),
    paper: M.paper || std(0xffe2b0, 0.8, 0, { emissive: 0xffb060, emissiveIntensity: 1.6 }),
    bronze: M.bronze || std(0x6b5a3a, 0.45, 0.85),
    moss: M.moss || std(0x4c6a2e, 1.0)
  };
  // derived (cloned) variants - created once, never mutate caller's materials
  const bronzeDS = mat.bronze.clone(); bronzeDS.side = THREE.DoubleSide;
  const lanternSilk = mat.paper.clone();
  lanternSilk.color = new THREE.Color(0xd8281c);
  lanternSilk.emissive = new THREE.Color(0xff3a12);
  lanternSilk.emissiveIntensity = 2.5;
  const coalMat = mat.paper.clone();
  coalMat.color = new THREE.Color(0x40100a);
  coalMat.emissive = new THREE.Color(0xff5a10);
  coalMat.emissiveIntensity = 3.0;
  coalMat.roughness = 1;
  const darkWood = mat.wood.clone(); darkWood.color = mat.wood.color.clone().multiplyScalar(0.55);

  // ---------- geometry helpers ----------
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
  function T(g, x, y, z, rx, ry, rz, sx, sy, sz) {
    _e.set(rx || 0, ry || 0, rz || 0);
    _q.setFromEuler(_e);
    _m.compose(new V3(x || 0, y || 0, z || 0), _q, new V3(sx === undefined ? 1 : sx, sy === undefined ? 1 : sy, sz === undefined ? 1 : sz));
    g.applyMatrix4(_m);
    return g;
  }
  const box = (w, h, d, x, y, z, rx, ry, rz) => T(new THREE.BoxGeometry(w, h, d), x, y, z, rx, ry, rz);
  const cyl = (rt, rb, h, seg, x, y, z, rx, ry, rz) => T(new THREE.CylinderGeometry(rt, rb, h, seg || 12), x, y, z, rx, ry, rz);
  const lathe = (pts, seg, x, y, z) => T(new THREE.LatheGeometry(pts.map(p => new V2(p[0], p[1])), seg || 16), x, y, z);
  // box beam between two points
  function beam(p1, p2, w, h) {
    const d = new V3().subVectors(p2, p1), len = d.length();
    const g = new THREE.BoxGeometry(w, h, len);
    _q.setFromUnitVectors(new V3(0, 0, 1), d.normalize());
    _m.compose(new V3().addVectors(p1, p2).multiplyScalar(0.5), _q, new V3(1, 1, 1));
    g.applyMatrix4(_m);
    return g;
  }
  // robust merge (own implementation; no dependency on BufferGeometryUtils)
  function merge(list) {
    const gs = [];
    let n = 0;
    list.forEach(g => {
      if (!g) return;
      const ng = g.index ? g.toNonIndexed() : g;
      if (!ng.attributes.normal) ng.computeVertexNormals();
      gs.push(ng); n += ng.attributes.position.count;
    });
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let o = 0;
    gs.forEach(g => {
      const c = g.attributes.position.count;
      pos.set(g.attributes.position.array.subarray(0, c * 3), o * 3);
      nor.set(g.attributes.normal.array.subarray(0, c * 3), o * 3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array.subarray(0, c * 2), o * 2);
      o += c;
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    out.computeBoundingSphere(); out.computeBoundingBox();
    return out;
  }
  function add(group, geoms, material, noShadow) {
    geoms = geoms.filter(Boolean);
    if (!geoms.length) return null;
    const m = new THREE.Mesh(merge(geoms), material);
    m.castShadow = !noShadow; m.receiveShadow = true;
    group.add(m);
    return m;
  }
  function move(list, x, y, z) { list.forEach(g => g && g.translate(x, y, z)); return list; }

  // parametric grid surface; fn(u in [-1,1], v in [0,1], i, j) -> V3 ; uvFn optional
  function gridGeo(US, VS, fn, wantUp, uvFn) {
    const pos = [], uvs = [], idx = [];
    for (let j = 0; j <= VS; j++) for (let i = 0; i <= US; i++) {
      const u = -1 + 2 * i / US, v = j / VS, p = fn(u, v, i, j);
      pos.push(p.x, p.y, p.z);
      const t = uvFn ? uvFn(u, v, p) : [u, v];
      uvs.push(t[0], t[1]);
    }
    for (let j = 0; j < VS; j++) for (let i = 0; i < US; i++) {
      const a = j * (US + 1) + i, b = a + 1, c = a + US + 1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    if (wantUp !== undefined) {
      const mid = Math.floor(VS / 2) * (US + 1) + Math.floor(US / 2);
      const ny = g.attributes.normal.getY(mid);
      if ((ny < 0) === !!wantUp) {
        for (let k = 0; k < idx.length; k += 3) { const t = idx[k]; idx[k] = idx[k + 1]; idx[k + 1] = t; }
        g.setIndex(idx); g.computeVertexNormals();
      }
    }
    return g;
  }

  // ---------- curved hip roof ----------
  // eave rectangle w x d at y=0 (mid-eave top surface), rising h. Returns {tile:[], under:[], gold:[]} geometry lists.
  function roofGeo(w, d, h, o) {
    o = o || {};
    const a = w / 2, b = d / 2;
    const ra = (o.ridgeW || 0) / 2, rb = (o.ridgeD || 0) / 2;
    const lift = o.lift !== undefined ? o.lift : Math.min(w, d) * 0.085;
    const ext = o.ext !== undefined ? o.ext : 0.07;
    const t = o.thick || 0.13;
    const amp = o.rib !== undefined ? o.rib : 0.075;
    const VS = o.vSeg || 8;
    const hipR = o.hipR || 0.085;
    function pt(face, u, v, dy) {
      const zf = face < 2, A = zf ? a : b, B = zf ? b : a, RA = zf ? ra : rb, RB = zf ? rb : ra;
      const k = 1 - v, f = Math.pow(Math.abs(u), 3) * k * k, e = 1 + ext * f;
      const s = u * (A + (RA - A) * v) * e, oo = (B + (RB - B) * v) * e;
      const y = h * (0.3 * v + 0.7 * Math.pow(v, 2.3)) + lift * f + (dy || 0);
      const sg = (face % 2 === 0) ? 1 : -1;
      return zf ? new V3(s, y, sg * oo) : new V3(sg * oo, y, s);
    }
    const tile = [], under = [], gold = [];
    const slope = Math.sqrt(h * h + Math.pow(Math.min(a - ra, b - rb), 2));
    for (let face = 0; face < 4; face++) {
      const A = face < 2 ? a : b;
      const tiles = Math.max(4, Math.round(2 * A / 0.38));
      const US = tiles * 3;
      const sfn = (u, v, p) => [face < 2 ? p.x : p.z, v * slope];
      // top (ribbed) surface
      tile.push(gridGeo(US, VS, (u, v, i) => {
        const r = (i % 3 === 2) ? amp * (0.3 + 0.7 * (1 - v)) : 0;
        return pt(face, u, v, r);
      }, true, sfn));
      // underside
      under.push(gridGeo(Math.max(8, tiles), 4, (u, v) => pt(face, u, v, -t), false, sfn));
      // eave fascia
      const fas = gridGeo(US, 1, (u, v, i) => pt(face, u, 0, v === 0 ? -t - 0.01 : ((i % 3 === 2) ? amp : 0)), undefined,
        (u, v) => [u * A, v * 0.2]);
      // orient fascia outward: test normal against outward dir
      const mid = Math.floor(US / 2), n = fas.attributes.normal;
      const outv = pt(face, 0, 0, 0); outv.y = 0;
      if (n.getX(mid) * outv.x + n.getZ(mid) * outv.z < 0) {
        const ix = Array.from(fas.index.array);
        for (let k = 0; k < ix.length; k += 3) { const tt = ix[k]; ix[k] = ix[k + 1]; ix[k + 1] = tt; }
        fas.setIndex(ix); fas.computeVertexNormals();
      }
      tile.push(fas);
      // rafters
      const nr = Math.max(3, Math.round(tiles / 2));
      for (let r = 0; r <= nr; r++) {
        const u = -0.94 + 1.88 * r / nr;
        under.push(beam(pt(face, u, 0.5, -t - 0.05), pt(face, u, 0.02, -t - 0.045), 0.07, 0.09));
      }
    }
    // hip ridges (tile material) + gold tips
    [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(c => {
      const face = c[1] > 0 ? 0 : 1, pts = [];
      for (let j = 0; j <= 8; j++) { const p = pt(face, c[0], j / 8, 0.035); pts.push(p); }
      const tip = pts[0].clone(), dir = pts[0].clone().sub(pts[1]).normalize();
      pts.unshift(tip.clone().addScaledVector(dir, 0.12).add(new V3(0, 0.04, 0)));
      tile.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, hipR, 5, false));
      const orn = new THREE.ConeGeometry(hipR * 1.3, hipR * 5, 6);
      _q.setFromUnitVectors(new V3(0, 1, 0), dir.clone().add(new V3(0, 0.9, 0)).normalize());
      _m.compose(pts[0].clone().add(new V3(0, hipR * 1.6, 0)), _q, new V3(1, 1, 1));
      orn.applyMatrix4(_m);
      gold.push(orn);
    });
    // top ridge
    const truncated = ra > 0 && rb > 0;
    if (!truncated) {
      if (ra > 0) {
        tile.push(box(2 * ra + 0.3, 0.26, 0.2, 0, h + 0.08, 0));
        [-1, 1].forEach(s => {
          gold.push(T(new THREE.ConeGeometry(0.11, 0.55, 6), s * (ra + 0.16), h + 0.38, 0, 0, 0, -s * 0.45));
          gold.push(T(new THREE.SphereGeometry(0.13, 8, 6), s * (ra + 0.1), h + 0.14, 0));
        });
        gold.push(T(new THREE.SphereGeometry(0.16, 10, 8), 0, h + 0.3, 0));
      } else if (rb > 0) {
        tile.push(box(0.2, 0.26, 2 * rb + 0.3, 0, h + 0.08, 0));
        [-1, 1].forEach(s => gold.push(T(new THREE.ConeGeometry(0.11, 0.55, 6), 0, h + 0.38, s * (rb + 0.16), s * 0.45, 0, 0)));
      }
    }
    return { tile: tile, under: under, gold: gold, t: t, pt: pt };
  }
  function moveRoof(r, x, y, z) { move(r.tile, x, y, z); move(r.under, x, y, z); move(r.gold, x, y, z); return r; }

  // ================= TORII GATE =================
  function toriiGate(width, height) {
    width = width || 4.5; height = height || 5.5;
    const g = new THREE.Group();
    const hw = width / 2, lean = 0.045;
    const red = [], stone = [], dark = [], gold = [];
    const colH = height - 0.55, r0 = width * 0.052, r1 = r0 * 0.8;
    [-1, 1].forEach(s => {
      const topX = s * (hw - lean * colH);
      red.push(cyl(r1, r0, colH, 14, (s * hw + topX) / 2, colH / 2, 0, 0, 0, s * lean));
      stone.push(cyl(r0 * 1.7, r0 * 2.0, 0.28, 12, s * hw, 0.14, 0));
      stone.push(cyl(r0 * 1.35, r0 * 1.55, 0.22, 12, s * hw, 0.39, 0));
      dark.push(cyl(r0 * 1.08, r0 * 1.12, 0.5, 14, s * hw * 0.997, 0.72, 0, 0, 0, s * lean));
    });
    // curved lintels
    const curveBox = (len, h, d, y, liftAmt, flare) => {
      const b = new THREE.BoxGeometry(len, h, d, 20, 1, 1), p = b.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), k = Math.abs(x) / (len / 2), k2 = k * k;
        p.setY(i, p.getY(i) * (1 + flare * k2) + liftAmt * k2 * k);
      }
      b.computeVertexNormals();
      return T(b, 0, y, 0);
    };
    const topY = height;
    red.push(curveBox(width * 1.32, 0.3, 0.42, topY - 0.42, 0.38, 0.15));     // shimaki
    red.push(curveBox(width * 1.4, 0.2, 0.52, topY - 0.17, 0.42, 0.2));       // kasagi
    dark.push(curveBox(width * 1.45, 0.1, 0.66, topY - 0.02, 0.45, 0.3));     // dark cap
    // nuki tie beam
    const nukiY = topY - 1.35;
    red.push(box(width * 1.16, 0.3, 0.26, 0, nukiY, 0));
    [-1, 1].forEach(s => {
      const x = s * (hw - lean * nukiY);
      dark.push(box(0.1, 0.36, 0.34, x + s * r0 * 1.1, nukiY, 0));
      dark.push(box(0.1, 0.36, 0.34, x - s * r0 * 1.1, nukiY, 0));
    });
    // plaque (gakuzuka)
    const pH = (topY - 0.57) - (nukiY + 0.15), pY = nukiY + 0.15 + pH / 2;
    red.push(box(0.2, pH, 0.2, 0, pY, 0));
    gold.push(box(0.62, pH * 0.86, 0.3, 0, pY, 0));
    dark.push(box(0.5, pH * 0.72, 0.34, 0, pY, 0));
    [-0.12, 0.08].forEach((dy, i) => { gold.push(box(0.22, 0.05, 0.36, 0, pY + dy * pH * 1.6, 0)); gold.push(box(0.05, pH * 0.3, 0.36, (i ? 0.08 : -0.06), pY, 0)); });
    add(g, red, mat.red); add(g, stone, mat.stone); add(g, dark, darkWood); add(g, gold, mat.gold);
    g.userData.columns = [new V3(-hw, 0, 0), new V3(hw, 0, 0)];
    g.userData.columnRadius = r0 * 2;
    return g;
  }

  // ================= PAVILION ROOF =================
  function pavilionRoof(w, d, h) {
    w = w || 8; d = d || 8; h = h || 2.6;
    const g = new THREE.Group();
    const over = 1.0, W = w + 2 * over, D = d + 2 * over;
    const o = { thick: 0.14 };
    if (w >= d) o.ridgeW = (w - d) + Math.min(w, d) * 0.28; else o.ridgeD = (d - w) + Math.min(w, d) * 0.28;
    const r = moveRoof(roofGeo(W, D, h, o), 0, 0.14 + 0.5, 0);
    // architrave frame + brackets sitting on pillar tops (pillars expected at +-w/2, +-d/2)
    const red = [], gold = [];
    [-1, 1].forEach(s => {
      red.push(box(w + 0.5, 0.36, 0.3, 0, 0.18, s * d / 2));
      red.push(box(0.3, 0.36, d + 0.5, s * w / 2, 0.18, 0));
      red.push(box(w + 1.1, 0.16, 0.22, 0, 0.44, s * (d / 2 + 0.3)));
      red.push(box(0.22, 0.16, d + 1.1, s * (w / 2 + 0.3), 0.44, 0));
      gold.push(box(w + 0.52, 0.06, 0.32, 0, 0.05, s * d / 2));
      gold.push(box(0.32, 0.06, d + 0.52, s * w / 2, 0.05, 0));
    });
    // bracket blocks (dougong hint)
    const nb = Math.max(2, Math.round(w / 1.3)), nd = Math.max(2, Math.round(d / 1.3));
    for (let i = 0; i <= nb; i++) [-1, 1].forEach(s => red.push(box(0.26, 0.2, 0.7, -w / 2 + w * i / nb, 0.44, s * (d / 2 + 0.22))));
    for (let i = 0; i <= nd; i++) [-1, 1].forEach(s => red.push(box(0.7, 0.2, 0.26, s * (w / 2 + 0.22), 0.44, -d / 2 + d * i / nd)));
    // flat coffer ceiling
    r.under.push(box(w + 0.3, 0.06, d + 0.3, 0, 0.5, 0));
    add(g, r.tile, mat.tile); add(g, r.under, darkWood); add(g, r.gold.concat(gold), mat.gold); add(g, red, mat.red);
    g.userData.height = h + 1.0;
    return g;
  }

  // ================= PAGODA =================
  function pagoda(tiers, base) {
    tiers = tiers || 3; base = base || 6;
    const g = new THREE.Group();
    const stone = [], red = [], wood = [], tile = [], under = [], gold = [], paper = [];
    const pw = base + 2.2, ph = 0.7;
    stone.push(box(pw, ph, pw, 0, ph / 2, 0));
    stone.push(box(pw + 0.3, 0.14, pw + 0.3, 0, ph - 0.07, 0));
    for (let s = 0; s < 3; s++) stone.push(box(2.6, ph * (3 - s) / 4, 0.4, 0, ph * (3 - s) / 8, pw / 2 + 0.2 + s * 0.4));
    let y = ph, wi = base;
    for (let i = 0; i < tiers; i++) {
      const hb = 2.7 * (1 - 0.1 * i), last = i === tiers - 1;
      const next = wi * 0.76;
      wood.push(box(wi * 0.9, hb, wi * 0.9, 0, y + hb / 2, 0));
      const pr = 0.15 * (1 - 0.08 * i), half = wi / 2 - pr;
      [-1, 0, 1].forEach(ax => [-1, 0, 1].forEach(az => {
        if (ax === 0 && az === 0) return;
        red.push(cyl(pr, pr * 1.08, hb, 10, ax * half, y + hb / 2, az * half));
      }));
      [-1, 1].forEach(s => {
        red.push(box(wi + 0.2, 0.28, 0.26, 0, y + hb - 0.14, s * half));
        red.push(box(0.26, 0.28, wi + 0.2, s * half, y + hb - 0.14, 0));
        red.push(box(wi, 0.12, 0.2, 0, y + hb * 0.38, s * half));
        red.push(box(0.2, 0.12, wi, s * half, y + hb * 0.38, 0));
        gold.push(box(wi + 0.22, 0.05, 0.28, 0, y + hb - 0.3, s * half));
        gold.push(box(0.28, 0.05, wi + 0.22, s * half, y + hb - 0.3, 0));
        // glowing lattice windows
        [-0.5, 0.5].forEach(k => {
          const cx = k * half, wy = y + hb * 0.38 + (hb * 0.62 - 0.4) / 2 + 0.06, ww = half - 0.45, wh = hb * 0.62 - 0.6;
          paper.push(box(ww, wh, 0.05, cx, wy, s * (wi * 0.45 + 0.02)));
          paper.push(box(0.05, wh, ww, s * (wi * 0.45 + 0.02), wy, cx));
          for (let m = -1; m <= 1; m++) {
            wood.push(box(0.04, wh, 0.08, cx + m * ww / 4, wy, s * (wi * 0.45 + 0.03)));
            wood.push(box(0.08, wh, 0.04, s * (wi * 0.45 + 0.03), wy, cx + m * ww / 4));
          }
          wood.push(box(ww, 0.04, 0.08, cx, wy, s * (wi * 0.45 + 0.03)));
          wood.push(box(0.08, 0.04, ww, s * (wi * 0.45 + 0.03), wy, cx));
        });
      });
      // door on front of ground floor
      if (i === 0) { red.push(box(1.5, hb * 0.8, 0.12, 0, y + hb * 0.4, wi * 0.45 + 0.05)); gold.push(box(0.08, 0.3, 0.16, -0.2, y + hb * 0.4, wi * 0.45 + 0.06)); gold.push(box(0.08, 0.3, 0.16, 0.2, y + hb * 0.4, wi * 0.45 + 0.06)); }
      const rw = wi + 2.6 * (1 - 0.08 * i);
      const rh = last ? 2.0 : 1.0;
      const r = roofGeo(rw, rw, rh, last ? { ridgeW: 0.01, ridgeD: 0.01, lift: rw * 0.1 } : { ridgeW: next * 0.95, ridgeD: next * 0.95, lift: rw * 0.1 });
      moveRoof(r, 0, y + hb + 0.13, 0);
      Array.prototype.push.apply(tile, r.tile); Array.prototype.push.apply(under, r.under); Array.prototype.push.apply(gold, r.gold);
      y += hb + (last ? rh + 0.1 : 0.62);
      wi = next;
    }
    // finial spire
    gold.push(lathe([[0, 0], [0.34, 0], [0.4, 0.12], [0.3, 0.3], [0.12, 0.42], [0.09, 0.6], [0.09, 1.9], [0.14, 2.0], [0.1, 2.15], [0.0, 2.5]], 12, 0, y - 0.05, 0));
    for (let k = 0; k < 5; k++) gold.push(T(new THREE.TorusGeometry(0.26 - k * 0.035, 0.035, 6, 14), 0, y + 0.7 + k * 0.25, 0, Math.PI / 2));
    add(g, stone, mat.stone); add(g, red, mat.red); add(g, wood, darkWood); add(g, tile, mat.tile);
    add(g, under, mat.wood); add(g, gold, mat.gold); add(g, paper, mat.paper, true);
    g.userData.height = y + 2.4;
    g.userData.footprint = pw;
    return g;
  }

  // ================= MOON GATE =================
  function moonGate(wallW, wallH, thick, holeR) {
    wallW = wallW || 8; wallH = wallH || 6; thick = thick || 1; holeR = holeR || 2.1;
    const g = new THREE.Group();
    const cy = holeR + 0.15, hw = wallW / 2;
    const sh = new THREE.Shape();
    sh.moveTo(-hw, 0); sh.lineTo(hw, 0); sh.lineTo(hw, wallH); sh.lineTo(-hw, wallH); sh.lineTo(-hw, 0);
    const hole = new THREE.Path(); hole.absarc(0, cy, holeR, 0, Math.PI * 2, true); sh.holes.push(hole);
    const wall = new THREE.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: false, curveSegments: 40 });
    wall.translate(0, 0, -thick / 2);
    const stone = [wall];
    // plinth course
    [-1, 1].forEach(s => {
      const x0 = Math.sqrt(Math.max(0, holeR * holeR - Math.pow(cy - 0.5, 2))) + 0.35;
      const len = hw - x0;
      if (len > 0.1) stone.push(box(len, 0.5, thick + 0.16, s * (x0 + len / 2), 0.25, 0));
    });
    // ring trim
    const ringShape = (ro, ri) => { const r = new THREE.Shape(); r.absarc(0, cy, ro, 0, Math.PI * 2, false); const h = new THREE.Path(); h.absarc(0, cy, ri, 0, Math.PI * 2, true); r.holes.push(h); return r; };
    const ring = new THREE.ExtrudeGeometry(ringShape(holeR + 0.3, holeR - 0.03), { depth: thick + 0.14, bevelEnabled: false, curveSegments: 40 });
    ring.translate(0, 0, -(thick + 0.14) / 2);
    const gold = [];
    [-1, 1].forEach(s => {
      gold.push(T(new THREE.TorusGeometry(holeR + 0.3, 0.035, 6, 48), 0, cy, s * (thick / 2 + 0.07)));
      gold.push(T(new THREE.TorusGeometry(holeR + 0.0, 0.03, 6, 48), 0, cy, s * (thick / 2 + 0.07)));
      // gold studs
      for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; if (cy + Math.sin(a) * (holeR + 0.15) < 0.1) continue; gold.push(T(new THREE.SphereGeometry(0.05, 6, 5), Math.cos(a) * (holeR + 0.15), cy + Math.sin(a) * (holeR + 0.15), s * (thick / 2 + 0.07))); }
    });
    // coping roof
    const r = moveRoof(roofGeo(wallW + 0.5, thick + 1.1, 0.55, { ridgeW: wallW + 0.1, lift: 0.12, ext: 0.03, thick: 0.1, vSeg: 4 }), 0, wallH + 0.1, 0);
    stone.push(box(wallW + 0.1, 0.12, thick + 0.3, 0, wallH + 0.02, 0));
    add(g, stone, mat.stone); add(g, [ring], mat.red); add(g, gold, mat.gold);
    add(g, r.tile, mat.tile); add(g, r.under.concat(), darkWood);
    g.userData.holeCenter = new V3(0, cy, 0); g.userData.holeR = holeR;
    g.userData.wall = { w: wallW, h: wallH, thick: thick };
    return g;
  }

  // ================= STONE LANTERN =================
  function stoneLantern() {
    const g = new THREE.Group();
    const s = [], moss = [];
    s.push(lathe([[0, 0], [0.46, 0], [0.46, 0.1], [0.36, 0.2], [0.24, 0.24], [0.17, 0.3], [0, 0.3]], 6));
    s.push(cyl(0.12, 0.15, 0.72, 10, 0, 0.64, 0));
    s.push(T(new THREE.TorusGeometry(0.14, 0.03, 5, 10), 0, 0.64, 0, Math.PI / 2));
    s.push(lathe([[0, 0.98], [0.14, 0.98], [0.3, 1.06], [0.38, 1.1], [0.38, 1.16], [0, 1.16]], 6));
    // light box (hibukuro): 6 posts + rings
    const by = 1.16, bh = 0.36, br = 0.25;
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * Math.PI * 2 + Math.PI / 6;
      s.push(box(0.07, bh, 0.07, Math.cos(a) * br, by + bh / 2, Math.sin(a) * br, 0, -a, 0));
      // lattice bars on alternate sides
      if (k % 2 === 0) {
        const a2 = a + Math.PI / 6 + Math.PI / 6;
        const mx = Math.cos(a + Math.PI / 6) * br * 0.87, mz = Math.sin(a + Math.PI / 6) * br * 0.87;
        s.push(box(0.03, bh, 0.03, mx, by + bh / 2, mz));
        s.push(box(0.24, 0.03, 0.03, mx, by + bh / 2, mz, 0, -(a + Math.PI / 6) + Math.PI / 2, 0));
      }
    }
    s.push(cyl(br + 0.05, br + 0.05, 0.05, 6, 0, by + 0.025, 0));
    s.push(cyl(br + 0.05, br + 0.05, 0.05, 6, 0, by + bh - 0.025, 0));
    // cap (kasa): concave with upturned rim
    const cyy = by + bh;
    s.push(lathe([[0, cyy], [0.5, cyy + 0.02], [0.6, cyy + 0.1], [0.56, cyy + 0.12], [0.36, cyy + 0.14], [0.2, cyy + 0.24], [0.1, cyy + 0.36], [0, cyy + 0.37]], 6));
    s.push(lathe([[0, cyy + 0.34], [0.09, cyy + 0.36], [0.14, cyy + 0.44], [0.11, cyy + 0.52], [0.03, cyy + 0.62], [0, cyy + 0.64]], 10));
    const glow = cyl(0.19, 0.19, bh - 0.08, 6, 0, by + bh / 2, 0);
    moss.push(T(new THREE.SphereGeometry(0.2, 8, 5), 0.2, cyy + 0.15, 0.12, 0, 0, 0, 1, 0.22, 1));
    moss.push(T(new THREE.SphereGeometry(0.16, 8, 5), -0.25, 0.14, 0.2, 0, 0, 0, 1, 0.3, 1));
    moss.push(T(new THREE.SphereGeometry(0.12, 8, 5), 0.1, 0.24, -0.26, 0, 0, 0, 1, 0.3, 1));
    add(g, s, mat.stone); add(g, [glow], mat.paper, true); add(g, moss, mat.moss, true);
    g.userData.lightPos = new V3(0, by + bh / 2, 0);
    g.userData.radius = 0.46;
    return g;
  }

  // ================= PAPER LANTERN (hanging) =================
  function paperLantern() {
    const g = new THREE.Group();
    const gold = [], dark = [], red = [];
    dark.push(cyl(0.008, 0.008, 0.14, 5, 0, -0.07, 0));
    gold.push(cyl(0.09, 0.11, 0.05, 14, 0, -0.165, 0));
    gold.push(cyl(0.04, 0.09, 0.03, 10, 0, -0.13, 0));
    const cy = -0.45, R = 0.24, sy = 1.12;
    const body = T(new THREE.SphereGeometry(R, 20, 14), 0, cy, 0, 0, 0, 0, 1, sy, 1);
    // vertical ribs
    for (let k = 0; k < 8; k++) gold.push(T(new THREE.TorusGeometry(R + 0.003, 0.006, 4, 20), 0, cy, 0, 0, k / 8 * Math.PI, 0, 1, sy, 1));
    gold.push(cyl(0.11, 0.09, 0.05, 14, 0, cy - R * sy + 0.005, 0));
    // tassel
    red.push(cyl(0.012, 0.012, 0.1, 5, 0, cy - R * sy - 0.07, 0));
    gold.push(T(new THREE.SphereGeometry(0.03, 8, 6), 0, cy - R * sy - 0.13, 0));
    red.push(cyl(0.028, 0.045, 0.3, 8, 0, cy - R * sy - 0.3, 0));
    const b = add(g, [body], lanternSilk, true);
    add(g, gold, mat.gold, true); add(g, dark, darkWood, true); add(g, red, mat.red, true);
    b.castShadow = false;
    g.userData.lightPos = new V3(0, cy, 0);
    g.userData.length = -(cy - R * sy - 0.45);
    return g;
  }

  // ================= TEMPLE BELL =================
  function bell() {
    const g = new THREE.Group();
    const stone = [], red = [], bronze = [], wood = [], gold = [];
    stone.push(box(3.0, 0.22, 3.0, 0, 0.11, 0));
    stone.push(box(2.6, 0.12, 2.6, 0, 0.28, 0));
    const ph = 2.3, px = 0.95, y0 = 0.34;
    [-1, 1].forEach(sx => [-1, 1].forEach(sz => {
      red.push(beam(new V3(sx * (px + 0.1), y0, sz * (px + 0.1)), new V3(sx * (px - 0.06), y0 + ph, sz * (px - 0.06)), 0.2, 0.2));
      stone.push(box(0.36, 0.14, 0.36, sx * (px + 0.1), y0 + 0.07, sz * (px + 0.1)));
    }));
    [-1, 1].forEach(s => {
      red.push(box(2.5, 0.2, 0.18, 0, y0 + ph - 0.1, s * (px - 0.06)));
      red.push(box(0.18, 0.2, 2.5, s * (px - 0.06), y0 + ph - 0.1, 0));
      red.push(box(2.15, 0.12, 0.12, 0, y0 + 0.5, s * (px + 0.07)));
    });
    red.push(box(3.3, 0.24, 0.24, 0, y0 + ph - 0.12, 0)); // bell beam along X
    gold.push(box(0.06, 0.26, 0.26, -1.65, y0 + ph - 0.12, 0)); gold.push(box(0.06, 0.26, 0.26, 1.65, y0 + ph - 0.12, 0));
    // bell
    const bt = y0 + ph - 0.42, bh = 1.27, by = bt - bh;
    bronze.push(lathe([[0.5, 0], [0.535, 0.03], [0.53, 0.09], [0.49, 0.14], [0.465, 0.35], [0.44, 0.65], [0.42, 0.9], [0.37, 1.07], [0.26, 1.19], [0.1, 1.25], [0, 1.27]], 28, 0, by, 0));
    [0.2, 0.62, 0.98].forEach(h => bronze.push(T(new THREE.TorusGeometry(0.455 - (h - 0.2) * 0.06, 0.018, 5, 28), 0, by + h, 0, Math.PI / 2)));
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; bronze.push(box(0.02, 0.36, 0.02, Math.cos(a) * 0.445, by + 0.4, Math.sin(a) * 0.445, 0, -a, 0)); }
    for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; bronze.push(T(new THREE.SphereGeometry(0.028, 6, 4), Math.cos(a) * 0.435, by + 0.8, Math.sin(a) * 0.435)); }
    bronze.push(T(new THREE.TorusGeometry(0.11, 0.03, 6, 12), 0, bt + 0.08, 0, 0, Math.PI / 2, 0));
    // striker log
    wood.push(cyl(0.085, 0.085, 1.1, 10, 1.15, by + 0.3, 0, 0, 0, Math.PI / 2));
    [0.8, 1.5].forEach(x => wood.push(cyl(0.012, 0.012, y0 + ph - 0.2 - (by + 0.3), 4, x, (y0 + ph - 0.2 + by + 0.3) / 2, 0)));
    // roof
    const r = moveRoof(roofGeo(3.5, 3.5, 0.75, { ridgeW: 0.9, lift: 0.3 }), 0, y0 + ph + 0.13, 0);
    add(g, stone, mat.stone); add(g, red, mat.red); add(g, bronze, bronzeDS); add(g, wood, mat.wood);
    add(g, r.tile, mat.tile); add(g, r.under, darkWood); add(g, r.gold.concat(gold), mat.gold);
    g.userData.bellPos = new V3(0, by + 0.6, 0);
    g.userData.footprint = 3.0;
    return g;
  }

  // ================= BRAZIER =================
  function brazier() {
    const g = new THREE.Group();
    const b = [], coals = [], stone = [];
    stone.push(cyl(0.5, 0.56, 0.1, 8, 0, 0.05, 0));
    for (let k = 0; k < 3; k++) {
      const a = k / 3 * Math.PI * 2 + 0.3, c = Math.cos(a), s = Math.sin(a);
      const pts = [new V3(c * 0.44, 0.1, s * 0.44), new V3(c * 0.38, 0.14, s * 0.38), new V3(c * 0.27, 0.42, s * 0.27), new V3(c * 0.36, 0.68, s * 0.36), new V3(c * 0.4, 0.82, s * 0.4)];
      b.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.035, 6, false));
      b.push(T(new THREE.SphereGeometry(0.06, 8, 6), c * 0.44, 0.13, s * 0.44, 0, 0, 0, 1, 0.6, 1));
    }
    b.push(T(new THREE.TorusGeometry(0.29, 0.02, 5, 20), 0, 0.42, 0, Math.PI / 2));
    b.push(lathe([[0, 0.66], [0.2, 0.68], [0.36, 0.78], [0.45, 0.94], [0.47, 1.04], [0.5, 1.06], [0.5, 1.09], [0.44, 1.09], [0.42, 0.98], [0.3, 0.86], [0, 0.82]], 24));
    [0, Math.PI].forEach(a => b.push(T(new THREE.TorusGeometry(0.09, 0.018, 5, 12), Math.cos(a) * 0.5, 0.96, Math.sin(a) * 0.5, 0, 0, 0)));
    coals.push(cyl(0.41, 0.36, 0.06, 16, 0, 0.99, 0));
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let k = 0; k < 14; k++) {
      const a = rnd() * 6.283, r = Math.sqrt(rnd()) * 0.33;
      coals.push(T(new THREE.IcosahedronGeometry(0.06 + rnd() * 0.05, 0), Math.cos(a) * r, 1.02 + rnd() * 0.04, Math.sin(a) * r, rnd() * 3, rnd() * 3, 0));
    }
    add(g, b, bronzeDS); add(g, coals, coalMat, true); add(g, stone, mat.darkStone);
    g.userData.firePos = new V3(0, 1.08, 0);
    g.userData.radius = 0.55;
    return g;
  }

  // ================= INCENSE BURNER (ding) =================
  function incenseBurner() {
    const g = new THREE.Group();
    const b = [], gold = [], stone = [], ash = [];
    stone.push(box(1.1, 0.14, 1.1, 0, 0.07, 0));
    stone.push(box(0.9, 0.1, 0.9, 0, 0.19, 0));
    const y0 = 0.24;
    for (let k = 0; k < 3; k++) {
      const a = k / 3 * Math.PI * 2 + Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
      const pts = [new V3(c * 0.3, y0, s * 0.3), new V3(c * 0.33, y0 + 0.1, s * 0.33), new V3(c * 0.26, y0 + 0.24, s * 0.26), new V3(c * 0.3, y0 + 0.38, s * 0.3)];
      b.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.05, 6, false));
      b.push(T(new THREE.SphereGeometry(0.075, 8, 6), c * 0.31, y0 + 0.36, s * 0.31));
      b.push(cyl(0.06, 0.075, 0.05, 8, c * 0.3, y0 + 0.025, s * 0.3));
    }
    const by = y0 + 0.28;
    b.push(lathe([[0, by], [0.22, by + 0.02], [0.37, by + 0.12], [0.42, by + 0.26], [0.4, by + 0.36], [0.36, by + 0.4], [0.4, by + 0.43], [0.4, by + 0.46], [0.33, by + 0.46], [0.33, by + 0.4], [0, by + 0.4]], 24));
    gold.push(T(new THREE.TorusGeometry(0.425, 0.014, 5, 28), 0, by + 0.26, 0, Math.PI / 2));
    gold.push(T(new THREE.TorusGeometry(0.4, 0.012, 5, 28), 0, by + 0.445, 0, Math.PI / 2));
    // upright loop handles
    [-1, 1].forEach(s => {
      b.push(box(0.05, 0.22, 0.05, s * 0.38, by + 0.56, -0.08));
      b.push(box(0.05, 0.22, 0.05, s * 0.38, by + 0.56, 0.08));
      b.push(box(0.06, 0.05, 0.24, s * 0.38, by + 0.68, 0));
    });
    // pierced lid dome + knob
    const ly = by + 0.46;
    b.push(lathe([[0.33, ly], [0.3, ly + 0.07], [0.2, ly + 0.14], [0.07, ly + 0.18], [0.05, ly + 0.22]], 20));
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; ash.push(T(new THREE.SphereGeometry(0.028, 6, 4), Math.cos(a) * 0.24, ly + 0.115, Math.sin(a) * 0.24, 0, 0, 0, 1, 0.6, 1)); }
    gold.push(T(new THREE.SphereGeometry(0.06, 10, 8), 0, ly + 0.26, 0));
    gold.push(cyl(0.03, 0.05, 0.05, 8, 0, ly + 0.21, 0));
    add(g, b, bronzeDS); add(g, gold, mat.gold); add(g, stone, mat.stone); add(g, ash, coalMat, true);
    g.userData.smokePos = new V3(0, ly + 0.2, 0);
    g.userData.radius = 0.55;
    return g;
  }

  return {
    toriiGate: toriiGate, pagoda: pagoda, pavilionRoof: pavilionRoof, moonGate: moonGate,
    stoneLantern: stoneLantern, paperLantern: paperLantern, bell: bell, brazier: brazier, incenseBurner: incenseBurner
  };
};
