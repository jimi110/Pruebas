/* ============================================================================
   systems/events.js — Eventos galácticos (peaje, tormenta de iones, meteoritos, mercader, cápsula) y evento de rescate.
   (Trozo de la antigua pieza única de index.html. Se carga como script clásico en orden:
   comparte el ámbito global con el resto de js/. NO cambies el orden de carga en index.html.)
   ========================================================================== */
"use strict";
/* ===== EVENTOS GALÁCTICOS: flota de peaje, tormenta de iones, meteoritos, mercader, cápsula ===== */
const GEV={t:110,cur:null};let gvRocks=[];
const gvAr=a=>'→↘↓↙←↖↑↗'[Math.round((((a%TAU)+TAU)%TAU)/(TAU/8))%8],gvTot=()=>Object.values(ship.inv).reduce((a,b)=>a+b,0),gvFar=(x,y,m)=>BASES.every(b=>Math.hypot(b.x-x,b.y-y)>b.r+m),gvDone=()=>{const e0=GEV.cur;GEV.cur=null;GEV.t=rnd(140,240);if(mpSlave()&&e0&&e0.id)MPS.gd=e0.id};

/* Áreas de eventos (tormenta de iones, lluvia de meteoritos): solo en minimapa y mapa, como mancha irregular aproximada */
const gevBlob=(cx,cy,r,sd)=>{g.beginPath();for(let i=0;i<=64;i++){const a=i/64*TAU,k=1+.28*(Math.sin(a*2+sd)*.45+Math.sin(a*3+sd*1.9)*.35+Math.sin(a*4+sd*.6)*.2),x=cx+Math.cos(a)*r*k,y=cy+Math.sin(a)*r*k;i?g.lineTo(x,y):g.moveTo(x,y)}g.closePath()};
function gevAreas(){const E=GEV.cur;if(!E)return[];if(E.sd==null)E.sd=Math.random()*50;if(E.k==='st')return[{x:E.x,y:E.y,r:E.r,sd:E.sd,c:'190,120,255',n:'TORMENTA'}];if(E.k==='mt')return[{x:E.zx,y:E.zy,r:E.zr,sd:E.sd,c:'255,150,70',n:'METEORITOS'}];return[]}
function gevDraw(X,Y,s,big){for(const a of gevAreas()){const px=X(a.x+Math.cos(a.sd)*a.r*.07),py=Y(a.y+Math.sin(a.sd)*a.r*.07),p=.5+.5*Math.sin(time*3);gevBlob(px,py,a.r*s*.95,a.sd);g.fillStyle='rgba('+a.c+','+(.12+.06*p)+')';g.fill();g.strokeStyle='rgba('+a.c+','+(.55+.25*p)+')';g.lineWidth=big?1.6:1;g.setLineDash([5,4]);g.stroke();g.setLineDash([]);txt(a.n,px,py+3,'rgba('+a.c+',.95)','center',big?11:7)}}
function gevEnd(){npcs=npcs.filter(n=>!n.gv);gvRocks=[];gvDone()}
function gvShips(n,hostile,ang,R){const dx=Math.cos(ang),dy=Math.sin(ang);for(let i=0;i<n;i++){const o=i-(n-1)/2,e=balE(mk('e',ship.x+dx*(R+Math.abs(o)*70)-dy*o*80,ship.y+dy*(R+Math.abs(o)*70)+dx*o*80,{x:ship.x,y:ship.y}));e.a=ang+Math.PI;e.slot=i/n*TAU;if(hostile)e.agr=2500;else e.gv=1;npcs.push(e)}}
function gvHostile(m){for(const c of npcs)if(c.gv){c.gv=0;c.agr=2500}gvMsg(m);gvDone()}
function gvMsg(m){toast(m);if(MP.role==='host'&&GEV.cur&&GEV.cur.mp)mpBc('tt',{m})}
function gvCtr(E,cs){let fx=0,fy=0;for(const c of cs){fx+=c.x;fy+=c.y}fx/=cs.length;fy/=cs.length;const pl=[{x:ship.x,y:ship.y},...mpTargets()].filter(q=>Math.hypot(q.x-fx,q.y-fy)<4500);if(!pl.length)return E.cc||{x:fx,y:fy,sep:0};let cx=0,cy=0;for(const q of pl){cx+=q.x;cy+=q.y}cx/=pl.length;cy/=pl.length;let sep=0;for(const q of pl)sep=Math.max(sep,Math.hypot(q.x-cx,q.y-cy));return E.cc={x:cx,y:cy,sep}}
function gvPay(){const E=GEV.cur;gvTake(E.need);E.ph='go';E.t=0;gvMsg('✔ Peaje pagado: la flota se retira')}
function gvTake(n){for(const k of Object.keys(ship.inv).sort((a,b)=>(MIN[a]||[0,0,1])[2]-(MIN[b]||[0,0,1])[2])){const t=Math.min(n,ship.inv[k]);ship.inv[k]-=t;ship.ore=Math.max(0,ship.ore-t);n-=t}if(n>0)ship.scrap=Math.max(0,(ship.scrap|0)-Math.ceil(n))}
function gevPick(){const h0=GEV.cur;gevPick0();if(GEV.cur&&GEV.cur!==h0)GEV.cur.id=(Date.now()%1e9)|0}
function gevPick0(){if(!gvFar(ship.x,ship.y,3200)){GEV.t=15;return}
 const o=[['cv',MPS.gt||MP.role==='host'&&mpGroup().n>1?3:Math.hypot(ship.vx,ship.vy)>70?3:0],['st',2],['mt',2],['tr',1.5],['cr',2]];let s=o.reduce((a,b)=>a+b[1],0)*Math.random(),k='st';for(const[q,w]of o)if((s-=w)<=0){k=q;break}
 const a=rnd(0,TAU),ca=Math.cos(a),sa=Math.sin(a),st=BAL.stage();
 
 if(k==='cv'){const G=MP.role==='host'?mpGroup():{n:1},n=4+Math.min(st,2)+(G.n-1);GEV.cur={k,ph:'arr',n,need:Math.min(Math.max(3,Math.ceil(T.cargo*.35)),5+st*3)+2*(G.n-1),t:0,lim:25,tm:1e9,mp:MP.role==='host'?1:0};gvShips(n,0,a,1700);toast('⚠ Flota desconocida en formación: se acerca a tu posición')}
 else if(k==='st'){GEV.cur={k,x:ship.x+ca*rnd(0,900),y:ship.y+sa*rnd(0,900),vx:rnd(-25,25),vy:rnd(-25,25),r:1500,tm:55,fl:2,sd:rnd(0,50)};toast('⚡ Tormenta de iones: drena los escudos. Sal de la zona')}
 else if(k==='mt'){GEV.cur={k,tm:65,sp:0,d:a,zx:ship.x,zy:ship.y,zr:3000,in:1,sd:rnd(0,50)};toast('☄ Lluvia de meteoritos en una zona amplia: esquiva o destrúyelos (sueltan chatarra) o sal de ella para ponerte a salvo')}
 else if(k==='tr'){const h=rnd(0,TAU);GEV.cur={k,x:ship.x+ca*900,y:ship.y+sa*900,vx:0,vy:0,a:h,tm:110,sp:rnd(55,85),cap:Math.round(rnd(14,24)),cx:0};toast('📡 Mercader errante cerca: sigue la señal · compra mineral (stock limitado) y repara el casco')}
 else{GEV.cur={k,x:ship.x+ca*1100,y:ship.y+sa*1100,tm:120};toast('📦 Cápsula de suministros a la deriva: ve a por ella')}}
