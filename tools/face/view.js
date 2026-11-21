// Close-up head renders of a sister, for checking face textures without running the game.
// usage: VAR=elder|younger HEAD=path/to/head.jpg OUT=dir [HAIR=path.png] node tools/face/view.js
// needs: cd tools && npm i three@0.147.0
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..', '..'), NM = path.join(__dirname, '..', 'node_modules', 'three');
const V = process.env.VAR || 'elder', OUT = process.env.OUT || '.';
const files = {
  '/three.js': path.join(NM, 'build/three.min.js'),
  '/GLTFLoader.js': path.join(NM, 'examples/js/loaders/GLTFLoader.js'),
  '/hair.js': path.join(ROOT, 'src/ext_hair.js'),
  '/model.glb': path.join(ROOT, 'assets/char2', V + '.glb'),
  '/head.jpg': process.env.UVPASS || process.env.HEAD || path.join(ROOT, 'assets/char2', V + '_head.jpg'),
  '/body.jpg': path.join(ROOT, 'assets/char2', V + '_body.jpg'),
  '/hair.png': process.env.HAIR || path.join(ROOT, 'assets/char2', 'elder_hair.png'),
};
const page = `<!doctype html><body style="margin:0;background:#888"><script src="/three.js"></script><script src="/GLTFLoader.js"></script>${process.env.NOHAIR ? "" : '<script src="/hair.js"></script>'}<script>
const r=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});r.setSize(512,512);r.outputEncoding=THREE.sRGBEncoding;document.body.appendChild(r.domElement);
const s=new THREE.Scene();s.background=new THREE.Color(0x8a8f96);s.add(new THREE.HemisphereLight(0xffffff,0x665544,0.9));
const d=new THREE.DirectionalLight(0xfff2e0,1.6);d.position.set(0.6,1.2,2);s.add(d);
const c=new THREE.PerspectiveCamera(22,1,0.01,50);const tl=new THREE.TextureLoader();
function tx(u){const t=tl.load(u);t.flipY=false;t.encoding=THREE.sRGBEncoding;return t;}
window.ready=new Promise(res=>new THREE.GLTFLoader().load('/model.glb',g=>{
  const hair=${V === 'elder'}, mh=new THREE.MeshStandardMaterial({map:tx('/hair.png'),alphaTest:0.4,side:THREE.DoubleSide,roughness:0.55});
  g.scene.traverse(o=>{if(!o.isMesh)return;const n=(o.material.name||'').toLowerCase();o.frustumCulled=false;o.userData.part=n.includes('opacity')?'hair':n.includes('head')?'head':'body';
    if(n.includes('opacity')){if(hair&&!${!!process.env.UVPASS})o.material=mh;else o.visible=false;}
    else if(${!!process.env.UVPASS}){ if(n.includes('head')){const t=tl.load('/head.jpg');t.flipY=false;t.magFilter=t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;
        o.material=new THREE.MeshBasicMaterial({map:t,alphaTest:0.5,side:THREE.DoubleSide});} else o.visible=false; }
    else o.material=new THREE.MeshStandardMaterial({map:tx(n.includes('head')?'/head.jpg':'/body.jpg'),roughness:0.65});});
  if(${!!process.env.UVPASS}){r.outputEncoding=THREE.LinearEncoding;s.background=new THREE.Color(0);}
  if(window.JL_HAIR&&!${!!process.env.UVPASS})console.log('hair',JSON.stringify(JL_HAIR('${V}',g.scene,THREE)));
  s.add(g.scene);g.scene.updateMatrixWorld(true);let h;g.scene.traverse(o=>{if(o.isBone&&/Head$/.test(o.name))h=o;});
  const p=new THREE.Vector3();h.getWorldPosition(p);window.shot=(yaw,dist)=>{c.position.set(p.x+Math.sin(yaw)*dist,p.y+0.07,p.z+Math.cos(yaw)*dist);c.lookAt(p.x,p.y+0.06,p.z);r.render(s,c);return r.domElement.toDataURL('image/png');};
  setTimeout(res,1500);}));
</script>`;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 512, height: 512 } });
  p.on('pageerror', e => console.log('PAGEERR', e.message)); p.on('console', m => console.log(m.text()));
  await p.route('**/*', rt => { const u = new URL(rt.request().url()); if (u.pathname === '/') return rt.fulfill({ contentType: 'text/html', body: page });
    const f = files[u.pathname]; return f ? rt.fulfill({ body: fs.readFileSync(f) }) : rt.abort(); });
  await p.goto('http://local/'); await p.evaluate(() => window.ready);
  const shots = JSON.parse(process.env.SHOTS || '[["front",0,0.75],["q3",0.6,0.8],["far",0.3,2.2]]');
  for (const [n, yaw, dist] of shots) { const u = await p.evaluate(([y, d]) => shot(y, d), [yaw, dist]);
    fs.writeFileSync(path.join(OUT, V + '_' + n + '.png'), Buffer.from(u.split(',')[1], 'base64')); }
  await b.close();
})();
