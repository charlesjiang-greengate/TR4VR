// Prints the Artifact `files` map for every asset referenced by the built page (binaries published as *.wasm).
const fs=require('fs'),path=require('path');const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'jade-labyrinth.html'),'utf8');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const map={};let total=0;
for(const f of walk(path.join(root,'assets'))){const rel=path.relative(root,f).split(path.sep).join('/');const base=path.basename(rel);
  const bin=/\.(glb|hdr|bin|ktx2|exr)$/.test(rel);const pub=bin?rel+'.wasm':rel;
  if(path.dirname(rel)==='assets') continue; // raw source models
  map[pub]=rel;total+=fs.statSync(f).size;}
console.log(JSON.stringify(map));console.error(Object.keys(map).length+' files, '+(total/1e6).toFixed(1)+' MB');
