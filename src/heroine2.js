/* heroine2.js — realistic skinned heroines (two selectable sisters).
   Models, textures and motion clips: Microsoft Rocketbox Avatar Library (MIT licence, (c) Microsoft)
   https://github.com/microsoft/Microsoft-Rocketbox
     elder   = Assets/Avatars/Adults/Female_Adult_12   (hoodie recoloured white/red "98", light denim shorts, hair blackened)
     younger = Assets/Avatars/Children/Female_Child_01 (top recoloured pale pink, trousers light grey, hair blackened)
     clips   = Assets/Animations/.../f_idle_neutral_01, f_walk_neutral_01, f_run_fast_01 (root motion stripped at load)
   FBX -> GLB via FBX2glTF, TGA -> JPG/PNG 1024 px. Files live in assets/char2/.
   Contract: window.createHeroine2(THREE) -> { group, update(dt, s), setVariant('elder'|'younger'), height }
   Falls back to window.createHeroine (heroine.js) if anything fails to load. */
window.createHeroine2 = function (THREE) {
  'use strict';
  var group = new THREE.Group();
  var pivot = new THREE.Group(); group.add(pivot);
  var VARS = {
    elder: { glb: 'assets/char2/elder.glb', body: 'assets/char2/elder_body.jpg', head: 'assets/char2/elder_head.jpg', hair: 'assets/char2/elder_hair.png', h: 1.62, raw: 1.48, bip: 'Bip01' },
    younger: { glb: 'assets/char2/younger.glb', body: 'assets/char2/younger_body.jpg', head: 'assets/char2/younger_head.jpg', hair: null, h: 1.42, raw: 1.21, bip: 'Bip02' }
  };
  var CLIPS = [['idle', 'assets/char2/a_idle.glb'], ['walk', 'assets/char2/a_walk.glb'], ['run', 'assets/char2/a_run.glb']];
  var NAT = { walk: 1.21, run: 5.37 };          // metres per second covered by the source clips (model units)
  var CLIP_BIP_Y = 0.919;                       // pelvis height of the clip rig at rest
  var variant = 'elder', inst = {}, loading = {}, fallback = null, api;
  var loader = null, tl = new THREE.TextureLoader();
  var clipsSrc = null, clipWait = [], clipsRequested = false;

  function useFallback(e) {
    if (e) console.warn('heroine2: falling back', e);
    if (fallback || !window.createHeroine) return;
    try {
      fallback = window.createHeroine(THREE);
      if (fallback.setVariant) fallback.setVariant(variant);
      pivot.visible = false; group.add(fallback.group);
    } catch (err) { console.warn('heroine2 fallback failed', err); }
  }
  function getLoader() { if (!loader) loader = new THREE.GLTFLoader(); return loader; }
  function loadClips(cb) {
    if (clipsSrc) return cb(clipsSrc);
    clipWait.push(cb);
    if (clipsRequested) return; clipsRequested = true;
    var out = {}, n = 0;
    CLIPS.forEach(function (p) {
      getLoader().load(p[1], function (g) {
        out[p[0]] = g.animations[0];
        if (++n === CLIPS.length) { clipsSrc = out; clipWait.forEach(function (f) { f(out); }); clipWait = []; }
      }, undefined, useFallback);
    });
  }
  // keep rotations only (so each avatar keeps its own proportions) + pelvis height, strip root motion
  function retarget(src, bip, yScale, name) {
    var tracks = [];
    src.tracks.forEach(function (t) {
      var i = t.name.lastIndexOf('.'), node = t.name.slice(0, i), prop = t.name.slice(i + 1);
      var nn = node.replace(/^Bip01/, bip);
      if (prop === 'quaternion') { var q = t.clone(); q.name = nn + '.quaternion'; tracks.push(q); }
      else if (prop === 'position' && node === 'Bip01') {
        var p = t.clone(); p.name = nn + '.position';
        for (var k = 0; k < p.values.length; k += 3) { p.values[k] = 0; p.values[k + 1] *= yScale; p.values[k + 2] = 0; }
        tracks.push(p);
      }
    });
    return new THREE.AnimationClip(name, src.duration, tracks);
  }
  function tex(url, srgb) {
    var t = tl.load(url); t.flipY = false; t.anisotropy = 4; if (srgb) t.encoding = THREE.sRGBEncoding; return t;
  }
  // material shows a neutral colour until its texture has actually arrived (never a black silhouette)
  function mat(url, color, opts) {
    var m = new THREE.MeshStandardMaterial(Object.assign({ color: color, metalness: 0, envMapIntensity: 0.7 }, opts || {}));
    tl.load(url, function (t) { t.flipY = false; t.anisotropy = 4; t.encoding = THREE.sRGBEncoding; m.map = t; m.color.set(0xffffff); m.needsUpdate = true; }, undefined, function () { console.warn('heroine2: texture missing', url); });
    return m;
  }
  function build(name, gltf, clips) {
    var v = VARS[name], root = gltf.scene, I = { root: root, bones: {}, w: { idle: 1, walk: 0, run: 0 }, act: {} };
    root.scale.setScalar(v.h / v.raw);
    var mBody = mat(v.body, name === 'elder' ? 0xb9b4ae : 0xc79aa6, { roughness: 0.78 });
    var mHead = mat(v.head, 0x6b4a3c, { roughness: 0.62 });
    var mHair = v.hair ? new THREE.MeshStandardMaterial({ map: tex(v.hair, true), roughness: 0.55, metalness: 0, alphaTest: 0.4, side: THREE.DoubleSide, envMapIntensity: 0.6 }) : null;
    if (mHair) mHair.visible = false, tl.load(v.hair, function () { mHair.visible = true; });
    root.traverse(function (o) {
      if (o.isBone) I.bones[o.name] = o;
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
      var mn = (o.material && o.material.name || '').toLowerCase();
      if (mn.indexOf('opacity') >= 0) { if (mHair) { o.material = mHair; o.receiveShadow = false; } else o.visible = false; }
      else if (mn.indexOf('head') >= 0) o.material = mHead;
      else o.material = mBody;
    });
    var bipNode = root.getObjectByName(v.bip);
    var yScale = bipNode ? bipNode.position.y / CLIP_BIP_Y : 1;
    I.mixer = new THREE.AnimationMixer(root);
    ['idle', 'walk', 'run'].forEach(function (k) {
      var a = I.mixer.clipAction(retarget(clips[k], v.bip, yScale, k));
      a.play(); a.setEffectiveWeight(k === 'idle' ? 1 : 0); I.act[k] = a;
    });
    I.scale = v.h / v.raw;
    var b = v.bip + '_';
    I.lArm = I.bones[b + 'L_UpperArm']; I.rArm = I.bones[b + 'R_UpperArm'];
    I.lFore = I.bones[b + 'L_Forearm']; I.rFore = I.bones[b + 'R_Forearm'];
    I.lThigh = I.bones[b + 'L_Thigh']; I.rThigh = I.bones[b + 'R_Thigh'];
    I.lCalf = I.bones[b + 'L_Calf']; I.rCalf = I.bones[b + 'R_Calf'];
    I.spine = I.bones[b + 'Spine1']; I.head = I.bones[b + 'Head'];
    I.mixer.update(0.001);
    root.visible = (name === variant);
    pivot.add(root); inst[name] = I;
  }
  function ensure(name) {
    if (inst[name] || loading[name] || fallback) return;
    if (!THREE.GLTFLoader) return useFallback('no GLTFLoader');
    loading[name] = true;
    try {
      getLoader().load(VARS[name].glb, function (g) {
        loadClips(function (clips) { try { build(name, g, clips); } catch (e) { useFallback(e); } });
      }, undefined, useFallback);
    } catch (e) { useFallback(e); }
  }
  function setVariant(name) {
    if (!VARS[name]) name = 'elder';
    variant = name; api.height = VARS[name].h;
    for (var k in inst) inst[k].root.visible = (k === name);
    if (fallback) { if (fallback.setVariant) fallback.setVariant(name); return; }
    ensure(name);
  }

  // rotate a bone about an axis given in the heroine's own frame (X = her left, Y = up, Z = forward)
  var qP = new THREE.Quaternion(), qPi = new THREE.Quaternion(), qW = new THREE.Quaternion(), qG = new THREE.Quaternion(), ax = new THREE.Vector3();
  function rot(bone, x, y, z, ang) {
    if (!bone || !bone.parent || Math.abs(ang) < 1e-4) return;
    group.getWorldQuaternion(qG); ax.set(x, y, z).applyQuaternion(qG);
    bone.parent.getWorldQuaternion(qP); qPi.copy(qP).invert();
    qW.setFromAxisAngle(ax, ang);
    bone.quaternion.premultiply(qP).premultiply(qW).premultiply(qPi);
  }
  var cl = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var sm = function (a, b, x) { var t = cl((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  var air = 0, climb = 0, dead = 0, lean = 0, lastYaw = null;

  function update(dt, s) {
    if (fallback) { fallback.update(dt, s); return; }
    var I = inst[variant]; if (!I) return;
    var st = s.state, sp = s.speed || 0, tI = 0, tW = 0, tR = 0, tsW = 1, tsR = 1;
    var natW = NAT.walk * I.scale, natR = NAT.run * I.scale;
    if (st === 'run') { var k = sm(1.9, 3.8, sp); tR = k; tW = 1 - k; tsW = Math.min(2.0, Math.max(0.6, sp / natW)); tsR = Math.min(1.35, Math.max(0.6, sp / natR)); }
    else if (st === 'jump' || st === 'fall') { tR = 1; tsR = 0.16; }
    else tI = 1;
    var kk = 1 - Math.exp(-dt * 11);
    I.w.idle += (tI - I.w.idle) * kk; I.w.walk += (tW - I.w.walk) * kk; I.w.run += (tR - I.w.run) * kk;
    I.act.idle.setEffectiveWeight(I.w.idle); I.act.walk.setEffectiveWeight(I.w.walk); I.act.run.setEffectiveWeight(I.w.run);
    I.act.walk.timeScale = tsW; I.act.run.timeScale += (tsR - I.act.run.timeScale) * (1 - Math.exp(-dt * 8));
    I.mixer.update(dt);

    var k2 = 1 - Math.exp(-dt * 9);
    air += (((st === 'jump' || st === 'fall') ? 1 : 0) - air) * k2;
    climb += ((st === 'climb' ? 1 : 0) - climb) * (1 - Math.exp(-dt * 14));
    dead += ((st === 'dead' ? 1 : 0) - dead) * (1 - Math.exp(-dt * 5));
    // lean into turns
    var yaw = group.rotation.y, dy = 0; if (lastYaw !== null && dt > 0) { dy = yaw - lastYaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)) / dt; } lastYaw = yaw;
    lean += (Math.max(-0.22, Math.min(0.22, -dy * 0.045 * cl(sp / 4))) - lean) * (1 - Math.exp(-dt * 6));
    rot(I.spine, 0, 0, 1, lean);
    if (air > 0.01) {
      var up = s.vy > 0 ? 1 : 0;
      rot(I.lArm, 0, 0, 1, -0.55 * air); rot(I.rArm, 0, 0, 1, 0.55 * air);       // arms out for balance
      rot(I.lArm, 1, 0, 0, -0.5 * air * up); rot(I.rArm, 1, 0, 0, -0.5 * air * up);
      rot(I.spine, 1, 0, 0, 0.12 * air);
    }
    if (climb > 0.01) {
      var c = cl(s.climbT || 0);
      // hands stay planted on the ledge while the body rises (same 0..0.6 smoothstep as the position lerp in updatePlayer):
      // overhead hang -> bent-elbow pull -> straight-arm press beside the hips, then release as she steps onto the top
      var up = 1 - sm(0, 0.6, c), bell = 4 * up * (1 - up), rel = (1 - sm(0.72, 1, c)) * climb, knee = sm(0.4, 0.7, c) * (1 - sm(0.8, 1, c)) * climb;
      var armA = -(0.3 + 2.55 * up) * rel;
      rot(I.lArm, 1, 0, 0, armA); rot(I.rArm, 1, 0, 0, armA);
      rot(I.lArm, 0, 0, 1, -0.18 * bell * rel); rot(I.rArm, 0, 0, 1, 0.18 * bell * rel);
      rot(I.lFore, 1, 0, 0, -1.15 * bell * rel); rot(I.rFore, 1, 0, 0, -1.15 * bell * rel);
      rot(I.rThigh, 1, 0, 0, -1.25 * knee); rot(I.rCalf, 1, 0, 0, 1.5 * knee);
      rot(I.lThigh, 1, 0, 0, 0.25 * knee);
      rot(I.spine, 1, 0, 0, 0.3 * knee + 0.22 * bell * rel);
      rot(I.head, 1, 0, 0, -0.3 * up * rel);
    }
    if (dead > 0.01) {                                                                 // knees buckle and she curls as she goes down
      var db = 4 * dead * (1 - dead);
      rot(I.lThigh, 1, 0, 0, -0.7 * db); rot(I.rThigh, 1, 0, 0, -0.45 * db);
      rot(I.lCalf, 1, 0, 0, 1.3 * db); rot(I.rCalf, 1, 0, 0, 1.0 * db);
      rot(I.spine, 1, 0, 0, 0.35 * db); rot(I.head, 1, 0, 0, 0.3 * dead);
      rot(I.lArm, 0, 0, 1, -0.5 * dead); rot(I.rArm, 0, 0, 1, 0.35 * dead);
    }
    pivot.rotation.x = dead * 1.5; pivot.position.y = dead * 0.14; pivot.position.z = -dead * 0.3;
  }

  api = { group: group, update: update, setVariant: setVariant, height: 1.62 };
  api._dbg = function () { return 'inst=' + Object.keys(inst).join(',') + ' loading=' + Object.keys(loading).join(',') + ' variant=' + variant + ' fallback=' + !!fallback + ' pivot=' + pivot.children.length; };
  ensure(variant);
  setTimeout(function () { ensure(variant === 'elder' ? 'younger' : 'elder'); }, 2500);   // preload the other sister so switching is instant
  return api;
};
