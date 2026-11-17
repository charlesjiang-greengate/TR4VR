# OpenLara movement and animation notes

A read-only study of how OpenLara (https://github.com/XProger/OpenLara, `src/`) handles
player-character movement and animation, with the emphasis on jumping and ledge climbing,
and what of it we can reuse in our three.js game.

- **Source studied:** `master` branch, files `lara.h`, `character.h`, `controller.h`,
  `animation.h`, `collision.h`, `format.h`, `camera.h`, `game.h`, `utils.h`.
- **Licence:** BSD 2-Clause, copyright 2018 Timur "XProger" Gagiev (repository `LICENSE`;
  the README carries the same badge). Nothing here is copied code. Mechanisms are described
  in my own words, and only short identifiers and constants are quoted.
- **Line numbers** are approximate and refer to the `master` files as downloaded on
  2026-11-17.

## Read this first: what the source does and does not contain

OpenLara is an engine. It plays the original game's level files, and those files hold the
animation clips, the per-clip "state change" tables and the per-clip "animation commands".
That has two consequences for these notes:

- **Clip lengths and jump impulses are not in the source.** How long the pre-jump crouch
  lasts, how fast each jump variant launches, and how long the pull-up takes are all values
  in the level data. The source only shows how those values are consumed. I have not
  invented numbers for them.
- **Everything else is in the source** and is quoted below: gravity, thresholds, heights,
  radii, snap offsets, camera rates, turn rates.

### Units

| Quantity | Engine value | Metric equivalent |
|---|---|---|
| Length | `UNITS_PER_METER` = 445 (`lara.h` ~63) | 1 unit ≈ 2.25 mm |
| World grid | 1024-unit sectors, 256-unit height "clicks" | 2.30 m and 0.575 m |
| Character height | `LARA_HEIGHT` = 762 | 1.71 m |
| Character radius | `LARA_RADIUS` = 100 | 0.22 m |
| Velocity | units per 1/30 s tick | multiply by 0.0674 for m/s |
| Y axis | points down | a negative `velocity.y` means rising |

The simulation is sub-stepped: each rendered frame is split into steps of at most 1/30 s,
and a frame's total is capped at 0.2 s (`game.h` ~317-326). Velocities stay in per-tick
units and are scaled by `30 * deltaTime` when applied.

## 1. Jump

### 1.1 The per-tick order

`Character::update` (`character.h` ~203-223) runs in this order every tick:

1. Read input.
2. Classify the support state with `getStand()`: air, ground, slide, hang, underwater,
   on water or wade.
3. Ask the state function for that support state (`getStateGround`, `getStateAir`,
   `getStateHang` and so on) which state it wants next, and request it from the animation
   system with `animation.setState`.
4. Advance the animation and run its commands (`Controller::updateAnimation`).
5. Update velocity, then position and collision.

The important point is that gameplay code only *requests* a state. The animation data
decides whether and when the request is honoured (section 3.2).

### 1.2 State flow

```
STOP --jump pressed--> COMPRESS --(clip end, jump command)--> UP_JUMP / FORWARD_JUMP /
                                                              BACK_JUMP / LEFT_JUMP / RIGHT_JUMP
RUN  --jump pressed, canJump--> FORWARD_JUMP        (no compress: the running jump)
FORWARD_JUMP --action held--> REACH                 (arms out, can grab)
any air state --falling faster than 134 units/tick--> FALL
air --feet reach floor--> ground state (STOP, RUN, ...); from FALL the landing clip is forced
```

**Anticipation (`STATE_COMPRESS`).** A jump press on the ground from anything but a
qualifying run requests `STATE_COMPRESS` (`lara.h` ~2617-2626). The character stays on the
ground in a crouch clip. No velocity is applied.

**Direction is chosen during the crouch, not at the press.** While in `STATE_COMPRESS`,
every tick re-reads the direction keys and requests the matching airborne state
(`lara.h` ~2582-2603): right, left, forward (also forward plus a side key), back, or
straight up when nothing is held. Before a directional jump is accepted, a collision probe
with a radius of 2.5 × the body radius (250 units, 0.56 m) is cast in the jump direction.
If it reports a wall, the jump is downgraded to a straight-up jump.

**The impulse is an animation command.** The take-off clip carries a "jump" command with a
vertical and a horizontal speed. `Animation::setAnim` reads it when the clip starts
(`animation.h` ~77-93, ~213-248). When the clip reaches its end, `updateAnimation` calls
`cmdJump` and only then moves to the next clip (`controller.h` ~1196-1199). `cmdJump`
(`character.h` ~225-230) sets the vertical speed, sets the horizontal speed along
`angleExt`, and switches the support state to air. So the animation drives the physics:
the character leaves the ground on the exact tick the push-off clip finishes.

`angleExt` is the facing angle plus an offset for the current state: 180° for back
variants, ±90° for side variants (`lara.h` ~3419-3442). The model keeps facing forward
during side and back jumps; only the travel direction is offset.

**Running jump.** From `STATE_RUN` a jump press requests `STATE_FORWARD_JUMP` directly, but
only once `canJump` is set. It is cleared during the run-start clip and set when the run
loop reaches frames 4-5 (`lara.h` ~2605-2622). That enforces a minimum run-up, and the
state-change table then lets the jump start only at specific run frames.

### 1.3 Airborne physics

| Rule | Value | Source |
|---|---|---|
| Gravity | `GRAVITY` = 6 units/tick² ≈ 12.1 m/s² | `controller.h` ~9, ~788-790 |
| Gravity above 128 units/tick (8.6 m/s) | 1 unit/tick² ≈ 2.0 m/s², a soft terminal velocity | same |
| Horizontal speed in the air | constant after take-off; a drag term exists but is commented out | `lara.h` ~3444-3455 |
| Steering in the air | forward jump only, at `TURN_SLOW` = 60°/s; the velocity vector rotates with the body | `lara.h` ~3408, `character.h` ~118-121 |
| Ceiling hit while rising | vertical speed set to 30 units/tick downward (2.0 m/s) | `lara.h` ~3696 |
| Wall hit in up-jump, reach or back-fall | horizontal speed zeroed | `lara.h` ~3714-3716 |
| Wall hit in other air states | "smash" clip, horizontal speed reversed at 25%, any upward speed replaced by 30 downward | `lara.h` ~3718-3724 |

Integration is `velocity * deltaTime * 30` per sub-step (`lara.h` ~3636).

**Transition to fall is by speed only.** `getStateAir` requests `STATE_FALL` when the
downward speed exceeds 131 + 3 units/tick, about 9.0 m/s (`lara.h` ~2423-2425). There is no
timer. A normal jump lands in its jump state and never shows the fall pose. Under this
gravity it takes roughly 0.74 s of falling from the apex to reach the threshold.

**Walking off an edge.** A grounded character stays grounded while the floor is within 256
units (0.58 m) below the feet (`lara.h` ~2380-2382). Beyond that the support state becomes
air, and any non-air state is replaced by the forward-fall clip (`lara.h` ~2478-2479).

### 1.4 Landing

`getStand` (`lara.h` ~2380-2404) detects landing when the feet are at or below the floor
and the character is not rising. It snaps the feet to the floor and then:

- **Hard landing.** If the state was `STATE_FALL`, the landing clip `ANIM_LANDING` is
  forced. Its state is the standing state. Normal turning (90°/s) and body lean stay
  enabled during it (`lara.h` ~3406, ~3519).
- **Soft landing.** From any jump state nothing is forced. The ground state function asks
  for stop or run, and the jump clip's own state-change table supplies the landing
  transition. Holding forward leads straight back into the run.
- **Fall damage** (`lara.h` ~2386-2397). Let `v` be the impact speed minus 140 units/tick
  (9.4 m/s). No damage if `v` ≤ 0. Damage is `v² × 1000 / 196` of 1000 health, so it is
  quadratic. It is fatal above `v` = 14, which is 154 units/tick or 10.4 m/s.

## 2. Ledge grab, hang, pull-up and vault

There are two entry points: climbing from a standstill against a wall, and grabbing in
mid-air.

### 2.1 From the ground: `checkClimb` (`lara.h` ~2538-2564)

All of these must hold:

- Forward and action are held, and neither left nor right is.
- The character is in one of the two standing idle clips.
- The hands are empty.
- The last movement step reported a frontal collision, so the character is already pressed
  against the wall, within one body radius of it.

Let `h` be the height of the ledge top above the feet. The low and medium variants also
need at least one character height (762 units) of headroom above the ledge, and `h` ≥ 256.

| Ledge height `h` | Metric | Fraction of body height | Variant | Vertical snap before the clip |
|---|---|---|---|---|
| 256-640 | 0.58-1.44 m | 0.34-0.84 | `ANIM_CLIMB_2`, low vault | feet set to exactly 512 below the ledge |
| 641-896 | 1.44-2.01 m | 0.84-1.18 | `ANIM_CLIMB_3`, medium climb | feet set to exactly 768 below the ledge |
| above 512 and up to 1920, when neither row above applies | up to 4.31 m | up to 2.5 | `ANIM_CLIMB_JUMP`, jump up to a hang | none |

Three ideas are worth noting:

- **Height normalisation.** Each climb clip is authored for one canonical height. Instead
  of warping the clip, the engine moves the character's Y so the ledge sits at the
  canonical height. That is a snap of up to ±128 units (0.29 m), applied on the tick the
  clip starts.
- **Alignment.** `alignToWall(-LARA_RADIUS)` (`controller.h` ~792-829) quantises the yaw to
  the nearest 90° and sets the position along the facing axis to exactly one body radius
  short of the sector boundary. It is an instant snap with no blending. It goes unnoticed
  because the character is already touching the wall and roughly facing it.
- **A computed impulse for high ledges.** For the jump-to-hang variant, `Lara::cmdJump`
  (`lara.h` ~1556-1561) replaces the clip's vertical speed with one derived from the ledge
  height: the square root of 2 × gravity × the required rise, less a small constant. The
  apex therefore puts the hands exactly at the ledge. For a 1792-unit ledge that works out
  to about 113 units/tick (7.6 m/s) and about 0.63 s to the apex.

### 2.2 In the air: the grab test in `getStateAir` (`lara.h` ~2427-2461)

- **States.** Only `STATE_REACH` and `STATE_UP_JUMP` can grab. Reach is entered from a
  forward jump or a back-fall by holding action.
- **Input.** Action must be held and the hands must be empty.
- **Vertical direction.** A reach grabs only once the character has stopped rising. An
  up-jump may grab on the way up.
- **Hand height.** This is the top of the current animation frame's bounding box. No hand
  bone is involved.
- **Probe.** A collision probe is placed at hand height, offset 128 units forward, with the
  body radius. It samples the floor about 228 units (0.51 m) ahead of the body centre.
- **Accept test.** The ledge top must be within 64 units (0.14 m) of hand height, and the
  cell must not be a solid wall (its floor and ceiling differ).

On success, in the same tick:

1. `alignToWall(-LARA_RADIUS)` snaps the yaw and the distance to the wall.
2. Feet Y is set to the ledge top plus `LARA_HANG_OFFSET` = 724 units (1.63 m, 95% of body
   height), so the hands sit exactly on the edge.
3. Velocity is zeroed and the support state becomes hang, which disables gravity.
4. A hang clip is chosen. From a reach it is the "swing" variant when there is open space
   under a thin ledge, otherwise the plain hang. From an up-jump the plain hang clip is
   entered at frame 15, skipping the catch portion that would not match the pose.

A reach that is moving backwards relative to the facing has its horizontal speed zeroed
(`lara.h` ~2427-2428).

### 2.3 While hanging

- **Letting go.** Releasing action drops the character: fall-from-hang clip, zero velocity,
  feet moved 128 units down, support state air (`lara.h` ~2287-2294).
- **Shimmying.** Left and right request the shimmy states (`lara.h` ~2721-2732). The
  movement probe is shifted forward and up to hand level, and the ledge must stay within
  ±64 units of hand height. Otherwise the position is restored (`lara.h` ~3657-3685). When
  the shimmy is blocked, the hang clip is re-entered at frame 21 (`lara.h` ~3735-3736).
- **Pulling up.** Forward requests `STATE_HANG_UP`, or `STATE_HANDSTAND` if walk is also
  held. It is allowed only if the cell just past the wall has at least one character height
  of clearance.
- **During the pull-up** the support state stays hang, so there is no gravity
  (`lara.h` ~2296-2297), and the hang-specific collision probe is switched off
  (`lara.h` ~3657).

### 2.4 Root motion and where the position is committed

This is the most transferable part.

- **The entity does not move during a climb clip.** The clip's root translation moves the
  skeleton relative to the entity (`Animation::getJoints`, `animation.h` ~254-259). The
  body visibly rises and moves forward while the gameplay position stays at the base of
  the wall.
- **The position is committed once, at clip end.** The clip carries an "offset" command.
  When the clip ends, `cmdOffset` rotates that offset by the facing angle and adds it to
  the position (`controller.h` ~1104-1107, ~1196-1199). The player override then runs one
  collision step to settle on the new floor (`lara.h` ~1551-1554).
- **The hand-over frame is compensated.** While sampling between the last frame of the
  ending clip and the first frame of the next one, the pending offset is added to the next
  frame's root position (`animation.h` ~258-259), and to its bounding box (~307-310). The
  visual pose is continuous even though the entity origin jumps.
- **The same trick is used for rotation.** A clip that ends in a 180° turn subtracts the
  pending rotation, scaled by the interpolation factor, from the model's yaw
  (`controller.h` ~1344, `animation.h` ~238-243).

### 2.5 What stops hands and feet from sliding

1. The exact snap of distance, yaw and height before the clip starts, so every climb
   starts from the pose the clip was authored for.
2. Zero entity velocity and no gravity for the whole clip. The only motion is authored.
3. Height normalisation instead of clip warping or scaling.
4. Entering clips at a chosen frame when coming from a different pose.
5. The compensated commit at clip end.

There is no inverse kinematics anywhere in this path. The quality comes entirely from
alignment plus authored clips. Since we have no climb clip, we need IK to get the same
result (section 5).

### 2.6 Related variants

- **Climbing out of water** (`waterOut`, `lara.h` ~1759-1790) follows the same pattern:
  frontal collision, ledge within 384 units, align to wall, set Y, then the clip. A
  separate clip is used when the ledge is less than 128 units up.
- **Steps up to 384 units** (0.86 m) are walked up without hands. Rises of 128 units or
  more swap in an "ascend" clip chosen by the leading foot (`lara.h` ~3750-3767), which is
  found from the current frame of the walk or run cycle (`lara.h` ~2814-2820).
- **Stepping down** while grounded moves the feet down at `DESCENT_SPEED` = 2048 units/s
  (4.6 m/s) rather than snapping (`lara.h` ~3758-3759).

## 3. Animation system

### 3.1 Sampling

- **Clock.** Clips advance in seconds and are converted to frames at a fixed 30 fps
  (`animation.h` ~68-75, ~118).
- **Keyframe spacing.** A clip's `frameRate` field is the number of ticks between stored
  keyframes. The sampler picks two keyframes and a fraction between them (~120-131).
- **Interpolation.** Joint rotations are interpolated as quaternions and the root position
  linearly (~250-259).
- **No cross-fade.** Exactly one clip plays at a time. A clip's length is extended by one
  frame interval, and during that interval the second keyframe is the entry frame of the
  next clip (`isPrepareToNext`, ~133-140). The blend between clips therefore lasts one
  keyframe interval, 33 ms or a small multiple of it.
- **Chaining.** Every clip names a successor clip and an entry frame in it. When a clip
  ends, the successor starts (`playNext`, ~95-97). Loops are clips that name themselves.

### 3.2 State-change ranges

`Animation::setState` (`animation.h` ~173-200) is the transition gate. A clip lists the
states it can lead to. Each has one or more frame ranges, and each range gives a
destination clip and entry frame.

- If the requested state is listed and the current frame is inside a range, the engine
  switches to that range's destination clip at its entry frame.
- If the state is listed but the frame is outside every range, the call still reports
  success and nothing changes. Gameplay code keeps requesting each tick, so the transition
  fires when the window opens. This acts as an input buffer for as long as the input is
  held.
- If the state is not listed at all, the call fails and the caller requests the default
  state for the current support state instead (`character.h` ~171-179,
  `lara.h` ~2928-2939).

Because a window is tied to a destination frame, the two poses are matched by the animator.
That is why a one-frame blend is enough.

### 3.3 Animation commands

Commands are handled in `Controller::updateAnimation` (`controller.h` ~1136-1202) and
`Animation::getCommand` (`animation.h` ~213-248).

| Command | When it applies | Effect |
|---|---|---|
| Offset (set position) | clip end | adds a facing-relative offset to the entity position |
| Jump (set velocity) | clip end | sets vertical and horizontal speed and switches to air |
| Empty hands | while the clip plays | puts weapons away |
| Kill | clip end | deactivates the entity |
| Sound | on a given frame | plays a sound; later game versions can restrict it to land or water |
| Effect | on a given frame | 180° turn, floor shake, mesh swap and similar |

Frame-keyed commands fire when their frame lies between the previous and the current frame
(`isFrameActive`, `animation.h` ~150-152), so none is missed when a tick skips a frame.

### 3.4 Movement speed comes from the clip

On the ground, the hang and the water surface, horizontal speed is not a controller
constant. It is the current clip's `speed + accel × frame` (`getSpeed`, `animation.h`
~202-205), applied along `angleExt` and projected onto the floor slope
(`lara.h` ~3456-3489). Feet do not skate because the clip and the travel speed are authored
together.

