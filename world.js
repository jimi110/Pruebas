/* ============================================================================
   core/world.js — Mundo: zonas, campos de asteroides, bases, anomalías, balance de enemigos (BAL), cometas y fábrica de enemigos (mkE).
   (Trozo de la antigua pieza única de index.html. Se carga como script clásico en orden:
   comparte el ámbito global con el resto de js/. NO cambies el orden de carga en index.html.)
   ========================================================================== */
"use strict";
const WR=(a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296})(SEED||1),wr=(a,b)=>a+WR()*(b-a);
const placed=[{x:0,y:0,r:C.safeR}];
const MSEP=18000; /* distancia mínima entre minibases */
const P=(lx,ly,d0,d1,r,gap,av)=>{if(!SEED)return[lx,ly];for(let i=0;i<500;i++){const a=wr(0,TAU),d=wr(d0,d1),x=Math.cos(a)*d,y=Math.sin(a)*d;if(placed.every(q=>Math.hypot(q.x-x,q.y-y)>q.r+r+gap)&&(av||[]).every(q=>Math.hypot(q[0]-x,q[1]-y)>=MSEP)){placed.push({x,y,r});return[Math.round(x),Math.round(y)]}}const a=wr(0,TAU);return[Math.round(Math.cos(a)*d1),Math.round(Math.sin(a)*d1)]};
const UK=LEG?1:1.6,RINGR=40000*UK,RINGW=2400;
const pl=(d,a)=>[Math.round(Math.cos(a*Math.PI/180)*d),Math.round(Math.sin(a*Math.PI/180)*d)];
const NR=(c,d,r,fb)=>{if(!SEED||LEG)return fb;for(let i=0;i<300;i++){const a=wr(0,TAU),x=c[0]+Math.cos(a)*d,y=c[1]+Math.sin(a)*d;if(placed.every(q=>Math.hypot(q.x-x,q.y-y)>q.r+r+600)){placed.push({x,y,r});return[Math.round(x),Math.round(y)]}}return fb};
const PZ=(d,a,j0,j1,r,av)=>{const q=pl(d,a);return LEG?q:P(q[0]*UK,q[1]*UK,d*UK*j0,d*UK*j1,r,600,av)};
const pFe=PZ(11000,20,.9,1.1,2800),pCu=NR(pFe,3800*UK,300,[pFe[0]-3300,pFe[1]-1200]),pCob=PZ(21500,-110,.9,1.1,3300),pSur=PZ(26000,100,.9,1.08,3000),pNor=PZ(27000,-80,.9,1.08,3000),pBeta=PZ(15500,-30,.9,1.1,1800),pOm=PZ(34500,30,.9,1,800),pNo=PZ(15500,70,.85,1.15,400,[pCu]),pVe=PZ(15500,170,.85,1.15,400,[pCu,pNo]),pUm=PZ(21500,25,.9,1.1,400,[pCu,pNo,pVe]),pSc=PZ(9500,205,.85,1.15,900),pNeu=[0,0];
const BASES=[{n:'Base Alfa',x:0,y:0,r:620,col:'#4fd1ff',mult:1,tag:'PROTEGIDA'},{n:'Base Beta',x:pBeta[0],y:pBeta[1],r:420,col:'#ff9a4f',mult:1.5,tag:'SIN PROTECCIÓN · paga x1.5 · tienda de naves',info:'Piratas en la zona. Paga más por los minerales. Aquí se venden 2 naves.'},
 {n:'Estación Cobre',x:pCu[0],y:pCu[1],r:200,col:'#7dff9b',mult:1,tag:'ESTACIÓN · mejoras',small:1},{n:'Estación Vega',x:pVe[0],y:pVe[1],r:200,col:'#7dff9b',mult:1,tag:'ESTACIÓN · mejoras y armas',small:1,info:'Mejoras para tu nave y tienda de armas.'},{n:'Estación Nova',x:pNo[0],y:pNo[1],r:200,col:'#7dff9b',mult:1,tag:'ESTACIÓN · mejoras',small:1},{n:'Base Omega',x:pOm[0],y:pOm[1],r:420,col:'#ff7ad9',mult:1.5,tag:'BASE AVANZADA · tienda de naves',info:'Tienda de naves: aquí se vende la nave más avanzada. Acceso restringido: sus guardianes atacan a quien no tenga la tarjeta de acceso (se consigue en Estación Umbral).'},
 {n:'Estación Umbral',x:pUm[0],y:pUm[1],r:200,col:'#ffd166',mult:1,tag:'ESTACIÓN · mejoras · prueba de acceso',small:1,info:'Última estación antes de Omega: aquí se hace la prueba de pilotaje y se compra la tarjeta de acceso a Base Omega.'}];
