# Jade Labyrinth — helper tasks

> Status 08:25 NZDT: tasks W, B, P (helper sessions) and V, D, H (integrator workers) are all merged. Kept as a record of the protocol and the extension API.

A WebGL (three.js r147, UMD globals) third-person temple-labyrinth adventure. Single page built from `src/` by
`node build.js` → `jade-labyrinth.html`, published as a Claude artifact with `assets/**` alongside (loaded by relative URL).

**Hard deadline: push by 08:30 NZDT** (`TZ=Pacific/Auckland date`). The integrator merges at 08:30 and ships at 08:45.
Late work is dropped. Ship something small that works rather than something big that doesn't.

## Protocol (integrator ⇄ helper sessions)

1. **Claim**: the user gives each helper one task letter. One helper per task. Do only that task.
2. **Base**: `git fetch origin ccr-28f682f4-han4du && git checkout -B <your session branch> origin/ccr-28f682f4-han4du`.
   Never push to `ccr-28f682f4-han4du` itself; it belongs to the integrator.
3. **Deliver**: commit only new files (`src/ext_<id>.js`, `assets/<id>/**`, and `handoff/<id>.md`). First line of every
   commit: `JL-TASK <id>: <what>`. Push early and often — the first working version by **08:20**, final by **08:30 NZDT**.
4. **Handoff note** `handoff/<id>.md` (≤10 lines): status (`READY` / `PARTIAL` / `ABANDONED`), what it adds, asset files
   and total size, sources + licences, known issues, whether you looked at a snapshot.
5. **Integration**: the integrator polls `git ls-remote --heads origin` every few minutes and merges any branch whose
   handoff note says `READY` or `PARTIAL`, rebuilds, snapshot-checks and publishes. A branch that edits existing files,
   breaks the build, throws at load, or arrives after 08:30 is skipped.
6. **Do not** publish artifacts, open pull requests, or edit files outside your task's paths. If blocked, write
   `ABANDONED` + the reason in the handoff note, push, and stop.

## Rules (so merges are conflict-free)

1. Branch from `ccr-28f682f4-han4du`. Push to your own session branch. First commit message line: `JL-TASK <id>: ...`.
2. **Only add new files**: `src/ext_<id>.js` (auto-included by `build.js`, loaded before `game.js`) and `assets/<id>/**`.
   Do not edit `game.js`, `gfx.js`, `heroine.js`, `props_*.js`, `index.tpl.html` (exception: task H writes `src/heroine2.js`).
   Do not commit `jade-labyrinth.html` changes (the integrator rebuilds).
3. No external requests at runtime except relative `assets/...` URLs (CSP blocks everything else). Only CC0 / clearly
   licensed assets; list sources in a comment at the top of your file. Keep your assets ≤ 8 MB.
3b. The artifact host only serves .js/.json/.txt/.jpg/.png/.webp/.svg/.mp3/.mp4/.woff2/.wasm. Reference binaries as quoted
   string literals ending in `.glb` / `.hdr` / `.bin` (e.g. `'assets/veg/tree.glb'`); `build.js` rewrites them to `*.glb.wasm` and the
   integrator publishes them under that name. Other extensions will 404 in production.
4. Wrap everything in try/catch-safe code: a failed asset load must leave the game working.
5. Must run at 60 fps on a mid laptop GPU: instance/merge geometry, no per-frame allocations.

## Extension API

```js
(window.JL.extPre = window.JL.extPre || []).push(function (ctx) { /* before the level is built: override prop builders */ });
(window.JL.ext    = window.JL.ext    || []).push(function (ctx) { /* after level, entities, heroine and post exist */ });
```
`ctx`: `THREE, JL, scene, camera, renderer, M` (materials: stone, darkStone, plaster, floor, roofTile, wood, bark,
redLacquer, gold, bronze, steel, paper, jade, moss, leaf, blossom, bamboo, poolFloor), `arch`, `nature` (prop builder
tables — reassign e.g. `ctx.nature.cherryTree = function(height, seed){ return Group }` in `extPre` to replace a prop
everywhere; origin at ground centre, Y up), `prop, place(group,x,y,z,ry,scale)`, `MAP, CELL(4 m), WALL_H(5), COLS, ROWS,
cx(col), cz(row), at(col,row)` (`'#'` wall, `'.'` floor, `'~'` pool), `rng(seed)`, `lowQ`, `backdrop` (Group holding
the distant mountain rings — clear it to replace), `onUpdate(fn(dt, time, pl, camera))`.
Post-build extras: `colliders, col(x0,y0,z0,x1,y1,z1)` (axis-aligned box collider), `addLight(x,y,z,color,power)`
(registers a spot for the pooled point lights; only call during ext init), `GB` (box geometry builder with world UVs),
`sun, sunDir, sky, pl` (player: `pos, vel, yaw, grounded, state, hp`), `heroine`, `post` (`post.composite.uniforms`,
`post.final.uniforms`), `getWater(), setWater(mesh|null)`.

