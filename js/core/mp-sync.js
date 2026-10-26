/* ============================================================================
   core/mp-sync.js — Multijugador · sincronización del mundo (el anfitrión manda, el invitado aplica).
   (Trozo de la antigua pieza única de index.html. Se carga como script clásico en orden:
   comparte el ámbito global con el resto de js/. NO cambies el orden de carga en index.html.)
   ========================================================================== */
"use strict";
/* ===== SINCRONIZACIÓN DEL MUNDO · el anfitrión manda; todos ven lo mismo ===== */
const WRS=new Map();/* nave curada -> quien la cura (no se guarda en la partida) */
var MPCS=null;
var MP={role:null,code:'',id:'',name:'',ch:null,sb:null,peers:{},pend:{},msg:'',busy:0,joined:0,hostGone:0,share:1},MPR={};
if(MPG)document.body.classList.add('mp');
try{const v=localStorage.getItem('starluge_mpshare');if(v!==null)MP.share=v==='1'?1:0}catch(e){}
const NSK=['team','max','boss','role','om','evs','gv','evp','rad','dm','fr','agr','dl','slot','static'];
const GEVMSG={cv:'⚠ Flota desconocida en formación: se acerca',st:'⚡ Tormenta de iones en la zona: drena los escudos',mt:'☄ Lluvia de meteoritos en una zona amplia',tr:'📡 Mercader errante cerca: sigue la señal',cr:'📦 Cápsula de suministros a la deriva'};
const MPS={wid:0,gk:[],gq:[],gx:[],rid:0,gs:new Set(),pb:[],mi:{},mc:{},lp:[],eb:[],pk:new Set(),dd:new Set(),nid:0,ebn:0,pbn:0,bhd:new Set(),lid:0,cid:0,did:0,tk:0,si:0,sw:null,wt:0,full:1,fl:0,ak:null,ao:new Map(),lg:undefined,
 reset(){this.full=1;this.ak=null;this.lg=undefined},
 swapBegin(dt){this.sw=null;if(!(MP.role==='host')||spawnT-dt>0)return null;const pl=mpTargets();if(!pl.length)return null;this.si=(this.si+1)%(pl.length+1);if(!this.si)return null;const r=pl[this.si-1],s={x:ship.x,y:ship.y,vx:ship.vx,vy:ship.vy,docked:ship.docked,wreck:ship.wreck,dead:ship.dead};ship.x=r.x;ship.y=r.y;ship.vx=r.vx||0;ship.vy=r.vy||0;ship.docked=null;ship.wreck=0;ship.dead=0;this.sw=s;return s},
 swapEnd(s){if(s){Object.assign(ship,s);this.sw=null}}};
function mpGroup(){/* jugadores vivos y bastante juntos (a menos de 1800 u) del objetivo actual */
 const hp=MPS.hp||(MPS.sw?MPS.sw:ship),all=[{id:MP.id,x:hp.x,y:hp.y},...mpTargets().map(r=>({id:r.id,x:r.x,y:r.y}))],t={x:ship.x,y:ship.y},g=all.filter(q=>Math.hypot(q.x-t.x,q.y-t.y)<1800);
 if(!g.length)return{n:1,x:t.x,y:t.y,sep:0};let cx=0,cy=0;for(const q of g){cx+=q.x;cy+=q.y}cx/=g.length;cy/=g.length;let sep=0;for(const q of g)sep=Math.max(sep,Math.hypot(q.x-cx,q.y-cy));return{n:g.length,x:cx,y:cy,sep}}
function mpAt(f){const pl=MP.role==='host'?[{id:MP.id,x:ship.x,y:ship.y,vx:ship.vx,vy:ship.vy},...mpTargets().map(r=>({id:r.id,x:r.x,y:r.y,vx:r.vx||0,vy:r.vy||0}))]:[];if(pl.length<2)return f();const t=pl[Math.floor(Math.random()*pl.length)],s={x:ship.x,y:ship.y,vx:ship.vx,vy:ship.vy},n0=toasts.length;MPS.hp={x:s.x,y:s.y};MPS.gt=t===pl[0]?0:1;MPS.gg=0;Object.assign(ship,{x:t.x,y:t.y,vx:t.vx,vy:t.vy});try{f()}finally{Object.assign(ship,s);MPS.gt=0;MPS.hp=null}
 const ms=toasts.splice(n0).map(q=>q.t);if(MPS.gg){for(const m of ms){toast(m);mpBc('tt',{m})}}else if(t!==pl[0]){for(const m of ms)mpBc('tt',{to:t.id,m})}else for(const m of ms)toast(m);MPS.gg=0}
