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

## Jump / climb rework (animation pass 2)
Status: READY for review (offline skeleton harness + headless stills; route tests NOT re-run).
- `src/heroine2.js` now owns jump, fall, landing and ledge climb (one source of truth). The run clip no longer plays in the
  air: locomotion is faded out and frozen, and a procedural layer takes over — authored key poses given as limb targets in
  her own frame, solved with analytic two-bone IK that keeps the Biped hinge (local -Z) perpendicular to the bend plane, so
  there is no roll about a limb's length. Jump: push-off, rise (leap or two-foot, by speed), apex, descent, blended by
  `s.vy`; a separate fall pose beyond about -7.5 m/s; landing = pelvis dip with the feet IK-clamped to the ground
  (0.17 s soft, 0.42 s hard), run cycle resumed on the leading foot.
- Climb (driven by `s.climbT`): reads the real ledge from `JL.ctx.pl.climb` + `JL.ctx.colliders`, squares the visual body
  to the wall face in the first ~0.1 s, pins both hands to fixed points on the edge (0 cm error while pinned), hang → pull →
  support with one leg brought up → crouch over the planted foot → stand. Works for both sisters (the shorter one hops to
  the catch) and for low ledges (step-up without hands).
- `src/ext_movement.js`: air tuck and landing blocks removed (they stacked on the base pose); hurt / wade / idle life kept.
- `src/game.js`: ONE line in the climb branch of `updatePlayer` — climb time now scales with ledge height
  (`dt / clamp(0.15 + 0.7 * (c.ty - c.fy), 0.4, 1.5)` instead of `dt / 0.8`). Start/end positions and the 0..1 `climbT`
  contract are unchanged; jump physics and mantle limits untouched.
- `assets/char2/a_jump|a_land|a_reach|a_crouch_in|a_crouch_out.glb` are NOT referenced (cheer-clip cuts, unsuitable as-is).
