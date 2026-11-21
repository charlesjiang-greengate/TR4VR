"""Reshape a Rocketbox head (bind-space vertices) so its face proportions match a photo.
usage: python3 -I tools/face/fit_head.py IN.glb RENDERDIR VAR PHOTO OUT.glb [key=value ...]
  RENDERDIR holds b/VAR_front.png, uv/VAR_front.png, uvf/VAR_front.png of IN.glb (tools/face/render_set.sh).
  PHOTO is a frontal portrait; it is only read, never copied.
How: MediaPipe landmarks (x, y, depth) on the render and on the photo; the photo landmarks are aligned to the render's
with a 3D similarity; each landmark's residual becomes a bind-space displacement of the mesh point under it (found
through the UV pass); the eye openings are measured on the render itself (visible eyeball pixels) instead of trusting the
detector; displacements are spread with a smoothed thin-plate RBF, faded out towards ears / skull / neck; eyeballs move
rigidly with their sockets and lids are kept in front of them. Can be run again on its own output to refine (gain<1).
options (defaults): gain=1 depth=0.6 mouth=0.6 eye=1 smooth=2e-4 fade0=0.02 fade1=0.055 symeye=0 task=face_landmarker.task
                    lid=0.0004 eyeopen=1 dump=PATH.json (write the control points for debugging)
  inner=F (0<F<1): refinement pass. Only landmarks inside F x the face oval are corrected, the rest are pinned. Use it
  when re-running on an already reshaped head: the detector's face outline does not follow the mesh, so correcting
  it again and again inflates the cheeks and forehead."""
import sys, os, json, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glbio import GLB, components, boundary_loops, vertex_normals, weld
from facelib import *
from scipy.interpolate import RBFInterpolator
from scipy.spatial import cKDTree

src, rdir, var, photo, dst = sys.argv[1:6]
o = dict(gain=1.0, depth=0.6, mouth=0.6, eye=1.0, smooth=2e-4, fade0=0.02, fade1=0.055, symeye='0', task='face_landmarker.task', lid=0.0004, dump='', eyeopen=1.0, inner=0.0)
for a in sys.argv[6:]:
    k, v = a.split('='); o[k] = type(o[k])(v)

g = GLB(src); prim = g.head_prim()
P = g.acc(prim['attributes']['POSITION']).astype(np.float64); UV = g.acc(prim['attributes']['TEXCOORD_0']) * 1024; I = g.acc(prim['indices']).reshape(-1, 3)
comp = components(P, I); ids, cnt = np.unique(comp, return_counts=True); main = comp == ids[np.argmax(cnt)]
ball = (~main) & (UV[:, 0] > EYEBALL_UV[0]) & (UV[:, 0] < EYEBALL_UV[1]) & (UV[:, 1] > EYEBALL_UV[2])

# ---- render -> mesh correspondences
PM = posmap(P, UV, I, main); R3 = render_positions(f'{rdir}/uv/{var}_front.png', PM); A, rms = fit_camera(R3)
print('camera fit rms px', round(rms, 2))
def pos_at(xy, r=3):
    """bind-space position under a render pixel (median of the valid neighbourhood), or None"""
    x, y = int(round(xy[0])), int(round(xy[1])); w = R3[max(y - r, 0):y + r + 1, max(x - r, 0):x + r + 1].reshape(-1, 3); w = w[~np.isnan(w[:, 0])]
    if len(w) < (2 * r + 1) ** 2 * 0.4: return None
    c = np.median(w, 0); return w[np.argmin(np.linalg.norm(w - c, axis=1))].astype(float)

LR = landmarks(o['task'], f'{rdir}/b/{var}_front.png'); LP = landmarks(o['task'], photo)
core = [i for i in range(468) if i not in LIPS_INNER and i not in LIPS_OUTER]
s, Rm, t = umeyama(LP[core], LR[core]); Q = s * LP @ Rm.T + t          # photo landmarks in the render's frame
print('photo->render scale', round(s, 4), 'residual px (median)', round(float(np.median(np.linalg.norm((Q - LR)[:468, :2], axis=1))), 2))

# ---- eye openings: measured on the render (source) and taken from the photo landmarks (target)
masks = eye_masks(f'{rdir}/uvf/{var}_front.png'); eyes = {}
def lid_params(L, e):
    """each lid landmark as (t along outer->inner, h perpendicular) in units of the corner distance"""
    a, b = L[e['outer'], :2], L[e['inner'], :2]; ax = b - a; n = np.linalg.norm(ax); ax /= n; pr = np.array([-ax[1], ax[0]])
    f = lambda ids: np.array([[(L[i, :2] - a) @ ax / n, (L[i, :2] - a) @ pr / n] for i in ids])
    return f(e['upper']), f(e['lower'])
