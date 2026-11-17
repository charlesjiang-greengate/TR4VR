// JL-TASK P — Prop realism: carved stone / aged bronze / aged gold for stoneLantern, guardianLion, dragonIdol,
// brazier, pedestal. Wraps the existing builders (userData + footprint untouched), swaps their shared stone / gold /
// bronze materials for object-space triplanar PBR materials and adds a few bevel / bead mouldings.
// Assets (all CC0, Poly Haven, 1k JPG, https://polyhaven.com/license):
//   assets/props/stone_{d,n,r}.jpg  <- https://polyhaven.com/a/marble_rock_01   (diff / nor_gl / rough, re-encoded)
//   assets/props/metal_{d,n,r}.jpg  <- https://polyhaven.com/a/green_metal_rust (diff / nor_gl / rough)
// A failed texture load leaves 1x1 neutral fallbacks in place: props keep plain tinted PBR and the game keeps working.
(function () {
  window.JL = window.JL || {};
  (window.JL.extPre = window.JL.extPre || []).push(function (ctx) {
    try {
      var T = ctx.THREE, M = ctx.M || {}, arch = ctx.arch || {}, nature = ctx.nature || {};
      var aniso = 4;
      try { aniso = Math.min(4, ctx.renderer.capabilities.getMaxAnisotropy()); } catch (e) { }

      // ---------- textures (1x1 fallbacks until / unless the real ones arrive) ----------
      var px = function (r, g, b) { var t = new T.DataTexture(new Uint8Array([r, g, b, 255]), 1, 1, T.RGBAFormat); t.needsUpdate = true; return t; };
      var mkSet = function (name) {
        var set = { d: { value: px(255, 255, 255) }, n: { value: px(128, 128, 255) }, r: { value: px(150, 150, 150) }, users: [] };
        var loader = new T.TextureLoader();
        var load = function (suffix, slot, srgb) {
          try {
            loader.load('assets/props/' + name + '_' + suffix + '.jpg', function (tx) {
              try {
                tx.wrapS = tx.wrapT = T.RepeatWrapping; tx.anisotropy = aniso;
                if (srgb) tx.encoding = T.sRGBEncoding;
                tx.needsUpdate = true; set[slot].value = tx;
                if (slot === 'd') for (var i = 0; i < set.users.length; i++) set.users[i]();
              } catch (e) { console.warn('ext_props tex', e); }
            }, undefined, function () { console.warn('ext_props: texture missing', name, suffix); });
          } catch (e) { console.warn('ext_props load', e); }
        };
        load('d', 'd', true); load('n', 'n', false); load('r', 'r', false);
        return set;
      };
      var stoneSet = mkSet('stone'), metalSet = mkSet('metal');

      // ---------- triplanar standard material ----------
      var HEAD_V = 'varying vec3 vJlP;\nvarying vec3 vJlN;\n';
      var HEAD_F = [
        'varying vec3 vJlP;', 'varying vec3 vJlN;',
        'uniform sampler2D jlD;', 'uniform sampler2D jlN;', 'uniform sampler2D jlR;',
        'uniform vec4 jlPar;',   // x: repeats per metre, y: normal strength, z: moss / patina amount, w: 0 stone, 1 metal
        'uniform vec3 jlTint;',  // stone: albedo tint; metal: x = luminance gain
        'uniform vec3 jlAlt;',   // moss / patina colour
        'uniform mat3 normalMatrix;', ''
      ].join('\n');
      var MAP_F = [
        '#include <map_fragment>',
        'vec3 jlNo = normalize(vJlN);',
        'vec3 jlW = pow(abs(jlNo), vec3(4.0)); jlW /= (jlW.x + jlW.y + jlW.z + 1e-5);',
        'vec3 jlQ = vJlP * jlPar.x;',
        'vec3 jlC = texture2D(jlD, jlQ.zy).rgb * jlW.x + texture2D(jlD, jlQ.xz).rgb * jlW.y + texture2D(jlD, jlQ.xy).rgb * jlW.z;',
        'float jlRo = texture2D(jlR, jlQ.zy).g * jlW.x + texture2D(jlR, jlQ.xz).g * jlW.y + texture2D(jlR, jlQ.xy).g * jlW.z;',
        'float jlLum = dot(jlC, vec3(0.3333));',
        'float jlBl = 0.5 + 0.25 * sin(vJlP.x * 5.1 + vJlP.y * 3.3) * sin(vJlP.z * 4.7 - vJlP.y * 2.9) + 0.25 * sin(vJlP.y * 9.0 + vJlP.x * 4.0) * sin(vJlP.z * 8.3 + 1.7);',
        'float jlUp = max(jlNo.y, 0.0);',
        'float jlPat;',
        'if (jlPar.w < 0.5) {',
        '  jlPat = jlPar.z * smoothstep(0.50, 0.82, jlBl * 0.55 + jlUp * 0.45 + (0.5 - jlLum) * 0.5);',
        '  vec3 a = diffuseColor.rgb * jlC * jlTint;',
        '  a *= mix(0.62, 1.0, smoothstep(0.0, 0.3, vJlP.y));',            // ground grime
        '  a *= mix(1.0, 0.8, smoothstep(0.2, 0.9, 1.0 - jlUp) * jlBl);',    // rain streak darkening on sides
        '  diffuseColor.rgb = mix(a, jlAlt * (0.6 + 0.8 * jlLum), jlPat);',
        '} else {',
        '  float d = clamp(jlLum * jlTint.x, 0.35, 1.35);',
        '  jlPat = jlPar.z * smoothstep(0.42, 0.80, jlBl * 0.7 + jlUp * 0.2 + (jlRo - 0.5) * 0.9 + (1.0 - d) * 0.35);',
        '  diffuseColor.rgb = mix(diffuseColor.rgb * mix(0.55, 1.1, d), jlAlt * (0.7 + 0.5 * d), jlPat);',
        '}'
      ].join('\n');
      var ROUGH_F = 'float roughnessFactor = clamp(mix(roughness * (0.45 + 0.85 * jlRo), 0.93, jlPat * 0.85), 0.06, 1.0);';
      var METAL_F = 'float metalnessFactor = metalness * (1.0 - 0.88 * jlPat);';
      var NORM_F = [
        '#include <normal_fragment_maps>',
        '{',
        '  vec3 tx = texture2D(jlN, jlQ.zy).xyz * 2.0 - 1.0;',
        '  vec3 ty = texture2D(jlN, jlQ.xz).xyz * 2.0 - 1.0;',
        '  vec3 tz = texture2D(jlN, jlQ.xy).xyz * 2.0 - 1.0;',
        '  tx.xy *= jlPar.y; ty.xy *= jlPar.y; tz.xy *= jlPar.y;',
        '  vec3 nX = vec3(tx.xy + jlNo.zy, abs(tx.z) * jlNo.x);',
        '  vec3 nY = vec3(ty.xy + jlNo.xz, abs(ty.z) * jlNo.y);',
        '  vec3 nZ = vec3(tz.xy + jlNo.xy, abs(tz.z) * jlNo.z);',
        '  vec3 jlNn = normalize(nX.zyx * jlW.x + nY.xzy * jlW.y + nZ.xyz * jlW.z);',
        '  normal = normalize(normalMatrix * jlNn);',
        '  #ifdef DOUBLE_SIDED',
        '    normal *= faceDirection;',
        '  #endif',
        '}'
      ].join('\n');

      var triMat = function (set, o) {
        var m = new T.MeshStandardMaterial({ color: o.color, roughness: o.roughness, metalness: o.metalness, side: o.side || T.FrontSide });
        var u = {
          jlD: set.d, jlN: set.n, jlR: set.r,
          jlPar: { value: new T.Vector4(o.scale, o.normal, o.alt, o.metal ? 1 : 0) },
          jlTint: { value: new T.Vector3(1, 1, 1) },
          jlAlt: { value: new T.Vector3(o.altColor[0], o.altColor[1], o.altColor[2]) }
        };
        set.users.push(function () { u.jlTint.value.set(o.tint[0], o.tint[1], o.tint[2]); });
        m.onBeforeCompile = function (sh) {
          sh.uniforms.jlD = u.jlD; sh.uniforms.jlN = u.jlN; sh.uniforms.jlR = u.jlR;
          sh.uniforms.jlPar = u.jlPar; sh.uniforms.jlTint = u.jlTint; sh.uniforms.jlAlt = u.jlAlt;
          sh.vertexShader = HEAD_V + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvJlP = position;\nvJlN = normal;');
          sh.fragmentShader = HEAD_F + sh.fragmentShader
            .replace('#include <map_fragment>', MAP_F)
            .replace('#include <roughnessmap_fragment>', ROUGH_F)
            .replace('#include <metalnessmap_fragment>', METAL_F)
            .replace('#include <normal_fragment_maps>', NORM_F);
        };
        m.customProgramCacheKey = function () { return 'jl-props-tri-1'; };
        m.userData.jlProps = true;
        return m;
      };

      var MOSS = [0.05, 0.095, 0.028];
      var mats = {
        stone: triMat(stoneSet, { color: 0xffffff, roughness: 0.95, metalness: 0, scale: 1.15, normal: 1.0, alt: 0.6, altColor: MOSS, tint: [1.12, 1.08, 1.0] }),
        dark: triMat(stoneSet, { color: 0xffffff, roughness: 0.92, metalness: 0, scale: 1.4, normal: 1.0, alt: 0.4, altColor: MOSS, tint: [0.56, 0.58, 0.6] }),
        gold: triMat(metalSet, { color: new T.Color(1.0, 0.62, 0.2), roughness: 0.34, metalness: 1, scale: 1.7, normal: 0.7, alt: 0.3, altColor: [0.10, 0.06, 0.025], tint: [7, 1, 1], metal: true }),
        bronze: triMat(metalSet, { color: new T.Color(0.36, 0.2, 0.085), roughness: 0.52, metalness: 1, scale: 1.5, normal: 1.0, alt: 0.8, altColor: [0.07, 0.24, 0.17], tint: [7, 1, 1], metal: true })
      };
      // un-loaded fallback tints: stone needs a grey base so it is not white without textures
      var baseStone = new T.Color(0.42, 0.41, 0.38), baseDark = new T.Color(0.2, 0.21, 0.22);
      mats.stone.color.copy(baseStone); mats.dark.color.copy(baseDark);
      stoneSet.users.push(function () { mats.stone.color.setRGB(1, 1, 1); mats.dark.color.setRGB(1, 1, 1); });
      var bronzeDS = null;

      var isBronze = function (m) {
        return !!(M.bronze && m && m !== M.bronze && m.isMeshStandardMaterial && m.metalness > 0.8 && m.color && m.color.getHex() === M.bronze.color.getHex());
      };
      var swap = function (m) {
        if (!m) return m;
        if (m === M.stone) return mats.stone;
        if (m === M.darkStone) return mats.dark;
        if (m === M.gold) return mats.gold;
        if (m === M.bronze) return mats.bronze;
        if (isBronze(m)) {
          if (m.side === T.DoubleSide) { if (!bronzeDS) { bronzeDS = triMat(metalSet, { color: mats.bronze.color.clone(), roughness: 0.52, metalness: 1, scale: 1.5, normal: 1.0, alt: 0.8, altColor: [0.07, 0.24, 0.17], tint: [7, 1, 1], metal: true, side: T.DoubleSide }); } return bronzeDS; }
          return mats.bronze;
        }
        return m;
      };
      var retex = function (g) {
        g.traverse(function (o) {
          if (!o.isMesh || !o.material) return;
          if (Array.isArray(o.material)) o.material = o.material.map(swap); else o.material = swap(o.material);
        });
      };
      var addMesh = function (g, geo, mat) { var m = new T.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
      // square frustum (chamfer / cavetto moulding): half-widths h0 (bottom) -> h1 (top) between y0..y1, optional z half-widths
      var chamfer = function (h0, h1, y0, y1, d0, d1) {
        var geo = new T.CylinderGeometry(h1 * Math.SQRT2, h0 * Math.SQRT2, y1 - y0, 4, 1, true);
        geo.rotateY(Math.PI / 4);
        if (d0 !== undefined) geo.scale(1, 1, d0 / h0);
        geo.translate(0, (y0 + y1) / 2, 0);
        void d1; return geo;
      };
      var torus = function (r, t, y, seg) { var geo = new T.TorusGeometry(r, t, 8, seg || 28); geo.rotateX(Math.PI / 2); geo.translate(0, y, 0); return geo; };

      var extras = {
        stoneLantern: function (g) {   // rounded beads at shaft foot / neck, soft collar under the fire box
          addMesh(g, torus(0.168, 0.034, 0.315, 24), mats.stone);
          addMesh(g, torus(0.15, 0.03, 0.965, 24), mats.stone);
          addMesh(g, torus(0.3, 0.022, 1.165, 6), mats.stone);
        },
        pedestal: function (g) {       // chamfered plinth, cavetto under the cap, bevelled cap edge
          addMesh(g, chamfer(0.468, 0.392, 0.115, 0.185), mats.stone);
          addMesh(g, chamfer(0.325, 0.432, 0.735, 0.852), mats.stone);
          addMesh(g, chamfer(0.452, 0.425, 0.985, 1.012), mats.stone);
        },
        brazier: function (g) {        // rolled rim, base bead, stepped stone foot
          var b = bronzeDS || mats.bronze;
          addMesh(g, torus(0.488, 0.026, 1.078, 32), b);
          addMesh(g, torus(0.44, 0.022, 0.118, 28), b);
          addMesh(g, new T.CylinderGeometry(0.585, 0.62, 0.04, 8).translate(0, 0.02, 0), mats.dark);
        },
        guardianLion: function (g) {   // chamfered plinth foot and cornice
          addMesh(g, chamfer(0.625, 0.505, 0.195, 0.305, 0.775), mats.stone);
          addMesh(g, chamfer(0.47, 0.6, 0.655, 0.745, 0.62), mats.stone);
        }
      };

      var wrap = function (lib, name) {
        var orig = lib && lib[name];
        if (typeof orig !== 'function') return;
        lib[name] = function () {
          var g = orig.apply(this, arguments);
          try { if (g && g.traverse) { retex(g); if (extras[name]) extras[name](g); } } catch (e) { console.warn('ext_props', name, e); }
          return g;
        };
      };
      // ---------- round 2: rock, jade seal, torii gate, paper lantern ----------
      try {
        var lacq = triMat(stoneSet, { color: M.redLacquer ? M.redLacquer.color.clone() : new T.Color(0.5, 0.075, 0.045), roughness: 0.5, metalness: 0, scale: 0.9, normal: 0.55, alt: 0.6, altColor: [0.035, 0.024, 0.02], tint: [2.7, 2.7, 2.7] });
        var mossRock = triMat(stoneSet, { color: new T.Color(0.2, 0.26, 0.12), roughness: 0.97, metalness: 0, scale: 0.9, normal: 1.2, alt: 1.35, altColor: [0.06, 0.12, 0.03], tint: [1.0, 1.0, 0.92] });
        stoneSet.users.push(function () { mossRock.color.setRGB(1, 1, 1); });
        var mkJade = function (src) {
          var j = triMat(stoneSet, { color: new T.Color(0.1, 0.42, 0.2), roughness: 0.16, metalness: 0, scale: 2.2, normal: 0.12, alt: 0, altColor: [0, 0, 0], tint: [2.6, 2.6, 2.6] });
          try { j.emissive.copy(src.emissive); j.emissiveIntensity = src.emissiveIntensity; } catch (e) { }
          return j;
        };
        var mergeGeo = function (list) {
          var n = 0, i, k; list = list.map(function (q) { return q.index ? q.toNonIndexed() : q; });
          for (i = 0; i < list.length; i++) n += list[i].attributes.position.count;
          var P = new Float32Array(n * 3), N = new Float32Array(n * 3), o = 0;
          for (i = 0; i < list.length; i++) { var a = list[i].attributes; for (k = 0; k < a.position.count * 3; k++) { P[o + k] = a.position.array[k]; N[o + k] = a.normal.array[k]; } o += a.position.count * 3; }
          var out = new T.BufferGeometry(); out.setAttribute('position', new T.BufferAttribute(P, 3)); out.setAttribute('normal', new T.BufferAttribute(N, 3)); return out;
        };
        var ribMat = new T.MeshStandardMaterial({ color: 0x2a0905, roughness: 0.55, metalness: 0 });
        var ribGeo = null;
        var swap1 = swap;
        var special = {
          rock: function (m) { return (m === M.moss || m === M.stone || m === M.darkStone) ? mossRock : m; },
          toriiGate: function (m) { return m === M.redLacquer ? lacq : swap1(m); },
          jadeSeal: function (m) { return (m && m.isMeshPhysicalMaterial && m !== M.jade) ? mkJade(m) : swap1(m); },
          paperLantern: function (m) { return m === M.gold ? mats.gold : m; }
        };
        extras.paperLantern = function (g) {   // bamboo ribs around the silk body (one merged mesh)
          if (!ribGeo) { var L = [], cy = -0.45, R = 0.24, sy = 1.12; for (var i = -4; i <= 4; i++) { var t = i / 4.7; L.push(torus(R * Math.sqrt(1 - t * t) + 0.003, 0.0045, cy + t * R * sy, 20)); } ribGeo = mergeGeo(L); }
          var m = new T.Mesh(ribGeo, ribMat); g.add(m);
        };
        var wrap2 = function (lib, name) {
          var orig = lib && lib[name];
          if (typeof orig !== 'function') return;
          lib[name] = function () {
            var g = orig.apply(this, arguments);
            try {
              if (g && g.traverse) {
                g.traverse(function (o) { if (o.isMesh && o.material && !Array.isArray(o.material)) o.material = special[name](o.material); });
                if (extras[name]) extras[name](g);
              }
            } catch (e) { console.warn('ext_props', name, e); }
            return g;
          };
        };
        wrap2(nature, 'rock'); wrap2(nature, 'jadeSeal'); wrap2(arch, 'toriiGate'); wrap2(arch, 'paperLantern');
      } catch (e) { console.warn('ext_props r2', e); }
      wrap(arch, 'stoneLantern'); wrap(arch, 'brazier');
      wrap(nature, 'guardianLion'); wrap(nature, 'dragonIdol'); wrap(nature, 'pedestal');
    } catch (e) { console.warn('ext_props', e); }
  });
})();
