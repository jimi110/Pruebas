/* ============================================================================
   systems/planets.js — Planetas de StarLuge (script clásico: comparte ámbito global)
   ----------------------------------------------------------------------------
   · Los PLANETAS se declaran en el JSON de cada región (clave "planets"); aquí solo viven los TIPOS
     de planeta (registro PLN.addType) y toda la lógica: dibujo, escaneo, menú, órbita, aterrizaje,
     superficie, meteoritos y zoom de aproximación.
   · AÑADIR UN TIPO NUEVO: PLN.addType('lava',{...}) (mira los de más abajo como plantilla).
     Campos: label, cls, col, landable, atm, albedo(), cloud, ground{pal,pick,deco}, descent, meteor.
   · AÑADIR UN PLANETA: una entrada en "planets" de region-expansion-XX.json (id, n, type, x, y, r, seed…).
   · Todo es determinista (semilla del planeta) y falla en silencio: si algo se rompe, el juego sigue.
   ========================================================================== */
"use strict";
const PLN=(function(){
const PI2=Math.PI*2,cl=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t,sm=t=>t*t*(3-2*t);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const num=(v,d)=>Number.isFinite(+v)?+v:d;
const mulb=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const hx=s=>{s=String(s);let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
const hc=(a,b,s)=>{let h=Math.imul(a|0,374761393)^Math.imul(b|0,668265263)^Math.imul(s|0,2147483647);h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296};

/* ---- parámetros de ajuste ---- */
const SCAN_RANGE=22000;      // distancia a la superficie desde la que se puede escanear
const SCAN_T=6;              // segundos de escaneo
const ORB_ALT=2400;          // altura de la órbita sobre la superficie
const LAND_ALT=3600;         // por debajo de esta altura empieza la animación de aterrizaje
const ZONE=26000;            // distancia a la superficie a la que empieza el zoom de aproximación
const ZMIN_NEAR=.007;         // zoom mínimo permitido junto al planeta (normal: .5)
const ZSOFT_NEAR=.12;        // zoom al que te lleva poco a poco la aproximación
const TIERS=[768,1536],TEXP=256;   // resoluciones progresivas de la textura (la previsualización sale al instante)

/* ---- ruido 3D (Perlin) con semilla ---- */
function mkNoise(seed){
  const r=mulb(seed|0),p=new Uint8Array(512),q=new Uint8Array(256);for(let i=0;i<256;i++)q[i]=i;
  for(let i=255;i>0;i--){const j=(r()*(i+1))|0,t=q[i];q[i]=q[j];q[j]=t}for(let i=0;i<512;i++)p[i]=q[i&255];
  const fade=t=>t*t*t*(t*(t*6-15)+10);
  function grad(h,x,y,z){h&=15;const u=h<8?x:y,v=h<4?y:(h===12||h===14?x:z);return((h&1)?-u:u)+((h&2)?-v:v)}
  function n(x,y,z){const X=Math.floor(x),Y=Math.floor(y),Z=Math.floor(z),xi=X&255,yi=Y&255,zi=Z&255;x-=X;y-=Y;z-=Z;
    const u=fade(x),v=fade(y),w=fade(z),A=p[xi]+yi,AA=p[A]+zi,AB=p[A+1]+zi,B=p[xi+1]+yi,BA=p[B]+zi,BB=p[B+1]+zi;
    return lerp(lerp(lerp(grad(p[AA],x,y,z),grad(p[BA],x-1,y,z),u),lerp(grad(p[AB],x,y-1,z),grad(p[BB],x-1,y-1,z),u),v),
      lerp(lerp(grad(p[AA+1],x,y,z-1),grad(p[BA+1],x-1,y,z-1),u),lerp(grad(p[AB+1],x,y-1,z-1),grad(p[BB+1],x-1,y-1,z-1),u),v),w)}
  const R={n,ex:0};
  function fbm(x,y,z,o){o+=R.ex;let s=0,a=1,f=1,t=0;for(let i=0;i<o;i++){s+=a*n(x*f,y*f,z*f);t+=a;a*=.5;f*=2.03}return s/t}
  R.fbm=fbm;return R}
const mix3=(o,a,b,t)=>{o[0]=a[0]+(b[0]-a[0])*t;o[1]=a[1]+(b[1]-a[1])*t;o[2]=a[2]+(b[2]-a[2])*t};

/* ============================== REGISTRO DE TIPOS ============================== */
const TY={};
function addType(id,def){TY[id]=Object.assign({id,label:id,cls:'Rocoso',col:'#8aa',landable:true,atm:null,cloud:null,meteor:1,
  descent:{flame:1,haze:'200,225,255'},ground:null,info:[]},def);return TY[id]}

/* Terrestre: océanos, continentes, casquetes polares y nubes */
addType('terran',{label:'Terrestre',cls:'Rocoso',col:'#4a8fd0',landable:true,
  atm:{col:'110,175,255',h:.035},cloud:{cov:.9,sc:2.6},descent:{flame:1,haze:'190,220,255'},
  comp:'Rocoso con océanos de agua líquida',
  albedo(P,N,o,pl,cl_){const x=P[0],y=P[1],z=P[2],lat=Math.abs(y);
    let e=N.fbm(x*1.7+3.1,y*1.7,z*1.7,6)+.25*N.fbm(x*.6,y*.6+7,z*.6,2);const sea=-.02,m=N.fbm(x*2.2+9,y*2.2,z*2.2+4,3);
    if(e<sea){mix3(o,[40,125,170],[7,26,78],cl(((sea-e)/.45)*1.8,0,1));o.spec=1}
    else{const h=e-sea;o.spec=0;
      if(h<.018)mix3(o,[214,200,150],[190,176,120],h/.018);
      else{mix3(o,[70,128,56],[22,72,36],cl(m*1.6+.5,0,1));if(m<-.18)mix3(o,o,[168,142,86],cl((-.18-m)*4,0,1)*(1-lat));
        if(h>.30)mix3(o,o,[112,102,94],cl((h-.30)*9,0,1));if(h>.44)mix3(o,o,[238,242,248],cl((h-.44)*10,0,1))}}
    const cap=.8+.09*N.n(x*4,y*4,z*4);if(lat>cap)mix3(o,o,[236,243,251],cl((lat-cap)*14,0,1));
    const c=N.fbm(x*2.6+17,y*2.6+5,z*2.6+11,5);cl_.a=cl((c-.03)*3.2,0,1)*.88},
  ground:{pal:[['#1d4f8f',1],['#3a8cc4',0],['#d8c88a',0],['#5a9a45',0],['#2f6e3a',0],['#7d776f',0],['#e8eef5',0]],
    pick:(h,m,lat)=>h<-.12?0:h<-.02?1:h<.03?2:h>.45?6:h>.3?5:lat>.82?6:m>.1?4:3,
    deco:[{k:4,p:.38,t:'tree'},{k:3,p:.05,t:'bush'},{k:5,p:.22,t:'rock'},{k:2,p:.02,t:'rock'}]}});

/* Desértico: dunas, cañones y atmósfera polvorienta */
addType('desert',{label:'Desértico',cls:'Rocoso',col:'#d89850',landable:true,
  atm:{col:'255,190,120',h:.022},cloud:{cov:.35,sc:3.2,col:[255,226,190]},descent:{flame:1,haze:'255,210,160'},
  comp:'Rocoso seco con extensas dunas',
  albedo(P,N,o,pl,cl_){const x=P[0],y=P[1],z=P[2],d=N.fbm(x*3,y*3,z*3,5),e=N.fbm(x*1.3+5,y*1.3,z*1.3,5),b=Math.sin((x*6+d*5)+(y*2))*.5+.5;
    mix3(o,[190,128,70],[226,178,108],b*.7+cl(e+.4,0,1)*.3);if(e>.22)mix3(o,o,[128,84,58],cl((e-.22)*5,0,1));
    if(e<-.28)mix3(o,o,[90,58,40],cl((-.28-e)*6,0,1)*.7);o.spec=0;
    const c=N.fbm(x*3.2+4,y*3.2,z*3.2+8,4);cl_.a=cl((c-.12)*3,0,1)*.45},
  ground:{pal:[['#c58b4a',0],['#dba865',0],['#8a5b3b',0],['#4a2f22',1],['#ecc88a',0]],
    pick:(h,m)=>h>.42?2:h<-.3?3:m>.15?4:h>.05?0:1,deco:[{k:2,p:.2,t:'rock'},{k:0,p:.03,t:'spire'}]}});

/* Helado: casquete continuo, grietas y hielo azul */
addType('ice',{label:'Helado',cls:'Rocoso',col:'#bcd8f0',landable:true,
  atm:{col:'180,215,255',h:.018},cloud:{cov:.25,sc:2.2},descent:{flame:1,haze:'220,236,255'},
  comp:'Rocoso cubierto de hielo y nieve',
  albedo(P,N,o,pl,cl_){const x=P[0],y=P[1],z=P[2],e=N.fbm(x*2,y*2,z*2,5),r=1-Math.abs(N.n(x*5,y*5,z*5))*2;
    mix3(o,[232,242,250],[150,190,224],cl(e+.5,0,1)*.7);if(r>.93)mix3(o,o,[40,80,130],cl((r-.93)*14,0,1)*.8);
    if(e<-.25)mix3(o,o,[96,150,206],cl((-.25-e)*4,0,1));o.spec=.4;
    const c=N.fbm(x*2.2+1,y*2.2,z*2.2+3,4);cl_.a=cl((c-.1)*2.6,0,1)*.6},
  ground:{pal:[['#cfe3f3',0],['#f2f7fb',0],['#8fb6d9',0],['#1c3550',1],['#6c7885',0]],
    pick:(h,m)=>h<-.32?3:h>.4?4:m>.1?2:h>.0?1:0,deco:[{k:2,p:.08,t:'crystal'},{k:4,p:.2,t:'rock'}]}});

/* Gaseoso: bandas, tormentas; sin superficie (no se puede aterrizar) */
addType('gas',{label:'Gaseoso',cls:'Gigante gaseoso',col:'#d8b078',landable:false,
  atm:{col:'255,210,150',h:.03},cloud:null,meteor:0,pal:[[226,190,140],[190,140,96],[240,222,186],[158,108,76],[212,170,120]],
  comp:'Gigante gaseoso sin superficie sólida',
  albedo(P,N,o,pl){const x=P[0],y=P[1],z=P[2],w=N.fbm(x*3,y*1.2,z*3,4)*.35,b=(Math.sin((y+w)*15+pl.seed*.01)*.5+.5)*(.8+.2*N.n(x*.8,y*9,z*.8)),pal=this.pal,
      f=cl(b,0,.999)*(pal.length-1),i=f|0;mix3(o,pal[i],pal[i+1],f-i);
    const sx=x-.35,sy=y+.28,sz=z-.4,s=Math.exp(-((sx*sx)*9+(sy*sy)*60+sz*sz*9));if(s>.02)mix3(o,o,[170,70,50],cl(s*1.6,0,.8));o.spec=0}});

const T_=id=>TY[id]||TY.terran;

/* ============================== NORMALIZACIÓN DE PLANETAS (los llama regions.js) ============================== */
function norm(q,rg){
  if(!q||typeof q!=='object'||!/^[\w-]{1,40}$/.test(q.id)||!Number.isFinite(+q.x)||!Number.isFinite(+q.y))return null;
  const ty=T_(q.type),sd=num(q.seed,hx(q.id))|0,rr=mulb(hx(q.id+':'+sd));
  const p={id:q.id,rg,n:String(q.n||q.id).slice(0,40),type:ty.id,x:+q.x,y:+q.y,r:cl(num(q.r,40000),800,300000),seed:sd,
    desc:q.desc?String(q.desc).slice(0,400):'',
    grav:+(num(q.grav,.6+rr()*.8)).toFixed(2),temp:Math.round(num(q.temp,ty.id==='ice'?-40:ty.id==='desert'?46:ty.id==='gas'?-110:15)),
    atm:q.atm!=null?String(q.atm).slice(0,60):(ty.atm?'Atmósfera densa':'Ninguna'),day:String(q.day||(8+((rr()*30)|0))+' h').slice(0,20),
    comp:String(q.comp||ty.comp||ty.cls).slice(0,80),
    sun:Number.isFinite(+q.sun)?+q.sun:Math.atan2(-(+q.y),-(+q.x))};
  if(q.ring&&typeof q.ring==='object'){const R=q.ring,a=cl(num(R.in,1.3),1.05,2.5);p.ring={in:a,out:cl(num(R.out,a+.35),a+.05,3),ry:cl(num(R.ry,.3),.08,.9),tilt:num(R.tilt,-.35),gap:[num(R.gapAt,0),cl(num(R.gap,.5),0,2.5)],
    col:/^\d{1,3},\d{1,3},\d{1,3}$/.test(R.col)?R.col:'205,190,165',n:cl(num(R.count,0)|0,0,20000),tier:cl(num(R.tier,3)|0,0,4),ore:Array.isArray(R.ore)?R.ore:null}}
  return p}

/* ============================== TEXTURAS PROCEDURALES ============================== */
const TX=new Map();           // id -> {prev,full,job,ph}
function lightDir(p){const a=p.sun,l=[Math.cos(a)*.78,Math.sin(a)*.78,.62],n=Math.hypot(l[0],l[1],l[2]);return[l[0]/n,l[1]/n,l[2]/n]}
function genStep(job,budget){                      // pinta filas (reparte el trabajo entre fotogramas); sirve para la textura base y para las losas de detalle
  const t0=performance.now(),{W,S0,pad,u0,v0,du,p,ty,N,L,data,o,c,tilt}=job,d=data.data,ct=Math.cos(tilt[0]),st=Math.sin(tilt[0]),ct2=Math.cos(tilt[1]),st2=Math.sin(tilt[1]),P=[0,0,0],px=S0/du;
  N.ex=job.ex||0;
  while(job.y<W){const j=job.y++,v=v0+((j-pad)+.5)/S0*du;
    for(let i=0;i<W;i++){const u=u0+((i-pad)+.5)/S0*du,r2=u*u+v*v,k=(j*W+i)*4;
      if(r2>=1.02){d[k+3]=0;continue}
      const w=Math.sqrt(Math.max(0,1-r2)),x0=u,y0=v,z0=w;
      const x1=x0*ct-y0*st,y1=x0*st+y0*ct,z1=z0;P[0]=x1;P[1]=y1*ct2-z1*st2;P[2]=y1*st2+z1*ct2;
      c.a=0;o.spec=0;ty.albedo(P,N,o,p,c);
      const lam=cl(u*L[0]+v*L[1]+w*L[2],0,1),lit=.07+.93*Math.pow(lam,.85);
      let R=o[0]*lit,G=o[1]*lit,B=o[2]*lit;
      if(o.spec&&lam>0){const h=Math.pow(cl(lam,0,1),28)*70;R+=h;G+=h;B+=h}
      if(c.a>0){const cc=ty.cloud&&ty.cloud.col||[255,255,255],a=c.a;R=R*(1-a)+cc[0]*lit*a;G=G*(1-a)+cc[1]*lit*a;B=B*(1-a)+cc[2]*lit*a}
      const ed=Math.sqrt(r2),al=cl((1-ed)*px*1.1,0,1);
      d[k]=R;d[k+1]=G;d[k+2]=B;d[k+3]=al*255}
    if((j&7)===7&&performance.now()-t0>budget)return false}
  return true}
function mkJob(p,S){const ty=T_(p.type),cv=document.createElement('canvas');cv.width=cv.height=S;
  const cx=cv.getContext('2d');return{S,W:S,S0:S,pad:0,u0:-1,v0:-1,du:2,ex:0,p,ty,N:noiseOf(p),L:lightDir(p),data:cx.createImageData(S,S),cx,cv,o:[0,0,0],c:{a:0},y:0,tilt:tiltOf(p)}}
const NZ=new Map(),noiseOf=p=>{let n=NZ.get(p.id);if(!n){n=mkNoise(p.seed);NZ.set(p.id,n)}return n},tiltOf=p=>{const r=mulb(hx(p.id+':tilt'+p.seed));return[r()*PI2,(r()-.5)*1.1]};
function texOf(p){let t=TX.get(p.id);
  if(!t){const j=mkJob(p,TEXP);genStep(j,1e9);j.cx.putImageData(j.data,0,0);t={prev:j.cv,full:null,job:null,done:false,ti:0};TX.set(p.id,t);
    if(TX.size>6){const k=TX.keys().next().value;if(k!==p.id)TX.delete(k)}}
  return t.full||t.prev}
function texStep(p,budget){const t=TX.get(p.id);if(!t||t.done)return;
  if(!t.job)t.job=mkJob(p,TIERS[t.ti]);
  if(genStep(t.job,budget)){t.job.cx.putImageData(t.job.data,0,0);t.full=t.job.cv;t.job=null;if(++t.ti>=TIERS.length)t.done=true}}
/* ---- LOSAS DE DETALLE: la superficie se vuelve a calcular a la resolución de pantalla (cuadrícula de losas de 256 px por nivel).
       Al acercarte aparecen losas más finas sin límite práctico: es ruido procedural, no una imagen fija. ---- */
const TL=new Map(),WANT=new Map(),LMAX=9;let tAct=null,frameN=0;
function tileWant(p,L,i,j,pr){const k=p.id+'|'+L+'|'+i+'|'+j,t=TL.get(k);if(t&&t.cv){t.u=frameN;return t.cv}if(!t&&!WANT.has(k))WANT.set(k,{p,L,i,j,k,pr});else if(WANT.has(k))WANT.get(k).pr=Math.min(WANT.get(k).pr,pr);if(t)t.u=frameN;return null}
function tileStep(budget){
  const t0=performance.now();
  if(tAct&&!WANT.has(tAct.k)&&tAct.job.y<tAct.job.W*.5)tAct=null;           // la losa en curso ya no se ve: se abandona
  while(performance.now()-t0<budget){
    if(!tAct){let b=null;for(const w of WANT.values())if(!TL.has(w.k)&&(!b||w.pr<b.pr))b=w;if(!b)return;
      const p=b.p,n=1<<b.L,du=2/n,job=mkJob(p,1);job.S=job.W=260;job.S0=256;job.pad=2;job.u0=-1+b.i*du;job.v0=-1+b.j*du;job.du=du;job.ex=Math.min(6,b.L-2);
      job.cv.width=job.cv.height=260;job.data=job.cx.createImageData(260,260);tAct={k:b.k,job,L:b.L,i:b.i,j:b.j};TL.set(b.k,{cv:null,u:frameN})}
    if(genStep(tAct.job,Math.max(1,budget-(performance.now()-t0)))){tAct.job.cx.putImageData(tAct.job.data,0,0);const t=TL.get(tAct.k);if(t){t.cv=tAct.job.cv;t.u=frameN}tAct=null;
      if(TL.size>150){let old=null;for(const[k,t2]of TL)if(t2.cv&&frameN-t2.u>120&&(!old||t2.u<old[1].u))old=[k,t2];if(old)TL.delete(old[0])}}
    else return}}
function drawTiles(p,x,y,r,Lt){
  const n=1<<Lt,vr=VRd+10,uMin=(cam.x-vr-x)/r,uMax=(cam.x+vr-x)/r,vMin=(cam.y-vr-y)/r,vMax=(cam.y+vr-y)/r,
    i0=cl(Math.floor((uMin+1)/2*n),0,n-1),i1=cl(Math.floor((uMax+1)/2*n),0,n-1),j0=cl(Math.floor((vMin+1)/2*n),0,n-1),j1=cl(Math.floor((vMax+1)/2*n),0,n-1);
  if((i1-i0+1)*(j1-j0+1)>120)return Lt>3?drawTiles(p,x,y,r,Lt-1):0;
  g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){
    const ua=-1+i*2/n,ub=ua+2/n,va=-1+j*2/n,vb=va+2/n,nx=cl(0,ua,ub),ny=cl(0,va,vb);if(nx*nx+ny*ny>1.02)continue;      // losa fuera del disco
    const cx_=(ua+ub)/2,cy_=(va+vb)/2,pr=Math.hypot(x+cx_*r-cam.x,y+cy_*r-cam.y);
    let L=Lt,ti=i,tj=j,cv=tileWant(p,L,ti,tj,pr);
    while(!cv&&L>3){L--;ti>>=1;tj>>=1;cv=tileWant(p,L,ti,tj,pr-(Lt-L)*1e9)||null}                 // mientras llega la losa fina se ve la del nivel anterior
    if(!cv)continue;
    const m=1<<L,dua=2/m,lu=-1+ti*dua,lv=-1+tj*dua,sx=((ua-lu)/dua)*256+2,sy=((va-lv)/dua)*256+2,sw=(2/n)/dua*256,tx=sw/(2/n)*r*(2/n)/256*0+0;
    const wx=x+ua*r,wy=y+va*r,ww=(ub-ua)*r,hh=(vb-va)*r,e=ww/Math.max(1,sw)*.5;
    g.drawImage(cv,sx-.5,sy-.5,sw+1,sw+1,wx-e,wy-e,ww+2*e,hh+2*e)}}
let detail=null;function detailPat(){if(detail)return detail;const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d'),im=x.createImageData(256,256),N=mkNoise(99);
  for(let j=0;j<256;j++)for(let i=0;i<256;i++){const a=i/256*PI2,b=j/256*PI2,v=N.fbm(Math.cos(a)*1.6,Math.sin(a)*1.6,Math.cos(b)*1.6+Math.sin(b)*1.6,4)*1.4+.5*N.n(Math.cos(a)*7,Math.sin(a)*7,Math.sin(b)*7),k=(j*256+i)*4,g8=cl(128+v*190,0,255);im.data[k]=im.data[k+1]=im.data[k+2]=g8;im.data[k+3]=255}
  x.putImageData(im,0,0);detail=g.createPattern(c,'repeat');return detail}

/* ============================== ESTADO Y LISTA DE PLANETAS ============================== */
const SV={};                                  // progreso por planeta: {sc:escaneado, ex:mapa explorado}
const sv=id=>SV[id]||(SV[id]={sc:0,ex:''});
let list=[],listT=-9;
function planets(){const t=performance.now();if(t-listT>300){listT=t;list=RGH(r=>r.planets())||[]}return list}
function nearest(){let b=null,bd=1e18,bz=1e18;for(const p of planets()){const dc=Math.hypot(ship.x-p.x,ship.y-p.y),d=dc-p.r,dz=dc-(p.ring?p.r*p.ring.out*1.05:p.r);if(dz<bz){bz=dz;bd=d;b=p}}return b?{p:b,d:bd,dz:bz}:null}
function planetAt(wx,wy){for(const p of planets()){const ty=T_(p.type);if(Math.hypot(wx-p.x,wy-p.y)<p.r*(1+(ty.atm?ty.atm.h:0)))return p}return null}

/* ============================== DIBUJO EN EL MUNDO ============================== */
/* ---- atmósfera vectorial: arcos concéntricos solo en la parte visible (nítida a cualquier zoom, sin degradados gigantes) ---- */
function arcWin(x,y,rr){const dx=cam.x-x,dy=cam.y-y,d=Math.hypot(dx,dy);if(Math.abs(d-rr)>VRd*1.1)return null;if(rr<VRd*2.4)return[0,PI2];
  const a=Math.atan2(dy,dx),hw=Math.min(Math.PI,Math.asin(Math.min(1,VRd*1.2/rr))+.03);return[a-hw,a+hw]}
function drawAtm(p,ty,x,y,r,ah){
  const col=ty.atm.col,lod=ah*zoom>60?1:ah*zoom>20?.6:.35,NS=lod>.9?10:6;g.save();g.lineCap='butt';
  const ring=(rr,w,A)=>{const win=arcWin(x,y,rr);if(!win)return;const span=(win[1]-win[0])/NS;g.lineWidth=w;
    for(let k=0;k<NS;k++){const a0=win[0]+k*span,lit=.5+.5*Math.cos(a0+span/2-p.sun),al=A*(.22+.78*lit);if(al<.004)continue;g.strokeStyle='rgba('+col+','+al+')';g.beginPath();g.arc(x,y,rr,a0-.0005,a0+span+.0005);g.stroke()}};
  const NO=Math.max(5,Math.round(18*lod));for(let i=0;i<NO;i++){const t=(i+.5)/NO;ring(r+ah*t,ah/NO*1.25,.5*Math.pow(1-t,2.2))}                 // brillo exterior hacia el espacio
  const NI=Math.max(3,Math.round(8*lod));for(let i=0;i<NI;i++){const t=(i+.5)/NI;ring(r-ah*.55*t,ah*.55/NI*1.25,.3*Math.pow(1-t,1.8))}             // velo interior del limbo
  ring(r,Math.max(1.6/zoom,r*.0006),.5);                                                                  // línea fina del limbo: separa planeta y atmósfera
  g.restore()}

/* ---- anillo del planeta: C inclinada con una abertura; la mitad trasera pasa por detrás del disco y la delantera por delante ---- */
const RD=new Map(),AST_={x:0,y:0,r:0,rot:0,sh:null,m:'',nm:1};
const inGap=(q,t)=>{const d=((t-q.gap[0]+Math.PI)%PI2+PI2)%PI2-Math.PI;return Math.abs(d)<q.gap[1]/2};
function ringPt(p,t,k){const q=p.ring,rr=k*p.r,ex=Math.cos(t)*rr,ey=Math.sin(t)*rr*q.ry,c=Math.cos(q.tilt),s_=Math.sin(q.tilt);return[p.x+ex*c-ey*s_,p.y+ex*s_+ey*c]}
function ringDecor(p){let d=RD.get(p.id);if(d)return d;const q=p.ring,rg=mulb(hx(p.id+':ringdecor')),o={back:[],front:[]};
  for(let n=0;n<14000&&(o.back.length<1700||o.front.length<1500);n++){const t=rg()*PI2;if(inGap(q,t))continue;const fr=Math.sin(t)>=0,arr=fr?o.front:o.back;if(arr.length>=(fr?1500:1700))continue;
    const k=q.in+(q.out-q.in)*rg(),[x,y]=ringPt(p,t,k),sz=12+rg()*rg()*46,sh=[];for(let v=0;v<9;v++)sh.push(.75+rg()*.4);arr.push([x,y,sz,null,rg()*PI2,sh])}
  RD.set(p.id,o);return o}
function ringDust(p,front){
  /* El anillo se rellena como franjas de corona (polígonos exactos): el grosor es correcto en cualquier orientación,
     sin huecos en los extremos ni juntas entre la mitad trasera y la delantera (la delantera se solapa un pelo). */
  const q=p.ring,ty_=T_(p.type),ahh=ty_.atm?p.r*ty_.atm.h:0;
  if(front&&!vis(p.x,p.y,p.r+ahh))return;
  const vr=VRd*1.4+2500+(q.out-q.in)*p.r,g0=q.gap[1]>0?q.gap[1]:0,t0=front?0:q.gap[0]+g0/2,span=front?Math.PI:PI2-g0,NB=zoom<.03?8:16,   // trasera: el anillo ENTERO de una pasada (empieza en la abertura, sin costuras); delantera: solo la mitad que tapa al planeta
    ST=cl(Math.round(p.r*q.out*zoom/3*(front?1:2)),90,front?420:700),dk=(q.out-q.in)/NB,mk=(q.in+q.out)/2,flag=new Uint8Array(ST+1);
  for(let n=0;n<=ST;n++){const t=t0+span*n/ST;if(inGap(q,t))continue;const pt=ringPt(p,t,mk);if(Math.abs(pt[0]-cam.x)<vr&&Math.abs(pt[1]-cam.y)<vr)flag[n]=1}
  const runs=[];for(let n=0;n<=ST;n++){if(!flag[n])continue;let m=n;while(m+1<=ST&&flag[m+1])m++;if(m>n)runs.push([n,m]);n=m}
  if(!runs.length)return;
  const row=k=>{const o=new Float64Array((ST+1)*2);for(const[a,b]of runs)for(let n=a;n<=b;n++){const pt=ringPt(p,t0+span*n/ST,k);o[n*2]=pt[0];o[n*2+1]=pt[1]}return o};
  let lo=row(q.in);g.save();if(front){g.beginPath();g.arc(p.x,p.y,p.r+ahh,0,PI2);g.clip()}
  for(let i=0;i<NB;i++){const hi=row(q.in+dk*(i+1)*1.03),al=.1+.26*Math.pow(hc(i*(16/NB)|0,7,p.seed),1.5);g.fillStyle='rgba('+q.col+','+al+')';
    for(const[a,b]of runs){g.beginPath();g.moveTo(hi[a*2],hi[a*2+1]);for(let n=a+1;n<=b;n++)g.lineTo(hi[n*2],hi[n*2+1]);for(let n=b;n>=a;n--)g.lineTo(lo[n*2],lo[n*2+1]);g.closePath();g.fill()}
    lo=row(q.in+dk*(i+1))}
  g.restore()}
function ringAst(p,front){const o=ringDecor(p),L=front?o.front:o.back;
  for(const a of L){if(!vis(a[0],a[1],a[2]*1.6+40))continue;
    if(front){const d=Math.hypot(a[0]-ship.x,a[1]-ship.y);if(d<4600)continue;                       // cerca de la nave mandan los asteroides reales
      g.globalAlpha=cl((d-4600)/1200,0,1)}
    AST_.x=a[0];AST_.y=a[1];AST_.r=a[2];AST_.rot=a[4];AST_.sh=a[5];drawAst(AST_);g.globalAlpha=1}}

function drawPlanet(p){
  const ty=T_(p.type),x=p.x,y=p.y,r=p.r,ah=ty.atm?r*ty.atm.h:0,rr=p.ring?r*p.ring.out*1.1:r+ah;
  if(!vis(x,y,rr))return;
  if(p.ring){ringDust(p,false);ringAst(p,false)}
  if(!vis(x,y,r+ah))return void(p.ring&&(ringDust(p,true),ringAst(p,true)));
  const tex=texOf(p),S=tex.width;
  // disco con textura base (solo la parte visible: evita escalar un lienzo gigantesco)
  const vr=VRd+10,x0=Math.max(x-r,cam.x-vr),x1=Math.min(x+r,cam.x+vr),y0=Math.max(y-r,cam.y-vr),y1=Math.min(y+r,cam.y+vr);
  if(x1>x0&&y1>y0){g.imageSmoothingEnabled=true;g.imageSmoothingQuality='medium';
    g.drawImage(tex,(x0-(x-r))/(2*r)*S,(y0-(y-r))/(2*r)*S,(x1-x0)/(2*r)*S,(y1-y0)/(2*r)*S,x0,y0,x1-x0,y1-y0)}
  // losas de detalle a la resolución de pantalla (se afinan solas al acercarte)
  const Lt=Math.ceil(Math.log2(Math.max(1,2*r*zoom/256)));if(Lt>=3)drawTiles(p,x,y,r,Math.min(Lt,LMAX));
  // granulado fino al acercarse mucho (por encima del último nivel de losa)
  if(zoom>.3&&p.type!=='gas'){g.save();g.beginPath();g.arc(x,y,r*.995,0,PI2);g.clip();g.globalAlpha=Math.min(.35,(zoom-.3)*.5);g.globalCompositeOperation='soft-light';
    try{const pt=detailPat(),k=3;if(pt.setTransform)pt.setTransform(new DOMMatrix().scale(k));g.fillStyle=pt;g.fillRect(x0,y0,x1-x0,y1-y0)}catch(e){}g.restore()}
  if(ty.atm)drawAtm(p,ty,x,y,r,ah);
  // escaneo en curso: rejilla y barrido sobre el disco
  if(scan&&scan.p===p){const pr=sm(cl(scan.t/SCAN_T,0,1)),c='120,255,200';g.save();g.beginPath();g.arc(x,y,r,0,PI2);g.clip();g.lineWidth=2/zoom;g.strokeStyle='rgba('+c+','+(.18+.3*pr)+')';
    for(let i=-4;i<=4;i++){const yy=y+r*i/5,hw=Math.sqrt(Math.max(0,r*r-(r*i/5)**2));g.beginPath();g.moveTo(x-hw,yy);g.lineTo(x+hw,yy);g.stroke()}
    for(let i=1;i<=5;i++){g.beginPath();g.ellipse(x,y,r*Math.sin(i*Math.PI/6),r,0,0,PI2);g.stroke()}
    const sy=y-r+2*r*((scan.t*.9)%1),gr=g.createLinearGradient(0,sy-r*.12,0,sy+r*.02);gr.addColorStop(0,'rgba('+c+',0)');gr.addColorStop(1,'rgba('+c+',.45)');g.fillStyle=gr;g.fillRect(x-r,sy-r*.12,2*r,r*.14);g.restore();
    const e=(scan.t*1.2)%1;g.strokeStyle='rgba('+c+','+(.7*(1-e))+')';g.lineWidth=3/zoom;g.beginPath();g.arc(ship.x,ship.y,(40+e*320)/zoom,0,PI2);g.stroke()}
  if(p.ring){ringDust(p,true);ringAst(p,true)}
}
function drawBack(){
  try{for(const p of planets())drawPlanet(p);drawMeteors()}catch(e){if(!drawBack.w){drawBack.w=1;console.warn('[planetas]',e)}}}

/* ---- meteoritos (evento visual poco frecuente: caen atraídos por la gravedad y se encienden en la atmósfera) ---- */
let mets=[],flashes=[],metT=18+Math.random()*25;
function meteorTick(dt,np,nd){
  for(const m of mets)m.t+=dt;for(const f of flashes)f.t+=dt;
  for(const m of mets)if(m.t>=m.T){flashes.push({x:m.x1,y:m.y1,t:0,T:3,k:m.k})}
  mets=mets.filter(m=>m.t<m.T);flashes=flashes.filter(f=>f.t<f.T);
  if(!np||T_(np.type).meteor===0||!T_(np.type).atm||nd>ZONE*1.4||document.hidden)return;
  metT-=dt;if(metT>0)return;metT=70+Math.random()*110;
  const sc=Math.min(W,H)/zoom;let ip=null;
  for(let i=0;i<14&&!ip;i++){const px=W*(.2+.6*Math.random()),py=H*(.2+.6*Math.random()),wx=w2x(px),wy=w2y(py);
    if(Math.hypot(wx-np.x,wy-np.y)<np.r*.96&&Math.hypot(wx-ship.x,wy-ship.y)>sc*.18)ip={x:wx,y:wy}}
  if(!ip){metT=6;return}
  const a=Math.random()*PI2,L=sc*(.5+.25*Math.random());
  mets.push({x0:ip.x-Math.cos(a)*L,y0:ip.y-Math.sin(a)*L,x1:ip.x,y1:ip.y,t:0,T:3+Math.random()*1.5,x:ip.x,y:ip.y,k:np.id})}
function drawMeteors(){
  if(!mets.length&&!flashes.length)return;const u=1/zoom;g.save();g.globalCompositeOperation='lighter';
  for(const m of mets){const s=cl(m.t/m.T,0,1),q=Math.pow(s,1.6),hx_=lerp(m.x0,m.x1,q),hy_=lerp(m.y0,m.y1,q),q2=Math.max(0,q-.2-.25*q),tx=lerp(m.x0,m.x1,q2),ty_=lerp(m.y0,m.y1,q2),I=cl((q-.3)/.35,0,1);
    const gr=g.createLinearGradient(tx,ty_,hx_,hy_);gr.addColorStop(0,'rgba(255,90,20,0)');gr.addColorStop(.6,'rgba(255,140,50,'+(.35+.4*I)+')');gr.addColorStop(1,'rgba(255,245,220,'+(.5+.5*I)+')');
    g.strokeStyle=gr;g.lineCap='round';g.lineWidth=(2.5+5*I)*u;g.beginPath();g.moveTo(tx,ty_);g.lineTo(hx_,hy_);g.stroke();
    g.lineWidth=(1+2*I)*u;g.strokeStyle='rgba(255,200,120,'+.5*I+')';g.beginPath();g.moveTo(tx+(Math.sin(m.t*30))*3*u,ty_);g.lineTo(hx_,hy_);g.stroke();
    const R=(7+26*I)*u,hg=g.createRadialGradient(hx_,hy_,0,hx_,hy_,R);hg.addColorStop(0,'rgba(255,250,235,'+(.7+.3*I)+')');hg.addColorStop(.35,'rgba(255,160,60,'+(.5*I+.15)+')');hg.addColorStop(1,'rgba(255,80,20,0)');
    g.fillStyle=hg;g.beginPath();g.arc(hx_,hy_,R,0,PI2);g.fill()}
  for(const f of flashes){const s=cl(f.t/f.T,0,1),e=1-Math.pow(1-s,3),R=(18+240*e)*u,A=Math.pow(1-s,1.6);
    const hg=g.createRadialGradient(f.x,f.y,0,f.x,f.y,R);hg.addColorStop(0,'rgba(255,248,225,'+A+')');hg.addColorStop(.3,'rgba(255,170,70,'+.7*A+')');hg.addColorStop(1,'rgba(255,90,30,0)');g.fillStyle=hg;g.beginPath();g.arc(f.x,f.y,R,0,PI2);g.fill();
    g.strokeStyle='rgba(255,210,150,'+.6*A+')';g.lineWidth=3*u*(1-s);g.beginPath();g.arc(f.x,f.y,R*1.25,0,PI2);g.stroke()}
  g.restore()}

/* ============================== ESCANEO, MENÚ, ÓRBITA Y ATRAQUE ============================== */
let scan=null,curK=0,kPrev=0,hinted=0;
const mz0=.5;
function minZoom(){return lerp(mz0,ZMIN_NEAR,sm(curK))}
function click(px,py){                         // clic derecho / pulsación larga sobre el mundo: ¿hay un planeta?
  if(state!=='play'||ship.dead>0)return 0;
  const p=planetAt(w2x(px),w2y(py));if(!p)return 0;
  const alt=Math.hypot(ship.x-p.x,ship.y-p.y)-p.r;
  if(!sv(p.id).sc){
    if(alt>SCAN_RANGE){toast('📡 Acércate más a '+p.n+' para escanearlo ('+km(alt-SCAN_RANGE)+' hasta el alcance)');return 1}
    if(scan&&scan.p===p)return 1;
    scan={p,t:0,px,py};toast('📡 Escaneando '+p.n+'… sigue cerca del planeta');return 1}
  menu(p,px,py);return 1}
function menu(p,px,py){
  const ty=T_(p.type),orb=ship.porb&&ship.porb.p===p,can=ty.landable&&T.gear;
  ctxMenu(px,py,[['Información del planeta',()=>showInfo(p)],[orb?'Dejar de orbitar':'Orbitar',()=>orbit(p),orb?'dng':''],
    [can?'Atracar':'Atracar 🔒',()=>land(p),can?'':'']])}
function orbit(p){
  if(ship.porb&&ship.porb.p===p){ship.porb=null;ship.dest=null;ship.brake=1;toast('Órbita cancelada');return}
  ship.orbit=null;ship.lock=null;ship.mt=ship.mc=null;ship.pland=null;ship.dest=null;
  ship.porb={p,oa:Math.atan2(ship.y-p.y,ship.x-p.x)};toast('🛰 Orbitando '+p.n)}
function land(p){
  const ty=T_(p.type);
  if(!ty.landable)return toast('No se puede aterrizar en '+p.n+': no tiene superficie sólida');
  if(!T.gear)return toast('🔒 Necesitas el tren de aterrizaje instalado en esta nave (Base Zafiro → MEJORAS)');
  if(ship.wreck||ship.dead>0)return;
  ship.porb=null;ship.orbit=null;ship.mt=ship.mc=null;ship.pland=p;toast('Descendiendo hacia '+p.n+'…')}
function stopNav(){ship.porb=null;ship.pland=null}
function orbitTick(dt){
  const o=ship.porb;if(!o)return;
  const pp=planets().find(q=>q.id===o.p.id);if(ship.dead>0||ship.orbit||ship.mt||(ship.dest&&!ship.dest.auto)||!pp){ship.porb=null;return}
  o.p=pp;const p=pp,rad=p.r+ORB_ALT,V=T.spd*.6*Math.min(1,ship.thr||1);o.oa+=V/rad*dt;
  ship.dest={x:p.x+Math.cos(o.oa)*rad,y:p.y+Math.sin(o.oa)*rad,auto:1,stop:.5}}
function landTick(){
  const p=ship.pland;if(!p)return;
  if(ship.dead>0||ship.orbit||ship.mt||(ship.dest&&!ship.dest.auto)||!planets().includes(p)||!T.gear){ship.pland=null;return}
  const alt=Math.hypot(ship.x-p.x,ship.y-p.y)-p.r;
  if(alt<LAND_ALT){begin(p);return}
  const a=Math.atan2(ship.y-p.y,ship.x-p.x),rr=p.r+LAND_ALT*.5;ship.dest={x:p.x+Math.cos(a)*rr,y:p.y+Math.sin(a)*rr,auto:1,stop:60}}
function zoomTick(dt,np,nd){
  const k=np?cl(1-nd/ZONE,0,1):0;curK=k;
  const dk=k-kPrev;
  if(dk>0&&np){const zT=lerp(.7,ZSOFT_NEAR,sm(k));if(zoom>zT){zoom+=(zT-zoom)*cl(dk/Math.max(.03,1-kPrev),0,1)}
    if(!hinted&&k>.12){hinted=1;toast('🔭 Cerca de un planeta puedes alejar más el zoom (rueda del ratón / pellizco)')}}
  kPrev=k;
  const mz=minZoom();if(zoom<mz-1e-4)zoom+=(mz-zoom)*Math.min(1,dt*.7)}
function tick(dt){
  if(state!=='play'){return}
  const P=planets();if(!P.length){curK=0;kPrev=0;ship.porb=ship.pland=null;scan=null;return}
  const n=nearest();
  frameN++;for(const p of P)if(Math.hypot(ship.x-p.x,ship.y-p.y)<p.r+60000){texOf(p);if(!TX.get(p.id).done)texStep(p,6);else tileStep(7);break}
  if(WANT.size>0)WANT.clear()
  zoomTick(dt,n&&n.p,n?n.dz:1e18);
  if(scan){const p=scan.p,d=Math.hypot(ship.x-p.x,ship.y-p.y)-p.r;
    if(ship.dead>0||d>SCAN_RANGE*1.2||!P.includes(p)){scan=null;toast('Escaneo interrumpido: te alejaste demasiado')}
    else{scan.t+=dt;if(scan.t>=SCAN_T){const q=scan;scan=null;sv(p.id).sc=1;toast('✔ Escaneo completado: '+p.n);try{saveGame()}catch(e){}showInfo(p);menu(p,q.px,q.py)}}}
  orbitTick(dt);landTick();meteorTick(dt,n&&n.p,n?n.d:1e18)}

/* ============================== PANEL DE INFORMACIÓN ============================== */
let UI=null;
function mkUI(){
  if(UI)return UI;const st=document.createElement('style');
  st.textContent=`#plInfo{pointer-events:auto;position:absolute;left:372px;top:150px;width:262px;max-height:70%;overflow:auto;background:rgba(5,12,22,.95);border:1px solid var(--bd);border-top:3px solid #78ffc8;padding:12px 14px;font-size:13px;line-height:1.5;box-sizing:border-box}
@media(max-width:980px){#plInfo{left:50%;top:50%;transform:translate(-50%,-50%);width:min(330px,86%)}}
#plInfo h2{margin:0 0 2px;font:700 18px ui-monospace,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase;color:#cfe8ff}#plInfo .sb{opacity:.7;font-size:11px;letter-spacing:.14em;text-transform:uppercase;margin-bottom:8px}
#plInfo .x{position:absolute;right:6px;top:6px;padding:4px 10px;font-size:13px}#plInfo p{margin:8px 0;opacity:.85}
#plSf{pointer-events:none;position:absolute;inset:0}#plSf .sq{position:absolute;pointer-events:auto}#plBtn{right:14px;bottom:14px}#plBtn2{right:14px;bottom:72px}
#plMap{pointer-events:auto;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(5,12,22,.96);border:1px solid var(--bd);border-top:3px solid #78ffc8;padding:12px 14px;max-width:94%;max-height:92%;overflow:auto;box-sizing:border-box;text-align:center}
#plMap canvas{width:min(50vh,400px);height:min(50vh,400px);display:block;margin:8px auto;image-rendering:pixelated;border:1px solid rgba(120,200,255,.35)}`;
  document.head.appendChild(st);
  const d=document.createElement('div');d.id='plInfo';d.className='hide';$('ui').appendChild(d);
  const s=document.createElement('div');s.id='plSf';s.className='hide';
  s.innerHTML='<button class="sq go" id="plBtn">Despegar [E]</button><button class="sq" id="plBtn2">Mapa del planeta [M]</button><div id="plMap" class="hide"></div>';
  $('ui').appendChild(s);UI={info:d,sf:s};
  $('plBtn').onclick=()=>takeoffReq();$('plBtn2').onclick=()=>toggleMap();
  return UI}
function showInfo(p){
  const u=mkUI().info,ty=T_(p.type),S=sv(p.id),row=(a,b)=>`<div class="kv"><span style="opacity:.7">${a}</span><b style="font-weight:400;text-align:right">${esc(b)}</b></div>`;
  const ex=exploredPct(p);
  u.innerHTML=`<button class="sq x" data-x="1">✕</button><h2>${esc(p.n)}</h2><div class="sb">${esc(ty.cls)} · ${esc(ty.label)}</div>`+
    (p.desc?`<p>${esc(p.desc)}</p>`:'')+row('Diámetro',km(p.r*2))+row('Composición',p.comp)+row('Atmósfera',p.atm)+row('Gravedad',p.grav+' g')+row('Temperatura media',p.temp+' °C')+row('Duración del día',p.day)+
    row('Aterrizaje',ty.landable?(T.gear?'Posible (tren instalado)':'Requiere tren de aterrizaje'):'Imposible: sin superficie sólida')+(ty.landable?row('Superficie explorada',ex+' %'):'');
  u.classList.remove('hide');u.querySelector('[data-x]').onclick=()=>u.classList.add('hide')}
function hideInfo(){if(UI)UI.info.classList.add('hide')}

/* ============================== HUD (espacio) ============================== */
function hud(){
  try{
    if(scan){const w=Math.min(300,W*.6),x=W/2-w/2,y=H-52,pr=cl(scan.t/SCAN_T,0,1);g.fillStyle='rgba(5,12,22,.85)';g.fillRect(x-6,y-18,w+12,38);g.strokeStyle='rgba(120,255,200,.6)';g.lineWidth=1;g.strokeRect(x-6,y-18,w+12,38);
      g.fillStyle='#12263a';g.fillRect(x,y+4,w,8);g.fillStyle='#78ffc8';g.fillRect(x,y+4,w*pr,8);txt('ESCANEANDO '+scan.p.n.toUpperCase()+' · '+Math.round(pr*100)+'%',W/2,y-3,'#78ffc8','center',12)}
    else if(ship.porb){const p=ship.porb.p;txt('🛰 ORBITANDO '+p.n.toUpperCase()+' · altitud '+km(Math.hypot(ship.x-p.x,ship.y-p.y)-p.r),W/2,H-26,'#78ffc8','center',12)}
    else if(ship.pland)txt('⬇ DESCENDIENDO HACIA '+ship.pland.n.toUpperCase(),W/2,H-26,'#ffd166','center',12)
  }catch(e){}}

/* ============================== MAPA GLOBAL ============================== */
function mapPlanet(p,x,y,rr){
  const tex=texOf(p),S=tex.width,t=TX.get(p.id);if(t&&!t.done)texStep(p,4);
  g.save();g.imageSmoothingEnabled=true;g.imageSmoothingQuality='medium';
  const x0=Math.max(x-rr,-4),x1=Math.min(x+rr,W+4),y0=Math.max(y-rr,-4),y1=Math.min(y+rr,H+4);
  if(x1>x0&&y1>y0)g.drawImage(tex,(x0-(x-rr))/(2*rr)*S,(y0-(y-rr))/(2*rr)*S,(x1-x0)/(2*rr)*S,(y1-y0)/(2*rr)*S,x0,y0,x1-x0,y1-y0);
  const Lt=Math.ceil(Math.log2(Math.max(1,2*rr/256)));
  if(Lt>=3){          // losas de detalle a la resolución de pantalla (como en el mundo), dibujadas en coordenadas del mapa
    const c0x=cam.x,c0y=cam.y,v0=VRd;cam.x=W/2-x;cam.y=H/2-y;VRd=Math.hypot(W,H)/2;
    g.translate(x,y);try{drawTiles(p,0,0,rr,Math.min(Lt,LMAX))}finally{cam.x=c0x;cam.y=c0y;VRd=v0}
    tileStep(6);WANT.clear()}
  g.restore()}

function drawMap(X,Y,s,L){
  for(const p of L||[]){const ty=T_(p.type),x=X(p.x),y=Y(p.y),rr=Math.max(4,p.r*s),known=!!sv(p.id).sc;if(x+rr*2<-20||x-rr*2>W+20||y+rr*2<-20||y-rr*2>H+20)continue;
    g.save();
    if(!known){          // sin escanear: solo se sabe que ahí hay un planeta (sin imagen, nombre ni tipo)
      g.fillStyle='rgba(26,34,48,.92)';g.beginPath();g.arc(x,y,rr,0,PI2);g.fill();g.setLineDash([5,5]);g.strokeStyle='rgba(150,170,200,.55)';g.lineWidth=1.2;g.beginPath();g.arc(x,y,rr+1,0,PI2);g.stroke();g.setLineDash([]);
      txt('?',x,y+(rr>14?10:4),'rgba(170,190,220,.7)','center',rr>14?Math.min(46,rr*.9):10);
      if(s>.0006)txt('PLANETA SIN EXPLORAR',x,y-rr-6,'rgba(170,190,220,.75)','center',10);
      if(s>.002)txt('Acércate y escanéalo para descubrirlo',x,y+rr+14,'rgba(170,190,220,.5)','center',10);g.restore();continue}
    if(p.ring&&rr>3){g.strokeStyle='rgba('+p.ring.col+',.45)';g.lineWidth=Math.max(1.2,rr*(p.ring.out-p.ring.in)*.12);g.beginPath();g.ellipse(x,y,rr*(p.ring.in+p.ring.out)/2,rr*(p.ring.in+p.ring.out)/2*p.ring.ry,p.ring.tilt,0,PI2);g.stroke()}
    if(rr>5){try{mapPlanet(p,x,y,rr)}catch(e){}}
    else{g.fillStyle=ty.col;g.beginPath();g.arc(x,y,rr,0,PI2);g.fill()}
    g.strokeStyle='rgba(180,230,255,.7)';g.lineWidth=1;g.beginPath();g.arc(x,y,rr+1,0,PI2);g.stroke();
    if(s>.0006)txt(p.n.toUpperCase(),x,y-rr-6,'rgba(180,235,255,.95)','center',s>.003?13:10);
    if(s>.002)txt(ty.cls+' · '+ty.label,x,y+rr+14,'rgba(180,235,255,.6)','center',10);g.restore()}}


/* ============================== MINIMAPA ============================== */
/* Los planetas también se ven en el minimapa: disco con su textura (solo la parte que cabe), atmósfera y anillo. Se llama desde drawMini() de render.js (ya recortado al cuadro). */
function drawMini(X,Y,s,m){
  const mx=m.x+m.w/2,my=m.y+m.h/2;
  for(const p of planets()){
    const ty=T_(p.type),cx=X(p.x),cy=Y(p.y),rr=p.r*s,ah=ty.atm?p.r*ty.atm.h*s:0,R=Math.max(rr+ah,p.ring?rr*p.ring.out:0);
    if(Math.hypot(cx-mx,cy-my)-R>m.w*.75)continue;
    g.save();
    if(rr<2.5){g.fillStyle=ty.col;g.beginPath();g.arc(cx,cy,2.5,0,PI2);g.fill()}
    else{
      if(ah>.5){g.strokeStyle='rgba('+ty.atm.col+',.28)';g.lineWidth=Math.max(1.5,ah);g.beginPath();g.arc(cx,cy,rr+ah/2,0,PI2);g.stroke()}
      const x0=Math.max(cx-rr,m.x),x1=Math.min(cx+rr,m.x+m.w),y0=Math.max(cy-rr,m.y),y1=Math.min(cy+rr,m.y+m.h);
      if(x1>x0&&y1>y0){g.save();g.beginPath();g.arc(cx,cy,rr,0,PI2);g.clip();
        try{const tex=texOf(p),S=tex.width;g.imageSmoothingEnabled=true;g.drawImage(tex,(x0-(cx-rr))/(2*rr)*S,(y0-(cy-rr))/(2*rr)*S,(x1-x0)/(2*rr)*S,(y1-y0)/(2*rr)*S,x0,y0,x1-x0,y1-y0)}catch(e){g.fillStyle=ty.col;g.fillRect(x0,y0,x1-x0,y1-y0)}
        g.restore()}
      g.strokeStyle='rgba(180,230,255,.55)';g.lineWidth=1;g.beginPath();g.arc(cx,cy,rr,0,PI2);g.stroke()}
    if(p.ring&&rr>2){const k=rr*(p.ring.in+p.ring.out)/2;g.strokeStyle='rgba('+p.ring.col+',.4)';g.lineWidth=Math.max(1,rr*(p.ring.out-p.ring.in)*.25);g.beginPath();g.ellipse(cx,cy,k,k*p.ring.ry,p.ring.tilt,0,PI2);g.stroke()}
    g.restore()}}
function miniTxt(m){if(state!=='play')return;const n=nearest();if(!n||n.d>60000)return;
  txt((sv(n.p.id).sc?n.p.n:'Planeta')+' · '+km(Math.max(0,n.d)),m.x+6,m.y+m.h-6,'#9fe8ff','left',10)}

/* ============================== ATERRIZAJE Y SUPERFICIE ============================== */
const NT=256,TS=26,NB=64,BR=12,DOWN=7.5,UP=6.5;     // 256×256 casillas de 26 u · el mapa del planeta se desbloquea en bloques de 4×4 casillas · 8 px de textura por casilla
const ZR=NT*.35,SEP=TS*9;     // radio (en casillas) al que cae el punto de aterrizaje según la zona · separación mínima entre naves posadas
const ZNAME=['este','sureste','sur','suroeste','oeste','noroeste','norte','noreste'];
const zoneName=a=>ZNAME[((Math.round((Number.isFinite(a)?a:0)/(PI2/8))%8)+8)%8];
const PTK={};                  // casillas recogidas por OTROS jugadores (por planeta, solo en esta sesión)
let LAND=null,KEYS={};
/* ---- suelo de cada tipo de planeta: estilo isla 2D suave (agua → costa de arena → verdes), generado por semilla de PARTIDA ----
   Para otro tipo de planeta define su 'ground': kind ('island'|'plain'), col(L,m,d,o) → rellena o[0..2], solid(L,m) y deco[{t,p,when}].
   t: tree|bush|spire|crystal (decorativos) · rock|plant (se pueden recoger). */
const G_=(t,p,when)=>({t,p,when});
TY.terran.ground={kind:'island',
  col(L,m,d,o){
    const t=cl(-L/.55,0,1);mix3(o,[70,168,214],[12,58,126],Math.pow(t,.55));const sh=cl(1+L/.09,0,1);if(sh>0)mix3(o,o,[162,224,232],sh*.6);      // agua: azul profundo → turquesa en la orilla
    const lw=sm(cl((L+.004)/.016,0,1));
    if(lw>0){const c=[0,0,0];mix3(c,[84,152,70],[140,192,92],cl(.5+m*.9,0,1));
      if(L>.2&&m>.05)mix3(c,c,[38,100,56],cl((m-.05)*3.2,0,1)*cl((L-.2)*5,0,1));
      if(L>.5)mix3(c,c,[128,126,116],cl((L-.5)*5,0,1)*.6);
      const sd=cl(1-(L-.012)/.09-m*.25,0,1);if(sd>0){const w=[0,0,0];mix3(w,[196,178,128],[232,214,158],sm(cl(L/.05,0,1)));mix3(c,c,w,Math.pow(sd,.7))}     // costa de arena: más ancha o más estrecha según el terreno
      mix3(o,o,c,lw)}
    const k=1+d*.05;o[0]*=k;o[1]*=k;o[2]*=k},
  solid:(L)=>L<.004,
  deco:[G_('tree',.34,(L,m)=>L>.2&&m>.05),G_('rock',.05,(L)=>L>.1),G_('plant',.075,(L,m)=>L>.1&&L<.7),G_('bush',.06,(L)=>L>.1&&L<.7),G_('rock',.03,(L)=>L>.02&&L<.1)]};
TY.desert.ground={kind:'plain',
  col(L,m,d,o,x,y){const b=Math.sin((x*.07+L*6)+y*.02)*.5+.5;mix3(o,[196,134,76],[232,186,116],b*.65+cl(.5+m*.6,0,1)*.35);if(L>.4)mix3(o,o,[140,96,66],cl((L-.4)*4,0,1));
    if(L<-.35)mix3(o,o,[72,46,34],cl((-.35-L)*7,0,1));const k=1+d*.05;o[0]*=k;o[1]*=k;o[2]*=k},
  solid:(L)=>L<-.5,deco:[G_('rock',.06,(L)=>L>-.3),G_('plant',.03,(L,m)=>m>.1),G_('spire',.03,(L)=>L>.1)]};
TY.ice.ground={kind:'plain',
  col(L,m,d,o){mix3(o,[236,244,251],[172,206,234],cl(.5+L*.7,0,1));if(L<-.35)mix3(o,o,[34,66,106],cl((-.35-L)*6,0,1)*.9);if(L>.5)mix3(o,o,[130,142,156],cl((L-.5)*4,0,1)*.6);const k=1+d*.03;o[0]*=k;o[1]*=k;o[2]*=k},
  solid:(L)=>L<-.5,deco:[G_('crystal',.05,(L,m)=>m>0),G_('rock',.05,(L)=>L>.1)]};
const RNAME={terran:'Roca',desert:'Roca árida',ice:'Roca helada'},PNAME={terran:'Planta',desert:'Cactus enano',ice:'Liquen helado'};

function genSurface(p,zn){
  const ty=T_(p.type),gr=ty.ground,ss=(p.seed^((typeof SEED==='number'?SEED:0)*2654435761))|0,N=mkNoise(ss),
    Lh=new Float32Array(NT*NT),Mh=new Float32Array(NT*NT),isl=gr.kind==='island';
  for(let j=0;j<NT;j++)for(let i=0;i<NT;i++){const k=j*NT+i,x=i/NT*2-1,y=j/NT*2-1,base=N.fbm(i*.035,j*.035,1.7,5);
    if(isl){const dd=Math.hypot(x,y)*(1+N.fbm(i*.012+9,j*.012,4,3)*.35);Lh[k]=(1-Math.pow(dd,1.7)*1.25)*.55+base*.4-.04}
    else Lh[k]=base*1.1+.2*N.fbm(i*.01,j*.01,7,2);
    Mh[k]=N.fbm(i*.045+40,j*.045,3.1,3)}
  const bake=document.createElement('canvas');bake.width=bake.height=NT*BR;const bx=bake.getContext('2d',{willReadFrequently:false});
  const S={ty,gr,ss,L:Lh,M:Mh,bake,bx,bj:0,bim:bx.createImageData(NT*BR,16),sx:0,sy:0,done:false};
  // punto de aterrizaje: tierra firme (playa o hierba). Depende de la ZONA por la que baja la nave (zn.a = ángulo de aproximación)
  // y se separa de las naves de otros jugadores (zn.avoid); sin zona, cerca del centro como antes
  const ok=(i,j)=>{for(let b=-2;b<=2;b++)for(let a=-2;a<=2;a++){const q=(j+b)*NT+(i+a);if(q<0||q>=NT*NT||gr.solid(Lh[q],Mh[q]))return false}return true};
  const far=(i,j)=>!((zn&&zn.avoid)||[]).some(q=>Math.hypot((i+.5)*TS-q.x,(j+.5)*TS-q.y)<SEP);
  const find=(x0,y0,R,pred)=>{for(let r=0;r<=R;r++)for(let b=-r;b<=r;b++)for(let a=-r;a<=r;a++)if(Math.max(Math.abs(a),Math.abs(b))===r){const i=x0+a,j=y0+b;if(i>2&&j>2&&i<NT-3&&j<NT-3&&pred(i,j))return[i,j]}return null};
  if(zn&&zn.pad&&Number.isFinite(zn.pad.x)&&Number.isFinite(zn.pad.y)){S.sx=zn.pad.x;S.sy=zn.pad.y}
  else{let pos=null;
    if(zn&&Number.isFinite(zn.a))pos=find(cl(Math.round(NT/2+Math.cos(zn.a)*ZR),8,NT-9),cl(Math.round(NT/2+Math.sin(zn.a)*ZR),8,NT-9),110,(i,j)=>ok(i,j)&&far(i,j));
    if(!pos)pos=find(NT/2|0,NT/2|0,80,(i,j)=>ok(i,j)&&far(i,j));
    if(!pos)pos=find(NT/2|0,NT/2|0,80,ok);
    if(!pos)pos=[NT/2|0,NT/2|0];
    S.sx=(pos[0]+.5)*TS;S.sy=(pos[1]+.5)*TS}
  // el suelo se pinta por bandas empezando por la zona del aterrizaje (así se ve la zona real durante el descenso)
  const nb=NT*BR/16,pb=cl(Math.floor(S.sy*BR/TS/16),0,nb-1);S.nb=nb;S.bd=new Uint8Array(nb);S.bn=0;
  S.order=Array.from({length:nb},(_,b)=>b).sort((a,b)=>Math.abs(a-pb)-Math.abs(b-pb));
  return S}
function bakeStep(S,budget){                       // pinta la textura suave del suelo (interpolación bilineal + grano) repartida entre fotogramas
  if(S.done)return;const t0=performance.now(),W=NT*BR,gr=S.gr,o=[0,0,0],d=S.bim.data,ss=S.ss;
  while(S.bn<S.order.length){const rows=16,bj=S.order[S.bn]*16;
    for(let r=0;r<rows;r++){const py=bj+r,ty_=(py+.5)/BR-.5,j0=Math.max(0,Math.min(NT-2,Math.floor(ty_))),fy=cl(ty_-j0,0,1);
      for(let px=0;px<W;px++){const tx=(px+.5)/BR-.5,i0=Math.max(0,Math.min(NT-2,Math.floor(tx))),fx=cl(tx-i0,0,1),k=j0*NT+i0;
        const L=(S.L[k]*(1-fx)+S.L[k+1]*fx)*(1-fy)+(S.L[k+NT]*(1-fx)+S.L[k+NT+1]*fx)*fy,m=(S.M[k]*(1-fx)+S.M[k+1]*fx)*(1-fy)+(S.M[k+NT]*(1-fx)+S.M[k+NT+1]*fx)*fy,
          dn=(hc(px>>1,py>>1,ss)-.5)*2*.6+(hc(px>>3,py>>3,ss+5)-.5)*2*.7;
        gr.col(L,m,dn,o,px,py);const q=(r*W+px)*4;d[q]=o[0];d[q+1]=o[1];d[q+2]=o[2];d[q+3]=255}}
    S.bx.putImageData(S.bim,0,bj);S.bd[bj/16]=1;S.bn++;if(performance.now()-t0>budget)break}
  if(S.bn>=S.order.length)S.done=true}
function Lat(S,x,y){const tx=x/TS-.5,ty_=y/TS-.5,i=Math.floor(tx),j=Math.floor(ty_);if(i<0||j<0||i>=NT-1||j>=NT-1)return -1;const fx=tx-i,fy=ty_-j,k=j*NT+i;
  return(S.L[k]*(1-fx)+S.L[k+1]*fx)*(1-fy)+(S.L[k+NT]*(1-fx)+S.L[k+NT+1]*fx)*fy}
function solidAt(S,x,y){const L=Lat(S,x,y);return L<-.9?true:S.gr.solid(L,0)}
function decoAt(S,i,j){const k=j*NT+i,L=S.L[k],m=S.M[k],r=hc(i,j,S.ss+11);let acc=0;for(const d of S.gr.deco){if(!d.when(L,m))continue;acc+=d.p;if(r<acc)return d}return null}
function exploredPct(p){let n=0,s=(LAND&&LAND.p.id===p.id)?null:sv(p.id).ex;
  if(LAND&&LAND.p.id===p.id){for(let i=0;i<LAND.rev.length;i++)n+=LAND.rev[i]}else if(s){for(let i=0;i<s.length;i++)if(s.charCodeAt(i)===49)n++}
  return Math.round(n/(NB*NB)*1000)/10}
function mkLand(p,ph,snap,zn){
  const S=genSurface(p,zn),q=sv(p.id),L={p,ph,t:0,D:DOWN,S,rev:new Uint8Array(NB*NB),taken:new Set((q.tk||[]).map(x=>x|0)),cx:S.sx,cy:S.sy+TS*3.2,face:Math.PI/2,tgt:null,hold:0,zf:1,part:[],autoUp:0,mapOn:0,mapT:0,snap:null,gath:null,gt:null,walk:0,za:(zn&&Number.isFinite(zn.a))?zn.a:null,pt:PTK[p.id]||(PTK[p.id]=new Set()),out:[]};
  const ex=q.ex;if(ex&&ex.length===NB*NB)for(let i=0;i<ex.length;i++)L.rev[i]=ex.charCodeAt(i)===49?1:0;
  if(snap){while(!S.done)bakeStep(S,1e9);if(Number.isFinite(snap.cx)&&Number.isFinite(snap.cy)&&!solidAt(S,snap.cx,snap.cy)){L.cx=snap.cx;L.cy=snap.cy}}
  for(let i=0;i<70;i++)L.part.push({x:Math.random(),y:Math.random(),vx:.02+Math.random()*.05,vy:(Math.random()-.5)*.02,s:1+Math.random()*2});
  return L}
function snapOf(L){const p=L.p;return{p:{id:p.id,rg:p.rg,n:p.n,type:p.type,x:p.x,y:p.y,r:p.r,seed:p.seed,desc:p.desc,grav:p.grav,temp:p.temp,atm:p.atm,day:p.day,comp:p.comp,sun:p.sun},cx:L.cx,cy:L.cy,za:L.za,pad:{x:L.S.sx,y:L.S.sy}}}
function begin(p){
  ship.pland=null;ship.porb=null;ship.dest=null;ship.vx=ship.vy=0;ship.brake=0;fireOn=0;hold=0;scan=null;hideInfo();try{$('ctx').classList.add('hide')}catch(e){}
  const za=Math.atan2(ship.y-p.y,ship.x-p.x);           // zona del planeta por la que baja la nave
  try{LAND=mkLand(p,'down',null,{a:za,avoid:peerPads(p)});}catch(e){console.warn('[planetas] no se pudo generar la superficie',e);return}
  toast('Descendiendo por la zona '+zoneName(za)+' de '+p.n);
  const e=(typeof wing!=='undefined'?wing:[]).filter(w=>w.own&&w.hp>0).length;
  if(e)toast('Tus escoltas no tienen permiso para aterrizar: te esperan en órbita');
  ship.a=-Math.PI/2;KEYS={};setState('planet');mkUI().sf.classList.add('hide');try{saveGame()}catch(e2){}}
function resume(sn){
  try{const p=norm(sn.p,sn.p.rg);if(!p)return;LAND=mkLand(p,'surf',sn,(sn.pad&&Number.isFinite(sn.pad.x)&&Number.isFinite(sn.pad.y))?{a:Number.isFinite(sn.za)?sn.za:undefined,pad:sn.pad}:null);if(LAND.za==null)LAND.za=Number.isFinite(sn.za)?sn.za:Math.atan2(ship.y-p.y,ship.x-p.x);LAND.snap=sn;ship.dest=null;ship.vx=ship.vy=0;KEYS={};setState('planet');mkUI().sf.classList.remove('hide');toast('Continúas en la superficie de '+p.n)}catch(e){console.warn('[planetas]',e);LAND=null}}
function takeoffReq(){
  const L=LAND;if(!L||L.ph!=='surf')return;
  if(Math.hypot(L.cx-L.S.sx,L.cy-L.S.sy)<TS*3.4){startUp();return}
  L.tgt={x:L.S.sx,y:L.S.sy+TS*2.2};L.autoUp=1;L.gt=null;toast('Volviendo a la nave…')}
function startUp(){const L=LAND;L.ph='up';L.t=0;L.D=UP;L.autoUp=0;L.tgt=null;L.mapOn=0;closeMap();mkUI().sf.classList.add('hide');L.snap=snapOf(L);L.face=-Math.PI/2;while(!L.S.done)bakeStep(L.S,1e9)}
function finishUp(){
  const L=LAND,p=L.p;LAND=null;KEYS={};mkUI().sf.classList.add('hide');
  const a=Math.atan2(ship.y-p.y,ship.x-p.x);ship.vx=ship.vy=0;ship.dest=null;ship.brake=0;
  setState('play');ship.porb={p:planets().find(q=>q.id===p.id)||p,oa:a};toast('🚀 Despegue completado: en órbita de '+p.n);try{saveGame()}catch(e){}}
function revealStep(L){const bi=Math.floor(L.cx/TS/4),bj=Math.floor(L.cy/TS/4);
  for(let j=bj-3;j<=bj+3;j++)for(let i=bi-3;i<=bi+3;i++){if(i<0||j<0||i>=NB||j>=NB)continue;
    if(Math.hypot((i+.5)*4*TS-L.cx,(j+.5)*4*TS-L.cy)<TS*10&&!L.rev[j*NB+i]){L.rev[j*NB+i]=1;L.mapNew=1}}}
/* ---- recursos recogibles (rocas y plantas) ---- */
function nodeInfo(L,i,j){const d=decoAt(L.S,i,j);if(!d||(d.t!=='rock'&&d.t!=='plant')||L.taken.has(j*NT+i)||L.pt.has(j*NT+i))return null;
  const h=hc(i,j,5),h2=hc(i,j,6);return{i,j,t:d.t,x:(i+.5)*TS+(h-.5)*TS*.6,y:(j+.5)*TS+(h2-.5)*TS*.6,k:j*NT+i}}
function nearNode(L,x,y,R){const i0=Math.floor((x-R)/TS),i1=Math.floor((x+R)/TS),j0=Math.floor((y-R)/TS),j1=Math.floor((y+R)/TS);let b=null,bd=R;
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){if(i<0||j<0||i>=NT||j>=NT)continue;const n=nodeInfo(L,i,j);if(!n)continue;const d=Math.hypot(n.x-x,n.y-y);if(d<bd){bd=d;b=n}}return b}
function gatherStart(L,n){if(L.gath)return;L.gath={n,t:0,T:.75};L.tgt=null;L.face=Math.atan2(n.y-L.cy,n.x-L.cx)}
function gatherDone(L){const n=L.gath.n;L.gath=null;if(L.taken.has(n.k))return;L.taken.add(n.k);if(L.out.length<200)L.out.push(n.k);
  const ty=L.p.type,id=n.t==='rock'?'roca':'planta',q=sv(L.p.id);q.tk=[...L.taken].slice(-6000);
  const nm=n.t==='rock'?(RNAME[ty]||'Roca'):(PNAME[ty]||'Planta');
  if(typeof ITM!=='undefined'){ITM.bagAdd(id,1,{src:L.p.n,nm,ty});toast('Recogido: '+nm.toLowerCase()+' ('+ITM.bagGet(id)+' en la nave)')}else toast('Recogido: '+nm.toLowerCase());
  L.pop={x:n.x,y:n.y,t:0}}
/* ---- MULTIJUGADOR: otros jugadores en el mismo planeta ---- */
const mpOn=()=>typeof MPR!=='undefined'&&typeof MP!=='undefined'&&MP&&MP.role;
function peers(L){const o=[];L=L||LAND;if(!L||!mpOn())return o;const now=performance.now();
  for(const k in MPR){const r=MPR[k];if(r&&r.pl&&r.pl.i===L.p.id&&now-r.t<5000)o.push(r)}return o}
function peerPads(p){const o=[];if(!mpOn())return o;const now=performance.now();
  for(const k in MPR){const r=MPR[k];if(r&&r.pl&&r.pl.i===p.id&&now-r.t<5000)o.push({x:r.pl.px,y:r.pl.py})}return o}
function peerStep(L,dt){const k=Math.min(1,10*dt);
  for(const r of peers(L)){const q=r.pl;
    if(r.exL!==L){r.exL=L;r.ex=q.cx;r.ey=q.cy;r.efa=q.fa;r.pf=q.f}
    r.ex+=(q.cx-r.ex)*k;r.ey+=(q.cy-r.ey)*k;r.efa+=angDiff(r.efa,q.fa)*k;
    if(r.pf===0&&q.f===1&&L.ph==='surf')toast('🧑‍🚀 '+r.n+' ha aterrizado en la zona '+zoneName(q.za)+' de '+L.p.n);
    r.pf=q.f}}
/* lo que enviamos a los demás (dentro del paquete 'st'): fase, progreso, nave posada, explorador y casillas recogidas */
function mpInfo(){const L=LAND;if(!L)return null;
  const o={i:L.p.id,f:L.ph==='down'?0:L.ph==='surf'?1:2,s:+cl(L.t/L.D,0,1).toFixed(3),px:Math.round(L.S.sx),py:Math.round(L.S.sy),cx:Math.round(L.cx),cy:Math.round(L.cy),fa:+L.face.toFixed(2),za:+(L.za||0).toFixed(2),w:L.walk?1:0,g:L.gath?1:0};
  if(L.out.length)o.tk=L.out.splice(0,40);return o}
function mpIn(r,p){const q=p.pl;if(!q||typeof q!=='object'||!/^[\w-]{1,40}$/.test(String(q.i))){r.pl=null;return}
  const n=(v,d)=>Number.isFinite(+v)?+v:d,o={i:String(q.i),f:cl(n(q.f,1)|0,0,2),s:cl(n(q.s,0),0,1),px:n(q.px,0),py:n(q.py,0),cx:n(q.cx,0),cy:n(q.cy,0),fa:n(q.fa,0),za:n(q.za,0),w:q.w?1:0,g:q.g?1:0};
  if(Array.isArray(q.tk)){const S=PTK[o.i]||(PTK[o.i]=new Set());for(const k of q.tk.slice(0,40))if(Number.isFinite(+k))S.add(+k|0)}
  r.pl=o}
/* escaneos compartidos: lo que un jugador escanea lo conocen todos los de la sala */
let scSent='',scT=0;
function mpSc(){const ids=Object.keys(SV).filter(k=>SV[k].sc).sort().join(','),t=performance.now();if(!ids)return null;
  if(ids===scSent&&t-scT<15000)return null;scSent=ids;scT=t;return ids.split(',').slice(0,60)}
function mpScan(r,ids){if(!Array.isArray(ids))return;const P=planets();
  for(const id of ids.slice(0,60)){if(!/^[\w-]{1,40}$/.test(String(id)))continue;const p=P.find(q=>q.id===id);if(p&&!sv(id).sc){sv(id).sc=1;toast('📡 '+p.n+' escaneado por '+r.n)}}}

function surfTick(dt){
  const L=LAND;if(!L)return;L.t+=dt;if(!L.S.done)bakeStep(L.S,L.ph==='surf'?10:7);peerStep(L,dt);
  if(L.ph==='down'){if(L.t>=L.D){L.ph='surf';L.t=0;while(!L.S.done)bakeStep(L.S,1e9);L.snap=snapOf(L);mkUI().sf.classList.remove('hide');toast('Aterrizaje completado en la zona '+zoneName(L.za)+' de '+L.p.n+' · explora la superficie ([F] recoger rocas y plantas)');try{saveGame()}catch(e){}}return}
  if(L.ph==='up'){if(L.t>=L.D)finishUp();return}
  if(L.pop){L.pop.t+=dt;if(L.pop.t>.6)L.pop=null}
  if(L.gath){L.gath.t+=dt;if(L.gath.t>=L.gath.T)gatherDone(L);L.walk=0;revealStep(L);return}
  // --- movimiento del explorador ---
  let dx=0,dy=0;if(KEYS.KeyW||KEYS.ArrowUp)dy--;if(KEYS.KeyS||KEYS.ArrowDown)dy++;if(KEYS.KeyA||KEYS.ArrowLeft)dx--;if(KEYS.KeyD||KEYS.ArrowRight)dx++;
  if(dx||dy){L.tgt=null;L.autoUp=0;L.gt=null}
  else if(L.tgt){const tx=L.tgt.x-L.cx,ty=L.tgt.y-L.cy,d=Math.hypot(tx,ty);
    if(L.gt&&d<TS*1.2){const n=L.gt;L.gt=null;L.tgt=null;if(!L.taken.has(n.k))gatherStart(L,n)}
    else if(d<4){L.tgt=null;if(L.autoUp){startUp();return}}else{dx=tx/d;dy=ty/d}}
  const l=Math.hypot(dx,dy);let moving=false;
  if(l>0){dx/=l;dy/=l;const sp=(KEYS.ShiftLeft||KEYS.ShiftRight?175:105)*dt,nx=L.cx+dx*sp,ny=L.cy+dy*sp;
    if(!solidAt(L.S,nx,L.cy)){L.cx=nx;moving=true}if(!solidAt(L.S,L.cx,ny)){L.cy=ny;moving=true}
    if(moving)L.face=Math.atan2(dy,dx);else if(L.tgt&&!L.hold)L.tgt=null}
  L.walk=moving?(L.walk||0)+dt:0;
  if(Math.hypot(L.cx-L.S.sx,L.cy-L.S.sy)<TS*2.1){const a=Math.atan2(L.cy-L.S.sy,L.cx-L.S.sx),R=TS*2.1;L.cx=L.S.sx+Math.cos(a)*R;L.cy=L.S.sy+Math.sin(a)*R}   // no atraviesas la nave
  for(const r of peers(L)){const q=r.pl;if(q.f!==1)continue;if(Math.hypot(L.cx-q.px,L.cy-q.py)<TS*2.1){const a=Math.atan2(L.cy-q.py,L.cx-q.px),nx=q.px+Math.cos(a)*TS*2.1,ny=q.py+Math.sin(a)*TS*2.1;if(!solidAt(L.S,nx,ny)){L.cx=nx;L.cy=ny}}}   // tampoco atraviesan las naves de otros
  L.near=nearNode(L,L.cx,L.cy,TS*1.7);
  L.snap=snapOf(L);revealStep(L);
  L.mapT-=dt;if(L.mapOn&&L.mapT<=0){L.mapT=.3;renderMap()}
  for(const q of L.part){q.x+=q.vx*dt;q.y+=q.vy*dt;if(q.x>1)q.x-=1;if(q.y>1)q.y-=1;if(q.y<0)q.y+=1}}

/* ---- entrada: teclado y ratón/táctil sobre la superficie ---- */
addEventListener('keydown',e=>{if(state!=='planet')return;const c=e.code;
  if(/^(KeyW|KeyA|KeyS|KeyD|Arrow(Up|Down|Left|Right)|ShiftLeft|ShiftRight)$/.test(c))KEYS[c]=1;
  if(c==='KeyE'&&!e.repeat)takeoffReq();else if(c==='KeyF'&&!e.repeat&&LAND&&LAND.ph==='surf'&&LAND.near)gatherStart(LAND,LAND.near);else if(c==='KeyM'&&!e.repeat)toggleMap();else if(c==='Escape'&&LAND&&LAND.mapOn)closeMap();
  e.preventDefault();e.stopImmediatePropagation()},true);
addEventListener('keyup',e=>{if(KEYS[e.code])delete KEYS[e.code]},true);addEventListener('blur',()=>{KEYS={}});
function sfZ(){return cl(Math.min(W,H)/360,1.3,3.2)*(LAND?LAND.zf:1)}
function sfWorld(px,py){const z=sfZ();return{x:LAND.cx+(px-W/2)/z,y:LAND.cy+(py-H/2)/z}}
addEventListener('pointerdown',e=>{if(state!=='planet'||e.target!==cv||!LAND||LAND.ph!=='surf')return;e.stopImmediatePropagation();e.preventDefault();
  LAND.hold=1;LAND.autoUp=0;const w=sfWorld(e.clientX,e.clientY),n=nearNode(LAND,w.x,w.y,TS*.8);if(n){LAND.gt=n;LAND.tgt={x:n.x,y:n.y}}else{LAND.gt=null;LAND.tgt=w}},true);
addEventListener('pointermove',e=>{if(state!=='planet'||!LAND||!LAND.hold||LAND.gt)return;LAND.tgt=sfWorld(e.clientX,e.clientY)},true);
addEventListener('pointerup',()=>{if(LAND)LAND.hold=0},true);
addEventListener('wheel',e=>{if(state!=='planet'||!LAND||e.target!==cv)return;e.preventDefault();e.stopImmediatePropagation();LAND.zf=cl(LAND.zf*Math.exp(-e.deltaY*.0012),.6,2)},{capture:true,passive:false});

/* ---- mapa del planeta (bloqueado: se revela al explorar) ---- */
function toggleMap(){const L=LAND;if(!L||L.ph!=='surf')return;if(L.mapOn)closeMap();else{L.mapOn=1;L.mapT=0;mkUI();$('plMap').classList.remove('hide');renderMap()}}
function closeMap(){if(LAND)LAND.mapOn=0;if(UI)$('plMap').classList.add('hide')}
function renderMap(){
  const L=LAND;if(!L)return;const box=$('plMap'),Z=8;
  if(!box._ok){box.innerHTML='<div class="sb" id="plMt" style="letter-spacing:.14em;font-size:13px"></div><canvas id="plMc" width="'+NB*Z+'" height="'+NB*Z+'"></canvas><div style="opacity:.7;font-size:12px;margin-bottom:8px">Las zonas bloqueadas (?) se desbloquean explorando el planeta a pie.</div><button class="sq" style="position:static" id="plMx">Cerrar [M]</button>';box._ok=1;$('plMx').onclick=closeMap}
  $('plMt').textContent='MAPA DE '+L.p.n.toUpperCase()+' · explorado '+exploredPct(L.p)+' %';
  const c=$('plMc').getContext('2d'),S=L.S,bs=4*BR;c.imageSmoothingEnabled=true;
  c.fillStyle='#050b14';c.fillRect(0,0,NB*Z,NB*Z);
  for(let j=0;j<NB;j++)for(let i=0;i<NB;i++){const x=i*Z,y=j*Z;
    if(L.rev[j*NB+i])c.drawImage(S.bake,i*bs,j*bs,bs,bs,x,y,Z+.5,Z+.5);
    else{c.fillStyle=((i+j)&1)?'#0a1626':'#08121f';c.fillRect(x,y,Z,Z);if(((i*7+j*3)%13)===0){c.fillStyle='rgba(120,200,255,.28)';c.font='7px monospace';c.fillText('?',x+2,y+7)}}}
  c.strokeStyle='rgba(120,200,255,.10)';c.lineWidth=1;for(let i=0;i<=NB;i+=4){c.beginPath();c.moveTo(i*Z+.5,0);c.lineTo(i*Z+.5,NB*Z);c.stroke();c.beginPath();c.moveTo(0,i*Z+.5);c.lineTo(NB*Z,i*Z+.5);c.stroke()}
  const mk=(x,y,col,r)=>{c.fillStyle=col;c.beginPath();c.arc(x/TS/4*Z,y/TS/4*Z,r,0,PI2);c.fill();c.strokeStyle='#000';c.lineWidth=1;c.stroke()};
  mk(S.sx,S.sy,'#4fd1ff',4.5);mk(L.cx,L.cy,'#7dff9b',3.5);
  for(const r of peers(L)){const q=r.pl;mk(q.px,q.py,'#ffb347',4);if(q.f===1&&r.ex!=null){mk(r.ex,r.ey,'#ffd166',3);c.fillStyle='#ffd166';c.font='9px monospace';c.fillText(r.n,r.ex/TS/4*Z+5,r.ey/TS/4*Z+3)}}}

/* ---- dibujo de la superficie y de las animaciones de descenso / despegue ---- */
function drawGround(L,cx,cy,z,alpha){
  const S=L.S,vw=W/z,vh=H/z,i0=Math.max(0,Math.floor((cx-vw/2)/TS)),j0=Math.max(0,Math.floor((cy-vh/2)/TS)),i1=Math.min(NT-1,Math.ceil((cx+vw/2)/TS)),j1=Math.min(NT-1,Math.ceil((cy+vh/2)/TS));
  if(i1<i0||j1<j0)return;g.save();g.globalAlpha=alpha;g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
  const X=u=>W/2+(u-cx)*z,Y=v=>H/2+(v-cy)*z,kk=TS/BR*z;
  if(S.done)g.drawImage(S.bake,i0*BR,j0*BR,(i1-i0+1)*BR,(j1-j0+1)*BR,X(i0*TS),Y(j0*TS),(i1-i0+1)*TS*z,(j1-j0+1)*TS*z);
  else{const sw=(i1-i0+1)*BR,dw=(i1-i0+1)*TS*z;for(let b=Math.floor(j0*BR/16);b<=Math.min(S.nb-1,Math.floor(((j1+1)*BR-1)/16));b++)if(S.bd[b])g.drawImage(S.bake,i0*BR,b*16,sw,16,X(i0*TS),Y(b*16/BR*TS)-.5,dw,16*kk+1)}   // solo las bandas ya pintadas
  if(z>.5&&S.done){
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const d=decoAt(S,i,j);if(!d)continue;const k=j*NT+i;if((d.t==='rock'||d.t==='plant')&&(L.taken.has(k)||L.pt.has(k)))continue;
      const ox=(hc(i,j,5)-.5)*TS*.6,oy=(hc(i,j,6)-.5)*TS*.6,x=X((i+.5)*TS+ox),y=Y((j+.5)*TS+oy),q=(.75+hc(i,j,8)*.5)*z,sd=hc(i,j,9);
      if(d.t==='tree'){g.fillStyle='rgba(0,20,10,.28)';g.beginPath();g.ellipse(x+3*q,y+4*q,9*q,7*q,0,0,PI2);g.fill();g.fillStyle='#235f31';g.beginPath();g.arc(x,y,9*q,0,PI2);g.fill();g.fillStyle='#34843f';g.beginPath();g.arc(x-1.8*q,y-2*q,6*q,0,PI2);g.fill();g.fillStyle='#4aa150';g.beginPath();g.arc(x-3*q,y-3.2*q,2.8*q,0,PI2);g.fill()}
      else if(d.t==='bush'){g.fillStyle='rgba(0,20,10,.22)';g.beginPath();g.ellipse(x+1.5*q,y+2*q,5*q,3.5*q,0,0,PI2);g.fill();g.fillStyle='#3f8c3d';g.beginPath();g.arc(x,y,4.4*q,0,PI2);g.fill();g.fillStyle='#5eaa4e';g.beginPath();g.arc(x-1*q,y-1*q,2.2*q,0,PI2);g.fill()}
      else if(d.t==='rock'){const near=L.near&&L.near.k===k;g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(x+1.8*q,y+2.4*q,7*q,4.4*q,0,0,PI2);g.fill();
        g.fillStyle='#8b8883';g.beginPath();g.moveTo(x-6*q,y+2*q);g.lineTo(x-3*q,y-4.5*q);g.lineTo(x+3*q,y-4*q);g.lineTo(x+6.5*q,y+1*q);g.lineTo(x+2*q,y+4.4*q);g.lineTo(x-3*q,y+4*q);g.closePath();g.fill();
        g.fillStyle='rgba(255,255,255,.28)';g.beginPath();g.moveTo(x-3*q,y-4.5*q);g.lineTo(x+3*q,y-4*q);g.lineTo(x+1*q,y-.5*q);g.lineTo(x-3.4*q,y);g.closePath();g.fill();
        if(near){g.strokeStyle='rgba(125,255,155,'+(.6+.3*Math.sin(time*6))+')';g.lineWidth=2;g.beginPath();g.arc(x,y,10*q,0,PI2);g.stroke()}}
      else if(d.t==='plant'){const near=L.near&&L.near.k===k,fc=sd<.33?'#ff8fc8':sd<.66?'#ffd75e':'#b79cff';g.strokeStyle='#3b8a3f';g.lineWidth=1.6*q;g.lineCap='round';
        for(let a=0;a<4;a++){const an=-Math.PI/2+(a-1.5)*.55;g.beginPath();g.moveTo(x,y+3*q);g.quadraticCurveTo(x+Math.cos(an)*3*q,y+Math.sin(an)*4*q,x+Math.cos(an)*6.5*q,y+Math.sin(an)*7*q);g.stroke()}
        g.fillStyle=fc;g.beginPath();g.arc(x,y-2*q,2.6*q,0,PI2);g.fill();g.fillStyle='#fff6c8';g.beginPath();g.arc(x,y-2*q,1*q,0,PI2);g.fill();
        if(near){g.strokeStyle='rgba(125,255,155,'+(.6+.3*Math.sin(time*6))+')';g.lineWidth=2;g.beginPath();g.arc(x,y-1*q,9*q,0,PI2);g.stroke()}}
      else if(d.t==='spire'){g.fillStyle='#6a4328';g.beginPath();g.moveTo(x,y-10*q);g.lineTo(x+4.5*q,y+3*q);g.lineTo(x-4.5*q,y+3*q);g.closePath();g.fill();g.fillStyle='rgba(255,220,170,.25)';g.beginPath();g.moveTo(x,y-10*q);g.lineTo(x+4.5*q,y+3*q);g.lineTo(x,y+3*q);g.closePath();g.fill()}
      else if(d.t==='crystal'){g.fillStyle='rgba(200,235,255,.88)';g.strokeStyle='#e9f6ff';g.lineWidth=1;g.beginPath();g.moveTo(x,y-9*q);g.lineTo(x+4.5*q,y);g.lineTo(x,y+6*q);g.lineTo(x-4.5*q,y);g.closePath();g.fill();g.stroke()}}}
  g.restore()}