function gvSh(id){return Array.from({length:9},(_,i)=>{const v=Math.sin(id*12.9898+i*78.233)*43758.5453;return .72+.43*(v-Math.floor(v))})}
function gvAddRock(px,py,E){const c=Math.cos(E.d),s=Math.sin(E.d),o=rnd(-900,900),v=rnd(560,860),id=++MPS.rid+(MP.role==='host'?1e6:0);
 const k={id,x:Math.round(px-c*1500-s*o),y:Math.round(py-s*1500+c*o),vx:Math.round(c*v),vy:Math.round(s*v),r:+(Math.random()<.22?rnd(24,36):rnd(9,22)).toFixed(1),life:5,rot:+rnd(0,TAU).toFixed(2),vr:+rnd(-3,3).toFixed(2),hot:+rnd(.6,1).toFixed(2)};k.sh=gvSh(id);gvRocks.push(k);if(MP.role==='host')MPS.gq.push({n:3,k})}
function gvMtHost(dt,E){E.sp-=dt;if(E.sp>0)return;E.sp=.2;const pl=[];if(!(ship.docked||ship.dead>0||state==='warp'))pl.push({x:ship.x,y:ship.y});for(const r of mpTargets())pl.push({x:r.x,y:r.y});for(const q of pl)if(Math.hypot(q.x-E.zx,q.y-E.zy)<E.zr)gvAddRock(q.x,q.y,E)}
function gvKill(id){if(MP.role==='host')MPS.gx.push({n:3,id});else if(mpSlave())MPS.gk.push(id)}
function gevTick(dt){const E=GEV.cur;
 const ok=!((state!=='play'&&!(MP.role&&(state==='pause'||state==='ship')))||ship.dead>0||ship.docked);
 for(let i=gvRocks.length-1;i>=0;i--){const r=gvRocks[i];r.x+=r.vx*dt;r.y+=r.vy*dt;r.life-=dt;let d=0,rp=0;
  if(ok&&dist(r,ship)<r.r+14){hurt(r.r*2.2,'☄ Impacto de meteorito',Math.atan2(-r.vy,-r.vx));boom(r.x,r.y,8,'#fb8');d=1;rp=1}
  else for(const b of bullets)if(b.own==='p'&&Math.hypot(b.x-r.x,b.y-r.y)<r.r+5){b.life=0;boom(r.x,r.y,6,'#fb8');if(!b.gh&&!b.rb){ship.scrap=(ship.scrap|0)+1;rp=1}d=1;break}
  if(d&&rp&&r.id)gvKill(r.id);if(d||r.life<=0)gvRocks.splice(i,1)}
 if(!ok){if(MP.role==='host'&&state!=='warp'){if(E){E.tm-=dt;if(E.k==='mt')gvMtHost(dt,E);if(E.tm<=0||E.k==='cv')gevEnd()}else if(GEV.t>0)GEV.t-=dt;return}if(mpSlave()&&E&&E.k!=='cv'){E.tm-=dt;if(E.tm<=0)gvDone()}if(E&&!MP.role&&(ship.docked||ship.dead>0||state==='warp'))gevEnd();return}
 if(!E){GEV.t-=dt;if(GEV.t<=0)mpAt(gevPick);return}
 E.tm-=dt;
 if(E.k==='cv'&&mpSlave())return;
 if(E.k==='cv'){const cs=npcs.filter(c=>c.gv);if(!cs.length){toast('Flota destruida');return gevEnd()}
  if(E.ph!=='go'&&cs.some(c=>c.hp<c.max-.5))return gvHostile('⚠ ¡Has disparado a la flota: contraatacan!');
  const P0=E.mp?gvCtr(E,cs):ship,sv=E.mp?0:Math.hypot(ship.vx,ship.vy);E.t+=dt;
  if(E.ph==='go'){for(const c of cs){const a=Math.atan2(c.y-P0.y,c.x-P0.x);c.vx=Math.cos(a)*520;c.vy=Math.sin(a)*520;c.x+=c.vx*dt;c.y+=c.vy*dt;c.a=a}if(E.t>6)gevEnd();return}
  let far=0;for(const c of cs){const a=c.slot+time*.3,R=(E.ph==='arr'?340:300)+(E.mp?P0.sep:0),dx=P0.x+Math.cos(a)*R-c.x,dy=P0.y+Math.sin(a)*R-c.y,d=Math.hypot(dx,dy)||1,sp=Math.min(d*2.5+sv,620);c.vx=dx/d*sp;c.vy=dy/d*sp;c.x+=c.vx*dt;c.y+=c.vy*dt;c.a=d>80?Math.atan2(c.vy,c.vx):Math.atan2(P0.y-c.y,P0.x-c.x);if(d>260)far++}
  if(E.ph==='arr'&&(!far||E.t>16)){E.ph='dem';E.t=0;E.lim=E.mp?40:(Math.floor(gvTot()+(ship.scrap|0))>=E.need?40:18);gvMsg('⚠ La flota os rodea: «Entrega '+E.need+' de material o abrimos fuego»')}
  else if(E.ph==='dem'&&E.t>E.lim)gvHostile('⚠ ¡Abren fuego!')}
 else if(E.k==='st'){E.x+=E.vx*dt;E.y+=E.vy*dt;if(dist(ship,E)<E.r){ship.shd=Math.max(0,ship.shd-7*dt);E.fl-=dt;if(E.fl<=0){E.fl=rnd(2,3.5);hurt(5,null,rnd(0,TAU));boom(ship.x+rnd(-30,30),ship.y+rnd(-30,30),6,'#c9a0ff')}}if(E.tm<=0){toast('La tormenta de iones se disipa');gvDone()}}
 else if(E.k==='mt'){const inn=Math.hypot(ship.x-E.zx,ship.y-E.zy)<E.zr;if(inn!==E.in){E.in=inn;toast(inn?'☄ Vuelves a la zona de meteoritos':'✔ Has salido de la lluvia de meteoritos: estás a salvo')}if(!mpSlave()){if(MP.role==='host')gvMtHost(dt,E);else{E.sp-=dt;if(inn&&E.sp<=0){E.sp=.2;gvAddRock(ship.x,ship.y,E)}}}if(E.tm<=0){toast('La lluvia de meteoritos termina');gvDone()}}
 else if(E.k==='tr'){E.a+=Math.sin(time*.25+E.sp)*.05*dt;E.vx=Math.cos(E.a)*E.sp;E.vy=Math.sin(E.a)*E.sp;E.x+=E.vx*dt;E.y+=E.vy*dt;if(!E.cx&&dist(ship,E)<650){E.cx=1;cxFind({mer:1})}if(E.tm<=0){toast('El mercader se marcha');gvDone()}}
 else if(E.k==='cr'){if(dist(ship,E)<110){const r=Math.random(),k=['fe','cu','cr','pt'][(Math.random()*4)|0],q=Math.floor(Math.min(rnd(6,12),T.cargo-ship.ore));
   if(r<.55&&q>=1){ship.inv[k]=(ship.inv[k]||0)+q;ship.ore+=q;toast('📦 Cápsula: +'+q+' de '+MIN[k][0])}else if(r<.8){const s=Math.round(rnd(15,30));ship.scrap=(ship.scrap|0)+s;toast('📦 Cápsula: +'+s+' de chatarra')}else{const c=Math.round(rnd(150,300));ship.cred+=c;toast('📦 Cápsula: +'+c+' créditos')}
   if(Math.random()<.3){gvShips(3,1,rnd(0,TAU),900);toast('⚠ ¡Era una trampa! Piratas atacan')}gvDone()}else if(E.tm<=0){toast('La cápsula se pierde en la deriva');gvDone()}}}
