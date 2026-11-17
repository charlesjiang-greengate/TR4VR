const ST = "(function(n,inp){var d=JL.debug,H=JL.ctx.heroine,pl=d.pl,r;for(var i=0;i<n;i++){r=d.sim(1/60,i?Object.assign({},inp,{jump:false}):inp);H.group.position.copy(pl.pos);H.group.rotation.y=pl.yaw;H.update(1/60,{state:pl.state,speed:Math.hypot(pl.vel.x,pl.vel.z),vy:pl.vel.y,climbT:Math.min(1,Math.max(0,pl.climbT)),t:i/60});}d.cam=CAM;var A=H._anim;return JSON.stringify({st:r.st,y:r.y,vy:+pl.vel.y.toFixed(2),ct:+pl.climbT.toFixed(2),plant:A&&A.plant.map(function(x){return +x.toFixed(2)})})})";
const N = '{fwd:1,camYaw:3.14}', NJ = '{fwd:1,camYaw:3.14,jump:true}', I0 = '{camYaw:1.57}', IJ = '{camYaw:1.57,jump:true}';
const mk = (name, calls, cam, extra) => Object.assign({ name, cam: JSON.parse(cam), frames: 2, js: calls.map(c => ST.replace('CAM', cam) + '(' + c + ')').join(';') }, extra || {});
const a1 = '[2.4,0.15]', a2 = '[3.9,0.15]';
const steps = [
  mk('e_c1', ['30,' + N, '12,' + NJ], a1, { tp: [62.5, 0, 30] }),
  mk('e_c2', ['12,' + N], a2),
  mk('e_c3', ['10,' + N], a1),
  mk('e_c4', ['10,' + N], a2),
  mk('e_sfall', ['6,' + I0, '25,' + IJ], '[0,0.05]', { tp: [30, 0, 22] }),
  { name: 'y_switch', js: "JL.ctx.heroine.setVariant('younger');1", frames: 1, wait: 300 },
  mk('y_c2', ['30,' + N, '24,' + NJ], a1, { tp: [62.5, 0, 30], wait: 1200 }),
  mk('y_c3', ['10,' + N], a2),
];
process.stdout.write(JSON.stringify(steps));
