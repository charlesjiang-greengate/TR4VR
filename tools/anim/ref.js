// reference sheets of raw clips on the elder rig: node ref.js <clip> <n> <out.png>
const { T, Img, drawFig, jointPos, bonesOf } = require('./lib.js');
const L = new T.GLTFLoader(); let model, clip;
L.load('assets/char2/elder.glb', g => model = g); L.load('assets/char2/' + process.argv[2] + '.glb', g => clip = g.animations[0]);
const group = new T.Group(); group.add(model.scene); const mixer = new T.AnimationMixer(model.scene);
// strip root x/z
clip.tracks.forEach(t => { if (t.name === 'Bip01.position') for (let k = 0; k < t.values.length; k += 3) { t.values[k] = 0; t.values[k + 2] = 0; } });
clip.tracks = clip.tracks.filter(t => /quaternion$/.test(t.name) || t.name === 'Bip01.position');
const a = mixer.clipAction(clip); a.play();
const n = +process.argv[3] || 12, W = 200, H = 260, img = new Img(W * n, H * 2);
console.log('dur', clip.duration);
for (let i = 0; i < n; i++) { a.time = clip.duration * i / n; mixer.update(0); group.updateMatrixWorld(true); const P = jointPos(group, model.scene);
  drawFig(img, P, W * i + 100, 230, 105, 'side', pr => { const A = pr({ x: 0, y: 0, z: -0.8 }), B = pr({ x: 0, y: 0, z: 0.8 }); img.line(A[0], A[1], B[0], B[1], [150, 150, 150], 1); });
  drawFig(img, P, W * i + 100, H + 230, 105, 'front', pr => { const A = pr({ x: -0.8, y: 0, z: 0 }), B = pr({ x: 0.8, y: 0, z: 0 }); img.line(A[0], A[1], B[0], B[1], [150, 150, 150], 1); });
  img.text(W * i + 4, 4, (a.time).toFixed(2));
  if (process.argv[5]) { const B = bonesOf(model.scene); const f = x => x.toFixed(2); console.log(a.time.toFixed(2), 'LFoot', f(P.L_Foot.y), f(P.L_Foot.z), 'RFoot', f(P.R_Foot.y), f(P.R_Foot.z), 'LToe', f(P.L_Toe0.y), 'RToe', f(P.R_Toe0.y), 'pelv', f(P.Pelvis.y)); }
}
img.save(process.argv[4] || 'ref.png');