function trSell(E,go){let cap=E.cap,u=0,v=0;const cap0=cap;const ks=Object.keys(ship.inv).sort((a,b)=>(MIN[b]||[0,0,1])[2]-(MIN[a]||[0,0,1])[2]);for(const k of ks){const q=Math.min(Math.floor(ship.inv[k]||0),cap);if(q<=0)continue;const pr=Math.round(C.sell*1.8*(MIN[k]?MIN[k][2]:1));u+=q;v+=q*pr;cap-=q;if(go){ship.inv[k]-=q;ship.ore=Math.max(0,ship.ore-q);if(ship.inv[k]<=.001)delete ship.inv[k]}}if(go){E.cap=cap;if(mpSlave())MPS.tc=(MPS.tc||0)+(cap0-cap);ship.cred+=v;ship.full=0}return{u,v}}
function gevAct(a){const E=GEV.cur;if(!E)return;
 if(a==='pay'&&E.k==='cv'&&E.ph==='dem'){if(Math.floor(gvTot()+(ship.scrap|0))>=E.need){if(mpSlave()){gvTake(E.need);MPS.gp=E.id;E.ph='go';toast('✔ Peaje pagado: la flota se retira')}else gvPay()}}
 else if(a==='no'&&E.k==='cv'){if(mpSlave()){MPS.gn=E.id;toast('Te niegas: la flota ataca')}else gvHostile('⚠ Te niegas: la flota ataca')}
 else if(E.k==='tr'&&dist(ship,E)<330){if(a==='sell'){const r=trSell(E,1);if(!r.u)return toast(E.cap<=0?'El mercader ya no tiene sitio en la bodega':'No llevas mineral que vender');toast('Vendido al mercader: '+r.u+' u · +'+r.v+' cr (×1.8)'+(E.cap<=0?' · bodega llena: se marcha':''));if(E.cap<=0)E.tm=Math.min(E.tm,6)}
  else if(a==='fix'){if(ship.hull>=T.hull-.5)return toast('El casco ya está intacto');if(ship.cred<120)return toast('Faltan créditos: 120');ship.cred-=120;ship.hull=T.hull;toast('Casco reparado: -120 cr')}}
 gevUI()}
