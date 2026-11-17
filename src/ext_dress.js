/* ext_dress.js — TASK D: set dressing (lattice windows, banners, stains/moss, ivy, pots, cairns, fallen tiles, crates,
   dry leaves, puddles). All textures are procedural canvases; no external assets. ~11 draw calls. */
(window.JL.ext = window.JL.ext || []).push(function (ctx) {
  try {
    const T = ctx.THREE, M = ctx.M, scene = ctx.scene, CELL = ctx.CELL, at = ctx.at, R = ctx.rng(7411);
    if (!ctx.GB || !at) return;
    const uT = { value: 0 }; ctx.onUpdate(function (dt, time) { uT.value = time; });
    const rr = (a, b) => a + R() * (b - a);
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
    const tex = (c, srgb) => { const t = new T.CanvasTexture(c); if (srgb) t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t; };

    // ---------- quad builder ----------
    function QB() { this.p = []; this.n = []; this.u = []; this.s = []; this.i = []; }
    QB.prototype.v = function (x, y, z, nx, ny, nz, u, v, s) { this.p.push(x, y, z); this.n.push(nx, ny, nz); this.u.push(u, v); this.s.push(s || 0); return this.p.length / 3 - 1; };
    QB.prototype.geo = function () {
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(this.n, 3));
      g.setAttribute('uv', new T.Float32BufferAttribute(this.u, 2)); g.setAttribute('aSway', new T.Float32BufferAttribute(this.s, 1)); g.setIndex(this.i); return g;
    };
    const pt = (f, u, d) => [f.px + f.tx * u + f.nx * d, f.pz + f.tz * u + f.nz * d];
    // vertical quad strip on a wall face: uv = [u0, vBottom, u1, vTop]
    function wallQuad(qb, f, u0, u1, y0, y1, dB, dT, uv, segs, sway) {
      segs = segs || 1; let pl = -1, pr = -1;
      for (let k = 0; k <= segs; k++) {
        const a = k / segs, y = y0 + (y1 - y0) * a, d = dB + (dT - dB) * a, vv = uv[1] + (uv[3] - uv[1]) * a, s = (sway || 0) * (1 - a);
        const L = pt(f, u0, d), Rt = pt(f, u1, d);
        const l = qb.v(L[0], y, L[1], f.nx, 0, f.nz, uv[0], vv, s), r = qb.v(Rt[0], y, Rt[1], f.nx, 0, f.nz, uv[2], vv, s);
        if (k > 0) qb.i.push(pl, pr, r, pl, r, l);
        pl = l; pr = r;
      }
    }
    function abox(gb, f, u0, u1, y0, y1, d0, d1) { const a = pt(f, u0, d0), b = pt(f, u1, d1); gb.box(Math.min(a[0], b[0]), y0, Math.min(a[1], b[1]), Math.max(a[0], b[0]), y1, Math.max(a[1], b[1]), 1); }
    function swayMat(mat, amp) {
      mat.onBeforeCompile = function (sh) {
        sh.uniforms.uTime = uT;
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aSway; uniform float uTime;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed += normal * (0.5 + 0.5 * sin(uTime * 1.3 + position.x * 1.3 + position.z * 1.7 + position.y * 2.2)) * ' + amp.toFixed(3) + ' * aSway * aSway;');
      };
      return mat;
    }

    // ---------- textures ----------
    // lattice window: left half lit, right half dim
    const [cwC, gC] = mk(512, 192), [cwE, gE] = mk(512, 192);
    for (let h = 0; h < 2; h++) {
      const ox = h * 256;
      let gr = gC.createRadialGradient(ox + 128, 96, 10, ox + 128, 96, 170); gr.addColorStop(0, 'rgb(240,204,140)'); gr.addColorStop(1, 'rgb(176,128,70)');
      gC.fillStyle = gr; gC.fillRect(ox, 0, 256, 192);
      gr = gE.createRadialGradient(ox + 128, 100, 10, ox + 128, 96, 180);
      if (h === 0) { gr.addColorStop(0, 'rgb(255,186,96)'); gr.addColorStop(1, 'rgb(170,92,34)'); } else { gr.addColorStop(0, 'rgb(46,30,16)'); gr.addColorStop(1, 'rgb(18,12,8)'); }
      gE.fillStyle = gr; gE.fillRect(ox, 0, 256, 192);
      [gC, gE].forEach((g, gi) => {
        g.strokeStyle = gi ? '#000' : 'rgb(40,22,12)'; g.fillStyle = g.strokeStyle; g.lineWidth = 5;
        g.strokeRect(ox + 4, 4, 248, 184);
        for (let x = 32; x < 256; x += 32) { g.beginPath(); g.moveTo(ox + x, 0); g.lineTo(ox + x, 192); g.stroke(); }
        for (let y = 32; y < 192; y += 32) { g.beginPath(); g.moveTo(ox, y); g.lineTo(ox + 256, y); g.stroke(); }
        g.lineWidth = 3.5;
        for (let x = 32; x < 256; x += 32) for (let y = 32; y < 192; y += 32) g.strokeRect(ox + x - 9, y - 9, 18, 18);
        for (let x = 16; x < 256; x += 64) for (let y = 16; y < 192; y += 64) { g.beginPath(); g.moveTo(ox + x, y - 16); g.lineTo(ox + x + 16, y); g.lineTo(ox + x, y + 16); g.lineTo(ox + x - 16, y); g.closePath(); g.stroke(); }
      });
    }
    const winMat = new T.MeshStandardMaterial({ map: tex(cwC, true), emissiveMap: tex(cwE, true), emissive: 0xffffff, emissiveIntensity: 1.7, roughness: 0.8 });

    // banners: 3 variants side by side
    const [cb, gb2] = mk(384, 512);
    [[150, 30, 20], [30, 40, 86], [172, 118, 40]].forEach((c, k) => {
      const ox = k * 128, g = gb2;
      const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, 'rgb(' + c + ')'); gr.addColorStop(1, 'rgb(' + c.map(v => v * 0.62 | 0) + ')');
      g.fillStyle = gr; g.fillRect(ox + 4, 0, 120, 512);
      for (let i = 0; i < 700; i++) { g.fillStyle = 'rgba(' + (R() < 0.5 ? '0,0,0' : '255,240,210') + ',' + (0.03 + R() * 0.07) + ')'; if (R() < 0.5) g.fillRect(ox + 4, R() * 512, 120, 1); else g.fillRect(ox + 4 + R() * 120, 0, 1, 512); }
      for (let i = 0; i < 14; i++) { const x = ox + 10 + R() * 108, y = 150 + R() * 340, rg = g.createRadialGradient(x, y, 0, x, y, 14 + R() * 26); rg.addColorStop(0, 'rgba(20,14,8,0.28)'); rg.addColorStop(1, 'rgba(20,14,8,0)'); g.fillStyle = rg; g.fillRect(ox + 4, y - 40, 120, 80); }
      g.strokeStyle = 'rgb(214,166,72)'; g.lineWidth = 4; g.strokeRect(ox + 13, 10, 102, 470); g.lineWidth = 1.5; g.strokeRect(ox + 20, 17, 88, 456);
      // abstract seal motif: ring, square, bars
      g.lineWidth = 5; g.beginPath(); g.arc(ox + 64, 110, 30, 0, 6.283); g.stroke(); g.strokeRect(ox + 49, 95, 30, 30);
      g.fillStyle = 'rgb(214,166,72)'; for (let b = 0; b < 3; b++) { g.fillRect(ox + 38, 190 + b * 26, k === 1 && b === 1 ? 22 : 52, 9); if (k === 1 && b === 1) g.fillRect(ox + 68, 190 + b * 26, 22, 9); }
      g.beginPath(); g.arc(ox + 64, 330, 9, 0, 6.283); g.fill();
      g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(ox, 512); g.lineTo(ox + 64, 452); g.lineTo(ox + 128, 512); g.closePath(); g.fill();
      g.fillRect(ox, 0, 4, 512); g.fillRect(ox + 124, 0, 4, 512); g.globalCompositeOperation = 'source-over';
    });
    const banTex = tex(cb, true);
    const banMat = swayMat(new T.MeshStandardMaterial({ map: banTex, alphaTest: 0.5, side: T.DoubleSide, roughness: 0.85 }), 0.16);

    // stains atlas: 4 columns (0,1 dark drips; 2 moss; 3 grime), dense at the top of the canvas
    const [cs, gs] = mk(256, 256);
    {
      const im = gs.createImageData(256, 256), d = im.data;
      for (let k = 0; k < 4; k++) {
        const L = []; let l = 0.6;
        for (let x = 0; x < 64; x++) { l = Math.min(1, Math.max(0.15, l + (R() - 0.5) * 0.35)); L.push(l); }
        for (let p = 0; p < 2; p++) for (let x = 1; x < 63; x++) L[x] = (L[x - 1] + L[x] * 2 + L[x + 1]) / 4;
        const colr = k === 2 ? [46, 66, 26] : k === 3 ? [38, 30, 22] : [20, 16, 13];
        for (let y = 0; y < 256; y++) for (let x = 0; x < 64; x++) {
          const yy = y / 255, edge = Math.sin(Math.PI * (x + 0.5) / 64);
          let a = Math.pow(Math.max(0, 1 - yy / (L[x] * (k === 3 ? 0.9 : 1))), k === 3 ? 0.8 : 1.6) * Math.pow(edge, 0.7) * (0.65 + 0.35 * R());
          a *= k === 2 ? 0.9 : k === 3 ? 0.6 : 0.82;
          const q = (y * 256 + k * 64 + x) * 4, n = 0.85 + R() * 0.3;
          d[q] = colr[0] * n; d[q + 1] = colr[1] * n; d[q + 2] = colr[2] * n; d[q + 3] = a * 255;
        }
      }
      gs.putImageData(im, 0, 0);
    }
    const stainMat = new T.MeshStandardMaterial({ map: tex(cs, true), transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });

    // ivy card
    const [ci, gi] = mk(128, 256);
    for (let s = 0; s < 5; s++) {
      let x = 14 + s * 25 + rr(-6, 6), len = rr(120, 250), ph = R() * 6;
      gi.strokeStyle = 'rgb(46,40,22)'; gi.lineWidth = 1.6; gi.beginPath(); gi.moveTo(x, 0);
      const pts = []; for (let y = 0; y < len; y += 6) { const xx = x + Math.sin(y * 0.045 + ph) * 7; gi.lineTo(xx, y); pts.push([xx, y]); } gi.stroke();
      pts.forEach((p, i) => { const dens = 1 - p[1] / (len * 1.25); for (let j = 0; j < 2; j++) { if (R() > dens) continue; const sz = rr(6, 11) * (0.6 + dens * 0.5), a = R() * 6.28, lx = p[0] + rr(-9, 9), ly = p[1] + rr(-3, 6);
        gi.save(); gi.translate(lx, ly); gi.rotate(a); gi.fillStyle = 'rgb(' + (rr(34, 80) | 0) + ',' + (rr(84, 138) | 0) + ',' + (rr(24, 48) | 0) + ')';
        gi.beginPath(); gi.moveTo(0, -sz); gi.bezierCurveTo(sz, -sz * 0.7, sz * 0.9, sz * 0.5, 0, sz); gi.bezierCurveTo(-sz * 0.9, sz * 0.5, -sz, -sz * 0.7, 0, -sz); gi.fill();
        gi.strokeStyle = 'rgba(20,40,12,0.5)'; gi.lineWidth = 0.8; gi.beginPath(); gi.moveTo(0, -sz); gi.lineTo(0, sz); gi.stroke(); gi.restore(); } });
    }
    const ivyMat = swayMat(new T.MeshStandardMaterial({ map: tex(ci, true), alphaTest: 0.4, side: T.DoubleSide, roughness: 0.75 }), 0.06);

    // dry leaf
    const [cl, gl] = mk(64, 64);
    gl.fillStyle = 'rgb(236,226,206)'; gl.beginPath(); gl.moveTo(32, 3); gl.bezierCurveTo(58, 18, 54, 46, 32, 61); gl.bezierCurveTo(10, 46, 6, 18, 32, 3); gl.fill();
    gl.strokeStyle = 'rgb(150,130,100)'; gl.lineWidth = 2; gl.beginPath(); gl.moveTo(32, 5); gl.lineTo(32, 60); gl.stroke();
    for (let i = 0; i < 4; i++) { gl.lineWidth = 1; gl.beginPath(); gl.moveTo(32, 16 + i * 10); gl.lineTo(46, 10 + i * 10); gl.moveTo(32, 16 + i * 10); gl.lineTo(18, 10 + i * 10); gl.stroke(); }
    const leafMat = new T.MeshStandardMaterial({ map: tex(cl, true), alphaTest: 0.5, side: T.DoubleSide, roughness: 0.9 });

    // puddle alpha
    const [cp, gp] = mk(128, 128); gp.fillStyle = '#000'; gp.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 9; i++) { const x = 64 + rr(-26, 26), y = 64 + rr(-26, 26), r0 = rr(16, 32), g = gp.createRadialGradient(x, y, r0 * 0.55, x, y, r0); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); gp.fillStyle = g; gp.fillRect(0, 0, 128, 128); }
    const pudMat = new T.MeshStandardMaterial({ color: 0x0b0d0d, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.8, alphaMap: tex(cp, false), depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, envMapIntensity: 1.4 });

    // ---------- placement helpers ----------
    const AVOID = [[32.3, 69.5, 1.3], [35.7, 69.5, 1.3], [34, 70, 3], [23.2, 23.2], [44.8, 23.2], [23.2, 44.8], [44.8, 44.8], [31.5, 45], [36.5, 45], [23, 34], [45, 34],
      [31, 20.9], [37, 20.9], [25.2, 5.2], [42.8, 5.2], [25.2, 14.8], [42.8, 14.8], [12.8, 31], [44.6, 63.2], [4.9, 71.1], [63.1, 71.1], [21.3, 21.3], [46.7, 46.7], [46.4, 21.6, 1.8], [21.6, 46.4, 1.8],
      [26.6, 5.6], [41.6, 5.4], [29.3, 21.3, 1.6], [38.7, 21.3, 1.6], [29.6, 12.2, 1.6], [38.4, 12.2, 1.6], [41.6, 62, 2.4], [13.9, 21.2], [42, 54, 1.6], [14, 30, 1.7], [31.2, 15.2], [36.8, 15.2], [26.2, 9.5], [41.8, 9.5], [34, 48, 2.6], [34, 18, 3.2]];
    const clear = (x, z, pad) => { for (const a of AVOID) { if (Math.hypot(x - a[0], z - a[1]) < (a[2] || 1.3) + (pad || 0)) return false; } return true; };
    const noClutterCell = (c, r) => (c === 1 && r >= 6 && r <= 8) || (c === 14 && r === 9) || (c === 15 && r === 8) || (c >= 13 && c <= 15 && r >= 5 && r <= 6) || (c === 8 && r >= 12 && r <= 16) || (c === 8 && r === 4);
    const faces = [];
    for (let r = 0; r < ctx.ROWS; r++) for (let c = 0; c < ctx.COLS; c++) {
      if (at(c, r) !== '#') continue;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(d => {
        const fc = c + d[0], fr = r + d[1]; if (fc < 0 || fr < 0 || fc >= ctx.COLS || fr >= ctx.ROWS || at(fc, fr) !== '.') return;
        faces.push({ px: (c + 0.5) * CELL + d[0] * CELL / 2, pz: (r + 0.5) * CELL + d[1] * CELL / 2, nx: d[0], nz: d[1], tx: d[1], tz: -d[0], fc, fr });
      });
    }

    const gbWood = new ctx.GB(), qWin = new QB(), qBan = new QB(), qStain = new QB(), qIvy = new QB(), qPud = new QB();
    const pots = [], stones = [], tiles = [], leaves = [];
    const m4 = new T.Matrix4(), q1 = new T.Quaternion(), q2 = new T.Quaternion(), e = new T.Euler(), v3 = new T.Vector3(), sc = new T.Vector3();
    const X = new T.Vector3(1, 0, 0), Y = new T.Vector3(0, 1, 0);
    const potCols = [[0.46, 0.21, 0.12], [0.38, 0.17, 0.10], [0.50, 0.30, 0.18], [0.10, 0.12, 0.11], [0.30, 0.26, 0.20]];

    faces.forEach((f, fi) => {
      const gate = f.fc === 8 && f.fr === 4, torii = f.fc === 8 && f.fr >= 12 && f.fr <= 16;
      if (gate) return;
      let winU = null, banU = null;
      const roll = R();
      if (!torii && roll < 0.27) {
        // lattice window
        winU = 0; const dim = R() < 0.3, u0 = dim ? 0.5 : 0, y0 = 2.15, y1 = 3.35;
        wallQuad(qWin, f, -0.8, 0.8, y0, y1, 0.035, 0.035, [u0, 0, u0 + 0.5, 1]);
        abox(gbWood, f, -0.93, 0.93, y1, y1 + 0.13, 0, 0.1); abox(gbWood, f, -1.0, 1.0, y0 - 0.12, y0, 0, 0.15);
        abox(gbWood, f, -0.93, -0.8, y0, y1, 0, 0.1); abox(gbWood, f, 0.8, 0.93, y0, y1, 0, 0.1);
      } else if (!torii && roll < 0.45) {
        // hanging banner
        banU = rr(-0.9, 0.9); const k = (R() * 3) | 0, len = rr(2.1, 2.8), top = 4.26;
        wallQuad(qBan, f, banU - 0.36, banU + 0.36, top - len, top, 0.14, 0.14, [k / 3 + 0.004, 0, (k + 1) / 3 - 0.004, 1], 8, 1);
        abox(gbWood, f, banU - 0.5, banU + 0.5, top - 0.02, top + 0.05, 0.02, 0.2);
      }
      // stains / moss
      const ns = R() < 0.75 ? 1 + (R() < 0.4 ? 1 : 0) : 0;
      for (let i = 0; i < ns; i++) {
        const w = rr(0.5, 1.5); let u = rr(-1.7 + w / 2, 1.7 - w / 2);
        if (winU !== null && Math.abs(u) < 0.95 + w / 2) u = (u < 0 ? -1 : 1) * (1.0 + w / 2); if (Math.abs(u) + w / 2 > 1.84) continue;
        if (banU !== null && Math.abs(u - banU) < 0.4 + w / 2) continue;
        const k = R() < 0.55 ? (R() < 0.5 ? 0 : 1) : 3, len = rr(0.9, 2.7), fl = R() < 0.5;
        wallQuad(qStain, f, u - w / 2, u + w / 2, 4.45 - len, 4.45, 0.012, 0.012, [fl ? (k + 1) / 4 - 0.01 : k / 4 + 0.01, 0, fl ? k / 4 + 0.01 : (k + 1) / 4 - 0.01, 1]);
      }
      if (R() < 0.5) { const w = rr(0.8, 2.2), u = rr(-1.8 + w / 2, 1.8 - w / 2), h = rr(0.35, 1.0); wallQuad(qStain, f, u - w / 2, u + w / 2, 1.15, 1.15 + h, 0.014, 0.014, [0.51, 1, 0.74, 0]); }
      if (R() < 0.45) { const w = rr(0.8, 2.4), u = rr(-1.8 + w / 2, 1.8 - w / 2), h = rr(0.4, 0.95); wallQuad(qStain, f, u - w / 2, u + w / 2, 0, h, 0.105, 0.105, [0.51, 1, 0.74, 0]); }
      // ivy
      if (R() < 0.24) {
        const w = rr(0.9, 1.4); let u = rr(-1.75 + w / 2, 1.75 - w / 2), ok = true;
        if (winU !== null && Math.abs(u) < 0.95 + w / 2) u = (u < 0 ? -1 : 1) * (0.98 + w / 2); if (Math.abs(u) + w / 2 > 1.86) ok = false;
        if (banU !== null && Math.abs(u - banU) < 0.45 + w / 2) ok = false;
        if (ok) { const len = rr(1.2, 2.6), fl = R() < 0.5; wallQuad(qIvy, f, u - w / 2, u + w / 2, 4.62 - len, 4.62, 0.11, 0.03, [fl ? 1 : 0, 0, fl ? 0 : 1, 1], 4, 1); }
      }
      // ground clutter
      if (!noClutterCell(f.fc, f.fr) && R() < 0.44) {
        const u = rr(-1.4, 1.4), t = R(), c0 = pt(f, u, 0.5);
        if (!clear(c0[0], c0[1], 0.3)) return;
        if (t < 0.34) { // pots
          const n = 1 + ((R() * 3) | 0); let uu = u - 0.3;
          for (let i = 0; i < n; i++) {
            const s = rr(0.38, 0.8), rad = 0.42 * s, top = R() < 0.22, cI = potCols[(R() * potCols.length) | 0];
            if (top) { const p = pt(f, uu, 0.12 + rad + rr(0.25, 0.55)); q1.setFromAxisAngle(Y, R() * 6.28); q2.setFromAxisAngle(X, Math.PI / 2); q1.multiply(q2); m4.compose(v3.set(p[0], rad * 0.98, p[1]), q1, sc.set(s, s, s)); }
            else { const p = pt(f, uu, 0.12 + rad + rr(0, 0.12)); q1.setFromAxisAngle(Y, R() * 6.28); m4.compose(v3.set(p[0], 0, p[1]), q1, sc.set(s, s * rr(0.9, 1.25), s));
              if (s > 0.5) ctx.col(p[0] - rad, 0, p[1] - rad, p[0] + rad, s, p[1] + rad); }
            pots.push({ m: m4.clone(), c: cI }); uu += rad + rr(0.3, 0.5);
          }
        } else if (t < 0.56) { // cairn + loose stones
          const p = pt(f, u, rr(0.4, 0.6)); let y = 0, s = rr(0.42, 0.56); const n = 3 + ((R() * 3) | 0);
          for (let i = 0; i < n; i++) { const h = s * 0.5; q1.setFromEuler(e.set(rr(-0.12, 0.12), R() * 6.28, rr(-0.12, 0.12))); m4.compose(v3.set(p[0] + rr(-0.04, 0.04), y + h * 0.5, p[1] + rr(-0.04, 0.04)), q1, sc.set(s * rr(0.9, 1.15), h, s * rr(0.85, 1.1))); stones.push(m4.clone()); y += h * 0.86; s *= rr(0.68, 0.82); }
          if (y > 0.5) ctx.col(p[0] - 0.24, 0, p[1] - 0.24, p[0] + 0.24, y, p[1] + 0.24);
          for (let i = 0; i < 3; i++) { const p2 = pt(f, u + rr(-0.9, 0.9), rr(0.2, 0.9)), s2 = rr(0.1, 0.22); q1.setFromEuler(e.set(R() * 3, R() * 6, R() * 3)); m4.compose(v3.set(p2[0], s2 * 0.3, p2[1]), q1, sc.set(s2, s2 * 0.7, s2 * rr(0.8, 1.3))); stones.push(m4.clone()); }
        } else if (t < 0.8) { // fallen roof tiles
          const n = 3 + ((R() * 5) | 0);
          for (let i = 0; i < n; i++) { const p = pt(f, u + rr(-0.7, 0.7), rr(0.18, 0.95)), up = R() < 0.25; q1.setFromEuler(e.set(up ? Math.PI : rr(-0.08, 0.08), R() * 6.28, rr(-0.1, 0.1))); m4.compose(v3.set(p[0], up ? 0.11 : 0.0, p[1]), q1, sc.set(1, 1, rr(0.6, 1))); tiles.push(m4.clone()); }
        } else { // crates
          const s = rr(0.55, 0.8), p = pt(f, u, 0.11 + s / 2);
          gbWood.box(p[0] - s / 2, 0, p[1] - s / 2, p[0] + s / 2, s, p[1] + s / 2, 1);
          let h = s;
          if (R() < 0.45) { const s2 = s * rr(0.6, 0.8), o = rr(-0.05, 0.05); gbWood.box(p[0] - s2 / 2 + o, s, p[1] - s2 / 2 + o, p[0] + s2 / 2 + o, s + s2, p[1] + s2 / 2 + o, 1); h += s2; }
          ctx.col(p[0] - s / 2, 0, p[1] - s / 2, p[0] + s / 2, h, p[1] + s / 2);
          if (R() < 0.6) { const p3 = pt(f, u + (R() < 0.5 ? -1 : 1) * (s / 2 + 0.3), 0.36), s3 = rr(0.4, 0.6), cI = potCols[(R() * 3) | 0]; q1.setFromAxisAngle(Y, R() * 6); m4.compose(v3.set(p3[0], 0, p3[1]), q1, sc.set(s3, s3, s3)); pots.push({ m: m4.clone(), c: cI }); }
        }
      }
      // dry leaves along the wall foot
      const nl = 3 + ((R() * 6) | 0);
      for (let i = 0; i < nl; i++) { const p = pt(f, rr(-2, 2), 0.12 + R() * R() * 1.3); leaves.push(p); }
    });

    // leaves + puddles across open floor
    for (let r = 0; r < ctx.ROWS; r++) for (let c = 0; c < ctx.COLS; c++) {
      if (at(c, r) !== '.') continue;
      const n = 2 + ((R() * 4) | 0); for (let i = 0; i < n; i++) leaves.push([c * CELL + R() * CELL, r * CELL + R() * CELL]);
      if ((c === 14 && r === 9) || (c === 15 && r === 8) || (c === 8 && r === 4)) continue;
      if (R() < 0.3) {
        const s = rr(0.9, 2.3), x = c * CELL + rr(s / 2 + 0.1, CELL - s / 2 - 0.1), z = r * CELL + rr(s / 2 + 0.1, CELL - s / 2 - 0.1), a = R() * 6.28, ca = Math.cos(a) * s / 2, sa = Math.sin(a) * s / 2, sz = rr(0.6, 1);
        const P = (ux, uz) => [x + ux * ca - uz * sa * sz, z + ux * sa + uz * ca * sz];
        const A = P(-1, 1), B = P(1, 1), C = P(1, -1), D = P(-1, -1), y = 0.007;
        const i0 = qPud.v(A[0], y, A[1], 0, 1, 0, 0, 0), i1 = qPud.v(B[0], y, B[1], 0, 1, 0, 1, 0), i2 = qPud.v(C[0], y, C[1], 0, 1, 0, 1, 1), i3 = qPud.v(D[0], y, D[1], 0, 1, 0, 0, 1);
        // keep the winding facing up whatever the rotation
        const ax = B[0] - A[0], az = B[1] - A[1], bx = D[0] - A[0], bz = D[1] - A[1];
        if (az * bx - ax * bz > 0) qPud.i.push(i0, i1, i2, i0, i2, i3); else qPud.i.push(i0, i2, i1, i0, i3, i2);
      }
    }

    // ---------- build meshes ----------
    const add = (geo, mat, cast, recv) => { const m = new T.Mesh(geo, mat); m.castShadow = !!cast; m.receiveShadow = recv !== false; m.frustumCulled = false; scene.add(m); return m; };
    if (gbWood.p.length) { const dark = M.wood.clone(); dark.color.multiplyScalar(0.55); gbWood.mesh(dark); }
    if (qWin.p.length) add(qWin.geo(), winMat, false, false);
    if (qBan.p.length) { const m = add(qBan.geo(), banMat, true, true); m.customDepthMaterial = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: banTex, alphaTest: 0.5 }); }
    if (qStain.p.length) { const m = add(qStain.geo(), stainMat, false, true); m.renderOrder = 2; }
    if (qIvy.p.length) add(qIvy.geo(), ivyMat, false, true);
    if (qPud.p.length) { const m = add(qPud.geo(), pudMat, false, true); m.renderOrder = 1; }

    const inst = (geo, mat, list, getM, getC) => {
      if (!list.length) return null; const im = new T.InstancedMesh(geo, mat, list.length), col = new T.Color();
      list.forEach((it, i) => { im.setMatrixAt(i, getM(it)); if (getC) { getC(it, col); im.setColorAt(i, col); } });
      im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; scene.add(im); return im;
    };
    // pots
    const prof = [[0.0, 0], [0.2, 0], [0.24, 0.02], [0.36, 0.2], [0.42, 0.42], [0.39, 0.62], [0.28, 0.8], [0.2, 0.88], [0.19, 0.93], [0.26, 1.0], [0.22, 0.99], [0.15, 0.9]].map(p => new T.Vector2(p[0], p[1]));
    inst(new T.LatheGeometry(prof, 16), new T.MeshStandardMaterial({ roughness: 0.72, side: T.DoubleSide }), pots, p => p.m, (p, c) => { const k = 0.8 + R() * 0.4; c.setRGB(p.c[0] * k, p.c[1] * k, p.c[2] * k); });
    // stones
    const sg = new T.IcosahedronGeometry(0.5, 1), sp = sg.attributes.position;
    for (let i = 0; i < sp.count; i++) { v3.fromBufferAttribute(sp, i); const h = Math.sin(v3.x * 12.9 + v3.y * 78.2 + v3.z * 37.7) * 43758.5; const k = 0.86 + (h - Math.floor(h)) * 0.24; sp.setXYZ(i, v3.x * k, v3.y * k, v3.z * k); }
    sg.computeVertexNormals();
    inst(sg, M.stone, stones, m => m);
    // tiles
    const tg = new T.CylinderGeometry(0.11, 0.125, 0.32, 8, 1, true, Math.PI / 2, Math.PI); tg.rotateX(Math.PI / 2);
    const tm = M.roofTile.clone(); tm.side = T.DoubleSide;
    inst(tg, tm, tiles, m => m);
    // leaves
    const lg = new T.PlaneGeometry(1, 1); lg.rotateX(-Math.PI / 2);
    const li = inst(lg, leafMat, leaves, p => { const s = rr(0.09, 0.16); q1.setFromEuler(e.set(rr(-0.25, 0.25), R() * 6.28, rr(-0.25, 0.25))); return m4.compose(v3.set(p[0], 0.02 + R() * 0.012, p[1]), q1, sc.set(s * rr(0.6, 0.9), 1, s)); },
      (p, c) => { c.setHSL(rr(0.05, 0.13), rr(0.45, 0.75), rr(0.18, 0.42)); });
    if (li) li.castShadow = false;
  } catch (err) { console.warn('ext_dress', err); }
});
