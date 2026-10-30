/* ============================================================================
   regions.js — Expansión modular del universo de StarLuge
   ----------------------------------------------------------------------------
   · Script clásico (no ES module): comparte el ámbito global con index.html y
     funciona igual con file://, localhost y GitHub Pages (/StarLuge/).
   · index.html NO depende de este archivo: si falla, el juego sigue igual
     (todas las llamadas desde index.html pasan por RGH(), que captura errores).
   · regions.json  = registro ligero (id, idx, forma, tamaño, archivo).
     region-expansion-XX.json = detalle de cada región (se carga solo cuando hace falta).
   · La región original ("origin", builtin) NO se toca: la sigue generando el
     código de siempre. Aquí solo se dibuja su límite en el mapa global.
   · Todo es determinista: semilla = hash(SEED del mundo, seed de la región, id).
   ========================================================================== */
const REGIONS=(function(){
'use strict';
const SRC=(document.currentScript&&document.currentScript.src)||location.href;
const ROOT=new URL('../../',SRC).href;               // raíz del repo (este archivo vive en js/expansions/); de ahí cuelgan regions.json y region-*.json
const url=f=>new URL(f,ROOT).href;

/* ---- parámetros de ajuste ---- */
const CS=2500;            // tamaño de celda de la rejilla espacial (u)
const RA=5000;            // radio de activación de asteroides (cubre minimapa 4500 y cámara a zoom mínimo ~2500)
const RREL=6500;          // radio a partir del cual se suspenden
const ENR=3800;           // radio de activación de enemigos (< 4500, que es donde el motor los purga)
const PRE=26000;          // distancia al borde de región a la que empieza la carga anticipada
const CAP=160;            // máximo de asteroides de región activos a la vez
const MAXC=4;             // regiones con detalle en caché (las más recientes)
const ENCAP=14;           // máximo de enemigos de región vivos a la vez
const BUDGET=2.5;         // ms por fotograma para generación progresiva
const AID0=10000000,AIDS=100000;   // ids de asteroides de región: AID0 + idx*AIDS + i  (no chocan con los del motor)
const TAU=Math.PI*2;

/* ---- utilidades ---- */
const h32=s=>{s=String(s);let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
const mul=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const num=(v,d)=>Number.isFinite(+v)?+v:d, cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const world=()=>typeof SEED==='number'?SEED:0;
async function fetchT(u,ms){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(u,{signal:c.signal});if(!r.ok)throw new Error('HTTP '+r.status+' '+u);return r}finally{clearTimeout(t)}}

/* ---- estado ---- */
const REG=new Map();          // id -> región
let LIST=[];                  // regiones en orden de registro
let regOk=false,regErr=null,HASH='',lock=null,hostHash=null,cur=null,clock=0,inited=false;
let SV={},pendDock=null;      // estado persistente cargado de la partida / acomodo de atraque pendiente
const live=new Map();         // enemigos de región vivos: clave -> npc
const byId=new Map();         // asteroides de región activos: id -> entidad
const spr=new Map();          // sprites reutilizados (anomalías)
const T={sweep:0,slow:0,pre:0};

/* ---- formas de las regiones: rect | ellipse | circle | blob (x,y = centro) ----
   blob = contorno orgánico e irregular inscrito en w×h (determinista por id): nunca sale del rectángulo w×h. */
const bk=(m,t)=>.85+.15*(.45*Math.sin(2*t+m.ph[0])+.3*Math.sin(3*t+m.ph[1])+.15*Math.sin(5*t+m.ph[2])+.1*Math.sin(7*t+m.ph[3]));   // radio relativo (0.7–1) según el ángulo
function inside(m,x,y,pad=0){const dx=Math.abs(x-m.x),dy=Math.abs(y-m.y);
  if(m.shape==='blob'){const u=(x-m.x)/(m.w/2),v=(y-m.y)/(m.h/2);return Math.hypot(u,v)<=bk(m,Math.atan2(v,u))+pad/Math.min(m.w/2,m.h/2)}
  if(m.shape==='circle')return Math.hypot(dx,dy)<=m.r+pad;
  if(m.shape==='ellipse')return(dx/(m.w/2+pad))**2+(dy/(m.h/2+pad))**2<=1;
  return dx<=m.w/2+pad&&dy<=m.h/2+pad}
function dist(m,x,y){const dx=Math.abs(x-m.x),dy=Math.abs(y-m.y);
  if(m.shape==='blob'){const u=(x-m.x)/(m.w/2),v=(y-m.y)/(m.h/2);return Math.max(0,Math.hypot(u,v)-bk(m,Math.atan2(v,u)))*Math.min(m.w/2,m.h/2)}
  if(m.shape==='circle')return Math.max(0,Math.hypot(dx,dy)-m.r);
  if(m.shape==='ellipse'){const a=m.w/2,b=m.h/2,k=Math.hypot(dx/a,dy/b);return k<=1?0:(k-1)*Math.min(a,b)}
  return Math.hypot(Math.max(0,dx-m.w/2),Math.max(0,dy-m.h/2))}
const ext=m=>m.shape==='circle'?[m.x-m.r,m.y-m.r,m.x+m.r,m.y+m.r]:[m.x-m.w/2,m.y-m.h/2,m.x+m.w/2,m.y+m.h/2];
const area=m=>m.shape==='circle'?Math.PI*m.r*m.r:m.shape==='ellipse'?Math.PI*m.w*m.h/4:m.shape==='blob'?Math.PI*m.w*m.h/4*.74:m.w*m.h;

/* ---- eventos (events.js): se carga solo desde aquí; cualquier fallo se captura y el juego sigue ---- */
let evSt='loading';
const EV=f=>{try{return typeof RGEV!=='undefined'?f(RGEV):undefined}catch(e){console.warn('[eventos]',e)}};
const fullHash=()=>HASH+(typeof RGEV!=='undefined'&&RGEV.ver?'.e'+RGEV.ver:'');   // host e invitado deben tener la misma versión de events.js
function loadEvents(){try{const sc=document.createElement('script');sc.src=url('js/expansions/events.js');sc.onload=()=>{evSt=typeof RGEV!=='undefined'?'ok':'fail'};sc.onerror=()=>{evSt='fail';console.warn('[eventos] no se pudo cargar events.js; el juego sigue sin eventos de región')};document.head.appendChild(sc)}catch(e){evSt='fail'}}

/* ---- jugadores a considerar: en multijugador el anfitrión ve a todos (mpPos del motor) ---- */
function players(){try{if(typeof mpPos==='function'){const p=mpPos();if(p&&p.length)return p}}catch(e){}return[{x:ship.x,y:ship.y}]}
const near=(pl,x,y,r)=>pl.some(p=>Math.hypot(p.x-x,p.y-y)<r);
const isGuest=()=>typeof MP!=='undefined'&&MP.role==='guest';
const CTX={LIST:()=>LIST,inside,dist,players,isGuest,clock:()=>clock};

/* ============================== REGISTRO ============================== */
async function loadRegistry(){
  try{
    const res=await fetchT(url('regions.json'),8000),j=await res.json(),seen=new Set(),idxs=new Set(),out=[];
    for(const q of Array.isArray(j.regions)?j.regions:[]){
      const ok=q&&/^[\w-]{1,40}$/.test(q.id)&&Number.isInteger(q.idx)&&q.idx>=0&&q.idx<900&&!seen.has(q.id)&&!idxs.has(q.idx)&&Number.isFinite(+q.x)&&Number.isFinite(+q.y)&&
        (q.shape==='circle'?+q.r>0:+q.w>0&&+q.h>0)&&(q.builtin||(typeof q.file==='string'&&/^[\w.-]+\.json$/.test(q.file)));   // el archivo debe estar en la raíz (sin carpetas)
      if(q&&q.enabled===false)continue;   // región desactivada en regions.json: no se carga ni se dibuja
      if(!ok){console.warn('[regiones] entrada de registro inválida, se ignora:',q&&q.id);continue}
      seen.add(q.id);idxs.add(q.idx);
      const m={id:q.id,idx:q.idx,name:String(q.name||q.id),builtin:!!q.builtin,file:q.file,shape:q.shape==='circle'||q.shape==='ellipse'||q.shape==='blob'?q.shape:'rect',x:+q.x,y:+q.y,r:+q.r||0,w:+q.w||(+q.r*2),h:+q.h||(+q.r*2),density:cl(num(q.density,.5),0,3),color:/^\d{1,3},\d{1,3},\d{1,3}$/.test(q.color)?q.color:'150,180,220',v:q.v|0};
      if(m.shape==='blob')m.ph=[0,1,2,3].map(i=>h32(m.id+':contorno:'+i)%628/100);
      if(m.builtin&&m.shape==='circle'&&typeof RINGR==='number')m.r=Math.max(m.r,Math.ceil((RINGR+(typeof RINGW==='number'?RINGW:2400))*1.08));   // la región original abarca su aro
      const R={id:m.id,m,st:m.builtin?'builtin':'idle',det:null,tries:0,retry:0,use:0,dep:new Map(),def:new Set(),fd:new Set(),vis:false,act:new Map(),grid:new Map(),ast:[],build:null,done:false,sent:new Map(),stn:[],spk:null,want:-99,todo:[],off:[]};
      out.push(R);REG.set(m.id,R);
    }
    LIST=out;HASH=h32(JSON.stringify(out.map(r=>[r.m.id,r.m.idx,r.m.shape,r.m.x,r.m.y,r.m.w,r.m.h,r.m.r,r.m.file,r.m.v]))).toString(36);
    regOk=true;applyState();
  }catch(e){regErr=e;console.warn('[regiones] no se pudo cargar regions.json; el juego sigue sin expansiones',e)}
}

/* ============================== DETALLE DE REGIÓN ============================== */
const OREK=k=>typeof MIN==='object'&&MIN[k];
function oreTab(t,tier){const o=(Array.isArray(t)?t:[]).filter(x=>Array.isArray(x)&&OREK(x[0])&&+x[1]>0).map(x=>[x[0],+x[1]]);
  if(o.length)return o;return tier>=3?[['pt',.3],['ti',.3],['ir',.3],['ne',.1]]:tier>=2?[['cr',.3],['pt',.3],['ti',.25],['ir',.15]]:[['fe',.5],['cu',.4],['cr',.1]]}
function norm(d,R){
  if(!d||typeof d!=='object'||d.id!==R.id)throw new Error('JSON de región inválido o con id distinto');
  const tier=cl(num(d.tier,1),0,4),A=d.asteroids||{},o={seed:num(d.seed,0)|0,tier,danger:cl(num(d.danger,tier),0,4),regen:Math.max(0,num(d.regenMin,30)),jobs:[],stations:[],anomalies:[],poi:[],enemies:[]},dn=R.m.density;
  let total=0;
  const flds=(Array.isArray(A.fields)?A.fields:[]).slice(0,60);
  flds.forEach((f,i)=>{const n=Math.round(cl(num(f.count,0),0,5000)*dn);if(n<=0)return;total+=n;o.jobs.push({k:'f',n,x:num(f.x,R.m.x),y:num(f.y,R.m.y),rx:Math.max(50,num(f.rx,2000)),ry:Math.max(50,num(f.ry,2000)),rot:num(f.rot,0),tier:cl(num(f.tier,tier),0,4),ore:oreTab(f.ore,tier),nm:String(f.n||'Campo'),mv:f.move?1:0,mvs:cl(num(f.moveSpeed,1),.2,3),i})});
  if(A.scatter){const n=Math.round(cl(num(A.scatter.count,0),0,8000)*dn);if(n>0){total+=n;o.jobs.push({k:'s',n,tier:cl(num(A.scatter.tier,tier),0,4),ore:oreTab(A.scatter.ore,tier),i:flds.length})}}
  if(total>AIDS-1)throw new Error('demasiados asteroides en '+R.id);
  const S=(a,m)=>(Array.isArray(a)?a:[]).slice(0,m);
  for(const s of S(d.stations,40))if(s&&s.n&&Number.isFinite(+s.x)&&Number.isFinite(+s.y))o.stations.push({n:String(s.n),x:+s.x,y:+s.y,r:cl(num(s.r,200),50,800),col:/^#[0-9a-f]{6}$/i.test(s.col)?s.col:'#7dff9b',tag:String(s.tag||'ESTACIÓN'),small:s.small?1:0,mult:cl(num(s.mult,1),.5,3),info:s.info?String(s.info):undefined,sty:s.sty?String(s.sty).slice(0,12):undefined,gd:cl(num(s.guards,0)|0,0,8)});
  for(const a of S(d.anomalies,100))if(a&&Number.isFinite(+a.x)&&Number.isFinite(+a.y))o.anomalies.push({id:String(a.id||'a'+o.anomalies.length),t:a.t==='i'||a.t==='w'?a.t:'e',n:String(a.n||'Anomalía'),x:+a.x,y:+a.y,r:cl(num(a.r,600),60,8000),col:/^\d{1,3},\d{1,3},\d{1,3}$/.test(a.col)?a.col:'120,255,170'});
  for(const p of S(d.poi,100))if(p&&Number.isFinite(+p.x)&&Number.isFinite(+p.y))o.poi.push({id:String(p.id||'p'+o.poi.length),n:String(p.n||'Punto de interés'),kind:p.kind==='gear'||p.kind==='laser'?p.kind:undefined,x:+p.x,y:+p.y,col:/^\d{1,3},\d{1,3},\d{1,3}$/.test(p.col)?p.col:'255,220,120'});
  for(const e of S(d.enemies,300))if(e&&Number.isFinite(+e.x)&&Number.isFinite(+e.y))o.enemies.push({id:String(e.id||'e'+o.enemies.length),x:+e.x,y:+e.y,n:cl(num(e.n,1)|0,1,12),radius:cl(num(e.radius,1000),100,6000),tier:cl(num(e.tier,tier),0,4)});
  if(d.event&&typeof d.event==='object')o.event=d.event;
  o.total=total;return o}

async function load(R){
  if(R.st==='loading'||R.st==='ready'||R.m.builtin||!regOk)return;
  R.st='loading';
  try{
    const res=await fetchT(url(R.m.file),10000),det=norm(await res.json(),R);
    R.det=det;R.seed=h32(world()+':'+det.seed+':'+R.id);R.st='ready';R.tries=0;R.use=clock;
    R.build={f:0,k:0};R.ast=[];R.grid=new Map();R.done=det.jobs.length===0;if(R.done)R.build=null;
    for(const s of det.stations){if(BASES.some(b=>b.n===s.n))continue;const b=Object.assign({rg:R.id},s);BASES.push(b);R.stn.push(b)}   // las estaciones se integran en el sistema de bases existente
    trimCache();dockCheck();
  }catch(e){R.st='error';R.tries++;R.retry=clock+Math.min(60,4*2**R.tries);console.warn('[regiones] fallo al cargar',R.id,'(se reintentará)',e)}
}
function unload(R){
  if(R.st!=='ready')return;
  for(const[i,e]of R.act){e.dead=1;byId.delete(e.id)}R.act.clear();
  for(const[k,n]of[...live])if(k.startsWith(R.id+':')){live.delete(k)}
  for(const b of R.stn){const i=BASES.indexOf(b);if(i>=0)BASES.splice(i,1)}npcs=npcs.filter(n=>!n.zg);R.stn=[];
  R.det=null;R.ast=[];R.grid=new Map();R.build=null;R.done=false;R.sent.clear();R.todo=[];R.off=[];R.st='idle'}
function trimCache(){
  const rd=LIST.filter(r=>r.st==='ready');if(rd.length<=MAXC)return;
  const pl=players();rd.sort((a,b)=>a.use-b.use);
  for(const r of rd){if(LIST.filter(q=>q.st==='ready').length<=MAXC)break;
    if(pl.some(p=>dist(r.m,p.x,p.y)<PRE*1.5))continue;       // nunca descargar una región cercana
    if(ship.docked&&ship.docked.rg===r.id)continue;
    unload(r)}}

/* ---- generación progresiva de asteroides (repartida entre fotogramas) ---- */
function addAst(R,job,k){
  const rg=mul(h32(R.seed+':'+job.i+':'+k)),m=R.m;let x=0,y=0,ok=false;
  const cr=Math.cos(job.rot||0),sr=Math.sin(job.rot||0),s1=h32(R.id+job.i)%628/100,s2=h32(job.i+R.id)%628/100;
  for(let t=0;t<10&&!ok;t++){
    if(job.k==='f'){const a=rg()*TAU,d=Math.sqrt(rg()),kk=1+.2*(Math.sin(2*a+s1)*.5+Math.sin(3*a+s2)*.3),ex=Math.cos(a)*d*job.rx*kk,ey=Math.sin(a)*d*job.ry*kk;x=job.x+ex*cr-ey*sr;y=job.y+ex*sr+ey*cr}
    else{const[x0,y0,x1,y1]=ext(m);x=x0+rg()*(x1-x0);y=y0+rg()*(y1-y0)}
    ok=inside(m,x,y,-100)&&!R.det.stations.some(s=>Math.hypot(s.x-x,s.y-y)<s.r+260)}
  if(!ok)return;       // posición descartada (el índice se conserva: sigue siendo determinista)
  let q=rg(),mk='fe';for(const[o,w]of job.ore){if(q<w){mk=o;break}q-=w;mk=o}
  const r=20+rg()*30+job.tier*4,i=R.ast.length;
  R.ast.push({x:Math.round(x),y:Math.round(y),r:Math.round(r*10)/10,m:mk,rot:rg()*TAU,j:job.i,mv:job.mv?job.mvs:0});
  const key=((Math.floor(x/CS)+1000)*4000)+(Math.floor(y/CS)+1000);let c=R.grid.get(key);if(!c)R.grid.set(key,c=[]);c.push(i)}
function buildStep(R){const b=R.build;if(!b)return;const t0=performance.now();
  while(b.f<R.det.jobs.length){const job=R.det.jobs[b.f];
    while(b.k<job.n){addAst(R,job,b.k++);if((b.k&15)===0&&performance.now()-t0>BUDGET)return}
    b.f++;b.k=0}
  R.build=null;R.done=true}

/* ---- activación / suspensión por proximidad ---- */
function planAst(R,pl){
  if(!R.done&&!R.ast.length)return;
  const todo=new Set(),off=[];
  for(const p of pl){if(dist(R.m,p.x,p.y)>RA)continue;
    const c0=Math.floor((p.x-RA)/CS),c1=Math.floor((p.x+RA)/CS),r0=Math.floor((p.y-RA)/CS),r1=Math.floor((p.y+RA)/CS);
    for(let cx=c0;cx<=c1;cx++)for(let cy=r0;cy<=r1;cy++){const c=R.grid.get((cx+1000)*4000+(cy+1000));if(!c)continue;
      for(const i of c){if(R.act.has(i)||R.dep.has(i)||todo.has(i))continue;const a=R.ast[i];if(Math.hypot(a.x-p.x,a.y-p.y)<RA)todo.add(i)}}}
  R.todo=[...todo];
  for(const[i,e]of R.act)if(!near(pl,e.x,e.y,RREL))off.push(i);
  R.off=off}
function spawnAst(R,i){
  const a=R.ast[i],rr=mul(h32(R.id+'#'+i)),sh=[];for(let k=0;k<9;k++)sh.push(.75+rr()*.4);
  const e={id:AID0+R.m.idx*AIDS+i,f:null,rg:R.id,ri:i,x:a.x,y:a.y,r:a.r,ore:a.r*1.1,m:a.m,rot:a.rot,sh};
  if(a.mv){const an=rr()*TAU,sp=(35+rr()*60)*a.mv;e.mv=1;e.vx=Math.cos(an)*sp;e.vy=Math.sin(an)*sp;e.vr=(rr()-.5)*.6;e.ox=a.x;e.oy=a.y;e.fj=R.det.jobs.find(q=>q.k==='f'&&q.i===a.j)||null}
  asts.push(e);R.act.set(i,e);byId.set(e.id,e)}
function markDep(R,i){R.dep.set(i,R.det&&R.det.regen>0?Date.now()+R.det.regen*60000:0)}
/* ---- asteroides móviles (campos con "move":1): derivan dentro de su zona, rebotan en su borde y entre sí ----
   El anfitrión / partida en solitario manda; el invitado integra el movimiento y se corrige con las posiciones del anfitrión. */
const LEASH=1800;
function stepMove(R,dt){
  const L=[];for(const e of R.act.values())if(e.mv&&!e.dead)L.push(e);if(!L.length)return;
  const guest=isGuest();
  for(const e of L){
    if(guest&&e.tx!=null){e.tx+=e.vx*dt;e.ty+=e.vy*dt;const k=Math.min(1,4*dt);e.x+=(e.tx-e.x)*k;e.y+=(e.ty-e.y)*k}
    e.x+=e.vx*dt;e.y+=e.vy*dt;e.rot+=e.vr*dt;
    const F=e.fj;
    if(F){const cr=Math.cos(F.rot),sr=Math.sin(F.rot),dx=e.x-F.x,dy=e.y-F.y,lx=dx*cr+dy*sr,ly=-dx*sr+dy*cr,ax=F.rx*1.2-e.r,ay=F.ry*1.2-e.r,u=(lx/ax)**2+(ly/ay)**2;
      if(u>1){const su=Math.sqrt(u),nx0=lx/(ax*ax),ny0=ly/(ay*ay),nl=Math.hypot(nx0,ny0)||1,nx=(nx0*cr-ny0*sr)/nl,ny=(nx0*sr+ny0*cr)/nl,l2x=lx/su,l2y=ly/su;
        e.x=F.x+l2x*cr-l2y*sr;e.y=F.y+l2x*sr+l2y*cr;const vn=e.vx*nx+e.vy*ny;if(vn>0){e.vx-=2*vn*nx;e.vy-=2*vn*ny}}}
    {const dx=e.x-e.ox,dy=e.y-e.oy,d=Math.hypot(dx,dy);if(d>LEASH){const nx=dx/d,ny=dy/d,vn=e.vx*nx+e.vy*ny;if(vn>0){e.vx-=2*vn*nx;e.vy-=2*vn*ny}}}}
  if(guest)return;
  for(let i=0;i<L.length;i++){const a=L[i];for(let j=i+1;j<L.length;j++){const b=L[j],dx=b.x-a.x;if(dx>140||dx<-140)continue;const dy=b.y-a.y;if(dy>140||dy<-140)continue;
    const d=Math.hypot(dx,dy),rr=a.r+b.r;if(d>=rr||d<.01)continue;
    const nx=dx/d,ny=dy/d,ma=a.r*a.r,mb=b.r*b.r,ov=rr-d;a.x-=nx*ov*mb/(ma+mb);a.y-=ny*ov*mb/(ma+mb);b.x+=nx*ov*ma/(ma+mb);b.y+=ny*ov*ma/(ma+mb);
    const rv=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(rv>=0)continue;
    const jm=-(1.9)*rv/(1/ma+1/mb);a.vx-=jm*nx/ma;a.vy-=jm*ny/ma;b.vx+=jm*nx/mb;b.vy+=jm*ny/mb;
    for(const q of[a,b]){const sp=Math.hypot(q.vx,q.vy);if(sp>150){q.vx*=150/sp;q.vy*=150/sp}}
    if(-rv>25&&near(players(),a.x,a.y,2600))try{boom((a.x+b.x)/2,(a.y+b.y)/2,4,'#aab')}catch(e){}}}}
function stepAst(R,dt){
  stepMove(R,dt||0.016);
  // 1) detectar asteroides agotados/destruidos (cambio persistente)
  for(const[i,e]of R.act)if(e.dead||e.ore<=.01){R.act.delete(i);byId.delete(e.id);markDep(R,i)}
  // 2) suspender lejanos
  let n=0;while(R.off.length&&n++<100){const i=R.off.pop(),e=R.act.get(i);if(e){e.dead=1;R.act.delete(i);byId.delete(e.id)}}
  // 3) activar cercanos (sin superar el tope global ni 50 por fotograma)
  n=0;while(R.todo.length&&n++<50&&byId.size<CAP){const i=R.todo.pop();if(!R.act.has(i)&&!R.dep.has(i))spawnAst(R,i)}}

/* ---- enemigos (solo anfitrión / partida en solitario: igual que el motor) ---- */
function mkEn(R,g,key,x,y){
  const home={x:g.x,y:g.y,tier:g.tier,ring:0,rg:R.id},e=mk('e',x,y,home);
  e.hp=e.max=Math.round(40*(1+.55*g.tier));e.dm=1+.3*g.tier;balE(e);
  const L=R.det.danger;if(L){e.hp=e.max=Math.round(e.max*(1+.2*L));e.dm=(e.dm||1)*(1+.14*L);e.fr=(e.fr||.8)*(1-.05*L);e.agr=(e.agr||900)+60*L}e.dl=L;e.rgk=key;return e}
function stepEn(R,pl,budget){
  for(const[k,n]of[...live]){if(!k.startsWith(R.id+':'))continue;
    if(n.hp<=0){R.def.add(k);live.delete(k)}else if(!npcs.includes(n))live.delete(k)}
  if(isGuest()||lock||(ship.docked&&!(typeof MP!=='undefined'&&MP.role==='host')))return 0;
  let made=0;
  for(const g of R.det.enemies){if(!near(pl,g.x,g.y,ENR))continue;
    for(let k=0;k<g.n;k++){const key=R.id+':'+g.id+':'+k;
      if(R.def.has(key)||live.has(key))continue;if(live.size>=ENCAP||made>=budget)return made;
      const rr=mul(h32(key)),a=rr()*TAU,d=Math.sqrt(rr())*g.radius,x=g.x+Math.cos(a)*d,y=g.y+Math.sin(a)*d;
      if(!near(pl,x,y,ENR+700))continue;
      const e=mkEn(R,g,key,x,y);npcs.push(e);live.set(key,e);made++}}
  return made}

/* ---- guardias de base (campo "guards" de la estación): patrullan y HUYEN al verte (el jefe de la región ya cayó) ---- */
const SEE=2300;let guardMsg=0;
function stepGuards(R,pl,dt){
  if(isGuest()||lock)return;
  for(const b of R.stn){if(!b.gd)continue;
    let gs=npcs.filter(n=>n.zg===b.n);
    const any=near(pl,b.x,b.y,9000);
    if(!any){if(gs.length&&!near(pl,b.x,b.y,12000)){npcs=npcs.filter(n=>n.zg!==b.n)}continue}
    for(let i=gs.length;i<b.gd;i++){const a=i/b.gd*TAU,e=mk('g',b.x+Math.cos(a)*(b.r+330),b.y+Math.sin(a)*(b.r+330),b);e.gv=1;e.zg=b.n;e.hp=e.max=260;e.oa=a;e.fm0=1;npcs.push(e);gs.push(e)}
    for(const n of gs){
      let tp=null,td=SEE;for(const p of pl){const d=Math.hypot(p.x-n.x,p.y-n.y);if(d<td){td=d;tp=p}}
      let vx,vy;
      if(tp&&!(ship.docked&&tp.x===ship.x&&tp.y===ship.y)){const a=Math.atan2(n.y-tp.y,n.x-tp.x);vx=Math.cos(a)*330;vy=Math.sin(a)*330;
        if(!guardMsg&&Math.hypot(ship.x-n.x,ship.y-n.y)<SEE&&state==='play'){guardMsg=1;toast('🛡 Los guardias de '+b.n+' huyen al verte: derrotaste a su jefe')}}
      else{n.oa+=.22*dt;const R0=b.r+330,tx=b.x+Math.cos(n.oa)*R0,ty=b.y+Math.sin(n.oa)*R0,a=Math.atan2(ty-n.y,tx-n.x),d=Math.hypot(tx-n.x,ty-n.y),sp=Math.min(200,d*1.2);vx=Math.cos(a)*sp;vy=Math.sin(a)*sp}
      const k=Math.min(1,2.5*dt);n.vx+=(vx-n.vx)*k;n.vy+=(vy-n.vy)*k;n.x+=n.vx*dt;n.y+=n.vy*dt;
      if(Math.hypot(n.vx,n.vy)>20)n.a=Math.atan2(n.vy,n.vx)}}}

/* ---- balizas con plano: se recogen acercándose (progreso por jugador, en QX.bp) ---- */
const BPI={gear:{n:'Tren de aterrizaje',col:'255,220,120',m:'📐 Plano obtenido: TREN DE ATERRIZAJE. Constrúyelo en la Base Zafiro (pestaña MEJORAS) con lapislázuli, zafiro y chatarra'},
  laser:{n:'Rayo francotirador',col:'169,139,255',m:'📐 Plano obtenido: RAYO FRANCOTIRADOR. Constrúyelo en la Base Zafiro (pestaña MEJORAS)'}};
const hasBp=k=>!!(typeof QX!=='undefined'&&QX.bp&&QX.bp[k]);
function stepZ(R){
  if(state!=='play'||ship.docked||ship.dead>0)return;
  for(const p of R.det.poi){if(!p.kind||hasBp(p.kind)||Math.hypot(ship.x-p.x,ship.y-p.y)>230)continue;
    QX.bp=QX.bp||{};QX.bp[p.kind]=1;toast(BPI[p.kind].m);try{boom(p.x,p.y,18,'#ffe08a')}catch(e){}try{saveGame()}catch(e){}}}
function drawBeacon(p){
  const k=p.kind,got=hasBp(k),c=BPI[k].col,t=time,pu=.5+.5*Math.sin(t*3+p.x);
  g.save();g.translate(p.x,p.y);
  let q=g.createRadialGradient(0,0,10,0,0,150);q.addColorStop(0,'rgba('+c+','+(got?.12:.32)+')');q.addColorStop(1,'rgba('+c+',0)');g.fillStyle=q;g.fillRect(-150,-150,300,300);
  if(!got){const e=(t*.7)%1;g.strokeStyle='rgba('+c+','+(.6*(1-e))+')';g.lineWidth=3;g.beginPath();g.arc(0,0,40+e*170,0,TAU);g.stroke()}
  g.save();g.rotate(t*(got?.15:.5));g.strokeStyle='rgba('+c+','+(got?.45:.9)+')';g.lineWidth=5;g.beginPath();g.arc(0,0,52,0,TAU);g.stroke();
  for(let i=0;i<4;i++){g.save();g.rotate(i*Math.PI/2);g.fillStyle='#1a2a40';g.fillRect(46,-9,24,18);g.strokeStyle='rgba('+c+',.8)';g.lineWidth=2;g.strokeRect(46,-9,24,18);g.fillStyle=Math.sin(t*4+i*1.6)>0&&!got?'rgb('+c+')':'#3a3320';g.fillRect(63,-3,5,6);g.restore()}g.restore();
  g.beginPath();for(let i=0;i<6;i++)g.lineTo(Math.cos(i*Math.PI/3)*30,Math.sin(i*Math.PI/3)*30);g.closePath();g.fillStyle='#16263b';g.fill();g.strokeStyle='#4a6c90';g.lineWidth=3;g.stroke();
  g.fillStyle='#0c1624';g.beginPath();g.arc(0,0,19,0,TAU);g.fill();
  g.fillStyle='rgba('+c+','+(got?.35:.6+.4*pu)+')';g.beginPath();g.moveTo(0,-15);g.lineTo(10,0);g.lineTo(0,15);g.lineTo(-10,0);g.closePath();g.fill();
  g.strokeStyle='rgba(255,255,255,'+(got?.3:.8)+')';g.lineWidth=1.5;g.stroke();
  g.restore()}

/* ---- descubrimientos (anomalías y puntos de interés) ---- */
function stepFound(R,pl){
  for(const a of R.det.anomalies)if(!R.fd.has(a.id)&&near(pl,a.x,a.y,a.r+400)){R.fd.add(a.id);toast('📡 Descubierto: '+a.n)}
  for(const p of R.det.poi)if(!R.fd.has(p.id)&&near(pl,p.x,p.y,700)){R.fd.add(p.id);toast('📡 Descubierto: '+p.n)}}

/* ============================== BUCLE ============================== */
function update(dt){
  if(!regOk||typeof state==='undefined'||state==='menu')return;
  clock+=dt;try{rimHit()}catch(e){}
  if(hostHash!==null&&HASH&&!lock&&evSt!=='loading'&&hostHash!==fullHash())setLock('Esta sala usa otra versión de las regiones: el contenido de las expansiones se desactiva en tu partida');
  const pl=players(),ready=LIST.filter(r=>r.st==='ready');
  // 1) generación progresiva (un solo presupuesto de tiempo para todo)
  for(const R of ready)if(R.build){buildStep(R);break}
  // 2) planificación cada 0.25 s; ejecución por fotograma
  T.sweep-=dt;const plan=T.sweep<=0;if(plan)T.sweep=.25;
  for(const R of ready){
    if(lock){if(R.act.size){for(const e of R.act.values()){e.dead=1;byId.delete(e.id)}R.act.clear()}continue}
    if(plan)planAst(R,pl);
    stepAst(R,dt);stepEn(R,pl,2);stepGuards(R,pl,dt);if(plan)stepZ(R);if(plan)stepFound(R,pl)}
  if(lock)EV(r=>r.abort());else EV(r=>r.update(dt,CTX));
  // 3) tareas lentas (0.5 s): región actual, carga anticipada, caducidad, caché
  T.slow-=dt;if(T.slow>0)return;T.slow=.5;
  const p0=pl[0];
  let here=null;for(const R of LIST)if(inside(R.m,ship.x,ship.y)&&(!here||area(R.m)<area(here.m)))here=R;
  if(here&&here!==cur){if(inited)toast(here.m.builtin?'↩ Vuelves a la región original':'▶ Región: '+here.m.name);cur=here;here.vis=true;inited=true}
  else if(!here&&cur){cur=null}
  const wd=(typeof warp!=='undefined'&&warp&&warp.dest)?warp.dest:null;
  for(const R of LIST){if(R.m.builtin)continue;
    const d=Math.min(...pl.map(p=>dist(R.m,p.x,p.y)),wd?dist(R.m,wd.x,wd.y):1e18);
    if(d<PRE*1.5)R.use=clock;
    const wantMap=clock-R.want<2;
    if((d<PRE||wantMap)&&(R.st==='idle'||(R.st==='error'&&clock>=R.retry)))load(R);
    if(R.st==='ready'&&R.dep.size){const now=Date.now();for(const[i,t]of R.dep)if(t&&now>t)R.dep.delete(i)}}
  trimCache();
}
function dockCheck(){if(!pendDock)return;const R=REG.get(pendDock.r),b=R&&R.stn.find(s=>s.n===pendDock.n);
  if(b&&!ship.docked&&state==='play'){ship.docked=b;pendDock=null;setState('hangar')}}

/* ============================== MAPA GLOBAL ============================== */
/* Borde natural de la región: asteroides repartidos en racimos y huecos a lo largo del límite (determinista por región), para saber cuándo entras o sales */
function rim(R){if(R.rimP)return R.rimP;const m=R.m,rg=mul(h32(R.id+'#rim')),TP=Math.PI*2,ph=[rg()*TP,rg()*TP,rg()*TP],B=[],o=[],mx=Math.max(m.w||0,m.h||0,(m.r||0)*2)||1;
  for(let i=0;i<360;i++){const t=i/360*TP,cs=Math.cos(t),sn=Math.sin(t);let lo=0,hi=mx;for(let k=0;k<18;k++){const md=(lo+hi)/2;if(inside(m,m.x+cs*md,m.y+sn*md))lo=md;else hi=md}B.push(lo)}
  const rB=t=>{const f=((t%TP)+TP)%TP/TP*360,i=Math.floor(f)%360,u=f-Math.floor(f);return B[i]*(1-u)+B[(i+1)%360]*u},
    dn=t=>Math.pow(Math.min(1,Math.max(0,.5+.5*(.6*Math.sin(4*t+ph[0])+.4*Math.sin(9*t+ph[1])+.3*Math.sin(17*t+ph[2])))),1.4)*.8+.2;
  /* asteroides decorativos del borde (no minables): [x,y,radio,—,rotación,forma]; se dibujan con drawAst() sin vetas de mineral. ~70 % más densos que antes */
  for(let g2=0;g2<40000&&o.length<1450;g2++){const t=rg()*TP;if(rg()>dn(t))continue;
    const gs=Math.sqrt(-2*Math.log(Math.max(1e-6,rg())))*Math.cos(TP*rg()),r=rB(t)+gs*380,x=m.x+Math.cos(t)*r,y=m.y+Math.sin(t)*r,sz=14+rg()*rg()*44,sh=[];
    for(let v=0;v<9;v++)sh.push(.75+rg()*.4);o.push([x,y,sz,null,rg()*TP,sh])}
  return R.rimP=o}
const RIMA={x:0,y:0,r:0,rot:0,sh:null,m:'',nm:1};
function rimWorld(){for(const R of LIST){if(R.m.builtin)continue;const o=rim(R);
    for(const q of o){if(!vis(q[0],q[1],q[2]*1.6+40))continue;RIMA.x=q[0];RIMA.y=q[1];RIMA.r=q[2];RIMA.rot=q[4];RIMA.sh=q[5];drawAst(RIMA)}}}
/* choque con los asteroides del borde: igual que con los reales (rebote y daño) */
function rimHit(){
  if(state!=='play'||ship.docked||ship.dead>0||(typeof shSafe==='function'&&shSafe()))return;
  if(EV(r=>r.towing&&r.towing()))return;
  const sx=ship.x,sy=ship.y;
  for(const R of LIST){if(R.m.builtin)continue;if(!inside(R.m,sx,sy,1800)||inside(R.m,sx,sy,-1800))continue;
    for(const q of rim(R)){const dx=sx-q[0];if(dx>q[2]+60||dx<-q[2]-60)continue;const dy=sy-q[1];if(dy>q[2]+60||dy<-q[2]-60)continue;
      const d=Math.hypot(dx,dy),Rr=q[2]+16;
      if(d<Rr&&d>0){const nx=dx/d,ny=dy/d,vn=ship.vx*nx+ship.vy*ny;ship.x=q[0]+nx*Rr;ship.y=q[1]+ny*Rr;
        if(vn<0){ship.vx-=1.5*vn*nx;ship.vy-=1.5*vn*ny;if(ship.cool<=0&&-vn>50){ship.cool=.6;ship.dest=null;hurt(-vn*.08,'⚠ Choque con asteroide: la nave recibe daño',Math.atan2(-ny,-nx));boom(ship.x-nx*16,ship.y-ny*16,8,'#ffb347')}}}}}}
function spk(R){if(R.spk)return R.spk;const m=R.m,rg=mul(h32(R.id)),n=Math.round(10+m.density*50),[x0,y0,x1,y1]=ext(m),o=[];
  for(let i=0;i<n*4&&o.length<n;i++){const x=x0+rg()*(x1-x0),y=y0+rg()*(y1-y0);if(inside(m,x,y,-50))o.push([x,y])}return R.spk=o}
function pathShape(m,X,Y,s){g.beginPath();
  if(m.shape==='circle')g.arc(X(m.x),Y(m.y),m.r*s,0,TAU);
  else if(m.shape==='ellipse')g.ellipse(X(m.x),Y(m.y),m.w/2*s,m.h/2*s,0,0,TAU);
  else if(m.shape==='blob'){for(let i=0;i<=120;i++){const t=i/120*TAU,k=bk(m,t),x=X(m.x+Math.cos(t)*k*m.w/2),y=Y(m.y+Math.sin(t)*k*m.h/2);i?g.lineTo(x,y):g.moveTo(x,y)}g.closePath()}
  else g.rect(X(m.x-m.w/2),Y(m.y-m.h/2),m.w*s,m.h*s)}
/* Factor de 'resumen' (0 = detalle · 1 = zona resumida) igual que Sistema Alfa: usa SYSZ0/SYSZ1 de ui.js */
const sumF=s=>{const z0=typeof SYSZ0==='number'?SYSZ0:.0075,z1=typeof SYSZ1==='number'?SYSZ1:.0105,t=cl((z1-s)/(z1-z0),0,1);return t};   // lineal, igual que sysA de Alfa
function regAt(x,y){let b=null;for(const R of LIST)if(!R.m.builtin&&inside(R.m,x,y)&&(!b||area(R.m)<area(b.m)))b=R;return b}
function sumA(x,y,s){return regAt(x,y)?sumF(s):0}       // 0..1: cuánto está resumida la región que contiene (x,y)
function sumName(x,y,s){const R=s<(typeof SYSZ0==='number'?SYSZ0:.0075)?regAt(x,y):null;return R?R.m.name:null}
function drawMap(X,Y,M){
  if(!LIST.length)return;const s=M.s;g.save();
  for(const R of LIST){
    const m=R.m,[x0,y0,x1,y1]=ext(m),sx0=X(x0),sx1=X(x1),sy0=Y(y0),sy1=Y(y1);
    if(sx1<-40||sx0>W+40||sy1<-40||sy0>H+40)continue;
    const px=Math.max(sx1-sx0,sy1-sy0),c=m.color;
    if(!m.builtin){
      /* igual que Sistema Alfa: lejos = zona resumida (fondo oscuro, borde marcado, solo el nombre); al acercar el zoom se funde y aparece el detalle */
      const f=sumF(s);   // como Sistema Alfa: al acercar el zoom no se dibuja nada (ni relleno ni borde); solo al alejar aparece la zona resumida
      if(f>0){g.save();g.globalAlpha=f;g.lineJoin='round';
        pathShape(m,X,Y,s);g.fillStyle='#050d1c';g.fill();g.fillStyle='rgba('+c+',.13)';g.fill();
        g.setLineDash([10,6]);g.lineWidth=2;g.strokeStyle='rgba('+c+',.85)';pathShape(m,X,Y,s);g.stroke();g.setLineDash([]);g.restore()}
    }else{const f=sumF(s);if(f>0){g.save();g.globalAlpha=f;g.setLineDash([10,7]);g.lineWidth=1;g.strokeStyle='rgba('+c+',.3)';pathShape(m,X,Y,s);g.stroke();g.setLineDash([]);g.restore()}}   /* borde de la zona interior (Alfa): como el resto, se funde al acercar el zoom */
    if(!m.builtin&&px>140&&R.st!=='ready')R.want=clock;                       // el mapa pide el detalle cuando se acerca el zoom
    const fs=m.builtin?0:sumF(s);                                             // factor de resumen (igual que Alfa)
    if(fs>=1){}                                                               // zona resumida: no se dibuja nada de dentro
    else if(!R.det){                                                          // simplificada: solo metadatos
      if(!m.builtin){g.globalAlpha=1-fs;g.fillStyle='rgba('+c+',.55)';for(const q of spk(R)){const x=X(q[0]),y=Y(q[1]);if(x>-5&&x<W+5&&y>-5&&y<H+5)g.fillRect(x-1,y-1,2,2)}g.globalAlpha=1}
    }else{
      g.globalAlpha=1-fs;
      if(s>.0012)for(const j of R.det.jobs)if(j.k==='f'){g.save();g.translate(X(j.x),Y(j.y));g.rotate(j.rot);g.beginPath();g.ellipse(0,0,j.rx*s,j.ry*s,0,0,TAU);g.fillStyle='rgba('+c+',.13)';g.fill();g.strokeStyle='rgba('+c+',.4)';g.lineWidth=1;g.stroke();g.restore();if(s>.0025)txt(j.nm,X(j.x),Y(j.y)+j.ry*s+11,'rgba('+c+',.8)','center',9)}
      if(s>.0025){for(const a of R.det.anomalies){g.beginPath();g.arc(X(a.x),Y(a.y),Math.max(3,a.r*s),0,TAU);g.fillStyle='rgba('+a.col+',.28)';g.fill();txt(a.n,X(a.x),Y(a.y)-Math.max(3,a.r*s)-3,'rgba('+a.col+',.85)','center',8)}
        for(const p of R.det.poi){const x=X(p.x),y=Y(p.y);g.fillStyle='rgba('+p.col+',.95)';g.beginPath();g.moveTo(x,y-4);g.lineTo(x+4,y);g.lineTo(x,y+4);g.lineTo(x-4,y);g.closePath();g.fill();txt(p.n,x+7,y+3,'rgba('+p.col+',.8)','left',8)}}
      if(s>.012){g.fillStyle='rgba('+c+',.9)';for(let i=0;i<R.ast.length;i++){const a=R.ast[i],x=X(a.x),y=Y(a.y);if(x>-3&&x<W+3&&y>-3&&y<H+3&&!R.dep.has(i))g.fillRect(x-1,y-1,2,2)}}
      g.globalAlpha=1
    }
    if(!m.builtin&&fs<1){g.save();g.globalAlpha=(1-fs)*.85;g.fillStyle='#8b94a8';for(const q of rim(R)){const x=X(q[0]),y=Y(q[1]);if(x>-4&&x<W+4&&y>-4&&y<H+4){const d=q[2]>34?2.4:1.6;g.fillRect(x-d/2,y-d/2,d,d)}}g.restore()}
    // etiqueta
    if(fs>0&&px>40){g.save();g.globalAlpha=fs;const cx=Math.max(60,Math.min(W-60,(sx0+sx1)/2)),cy=Math.max(24,Math.min(H-16,(sy0+sy1)/2));
      txt(m.name.toUpperCase(),cx,cy-8,'rgba('+c+',.98)','center',18);txt('zona de expansión · se detalla al acercar el zoom',cx,cy+12,'rgba('+c+',.7)','center',10);g.restore()}
    const lx=(sx0+sx1)/2,ly=m.builtin?sy0-8:Math.max(sy0+14,12);
    if(fs<1&&((px>14&&!m.builtin)||(m.builtin&&px>40&&px<1500))){const lab=m.name.toUpperCase();txt(lab,Math.max(60,Math.min(W-60,lx)),Math.max(14,Math.min(H-8,ly)),'rgba('+c+',.95)','center',px>300?13:px>60?10:8);
      if(px>150&&!m.builtin){const sub=R.st==='ready'?'':R.st==='loading'?'cargando…':R.st==='error'?'⚠ sin datos (reintentando)':'';if(sub||px>220)txt((km(m.w)+' × '+km(m.h))+(sub?' · '+sub:''),Math.max(60,Math.min(W-60,lx)),Math.max(14,Math.min(H-8,ly))+13,'rgba('+c+',.6)','center',9)}}
  }
  EV(r=>r.drawMap&&r.drawMap(X,Y,M.s));g.restore()}
function minZoom(){if(!LIST.length)return 0;let a=1e18,b=1e18,c=-1e18,d=-1e18;for(const R of LIST){const e=ext(R.m);a=Math.min(a,e[0]);b=Math.min(b,e[1]);c=Math.max(c,e[2]);d=Math.max(d,e[3])}
  const sp=Math.max(c-a,d-b)*1.1;return cl(Math.min(W,H)/sp,.0002,.004)}
function onZoom(f){if(f>=1||!LIST.length)return;const mz=minZoom();if(zoom>mz*1.6)return;
  let a=1e18,b=1e18,c=-1e18,d=-1e18;for(const R of LIST){const e=ext(R.m);a=Math.min(a,e[0]);b=Math.min(b,e[1]);c=Math.max(c,e[2]);d=Math.max(d,e[3])}
  mc.x+=((a+c)/2-mc.x)*.3;mc.y+=((b+d)/2-mc.y)*.3}       // al alejar al máximo, el mapa se centra en el universo completo

/* ============================== DIBUJO EN EL MUNDO ============================== */
function sprite(col){let c=spr.get(col);if(c)return c;c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),q=x.createRadialGradient(64,64,0,64,64,64);q.addColorStop(0,'rgba('+col+',.38)');q.addColorStop(1,'rgba('+col+',0)');x.fillStyle=q;x.fillRect(0,0,128,128);spr.set(col,c);return c}
function drawWorld(){
  EV(r=>r.drawWorld());
  for(const R of LIST){if(R.st!=='ready')continue;
    for(const a of R.det.anomalies){if(!vis(a.x,a.y,a.r+200))continue;const pu=.8+.2*Math.sin(time*2+a.x);g.globalAlpha=pu;g.drawImage(sprite(a.col),a.x-a.r,a.y-a.r,a.r*2,a.r*2);g.globalAlpha=1;
      if(a.t==='i'){g.strokeStyle='rgba('+a.col+',.5)';g.lineWidth=1.5;for(let i=0;i<5;i++){const t=time*1.5+i*1.26+a.y,r=a.r*(.3+.15*i);g.beginPath();g.moveTo(a.x+Math.cos(t)*r,a.y+Math.sin(t)*r);g.lineTo(a.x+Math.cos(t+.4)*(r+40),a.y+Math.sin(t+.4)*(r+40));g.stroke()}}
      txt(a.n.toUpperCase(),a.x,a.y-a.r*.5,'rgba('+a.col+',.8)','center',10)}
    for(const p of R.det.poi){if(!vis(p.x,p.y,200))continue;if(p.kind){drawBeacon(p);txt((hasBp(p.kind)?'Baliza · plano recogido':'Baliza · plano: '+BPI[p.kind].n),p.x,p.y-90,'rgba('+p.col+',.9)','center',12);continue}const k=R.fd.has(p.id),r=14+3*Math.sin(time*3);g.save();g.translate(p.x,p.y);g.rotate(time*.6);g.strokeStyle='rgba('+p.col+','+(k?.5:.9)+')';g.lineWidth=2;g.beginPath();g.moveTo(0,-r);g.lineTo(r,0);g.lineTo(0,r);g.lineTo(-r,0);g.closePath();g.stroke();g.restore();txt(p.n,p.x,p.y-26,'rgba('+p.col+',.85)','center',11)}}}

/* ============================== PERSISTENCIA ============================== */
function applyState(){for(const R of LIST){const s=SV[R.id];if(!s)continue;
  R.dep=new Map((Array.isArray(s.dp)?s.dp:[]).filter(q=>Array.isArray(q)&&Number.isInteger(q[0])).map(q=>[q[0],+q[1]||0]));
  R.def=new Set((Array.isArray(s.df)?s.df:[]).map(String));R.fd=new Set((Array.isArray(s.fd)?s.fd:[]).map(String));R.vis=!!s.vs}}
function save(){
  const o={v:1,r:{}};
  const items=LIST.length?LIST:Object.keys(SV).map(id=>({id,dep:new Map((SV[id].dp||[])),def:new Set(SV[id].df||[]),fd:new Set(SV[id].fd||[]),vis:SV[id].vs}));
  for(const R of items){const dp=[...R.dep],df=[...R.def],fd=[...R.fd];if(dp.length||df.length||fd.length||R.vis)o.r[R.id]={dp,df,fd,vs:R.vis?1:0}}
  for(const id in SV)if(!REG.has(id)&&!o.r[id])o.r[id]=SV[id];   // regiones desactivadas: conservar su progreso
  if(ship.docked&&ship.docked.rg)o.dock={r:ship.docked.rg,n:ship.docked.n};
  const ev=EV(r=>r.save());if(ev&&ev.c&&ev.c.length)o.e=ev;
  return o}
function loadSave(d){                       // las partidas anteriores no tienen 'rg': empiezan vacías (sin migración necesaria)
  EV(r=>r.load(d&&d.e));
  SV={};pendDock=null;if(!d||typeof d!=='object'||d.v!==1||!d.r||typeof d.r!=='object'){applyState();return}
  for(const id in d.r){const s=d.r[id];if(s&&typeof s==='object')SV[id]={dp:s.dp,df:s.df,fd:s.fd,vs:s.vs}}
  if(d.dock&&typeof d.dock.r==='string'&&typeof d.dock.n==='string')pendDock={r:d.dock.r,n:d.dock.n};
  applyState();dockCheck()}
const dk=b=>b&&b.rg?-1:BASES.indexOf(b);

/* ============================== MULTIJUGADOR ============================== */
function setLock(msg){lock=msg;toast('⚠ '+msg)}
/* Anfitrión → invitados: ore de asteroides de región que ha cambiado (y, en sincronización completa, los agotados). */
function mpDiff(full){
  const ore=[],dep={};
  for(const R of LIST){if(R.st!=='ready')continue;
    for(const[i,e]of R.act){const last=R.sent.has(i)&&!full?R.sent.get(i):e.r*1.1;if(Math.abs(e.ore-last)>.05){ore.push([e.id,+e.ore.toFixed(2)]);R.sent.set(i,e.ore)}}
    for(const[i]of R.dep){if(!R.sent.has('d'+i)||full){R.sent.set('d'+i,1);(dep[R.id]=dep[R.id]||[]).push(i)}}}
  const mv=[];for(const R of LIST){if(R.st!=='ready')continue;for(const e of R.act.values())if(e.mv&&!e.dead)mv.push([e.id,Math.round(e.x),Math.round(e.y),+e.vx.toFixed(1),+e.vy.toFixed(1)])}
  const ev=EV(r=>r.mpDiff(full));
  if(!ore.length&&!Object.keys(dep).length&&!ev&&!mv.length)return null;return{o:ore,d:dep,ev:ev||undefined,mv:mv.length?mv:undefined}}
function mpApply(D){
  if(!D||lock)return;
  if(D.ev)EV(r=>r.mpApply(D.ev));
  for(const q of Array.isArray(D.mv)?D.mv:[]){const e=byId.get(q[0]);if(e&&e.mv){e.vx=+q[3]||0;e.vy=+q[4]||0;if(e.tx==null){e.x=+q[1];e.y=+q[2]}e.tx=+q[1];e.ty=+q[2]}}
  for(const[id,ore]of D.o||[]){const e=byId.get(id);if(e){e.ore=ore;if(ore<=.01)e.dead=1}}
  for(const id in D.d||{}){const R=REG.get(id);if(!R)continue;for(const i of D.d[id]){if(!R.dep.has(i)){R.dep.set(i,R.det&&R.det.regen>0?Date.now()+R.det.regen*60000:0)}const e=R.act.get(i);if(e){e.dead=1;R.act.delete(i);byId.delete(e.id)}}}}
function mpHash(h){hostHash=String(h)}

/* ---- arranque ---- */
if(!/[?&]noregions\b/.test(location.search)){loadRegistry();loadEvents()}   // ?noregions en la URL desactiva las expansiones (útil para comparar/diagnosticar)
try{if(typeof window!=='undefined'&&window.__RGS)loadSave(window.__RGS)}catch(e){}

return{
  update,drawMap,drawWorld,rimWorld,sumA,sumName,minZoom,drawMini:(X,Y,s,m)=>EV(r=>r.drawMini&&r.drawMini(X,Y,s,m)),inAlfa:(x,y)=>!LIST.some(R=>!R.m.builtin&&inside(R.m,x,y,0)),
  cleared:id=>!!EV(r=>r.cleared(id)),locked:()=>!!EV(r=>r.lockJump()),
  at:(x,y)=>{const R=regAt(x,y);return R?R.id:null},
  stnPos:n=>{for(const R of LIST){const b=R.stn.find(s=>s.n===n);if(b)return{x:b.x,y:b.y,n:b.n}}return null},
  poiPos:(id,pid)=>{const R=REG.get(id),p=R&&R.det&&R.det.poi.find(q=>q.id===pid);return p?{x:p.x,y:p.y}:null},
  randPt:id=>{const R=REG.get(id);if(!R||!R.det)return null;const fs=R.det.jobs.filter(j=>j.k==='f');if(!fs.length)return null;const f=fs[Math.floor(Math.random()*fs.length)],a=Math.random()*TAU,d=Math.sqrt(Math.random())*.8,ex=Math.cos(a)*d*f.rx,ey=Math.sin(a)*d*f.ry,cr=Math.cos(f.rot),sr=Math.sin(f.rot);return{x:Math.round(f.x+ex*cr-ey*sr),y:Math.round(f.y+ex*sr+ey*cr),n:f.nm}},
  found:(id,fid)=>{const R=REG.get(id);return !!(R&&R.fd.has(fid))},
  vis:id=>{const R=REG.get(id);return !!(R&&R.vis)},pos:id=>{const R=REG.get(id);return R?{x:R.m.x,y:R.m.y,n:R.m.name}:null},onZoom,save,load:loadSave,dk,mpDiff,mpApply,mpHash,hash:()=>fullHash(),
  list:()=>LIST.map(r=>({id:r.id,st:r.st,name:r.m.name})),
  debug:()=>({ev:evSt,evd:EV(r=>r.debug()),regOk,regErr:regErr&&String(regErr),hash:HASH,lock,cur:cur&&cur.id,active:byId.size,live:live.size,
    regions:LIST.map(r=>({id:r.id,st:r.st,ast:r.ast.length,act:r.act.size,dep:r.dep.size,def:r.def.size,fd:r.fd.size,built:r.done,stn:r.stn.map(s=>s.n)}))}),
  _:{inside,dist,REG,byId,live,unload,load}
}})();