function mpSlave(){return !!(MPG&&MPG.role==='guest'&&MP.role==='guest'&&MP.joined&&!MP.hostGone)}
function mpTargets(){return MP.role==='host'?Object.values(MPR).filter(r=>mpLive(r)):[]}
function mpPos(){const a=[MPS.sw?{x:MPS.sw.x,y:MPS.sw.y}:{x:ship.x,y:ship.y}];if(MP.role==='host')for(const k in MPR){const r=MPR[k];if(r.sx!=null&&performance.now()-r.t<8000)a.push({x:r.x,y:r.y})}return a}
function mpD(o){if(!MP.role)return dist(o,ship);let m=1e9;for(const q of mpPos()){const d=Math.hypot(o.x-q.x,o.y-q.y);if(d<m)m=d}return m}
/* anfitrión: instantánea del mundo */
function mpAstDiff(full){const cur=new Map();for(const a of asts)if(!a.dead&&!a.rg)cur.set(a.id,a);const D={};
 if(full||!MPS.ak){MPS.ak=new Set();for(let i=1;i<=AID0;i++)MPS.ak.add(i);MPS.ao=new Map();D.f=1}
 const ad=[],rm=[],ore=[];
 for(const[id,a]of cur){if(!MPS.ak.has(id)){ad.push([id,a.f?FIELDS.indexOf(a.f):-1,Math.round(a.x),Math.round(a.y),+a.r.toFixed(1),+a.ore.toFixed(2),a.m,+a.rot.toFixed(2),a.sh.map(v=>+v.toFixed(2))]);MPS.ak.add(id);MPS.ao.set(id,a.ore)}
  const last=MPS.ao.has(id)?MPS.ao.get(id):a.r*1.1;if(Math.abs(a.ore-last)>.05){ore.push([id,+a.ore.toFixed(2)]);MPS.ao.set(id,a.ore)}}
 for(const id of [...MPS.ak])if(!cur.has(id)){rm.push(id);MPS.ak.delete(id);MPS.ao.delete(id)}
 if(ad.length)D.ad=ad;if(rm.length)D.rm=rm;if(ore.length)D.ore=ore;{const q=RGH(r=>r.mpDiff(full));if(q)D.rg=q}return D}
function mpWorld(){const t=performance.now(),P={},ps=mpPos(),k=++MPS.tk,full=MPS.full,sf=full||t-MPS.fl>3000;if(sf)MPS.fl=t;
 const near=o=>ps.some(q=>Math.abs(q.x-o.x)<7500&&Math.abs(q.y-o.y)<7500),nl=[],ns=[];
 for(const n of npcs){if(n.hp<=0||!near(n))continue;if(!n.id)n.id=++MPS.nid;nl.push([n.id,Math.round(n.x),Math.round(n.y),+(n.a||0).toFixed(2),Math.round(n.hp),Math.round(n.vx||0),Math.round(n.vy||0),(n.heal?1:0)|(n.fled?2:0)]);
  if(sf||!n.ms){n.ms=1;const s={id:n.id};for(const f of NSK)if(n[f]!=null)s[f]=n[f];ns.push(s)}}
 P.n=nl;if(ns.length)P.ns=ns;if(MPS.eb.length)P.eb=MPS.eb.splice(0,120);
 if(k%4===0||full)P.as=mpAstDiff(full);
 if(k%2===0||full){for(const c of cmts)if(!c.id)c.id=++MPS.cid;for(const d of derel)if(!d.id)d.id=++MPS.did;for(const l of loot)if(!l.id)l.id=++MPS.lid;
  P.cm=cmts.filter(c=>!c.dead).map(c=>({id:c.id,x:Math.round(c.x),y:Math.round(c.y),vx:+c.vx.toFixed(1),vy:+c.vy.toFixed(1),k:c.k,r:c.r,r0:c.r0,ore:+c.ore.toFixed(2),o0:c.o0,age:+c.age.toFixed(1),lg:c.lg,rot:+c.rot.toFixed(2),sh:c.sh.map(v=>+v.toFixed(2))}));
  P.dr=derel.filter(d=>!d.dead).map(d=>[d.id,Math.round(d.x),Math.round(d.y),d.z]);
  P.lt=loot.filter(l=>mpD(l)<7500).map(l=>[l.id,Math.round(l.x),Math.round(l.y),l.v,Math.round(l.life)])}
 if(k%20===0||full)P.af=ANOM.map((o,i)=>o.found?i:-1).filter(i=>i>=0);
 if(GEV.cur!==MPS.lg||full||(k%(GEV.cur&&GEV.cur.k==='cv'?6:20)===0&&GEV.cur)){MPS.lg=GEV.cur;if(GEV.cur){const o={};for(const f in GEV.cur){const v=GEV.cur[f];if(typeof v==='number'||typeof v==='string'||typeof v==='boolean')o[f]=v}P.ge=o}else P.ge=0}
 if(MPS.gq.length){P.gr=MPS.gq.filter(o=>o.k.life>0).map(o=>{const q=o.k;return[q.id,Math.round(q.x),Math.round(q.y),q.vx,q.vy,q.r,+q.life.toFixed(2),q.rot,q.vr,q.hot]});for(const o of MPS.gq)o.n--;MPS.gq=MPS.gq.filter(o=>o.n>0)}
 if(MPS.gx.length){P.gx=MPS.gx.map(o=>o.id);for(const o of MPS.gx)o.n--;MPS.gx=MPS.gx.filter(o=>o.n>0)}
 if(k%20===0||full)P.rv=RGH(r=>r.hash())||'none';P.pv=MP.pvp?1:0;P.cr=MP.cre?1:0;MPS.full=0;return P}
