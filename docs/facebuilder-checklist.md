# FaceBuilder checklist: making the sisters' heads

One head per daughter. About 20–30 minutes each once Blender is set up. Menu labels can differ slightly between
FaceBuilder versions; the steps are the same.

## 1. Photos (the biggest factor in quality)

Per daughter, 4–8 photos taken in one sitting:

- front, three-quarter left, three-quarter right, left profile, right profile; optionally slightly from below and above
- neutral expression, mouth closed, eyes open, looking straight ahead (turn the head, not the eyes)
- soft, even light (daylight from a window, no flash, no hard shadows), plain background
- no glasses; hair tucked behind the ears or tied back so the forehead, ears and jawline are visible
- same camera, no zoom changes between shots, phone's main (1×) lens, not the selfie camera; stand 1–1.5 m away
- full resolution originals (send them as files, not through a messaging app that compresses them)

## 2. Setup

1. Install Blender 4.x (blender.org).
2. Get FaceBuilder for Blender from keentools.io (free trial). In Blender: Edit → Preferences → Add-ons → Install,
   pick the downloaded zip, tick it, then in its panel install the **Core library** and activate the trial or licence.
3. Open a new General scene and delete the default cube, camera and light.

## 3. Build the head

1. Sidebar (N) → **FaceBuilder** tab → **Create a new head**.
2. **Add images** → select that daughter's photos. One "view" is created per photo.
3. For each view: open it, click **Align face** (automatic), then check the pins. Drag any pin that is off (eye
   corners, nose tip, mouth corners, chin, jaw line, ears). Fewer accurate pins beat many sloppy ones.
4. In the head settings, keep the parts **Neck, Ears, Eyes, Jaw, Mouth** on. Leave **Expressions off** (neutral face).
5. Rotate the 3D head and compare against the photos; fix pins where the shape drifts.
6. **Texture** → **Create texture** (2048 × 2048 is plenty) → **Apply**. Look at it from all sides; if a view smears the
   texture (blurry or with hair across the face), untick that view for texturing and create it again.

## 4. Export

1. Select the head object only.
2. File → Export → **glTF 2.0 (.glb)**.
   - Include: **Selected Objects**
   - Mesh: **Apply Modifiers** on, UVs on, Normals on
   - Material: **Export** (the texture is embedded in the .glb)
   - Shape keys / animation: off
3. Name the files `elder_head.glb` and `younger_head.glb`.
4. Also save the baked texture image (Image Editor → Image → Save As, PNG) in case it needs touching up.

## 5. Hand-off

Put the two `.glb` files and the two texture PNGs on the working branch under `assets/faces/src/` (GitHub web
upload works), or attach them in the Claude session. The source photos are not needed and should stay out of git.

From there the session will: fit and scale each head to the body (`src/heroine2.js`), blend the neck seam and skin
tone, parent it to the `Head` bone so every animation still works, keep the hair, downscale the texture for the web,
add a close-up portrait on the character-select screen, rebuild, run the route tests and update the artifact.