function drawExplorer(L,z,cx,cy){
  const x=W/2+(L.cx-cx)*z,y=H/2+(L.cy-cy)*z,w=L.walk?Math.sin(L.walk*11)*.5:0,r=5.2*z;
  g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(x+1.5*z,y+2.5*z,r*1.1,r*.8,0,0,PI2);g.fill();
  g.save();g.translate(x,y);g.rotate(L.face);
  g.fillStyle='#6a7d94';g.fillRect(-r*1.15,-r*.55,r*.6,r*1.1);                       // mochila
  g.fillStyle='#e9f2ff';g.beginPath();g.ellipse(0,0,r*(1+.06*w),r*.95,0,0,PI2);g.fill();g.strokeStyle='#9fb7d6';g.lineWidth=1.2;g.stroke();
  g.fillStyle='#4fd1ff';g.beginPath();g.ellipse(r*.45,0,r*.42,r*.5,0,0,PI2);g.fill();g.fillStyle='rgba(255,255,255,.6)';g.fillRect(r*.45,-r*.3,r*.2,r*.18);   // visor
  g.restore();
  if(L.gath){const pr=L.gath.t/L.gath.T;g.strokeStyle='rgba(0,0,0,.45)';g.lineWidth=5;g.beginPath();g.arc(x,y-r*2.4,r*1.1,0,PI2);g.stroke();g.strokeStyle='#7dff9b';g.lineWidth=4;g.beginPath();g.arc(x,y-r*2.4,r*1.1,-Math.PI/2,-Math.PI/2+PI2*pr);g.stroke()}
  if(L.pop){const k=L.pop.t/.6,px=W/2+(L.pop.x-cx)*z,py=H/2+(L.pop.y-cy)*z;g.strokeStyle='rgba(125,255,155,'+(1-k)+')';g.lineWidth=2;g.beginPath();g.arc(px,py,(8+24*k)*z/2,0,PI2);g.stroke()}}
