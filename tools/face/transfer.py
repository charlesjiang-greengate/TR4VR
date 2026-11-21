"""Transfer a photo face onto a Rocketbox head texture (after fit_head.py has matched the geometry).
usage: python3 -I tools/face/transfer.py VAR PHOTO RENDERDIR OUT.jpg [key=value ...]
  RENDERDIR: b/, uv/, uvf/ front renders of the head the texture is for (tools/face/render_set.sh).
Landmarks on the render are mapped to texture px through the UV pass and matched with the photo's landmarks; the photo is
warped into texture space (piecewise affine, fold-free), its detail and part of its skin tone are blended in, the whole
head is shifted towards that tone and the irises are made dark brown. The eye contour is not taken from the detector on
the render: the photo's eye corners and lids are pinned to the eye openings measured on the render (visible eyeball).
Also writes OUT_gain.json (skin tone gain, reused for the body texture).
options (defaults): sigma=18 lowmix=0.6 shrink=1.0 task=face_landmarker.task base=assets/char2/VAR_head.jpg"""
import sys, os, json, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from facelib import *
from PIL import Image
from skimage.transform import PiecewiseAffineTransform, warp
from scipy.spatial import Delaunay, ConvexHull

var, photo, rdir, out = sys.argv[1:5]
o = dict(sigma=18.0, lowmix=0.6, shrink=1.0, task='face_landmarker.task', base=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'char2', var + '_head.jpg'))
for a in sys.argv[5:]:
    k, v = a.split('='); o[k] = type(o[k])(v)

LR = landmarks(o['task'], f'{rdir}/b/{var}_front.png'); LP = landmarks(o['task'], photo)[:, :2]
u, v, ok = decode_uv(f'{rdir}/uv/{var}_front.png')
def tex_at(xy):
    x, y = int(round(xy[0])), int(round(xy[1]))
    return (u[y, x], v[y, x]) if ok[y, x] and v[y, x] < 640 else None
T, P = [], []
for i in range(468):
    if i in EYE_ALL: continue
    t = tex_at(LR[i]);
    if t is not None: T.append(t); P.append(LP[i])
# eye pins: corners and lids of the opening actually visible on the render
masks = eye_masks(f'{rdir}/uvf/{var}_front.png'); pinT, pinP = [], []
for side, e in EYES.items():
    ids = [e['outer'], e['inner']] + e['upper'][1:6] + e['lower'][1:6]
    a, b = LP[e['outer']], LP[e['inner']]; ts = np.clip([(LP[i] - a) @ (b - a) / ((b - a) @ (b - a)) for i in ids[2:]], 0.06, 0.94)
    if side == 'R': ts = 1 - ts
    cl, cr, mu, ml = eye_rim(masks[side], ts); cen = np.array(np.nonzero(masks[side])).mean(1)[::-1]
    pts = [cl if side == 'L' else cr, cr if side == 'L' else cl] + list(mu[:5]) + list(ml[5:])
    for i, p in zip(ids, pts):
        for step in (1.5, 2.5, 4):
            t = tex_at(p + (p - cen) / np.linalg.norm(p - cen) * step)
            if t is not None: break
        if t is not None: pinT.append(t); pinP.append(LP[i])
