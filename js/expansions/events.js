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
const VER=2,TAU=Math.PI*2;
const rnd=(a,b)=>a+Math.random()*(b-a),cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const nv=(v,d)=>Number.isFinite(+v)?+v:d;
const K={boss:100,drone:101,snipe:102};            // se guarda en npc.slot (viaja por la sincronización de index)
const NODES=[[-130,0,30],[30,-74,24],[30,74,24]];  // puntos débiles del jefe (x,y,radio) en coordenadas de la nave
const HULL=[[170,0],[120,-40],[60,-62],[-20,-85],[-110,-70],[-170,-40],[-190,0],[-170,40],[-110,70],[-20,85],[60,62],[120,40]];

let ctx=null,E=null,G=null;          // E = evento (anfitrión/solitario) · G = copia recibida (invitado)
let cleared=new Set();const armed=new Map(),rearm=new Map();
let cool=0,sentKey='',sentId=0,seenOk=0,el=null,elH='',bar=null,ixW=0,ixR=null,brk=0,tCheck=0;

/* ---------- utilidades ---------- */
const mpHost=()=>typeof MP!=='undefined'&&MP.role==='host';
const inMP=()=>typeof MP!=='undefined'&&!!MP.role;
function say(m){try{toast(m);if(mpHost()&&typeof mpBc==='function')mpBc('tt',{m})}catch(e){}}
const units=()=>npcs.filter(n=>n.slot>=K.drone&&n.hp>0);
const bossNpc=()=>npcs.find(n=>n.slot===K.boss);
const barrier=()=>units().length>=3;
function cfg(R){
  const c=(R.det&&R.det.event)||{},dg=R.det?R.det.danger:2,nm=R.m.name;
  return{fleet:cl(Math.round(nv(c.fleet,5)),3,8),boss:String(c.boss||('Guardián de '+nm)).slice(0,40),
    hp:cl(Math.round(nv(c.hp,900*(1+.3*dg))),300,8000),reward:cl(Math.round(nv(c.reward,600)),0,5000),dg,dm:1+.1*dg}}
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
  const d=Math.hypot(tx-A.x,ty-A.y);
  w.dest.x=tx;w.dest.y=ty;w.h=Math.atan2(ty-A.y,tx-A.x);w.te=2.5+Math.max(1.2,d/12000)/wspV();   // mismo perfil de salto: frenada suave hasta el punto de corte
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
    const p=pl.find(q=>ctx.inside(R.m,q.x,q.y,-1200));if(p){start(R,p);return}}}
function start(R,p){
  const c=cfg(R),a0=rnd(0,TAU),ix=ixR===R.id;ixR=null;armed.set(R.id,false);
  E={id:(Date.now()%1e9)|0,rg:R.id,nm:R.m.name,ph:'arr',t:0,lim:60,n:c.fleet,bn:c.boss,hpB:c.hp,dm:c.dm,dg:c.dg,rw:c.reward,px:p.x,py:p.y,fx:p.x,fy:p.y,np:1,boss:null,gl:0,ix};
  for(let i=0;i<c.fleet;i++){const a=a0+i/c.fleet*TAU,r=ix?1300:1700,e=mk('r',p.x+Math.cos(a)*r,p.y+Math.sin(a)*r,{x:p.x,y:p.y});
    e.gv=1;e.rgv=1;e.hp=e.max=1e6;e.slot=i/c.fleet*TAU;e.a=a+Math.PI;npcs.push(e)}
  say(ix?'⚠ La guardia de '+R.m.name+' te rodea: no abren fuego':'⚠ Naves desconocidas se acercan a tu posición. No parecen hostiles')}