function drawLandShip(L,x,y,sc,th,tt){const T_s=tt||T;
  g.save();g.fillStyle='rgba(0,0,0,.28)';g.beginPath();g.ellipse(x+4*sc,y+6*sc,22*sc,15*sc,0,0,PI2);g.fill();g.restore();
  drawS(x,y,-Math.PI/2,T_s.sh,T_s.col,sc,{h:1,th,lg:true,p:th>0?undefined:{eng:0,eg2:0}})}
function drawPeers(L,z,cx,cy){
  const X=u=>W/2+(u-cx)*z,Y=v=>H/2+(v-cy)*z;
  for(const r of peers(L)){const q=r.pl,t=TYPES[r.ti]||T,px=X(q.px),py=Y(q.py);
    if(px>-220&&px<W+220&&py>-220&&py<H+220){
      let e=1;if(q.f===0)e=sm(cl((q.s-.5)/.5,0,1));else if(q.f===2)e=1-sm(cl(q.s/.5,0,1));        // llega del cielo / se va al cielo
      if(e>.02){g.save();g.globalAlpha=e;drawLandShip(L,px,py-(1-e)*z*30,z*1.5*lerp(2.2,1,e),0,t);g.restore()}}
    if(q.f===1&&r.ex!=null){const x=W/2+(r.ex-cx)*z,y=H/2+(r.ey-cy)*z,rr=5.2*z,w=q.w?Math.sin(time*11)*.5:0;
      if(x<-60||x>W+60||y<-60||y>H+60)continue;
      g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(x+1.5*z,y+2.5*z,rr*1.1,rr*.8,0,0,PI2);g.fill();
      g.save();g.translate(x,y);g.rotate(r.efa||0);g.fillStyle='#8d7a66';g.fillRect(-rr*1.15,-rr*.55,rr*.6,rr*1.1);
      g.fillStyle='#fff1e0';g.beginPath();g.ellipse(0,0,rr*(1+.06*w),rr*.95,0,0,PI2);g.fill();g.strokeStyle='#d6b48f';g.lineWidth=1.2;g.stroke();
      g.fillStyle='#ffb347';g.beginPath();g.ellipse(rr*.45,0,rr*.42,rr*.5,0,0,PI2);g.fill();g.fillStyle='rgba(255,255,255,.6)';g.fillRect(rr*.45,-rr*.3,rr*.2,rr*.18);g.restore();
      if(q.g){g.strokeStyle='#ffd166';g.lineWidth=3;g.beginPath();g.arc(x,y-rr*2.4,rr*1.1,0,PI2);g.stroke()}
      txt(r.n,x,y-rr*2.9,'#ffd9a0','center',12)}}}
