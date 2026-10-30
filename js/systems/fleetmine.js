/* ============================================================================
   systems/fleetmine.js — Misiones de minería de la flota.
   ----------------------------------------------------------------------------
   · Una nave de tu flota enviada a minar SALE de verdad desde donde esté (a tu lado o en otra base) y se
     mueve con la misma física y la misma velocidad que cuando la llamas o la mandas a una base (sin saltos):
        ir al campo → minar (rayo de minería sobre una roca) → ir a la base → descargar → repetir.
   · Modos de carga: vender el crudo, fundirlo en Estación Umbral y vender los lingotes, o guardarlo en el
     almacén común. El dinero se ingresa a tu cuenta al descargar.
   · Se rige por el mismo nivel de minería que tú para el titanio, el iridio y la neutronita, y respeta la
     presión del exterior (sin refuerzo anti-implosión no entra en la zona de implosión).
   · Multijugador: la posición de cada nave ya viaja en mpWg; aquí se añade el punto de minado (w.mb) y el
     mineral, y TODOS los clientes dibujan el mismo rayo y la misma roca (la roca se deduce de ese punto,
     sin depender de los asteroides que cada cliente tenga cargados), así que todos ven lo mismo.
   · Script clásico: comparte el ámbito global.
   ========================================================================== */
"use strict";
const FMD={fe:1,cu:1.1,cr:1.4,pt:1.9,ti:2.4,ir:3.2,ne:4.5};
const FMM={sell:['Vender crudo','Descarga en la base más cercana y vende el mineral crudo al mercado.'],cook:['Fundir y vender','Lleva el mineral a Estación Umbral, lo funde y vende los lingotes (mejor precio).'],store:['Guardar en almacén','Descarga en la base más cercana y lo guarda en el almacén común.']};
const fmLv=()=>Math.max(0,...TYPES.filter(t=>t.own).map(t=>(t.lv&&t.lv.min)||0));
const fmSafe=b=>b.n!=='Base Beta'&&(b.n.indexOf('Omega')<0||QX.card);
const fmUmbral=()=>BASES.find(b=>b.n==='Estación Umbral');
const fmBlocked=(F,w)=>{const p=F.ring?fmSpot(F,w):{x:F.x,y:F.y};return typeof impLv==='function'&&impLv(p.x,p.y)===2&&!(w&&w.imp)};
function fmFieldsFor(k,w){const L=FIELDS.filter(F=>F.tb&&F.tb.some(t=>t[0]===k)),ok=L.filter(F=>!fmBlocked(F,w));ok.sort((a,b)=>fmFD(a,w)-fmFD(b,w));ok.blocked=L.length>0&&!ok.length;return ok}
const fmFD=(F,w)=>{if(!w)return 0;if(F.ring){const p=fmSpot(F,w);return dist(w,p)}return dist(w,F)};
function fmSpot(F,w){if(F.ring){const a=w?Math.atan2(w.y,w.x):rnd(0,TAU),r=F.rr(a);return{x:Math.cos(a)*r,y:Math.sin(a)*r}}if(F.smp){const q=F.smp();return{x:q[0],y:q[1]}}return{x:F.x+rnd(-1,1)*F.r*.6,y:F.y+rnd(-1,1)*F.r*.6}}
function fmSpu(k,F){if(!F)return 0;const wt=(F.tb.find(t=>t[0]===k)||[0,.2])[1],ms=.55*(1+.25*fmLv());return FMD[k]/(ms*(wt/.3))}   // segundos por unidad
const fmCap=w=>(TYPES[w.ti]&&TYPES[w.ti].cargo)||30;
function fmLbl(w){const m=w.fm;if(!m)return'';const k=MIN[m.k][0].toLowerCase(),b=m.dst?m.dst.n.replace('Base ','').replace('Estación ',''):'';
  return({go:'Rumbo al campo de '+k,mine:'Minando '+k+' ('+m.cargo+'/'+m.cap+')',back:'Llevando '+k+' a '+b,unload:'Descargando en '+b,home:'Volviendo a '+b})[m.ph]||'En misión'}