function end(){npcs=npcs.filter(n=>!n.rgv&&!(n.slot>=K.boss&&n.slot<=K.snipe));E=null;cool=ctx?ctx.clock()+45:0}
function abort(m){if(!E)return;if(m)say(m);end()}
function decline(){if(!E||E.ph!=='ask')return;E.ph='go';E.t=0;rearm.set(E.rg,ctx.clock()+30);say('La guardia se retira. Abandona la región: si te quedas, volverán a preguntar')}
function accept(){if(!E||E.ph!=='ask')return;
  const np=countNear(E.px,E.py,9000),a=rnd(0,TAU),bx=E.px+Math.cos(a)*2400,by=E.py+Math.sin(a)*2400,hp=Math.round(E.hpB*cl(np,1,4));
  const bo=mk('x',bx,by,{x:bx,y:by});
  Object.assign(bo,{boss:1,evs:1,slot:K.boss,hp,max:hp,rad:110,dm:E.dm,dl:E.dg,a:a+Math.PI,rgb:1,bvx:0,bvy:0,t1:2.5,t2:7,t3:3,ph2:0});
  npcs.push(bo);E.boss=bo;E.np=np;E.ph='boss';E.t=0;E.gl=1;E.fx=E.px;E.fy=E.py;E.chk=0;
  say('☠ '+E.bn+' aparece '+['→','↘','↓','↙','←','↖','↑','↗'][Math.round(a/(TAU/8))%8]+(np>1?' · vida ×'+np+' por '+np+' pilotos':'')+'. Usa a tus ayudantes contra los escoltas y ataca sus puntos débiles')}
function victory(){const bo=E.boss;E.bx=bo.x;E.by=bo.y;E.ph='ok';E.t=0;cleared.add(E.rg);
  boom(bo.x,bo.y,40,'#ff8a5c');for(let i=0;i<16;i++)loot.push({x:bo.x+rnd(-90,90),y:bo.y+rnd(-60,60),v:6+((Math.random()*4)|0),life:120});
  for(const u of units()){boom(u.x,u.y,14,'#ff8a5c');u.hp=0}
  npcs=npcs.filter(n=>n!==bo);E.boss=null;
  say('✔ '+E.bn+' derrotado: la región es tuya');pay(E)}
function pay(S){if(!(S.rw>0))return;if(Math.hypot(ship.x-S.bx,ship.y-S.by)<12000){ship.cred+=S.rw;toast('+'+S.rw+' créditos por vencer a '+S.bn)}}

/* ---------- el jefe y sus escoltas ---------- */
function spawnUnit(kind,x,y){const u=mk('e',x,y,{x,y});u.gv=1;u.slot=kind;u.a=rnd(0,TAU);u.rgc=rnd(.5,2);u.cs=0;u.dm=E?E.dm:1;
  if(kind===K.drone){u.hp=u.max=60;u.rad=16}else{u.hp=u.max=85;u.rad=18}npcs.push(u);return u}