### 3.5 Turning and lean

- **Turn rates by state** (`lara.h` ~16-27, ~3390-3414): 180°/s for the fast turn and the
  run, 135°/s for the fast back-step, 90°/s for turn-in-place, walk and the landing clip,
  60°/s for forward jump, backwards walk and wading, and zero elsewhere.
- **Lean** is a roll of the whole model about its forward axis (`character.h` ~186-197,
  `controller.h` ~1335-1349). It is active while running, in the landing clip and
  underwater. It builds at `LARA_TILT_SPEED` = 37.5°/s up to `LARA_TILT_MAX` = 10° and
  decays at the same rate.
- **Run turning is tied to lean.** While running, the turn rate is scaled by the current
  lean divided by the maximum lean (`lara.h` ~3397-3401), so a turn eases in as the body
  leans.
- **Wall sliding.** A side collision rotates the character away from the wall at 150°/s
  (`lara.h` ~3671-3674).

### 3.6 Layering on top of the base clip

Layering uses per-joint rotation overrides with a bit mask (`updateOverrides`,
`lara.h` ~1230-1286; `animation.h` ~282-286):

- **Head and chest look-at.** Each is an extra rotation eased towards its target at 8 per
  second. The chest takes half of the aim rotation and the head the rest, each within
  angular limits (`character.h` ~250-272).