World: X east, Z south, cell (c,r) spans x∈[4c,4c+4], z∈[4r,4r+4]. Start (34,0,70) facing −Z. Pool court x,z∈[20,48],
pool x,z∈[24,44] (floor −0.9, water surface −0.25), island pavilion at (34,34). Great gate at (34,18), treasure court
x∈[24,44], z∈[4,16], idol at (34,9.5). Sun direction (to sun) = normalize(−0.50, 0.80, −0.42), warm late light.
Renderer: `physicallyCorrectLights`, linear HDR target, custom post (SSAO, volumetric fog, bloom, ACES, FXAA) — emissive
values > 1 bloom. Textures you load need `encoding = sRGBEncoding` for colour maps.

## Build & look

```
node build.js                      # → jade-labyrinth.html
cd tools && npm i three@0.147.0    # once
HTML=../jade-labyrinth.html OUT=/tmp W=640 H=360 \
  STEPS='[{"name":"pool","tp":[34,0,45.5],"cam":[3.3,0.25]},{"name":"start","tp":[34,0,68],"cam":[3.14,0.15]}]' node snap.js
```
`snap.js` renders on demand in headless Chromium (software GL, slow, memory hungry: one browser at a time) and writes
`snap_<name>.jpg`. `tp` teleports the player, `cam` = [yaw, pitch] (yaw 3.14 looks north).

## Tasks (pick one, say which in your first commit)

**Already taken by the integrator's own workers: V (vegetation), D (set dressing) and H (heroine). Open for helpers: W, B, P.**

- **W — Realistic water** (`src/ext_water.js`): the pool currently uses three's `Water` and reads as flat olive. Replace
  via `ctx.setWater(mesh)` with a custom shader: planar reflection (or reuse `THREE.Reflector`-style mirror camera),
  fresnel, depth-tinted refraction of the pool floor, gentle normal-mapped ripples, sun glint, ripples/wake around the
  player when `pl.pos.y < -0.3`, optional koi. Plane 20×20 at (34, −0.25, 34). Set `mesh.userData.ownTime = true` and
  drive time from `ctx.onUpdate`.
- **V — Realistic vegetation** (`src/ext_veg.js`, `assets/veg/`): replace `nature.cherryTree(height, seed)`,
  `nature.bambooCluster(n, radius, height, seed)` and `nature.pine` in `extPre` with lifelike versions (alpha-card
  foliage from CC0 leaf/bark textures e.g. Poly Haven, proper branching, wind sway in the vertex shader, shadows via
  `alphaTest` + `customDepthMaterial`). Budget ≈ 25k triangles per tree; ~12 cherry trees and ~30 bamboo clusters exist.
- **D — Set dressing** (`src/ext_dress.js`, `assets/dress/`): make corridors feel lived-in and real: glowing wooden
  lattice windows and hanging cloth banners on wall faces, ivy/vines and moss streaks, broken pottery, crates, incense
  smoke, puddle decals, scattered leaves. Use `ctx.at()` to find wall faces next to floor cells; keep 1.2 m clear in
  the middle of every corridor; add `col()` only for big objects against walls.
- **B — Backdrop** (`src/ext_backdrop.js`, `assets/backdrop/`): replace the flat mountain silhouettes in `ctx.backdrop`
  with a believable misty karst/mountain range (displaced terrain ring with rock/forest texturing, layered haze cards,
  a few distant pagodas, slow birds). Nothing closer than 60 m from the map centre (34, 0, 38).
- **P — Prop realism** (`src/ext_props.js`, `assets/props/`): in `extPre`, wrap `arch.stoneLantern`, `nature.guardianLion`,
  `nature.dragonIdol`, `arch.brazier`, `nature.pedestal` so they use real carved-stone / aged-bronze / gold PBR
  textures (triplanar or generated UVs) and finer bevelled silhouettes; keep each builder's `userData` and footprint.
- **H — Heroine realism** (`src/heroine2.js`, `assets/char2/`): only if you can clearly beat the current character.
  Define `window.createHeroine2 = function(THREE){ return { group, update(dt, s), setVariant(name), height } }` (same
  contract as `src/heroine.js`; variants `'elder'` — taller teen, hair tied up, white jersey with red 98, denim shorts —
  and `'younger'` — shorter child, pink hoodie, grey joggers, white sneakers; both East Asian girls with black hair).
  Tip: Microsoft Rocketbox (MIT, raw.githubusercontent.com/microsoft/Microsoft-Rocketbox) has realistic adult and child
  avatars incl. East Asian women/girls plus animations (FBX → convert to GLB with npm `fbx2gltf`). The integrator has one
  worker trying this already in `src/heroine2.js`; coordinate by using `src/heroine3.js` + `window.createHeroine3` instead.
  Needs a real skinned, textured human model with idle/run/jump/fall/climb animation; no likeness of real people.