function mpEB(){for(const b of bullets)if((b.own==='e'||b.own==='g')&&!b.bid&&!b.gh){b.bid=++MPS.ebn;b.bk='e'+b.bid;MPS.eb.push([Math.round(b.x),Math.round(b.y),Math.round(b.vx),Math.round(b.vy),Math.round(b.d*10)/10,+b.life.toFixed(2),b.own==='e'?0:1,b.o&&b.o.id||0,b.bid])}}
/* invitado: aplica la instantánea */
function mpGuestNpcs(dt){const k=Math.min(1,9*dt);for(const n of npcs){if(n.tx==null)continue;n.x+=(n.tx+n.vx*.06-n.x)*k;n.y+=(n.ty+n.vy*.06-n.y)*k;n.a+=angDiff(n.a,n.ta)*k}}
let mpRsT=0;
function mpOnW(p){if(MP.role!=='guest'||!p)return;MPS.wt=performance.now();if(p.rv!=null)RGH(r=>r.mpHash(p.rv));
 if(p.pv!=null){const v=p.pv?1:0;if(v!==(MP.pvp?1:0)){MP.pvp=v;toast(v?'⚔ Modo PVP: los jugadores pueden dispararse entre sí':'🤝 Modo PVE: los jugadores son aliados');if(typeof mpOpen!=='undefined'&&mpOpen)mpRender()}}
 if(p.cr!=null){const v=p.cr?1:0;if(v!==(MP.cre?1:0)){MP.cre=v;mpCreApply();toast(v?'🛠 Modo creativo activado para toda la sala: todo infinito':'Modo creativo desactivado');if(typeof mpOpen!=='undefined'&&mpOpen)mpRender()}}
 if(p.n){const seen=new Set(),st=new Map(),cur=new Map(),out=[];if(p.ns)for(const q of p.ns)st.set(q.id,q);for(const n of npcs)if(n.id)cur.set(n.id,n);
  for(const q of p.n){const id=q[0];seen.add(id);let n=cur.get(id);
   if(!n){const s=st.get(id);if(!s){if(performance.now()-mpRsT>1500){mpRsT=performance.now();mpBc('rs',{})}continue}n=Object.assign({vx:0,vy:0,a:q[3],cd:0,home:A,x:q[1],y:q[2],hp:q[4]},s);cur.set(id,n)}else if(st.has(id))Object.assign(n,st.get(id));
   n.tx=q[1];n.ty=q[2];n.ta=q[3];n.hp=q[4];n.vx=q[5];n.vy=q[6];n.heal=q[7]&1;n.fled=(q[7]&2)?1:0;out.push(n)}
  for(const n of npcs)if(n.id&&!seen.has(n.id)&&n.hp>0&&(n.boss||n.hp<n.max*.4))boom(n.x,n.y,n.boss?40:22,'#ff8a5c');
  npcs=out}
 if(p.as){const D=p.as;if(D.f)asts=asts.filter(a=>a.id<=AID0||a.rg).map(a=>(a.rg||(a.ore=a.r*1.1),a));const am=new Map(asts.map(a=>[a.id,a]));
  for(const q of D.ad||[]){if(am.has(q[0]))continue;const a={id:q[0],f:q[1]>=0?FIELDS[q[1]]:null,x:q[2],y:q[3],r:q[4],ore:q[5],m:q[6],rot:q[7],sh:q[8]};if(q[1]<0)a.st=1;asts.push(a);am.set(a.id,a)}
  for(const id of D.rm||[]){const a=am.get(id);if(a)a.dead=1}for(const[id,o]of D.ore||[]){const a=am.get(id);if(a)a.ore=o}if(D.rg)RGH(r=>r.mpApply(D.rg))}
 if(p.cm){const old=new Map(cmts.map(c=>[c.id,c]));cmts=p.cm.map(q=>{const c=old.get(q.id);if(c){Object.assign(c,q);return c}return q})}
 if(p.dr)derel=p.dr.map(q=>({id:q[0],x:q[1],y:q[2],z:q[3]})).filter(d=>!MPS.dd.has(d.id));
 if(p.lt){const ids=new Set(p.lt.map(q=>q[0]));for(const id of [...MPS.pk])if(!ids.has(id))MPS.pk.delete(id);loot=p.lt.filter(q=>!MPS.pk.has(q[0])).map(q=>({id:q[0],x:q[1],y:q[2],v:q[3],life:q[4]}))}
 if(p.af)for(const i of p.af)if(ANOM[i])ANOM[i].found=1;
 if(p.ge!==undefined){const had=!!GEV.cur;if(p.ge&&GEV.cur&&GEV.cur.id===p.ge.id){for(const f in p.ge)if(f!=='in'&&f!=='fl'&&f!=='cx')GEV.cur[f]=p.ge[f]}else{GEV.cur=p.ge||null;if(p.ge&&!had)toast(GEVMSG[p.ge.k]||'Evento en la zona');else if(!p.ge)gvRocks=[]}}
 if(p.gr)for(const q of p.gr){if(MPS.gs.has(q[0]))continue;MPS.gs.add(q[0]);gvRocks.push({id:q[0],x:q[1],y:q[2],vx:q[3],vy:q[4],r:q[5],life:q[6],rot:q[7],vr:q[8],hot:q[9],sh:gvSh(q[0])})}
 if(p.gx)for(const id of p.gx){MPS.gs.add(id);const i=gvRocks.findIndex(r=>r.id===id);if(i>=0)gvRocks.splice(i,1)}
 if(MPS.gs.size>600)MPS.gs=new Set([...MPS.gs].slice(-300));
 if(p.eb)for(const q of p.eb)if(!(q[8]&&MPS.bhd.has('e'+q[8])))bullets.push({x:q[0],y:q[1],vx:q[2],vy:q[3],d:q[4],life:q[5],own:q[6]?'g':'e',o:q[7]?npcs.find(n=>n.id===q[7])||null:null,bk:q[8]?'e'+q[8]:null})}
