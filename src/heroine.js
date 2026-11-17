/* Procedural heroine — original character, built from primitives. three.js r147 (global THREE).
   window.createHeroine(THREE) -> { group, update(dt, s), height } ; origin at feet, facing +Z. */
(function () {
  'use strict';
  window.createHeroine = function (THREE) {
    const group = new THREE.Group();
    group.name = 'heroine';
    const PI = Math.PI;

    // ---------- materials ----------
    const M = {
      skin: new THREE.MeshPhysicalMaterial({ color: 0xd9a27c, roughness: 0.5, sheen: 0.3, sheenColor: new THREE.Color(0xff8f70), sheenRoughness: 0.45, clearcoat: 0.1, clearcoatRoughness: 0.55, emissive: 0x3a0f06, emissiveIntensity: 0.1 }),
      hair: new THREE.MeshPhysicalMaterial({ color: 0x0b090b, roughness: 0.34, clearcoat: 0.45, clearcoatRoughness: 0.3, sheen: 0.25, sheenColor: new THREE.Color(0x3a3050), side: THREE.DoubleSide, shadowSide: THREE.FrontSide }),
      teal: new THREE.MeshPhysicalMaterial({ color: 0x0a3b42, roughness: 0.44, sheen: 0.4, sheenColor: new THREE.Color(0x2e9a94), sheenRoughness: 0.4 }),
      tealD: new THREE.MeshPhysicalMaterial({ color: 0x0a3b42, roughness: 0.44, sheen: 0.4, sheenColor: new THREE.Color(0x2e9a94), sheenRoughness: 0.4, side: THREE.DoubleSide, shadowSide: THREE.FrontSide }),
      red: new THREE.MeshPhysicalMaterial({ color: 0x8e0f16, roughness: 0.42, sheen: 0.45, sheenColor: new THREE.Color(0xff5a4a), sheenRoughness: 0.35 }),
      redD: new THREE.MeshPhysicalMaterial({ color: 0x8e0f16, roughness: 0.42, sheen: 0.45, sheenColor: new THREE.Color(0xff5a4a), sheenRoughness: 0.35, side: THREE.DoubleSide, shadowSide: THREE.FrontSide }),
      gold: new THREE.MeshStandardMaterial({ color: 0xd9aa4c, metalness: 1, roughness: 0.28 }),
      trouser: new THREE.MeshStandardMaterial({ color: 0x1c1e23, roughness: 0.86 }),
      leather: new THREE.MeshStandardMaterial({ color: 0x3a2314, roughness: 0.58 }),
      leatherDark: new THREE.MeshStandardMaterial({ color: 0x21150c, roughness: 0.6 }),
      glove: new THREE.MeshStandardMaterial({ color: 0x1b1917, roughness: 0.7 }),
      sole: new THREE.MeshStandardMaterial({ color: 0x0e0e0f, roughness: 0.9 }),
      eyeW: new THREE.MeshStandardMaterial({ color: 0xf4f0ea, roughness: 0.25 }),
      iris: new THREE.MeshStandardMaterial({ color: 0x22120a, roughness: 0.15 }),
      lip: new THREE.MeshPhysicalMaterial({ color: 0xb4525a, roughness: 0.35, clearcoat: 0.4 })
    };

    // ---------- helpers ----------
    function G(parent, x, y, z) { const g = new THREE.Group(); g.position.set(x || 0, y || 0, z || 0); parent.add(g); return g; }
    function mesh(geo, mat, parent, x, y, z, sx, sy, sz) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x || 0, y || 0, z || 0);
      if (sx !== undefined) m.scale.set(sx, sy, sz);
      parent.add(m); return m;
    }
    function lathe(pts, seg) {
      const a = []; for (let i = 0; i < pts.length; i++) a.push(new THREE.Vector2(pts[i][0], pts[i][1]));
      return new THREE.LatheGeometry(a, seg || 20);
    }
    // tapered capsule hanging from y=0 down to y=-len
    function tcap(r1, r2, len, seg) {
      const p = [], n = 6;
      for (let i = 0; i <= n; i++) { const a = i / n * PI / 2; p.push([Math.max(1e-4, r2 * Math.sin(a)), -len - r2 * Math.cos(a)]); }
      for (let i = 0; i <= n; i++) { const a = i / n * PI / 2; p.push([Math.max(1e-4, r1 * Math.cos(a)), r1 * Math.sin(a)]); }
      return lathe(p, seg || 14);
    }
    const sph = new THREE.SphereGeometry(1, 20, 14);

    // ---------- skeleton + body ----------
    const body = G(group);
    const hips = G(body, 0, 0.93, 0);
    mesh(lathe([[0.001, -0.115], [0.07, -0.105], [0.135, -0.065], [0.156, -0.01], [0.15, 0.04], [0.13, 0.09], [0.116, 0.135]], 22), M.trouser, hips, 0, 0, 0, 1, 1, 0.74);

    const spine = G(hips, 0, 0.11, 0);
    mesh(lathe([[0.119, -0.04], [0.113, 0.02], [0.109, 0.06], [0.114, 0.10], [0.125, 0.155]], 22), M.teal, spine, 0, 0, 0, 1, 1, 0.72);
    // sash belt + knot
    mesh(lathe([[0.122, -0.055], [0.134, -0.04], [0.129, 0.025], [0.117, 0.05]], 22), M.red, spine, 0, 0, 0, 1, 1, 0.76);
    mesh(sph, M.red, spine, 0.1, -0.005, -0.068, 0.03, 0.026, 0.024);

    const chest = G(spine, 0, 0.13, 0);
    mesh(lathe([[0.119, -0.05], [0.127, 0.0], [0.137, 0.06], [0.142, 0.11], [0.141, 0.16], [0.134, 0.195], [0.11, 0.225], [0.066, 0.246], [0.044, 0.262]], 22), M.teal, chest, 0, 0, 0, 1, 1, 0.7);
    mesh(sph, M.teal, chest, 0.058, 0.105, 0.058, 0.058, 0.055, 0.05);
    mesh(sph, M.teal, chest, -0.058, 0.105, 0.058, 0.058, 0.055, 0.05);
    // qipao diagonal closure trim + frog buttons
    (function () {
      const c = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.0, 0.25, 0.046), new THREE.Vector3(-0.035, 0.212, 0.082),
        new THREE.Vector3(-0.085, 0.172, 0.09), new THREE.Vector3(-0.128, 0.128, 0.052)]);
      mesh(new THREE.TubeGeometry(c, 16, 0.0038, 6), M.gold, chest);
    })();
    // qipao front / back panels (swing with legs)
    const flapF = G(hips, 0, 0.085, 0.11), flapB = G(hips, 0, 0.085, -0.11);
    const flapGeoF = new THREE.CylinderGeometry(0.13, 0.135, 0.3, 10, 1, true, -0.58, 1.16);
    const trimGeoF = new THREE.CylinderGeometry(0.1365, 0.1365, 0.014, 10, 1, true, -0.58, 1.16);
    const flapGeoB = new THREE.CylinderGeometry(0.128, 0.135, 0.3, 10, 1, true, PI - 0.58, 1.32);
    const trimGeoB = new THREE.CylinderGeometry(0.1365, 0.1365, 0.014, 10, 1, true, PI - 0.58, 1.32);
    mesh(flapGeoF, M.tealD, flapF, 0, -0.15, -0.11, 1.22, 1, 1);
    mesh(trimGeoF, M.gold, flapF, 0, -0.297, -0.11, 1.22, 1, 1);
    mesh(flapGeoB, M.tealD, flapB, 0, -0.15, 0.11, 1.22, 1, 1);
    mesh(trimGeoB, M.gold, flapB, 0, -0.297, 0.11, 1.22, 1, 1);

    // neck + collar
    const neck = G(chest, 0, 0.25, 0);
    mesh(new THREE.CylinderGeometry(0.036, 0.043, 0.13, 14), M.skin, neck, 0, 0.025, 0);
    mesh(new THREE.CylinderGeometry(0.045, 0.051, 0.042, 20, 1, true), M.tealD, neck, 0, 0.014, 0);
    const colT = mesh(new THREE.TorusGeometry(0.0455, 0.0036, 6, 24), M.gold, neck, 0, 0.036, 0); colT.rotation.x = PI / 2;

    // head
    const head = G(neck, 0, 0.06, 0);
    const CY = 0.08;
    mesh(sph, M.skin, head, 0, CY, 0, 0.09, 0.1, 0.1);
    mesh(sph, M.skin, head, 0, 0.036, 0.011, 0.076, 0.085, 0.078);
    // face
    for (let sgn = -1; sgn <= 1; sgn += 2) {
      const ew = mesh(sph, M.eyeW, head, sgn * 0.033, CY - 0.012, 0.0835, 0.0165, 0.0085, 0.008); ew.rotation.y = sgn * 0.3;
      const ir = mesh(sph, M.iris, head, sgn * 0.0345, CY - 0.012, 0.0878, 0.0088, 0.0088, 0.0045); ir.rotation.y = sgn * 0.3;
      const lash = mesh(sph, M.hair, head, sgn * 0.034, CY - 0.0045, 0.0875, 0.019, 0.0026, 0.005); lash.rotation.z = sgn * 0.12; lash.rotation.y = sgn * 0.3;
      const brow = mesh(sph, M.hair, head, sgn * 0.035, CY + 0.014, 0.09, 0.02, 0.0032, 0.005); brow.rotation.z = sgn * 0.16;
    }
    mesh(sph, M.skin, head, 0, CY - 0.043, 0.095, 0.0105, 0.014, 0.012);
    mesh(sph, M.lip, head, 0, CY - 0.073, 0.0862, 0.019, 0.0085, 0.008);
    // hair: cap, fringe, side locks, ponytail base
    const cap = mesh(new THREE.SphereGeometry(1, 24, 16, 0, PI * 2, 0, PI * 0.63), M.hair, head, 0, CY + 0.004, -0.005, 0.098, 0.107, 0.108);
    cap.rotation.x = -0.9;
    const fringe = mesh(new THREE.SphereGeometry(1, 14, 6, PI / 2 - 1.05, 2.1, PI * 0.2, PI * 0.2), M.hair, head, 0, CY + 0.004, 0.0, 0.097, 0.108, 0.108);
    fringe.rotation.z = 0.06;
    mesh(sph, M.hair, head, 0, CY + 0.07, -0.088, 0.036, 0.036, 0.04);
    const ring = mesh(new THREE.TorusGeometry(0.027, 0.006, 6, 16), M.gold, head, 0, CY + 0.062, -0.112); ring.rotation.x = -0.9;
    const braidAnchor = new THREE.Object3D(); braidAnchor.position.set(0, CY + 0.058, -0.122); head.add(braidAnchor);

    // backpack
    mesh(new THREE.BoxGeometry(0.19, 0.22, 0.085), M.leather, chest, 0, 0.065, -0.148);
    mesh(new THREE.BoxGeometry(0.196, 0.085, 0.092), M.leatherDark, chest, 0, 0.14, -0.149);
    mesh(new THREE.BoxGeometry(0.032, 0.03, 0.006), M.gold, chest, 0, 0.095, -0.196);
    const strapGeo = new THREE.TorusGeometry(0.118, 0.0105, 6, 28);
    for (let sgn = -1; sgn <= 1; sgn += 2) {
      const st = mesh(strapGeo, M.leatherDark, chest, sgn * 0.088, 0.088, -0.014, 1, 1.16, 1.6); st.rotation.y = PI / 2;
    }

    // arms
    function arm(sgn) {
      const sh = G(chest, sgn * 0.15, 0.2, 0);
      mesh(sph, M.skin, sh, 0, 0, 0, 0.043, 0.043, 0.043);
      mesh(tcap(0.04, 0.033, 0.27), M.skin, sh);
      const el = G(sh, 0, -0.27, 0);
      mesh(tcap(0.034, 0.025, 0.235), M.skin, el);
      const hand = G(el, 0, -0.235, 0);
      mesh(new THREE.CylinderGeometry(0.029, 0.027, 0.05, 12), M.glove, hand, 0, 0.012, 0);
      mesh(sph, M.glove, hand, 0, -0.04, 0.004, 0.016, 0.045, 0.036);
      const f = mesh(sph, M.skin, hand, -sgn * 0.006, -0.1, 0.006, 0.012, 0.04, 0.03); f.rotation.z = sgn * 0.25;
      return { sh: sh, el: el, hand: hand };
    }
    const aL = arm(1), aR = arm(-1);

    // legs
    const bootGeo = lathe([[0.044, -0.275], [0.042, -0.25], [0.048, -0.12], [0.054, -0.012], [0.056, 0.0], [0.05, 0.004]], 14);
    const footGeo = new THREE.CapsuleGeometry(0.041, 0.125, 6, 12);
    function leg(sgn) {
      const th = G(hips, sgn * 0.082, -0.03, 0);
      mesh(tcap(0.083, 0.056, 0.42), M.trouser, th);
      const kn = G(th, 0, -0.42, 0);
      mesh(tcap(0.057, 0.038, 0.40), M.trouser, kn);
      mesh(bootGeo, M.leather, kn, 0, -0.14, 0);
      const ft = G(kn, 0, -0.40, 0);
      const f = mesh(footGeo, M.leather, ft, 0, -0.036, 0.055, 1, 1, 0.84); f.rotation.x = PI / 2;
      mesh(new THREE.BoxGeometry(0.078, 0.016, 0.226), M.sole, ft, 0, -0.071, 0.05);
      if (sgn > 0) { // cargo pocket
        mesh(new THREE.BoxGeometry(0.03, 0.11, 0.09), M.trouser, th, 0.066, -0.25, 0);
      } else { // thigh strap + pouch
        const s1 = mesh(new THREE.TorusGeometry(0.074, 0.007, 6, 20), M.leatherDark, th, 0, -0.17, 0); s1.rotation.x = PI / 2;
        const s2 = mesh(new THREE.TorusGeometry(0.069, 0.007, 6, 20), M.leatherDark, th, 0, -0.26, 0); s2.rotation.x = PI / 2;
        mesh(new THREE.BoxGeometry(0.03, 0.13, 0.07), M.leather, th, -0.08, -0.215, 0);
      }
      return { th: th, kn: kn, ft: ft };
    }
    const lL = leg(1), lR = leg(-1);

    // ---------- braid + sash (verlet chains) ----------
    function makeChain(n, segLen, damp, grav, carry) { return { n: n, seg: segLen, damp: damp, grav: grav, carry: carry, p: new Float32Array(n * 3), q: new Float32Array(n * 3), init: false }; }
    const braid = makeChain(10, 0.062, 0.93, 1.3, 0.6);
    const braidMeshes = [];
    const braidTwist = [];
    for (let i = 0; i < braid.n - 1; i++) {
      const k = i / (braid.n - 2), w = 0.034 - 0.014 * k;
      const m = mesh(sph, M.hair, group, 0, 1.4 - i * 0.06, -0.15, w * (i % 2 ? 1 : 0.86), 0.042, w * (i % 2 ? 0.8 : 1));
      braidMeshes.push(m);
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), i * 0.9);
      braidTwist.push(q);
    }
    const braidTie = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.022, 10), M.gold, group);

    const sashAnchors = [new THREE.Object3D(), new THREE.Object3D()];
    sashAnchors[0].position.set(0.108, -0.02, -0.07); sashAnchors[1].position.set(0.092, -0.02, -0.082);
    spine.add(sashAnchors[0]); spine.add(sashAnchors[1]);
    const sashes = [];
    for (let k = 0; k < 2; k++) {
      const ch = makeChain(6, k ? 0.07 : 0.088, 0.94, 0.7, 0.35);
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(ch.n * 2 * 3);
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const idx = [];
      for (let i = 0; i < ch.n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      geo.setIndex(idx);
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, M.redD); m.frustumCulled = false; group.add(m);
      sashes.push({ ch: ch, geo: geo, pos: pos, mesh: m });
    }

    group.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = !(o.material === M.tealD || o.material === M.redD); } });

    // ---------- pose system ----------
    const NAMES = ['bodyY', 'bodyRx', 'bodyRz', 'hipsRx', 'hipsRy', 'hipsRz', 'spineRx', 'spineRy', 'spineRz', 'chestRx', 'chestRy', 'chestRz',
      'neckRx', 'headRx', 'headRy', 'headRz', 'shLx', 'shLy', 'shLz', 'elL', 'shRx', 'shRy', 'shRz', 'elR',
      'thLx', 'thLz', 'knL', 'ftL', 'thRx', 'thRz', 'knR', 'ftR'];
    const I = {}; for (let i = 0; i < NAMES.length; i++) I[NAMES[i]] = i;
    const NJ = NAMES.length;
    function P(o) { const a = new Float32Array(NJ); for (const k in o) a[I[k]] = o[k]; return a; }
    const IDLE = P({ shLz: 0.11, shRz: -0.11, shLx: 0.05, shRx: 0.05, elL: -0.22, elR: -0.22, thLz: 0.04, thRz: -0.04, thLx: -0.02, thRx: -0.02, knL: 0.04, knR: 0.04 });
    const JUMP = P({ shLx: -2.5, shRx: -2.2, shLz: 0.25, shRz: -0.3, elL: -0.45, elR: -0.7, thLx: -1.05, knL: 1.5, thRx: 0.3, knR: 0.95, ftL: 0.3, ftR: 0.6, spineRx: 0.1, chestRx: -0.08, headRx: -0.15 });
    const FALL = P({ shLx: -0.35, shRx: -0.35, shLz: 1.15, shRz: -1.15, elL: -0.45, elR: -0.45, thLx: -0.35, knL: 0.6, thRx: 0.12, knR: 0.75, ftL: 0.35, ftR: 0.5, spineRx: 0.1, headRx: 0.12 });
    const CL = [
      P({ shLx: -2.95, shRx: -2.95, shLz: 0.12, shRz: -0.12, elL: -0.12, elR: -0.12, thLx: -0.1, knL: 0.3, thRx: 0.06, knR: 0.42, ftL: 0.5, ftR: 0.5, headRx: -0.4, spineRx: -0.05 }),
      P({ shLx: -2.95, shRx: -2.95, shLz: 0.14, shRz: -0.14, elL: -0.2, elR: -0.2, thLx: -0.2, knL: 0.5, thRx: 0.02, knR: 0.5, ftL: 0.5, ftR: 0.5, headRx: -0.4, spineRx: -0.05 }),
      P({ shLx: -1.45, shRx: -1.45, shLz: 0.5, shRz: -0.5, elL: -2.15, elR: -2.15, thLx: -0.55, knL: 0.95, thRx: -0.2, knR: 0.7, ftL: 0.3, ftR: 0.4, spineRx: 0.15, headRx: -0.2 }),
      P({ shLx: 0.35, shRx: 0.3, shLz: 0.28, shRz: -0.28, elL: -0.5, elR: -0.5, thLx: -1.75, knL: 1.95, thRx: -0.3, knR: 1.2, spineRx: 0.45, chestRx: 0.2, headRx: -0.35 }),
      IDLE
    ];
    const CLT = [0, 0.25, 0.55, 0.8, 1];
    const DEAD = P({ bodyRx: 1.5, bodyY: 0.13, headRy: 1.0, headRx: -0.1, shLx: -2.6, shLz: 0.5, elL: -0.6, shRx: -0.4, shRz: -0.8, elR: -1.1, thLz: 0.18, thRz: -0.1, knR: 0.55, knL: 0.1, ftL: 0.9, ftR: 0.9, spineRy: 0.15 });

    const tgt = new Float32Array(NJ), cur = new Float32Array(NJ);
    cur.set(IDLE);
    let phase = 0, clock = 0;
    const v = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3();
    const inv = new THREE.Matrix4(), invC = new THREE.Matrix4();
    const UP = new THREE.Vector3(0, 1, 0);
    function sstep(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }

    function stepChain(ch, anchor, dt, collide) {
      const p = ch.p, q = ch.q, n = ch.n;
      anchor.getWorldPosition(v);
      const dx = v.x - p[0], dy = v.y - p[1], dz = v.z - p[2];
      if (!ch.init || dx * dx + dy * dy + dz * dz > 2.25) {
        for (let i = 0; i < n; i++) { p[i * 3] = q[i * 3] = v.x; p[i * 3 + 1] = q[i * 3 + 1] = v.y - i * ch.seg; p[i * 3 + 2] = q[i * 3 + 2] = v.z; }
        ch.init = true;
      }
      // anchor velocity partly carried along (air drag only on the remainder)
      const ax = (v.x - p[0]) * ch.carry, ay = (v.y - p[1]) * ch.carry, az = (v.z - p[2]) * ch.carry;
      p[0] = v.x; p[1] = v.y; p[2] = v.z;
      const g = 9.8 * ch.grav * dt * dt, d = Math.pow(ch.damp, dt * 60);
      for (let i = 3; i < n * 3; i += 3) {
        const vx = ax + (p[i] - q[i] - ax) * d, vy = ay + (p[i + 1] - q[i + 1] - ay) * d, vz = az + (p[i + 2] - q[i + 2] - az) * d;
        q[i] = p[i]; q[i + 1] = p[i + 1]; q[i + 2] = p[i + 2];
        p[i] += vx; p[i + 1] += vy - g; p[i + 2] += vz;
      }
      for (let it = 0; it < 3; it++) {
        for (let i = 3; i < n * 3; i += 3) {
          if (collide) collide(p, i);
          const ex = p[i] - p[i - 3], ey = p[i + 1] - p[i - 2], ez = p[i + 2] - p[i - 1];
          const l = Math.sqrt(ex * ex + ey * ey + ez * ez) || 1e-5, s = ch.seg / l;
          p[i] = p[i - 3] + ex * s; p[i + 1] = p[i - 2] + ey * s; p[i + 2] = p[i - 1] + ez * s;
        }
      }
    }
    function collideBraid(p, i) { // chest-local back + backpack
      v2.set(p[i], p[i + 1], p[i + 2]).applyMatrix4(invC);
      let lim = 1e9;
      if (v2.y > -0.3 && v2.y < 0.56 && Math.abs(v2.x) < 0.2) lim = (v2.y > -0.07 && v2.y < 0.22 && Math.abs(v2.x) < 0.12) ? -0.212 : -0.118;
      if (v2.z > lim) { v2.z = lim; v2.applyMatrix4(chest.matrixWorld); const q = braid.q; q[i] += (v2.x - p[i]); q[i + 1] += (v2.y - p[i + 1]); q[i + 2] += (v2.z - p[i + 2]); p[i] = v2.x; p[i + 1] = v2.y; p[i + 2] = v2.z; }
    }
    function collideSash(p, i) { // hips-local ellipse
      v2.set(p[i], p[i + 1], p[i + 2]).applyMatrix4(invC);
      if (v2.y < 0.2 && v2.y > -0.7) {
        const d = (v2.x * v2.x) / 0.0296 + (v2.z * v2.z) / 0.0185;
        if (d < 1) { const s = 1 / Math.sqrt(d || 1e-5); v2.x *= s; v2.z *= s; v2.applyMatrix4(hips.matrixWorld); p[i] = v2.x; p[i + 1] = v2.y; p[i + 2] = v2.z; }
      }
    }

    function update(dt, s) {
      dt = dt > 0.05 ? 0.05 : (dt > 0 ? dt : 0);
      s = s || {};
      const st = s.state || 'idle', speed = s.speed || 0;
      clock += dt;
      const t = s.t !== undefined ? s.t : clock;
      let k = 9, i;

      if (st === 'dead') { tgt.set(DEAD); k = 5; }
      else if (st === 'climb') {
        const ct = s.climbT < 0 ? 0 : s.climbT > 1 ? 1 : (s.climbT || 0);
        let seg = 0; while (seg < CLT.length - 2 && ct > CLT[seg + 1]) seg++;
        const w = sstep((ct - CLT[seg]) / (CLT[seg + 1] - CLT[seg])), A = CL[seg], B = CL[seg + 1];
        for (i = 0; i < NJ; i++) tgt[i] = A[i] + (B[i] - A[i]) * w;
        k = 16;
      }
      else if (st === 'jump') { tgt.set(JUMP); k = 12; }
      else if (st === 'fall') {
        tgt.set(FALL);
        const f = Math.sin(t * 9) * 0.1;
        tgt[I.shLx] += f; tgt[I.shRx] -= f; tgt[I.thLx] += f * 0.8; tgt[I.thRx] -= f * 0.8;
        k = 8;
      }
      else {
        tgt.set(IDLE);
        const a = st === 'run' ? Math.min(1, speed / 5.5) : 0;
        if (a > 0.02) {
          phase += dt * PI * 2 * (1.05 + 0.115 * speed);
          if (phase > PI * 2) phase -= PI * 2;
          const sn = Math.sin(phase), kL = Math.max(0, Math.sin(phase - 3.84)), kR = Math.max(0, Math.sin(phase + PI - 3.84));
          tgt[I.thLx] = -0.22 * a - 0.78 * a * sn; tgt[I.thRx] = -0.22 * a + 0.78 * a * sn;
          tgt[I.knL] = a * (0.3 + 1.1 * kL); tgt[I.knR] = a * (0.3 + 1.1 * kR);
          tgt[I.ftL] = a * (0.45 * kL - 0.15 * Math.max(0, sn)); tgt[I.ftR] = a * (0.45 * kR - 0.15 * Math.max(0, -sn));
          tgt[I.thLz] = 0.02; tgt[I.thRz] = -0.02;
          tgt[I.shLx] = 0.12 + 0.85 * a * sn; tgt[I.shRx] = 0.12 - 0.85 * a * sn;
          tgt[I.elL] = -0.25 - 1.15 * a + 0.3 * a * sn; tgt[I.elR] = -0.25 - 1.15 * a - 0.3 * a * sn;
          tgt[I.shLz] = 0.14 + 0.05 * a; tgt[I.shRz] = -0.14 - 0.05 * a;
          tgt[I.spineRx] = 0.13 * a; tgt[I.chestRx] = 0.09 * a; tgt[I.neckRx] = -0.12 * a; tgt[I.headRx] = -0.06 * a;
          tgt[I.hipsRy] = -0.14 * a * sn; tgt[I.chestRy] = 0.3 * a * sn; tgt[I.headRy] = -0.16 * a * sn;
          tgt[I.hipsRz] = 0.045 * a * sn; tgt[I.spineRz] = -0.06 * a * sn;
          tgt[I.bodyY] = a * (0.022 * Math.cos(2 * phase) - 0.028);
          k = 22;
        } else {
          const b = Math.sin(t * 1.7), w = Math.sin(t * 0.55);
          tgt[I.bodyY] = b * 0.003 - 0.004;
          tgt[I.chestRx] = -0.02 + b * 0.014; tgt[I.spineRx] = 0.01;
          tgt[I.hipsRz] = w * 0.035; tgt[I.spineRz] = -w * 0.03; tgt[I.chestRz] = -w * 0.012;
          tgt[I.thLz] = 0.04 - w * 0.035; tgt[I.thRz] = -0.04 - w * 0.035;
          tgt[I.headRy] = Math.sin(t * 0.31) * 0.12; tgt[I.headRx] = Math.sin(t * 0.23) * 0.03;
          tgt[I.shLx] = 0.05 + b * 0.012; tgt[I.shRx] = 0.05 - w * 0.02;
          tgt[I.elL] = -0.22 - b * 0.02; tgt[I.elR] = -0.22 - b * 0.02;
          k = 8;
        }
      }

      const al = 1 - Math.exp(-k * dt);
      for (i = 0; i < NJ; i++) cur[i] += (tgt[i] - cur[i]) * al;

      body.position.y = cur[I.bodyY]; body.rotation.x = cur[I.bodyRx]; body.rotation.z = cur[I.bodyRz];
      hips.rotation.set(cur[I.hipsRx], cur[I.hipsRy], cur[I.hipsRz]);
      spine.rotation.set(cur[I.spineRx], cur[I.spineRy], cur[I.spineRz]);
      chest.rotation.set(cur[I.chestRx], cur[I.chestRy], cur[I.chestRz]);
      neck.rotation.x = cur[I.neckRx];
      head.rotation.set(cur[I.headRx], cur[I.headRy], cur[I.headRz]);
      aL.sh.rotation.set(cur[I.shLx], cur[I.shLy], cur[I.shLz]); aL.el.rotation.x = cur[I.elL];
      aR.sh.rotation.set(cur[I.shRx], cur[I.shRy], cur[I.shRz]); aR.el.rotation.x = cur[I.elR];
      lL.th.rotation.set(cur[I.thLx], 0, cur[I.thLz]); lL.kn.rotation.x = cur[I.knL]; lL.ft.rotation.x = cur[I.ftL];
      lR.th.rotation.set(cur[I.thRx], 0, cur[I.thRz]); lR.kn.rotation.x = cur[I.knR]; lR.ft.rotation.x = cur[I.ftR];
      const tf = Math.min(cur[I.thLx], cur[I.thRx]), tb = Math.max(cur[I.thLx], cur[I.thRx]);
      flapF.rotation.x = Math.min(0, tf + 0.08) * 0.92;
      flapB.rotation.x = Math.max(0, tb - 0.05) * 0.9;

      // ----- secondary motion -----
      group.updateMatrixWorld(true);
      inv.copy(group.matrixWorld).invert();
      if (dt > 0) {
        invC.copy(chest.matrixWorld).invert();
        stepChain(braid, braidAnchor, dt, collideBraid);
        invC.copy(hips.matrixWorld).invert();
        stepChain(sashes[0].ch, sashAnchors[0], dt, collideSash);
        stepChain(sashes[1].ch, sashAnchors[1], dt, collideSash);
      } else if (!braid.init) return;

      // braid render (group-local)
      const bp = braid.p;
      for (i = 0; i < braid.n - 1; i++) {
        const a = i * 3;
        v.set(bp[a], bp[a + 1], bp[a + 2]).applyMatrix4(inv);
        v2.set(bp[a + 3], bp[a + 4], bp[a + 5]).applyMatrix4(inv);
        const m = braidMeshes[i];
        m.position.copy(v).add(v2).multiplyScalar(0.5);
        v3.copy(v2).sub(v).normalize();
        m.quaternion.setFromUnitVectors(UP, v3).multiply(braidTwist[i]);
        if (i === braid.n - 2) {
          braidTie.position.copy(v2).addScaledVector(v3, -0.012); braidTie.quaternion.setFromUnitVectors(UP, v3);
         
        }
      }
      // sash ribbons
      for (let sI = 0; sI < 2; sI++) {
        const sa = sashes[sI], p = sa.ch.p, pos = sa.pos, n = sa.ch.n;
        for (i = 0; i < n; i++) {
          v.set(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]).applyMatrix4(inv);
          const hw = 0.02 + 0.022 * (i / (n - 1)), wx = 0.6 * hw, wz = 0.8 * hw, o = i * 6;
          pos[o] = v.x - wx; pos[o + 1] = v.y; pos[o + 2] = v.z - wz;
          pos[o + 3] = v.x + wx; pos[o + 4] = v.y; pos[o + 5] = v.z + wz;
        }
        sa.geo.attributes.position.needsUpdate = true;
        sa.geo.computeVertexNormals();
      }
    }

    update(0.016, { state: 'idle', speed: 0, vy: 0, climbT: 0, t: 0 });
    return { group: group, update: update, height: 1.68 };
  };
})();
