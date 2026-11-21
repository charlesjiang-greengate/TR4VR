# Next session quickstart

Handover note from the first build session (17–18 Nov 2026, about three hours). Read this first, then `README.md`.

## Where things stand

- Live game: https://claude.ai/artifact/R4Zz8QYELJTZWX5dpyNgV6 (version 11). Branch: `ccr-28f682f4-han4du`.
- Playable start to finish: three jade seals, the Vermilion Gate, the Jade Dragon. Keyboard + mouse and touch both work
  (touch was play-tested on a real phone by the owner).
- Two selectable sisters (Microsoft Rocketbox avatars, MIT): `elder` and `younger`, restyled to match a family photo in
  build, hair and outfit only. Faces are the library's generic ones.
- The jump and ledge climb in version 11 are procedural (limb IK poses, hands pinned to the ledge). They passed the route
  tests and a look at the skeleton sheets, but the independent frame-by-frame review was cut short at wrap time.

## First ten minutes

```
node build.js                      # src/ → jade-labyrinth.html
cd tools && npm i three@0.147.0    # once; Playwright + Chromium are preinstalled in the cloud container
HTML=../jade-labyrinth.html OUT=/tmp W=640 H=400 \
  STEPS='[{"name":"title"},{"name":"pool","tp":[34,0,45.5],"cam":[3.3,0.22]}]' node snap.js     # stills
for t in t2 t4; do node route/drive.js route/$t.js | grep -o 'STUCK[^"]*\|mode:win'; done          # must print mode:win
node tools/files-map.js            # (from repo root) the `files` map to pass when publishing the artifact
```

Publish by updating the existing artifact URL above with `jade-labyrinth.html` plus the files map. Only pass assets
that changed; files left out are kept.

## Things that cost time (so they don't again)

- **Software GL is slow and hungry.** Headless Chromium renders at 1–2 fps and each browser needs about 4 GB. Run one
  at a time; two or more get killed. `tools/snap.js` renders on demand (`JL_MANUAL`) instead of running the game loop,
  and `JL.debug.sim()` steps the game logic without rendering. Motion can only be judged on a real device.
- **The artifact host serves only some file types.** `.glb` and `.hdr` are refused, so `build.js` rewrites quoted
  `.glb` / `.hdr` URLs to `*.glb.wasm` / `*.hdr.wasm` and they are published under those names.
- **First-frame timestep can be negative.** It once triggered a jump on the title screen; the loop clamps it now. Keep
  the clamp.
- **A flat ground disc used to sit exactly at the water surface** and made the pool look like a lawn. `ext_water.js`
  cuts a hole in it at runtime; fixing it at the source in `game.js` (lower the disc or shape it) would be cleaner.
- **`JL.debug.sim` does not call `heroine.update`.** To step animation at 60 Hz, copy `pl.pos` / `pl.yaw` to the heroine
  group and call `update` yourself (see `tools/anim/steps2.js`).
- **Sending a message to a running workflow agent resumed a second copy of it**, and both edited the same file. Put
  extra guidance in the next stage's prompt instead.
- **This session cannot delete remote branches** (pushes are limited to its own branch). Four merged helper branches
  were left for the owner to delete.

## Working in parallel

`TASKS.md` has the protocol that worked: helpers branch from the integration branch, add only new `src/ext_*.js` files
and `assets/<id>/**`, write a `handoff/<id>.md`, and the integrator merges. Each extension is built into its own
`<script>` block, so a broken one cannot take the game down. Give one task per session and a push deadline.

## What to work on next (in order)

1. **Character animation.** The weakest part.
   - Get real motion-capture clips for jump, fall, land, ledge hang, pull-up and vault on the Biped rig (or retarget
     from another library), and drive them by phase: jump clip scrubbed by air time or vertical speed, climb clip
     scrubbed by `climbT`. The Rocketbox library has no jump or climb; the cut-outs in `extras/unused-clips/` have one
     fist overhead and the wrong air time.
   - Add a 0.12–0.18 s grounded crouch before a standing jump and fire the impulse at push-off (controller change in
     `updatePlayer`). See `docs/openlara-movement-notes.md` for the full list and timings.
   - Finish the frame-by-frame review: `tools/anim/` has the skeleton sheet harness (its paths point at a scratch
     directory and need adjusting); reference sheets are in `docs/animation-sheets/`.
   - Dead state, hurt reaction and foot-slide matching are still rough. `extras/patches/` holds an unmerged
     knee-buckle idea for the dead state.
2. **Faces and likeness.** The sisters are the owner's daughters, and the owner wants their faces to resemble them
   (consented family use; the repo is private and the game is shared with family only). Route: the owner builds each
   head in KeenTools FaceBuilder and exports it (see `docs/facebuilder-checklist.md`); a session fits it onto the
   existing body and skeleton. Keep source photos out of git; commit only the finished, downscaled textures.
3. **Hands and contact.** Fingers do not curl over ledges; feet are not planted on stepping stones or slopes.
4. **Map realism.** Plaster walls are still uniform; crates and a few props look placeholder; add parallax or
   displacement on the stone base and more variation between corridors. A cheap screen-space reflection on wet
   flagstones would sell the lantern light.
5. **Gameplay depth.** One lever puzzle and three trap types. Ideas: pushable blocks, timed doors, a second floor,
   a checkpoint indicator, a short ending sequence.
6. **Performance pass on real hardware.** Never profiled. Shadow map is 4K and updated every other frame; adaptive
   resolution exists; there is no quality menu.
7. **Audio** was out of scope and is still absent.

## Map of the code

See the table in `README.md`. The pieces most likely to be touched next: `src/heroine2.js` (characters and animation),
`updatePlayer` / `tryMantle` / `updateCamera` in `src/game.js` (controller), `src/ext_movement.js` (hurt, wade, idle
layers), `src/gfx.js` (materials, post-processing).
