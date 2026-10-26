/* ============================================================================
   core/combat.js — Entrada de disparo, daño, atraque, salto (warp) y colisiones entre naves.
   (Trozo de la antigua pieza única de index.html. Se carga como script clásico en orden:
   comparte el ámbito global con el resto de js/. NO cambies el orden de carga en index.html.)
   ========================================================================== */
"use strict";
const bF=$('bFire');bF.addEventListener('pointerdown',e=>{e.preventDefault();fireTouch=1});['pointerup','pointercancel','pointerleave'].forEach(t=>bF.addEventListener(t,()=>{fireTouch=0}));
addEventListener('pointerup',e=>{if(e.button===2)fireOn=0});addEventListener('blur',()=>{fireOn=0;fireTouch=0});
addEventListener('pagehide',saveGame);addEventListener('beforeunload',saveGame);document.addEventListener('visibilitychange',()=>{if(document.hidden)saveGame()});

/* ===== UPDATE ===== */
function shSafe(){return state==='ship'&&!MP.role}
function hurt(a,m,src){if((CFG.cre||MP.cre)&&CFG.inv)return;if(ship.docked||ship.dead||shSafe()||state==='hangar'||(state==='pause'&&pauseFrom==='hangar')||(state==='warp'&&warp&&warp.t>=warp.t1))return;if(state==='ship'&&src!=null){shHitT=time;shHitA=src}if(m&&msgT<=0){msgT=4;toast(m)}if(on('def'))a*=.65;ship.hit=3;ship.hitA=src;sfx('h');let d=a;const s=Math.min(ship.shd,d);ship.shd-=s;d-=s;ship.hull-=d;if(d>0){const k=zonePart(src),b4=ship.parts[k];ship.parts[k]=Math.max(0,b4-d*1.5);if(b4>=40&&ship.parts[k]<40&&ship.parts[k]>0)toast('⚠ '+NM[k]+' dañado');if(b4>0&&ship.parts[k]<=0)toast('✖ '+NM[k]+' destruido')}
  if(ship.hull<=0){ship.hull=0;ship.dead=1e9;ship.wreck=1;sel=null;ship.dest=ship.lock=ship.mt=ship.mc=ship.orbit=null;ship.wst='';boom(ship.x,ship.y,14,'#889');toast('Nave inutilizada: pide ayuda');if(state==='pause')closePause();else if(state==='ship')closeShip();wkOpen()}}
function gHit(b){for(const n of npcs)if(n.team==='g'&&n.hp>0&&Math.hypot(n.x-b.x,n.y-b.y)<(n.rad||18)){b.life=0;n.hp-=b.d;boom(b.x,b.y,5,'#f66');if(b.rb)return 1;if(n.om){omAn=time+60;toast('⚠ Has atacado a la guardia de Omega')}else{wantT=time+60;if(!wanted){wanted=1;toast('⚠ ¡Has atacado a la guardia de Alfa! Ahora te atacan todos')}}if(n.hp<=0)boom(n.x,n.y,26,'#ff8a5c');return 1}return 0}
function mineFx(o,c,dt,r){if(Math.random()<dt*45){const a=rnd(0,TAU),v=rnd(50,170);parts.push({x:o.x+Math.cos(a)*r*.7,y:o.y+Math.sin(a)*r*.7,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rnd(.2,.5),max:.5,c})}
 if(Math.random()<dt*26)sucks.push({x:o.x+rnd(-.6,.6)*r,y:o.y+rnd(-.6,.6)*r,life:.6,max:.6,c})}
function dockAt(b){if(b===OM||b.n===OM.n)cxFind({cxk:'go'});sfx('d');ship.docked=b;let gain=0;for(const k in ship.inv)gain+=Math.floor(ship.inv[k])*Math.round(C.sell*b.mult*(MIN[k]?MIN[k][2]:1));qEv('del',b.n,ship.inv);ship.inv={};ship.cred+=gain;qEv('dock',b.n);if(gain)qEv('sell',gain);
  toast(gain?`Mineral vendido: +${gain} cr`:`Atracado en ${b.n}`);ship.ore=0}