- **Arms.** When weapons are out, the arm joints take their rotations from separate arm
  animations, re-expressed relative to the hips and chest so the aim stays stable.
- **Hit reactions.** A second animation instance is sampled and its rotations are copied
  onto the masked joints.

### 3.7 How pops are avoided when switching in mid-air

- Air-to-air switches (jump to reach, jump to fall, jump to roll) go through the same
  state-change windows, so they happen only at matched frames.
- Velocity is never touched by a clip switch in the air. It is set only by the jump
  command, gravity and collision responses. The trajectory is continuous whatever the
  animation does.
- Forced switches (smash, forward fall, landing from a fall) accept the one-frame blend.
- Landing snaps the feet to the floor on the same tick the ground state is entered.

## 4. Camera

From `camera.h` ~9-38, ~127-168, ~330-354, ~356-557 and `lara.h` ~2941-3008.

- **Look-at target.** Horizontally it follows the character with no lag. Vertically it is
  low-passed at 5 per second, a time constant of about 0.2 s (`camera.h` ~509-516). A jump
  therefore moves the framing less than it moves the character.
- **Target height comes from the animated bounding box**, three quarters of the way up it
  plus 256 units, not from the entity origin (`getViewPoint`, ~127-168). During a climb the
  origin stays at the wall base while the body rises, and the camera follows the body. The
  commit at clip end causes no camera jump because the bounding box is compensated too.
