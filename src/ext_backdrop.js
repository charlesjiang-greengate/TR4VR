/* JL-TASK B — misty karst mountain backdrop. Fully procedural (no external assets, nothing to licence).
   Replaces the flat silhouette rings in ctx.backdrop with displaced karst towers + ridges (rock/forest shading,
   aerial haze), layered mist bands, a few distant pagodas and slow bird flocks. Nothing closer than 60 m to (34,0,38).
   If anything throws, the original backdrop is left untouched. */
(window.JL.ext = window.JL.ext || []).push(function (ctx) {
  'use strict';
  var T = ctx.THREE, backdrop = ctx.backdrop; if (!T || !backdrop) return;
  var low = !!ctx.lowQ, CX = 34, CZ = 38, TAU = Math.PI * 2;
  var mk = ctx.rng || window.JL.rng;
  var sunDir = (ctx.sunDir ? ctx.sunDir.clone() : new T.Vector3(-0.5, 0.8, -0.42)).normalize();
  var uTime = { value: 0 };

  // ---- cheap JS value noise ----
  function h2(x, y) { var s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
  function vn(x, y) { var xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    var a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; }
  function fbm(x, y) { return vn(x, y) * 0.55 + vn(x * 2.1 + 5.3, y * 2.1 + 1.7) * 0.3 + vn(x * 4.3 + 9.1, y * 4.3 + 3.3) * 0.15; }

  // ---- geometry accumulator (positions are world space) ----
  var P = [], K = [], I = [];
  function vert(x, y, z, kind) { P.push(x, y, z); K.push(kind); return P.length / 3 - 1; }
  function grid(cols, rows, base, wrap) { // rows of (cols+1) verts already pushed starting at base
    var w = cols + 1;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) { var a = base + r * w + c, b = a + 1, d = a + w, e = d + 1; I.push(a, d, b, b, d, e); }
  }
  // karst tower: steep sided, rounded top, flared skirt
  function peak(px, pz, R0, H, seed) {
    var rs = low ? 10 : 16, hs = low ? 9 : 13, base = P.length / 3, sx = seed * 7.31, lean = (h2(seed, 3.3) - 0.5) * 0.25, la = h2(seed, 8.8) * TAU, pe = 3.0 + h2(seed, 5.1) * 3.5, lo = h2(seed, 1.9);
    for (var j = 0; j <= hs; j++) {
      var t = 1 - Math.pow(1 - j / hs, 1.6), prof = Math.pow(1 - Math.pow(t, pe), 0.7) * (0.72 + 0.28 * (1 - t)) * (1 + 0.13 * (Math.floor(t * 4.5 + lo) % 2)) + Math.pow(1 - t, 6) * 0.45;
      if (j === hs) prof = 0.02;
      for (var i = 0; i <= rs; i++) {
        var a = (i % rs) / rs * TAU, n = fbm(sx + Math.cos(a) * 2.5 + 3 + t * 1.3, sx * 0.3 + Math.sin(a) * 2.5 + t * 3.1);
        var r = R0 * 0.78 * prof * (0.5 + n * 1.0), y = -2 + (H + 2) * (t + (j > 0 && j < hs ? (vn(sx + a * 2, t * 5) - 0.5) * 0.05 : 0));
        var off = lean * H * t * t;
        vert(px + Math.cos(a) * r + Math.cos(la) * off, y, pz + Math.sin(a) * r + Math.sin(la) * off, 0);
      }
    }
    grid(rs, hs, base);
  }
  // continuous ridge so there are no gaps to the flat horizon
  function ridge(R, h0, h1, seed) {
    var seg = low ? 96 : 180, rows = 5, base = P.length / 3;
    for (var j = 0; j <= rows; j++) {
      var t = j / rows;
      for (var i = 0; i <= seg; i++) {
        var a = (i % seg) / seg * TAU, ca = Math.cos(a), sa = Math.sin(a);
        var hh = h0 + (h1 - h0) * Math.pow(fbm(seed + ca * 3.2 + 4, seed + sa * 3.2 + 4), 1.3) * 1.25;
        var rr = R - 26 * (1 - t) + (j > 0 ? (vn(seed + a * 9, t * 3) - 0.5) * 6 : 0);
        vert(CX + ca * rr, -2 + (hh + 2) * Math.pow(t, 0.7), CZ + sa * rr, 0);
      }
    }
    grid(seg, rows, base);
  }
  function box(cx, cy, cz, sx, sy, sz, kind) { // closed box, 8 verts
    var b = P.length / 3, x, y, z;
    for (z = -1; z <= 1; z += 2) for (y = -1; y <= 1; y += 2) for (x = -1; x <= 1; x += 2) vert(cx + x * sx / 2, cy + y * sy / 2, cz + z * sz / 2, kind);
    I.push(b, b + 2, b + 1, b + 1, b + 2, b + 3, b + 4, b + 5, b + 6, b + 5, b + 7, b + 6, b, b + 4, b + 2, b + 2, b + 4, b + 6, b + 1, b + 3, b + 5, b + 3, b + 7, b + 5, b + 2, b + 6, b + 3, b + 3, b + 6, b + 7, b, b + 1, b + 4, b + 1, b + 5, b + 4);
  }
  function roof(cx, cy, cz, w, hgt, kind) { // flared square roof: eave ring (wide, low) -> mid ring -> apex
    var b = P.length / 3, i, a;
    for (i = 0; i < 4; i++) { a = i * Math.PI / 2 + Math.PI / 4; vert(cx + Math.cos(a) * w, cy + hgt * 0.12, cz + Math.sin(a) * w, kind); }
    for (i = 0; i < 4; i++) { a = i * Math.PI / 2 + Math.PI / 4; vert(cx + Math.cos(a) * w * 0.5, cy + hgt * 0.3, cz + Math.sin(a) * w * 0.5, kind); }
    var ap = vert(cx, cy + hgt, cz, kind);
    for (i = 0; i < 4; i++) { var n = (i + 1) % 4; I.push(b + i, b + 4 + i, b + n, b + n, b + 4 + i, b + 4 + n, b + 4 + i, ap, b + 4 + n, b + i, b + n, b + 4 + i); }
  }
  function pagoda(px, py, pz, s, tiers) {
    var y = py, w = 3.2 * s;
    box(px, y + 0.6 * s, pz, w * 1.5, 1.2 * s, w * 1.5, 1); y += 1.2 * s;
    for (var k = 0; k < tiers; k++) {
      var bh = 2.3 * s * (1 - k * 0.06);
      box(px, y + bh / 2, pz, w, bh, w, 1); y += bh;
      roof(px, y - 0.15 * s, pz, w * 1.25, 1.5 * s, 2); y += 0.75 * s; w *= 0.84;
    }
    box(px, y + 1.4 * s, pz, 0.28 * s, 2.8 * s, 0.28 * s, 2);
  }

  // ---- layout: three rings of towers + ridges ----
  var rings = [
    { R: 150, n: 26, h0: 20, h1: 52, r0: 11, r1: 20, ridge: [150, 6, 20] },
    { R: 235, n: 30, h0: 45, h1: 96, r0: 16, r1: 30, ridge: [240, 16, 44] },
    { R: 330, n: 30, h0: 80, h1: 158, r0: 24, r1: 44, ridge: [338, 34, 84] }
  ];
  var rnd = mk(7741), pagodaSpots = [];
  rings.forEach(function (g, gi) {
    ridge(g.ridge[0], g.ridge[1], g.ridge[2], 11.3 + gi * 17.7);
    for (var i = 0; i < g.n; i++) {
      var a = (i + rnd() * 0.8) / g.n * TAU, R = g.R + (rnd() - 0.5) * 50, H = g.h0 + (g.h1 - g.h0) * Math.pow(rnd(), 1.4), r0 = g.r0 + (g.r1 - g.r0) * rnd();
      r0 *= 0.75 + H / g.h1 * 0.45;
      if (gi === 0) R = Math.max(R, 64 + r0 * 2.5); // keep skirts > 60 m from the map centre
      var px = CX + Math.cos(a) * R, pz = CZ + Math.sin(a) * R;
      peak(px, pz, r0, H, i * 3.17 + gi * 51.3);
      if (rnd() < 0.75) peak(px + (rnd() - 0.5) * r0 * 2.2, pz + (rnd() - 0.5) * r0 * 2.2, r0 * 0.6, H * (0.5 + rnd() * 0.4), i * 5.9 + gi * 13.1 + 200);
      if (gi < 2) pagodaSpots.push({ x: px, z: pz, R: R, H: H, r0: r0, a: a, gi: gi });
    }
  });
  for (var m = 0; m < (low ? 9 : 16); m++) {
    var ma = (m + rnd() * 0.7) / (low ? 9 : 16) * TAU, mr = 10 + rnd() * 6, mR = Math.max(104 + rnd() * 26, 64 + mr * 2.5);
    peak(CX + Math.cos(ma) * mR, CZ + Math.sin(ma) * mR, mr, 6 + rnd() * 9, 500 + m * 2.3);
  }
  // pagodas on low hills / shoulders in front of the towers, spread around the compass
  var want = [0.35, 1.6, 2.75, 3.9, 4.6, 5.6], used = 0;
  want.forEach(function (wa, wi) {
    var best = null, bd = 9;
    pagodaSpots.forEach(function (s) { var d = Math.abs(((s.a - wa + Math.PI * 3) % TAU) - Math.PI); if (s.gi === (wi % 2) && d < bd) { bd = d; best = s; } });
    if (!best) return;
    var R = best.R - best.r0 * 0.95 - 4, x = CX + Math.cos(best.a + 0.05) * R, z = CZ + Math.sin(best.a + 0.05) * R, hill = best.gi ? 22 : 10, s = best.gi ? 2.3 : 1.35;
    R = Math.max(R, 64 + 9 * s * 2.5);
    peak(x, z, 9 * s, hill, 900 + wi * 7.7);
    pagoda(x, hill * 0.86, z, s, wi % 3 === 0 ? 5 : 4); used++;
  });

  var geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(P, 3));
  geo.setAttribute('aKind', new T.Float32BufferAttribute(K, 1));
  geo.setIndex(I); geo.computeVertexNormals(); geo.computeBoundingSphere();

  var NOISE = 'float h1(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }' +
    'float vn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x),f.y); }' +
    'float fbm(vec2 p){ return vn(p)*.5+vn(p*2.07+3.1)*.3+vn(p*4.3+7.7)*.2; }';
  var HAZE = 'vec3 hazeCol(vec3 rd){ float s=max(dot(normalize(rd.xz),normalize(uSun.xz)),0.); return mix(vec3(0.29,0.36,0.47),vec3(0.82,0.52,0.33),pow(s,2.5)*0.85); }';

  var mat = new T.ShaderMaterial({
    uniforms: { uSun: { value: sunDir }, uC: { value: new T.Vector3(CX, 0, CZ) } },
    vertexShader: 'attribute float aKind; varying vec3 vW; varying vec3 vN; varying float vK;' +
      'void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); vK=aKind; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: 'uniform vec3 uSun; uniform vec3 uC; varying vec3 vW; varying vec3 vN; varying float vK;' + NOISE + HAZE +
      'void main(){ vec3 n=normalize(vN); vec3 rel=vW-uC; float d=length(rel.xz);' +
      ' float ang=atan(rel.z,rel.x)*d*0.06;' +
      ' float nz=fbm(vW.xz*0.07+vW.y*0.03), fine=fbm(vec2(ang*1.7,vW.y*0.22)), streak=fbm(vec2(ang*2.6,vW.y*0.035));' +
      ' vec3 rock=mix(vec3(0.15,0.145,0.14),vec3(0.36,0.33,0.29),streak); rock*=0.6+0.75*fine; rock*=0.6+0.8*fbm(vec2(ang*7.,vW.y*0.03+3.)); rock=mix(rock,vec3(0.12,0.12,0.11),smoothstep(0.62,0.8,fbm(vec2(ang*5.,vW.y*0.05)))*0.6);' +
      ' vec3 forest=mix(vec3(0.045,0.07,0.04),vec3(0.10,0.125,0.065),nz); forest*=0.5+1.0*fine; forest*=0.75+0.5*smoothstep(0.35,0.7,fbm(vW.xz*0.25+vW.y*0.2));' +
      ' float fm=smoothstep(0.50,0.72,n.y+(nz-0.5)*0.4+(fine-0.5)*0.3); fm=max(fm,smoothstep(0.62,0.8,fbm(vec2(ang*1.3,vW.y*0.16)+4.))*0.55);' +
      ' vec3 alb=mix(rock,forest,fm);' +
      ' if(vK>0.5) alb=vK>1.5?vec3(0.07,0.085,0.08):mix(vec3(0.30,0.07,0.04),vec3(0.42,0.33,0.24),step(0.5,fract(vW.y*0.5))*0.0+0.15);' +
      ' float dif=max(dot(n,uSun),0.); float wrap=max(dot(n,uSun)*0.5+0.5,0.);' +
      ' vec3 col=alb*(vec3(1.9,1.25,0.78)*dif+vec3(0.22,0.30,0.42)*(0.45+0.55*n.y)+vec3(0.20,0.14,0.09)*wrap);' +
      ' float hz=1.-exp(-max(d-60.,0.)*0.0060)+smoothstep(190.,340.,d)*0.12; hz=mix(hz,1.,(1.-smoothstep(-2.,22.+d*0.08,vW.y))*0.6); hz=clamp(hz,0.,0.96);' +
      ' vec3 hc=hazeCol(rel); hc=mix(hc,hc*1.25+vec3(0.06,0.05,0.04),1.-smoothstep(0.,40.+d*0.12,vW.y));' +
      ' gl_FragColor=vec4(mix(col,hc,hz),1.); }'
  });
  var terrain = new T.Mesh(geo, mat); terrain.frustumCulled = false; terrain.matrixAutoUpdate = false;

  // ---- layered mist bands (inside-facing open cylinders, drifting noise alpha) ----
  var mistMat = function (seed, alpha, speed) {
    return new T.ShaderMaterial({
      transparent: true, depthWrite: false, side: T.BackSide,
      uniforms: { uSun: { value: sunDir }, uTime: uTime, uSeed: { value: seed }, uA: { value: alpha }, uSp: { value: speed } },
      vertexShader: 'varying vec2 vU; varying vec3 vR; void main(){ vU=uv; vR=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform vec3 uSun; uniform float uTime,uSeed,uA,uSp; varying vec2 vU; varying vec3 vR;' + NOISE + HAZE +
        'void main(){ float x=vU.x*26.+uTime*uSp+uSeed; float n=fbm(vec2(x,vU.y*2.2+uSeed))*0.65+fbm(vec2(x*2.3+9.,vU.y*5.-uTime*uSp*0.5))*0.35;' +
        ' float seam=smoothstep(0.,0.03,vU.x)*smoothstep(1.,0.97,vU.x);' +
        ' float a=smoothstep(0.30,0.72,n)*pow(1.-vU.y,1.6)*smoothstep(0.,0.06,vU.y)*uA; a=mix(a,max(a,uA*0.55*(1.-vU.y)*(1.-vU.y)),0.7)*mix(0.75,1.,seam);' +
        ' vec3 c=hazeCol(vR)*1.3+vec3(0.07,0.065,0.07); gl_FragColor=vec4(c,a); }'
    });
  };
  var mists = [];
  [[352, 0, 70, 0.5, 0.010, -3], [262, 0, 46, 0.55, 0.016, -4], [178, 0, 30, 0.55, 0.022, -5], [104, 0, 14, 0.4, 0.030, -6]].forEach(function (m, i) {
    var g = new T.CylinderGeometry(m[0], m[0], m[2], low ? 48 : 96, 1, true); g.translate(0, m[1] + m[2] / 2 - 2, 0);
    var mesh = new T.Mesh(g, mistMat(i * 13.7 + 2, m[3], m[4])); mesh.position.set(CX, 0, CZ); mesh.renderOrder = m[5]; mesh.frustumCulled = false; mists.push(mesh);
  });

  // ---- slow birds: all motion in the vertex shader ----
  var bp = [], bo = [], bw = [], br = mk(9917), flocks = low ? 2 : 4, per = 7;
  for (var f = 0; f < flocks; f++) {
    var fr = 78 + br() * 70, fh = 30 + br() * 30, fph = br() * TAU, fsp = (0.022 + br() * 0.02) * (f % 2 ? -1 : 1);
    for (var b = 0; b < per; b++) {
      var row = Math.ceil(b / 2), side = b % 2 ? 1 : -1, ph = fph - row * 0.035 * (fsp > 0 ? 1 : -1), rr = fr + side * row * 2.6 + (br() - 0.5), hh = fh + (br() - 0.5) * 1.5, flap = br() * TAU, sz = 1.25 + br() * 0.5;
      // two wing triangles + body sliver; position = local (x: along wing, z: along flight), y unused; aW = tip weight
      var tri = [[0, 0.35, 0], [0, -0.45, 0], [-1.5, -0.1, 1], [0, 0.35, 0], [1.5, -0.1, 1], [0, -0.45, 0], [-0.1, 0.75, 0], [0.1, 0.75, 0], [0, -0.9, 0]];
      for (var k = 0; k < tri.length; k++) { bp.push(tri[k][0] * sz, 0, tri[k][1] * sz); bw.push(tri[k][2]); bo.push(rr, hh, ph, fsp + flap * 1e-6 + 0, flap); }
    }
  }
  var bg = new T.BufferGeometry();
  bg.setAttribute('position', new T.Float32BufferAttribute(bp, 3));
  bg.setAttribute('aW', new T.Float32BufferAttribute(bw, 1));
  var boA = new Float32Array(bo.length / 5 * 4), flA = new Float32Array(bo.length / 5);
  for (var q = 0; q < flA.length; q++) { boA[q * 4] = bo[q * 5]; boA[q * 4 + 1] = bo[q * 5 + 1]; boA[q * 4 + 2] = bo[q * 5 + 2]; boA[q * 4 + 3] = bo[q * 5 + 3]; flA[q] = bo[q * 5 + 4]; }
  bg.setAttribute('aO', new T.BufferAttribute(boA, 4)); bg.setAttribute('aF', new T.BufferAttribute(flA, 1));
  var birdMat = new T.ShaderMaterial({
    side: T.DoubleSide, uniforms: { uTime: uTime, uC: { value: new T.Vector3(CX, 0, CZ) } },
    vertexShader: 'attribute float aW,aF; attribute vec4 aO; uniform float uTime; uniform vec3 uC;' +
      'void main(){ float a=aO.z+uTime*aO.w; vec2 rad=vec2(cos(a),sin(a)); vec2 fwd=vec2(-rad.y,rad.x)*sign(aO.w);' +
      ' float cyc=uTime*3.1+aF; float glide=smoothstep(-0.2,0.5,sin(uTime*0.23+aF*1.7)); float fl=sin(cyc)*glide+0.25*(1.-glide);' +
      ' vec3 p=uC+vec3(rad.x*aO.x,aO.y+sin(uTime*0.11+aF)*2.,rad.y*aO.x);' +
      ' p.xz+=rad*position.x*(1.-0.25*aW*fl*fl)+fwd*position.z; p.y+=aW*fl*1.05-0.1*fl;' +
      ' gl_Position=projectionMatrix*viewMatrix*vec4(p,1.); }',
    fragmentShader: 'void main(){ gl_FragColor=vec4(0.045,0.05,0.06,1.); }'
  });
  var birds = new T.Mesh(bg, birdMat); birds.frustumCulled = false;

  // ---- swap in (only after everything above succeeded) ----
  for (var c = backdrop.children.length - 1; c >= 0; c--) { var ch = backdrop.children[c]; backdrop.remove(ch); if (ch.geometry) ch.geometry.dispose(); if (ch.material && ch.material.dispose) ch.material.dispose(); }
  backdrop.add(terrain); mists.forEach(function (m) { backdrop.add(m); }); backdrop.add(birds);
  if (ctx.onUpdate) ctx.onUpdate(function (dt, time) { uTime.value = time; });
  window.JL.backdropInfo = { tris: I.length / 3, pagodas: used };
});
