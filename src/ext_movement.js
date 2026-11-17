/* JL-TASK M — character movement, small procedural overlays (no assets, no external sources).
   Wraps ctx.heroine.update and adds bone deltas on the Bip01 / Bip02 rig AFTER the base animation:
   hurt flinch, wading balance, idle breathing / weight shift / look-around.
   Jump, fall, landing and the ledge climb are NOT handled here any more: src/heroine2.js owns them (one source of truth).
   Everything is additive on top of the heroine's pose, allocation-free per frame, and a no-op if the rig is not found. */
(window.JL.ext = window.JL.ext || []).push(function (ctx) {
  try {
    var THREE = ctx.THREE, H = ctx.heroine;
    if (!H || !H.group || typeof H.update !== 'function') return;
    var group = H.group, base = H.update;
    var qP = new THREE.Quaternion(), qPi = new THREE.Quaternion(), qW = new THREE.Quaternion(), qG = new THREE.Quaternion(), ax = new THREE.Vector3();
    function rot(bone, x, y, z, ang) {          // axis in the heroine's frame: X = her left, Y = up, Z = forward
      if (!bone || !bone.parent || Math.abs(ang) < 1e-4) return;
      ax.set(x, y, z).applyQuaternion(qG);
      bone.parent.getWorldQuaternion(qP); qPi.copy(qP).invert();
      qW.setFromAxisAngle(ax, ang);
      bone.quaternion.premultiply(qP).premultiply(qW).premultiply(qPi);
    }
    var cl = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
    var sm = function (a, b, x) { var t = cl((x - a) / (b - a)); return t * t * (3 - 2 * t); };
    var NAMES = { lArm: 'L_UpperArm', rArm: 'R_UpperArm', lFore: 'L_Forearm', rFore: 'R_Forearm', lThigh: 'L_Thigh', rThigh: 'R_Thigh', lCalf: 'L_Calf', rCalf: 'R_Calf', spine: 'Spine1', head: 'Head' };
    function ends(s, suf) { return s.length >= suf.length && s.lastIndexOf(suf) === s.length - suf.length; }
    function rig(root) {
      var R = root.userData._mv; if (R !== undefined) return R;
      R = {}; var n = 0;
      root.traverse(function (o) { if (!o.isBone) return; for (var k in NAMES) if (!R[k] && ends(o.name, NAMES[k])) { R[k] = o; n++; } });
      root.userData._mv = R = (n >= 8 ? R : null);
      return R;
    }
    function activeRig() {
      var pivot = group.children[0]; if (!pivot) return null;
      for (var i = 0; i < pivot.children.length; i++) { var c = pivot.children[i]; if (c.visible) { var R = rig(c); if (R) return R; } }
      return null;
    }
    var hurt = 0, idle = 0, wade = 0, lastHp = null;
    ctx.onUpdate(function (dt, time, pl) {
      if (!pl) return;
      if (lastHp !== null && pl.hp < lastHp && pl.hp > 0) hurt = 1;
      lastHp = pl.hp;
    });
    H.update = function (dt, s) {
      base.call(H, dt, s);
      try {
        if (!(dt > 0)) return;
        var st = s.state;
        idle += ((st === 'idle' ? 1 : 0) - idle) * (1 - Math.exp(-dt * 4));
        wade += (((st === 'run' && group.position.y < -0.35) ? 1 : 0) - wade) * (1 - Math.exp(-dt * 5));
        hurt *= Math.exp(-dt * 5);
        var R = activeRig(); if (!R) return;
        group.getWorldQuaternion(qG);
        if (hurt > 0.01) {
          rot(R.spine, 1, 0, 0, 0.42 * hurt); rot(R.head, 1, 0, 0, 0.28 * hurt);
          rot(R.lArm, 1, 0, 0, -0.55 * hurt); rot(R.rArm, 1, 0, 0, -0.55 * hurt);
          rot(R.lFore, 1, 0, 0, -0.7 * hurt); rot(R.rFore, 1, 0, 0, -0.7 * hurt);
        }
        if (wade > 0.01) {
          rot(R.lArm, 0, 0, 1, -0.32 * wade); rot(R.rArm, 0, 0, 1, 0.32 * wade);
          rot(R.spine, 1, 0, 0, 0.08 * wade);
        }
        if (idle > 0.01) {
          var t = s.t || 0;
          rot(R.spine, 1, 0, 0, 0.018 * Math.sin(t * 1.7) * idle);                         // breathing
          rot(R.spine, 0, 0, 1, 0.022 * Math.sin(t * 0.45) * idle);                        // weight shift
          rot(R.head, 0, 1, 0, 0.14 * Math.sin(t * 0.31) * Math.sin(t * 0.83 + 1.3) * idle); // look around
        }
      } catch (e) { if (!H._mvErr) { H._mvErr = 1; console.warn('ext_movement', e); } }
    };
  } catch (e) { console.warn('ext_movement init', e); }
});