for side, e in EYES.items():
    up, lo = lid_params(Q, e)
    if o['symeye'] in ('L', 'R') and side != o['symeye']:   # borrow lid heights from the other (more open) eye
        up2, lo2 = lid_params(Q, EYES[o['symeye']]); up[:, 1] = -up2[:, 1]; lo[:, 1] = -lo2[:, 1]
    a, b = Q[e['outer'], :2], Q[e['inner'], :2]; ax = b - a; pr = np.array([-ax[1], ax[0]])
    mid = (up[:, 1] + lo[:, 1]) / 2
    tgt = {e['outer']: a, e['inner']: b}
    for ids, par in ((e['upper'], up), (e['lower'], lo)):
        for i, (tt, hh), m in zip(ids, par, mid): tgt[i] = a + tt * ax + (m + (hh - m) * o['eyeopen']) * pr
    # source: the visible eyeball on the render. Left->right on screen = outer->inner for L, inner->outer for R.
    ts = np.clip(np.concatenate([up[:, 0], lo[:, 0]]), 0.04, 0.96)
    if side == 'R': ts = 1 - ts
    cl, cr, mu, ml = eye_rim(masks[side], ts); n = len(e['upper'])
    srcp = {e['outer']: cl if side == 'L' else cr, e['inner']: cr if side == 'L' else cl}
    for k, i in enumerate(e['upper']): srcp[i] = mu[k]
    for k, i in enumerate(e['lower']): srcp[i] = ml[n + k]
    cen = np.array(np.nonzero(masks[side])).mean(1)[::-1]
    eyes[side] = dict(tgt=tgt, src=srcp, cen=cen)
    w_s = np.linalg.norm(srcp[e['inner']] - srcp[e['outer']]); w_t = np.linalg.norm(b - a)
    h_s = np.mean(ml[n:, 1] - mu[:n, 1]); h_t = np.mean(np.abs(lo[:, 1] - up[:, 1])) * w_t * o['eyeopen']
    print(f'eye {side}: width {w_s:.1f} -> {w_t:.1f} px, mean opening {h_s:.1f} -> {h_t:.1f} px, centre {cen.round(1)} -> {np.mean([a, b], 0).round(1)}')

# ---- control points: mesh position + displacement
kx = np.linalg.lstsq(np.c_[R3[::9, ::9, 0].ravel(), np.ones(R3[::9, ::9, 0].size)][~np.isnan(R3[::9, ::9, 0].ravel())],
                     np.mgrid[0:R3.shape[0]:9, 0:R3.shape[1]:9][1].ravel()[~np.isnan(R3[::9, ::9, 0].ravel())], rcond=None)[0][0]
mpp = 1.0 / kx; print('metres per px', round(mpp, 6))                  # px -> metres at face depth
C, D, tag = [], [], []
for i in range(468):
    if i in LIPS_INNER: continue
    if i in EYE_ALL:
        side = 'L' if i in eyes['L']['src'] else 'R'; e = eyes[side]; sp = e['src'][i]
        out = sp + (sp - e['cen']) / max(np.linalg.norm(sp - e['cen']), 1e-6) * 3.0   # step off the eyeball onto the lid
        m = pos_at(out, 1); d2 = (e['tgt'][i] - sp) * o['eye']; dz = (Q[i, 2] - LR[i, 2])
    else:
        m = pos_at(LR[i, :2]); d2 = Q[i, :2] - LR[i, :2]; dz = Q[i, 2] - LR[i, 2]
        if i in LIPS_OUTER: d2 = d2 * o['mouth']; dz *= o['mouth']
    if m is None: continue
    C.append(m); D.append([d2[0] * mpp, dz * mpp * o['depth'], -d2[1] * mpp]); tag.append(i)
C = np.array(C); D = np.array(D) * o['gain']; tag = np.array(tag)
if o['inner'] > 0:
    ov = LR[OVAL, :2]; c0 = ov.mean(0); ang = np.arctan2(ov[:, 1] - c0[1], ov[:, 0] - c0[0]); k = np.argsort(ang)
    rad = lambda p: np.interp(np.arctan2(p[1] - c0[1], p[0] - c0[0]), ang[k], np.linalg.norm(ov - c0, axis=1)[k], period=2 * np.pi)
    f = np.array([np.linalg.norm(LR[i, :2] - c0) / rad(LR[i, :2]) for i in tag])
    D *= np.clip((o['inner'] + 0.12 - f) / 0.12, 0, 1)[:, None]
