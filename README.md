# Jade Labyrinth

A third-person WebGL adventure: two sisters explore a lantern-lit East Asian temple maze, recover three jade seals
(swinging blades, spike plates, a pit jump, a climbing course, a lever-and-cage puzzle) and open the Vermilion Gate
to claim the Jade Dragon.

Published artifact: https://claude.ai/artifact/R4Zz8QYELJTZWX5dpyNgV6

## Tech

three.js r147 (UMD from jsDelivr) with a custom HDR pipeline (`src/gfx.js`):

- photo-scanned CC0 PBR textures and an HDRI sky / image-based lighting (Poly Haven), procedural fallbacks
- 4K PCF-soft sun shadows, pooled flickering lantern point lights
- ray-marched volumetric fog with shadowed sun in-scatter (light shafts), SSAO from depth
- HDR bloom, ACES tone mapping, colour grade, chromatic aberration, vignette, film grain, FXAA
- planar-reflection water, GPU particles (petals, fireflies, embers, flames)
- adaptive render resolution; keyboard + mouse, and touch controls

## Layout

| Path | What |
| --- | --- |
| `src/index.tpl.html` | page shell, HUD, styles |
| `src/gfx.js` | materials, sky, post-processing, particles, real-asset loading |
| `src/game.js` | level, entities, player controller, camera, loop, extension hooks |
| `src/heroine*.js` | playable characters (`setVariant('elder' \| 'younger')`) |
| `src/props_arch.js`, `src/props_nature.js` | procedural prop builders |
| `src/ext_*.js` | drop-in extensions (see `TASKS.md` for the API) |
| `assets/` | textures, HDRI, character models (published next to the page) |
| `tools/snap.js` | headless render-on-demand snapshots |

## Build

```
node build.js            # → jade-labyrinth.html (binary asset URLs are rewritten to *.wasm for the artifact host)
node tools/files-map.js  # → the Artifact `files` map for publishing
```

Controls: WASD move, mouse look, Space jump / climb, E use, Shift walk.