- **Eye position.** The desired eye is the target minus the view direction times 1536 units
  (3.45 m; 2048 units in combat). The eye moves towards it at `30 / CAM_SPEED_FOLLOW` =
  2.5 per second, a time constant of about 0.4 s. Combat uses 3.75 per second (~330-336).
  It is then clamped 256 units inside the floor and ceiling and clipped against level
  geometry.
- **Per-state angle offsets** are set every tick from the character state and reached
  through the eye lag, so they ease in: reach has an 85° yaw offset, back jump 135°, hang
  a 60° pitch offset, slide 45° pitch, wade and water surface 22° pitch.
- **Free look** returns to centre at 10 per second.

## 5. Recommendations for our game

Our setup: three.js r147, a skinned human on a 3ds Max Biped skeleton, `AnimationMixer`,
clips for idle, walk, run, a 0.79 s mocap jump (crouch, push-off, flight), landing,
crouch-in, crouch-out and an arms-up reach, and no climb clip. The capsule controller uses
a 6.7 m/s jump impulse and 20 m/s² gravity, giving 0.67 s in the air and a 1.12 m apex.
The scripted climb lasts 0.8 s on a 0..1 progress value, and ledges up to 1.95 m can be
climbed.

For comparison, OpenLara's gravity is about 12 m/s², so its jumps are much floatier than
ours. Our 20 m/s² is snappier, which makes anticipation and landing more important, because
the flight is too short to carry the motion on its own.

