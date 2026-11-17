(()=>{ const d=JL.debug, pl=d.pl, C=d.colliders, out=[]; const L=(n,r)=>out.push(n+': '+JSON.stringify(r).replace(/"/g,''));
 const go=(pts,o)=>{ let r; for(const pt of pts){ r=d.sim((o&&o.T)||12,Object.assign({to:pt},o||{})); if(Math.hypot(pt[0]-r.x,pt[1]-r.z)>((o&&o.tol)||0.35)+0.3){ L('STUCK heading to '+pt,r); return r; } } return r; };
 const waitT=(f)=>{ let r=d.sim(1/60,{}); let n=0; while(!f(r.t)&&n++<600) r=d.sim(1/60,{}); return r; };
 let r;
 // pocket between B and C: fall in, escape
 d.tp(62.5,3.6,22); r=d.sim(3,{to:[58.8,22],tol:0.3}); L('fallPocket', r);
 L('escapePocket', go([[58.8,23.45],[52.6,23.45]],{tol:0.3})); L('escape2', go([[54,26],[54,30]],{tol:0.4}));
 // seal 2 still collectable on C
 d.tp(63.5,3.6,22); r=d.sim(4,{to:[55,21.7],tol:0.5,jumpIf:p=>p.grounded&&p.pos.x<60.95&&p.pos.x>58}); L('jumpC', r);
 // spikes: walk in when up
 d.tp(55.2,0,38); d.sim(0.2,{}); waitT(t=>{const c=t%3; return c>0.05&&c<0.15;}); r=d.sim(0.6,{to:[57,38],tol:0.2}); L('spikeHit', r); d.sim(6,{});
 // blade corridor fuzz (knockback vs walls)
 let rs=99; const rnd=()=>{rs=(rs*1664525+1013904223)>>>0; return rs/4294967296;}; let bad=[], deaths=0;
 d.tp(6,0,30); for(let k=0;k<400;k++){ r=d.sim(0.2,{camYaw:rnd()<0.5?0:Math.PI+ (rnd()-0.5),fwd:1,jump:rnd()<0.3}); const p=pl.pos; if(r.dead)deaths++; if(p.x<4.3||p.x>15.7||p.z<20||p.z>40.1||p.y>2||!isFinite(p.x)){bad.push([p.x.toFixed(2),p.y.toFixed(2),p.z.toFixed(2)]); break;} }
 L('bladeFuzz bad', bad); L('bladeFuzz end', r);
 // gate & idol
 d.give(); d.tp(46,0,24); d.sim(2.5,{});
 L('toGate', go([[46,22.3],[41,22.3],[34,22.6],[34,20]],{tol:0.5}));
 r=d.sim(1.5,{to:[34,12],tol:0.3}); L('gateBlocks(before act)', r);
 L('gateAct', d.sim(0.5,{act:true}));
 L('toIdol', go([[34,11.4]],{tol:0.5}));
 L('idolAct', d.sim(0.5,{act:true}));
 r=d.sim(1,{fwd:1,camYaw:0,jump:true}); L('afterWin(no move)', r);
 return out; })()