function shoot(o,x,y,a,d,sp,life){const b=bl({x,y,vx:0,vy:0},a,'e',d);b.o=o;if(sp){b.vx=Math.cos(a)*sp;b.vy=Math.sin(a)*sp}if(life)b.life=life;bullets.push(b);return b}
function nearest(x,y,pl){let b=null,bd=1e9;for(const p of pl){const d=Math.hypot(p.x-x,p.y-y);if(d<bd){bd=d;b=p}}return b?{p:b,d:bd}:null}
function bossAI(bo,dt,pl){
  const T=nearest(bo.x,bo.y,pl);if(!T)return;const tg=T.p,dm=bo.dm||1;
  const ang=Math.atan2(tg.y-bo.y,tg.x-bo.x),want=Math.atan2(Math.sin(ang-bo.a),Math.cos(ang-bo.a));bo.a+=cl(want,-1,1)*1.1*dt;
  const k=T.d>1150?1:T.d<750?-.8:0,sp=bo.ph2?150:120;bo.bvx+=(Math.cos(bo.a)*sp*k-bo.bvx)*Math.min(1,1.2*dt);bo.bvy+=(Math.sin(bo.a)*sp*k-bo.bvy)*Math.min(1,1.2*dt);
  bo.x+=bo.bvx*dt;bo.y+=bo.bvy*dt;
  if(!bo.ph2&&bo.hp<bo.max*.5){bo.ph2=1;say('⚠ '+E.bn+' entra en fase de furia: más disparos y más escoltas')}
  const mx=bo.x+Math.cos(bo.a)*150,my=bo.y+Math.sin(bo.a)*150;
  bo.t1-=dt;if(bo.t1<=0&&T.d<1500){bo.t1=bo.ph2?2.4:3.4;const n=bo.ph2?11:7;for(let i=0;i<n;i++)shoot(bo,mx,my,bo.a+(i-(n-1)/2)*.12,5*dm,0,1.6)}          // abanico
  bo.t2-=dt;if(bo.t2<=0&&T.d<1900){bo.t2=bo.ph2?5.2:7;const q=shoot(bo,mx,my,ang,16*dm,300,6.5);q.big=1}                                                   // torpedo lento
  bo.t3-=dt;const cap=3+2*(E.np||1);
  if(bo.t3<=0){bo.t3=bo.ph2?10:15;let nd=units().filter(u=>u.slot===K.drone).length,ns=units().filter(u=>u.slot===K.snipe).length;
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
  else{sp=210;
    if(u.cs>0){ax=ay=0;u.cs-=dt;if(u.cs>.45)u.a+=cl(Math.atan2(Math.sin(ang-u.a),Math.cos(ang-u.a)),-1,1)*5*dt;   // apunta y se queda quieto; el último instante bloquea el ángulo
      if(u.cs<=0){u.fled=0;shoot(u,u.x+Math.cos(u.a)*46,u.y+Math.sin(u.a)*46,u.a,17*dm,3200,1.1);u.rgc=5.5}}
    else{if(d<1400){ax=-Math.cos(ang);ay=-Math.sin(ang)}else if(d>2100){ax=Math.cos(ang);ay=Math.sin(ang)}else{ax=Math.cos(ang+1.57)*.5;ay=Math.sin(ang+1.57)*.5}
      u.a+=cl(Math.atan2(Math.sin(ang-u.a),Math.cos(ang-u.a)),-1,1)*3*dt;
      u.rgc-=dt;if(u.rgc<=0&&d<3000){u.cs=1.3;u.fled=1}}}
  for(const o of units())if(o!==u){const dx=u.x-o.x,dy=u.y-o.y,dd=Math.hypot(dx,dy);if(dd>0&&dd<60){ax+=dx/dd*.6;ay+=dy/dd*.6}}
  const m=Math.hypot(ax,ay)||1;u.vx+=(ax/m*sp*(m>.01?1:0)-u.vx)*Math.min(1,2.5*dt);u.vy+=(ay/m*sp*(m>.01?1:0)-u.vy)*Math.min(1,2.5*dt);u.x+=u.vx*dt;u.y+=u.vy*dt}
/* impactos en el jefe (el motor de index no lo toca: es de otro «equipo»): blindaje, puntos débiles y escudo de escolta */
function hitBoss(bo){
  const c=Math.cos(-bo.a),s=Math.sin(-bo.a),bar=barrier();
  for(const b of bullets){if(b.life<=0||b.own!=='p'||b.gh)continue;
    const dx=b.x-bo.x,dy=b.y-bo.y;if(Math.abs(dx)>230||Math.abs(dy)>230)continue;
    const lx=dx*c-dy*s,ly=dx*s+dy*c;let m=0;
    for(const[nx,ny,nr]of NODES)if(Math.hypot(lx-nx,ly-ny)<nr){m=1.6;break}
    if(!m&&(lx/175)**2+(ly/80)**2<1)m=.22;
    if(!m)continue;
    b.life=0;boom(b.x,b.y,m>1?7:3,m>1?'#ffd166':'#cfd6e6');
    bo.hp-=(b.d||5)*m*(bar?.35:1);bo.lh=time}}

function step(dt){
  if(typeof GEV!=='undefined'&&!GEV.cur&&GEV.t<30)GEV.t=30;      // mientras dura, index no lanza otros eventos galácticos
  E.t+=dt;
  if(!inMP()&&(ship.docked||ship.dead>0||state==='warp'))return abort(ship.dead>0?'✖ Has caído: el combate termina':'El evento de la región se cancela');
  const cs=npcs.filter(n=>n.rgv),pl=ctx.players();
  let P0={x:E.px,y:E.py};
  if(cs.length){let fx=0,fy=0;for(const c of cs){fx+=c.x;fy+=c.y}fx/=cs.length;fy/=cs.length;
    let best=1e9;for(const p of pl){const d=Math.hypot(p.x-fx,p.y-fy);if(d<best&&d<6000){best=d;P0=p}}}
  E.px=P0.x;E.py=P0.y;
  const sv=Math.abs(P0.x-ship.x)<1&&Math.abs(P0.y-ship.y)<1?Math.hypot(ship.vx,ship.vy):0;
  const orbit=()=>{let far=0;for(const c of cs){const a=c.slot+time*.3,R=E.ph==='arr'?340:300,dx=P0.x+Math.cos(a)*R-c.x,dy=P0.y+Math.sin(a)*R-c.y,d=Math.hypot(dx,dy)||1,sp=Math.min(d*2.5+sv,620);
      c.vx=dx/d*sp;c.vy=dy/d*sp;c.x+=c.vx*dt;c.y+=c.vy*dt;c.a=d>80?Math.atan2(c.vy,c.vx):Math.atan2(P0.y-c.y,P0.x-c.x);if(d>260)far++}return far};
  const leave=()=>{for(const c of cs){const a=Math.atan2(c.y-P0.y,c.x-P0.x);c.vx=Math.cos(a)*520;c.vy=Math.sin(a)*520;c.x+=c.vx*dt;c.y+=c.vy*dt;c.a=a}};
  if(E.ph==='arr'){if(!cs.length)return end();const far=orbit();
    if(!far||E.t>16){E.ph='ask';E.t=0;E.lim=60;say('⚠ '+E.n+' naves te rodean sin disparar: «Para entrar en '+E.nm+' márchate o derrota a '+E.bn+'»')}}
  else if(E.ph==='ask'){orbit();if(E.t>E.lim)decline()}
  else if(E.ph==='go'){leave();if(E.t>6)end()}
  else if(E.ph==='boss'){
    if(E.gl){leave();if(E.t>6){npcs=npcs.filter(n=>!n.rgv);E.gl=0}}
    const bo=E.boss;
    if(bo.hp<=0){victory();return}
    if(!npcs.includes(bo)){say('El jefe pierde tu rastro y se retira. Podrás volver a intentarlo al reentrar en la región');return end()}
    if(countNear(bo.x,bo.y,12000)<1&&E.t>20&&!pl.some(p=>Math.hypot(p.x-bo.x,p.y-bo.y)<12000)){say('El jefe se repliega al quedarse sin objetivos');return end()}
    bossAI(bo,dt,pl);for(const u of units())unitAI(u,dt,pl);hitBoss(bo);
    E.fx=bo.x;E.fy=bo.y;
    E.chk-=dt;if(E.chk<=0){E.chk=1;const np=countNear(bo.x,bo.y,9000);if(np>E.np){const add=E.hpB*(np-E.np);bo.max+=add;bo.hp+=add;E.np=np;say('⚠ Otro piloto se une al combate: '+E.bn+' se refuerza (vida ×'+np+')')}}}
  else if(E.ph==='ok'){if(E.t>8)end()}}

/* ---------- dibujo de naves (se pinta sobre la nave genérica de index, que queda tapada) ---------- */
function flashOf(n){if(n._p!=null&&n.hp<n._p-.5)n._f=time;n._p=n.hp;return n._f!=null&&time-n._f<.12?1-(time-n._f)/.12:0}
function drawBoss(n,bar){const a=n.a||0,pu=.5+.5*Math.sin(time*3),fl=flashOf(n);
  g.save();g.translate(n.x,n.y);g.rotate(a);
  if(bar){g.strokeStyle='rgba(125,235,255,'+(.35+.25*pu)+')';g.lineWidth=3;g.setLineDash([16,10]);g.lineDashOffset=-time*30;g.beginPath();g.arc(0,0,215,0,TAU);g.stroke();g.setLineDash([])}
  g.fillStyle='rgba(255,60,50,'+(.1+.06*pu)+')';g.beginPath();g.ellipse(-185,0,34,26+8*pu,0,0,TAU);g.fill();       // propulsores
  g.beginPath();HULL.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();
  const gr=g.createLinearGradient(-190,0,170,0);gr.addColorStop(0,'#23101a');gr.addColorStop(.6,'#3a1824');gr.addColorStop(1,'#2a0f18');g.fillStyle=gr;g.fill();g.strokeStyle='#ff4a5a';g.lineWidth=3;g.stroke();
  g.strokeStyle='rgba(255,110,110,.45)';g.lineWidth=1.5;g.beginPath();g.moveTo(120,-40);g.lineTo(-60,-30);g.lineTo(-150,-34);g.moveTo(120,40);g.lineTo(-60,30);g.lineTo(-150,34);g.moveTo(60,-62);g.lineTo(60,62);g.stroke();   // placas de blindaje
  g.fillStyle='#10060c';for(const sd of[-1,1]){g.fillRect(-52,sd*72-9,52,18);g.strokeStyle='rgba(255,140,90,.6)';g.strokeRect(-52,sd*72-9,52,18)}  // hangares
  g.fillStyle='#ff6a5a';g.beginPath();g.moveTo(165,0);g.lineTo(125,-8);g.lineTo(125,8);g.closePath();g.fill();                                     // cañón frontal
  for(const[nx,ny,nr]of NODES){const r=nr*(.85+.2*pu);
    if(bar){g.strokeStyle='rgba(125,235,255,.8)';g.lineWidth=2;g.beginPath();g.arc(nx,ny,nr+6,0,TAU);g.stroke();g.fillStyle='rgba(120,150,170,.55)';g.beginPath();g.arc(nx,ny,nr*.7,0,TAU);g.fill()}
    else{const q=g.createRadialGradient(nx,ny,0,nx,ny,r+10);q.addColorStop(0,'rgba(255,240,170,1)');q.addColorStop(.5,'rgba(255,170,60,.9)');q.addColorStop(1,'rgba(255,60,40,0)');g.fillStyle=q;g.beginPath();g.arc(nx,ny,r+10,0,TAU);g.fill();g.strokeStyle='#ffd166';g.lineWidth=2;g.beginPath();g.arc(nx,ny,nr,0,TAU);g.stroke()}}
  if(fl){g.globalAlpha=.4*fl;g.fillStyle='#fff';g.beginPath();HULL.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();g.fill();g.globalAlpha=1}
  g.restore()}
function drawDrone(n){const fl=flashOf(n);g.save();g.translate(n.x,n.y);g.rotate(n.a||0);
  g.fillStyle='#05070d';g.beginPath();g.arc(0,0,19,0,TAU);g.fill();
  g.fillStyle='rgba(255,79,216,.25)';g.beginPath();g.ellipse(-16,0,10,5,0,0,TAU);g.fill();
  g.beginPath();[[24,0],[-6,-8],[-14,-22],[-12,-5],[-19,0],[-12,5],[-14,22],[-6,8]].forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();
  g.fillStyle=fl?'#fff':'#1a0b17';g.fill();g.strokeStyle='#ff4fd8';g.lineWidth=2;g.stroke();
  g.fillStyle='#ffd0f4';g.fillRect(8,-1.5,6,3);g.restore()}
function drawSniper(n){const fl=flashOf(n);
  if(n.fled){g.save();g.strokeStyle='rgba(255,80,80,'+(.35+.4*(.5+.5*Math.sin(time*25)))+')';g.lineWidth=1.5;g.setLineDash([14,10]);g.beginPath();g.moveTo(n.x+Math.cos(n.a)*46,n.y+Math.sin(n.a)*46);g.lineTo(n.x+Math.cos(n.a)*3200,n.y+Math.sin(n.a)*3200);g.stroke();g.restore()}
  g.save();g.translate(n.x,n.y);g.rotate(n.a||0);
  g.fillStyle='#05070d';g.beginPath();g.arc(0,0,21,0,TAU);g.fill();
  g.beginPath();[[30,0],[10,-6],[-12,-13],[-24,-9],[-29,0],[-24,9],[-12,13],[10,6]].forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();
  g.fillStyle=fl?'#fff':'#100c22';g.fill();g.strokeStyle='#a98bff';g.lineWidth=2;g.stroke();
  g.fillStyle='#a98bff';g.fillRect(28,-1.5,20,3);                                           // cañón largo
  const c=n.fled?'rgba(255,90,90,':'rgba(169,139,255,';g.fillStyle=c+(.55+.4*Math.sin(time*6))+')';g.beginPath();g.arc(4,0,4,0,TAU);g.fill();g.restore()}
function drawWorld(){const S=E||G;if(!S)return;
  const pu=.5+.5*Math.sin(time*3),bar=barrier();
  for(const n of npcs){if(n.hp<=0||!vis(n.x,n.y,260))continue;
    if(n.gv&&n.team==='r'){g.save();g.fillStyle='rgba(125,235,255,.13)';g.strokeStyle='rgba(125,235,255,'+(.55+.3*pu)+')';g.lineWidth=2;g.beginPath();g.arc(n.x,n.y,26,0,TAU);g.fill();g.stroke();g.restore();
      if(S.ph==='ask'||S.ph==='arr')txt('GUARDIA',n.x,n.y-34,'rgba(150,240,255,.85)','center',9)}
    else if(n.slot===K.drone)drawDrone(n);else if(n.slot===K.snipe)drawSniper(n);
    else if(n.slot===K.boss){drawBoss(n,bar);txt(S.bn.toUpperCase(),n.x,n.y-120,'rgba(255,170,110,.95)','center',11)}}}

/* ---------- interfaz: panel de decisión y barra de vida del jefe ---------- */
function css(){if(document.getElementById('rgCss'))return;const s=document.createElement('style');s.id='rgCss';
  s.textContent=`#rgB{position:fixed;left:50%;top:calc(8px + env(safe-area-inset-top));transform:translateX(-50%);width:min(560px,92%);z-index:39;pointer-events:none;display:none;font:11px ui-monospace,Menlo,monospace;color:#ffd9d2;text-align:center;filter:drop-shadow(0 0 10px rgba(255,40,50,.35))}
#rgB .t{display:flex;align-items:center;justify-content:center;gap:10px;letter-spacing:.22em;font-weight:700;font-size:12px;margin-bottom:3px;text-shadow:0 0 8px rgba(255,60,70,.8)}
#rgB .t b{color:#ff5a66;font-size:15px}#rgB .t i{font-style:normal;color:#ffcf8a;font-size:10px;letter-spacing:.18em;border:1px solid rgba(255,207,138,.5);padding:1px 6px}
#rgB .b{position:relative;height:18px;background:#16060b;border:1px solid #ff4a5a;clip-path:polygon(10px 0,calc(100% - 10px) 0,100% 50%,calc(100% - 10px) 100%,10px 100%,0 50%);box-shadow:inset 0 0 8px #000}
#rgB .g,#rgB .f{position:absolute;left:0;top:0;bottom:0}
#rgB .g{background:rgba(255,255,255,.55);transition:width 1.1s ease .35s}
#rgB .f{background:linear-gradient(90deg,#6e0012,#ff2a3d 55%,#ff8a66);transition:width .18s}
#rgB .f::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 35%,rgba(255,255,255,.45) 50%,transparent 65%);background-size:220% 100%;animation:rgbs 2.4s linear infinite}
#rgB .k{position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 calc(10% - 1px),rgba(0,0,0,.55) calc(10% - 1px) 10%)}
#rgB .m{position:absolute;left:50%;top:-2px;bottom:-2px;width:2px;background:#ffcf8a;box-shadow:0 0 6px #ffcf8a}
#rgB.sh .b{border-color:#7de3ff;box-shadow:0 0 12px rgba(125,227,255,.5),inset 0 0 8px #000}
#rgB .s{margin-top:4px;font-size:10px;letter-spacing:.12em;color:#ffb3a8}#rgB.sh .s{color:#7de3ff}
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
    if(S.ph==='arr')h=`<div class=evh style="color:#7de3ff">NAVES DESCONOCIDAS</div><div class=evd>Se acercan en formación. No parecen hostiles.</div>`;
    else if(S.ph==='ask'){const left=Math.max(0,Math.ceil(S.lim-S.t));
      h=`<div class=evh style="color:#7de3ff">GUARDIA · ${S.nm.toUpperCase()}</div><div class=evd>${S.n} naves te rodean y <b>no son hostiles</b>. Para entrar en la región: <b>márchate</b> o <b>derrota a ${S.bn}</b>.</div><div class=evd>Tiempo para decidir: ${left} s</div>`+(host?Bt('acc','Luchar contra el jefe')+Bt('dec','Marcharme'):'<div class=evd>Decide el anfitrión de la sala.</div>')}
    else if(S.ph==='ok'){bc='#7dff9b';h=`<div class=evh style="color:#7dff9b">JEFE DERROTADO</div><div class=evd>${S.bn} cae. ${S.nm} queda despejada${S.rw>0?' · +'+S.rw+' cr (si estabas cerca)':''}.</div>`}}
  el.style.borderColor=bc;el.style.display=h?'block':'none';if(elH!==h){elH=h;el.innerHTML=h}
  const bo=play&&S.ph==='boss'?bossNpc():null;
  if(bo){const p=cl(bo.hp/(bo.max||1),0,1)*100,sh=barrier();
    bar.style.display='block';bar.classList.toggle('sh',sh);bar._f.style.width=p+'%';bar._g.style.width=p+'%';
    if(bar._nm.textContent!==S.bn.toUpperCase())bar._nm.textContent=S.bn.toUpperCase();
    const ph=bo.hp<bo.max*.5?'FASE II · FURIA':'FASE I',st=sh?'ESCUDO DE ESCOLTA · elimina a las naves pequeñas ('+units().length+')':'PUNTOS DÉBILES EXPUESTOS · dispara a los núcleos dorados';
    if(bar._ph.textContent!==ph)bar._ph.textContent=ph;if(bar._s.textContent!==st)bar._s.textContent=st}
  else bar.style.display='none'}
function act(a){if(!E||ctx.isGuest())return;if(a==='acc')accept();else if(a==='dec')decline()}

/* ---------- API que usa regions.js ---------- */
function guestVisual(){                          // en el invitado sus balas atraviesan al jefe: se retiran solo en pantalla (el daño lo aplica el anfitrión)
  const bo=bossNpc();if(!bo)return;const c=Math.cos(-bo.a),s=Math.sin(-bo.a);
  for(const b of bullets){if(b.life<=0||b.own!=='p')continue;const dx=b.x-bo.x,dy=b.y-bo.y;if(Math.abs(dx)>230||Math.abs(dy)>230)continue;
    if(((dx*c-dy*s)/175)**2+((dx*s+dy*c)/80)**2<1){b.life=0;boom(b.x,b.y,3,'#cfd6e6')}}}
function update(dt,c){ctx=c;
  if(state==='warp'&&warp&&!warp._rg){warp._rg=1;try{planStop()}catch(e){console.warn('[eventos]',e)}}
  if(ixW&&state==='play'){ixW=0;brk=3}
  if(brk>0&&state==='play'){brk-=dt;const k=Math.max(0,1-2.6*dt);ship.vx*=k;ship.vy*=k}                // frenada suave tras el corte del salto
  if(c.isGuest()){if(G){G.t+=dt;if(typeof mpSlave==='function'&&!mpSlave())G=null;else if(G&&G.ph==='boss')guestVisual()}}
  else if(E)step(dt);else tryStart();
  ui()}
const snap=()=>({id:E.id,rg:E.rg,nm:E.nm,ph:E.ph,t:+E.t.toFixed(1),lim:E.lim,n:E.n,bn:E.bn,rw:E.rw,bx:Math.round(E.bx||0),by:Math.round(E.by||0),fx:Math.round(E.fx),fy:Math.round(E.fy)});
function mpDiff(full){
  const ck=cleared.size+':'+(E?E.id+E.ph:0);if(!full&&ck===sentKey)return null;sentKey=ck;
  return{s:E?snap():null,c:[...cleared]}}
function mpApply(S){
  if(!S||typeof S!=='object')return;
  if(Array.isArray(S.c))cleared=new Set(S.c.map(String));                 // el anfitrión manda sobre qué regiones están superadas
  const s=S.s;if(!s){G=null;return}
  if(typeof s.id!=='number'||typeof s.ph!=='string')return;
  G={id:s.id,rg:String(s.rg),nm:String(s.nm||''),ph:s.ph,t:nv(s.t,0),lim:nv(s.lim,60),n:nv(s.n,0),bn:String(s.bn||'Jefe'),rw:nv(s.rw,0),bx:nv(s.bx,0),by:nv(s.by,0),fx:nv(s.fx,0),fy:nv(s.fy,0)};
  if(G.ph==='ok'&&seenOk!==G.id){seenOk=G.id;pay(G)}}
const save=()=>({c:[...cleared]});
function load(d){cleared=new Set();if(d&&Array.isArray(d.c))for(const id of d.c)cleared.add(String(id))}
try{if(typeof window!=='undefined'&&window.__RGS&&window.__RGS.e)load(window.__RGS.e)}catch(e){}

return{ver:VER,update,drawWorld,mpDiff,mpApply,save,load,abort:()=>abort(''),
  debug:()=>({E:E&&{ph:E.ph,t:E.t,rg:E.rg,np:E.np},G:G&&G.ph,cleared:[...cleared],units:units().length})}
})();
