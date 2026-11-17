// compare IK-thigh quaternion against mocap thigh quaternion for the same pose (roll check)
const fs = require('fs'); const { T, bonesOf } = require('./lib.js');
const window = { JL: { ext: [] } }; global.window = window; global.JL = window.JL;
new Function('window', 'JL', 'setTimeout', fs.readFileSync('/home/user/TR4VR/src/heroine2.js', 'utf8'))(window, window.JL, () => 0);
const H = window.createHeroine2(T); const sc = new T.Scene(); sc.add(H.group);
const hs = { state: 'run', speed: 5.4, vy: 0, climbT: 0, t: 0 };
for (let i = 0; i < 40; i++) H.update(1 / 60, hs); sc.updateMatrixWorld(true);
const B = bonesOf(H.group.children[0].children[0]);
const q0 = {}; for (const k of ['L_Thigh', 'L_Calf', 'R_Thigh', 'R_Calf', 'L_UpperArm', 'L_Forearm', 'R_UpperArm', 'R_Forearm']) q0[k] = B[k].quaternion.clone();
hs.state = 'jump'; hs.vy = 6.7; H.update(1e-6, hs);   // engage: IK re-solves the measured pose at w = 1
for (const k in q0) console.log(k, 'angle between mocap local quat and IK local quat (deg):', (q0[k].angleTo(B[k].quaternion) * 57.3).toFixed(1));
