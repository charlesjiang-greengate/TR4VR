// Frame-by-frame capture of heroine sequences (review tool, does not touch src/).
// usage: VARIANT=elder|younger SEQ=runjump[,standjump,...] [OUT=dir] [W=400 H=540] node frames.js
// Faithful stepping: the real game frame() is advanced at exactly 1/60 s (virtual performance.now), inputs are real
// key events, so player physics AND heroine.update see the same dt as in play. Rendering is stubbed for frames that are
// not captured. Captured frames are rendered from review cameras (several views of the very same simulated frame).
const { chromium } = require('playwright'); const fs = require('fs');
const SP = '/tmp/claude-0/-home-user-TR4VR/a99e0ae1-0cf8-51f9-84a5-45b135fc126b/scratchpad/';
const three = SP + 'node_modules/three/';
const HTML = process.env.HTML || SP + 'anim/out.html', OUT = process.env.OUT || SP + 'anim/r1';
const VARIANT = process.env.VARIANT || 'elder';
const W = +(process.env.W || 400), H = +(process.env.H || 540);
fs.mkdirSync(OUT, { recursive: true });

const rng = (a, b, s) => { const o = []; for (let i = a; i <= b; i += (s || 1)) o.push(i); return o; };
const JSIDE = { name: 'side', mode: 'follow', pos: [0.25, 1.25, 4.6], look: [0.25, 1.2, 0], fov: 40 };       // camera south of her, she runs to the right
const JFRONT = { name: 'front', mode: 'follow', pos: [4.6, 1.3, 0.0], look: [0, 1.2, 0], fov: 40 };          // camera ahead (east), she runs at it
const J34 = { name: 'q34', mode: 'follow', pos: [3.2, 1.5, 3.3], look: [0, 1.2, 0], fov: 40 };               // front-right three-quarter
const JUMPSETS = { coarse: rng(-1, 43, 4), land: rng(41, 63, 2), takeoff: rng(-2, 9), landfine: rng(36, 47) };
const CSIDE = { name: 'side', mode: 'fixed', pos: [58.3, 1.75, 29.25], look: [62.5, 1.5, 28.2], fov: 42 };    // from the west, slightly south: ledge profile on the left
const CBACK = { name: 'back', mode: 'fixed', pos: [62.5 + 0.9, 2.0, 31.9], look: [62.5, 1.55, 28.0], fov: 44 };
const CTOP = { name: 'top', mode: 'fixed', pos: [60.35, 3.3, 26.0], look: [62.4, 1.85, 28.15], fov: 50 };     // from the ledge side, above: hands on the edge
const CLIMBSETS = { coarse: rng(-1, 43, 4), end: rng(41, 63, 2), start: rng(-6, 5) };
const SEQS = {
  runjump: { tp: [30, 0, 22], yaw: 1.5708, camYaw: 1.5708, n: 130, anchor: 'jump', views: [JSIDE, JFRONT], sets: JUMPSETS,
    events: [{ f: 0, key: 'KeyW', down: true }, { f: 30, key: 'Space', down: true }, { f: 85, key: 'Space', down: false }] },
  runjump2: { tp: [30, 0, 22], yaw: 1.5708, camYaw: 1.5708, n: 140, anchor: 'jump', views: [JSIDE, J34], sets: { coarse: JUMPSETS.coarse, land: JUMPSETS.land },
    events: [{ f: 0, key: 'KeyW', down: true }, { f: 41, key: 'Space', down: true }, { f: 96, key: 'Space', down: false }] },
  standjump: { tp: [30, 0, 22], yaw: 1.5708, camYaw: 1.5708, n: 110, anchor: 'jump', views: [J34, JSIDE], sets: JUMPSETS,
    events: [{ f: 20, key: 'Space', down: true }, { f: 75, key: 'Space', down: false }] },
  hop: { tp: [30, 0, 22], yaw: 1.5708, camYaw: 1.5708, n: 110, anchor: 'jump', views: [JSIDE], sets: { coarse: rng(-1, 32, 3) },
    events: [{ f: 0, key: 'KeyW', down: true }, { f: 30, key: 'Space', down: true }, { f: 33, key: 'Space', down: false }] },
  climbair: { tp: [62.5, 0, 30.6], yaw: Math.PI, camYaw: Math.PI, n: 150, anchor: 'climb', views: [CSIDE, CBACK, CTOP], sets: CLIMBSETS,
    events: [{ f: 0, key: 'KeyW', down: true }, { when: 'pl.pos.z<29.25', key: 'Space', down: true }, { when: 'pl.state==="climb"', key: 'Space', down: false }, { when: 'pl.state==="climb"', key: 'KeyW', down: false }] },
  climbstand: { tp: [62.5, 0, 28.9], yaw: Math.PI, camYaw: Math.PI, n: 150, anchor: 'climb', views: [CSIDE, CBACK, CTOP], sets: CLIMBSETS,
    events: [{ f: 0, key: 'KeyW', down: true }, { f: 50, key: 'Space', down: true }, { when: 'pl.state==="climb"', key: 'Space', down: false }, { when: 'pl.state==="climb"', key: 'KeyW', down: false }] },
  // climb and keep running forward afterwards (how players actually do it)
  climbrun: { tp: [62.5, 0, 30.6], yaw: Math.PI, camYaw: Math.PI, n: 150, anchor: 'climb', views: [CSIDE], sets: { end: rng(41, 63, 2) },
    events: [{ f: 0, key: 'KeyW', down: true }, { when: 'pl.pos.z<29.25', key: 'Space', down: true }, { when: 'pl.state==="climb"', key: 'Space', down: false }] }
};

