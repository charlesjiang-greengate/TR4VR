const ST = "(function(n,inp){var d=JL.debug,H=JL.ctx.heroine,pl=d.pl,r;for(var i=0;i<n;i++){r=d.sim(1/60,i?Object.assign({},inp,{jump:false}):inp);H.group.position.copy(pl.pos);H.group.rotation.y=pl.yaw;H.update(1/60,{state:pl.state,speed:Math.hypot(pl.vel.x,pl.vel.z),vy:pl.vel.y,climbT:Math.min(1,Math.max(0,pl.climbT)),t:i/60});}d.cam=CAM;var A=H._anim;return JSON.stringify({st:r.st,y:r.y,vy:+pl.vel.y.toFixed(2),ct:+pl.climbT.toFixed(2),plant:A&&A.plant,dbg:H._dbg()})})";
const E = '{fwd:1,camYaw:1.57}', EJ = '{fwd:1,camYaw:1.57,jump:true}', N = '{fwd:1,camYaw:3.14}', NJ = '{fwd:1,camYaw:3.14,jump:true}';
const side = '[0,0.05]', cside = '[1.57,0.12]';
const mk = (name, calls, cam, extra) => Object.assign({ name, cam: JSON.parse(cam), frames: 2, js: calls.map(c => ST.replace('CAM', cam) + '(' + c + ')').join(';') }, extra || {});
const steps = [
  mk('e_rise', ['40,' + E, '3,' + EJ], side, { tp: [30, 0, 22] }),
  mk('e_apex', ['9,' + E], side),
  mk('e_fall', ['8,' + E], side),
  mk('e_climb1', ['30,' + N, '6,' + NJ], cside, { tp: [62.5, 0, 30] }),
  mk('e_climb2', ['7,' + N], cside),
  mk('e_climb3', ['5,' + N], cside),
  { name: 'y_switch', js: "JL.ctx.heroine.setVariant('younger');1", frames: 1, wait: 500 },
  mk('y_climb1', ['30,' + N, '6,' + NJ], cside, { tp: [62.5, 0, 30], wait: 1500 }),
  mk('y_climb2', ['7,' + N], cside),
  mk('y_apex', ['40,' + E, '3,' + EJ, '14,' + E], side, { tp: [30, 0, 22] }),
];
process.stdout.write(JSON.stringify(steps));