function renderLand(){
  const L=LAND;if(!L)return;const p=L.p,ty=T_(p.type);g.fillStyle='#02040a';g.fillRect(0,0,W,H);
  if(L.ph==='surf'){
    const cx=L.cx+0,cy=L.cy,z=sfZ();drawGround(L,cx,cy,z,1);
    const sx=W/2+(L.S.sx-cx)*z,sy=H/2+(L.S.sy-cy)*z;drawLandShip(L,sx,sy,z*1.5,0);drawPeers(L,z,cx,cy);drawExplorer(L,z,cx,cy);
    g.fillStyle='rgba('+ty.descent.haze+',.55)';for(const q of L.part){g.fillRect(q.x*W,q.y*H,q.s,q.s)}
    const vg=g.createRadialGradient(W/2,H/2,Math.min(W,H)*.35,W/2,H/2,Math.hypot(W,H)*.6);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,10,.45)');g.fillStyle=vg;g.fillRect(0,0,W,H);
    const u=CFG.ui||1;vHud(()=>{const pc=exploredPct(p);txt(p.n.toUpperCase()+' · '+ty.label,16,24,'#78ffc8','left',14);txt('Superficie explorada '+pc+' %',16,44,'#cfe8ff','left',12);
      const nr=Math.hypot(L.cx-L.S.sx,L.cy-L.S.sy)<TS*3.4,bg=(typeof ITM!=='undefined')?ITM.bagCount():0;if(bg)txt('En la nave: '+bg+' objetos recogidos',16,64,'#ffd166','left',12);{const np=peers(L).filter(r=>r.pl.f===1).length;if(np)txt('Exploradores en el planeta: '+(np+1)+' · zona '+zoneName(L.za),16,84,'#ffd9a0','left',12)}
      if(L.near&&!L.gath)txt('[F] Recoger '+(L.near.t==='rock'?'roca':'planta'),W/2/u,(H-46)/u,'#7dff9b','center',14);txt(nr?'[E] Despegar':'WASD / clic: mover · [F] recoger · [E] volver a la nave y despegar',W/2/u,(H-18)/u,nr?'#7dff9b':'rgba(207,232,255,.7)','center',13)});
    return}
  const up=L.ph==='up',s=cl(up?1-L.t/L.D:L.t/L.D,0,1),sp=Math.min(W,H);
  // 1) vista orbital: la textura del planeta se agranda hasta el punto de aterrizaje
  const aS=1-sm(cl((s-.4)/.3,0,1)),a=L.za!=null?L.za:Math.atan2(ship.y-p.y,ship.x-p.x),tex=texOf(p),TS_=tex.width,u0=Math.cos(a)*.7,v0=Math.sin(a)*.7,
    tcx=(.5+.5*u0)*TS_,tcy=(.5+.5*v0)*TS_,wf=Math.exp(lerp(Math.log(1.4),Math.log(.008),sm(cl(s/.78,0,1)))),sw=TS_*wf,sh=sw*H/W;
  if(aS>0){g.save();g.globalAlpha=aS;g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
    g.drawImage(tex,tcx-sw/2,tcy-sh/2,sw,sh,0,0,W,H);g.restore()}
  // nubes que pasan a toda velocidad
  const cA=sm(cl((s-.18)/.2,0,1))*(1-sm(cl((s-.62)/.28,0,1)))*(ty.atm?1:0);
  if(cA>0){g.save();g.fillStyle='rgba('+ty.descent.haze+','+.28*cA+')';const n=Math.round(26*(.7+.7*hc(Math.round(a*4)+9,5,p.seed)));    // la nubosidad cambia de una zona a otra
    for(let i=0;i<n;i++){const an=hc(i,1,p.seed)*PI2,dd=hc(i,2,p.seed),rr=Math.pow(dd,.7)*Math.hypot(W,H)*.6*(.25+2.2*s*s),
      x=W/2+Math.cos(an)*rr,y=H/2+Math.sin(an)*rr,w=(30+hc(i,3,p.seed)*110)*(.4+3.2*s),h2=w*.35;g.beginPath();g.ellipse(x,y,w,h2,an,0,PI2);g.fill()}
    g.restore()}
  // 2) suelo (aparece al atravesar las nubes y se acerca hasta el zoom de la superficie)
  const gA=sm(cl((s-.5)/.3,0,1)),zF=sfZ(),zG=zF*lerp(.16,1,sm(cl((s-.5)/.5,0,1)));
  const dr=(1-sm(cl((s-.5)/.5,0,1)))*TS*30;if(gA>0)drawGround(L,L.S.sx-Math.cos(a)*dr,L.S.sy-Math.sin(a)*dr,zG,gA);   // el suelo real de la zona va deslizándose hasta el punto de aterrizaje
  // bruma atmosférica
  const hz=ty.atm?Math.sin(cl((s-.2)/.6,0,1)*Math.PI):0;if(hz>0){g.fillStyle='rgba('+ty.descent.haze+','+.55*hz*(.8+.3*hc(Math.round(a*4)+3,6,p.seed))+')';g.fillRect(0,0,W,H)}
  // 3) nave: constante en pantalla; calor de reentrada y retropropulsores
  let sx=W/2,sy=H/2;const heat=ty.descent.flame?Math.exp(-Math.pow((s-.38)/.13,2)):0,sc=Math.max(1.6,sp/230);
  if(heat>.02){sx+=(Math.random()-.5)*5*heat;sy+=(Math.random()-.5)*5*heat;g.save();g.globalCompositeOperation='lighter';
    const R=sc*58*(.8+heat*.9),q=g.createRadialGradient(sx,sy,0,sx,sy,R);q.addColorStop(0,'rgba(255,240,200,'+.9*heat+')');q.addColorStop(.35,'rgba(255,150,50,'+.7*heat+')');q.addColorStop(1,'rgba(255,60,20,0)');g.fillStyle=q;g.beginPath();g.arc(sx,sy,R,0,PI2);g.fill();
    g.strokeStyle='rgba(255,190,110,'+.5*heat+')';g.lineWidth=2;for(let i=0;i<14;i++){const an=hc(i,Math.floor(time*20),9)*PI2,r1=R*.5,r2=R*(1+.8*hc(i,4,3));g.beginPath();g.moveTo(sx+Math.cos(an)*r1,sy+Math.sin(an)*r1);g.lineTo(sx+Math.cos(an)*r2,sy+Math.sin(an)*r2);g.stroke()}g.restore()}
  const touch=sm(cl((s-.86)/.14,0,1)),sq=1-.05*Math.sin(touch*Math.PI);
  drawLandShip(L,sx,sy+(touch*0),sc*sq,up?1:.85);
  // polvo del suelo al posarse / despegar
  const dust=sm(cl((s-.8)/.2,0,1));if(dust>.05){g.save();g.fillStyle='rgba('+ty.descent.haze+','+.35*(1-Math.abs(dust-.7))+')';
    for(let i=0;i<16;i++){const an=i/16*PI2+hc(i,0,1),rr=sc*(30+90*dust*(.6+hc(i,1,2)*.6));g.beginPath();g.arc(W/2+Math.cos(an)*rr,H/2+Math.sin(an)*rr,sc*(8+14*dust),0,PI2);g.fill()}g.restore()}
  // fundido de entrada / salida
  const fade=up?sm(cl((s-.0)/.12,0,1)):1;if(!up&&s<.06){g.fillStyle='rgba(0,0,0,'+(1-s/.06)+')';g.fillRect(0,0,W,H)}
  if(up&&s<.12){g.fillStyle='rgba(0,0,0,'+(1-s/.12)+')';g.fillRect(0,0,W,H)}
  vHud(()=>{txt((up?'DESPEGANDO DE ':'DESCENDIENDO A ')+p.n.toUpperCase()+' · ZONA '+zoneName(a).toUpperCase(),W/2/(CFG.ui||1),50/(CFG.ui||1),'#ffd166','center',13)})}

