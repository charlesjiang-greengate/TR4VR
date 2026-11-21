"""Shared helpers for the face tools: MediaPipe landmarks (with depth), UV-pass decoding, texture-space position map,
camera fit and eye-opening measurement on a render."""
import numpy as np
from PIL import Image
from scipy import ndimage

# MediaPipe face-mesh indices. "L" = the eye on the image's left.
EYES = {'L': dict(outer=33, inner=133, upper=[246, 161, 160, 159, 158, 157, 173], lower=[7, 163, 144, 145, 153, 154, 155]),
        'R': dict(outer=263, inner=362, upper=[466, 388, 387, 386, 385, 384, 398], lower=[249, 390, 373, 374, 380, 381, 382])}
EYE_ALL = set(sum([[e['outer'], e['inner']] + e['upper'] + e['lower'] for e in EYES.values()], [])) | set(range(468, 478))
LIPS_INNER = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95]
LIPS_OUTER = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146]
OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]


_det = {}


def landmarks(task, path, passes=3):
    """478 x 3 array: x, y in pixels, z in the same pixel scale (negative = towards the camera).
    The detector is run again on a square crop around the face (resampled to 640 px): on a full photo with a small or
    turned face the first pass is several pixels off around the eyes, mouth and chin."""
    import mediapipe as mp, cv2
    from mediapipe.tasks.python import vision, BaseOptions
    if task not in _det:
        _det[task] = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(base_options=BaseOptions(model_asset_path=task), num_faces=1))
    det = _det[task]; im = np.array(Image.open(path).convert('RGB')); L = None
    for k in range(passes):
        if L is None: x0, y0, sc, crop = 0.0, 0.0, 1.0, im
        else:
            c = (L[:468, :2].min(0) + L[:468, :2].max(0)) / 2; half = np.ptp(L[:468, :2], axis=0).max() * 0.85
            x0, y0 = c - half; sc = 640 / (2 * half)
            crop = cv2.warpAffine(im, np.array([[sc, 0, -x0 * sc], [0, sc, -y0 * sc]]), (640, 640), flags=cv2.INTER_CUBIC if sc > 1 else cv2.INTER_AREA, borderMode=cv2.BORDER_REPLICATE)
        r = det.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(crop)))
        if not r.face_landmarks:
            if L is None: raise SystemExit('no face in ' + path)
            break
        h, w = crop.shape[:2]
        L = np.array([[p.x * w / sc + x0, p.y * h / sc + y0, p.z * w / sc] for p in r.face_landmarks[0]])
    return L


def decode_uv(path):
    """UV-pass render -> (u, v) in texture px (float, 1024 space) and a validity mask"""
    a = np.array(Image.open(path).convert('RGB')).astype(int); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    u = ((r << 4) | (b >> 4)) / 4.0; v = ((g << 4) | (b & 15)) / 4.0
    return u, v, (r + g) > 0


def posmap(P, UV, I, sel, size=1024):
    """texture-space map of bind-space positions for the triangles whose vertices are all in sel"""
    M = np.full((size, size, 3), np.nan, np.float32)
    for t in I:
        if not sel[t].all(): continue
        a, b, c = UV[t]; lo = np.floor(np.minimum(np.minimum(a, b), c)).astype(int) - 1; hi = np.ceil(np.maximum(np.maximum(a, b), c)).astype(int) + 1
        lo = np.clip(lo, 0, size - 1); hi = np.clip(hi, 0, size - 1)
        xs, ys = np.meshgrid(np.arange(lo[0], hi[0] + 1), np.arange(lo[1], hi[1] + 1))
        d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if abs(d) < 1e-9: continue
        w0 = ((b[1] - c[1]) * (xs - c[0]) + (c[0] - b[0]) * (ys - c[1])) / d
        w1 = ((c[1] - a[1]) * (xs - c[0]) + (a[0] - c[0]) * (ys - c[1])) / d; w2 = 1 - w0 - w1
        ok = (w0 >= -0.6 / max(abs(d) ** 0.5, 1)) & (w1 >= -0.6 / max(abs(d) ** 0.5, 1)) & (w2 >= -0.6 / max(abs(d) ** 0.5, 1))
        pos = w0[..., None] * P[t[0]] + w1[..., None] * P[t[1]] + w2[..., None] * P[t[2]]
        M[ys[ok], xs[ok]] = pos[ok]
    return M