const OM=BASES[5],UM=BASES[6];
/* Cementerio de naves: zona de chatarra muy limitada (piezas finitas que tardan en regenerarse) */
const SCZ={n:'Cementerio de naves',x:pSc[0],y:pSc[1],r:1000,rs:600000,pcs:[],olds:[],gone:0};
{let a=(SEED||1)*7919+13;const r=()=>{a=(a*1664525+1013904223)>>>0;return a/4294967296};for(let i=0;i<9;i++){const an=r()*TAU,d=Math.sqrt(r())*SCZ.r*.85;SCZ.pcs.push({x:Math.round(SCZ.x+Math.cos(an)*d),y:Math.round(SCZ.y+Math.sin(an)*d),rot:r()*TAU,sz:7+r()*7,sh:Array.from({length:7},()=>.7+r()*.5)})}
 SCZ.hk=[[SCZ.x-120,SCZ.y+90,.7,'esa'],[SCZ.x+260,SCZ.y-170,2.4,'pir']];}
const scAv=i=>Date.now()>((QX.wk||[])[i]||0);
const FIELD={n:'Campo de Hierro',x:pFe[0],y:pFe[1],r:1700,tier:0,col:'150,160,180',dng:'ZONA DE PELIGRO',n0:60,tb:[['fe',.7],['cu',.24],['cr',.05],['pt',.01]]};
const A=BASES[0],B=BASES[1];
const FIELDS=[FIELD,
 {n:'Campo Cobalto',x:pCob[0],y:pCob[1],r:1750,tier:1,col:'110,170,230',dng:'PELIGRO ALTO',n0:55,tb:[['cu',.35],['cr',.3],['pt',.15],['ti',.2]]},
 {n:'Cinturón Sur',x:pSur[0],y:pSur[1],r:2100,tier:2,col:'200,140,230',dng:'PELIGRO MUY ALTO',n0:70,tb:[['cr',.2],['pt',.3],['ti',.25],['ir',.25]]},
 {n:'Cinturón Norte',x:pNor[0],y:pNor[1],r:2100,tier:2,col:'230,160,120',dng:'PELIGRO MUY ALTO',n0:70,tb:[['cr',.2],['pt',.3],['ti',.25],['ir',.25]]},
 {n:'Campo Neutrón',x:pNeu[0],y:pNeu[1],r:1800,tier:3,col:'255,90,120',dng:'PELIGRO EXTREMO',n0:50,tb:[['pt',.2],['ti',.2],['ir',.33],['ne',.27]]}];