/* ============================== GUARDADO ============================== */
let pendLand=null;
function save(){const o={v:1,s:{}};
  if(LAND){let ex='';for(let i=0;i<LAND.rev.length;i++)ex+=LAND.rev[i]?'1':'0';sv(LAND.p.id).ex=ex}
  for(const id in SV){const q=SV[id];if(q.sc||q.ex||(q.tk&&q.tk.length))o.s[id]={sc:q.sc?1:0,ex:q.ex||'',tk:q.tk||[]}}
  if(LAND&&LAND.snap)o.land=LAND.snap;return o}
function load(d){for(const k in SV)delete SV[k];pendLand=null;
  if(d&&typeof d==='object'&&d.s&&typeof d.s==='object')for(const id in d.s){const q=d.s[id];if(q&&/^[\w-]{1,40}$/.test(id))SV[id]={sc:q.sc?1:0,ex:typeof q.ex==='string'&&q.ex.length===NB*NB?q.ex:'',tk:Array.isArray(q.tk)?q.tk.slice(0,6000).map(x=>x|0):[]}}
  if(d&&d.land&&d.land.p&&typeof d.land.p==='object')pendLand=d.land}
function afterLoad(){if(pendLand){const sn=pendLand;pendLand=null;resume(sn)}}

/* ---- API pública ---- */
const EXTRA=[];
return{addType,norm,drawBack,tick,hud,click,drawMap,minZoom,save,load,afterLoad,render:renderLand,surfTick,mpInfo,mpIn,mpSc,mpScan,drawMini,miniTxt,stopNav,types:TY,showInfo,
  debug:()=>({land:LAND&&{ph:LAND.ph,t:LAND.t,cx:LAND.cx,cy:LAND.cy,rev:LAND.rev.reduce((a,b)=>a+b,0)},scan,orbit:!!ship.porb,mets:mets.length,k:curK,planets:planets().map(p=>p.id),sv:SV,tex:[...TX.keys()]}),
  _:{begin,genSurface,TY,planets,texOf,mkNoise,startScan:(p)=>{scan={p,t:0,px:W/2,py:H/2}},orbit,land,finishUp,takeoffReq,SV,setLand:()=>LAND}}
})();
