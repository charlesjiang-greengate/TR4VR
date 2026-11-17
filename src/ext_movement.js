/* JL-TASK M — character movement, procedural layer (no assets, no external sources).
   Wraps ctx.heroine.update and adds bone overrides on the Bip01 rig AFTER the base animation:
   jump tuck driven by vy, extended fall, landing knee-bend recovery, hurt flinch, wading balance, idle breathing/look.
   Everything is additive on top of the mixer pose, allocation-free per frame, and a no-op if the rig is not found. */
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
    var air = 0, land = 0, hurt = 0, idle = 0, wade = 0, wasAir = false, lastVy = 0, lastHp = null;
    ctx.onUpdate(function (dt, time, pl) {
      if (!pl) return;
      if (lastHp !== null && pl.hp < lastHp && pl.hp > 0) hurt = 1;
      lastHp = pl.hp;
    });
    H.update = function (dt, s) {
      base.call(H, dt, s);
      try {
        if (!(dt > 0)) return;
        var st = s.state, vy = s.vy || 0, inAir = st === 'jump' || st === 'fall';
        if (wasAir && !inAir && st !== 'climb' && st !== 'dead' && lastVy < -2.5) land = Math.max(land, cl(-lastVy / 9));
        if (inAir) lastVy = vy;
        wasAir = inAir;
        air += ((inAir ? 1 : 0) - air) * (1 - Math.exp(-dt * 12));
        idle += ((st === 'idle' ? 1 : 0) - idle) * (1 - Math.exp(-dt * 4));
        wade += (((st === 'run' && group.position.y < -0.35) ? 1 : 0) - wade) * (1 - Math.exp(-dt * 5));
        land *= Math.exp(-dt * 6.5); hurt *= Math.exp(-dt * 5);
        var R = activeRig(); if (!R) return;
        group.getWorldQuaternion(qG);
        var pivot = group.children[0];
        if (air > 0.01) {
          var down = sm(1.5, 8, -vy), tuck = air * (1 - down), ext = air * down;
          rot(R.lThigh, 1, 0, 0, -0.85 * tuck); rot(R.lCalf, 1, 0, 0, 1.25 * tuck);        // lead knee up
          rot(R.rThigh, 1, 0, 0, -0.25 * tuck); rot(R.rCalf, 1, 0, 0, 0.95 * tuck);        // trailing heel tucked
          rot(R.spine, 1, 0, 0, 0.10 * tuck - 0.12 * ext);
          rot(R.lArm, 0, 0, 1, -0.45 * ext); rot(R.rArm, 0, 0, 1, 0.45 * ext);             // arms rise as she drops
          rot(R.lThigh, 1, 0, 0, -0.22 * ext); rot(R.rThigh, 1, 0, 0, -0.12 * ext);        // legs reach for the ground
          rot(R.lCalf, 1, 0, 0, 0.30 * ext); rot(R.rCalf, 1, 0, 0, 0.22 * ext);
        }
        if (land > 0.01) {
          var a = 0.7 * land;
          rot(R.lThigh, 1, 0, 0, -a); rot(R.rThigh, 1, 0, 0, -a);
          rot(R.lCalf, 1, 0, 0, 1.9 * a); rot(R.rCalf, 1, 0, 0, 1.9 * a);
          rot(R.spine, 1, 0, 0, 0.4 * a);
          rot(R.lArm, 1, 0, 0, 0.5 * a); rot(R.rArm, 1, 0, 0, 0.5 * a);
          if (pivot) pivot.position.y -= 0.25 * (H.height || 1.6) * ((1 - Math.cos(a)) + (1 - Math.cos(0.9 * a)));
        }
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