function updWarp(dt){const w=warp,h=w.h,A0=w.a,D=w.dest,T1=w.t1||.3,L=w.te-T1;w.t+=dt;if(w.z0==null){w.z0=zoom;wFollowJump(w)}
  ship.a+=angDiff(ship.a,h)*Math.min(1,18*dt);
  if(w.t<T1){ship.vx=ship.vy=0}
  else{const p=clamp((w.t-T1)/L,0,1),r=clamp(.3/L,.02,.3),nn=1-r;let e,de;/* perfil trapezoidal: arranque y frenado cortos, resto a velocidad constante (duración ∝ distancia) */
    if(p<r){de=p/r/nn;e=p*p/(2*r)/nn}else if(p>1-r){const q=1-p;de=q/r/nn;e=1-q*q/(2*r)/nn}else{de=1/nn;e=(r/2+p-r)/nn}
    const sp=dist(A0,D)*de/L;
    if(p>.5&&!w.done){w.done=1;npcs=npcs.filter(n=>n.team==='g');bullets=[]}
    ship.a=h;ship.x=A0.x+(D.x-A0.x)*e;ship.y=A0.y+(D.y-A0.y)*e;ship.vx=Math.cos(h)*sp;ship.vy=Math.sin(h)*sp;
    if(w.t>=w.te){ship.x=D.x;ship.y=D.y;{const k=T.spd*1.15;ship.vx=Math.cos(h)*k;ship.vy=Math.sin(h)*k;ship.dest=null;ship.orbit=null;ship.brake=0;ship.glT=.9}zRet=null;warp=null;cam.x=ship.x;cam.y=ship.y;setState('play');return}}
  cam.x=ship.x;cam.y=ship.y;ship.ft=[]}