function mpOnSt2(p){const h=MP.role==='host';
 if(h){const gE=GEV.cur;if(p.gp&&gE&&gE.id===p.gp&&gE.k==='cv'&&gE.ph==='dem'){gE.ph='go';gE.t=0;gvMsg('✔ Peaje pagado por '+((MPR[p.id]&&MPR[p.id].n)||'un piloto')+': la flota se retira')}if(p.gn&&gE&&gE.id===p.gn&&gE.k==='cv')gvHostile('⚠ Un piloto se niega: la flota ataca');
  if(p.gk)for(const id of p.gk){const i=gvRocks.findIndex(r=>r.id===id);if(i>=0)gvRocks.splice(i,1);MPS.gx.push({n:3,id})}
  if(p.tc&&GEV.cur&&GEV.cur.k==='tr')GEV.cur.cap=Math.max(0,GEV.cur.cap-p.tc);if(p.gd&&GEV.cur&&GEV.cur.id===p.gd)gvDone()}
 if(p.pb)for(const q of p.pb){const b={x:q[0],y:q[1],vx:q[2],vy:q[3],d:q[4],life:q[5],own:'p',o:null};if(q[6])b.wg=1;if(q[7])b.lz=1;if(q[8]){b.bk=p.id+'/'+q[8];if(MPS.bhd.has(b.bk))continue}if(h){b.by=p.id;b.rb=1}else b.gh=1;bullets.push(b)}
 if(h){if(p.mi)for(const[id,m]of p.mi)mpMineApply(id,m);if(p.mc)for(const[id,m]of p.mc){const c=cmts.find(q=>q.id===id);if(c)c.ore=Math.max(0,c.ore-m)}
  if(p.lp)for(const id of p.lp){const i=loot.findIndex(l=>l.id===id);if(i>=0)loot.splice(i,1)}}
 else if(p.w)mpOnW(p.w)}
