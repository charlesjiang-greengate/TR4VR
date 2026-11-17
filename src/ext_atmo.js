/* JL-TASK W2 — atmosphere: sun glare, sun-lit dust motes, ground mist over the courts, pool splashes.
   Sources: none (all procedural, original shaders). 4 draw calls, no per-frame allocations. */
(window.JL.ext = window.JL.ext || []).push(function (ctx) {
  var T = ctx.THREE, scene = ctx.scene, cam = ctx.camera, lowQ = ctx.lowQ;
  var sunDir = new T.Vector3(-0.50, 0.80, -0.42).normalize();
  try { if (ctx.sunDir) sunDir.copy(ctx.sunDir).normalize(); } catch (e) {}
  var uTime = { value: 0 }, upd = [];

  // ---------- 1. sun glare (screen-space additive quad, occluded by colliders) ----------
  try {
    var fU = { uSun: { value: new T.Vector2() }, uVis: { value: 0 }, uAspect: { value: 1.6 } }, vis = 0, visT = 0;
    var flare = new T.Mesh(new T.PlaneGeometry(2, 2), new T.ShaderMaterial({
      uniforms: fU, transparent: true, depthTest: false, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: 'uniform vec2 uSun; uniform float uAspect; varying vec2 vP;\nvoid main(){ vP = position.xy; gl_Position = vec4(uSun + position.xy * vec2(1.1 / uAspect, 1.1), 0.0, 1.0); }',
      fragmentShader: 'uniform float uVis; varying vec2 vP;\nvoid main(){ float d = length(vP); float a = atan(vP.y, vP.x);' +
        ' float halo = exp(-d * d * 7.0) * 0.06 + exp(-d * d * 90.0) * 0.7;' +
        ' float rays = pow(abs(cos(a * 3.0)), 24.0) * exp(-d * 5.0) * 0.3 + exp(-abs(vP.y) * 60.0) * exp(-d * 3.0) * 0.14;' +
        ' float edge = 1.0 - smoothstep(0.75, 1.0, d);' +
        ' gl_FragColor = vec4(vec3(1.0, 0.78, 0.5) * (halo + rays) * edge * uVis, 1.0); }'
    }));
    flare.frustumCulled = false; flare.renderOrder = 60;
    var visNow = 0;
    flare.onBeforeRender = function (r, s, c) { fU.uVis.value = c === cam ? visNow : 0; }; // not in the water mirror pass
    scene.add(flare);
    var v3 = new T.Vector3(), cols = ctx.colliders || [];
    var blocked = function (ox, oy, oz) {
      for (var i = 0; i < cols.length; i++) {
        var b = cols[i]; if (b.off) continue;
        var t0 = 0.05, t1 = 80, a, c2, lo, hi;
        a = (b.x0 - ox) / sunDir.x; c2 = (b.x1 - ox) / sunDir.x; lo = a < c2 ? a : c2; hi = a < c2 ? c2 : a; if (lo > t0) t0 = lo; if (hi < t1) t1 = hi; if (t0 > t1) continue;
        a = (b.y0 - oy) / sunDir.y; c2 = (b.y1 - oy) / sunDir.y; lo = a < c2 ? a : c2; hi = a < c2 ? c2 : a; if (lo > t0) t0 = lo; if (hi < t1) t1 = hi; if (t0 > t1) continue;
        a = (b.z0 - oz) / sunDir.z; c2 = (b.z1 - oz) / sunDir.z; lo = a < c2 ? a : c2; hi = a < c2 ? c2 : a; if (lo > t0) t0 = lo; if (hi < t1) t1 = hi; if (t0 > t1) continue;
        return true;
      }
      return false;
    };
    upd.push(function (dt) {
      v3.copy(sunDir).multiplyScalar(400).add(cam.position).project(cam);
      var on = v3.z < 1 && Math.abs(v3.x) < 1.5 && Math.abs(v3.y) < 1.5;
      visT = 0;
      if (on) {
        var ex = Math.max(Math.abs(v3.x), Math.abs(v3.y));
        visT = (ex < 1 ? 1 : Math.max(0, 1 - (ex - 1) * 2)) * (blocked(cam.position.x, cam.position.y, cam.position.z) ? 0 : 1);
        fU.uSun.value.set(v3.x, v3.y);
      }
      vis += (visT - vis) * Math.min(1, dt * 6); visNow = vis * 0.7;
      fU.uAspect.value = cam.aspect || 1.6;
      flare.visible = vis > 0.004;
    });
  } catch (e) { console.warn('ext_atmo flare', e); }

  // ---------- 2. dust motes (GPU points wrapped around the camera, bright toward the sun) ----------
  try {
    var NM = lowQ ? 250 : 700, mp = new Float32Array(NM * 3), r = ctx.rng ? ctx.rng(4242) : Math.random;
    for (var i = 0; i < NM * 3; i++) mp[i] = r();
    var mg = new T.BufferGeometry(); mg.setAttribute('position', new T.BufferAttribute(mp, 3));
    var mU = { uTime: uTime, uSunDir: { value: sunDir }, uCam: { value: new T.Vector3() } };
    var motes = new T.Points(mg, new T.ShaderMaterial({
      uniforms: mU, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: 'uniform float uTime; uniform vec3 uSunDir; uniform vec3 uCam; varying float vA;\nvoid main(){' +
        ' vec3 box = vec3(18.0, 5.0, 18.0); vec3 s = position;' +
        ' vec3 p = s * box + vec3(sin(uTime * 0.11 + s.y * 40.0) * 0.6 + uTime * 0.05, -uTime * 0.03 + sin(uTime * 0.2 + s.x * 30.0) * 0.2, cos(uTime * 0.09 + s.x * 50.0) * 0.6);' +
        ' vec3 c = vec3(uCam.x, 2.6, uCam.z); p = mod(p - c + box * 0.5, box) - box * 0.5 + c;' +
        ' vec3 d = p - uCam; float dist = length(d); float ph = pow(max(dot(d / dist, uSunDir), 0.0), 5.0);' +
        ' vA = (0.02 + ph * 0.9) * smoothstep(0.6, 2.5, dist) * (1.0 - smoothstep(6.0, 9.0, dist));' +
        ' vec4 mv = viewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp((6.0 + s.z * 8.0) / -mv.z, 1.0, 5.0); }',
      fragmentShader: 'varying float vA;\nvoid main(){ vec2 q = gl_PointCoord - 0.5; float a = 1.0 - smoothstep(0.1, 0.5, length(q)); gl_FragColor = vec4(vec3(1.0, 0.86, 0.6) * a * vA, 1.0); }'
    }));
    motes.frustumCulled = false; motes.renderOrder = 20; scene.add(motes);
    upd.push(function () { mU.uCam.value.copy(cam.position); });
  } catch (e) { console.warn('ext_atmo motes', e); }

  // ---------- 3. ground mist (one merged mesh of soft horizontal cards) ----------
  try {
    var cards = [[26, 28, 9], [40, 27, 8], [34, 40, 10], [25, 41, 7], [43, 40, 8], [34, 23, 9], [22, 34, 7], [46, 34, 7], [29, 8, 7], [39, 9, 7], [34, 13, 8]];
    var NC = cards.length, pos = new Float32Array(NC * 12), uv = new Float32Array(NC * 8), sd = new Float32Array(NC * 4), idx = [];
    var rr = ctx.rng ? ctx.rng(909) : Math.random, cx4 = [-1, 1, 1, -1], cz4 = [-1, -1, 1, 1];
    for (var k = 0; k < NC; k++) {
      var c = cards[k], y = 0.3 + rr() * 0.35, s = rr();
      for (var j = 0; j < 4; j++) {
        pos[k * 12 + j * 3] = c[0] + cx4[j] * c[2]; pos[k * 12 + j * 3 + 1] = y; pos[k * 12 + j * 3 + 2] = c[1] + cz4[j] * c[2];
        uv[k * 8 + j * 2] = cx4[j]; uv[k * 8 + j * 2 + 1] = cz4[j]; sd[k * 4 + j] = s;
      }
      idx.push(k * 4, k * 4 + 2, k * 4 + 1, k * 4, k * 4 + 3, k * 4 + 2);
    }
    var fg = new T.BufferGeometry();
    fg.setAttribute('position', new T.BufferAttribute(pos, 3)); fg.setAttribute('uv', new T.BufferAttribute(uv, 2));
    fg.setAttribute('aSeed', new T.BufferAttribute(sd, 1)); fg.setIndex(idx);
    var mist = new T.Mesh(fg, new T.ShaderMaterial({
      uniforms: { uTime: uTime }, transparent: true, depthWrite: false, side: T.DoubleSide,
      vertexShader: 'uniform float uTime; attribute float aSeed; varying vec2 vUv; varying float vD; varying float vS;\nvoid main(){ vUv = uv; vS = aSeed;' +
        ' vec3 p = position; p.x += sin(uTime * 0.05 + aSeed * 6.283) * 2.2; p.z += cos(uTime * 0.04 + aSeed * 4.1) * 2.2;' +
        ' vD = distance(p, cameraPosition); gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }',
      fragmentShader: 'uniform float uTime; varying vec2 vUv; varying float vD; varying float vS;\nvoid main(){ float d = length(vUv);' +
        ' float w = 0.75 + 0.25 * sin(vUv.x * 5.0 + uTime * 0.07 + vS * 9.0) * sin(vUv.y * 4.0 - uTime * 0.05 + vS * 5.0);' +
        ' float a = (1.0 - smoothstep(0.15, 1.0, d)) * w * 0.16 * smoothstep(2.5, 10.0, vD);' +
        ' gl_FragColor = vec4(vec3(1.0, 0.88, 0.72) * 0.9, a); }'
    }));
    mist.frustumCulled = false; mist.renderOrder = 10; scene.add(mist);
  } catch (e) { console.warn('ext_atmo mist', e); }

  // ---------- 4. splash particles (ring buffer, ballistic motion in the vertex shader) ----------
  try {
    var NS = 48, p0 = new Float32Array(NS * 3), vel = new Float32Array(NS * 3), t0 = new Float32Array(NS), si = 0;
    for (var q = 0; q < NS; q++) t0[q] = -100;
    var sg = new T.BufferGeometry();
    var aP = new T.BufferAttribute(p0, 3), aV = new T.BufferAttribute(vel, 3), aT = new T.BufferAttribute(t0, 1);
    sg.setAttribute('position', aP); sg.setAttribute('aVel', aV); sg.setAttribute('aT0', aT);
    var splash = new T.Points(sg, new T.ShaderMaterial({
      uniforms: { uTime: uTime }, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: 'uniform float uTime; attribute vec3 aVel; attribute float aT0; varying float vA;\nvoid main(){ float age = uTime - aT0;' +
        ' vec3 p = position + aVel * age + vec3(0.0, -4.9 * age * age, 0.0);' +
        ' vA = (age > 0.0 && age < 0.8 && p.y > -0.3) ? (1.0 - age / 0.8) : 0.0;' +
        ' vec4 mv = viewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = vA > 0.0 ? clamp(26.0 / -mv.z, 1.5, 7.0) : 0.0; }',
      fragmentShader: 'varying float vA;\nvoid main(){ if (vA <= 0.0) discard; vec2 q = gl_PointCoord - 0.5; float a = 1.0 - smoothstep(0.15, 0.5, length(q)); gl_FragColor = vec4(vec3(0.75, 0.95, 1.0) * a * vA * 0.9, 1.0); }'
    }));
    splash.frustumCulled = false; splash.renderOrder = 21; scene.add(splash);
    var rs = ctx.rng ? ctx.rng(31337) : Math.random, wasIn = false, acc = 0, lx = 0, lz = 0;
    var emit = function (x, z, n, up, time) {
      for (var e = 0; e < n; e++) {
        var a = rs() * 6.283, h = 0.5 + rs() * 1.3, o = si * 3;
        p0[o] = x + Math.cos(a) * 0.2; p0[o + 1] = -0.22; p0[o + 2] = z + Math.sin(a) * 0.2;
        vel[o] = Math.cos(a) * h; vel[o + 1] = up * (0.6 + rs() * 0.6); vel[o + 2] = Math.sin(a) * h; t0[si] = time;
        si = (si + 1) % NS;
      }
      aP.needsUpdate = true; aV.needsUpdate = true; aT.needsUpdate = true;
    };
    upd.push(function (dt, time, pl) {
      if (!pl || !pl.pos) return;
      var x = pl.pos.x, z = pl.pos.z, inW = pl.pos.y < -0.3 && x > 24 && x < 44 && z > 24 && z < 44;
      if (inW) {
        var sp = Math.hypot(x - lx, z - lz) / Math.max(dt, 1e-3);
        if (!wasIn) emit(x, z, 18, 3.4, time);
        else if (sp > 1) { acc += dt; if (acc > 0.13) { acc = 0; emit(x, z, 3, 1.9, time); } }
      }
      wasIn = inW; lx = x; lz = z;
    });
  } catch (e) { console.warn('ext_atmo splash', e); }

  ctx.onUpdate(function (dt, time, pl) {
    uTime.value = time;
    for (var i = 0; i < upd.length; i++) upd[i](dt, time, pl);
  });
});