const BL={band:[1.5,.7,.13],clu:[1.1,.95,.17],arc:[1.25,.8,.15]};
function mkShape(F,k){F.k=k;const rt=F.rt=wr(0,TAU),c=Math.cos(rt),sn=Math.sin(rt),R0=F.r,pol=[];F.poly=pol;
 const E=(ax,ay)=>{F.ins=(x,y,m=0)=>{const dx=x-F.x,dy=y-F.y,u=dx*c+dy*sn,v=-dx*sn+dy*c;return(u/(ax+m))**2+(v/(ay+m))**2<=1};
  F.smp=()=>{const a=rnd(0,TAU),d=Math.sqrt(Math.random()),u=Math.cos(a)*d*ax,v=Math.sin(a)*d*ay;return[F.x+u*c-v*sn,F.y+u*sn+v*c]};
  const p=[];for(let i=0;i<72;i++){const a=i/72*TAU,w=1+.06*Math.sin(a*3+rt),u=Math.cos(a)*ax*w,v=Math.sin(a)*ay*w;p.push([F.x+u*c-v*sn,F.y+u*sn+v*c])}pol.push(p);F.r=ax};
 if(k==='ell')E(R0*1.4,R0*.65);
 else if(BL[k]){const[sx,sy,am]=BL[k],ax=R0*sx,ay=R0*sy,ph=[wr(0,TAU),wr(0,TAU),wr(0,TAU),wr(0,TAU)],hh=[am,am*.7,am*.5,am*.3],rf=a=>1+hh[0]*Math.sin(2*a+ph[0])+hh[1]*Math.sin(3*a+ph[1])+hh[2]*Math.sin(5*a+ph[2])+hh[3]*Math.sin(7*a+ph[3]);
  F.ins=(x,y,m=0)=>{const dx=x-F.x,dy=y-F.y,u=dx*c+dy*sn,v=-dx*sn+dy*c;return Math.hypot(u/ax,v/ay)<=rf(Math.atan2(v/ay,u/ax))+m/Math.min(ax,ay)};
  F.smp=()=>{for(let i=0;i<30;i++){const a=rnd(0,TAU),d=Math.sqrt(Math.random())*1.4,u=Math.cos(a)*d*ax,v=Math.sin(a)*d*ay,x=F.x+u*c-v*sn,y=F.y+u*sn+v*c;if(F.ins(x,y))return[x,y]}return[F.x,F.y]};
  const p=[];for(let i=0;i<90;i++){const a=i/90*TAU,k2=rf(a),u=Math.cos(a)*ax*k2,v=Math.sin(a)*ay*k2;p.push([F.x+u*c-v*sn,F.y+u*sn+v*c])}pol.push(p);F.r=R0*Math.max(sx,sy)*1.3}
 else{F.x=F.y=0;F.ring=1;const p1=wr(0,TAU),p2=wr(0,TAU),p3=wr(0,TAU),p4=wr(0,TAU),RR=a=>RINGR+1300*Math.sin(2*a+p1)+800*Math.sin(3*a+p2)+400*Math.sin(5*a+p3),RW=a=>RINGW*(1+.25*Math.sin(4*a+p4));F.rr=RR;
  F.ins=(x,y,m=0)=>{const a=Math.atan2(y,x);return Math.abs(Math.hypot(x,y)-RR(a))<=RW(a)+m};
  F.smp=()=>{const sa=Math.atan2(ship.y,ship.x);if(Math.abs(Math.hypot(ship.x,ship.y)-RR(sa))>5500)return null;const a=sa+rnd(-4500,4500)/RINGR,d=RR(a)+rnd(-1,1)*RW(a);return[Math.cos(a)*d,Math.sin(a)*d]};
  for(const sg of[1,-1]){const p=[];for(let i=0;i<360;i++){const a=i/360*TAU,rr=RR(a)+sg*RW(a);p.push([Math.cos(a)*rr,Math.sin(a)*rr])}pol.push(p)}F.r=RINGR+2500+RINGW*1.25;F.n0=260}}