function sczTick(){if(ship.docked||ship.dead>0||state!=='play')return;if(SCZ.gone){if(Date.now()<SCZ.gone)return;sczMove();return}if(SCZ.pcs.every((q,i)=>!scAv(i))){sczExhaust();return}const d=dist(ship,SCZ);if(sczDead())return;if(d<SCZ.r+600&&!SCZ.w){SCZ.w=1;toast('♻ Cementerio de naves: restos recuperables. Stock limitado: tardan en regenerarse')}else if(d>SCZ.r+1500)SCZ.w=0;if(d>SCZ.r+200)return;QX.wk=QX.wk||[];SCZ.pcs.forEach((q,i)=>{if(scAv(i)&&Math.hypot(q.x-ship.x,q.y-ship.y)<85){QX.wk[i]=Date.now()+SCZ.rs;const t=4+Math.floor(Math.random()*6),n=3;for(let k=0;k<n;k++)loot.push({x:q.x+rnd(-20,20),y:q.y+rnd(-20,20),v:Math.max(1,Math.round(t/n)),life:90});boom(q.x,q.y,10,'#d9b86a');toast('Restos desguazados: '+t+' de chatarra')}})}
function drawScz(){if(!vis(SCZ.x,SCZ.y,SCZ.r+400))return;for(const[x,y,sc,sh]of SCZ.hk)drawS(x,y,.9+x*.001,sh,'#7d8794',sc,{h:.1,p:{eng:0,eg2:0,wpn:0,min:0,jmp:0},th:0});SCZ.pcs.forEach((q,i)=>{if(!scAv(i)||!vis(q.x,q.y,40))return;g.save();g.translate(q.x,q.y);g.rotate(q.rot);g.beginPath();q.sh.forEach((k,j)=>{const a=j/q.sh.length*TAU;g[j?'lineTo':'moveTo'](Math.cos(a)*q.sz*k,Math.sin(a)*q.sz*k*.7)});g.closePath();g.fillStyle='#4a5260';g.fill();g.strokeStyle='rgba(217,184,106,'+(.55+.35*Math.sin(time*3+i))+')';g.lineWidth=1.6;g.stroke();g.strokeStyle='rgba(0,0,0,.6)';g.beginPath();g.moveTo(-q.sz*.5,0);g.lineTo(q.sz*.4,-q.sz*.2);g.stroke();g.restore();const k=.5+.5*Math.sin(time*4+i*2);g.fillStyle='rgba(255,220,130,'+(.2+.3*k)+')';g.beginPath();g.arc(q.x,q.y,q.sz*1.6,0,TAU);g.fill()})}
/* ===== colisiones entre naves: empujes, rebotes y daño leve por impacto fuerte ===== */
var colT=0;
function shipCol(dt){if(ship.wreck||ship.dead>0||ship.docked||state==='warp')return;
 const B=[];if(true)B.push({o:ship,r:15,m:1,p:1});
 for(const w of wing)if(w.hp>0&&!w.jp)B.push({o:w,r:14,m:1,w:1});
 for(const k in MPR){const r=MPR[k];if(mpLive(r))B.push({o:r,r:15,m:1,rp:1})}
 for(const n of npcs){if(n.evs||n.gv||n.hp<=0||n.static)continue;if(Math.abs(n.x-ship.x)>2600||Math.abs(n.y-ship.y)>2600)continue;const r=n.rad||(n.boss?55:n.team==='r'?18:14);B.push({o:n,r,m:r*r/200,n:1})}
 for(const q of (typeof svc!=='undefined'?svc:[]))if(!q.tow&&!q.arr)B.push({o:q,r:14,m:1,s:1});
 for(let i=0;i<B.length;i++){const a=B[i],A=a.o;for(let j=i+1;j<B.length;j++){const b=B[j],Bo=b.o;if(((a.p||a.w||a.s||(a.n&&a.o.team==='g'))&&(b.p||b.w||b.s||(b.n&&b.o.team==='g')))||(a.rp&&!b.p)||(b.rp&&!a.p))continue;
  const dx=Bo.x-A.x,dy=Bo.y-A.y,R=a.r+b.r;if(Math.abs(dx)>R||Math.abs(dy)>R)continue;const d=Math.hypot(dx,dy)||.01;if(d>=R)continue;
  const nx=dx/d,ny=dy/d,ov=R-d,im1=1/a.m,im2=1/b.m,sm=im1+im2,e1=im1/sm,e2=im2/sm;
  A.x-=nx*ov*e1;A.y-=ny*ov*e1;Bo.x+=nx*ov*e2;Bo.y+=ny*ov*e2;
  const vn=((Bo.vx||0)-(A.vx||0))*nx+((Bo.vy||0)-(A.vy||0))*ny;
  if(vn<0){const j2=-(1.5)*vn/sm;A.vx=(A.vx||0)-nx*j2*im1;A.vy=(A.vy||0)-ny*j2*im1;Bo.vx=(Bo.vx||0)+nx*j2*im2;Bo.vy=(Bo.vy||0)+ny*j2*im2;
   const hv=-vn;if(hv>220&&time-colT>.15){const dm=Math.min(14,(hv-220)*.04);colT=time;sfx('b',{x:A.x,y:A.y},4);boom((A.x+Bo.x)/2,(A.y+Bo.y)/2,4,'#ffd166');
    for(const c of[a,b]){const o=c.o;if(c.p){hurt(dm,'💥 Colisión con otra nave',Math.atan2(c.o===a.o?-ny:ny,c.o===a.o?-nx:nx))}else if(c.w)o.hp=Math.max(1,o.hp-dm*.6);else if(c.n&&o.team==='e')o.hp=Math.max(1,o.hp-dm)}}}}}}
/* ===== mundo (npcs, balas, eventos…): sigue en marcha aunque la nave esté rota o saltando ===== */