### Summary of suggested timings

| Phase | Suggested time |
|---|---|
| Standing jump anticipation, press to impulse | 0.12-0.18 s |
| Running jump anticipation | 0-0.06 s |
| Jump request buffer | 0.15 s |
| Cross-fade into the jump clip | 0.06-0.08 s |
| Cross-fade jump to fall pose | 0.15-0.20 s |
| Soft landing, under 7.5 m/s impact | 0.12-0.18 s, movement not locked |
| Hard landing, 7.5-11 m/s | 0.35-0.45 s, movement locked, turning allowed |
| Ledge alignment blend | 0.08-0.12 s |
| Step-up, ledge under 0.6 m | 0.30-0.40 s |
| Vault, ledge 0.6-1.2 m | 0.70-0.90 s |
| Full climb, ledge 1.2-1.95 m | 1.20-1.50 s |
| Camera vertical follow | time constant about 0.2 s |
| Camera eye follow | time constant about 0.4 s |

### Prioritised list

1. **Add an anticipation state before the impulse.** *Transfers directly.* On a standing
   jump press, enter a "compress" state: feet planted, the crouch part of the mocap clip
   playing, no impulse. Aim for 0.12-0.18 s from press to lift-off. Find the push-off time
   in the 0.79 s clip, the moment the feet leave the ground, and time-scale the part before
   it so it fits that budget.

