/* JL-TASK V — lifelike vegetation (cherry trees, bamboo). No external assets: all textures are canvas-drawn.
   Replaces ctx.nature.cherryTree / bambooCluster in extPre; originals stay in place if anything throws. */
(window.JL.extPre = window.JL.extPre || []).push(function (ctx) {
  'use strict';
  var T = ctx.THREE, M = ctx.M || {}, mkRng = ctx.rng || window.JL.rng;
  var timeU = { value: 0 };
  var TAU = Math.PI * 2;

  // ---------- geometry accumulator ----------
  function Geo(color) { this.p = []; this.n = []; this.u = []; this.c = color ? [] : null; this.i = []; }
  Geo.prototype.build = function () {
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(this.u, 2));
    if (this.c) g.setAttribute('color', new T.Float32BufferAttribute(this.c, 3));
    g.setIndex(this.i); g.computeBoundingSphere(); return g;
  };
  var _t = new T.Vector3(), _n = new T.Vector3(), _b = new T.Vector3(), _d = new T.Vector3();
  // tapered tube along pts (Vector3[]) with radii; cols optional per-ring [r,g,b]
  function tube(G, pts, rads, radial, cols) {
    var base = G.p.length / 3, len = 0, prevN = null, L = pts.length;
    for (var i = 0; i < L; i++) {
      if (i === 0) _t.subVectors(pts[1], pts[0]); else if (i === L - 1) _t.subVectors(pts[i], pts[i - 1]); else _t.subVectors(pts[i + 1], pts[i - 1]);
      _t.normalize();
      if (prevN) _n.copy(prevN).addScaledVector(_t, -prevN.dot(_t)); else { _n.set(1, 0, 0); if (Math.abs(_t.x) > 0.9) _n.set(0, 0, 1); _n.addScaledVector(_t, -_n.dot(_t)); }
      _n.normalize(); prevN = prevN || new T.Vector3(); prevN.copy(_n);
      _b.crossVectors(_t, _n);
      if (i > 0) len += pts[i].distanceTo(pts[i - 1]);
      var uRep = Math.max(1, Math.round(rads[0] * 8));
      for (var j = 0; j <= radial; j++) {
        var a = j / radial * TAU, ca = Math.cos(a), sa = Math.sin(a);
        _d.set(_n.x * ca + _b.x * sa, _n.y * ca + _b.y * sa, _n.z * ca + _b.z * sa);
        G.p.push(pts[i].x + _d.x * rads[i], pts[i].y + _d.y * rads[i], pts[i].z + _d.z * rads[i]);
        G.n.push(_d.x, _d.y, _d.z); G.u.push(j / radial * uRep, len * 0.7);
        if (G.c) { var c = cols ? cols[i] : [1, 1, 1]; G.c.push(c[0], c[1], c[2]); }
      }
    }
    var W = radial + 1;
    for (var k = 0; k < L - 1; k++) for (var m = 0; m < radial; m++) {
      var A = base + k * W + m, B = A + 1, C = A + W, D = C + 1;
      G.i.push(A, B, C, B, D, C);
    }
  }
  // textured card. c = anchor, ax/ay = unit axes, w/h size; anchored at bottom centre if bottom else centred
  function card(G, c, ax, ay, w, h, cell, cells, nrm, col, bottom, flip) {
    var k = G.p.length / 3, y0 = bottom ? 0 : -h / 2, y1 = bottom ? h : h / 2, x = w / 2;
    var cs = [[-x, y0], [x, y0], [x, y1], [-x, y1]];
    for (var i = 0; i < 4; i++) {
      G.p.push(c.x + ax.x * cs[i][0] + ay.x * cs[i][1], c.y + ax.y * cs[i][0] + ay.y * cs[i][1], c.z + ax.z * cs[i][0] + ay.z * cs[i][1]);
      G.n.push(nrm.x, nrm.y, nrm.z); G.c.push(col[0], col[1], col[2]);
    }
    var u0 = (cell + 0.004) / cells, u1 = (cell + 0.996) / cells; if (flip) { var t = u0; u0 = u1; u1 = t; }
    G.u.push(u0, 0, u1, 0, u1, 1, u0, 1);
    G.i.push(k, k + 1, k + 2, k, k + 2, k + 3);
  }

  // ---------- canvas atlases ----------
  function blossomAtlas() {
    var S = 256, N = 4, cv = document.createElement('canvas'); cv.width = S * N; cv.height = S;
    var g = cv.getContext('2d'), r = mkRng(4711);
    for (var v = 0; v < N; v++) {
      g.save(); g.translate(v * S + S / 2, S / 2);
      var ug = g.createRadialGradient(0, 0, 10, 0, 0, 112); ug.addColorStop(0, 'rgba(250,196,214,0.26)'); ug.addColorStop(0.75, 'rgba(250,196,214,0.2)'); ug.addColorStop(1, 'rgba(250,196,214,0)');
      g.fillStyle = ug; g.beginPath(); g.arc(0, 0, 114, 0, TAU); g.fill();
      // twigs
      g.strokeStyle = 'rgba(58,38,30,0.95)'; g.lineCap = 'round';
      for (var t = 0; t < 3; t++) { var a = r() * TAU, l = 60 + r() * 45; g.lineWidth = 2 + r() * 2; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(Math.cos(a + 0.4) * l * 0.5, Math.sin(a + 0.4) * l * 0.5, Math.cos(a) * l, Math.sin(a) * l); g.stroke(); }
      var count = v === 3 ? 13 : 19 + (v * 2);
      for (var b = 0; b < count; b++) {
        var an = r() * TAU, d = Math.sqrt(r()) * 90, R = 13 + r() * 9, bud = (v >= 2 && r() < 0.22);
        g.save(); g.translate(Math.cos(an) * d, Math.sin(an) * d); g.rotate(r() * TAU);
        g.shadowColor = 'rgba(110,36,66,0.45)'; g.shadowBlur = 4;
        if (bud) { g.fillStyle = 'rgb(226,120,156)'; g.beginPath(); g.ellipse(0, 0, R * 0.32, R * 0.45, 0, 0, TAU); g.fill(); g.restore(); continue; }
        var pale = r();
        for (var p = 0; p < 5; p++) {
          g.save(); g.rotate(p * TAU / 5 + (r() - 0.5) * 0.12);
          var pg = g.createLinearGradient(0, 0, 0, -R);
          pg.addColorStop(0, 'rgb(' + (236 - pale * 10 | 0) + ',' + (140 + pale * 40 | 0) + ',' + (176 + pale * 30 | 0) + ')');
          pg.addColorStop(0.55, 'rgb(' + (250) + ',' + (200 + pale * 28 | 0) + ',' + (218 + pale * 20 | 0) + ')');
          pg.addColorStop(1, 'rgb(255,' + (226 + pale * 20 | 0) + ',' + (236 + pale * 14 | 0) + ')');
          g.fillStyle = pg; g.beginPath();
          g.moveTo(0, -R * 0.08); g.bezierCurveTo(R * 0.55, -R * 0.3, R * 0.5, -R * 0.95, R * 0.1, -R); g.lineTo(0, -R * 0.88); g.lineTo(-R * 0.1, -R);
          g.bezierCurveTo(-R * 0.5, -R * 0.95, -R * 0.55, -R * 0.3, 0, -R * 0.08); g.fill();
          g.restore(); g.shadowBlur = 0;
        }
        g.fillStyle = 'rgb(196,62,104)'; g.beginPath(); g.arc(0, 0, R * 0.17, 0, TAU); g.fill();
        g.fillStyle = 'rgb(250,224,150)';
        for (var s = 0; s < 7; s++) { var sa = s / 7 * TAU + r(), sd = R * (0.22 + r() * 0.16); g.beginPath(); g.arc(Math.cos(sa) * sd, Math.sin(sa) * sd, 1.1, 0, TAU); g.fill(); }
        g.restore();
      }
      g.restore();
    }
    var tx = new T.CanvasTexture(cv); tx.encoding = T.sRGBEncoding; tx.anisotropy = 4; return tx;
  }
  function leafAtlas() {
    var S = 256, N = 4, cv = document.createElement('canvas'); cv.width = S * N; cv.height = S;
    var g = cv.getContext('2d'), r = mkRng(9173);
    for (var v = 0; v < N; v++) {
      g.save(); g.translate(v * S, 0);
      var ug = g.createRadialGradient(S / 2, S * 0.5, 10, S / 2, S * 0.5, 120); ug.addColorStop(0, 'rgba(84,122,44,0.2)'); ug.addColorStop(1, 'rgba(84,122,44,0)');
      g.fillStyle = ug; g.fillRect(0, 0, S, S);
      var bend = (r() - 0.5) * 70, tipX = S / 2 + bend, tipY = 26, cxm = S / 2 + bend * 0.2, cym = S * 0.5;
      g.strokeStyle = 'rgb(112,128,58)'; g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(S / 2, S); g.quadraticCurveTo(cxm, cym, tipX, tipY); g.stroke();
      var nl = 9 + (r() * 4 | 0);
      for (var i = 0; i < nl; i++) {
        var t = 0.22 + 0.78 * (i / (nl - 1)), it = 1 - t;
        var px = it * it * (S / 2) + 2 * it * t * cxm + t * t * tipX, py = it * it * S + 2 * it * t * cym + t * t * tipY;
        var side = (i % 2 ? 1 : -1), ang = side * (0.55 + r() * 0.75) + (r() - 0.5) * 0.3;
        if (i === nl - 1) ang = (r() - 0.5) * 0.4;
        var L = 62 + r() * 44, w = 6.5 + r() * 4.5;
        g.save(); g.translate(px, py); g.rotate(ang);
        var hue = 78 + r() * 26, lg = g.createLinearGradient(0, 0, 0, -L);
        lg.addColorStop(0, 'hsl(' + hue + ',48%,' + (24 + r() * 6) + '%)'); lg.addColorStop(1, 'hsl(' + (hue - 8) + ',52%,' + (36 + r() * 10) + '%)');
        g.fillStyle = lg; g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(w, -L * 0.25, w * 0.9, -L * 0.6, side * 5, -L); g.bezierCurveTo(-w * 0.9, -L * 0.6, -w, -L * 0.25, 0, 0); g.fill();
        g.strokeStyle = 'rgba(190,210,120,0.55)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(0, -2); g.quadraticCurveTo(side * 1, -L * 0.5, side * 4.5, -L * 0.96); g.stroke();
        g.restore();
      }
      g.restore();
    }
    var tx = new T.CanvasTexture(cv); tx.encoding = T.sRGBEncoding; tx.anisotropy = 4; return tx;
  }

  // ---------- materials (shared across all trees) ----------
  var WIND_VS = [
    '#include <begin_vertex>',
    '{ vec4 vwo = modelMatrix * vec4(0.0, 0.0, 0.0, 1.0); float vph = vwo.x * 0.37 + vwo.z * 0.53; float vh = max(position.y, 0.0);',
    '  float vsw = sin(uVegTime * 0.8 + vph) + 0.45 * sin(uVegTime * 1.9 + vph * 1.7 + position.y * 0.35);',
    '  float vsw2 = cos(uVegTime * 0.63 + vph * 1.3) + 0.4 * sin(uVegTime * 2.3 + position.y * 0.5);',
    '  transformed.x += vsw * uVegBend * vh * vh; transformed.z += vsw2 * uVegBend * vh * vh * 0.7;',
    '  float vfl = dot(position, vec3(5.3, 3.1, 4.7));',
    '  transformed += vec3(sin(uVegTime * 2.6 + vfl), sin(uVegTime * 3.1 + vfl * 1.3) * 0.6, cos(uVegTime * 2.2 + vfl * 0.7)) * uVegFlutter; }'
  ].join('\n');
  function windOnly(bend, flutter) {
    return function (shader) {
      shader.uniforms.uVegTime = timeU; shader.uniforms.uVegBend = { value: bend }; shader.uniforms.uVegFlutter = { value: flutter };
      shader.vertexShader = 'uniform float uVegTime, uVegBend, uVegFlutter;\n' + shader.vertexShader.replace('#include <begin_vertex>', WIND_VS);
    };
  }
  function foliage(bend, flutter) {
    return function (shader) {
      shader.uniforms.uVegTime = timeU; shader.uniforms.uVegBend = { value: bend }; shader.uniforms.uVegFlutter = { value: flutter };
      shader.vertexShader = 'uniform float uVegTime, uVegBend, uVegFlutter;\n' + shader.vertexShader.replace('#include <begin_vertex>', WIND_VS);
      // keep the authored (outward-bent) normals on both faces of a card
      shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>', T.ShaderChunk.normal_fragment_begin.replace('gl_FrontFacing ? 1.0 : - 1.0', '1.0'));
    };
  }
  var texB = blossomAtlas(), texL = leafAtlas();
  var matBlossom = new T.MeshStandardMaterial({ map: texB, alphaTest: 0.45, side: T.DoubleSide, vertexColors: true, roughness: 0.85, metalness: 0, emissive: 0x7a3048, emissiveMap: texB, emissiveIntensity: 0.32 });
  matBlossom.onBeforeCompile = foliage(0.0006, 0.012);
  var depBlossom = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: texB, alphaTest: 0.45, side: T.DoubleSide });
  depBlossom.onBeforeCompile = windOnly(0.0006, 0.012);
  var matLeaf = new T.MeshStandardMaterial({ map: texL, alphaTest: 0.5, side: T.DoubleSide, vertexColors: true, roughness: 0.6, metalness: 0, emissive: 0x2c4a12, emissiveMap: texL, emissiveIntensity: 0.18 });
  matLeaf.onBeforeCompile = foliage(0.0042, 0.02);
  var depLeaf = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: texL, alphaTest: 0.5, side: T.DoubleSide });
  depLeaf.onBeforeCompile = windOnly(0.0042, 0.02);
  var matCulm = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0 });
  matCulm.onBeforeCompile = windOnly(0.0042, 0.0);
  var depCulm = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking });
  depCulm.onBeforeCompile = windOnly(0.0042, 0.0);
  var matBark = M.bark || new T.MeshStandardMaterial({ color: 0x33241b, roughness: 0.95 });
  ctx.onUpdate(function (dt, time) { timeU.value = time; });

  function rndUnit(r, out) { var z = r() * 2 - 1, a = r() * TAU, s = Math.sqrt(1 - z * z); return out.set(Math.cos(a) * s, z, Math.sin(a) * s); }

  // ---------- cherry tree ----------
  function cherryTree(height, seed) {
    height = height || 6;
    var r = mkRng(((seed || 1) * 7919 + 131) >>> 0), GB = new Geo(false), GF = new Geo(true);
    var spots = [], up = new T.Vector3(0, 1, 0), maxDepth = 4;
    var radial = [8, 6, 5, 4, 3];
    function branch(p0, dir, len, rad, depth) {
      var segs = depth === 0 ? 5 : 4, pts = [p0.clone()], rads = [rad], d = dir.clone(), p = p0.clone();
      if (depth === 0) { pts[0].y = -0.15; rads[0] = rad * 1.55; }
      for (var i = 1; i <= segs; i++) {
        var wob = depth === 0 ? 0.28 : 0.42;
        d.x += (r() - 0.5) * wob; d.z += (r() - 0.5) * wob;
        d.y += (r() - 0.5) * 0.25 + (depth === 0 ? 0.12 : depth >= 3 ? -0.13 : 0.02);
        d.normalize();
        p = p.clone().addScaledVector(d, len / segs); pts.push(p);
        rads.push(rad * (1 - 0.42 * i / segs) * (depth === 0 && i === 1 ? 1.12 : 1));
        if (depth >= 3 || (depth === 2 && i >= 2)) spots.push({ p: p, n: depth >= 4 ? 4 : depth === 3 ? 3 : 2, j: depth >= 4 ? 0.38 : 0.5 });
      }
      if (depth === maxDepth) { rads[segs] = 0.006; spots.push({ p: p, n: 3, j: 0.25 }); }
      tube(GB, pts, rads, radial[depth]);
      if (depth >= maxDepth) return;
      var n = depth === 0 ? 3 + (r() < 0.55 ? 1 : 0) : 2 + (r() < 0.38 ? 1 : 0), a0 = r() * TAU;
      // perpendicular frame around d
      var e1 = new T.Vector3(1, 0, 0); if (Math.abs(d.x) > 0.85) e1.set(0, 0, 1); e1.addScaledVector(d, -e1.dot(d)).normalize();
      var e2 = new T.Vector3().crossVectors(d, e1);
      for (var c = 0; c < n; c++) {
        var a = a0 + c * TAU / n + (r() - 0.5) * 0.7, tilt = (depth === 0 ? 0.75 : 0.55) + r() * 0.45;
        var nd = new T.Vector3().copy(d).multiplyScalar(Math.cos(tilt)).addScaledVector(e1, Math.cos(a) * Math.sin(tilt)).addScaledVector(e2, Math.sin(a) * Math.sin(tilt));
        if (depth <= 1) nd.y = Math.max(nd.y, 0.12 + r() * 0.25); nd.normalize();
        var start = (c === n - 1 && depth > 0) ? pts[segs - 1 - (r() < 0.5 ? 1 : 0)] : p;
        branch(start, nd, len * (0.66 + r() * 0.2), rads[segs] * 0.82, depth + 1);
      }
    }
    branch(new T.Vector3(0, 0, 0), new T.Vector3((r() - 0.5) * 0.35, 1, (r() - 0.5) * 0.35).normalize(), height * 0.33, 0.05 + height * 0.033, 0);
    // canopy cards
    var cen = new T.Vector3(), cnt = 0; spots.forEach(function (s) { cen.add(s.p); cnt++; }); cen.multiplyScalar(1 / Math.max(1, cnt));
    var maxR = 0.01; spots.forEach(function (s) { maxR = Math.max(maxR, s.p.distanceTo(cen)); });
    var ax = new T.Vector3(), ay = new T.Vector3(), nn = new T.Vector3(), q = new T.Vector3(), cp = new T.Vector3(), tmp = new T.Vector3();
    spots.forEach(function (s) {
      for (var k = 0; k < s.n; k++) {
        cp.copy(s.p).add(rndUnit(r, tmp).multiplyScalar(s.j * (0.4 + r() * 0.8)));
        rndUnit(r, q); rndUnit(r, ax); ax.addScaledVector(q, -ax.dot(q)).normalize(); ay.crossVectors(q, ax);
        nn.subVectors(cp, cen).normalize().multiplyScalar(0.85).addScaledVector(up, 0.55).normalize();
        var out = Math.min(1, cp.distanceTo(cen) / maxR), sh = (0.5 + 0.34 * out) * (0.88 + r() * 0.2), warm = r();
        var size = 0.5 + r() * 0.5;
        card(GF, cp, ax, ay, size, size, (r() * 4) | 0, 4, nn, [sh, sh * (0.84 + warm * 0.12), sh * (0.88 + warm * 0.1)], false, r() < 0.5);
      }
    });
    var group = new T.Group();
    var wood = new T.Mesh(GB.build(), matBark); wood.castShadow = wood.receiveShadow = true; group.add(wood);
    var fol = new T.Mesh(GF.build(), matBlossom); fol.castShadow = fol.receiveShadow = true; fol.customDepthMaterial = depBlossom; group.add(fol);
    group.userData.canopy = fol; group.userData.tris = (GB.i.length + GF.i.length) / 3;
    return group;
  }

  // ---------- bamboo ----------
  function hsl(h, s, l) { var c = new T.Color().setHSL(h, s, l); return [c.r, c.g, c.b]; }
  function bambooCluster(n, radius, height, seed) {
    n = n || 14; radius = radius || 1.6; height = height || 9;
    var r = mkRng(((seed || 1) * 104729 + 71) >>> 0), GC = new Geo(true), GL = new Geo(true), up = new T.Vector3(0, 1, 0);
    var ax = new T.Vector3(), ay = new T.Vector3(), ax2 = new T.Vector3(), nn = new T.Vector3(), an = new T.Vector3();
    for (var c = 0; c < n; c++) {
      var ba = r() * TAU, bd = Math.sqrt(r()) * radius, bx = Math.cos(ba) * bd, bz = Math.sin(ba) * bd;
      var h = height * (0.68 + r() * 0.4), r0 = 0.03 + r() * 0.028 + height * 0.0012;
      var la = Math.atan2(bz, bx) + (r() - 0.5) * 1.6, lean = 0.05 + r() * 0.12, lx = Math.cos(la) * lean, lz = Math.sin(la) * lean;
      var hue = 0.2 + r() * 0.09, sat = 0.42 + r() * 0.22, lit = 0.2 + r() * 0.14;
      var cBody = hsl(hue, sat, lit), cNode = hsl(hue, sat * 0.8, lit * 0.45), cPale = hsl(hue - 0.02, sat * 0.55, lit * 1.5);
      var step = Math.max(0.38, h / 19), pts = [], rads = [], cols = [], nodes = [];
      var P = function (y) { var t = Math.max(0, y / h), k = Math.pow(t, 1.9) * h; return new T.Vector3(bx + lx * k + Math.sin(y * 0.9 + c) * 0.015, y, bz + lz * k + Math.cos(y * 0.8 + c * 2) * 0.015); };
      var R = function (y) { return r0 * (1 - 0.72 * y / h) + 0.004; };
      pts.push(P(-0.1)); rads.push(R(0) * 1.1); cols.push(cBody);
      for (var y = step * (0.5 + r() * 0.4); y < h - 0.2; y += step * (0.92 + r() * 0.16)) {
        pts.push(P(y - 0.02)); rads.push(R(y)); cols.push(cPale);
        pts.push(P(y)); rads.push(R(y) * 1.2); cols.push(cNode);
        pts.push(P(y + 0.025)); rads.push(R(y)); cols.push(cBody);
        nodes.push(y);
      }
      pts.push(P(h)); rads.push(0.004); cols.push(cBody);
      tube(GC, pts, rads, 5, cols);
      // leaf sprays on the upper part
      nodes.forEach(function (y) {
        var t = y / h; if (t < 0.36) return;
        var cnt = t > 0.6 ? 2 : (r() < 0.7 ? 1 : 0);
        for (var k = 0; k < cnt; k++) {
          var a = r() * TAU, el = 0.05 + r() * 0.55 - t * 0.25, ce = Math.cos(el);
          ay.set(Math.cos(a) * ce, Math.sin(el), Math.sin(a) * ce);
          ax.crossVectors(ay, up).normalize(); ax2.crossVectors(ay, ax).normalize();
          an.copy(P(y)).addScaledVector(ay, R(y));
          var size = (0.75 + r() * 0.6) * (1.1 - t * 0.35), sh = 0.4 + r() * 0.3, yel = r() * 0.22;
          var col = [sh * (1 + yel), sh, sh * (0.8 - yel)];
          nn.copy(ay).multiplyScalar(0.35).addScaledVector(up, 0.9).normalize();
          card(GL, an, ax, ay, size * 0.95, size, (r() * 4) | 0, 4, nn, col, true, r() < 0.5);
          card(GL, an, ax2, ay, size * 0.95, size, (r() * 4) | 0, 4, nn, col, true, r() < 0.5);
        }
      });
      // crown plume
      for (var k2 = 0; k2 < 3; k2++) {
        var a2 = r() * TAU; ay.set(Math.cos(a2) * 0.55 + lx * 4, 0.6, Math.sin(a2) * 0.55 + lz * 4).normalize(); ax.crossVectors(ay, up).normalize();
        an.copy(P(h - 0.25 * k2)); nn.set(0, 1, 0);
        var s3 = 0.8 + r() * 0.4, sh3 = 0.42 + r() * 0.25;
        card(GL, an, ax, ay, s3, s3, (r() * 4) | 0, 4, nn, [sh3 * 1.1, sh3, sh3 * 0.7], true, r() < 0.5);
      }
    }
    var group = new T.Group();
    var culms = new T.Mesh(GC.build(), matCulm); culms.castShadow = culms.receiveShadow = true; culms.customDepthMaterial = depCulm; group.add(culms);
    var leaves = new T.Mesh(GL.build(), matLeaf); leaves.castShadow = leaves.receiveShadow = true; leaves.customDepthMaterial = depLeaf; group.add(leaves);
    group.userData.tris = (GC.i.length + GL.i.length) / 3;
    return group;
  }

  // self-test before installing, so a bug leaves the originals in place
  var okC = false, okB = false;
  try { var tc = cherryTree(5, 1); okC = tc.children.length === 2 && tc.userData.tris > 100; } catch (e) { console.warn('ext_veg cherry', e); }
  try { var tb = bambooCluster(3, 1, 6, 1); okB = tb.children.length === 2 && tb.userData.tris > 100; } catch (e) { console.warn('ext_veg bamboo', e); }
  var origC = ctx.nature.cherryTree, origB = ctx.nature.bambooCluster;
  if (okC) ctx.nature.cherryTree = function (h, s) { try { return cherryTree(h, s); } catch (e) { console.warn('ext_veg cherry', e); return origC ? origC(h, s) : new T.Group(); } };
  if (okB) ctx.nature.bambooCluster = function (n, rad, h, s) { try { return bambooCluster(n, rad, h, s); } catch (e) { console.warn('ext_veg bamboo', e); return origB ? origB(n, rad, h, s) : new T.Group(); } };
  window.JL.vegStats = { cherry: okC && tc.userData.tris, bamboo3: okB && tb.userData.tris };
});