FIELDS.forEach((F,i)=>mkShape(F,['ell','band','clu','arc','ring'][i]));
function fPoly(F,X,Y){g.beginPath();for(const p of F.poly){p.forEach((q,i)=>i?g.lineTo(X(q[0]),Y(q[1])):g.moveTo(X(q[0]),Y(q[1])));g.closePath()}}
const AN=(i,lx,ly,r)=>P(lx*UK,ly*UK,(5500+i*3500)*UK,(9500+i*4500)*UK,r,400);
const aE1=AN(0,6000,-3500,300),aE2=AN(1,11000,-1200,280),aI1=AN(2,3000,-4800,320),aI2=AN(3,-1500,2500,300),aW1=AN(4,9500,500,150),aW2=AN(5,2500,3500,150),aW3=AN(6,7500,-6200,150);
const ANOM=[{t:'e',n:'Nube de energía',x:aE1[0],y:aE1[1],r:300,col:'120,255,170'},{t:'e',n:'Nube de energía',x:aE2[0],y:aE2[1],r:280,col:'120,255,170'},{t:'i',n:'Campo de iones',x:aI1[0],y:aI1[1],r:320,col:'190,110,255'},{t:'i',n:'Campo de iones',x:aI2[0],y:aI2[1],r:300,col:'190,110,255'},{t:'w',n:'Pecio antiguo',x:aW1[0],y:aW1[1],r:150,col:'255,200,100'},{t:'w',n:'Pecio antiguo',x:aW2[0],y:aW2[1],r:150,col:'255,200,100'},{t:'w',n:'Pecio antiguo',x:aW3[0],y:aW3[1],r:150,col:'255,200,100'}];

let AID=0;const _mr0=Math.random;Math.random=(a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296})(((SEED||1)*2654435761)>>>0);
if(!EVENTOS)ANOM.length=0;ANOM.forEach(o=>{o.r0=o.r;o.jx=rnd(-400,400);o.jy=rnd(-400,400);o.found=0});const fp=()=>({eng:100,eg2:100,wpn:100,min:100,jmp:100});let wmap=0,wmapF=1,fireOn=0,fireTouch=0,svT=0,noSave=0,rq=[],zoom=.7,zp=.7,mc={x:0,y:0},loot=[],hold=0,msgT=0,warnT=0,mmZ=1,lp=0;let wanted=0,wantT=0,sucks=[],hgT=0;let state='hangar',T=TYPES[0],time=0,cam={x:0,y:0},asts=[],npcs=[],bullets=[],parts=[],derel=[],toasts=[],warp=null,sel=null,mouse=null,spawnT=0;
const ship={thr:1,brake:0,x:700,y:0,vx:0,vy:0,a:-1.57,hull:170,shd:170,en:100,ore:0,inv:{},cred:0,cd:0,hit:0,dest:null,docked:A,dead:0,rep:0,beam:null,cool:0,scrap:0,cm:{},parts:fp()};
const eff=k=>ship.parts[k]<=0?0:ship.parts[k]<40?.5:1;const toast=t=>{if(state==='menu'||/^(Toca |⚠ Enemigo|⚠ Choque|Objetivo fijado|Órbita)/.test(t))return;toasts.push({t,life:3.5})};
const MODES={col:['Recolección','#ffd166'],atk:['Ataque','#ff6b6b','Dispara solo con toda su potencia · gasta un poco de energía'],def:['Defensa','#5fd0ff','Disparo automático más lento y débil, sin coste · reduce el daño recibido y la velocidad'],rep:['Rescate','#c792ff']};let mode={};
const on=k=>T.md.includes(k)?!!mode[k]:k!=='def';
function buildModes(){$('modes').innerHTML=T.md.map(k=>`<button class="sq${mode[k]?' on':''}" data-k="${k}" style="--c:${MODES[k][1]}" title="${MODES[k][2]||''}">${MODES[k][0]}: ${mode[k]?'ON':'OFF'}</button>`).join('')}
$('modes').addEventListener('click',e=>{const b=e.target.closest('button');if(b){mode[b.dataset.k]=!mode[b.dataset.k];buildModes()}});
const pickOre=F=>{let q=Math.random();for(const[k,w]of F.tb){if(q<w)return k;q-=w}return F.tb[0][0]};
const ringPt=(F,dm)=>{for(let t=0;t<30;t++){const a=rnd(0,TAU),d=Math.sqrt(rnd(dm*dm,6400*6400)),x=ship.x+Math.cos(a)*d,y=ship.y+Math.sin(a)*d;if(F.ins(x,y)&&!asts.some(o=>Math.hypot(o.x-x,o.y-y)<90))return[x,y]}return null};
const mkAst=(F,q=F.smp())=>{if(!q)return null;const r=rnd(20,50)+F.tier*4;return{id:++AID,f:F,x:q[0],y:q[1],r,ore:r*1.1,m:pickOre(F),rot:rnd(0,TAU),sh:Array.from({length:9},()=>rnd(.75,1.15))}};
FIELDS.forEach(F=>{for(let i=0;i<F.n0;i++){const q=mkAst(F);if(q)asts.push(q)}});
const STRAYN=40,strayTb=d=>d<15000*UK?[['fe',.6],['cu',.35],['cr',.05]]:d<26000*UK?[['cu',.4],['cr',.35],['pt',.15],['ti',.1]]:[['cr',.3],['pt',.3],['ti',.25],['ir',.15]];
const mkStray=far=>{for(let k=0;k<60;k++){const a=rnd(0,TAU),d=rnd(3000*UK,36000*UK),x=Math.cos(a)*d,y=Math.sin(a)*d;if(far&&Math.hypot(x-ship.x,y-ship.y)<2600)continue;if(FIELDS.some(F=>F.ins(x,y,200))||BASES.some(b=>Math.hypot(b.x-x,b.y-y)<(b===B?1700:b.r+400)))continue;const r=rnd(20,42);return{id:++AID,f:null,st:1,x,y,r,ore:r*1.1,m:pickOre({tb:strayTb(d)}),rot:rnd(0,TAU),sh:Array.from({length:9},()=>rnd(.75,1.15))}}return null};
for(let i=0;i<STRAYN;i++){const q=mkStray(0);if(q)asts.push(q)}Math.random=_mr0;const AID0=AID;
const CK=[{n:'Cometa de hielo',c:'140,220,255',m:'Hielo cristalino',mc:'#a8e6ff'},{n:'Cometa ígneo',c:'255,150,80',m:'Ceniza ígnea',mc:'#ff9a5a'},{n:'Cometa etéreo',c:'200,140,255',m:'Polvo etéreo',mc:'#d6a8ff'}];
/* ===== EQUILIBRIO (FASE 6): parámetros de enemigos y eventos centralizados =====
   Etapa: 0 inicio · 1 permiso de Beta (c1.6) · 2 Beta alcanzada (c2.1) · 3 permiso de Omega (c2.7). Cada lista va indexada por etapa. */
