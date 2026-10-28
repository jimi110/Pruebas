/* ============================================================================
   events.js — Eventos, enemigos nuevos y mecánicas de las expansiones de StarLuge
   ----------------------------------------------------------------------------
   · Script clásico. Lo carga regions.js solo (index.html NO necesita ninguna línea nueva).
   · Si falta o falla, el juego sigue igual (regions.js lo llama siempre dentro de try/catch).
   · Los datos de cada región van en su region-expansion-XX.json, bloque opcional "event":
       { "fleet": 5, "boss": "Nombre del jefe", "hp": 1200, "reward": 800 }
   · EVENTO «Guardia de la región»
       1) Al entrar en una región sin superar (volando o SALTANDO) te rodea su guardia: naves
          que NO son hostiles. Un salto hacia el interior se corta en la frontera con frenada suave.
       2) Te dan a elegir: marcharte o luchar contra su jefe.
       3) Jefe nuevo «Acorazado»: blindaje fuerte, 3 puntos débiles, abanico de disparos,
          torpedos lentos e invoca escoltas (Hostigadores de cerca, Francotiradores de lejos).
          Mientras haya 3 o más escoltas vivos tiene un ESCUDO DE ESCOLTA (daño muy reducido):
          hay que limpiar las naves pequeñas (tus ayudantes/compañeros) y atacar los puntos débiles.
       4) Jefe vencido: recompensa y la región queda superada.
   · Multijugador: lo ejecuta el anfitrión (o el modo solitario). Un solo combate por sala: todos
     pelean contra el mismo jefe; su vida se multiplica por el número de pilotos y, si llega otro
     piloto (también saltando), se le lleva junto a la lucha. Las naves viajan por la sincronización
     normal de NPC de index; el estado del evento va dentro de mpDiff/mpApply de regions.js.
   ========================================================================== */