pinT = np.array(pinT); T = np.array(T); P = np.array(P)
print('eye pins (texture px):', pinT.round(0).astype(int).tolist())
far = [k for k in range(len(T)) if not any((abs(T[k, 0] - e[:, 0].mean()) < np.ptp(e[:, 0]) / 2 + 9) and (abs(T[k, 1] - e[:, 1].mean()) < np.ptp(e[:, 1]) / 2 + 9) for e in (pinT[:len(pinT) // 2], pinT[len(pinT) // 2:]))]
T = np.vstack([T[far], pinT]); P = np.vstack([P[far], pinP]); npin = len(pinT)

# drop landmarks that make triangles fold over (photo vs texture orientation disagree), worst offender first
def area(X, t): a, b, c = X[t[:, 0]], X[t[:, 1]], X[t[:, 2]]; return (b[:, 0] - a[:, 0]) * (c[:, 1] - a[:, 1]) - (b[:, 1] - a[:, 1]) * (c[:, 0] - a[:, 0])
keep = np.ones(len(T), bool)
for _ in range(200):
    idx = np.nonzero(keep)[0]; tri = Delaunay(T[idx]).simplices
    bad = tri[area(T[idx], tri) * area(P[idx], tri) <= 0]
    if not len(bad): break
    cnt = np.bincount(bad.ravel(), minlength=len(idx)); keep[idx[np.argmax(cnt)]] = False
print('landmarks used', int(keep.sum()), 'dropped', int((~keep).sum()), 'eye pins kept', int(keep[-npin:].sum()), 'of', npin)
T, P = T[keep], P[keep]

tex = np.array(Image.open(o['base']).convert('RGB')).astype(np.float32) / 255; stock = tex.copy()
ph = np.array(Image.open(photo).convert('RGB')).astype(np.float32) / 255
tf = PiecewiseAffineTransform(); tf.estimate(T, P)
W = warp(ph, tf, output_shape=tex.shape[:2], order=3, cval=-1)
valid = (W[..., 0] >= 0).astype(np.float32); W[valid == 0] = 0
hull = T[ConvexHull(T).vertices]; c = T.mean(0); poly = (c + (hull - c) * o['shrink']).astype(np.int32)
m = np.zeros(tex.shape[:2], np.float32); cv2.fillPoly(m, [poly], 1.0); m *= valid
m = cv2.erode(m, np.ones((9, 9), np.uint8)); m = cv2.GaussianBlur(m, (0, 0), 14)

def low(img, mk, s):
    num = cv2.GaussianBlur(img * mk[..., None], (0, 0), s); den = cv2.GaussianBlur(mk, (0, 0), s)[..., None]
    return num / np.maximum(den, 1e-4)
hard = (m > 0.02).astype(np.float32); Wl = low(W, hard, o['sigma']); Tl = low(tex, hard, o['sigma'])
core = m > 0.6
gain = np.median(W[core], 0) / np.maximum(np.median(tex[core], 0), 1e-3); gain = 1 + (gain - 1) * o['lowmix']
print('skin gain', gain.round(3))
tex_t = np.clip(tex * gain, 0, 1)                      # whole head toward the photo's skin tone
base = Tl * gain * (1 - o['lowmix']) + Wl * o['lowmix']
res = np.clip(base * (W / np.maximum(Wl, 1e-3)), 0, 1)
final = tex_t * (1 - m[..., None]) + res * m[..., None]

if var == 'elder':   # paint out the stock model's ear plugs, neck tattoo and necklace pendant
    u8 = (final * 255).astype(np.uint8); mk = np.zeros((1024, 1024), np.uint8)
    for cx, cy in [(262, 412), (765, 412)]: cv2.circle(mk, (cx, cy), 11, 255, -1)
    cv2.rectangle(mk, (176, 372), (224, 466), 255, -1); cv2.rectangle(mk, (476, 684), (550, 726), 255, -1)
    final = cv2.inpaint(u8, mk, 9, cv2.INPAINT_TELEA).astype(np.float32) / 255
# irises: dark brown (eyeball island around (270, 955) in this atlas)
yy, xx = np.mgrid[0:1024, 0:1024]; d = np.hypot(xx - 270, yy - 955); lum = stock.mean(2, keepdims=True)
iris_mask = np.clip((26 - d) / 4, 0, 1)[..., None] * (yy > 900)[..., None]
final = final * (1 - iris_mask) + np.clip(np.array([0.23, 0.14, 0.09]) * (0.5 + lum * 1.6), 0, 1) * iris_mask
Image.fromarray((final * 255).astype(np.uint8)).save(out, quality=92)
json.dump(gain.tolist(), open(out.replace('.jpg', '_gain.json'), 'w'))
print('done', out)
