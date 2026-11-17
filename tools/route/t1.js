(()=>{ const d=JL.debug, out=[]; const L=(n,r)=>out.push(n+': '+JSON.stringify(r));
 const go=(pts,o)=>{ let r; for(const pt of pts){ r=d.sim((o&&o.T)||12,Object.assign({to:pt},o||{})); if(Math.hypot(pt[0]-r.x,pt[1]-r.z)>0.6){ L('STUCK heading to '+pt,r); return r; } } return r; };
 // main route to pool court
 L('start', d.sim(0.5,{}));
 L('procession', go([[34,60],[34,50],[34,46]]));
 // stepping stones to island (cage closed)
 L('stones', go([[34.2,42.9],[33.7,41.0],[34.3,39.1],[33.9,37.3],[33.9,35.4]]));
 // wade: walk off island west into pool, then back out west to walkway
 d.tp(34,0.03,37.3); L('intoPool', d.sim(1.5,{to:[31,38]}));
 L('wadeOutWest', d.sim(8,{to:[22.5,38],tol:0.5}));
 d.tp(30,-0.9,30); L('wadeOntoIsland', d.sim(6,{to:[33.0,33.0],tol:0.5}));
 d.tp(40,-0.9,40); L('wadeOutSouth', d.sim(6,{to:[40,45.5],tol:0.5}));
 d.tp(40,-0.9,28); L('wadeOutNorth', d.sim(6,{to:[40,22.5],tol:0.5}));
 d.tp(40,-0.9,28); L('wadeOutEast', d.sim(6,{to:[45.5,28],tol:0.5}));
 return out; })()