2. **Let the clip trigger the impulse.** *Transfers directly.* Apply the 6.7 m/s impulse
   when the jump action's time crosses the push-off time, checked as "previous time below,
   current time at or above" so a long frame cannot skip it. Do not run a separate timer
   that can drift from the clip.

3. **Choose the jump direction at the end of the anticipation.** *Transfers directly.*
   Read the stick at lift-off, not at the press. Probe about 0.5 m in that direction first
   and downgrade to a vertical jump if a wall is there. Keep horizontal velocity fixed
   during flight, or allow only slow steering of about 60°/s.

4. **Skip the anticipation when running.** *Transfers directly.* From a run, start the jump
   clip at or just before its push-off time, with at most 0.06 s of delay. Gate it to a
   foot-plant window of the run cycle, or cross-fade over 0.06-0.08 s if gating feels
   unresponsive. Require a short run-up of about 0.2 s before a running jump is allowed.

5. **Drive the flight part of the clip from physics, not wall time.** *Adaptation.* Map the
   flight section of the clip onto the ballistic phase using vertical speed: phase =
   (take-off speed − current vertical speed) ÷ (2 × take-off speed). The apex pose then
   coincides with the real apex and the clip cannot run out early or late when the landing
   height differs.

6. **Switch to the fall pose by speed.** *Transfers directly.* A flat-ground jump lands at
   6.7 m/s, so use a threshold of about 7.5 m/s downward. A normal jump then never shows
   the fall pose and only real drops do. When walking off an edge, stay grounded for drops
   under 0.3 m, the equivalent of OpenLara's 256-unit tolerance scaled to taste.

7. **Grade landings by impact speed.** *Transfers directly.* Under 7.5 m/s: a short landing
   blend that lets a held stick run straight out. From 7.5 to 11 m/s: the full landing clip
   with movement locked but turning allowed. Above about 12 m/s: stagger or damage, growing
   with the square of the excess speed.

8. **Align to the ledge before any climb motion.** *Transfers directly.* On a successful
   detection, compute a target pose: yaw facing into the wall, position one capsule radius
   back from the wall plane, and the height that puts the hands on the edge. Blend to it
   over 0.08-0.12 s. OpenLara snaps in one tick, but its distances are tiny. Zero the
   velocity and disable gravity and normal collision for the whole climb.

