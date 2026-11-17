/* heroine2.js — realistic skinned heroines (two selectable sisters).
   Models, textures and motion clips: Microsoft Rocketbox Avatar Library (MIT licence, (c) Microsoft)
   https://github.com/microsoft/Microsoft-Rocketbox
     elder   = Assets/Avatars/Adults/Female_Adult_12   (hoodie recoloured white/red "98", light denim shorts, hair blackened)
     younger = Assets/Avatars/Children/Female_Child_01 (top recoloured pale pink, trousers light grey, hair blackened)
     clips   = Assets/Animations/.../f_idle_neutral_01, f_walk_neutral_01, f_run_fast_01 (root motion stripped at load)
   FBX -> GLB via FBX2glTF, TGA -> JPG/PNG 1024 px. Files live in assets/char2/.
   Rocketbox has no jump / fall / climb clips, so those are a procedural layer in this file (see "animation" below):
   authored key poses + analytic two-bone IK, hands pinned to the real ledge edge (read from JL.ctx.pl.climb / colliders).
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
    root.updateMatrixWorld(true);
    I.bindQ = [new THREE.Quaternion(), new THREE.Quaternion()];                 // bind pose = feet flat on the ground
    if (I.bones[b + 'L_Foot'] && I.bones[b + 'R_Foot']) { I.bones[b + 'L_Foot'].getWorldQuaternion(I.bindQ[0]); I.bones[b + 'R_Foot'].getWorldQuaternion(I.bindQ[1]); }
    I.mixer.update(0.001);
    try { rigSetup(I, v); } catch (e) { I.limbs = null; console.warn('heroine2: rig setup failed, jump/climb layer off', e); }
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

  // ================= animation =================
  // Locomotion (idle / walk / run) comes from the mocap clips through the mixer. Jump, fall, landing and the ledge climb
  // are ONE procedural layer applied after the mixer: authored whole-body key poses expressed as limb targets in the
  // heroine's own frame (X = her left, Y = up, Z = forward), solved with analytic two-bone IK. The solver places the
  // upper bone along the limb and the hinge (Biped local -Z) perpendicular to the bend plane, so there is never any
  // roll about a bone's length (no candy-wrapper twist). While airborne / climbing the locomotion clips are faded
  // out and frozen, so nothing cycles in the air.
  var qP = new THREE.Quaternion(), qPi = new THREE.Quaternion(), qW = new THREE.Quaternion(), qG = new THREE.Quaternion(), ax = new THREE.Vector3();
  function rot(bone, x, y, z, ang) {            // rotate a bone about an axis given in the heroine's frame
    if (!bone || !bone.parent || Math.abs(ang) < 1e-4) return;
    ax.set(x, y, z).applyQuaternion(qG);
    bone.parent.getWorldQuaternion(qP); qPi.copy(qP).invert();
    qW.setFromAxisAngle(ax, ang);
    bone.quaternion.premultiply(qP).premultiply(qW).premultiply(qPi);
  }
  var cl = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var sm = function (a, b, x) { var t = cl((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  var mixf = function (a, b, t) { return a + (b - a) * t; };
  var smin = function (a, b, k) { var h = cl(0.5 + 0.5 * (b - a) / k); return mixf(b, a, h) - k * h * (1 - h); };
  var D2R = Math.PI / 180;

  // ---- key poses: 4 limb slots x 7 floats (target xyz as a fraction of limb length from hip / shoulder with x = outward,
  //      pole xyz = direction of the knee / elbow, foot pitch in rad with + = toes down), then [28] spine lean, [29] head pitch.
  //      slot 0 = lead leg, 1 = trailing leg, 2 = arm on the lead-leg side, 3 = opposite arm.
  function legP(o, i, flex, knee, abd, pitch) {
    var f = flex * D2R, c = (flex - knee) * D2R, a = abd * D2R, k = i * 7;
    var ux = Math.sin(a), uy = -Math.cos(f) * Math.cos(a), uz = Math.sin(f) * Math.cos(a);
    o[k] = 0.516 * ux + 0.484 * Math.sin(a) * 0.4; o[k + 1] = 0.516 * uy - 0.484 * Math.cos(c); o[k + 2] = 0.516 * uz + 0.484 * Math.sin(c);
    o[k + 3] = ux; o[k + 4] = uy; o[k + 5] = uz; o[k + 6] = pitch * D2R;
  }
  function armP(o, i, u, f) {
    var k = i * 7, ul = Math.hypot(u[0], u[1], u[2]), fl = Math.hypot(f[0], f[1], f[2]);
    for (var n = 0; n < 3; n++) { o[k + n] = 0.513 * u[n] / ul + 0.487 * f[n] / fl; o[k + 3 + n] = u[n] / ul; }
    o[k + 6] = 0;
  }
  function mkPose(lA, lB, aA, aB, lean, head) {
    var o = new Float32Array(30);
    legP(o, 0, lA[0], lA[1], lA[2], lA[3]); legP(o, 1, lB[0], lB[1], lB[2], lB[3]); armP(o, 2, aA[0], aA[1]); armP(o, 3, aB[0], aB[1]);
    o[28] = lean; o[29] = head || 0; return o;
  }
  var POSE = {
    // running jump: leap off the stance leg, lead knee drives up, opposite arm forward
    rPush: mkPose([40, 80, 2, 25], [-22, 8, 2, 45], [[0.25, -0.75, -0.6], [0.0, -0.9, 0.4]], [[0.1, -0.6, 0.8], [-0.15, 0.55, 0.8]], 0.14),
    rRise: mkPose([70, 100, 2, 20], [-30, 25, 2, 40], [[0.3, -0.7, -0.65], [0.1, -0.75, 0.6]], [[0.15, -0.2, 0.97], [-0.25, 0.85, 0.45]], 0.16),
    rApex: mkPose([50, 75, 3, 15], [12, 70, 3, 30], [[0.75, -0.6, -0.05], [0.5, -0.25, 0.8]], [[0.6, -0.5, 0.6], [0.3, 0.2, 0.9]], 0.10),
    rFall: mkPose([32, 22, 3, -5], [-5, 35, 3, 25], [[0.8, -0.5, -0.1], [0.75, 0.35, 0.35]], [[0.8, -0.5, 0.2], [0.7, 0.4, 0.45]], 0.02),
    // standing jump: two-foot take-off, arms swing up together, soft tuck at the apex
    sPush: mkPose([3, 6, 3, 45], [3, 6, 3, 45], [[0.2, -0.5, 0.85], [0.0, 0.25, 0.95]], [[0.2, -0.5, 0.85], [0.0, 0.25, 0.95]], 0.05),
    sRise: mkPose([12, 28, 4, 40], [6, 24, 4, 40], [[0.25, 0.3, 0.9], [0.0, 0.9, 0.4]], [[0.25, 0.3, 0.9], [0.0, 0.9, 0.4]], 0.03),
    sApex: mkPose([48, 85, 6, 25], [42, 80, 6, 25], [[0.6, -0.4, 0.7], [0.25, 0.3, 0.9]], [[0.6, -0.4, 0.7], [0.25, 0.3, 0.9]], 0.12),
    sFall: mkPose([18, 28, 7, 8], [14, 24, 7, 8], [[0.82, -0.45, 0.15], [0.7, 0.4, 0.45]], [[0.82, -0.45, 0.15], [0.7, 0.4, 0.45]], 0.04),
    // ledge climb, limbs that are not pinned: hanging legs / reaching arms, then trailing leg + balance arms
    cHang: mkPose([14, 30, 3, 30], [6, 18, 3, 35], [[0.25, -0.55, 0.8], [0.0, 0.5, 0.85]], [[0.25, -0.55, 0.8], [0.0, 0.5, 0.85]], 0),
    cUp: mkPose([40, 60, 3, 0], [-12, 25, 3, 35], [[0.22, -0.92, -0.2], [0.12, -0.9, 0.3]], [[0.22, -0.92, -0.2], [0.12, -0.9, 0.3]], 0)
  };
  var des = new Float32Array(30);
  function addPose(p, w) { if (w > 1e-4) for (var i = 0; i < 30; i++) des[i] += p[i] * w; }
  var RUN_CONTACT = [0.22, 0.72];               // run-clip phase at which the left / right foot strikes the ground

  // ---- scratch (no per-frame allocation) ----
  var vR = new THREE.Vector3(), vN = new THREE.Vector3(), vPl = new THREE.Vector3(), vU = new THREE.Vector3(), vK = new THREE.Vector3(), vL = new THREE.Vector3(),
    vH = new THREE.Vector3(), vY = new THREE.Vector3(), vT = new THREE.Vector3(), vS = new THREE.Vector3(), vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3(),
    vTg = new THREE.Vector3(), vPo = new THREE.Vector3(), vE = new THREE.Vector3(), vF = new THREE.Vector3();
  var m4 = new THREE.Matrix4(), qU = new THREE.Quaternion(), qLo = new THREE.Quaternion(), qA = new THREE.Quaternion(), qE = new THREE.Quaternion(), qPar = new THREE.Quaternion(), qGi = new THREE.Quaternion(), qX = new THREE.Quaternion();
  var X_AXIS = new THREE.Vector3(1, 0, 0);

  // analytic two-bone IK in world space. L = { up, lo, end, l1, l2 }; leaves the lower bone's world quaternion in qLo.
  function solve(L, tgt, pole, w) {
    var up = L.up, lo = L.lo, l1 = L.l1, l2 = L.l2;
    up.parent.updateWorldMatrix(true, false);
    vR.copy(up.position).applyMatrix4(up.parent.matrixWorld);
    vN.subVectors(tgt, vR); var d = vN.length();
    if (d < 1e-5) { vN.set(0, -1, 0); d = 1e-5; } else vN.multiplyScalar(1 / d);
    var mx = (l1 + l2) * 0.999, mn = (l1 + l2) * 0.36; d = d > mx ? mx : d < mn ? mn : d;
    var ca = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d); ca = ca > 1 ? 1 : ca < -1 ? -1 : ca; var sa = Math.sqrt(1 - ca * ca);
    vPl.copy(pole).addScaledVector(vN, -pole.dot(vN));
    if (vPl.lengthSq() < 1e-6) { vPl.set(0.31, 0.23, 0.92).applyQuaternion(qG); vPl.addScaledVector(vN, -vPl.dot(vN)); }
    vPl.normalize();
    vU.copy(vN).multiplyScalar(ca).addScaledVector(vPl, sa);                 // upper bone direction
    vK.copy(vR).addScaledVector(vU, l1);                                     // knee / elbow
    vL.copy(vR).addScaledVector(vN, d).sub(vK).normalize();                  // lower bone direction
    vH.crossVectors(vN, vPl).normalize();                                    // = -hinge; Biped: bone = local +X, hinge = local -Z
    vY.crossVectors(vH, vU); m4.makeBasis(vU, vY, vH); qU.setFromRotationMatrix(m4);
    vY.crossVectors(vH, vL); m4.makeBasis(vL, vY, vH); qLo.setFromRotationMatrix(m4);
    up.parent.matrixWorld.decompose(vT, qPar, vS);
    qA.copy(qPar).invert().multiply(qU);
    if (w >= 0.999) up.quaternion.copy(qA); else { up.quaternion.slerp(qA, w); qU.copy(qPar).multiply(up.quaternion); }
    qA.copy(qU).invert().multiply(qLo);
    if (w >= 0.999) lo.quaternion.copy(qA); else { lo.quaternion.slerp(qA, w); qLo.copy(qU).multiply(lo.quaternion); }
  }
  function setEnd(L, qWorld, w) {               // orient hand / foot in world space (call right after solve)
    qA.copy(qLo).invert().multiply(qWorld);
    if (w >= 0.999) L.end.quaternion.copy(qA); else L.end.quaternion.slerp(qA, w);
  }
  // current limb configuration in pose units (from the bones as the mixer left them)
  function measure(I, L, o) {
    L.tip.updateWorldMatrix(true, false);
    vA.setFromMatrixPosition(L.up.matrixWorld); vB.setFromMatrixPosition(L.lo.matrixWorld); vC.setFromMatrixPosition(L.end.matrixWorld);
    vT.subVectors(vC, vA).applyQuaternion(qGi).multiplyScalar(1 / (L.l1 + L.l2));
    o[0] = vT.x * L.side; o[1] = vT.y; o[2] = vT.z;
    vB.subVectors(vC, vA).normalize(); vT.setFromMatrixColumn(L.up.matrixWorld, 2).normalize().cross(vB).applyQuaternion(qGi);   // bend-plane direction (exact even for a straight limb)
    o[3] = vT.x * L.side; o[4] = vT.y; o[5] = vT.z;
    if (L.leg) { vT.setFromMatrixPosition(L.tip.matrixWorld).sub(vC).applyQuaternion(qGi); o[6] = Math.atan2(-vT.y, Math.hypot(vT.x, vT.z)) - I.toeRest; } else o[6] = 0;
  }
  function mkLimb(I, up, lo, end, tip, side, leg) {
    return { up: up, lo: lo, end: end, tip: tip, side: side, leg: leg, l1: lo.position.length() * I.scale, l2: end.position.length() * I.scale, cur: new Float32Array(7), tmp: new Float32Array(7) };
  }
  // called once per avatar, right after the mixer has posed it with the idle clip (root not yet parented: world = model space)
  function rigSetup(I, v) {
    var b = v.bip + '_', B = I.bones, root = I.root;
    root.updateMatrixWorld(true);
    I.pelvis = B[b + 'Pelvis']; I.spine0 = B[b + 'Spine']; I.spine2 = B[b + 'Spine2']; I.neck = B[b + 'Neck'];
    I.lClav = B[b + 'L_Clavicle']; I.rClav = B[b + 'R_Clavicle'];
    var need = ['L_Thigh', 'L_Calf', 'L_Foot', 'L_Toe0', 'R_Thigh', 'R_Calf', 'R_Foot', 'R_Toe0', 'L_UpperArm', 'L_Forearm', 'L_Hand', 'L_Finger2', 'R_UpperArm', 'R_Forearm', 'R_Hand', 'R_Finger2', 'Pelvis', 'Spine', 'Spine1', 'Spine2', 'Head'];
    for (var i = 0; i < need.length; i++) if (!B[b + need[i]]) { I.limbs = null; return; }
    I.limbs = [
      mkLimb(I, B[b + 'L_Thigh'], B[b + 'L_Calf'], B[b + 'L_Foot'], B[b + 'L_Toe0'], 1, true),
      mkLimb(I, B[b + 'R_Thigh'], B[b + 'R_Calf'], B[b + 'R_Foot'], B[b + 'R_Toe0'], -1, true),
      mkLimb(I, B[b + 'L_UpperArm'], B[b + 'L_Forearm'], B[b + 'L_Hand'], B[b + 'L_Finger2'], 1, false),
      mkLimb(I, B[b + 'R_UpperArm'], B[b + 'R_Forearm'], B[b + 'R_Hand'], B[b + 'R_Finger2'], -1, false)];
    var P = function (o) { return new THREE.Vector3().setFromMatrixPosition(o.matrixWorld); };
    var lf = P(B[b + 'L_Foot']), rf = P(B[b + 'R_Foot']), sh = P(B[b + 'L_UpperArm']), toe = P(B[b + 'L_Toe0']).sub(lf);
    I.legLen = I.limbs[0].l1 + I.limbs[0].l2; I.armLen = I.limbs[2].l1 + I.limbs[2].l2; I.k = I.legLen / 0.9;
    I.hipY = P(B[b + 'L_Thigh']).y; I.ankleH = Math.min(lf.y, rf.y); I.shY = sh.y; I.shZ = sh.z; I.shX = Math.abs(sh.x);
    I.stance = [lf, rf]; I.toeRest = Math.atan2(-toe.y, Math.hypot(toe.x, toe.z));
    // flat-footed world orientation of each foot, taken from the bind pose
    I.footRef = [new THREE.Quaternion().copy(I.bindQ[0]), new THREE.Quaternion().copy(I.bindQ[1])];
  }

  // ---- shared animation state (one heroine on screen) ----
  var A = { ovL: 0, ovA: 0, fadeL: 0.15, fadeA: 0.25, wasAir: false, airT: 0, tuck: 1, lead: 0, runK: 0, lastVy: 0, lean: 0, headP: 0,
    landT: 9, landAmp: 0, landRun: 0, wasClimb: false, I: null, engT: 9, cRef: null, c: null, plant: [0, 0], handUse: 1, dipNow: 0, hT: [new THREE.Vector3(), new THREE.Vector3()] };
  var dead = 0, lean = 0, lastYaw = null;
  function newClimb() { return { fx: 0, fy: 0, fz: 0, dx: 0, dz: 1, h: 1.7, d: 0.34, dl: 0.34, dr: 0.34, lead: 1, synth: false }; }
  var CB = newClimb();
  function rayBox(b, ox, oz, dx, dz) {           // distance along (dx,dz) from (ox,oz) to the footprint of box b
    var t0 = -1e9, t1 = 1e9, a, c;
    if (Math.abs(dx) > 1e-6) { a = (b.x0 - ox) / dx; c = (b.x1 - ox) / dx; t0 = Math.max(t0, Math.min(a, c)); t1 = Math.min(t1, Math.max(a, c)); } else if (ox < b.x0 || ox > b.x1) return -1;
    if (Math.abs(dz) > 1e-6) { a = (b.z0 - oz) / dz; c = (b.z1 - oz) / dz; t0 = Math.max(t0, Math.min(a, c)); t1 = Math.min(t1, Math.max(a, c)); } else if (oz < b.z0 || oz > b.z1) return -1;
    return (t1 >= t0 && t0 > 0.02) ? t0 : -1;
  }
  function startClimb(I, s) {
    var J = window.JL, ctx = J && J.ctx, pc = s.climb || (ctx && ctx.pl && ctx.pl.climb) || null, yaw = group.rotation.y, c = CB;
    c.dx = Math.sin(yaw); c.dz = Math.cos(yaw); c.lead = 1; c.synth = !pc;
    if (pc) { c.fx = pc.fx; c.fy = pc.fy; c.fz = pc.fz; c.h = pc.ty - pc.fy; }
    else { c.fx = group.position.x; c.fy = group.position.y; c.fz = group.position.z; c.h = 1.7 * I.k; }
    c.d = c.dl = c.dr = 0.34;
    try {
      var cols = pc && ctx && ctx.colliders, box = null, i;
      if (cols) for (i = 0; i < cols.length; i++) { var bb = cols[i]; if (!bb.off && Math.abs(bb.y1 - pc.ty) < 1e-3 && pc.tx > bb.x0 && pc.tx < bb.x1 && pc.tz > bb.z0 && pc.tz < bb.z1) { box = bb; break; } }
      if (box) {
        var sx = I.shX + 0.03 * I.k, lx = c.dz, lz = -c.dx, r;
        r = rayBox(box, c.fx, c.fz, c.dx, c.dz); if (r > 0) c.d = Math.min(0.75, r);
        r = rayBox(box, c.fx + lx * sx, c.fz + lz * sx, c.dx, c.dz); c.dl = r > 0 ? Math.min(c.d + 0.3, r) : c.d;
        r = rayBox(box, c.fx - lx * sx, c.fz - lz * sx, c.dx, c.dz); c.dr = r > 0 ? Math.min(c.d + 0.3, r) : c.d;
      }
    } catch (e) { }
    A.handUse = c.h > 0.9 * I.hipY ? 1 : 0;
    A.cRef = pc; A.c = c;
  }
  // engage the override from whatever pose is on screen, so there is never a pop
  function engage(I) {
    for (var i = 0; i < 4; i++) {
      var L = I.limbs[i], w = i < 2 ? A.ovL : A.ovA, n;
      measure(I, L, L.tmp);
      for (n = 0; n < 7; n++) L.cur[n] = mixf(L.tmp[n], L.cur[n], w);
    }
    if (A.ovL < 0.02) { A.lean = 0; A.headP = 0; }
    A.ovL = A.ovA = 1; A.engT = 0;
  }
  // world position of a point given in the climb's start frame (x = her left, y = up from the start height, z = forward)
  function cPoint(o, x, y, z) { var c = A.c; return o.set(c.fx + c.dz * x + c.dx * z, c.fy + y, c.fz - c.dx * x + c.dz * z); }

  function update(dt, s) {
    if (fallback) { fallback.update(dt, s); return; }
    var I = inst[variant]; if (!I) return;
    var st = s.state, sp = s.speed || 0, vy = s.vy || 0, tI = 0, tW = 0, tR = 0, tsW = 1, tsR = 1, i, n, L;
    var inAir = st === 'jump' || st === 'fall', inClimb = st === 'climb', rigOK = !!I.limbs;
    var natW = NAT.walk * I.scale, natR = NAT.run * I.scale;
    if (st === 'run') { var k = sm(1.9, 3.8, sp); tR = k; tW = 1 - k; tsW = Math.min(2.0, Math.max(0.6, sp / natW)); tsR = Math.min(1.35, Math.max(0.6, sp / natR)); }
    else { tI = 1; if (inAir || inClimb) tsW = tsR = 0; }                    // airborne / climbing: neutral base, locomotion frozen
    if (!rigOK && inAir) { tI = 0.6; tR = 0.4; tsR = 0; }
    // landing at speed: resume the run cycle on the foot that reaches the ground first
    var landed = A.wasAir && !inAir && !inClimb && st !== 'dead';
    if (landed && rigOK && sp > 1.5) { I.act.run.time = RUN_CONTACT[A.lead] * I.act.run.getClip().duration; I.act.run.timeScale = tsR; I.w.run = Math.max(I.w.run, 0.5 * tR); I.w.idle = Math.min(I.w.idle, 1 - I.w.run); }
    var kk = 1 - Math.exp(-dt * ((inAir || inClimb) ? 14 : 11));
    I.w.idle += (tI - I.w.idle) * kk; I.w.walk += (tW - I.w.walk) * kk; I.w.run += (tR - I.w.run) * kk;
    I.act.idle.setEffectiveWeight(I.w.idle); I.act.walk.setEffectiveWeight(I.w.walk); I.act.run.setEffectiveWeight(I.w.run);
    if (inAir || inClimb) { I.act.walk.timeScale = 0; I.act.run.timeScale = 0; }
    else { I.act.walk.timeScale = tsW; I.act.run.timeScale += (tsR - I.act.run.timeScale) * (1 - Math.exp(-dt * 14)); }
    I.mixer.update(dt);

    dead += ((st === 'dead' ? 1 : 0) - dead) * (1 - Math.exp(-dt * 5));
    pivot.rotation.x = dead * 1.5; pivot.position.set(0, dead * 0.14, -dead * 0.3);
    group.getWorldQuaternion(qG); qGi.copy(qG).invert();
    // lean into turns
    var yaw = group.rotation.y, dy = 0; if (lastYaw !== null && dt > 0) { dy = yaw - lastYaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)) / dt; } lastYaw = yaw;
    lean += (Math.max(-0.22, Math.min(0.22, -dy * 0.045 * cl(sp / 4))) - lean) * (1 - Math.exp(-dt * 6));
    rot(I.spine, 0, 0, 1, lean);
    if (!rigOK) { A.wasAir = inAir; return; }

    if (A.I !== I) {                            // sister switched: restart the layer on the new skeleton
      A.I = I; if (A.ovL > 0 || A.ovA > 0) { A.ovL = A.ovA = 0; A.wasAir = false; A.wasClimb = false; A.landT = 9; }
    }
    var legLen = I.legLen, armLen = I.armLen, K = I.k, c = A.c, t = cl(s.climbT || 0);
    // ---------- state transitions ----------
    if (inAir && !A.wasAir) {
      engage(I);
      A.airT = 0; A.tuck = (vy > 1 && !A.wasClimb) ? 1 : 0; A.runK = sm(1.0, 3.2, sp);
      if (A.runK > 0.3) {                         // the swing leg (foot further forward / higher) becomes the lead leg
        var a0 = I.limbs[0].tmp, a1 = I.limbs[1].tmp; A.lead = (a0[2] + 0.5 * a0[1] >= a1[2] + 0.5 * a1[1]) ? 0 : 1;
      }
    }
    var J = window.JL, pcl = s.climb || (J && J.ctx && J.ctx.pl && J.ctx.pl.climb) || A.cRef;
    if (inClimb && (!A.wasClimb || pcl !== A.cRef)) { engage(I); startClimb(I, s); c = A.c; A.plant[0] = A.plant[1] = 0; }
    if (landed) {
      A.landT = 0; A.landAmp = cl((-A.lastVy - 1.2) / 6.5); A.landRun = sm(1.5, 3.5, sp);
      A.fadeL = mixf(0.2, 0.12, A.landRun); A.fadeA = mixf(0.3, 0.2, A.landRun);
    }
    if (A.wasClimb && !inClimb) {               // leave the climb from the pose that was actually shown
      for (i = 0; i < 4; i++) { L = I.limbs[i]; for (n = 0; n < 7; n++) L.cur[n] = L.tmp[n]; }
      A.fadeL = 0.14; A.fadeA = 0.22;
    }
    if (st === 'dead') { A.fadeL = A.fadeA = 0.15; }
    if (inAir) { A.lastVy = vy; A.airT += dt; }
    if (!inAir && !inClimb) { A.ovL = Math.max(0, A.ovL - dt / A.fadeL); A.ovA = Math.max(0, A.ovA - dt / A.fadeA); }
    A.landT += dt;
    var land = A.landAmp * sm(0, 0.08, A.landT) * (1 - sm(0.1, 0.45, A.landT));
    if (inAir || inClimb || st === 'dead') land = 0;
    var dip = land * legLen * mixf(0.21, 0.09, A.landRun);

    // ---------- desired limb targets ----------
    A.engT += dt;
    var gk = 1 - Math.exp(-dt * 17 * (0.3 + 0.7 * sm(0, 0.09, A.engT))), leanT = 0, headT = 0, pvY = 0, pvZ = 0, hipRel = 0, shRel = 0, cy = 0, cz = 0;
    if (inAir) {
      for (i = 0; i < 30; i++) des[i] = 0;
      var p = Math.max(-1.4, Math.min(1, vy / 6.7));
      var wR = sm(0.0, 0.55, p), wF = sm(0, 0.6, -p), wA = 1 - wR - wF, wP = A.tuck * (1 - sm(0.04, 0.13, A.airT));
      wF += (wA + wR) * (1 - A.tuck); wA *= A.tuck; wR *= A.tuck;
      var rk = A.runK, q1 = 1 - wP;
      addPose(POSE.rPush, wP * rk); addPose(POSE.rRise, q1 * wR * rk); addPose(POSE.rApex, q1 * wA * rk); addPose(POSE.rFall, q1 * wF * rk);
      addPose(POSE.sPush, wP * (1 - rk)); addPose(POSE.sRise, q1 * wR * (1 - rk)); addPose(POSE.sApex, q1 * wA * (1 - rk)); addPose(POSE.sFall, q1 * wF * (1 - rk));
      leanT = des[28]; headT = des[29];
    } else if (inClimb) {
      for (i = 0; i < 30; i++) des[i] = 0;
      var ku = sm(0.4, 0.6, t), kuA = A.handUse ? sm(0.15, 0.33, t) : 1; addPose(POSE.cHang, 1 - ku); addPose(POSE.cUp, ku);
      for (i = 14; i < 28; i++) des[i] = mixf(POSE.cHang[i], POSE.cUp[i], kuA);      // arms let go earlier than the legs change
      cy = group.position.y - c.fy; cz = (group.position.x - c.fx) * c.dx + (group.position.z - c.fz) * c.dz;
      if (c.synth) cy = c.h * sm(0, 0.6, t);
      var gIn = sm(0, 0.14, t);
      pvZ = (c.d - 0.27 * K) * gIn * (1 - sm(0.5, 0.92, t));
      // hips: hang under the hands, hold at ledge level while the arms press (support), crouch over the planted foot, stand up.
      // The capsule rises faster than a body can, so the visual pelvis is held back (never above where standing would put it).
      var hipS = I.hipY + cy - c.h, c0 = A.handUse ? 0.0 : 0.62 * legLen, c1 = A.handUse ? 0.5 * legLen : 0.62 * legLen;
      var cap = c0 + (c1 - c0) * sm(0.3, 0.6, t) + (I.hipY + 0.3 * K - c1) * sm(0.6, 0.98, t);
      pvY = (smin(hipS, cap, 0.12 * K) - hipS) * gIn;
      // catch: if the edge is out of reach, hop up to it (visual only), settling as the capsule rises
      var hz = c.d - pvZ - I.shZ, vr = 0.97 * armLen, need = (c.h - cy + 0.03 * K) - (I.shY + pvY + Math.sqrt(Math.max(0.01, vr * vr - hz * hz)));
      if (need > 0 && A.handUse) pvY += need * gIn * (1 - sm(0.3, 0.5, t));
      hipRel = hipS + pvY; shRel = hipRel + (I.shY - I.hipY);
      leanT = (A.handUse ? 0.75 : 0.3) * sm(-0.15 * K, 0.3 * K, shRel) * gIn * (1 - sm(0.62, 1, t));
      headT = -0.4 * (1 - sm(-0.3 * K, 0.1 * K, shRel)) * gIn * A.handUse - 0.45 * leanT;
    }
    if (inAir || inClimb) {
      var lead = inClimb ? c.lead : A.lead;
      for (i = 0; i < 4; i++) {
        L = I.limbs[i]; var slot = i < 2 ? (i === lead ? 0 : 1) : ((i - 2) === lead ? 2 : 3), o = slot * 7;
        for (n = 0; n < 7; n++) L.cur[n] += (des[o + n] - L.cur[n]) * gk;
      }
    }
    A.lean += (leanT - A.lean) * gk; A.headP += (headT - A.headP) * gk;
    var wL = A.ovL * A.ovL * (3 - 2 * A.ovL), wAm = A.ovA * A.ovA * (3 - 2 * A.ovA);

    // ---------- body ----------
    pivot.position.y += pvY - dip; pivot.position.z += pvZ;
    var bodyLean = A.lean * Math.max(wL, inAir || inClimb ? 1 : 0) + land * mixf(0.34, 0.12, A.landRun);
    if (Math.abs(bodyLean) > 1e-4) { rot(I.spine0, 1, 0, 0, bodyLean * 0.4); rot(I.spine, 1, 0, 0, bodyLean * 0.35); rot(I.spine2, 1, 0, 0, bodyLean * 0.25); }
    var hp = A.headP * wAm; if (Math.abs(hp) > 1e-4) { rot(I.neck, 1, 0, 0, hp * 0.4); rot(I.head, 1, 0, 0, hp * 0.6); }

    // ---------- limbs ----------
    if (wL > 0.001 || wAm > 0.001) {
      for (i = 0; i < 4; i++) {
        L = I.limbs[i]; var w = i < 2 ? wL : wAm, cu = L.cur, len = L.l1 + L.l2, isLead = inClimb && (i === c.lead);
        if (w <= 0.001) continue;
        L.up.parent.updateWorldMatrix(true, false);
        vR.copy(L.up.position).applyMatrix4(L.up.parent.matrixWorld);
        vTg.set(cu[0] * L.side, cu[1], cu[2]).multiplyScalar(len).applyQuaternion(qG).add(vR);
        vPo.set(cu[3] * L.side, cu[4], cu[5]);
        if (L.leg) { vPo.x += 0.02 * L.side; vPo.z += 0.12; } else { vPo.x += 0.05 * L.side; vPo.y -= 0.04; vPo.z -= 0.10; }
        var pitch = cu[6], plantW = 0;
        if (inClimb && L.leg) {
          var stp = I.stance[i], endY = c.h + stp.y, endZ = 0.68 + stp.z;
          if (isLead) {                         // lead foot: lift outside the face, over the lip, plant where she will stand
            var w1 = sm(0.1, 0.36, t), w2 = sm(0.42, 0.62, t);
            vA.set(0.25 * L.side, -0.26, 0).multiplyScalar(len).applyQuaternion(qG).add(vR); vTg.lerp(vA, w1);   // knee out and up beside the hip
            cPoint(vA, stp.x, endY + 0.22 * K * Math.sin(Math.PI * w2), endZ); vTg.lerp(vA, w2);
            vB.set(0.9 * L.side, 0.2, 0.3); vPo.lerp(vB, w1); vB.set(0.1 * L.side, 0.1, 1); vPo.lerp(vB, w2);
            pitch = mixf(pitch, -0.2, w1); pitch = mixf(pitch, 0, w2);
          } else {                              // trailing foot: tuck under the hip, swing through, plant
            var w3 = sm(0.56, 0.72, t), w4 = sm(0.76, 0.95, t);
            vA.set(0.03 * L.side, -0.42 * len, -0.03 * len).applyQuaternion(qG).add(vR); vTg.lerp(vA, w3);
            cPoint(vA, stp.x, endY + 0.05 * K * Math.sin(Math.PI * w4), endZ); vTg.lerp(vA, w4);
            vB.set(0.02 * L.side, 0.1, 1); vPo.lerp(vB, w3);
            pitch = mixf(pitch, 0, w4);
          }
        } else if (inClimb) {                   // hands: pinned to the ledge edge while it is within reach
          var hi = i - 2, press = sm(-0.1 * K, 0.25 * K, shRel), rel = hi === 1 ? 0.34 : 0.37;
          cPoint(vA, (I.shX + 0.03 * K) * L.side, c.h + 0.028 * K, (hi === 0 ? c.dl : c.dr) + mixf(-0.025, 0.07, press) * K);
          var stretch = vA.distanceTo(vR) - 0.985 * len;
          var pw = sm(0.0, 0.17, t) * (1 - sm(rel, rel + 0.16, t)) * (1 - sm(0.0, 0.3 * len, stretch)) * A.handUse;
          var app = 1 - sm(0.0, 0.17, t); vA.y += 0.1 * K * app; vA.addScaledVector(vF.set(c.dx, 0, c.dz), -0.08 * K * app);   // arrive from above / outside the lip
          A.plant[hi] = plantW = pw;
          vTg.lerp(vA, plantW);
          vB.set(mixf(0.9, 0.45, press) * L.side, mixf(-0.4, 0.1, press), mixf(-0.1, -0.9, press)); vPo.lerp(vB, plantW);
          A.hT[hi].copy(vA);
        }
        vPo.applyQuaternion(qG);
        solve(L, vTg, vPo, w);
        if (L.leg) {
          qX.setFromAxisAngle(X_AXIS, pitch); qE.copy(qG).multiply(qX).multiply(I.footRef[i]); setEnd(L, qE, w);
        } else if (plantW > 0.001) {            // palm on the ledge: fingers forward (tilted up over the lip while hanging), palm down
          var ph = mixf(0.5, 0.0, sm(-0.1 * K, 0.25 * K, shRel));
          vE.set(-0.12 * L.side, Math.sin(ph), Math.cos(ph)).normalize();           // fingers
          vF.set(1, 0, 0).cross(vE).normalize();                                     // palm normal
          vY.crossVectors(vE, vF); m4.makeBasis(vE, vF, vY); qE.setFromRotationMatrix(m4).premultiply(qG);
          setEnd(L, qE, plantW * w);
        }
      }
    }
    // ---------- landing: the body sinks, the feet stay on the ground, the knees absorb ----------
    if (dip > 1e-4) {
      var gy = group.position.y + I.ankleH;
      for (i = 0; i < 2; i++) {
        L = I.limbs[i]; L.end.updateWorldMatrix(true, false);
        vC.setFromMatrixPosition(L.end.matrixWorld);
        if (vC.y >= gy) continue;
        vA.setFromMatrixPosition(L.up.matrixWorld); vB.setFromMatrixPosition(L.lo.matrixWorld);
        L.end.matrixWorld.decompose(vT, qE, vS);
        vTg.set(vC.x, gy, vC.z);
        vPo.subVectors(vB, vA).normalize(); vF.set(0.03 * L.side, 0, 0.3).applyQuaternion(qG); vPo.add(vF);
        solve(L, vTg, vPo, 1); setEnd(L, qE, 1);
      }
    }
    if (inClimb) for (i = 0; i < 4; i++) measure(I, I.limbs[i], I.limbs[i].tmp);   // remember what is on screen (pinned limbs differ from their free pose)
    A.dipNow = dip; A.wasAir = inAir; A.wasClimb = inClimb;
  }

  api = { group: group, update: update, setVariant: setVariant, height: 1.62 };
  api._anim = A;
  api._dbg = function () { return 'inst=' + Object.keys(inst).join(',') + ' loading=' + Object.keys(loading).join(',') + ' variant=' + variant + ' fallback=' + !!fallback + ' pivot=' + pivot.children.length; };
  ensure(variant);
  setTimeout(function () { ensure(variant === 'elder' ? 'younger' : 'elder'); }, 2500);   // preload the other sister so switching is instant
  return api;
};
