const fs = require('fs'); const { T, bonesOf } = require('./lib.js');
const window = { JL: { ext: [] } }; global.window = window;
new Function('window', 'setTimeout', fs.readFileSync('/home/user/TR4VR/src/heroine2.js', 'utf8'))(window, () => 0);
const H = window.createHeroine2(T); const sc = new T.Scene(); sc.add(H.group); H.group.rotation.y = +process.argv[2] || 0; H.setVariant(process.argv[3] || 'elder');
const hs = { state: 'run', speed: 5.4, vy: 0, climbT: 0, t: 0 }; const B = bonesOf(H.group.children[0].children.find(c => c.visible));
const keys = ['L_Thigh', 'L_Calf', 'R_Thigh', 'R_Calf', 'L_UpperArm', 'L_Forearm', 'R_UpperArm', 'R_Forearm', 'L_Foot', 'R_Foot', 'L_Hand', 'R_Hand'];
let worst = 0;
for (let ph = 0; ph < 14; ph++) {
  hs.state = 'run'; hs.vy = 0; for (let i = 0; i < 40 + ph * 3; i++) H.update(1 / 60, hs); sc.updateMatrixWorld(true);
  const q0 = {}; for (const k of keys) q0[k] = B[k].getWorldQuaternion(new T.Quaternion());
  hs.state = 'fall'; hs.vy = -0.3; H.update(1 / 60, hs); sc.updateMatrixWorld(true);
  const d = keys.map(k => q0[k].angleTo(B[k].getWorldQuaternion(new T.Quaternion())) * 57.3); worst = Math.max(worst, ...d);
  console.log(ph, hs.state, keys.map((k, i) => k + ':' + d[i].toFixed(0)).join(' '));
}
console.log('worst', worst.toFixed(1));
