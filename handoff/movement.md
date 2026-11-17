# Task M — movement (handoff)
Status: PARTIAL (safe to merge: one new file, nothing existing edited, home branch 8a9f86a merged in)
Adds `src/ext_movement.js` only (no assets). It wraps `ctx.heroine.update` and layers procedural Bip01 bone overrides on
top of the base clips: jump tuck driven by `s.vy`, extended fall (arms rise, legs reach), landing knee-bend recovery scaled
by impact speed, hurt flinch (from a `pl.hp` drop via `ctx.onUpdate`), wading balance (`y < -0.35`), idle breathing /
weight shift / look-around. No loop line needed, no new `hs` fields, allocation-free per frame, try/catch wrapped.
Not done: real jump clips, new ledge-climb pose, foot-slide matching, controller feel (`updatePlayer`, camera). Those need
edits to `heroine2.js` / `game.js`; my session brief was add-only, so game logic, physics and routes are untouched.
Assets: none. Sources/licences: none (original code).
Verified: build OK; headless snapshots (fall, landing) show the poses applied, rig found (10 bones), no errors thrown,
`JL.debug.sim` run + jump unchanged. Not verified: tuck pose visually (camera was blocked), younger variant, route tests
(not re-run; no game logic changed).
