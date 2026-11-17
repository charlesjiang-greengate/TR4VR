(()=>{ const d=JL.debug, pl=d.pl, C=d.colliders, out=[]; const L=(n,r)=>out.push(n+': '+JSON.stringify(r).replace(/"/g,''));
 let fail=false;
 const go=(pts,o)=>{ let r; for(const pt of pts){ r=d.sim((o&&o.T)||12,Object.assign({to:pt},o||{})); if(Math.hypot(pt[0]-r.x,pt[1]-r.z)>((o&&o.tol)||0.35)+0.3){ L('STUCK heading to '+pt,r); fail=true; return r; } } return r; };
 const waitT=(f)=>{ let r=d.sim(1/60,{}); let n=0; while(!f(r.t)&&n++<600) r=d.sim(1/60,{}); return r; };
 // seal 1
 d.tp(14,0,24); L('seal1', go([[14,28.9]],{tol:0.6}));
 d.tp(6,0,23); d.sim(1.3,{}); let r; for(let i=0;i<40&&!pl.dead;i++){ r=d.sim(1.5,{to:[6,26],tol:0.1,until:p=>p.dead>0}); if(!pl.dead) r=d.sim(1.5,{to:[6,24.5],tol:0.2,until:p=>p.dead>0}); } L('bladeKill safe='+pl.safe.x.toFixed(1)+','+pl.safe.z.toFixed(1), r); r=d.sim(3,{}); L('respawn', r);
 d.tp(62,0,38); d.sim(1.3,{}); r=d.sim(4,{to:[62,30],until:p=>p.dead>0}); L('pitFall(walk)', r); r=d.sim(3,{}); L('pitRespawn', r);
 d.tp(62,0,38); d.sim(0.3,{}); r=d.sim(3,{to:[62,30],jumpIf:p=>p.grounded&&p.pos.z<35.75&&p.pos.z>35.2}); L('pitJump', r);
 d.tp(62,0,30); d.sim(0.3,{}); r=d.sim(3,{to:[62,38],jumpIf:p=>p.grounded&&p.pos.z>32.25&&p.pos.z<32.8}); L('pitJumpBack', r);
 d.tp(62,0,38); d.sim(0.3,{}); r=d.sim(3,{to:[62,30],jumpIf:p=>p.grounded&&p.pos.z<36.6&&p.pos.z>36.2,until:p=>p.dead>0}); L('pitJump early(0.9m early)', r); d.sim(3,{});
 d.tp(62,0,29.5); d.sim(0.2,{}); r=d.sim(3,{to:[62.5,27],jumpIf:p=>p.grounded&&p.pos.z<28.6&&p.pos.y<0.1,until:p=>p.grounded&&p.pos.y>1.7}); L('toA', r);
 r=d.sim(3,{to:[62.3,23],jumpIf:p=>p.grounded&&p.pos.z<25.6&&p.pos.y<1.9,until:p=>p.grounded&&p.pos.y>3.5}); L('toB', r);
 d.tp(34.2,0,45.3); r=go([[34.2,42.9],[33.7,41.0],[34.3,39.1],[33.9,37.3],[33.9,35.4]]); L('stones', r);
 d.tp(34.2,0,45.3); r=d.sim(4,{to:[33.9,35.4],jumpIf:p=>p.grounded&&Math.random()<0.05}); L('stones w/ random jumps', r);
 // spike damage
 d.tp(55.3,0,38); d.sim(0.3,{}); waitT(t=>{const c=t%3; return c>0.1&&c<0.2;}); r=d.sim(2,{to:[57,38],tol:0.2}); r=d.sim(1,{}); L('spikeHit', r);
 // wall mantle attempts: jump at walls / gate / lantern / from block B to wall
 d.tp(34,0,70); r=d.sim(2,{camYaw:Math.PI/2*0,fwd:1,jumpIf:p=>p.grounded}); L('jumpWallS', r);
 d.tp(34,0,20.5); r=d.sim(2,{camYaw:Math.PI,fwd:1,jumpIf:p=>p.grounded}); L('jumpGate', r);
 d.tp(62.5,3.6,22); r=d.sim(3,{camYaw:Math.PI/2,fwd:1,jumpIf:p=>p.grounded}); L('jumpWallFromB(east)', r);
 d.tp(62.5,3.6,22); r=d.sim(3,{camYaw:Math.PI,fwd:1,jumpIf:p=>p.grounded}); L('jumpWallFromB(north)', r);
 // B->C short jump (late/early) : grab
 d.tp(63.5,3.6,22); r=d.sim(4,{to:[55,21.9],tol:0.5,jumpIf:p=>p.grounded&&p.pos.x<61.6&&p.pos.x>58}); L('jumpC early', r);
 d.tp(63.5,3.6,22); r=d.sim(4,{to:[55,21.9],tol:0.5}); L('walk off B (no jump)', r);
 // island jitter
 d.tp(34,0.3,35.2); let ys=[]; for(let i=0;i<30;i++){ r=d.sim(1/60,{}); ys.push(pl.pos.y);} L('islandIdle y range', [Math.min(...ys),Math.max(...ys)]);
 // island straight-on from pool west
 d.tp(29,-0.9,34.5); L('wadeOntoIsland W', d.sim(5,{to:[33,34.5],tol:0.4}));
 // fuzz
 let rs=1234567; const rnd=()=>{rs=(rs*1664525+1013904223)>>>0; return rs/4294967296;};
 const starts=[[34,0,70],[34,0,46],[6,0,38],[62,0,38],[62,3.6,22],[34,0.3,35.3],[14,0,24],[54,0,54],[30,-0.9,30],[34,0,22.8]];
 let bad=[];
 for(const s of starts){ d.tp(s[0],s[1],s[2]); for(let k=0;k<160;k++){ r=d.sim(0.25,{camYaw:rnd()*6.283,fwd:1,jump:rnd()<0.4,right:rnd()<0.3?1:0});
   const p=pl.pos; if(!isFinite(p.x+p.y+p.z)||p.x<0||p.x>68||p.z<0||p.z>76||p.y>4.9){ bad.push(['OOB',s,p.x.toFixed(2),p.y.toFixed(2),p.z.toFixed(2)]); break; }
   if(!pl.climb&&!pl.dead) for(const b of C){ if(b.off) continue; if(p.x>b.x0+0.1&&p.x<b.x1-0.1&&p.z>b.z0+0.1&&p.z<b.z1-0.1&&p.y+0.9>b.y0&&p.y+0.5<b.y1-0.05){ bad.push(['INSIDE',s,p.x.toFixed(2),p.y.toFixed(2),p.z.toFixed(2),[b.x0,b.y0,b.z0,b.x1,b.y1,b.z1].map(v=>+v.toFixed(1))]); break; } }
   if(bad.length>6) break; } }
 L('fuzz bad', bad); L('fuzz end', d.sim(0.1,{}));
 return out; })()