## Task M — character movement (dedicated session, final push)

**Deadline: push by 08:44 NZDT.** Integrator merges at 08:45 and publishes at 08:50. Hard stop 08:55.
Unlike the other tasks, M edits existing files. Ownership for the final push:
- **You own**: `src/heroine2.js` (the realistic Rocketbox sisters: model loading, animation, `setVariant`), `assets/char2/**`,
  and in `src/game.js` ONLY the functions `updatePlayer`, `tryMantle`, `groundY`, `collideXZ`, `damage`, `die`, `updateCamera`
  and the `// ---------- input ----------` block. The integrator will not touch those. Do not touch anything else in
  `game.js` (level, entities, loop, hooks) or any other file. Do not commit `jade-labyrinth.html`.
- Branch from `ccr-28f682f4-han4du`, push to your own session branch, commits prefixed `JL-TASK M:`, finish with
  `handoff/movement.md` (READY / PARTIAL, what changed, what you verified). Push a working version early (by 08:36).

Goal: make her move like a real person, not a sliding mannequin. In priority order:
1. **Jump / fall / land** (currently a slowed run stride with arms out): anticipation, tucked airborne pose driven by `s.vy`,
   extended fall, landing knee-bend recovery. Use real clips if Rocketbox has them (`Assets/Animations/*.fbx` in
   microsoft/Microsoft-Rocketbox via raw.githubusercontent.com / media.githubusercontent.com; convert with npm `fbx2gltf`,
   save as `assets/char2/a_<name>.glb`, reference as the quoted literal `'assets/char2/a_<name>.glb'`), else procedural
   bone overrides on the Bip01 rig.
2. **Ledge climb** driven by `s.climbT` 0..1 (0–0.6 the body rises from hang to chest-over-ledge, 0.5–1 steps forward onto
   the top): hands on the ledge, pull, knee up, stand. Must line up with the position lerp in `updatePlayer`'s climb branch.
3. **Locomotion**: no foot sliding (clip timeScale matched to ground speed for walk at 2.0 m/s and run at 5.4 m/s), smooth
   idle→walk→run blends, lean into turns, quick turn-around without moonwalking, start/stop settle, wading (y < −0.35:
   slower, higher knees), hurt flinch on damage, a readable `dead` collapse. Subtle idle life: breathing, weight shift, look.
4. **Controller feel** in `updatePlayer`: responsive acceleration, variable jump height (short hop on tap), gentle air
   control, landing does not kill momentum, camera follow with light smoothing and no jitter on steps. Keep jump reach
   (apex ≈ 1.1 m, ≈ 3.4 m running jump) and mantle limits (≤ 1.95 m, never onto 5 m walls) or the level breaks.

Contract (unchanged): `createHeroine2(THREE)` → `{ group, update(dt, s), setVariant('elder'|'younger'), height }`, group origin at
feet facing +Z, `s = { state:'idle'|'run'|'jump'|'fall'|'climb'|'dead', speed, vy, climbT, t }`. You may add fields to `s`
(e.g. `turn`, `wade`, `hurt`, `landed`) by setting them on `hs` — tell the integrator in the handoff note which line in the
loop you need (`hs.xxx = ...`), or compute them inside `update` from the group's motion.

Verify:
```
node build.js && cd tools && npm i three@0.147.0
for t in t1 t2 t3 t4 t5; do node route/drive.js route/$t.js | grep -o "STUCK[^\"]*\|mode:win" ; done   # t2 and t4 must print mode:win, no STUCK
HTML=../jade-labyrinth.html OUT=/tmp W=560 H=360 STEPS='[{"name":"run","tp":[25,0,45],"cam":[0.9,0.1],"js":"JSON.stringify(JL.debug.sim(0.6,{fwd:1,camYaw:1.57}))"},{"name":"jump","tp":[25,0,45],"cam":[0.9,0.1],"js":"JSON.stringify(JL.debug.sim(0.25,{fwd:1,jump:true,camYaw:1.57}))"}]' node snap.js
```
`JL.debug.sim(seconds, {fwd, right, jump, act, camYaw, to:[x,z]})` steps the game at 60 Hz without rendering; `snap.js`
renders stills (software GL, one browser at a time, ~4 GB RAM each).