9. **Tighten ledge detection.** *Transfers directly.* Require the ledge top within about
   ±0.15 m of hand height for air grabs, a wall within about 0.5 m ahead, facing within
   30-45° of the wall normal, and at least one body height of clearance on top. In a
   forward jump, grab only when no longer rising.

10. **Pick a climb variant by ledge height.** *Transfers directly.* Three bands, scaled
    from OpenLara's fractions of body height:
    - under 0.6 m: a step-up with no hands, 0.30-0.40 s;
    - 0.6-1.2 m: a vault with hands at waist-to-chest height, 0.70-0.90 s;
    - 1.2-1.95 m: a full hang and pull-up, 1.20-1.50 s.

11. **Lengthen the tall climb and phase it.** *Transfers as an idea.* 0.8 s is rushed for a
    1.95 m ledge. For the tallest ledge, about 1.35 s:
    - align and reach, arms going up: 0.10-0.15 s;
    - optional small hop so the grab looks dynamic: 0.15 s, with an impulse computed from
      the gap the way OpenLara does, the square root of 2 × gravity × the rise needed;
    - pull, the body rising until the chest clears the edge: 0.50-0.55 s, eased in and out;
    - forward onto the ledge, knees landing in the crouch pose: 0.30 s;
    - stand up with the crouch-out clip: 0.30-0.35 s.

    Keep the existing overlap, rise over the first 60% and forward over the last 50%, but
    scale the total with ledge height, for example 0.9 s + 0.45 s × (height ÷ 1.95 m),
    which gives about 1.2 s at 1.2 m and 1.35 s at 1.95 m.

12. **Build the climb from the clips we have.** *Our own addition.* Use the arms-up reach
    clip as the hang pose, the end of crouch-in as the "knees on the ledge" pose, and
    crouch-out to stand up. Cross-fade between them on the climb progress value rather
    than on wall time.

13. **Pin the hands with IK.** *Our own addition; OpenLara has no IK.* At alignment,
    compute two fixed world points on the ledge edge, about 0.2 m either side of the body
    centre. Run a two-bone IK on each Biped arm (upper arm, forearm, hand) to hold the
    hands on those points from the grab until the hips pass the edge, then fade the IK
    weight out over the last quarter. This replaces the authored clip that stops hands
    sliding in OpenLara.

14. **Commit the position once, at the end, with compensation.** *Transfers directly.* Two
    workable options:
    - keep the capsule at the wall base, move only the visual model along the climb curve,
      and at the end move the capsule to the top and zero the visual offset in the same
      frame;
    - or move the capsule kinematically, as now.

    Either way run one collision settle at the end, and make sure nothing reads the capsule
    position for the camera during the climb (item 15).

15. **Make the camera follow the visible body with vertical damping.** *Transfers
    directly.* Target the hips or the animated bounds, not the capsule origin. Follow
    horizontally with no lag and vertically with a time constant of about 0.2 s. Move the
    eye with a time constant of about 0.4 s. Use the frame-rate-independent form
    `1 - exp(-rate * dt)` with rates 5 and 2.5. Optionally add a slight pitch offset while
    hanging.

Lower-priority ideas that also transfer:

- **Transition windows with buffering.** Give each clip a small table of "may leave to
  state X between times a and b, entering the destination at time c". Keep a request alive
  while the input is held, or for 0.15 s.
- **Enter clips at a matched time.** When coming from a different pose, start the
  destination action part-way in, as OpenLara does when it enters the hang clip at frame 15
  or 21.
- **Cross-fade lengths.** OpenLara blends for one frame because its poses are authored to
  match. Mocap clips are not, so use 0.10-0.15 s on the ground, 0.06-0.08 s into take-off,
  and 0.15-0.20 s into the fall pose.
- **Lean on a parent node.** Roll a pivot above the skeleton root by up to 10° at about
  37°/s while running and turning, and scale the turn rate by the current lean so turns
  ease in. Keep it out of the clips.
- **Air collisions.** On hitting a wall in flight, cut horizontal speed to about a quarter
  and reverse it, and cancel any remaining upward speed. On a ceiling hit, set a small
  downward speed of about 2 m/s.
- **Fixed sub-steps.** Step the controller in slices of at most 1/30 s and cap the frame
  total at 0.2 s, so jump height and grab windows do not depend on frame rate.
