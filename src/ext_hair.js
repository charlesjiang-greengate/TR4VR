/* ext_hair.js: the sisters' own hairstyles.
   elder:   centre parting, two plaits behind the ears tied with white lace ribbons
   younger: centre parting, two buns high on the head, each with a green flower clip
   Removes the stock ponytail (folded into the skull), the elder's bang cards and lip ring, then adds new hair as skinned
   meshes on the character's own skeleton, so plaits follow head, neck and chest. Coordinates below are the model's
   bind-space units (metres, Z up, -Y = facing direction, X = sideways), the same space the head mesh is authored in.
   Called by heroine2.js as window.JL_HAIR(name, root, THREE) after the model is built. */
(function () {
  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

  function partMeshes(root) {
    var r = {};
    root.traverse(function (o) { if (o.isSkinnedMesh && o.userData.part) r[o.userData.part] = o; });
    return r;
  }

  // fold ponytail / piercing vertices into the skull so they disappear
  function collapse(mesh, test) {
    var g = mesh.geometry, P = g.attributes.position, UV = g.attributes.uv, n = 0, cx = 0, cy = 0, cz = 0, zmax = -1e9, i;
    for (i = 0; i < P.count; i++) zmax = Math.max(zmax, P.getZ(i));
    for (i = 0; i < P.count; i++) if (P.getZ(i) > zmax - 0.12) { cx += P.getX(i); cy += P.getY(i); cz += P.getZ(i); n++; }
    cx /= n; cy /= n; cz /= n; var hit = 0, gone = new Uint8Array(P.count), tag;
    for (i = 0; i < P.count; i++) {
      tag = test(P.getX(i), P.getY(i), P.getZ(i), UV.getX(i) * 1024, UV.getY(i) * 1024);
      if (tag) gone[i] = tag === 'tail' ? 2 : 1;
    }
    // the opening the ponytail plugged: scalp vertices that sit exactly where a removed ponytail vertex was
    // (the mesh is split along texture seams, so the two parts share positions, not vertices)
    var key = function (k) { return Math.round(P.getX(k) * 2e3) + ',' + Math.round(P.getY(k) * 2e3) + ',' + Math.round(P.getZ(k) * 2e3); };
    var tailPos = {}, hole = [0, 0, 0], hn = 0;
    for (i = 0; i < P.count; i++) if (gone[i] === 2) tailPos[key(i)] = 1;
    for (i = 0; i < P.count; i++) if (!gone[i] && tailPos[key(i)] && P.getZ(i) > cz - 0.09) { hole[0] += P.getX(i); hole[1] += P.getY(i); hole[2] += P.getZ(i); hn++; }
    hole = hn ? hole.map(function (q) { return q / hn; }) : null;
    for (i = 0; i < P.count; i++) if (gone[i]) { P.setXYZ(i, cx, cy, cz); hit++; }
    P.needsUpdate = true; g.computeBoundingSphere();
    return { hit: hit, centre: [cx, cy, cz], top: zmax, hole: hole };
  }

  // geometry builder with per-vertex skinning to up to two bones
  function Builder() { this.p = []; this.n = []; this.c = []; this.si = []; this.sw = []; this.ix = []; }
  Builder.prototype.ellipsoid = function (cx, cy, cz, rx, ry, rz, col, bones, wts, seg, rot) {
    seg = seg || 10; var b = this.p.length / 3, i, j;
    var ca = rot ? Math.cos(rot[0]) : 1, sa = rot ? Math.sin(rot[0]) : 0;   // rotation about X (tilt forward/back)
    var cb = rot ? Math.cos(rot[1]) : 1, sb = rot ? Math.sin(rot[1]) : 0;   // then about Y (lean sideways)
    for (i = 0; i <= seg; i++) {
      var th = Math.PI * i / seg;
      for (j = 0; j <= seg; j++) {
        var ph = 2 * Math.PI * j / seg, nx = Math.sin(th) * Math.cos(ph), ny = Math.sin(th) * Math.sin(ph), nz = Math.cos(th);
        var x = nx * rx, y = ny * ry, z = nz * rz;
        var y2 = y * ca - z * sa, z2 = y * sa + z * ca; var x3 = x * cb + z2 * sb, z3 = -x * sb + z2 * cb;
        var mx = nx / rx, my = ny / ry, mz = nz / rz, my2 = my * ca - mz * sa, mz2 = my * sa + mz * ca, mx3 = mx * cb + mz2 * sb, mz3 = -mx * sb + mz2 * cb;
        var l = Math.hypot(mx3, my2, mz3) || 1;
        this.p.push(cx + x3, cy + y2, cz + z3); this.n.push(mx3 / l, my2 / l, mz3 / l); this.c.push(col[0], col[1], col[2]);
        this.si.push(bones[0], bones[1] || 0, 0, 0); this.sw.push(wts[0], wts[1] || 0, 0, 0);
      }
    }
    for (i = 0; i < seg; i++) for (j = 0; j < seg; j++) {
      var a = b + i * (seg + 1) + j, d = a + seg + 1;
      this.ix.push(a, d, a + 1, a + 1, d, d + 1);
    }
  };
  Builder.prototype.mesh = function (THREE, skeleton, bindMatrix, mat) {
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.sw, 4));
    g.setIndex(this.ix);
    var m = new THREE.SkinnedMesh(g, mat); m.bind(skeleton, bindMatrix);
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; return m;
  }

  // points along a Catmull-Rom path
  function path(pts, n) {
    var out = [];
    for (var k = 0; k < n; k++) {
      var t = k / (n - 1) * (pts.length - 1), i = Math.min(Math.floor(t), pts.length - 2), f = t - i;
      var p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, pts.length - 1)], o = [];
      for (var d = 0; d < 3; d++) o.push(0.5 * ((2 * p1[d]) + (-p0[d] + p2[d]) * f + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * f * f + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * f * f * f));
      out.push(o);
    }
    return out;
  }

  window.JL_HAIR = function (name, root, THREE) {
    var parts = partMeshes(root), head = parts.head; if (!head) return;
    var sk = head.skeleton, bi = {};
    sk.bones.forEach(function (b, i) { var m = b.name.match(/_(Head|Neck|Spine2|Spine1)$/); if (m) bi[m[1]] = i; });
    if (bi.Head === undefined) return;
    var HEAD = bi.Head, NECK = bi.Neck !== undefined ? bi.Neck : HEAD, CHEST = bi.Spine2 !== undefined ? bi.Spine2 : NECK;

    // remove stock ponytail (+ its tie) and, on the elder, the lip ring; hide the elder's bang cards
    var info = collapse(head, function (x, y, z, u, v) {
      if (u > 500 && v > 640 && y > 0.06) return 'tail';                       // ponytail strands + tie
      if (name === 'elder' && u > 325 && u < 420 && v > 815 && v < 910) return 'ring'; // lip ring
      return false;
    });
    if (parts.hair) parts.hair.visible = false;
    var C = info.centre, TOP = info.top, H = TOP - C[2];                      // H: skull-top above the skull centre

    var hairCol = [0.045, 0.035, 0.03], b = new Builder(), rnd = rng(name === 'elder' ? 7 : 11);
    var hairMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0, envMapIntensity: 0.9 });
    if (info.hole) {   // close the opening where the stock ponytail used to join the skull: hair gathered at the back
      var hl = info.hole;
      b.ellipsoid(hl[0], hl[1] - 0.004, hl[2], 0.03, 0.016, 0.03, hairCol, [HEAD], [1], 12);
    }

    if (name === 'elder') {
      // two plaits: from behind each ear, down the back of the neck, over the trapezius to the shoulder blades
      [-1, 1].forEach(function (s) {
        var pts = [[s * 0.05, C[1] + 0.07, C[2] - 0.035], [s * 0.062, C[1] + 0.088, C[2] - 0.1], [s * 0.072, C[1] + 0.098, C[2] - 0.18],
          [s * 0.08, C[1] + 0.106, C[2] - 0.27], [s * 0.084, C[1] + 0.11, C[2] - 0.35]];
        var pp = path(pts, 30);
        for (var k = 0; k < pp.length; k++) {
          var p = pp[k], t = k / (pp.length - 1), r = 0.0145 - 0.004 * t, z = p[2];
          // skin: top on the head, then the neck, then the chest
          var wH = Math.min(1, Math.max(0, (z - (C[2] - 0.12)) / 0.06)), wC = Math.min(1, Math.max(0, ((C[2] - 0.2) - z) / 0.08));
          var bones = wC > 0 ? [CHEST, NECK] : [HEAD, NECK], w = wC > 0 ? [wC, 1 - wC] : [wH, 1 - wH];
          var side = (k % 2 ? 1 : -1) * r * 0.35, sh = 0.85 + rnd() * 0.3;
          b.ellipsoid(p[0] + side, p[1], p[2], r * 0.85, r * 0.75, r * 1.3, [hairCol[0] * sh, hairCol[1] * sh, hairCol[2] * sh], bones, w, 8, [0, (k % 2 ? 1 : -1) * 0.45]);
          if (k % 2 === 0) b.ellipsoid(p[0], p[1] + 0.002, p[2], r * 0.7, r * 0.7, r * 1.4, hairCol, bones, w, 6);   // core fills the gaps
        }
        var e = pp[pp.length - 1];
        b.ellipsoid(e[0], e[1] + 0.005, e[2] - 0.03, 0.011, 0.01, 0.025, hairCol, [CHEST], [1], 8);   // loose tuft
        // white lace ribbon bow at the tie
        var ry = e[1] + 0.012, rz = e[2] - 0.008, white = [0.92, 0.92, 0.9];
        b.ellipsoid(e[0] - 0.018, ry, rz + 0.004, 0.017, 0.006, 0.011, white, [CHEST], [1], 8, [0, 0.5]);
        b.ellipsoid(e[0] + 0.018, ry, rz + 0.004, 0.017, 0.006, 0.011, white, [CHEST], [1], 8, [0, -0.5]);
        b.ellipsoid(e[0] - 0.008, ry, rz - 0.02, 0.006, 0.004, 0.02, white, [CHEST], [1], 6, [0, 0.3]);
        b.ellipsoid(e[0] + 0.008, ry, rz - 0.02, 0.006, 0.004, 0.02, white, [CHEST], [1], 6, [0, -0.3]);
      });
    } else {
      // two buns high on the head, slightly towards the sides, with flower clips facing forward
      [-1, 1].forEach(function (s) {
        var bx = s * 0.044, by = C[1] + 0.005, bz = TOP - 0.036;
        for (var k = 0; k < 7; k++) {                                         // twisted coil = a few offset lobes
          var a = k / 7 * Math.PI * 2, sh = 0.85 + rnd() * 0.3;
          b.ellipsoid(bx + Math.cos(a) * 0.012, by + Math.sin(a) * 0.012, bz + 0.012 + (k % 2) * 0.004, 0.018, 0.018, 0.016, [hairCol[0] * sh, hairCol[1] * sh, hairCol[2] * sh], [HEAD], [1], 8);
        }
        b.ellipsoid(bx, by, bz + 0.016, 0.024, 0.024, 0.021, hairCol, [HEAD], [1], 10);
        // flower clip: five yellow-green petals and a pearl, on the front-outer side of the bun
        var fx = bx + s * 0.016, fy = by - 0.02, fz = bz + 0.01, petal = [0.62, 0.78, 0.32];
        for (var q = 0; q < 5; q++) {
          var ang = q / 5 * Math.PI * 2 + 0.3;
          b.ellipsoid(fx + Math.cos(ang) * 0.0065, fy - 0.004, fz + Math.sin(ang) * 0.0065, 0.0055, 0.0022, 0.0045, petal, [HEAD], [1], 6, [0, -ang]);
        }
        b.ellipsoid(fx, fy - 0.006, fz, 0.003, 0.003, 0.003, [0.95, 0.94, 0.88], [HEAD], [1], 6);
      });
    }
    var hm = b.mesh(THREE, sk, head.bindMatrix, hairMat); hm.userData.part = 'newhair';
    head.parent.add(hm);
    return { collapsed: info.hit, hole: info.hole && info.hole.map(function (q) { return +q.toFixed(3); }), centre: C.map(function (q) { return +q.toFixed(3); }), top: +TOP.toFixed(3) };
  };
})();
