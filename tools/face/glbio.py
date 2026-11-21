"""Minimal GLB reader/writer for the sisters' head meshes (tools/face). No dependencies beyond numpy."""
import json, struct, numpy as np
CT = {5126: ('f', 4), 5123: ('H', 2), 5125: ('I', 4), 5121: ('B', 1)}; NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


class GLB:
    def __init__(self, path):
        b = open(path, 'rb').read(); jl = struct.unpack('<I', b[12:16])[0]
        self.j = json.loads(b[20:20 + jl]); self.bin = bytearray(b[20 + jl + 8:])

    def _loc(self, i):
        a = self.j['accessors'][i]; bv = self.j['bufferViews'][a['bufferView']]; t, s = CT[a['componentType']]; n = NC[a['type']]
        assert bv.get('byteStride', s * n) == s * n, 'interleaved buffers not supported'
        return a, t, n, bv.get('byteOffset', 0) + a.get('byteOffset', 0)

    def acc(self, i):
        a, t, n, off = self._loc(i)
        return np.frombuffer(bytes(self.bin), dtype='<' + t, count=a['count'] * n, offset=off).reshape(a['count'], n).copy()

    def put(self, i, arr):
        a, t, n, off = self._loc(i); arr = np.asarray(arr, dtype='<' + t).reshape(a['count'], n)
        self.bin[off:off + arr.nbytes] = arr.tobytes()
        if 'min' in a: a['min'] = arr.min(0).astype(float).tolist(); a['max'] = arr.max(0).astype(float).tolist()

    def head_prim(self):
        for m in self.j['meshes']:
            for p in m['primitives']:
                if 'head' in self.j['materials'][p['material']]['name'].lower(): return p
        raise SystemExit('no head primitive')

    def save(self, path):
        js = json.dumps(self.j, separators=(',', ':')).encode(); js += b' ' * (-len(js) % 4)
        bn = bytes(self.bin) + b'\0' * (-len(self.bin) % 4)
        open(path, 'wb').write(struct.pack('<III', 0x46546C67, 2, 28 + len(js) + len(bn)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(bn), 0x004E4942) + bn)


def weld(P, tol=1e-5):
    """representative vertex index per vertex, merging identical positions (UV seams split vertices)"""
    key = {}; rep = np.empty(len(P), int)
    for k, x in enumerate(P): rep[k] = key.setdefault(tuple(np.round(x / tol).astype(np.int64)), k)
    return rep


def components(P, I):
    rep = weld(P); par = np.arange(len(P))
    def f(a):
        while par[a] != a: par[a] = par[par[a]]; a = par[a]
        return a
    for t in I:
        ra = f(rep[t[0]]); par[f(rep[t[1]])] = ra; par[f(rep[t[2]])] = ra
    return np.array([f(rep[k]) for k in range(len(P))])


def boundary_loops(P, I, mask=None):
    """boundary edge loops (lists of welded vertex ids) of the triangles whose vertices are all in mask"""
    rep = weld(P); cnt = {}
    for t in I:
        if mask is not None and not mask[t].all(): continue
        r = rep[t]
        for a, b in ((r[0], r[1]), (r[1], r[2]), (r[2], r[0])):
            if a != b: cnt[(min(a, b), max(a, b))] = cnt.get((min(a, b), max(a, b)), 0) + 1
    adj = {}
    for (a, b), c in cnt.items():
        if c == 1: adj.setdefault(a, []).append(b); adj.setdefault(b, []).append(a)
    seen = set(); loops = []
    for s in adj:
        if s in seen: continue
        st = [s]; loop = []
        while st:
            v = st.pop()
            if v in seen: continue
            seen.add(v); loop.append(v); st += adj[v]
        loops.append(loop)
    return loops


def vertex_normals(P, I):
    """area-weighted normals, shared across welded positions so UV seams stay smooth"""
    rep = weld(P); fn = np.cross(P[I[:, 1]] - P[I[:, 0]], P[I[:, 2]] - P[I[:, 0]])
    N = np.zeros_like(P, dtype=np.float64)
    for k in range(3): np.add.at(N, rep[I[:, k]], fn)
    N = N[rep]; l = np.linalg.norm(N, axis=1, keepdims=True)
    return N / np.maximum(l, 1e-12)