print('control points', len(C), 'max |d| mm', (np.linalg.norm(D, axis=1).max() * 1000).round(2), 'mean mm', (np.linalg.norm(D, axis=1).mean() * 1000).round(2))

# ---- fade: 1 on the face, 0 from fade1 metres away from any landmark; neck seam and everything behind stay put
Pm = P[main]; dist = cKDTree(C).query(Pm)[0]
w = np.clip((o['fade1'] - dist) / (o['fade1'] - o['fade0']), 0, 1); w = w * w * (3 - 2 * w)
still = Pm[w == 0]; rs = np.random.RandomState(1); anchors = still[rs.choice(len(still), min(250, len(still)), replace=False)]
rbf = RBFInterpolator(np.vstack([C, anchors]), np.vstack([D, np.zeros((len(anchors), 3))]), kernel='thin_plate_spline', smoothing=o['smooth'])
field = lambda X: rbf(X) * (lambda d: (lambda q: q * q * (3 - 2 * q))(np.clip((o['fade1'] - d) / (o['fade1'] - o['fade0']), 0, 1)))(cKDTree(C).query(X)[0])[:, None]
N0 = vertex_normals(P, I)
P2 = P.copy(); P2[main] = Pm + field(Pm)
fitres = np.linalg.norm(field(C) - D, axis=1) * 1000; print('rbf residual at controls mm: median', np.median(fitres).round(2), 'max', fitres.max().round(2))

# ---- eyeballs follow their sockets; lids stay in front of them
for sgn in (-1, 1):
    b = ball & (P[:, 0] * sgn > 0); q = P[b]
    sol = np.linalg.lstsq(np.hstack([2 * q, np.ones((len(q), 1))]), (q ** 2).sum(1), rcond=None)[0]; c0 = sol[:3]; r = np.sqrt(sol[3] + c0 @ c0)
    side = 'L' if project(A, c0[None])[0, 0] < R3.shape[1] / 2 else 'R'; e = EYES[side]
    rim = np.isin(tag, [e['outer'], e['inner']] + e['upper'] + e['lower']); mv = field(C[rim]).mean(0)
    P2[b] = q + mv; c1 = c0 + mv
    near = main & (np.linalg.norm(P - c0, axis=1) < r + 0.012)
    d0 = np.linalg.norm(P[near] - c0, axis=1); v = P2[near] - c1; d1 = np.linalg.norm(v, axis=1)
    need = np.where(d0 >= r - 0.0002, r + o['lid'], 0)               # skin that was outside the ball must stay outside
    push = (d1 < need) & (P[near][:, 1] < c0[1] + 0.004)
    v[push] *= (need[push] / np.maximum(d1[push], 1e-6))[:, None]; idx = np.nonzero(near)[0]; P2[idx[push]] = c1 + v[push]
    print(f'eyeball {side}: moved mm {(mv * 1000).round(2)}, lid vertices pushed clear {int(push.sum())}')

# ---- checks, normals, write
loops = boundary_loops(P, I, main); seam = np.unique(np.concatenate(loops)); rep = weld(P)
assert np.abs(P2 - P)[np.isin(rep, seam)].max() == 0, 'neck seam moved'
tail = (UV[:, 0] > 500) & (UV[:, 1] > 640) & (P[:, 1] > 0.06); assert np.abs(P2 - P)[tail].max() == 0, 'ponytail moved'
assert np.abs(P2[rep] - P2).max() < 1e-9, 'welded vertices split'
print('moved vertices', int((np.abs(P2 - P).max(1) > 1e-6).sum()), 'of', len(P), ' max move mm', (np.linalg.norm(P2 - P, axis=1).max() * 1000).round(2))
N = g.acc(prim['attributes']['NORMAL']).astype(np.float64) + vertex_normals(P2, I) - N0; N /= np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-9)
g.put(prim['attributes']['POSITION'], P2.astype(np.float32)); g.put(prim['attributes']['NORMAL'], N.astype(np.float32)); g.save(dst)
if o['dump']: json.dump(dict(C=C.tolist(), D=D.tolist(), tag=tag.tolist(), Q=Q.tolist(), LR=LR.tolist()), open(o['dump'], 'w'))
print('wrote', dst)
