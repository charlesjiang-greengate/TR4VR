const {chromium}=require('playwright');const fs=require('fs');
const three=__dirname+'/../node_modules/three/'; // cd tools && npm i three@0.147.0
const HTML=process.env.HTML||(__dirname+'/../../jade-labyrinth.html');
(async()=>{
 const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:320,height:180}});
 await p.addInitScript(()=>{window.JL_FIXED_SCALE=0.25;window.JL_NORENDER=1;});
 const html='<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">'+fs.readFileSync(HTML,'utf8')+'</body></html>';
 await p.route('**/*',async route=>{const u=route.request().url();
   if(u.startsWith('http://local/')&&!u.includes('/assets/')) return route.fulfill({contentType:'text/html',body:html});
   const m=u.match(/three@0\.147\.0\/(.*)$/); if(m) return route.fulfill({contentType:'application/javascript',body:fs.readFileSync(three+m[1])});
   return route.abort();});
 const errs=[];p.on('console',m=>{if(m.type()==='log')console.log('  [page]',m.text().slice(0,300)); if((m.type()==='error')&&!/ERR_FAILED/.test(m.text()))errs.push(m.type()+': '+m.text().slice(0,400));});p.on('pageerror',e=>errs.push('PAGEERR '+e.message+'\n'+(e.stack||'').slice(0,600)));
 await p.goto('http://local/');
 await p.waitForFunction(()=>window.JL&&JL.debug&&JL.debug.sim,null,{timeout:120000});
 await p.evaluate(()=>document.getElementById('start').click());
 const script=fs.readFileSync(process.argv[2],'utf8');
 const r=await p.evaluate(script);
 console.log(JSON.stringify(r,null,0));
 console.log(errs.slice(0,15).join('\n')||'no errors');
 await b.close();
})();
