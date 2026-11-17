const fs=require('fs');const r=f=>fs.readFileSync(__dirname+'/src/'+f,'utf8');
let t=r('index.tpl.html');
const rep=(k,f)=>{t=t.split('/*__'+k+'__*/').join(()=>0)&&t;};
const parts={HEROINE:'heroine.js',ARCH:'props_arch.js',NATURE:'props_nature.js',GFX:'gfx.js',GAME:'game.js'};
for(const k in parts){const i=t.indexOf('/*__'+k+'__*/');let raw=r(parts[k]); if(k==='GAME'){ raw=fs.readdirSync(__dirname+'/src').filter(f=>/^ext_.*\.js$/.test(f)).sort().map(f=>'/* '+f+' */\n'+r(f)).join('\n@@SPLIT@@\n')+'\n@@SPLIT@@\n'+raw; ['heroine2.js','heroine3.js'].forEach(f=>{ if(fs.existsSync(__dirname+'/src/'+f)) raw=r(f)+'\n@@SPLIT@@\n'+raw; }); } const src=raw.replace(/<\/script/gi,'<\\/script').split('@@SPLIT@@').join('</scr'+'ipt>\n<scr'+'ipt>');t=t.slice(0,i)+src+t.slice(i+('/*__'+k+'__*/').length);}
t=t.replace(/\.(glb|hdr|bin|ktx2|exr)(?=['"`])/g,'.$1.wasm'); // artifact host only serves some extensions; binaries are published as *.wasm
fs.writeFileSync(process.argv[2]||(__dirname+'/jade-labyrinth.html'),t);console.log('built',t.length);
