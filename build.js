const fs=require('fs');const r=f=>fs.readFileSync(__dirname+'/src/'+f,'utf8');
let t=r('index.tpl.html');
const rep=(k,f)=>{t=t.split('/*__'+k+'__*/').join(()=>0)&&t;};
const parts={HEROINE:'heroine.js',ARCH:'props_arch.js',NATURE:'props_nature.js',GFX:'gfx.js',GAME:'game.js'};
for(const k in parts){const i=t.indexOf('/*__'+k+'__*/');let raw=r(parts[k]); if(k==='GAME'){ raw=fs.readdirSync(__dirname+'/src').filter(f=>/^ext_.*\.js$/.test(f)).sort().map(f=>'/* '+f+' */\n'+r(f)).join('\n')+'\n'+raw; if(fs.existsSync(__dirname+'/src/heroine2.js')) raw=r('heroine2.js')+'\n'+raw; } const src=raw.replace(/<\/script/gi,'<\\/script');t=t.slice(0,i)+src+t.slice(i+('/*__'+k+'__*/').length);}
fs.writeFileSync(process.argv[2]||(__dirname+'/jade-labyrinth.html'),t);console.log('built',t.length);