function gevUI(){const el=$('gvP');if(!el)return;const E=GEV.cur;let h='',bc='#ffd166';const B=t=>`<button class="sq" data-a="${t[0]}" style="position:static;padding:8px 10px;font-size:11px;margin-top:5px;width:100%">${t[1]}</button>`;
 if(E&&state==='play'&&!ship.docked){if(E.k==='cv'&&E.ph==='dem'){const have=Math.floor(gvTot()+(ship.scrap|0)),ok=have>=E.need;bc='#ff6b6b';h=`<div class=evh style="color:#ff6b6b">FLOTA PIRATA · PEAJE</div><div class=evd>${E.n} naves en formación te rodean y exigen <b>${E.need}</b> unidades de mineral o chatarra.</div><div class=evd>Llevas: ${have} · ${ok?'Tiempo: '+Math.ceil(E.lim-E.t)+' s':'<b style="color:#ff4d4d">no tienes bastante: van a disparar</b>'}</div>`+(ok?B(['pay','Entregar material']):'')+B(['no','Negarse y luchar'])}
  else if(E.k==='tr'&&dist(ship,E)<330){const r=trSell(E,0);h=`<div class=evh>MERCADER ERRANTE</div><div class=evd>Compra mineral a ×1.8, pero solo le caben <b>${E.cap}</b> unidades más. Repara el casco por 120 cr. Se marcha en ${Math.ceil(E.tm)} s.</div>`+(E.cap>0?B(['sell',r.u?'Vender '+r.u+' u (+'+r.v+' cr)':'Sin mineral que vender']):'<div class=evd>Bodega llena.</div>')+B(['fix','Reparar casco · 120 cr'])}}
 el.style.borderColor=bc;el.classList.toggle('hide',!h);if(el._h!==h){el._h=h;el.innerHTML=h}}