function install() {
  const d = JL.debug, pl = d.pl, Hh = JL.ctx.heroine, cam = JL.ctx.camera, post = d.post, canvas = d.renderer.domElement, T = JL.ctx.THREE;
  let virt = performance.now(); performance.now = () => virt;
  const realRender = post.render.bind(post);
  canvas.toDataURL = function () { return ''; };   // snap() calls it every frame; real captures use the prototype method
  const F = window.__F = { capture: false, views: [], out: [], log: [], y0: 0, f: 0, seq: null, fired: {}, prevQ: null };
  const BN = ['Pelvis', 'Spine1', 'Head', 'L_Thigh', 'L_Calf', 'L_Foot', 'L_Toe0', 'R_Thigh', 'R_Calf', 'R_Foot', 'R_Toe0', 'L_UpperArm', 'L_Forearm', 'L_Hand', 'L_Finger2', 'R_UpperArm', 'R_Forearm', 'R_Hand', 'R_Finger2'];
  function bones() {
    const pivot = Hh.group.children[0]; if (!pivot) return null;
    for (const c of pivot.children) if (c.visible) { if (!c.userData.__b) { const m = {}; c.traverse(o => { if (o.isBone) m[o.name.replace(/^Bip0\d_?/, '')] = o; }); c.userData.__b = m; } return c.userData.__b; }
    return null;
  }
  const v = new T.Vector3(), q = new T.Quaternion(), qg = new T.Quaternion();
  F.metrics = function () {
    const B = bones(); const e = { f: F.f, st: pl.state, vy: +pl.vel.y.toFixed(2), y: +pl.pos.y.toFixed(3), x: +pl.pos.x.toFixed(3), z: +pl.pos.z.toFixed(3), ct: +pl.climbT.toFixed(3), g: pl.grounded, sp: +Math.hypot(pl.vel.x, pl.vel.z).toFixed(2), yaw: +pl.yaw.toFixed(3) };
    if (B && B.Pelvis) {
      Hh.group.updateMatrixWorld(true); Hh.group.getWorldQuaternion(qg); qg.invert();
      e.p = {}; e.w = {}; e.dq = {}; const cur = {};
      for (const n of BN) { const b = B[n]; if (!b) continue;
        v.setFromMatrixPosition(b.matrixWorld); e.w[n] = [+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)];
        Hh.group.worldToLocal(v); e.p[n] = [+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)];
        b.getWorldQuaternion(q); q.premultiply(qg); cur[n] = q.clone();
        if (F.prevQ && F.prevQ[n]) e.dq[n] = +(2 * Math.acos(Math.min(1, Math.abs(q.dot(F.prevQ[n])))) * 180 / Math.PI).toFixed(1);
      }
      F.prevQ = cur;
      const A = Hh._anim; if (A) e.a = { ovL: +A.ovL.toFixed(2), ovA: +A.ovA.toFixed(2), lead: A.lead, runK: +A.runK.toFixed(2), landT: +A.landT.toFixed(2), plant: [+A.plant[0].toFixed(2), +A.plant[1].toFixed(2)], dip: +(A.dipNow || 0).toFixed(3) };
    }
    F.log.push(e);
  };
  F.place = function (vw) {
    const ox = vw.mode === 'follow' ? pl.pos.x : 0, oy = vw.mode === 'follow' ? F.y0 : 0, oz = vw.mode === 'follow' ? pl.pos.z : 0;
    if (cam.fov !== vw.fov) { cam.fov = vw.fov; cam.updateProjectionMatrix(); }
    cam.position.set(ox + vw.pos[0], oy + vw.pos[1], oz + vw.pos[2]); cam.lookAt(ox + vw.look[0], oy + vw.look[1], oz + vw.look[2]); cam.updateMatrixWorld(true);
  };
  post.render = function (scene, camera, time) {
    F.metrics();
    if (!F.capture) return;
    F.out = [];
    for (const vw of F.views) { F.place(vw); realRender(scene, cam, time); F.out.push(HTMLCanvasElement.prototype.toDataURL.call(canvas, 'image/jpeg', 0.93)); }
  };
  F.key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code: code, bubbles: true }));
  F.step = function (render) { virt += 1000 / 60; F.capture = !!render; d.snap(1); F.capture = false; return render ? F.out : null; };
  F.begin = function (seq) {
    F.seq = seq; F.views = seq.views; F.fired = {};
    ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].forEach(k => F.key(k, false));
    d.tp(seq.tp[0], seq.tp[1], seq.tp[2]); pl.yaw = seq.yaw; d.cam = [seq.camYaw, 0.1]; F.y0 = seq.tp[1];
    for (let i = 0; i < 45; i++) F.step(false);
    F.log = []; F.f = 0; return pl.state;
  };
  F.tick = function (render) {
    const seq = F.seq;
    seq.events.forEach((e, i) => { if (F.fired[i]) return; const go = e.f !== undefined ? F.f >= e.f : !!eval(e.when); if (go) { F.fired[i] = 1; F.key(e.key, e.down); } });
    const out = F.step(render); F.f++; return out;
  };
  F.ticks = function (n) { for (let i = 0; i < n; i++) F.tick(false); return F.f; };
  F.dry = function (seq) { F.begin(seq); F.ticks(seq.n); return F.log.map(e => [e.st, e.vy, e.y, e.ct]); };
  return true;
}