def render_positions(uvpath, PM):
    """per-pixel bind-space position of a UV-pass render (nan where background)"""
    u, v, ok = decode_uv(uvpath); s = PM.shape[0]
    R = PM[np.clip(np.round(v).astype(int), 0, s - 1), np.clip(np.round(u).astype(int), 0, s - 1)].copy(); R[~ok] = np.nan
    return R


def fit_camera(R, step=7):
    """3x4 projection (DLT) from a per-pixel position image; returns (A, rms px)"""
    ys, xs = np.mgrid[0:R.shape[0]:step, 0:R.shape[1]:step]; X = R[ys, xs].reshape(-1, 3); px = np.stack([xs.ravel(), ys.ravel()], 1).astype(float)
    ok = ~np.isnan(X[:, 0]); X = X[ok].astype(float); px = px[ok]; mu = X.mean(0); Xc = X - mu
    def solve(X, px):
        Xh = np.hstack([X, np.ones((len(X), 1))]); rows = []
        for k in range(2): rows.append(np.hstack([Xh * (k == 0), Xh * (k == 1), -px[:, k:k + 1] * Xh]))
        return np.linalg.svd(np.vstack(rows))[2][-1].reshape(3, 4)
    A = solve(Xc, px)
    for _ in range(3):   # drop outliers (texels the UV pass decoded across a seam)
        e = np.linalg.norm(project(A, Xc) - px, axis=1); k = e < max(2.0, 2.5 * np.median(e)); A = solve(Xc[k], px[k])
    e = np.linalg.norm(project(A, Xc) - px, axis=1)
    A = A @ np.array([[1, 0, 0, -mu[0]], [0, 1, 0, -mu[1]], [0, 0, 1, -mu[2]], [0, 0, 0, 1.0]])
    return A, float(np.sqrt(np.median(e ** 2)))


def project(A, X):
    q = np.hstack([X, np.ones((len(X), 1))]) @ A.T
    return q[:, :2] / q[:, 2:3]


EYEBALL_UV = (205, 335, 890, 1020)   # the eyeball island in the head atlas (u0, u1, v0, v1)


def eye_masks(uvfull_path):
    """visible eyeball pixels of a front UV pass rendered with the eyeballs shown -> {'L': mask, 'R': mask}"""
    u, v, ok = decode_uv(uvfull_path); m = ok & (u > EYEBALL_UV[0]) & (u < EYEBALL_UV[1]) & (v > EYEBALL_UV[2]) & (v < EYEBALL_UV[3])
    lab, n = ndimage.label(m); sizes = ndimage.sum(m, lab, range(1, n + 1)); big = np.argsort(sizes)[-2:] + 1
    cx = [ndimage.center_of_mass(lab == b)[1] for b in big]; o = np.argsort(cx)
    return {'L': ndimage.binary_fill_holes(lab == big[o[0]]), 'R': ndimage.binary_fill_holes(lab == big[o[1]])}


def eye_rim(mask, ts):
    """corners and lid points of an eye-opening mask. ts: fractions along outer->inner... here simply left->right.
    Returns (left corner, right corner, upper pts, lower pts) in px (x, y)"""
    ys, xs = np.nonzero(mask); x0, x1 = xs.min(), xs.max()
    def col(x):
        x = int(round(min(max(x, x0), x1))); c = ys[xs == x]
        k = 1
        while not len(c): c = ys[np.abs(xs - x) <= k]; k += 1
        return c.min() - 0.5, c.max() + 0.5
    cl = np.array([x0 - 0.5, np.mean(col(x0 + 1))]); cr = np.array([x1 + 0.5, np.mean(col(x1 - 1))])
    up = np.array([[x0 + t * (x1 - x0), col(x0 + t * (x1 - x0))[0]] for t in ts]); lo = np.array([[x0 + t * (x1 - x0), col(x0 + t * (x1 - x0))[1]] for t in ts])
    return cl, cr, up, lo


def umeyama(src, dst, w=None):
    """similarity (s, R, t) minimising |s R src + t - dst|, any dimension"""
    w = np.ones(len(src)) if w is None else w; w = w / w.sum()
    ms = (w[:, None] * src).sum(0); md = (w[:, None] * dst).sum(0); a = src - ms; b = dst - md
    C = (b * w[:, None]).T @ a; U, S, Vt = np.linalg.svd(C); d = np.ones(len(S)); d[-1] = np.sign(np.linalg.det(U @ Vt))
    R = U @ np.diag(d) @ Vt; s = (S * d).sum() / (w[:, None] * a * a).sum()
    return s, R, md - s * R @ ms