function gevHud(){const E=GEV.cur;if(!E||state!=='play'||ship.docked)return;const d=dist(ship,E),ar=gvAr(Math.atan2(E.y-ship.y,E.x-ship.x)),s=Math.ceil(E.tm);let t='',c='#ffd166';
 if(E.k==='st')t=d<E.r?'⚡ TORMENTA DE IONES · escudos drenándose: sal de la zona':'⚡ TORMENTA DE IONES · '+ar+' '+kmE(d-E.r);
 else if(E.k==='mt'){const dz=Math.hypot(ship.x-E.zx,ship.y-E.zy);t=dz<E.zr?'☄ LLUVIA DE METEORITOS · '+s+' s · borde de la zona a '+km(E.zr-dz)+' · dispárales para sacar chatarra':'✔ Fuera de la zona de meteoritos · '+s+' s'}
 else if(E.k==='tr')t='📡 MERCADER ERRANTE · '+ar+' '+kmE(d)+' · '+s+' s';
 else if(E.k==='cr')t='📦 CÁPSULA DE SUMINISTROS · '+ar+' '+kmE(d)+' · '+s+' s';
 else if(E.k==='cv'){c='#ff6b6b';t=E.ph==='arr'?'☠ FLOTA PIRATA EN FORMACIÓN · se acercan':E.ph==='dem'?'☠ PEAJE PIRATA · '+Math.max(0,Math.ceil(E.lim-E.t))+' s':''}
 if(t)txt(t,W/2,Math.max(86,72+SAFE.t)+(QZ.ev&&EVA()&&QZ.ev.ph!=='ok'&&QZ.ev.ph!=='fail'?64:0),c,'center',12)}
