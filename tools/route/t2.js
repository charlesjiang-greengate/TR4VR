(()=>{ const d=JL.debug, pl=d.pl, out=[]; const L=(n,r)=>out.push(n+': '+JSON.stringify(r).replace(/"/g,''));
 let fail=false;
 const go=(pts,o)=>{ let r; for(const pt of pts){ r=d.sim((o&&o.T)||12,Object.assign({to:pt},o||{})); if(Math.hypot(pt[0]-r.x,pt[1]-r.z)>((o&&o.tol)||0.35)+0.3){ L('STUCK heading to '+pt,r); fail=true; return r; } } return r; };
 const waitT=(f)=>{ let r=d.sim(1/60,{}); let n=0; while(!f(r.t)&&n++<600) r=d.sim(1/60,{}); return r; };
 // ---- WEST ----
 L('toWest', go([[34,70],[6,70],[6,62],[22,62],[22,54],[6,54],[6,46],[14,46],[14,38],[6,38],[6,35.6]]));
 [[34,2.6],[30,1.3],[26,0]].forEach(b=>{ const r0=go([[6,b[0]+1.5]]); const w=waitT(t=>{const p=2.4*t+b[1]; return Math.abs(Math.sin(p))>0.5&&Math.sin(p)*Math.cos(p)>0;}); L('blade z'+b[0], go([[6,b[0]-1.6]])); });
 L('seal1', go([[6,22],[12.5,22.7],[14.6,23],[14,28.9]],{tol:0.6}));
 // back out through blades southwards using same timing
 d.tp(6,0,22); [[26,0],[30,1.3],[34,2.6]].forEach(b=>{ go([[6,b[0]-1.5]]); waitT(t=>{const p=2.4*t+b[1]; return Math.abs(Math.sin(p))>0.5&&Math.sin(p)*Math.cos(p)>0;}); go([[6,b[0]+1.6]]); });
 L('westBack', go([[6,38],[14,38],[14,46],[6,46],[6,54],[22,54],[22,62],[6,62],[6,70],[34,70]]));
 // ---- EAST ----
 L('toLever', go([[62,70],[62,46],[54,46],[54,54],[43.6,54]]));
 L('leverAct', d.sim(0.5,{act:true}));
 L('toSpikes', go([[54,54],[54,38],[55.4,38]]));
 waitT(t=>{const c=t%3; return c>2.15&&c<2.3;}); L('spikes', go([[61.5,38]]));
 L('toPit', go([[62,37.2]]));
 L('pitJump', d.sim(3,{to:[62,30],jumpIf:p=>p.grounded&&p.pos.z<35.75&&p.pos.z>35.2}));
 L('toA', d.sim(3,{to:[62.5,27],jumpIf:p=>p.grounded&&p.pos.z<28.6&&p.pos.y<0.1,until:p=>p.grounded&&p.pos.y>1.7}));
 L('toB', d.sim(3,{to:[62.3,23],jumpIf:p=>p.grounded&&p.pos.z<25.6&&p.pos.y<1.9,until:p=>p.grounded&&p.pos.y>3.5}));
 L('onB', go([[62.8,22]]));
 L('jumpC', d.sim(4,{to:[55,21.9],tol:0.5,jumpIf:p=>p.grounded&&p.pos.x<60.95&&p.pos.x>58}));
 L('offC', go([[54,26],[54,30],[46,30],[46,46.6],[34.2,46.6],[34.2,45.2]],{tol:0.5}));
 L('stones', go([[34.2,42.9],[33.7,41.0],[34.3,39.1],[33.9,37.3],[33.9,35.4],[34,34.3]]));
 L('toGate', go([[34,35.4],[33.9,37.3],[34.3,39.1],[33.7,41.0],[34.2,42.9],[34.2,46.6],[46,46.6],[46,22.9],[34,22.9],[34,20]],{tol:0.5}));
 L('gateAct', d.sim(0.5,{act:true}));
 L('toIdol', go([[34,11.2]],{tol:0.5}));
 L('idolAct', d.sim(0.5,{act:true}));
 out.push(fail?'FAIL':'ALL OK');
 return out; })()
