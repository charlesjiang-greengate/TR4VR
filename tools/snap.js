// usage: HTML=built.html OUT=dir W=720 H=405 STEPS='[{"name":"x","tp":[x,y,z],"cam":[yaw,pitch],"js":"...","frames":3}]' node snap.js
// Render-on-demand (no RAF loop): each step renders `frames` frames and saves OUT/snap_<name>.jpg. A step named "title" stays on the title screen.
const {chromium}=require('playwright');const fs=require('fs');
const three=__dirname+'/node_modules/three/'; // run: cd tools && npm i three@0.147.0
const OUT=process.env.OUT||__dirname, HTML=process.env.HTML||(__dirname+'/../jade-labyrinth.html');
(async()=>{
 const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:+(process.env.W||720),height:+(process.env.H||405)}});
 await p.addInitScript(()=>{window.JL_FIXED_SCALE=1;window.JL_MANUAL=1;window.JL_LOWQ=1;});
 const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0">'+fs.readFileSync(HTML,'utf8')+'</body></html>';
 await p.route('**/*',async route=>{const u=route.request().url();
   if(u.startsWith('http://local/assets/')){ try{ return route.fulfill({body:fs.readFileSync(__dirname+'/../'+decodeURIComponent(u.slice(13)).split('?')[0].replace(/\.wasm$/,''))}); }catch(e){ return route.fulfill({status:404,body:''}); } }
   if(u.startsWith('http://local/')) return route.fulfill({contentType:'text/html',body:html});
   const m=u.match(/three@0\.147\.0\/(.*)$/); if(m) return route.fulfill({contentType:'application/javascript',body:fs.readFileSync(three+m[1])});
   return route.abort();});
 const errs=[];p.on('console',m=>{if((m.type()==='error'||m.type()==='warning')&&!/ERR_FAILED/.test(m.text()))errs.push(m.type()+': '+m.text().slice(0,400));});p.on('pageerror',e=>errs.push('PAGEERR '+e.message+'\n'+(e.stack||'').slice(0,600)));
 await p.goto('http://local/',{timeout:120000});
 await p.waitForFunction(()=>window.JL&&JL.debug&&JL.debug.snap,null,{timeout:120000});
 await p.waitForTimeout(+(process.env.WAIT||3000));
 const steps=JSON.parse(process.env.STEPS||'[]'); let started=false;
 for(const s of steps){
  if(s.name!=='title'&&!started){ started=true; await p.evaluate(()=>document.getElementById('start').click()); }
  if(s.wait) await p.waitForTimeout(s.wait);
  const d=await p.evaluate(s=>{const d=JL.debug; if(s.tp)d.tp(...s.tp); if(s.cam)d.cam=s.cam; let r; if(s.js)r=eval(s.js); return [JL.debug.snap(s.frames||3),String(r)];},s);
  if(s.js)console.log(s.name,'=>',d[1]); if(s.dom){ await p.waitForTimeout(400); await p.screenshot({path:OUT+'/dom_'+s.name+'.png',timeout:60000}); }
  fs.writeFileSync(OUT+'/snap_'+s.name+'.jpg',Buffer.from(d[0].split(',')[1],'base64'));
 }
 console.log(errs.slice(0,25).join('\n')||'no errors');
 await b.close();
})();
