# Jade Labyrinth — helper tasks

A WebGL (three.js r147, UMD globals) third-person temple-labyrinth adventure. Single page built from `src/` by
`node build.js` → `jade-labyrinth.html`, published as a Claude artifact with `assets/**` alongside (loaded by relative URL).

**Hard deadline: push by 08:30 NZDT** (`TZ=Pacific/Auckland date`). The integrator merges at 08:30 and ships at 08:45.
Late work is dropped. Ship something small that works rather than something big that doesn't.

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
  Needs a real skinned, textured human model with idle/run/jump/fall/climb animation; no likeness of real people.
