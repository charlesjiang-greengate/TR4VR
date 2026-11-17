# Task M — movement (handoff)
Status: PARTIAL (builds, routes t2 + t4 print mode:win with no STUCK; home branch 8a9f86a merged in)
Changed: `src/ext_movement.js` (new) — procedural layer over `heroine.update`: jump tuck driven by `s.vy`, extended fall,
landing knee-bend scaled by impact speed, hurt flinch (from `pl.hp` drop), wading balance, idle breathing / look.
`src/heroine2.js` `update` — ledge climb reworked to follow the same 0..0.6 smoothstep as the position lerp (overhead hang →
bent-elbow pull → press beside hips → knee up → release), plus a knee-buckle / curl on `dead`.
`src/game.js` — `updatePlayer`: variable jump height (release Space early = short hop; touch and scripted jumps stay full,
so reach is unchanged: apex 1.1 m); `updateCamera`: softer vertical follow (no jitter on steps). Nothing else touched.
No loop line needed, no new `hs` fields, no assets, no external sources (original code).
Verified by snapshot: fall, landing, dead and climb (hang + pull) poses; rig found (10 bones); no errors thrown. Routes t1/t3/t5 print neither
win nor STUCK (not checked against the base). Not visually confirmed: jump tuck, climb step-over (0.6–1), younger variant.
Not done: real Rocketbox jump clips, foot-slide matching beyond the existing timeScale, turn-around, anticipation.
