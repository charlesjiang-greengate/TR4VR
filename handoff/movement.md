# Task M — movement (handoff)
Status: PARTIAL
Adds `src/ext_movement.js` only (new file, no assets, nothing existing edited). It wraps `ctx.heroine.update` and layers
procedural Bip01 bone overrides on top of the base clips: jump tuck driven by `s.vy`, extended fall (arms rise, legs reach),
landing knee-bend recovery scaled by impact speed, hurt flinch (from `pl.hp` drop via `ctx.onUpdate`), wading balance
(`y < -0.35`), idle breathing / weight shift / look-around. No loop line needed; no new `hs` fields.
Not done: real jump clips, new ledge-climb pose, foot-slide matching, controller feel (`updatePlayer`, camera) — these need
edits to `heroine2.js` / `game.js`, which my session instructions forbade (add-only), so game logic and routes are unchanged.
Assets: none. Sources/licences: none (original code).
Verified: `node --check`, `node build.js` builds. No-op if the rig or fallback heroine has no matching bones.