function fmStart(w,k,mode){if(!w||!w.own||w.hp<=0||w.fm&&w.st==='mine')return;
  if((MIN[k][3]||0)>fmLv())return toast('Necesitas Sistema de minería nv.'+MIN[k][3]+' en alguna de tus naves');
  if(w.hp<w.max*.5)return toast(w.n+' está muy dañada: repárala antes');
  const fs=fmFieldsFor(k,w);if(!fs.length)return toast('No hay un campo accesible con '+MIN[k][0].toLowerCase()+(fs.blocked?': queda fuera del aro y necesita refuerzo anti-implosión':''));
  if(mode==='cook'&&!(fmUmbral()&&fmSafe(fmUmbral())))return toast('Estación Umbral no está disponible');
  w.st='mine';w.esc=null;w.rescue=null;w.fm={k,mode,ph:'go',cargo:0,cg:0,cap:fmCap(w),earn:0,cyc:0,t:0,F:fs[0],rock:null,hov:null,dst:null,stop:0};
  toast(w.n+' sale a minar '+MIN[k][0].toLowerCase()+' en '+fs[0].n);qEv('wgf')}
function fmStop(w){const m=w.fm;if(!m)return;m.stop=1;if(m.ph==='go'||m.ph==='mine'){if(m.cargo>0){m.ph='back';m.dst=null}else{m.ph='home';m.dst=null}}toast(w.n+' termina la ruta')}
/* ----- movimiento: el mismo sistema que cuando llamas a una nave o la mandas a una base ----- */
/* vuela a su propia velocidad (sin saltos), con el mismo giro, aceleración, frenado y esquiva de obstáculos;
   al ser movimiento normal, el resto de jugadores la ven viajar (mpWg ya transmite posición y rumbo) */
function fmGo(w,tx,ty,dt,stop){const dx=tx-w.x,dy=ty-w.y,d=Math.hypot(dx,dy),cp=w.spd*1.1;
  if(d<=stop+60){const kk=Math.min(1,3*dt);let gx=dx*2.2,gy=dy*2.2;const gl=Math.hypot(gx,gy);if(gl>cp){gx*=cp/gl;gy*=cp/gl}w.vx+=(gx-w.vx)*kk;w.vy+=(gy-w.vy)*kk}   // llegada suave
  else{const sp=Math.min(w.spd,(d-stop)*1.4),vx=dx/d*sp,vy=dy/d*sp;wSteer(w,vx-w.vx,vy-w.vy,dt,2.4,cp)}
  const o=avoid(w,14,null);w.vx+=o[0]*700*dt;w.vy+=o[1]*700*dt;w.x+=w.vx*dt;w.y+=w.vy*dt;
  return d<=stop+25&&Math.hypot(w.vx,w.vy)<40}
function fmPickBase(w,m){if(m.mode==='cook'){const u=fmUmbral();if(u&&fmSafe(u))return u}let b=null,bd=1e18;for(const q of BASES){if(!fmSafe(q))continue;const d=dist(w,q);if(d<bd){bd=d;b=q}}return b||BASES[0]}
function fmNewRock(w,m){const near=m.rock;let q=null;for(let i=0;i<12;i++){const c=fmSpot(m.F,w);if(!near||dist(c,near)<1100){q=c;break}}q=q||fmSpot(m.F,w);m.rock=q;
  const a=Math.atan2(w.y-q.y,w.x-q.x);m.hov={x:q.x+Math.cos(a)*150,y:q.y+Math.sin(a)*150};m.rt=0}
function fmDeliver(w,m){const n=m.cargo;if(n<=0)return;const b=m.dst,k=m.k,nm=MIN[k][0].toLowerCase();let rev=0;
  if(m.mode==='store'){whAdd(k,n);toast(w.n+' guarda '+n+' de '+nm+' en el almacén común')}
  else if(m.mode==='cook'&&b&&b.n==='Estación Umbral'){QX.ig=QX.ig||{};QX.ingT=(QX.ingT|0)+n;rev=mkSellN('i_'+k,n,b);toast('🔥 '+w.n+' funde '+n+' de '+nm+' y vende los lingotes: +'+rev+' cr')}
  else{rev=mkSellN(k,n,b);toast(w.n+' vende '+n+' de '+nm+' en '+b.n+': +'+rev+' cr');qEv('del',b.n,{[k]:n})}
  if(rev){ship.cred+=rev;m.earn+=rev;qEv('sell',rev)}m.cargo=0;m.cyc++;try{saveGame()}catch(e){}}