function drawGev(){const E=GEV.cur;
 if(E&&E.k==='st'&&vis(E.x,E.y,E.r)){const q=g.createRadialGradient(E.x,E.y,E.r*.2,E.x,E.y,E.r);q.addColorStop(0,'rgba(170,110,255,.2)');q.addColorStop(.7,'rgba(150,90,255,.1)');q.addColorStop(1,'rgba(120,70,255,0)');g.fillStyle=q;g.beginPath();g.arc(E.x,E.y,E.r,0,TAU);g.fill();
  g.strokeStyle='rgba(225,200,255,.8)';g.lineWidth=2;for(let i=0;i<3;i++){const x=E.x+rnd(-E.r,E.r)*.8,y=E.y+rnd(-E.r,E.r)*.8;if(dist({x,y},E)>E.r)continue;g.beginPath();g.moveTo(x,y);g.lineTo(x+rnd(-90,90),y+rnd(-90,90));g.lineTo(x+rnd(-90,90),y+rnd(-90,90));g.stroke()}}
 if(E&&E.k==='cv'&&E.ph==='dem'){g.strokeStyle='rgba(255,90,90,.4)';g.lineWidth=1.5;g.setLineDash([8,10]);g.beginPath();g.arc(ship.x,ship.y,300,0,TAU);g.stroke();g.setLineDash([])}
 
 for(const r of gvRocks){if(!vis(r.x,r.y,140))continue;r.rot=(r.rot||0)+(r.vr||0)*.016;const sp=Math.hypot(r.vx,r.vy)||1,ux=r.vx/sp,uy=r.vy/sp,L=r.r*7;
  g.save();g.globalCompositeOperation='lighter';const gr=g.createLinearGradient(r.x,r.y,r.x-ux*L,r.y-uy*L);gr.addColorStop(0,'rgba(255,200,110,.75)');gr.addColorStop(.35,'rgba(255,110,40,.35)');gr.addColorStop(1,'rgba(255,60,20,0)');g.fillStyle=gr;g.beginPath();g.moveTo(r.x-uy*r.r*.9,r.y+ux*r.r*.9);g.lineTo(r.x-ux*L,r.y-uy*L);g.lineTo(r.x+uy*r.r*.9,r.y-ux*r.r*.9);g.closePath();g.fill();
  const hg=g.createRadialGradient(r.x,r.y,r.r*.6,r.x,r.y,r.r*2.4);hg.addColorStop(0,'rgba(255,150,70,.4)');hg.addColorStop(1,'rgba(255,100,40,0)');g.fillStyle=hg;g.beginPath();g.arc(r.x,r.y,r.r*2.4,0,TAU);g.fill();g.restore();
  g.save();g.translate(r.x,r.y);g.rotate(r.rot);const sh=r.sh||[1,1,1,1,1,1,1,1,1],n=sh.length;g.beginPath();for(let k=0;k<n;k++){const a=k/n*TAU;g[k?'lineTo':'moveTo'](Math.cos(a)*r.r*sh[k],Math.sin(a)*r.r*sh[k])}g.closePath();
  const rg=g.createRadialGradient(-r.r*.3,-r.r*.3,r.r*.1,0,0,r.r*1.2);rg.addColorStop(0,'#8a7a6c');rg.addColorStop(.6,'#4d4038');rg.addColorStop(1,'#241b17');g.fillStyle=rg;g.fill();g.strokeStyle='rgba(255,170,90,'+(.5+.4*(r.hot||1))+')';g.lineWidth=Math.max(1.5,r.r*.12);g.stroke();
  g.strokeStyle='rgba(20,12,8,.7)';g.lineWidth=1;for(let k=0;k<3;k++){g.beginPath();g.arc(Math.cos(k*2.1)*r.r*.4,Math.sin(k*2.1)*r.r*.4,r.r*.2,0,TAU);g.stroke()}g.restore();
  if(Math.random()<.5)parts.push({x:r.x-ux*r.r+rnd(-4,4),y:r.y-uy*r.r+rnd(-4,4),vx:-ux*rnd(20,80)+rnd(-30,30),vy:-uy*rnd(20,80)+rnd(-30,30),life:rnd(.3,.7),max:.7,c:Math.random()<.5?'#ffb36b':'#ff6a30'})}
 if(E&&E.k==='tr'&&vis(E.x,E.y,200)){drawS(E.x,E.y,E.a,'mer','#ffd166',1.5,{h:1,th:.35});g.strokeStyle='rgba(255,209,102,.35)';g.lineWidth=1.5;g.setLineDash([8,10]);g.beginPath();g.arc(E.x,E.y,330,0,TAU);g.stroke();g.setLineDash([])}
 if(E&&E.k==='cr'&&vis(E.x,E.y,200)){g.save();g.translate(E.x,E.y);g.rotate(time);g.fillStyle='#0e1c2c';g.strokeStyle='#7dff9b';g.lineWidth=2;g.fillRect(-9,-9,18,18);g.strokeRect(-9,-9,18,18);g.restore();g.strokeStyle='rgba(125,255,155,'+(.2+.2*Math.sin(time*4))+')';g.beginPath();g.arc(E.x,E.y,110,0,TAU);g.stroke()}}
