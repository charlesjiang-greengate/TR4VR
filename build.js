const fs=require('fs');const r=f=>fs.readFileSync(__dirname+'/src/'+f,'utf8');
let t=r('index.tpl.html');
const rep=(k,f)=>{t=t.split('/*__'+k+'__*/').join(()=>0)&&t;};
const parts={HEROINE:'heroine.js',ARCH:'props_arch.js',NATURE:'props_nature.js',GFX:'gfx.js',GAME:'game.js'};
for(const k in parts){const i=t.indexOf('/*__'+k+'__*/');const src=r(parts[k]).replace(/<\/script/gi,'<\\/script');t=t.slice(0,i)+src+t.slice(i+('/*__'+k+'__*/').length);}
fs.writeFileSync(process.argv[2]||(__dirname+'/jade-labyrinth.html'),t);console.log('built',t.length);
