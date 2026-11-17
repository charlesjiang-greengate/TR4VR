(()=>{ const d=JL.debug, pl=d.pl, C=d.colliders, out=[]; const L=(n,r)=>out.push(n+': '+JSON.stringify(r).replace(/"/g,''));
 const go=(pts,o)=>{ let r; for(const pt of pts){ r=d.sim((o&&o.T)||12,Object.assign({to:pt},o||{})); if(Math.hypot(pt[0]-r.x,pt[1]-r.z)>((o&&o.tol)||0.35)+0.3){ L('STUCK heading to '+pt,r); return r; } } return r; };
 let r, rs=99; const rnd=()=>{rs=(rs*1664525+1013904223)>>>0; return rs/4294967296;}; let bad=[], deaths=0, minhp=100;
 d.tp(6,0,30); for(let k=0;k<500;k++){ r=d.sim(0.2,{camYaw:rnd()<0.5?0:Math.PI+(rnd()-0.5),fwd:1,jump:rnd()<0.3}); const p=pl.pos; if(r.dead)deaths++; minhp=Math.min(minhp,r.hp); if(p.x<4.3||p.x>15.7||p.z<20||p.z>40.1||p.y>2.5||!isFinite(p.x)){bad.push([p.x.toFixed(2),p.y.toFixed(2),p.z.toFixed(2)]); break;} }
 L('bladeFuzz bad', bad); L('bladeFuzz deaths(frames)/minhp', [deaths,minhp]); L('safe', [pl.safe.x.toFixed(1),pl.safe.z.toFixed(1)]);
 // stones crossing, both directions, and with jumps
 d.tp(34.2,0,45.3); d.sim(2.5,{}); L('stones N', go([[34.2,42.9],[33.7,41.0],[34.3,39.1],[33.9,37.3],[33.9,35.2]]));
 L('stones S', go([[33.9,37.3],[34.3,39.1],[33.7,41.0],[34.2,42.9],[34.2,45.3]]));
 d.tp(34.2,0,45.3); r=d.sim(5,{to:[34,35.2],jumpIf:p=>p.grounded&&rnd()<0.06}); L('stones straight w/ jumps', r);
 // general fuzz
 const starts=[[34,0,70],[34,0,46],[6,0,38],[62,0,38],[62,3.6,22],[34,0.3,35.3],[14,0,24],[54,0,54],[30,-0.9,30],[34,0,22.8],[55,3.6,21.7],[62.5,1.8,26.5],[58.8,0,22]];
 for(const s of starts){ d.tp(s[0],s[1],s[2]); d.sim(2.2,{}); d.tp(s[0],s[1],s[2]); for(let k=0;k<200;k++){ r=d.sim(0.25,{camYaw:rnd()*6.283,fwd:1,jump:rnd()<0.45,right:rnd()<0.3?1:0});
   const p=pl.pos; if(!isFinite(p.x+p.y+p.z)||p.x<0||p.x>68||p.z<0||p.z>76||p.y>4.75){ bad.push(['OOB',s,p.x.toFixed(2),p.y.toFixed(2),p.z.toFixed(2)]); break; }
   if(!pl.climb&&!pl.dead) for(const b of C){ if(b.off) continue; if(p.x>b.x0+0.1&&p.x<b.x1-0.1&&p.z>b.z0+0.1&&p.z<b.z1-0.1&&p.y+0.9>b.y0&&p.y+0.5<b.y1-0.05){ bad.push(['INSIDE',s,p.x.toFixed(2),p.y.toFixed(2),p.z.toFixed(2),[b.x0,b.y0,b.z0,b.x1,b.y1,b.z1].map(v=>+v.toFixed(1))]); break; } }
   if(bad.length>6) break; } }
 L('fuzz bad', bad);
 // highest y reached test: jump spam on B and C next to walls
 let maxy=0; for(const s of [[63.5,3.6,20.8],[52.8,3.6,20.8],[63.5,3.6,24.5]]){ for(const yaw of [0,1.57,3.14,4.71,0.78,2.36,3.93,5.5]){ d.tp(s[0],s[1],s[2]); for(let k=0;k<12;k++){ r=d.sim(0.25,{camYaw:yaw,fwd:1,jump:true}); maxy=Math.max(maxy,pl.pos.y); } } }
 L('max y near walls from B/C', maxy.toFixed(2));
 return out; })()