$('gvP').addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(b)gevAct(b.dataset.a)});
/* ----- Evento de rescate ----- */
function evInit(p){QZ.ev={id:p.id,v:p.v,x:p.x,y:p.y,hp:p.hp,max:p.hp,parts:Object.assign({},p.pa),mat:p.mat,wv:p.wv.slice(),tier:p.tier,dm:p.dm,ph:'wait',w:0,sp:0,wt:0,rq:[],arr:0,ab:0,pz:0}}
function evClear(col){const E=QZ.ev;if(E)boom(E.x,E.y,24,col);npcs=npcs.filter(n=>!n.evs&&!n.evp);QZ.ev=null}
function evFail(m){const E=QZ.ev;if(!E||E.ph==='fail'||E.ph==='ok')return;E.ph='fail';toast('✖ '+m);npcs=npcs.filter(n=>!n.evs&&!n.evp)}
function evShipLost(){if(QZ.ev&&QZ.ev.ph==='rep')evFail('Tu nave fue destruida durante el rescate')}
function evSpawn(E,n){for(let i=0;i<Math.min(n,4);i++){let p=null;for(let t=0;t<14&&!p;t++){const a=rnd(0,TAU),r=rnd(950,1250),x=E.x+Math.cos(a)*r,y=E.y+Math.sin(a)*r;if(dist({x,y},ship)>650&&!asts.some(q=>Math.hypot(q.x-x,q.y-y)<q.r+60)&&!BASES.some(b=>Math.hypot(b.x-x,b.y-y)<b.r+200))p={x,y}}
  if(!p){const a=rnd(0,TAU);p={x:E.x+Math.cos(a)*1100,y:E.y+Math.sin(a)*1100}}
  const e=mk('e',p.x,p.y,{x:E.x,y:E.y});e.hp=e.max=Math.round(40*(1+.55*E.tier));e.dm=E.dm;e.evp=1;npcs.push(e)}}
function evUpd(dt){const E=QZ.ev;if(!E)return;if(!EVA()){evClear(E.ph==='ok'?'#7dff9b':'#ffb347');return}
 let en=npcs.find(n=>n.evs);
 if(!en&&E.ph!=='fail'&&E.ph!=='ok'){en={team:'r',evs:1,x:E.x,y:E.y,vx:0,vy:0,a:rnd(0,TAU),hp:E.hp,max:E.max,cd:0,rad:26,home:{x:E.x,y:E.y}};npcs.push(en)}
 if(en)E.hp=en.hp;
 if(E.ph==='fail'||E.ph==='ok')return;
 const d=dist(ship,E),near=!ship.docked&&ship.dead<=0&&d<340;
 if(!E.arr&&d<420&&!ship.docked){E.arr=1;toast('Has llegado a la nave averiada: usa el panel para reparar')}
 E.pz=0;if(E.rq.length){if(near){E.rq=stepRep(E.rq,k=>E.parts[k],(k,v)=>{E.parts[k]=v},()=>100,dt,j=>toast('✔ '+NM[j.k]+' de '+RESC[E.v].n+': reparado'));if(!ship.beam)ship.beam={x:E.x,y:E.y,c:'#c792ff'}}else E.pz=1}
 if(E.hp<=0){evFail('La nave rescatada ha sido destruida');return}
 if(E.hp<E.max*.3&&!E.cr){E.cr=1;toast('⚠ Daños críticos en la nave rescatada')}
 if(E.ph==='rep'){
  if(d>3200||ship.docked){E.ab+=dt;if(E.ab>.3&&!E.aw){E.aw=1;toast('⚠ Vuelve junto a la nave o la perderás')}if(E.ab>15){evFail('Has abandonado la zona del rescate');return}}else{E.ab=0;E.aw=0}
  let al=npcs.filter(n=>n.evp&&n.hp>0);for(const n of al)if(n.fled){n.hp=0;boom(n.x,n.y,10,'#9aa')}al=al.filter(n=>n.hp>0);
  if(E.w<E.wv.length){if(!al.length){if(E.sp){E.sp=0;E.w++;E.wt=time+8;toast('Oleada superada')}else if(time>=E.wt){evSpawn(E,E.wv[E.w]);E.sp=1;toast('⚠ Naves hostiles atacan la zona ('+Math.min(E.wv[E.w],4)+')')}}}
  else if(!al.length&&Object.keys(E.parts).every(k=>E.parts[k]>=99.5)){E.ph='ok';toast('✔ Rescate completado: la nave vuelve a operar')}}}
function evStart(k){const E=QZ.ev;if(!EVA()||!E||E.ph==='ok'||E.ph==='fail')return;if(ship.docked||dist(ship,E)>400)return toast('Acércate a la nave para repararla');const v=E.parts[k];if(v==null||v>=99.5)return;if(E.rq.some(j=>j.k===k))return toast('Ya hay una reparación en curso en ese sistema');
 const c=evCost(k,v,E.mat);if((ship.scrap|0)<c)return toast('Falta chatarra: necesitas '+c+' y tienes '+(ship.scrap|0));ship.scrap-=c;E.rq.push({k,t:0,tot:repTime(k,v,100),v0:v});
 if(E.ph==='wait'){E.ph='rep';E.wt=time+4;toast('⚠ Se detectan naves hostiles acercándose: protege la operación')}toast('Reparación iniciada: '+NM[k]+' (~'+repTime(k,v,100)+' s)');saveGame()}
