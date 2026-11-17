/* Heroine: skinned GLB character (assets/char/heroine.glb + anims.glb) with two variants (setVariant 'elder'|'younger');
   the procedural figure below is the instant stand-in / fallback. three.js r147 (global THREE).
   window.createHeroine(THREE) -> { group, update(dt, s), height, setVariant(name) } ; origin at feet, facing +Z. */
(function () {
  'use strict';
  function createProceduralHeroine(THREE) {
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
    return { group: group, update: update, height: 1.68, mats: M };
  }

  /* ===== Skinned, textured heroine (GLB) with two selectable variants ===== */
  var VARS = { elder: { h: 1.62, head: 1.0 }, younger: { h: 1.42, head: 1.13 } };
  var PH_COL = { elder: { top: 0xe9e9e4, bottom: 0x7da6d0 }, younger: { top: 0xf2bcc8, bottom: 0xb0b2b8 } };
  var CHILD = { Spine: 'Spine1', LeftArm: 'LeftForeArm', LeftForeArm: 'LeftHand', RightArm: 'RightForeArm', RightForeArm: 'RightHand', LeftUpLeg: 'LeftLeg', LeftLeg: 'LeftFoot', RightUpLeg: 'RightLeg', RightLeg: 'RightFoot' };
  var ORDER = ['Spine', 'LeftArm', 'LeftForeArm', 'RightArm', 'RightForeArm', 'LeftUpLeg', 'LeftLeg', 'RightUpLeg', 'RightLeg'];
  // pose directions in character space (x = her left, y = up, z = forward)
  function mirror(p) { var o = { Spine: p.Spine }; ['Arm', 'ForeArm', 'UpLeg', 'Leg'].forEach(function (k) { if (p['L' + k]) o['Left' + k] = p['L' + k]; var r = p['R' + k] || p['L' + k]; if (r) o['Right' + k] = p['R' + k] ? r : [-r[0], r[1], r[2]]; }); return o; }
  var POSES = {
    jump: mirror({ Spine: [0, 1, 0.12], LArm: [0.35, 0.55, 0.65], LForeArm: [0.1, 0.9, 0.4], LUpLeg: [0.1, -0.55, 0.8], LLeg: [0.05, -0.9, -0.4], RUpLeg: [-0.1, -0.97, -0.15], RLeg: [-0.05, -0.8, -0.6] }),
    fall: mirror({ Spine: [0, 1, 0.05], LArm: [0.8, 0.4, 0.2], LForeArm: [0.55, 0.75, 0.3], LUpLeg: [0.16, -0.9, 0.35], LLeg: [0.1, -0.95, -0.3], RUpLeg: [-0.14, -0.97, 0.05], RLeg: [-0.1, -0.85, -0.5] }),
    hang: mirror({ Spine: [0, 1, 0.02], LArm: [0.2, 0.93, 0.28], LForeArm: [0.02, 0.96, 0.25], LUpLeg: [0.08, -0.97, 0.15], LLeg: [0.05, -0.95, -0.3] }),
    pull: mirror({ Spine: [0, 0.9, 0.42], LArm: [0.4, -0.5, 0.35], LForeArm: [0.1, -0.6, 0.8], LUpLeg: [0.15, 0.05, 0.98], LLeg: [0.05, -0.92, -0.35], RUpLeg: [-0.1, -0.9, -0.35], RLeg: [-0.05, -0.6, -0.8] }),
    dead: mirror({ Spine: [0, 1, 0], LArm: [0.75, 0.6, 0.1], LForeArm: [0.3, 0.9, 0.1], LUpLeg: [0.18, -0.98, 0], LLeg: [0.25, -0.95, -0.1] })
  };

  window.createHeroine = function (THREE) {
    var group = new THREE.Group(); group.name = 'heroine';
    var ph = null;
    try { ph = createProceduralHeroine(THREE); group.add(ph.group); } catch (e) { console.warn('placeholder heroine', e); }
    var pivot = new THREE.Group(); group.add(pivot);
    var variant = 'elder', model = null, mixer = null, acts = {}, bones = {}, restQ = {}, restDir = {}, mat = null, mesh = null, baseMap = null, baked = null, texByVar = {}, modelH = 1.66;
    var w = { i: 1, w: 0, r: 0 }, pw = { jump: 0, fall: 0, climb: 0, dead: 0 }, prevYaw = null, lean = 0, deadK = 0;
    var Q = function () { return new THREE.Quaternion(); }, V3 = function () { return new THREE.Vector3(); };
    var q1 = Q(), q2 = Q(), q3 = Q(), qd = Q(), v1 = V3(), v2 = V3(), vd = V3();
    var api = { group: group, update: update, height: 1.62, setVariant: setVariant, ready: false };
    function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
    function sm(a, b, x) { var t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); }

    function setVariant(name) { if (VARS[name]) variant = name; applyVariant(); return api; }
    function applyVariant() {
      var v = VARS[variant]; api.height = v.h;
      if (ph) {
        ph.group.scale.setScalar(v.h / 1.68);
        try { var m = ph.mats, c = PH_COL[variant]; if (m) { m.teal.color.setHex(c.top); m.tealD.color.setHex(c.top); m.trouser.color.setHex(c.bottom); m.hair.color.setHex(0x0a090a); } } catch (e) { }
      }
      if (!model) return;
      model.scale.setScalar(v.h / modelH);
      if (bones.Head) bones.Head.scale.setScalar(v.head);
      try { if (!texByVar[variant]) texByVar[variant] = paint(variant); mat.map = texByVar[variant]; mat.needsUpdate = true; } catch (e) { console.warn('heroine paint', e); }
    }

    // ---------- UV-space bake of bind-pose positions, so clothes can be painted by body location ----------
    function bake(geo, S) {
      var P = geo.attributes.position, U = geo.attributes.uv, N = geo.attributes.normal, I = geo.index ? geo.index.array : null, n = I ? I.length : P.count;
      var X = new Float32Array(S * S), Y = new Float32Array(S * S), Z = new Float32Array(S * S), NZ = new Float32Array(S * S), C = new Uint8Array(S * S), e = 0.12;
      for (var t = 0; t < n; t += 3) {
        var a = I ? I[t] : t, b = I ? I[t + 1] : t + 1, c = I ? I[t + 2] : t + 2;
        var u0 = U.getX(a), v0 = U.getY(a), u1 = U.getX(b), v1_ = U.getY(b), u2 = U.getX(c), v2_ = U.getY(c);
        var fu = Math.floor((u0 + u1 + u2) / 3), fv = Math.floor((v0 + v1_ + v2_) / 3);
        u0 = (u0 - fu) * S; u1 = (u1 - fu) * S; u2 = (u2 - fu) * S; v0 = (v0 - fv) * S; v1_ = (v1_ - fv) * S; v2_ = (v2_ - fv) * S;
        var area = (u1 - u0) * (v2_ - v0) - (u2 - u0) * (v1_ - v0); if (Math.abs(area) < 1e-9) continue; var inv = 1 / area;
        var x0 = Math.max(0, Math.floor(Math.min(u0, u1, u2) - 1)), x1 = Math.min(S - 1, Math.ceil(Math.max(u0, u1, u2) + 1));
        var y0 = Math.max(0, Math.floor(Math.min(v0, v1_, v2_) - 1)), y1 = Math.min(S - 1, Math.ceil(Math.max(v0, v1_, v2_) + 1));
        for (var py = y0; py <= y1; py++) for (var px = x0; px <= x1; px++) {
          var cx = px + 0.5, cy = py + 0.5;
          var w0 = ((u1 - cx) * (v2_ - cy) - (u2 - cx) * (v1_ - cy)) * inv, w1 = ((u2 - cx) * (v0 - cy) - (u0 - cx) * (v2_ - cy)) * inv, w2 = 1 - w0 - w1;
          if (w0 < -e || w1 < -e || w2 < -e) continue;
          var inside = (w0 >= 0 && w1 >= 0 && w2 >= 0) ? 2 : 1, k = py * S + px;
          if (C[k] > inside || (C[k] === 2 && inside === 2 && false)) continue;
          if (C[k] === 2 && inside === 1) continue;
          C[k] = inside;
          X[k] = P.getX(a) * w0 + P.getX(b) * w1 + P.getX(c) * w2; Y[k] = P.getY(a) * w0 + P.getY(b) * w1 + P.getY(c) * w2; Z[k] = P.getZ(a) * w0 + P.getZ(b) * w1 + P.getZ(c) * w2;
          NZ[k] = N ? N.getZ(a) * w0 + N.getZ(b) * w1 + N.getZ(c) * w2 : 1;
        }
      }
      return { X: X, Y: Y, Z: Z, NZ: NZ, C: C, S: S };
    }
    function slimLegs(geo) {
      var P = geo.attributes.position, hip = bones.LeftUpLeg.getWorldPosition(V3()), knee = bones.LeftLeg.getWorldPosition(V3()), ank = bones.LeftFoot.getWorldPosition(V3());
      var top = hip.y - 0.06;
      for (var i = 0; i < P.count; i++) {
        var y = P.getY(i); if (y < 0.09 || y > top) continue;
        var x = P.getX(i), z = P.getZ(i), sgn = x >= 0 ? 1 : -1, t, cxl, czl, target;
        if (y > knee.y) { t = (y - knee.y) / (hip.y - knee.y); cxl = knee.x + (hip.x - knee.x) * t; czl = knee.z + (hip.z - knee.z) * t; target = 0.064 + 0.03 * Math.min(1, t); }
        else { t = clamp01((y - ank.y) / (knee.y - ank.y)); cxl = ank.x + (knee.x - ank.x) * t; czl = ank.z + (knee.z - ank.z) * t; target = 0.047 + 0.017 * t; }
        cxl *= sgn; var dx = x - cxl, dz = z - czl, r = Math.sqrt(dx * dx + dz * dz); if (r <= target) continue;
        var f = (target + (r - target) * 0.22) / r, bl = sm(top, top - 0.14, y) * sm(0.09, 0.15, y); f = 1 + (f - 1) * bl;
        P.setXYZ(i, cxl + dx * f, y, czl + dz * f);
      }
      P.needsUpdate = true;
    }
    function paint(vn) {
      var S = 1024; if (!baked) baked = bake(mesh.geometry, S);
      var cv = document.createElement('canvas'); cv.width = cv.height = S; var cx = cv.getContext('2d');
      cx.drawImage(baseMap.image, 0, 0, S, S); var id = cx.getImageData(0, 0, S, S), d = id.data;
      var tc = document.createElement('canvas'); tc.width = 128; tc.height = 96; var tx = tc.getContext('2d');
      tx.fillStyle = '#000'; tx.fillRect(0, 0, 128, 96); tx.fillStyle = '#fff'; tx.font = '900 92px Impact, "Arial Black", "Helvetica Neue", Arial, sans-serif'; tx.textAlign = 'center'; tx.textBaseline = 'middle'; tx.fillText('98', 64, 52);
      var td = tx.getImageData(0, 0, 128, 96).data;
      var elder = vn === 'elder', X = baked.X, Y = baked.Y, NZ = baked.NZ, C = baked.C;
      for (var k = 0; k < S * S; k++) {
        var o = k * 4, r = d[o], g = d[o + 1], b = d[o + 2];
        var mx = Math.max(r, g, b), mn = Math.min(r, g, b), val = mx / 255, sat = mx ? (mx - mn) / mx : 0, hue = 0;
        if (mx !== mn) { if (mx === r) hue = 60 * (((g - b) / (mx - mn)) % 6); else if (mx === g) hue = 60 * ((b - r) / (mx - mn) + 2); else hue = 60 * ((r - g) / (mx - mn) + 4); if (hue < 0) hue += 360; }
        var lum = (0.3 * r + 0.59 * g + 0.11 * b) / 255;
        var isSkin = hue >= 6 && hue <= 42 && sat > 0.22 && sat < 0.85 && val > 0.2 && val < 0.9;
        var isYellow = hue > 42 && hue < 66 && sat > 0.4 && val > 0.45;
        var ref = isSkin ? 0.36 : isYellow ? 0.80 : lum > 0.8 ? 0.92 : lum > 0.2 ? 0.55 : lum;
        var sh = ref > 0 ? Math.min(1.1, Math.max(0.74, lum / ref)) : 1;
        var R = r, G = g, B = b, set = false;
        var skinOut = function (f) { var s = Math.min(1.08, Math.pow(Math.max(lum, 0.02) / 0.36, 0.5)) * (f || 1); R = 236 * s; G = 196 * s; B = 168 * s; set = true; };
        if (isSkin) skinOut();
        if (C[k]) {
          var x = X[k], y = Y[k], ax = Math.abs(x), front = NZ[k] > 0.1;
          var col = null, nz = ((k * 2654435761) >>> 24) / 255 - 0.5;
          if (elder) {
            var torso = ax < 0.215 && y > 0.86 && y <= 1.405, sleeve = ax >= 0.215 && ax < 0.37 && y > 1.15 && y < 1.45;
            if (torso || sleeve) {
              var yV = front ? 1.385 - Math.max(0, 0.075 - ax) * 1.25 : 1.39;
              if (ax < 0.13 && y > yV) { if (!isSkin) { lum = 0.36; skinOut(0.97); } }
              else if (ax < 0.14 && y > yV - 0.024) col = [150, 22, 34];
              else if (sleeve && (ax > 0.352 || (ax > 0.316 && ax < 0.334))) col = [196, 26, 38];
              else {
                col = [242, 242, 238];
                if (front && ax < 0.095 && y > 1.10 && y < 1.26) { var tu = Math.floor((x + 0.095) / 0.19 * 127), tv = Math.floor((1.26 - y) / 0.16 * 95); if (td[(tv * 128 + tu) * 4] > 128) col = [196, 26, 38]; }
                if (y < 0.875) col = [214, 214, 212];
              }
            } else if (ax < 0.32 && y <= 0.86) {
              if (y > 0.63) { col = y < 0.648 ? [206, 222, 238] : [124 + nz * 14, 166 + nz * 14, 212 + nz * 12]; }
              else if (y > 0.31) { lum = 0.36 * (0.93 + sh * 0.07); skinOut(); }
              else if (y > 0.27) col = [236, 236, 232];
              else col = y < 0.03 ? [34, 28, 24] : [104, 66, 40];
            }
          } else {
            var hood = (ax < 0.215 && y > 0.84 && y <= 1.415) || (ax >= 0.215 && ax < 0.645 && y > 1.12 && y < 1.45);
            if (hood) {
              col = [246, 198, 208];
              if (y < 0.87 || ax > 0.615) col = [232, 178, 190];
              if (front && ax < 0.215) {
                if ((Math.abs(y - 1.05) < 0.006 && ax < 0.125) || (Math.abs(ax - 0.125 + (1.05 - y) * 0.25) < 0.006 && y > 0.93 && y < 1.05)) col = [222, 166, 180];
                if (Math.abs(ax - 0.035) < 0.006 && y > 1.2 && y < 1.37) col = [250, 244, 244];
              }
            } else if (ax < 0.32 && y <= 0.84) {
              if (y > 0.15) { var gcol = 178 + nz * 22; col = y < 0.19 ? [150, 152, 158] : [gcol, gcol + 2, gcol + 7]; }
              else col = y < 0.028 ? [196, 196, 194] : [240, 240, 236];
            }
          }
          if (col) { R = col[0] * sh; G = col[1] * sh; B = col[2] * sh; set = true; }
          if (!set && y > 1.41 && ax < 0.3 && (hue < 50 || hue > 338) && sat > 0.72 && val > 0.45) { R = 30 * sh + 14; G = 30 * sh + 14; B = 36 * sh + 16; set = true; }
          // hair stays black: desaturate any brownish dark hair on the head
          if (!set && y > 1.40 && ax < 0.3 && lum < 0.22) { R = G = B = lum * 150; set = true; }
        }
        if (!set && !C[k] && (hue < 50 || hue > 338) && sat > 0.72 && val > 0.45) { R = 30 * sh + 14; G = 30 * sh + 14; B = 36 * sh + 16; set = true; }
        if (set) { d[o] = Math.min(255, R); d[o + 1] = Math.min(255, G); d[o + 2] = Math.min(255, B); }
      }
      cx.putImageData(id, 0, 0);
      var t = new THREE.CanvasTexture(cv); t.flipY = false; t.encoding = THREE.sRGBEncoding; t.wrapS = baseMap.wrapS; t.wrapT = baseMap.wrapT; t.anisotropy = 4;
      return t;
    }

    function setup(g, a) {
      var root = g.scene;
      root.traverse(function (o) {
        if (o.isSkinnedMesh) { mesh = o; o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; }
        if (o.isBone) bones[o.name.replace('mixamorig', '')] = o;
      });
      var old = mesh.material; baseMap = old.map;
      mat = new THREE.MeshStandardMaterial({ map: old.map, normalMap: old.normalMap, roughness: 0.66, metalness: 0, envMapIntensity: 0.85, side: THREE.DoubleSide, shadowSide: THREE.FrontSide });
      if (old.normalScale) mat.normalScale.copy(old.normalScale).multiplyScalar(0.8);
      mesh.material = mat;
      mesh.geometry.computeBoundingBox(); modelH = mesh.geometry.boundingBox.max.y - Math.min(0, mesh.geometry.boundingBox.min.y); if (!(modelH > 0.5 && modelH < 3)) modelH = 1.66;
      root.updateMatrixWorld(true);
      try { slimLegs(mesh.geometry); } catch (e) { console.warn(e); }
      ORDER.forEach(function (n) { var b = bones[n], c = bones[CHILD[n]]; if (!b || !c) return; restQ[n] = b.getWorldQuaternion(Q()); restDir[n] = c.getWorldPosition(V3()).sub(b.getWorldPosition(V3())).normalize(); });
      // retarget clips from the animation rig (same Mixamo skeleton) by bone name
      var sroot = a.scene; sroot.updateMatrixWorld(true);
      var sH = null, sB = {}; sroot.traverse(function (o) { if (o.isBone) { sB[o.name.replace('mixamorig', '')] = o; if (/Hips$/.test(o.name)) sH = sH || o; } });
      var tH = bones.Hips, Cq = tH.parent.getWorldQuaternion(Q()).invert().multiply(sH.parent.getWorldQuaternion(Q()));
      var Ms = sH.parent.matrixWorld.clone(), MtInv = tH.parent.matrixWorld.clone().invert();
      var ratio = tH.getWorldPosition(V3()).y / sH.getWorldPosition(V3()).y;
      function retarget(clip) {
        var tracks = [];
        clip.tracks.forEach(function (t) {
          var dot = t.name.lastIndexOf('.'), key = t.name.slice(0, dot).replace('mixamorig', ''), prop = t.name.slice(dot + 1), b = bones[key], i, vals;
          if (!b) return;
          if (prop === 'quaternion') {
            vals = Float32Array.from(t.values);
            var sb = sB[key]; if (!sb) return;
            var A = b.parent.getWorldQuaternion(Q()).invert().multiply(sb.parent.getWorldQuaternion(Q())), Bq = sb.getWorldQuaternion(Q()).invert().multiply(b.getWorldQuaternion(Q()));
            for (i = 0; i < vals.length; i += 4) { q1.fromArray(vals, i).premultiply(A).multiply(Bq).toArray(vals, i); }
            tracks.push(new THREE.QuaternionKeyframeTrack(b.name + '.quaternion', t.times, vals));
          } else if (prop === 'position' && key === 'Hips') {
            vals = Float32Array.from(t.values);
            for (i = 0; i < vals.length; i += 3) { v1.fromArray(vals, i).applyMatrix4(Ms); v1.x *= ratio * 0.6; v1.y *= ratio; v1.z = 0; v1.applyMatrix4(MtInv).toArray(vals, i); }
            tracks.push(new THREE.VectorKeyframeTrack(b.name + '.position', t.times, vals));
          }
        });
        return new THREE.AnimationClip(clip.name, clip.duration, tracks);
      }
      mixer = new THREE.AnimationMixer(root);
      var find = function (n) { return a.animations.filter(function (c) { return c.name.toLowerCase() === n; })[0]; };
      ['idle', 'walk', 'run'].forEach(function (n) { var c = find(n); if (!c) throw new Error('missing clip ' + n); acts[n] = mixer.clipAction(retarget(c)); acts[n].play(); acts[n].setEffectiveWeight(n === 'idle' ? 1 : 0); });
      pivot.add(root); model = root; if (ph) ph.group.visible = false;
      applyVariant(); api.ready = true;
    }
    function fail(e) { console.warn('heroine model unavailable, using procedural stand-in', e && (e.message || e.type || e)); }
    try {
      if (THREE.GLTFLoader) {
        var loader = new THREE.GLTFLoader();
        loader.load('assets/char/heroine.glb', function (g) { loader.load('assets/char/anims.glb', function (a) { try { setup(g, a); } catch (e) { fail(e); } }, undefined, fail); }, undefined, fail);
      }
    } catch (e) { fail(e); }

    var dirs = {};
    function update(dt, s) {
      if (!model) { if (ph) ph.update(dt, s); return; }
      var st = s.state, sp = s.speed || 0, k = 1 - Math.exp(-10 * dt), kp = 1 - Math.exp(-13 * dt);
      var ground = st === 'idle' || st === 'run';
      var loco = ground ? sm(0.2, 1.0, sp) : 0, rm = sm(2.3, 4.0, sp);
      w.i += ((1 - loco) - w.i) * k; w.w += (loco * (1 - rm) - w.w) * k; w.r += (loco * rm - w.r) * k;
      acts.idle.setEffectiveWeight(w.i); acts.walk.setEffectiveWeight(w.w); acts.run.setEffectiveWeight(w.r);
      acts.walk.timeScale = Math.min(1.7, Math.max(0.6, sp / 1.55)); acts.run.timeScale = Math.min(1.4, Math.max(0.75, sp / 4.5));
      mixer.update(dt);
      var ct = clamp01(s.climbT || 0);
      pw.jump += ((st === 'jump' ? 1 : 0) - pw.jump) * kp; pw.fall += ((st === 'fall' ? 1 : 0) - pw.fall) * kp;
      pw.climb += ((st === 'climb' ? 1 - sm(0.78, 1, ct) : 0) - pw.climb) * kp; pw.dead += ((st === 'dead' ? 1 : 0) - pw.dead) * (1 - Math.exp(-5 * dt));
      var W = Math.min(1, pw.jump + pw.fall + pw.climb + pw.dead);
      if (W > 0.004) {
        var cm = sm(0.3, 0.62, ct), tot = pw.jump + pw.fall + pw.climb + pw.dead;
        model.getWorldQuaternion(q3).invert();
        for (var i = 0; i < ORDER.length; i++) {
          var n = ORDER[i], b = bones[n]; if (!restQ[n]) continue;
          vd.set(0, 0, 0);
          var add = function (p, wt) { var d = POSES[p][n]; if (d && wt > 0) { v2.set(d[0], d[1], d[2]).normalize(); vd.addScaledVector(v2, wt); } };
          add('jump', pw.jump); add('fall', pw.fall); add('hang', pw.climb * (1 - cm)); add('pull', pw.climb * cm); add('dead', pw.dead);
          if (vd.lengthSq() < 1e-6) continue; vd.normalize();
          qd.setFromUnitVectors(restDir[n], vd).multiply(restQ[n]);           // desired orientation in character space
          b.parent.getWorldQuaternion(q2); q2.premultiply(q3).invert();          // parent in character space, inverted
          q2.multiply(qd);
          b.quaternion.slerp(q2, W);
        }
      }
      // body lean into turns, death collapse
      var yaw = group.rotation.y; if (prevYaw === null) prevYaw = yaw;
      var dy = Math.atan2(Math.sin(yaw - prevYaw), Math.cos(yaw - prevYaw)); prevYaw = yaw;
      var tl = ground && dt > 0 ? Math.max(-0.16, Math.min(0.16, -dy / dt * 0.022 * clamp01(sp / 4))) : 0;
      lean += (tl - lean) * (1 - Math.exp(-6 * dt));
      deadK += ((st === 'dead' ? 1 : 0) - deadK) * (1 - Math.exp(-4 * dt));
      pivot.rotation.z = lean; pivot.rotation.x = deadK * 1.47 + pw.jump * 0.06 - pw.climb * 0.05; pivot.position.y = deadK * 0.13;
    }
    applyVariant();
    return api;
  };
})();
