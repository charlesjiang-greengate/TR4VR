window.JL = {};
(function (JL) {
  'use strict';
  const T = THREE;

  JL.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };

  // ---------- tileable value noise ----------
  function makeNoise(seed) {
    const r = JL.rng(seed), p = new Uint8Array(512), v = new Float32Array(256);
    for (let i = 0; i < 256; i++) { p[i] = i; v[i] = r(); }
    for (let i = 255; i > 0; i--) { const j = (r() * (i + 1)) | 0; const t = p[i]; p[i] = p[j]; p[j] = t; }
    for (let i = 0; i < 256; i++) p[i + 256] = p[i];
    const h = (i, j, per) => v[p[p[((i % per) + per) % per] + (((j % per) + per) % per)]];
    return function (x, y, per) {
      const xi = Math.floor(x), yi = Math.floor(y);
      let fx = x - xi, fy = y - yi;
      fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
      const a = h(xi, yi, per), b = h(xi + 1, yi, per), c = h(xi, yi + 1, per), d = h(xi + 1, yi + 1, per);
      return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    };
  }
  function fbm(n, u, v, per, oct) {
    let a = 0.5, s = 0, f = per;
    for (let o = 0; o < oct; o++) { s += a * n(u * f, v * f, f); f *= 2; a *= 0.5; }
    return s / (1 - Math.pow(0.5, oct));
  }

  function genPBR(size, fn, nStrength, aniso) {
    const N = size * size, H = new Float32Array(N);
    const mk = () => { const c = document.createElement('canvas'); c.width = c.height = size; return c; };
    const ca = mk(), cn = mk(), cr = mk();
    const xa = ca.getContext('2d'), xn = cn.getContext('2d'), xr = cr.getContext('2d');
    const ia = xa.createImageData(size, size), inn = xn.createImageData(size, size), ir = xr.createImageData(size, size);
    const o = { r: 0, g: 0, b: 0, h: 0, ro: 1 };
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
      fn(i / size, j / size, o);
      const k = (j * size + i), q = k * 4;
      // linear -> sRGB approx
      ia.data[q] = Math.pow(Math.min(1, Math.max(0, o.r)), 1 / 2.2) * 255;
      ia.data[q + 1] = Math.pow(Math.min(1, Math.max(0, o.g)), 1 / 2.2) * 255;
      ia.data[q + 2] = Math.pow(Math.min(1, Math.max(0, o.b)), 1 / 2.2) * 255;
      ia.data[q + 3] = 255;
      const rr = Math.min(1, Math.max(0.04, o.ro)) * 255;
      ir.data[q] = rr; ir.data[q + 1] = rr; ir.data[q + 2] = 0; ir.data[q + 3] = 255;
      H[k] = o.h;
    }
    const m = size - 1;
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
      const dx = (H[j * size + ((i + 1) & m)] - H[j * size + ((i - 1) & m)]) * nStrength;
      const dy = (H[((j + 1) & m) * size + i] - H[((j - 1) & m) * size + i]) * nStrength;
      const l = 1 / Math.sqrt(dx * dx + dy * dy + 1), q = (j * size + i) * 4;
      inn.data[q] = (-dx * l * 0.5 + 0.5) * 255; inn.data[q + 1] = (dy * l * 0.5 + 0.5) * 255;
      inn.data[q + 2] = (l * 0.5 + 0.5) * 255; inn.data[q + 3] = 255;
    }
    xa.putImageData(ia, 0, 0); xn.putImageData(inn, 0, 0); xr.putImageData(ir, 0, 0);
    const tex = (c, srgb) => {
      const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = aniso;
      if (srgb) t.encoding = T.sRGBEncoding; return t;
    };
    return { map: tex(ca, true), normalMap: tex(cn, false), roughnessMap: tex(cr, false) };
  }

  JL.makeMaterials = function (aniso, lowQ) {
    const S = lowQ ? 256 : 512;
    const n1 = makeNoise(11), n2 = makeNoise(29), n3 = makeNoise(53);
    const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const M = {};

    // stone blocks (UV unit = 2m) : 2 x 4 running bond
    const blockRnd = []; { const r = JL.rng(5); for (let i = 0; i < 64; i++) blockRnd.push(r()); }
    const stone = genPBR(S, (u, v, o) => {
      const by = Math.floor(v * 4), off = (by & 1) * 0.5;
      const ux = (u + off * 0.5) * 2, bx = Math.floor(ux) & 1;
      const lx = ux - Math.floor(ux), ly = v * 4 - by;
      const e = Math.min(Math.min(lx, 1 - lx) * 2, Math.min(ly, 1 - ly));
      const edge = sm(0.0, 0.07, e);
      const rnd = blockRnd[by * 2 + bx], rnd2 = blockRnd[32 + by * 2 + bx];
      const f = fbm(n1, u, v, 8, 5), f2 = fbm(n2, u, v, 32, 3), big = fbm(n3, u, v, 2, 3);
      let c = 0.20 + rnd * 0.10 + f * 0.16 + (f2 - 0.5) * 0.08;
      const moss = sm(0.5, 0.75, big + (1 - edge) * 0.35 + (f2 - 0.5) * 0.4);
      o.r = c * 1.02; o.g = c * 0.98; o.b = c * 0.90;
      o.r = o.r * (1 - moss) + 0.07 * moss; o.g = o.g * (1 - moss) + 0.13 * moss; o.b = o.b * (1 - moss) + 0.04 * moss;
      const k = 0.35 + 0.65 * edge; o.r *= k; o.g *= k; o.b *= k;
      o.h = edge * (0.6 + rnd2 * 0.25) + f * 0.25 + f2 * 0.08;
      o.ro = 0.82 + (f2 - 0.5) * 0.25 - moss * 0.1;
    }, 5.0, aniso);
    M.stone = new T.MeshStandardMaterial({ ...stone, metalness: 0 });
    M.darkStone = new T.MeshStandardMaterial({ ...stone, color: 0x8a8f96, metalness: 0 });

    // aged red-ochre plaster
    const plaster = genPBR(S, (u, v, o) => {
      const f = fbm(n2, u, v, 4, 5), st = fbm(n1, u * 1.0, v * 0.25, 16, 4), f3 = fbm(n3, u, v, 48, 2);
      const crack = Math.abs(fbm(n3, u, v, 6, 4) - 0.5);
      const cr = 1 - sm(0.0, 0.012, crack);
      const patch = sm(0.62, 0.7, fbm(n1, u + 0.37, v + 0.11, 3, 4));
      let r = 0.42 + f * 0.16, g = 0.085 + f * 0.05, b = 0.05 + f * 0.03;
      const dirt = sm(0.45, 0.8, st) * 0.55;
      r *= 1 - dirt; g *= 1 - dirt * 0.8; b *= 1 - dirt * 0.7;
      // exposed pale undercoat patches
      r = r * (1 - patch) + (0.42 + f3 * 0.1) * patch; g = g * (1 - patch) + (0.36 + f3 * 0.08) * patch; b = b * (1 - patch) + (0.29 + f3 * 0.06) * patch;
      const k = 1 - cr * 0.6; o.r = r * k; o.g = g * k; o.b = b * k;
      o.h = f * 0.5 + f3 * 0.15 - cr * 0.5 - patch * 0.25;
      o.ro = 0.78 + (f3 - 0.5) * 0.2 + patch * 0.1;
    }, 2.5, aniso);
    M.plaster = new T.MeshStandardMaterial({ ...plaster, metalness: 0 });

    // flagstone floor (UV unit = 2m, 2x2 slabs) with wet patches
    const floor = genPBR(S, (u, v, o) => {
      const tx = u * 2, ty = v * 2, ix = Math.floor(tx), iy = Math.floor(ty);
      const lx = tx - ix, ly = ty - iy;
      const wob = (fbm(n2, u, v, 16, 2) - 0.5) * 0.02;
      const e = Math.min(Math.min(lx, 1 - lx), Math.min(ly, 1 - ly)) + wob;
      const edge = sm(0.005, 0.045, e);
      const rnd = blockRnd[10 + ix * 2 + iy];
      const f = fbm(n1, u, v, 8, 5), f2 = fbm(n3, u, v, 40, 3), wet = sm(0.5, 0.62, fbm(n2, u + 0.2, v + 0.6, 3, 3));
      let c = 0.17 + rnd * 0.07 + f * 0.13 + (f2 - 0.5) * 0.06;
      const moss = (1 - edge) * sm(0.35, 0.6, f);
      o.r = c * 1.0; o.g = c * 0.97; o.b = c * 0.92;
      o.r = o.r * (1 - moss) + 0.05 * moss; o.g = o.g * (1 - moss) + 0.10 * moss; o.b = o.b * (1 - moss) + 0.03 * moss;
      const k = (0.3 + 0.7 * edge) * (1 - wet * 0.35); o.r *= k; o.g *= k; o.b *= k;
      o.h = edge * 0.7 + f * 0.2 * (1 - wet * 0.8) + f2 * 0.06 * (1 - wet);
      o.ro = (0.8 + (f2 - 0.5) * 0.2) * (1 - wet) + 0.08 * wet;
    }, 4.0, aniso);
    M.floor = new T.MeshStandardMaterial({ ...floor, metalness: 0 });

    // glazed roof tiles (UV unit = 1m)
    const tile = genPBR(S / 2, (u, v, o) => {
      const cx = u * 6, fx = cx - Math.floor(cx), ry = v * 4, fy = ry - Math.floor(ry);
      const cyl = Math.sqrt(Math.max(0, 1 - Math.pow(2 * fx - 1, 2)));
      const f = fbm(n1, u, v, 16, 3);
      const c = 0.035 + f * 0.05 + cyl * 0.03;
      o.r = c * 0.75; o.g = c * 0.95; o.b = c * 1.15;
      const lip = sm(0.0, 0.08, fy);
      o.r *= 0.5 + 0.5 * lip; o.g *= 0.5 + 0.5 * lip; o.b *= 0.5 + 0.5 * lip;
      o.h = cyl * 0.8 + fy * 0.5 + f * 0.05;
      o.ro = 0.28 + f * 0.25;
    }, 6.0, aniso);
    M.roofTile = new T.MeshStandardMaterial({ ...tile, metalness: 0.1 });

    // wood grain
    const wood = genPBR(S / 2, (u, v, o) => {
      const g = fbm(n1, u * 0.25, v, 32, 4), g2 = fbm(n2, u, v, 4, 2);
      const line = Math.abs(Math.sin((g * 6 + u * 14 + g2 * 3) * Math.PI));
      const c = 0.5 + line * 0.5;
      o.r = c; o.g = c; o.b = c; o.h = line * 0.5 + g * 0.3; o.ro = 0.5 + line * 0.3;
    }, 2.0, aniso);
    M.wood = new T.MeshStandardMaterial({ ...wood, color: 0x4a2c17, metalness: 0 });
    M.bark = new T.MeshStandardMaterial({ ...wood, color: 0x33241b, metalness: 0 });
    M.redLacquer = new T.MeshStandardMaterial({ map: wood.map, normalMap: wood.normalMap, normalScale: new T.Vector2(0.35, 0.35), color: 0xb0160c, roughness: 0.32, metalness: 0.0 });

    // generic fine noise normal for metals
    const fine = genPBR(128, (u, v, o) => { const f = fbm(n3, u, v, 16, 3); o.r = o.g = o.b = 1; o.h = f; o.ro = 0.3 + f * 0.3; }, 1.2, aniso);
    M.gold = new T.MeshStandardMaterial({ color: 0xffc35a, metalness: 1, roughness: 0.28, normalMap: fine.normalMap, normalScale: new T.Vector2(0.3, 0.3), roughnessMap: fine.roughnessMap });
    M.bronze = new T.MeshStandardMaterial({ color: 0x6b5236, metalness: 0.9, roughness: 0.5, normalMap: fine.normalMap, normalScale: new T.Vector2(0.6, 0.6) });
    M.steel = new T.MeshStandardMaterial({ color: 0xc9d0d6, metalness: 1, roughness: 0.22, normalMap: fine.normalMap, normalScale: new T.Vector2(0.2, 0.2) });
    M.paper = new T.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xff9a3c, emissiveIntensity: 3.0, roughness: 0.9 });
    M.jade = new T.MeshPhysicalMaterial({ color: 0x2fae6e, roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, emissive: 0x0c5a30, emissiveIntensity: 0.9 });
    M.moss = new T.MeshStandardMaterial({ color: 0x3c5a22, roughness: 1 });
    M.leaf = new T.MeshStandardMaterial({ color: 0x4f7d2a, roughness: 0.7, side: T.DoubleSide });
    M.blossom = new T.MeshStandardMaterial({ color: 0xffb7cf, roughness: 0.8, emissive: 0x7a2a45, emissiveIntensity: 0.25 });
    M.bamboo = new T.MeshStandardMaterial({ color: 0x6f9a3a, roughness: 0.4 });
    M.poolFloor = new T.MeshStandardMaterial({ ...stone, color: 0x4f6e62, metalness: 0 });

    // water normals
    const wn = genPBR(S / 2, (u, v, o) => { o.r = o.g = o.b = 1; o.h = fbm(n1, u, v, 6, 4) + 0.35 * fbm(n2, u, v, 24, 2); o.ro = 1; }, 3.0, 4);
    JL.waterNormals = wn.normalMap;
    return M;
  };

  // ---------- sky ----------
  JL.makeSky = function (sunDir) {
    const mat = new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false,
      uniforms: { sunDir: { value: sunDir.clone() }, time: { value: 0 } },
      vertexShader: 'varying vec3 vD; void main(){ vD=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `
        varying vec3 vD; uniform vec3 sunDir; uniform float time;
        float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
        float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
        float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<5;i++){ s+=a*n(p); p=p*2.03+7.1; a*=.5; } return s; }
        void main(){
          vec3 d=normalize(vD); float y=max(d.y,0.);
          vec3 zen=vec3(0.07,0.17,0.36), mid=vec3(0.30,0.42,0.56), hor=vec3(1.05,0.60,0.34);
          vec3 col=mix(hor,mid,smoothstep(0.,0.22,y)); col=mix(col,zen,smoothstep(0.15,0.8,y));
          float s=max(dot(d,sunDir),0.);
          col+=vec3(1.0,0.55,0.25)*pow(s,6.)*0.55;
          vec2 cp=d.xz/(d.y+0.25)*1.3+vec2(time*0.004,0.);
          float c=smoothstep(0.48,0.85,fbm(cp))*smoothstep(0.02,0.25,d.y);
          vec3 cc=mix(vec3(0.75,0.45,0.42),vec3(1.5,1.0,0.7),pow(s,3.));
          col=mix(col,cc,c*0.75);
          col+=vec3(1.0,0.8,0.55)*(pow(s,900.)*40.+pow(s,60.)*0.9);
          if(d.y<0.) col=mix(col,vec3(0.10,0.13,0.14),smoothstep(0.,-0.15,d.y));
          gl_FragColor=vec4(col*0.9,1.);
        }`
    });
    const mesh = new T.Mesh(new T.SphereGeometry(400, 32, 16), mat);
    mesh.frustumCulled = false; mesh.renderOrder = -10;
    return mesh;
  };

  // ---------- post-processing ----------
  const QUAD_VS = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }';

  const COMPOSITE_FS = `
    precision highp float;
    uniform sampler2D tColor, tDepth, tShadow;
    uniform mat4 uProjInv, uViewInv, uProj, uShadowMat;
    uniform vec3 uCam, uSunDir, uSunCol, uFogCol;
    uniform float uTime, uHasShadow, uSteps, uAO, uFogAmt;
    varying vec2 vUv;
    float ign(vec2 p){ return fract(52.9829189*fract(dot(p,vec2(0.06711056,0.00583715)))); }
    vec3 viewPos(vec2 uv){ float d=texture2D(tDepth,uv).x; vec4 c=vec4(uv*2.-1.,d*2.-1.,1.); vec4 v=uProjInv*c; return v.xyz/v.w; }
    float shadowAt(vec3 wp){
      vec4 sc=uShadowMat*vec4(wp,1.); sc.xyz/=sc.w;
      if(sc.x<0.||sc.x>1.||sc.y<0.||sc.y>1.||sc.z>1.) return 1.;
      float d=dot(texture2D(tShadow,sc.xy),vec4(1./16777216.,1./65536.,1./256.,1.)*(255./256.));
      return step(sc.z-0.0015,d);
    }
    void main(){
      vec3 col=texture2D(tColor,vUv).rgb;
      float depth=texture2D(tDepth,vUv).x;
      vec3 P=viewPos(vUv);
      float dist=length(P);
      float noise=ign(gl_FragCoord.xy);
      // ---- SSAO ----
      if(uAO>0. && depth<0.9999 && dist<45.){
        vec3 N=normalize(cross(dFdx(P),dFdy(P))); if(dot(N,P)>0.) N=-N;
        vec3 up=abs(N.y)<0.9?vec3(0,1,0):vec3(1,0,0); vec3 Tn=normalize(cross(up,N)); vec3 Bn=cross(N,Tn);
        float rad=0.7, occ=0.; float rot=noise*6.2831;
        for(int i=0;i<10;i++){
          float fi=float(i); float a=rot+fi*2.399963; float r=sqrt((fi+0.5)/10.);
          vec3 dir=Tn*cos(a)*r+Bn*sin(a)*r+N*sqrt(max(0.,1.-r*r));
          vec3 S=P+dir*rad*(0.25+0.75*fract(fi*0.618+noise));
          vec4 c=uProj*vec4(S,1.); vec2 suv=c.xy/c.w*0.5+0.5;
          float sz=viewPos(suv).z;
          float rng=smoothstep(0.,1.,rad/(abs(P.z-sz)+1e-4));
          occ+=step(S.z+0.04,sz)*rng;
        }
        float ao=1.-occ/10.*uAO; ao=mix(ao,1.,smoothstep(30.,45.,dist));
        col*=ao*ao;
      }
      // ---- volumetric fog with shadowed sun in-scatter ----
      vec3 W=(uViewInv*vec4(P,1.)).xyz;
      vec3 rd=normalize(W-uCam);
      float maxD=min(dist,64.);
      float ds=maxD/uSteps;
      float cosT=dot(rd,uSunDir); float g=0.62;
      float phase=(1.-g*g)/pow(1.+g*g-2.*g*cosT,1.5)*0.30+0.10;
      vec3 acc=vec3(0.); float Tr=1.;
      float t=ds*noise;
      for(int i=0;i<32;i++){
        if(float(i)>=uSteps) break;
        vec3 p=uCam+rd*t;
        float dens=(0.0035+0.016*exp(-max(p.y,0.)*0.28))*uFogAmt;
        dens*=1.+0.55*sin(p.x*0.33+uTime*0.13)*sin(p.z*0.29-uTime*0.09)*sin(p.y*0.7+uTime*0.05);
        float lit=uHasShadow>0.5?shadowAt(p):1.;
        float tr=exp(-dens*ds);
        vec3 Lin=uSunCol*phase*lit+uFogCol;
        acc+=Tr*(1.-tr)*Lin; Tr*=tr;
        t+=ds;
      }
      float far=depth<0.9999?clamp(dist-64.,0.,400.):0.;
      float trf=exp(-far*0.0022*uFogAmt);
      vec3 farCol=uFogCol*1.6+uSunCol*0.10*phase;
      col=col*Tr+acc;
      col=col*trf+farCol*(1.-trf)*Tr;
      gl_FragColor=vec4(col,1.);
    }`;

  const FINAL_FS = `
    precision highp float;
    uniform sampler2D tDiffuse; uniform float uTime, uExposure, uHurt, uFade; uniform vec2 uRes;
    varying vec2 vUv;
    vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.,1.); }
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec2 d=vUv-0.5; float r2=dot(d,d);
      vec3 c;
      c.r=texture2D(tDiffuse,vUv+d*r2*0.020).r;
      c.g=texture2D(tDiffuse,vUv).g;
      c.b=texture2D(tDiffuse,vUv-d*r2*0.020).b;
      c*=uExposure;
      c=aces(c);
      // grade: teal shadows, warm highlights, gentle contrast + saturation
      float l=dot(c,vec3(0.2126,0.7152,0.0722));
      c=mix(c,c*vec3(0.90,1.02,1.10),(1.-smoothstep(0.,0.45,l))*0.6);
      c=mix(c,c*vec3(1.06,1.0,0.92),smoothstep(0.4,1.,l)*0.6);
      c=mix(vec3(l),c,1.12);
      c=c*c*(3.-2.*c)*0.35+c*0.65;
      c=pow(max(c,0.),vec3(1./2.2));
      float vig=1.-smoothstep(0.18,0.85,r2*1.6);
      c*=mix(0.55,1.,vig);
      c=mix(c,vec3(0.5,0.02,0.02),uHurt*smoothstep(0.05,0.5,r2)*0.8);
      c+=(h(vUv*uRes+fract(uTime)*91.7)-0.5)*0.028;
      c*=uFade;
      gl_FragColor=vec4(c,1.);
    }`;

  JL.Post = function (renderer, sun, lowQ) {
    const self = this;
    const cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new T.Mesh(new T.PlaneGeometry(2, 2), null); quad.frustumCulled = false;
    const qs = new T.Scene(); qs.add(quad);
    const mkRT = (w, h, type, depth) => {
      const rt = new T.WebGLRenderTarget(w, h, { type: type, minFilter: T.LinearFilter, magFilter: T.LinearFilter, depthBuffer: !!depth });
      if (depth) { rt.depthTexture = new T.DepthTexture(w, h); rt.depthTexture.type = T.UnsignedIntType; }
      return rt;
    };
    this.rtScene = mkRT(4, 4, T.HalfFloatType, true);
    this.rtA = mkRT(4, 4, T.HalfFloatType, false);
    this.rtL = mkRT(4, 4, T.UnsignedByteType, false);
    this.composite = new T.ShaderMaterial({
      vertexShader: QUAD_VS, fragmentShader: COMPOSITE_FS, depthTest: false, depthWrite: false,
      extensions: { derivatives: true },
      uniforms: {
        tColor: { value: null }, tDepth: { value: null }, tShadow: { value: null },
        uProjInv: { value: new T.Matrix4() }, uViewInv: { value: new T.Matrix4() }, uProj: { value: new T.Matrix4() }, uShadowMat: { value: new T.Matrix4() },
        uCam: { value: new T.Vector3() }, uSunDir: { value: new T.Vector3() }, uSunCol: { value: new T.Color(1.0, 0.62, 0.33).multiplyScalar(2.2) },
        uFogCol: { value: new T.Color(0.035, 0.060, 0.075) }, uTime: { value: 0 }, uHasShadow: { value: 0 },
        uSteps: { value: lowQ ? 12 : 24 }, uAO: { value: 0.9 }, uFogAmt: { value: 1 }
      }
    });
    this.final = new T.ShaderMaterial({
      vertexShader: QUAD_VS, fragmentShader: FINAL_FS, depthTest: false, depthWrite: false,
      uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uExposure: { value: 1.0 }, uHurt: { value: 0 }, uFade: { value: 1 }, uRes: { value: new T.Vector2() } }
    });
    this.fxaa = new T.ShaderMaterial({
      vertexShader: T.FXAAShader.vertexShader, fragmentShader: T.FXAAShader.fragmentShader, depthTest: false, depthWrite: false,
      uniforms: { tDiffuse: { value: null }, resolution: { value: new T.Vector2() } }
    });
    this.bloom = new T.UnrealBloomPass(new T.Vector2(256, 256), 0.55, 0.6, 1.0);
    const hf = rt => { rt.texture.type = T.HalfFloatType; };
    hf(this.bloom.renderTargetBright); this.bloom.renderTargetsHorizontal.forEach(hf); this.bloom.renderTargetsVertical.forEach(hf);

    this.setSize = function (w, h) {
      this.rtScene.setSize(w, h); this.rtA.setSize(w, h); this.rtL.setSize(w, h);
      this.bloom.setSize(w, h);
      this.final.uniforms.uRes.value.set(w, h);
      this.fxaa.uniforms.resolution.value.set(1 / w, 1 / h);
    };
    const pass = (mat, target) => { quad.material = mat; renderer.setRenderTarget(target); renderer.render(qs, cam); };
    this.render = function (scene, camera, time) {
      renderer.setRenderTarget(self.rtScene); renderer.clear(); renderer.render(scene, camera);
      const u = self.composite.uniforms;
      u.tColor.value = self.rtScene.texture; u.tDepth.value = self.rtScene.depthTexture;
      u.uProjInv.value.copy(camera.projectionMatrixInverse); u.uViewInv.value.copy(camera.matrixWorld); u.uProj.value.copy(camera.projectionMatrix);
      u.uCam.value.setFromMatrixPosition(camera.matrixWorld);
      u.uSunDir.value.copy(sun.position).sub(sun.target.position).normalize();
      if (sun.shadow.map) { u.tShadow.value = sun.shadow.map.texture; u.uShadowMat.value.copy(sun.shadow.matrix); u.uHasShadow.value = 1; }
      u.uTime.value = time;
      pass(self.composite, self.rtA);
      self.bloom.render(renderer, null, self.rtA, 0.016, false);
      self.final.uniforms.tDiffuse.value = self.rtA.texture; self.final.uniforms.uTime.value = time;
      pass(self.final, self.rtL);
      self.fxaa.uniforms.tDiffuse.value = self.rtL.texture;
      pass(self.fxaa, null);
    };
  };

  // ---------- particles ----------
  JL.makePetals = function (count, box) {
    const g = new T.BufferGeometry(), p = new Float32Array(count * 3), s = new Float32Array(count * 4), r = JL.rng(77);
    for (let i = 0; i < count; i++) {
      p[i * 3] = r() * box.x; p[i * 3 + 1] = r() * box.y; p[i * 3 + 2] = r() * box.z;
      s[i * 4] = r(); s[i * 4 + 1] = r(); s[i * 4 + 2] = r(); s[i * 4 + 3] = r();
    }
    g.setAttribute('position', new T.BufferAttribute(p, 3)); g.setAttribute('seed', new T.BufferAttribute(s, 4));
    const m = new T.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { time: { value: 0 }, box: { value: box }, origin: { value: new T.Vector3() }, scale: { value: 600 } },
      vertexShader: `
        attribute vec4 seed; uniform float time, scale; uniform vec3 box, origin; varying vec4 vS; varying float vF;
        void main(){ vS=seed;
          vec3 p=position; p.y-=time*(0.35+seed.x*0.5); p.x+=sin(time*0.7+seed.y*30.)*0.6+time*0.25; p.z+=cos(time*0.5+seed.z*30.)*0.6;
          p=mod(p-origin+box*0.5,box)-box*0.5+origin;
          vec3 q=(p-origin)/(box*0.5); vF=1.-smoothstep(0.75,1.,max(abs(q.x),max(abs(q.y),abs(q.z))));
          vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=scale*(0.05+seed.w*0.05)/max(-mv.z,0.1); }`,
      fragmentShader: `
        varying vec4 vS; varying float vF; uniform float time;
        void main(){ vec2 q=gl_PointCoord-0.5; float a=time*(1.+vS.x*2.)+vS.y*6.28; float c=cos(a),s=sin(a); q=mat2(c,-s,s,c)*q;
          q.y*=1.6+0.8*sin(time*3.*vS.z+vS.w*6.); float d=length(q+vec2(0.,0.06*sin(q.x*12.)));
          float al=smoothstep(0.42,0.34,d)*vF; if(al<0.02) discard;
          vec3 col=mix(vec3(1.0,0.50,0.62),vec3(1.0,0.82,0.86),vS.w)*(0.55+0.5*vS.x);
          gl_FragColor=vec4(col,al*0.95); }`
    });
    const pts = new T.Points(g, m); pts.frustumCulled = false; return pts;
  };

  // glowing motes / fireflies / embers. list: [{pos, radius, n, color:[r,g,b], size, rise}]
  JL.makeMotes = function (list) {
    let n = 0; list.forEach(l => n += l.n);
    const g = new T.BufferGeometry(), p = new Float32Array(n * 3), c = new Float32Array(n * 3), s = new Float32Array(n * 4), r = JL.rng(99);
    let k = 0;
    list.forEach(l => { for (let i = 0; i < l.n; i++, k++) {
      p[k * 3] = l.pos.x + (r() - 0.5) * 2 * l.radius; p[k * 3 + 1] = l.pos.y + r() * (l.h || l.radius); p[k * 3 + 2] = l.pos.z + (r() - 0.5) * 2 * l.radius;
      c[k * 3] = l.color[0]; c[k * 3 + 1] = l.color[1]; c[k * 3 + 2] = l.color[2];
      s[k * 4] = r(); s[k * 4 + 1] = l.size * (0.5 + r()); s[k * 4 + 2] = l.rise || 0; s[k * 4 + 3] = l.h || l.radius;
    } });
    g.setAttribute('position', new T.BufferAttribute(p, 3)); g.setAttribute('color', new T.BufferAttribute(c, 3)); g.setAttribute('seed', new T.BufferAttribute(s, 4));
    const m = new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      uniforms: { time: { value: 0 }, scale: { value: 600 } },
      vertexShader: `
        attribute vec4 seed; attribute vec3 color; uniform float time, scale; varying vec3 vC; varying float vA;
        void main(){ vec3 p=position; float ph=seed.x*6.283; float life=1.;
          if(seed.z>0.){ float tt=fract(time*seed.z*(0.25+seed.x*0.2)+seed.x); p.y+=tt*seed.w*2.2; p.x+=sin(tt*9.+ph)*0.18*tt; p.z+=cos(tt*7.+ph)*0.18*tt; life=(1.-tt)*smoothstep(0.,0.1,tt); }
          else { p.x+=sin(time*0.31+ph)*0.9+sin(time*0.83+ph*2.)*0.3; p.y+=sin(time*0.47+ph*3.)*0.5; p.z+=cos(time*0.27+ph*5.)*0.9; life=0.35+0.65*pow(0.5+0.5*sin(time*(1.+seed.x*2.)+ph*7.),3.); }
          vC=color; vA=life; vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=scale*seed.y/max(-mv.z,0.1); }`,
      fragmentShader: `varying vec3 vC; varying float vA; void main(){ float d=length(gl_PointCoord-0.5); float a=smoothstep(0.5,0.0,d); gl_FragColor=vec4(vC*a*a*vA,1.); }`
    });
    const pts = new T.Points(g, m); pts.frustumCulled = false; return pts;
  };

  // flames: big procedural point sprites
  JL.makeFlames = function (positions, size) {
    const g = new T.BufferGeometry(), p = new Float32Array(positions.length * 3), s = new Float32Array(positions.length);
    positions.forEach((v, i) => { p[i * 3] = v.x; p[i * 3 + 1] = v.y + size * 0.42; p[i * 3 + 2] = v.z; s[i] = i * 1.37; });
    g.setAttribute('position', new T.BufferAttribute(p, 3)); g.setAttribute('seed', new T.BufferAttribute(s, 1));
    const m = new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      uniforms: { time: { value: 0 }, scale: { value: 600 }, size: { value: size } },
      vertexShader: `attribute float seed; uniform float scale,size; varying float vS; void main(){ vS=seed; vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=scale*size/max(-mv.z,0.1); }`,
      fragmentShader: `
        varying float vS; uniform float time;
        float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
        float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
        void main(){ vec2 q=gl_PointCoord; q.y=1.-q.y; vec2 c=vec2((q.x-0.5)*2.,q.y);
          float t=time*1.8+vS;
          float nn=n(vec2(c.x*3.+vS,c.y*3.-t*2.))*0.6+n(vec2(c.x*7.,c.y*6.-t*3.5))*0.4;
          c.x+=(nn-0.5)*0.5*c.y;
          float w=(1.-c.y)*0.55*(0.6+0.4*nn);
          float f=smoothstep(w,w*0.25,abs(c.x))*smoothstep(0.,0.12,c.y)*smoothstep(1.,0.35,c.y+ (1.-nn)*0.3);
          vec3 col=mix(vec3(1.0,0.22,0.03),vec3(1.0,0.75,0.25),smoothstep(0.2,0.9,f))*f*5.0;
          gl_FragColor=vec4(col,1.); }`
    });
    const pts = new T.Points(g, m); pts.frustumCulled = false; return pts;
  };

  // ---------- real photo-scanned assets (Poly Haven, CC0); procedural stays as fallback ----------
  JL.loadRealAssets = function (renderer, scene, M, sky, sunDir) {
    const base = 'assets/tex/', TL = new T.TextureLoader();
    const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const load = (file, srgb, rep) => new Promise(res => TL.load(base + file, t => {
      t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = aniso; if (srgb) t.encoding = T.sRGBEncoding; t.repeat.set(rep, rep); res(t);
    }, undefined, () => res(null)));
    // name, repeat (UV units per texture tile), rough?, then per-material setup
    const set = (name, rep, rough, fn) => Promise.all([load(name + '_d.jpg', true, rep), load(name + '_n.jpg', false, rep), rough ? load(name + '_r.jpg', false, rep) : null])
      .then(r => { if (r[0] && r[1]) { try { fn(r[0], r[1], r[2]); } catch (e) { console.warn('tex', name, e); } } });
    const put = (m, d, n, r, color, ns, rough) => {
      if (!m) return;
      if (d) m.map = d; m.normalMap = n; if (r) m.roughnessMap = r;
      if (color !== undefined) m.color.setHex(color);
      m.normalScale.set(ns, ns); if (rough !== undefined) m.roughness = rough; m.needsUpdate = true;
    };
    set('plaster', 0.5, true, (d, n, r) => put(M.plaster, d, n, r, 0xa38c86, 1.3, 1.0));
    set('stone', 1.0, true, (d, n, r) => { put(M.stone, d, n, r, 0xb9b4aa, 1.4, 1.0); put(M.darkStone, d, n, r, 0x6f7377, 1.4, 1.0); put(M.poolFloor, d, n, r, 0x4f6e62, 1.2, 0.9); });
    set('floor', 2 / 3, true, (d, n, r) => put(M.floor, d, n, r, 0xa7a39b, 1.6, 0.9));
    set('roof', 1 / 3, true, (d, n, r) => { put(M.roofTile, d, n, r, 0x8d949c, 1.5, 0.85); if (M.roofTile) M.roofTile.metalness = 0; });
    set('wood', 0.55, true, (d, n, r) => { put(M.wood, d, n, r, 0x8a7360, 1.2, 1.0); put(M.redLacquer, null, n, r, undefined, 0.5, 0.5); });
    set('bark', 1.0, false, (d, n) => put(M.bark, d, n, null, 0x9a8c7c, 1.3, 0.95));
    load('ground_d.jpg', true, 420).then(t => {
      if (!t) return;
      scene.traverse(o => { if (o.isMesh && o.geometry && o.geometry.type === 'CircleGeometry' && o.geometry.parameters.radius > 300) { o.material.map = t; o.material.color.setHex(0x59684a); o.material.needsUpdate = true; } });
    });

    // ---- HDRI sky (kloofendal_48d_partly_cloudy_puresky): JPG for the visible dome, .hdr for image-based lighting ----
    const SUN_U = 0.5947; // sun column in the equirect
    const uOff = SUN_U - (Math.atan2(sunDir.z, sunDir.x) / (2 * Math.PI) + 0.5);
    const SKY_VS = 'varying vec3 vD; void main(){ vD=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }';
    const SKY_FS = `
      varying vec3 vD; uniform sampler2D tSky; uniform vec3 sunDir; uniform float uOff, time, uHalf, uGain, uClamp, uSun;
      void main(){
        vec3 d=normalize(vD);
        float u=atan(d.z,d.x)*0.15915494+0.5+uOff;
        float el=asin(clamp(d.y,-1.,1.));
        float v=uHalf>0.5 ? clamp(el*0.63661977,0.004,0.996) : clamp(el*0.31830989+0.5,0.004,0.996);
        vec3 c=texture2D(tSky,vec2(u,v)).rgb;
        if(uHalf>0.5){ float l=dot(c,vec3(0.2126,0.7152,0.0722)); c*=1.+0.7*smoothstep(0.55,1.,l); }
        c=min(c*uGain,vec3(uClamp));
        float y=max(d.y,0.);
        c*=mix(vec3(1.28,0.95,0.70),vec3(1.08,1.0,0.90),smoothstep(0.,0.55,y));
        float s=max(dot(d,sunDir),0.);
        c+=vec3(1.0,0.55,0.25)*pow(s,6.)*0.30;
        c+=uSun*vec3(1.0,0.8,0.55)*(pow(s,900.)*40.+pow(s,60.)*0.9);
        if(d.y<0.) c=mix(c,vec3(0.10,0.12,0.12),smoothstep(0.,-0.05,d.y));
        gl_FragColor=vec4(c,1.);
      }`;
    const skyMat = (tex, half, gain, clampV, sunAmt) => new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, vertexShader: SKY_VS, fragmentShader: SKY_FS,
      uniforms: { tSky: { value: tex }, sunDir: { value: sunDir.clone() }, uOff: { value: uOff }, time: { value: 0 }, uHalf: { value: half ? 1 : 0 }, uGain: { value: gain }, uClamp: { value: clampV }, uSun: { value: sunAmt } }
    });
    const bakeEnv = mat => {
      const pm = new T.PMREMGenerator(renderer), es = new T.Scene();
      es.add(new T.Mesh(new T.SphereGeometry(50, 32, 16), mat));
      const old = scene.environment; scene.environment = pm.fromScene(es, 0.02).texture; pm.dispose();
      if (old && old.dispose) old.dispose();
    };
    let hdrDone = false;
    TL.load(base + 'sky.jpg', t => {
      t.encoding = T.sRGBEncoding; t.wrapS = T.RepeatWrapping; t.wrapT = T.ClampToEdgeWrapping;
      t.minFilter = T.LinearFilter; t.magFilter = T.LinearFilter; t.generateMipmaps = false;
      const old = sky.material; sky.material = skyMat(t, true, 0.95, 4.0, 1.0); if (old && old.dispose) old.dispose();
      if (!hdrDone) { try { bakeEnv(skyMat(t, true, 0.9, 4.0, 0.25)); } catch (e) { console.warn('env jpg', e); } }
    }, undefined, () => { });
    if (T.RGBELoader) {
      new T.RGBELoader().load(base + 'sky_1k.hdr', t => {
        t.wrapS = T.RepeatWrapping; t.wrapT = T.ClampToEdgeWrapping; t.minFilter = T.LinearFilter; t.magFilter = T.LinearFilter; t.generateMipmaps = false;
        try { bakeEnv(skyMat(t, false, 0.85, 6.0, 0.0)); hdrDone = true; } catch (e) { console.warn('env hdr', e); }
      }, undefined, () => { });
    }
  };
})(window.JL);