function evUI(){const el=$('evP');if(!el)return;const E=QZ.ev,show=EVA()&&E&&(E.ph==='wait'||E.ph==='rep')&&state==='play'&&!ship.docked&&dist(ship,E)<560;
 el.classList.toggle('hide',!show);if(!show){el._h='';return}
 const c=RESC[E.v],have=ship.scrap|0,rows=Object.keys(E.parts).map(k=>{const v=E.parts[k],j=E.rq.find(q=>q.k===k);let st;
  if(v>=99.5)st='<span style="color:#7dff9b">✔ Operativo</span>';
  else if(j)st=`<span style="color:#c792ff">${E.pz?'⏸ fuera de alcance · ':'⚙ '}${Math.round(j.t/j.tot*100)}%</span>`;
  else{const cs=evCost(k,v,E.mat);st=`<button class="sq" data-k="${k}" style="position:static;padding:6px 10px;font-size:10px;${have<cs?'opacity:.5':''}">Reparar · ${cs} ⚙ · ${repTime(k,v,100)} s</button>`}
  return `<div class=evr><span class=evn>${NM[k]}</span><i><b style="width:${Math.round(v)}%;background:${v>=80?'#7dff9b':v>=40?'#ff9a4f':'#ff4d4d'}"></b></i><span class=evs>${st}</span></div>`}).join('');
 const al=npcs.filter(n=>n.evp&&n.hp>0).length,h=`<div class=evh>RESCATE · ${c.n}</div><div class=evd>Casco ${Math.max(0,Math.round(E.hp))}/${E.max}${E.hp<E.max*.3?' · <b style="color:#ff4d4d">CRÍTICO</b>':''} · Chatarra: ${have}</div>${rows}<div class=evd>${E.ph==='rep'?'Oleada '+Math.min(E.w+(E.sp?1:0),E.wv.length)+'/'+E.wv.length+' · hostiles: '+al:'Al empezar la primera reparación llegarán atacantes.'}</div>`;
 if(el._h!==h){el._h=h;el.innerHTML=h}}
function evHud(){if(!EVA()||state!=='play')return;const E=QZ.ev;if(E.ph==='ok'||E.ph==='fail')return;const c=RESC[E.v],x=W/2,y=Math.max(86,72+SAFE.t),w=150;
 txt('RESCATE · '+c.n.toUpperCase(),x,y,'#c792ff','center',12);g.fillStyle='rgba(10,20,35,.75)';g.fillRect(x-w/2,y+6,w,8);g.fillStyle=E.hp<E.max*.3?'#ff4d4d':'#7dff9b';g.fillRect(x-w/2,y+6,w*clamp(E.hp/E.max,0,1),8);g.strokeStyle='rgba(120,200,255,.4)';g.lineWidth=1;g.strokeRect(x-w/2,y+6,w,8);
 const al=npcs.filter(n=>n.evp&&n.hp>0).length;txt(E.ph==='rep'?'Oleada '+Math.min(E.w+(E.sp?1:0),E.wv.length)+'/'+E.wv.length+' · hostiles '+al:'Repara los sistemas para empezar',x,y+28,'#cfe8ff','center',11);
 if(E.pz)txt('⏸ Reparación en pausa: acércate a la nave',x,y+42,'#ffd166','center',11);else if(E.ab>.3)txt('⚠ Vuelve a la nave: '+Math.ceil(15-E.ab)+' s',x,y+42,'#ff6b6b','center',11)}
function drawEv(){const E=QZ.ev,en=E&&npcs.find(n=>n.evs);if(!en||!vis(E.x,E.y,200))return;const dm=Object.values(E.parts).some(v=>v<99.5);
 drawS(E.x,E.y,en.a,'t',dm?'#c792ff':'#7dff9b',1.6,dm?DEAD:{h:E.hp/E.max,th:.3});
 if(EVA()&&E.ph!=='ok'&&E.ph!=='fail'){g.strokeStyle='rgba(199,146,255,.35)';g.lineWidth=1.5;g.setLineDash([8,10]);g.beginPath();g.arc(E.x,E.y,340,0,TAU);g.stroke();g.setLineDash([])}
 if(dm&&Math.sin(time*6)>0){g.fillStyle='#ffb347';g.fillRect(E.x-3,E.y-3,6,6)}
 g.fillStyle='rgba(10,20,35,.75)';g.fillRect(E.x-30,E.y-44,60,5);g.fillStyle=E.hp<E.max*.3?'#ff4d4d':'#7dff9b';g.fillRect(E.x-30,E.y-44,60*clamp(E.hp/E.max,0,1),5)}