function fmUpd(w,dt){const m=w.fm;if(!m){w.st='base';return}w.mb=null;m.t+=dt;
  if(w.hp<w.max*.4&&(m.ph==='go'||m.ph==='mine')){m.ph=m.cargo>0?'back':'home';m.dst=null;m.stop=1;toast('⚠ '+w.n+' está dañada y vuelve a la base')}
  if(m.ph==='go'){
    if(!m.rock){m.F=fmFieldsFor(m.k,w)[0]||m.F;fmNewRock(w,m)}
    const arr=fmGo(w,m.hov.x,m.hov.y,dt,40);if(arr||dist(w,m.hov)<70){m.ph='mine';m.mt=0}}
  else if(m.ph==='mine'){
    const R=m.rock,ha=Math.atan2(R.y-w.y,R.x-w.x);fmGo(w,m.hov.x,m.hov.y,dt,16);w.a+=angDiff(w.a,ha)*Math.min(1,4*dt);
    if(dist(w,m.hov)<90){w.mb=[R.x,R.y];m.cg+=dt/fmSpu(m.k,m.F);while(m.cg>=1&&m.cargo<m.cap){m.cg-=1;m.cargo++}
      m.rt+=dt;if(m.rt>30&&m.cargo<m.cap)fmNewRock(w,m)}
    if(m.cargo>=m.cap){m.ph='back';m.dst=null;w.mb=null}}
  else if(m.ph==='back'||m.ph==='home'){
    if(!m.dst)m.dst=fmPickBase(w,m);const b=m.dst,arr=fmGo(w,b.x+Math.cos(w.oa||0)*(b.r+300),b.y+Math.sin(w.oa||0)*(b.r+300),dt,40);
    if(arr||dist(w,b)<b.r+420){if(m.ph==='home'){w.st='base';w.hb=b;w.fm=null;toast(w.n+' espera en '+b.n)}else{m.ph='unload';m.u=0}}}
  else if(m.ph==='unload'){const b=m.dst;fmGo(w,b.x+Math.cos(w.oa||0)*(b.r+300),b.y+Math.sin(w.oa||0)*(b.r+300),dt,40);m.u+=dt;
    if(m.u>=5){fmDeliver(w,m);if(m.stop||w.hp<w.max*.4){w.st='base';w.hb=b;const e=m.earn,c=m.cyc;w.fm=null;toast(w.n+' termina la ruta: '+c+' viaje'+(c===1?'':'s')+', +'+e+' cr')}else{m.ph='go';m.rock=null;m.dst=null}}}}
/* mineral que quedó a bordo si la misión se cancela (llamar, enviar a base…): se descarga al llegar */
function fmTick(dt){for(const w of wing){if(!w.fm||w.st==='mine')continue;w.mb=null;const m=w.fm;
  if(m.cargo<=0){w.fm=null;continue}
  const nb=BASES.find(b=>dist(w,b)<b.r+450),nearMe=w.st==='follow'&&dist(w,ship)<350;
  if(nb||nearMe){whAdd(m.k,m.cargo);toast(w.n+' deja '+m.cargo+' de '+MIN[m.k][0].toLowerCase()+' en el almacén común');w.fm=null}}}
/* ----- dibujo: rayo de minería y roca (idéntico para todos los jugadores) ----- */
function fmBeam(x0,y0,a,bx,by,k,seed){const col=(MIN[k]&&MIN[k][1])||'#ffb86b',pu=.55+.45*Math.sin(time*18+seed);
  g.save();g.globalCompositeOperation='lighter';g.lineCap='round';const sx=x0+Math.cos(a)*16,sy=y0+Math.sin(a)*16;
  g.strokeStyle='rgba(255,200,120,'+.25*pu+')';g.lineWidth=7;g.beginPath();g.moveTo(sx,sy);g.lineTo(bx,by);g.stroke();
  g.strokeStyle=col;g.globalAlpha=.8*pu;g.lineWidth=2.2;g.beginPath();g.moveTo(sx,sy);g.lineTo(bx,by);g.stroke();g.restore();
  /* roca (forma determinista a partir de su posición: igual en todos los clientes) */
  const h=Math.imul((bx|0)*73856093^(by|0)*19349663,2654435761)>>>0,n=9;g.save();g.translate(bx,by);g.beginPath();
  for(let i=0;i<n;i++){const aa=i/n*TAU,r=22*(.72+.5*(((h>>>(i*3))&7)/7));i?g.lineTo(Math.cos(aa)*r,Math.sin(aa)*r):g.moveTo(Math.cos(aa)*r,Math.sin(aa)*r)}
  g.closePath();g.fillStyle='#2a2d36';g.fill();g.strokeStyle='#6c7385';g.lineWidth=1.6;g.stroke();g.fillStyle=col;g.globalAlpha=.5+.3*pu;g.beginPath();g.arc(-4,-3,4,0,TAU);g.fill();g.restore();
  g.save();g.fillStyle=col;for(let i=0;i<3;i++){const r=14+((time*40+i*17+seed)%22),aa=((time*3+i*2.1+seed)%TAU);g.globalAlpha=.7*(1-(r-14)/22);g.fillRect(bx+Math.cos(aa)*r-1,by+Math.sin(aa)*r-1,2,2)}g.restore()}
