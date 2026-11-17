# JL-TASK B — backdrop
Status: READY
Adds: `src/ext_backdrop.js` (JL.ext) — clears `ctx.backdrop` and adds 3 rings of displaced karst towers + ridges and low
forested mounds (procedural rock/forest shading, sun lighting, aerial haze), 4 drifting mist bands, 6 distant pagodas, 4 slow
bird flocks (vertex-shader animated). 1 opaque draw + 4 mist + 1 birds; ~35k tris (22k in lowQ); no per-frame allocations.
Assets: none (0 bytes; fully procedural). Sources/licences: none needed — original code only.
Known issues: mist bands are simple alpha cylinders (renderOrder −6..−3), so they don't soften near-field transparents;
unlit by the game's post fog beyond 64 m (own haze instead). Everything is ≥ 60 m from (34,0,38). Original rings kept if init throws.
Snapshot: yes — tools/snap.js (lowQ) from start, pool court and above the roofs in all 4 directions; no console errors.