const RGEV=(function(){
'use strict';
const VER=4,TAU=Math.PI*2,FR=3400;     // FR = radio del campo de captura del jefe
const rnd=(a,b)=>a+Math.random()*(b-a),cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const nv=(v,d)=>Number.isFinite(+v)?+v:d;
const K={boss:100,drone:101,snipe:102,tug:103};            // se guarda en npc.slot (viaja por la sincronización de index)
const HULL=[[170,0],[120,-40],[60,-62],[-20,-85],[-110,-70],[-170,-40],[-190,0],[-170,40],[-110,70],[-20,85],[60,62],[120,40]];

let ctx=null,E=null,G=null;          // E = evento (anfitrión/solitario) · G = copia recibida (invitado)
let cleared=new Set();const armed=new Map(),rearm=new Map();
let cool=0,sentKey='',sentId=0,seenOk=0,el=null,elH='',bar=null,ixW=0,ixR=null,brk=0,tCheck=0;

/* ---------- utilidades ---------- */
const mpHost=()=>typeof MP!=='undefined'&&MP.role==='host';
const inMP=()=>typeof MP!=='undefined'&&!!MP.role;
function say(m){try{toast(m);if(mpHost()&&typeof mpBc==='function')mpBc('tt',{m})}catch(e){}}
const units=()=>npcs.filter(n=>n.slot>=K.drone&&n.slot<=K.snipe&&n.hp>0);
const bossNpc=()=>npcs.find(n=>n.slot===K.boss);
const barrier=()=>units().length>=3;
function cfg(R){
  const c=(R.det&&R.det.event)||{},dg=R.det?R.det.danger:2,nm=R.m.name;
  return{fleet:cl(Math.round(nv(c.fleet,5)),3,8),boss:String(c.boss||('Guardián de '+nm)).slice(0,40),
    hp:cl(Math.round(nv(c.hp,900*(1+.3*dg))*2),300,16000),reward:cl(Math.round(nv(c.reward,600)),0,5000),dg,dm:1+.1*dg}}
const countNear=(x,y,r)=>ctx.players().filter(p=>Math.hypot(p.x-x,p.y-y)<r).length||1;

/* ---------- intercepción del salto ---------- */
function planStop(){
  const w=warp,A=w&&w.a,D=w&&w.dest;if(!A||!D||!Number.isFinite(D.x))return;
  const S=E||G,fight=S&&(S.ph==='arr'||S.ph==='ask'||S.ph==='boss')?S:null,L=ctx.LIST().filter(r=>!r.m.builtin);
  let tx=null,ty=null,rg=null,msg='';
  if(fight){                                              // hay una lucha en curso: se lleva al piloto junto a ella
    const R=L.find(r=>r.id===fight.rg);
    if(R&&!ctx.inside(R.m,A.x,A.y,0)&&ctx.inside(R.m,D.x,D.y,-1500)){const a=Math.atan2(A.y-fight.fy,A.x-fight.fx);tx=fight.fx+Math.cos(a)*1500;ty=fight.fy+Math.sin(a)*1500;rg=R.id;msg='⚠ La guardia desvía tu salto hasta el combate que ya está en marcha'}}
  else if(!E&&!G)for(const R of L){
    if(cleared.has(R.id)||ctx.inside(R.m,A.x,A.y,0)||!ctx.inside(R.m,D.x,D.y,-1500))continue;
    for(const pad of[-2500,-1200]){for(let i=1;i<=300;i++){const t=i/300,x=A.x+(D.x-A.x)*t,y=A.y+(D.y-A.y)*t;if(ctx.inside(R.m,x,y,pad)){tx=x;ty=y;break}}if(tx!=null)break}
    if(tx!=null){rg=R.id;msg='⚠ La guardia de '+R.m.name+' intercepta tu salto';break}}
  if(tx==null)return;
  const d=Math.hypot(tx-A.x,ty-A.y),ox=D.x,oy=D.y;
  w.dest.x=tx;w.dest.y=ty;if(typeof wRetarget==='function')wRetarget(ox,oy,tx,ty);w.h=Math.atan2(ty-A.y,tx-A.x);w.te=2.5+Math.max(1.2,d/12000)/wspV();   // mismo perfil de salto: frenada suave hasta el punto de corte
  ixW=1;ixR=rg;toast(msg)}

/* ---------- ciclo del evento (anfitrión / solitario) ---------- */
function tryStart(){
  if(state!=='play'||ship.docked||ship.dead>0||ctx.clock()<10||ctx.clock()<cool)return;
  if(typeof GEV!=='undefined'&&GEV.cur)return;                 // no se mezcla con eventos galácticos de index
  if(npcs.some(n=>n.boss))return;                              // ni con un jefe pirata ya presente
  const pl=ctx.players();
  for(const R of ctx.LIST()){if(R.m.builtin)continue;const id=R.id;
    const inn=pl.some(p=>ctx.inside(R.m,p.x,p.y,2500));
    if(!inn)armed.set(id,true);                                 // al alejarse, la región vuelve a «armarse»
    else if(armed.get(id)===false&&rearm.has(id)&&ctx.clock()>rearm.get(id)){armed.set(id,true);rearm.delete(id)}   // si te quedas tras rechazar, vuelven a preguntar
    if(cleared.has(id)||armed.get(id)===false)continue;
    const p=pl.find(q=>ctx.inside(R.m,q.x,q.y,-1000));if(p){start(R,p);return}}}
function start(R,p){
  const c=cfg(R),a0=rnd(0,TAU),ix=ixR===R.id;ixR=null;armed.set(R.id,false);
  E={id:(Date.now()%1e9)|0,rg:R.id,nm:R.m.name,ph:'arr',t:0,lim:60,n:c.fleet,bn:c.boss,hpB:c.hp,dm:c.dm,dg:c.dg,rw:c.reward,px:p.x,py:p.y,fx:p.x,fy:p.y,np:1,boss:null,gl:0,ix,wv:0,lk:Math.hypot(p.x-ship.x,p.y-ship.y)<9000?1:0,zx:p.x,zy:p.y,hz:{x:ship.x,y:ship.y},tw:[],tl:{},fld:{x:p.x,y:p.y,r:FR,h:0}};
  for(let i=0;i<c.fleet;i++){const a=a0+i/c.fleet*TAU,r=ix?1300:1700,e=mk('r',p.x+Math.cos(a)*r,p.y+Math.sin(a)*r,{x:p.x,y:p.y});
    e.gv=1;e.rgv=1;e.xd=1;e.cxk='rgg';e.hp=e.max=1e6;e.slot=i/c.fleet*TAU;e.a=a+Math.PI;npcs.push(e)}
  if(typeof cxFind==='function'&&!ctx.isGuest())cxFind({cxk:'rgg'});
  say(ix?'⚠ La guardia de '+R.m.name+' te rodea: no abren fuego':'⚠ Naves desconocidas se acercan a tu posición. No parecen hostiles')}
function end(c){if(E&&E.pl)armed.set(E.rg,true);   // tras rechazar el combate, al volver a entrar la guardia vuelve a salir al instante
  npcs=npcs.filter(n=>!n.rgv&&!n.rgt&&!(n.slot>=K.boss&&n.slot<=K.tug));for(const w of wing)w.rgt=0;E=null;cool=ctx?ctx.clock()+(c==null?45:c):0}
const lockJump=()=>!!E&&((E.tw&&E.tw.length>0)||(['arr','ask','pull','wave','warn','boss'].includes(E.ph)&&!(E.boss&&E.boss.im)));
function abort(m){if(!E)return;if(m)say(m);end()}
function decline(){if(!E||E.ph!=='ask')return;
  E.ph='pull';E.t=0;E.lk=0;E.pl=1;E.tw=[];E.fld=null;rearm.set(E.rg,ctx.clock()+30);
  for(const P of roster())towStart(P,'out');
  say('La guardia te devuelve a la frontera de '+E.nm+': cada guardia remolca una de tus naves. Si vuelves a entrar, regresarán')}
function accept(){if(!E||E.ph!=='ask')return;
  E.np=countNear(E.px,E.py,9000);E.ph='wave';E.wv=0;E.t=0;E.lk=0;E.fld={x:E.zx,y:E.zy,r:FR,h:0};
  const cs=npcs.filter(n=>n.rgv);cs.forEach((c,i)=>{spawnUnit(i%3===2?K.snipe:K.drone,c.x,c.y)});npcs=npcs.filter(n=>!n.rgv);   // la guardia abre fuego
  say('⚔ La guardia se vuelve hostil: acaba con ellos. Después llegarán 2 oleadas más y el jefe')}
function spawnWave(k){const n=E.n+(k===1?1:3)+(E.np>1?E.np-1:0),a0=rnd(0,TAU);
  for(let i=0;i<n;i++){const a=a0+i/n*TAU,r=1500+rnd(0,500);spawnUnit(i%3===2?K.snipe:K.drone,E.px+Math.cos(a)*r,E.py+Math.sin(a)*r)}}
function spawnBoss(){
  const np=countNear(E.px,E.py,9000),a=rnd(0,TAU),bx=E.px+Math.cos(a)*2400,by=E.py+Math.sin(a)*2400,hp=Math.round(E.hpB*cl(np,1,4));
  const bo=mk('x',bx,by,{x:bx,y:by});
  Object.assign(bo,{boss:1,evs:1,xd:1,cxk:'rgb',slot:K.boss,hp,max:hp,rad:110,dm:E.dm,dl:E.dg,a:a+Math.PI,rgb:1,bvx:0,bvy:0,t1:2.5,t2:7,t3:3,ph2:0,im:0,fl:0});
  npcs.push(bo);E.boss=bo;E.np=np;E.ph='boss';E.t=0;E.fx=E.px;E.fy=E.py;E.chk=0;if(!E.fld)E.fld={x:E.zx,y:E.zy,r:FR,h:0};E.fld.h=1;
  say('☠ '+E.bn+' aparece '+['→','↘','↓','↙','←','↖','↑','↗'][Math.round(a/(TAU/8))%8]+' y crea un campo que te atrapa: no puedes huir'+(np>1?' · vida ×'+np:'')+'. Ataca sus puntos débiles')}
function victory(){const bo=E.boss;if(typeof cxFind==='function')cxFind({cxk:'rgb'});E.bx=bo.x;E.by=bo.y;E.ph='ok';E.t=0;E.fld=null;cleared.add(E.rg);
  boom(bo.x,bo.y,40,'#ff8a5c');boom(bo.x,bo.y,30,'#8fc4ff');for(let i=0;i<16;i++)loot.push({x:bo.x+rnd(-90,90),y:bo.y+rnd(-60,60),v:6+((Math.random()*4)|0),life:120});
  for(const u of units()){boom(u.x,u.y,14,'#ff8a5c');u.hp=0}
  npcs=npcs.filter(n=>n!==bo);E.boss=null;
  say(bo.im?'✔ '+E.bn+' huye malherido: ya tienes vía libre en esta zona':'✔ '+E.bn+' derrotado: la región es tuya');pay(E)}
function pay(S){if(Math.hypot(ship.x-S.bx,ship.y-S.by)>=12000)return;
  if(S.rw>0){ship.cred+=S.rw;toast('+'+S.rw+' créditos por vencer a '+S.bn)}
  ship.sp=ship.sp||{};ship.sp.zf=(ship.sp.zf|0)+1;toast('✦ Material único obtenido: Corazón de Zafiro (facción Zafiro)');try{saveGame()}catch(e){}}

/* ---------- el jefe y sus escoltas ---------- */
function spawnUnit(kind,x,y){const u=mk('e',x,y,{x,y});u.cxk=kind===K.snipe?'rgs':'rgd';u.gv=1;u.xd=1;u.slot=kind;u.a=rnd(0,TAU);u.rgc=rnd(.5,2);u.cs=0;u.dm=E?E.dm:1;
  if(kind===K.drone){u.hp=u.max=60;u.rad=16}else{u.hp=u.max=85;u.rad=18}npcs.push(u);return u}
function shoot(o,x,y,a,d,sp,life){const b=bl({x,y,vx:0,vy:0},a,'e',d);b.o=o;if(sp){b.vx=Math.cos(a)*sp;b.vy=Math.sin(a)*sp}if(life)b.life=life;bullets.push(b);return b}
function nearest(x,y,pl){let b=null,bd=1e9;for(const p of pl){const d=Math.hypot(p.x-x,p.y-y);if(d<bd){bd=d;b=p}}return b?{p:b,d:bd}:null}
function bossAI(bo,dt,pl){
  const T=nearest(bo.x,bo.y,pl);if(!T)return;const tg=T.p,dm=bo.dm||1;
  const ang=Math.atan2(tg.y-bo.y,tg.x-bo.x),want=Math.atan2(Math.sin(ang-bo.a),Math.cos(ang-bo.a));bo.a+=cl(want,-1,1)*1.1*dt;
  const k=bo.im?-1:T.d>1150?1:T.d<750?-.8:0,sp=bo.im?460:bo.ph2?150:120;bo.bvx+=(Math.cos(bo.a)*sp*k-bo.bvx)*Math.min(1,1.2*dt);bo.bvy+=(Math.sin(bo.a)*sp*k-bo.bvy)*Math.min(1,1.2*dt);
  bo.x+=bo.bvx*dt;bo.y+=bo.bvy*dt;
  if(!bo.im&&!bo.ph2&&bo.hp<bo.max*.5){bo.ph2=1;say('⚠ '+E.bn+' entra en fase de furia: más disparos y más escoltas')}
  const mx=bo.x+Math.cos(bo.a)*150,my=bo.y+Math.sin(bo.a)*150;
  bo.t1-=dt;if(bo.t1<=0&&T.d<1500){bo.t1=bo.im?1.6:bo.ph2?2.4:3.4;const n=bo.ph2?11:7;for(let i=0;i<n;i++)shoot(bo,mx,my,bo.a+(i-(n-1)/2)*.12,5*dm,0,1.6)}          // abanico
  bo.t2-=dt;if(!bo.im&&bo.t2<=0&&T.d<1900){bo.t2=bo.ph2?5.2:7;const q=shoot(bo,mx,my,ang,16*dm,300,6.5);q.big=1}                                                   // torpedo lento
  bo.t3-=dt;const cap=3+2*(E.np||1);
  if(!bo.im&&bo.t3<=0){bo.t3=bo.ph2?10:15;let nd=units().filter(u=>u.slot===K.drone).length,ns=units().filter(u=>u.slot===K.snipe).length;
    for(const sd of[-1,1]){const px=bo.x+Math.cos(bo.a+sd*1.6)*120,py=bo.y+Math.sin(bo.a+sd*1.6)*120;
      if(units().length<cap&&nd<2+(E.np||1)*2){spawnUnit(K.drone,px,py);nd++}
      if(units().length<cap&&ns<1+(E.np||1)&&(sd>0||bo.ph2)){spawnUnit(K.snipe,px,py);ns++}}
    say('⚠ '+E.bn+' despliega escoltas')}}
function unitAI(u,dt,pl){
  const T=nearest(u.x,u.y,pl);if(!T){return}const tg=T.p,d=T.d,dm=u.dm||1,ang=Math.atan2(tg.y-u.y,tg.x-u.x);
  let ax=0,ay=0,sp;
  if(u.slot===K.drone){sp=360;const orb=ang+(u.id||1)%2*3.14+Math.PI/2;
    if(d>240){ax=Math.cos(ang);ay=Math.sin(ang)}else{ax=Math.cos(orb)*.9-Math.cos(ang)*.2;ay=Math.sin(orb)*.9-Math.sin(ang)*.2}
    u.a+=cl(Math.atan2(Math.sin(ang-u.a),Math.cos(ang-u.a)),-1,1)*7*dt;
    u.rgc-=dt;if(u.rgc<=0&&d<700){u.rgc=.5;shoot(u,u.x,u.y,u.a+rnd(-.06,.06),3.6*dm,0,1.1)}}
  else{sp=115;if(u.bm){u.bm.t+=dt;if(u.bm.t>.28)u.bm=null}
    if(u.cs>0){ax=ay=0;u.cs-=dt;if(u.cs>.5)u.a+=cl(Math.atan2(Math.sin(ang-u.a),Math.cos(ang-u.a)),-1,1)*3.2*dt;   // apunta y se queda quieto; el último instante bloquea el ángulo
      if(u.cs<=0){u.fled=0;fireBeam(u,pl);u.rgc=7}}
    else{if(d<1400){ax=-Math.cos(ang);ay=-Math.sin(ang)}else if(d>2100){ax=Math.cos(ang);ay=Math.sin(ang)}else{ax=Math.cos(ang+1.57)*.5;ay=Math.sin(ang+1.57)*.5}
      u.a+=cl(Math.atan2(Math.sin(ang-u.a),Math.cos(ang-u.a)),-1,1)*2*dt;
      u.rgc-=dt;if(u.rgc<=0&&d<3000){u.cs=1.7;u.fled=1}}}
  for(const o of units())if(o!==u){const dx=u.x-o.x,dy=u.y-o.y,dd=Math.hypot(dx,dy);if(dd>0&&dd<60){ax+=dx/dd*.6;ay+=dy/dd*.6}}
  const m=Math.hypot(ax,ay)||1;u.vx+=(ax/m*sp*(m>.01?1:0)-u.vx)*Math.min(1,2.5*dt);u.vy+=(ay/m*sp*(m>.01?1:0)-u.vy)*Math.min(1,2.5*dt);u.x+=u.vx*dt;u.y+=u.vy*dt}
/* impactos en el jefe (el motor de index no lo toca: es de otro «equipo»): blindaje, puntos débiles y escudo de escolta */
function hitBoss(bo){
  const c=Math.cos(-bo.a),s=Math.sin(-bo.a),bar=barrier();
  for(const b of bullets){if(b.life<=0||(b.own!=='p'&&b.own!=='w')||b.gh)continue;   // balas del piloto y de su flota
    const dx=b.x-bo.x,dy=b.y-bo.y;if(Math.abs(dx)>230||Math.abs(dy)>230)continue;
    const lx=dx*c-dy*s,ly=dx*s+dy*c;let m=0;
    if((lx/175)**2+(ly/96)**2<1)m=1;                  // sin puntos débiles: cualquier impacto en el casco cuenta
    if(!m)continue;
    b.life=0;boom(b.x,b.y,m>1?7:3,m>1?'#ffd166':'#cfd6e6');
    if(!bo.im)bo.hp-=(b.d||5)*m*(bar?.35:1);bo.lh=time}}

/* ---------- remolque: la guardia (o las naves de captura) llevan a cada nave, a la misma velocidad que ella ---------- */
const CAR=84,CSP=2600,TOWSP=3400;     // CAR: distancia del remolcador a su nave · CSP: velocidad de aproximación (casi un salto) · TOWSP: velocidad de remolque
function roster(){const L=[];if(state==='play'&&!ship.docked&&ship.dead<=0)L.push({id:'h',me:1,x:ship.x,y:ship.y});
  if(mpHost()&&typeof MPR!=='undefined')for(const k in MPR){const r=MPR[k];if(typeof mpLive==='function'&&mpLive(r))L.push({id:k,me:0,x:r.x,y:r.y,o:r})}
  return L}
const wOK=w=>w.hp>0&&!w.jp&&!w.fm&&Math.hypot(w.x-ship.x,w.y-ship.y)<4000;   // la flota enviada a minar o lejos no se remolca
const members=P=>P.me?1+wing.filter(wOK).length:1+Math.min(7,((P.o&&P.o.wgs)||[]).filter(q=>!q.jp).length);
const FOFF=i=>i?[-70-34*Math.floor((i-1)/2),(i%2?1:-1)*(110+70*Math.floor((i-1)/2))]:[0,0];   // formación: [longitudinal, lateral] respecto al rumbo
function memberPos(T,i){const o=FOFF(i),c=Math.cos(T.h),s=Math.sin(T.h);return[T.x+c*o[0]-s*o[1],T.y+s*o[0]+c*o[1]]}
function sayTo(P,m){try{if(P.me)toast(m);else if(typeof mpBc==='function')mpBc('tt',{to:P.id,m})}catch(e){}}
function frontier(R,x,y){if(R&&Number.isFinite(R.m.x+R.m.y)){const a=Math.atan2(y-R.m.y,x-R.m.x),cs=Math.cos(a),sn=Math.sin(a);for(let d=0;d<260000;d+=300){const px=x+cs*d,py=y+sn*d;if(!ctx.inside(R.m,px,py,2800))return[px,py]}}return[x,y]}
function towStart(P,mode){
  if(!E||E.tw.some(T=>T.id===P.id))return;
  const R=ctx.LIST().find(r=>r.id===E.rg),n=Math.min(6,members(P)),T={id:P.id,me:!!P.me,mode,x:P.x,y:P.y,vx:0,vy:0,h:0,ph:'in',t:0,n,cr:[],tx:P.x,ty:P.y};
  if(mode==='out'){const f=frontier(R,P.x,P.y);T.tx=f[0];T.ty=f[1]}
  else{const bo=E.boss&&npcs.includes(E.boss)?E.boss:null,u=units();let cx,cy;
    if(bo){cx=bo.x;cy=bo.y}else if(u.length){cx=cy=0;for(const q of u){cx+=q.x;cy+=q.y}cx/=u.length;cy/=u.length}else{cx=E.fld?E.fld.x:E.zx;cy=E.fld?E.fld.y:E.zy}
    const a=Math.atan2(P.y-cy,P.x-cx),D=bo?1500:900;T.tx=cx+Math.cos(a)*D;T.ty=cy+Math.sin(a)*D;
    const F=E.fld;if(F){const dd=Math.hypot(T.tx-F.x,T.ty-F.y),mx=F.r*.82;if(dd>mx){T.tx=F.x+(T.tx-F.x)*mx/dd;T.ty=F.y+(T.ty-F.y)*mx/dd}}}
  T.h=Math.atan2(T.ty-T.y,T.tx-T.x);const a0=T.h;
  for(let i=0;i<n;i++){let c=mode==='out'?npcs.find(q=>q.rgv&&!q.tw):null;
    if(!c){const m=memberPos(T,i),sp=mode==='back'?3800:500,x=m[0]+Math.cos(a0)*sp,y=m[1]+Math.sin(a0)*sp;
      c=mk('r',x,y,{x,y});Object.assign(c,{gv:1,xd:1,hp:1e6,max:1e6,rad:22,a:a0+Math.PI});
      if(mode==='back'){c.rgt=1;c.slot=K.tug;c.cxk='rgt'}else{c.rgv=1;c.cxk='rgg';c.slot=rnd(0,TAU)}
      npcs.push(c);if(mode==='back'&&!ctx.isGuest()&&typeof cxFind==='function')cxFind({cxk:'rgt'})}
    c.tw=T;c.ti=i;c.fled=0;T.cr.push(c)}
  E.tw.push(T)}
function towStep(dt){
  for(const n of npcs)if(n.rgt&&n.dep){n.dep+=dt;n.vx=Math.cos(n.a)*5200;n.vy=Math.sin(n.a)*5200;n.x+=n.vx*dt;n.y+=n.vy*dt;if(n.dep>1.4)n.hp=0}
  if(npcs.some(n=>n.rgt&&n.hp<=0))npcs=npcs.filter(n=>!(n.rgt&&n.hp<=0));
  for(const w of wing)w.rgt=0;                                      // se vuelven a marcar abajo las que van remolcadas
  if(!E.tw.length)return;
  const pl=roster();
  for(const T of E.tw){T.t+=dt;const P=pl.find(p=>p.id===T.id);
    if(!P||(T.me&&(ship.docked||ship.dead>0||state==='warp'))){T.ph='done'}
    const cr=T.cr.filter(c=>c.hp>0&&npcs.includes(c));
    if(T.ph==='in'){
      T.x=P.x;T.y=P.y;T.h=Math.atan2(T.ty-T.y,T.tx-T.x);const cs=Math.cos(T.h),sn=Math.sin(T.h);let ok=0;
      cr.forEach((c,i)=>{const m=memberPos(T,i),px=m[0]+cs*CAR,py=m[1]+sn*CAR,dx=px-c.x,dy=py-c.y,d=Math.hypot(dx,dy);
        if(d<30){c.x=px;c.y=py;c.vx=c.vy=0;c.a=T.h;ok++}else{const mv=Math.min(d,CSP*dt);c.x+=dx/d*mv;c.y+=dy/d*mv;c.vx=dx/d*CSP;c.vy=dy/d*CSP;c.a=Math.atan2(dy,dx)}});
      if(ok>=cr.length||T.t>6){T.ph='tow';T.t=0;for(const c of cr)c.fled=1;
        if(T.mode==='back')sayTo(P,'⚠ Naves de captura de la guardia te enganchan: te devuelven al combate')}}
    if(T.ph==='tow'){
      const dx=T.tx-T.x,dy=T.ty-T.y,d=Math.hypot(dx,dy);
      if(d<140||T.t>35){T.ph='done';T.vx=T.vy=0}
      else{const bk=T.mode==='back',sp=Math.min(bk?1500:TOWSP,bk?300+T.t*800:350+T.t*2200,d*(bk?1.6:2.4)+250);T.h=Math.atan2(dy,dx);T.vx=dx/d*sp;T.vy=dy/d*sp;T.x+=T.vx*dt;T.y+=T.vy*dt}
      const cs=Math.cos(T.h),sn=Math.sin(T.h);
      cr.forEach((c,i)=>{const m=memberPos(T,i);c.x=m[0]+cs*CAR;c.y=m[1]+sn*CAR;c.vx=T.vx;c.vy=T.vy;c.a=T.h;c.fled=1});   // rígido: misma velocidad que la nave remolcada
      if(T.me&&T.ph!=='done'){ship.x=T.x;ship.y=T.y;ship.vx=ship.vy=0;ship.dest=null;ship.a+=angDiff(ship.a,T.h)*Math.min(1,6*dt);
        let j=1;for(const w of wing){if(!wOK(w))continue;if(j<T.n){const m=memberPos(T,j);w.x=m[0];w.y=m[1];w.vx=T.vx;w.vy=T.vy;w.a=T.h;w.rgt=1}j++}}}
    if(T.ph==='done')for(const c of T.cr){c.tw=null;c.fled=0;if(c.rgt){c.dep=.001;c.a=T.h+Math.PI}}}
  E.tw=E.tw.filter(T=>T.ph!=='done')}
/* si alguien intenta huir del combate (oleadas, aviso, jefe o su retirada final), las naves de captura van a por él */
function fleeCheck(){const F=E.fld;if(!F||!['wave','warn','boss'].includes(E.ph))return;
  for(const P of roster()){if(E.tw.some(T=>T.id===P.id)||Math.hypot(P.x-F.x,P.y-F.y)<=F.r+100||time-(E.tl[P.id]||-99)<4)continue;
    E.tl[P.id]=time;towStart(P,'back');sayTo(P,'⚠ Intentas huir: la guardia envía naves de captura')}}
/* invitado: la anfitriona manda la posición remolcada; cada cliente mueve su propia nave y su flota con la misma fórmula que el resto de NPC */
function clearWingTow(){for(const w of wing)if(w.rgt)w.rgt=0}
function guestApply(dt){
  if(state!=='play'||ship.docked||ship.dead>0){clearWingTow();return}
  if(G.lk&&(G.ph==='arr'||G.ph==='ask')){if(!G.fz&&Math.hypot(ship.x-G.fx,ship.y-G.fy)<9000)G.fz={x:ship.x,y:ship.y};if(G.fz){ship.x=G.fz.x;ship.y=G.fz.y;ship.vx=ship.vy=0;ship.dest=null}}
  const me=String(typeof MP!=='undefined'?MP.id:''),tw=(G.tw||[]).find(q=>q[0]===me);
  if(tw&&tw[6]){const k=Math.min(1,9*dt),h=tw[5],cs=Math.cos(h),sn=Math.sin(h);
    ship.x+=(tw[1]+tw[3]*.06-ship.x)*k;ship.y+=(tw[2]+tw[4]*.06-ship.y)*k;ship.vx=ship.vy=0;ship.dest=null;ship.a+=angDiff(ship.a,h)*Math.min(1,6*dt);
    let j=1;for(const w of wing){w.rgt=0;if(!wOK(w))continue;if(j<7){const o=FOFF(j);w.x+=(tw[1]+cs*o[0]-sn*o[1]+tw[3]*.06-w.x)*k;w.y+=(tw[2]+sn*o[0]+cs*o[1]+tw[4]*.06-w.y)*k;w.vx=w.vy=0;w.a=h;w.rgt=1}j++}
    return}
  clearWingTow();
  if(G.ph==='boss'&&G.fld&&G.fld.h)fieldClamp(G.fld,ship)}

let fldMsg=-9;
function fieldClamp(F,o){const dx=o.x-F.x,dy=o.y-F.y,d=Math.hypot(dx,dy);if(d<=F.r)return;
  const k=F.r/d;o.x=F.x+dx*k;o.y=F.y+dy*k;const vo=(o.vx*dx+o.vy*dy)/d;if(vo>0){o.vx-=vo*dx/d;o.vy-=vo*dy/d}
  if(time-fldMsg>3){fldMsg=time;toast('⛔ El campo del jefe te impide huir: derrótalo')}}
function step(dt){
  if(typeof GEV!=='undefined'&&!GEV.cur&&GEV.t<30)GEV.t=30;      // mientras dura, index no lanza otros eventos galácticos
  E.t+=dt;
  if(!inMP()&&(ship.docked||ship.dead>0||state==='warp'))return abort(ship.dead>0?'✖ Has caído: el combate termina':'El evento de la región se cancela');
  const cs=npcs.filter(n=>n.rgv),pl=ctx.players();
  towStep(dt);fleeCheck();
  let P0={x:E.px,y:E.py};
  if(cs.length){let fx=0,fy=0;for(const c of cs){fx+=c.x;fy+=c.y}fx/=cs.length;fy/=cs.length;
    let best=1e9;for(const p of pl){const d=Math.hypot(p.x-fx,p.y-fy);if(d<best&&d<6000){best=d;P0=p}}}
  if(!cs.length){const nn=nearest(E.px,E.py,pl);if(nn&&nn.d<14000){P0=nn.p}}
  E.px=P0.x;E.py=P0.y;
  if(E.lk&&(E.ph==='arr'||E.ph==='ask')&&state==='play'&&!ctx.isGuest()){ship.x=E.hz.x;ship.y=E.hz.y;ship.vx=ship.vy=0;ship.dest=null}   // la guardia te inmoviliza: no puedes moverte de ninguna manera
  const sv=Math.abs(P0.x-ship.x)<1&&Math.abs(P0.y-ship.y)<1?Math.hypot(ship.vx,ship.vy):0;
  const orbit=()=>{let far=0;for(const c of cs){const a=c.slot+time*.3,R=E.ph==='arr'?340:300,dx=P0.x+Math.cos(a)*R-c.x,dy=P0.y+Math.sin(a)*R-c.y,d=Math.hypot(dx,dy)||1,sp=Math.min(d*2.5+sv,620);
      c.vx=dx/d*sp;c.vy=dy/d*sp;c.x+=c.vx*dt;c.y+=c.vy*dt;c.a=d>80?Math.atan2(c.vy,c.vx):Math.atan2(P0.y-c.y,P0.x-c.x);if(d>260)far++}return far};
  const leave=()=>{for(const c of cs){const a=Math.atan2(c.y-P0.y,c.x-P0.x);c.vx=Math.cos(a)*520;c.vy=Math.sin(a)*520;c.x+=c.vx*dt;c.y+=c.vy*dt;c.a=a}};
  if(E.ph==='arr'){if(!cs.length)return end();const far=orbit();
    if(!far||E.t>16){E.ph='ask';E.t=0;E.lim=60;say('⚠ '+E.n+' naves te rodean sin disparar: «Para entrar en '+E.nm+' márchate o derrota a '+E.bn+'»')}}
  else if(E.ph==='ask'){orbit();if(E.t>E.lim)decline()}
  else if(E.ph==='pull'){
    const lead=E.tw.find(T=>T.ph==='tow')||E.tw[0],ex=cs.filter(c=>!c.tw);
    ex.forEach((c,i)=>{const an=i/Math.max(1,ex.length)*TAU+time*.9,bx=lead?lead.x:P0.x,by=lead?lead.y:P0.y,k=Math.min(1,9*dt);c.x+=(bx+Math.cos(an)*380-c.x)*k;c.y+=(by+Math.sin(an)*380-c.y)*k;c.vx=lead?lead.vx:0;c.vy=lead?lead.vy:0;c.a=lead?lead.h:c.a});   // las sobrantes escoltan en formación
    if(!E.tw.length||E.t>45){E.ph='go';E.t=0}}
  else if(E.ph==='go'){leave();if(E.t>3)end(E.pl?2:45)}
  else if(E.ph==='wave'){
    const ul=units();for(const u of ul)unitAI(u,dt,pl);
    if(!pl.some(p=>Math.hypot(p.x-E.px,p.y-E.py)<14000)){E.aw=(E.aw||0)+dt;if(E.aw>20)return abort('La guardia se retira: te has alejado del combate')}else E.aw=0;
    if(!ul.length&&E.t>1.5){E.wv++;E.t=0;
      if(E.wv<=2){say('⚠ Oleada '+(E.wv+1)+' de 3: llegan más naves');spawnWave(E.wv)}
      else{E.ph='warn';E.t=0;say('☠ AVISO DE JEFE: '+E.bn+' se acerca. ¡Prepárate!')}}}
  else if(E.ph==='warn'){if(E.t>4)spawnBoss()}
  else if(E.ph==='boss'){
    if(E.gl){leave();if(E.t>6){npcs=npcs.filter(n=>!n.rgv);E.gl=0}}
    const bo=E.boss;
    if(!bo.im&&bo.hp<=bo.max*.12){bo.im=1;bo.hp=bo.max*.12;if(E.fld)E.fld.h=0;for(const u of units()){boom(u.x,u.y,14,'#ff8a5c');u.hp=0}say('⚠ '+E.bn+' se vuelve invulnerable y huye malherido: el campo desaparece')}
    if(bo.im){bo.fl+=dt;if(bo.fl>7){victory();return}}
    else if(bo.hp<=0){victory();return}
    const F=E.fld;if(F&&F.h&&!ship.docked&&state==='play'){fieldClamp(F,ship);
      const bd=Math.hypot(bo.x-F.x,bo.y-F.y);if(bd>F.r-250){const k=(F.r-250)/bd;bo.x=F.x+(bo.x-F.x)*k;bo.y=F.y+(bo.y-F.y)*k}}
    if(!npcs.includes(bo)){say('El jefe pierde tu rastro y se retira. Podrás volver a intentarlo al reentrar en la región');return end()}
    if(countNear(bo.x,bo.y,12000)<1&&E.t>20&&!pl.some(p=>Math.hypot(p.x-bo.x,p.y-bo.y)<12000)){say('El jefe se repliega al quedarse sin objetivos');return end()}
    bossAI(bo,dt,pl);for(const u of units())unitAI(u,dt,pl);hitBoss(bo);
    E.fx=bo.x;E.fy=bo.y;
    E.chk-=dt;if(E.chk<=0){E.chk=1;const np=countNear(bo.x,bo.y,9000);if(np>E.np){const add=E.hpB*(np-E.np);bo.max+=add;bo.hp+=add;E.np=np;say('⚠ Otro piloto se une al combate: '+E.bn+' se refuerza (vida ×'+np+')')}}}
  else if(E.ph==='ok'){if(E.t>8)end()}}

/* ---------- dibujo de naves (se pinta sobre la nave genérica de index, que queda tapada) ---------- */
/* ---------- dibujo de naves: todas pasan por drawS() (mismo estilo que el resto de la flota; modelos en render.js → HUL.rg*) ---------- */
function flashOf(n){if(n._p!=null&&n.hp<n._p-.5)n._f=time;n._p=n.hp;return n._f!=null&&time-n._f<.12?1-(time-n._f)/.12:0}
function shipS(n,sh,col,sc,thr){const fl=flashOf(n),sp=Math.hypot(n.vx||0,n.vy||0),th=thr!=null?thr:Math.max(.25,Math.min(1,sp/380)),h=n.max>0&&n.max<1e5?cl(n.hp/n.max,0,1):1;
  CURN=n;drawS(n.x,n.y,n.a||0,sh,col,sc,{h,th});CURN=null;
  if(fl){const H=HUL[sh],b=H.b.concat(H.b.map(p=>[p[0],-p[1]]).reverse());g.save();g.translate(n.x,n.y);g.rotate(n.a||0);g.scale(sc,sc);poly(b);g.fillStyle='rgba(255,255,255,'+(.5*fl)+')';g.fill();g.restore()}}
/* estela de velocidad (aditiva) para las naves que viajan casi como un salto */
function streak(n,col){const sp=Math.hypot(n.vx||0,n.vy||0);if(sp<1400)return;const L=Math.min(1500,sp*.11),a=Math.atan2(n.vy,n.vx),c=Math.cos(a),s=Math.sin(a);
  g.save();g.globalCompositeOperation='lighter';g.lineCap='round';
  for(const[w,al]of[[22,.16],[9,.4],[3,.9]]){g.strokeStyle='rgba('+col+','+al+')';g.lineWidth=Math.max(w,1.5/zoom);g.beginPath();g.moveTo(n.x,n.y);g.lineTo(n.x-c*L,n.y-s*L);g.stroke()}g.restore()}
function drawBoss(n,bar){const a=n.a||0,pu=.5+.5*Math.sin(time*3),fl=flashOf(n),im=n.im;
  g.save();g.translate(n.x,n.y);g.rotate(a);
  const hg=g.createRadialGradient(0,0,30,0,0,260);hg.addColorStop(0,'rgba(120,150,255,'+(.2+.07*pu)+')');hg.addColorStop(.6,'rgba(255,79,216,'+(.07+.03*pu)+')');hg.addColorStop(1,'rgba(255,79,216,0)');g.fillStyle=hg;g.beginPath();g.arc(0,0,260,0,TAU);g.fill();
  if(bar){g.strokeStyle='rgba(255,208,244,'+(.4+.3*pu)+')';g.lineWidth=3;g.setLineDash([16,10]);g.lineDashOffset=-time*30;g.beginPath();g.arc(0,0,225,0,TAU);g.stroke();g.setLineDash([])}
  g.restore();
  shipS(n,'rgb','#6ea8ff',6,im?1:.8);                                                    // acorazado: casco completo con luces, toberas y daños visibles
  g.save();g.translate(n.x,n.y);g.rotate(a);
  if(im){g.strokeStyle='rgba(255,255,255,'+(.5+.4*pu)+')';g.lineWidth=4;g.beginPath();g.arc(0,0,205,0,TAU);g.stroke()}
  g.restore()}
const drawDrone=n=>shipS(n,'rgd','#ff4fd8',.82,1);
const drawGuard=n=>shipS(n,'rgg','#7de3ff',.92);
const drawSniper=n=>{if(n.fled){g.save();g.strokeStyle='rgba(255,80,80,'+(.35+.4*(.5+.5*Math.sin(time*25)))+')';g.lineWidth=1.5;g.setLineDash([14,10]);g.beginPath();g.moveTo(n.x+Math.cos(n.a)*46,n.y+Math.sin(n.a)*46);g.lineTo(n.x+Math.cos(n.a)*3200,n.y+Math.sin(n.a)*3200);g.stroke();g.restore()}   // mira láser mientras apunta
  const rl=!(n.cs>0)&&n.rgc>0;if(rl){g.save();g.strokeStyle='rgba(169,139,255,.55)';g.lineWidth=2;g.beginPath();g.arc(n.x,n.y,30,-Math.PI/2,-Math.PI/2+TAU*cl(1-n.rgc/6.5,0,1));g.stroke();g.restore()}   // anillo de recarga
  shipS(n,'rgs','#a98bff',.95)};
const drawTug=n=>{streak(n,'255,200,110');shipS(n,'rgt','#ffc15c',.9,n.fled?.9:1)};

/* rayo de luz del francotirador: dura un instante tras el disparo */
function drawBeam(n){const b=n.bm;if(!b)return;const k=1-b.t/.28;if(k<=0)return;g.save();g.globalCompositeOperation='lighter';g.lineCap='round';
  const x2=b.x+Math.cos(b.a)*3200,y2=b.y+Math.sin(b.a)*3200;
  for(const[w,c]of[[26,'rgba(169,139,255,'+.18*k+')'],[11,'rgba(200,180,255,'+.45*k+')'],[3.5,'rgba(255,255,255,'+.95*k+')']]){g.strokeStyle=c;g.lineWidth=Math.max(w*(.6+.4*k),2/zoom);g.beginPath();g.moveTo(b.x,b.y);g.lineTo(x2,y2);g.stroke()}
  g.restore()}
function fireBeam(u,pl){const a=u.a,x0=u.x+Math.cos(a)*46,y0=u.y+Math.sin(a)*46,cs=Math.cos(a),sn=Math.sin(a),d=20*(u.dm||1);u.bm={x:x0,y:y0,a,t:0};
  const dseg=o=>{const px=o.x-x0,py=o.y-y0,t=px*cs+py*sn;return t<0||t>3200?1e9:Math.abs(px*sn-py*cs)};
  sfx('b',{x:x0,y:y0},6);
  if(!ship.dead&&!ship.docked&&state==='play'&&dseg(ship)<26){if(shSafe()){shHitT=time;shHitA=a+Math.PI}else{hurt(d,'⚠ Rayo de un francotirador',a+Math.PI);u.hostile=time}}
  for(const w of wing)if(w.hp>0&&!w.jp&&dseg(w)<22){const q=Math.min(w.shd||0,d);w.shd=(w.shd||0)-q;w.hp-=d-q;w.lh=time}
  for(const o of npcs)if((o.team==='g'||o.team==='r')&&!o.rgv&&o.hp>0&&dseg(o)<22)o.hp-=d*(o.team==='r'?.35:1)}
/* icono para el Codex */
function icon(sh,x,y,sc){g.save();g.translate(x,y);g.rotate(-Math.PI/2);drawS(0,0,0,sh,'#7de3ff',sc,{h:1,th:.5});g.restore()}
function drawField(F){const pu=.5+.5*Math.sin(time*2.4),hd=F.h?1:0,z=1/zoom,rgb=hd?'255,79,216':'120,185,255';g.save();
  /* exterior oscurecido: se ve de un vistazo qué queda dentro y qué fuera */
  g.beginPath();g.arc(F.x,F.y,F.r*3.2,0,TAU);g.arc(F.x,F.y,F.r,0,TAU,true);g.fillStyle=hd?'rgba(30,6,34,.34)':'rgba(6,14,40,.28)';g.fill('evenodd');
  /* franja de aviso interior */
  const q=g.createRadialGradient(F.x,F.y,F.r*.8,F.x,F.y,F.r);q.addColorStop(0,'rgba('+rgb+',0)');q.addColorStop(1,'rgba('+rgb+','+(.2+.1*pu)+')');g.fillStyle=q;g.beginPath();g.arc(F.x,F.y,F.r,0,TAU);g.fill();
  /* muro de energía: halo + núcleo + segmentos que recorren el borde */
  g.strokeStyle='rgba('+rgb+','+(.16+.08*pu)+')';g.lineWidth=Math.max(120,16*z);g.beginPath();g.arc(F.x,F.y,F.r,0,TAU);g.stroke();
  g.strokeStyle='rgba('+rgb+','+(.5+.25*pu)+')';g.lineWidth=Math.max(34,4.5*z);g.beginPath();g.arc(F.x,F.y,F.r,0,TAU);g.stroke();
  g.setLineDash([260,140]);g.lineDashOffset=-time*220;g.strokeStyle='rgba(255,255,255,'+(.55+.3*pu)+')';g.lineWidth=Math.max(14,2.2*z);g.beginPath();g.arc(F.x,F.y,F.r,0,TAU);g.stroke();g.setLineDash([]);
  g.globalCompositeOperation='lighter';
  for(let i=0;i<10;i++){const a0=time*.35+i/10*TAU;g.strokeStyle='rgba('+rgb+',.7)';g.lineWidth=Math.max(26,3.4*z);g.beginPath();g.arc(F.x,F.y,F.r,a0,a0+.09);g.stroke()}
  g.restore()}
/* el campo también aparece en el mapa grande y en el minimapa */
function mapField(X,Y,s,mm){const S=E||G,F=S&&S.fld;if(!F)return;const hd=F.h?1:0,c=hd?'255,79,216':'130,190,255',x=X(F.x),y=Y(F.y),r=F.r*s;if(!Number.isFinite(x+y+r)||r<2)return;
  g.save();if(mm){g.beginPath();g.rect(mm.x,mm.y,mm.w,mm.h);g.clip()}g.beginPath();g.arc(x,y,r,0,TAU);g.fillStyle='rgba('+c+',.09)';g.fill();g.setLineDash([8,5]);g.lineWidth=mm?1.6:3;g.strokeStyle='rgba('+c+',.95)';g.stroke();g.setLineDash([]);
  if(!mm&&r>40){g.fillStyle='rgba('+c+',.95)';g.font='bold 10px ui-monospace,Menlo,monospace';g.textAlign='center';g.fillText(hd?'CAMPO DEL JEFE':'ZONA DE COMBATE',x,y-r-5);g.textAlign='start'}g.restore()}
function drawWorld(){const S=E||G;if(!S)return;
  const pu=.5+.5*Math.sin(time*3),bar=barrier();
  if(S.fld)drawField(S.fld);
  /* rayos de tracción: de cada nave que remolca a la nave enganchada */
  g.save();g.globalCompositeOperation='lighter';g.lineCap='round';
  for(const n of npcs){if(!n.fled||n.hp<=0||!(n.rgt||(n.gv&&n.team==='r'))||!vis(n.x,n.y,400))continue;
    const c=Math.cos(n.a||0),s=Math.sin(n.a||0),x2=n.x-c*84,y2=n.y-s*84,fl=.5+.5*Math.sin(time*18+(n.id||0));
    g.strokeStyle='rgba(125,235,255,'+(.25+.2*fl)+')';g.lineWidth=Math.max(9,1.6/zoom);g.beginPath();g.moveTo(n.x,n.y);g.lineTo(x2,y2);g.stroke();
    g.strokeStyle='rgba(235,252,255,'+(.7+.25*fl)+')';g.lineWidth=Math.max(2.4,.7/zoom);g.beginPath();g.moveTo(n.x,n.y);g.lineTo(x2,y2);g.stroke()}
  g.restore();
  for(const n of npcs)if(n.bm)drawBeam(n);
  for(const n of npcs){if(n.hp<=0||!vis(n.x,n.y,260))continue;
    if(n.rgt)drawTug(n);
    else if(n.gv&&n.team==='r'){streak(n,'125,235,255');g.save();g.strokeStyle='rgba(125,235,255,'+(.3+.2*pu)+')';g.lineWidth=1.5;g.beginPath();g.arc(n.x,n.y,30,0,TAU);g.stroke();g.restore();drawGuard(n);
      if(S.ph==='ask'||S.ph==='arr')txt('GUARDIA',n.x,n.y-38,'rgba(150,240,255,.85)','center',9)}
    else if(n.slot===K.drone)drawDrone(n);else if(n.slot===K.snipe)drawSniper(n);
    else if(n.slot===K.boss){drawBoss(n,bar);txt(S.bn.toUpperCase(),n.x,n.y-150,'rgba(255,170,110,.95)','center',11)}}}

/* ---------- interfaz: panel de decisión y barra de vida del jefe ---------- */
function css(){if(document.getElementById('rgCss'))return;const s=document.createElement('style');s.id='rgCss';
  s.textContent=`#rgB{position:fixed;left:50%;top:calc(96px + env(safe-area-inset-top));transform:translateX(-50%);width:min(640px,calc(100vw - 540px));min-width:300px;z-index:39;pointer-events:none;display:none;font:11px ui-monospace,Menlo,monospace;color:#ffd9d2;text-align:center;filter:drop-shadow(0 0 10px rgba(255,40,50,.35))}
#rgB .t{display:flex;align-items:center;justify-content:center;gap:8px;letter-spacing:.16em;font-weight:700;font-size:15px;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-shadow:0 0 8px rgba(255,60,70,.8)}
#rgB .t b{color:#ff5a66;font-size:21px}#rgB .t i{font-style:normal;color:#ffcf8a;font-size:12px;letter-spacing:.18em;border:1px solid rgba(255,207,138,.5);padding:1px 6px}
#rgB .b{position:relative;height:22px;background:#16060b;border:1px solid #ff4a5a;clip-path:polygon(10px 0,calc(100% - 10px) 0,100% 50%,calc(100% - 10px) 100%,10px 100%,0 50%);box-shadow:inset 0 0 8px #000}
#rgB .g,#rgB .f{position:absolute;left:0;top:0;bottom:0}
#rgB .g{background:rgba(255,255,255,.55);transition:width 1.1s ease .35s}
#rgB .f{background:linear-gradient(90deg,#6e0012,#ff2a3d 55%,#ff8a66);transition:width .18s}
#rgB .f::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 35%,rgba(255,255,255,.45) 50%,transparent 65%);background-size:220% 100%;animation:rgbs 2.4s linear infinite}
#rgB .k{position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 calc(10% - 1px),rgba(0,0,0,.55) calc(10% - 1px) 10%)}
#rgB .m{position:absolute;left:50%;top:-2px;bottom:-2px;width:2px;background:#ffcf8a;box-shadow:0 0 6px #ffcf8a}
#rgB.sh .b{border-color:#7de3ff;box-shadow:0 0 12px rgba(125,227,255,.5),inset 0 0 8px #000}
#rgB .s{margin-top:4px;font-size:12px;letter-spacing:.08em;color:#ffb3a8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#rgB.sh .s{color:#7de3ff}
@keyframes rgbs{from{background-position:120% 0}to{background-position:-120% 0}}`;
  document.head.appendChild(s)}
function ui(){
  css();
  if(!el){el=document.createElement('div');el.id='rgP';
    el.style.cssText='display:none;position:fixed;left:50%;transform:translateX(-50%);bottom:calc(130px + env(safe-area-inset-bottom));z-index:40;width:min(340px,86%);background:rgba(8,16,28,.94);border:1px solid #7de3ff;padding:10px 12px;font:12px ui-monospace,Menlo,monospace;color:#cfe8ff;box-sizing:border-box;pointer-events:auto';
    el.addEventListener('pointerdown',e=>e.stopPropagation());
    el.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-a]');if(b)act(b.dataset.a)});
    document.body.appendChild(el)}
  if(!bar){bar=document.createElement('div');bar.id='rgB';
    bar.innerHTML='<div class=t><b>☠</b><span class=nm></span><i class=ph></i></div><div class=b><div class=g></div><div class=f></div><div class=k></div><div class=m></div></div><div class=s></div>';document.body.appendChild(bar);
    bar._g=bar.querySelector('.g');bar._f=bar.querySelector('.f');bar._nm=bar.querySelector('.nm');bar._ph=bar.querySelector('.ph');bar._s=bar.querySelector('.s')}
  const S=E||G,play=S&&state==='play'&&!ship.docked;let h='',bc='#7de3ff';
  if(play){
    const host=!ctx.isGuest(),Bt=(a,t)=>`<button class="sq" data-a="${a}" style="position:static;padding:8px 10px;font-size:11px;margin-top:5px;width:100%">${t}</button>`;
    if(S.ph==='arr')h=`<div class=evh style="color:#7de3ff">NAVES DESCONOCIDAS</div><div class=evd>Se acercan en formación y te inmovilizan: no puedes moverte.</div>`;
    else if(S.ph==='pull')h=`<div class=evh style="color:#7de3ff">ESCOLTA FUERA</div><div class=evd>La guardia te devuelve a la frontera. Si vuelves a entrar, regresarán.</div>`;
    else if(S.ph==='wave'){bc='#ff9a8a';h=S.t<4.5?`<div class=evh style="color:#ff9a8a">OLEADA ${(S.wv|0)+1} / 3</div><div class=evd>Acaba con todas las naves hostiles${host?' ('+units().length+' restantes)':''}.</div>`:(host?`<div class=evd style="text-align:center">Enemigos restantes: <b>${units().length}</b></div>`:'');if(!h)el.style.borderColor='transparent'}
    else if(S.ph==='warn'){bc='#ff5a66';h=`<div class=evh style="color:#ff5a66">☠ AVISO DE JEFE</div><div class=evd><b>${S.bn}</b> llega en ${Math.max(0,Math.ceil(4-S.t))} s. Creará un campo del que no podrás huir.</div>`}
    else if(S.ph==='ask'){const left=Math.max(0,Math.ceil(S.lim-S.t));
      h=`<div class=evh style="color:#7de3ff">GUARDIA · ${S.nm.toUpperCase()}</div><div class=evd>${S.n} naves te rodean y <b>no son hostiles</b>. Para entrar en la región: <b>márchate</b> o <b>derrota a ${S.bn}</b>.</div><div class=evd>Tiempo para decidir: ${left} s</div>`+(host?Bt('acc','Luchar contra el jefe')+Bt('dec','Marcharme'):'<div class=evd>Decide el anfitrión de la sala.</div>')}
    else if(S.ph==='ok'){bc='#7dff9b';h=`<div class=evh style="color:#7dff9b">JEFE DERROTADO</div><div class=evd>${S.bn} cae. ${S.nm} queda despejada${S.rw>0?' · +'+S.rw+' cr (si estabas cerca)':''}.</div>`}}
  el.style.borderColor=bc;el.style.display=h?'block':'none';if(elH!==h){elH=h;el.innerHTML=h}
  const bo=play&&S.ph==='boss'?bossNpc():null;
  if(bo){const p=cl(bo.hp/(bo.max||1),0,1)*100,sh=barrier();
    bar.style.display='block';bar.classList.toggle('sh',sh);bar._f.style.width=p+'%';bar._g.style.width=p+'%';
    if(bar._nm.textContent!==S.bn.toUpperCase())bar._nm.textContent=S.bn.toUpperCase();
    const ph=bo.im?'INMORTAL · HUYE':bo.hp<bo.max*.5?'FASE II':'FASE I',st=bo.im?'Invulnerable: se retira. Sobrevive unos segundos':sh?'ESCUDO DE ESCOLTA · elimina las naves pequeñas ('+units().length+')':'Dispara al casco';
    if(bar._ph.textContent!==ph)bar._ph.textContent=ph;if(bar._s.textContent!==st)bar._s.textContent=st}
  else bar.style.display='none'}
function act(a){if(!E||ctx.isGuest())return;if(a==='acc')accept();else if(a==='dec')decline()}

/* ---------- API que usa regions.js ---------- */
function guestVisual(){                          // en el invitado sus balas atraviesan al jefe: se retiran solo en pantalla (el daño lo aplica el anfitrión)
  const bo=bossNpc();if(!bo)return;const c=Math.cos(-bo.a),s=Math.sin(-bo.a);
  for(const b of bullets){if(b.life<=0||b.own!=='p')continue;const dx=b.x-bo.x,dy=b.y-bo.y;if(Math.abs(dx)>230||Math.abs(dy)>230)continue;
    if(((dx*c-dy*s)/175)**2+((dx*s+dy*c)/96)**2<1){b.life=0;boom(b.x,b.y,3,'#cfd6e6')}}}
function update(dt,c){ctx=c;
  if(state==='warp'&&warp&&!warp._rg){warp._rg=1;try{planStop()}catch(e){console.warn('[eventos]',e)}}
  if(ixW&&state==='play'){ixW=0;brk=3}
  if(brk>0&&state==='play'){brk-=dt;const k=Math.max(0,1-2.6*dt);ship.vx*=k;ship.vy*=k}                // frenada suave tras el corte del salto
  if(c.isGuest()){if(G){G.t+=dt;if(typeof mpSlave==='function'&&!mpSlave())G=null;else if(G){if(G.ph==='boss')guestVisual();guestApply(dt)}}else clearWingTow()}
  else if(E)step(dt);else tryStart();
  ui()}
const snap=()=>({id:E.id,rg:E.rg,nm:E.nm,ph:E.ph,t:+E.t.toFixed(1),lim:E.lim,n:E.n,bn:E.bn,rw:E.rw,bx:Math.round(E.bx||0),by:Math.round(E.by||0),fx:Math.round(E.fx),fy:Math.round(E.fy),wv:E.wv|0,fl:E.fld?[Math.round(E.fld.x),Math.round(E.fld.y),E.fld.r,E.fld.h?1:0]:0,lk:(E.ph==='arr'||E.ph==='ask')?1:0,tw:E.tw.filter(T=>!T.me&&T.ph!=='done').map(T=>[T.id,Math.round(T.x),Math.round(T.y),Math.round(T.vx),Math.round(T.vy),+T.h.toFixed(2),T.ph==='tow'?1:0])});
function mpDiff(full){
  const ck=cleared.size+':'+(E?E.id+E.ph+(E.tw.length?Math.floor(time*9):'')+E.wv+(E.fld?E.fld.h:''):0);if(!full&&ck===sentKey)return null;sentKey=ck;
  return{s:E?snap():null,c:[...cleared]}}
function mpApply(S){
  if(!S||typeof S!=='object')return;
  if(Array.isArray(S.c))cleared=new Set(S.c.map(String));                 // el anfitrión manda sobre qué regiones están superadas
  const s=S.s;if(!s){G=null;return}
  if(typeof s.id!=='number'||typeof s.ph!=='string')return;
  const old=G;G={id:s.id,rg:String(s.rg),nm:String(s.nm||''),ph:s.ph,t:nv(s.t,0),lim:nv(s.lim,60),n:nv(s.n,0),bn:String(s.bn||'Jefe'),rw:nv(s.rw,0),bx:nv(s.bx,0),by:nv(s.by,0),fx:nv(s.fx,0),fy:nv(s.fy,0),wv:nv(s.wv,0),fld:Array.isArray(s.fl)?{x:nv(s.fl[0],0),y:nv(s.fl[1],0),r:nv(s.fl[2],FR),h:s.fl[3]?1:0}:null,lk:s.lk?1:0,tw:Array.isArray(s.tw)?s.tw.filter(Array.isArray).slice(0,8).map(q=>[String(q[0]),nv(q[1],0),nv(q[2],0),nv(q[3],0),nv(q[4],0),nv(q[5],0),q[6]?1:0]):[]};
  if(old&&old.id===G.id)G.fz=old.fz;
  if(G.ph==='ok'&&seenOk!==G.id){seenOk=G.id;pay(G)}}
const save=()=>({c:[...cleared]});
function load(d){cleared=new Set();if(d&&Array.isArray(d.c))for(const id of d.c)cleared.add(String(id))}
try{if(typeof window!=='undefined'&&window.__RGS&&window.__RGS.e)load(window.__RGS.e)}catch(e){}

return{ver:VER,icon,update,drawWorld,drawMap:(X,Y,s)=>mapField(X,Y,s),drawMini:mapField,towing:()=>!!(E&&E.tw.some(T=>T.me&&T.ph==='tow'))||!!(G&&(G.tw||[]).some(q=>q[6]&&q[0]===String(typeof MP!=='undefined'?MP.id:''))),mpDiff,mpApply,save,load,abort:()=>abort(''),cleared:id=>cleared.has(String(id)),lockJump:()=>lockJump()||!!(G&&G.fld),
  debug:()=>({E:E&&{ph:E.ph,t:E.t,rg:E.rg,np:E.np},G:G&&G.ph,cleared:[...cleared],units:units().length})}
})();