function fmDraw(){for(const w of wing)if(w.mb&&w.hp>0&&vis(w.x,w.y,400))fmBeam(w.x,w.y,w.a,w.mb[0],w.mb[1],w.fm?w.fm.k:'fe',w.x*.01);
  if(typeof MPR!=='undefined')for(const k in MPR){const r=MPR[k];if(r.wgs&&performance.now()-r.t<5000)for(const o of r.wgs)if(o.mb&&vis(o.x,o.y,400))fmBeam(o.x,o.y,o.a,o.mb[0],o.mb[1],o.mk||'fe',o.x*.01)}}

/* ----- menú de información de la nave (el que se abre desde la F o con clic derecho): desplegable «Enviar a minar» ----- */
const FMI={w:null,m:0,k:'fe',mode:'sell'};
function fmInfoUI(w){if(!w.own||w.st==='guard'||w.svc)return'';if(FMI.w!==w){FMI.w=w;FMI.m=0}
  const m=w.fm&&w.st==='mine'?w.fm:null,B='position:static;width:100%;margin-top:8px',sb='position:static;width:auto;padding:6px 8px;font-size:11px;margin:0';
  let h='<button class="sq'+(FMI.m?' on':'')+'" data-k="m" style="'+B+'">Enviar a minar… '+(FMI.m?'▲':'▼')+'</button>';if(!FMI.m)return h;
  if(m)return h+'<div class=card2 style="margin:4px 0"><b style="color:#ffb86b">En misión</b><div style="margin:4px 0">'+fmLbl(w)+'</div><div class=kv><span style="opacity:.7">Mineral</span><b>'+MIN[m.k][0]+'</b></div><div class=kv><span style="opacity:.7">Carga</span><b>'+m.cargo+' / '+m.cap+'</b></div><div class=kv><span style="opacity:.7">Ganado</span><b>'+m.earn+' cr</b></div>'+(m.stop?'<div style="opacity:.7;margin-top:6px">Terminando la ruta…</div>':'<button class="sq" data-k="ms" style="'+B+'">Terminar ruta</button>')+'</div>';
  const lv=fmLv(),fs=fmFieldsFor(FMI.k,w),fld=fs[0],spu=fmSpu(FMI.k,fld);
  h+='<div class=card2 style="margin:4px 0"><div style="opacity:.7;margin-bottom:4px">Mineral</div><div style="display:flex;flex-wrap:wrap;gap:4px">'+Object.keys(MIN).map(k=>{const ok=(MIN[k][3]||0)<=lv;return '<button class="sq'+(k===FMI.k?' on':'')+'" data-k="mm" data-m="'+k+'"'+(ok?'':' disabled')+' style="'+sb+'">'+MIN[k][0]+(ok?'':' 🔒')+'</button>'}).join('')+'</div>'
   +'<div style="opacity:.7;margin:8px 0 4px">Qué hacer con la carga</div><div style="display:flex;flex-wrap:wrap;gap:4px">'+Object.keys(FMM).map(k=>'<button class="sq'+(k===FMI.mode?' on':'')+'" data-k="md" data-m="'+k+'" style="'+sb+'">'+FMM[k][0]+'</button>').join('')+'</div><div style="opacity:.7;font-size:11px;margin-top:4px">'+FMM[FMI.mode][1]+'</div>'
   +(fld?'<div class=kv style="margin-top:8px"><span style="opacity:.7">Campo</span><b>'+fld.n+'</b></div><div class=kv><span style="opacity:.7">Viaje de ida</span><b>'+Math.ceil(fmFD(fld,w)/w.spd/60*10)/10+' min</b></div><div class=kv><span style="opacity:.7">Ritmo</span><b>'+(60/spu).toFixed(1)+' uds/min</b></div>':'<div style="color:#ff6b6b;margin-top:8px">No hay un campo accesible para este mineral'+(fs.blocked?': queda fuera del aro y necesita refuerzo anti-implosión':'')+'.</div>')
   +'<button class="sq" data-k="mg" style="'+B+';color:#ffb86b"'+(fld&&(MIN[FMI.k][3]||0)<=lv?'':' disabled')+'>Enviar a minar '+MIN[FMI.k][0].toLowerCase()+'</button></div>';
  return h}
function fmInfoClick(k,b){const w=aiW;if(!w)return false;
  if(k==='m'){FMI.m=FMI.m?0:1;return true}if(k==='mm'){FMI.k=b.dataset.m;return true}if(k==='md'){FMI.mode=b.dataset.m;return true}
  if(k==='mg'){fmStart(w,FMI.k,FMI.mode);FMI.m=0;if(wOpen)wRender();return true}if(k==='ms'){fmStop(w);return true}return false}
