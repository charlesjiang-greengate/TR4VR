const fs = require('fs'); const { T, bonesOf } = require('./lib.js');
const window = { JL: { ext: [] } }; global.window = window; global.JL = window.JL;
let src = fs.readFileSync('/home/user/TR4VR/src/heroine2.js', 'utf8').replace("api._anim = A;", "api._anim = A; api._inst = inst;");
new Function('window', 'JL', 'setTimeout', src)(window, window.JL, () => 0);
const H = window.createHeroine2(T); const sc = new T.Scene(); sc.add(H.group);
const hs = { state: 'run', speed: 5.4, vy: 0, climbT: 0, t: 0 }; const I = H._inst.elder;
const show = tag => { sc.updateMatrixWorld(true); const B = bonesOf(I.root); const p = k => new T.Vector3().setFromMatrixPosition(B[k].matrixWorld); console.log(tag, 'ov', H._anim.ovL.toFixed(2), 'cur0', Array.from(I.limbs[0].cur).map(x => x.toFixed(2)).join(' '), 'LF', p('L_Foot').toArray().map(x => x.toFixed(2)).join(','), 'hip', p('L_Thigh').toArray().map(x => x.toFixed(2)).join(','), 'pivot', H.group.children[0].position.toArray().map(x => x.toFixed(2)).join(',')); };
for (let i = 0; i < 40; i++) H.update(1 / 60, hs);
hs.state = 'fall'; hs.vy = -1; for (let i = 0; i < 30; i++) { hs.vy -= 0.2; H.update(1 / 60, hs); } show('fall');
hs.state = 'run'; hs.vy = 0; for (let i = 0; i < 4; i++) { H.update(1 / 60, hs); show('land' + i); }