function mpMineApply(id,m){const a=asts.find(q=>q.id===id);if(!a||a.dead)return;a.ore=Math.max(0,a.ore-m);if(a.ore<=.01){a.dead=1;boom(a.x,a.y,16,'#99a');for(let i=0;i<2;i++)loot.push({x:a.x+rnd(-20,20),y:a.y+rnd(-20,20),v:1+((Math.random()*3)|0),life:120})}}
function mpMined(id,m){if(mpSlave()&&id)MPS.mi[id]=(MPS.mi[id]||0)+m}
function mpMinedC(id,m){if(mpSlave()&&id)MPS.mc[id]=(MPS.mc[id]||0)+m}
/* recompensas y descubrimientos compartidos */
function mpKill(by,n){mpBc('kr',{to:by,b:n.boss?1:0,k:cxKey(n)})}
function mpOnKr(p){if(!p||p.to!==MP.id)return;ship.cred+=p.b?250:20;toast(p.b?'¡Jefe pirata destruido! +250 cr':'Pirata destruido: +20 cr');qEv('kill');cxFind({cxk:p.k})}
function mpCxShare(k){if(MP.role)mpBc('cx',{ks:[k],n:MP.name})}
function mpCxAll(){if(MP.role&&Object.keys(CXD).length)mpBc('cx',{ks:Object.keys(CXD),n:MP.name,q:1})}
function mpOnCx(p){if(!p||!p.ks)return;let nw=0;for(const k of p.ks)if(CXT[k]&&!CXD[k]){CXD[k]={o:Object.keys(CXD).length+1,k:0};nw++;if(!p.q)toast('📡 Codex: '+CXT[k].n+' descubierta por '+mpEsc(mpClean(p.n)||'un piloto'))}if(nw){try{saveGame()}catch(e){}}}
function mpOnAf(p){if(p&&ANOM[p.i])ANOM[p.i].found=1}
/* un disparo que impacta a un jugador desaparece en la vista de todos */
function mpBh(b){if(MP.role&&b.bk)mpBc('bh',{k:b.bk})}
function mpOnBh(p){if(!p||typeof p.k!=='string'||p.k.length>40)return;MPS.bhd.add(p.k);if(MPS.bhd.size>400)MPS.bhd=new Set([...MPS.bhd].slice(-200));for(const b of bullets)if(b.bk===p.k&&b.life>0){b.life=0;boom(b.x,b.y,4,b.own==='p'?'#f96':'#6cf')}}
function mpOnDr(p){if(!p)return;MPS.dd.add(p.id);for(const d of derel)if(d.id===p.id)d.dead=1}
/* mapa: los jugadores solo se ven si activan «Mostrar mi ubicación» */
function mpMapDraw(X,Y){if(!MP.role)return;for(const k in MPR){const r=MPR[k];if(!r.sh||r.sx==null||performance.now()-r.t>8000)continue;const x=X(r.x),y=Y(r.y),c=r.wk?'#ffd166':r.dk?'#4fd1ff':'#7dff9b';g.save();g.translate(x,y);g.rotate(r.a||0);g.fillStyle=c;g.strokeStyle='#05070d';g.lineWidth=1;g.beginPath();g.moveTo(8,0);g.lineTo(-6,-6);g.lineTo(-3,0);g.lineTo(-6,6);g.closePath();g.fill();g.stroke();g.restore();txt((r.n||'?')+(r.wk?' · inutilizada':''),x+11,y+4,c,'left',11)}}
$('ui').insertAdjacentHTML('beforeend','<button class="sq hide" id="bShare" style="position:absolute;left:14px;top:96px;pointer-events:auto"></button>');
$('bShare').onclick=()=>{MP.share=MP.share?0:1;try{localStorage.setItem('starluge_mpshare',MP.share?'1':'0')}catch(e){}toast(MP.share?'Ahora los demás ven tu ubicación en el mapa':'Tu ubicación en el mapa está oculta')};
setInterval(()=>{const b=$('bShare');if(!b)return;const v=!!(MPG&&MP.role&&mapV());b.classList.toggle('hide',!v);if(v)b.textContent='Mi ubicación: '+(MP.share?'VISIBLE':'OCULTA')},300);