(async () => {
  const names = (process.env.SEQ || 'runjump').split(',');
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: W, height: H } });
  await p.addInitScript(() => { window.JL_FIXED_SCALE = 1; window.JL_MANUAL = 1; window.JL_LOWQ = 1; });
  const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0">' + fs.readFileSync(HTML, 'utf8') + '</body></html>';
  await p.route('**/*', async route => { const u = route.request().url();
    if (u.startsWith('http://local/assets/')) { try { return route.fulfill({ body: fs.readFileSync('/home/user/TR4VR/' + decodeURIComponent(u.slice(13)).split('?')[0].replace(/\.wasm$/, '')) }); } catch (e) { return route.fulfill({ status: 404, body: '' }); } }
    if (u.startsWith('http://local/')) return route.fulfill({ contentType: 'text/html', body: html });
    const m = u.match(/three@0\.147\.0\/(.*)$/); if (m) return route.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(three + m[1]) });
    return route.abort(); });
  const errs = []; p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/ERR_FAILED/.test(m.text())) errs.push(m.type() + ': ' + m.text().slice(0, 300)); }); p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.goto('http://local/', { timeout: 120000 });
  await p.waitForFunction(() => window.JL && JL.debug && JL.debug.snap, null, { timeout: 120000 });
  await p.waitForTimeout(3000);
  await p.evaluate(() => document.getElementById('start').click());
  await p.evaluate(() => { JL.debug.snap(1); });
  if (VARIANT !== 'elder') await p.evaluate(v => JL.ctx.heroine.setVariant(v), VARIANT);
  await p.waitForTimeout(VARIANT !== 'elder' ? 8000 : 2500);
  console.log('heroine:', await p.evaluate(() => JL.ctx.heroine._dbg ? JL.ctx.heroine._dbg() : 'no _dbg'), 'mode', await p.evaluate(() => JL.debug.mode));
  await p.evaluate(install);
  if (process.env.DEBUG) {
    const r = await p.evaluate(() => { const o = {}; const rn = Date.now.bind(Date); __F.begin({ tp: [30, 0, 22], yaw: 1.57, camYaw: 1.57, views: [{ name: 'side', mode: 'follow', pos: [0.25, 1.25, 4.6], look: [0.25, 1.2, 0], fov: 40 }], events: [] });
      let t = rn(); for (let i = 0; i < 20; i++) __F.step(false); o.step20 = rn() - t; t = rn(); const u = __F.step(true); o.render1 = rn() - t; o.len = u[0].length; t = rn(); __F.step(true); o.render2 = rn() - t; return o; });
    console.log('timing', JSON.stringify(r));
  }
  for (const name of names) {
    const seq = SEQS[name]; if (!seq) { console.log('unknown seq', name); continue; }
    const t0 = Date.now();
    const dry = await p.evaluate(s => __F.dry(s), seq); if (process.env.VERBOSE) console.log('  dry done', ((Date.now() - t0) / 1000).toFixed(1) + 's');
    const isA = st => seq.anchor === 'jump' ? st === 'jump' : st === 'climb';
    const A = dry.findIndex(e => isA(e[0]));
    if (A < 0) { console.log(name, 'anchor state never reached', JSON.stringify(dry.filter((e, i) => i % 10 === 0))); continue; }
    let endA = dry.findIndex((e, i) => i > A && e[0] !== 'jump' && e[0] !== 'fall' && e[0] !== 'climb');
    console.log(name, 'anchor frame', A, 'air/climb ends at +' + (endA - A), 'states', dry.map(e => e[0][0]).join(''));
    const want = new Set(); Object.values(seq.sets).forEach(s => s.forEach(o => { if (A + o >= 0 && A + o < seq.n) want.add(A + o); }));
    await p.evaluate(s => __F.begin(s), seq);
    let f = 0, nshot = 0;
    const list = [...want].sort((x, y) => x - y);
    for (const cf of list) {
      if (cf > f) { await p.evaluate(n => __F.ticks(n), cf - f); f = cf; }
      const out = await p.evaluate(() => __F.tick(true)); f++;
      out.forEach((u, i) => fs.writeFileSync(`${OUT}/${VARIANT}_${name}_${seq.views[i].name}_${String(cf - A).padStart(3, '0').replace('0-', '-0')}.jpg`, Buffer.from(u.split(',')[1], 'base64')));
      nshot += out.length; if (process.env.VERBOSE) console.log('  shot', cf - A, ((Date.now() - t0) / 1000).toFixed(1) + 's');
    }
    if (f < seq.n) await p.evaluate(n => __F.ticks(n), seq.n - f);
    const log = await p.evaluate(() => __F.log);
    fs.writeFileSync(`${OUT}/${VARIANT}_${name}.json`, JSON.stringify({ name, variant: VARIANT, anchor: A, sets: seq.sets, views: seq.views.map(v => v.name), log }));
    console.log(name, 'done', nshot, 'renders', ((Date.now() - t0) / 1000).toFixed(1) + 's');
  }
  console.log(errs.slice(0, 15).join('\n') || 'no errors');
  await b.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