const BAL={
 stage:()=>qdn('c2.7')?3:qdn('c2.1')?2:qdn('c1.6')?1:0,
 firstDelay:60,                          // s de calma al empezar o cargar la partida
 cd:[[45,80],[32,60],[24,45],[16,32]],   // s entre apariciones de enemigos en campos
 afterKill:[50,38,28,20],                // s mínimos sin apariciones tras destruir un enemigo
 maxE:[2,3,4,6],                         // enemigos sueltos simultáneos (sin jefe, escoltas ni eventos)
 capBase:[1,1,2,2],capTier:.7,           // por campo: capBase + floor(tier*capTier), máx. 4
 betaCap:[2,3,3,4],betaCd:[[14,26],[10,20],[10,20],[8,16]], // piratas de Base Beta: máximo y s entre apariciones
 spawnMin:1100,spawnMax:3000,baseSafe:1800, // distancia al jugador y a bases/estaciones al aparecer
 aggro:[600,700,800,900],                // radio de detección de los piratas
 hp:[.65,.8,1,1.15],dmg:[.55,.75,1,1.15],fr:[1.35,1.15,.95,.85], // escala de vida, de daño y s entre disparos
 boss:{min:0},                           // etapa mínima del evento de jefe pirata
 comet:{on:()=>qdn('c2.1'),first:150,cd:[240,420]} // cometas: solo tras alcanzar Beta; 1.er cometa >= first s
};
BAL.st={next:BAL.firstDelay,bNext:0,lk:-99};
const MAPALL=true; // mapa y minimapa sin niebla de exploración (las misiones de 'visitar' no dependen de esto)
let CXD={},pauseFrom='play',pauseAt=0,cxSel=null;
let cmts=[],cmT=50+Math.random()*40;
function spawnComet(){const k=Math.floor(Math.random()*CK.length),a=rnd(0,TAU),sp=rnd(140,210),tx=ship.x+rnd(-1300,1300),ty=ship.y+rnd(-1300,1300),x=ship.x+Math.cos(a)*4200,y=ship.y+Math.sin(a)*4200,d=Math.hypot(tx-x,ty-y),o=rnd(30,55);cmts.push({x,y,vx:(tx-x)/d*sp,vy:(ty-y)/d*sp,k,r:68,r0:68,ore:o,o0:o,age:0,lg:Math.random()<.07,rot:rnd(0,TAU),sh:Array.from({length:11},()=>rnd(.72,1.2))});toast('☄ '+CK[k].n+(cmts[cmts.length-1].lg?' de cola larga':'')+' cruza la zona · ¡cuidado con el choque!')}
function comHit(c){const a=Math.atan2(c.y-ship.y,c.x-ship.x);hurt(ship.shd+T.hull*.4+40,null,a);for(const k in ship.parts)ship.parts[k]=Math.max(0,ship.parts[k]-rnd(25,60));ship.vx-=Math.cos(a)*700;ship.vy-=Math.sin(a)*700;ship.dest=null;boom(ship.x+Math.cos(a)*18,ship.y+Math.sin(a)*18,48,'#cff');toast('⚠ ¡Impacto de cometa! Escudo roto y componentes dañados');c.ore=Math.max(0,c.ore-c.o0*.2)}
function mpM(){return MP&&MP.role==='host'?Math.max(1,Math.min(4,Object.keys(MP.peers).length)):1} // multiplicador por nº de jugadores (solo manda el anfitrión)
const balE=e=>{const g=BAL.stage(),M=mpM();e.hp=e.max=Math.round(e.max*BAL.hp[g]*M);e.dm=(e.dm||1)*BAL.dmg[g]*(1+(M-1)*.5);e.fr=.8*BAL.fr[g];e.agr=BAL.aggro[g];return e};
/* Nivel de peligro por distancia a Alfa: 0 cerca · 4 zona extrema. Escala vida, daño, cadencia, detección y tamaño de manada */
const dgr=(x,y)=>{const d=Math.hypot(x,y)/UK;return d<9500?0:d<17500?1:d<26500?2:d<34000?3:4};
const dscale=e=>{const L=dgr(e.x,e.y);e.dl=L;if(L){e.hp=e.max=Math.round(e.max*(1+.2*L));e.dm=(e.dm||1)*(1+.14*L);e.fr=(e.fr||.8)*(1-.05*L);e.agr=(e.agr||900)+60*L}return e};
const packN=L=>1+Math.min(3,Math.floor(Math.max(0,(L-.5)*.5)+Math.random()));
var alT=70,lzr=[],hgL=null;
const mkE=(F,x,y)=>{const e=mk('e',x,y,F);if(F.ring)e.anc={x,y};e.hp=e.max=Math.round(40*(1+.55*F.tier));e.dm=1+.3*F.tier;return dscale(balE(e))};

var zRet=null,wing=[],svc=[],svr=[],WG={f:'v',b:'def'},lastShot=null,lastShotT=0,wOpen=0,wT=0,wkT=0;
const PRC=[260,220,340,300,320],W_F={v:'V',circ:'Círculo',sq:'Cuadrado',line:'Línea',flank:'Flancos'},W_B={agr:'Agresivo',def:'Defensivo',obj:'Mi objetivo',pas:'Pasivo'};
const ownN=()=>wing.filter(w=>w.own).length,wUnl=()=>TYPES[4].own||wing.some(w=>w.own);
function nBase(p){let b=null,bd=1e18;for(const q of BASES){if(q.n.indexOf('Omega')>=0&&!QX.card)continue;const d=(q.x-p.x)**2+(q.y-p.y)**2;if(d<bd){bd=d;b=q}}return b}
