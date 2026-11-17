const { T, jointPos, bonesOf } = require('./lib.js');
const L = new T.GLTFLoader(); let model, run, idle;
const who = process.argv[2] || 'elder', bip = who === 'elder' ? 'Bip01' : 'Bip02';
L.load('assets/char2/' + who + '.glb', g => model = g); L.load('assets/char2/a_run.glb', g => run = g.animations[0]); L.load('assets/char2/a_idle.glb', g => idle = g.animations[0]);
const B = bonesOf(model.scene); model.scene.updateMatrixWorld(true);
const f = v => '(' + v.toArray().map(x => x.toFixed(2)).join(',') + ')';
const ax = (b, x, y, z) => new T.Vector3(x, y, z).applyQuaternion(b.getWorldQuaternion(new T.Quaternion()));
for (const s of ['L', 'R']) { const h = B[s + '_Hand']; console.log(s, 'hand bind: X', f(ax(h, 1, 0, 0)), 'Y', f(ax(h, 0, 1, 0)), 'Z', f(ax(h, 0, 0, 1))); const ft = B[s + '_Foot']; console.log(s, 'foot bind: X', f(ax(ft, 1, 0, 0)), 'Y', f(ax(ft, 0, 1, 0)), 'Z', f(ax(ft, 0, 0, 1)));
  const u = B[s + '_UpperArm']; console.log(s, 'uarm bind: X', f(ax(u, 1, 0, 0)), 'Y', f(ax(u, 0, 1, 0)), 'Z', f(ax(u, 0, 0, 1))); const th = B[s + '_Thigh']; console.log(s, 'thigh bind: X', f(ax(th, 1, 0, 0)), 'Y', f(ax(th, 0, 1, 0)), 'Z', f(ax(th, 0, 0, 1))); }
const ren = c => { c.tracks.forEach(t => t.name = t.name.replace(/^Bip01/, bip)); c.tracks = c.tracks.filter(t => /quaternion$/.test(t.name)); return c; };
const mixer = new T.AnimationMixer(model.scene); const a = mixer.clipAction(ren(run)); a.play();
const wq = b => b.getWorldQuaternion(new T.Quaternion()), wp = b => b.getWorldPosition(new T.Vector3());
for (const [u, l, e] of [['L_Thigh', 'L_Calf', 'L_Foot'], ['R_Thigh', 'R_Calf', 'R_Foot'], ['L_UpperArm', 'L_Forearm', 'L_Hand'], ['R_UpperArm', 'R_Forearm', 'R_Hand']]) {
  let out = [];
  for (let i = 0; i < 8; i++) { a.time = run.duration * i / 8; mixer.update(0); model.scene.updateMatrixWorld(true);
    const d1 = wp(B[l]).sub(wp(B[u])).normalize(), d2 = wp(B[e]).sub(wp(B[l])).normalize(); const c = new T.Vector3().crossVectors(d1, d2); const sn = c.length(); c.normalize();
    out.push(sn.toFixed(2) + ' hU' + f(c.clone().applyQuaternion(wq(B[u]).invert())) + ' hL' + f(c.clone().applyQuaternion(wq(B[l]).invert())) + ' hW' + f(c)); }
  console.log(u, '\n  ' + out.join('\n  '));
}
// idle stance
const m2 = new T.AnimationMixer(model.scene); a.stop(); const ai = m2.clipAction(ren(idle)); ai.play(); m2.update(0); model.scene.updateMatrixWorld(true);
for (const k of ['Pelvis', 'L_Foot', 'R_Foot', 'L_Toe0', 'L_Hand', 'R_Hand', 'L_UpperArm', 'L_Forearm', 'Head']) console.log('idle', k, f(wp(B[k])));
for (const s of ['L', 'R']) { const h = B[s + '_Hand']; console.log(s, 'hand idle: X', f(ax(h, 1, 0, 0)), 'Y', f(ax(h, 0, 1, 0)), 'Z', f(ax(h, 0, 0, 1))); }
