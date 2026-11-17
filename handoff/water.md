# JL-TASK W — water — status: READY
Adds `src/ext_water.js` (only new file besides this note; no assets, 0 MB). Replaces the pool water via `ctx.setWater`:
planar reflection (reuses THREE.Water's mirror camera/RT, rendered from `onUpdate`), fresnel, two-pass blend
(multiply = per-channel depth absorption of the real pool bed, additive = reflection + scatter + sun glint), scrolling
normal-map ripples, floor caustic shimmer, expanding wake rings around the player when `pl.pos.y < -0.3`, 6 koi (3 lowQ).
Root cause of the old "flat olive" look: the outer ground disc (CircleGeometry r=420, game.js ~l.190) sits at y=-0.25,
coplanar with the water and above the pool bed. The ext cuts a pool-sized hole in that disc at runtime (no file edits).
Sources/licences: no external assets; three.js r147 `THREE.Water` (MIT) already in the page; shaders original.
Known issues: koi only confirmed rendering at a 4x debug scale (at final size the one in view was under a lily pad);
reflected sky is deliberately tone-compressed/cooled. Snapshot-checked: yes (pool, sun-facing, in-water, wake ring).
Round 2 (W2): adds `src/ext_atmo.js` (new file, no assets): occlusion-tested sun glare quad, sun-lit dust motes, drifting
ground mist cards over the pool and treasure courts, splash droplets on entering/wading the pool. 4 draw calls.
Snapshot-checked: splash, mist, pool view, no console warnings; glare re-tuned weaker after it washed out a sun-facing shot.
Also note: my final round-1 water commit (33e82e9: koi clear of stones, stronger wake) was not in the 08:25 merge; it is in this branch.
