/* ============================================================================
   core/update.js — Actualización del mundo y de la nave en cada fotograma (worldUpd, upd).
   (Trozo de la antigua pieza única de index.html. Se carga como script clásico en orden:
   comparte el ámbito global con el resto de js/. NO cambies el orden de carga en index.html.)
   ========================================================================== */
"use strict";
function worldUpd(dt){if(mpSlave()){spawnT=3;cmT=1e9;GEV.t=1e9}RGH(r=>r.update(dt));if(typeof impUpd==='function')try{impUpd(dt)}catch(e){console.warn('[implosión]',e)}
  evUpd(dt);miniEv(dt);gevTick(dt);derel=derel.filter(d=>!d.dead);
  if(state!=='menu'){if(!BAL.comet.on())cmT=Math.max(cmT,BAL.comet.first);else{cmT-=dt;if(cmT<=0){cmT=rnd(BAL.comet.cd[0],BAL.comet.cd[1]);mpAt(spawnComet)}}}
  for(const c of cmts){c.x+=c.vx*dt;c.y+=c.vy*dt;c.age+=dt;c.rot+=dt*.6;if(c.r0)c.r=c.r0*(.4+.6*Math.sqrt(Math.max(0,c.ore)/c.o0));
    if(dist(c,ship)<2600&&Math.random()<dt*70){const sp=Math.hypot(c.vx,c.vy)||1,an=Math.atan2(c.vy,c.vx)+rnd(-.5,.5);parts.push({x:c.x-c.vx/sp*c.r*.8+rnd(-c.r,c.r)*.4,y:c.y-c.vy/sp*c.r*.8+rnd(-c.r,c.r)*.4,vx:-Math.cos(an)*rnd(20,90),vy:-Math.sin(an)*rnd(20,90),life:rnd(.6,1.6),max:1.6,c:'rgb('+CK[c.k].c+')'})}
    if(!ship.docked&&!shSafe()&&dist(c,ship)<c.r+16&&(ship.cck||0)<time){ship.cck=time+3;comHit(c)}}
  cmts=cmts.filter(c=>!c.dead&&c.age<260&&(c.age<25||mpD(c)<7000));
  if(ship.mc){const c=ship.mc;if(c.dead||!cmts.includes(c)||!on('col')||!eff('min')||ship.docked)ship.mc=null;else if(dist(c,ship)>230)ship.dest={x:c.x,y:c.y,stop:150,auto:1};else{ship.dest=null;{const dx=c.x-ship.x,dy=c.y-ship.y,dd=Math.hypot(dx,dy)||1,pl2=(dd-150)*1.2;ship.vx=c.vx+dx/dd*pl2;ship.vy=c.vy+dy/dd*pl2}const m=Math.min(c.ore,T.mine*2*eff('min')*dt);c.ore-=m;mpMinedC(c.id,m);ship.cm=ship.cm||{};ship.cm[c.k]=(ship.cm[c.k]||0)+m;ship.beam={x:c.x,y:c.y,c:CK[c.k].mc};mineFx(c,CK[c.k].mc,dt,c.r||20);if(c.ore<=.01){c.dead=1;boom(c.x,c.y,10,'#cff');toast('Cometa recolectado')}}}
  // apariciones
  const _sw=MPS.swapBegin(dt);spawnT-=dt;if(spawnT<=0){spawnT=3;const cnt=f=>npcs.filter(n=>n.team==='e'&&f(n)).length;
    if(state!=='menu'&&!ship.docked){const sg=BAL.stage(),S=BAL.st,loose=npcs.filter(n=>n.team==='e'&&!n.boss&&!n.role&&!n.evs&&!n.evp&&!n.gv).length;
      if(dist(ship,B)<4500&&time>=S.bNext&&time-S.lk>BAL.afterKill[sg]*.4&&cnt(n=>dist(n,B)<1500)<BAL.betaCap[sg]*mpM()){const a=rnd(0,TAU),pk=Math.min(packN(dgr(B.x,B.y)),BAL.betaCap[sg]*mpM()+1-cnt(n=>dist(n,B)<1500));for(let i=0;i<Math.max(1,pk);i++)npcs.push(dscale(balE(mk('e',B.x+Math.cos(a)*700+rnd(-110,110)*(i>0),B.y+Math.sin(a)*700+rnd(-110,110)*(i>0),B))));S.bNext=time+rnd(BAL.betaCd[sg][0],BAL.betaCd[sg][1])/mpM()}
      const Ls=dgr(ship.x,ship.y);if(time>=S.next&&time-S.lk>BAL.afterKill[sg]*(1-.08*Ls)&&loose<(BAL.maxE[sg]+Math.floor(Ls*.8))*mpM())for(const F of FIELDS)if(F.ins(ship.x,ship.y,3200)&&cnt(n=>F.ins(n.x,n.y,800))<Math.min(4+Ls,BAL.capBase[sg]+Math.floor(F.tier*BAL.capTier)+Ls)*mpM()){let q=null;for(let i=0;i<10&&!q;i++){const p=F.smp(),d=Math.hypot(p[0]-ship.x,p[1]-ship.y);if(d>=BAL.spawnMin&&d<=BAL.spawnMax&&!BASES.some(b=>Math.hypot(b.x-p[0],b.y-p[1])<BAL.baseSafe))q=p}if(q){const Lq=dgr(q[0],q[1]),pk=packN(Lq);for(let i=0;i<pk;i++)npcs.push(mkE(F,q[0]+(i?rnd(-140,140):0),q[1]+(i?rnd(-140,140):0)));if(pk>1)toast('⚠ Manada pirata de '+pk+' naves detectada');S.next=time+rnd(BAL.cd[sg][0],BAL.cd[sg][1])*(1-.1*Lq)/mpM();break}}}
    if(EVBOSS&&BAL.stage()>=BAL.boss.min&&time>bossT&&!ship.docked&&state==='play'&&!npcs.some(q=>q.boss)){const st=BASES.filter(b=>b.small&&dist(b,ship)<4200);{let px,py;if(st.length&&Math.random()<.5){const S=st[Math.floor(Math.random()*st.length)],a=Math.atan2(ship.y-S.y,ship.x-S.x)+rnd(-.6,.6);px=S.x+Math.cos(a)*1800;py=S.y+Math.sin(a)*1800}else{const a=rnd(0,TAU),d=rnd(3500,5500);px=ship.x+Math.cos(a)*d;py=ship.y+Math.sin(a)*d}/* en cualquier punto del universo, lejos de las bases */
  if(!BASES.every(b=>Math.hypot(b.x-px,b.y-py)>b.r+1200))bossT=time+15;else{bossT=time+rnd(240,420);const bo=mk('e',px,py,{x:px,y:py});Object.assign(bo,{boss:1,hp:450,max:450,rad:34});npcs.push(bo);for(let i=0;i<7;i++){const e=mk('e',px+rnd(-150,150),py+rnd(-150,150),bo);e.role=i<3?'a':i<6?'p':'t';npcs.push(e)}toast('⚠ Evento de jefe: piratas con escolta '+whereIs({x:px,y:py}))}}}
    {/* naves averiadas: zonas con distinta frecuencia (w) y tope (cap); las de espacio profundo aparecen cerca de ti y se renuevan si te alejas */
     for(const d of derel)if(d.z===5&&mpD(d)>12000)d.dead=1;
     const DZ=[[FIELDS[0],.07,2],[FIELDS[1],.045,2],[FIELDS[2],.025,1],[FIELDS[3],.025,1],[FIELDS[4],.012,1],[null,.02,1]];
     DZ.forEach(([F,w,cap],zi)=>{if(derel.filter(d=>d.z===zi&&!d.dead).length>=cap||Math.random()>=w)return;
      let q=null;for(let i=0;i<12&&!q;i++){let p;if(F)p=F.smp();else{const a=rnd(0,TAU),dd=rnd(3500,7000);p=[ship.x+Math.cos(a)*dd,ship.y+Math.sin(a)*dd]}
       if(p&&!BASES.some(b=>Math.hypot(b.x-p[0],b.y-p[1])<b.r+700)&&!derel.some(d=>Math.hypot(d.x-p[0],d.y-p[1])<800))q=p}
      if(q)derel.push({x:q[0],y:q[1],z:zi})})}
    asts=asts.filter(a=>!(a.f&&a.f.ring)||mpD(a)<7000);for(const F of FIELDS){let n=asts.reduce((c,a)=>c+(a.f===F),0);for(let i=0;i<(F.ring?(n?60:F.n0):1)&&n<F.n0;i++,n++){const q=mkAst(F,F.ring?ringPt(F,n?Math.min(VRd*.55+300,5500):0):undefined);if(!q)break;asts.push(q)}}if(Math.random()<.25&&asts.reduce((c,a)=>c+(a.st?1:0),0)<STRAYN){const q=mkStray(1);if(q)asts.push(q)}
    npcs=npcs.filter(n=>n.team==='g'||n.evs||n.gv||((n.boss||n.role)&&mpD(n)<9000)||mpD(n)<4500);loot=loot.filter(l=>mpD(l)<6000);
    if(npcs.filter(n=>n.team==='g'&&!n.om).length<4)npcs.push(mk('g',700+rnd(-200,200),rnd(-300,300),A));
    {const dO=dist(ship,OM),gs=npcs.filter(n=>n.om).length;if(dO<9000&&state!=='menu'&&gs<5)for(let i=gs;i<5;i++){const a=i/5*TAU+rnd(0,.5),e=mk('g',OM.x+Math.cos(a)*(OM.r+330),OM.y+Math.sin(a)*(OM.r+330),OM);e.om=1;e.hp=e.max=260;npcs.push(e)}else if(dO>13000&&gs)npcs=npcs.filter(n=>!n.om);
     if(!QX.card&&dO<OM.r+3800&&time>omW&&!ship.docked){omW=time+25;toast('⚠ Espacio restringido de Base Omega: sin tarjeta de acceso los guardianes abren fuego (cómprala en Estación Umbral)')}}}
  // IA de naves (guardianes, piratas, jefe y escoltas)
  MPS.swapEnd(_sw);const bs=npcs.find(q=>q.boss);
  if(warnT<=0&&!ship.docked&&npcs.some(q=>q.team==='e'&&dist(q,ship)<800)){warnT=15;toast('⚠ Enemigo cerca')}
  if(mpSlave())mpGuestNpcs(dt);else for(const n of npcs){if(n.gv)continue;if(n.evs){n.vx=n.vy=0;continue}let tg=null,td=n.team==='e'?(n.agr||900):1500,d,ax=0,ay=0;
    if(n.team==='e'){for(const o of npcs)if((o.team==='g'||o.team==='r')&&(d=dist(n,o))<td){td=d;tg=o}if(!ship.docked&&!ship.wreck&&!shSafe()&&(d=dist(n,ship))<td){td=d;tg=ship}for(const o of wing)if(o.hp>0&&!o.jp&&(d=dist(n,o))<td){td=d;tg=o}for(const o of mpTargets())if((d=dist(n,o))<td){td=d;tg=o}}
    else{for(const o of npcs)if(o.team==='e'&&(n.om?dist(o,OM)<2800:(dist(o,A)<C.safeR||dist(o,ship)<700))&&(d=dist(n,o))<td){td=d;tg=o}if((n.om?omHostile():wanted)&&!ship.docked&&!ship.wreck&&!shSafe()&&(d=dist(n,ship))<td){td=d;tg=ship}if(n.om)for(const o of mpTargets())if(!o.cd&&dist(o,OM)<OM.r+2600&&(d=dist(n,o))<td){td=d;tg=o}}
    if(n.team==='e'&&!n.boss&&!n.role){const c=n.ch;if(tg)n.ch=tg;else if(c){const gone=(c===ship&&(ship.docked||ship.wreck||ship.dead>0||shSafe()||state==='warp'))||(c!==ship&&(c.hp<=0||c.jp))||dist(n,c)>2400;if(gone)n.ch=null;else{tg=c;td=dist(n,c)}}}
    n.cd-=dt;n.heal=0;if(n.team==='e'){if(n.hp<n.max*.35)n.fled=1;else if(n.hp>=n.max-.01)n.fled=0;if(n.hp<n.max&&time-(n.lh||-99)>20)n.hp=Math.min(n.max,n.hp+n.max*.07*dt)}
    const ro=bs&&!n.boss?n.role:0,fl=n.team==='e'&&n.fled&&(n.boss||!n.role);
    const mv=(x,y,sp)=>{const a=Math.atan2(y-n.y,x-n.x),dd=Math.hypot(x-n.x,y-n.y);n.a+=clamp(angDiff(n.a,a),-1,1)*4*dt;ax=Math.cos(n.a)*sp*Math.min(1,dd/80);ay=Math.sin(n.a)*sp*Math.min(1,dd/80)};
    if(fl&&tg)mv(n.x*2-tg.x,n.y*2-tg.y,n.boss?330:300);
    else if(n.boss){if(tg&&td<900){const a=lead(n,tg);n.a+=clamp(angDiff(n.a,a),-1,1)*2.5*dt;const k=td>520?1:td<380?-.7:0;ax=Math.cos(n.a)*200*k;ay=Math.sin(n.a)*200*k;n.at=(n.at||0)+dt;const ph=Math.floor(n.at/4)%3;
        if(n.cd<=0&&Math.abs(angDiff(n.a,a))<.25&&td<800){if(ph===0){n.cd=1.3;for(let i=-2;i<=2;i++)bullets.push(bl(n,a+i*.14,'e',9))}else if(ph===1){n.cd=.16;bullets.push(bl(n,a+rnd(-.04,.04),'e',7))}else{n.cd=2.2;for(let i=0;i<14;i++)bullets.push(bl(n,i/14*TAU,'e',8))}}}
      else{n.wt=(n.wt||0)-dt;if(!n.wp||n.wt<=0||dist(n,n.wp)<150){n.wp={x:n.home.x+rnd(-1800,1800),y:n.home.y+rnd(-1800,1800)};n.wt=10}mv(n.wp.x,n.wp.y,140)}}
    else if(ro==='p'){const t=tg||ship,a=Math.atan2(t.y-bs.y,t.x-bs.x);mv(bs.x+Math.cos(a)*150,bs.y+Math.sin(a)*150,320);if(tg){const q=lead(n,tg);if(dist(n,tg)<500&&n.cd<=0&&Math.abs(angDiff(n.a,q))<.3){n.cd=1.6;bullets.push(bl(n,q,'e',5))}}}
    else if(ro==='t'){n.oa=(n.oa||0)+.9*dt;mv(bs.x+Math.cos(n.oa)*110,bs.y+Math.sin(n.oa)*110,280);if(dist(n,bs)<220&&bs.hp<bs.max){bs.hp=Math.min(bs.max,bs.hp+9*dt);n.heal=1}}
    else if(tg){const a=lead(n,tg);n.a+=clamp(angDiff(n.a,a),-1,1)*4*dt;const k=td>300?1:td<180?-.5:0;ax=Math.cos(n.a)*280*k;ay=Math.sin(n.a)*280*k;
      if(td<600&&n.cd<=0&&Math.abs(angDiff(n.a,a))<.15){n.cd=n.team==='g'?(n.om?.3:.35):(n.fr||.8);bullets.push(bl(n,a+rnd(-.05,.05),n.team,n.team==='g'?(n.om?16:10):7*(n.dm||1)))}}
    else{const h=n.anc||n.home,a0=Math.atan2(n.y-h.y,n.x-h.x)+.5,r=n.team==='g'?(h.r||0)+330:600,a=Math.atan2(h.y+Math.sin(a0)*r-n.y,h.x+Math.cos(a0)*r-n.x);n.a+=clamp(angDiff(n.a,a),-1,1)*3*dt;ax=Math.cos(n.a)*150;ay=Math.sin(n.a)*150}
    {const o=avoid(n,n.rad||14,null),om=Math.hypot(o[0],o[1]),oc=om>1?1/om:1;ax+=o[0]*oc*380;ay+=o[1]*oc*380}
    {const k=Math.min(1,2.2*dt);if(n.sx==null){n.sx=ax;n.sy=ay}n.sx+=(ax-n.sx)*k;n.sy+=(ay-n.sy)*k;ax=n.sx;ay=n.sy}
    n.vx=(n.vx+ax*dt)*(1-.8*dt);n.vy=(n.vy+ay*dt)*(1-.8*dt);{const vm=Math.hypot(n.vx,n.vy),vc=n.boss?300:n.team==='g'?(n.om?400:340):420;if(vm>vc){n.vx*=vc/vm;n.vy*=vc/vm}}n.x+=n.vx*dt;n.y+=n.vy*dt;for(const a of asts){const dx=n.x-a.x,dy=n.y-a.y,d=Math.hypot(dx,dy),R=a.r+(n.rad||14);if(d<R&&d>0){const nx=dx/d,ny=dy/d,vn=n.vx*nx+n.vy*ny;n.x=a.x+nx*R;n.y=a.y+ny*R;if(vn<0){n.vx-=.8*vn*nx;n.vy-=.8*vn*ny}}}}
  wingUpd(dt);if(MP.role==='host')mpEB();
  // balas
  const hit=(n,b)=>{const r=n.rad||18;if(b.px==null)return Math.hypot(n.x-b.x,n.y-b.y)<r;const sx=b.x-b.px,sy=b.y-b.py,l2=sx*sx+sy*sy;let t=l2>1?((n.x-b.px)*sx+(n.y-b.py)*sy)/l2:1;t=t<0?0:t>1?1:t;return Math.hypot(n.x-(b.px+sx*t),n.y-(b.py+sy*t))<r};
  for(const b of bullets){b.px=b.x;b.py=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;for(const a of asts)if(Math.hypot(a.x-b.x,a.y-b.y)<a.r){b.life=0;boom(b.x,b.y,3,'#99a');break}if(b.life<=0)continue;if((b.own==='p'||b.own==='w')&&!b.sent&&!b.gh&&!b.rb&&MP.role){b.sent=1;b.bk=MP.id+'/'+(++MPS.pbn);MPS.pb.push([Math.round(b.x),Math.round(b.y),Math.round(b.vx),Math.round(b.vy),b.d,+b.life.toFixed(2),b.own==='w'?1:0,b.lz?1:0,MPS.pbn])}if(MP.pvp&&MP.role&&(b.gh||b.rb)&&b.own==='p'&&!ship.dead&&!ship.docked&&!shSafe()&&state!=='hangar'&&hit(ship,b)){b.life=0;mpBh(b);hurt(b.d,'⚔ Otro piloto te dispara',Math.atan2(-b.vy,-b.vx));boom(b.x,b.y,5,'#f96');continue}
    if(MP.pvp&&MP.role&&(b.gh||b.rb)&&b.own==='p'){let hw=0;for(const w of wing)if(w.hp>0&&!w.jp&&Math.hypot(w.x-b.x,w.y-b.y)<18){b.life=0;mpBh(b);const q=Math.min(w.shd||0,b.d);w.shd=(w.shd||0)-q;w.hp-=b.d-q;w.lh=time;boom(b.x,b.y,4,'#f96');hw=1;break}if(hw)continue}
    if(b.gh)continue;
    if(b.own==='e'){if(shSafe()&&!ship.dead&&!ship.docked&&hit(ship,b)){b.life=0;mpBh(b);shHitT=time;shHitA=Math.atan2(b.y-ship.y,b.x-ship.x);boom(b.x,b.y,5,'#6cf')}else if(!ship.dead&&!ship.docked&&!shSafe()&&hit(ship,b)){b.life=0;mpBh(b);hurt(b.d,'⚠ Enemigo atacando: tu nave recibe daño',Math.atan2(-b.vy,-b.vx));if(b.o)b.o.hostile=time;hitInd(b);boom(b.x,b.y,5,'#6cf')}
      else if(wHit(b)){}else for(const n of npcs)if((n.team==='g'||n.team==='r')&&n.hp>0&&hit(n,b)){b.life=0;n.hp-=b.d*(n.team==='r'?.35:1);boom(b.x,b.y,4,'#6cf');break}}
    else if(b.own==='p'&&!b.wg&&gHit(b)){}
    else if(b.own==='g'&&(b.o&&b.o.om?omHostile():wanted)&&!ship.dead&&!ship.docked&&!shSafe()&&hit(ship,b)){b.life=0;mpBh(b);hurt(b.d,b.o&&b.o.om?'⚠ Guardia de Omega: acceso restringido':'⚠ La guardia de Alfa te ataca',Math.atan2(-b.vy,-b.vx));if(ship.wreck&&b.o&&b.o.om)cxFind({cxk:'go'});boom(b.x,b.y,5,'#6cf')}
    else for(const n of npcs)if(n.team==='e'&&n.hp>0&&hit(n,b)){b.life=0;if(mpSlave()||b.gh){boom(b.x,b.y,5,'#f66');break}n.hp-=b.d;n.lh=time;if(b.own==='p'&&!b.by){lastShot=n;lastShotT=time}boom(b.x,b.y,5,'#f66');
      if(n.hp<=0){boom(n.x,n.y,26,'#ff8a5c');for(let i=0;i<(n.boss?14:3);i++)loot.push({x:n.x+rnd(-25,25),y:n.y+rnd(-25,25),v:(n.boss?6:2)+((Math.random()*4)|0),life:120});if(b.own==='p'&&!b.wg){if(b.by)mpKill(b.by,n);else{cxFind(n);ship.cred+=n.boss?250:20;toast(n.boss?'¡Jefe pirata destruido! +250 cr':'Pirata destruido: +20 cr')}}}break}}
  bullets=bullets.filter(b=>b.life>0);for(const n of npcs)if(n.hp<=0&&n.team==='e'&&!n.kc){n.kc=1;qEv('kill');BAL.st.lk=time}npcs=npcs.filter(n=>n.hp>0);}
function upd(dt){hgTick(dt);if(typeof mkTick==='function')try{mkTick(dt);hubSync()}catch(e){console.warn('[centro de base]',e)}if(state!=='menu'){qTick(dt);trlTick(dt);sczTick();if(state==='play'||(MP.role&&(state==='pause'||state==='ship')))shipCol(dt)}
  for(const p of parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt}parts=parts.filter(p=>p.life>0);
  for(const q of sucks){q.px=q.x;q.py=q.y;q.life-=dt;const k=Math.min(1,9*dt);q.x+=(ship.x-q.x)*k;q.y+=(ship.y-q.y)*k;if(dist(q,ship)<14)q.life=0}sucks=sucks.filter(q=>q.life>0);
  if(wanted&&time>wantT){wanted=0;toast('La guardia de Alfa ya no te persigue')}
  if(ship.dead>0){if(ship.wreck){reveal();wreckTick(dt);worldUpd(dt);return}ship.dead-=dt;if(ship.dead<=0){Object.assign(ship,{x:700,y:0,vx:0,vy:0,ore:0,inv:{},scrap:0,cred:Math.floor(ship.cred*.65),hull:T.hull,shd:T.shd,dest:null,docked:A,dead:0,parts:fp()});wanted=0;rq=[];evShipLost();cam.x=700;cam.y=0;setState('hangar');toast('Nave destruida: pierdes la carga y el 20% de créditos')}return}
  if(ship.glT>0){ship.glT-=dt;if(ship.glT<=0&&!ship.dest)ship.brake=1}if(zRet){zRet.t+=dt;const k=clamp(zRet.t/3.2,0,1),e=k*k*(3-2*k);zoom=zRet.zs+(zRet.z0-zRet.zs)*e;if(k>=1)zRet=null}
  ship.en=Math.min(100,ship.en+T.regen*.12*dt);ship.hit-=dt;if(T.shr&&ship.hit<=0&&ship.shd<T.shd)ship.shd=Math.min(T.shd,ship.shd+T.shr*dt);ship.cool-=dt;tickRep(dt);reveal();msgT-=dt;warnT-=dt;
  if(hold&&mouse)ship.dest={x:w2x(mouse.x),y:w2y(mouse.y)};
  if(ship.orbit&&ship.lock){const om=clamp(T.spd*(on('def')?.8:1)*.6*Math.min(1,ship.thr||1)/280,.1,1.1);ship.oa=(ship.oa||0)+om*dt;ship.dest={x:ship.lock.x+Math.cos(ship.oa)*280,y:ship.lock.y+Math.sin(ship.oa)*280,auto:1}}
  // auto-recolección
  if(ship.mt&&(ship.mt.dead||ship.mt.ore<=.01||ship.ore>=T.cargo||!on('col')||!eff('min')))ship.mt=null;if(ship.mt&&!ship.dest&&!ship.docked&&dist(ship.mt,ship)>230)ship.dest={x:ship.mt.x,y:ship.mt.y,stop:170,auto:1};
  // piloto automático
  const mxB=T.spd*(on('def')?.8:1)*(ship.inB?.4:1)*(.25+.75*(eff('eng')+eff('eg2'))/2),acL=T.spd*(T.acc||1)*(.3+.7*stab())*.55*(ship.thr>1?1+(T.afb||0):1);
  let acE=acL;if(T.sh==='e'){const r=Math.hypot(ship.vx,ship.vy)/Math.max(1,mxB);if(r>1)acE=acL*(1-EHT.ramp*clamp((r-1)/(tmx()-1),0,1))}
  let tvx=0,tvy=0,thrF=0,faceA=null;ship.thr=Math.min(ship.thr||1,tmx());
  if(ship.en<1&&ship.thr>1&&!CFG.ie){ship.thr=1;thrUI();toast('Sin energía: velocidad limitada al máximo')}
  if(ship.dest&&!(ship.ehR>0)){const dx=ship.dest.x-ship.x,dy=ship.dest.y-ship.y,d=Math.hypot(dx,dy),st=ship.dest.stop||30;
    if(d<=st){ship.dest=null;ship.brake=1}
    else{const cap=mxB*ship.thr,sp=Math.min(cap,Math.sqrt(2*acL*1.1*Math.max(0,d-st))*.85*(ship.thr>1?.86:1)+12);tvx=dx/d*sp;tvy=dy/d*sp;
      if(!hold){const o=avoid(ship,16,ship.mt);tvx+=o[0]*mxB;tvy+=o[1]*mxB;const tl=Math.hypot(tvx,tvy);if(tl>cap){tvx*=cap/tl;tvy*=cap/tl}}
      ship.brake=0;thrF=1;faceA=Math.atan2(tvy,tvx)}}
  if(!ship.dest&&ship.brake){tvx=tvy=0;thrF=1;if(Math.hypot(ship.vx,ship.vy)<8){ship.vx=ship.vy=0;ship.brake=0;thrF=0}}
  ship.ovd=0;
  if(thrF){const ex=tvx-ship.vx,ey=tvy-ship.vy,dl=Math.hypot(ex,ey),stp=(ship.brake?acL*1.4:(Math.hypot(tvx,tvy)<Math.hypot(ship.vx,ship.vy)-2?Math.max(acE,acL):acE))*dt;if(dl>stp){ship.vx+=ex/dl*stp;ship.vy+=ey/dl*stp}else{ship.vx=tvx;ship.vy=tvy}
    const spd=Math.hypot(ship.vx,ship.vy);if(spd>mxB*1.01&&ship.dest&&!CFG.ie){ship.ovd=1;ship.en=Math.max(0,ship.en-1.6*clamp((spd/mxB-1)/.5,0,(tmx()-1)/.5)*(T.ovc||1)*(T.sh==='e'?.45:1)*dt)}}
  engHeat(dt,mxB);{const fa=(faceA!=null&&!ship.brake)?faceA:(Math.hypot(ship.vx,ship.vy)>20?Math.atan2(ship.vy,ship.vx):null);if(fa!=null)ship.a+=clamp(angDiff(ship.a,fa),-1,1)*6*(T.man||1)*(.3+.7*stab())*dt}
  {const st=stab();if(st<1&&!ship.docked&&Math.hypot(ship.vx,ship.vy)>20){const b=(eff('eng')-eff('eg2'))*.5*dt,c=Math.cos(b),sn=Math.sin(b),vx=ship.vx;ship.vx=vx*c-ship.vy*sn;ship.vy=vx*sn+ship.vy*c;const w=(1-st)*110*Math.sin(time*2.7+1.3)*dt;ship.vx-=Math.sin(ship.a)*w;ship.vy+=Math.cos(ship.a)*w}}
  if(ship.docked){const f=Math.max(0,1-5*dt);ship.vx*=f;ship.vy*=f}
  {const vm=Math.hypot(ship.vx,ship.vy),vc=mxB*(T.sh==='e'?tmx():1.6)+60;if(vm>vc&&!CFG.ie){const f=Math.max(vc/vm,1-1.5*dt);ship.vx*=f;ship.vy*=f}}
  ship.x+=ship.vx*dt;ship.y+=ship.vy*dt;if(state==='play')qEv('dst',Math.hypot(ship.vx,ship.vy)*dt);
  if(!ship.docked&&!shSafe())for(const a of asts){const dx=ship.x-a.x,dy=ship.y-a.y,d=Math.hypot(dx,dy),Rr=a.r+16;
    if(d<Rr&&d>0){const nx=dx/d,ny=dy/d,vn=ship.vx*nx+ship.vy*ny;ship.x=a.x+nx*Rr;ship.y=a.y+ny*Rr;
      if(vn<0){ship.vx-=1.5*vn*nx;ship.vy-=1.5*vn*ny;if(ship.cool<=0&&-vn>50){ship.cool=.6;ship.dest=null;hurt(-vn*.08,'⚠ Choque con asteroide: la nave recibe daño',Math.atan2(-ny,-nx));boom(ship.x-nx*16,ship.y-ny*16,8,'#ffb347')}}}}
  ship.inB=ship.inA;ship.inA=0;for(const o of ANOM){o.cd=Math.max(0,(o.cd||0)-dt);const d=dist(ship,o);if(d<2000){if(!o.found&&MP.role)mpBc('af',{i:ANOM.indexOf(o)});o.found=1}if(o.t!=='w'){const q=d<o.r0*3?o.r0*1.8:o.r0;o.r+=(q-o.r)*Math.min(1,.8*dt)}
    if(d<o.r&&!ship.docked&&!shSafe()){if(!o.in){o.in=1;if(o.t==='e')toast('Nube de energía: salto recargándose');else if(o.t==='i')toast('¡Campo de iones! Escudo drenándose')}
      if(o.t!=='w'){ship.inA=1;const k=o.t==='i'?260:150,px=(o.x-ship.x)/Math.max(d,1),py=(o.y-ship.y)/Math.max(d,1);ship.vx+=px*k*dt;ship.vy+=py*k*dt}if(o.t==='e')ship.en=Math.min(100,ship.en+22*dt);
      else if(o.t==='i'){if(ship.shd>0)ship.shd=Math.max(0,ship.shd-14*dt);else hurt(3*dt)}
      else if(o.t==='w'&&!o.cd&&d<110){o.cd=120;const n=8+((Math.random()*7)|0);ship.scrap+=n;qEv('scrap',n);ship.cred+=30;toast('Pecio saqueado: +'+n+' chatarra, +30 cr')}}
    else o.in=0}
  for(const l of loot){l.life-=dt;const d=Math.max(1,dist(l,ship));if(d<170&&!ship.docked){l.x+=(ship.x-l.x)/d*260*dt;l.y+=(ship.y-l.y)/d*260*dt;if(Math.random()<dt*30)parts.push({x:l.x,y:l.y,vx:0,vy:0,life:.3,max:.3,c:'#8fd6c8'})}if(d<30&&!ship.docked){l.life=0;if(l.id&&MP.role){MPS.lp.push(l.id);MPS.pk.add(l.id)}ship.scrap+=l.v;qEv('scrap',l.v);toast('+'+l.v+' chatarra');for(let i=0;i<8;i++){const a=rnd(0,TAU);parts.push({x:ship.x,y:ship.y,vx:Math.cos(a)*90,vy:Math.sin(a)*90,life:.4,max:.4,c:'#8fd6c8'})}}}
  loot=loot.filter(l=>l.life>0);
  // atraque automático
  let near=null;for(const b of BASES)if(dist(ship,b)<b.r+170&&!(b===OM&&!QX.card))near=b;
  if(near&&!ship.dest&&Math.hypot(ship.vx,ship.vy)<60){if(ship.docked!==near)dockAt(near)}else if(!near||ship.dest)ship.docked=null;
  $('bHan').classList.toggle('hide',!ship.docked||state!=='play');
  // torreta automática
  ship.cd-=dt;let tg=null,td=560;for(const n of npcs)if(n.team==='e'||(n.boss&&n.evs&&n.hp>0)){const d=dist(n,ship);if(d<td){td=d;tg=n}}
  if(ship.lock&&(ship.lock.hp<=0||!npcs.includes(ship.lock)||dist(ship.lock,ship)>1500))ship.lock=ship.orbit=null;if(ship.lock&&dist(ship.lock,ship)<700)tg=ship.lock;
  if(T.sh==='e'&&T.wp==='laser')T.wp='cannon';LZ=T.wp==='laser'&&WOWN.laser;ship.heat=Math.max(0,(ship.heat||0)-30*dt);if(ship.ovh&&ship.heat<=25)ship.ovh=0;
  const mf=fireOn||fireTouch,aA=!mf&&tg&&T.md.includes('atk')&&!!mode.atk&&(ship.en>=1||CFG.ie);if(!mf&&tg&&T.md.includes('atk')&&mode.atk&&ship.en<1&&!CFG.ie&&warnT<=0){warnT=6;toast('Sin energía: el modo Ataque se pausa')}
  if((mf||aA)&&eff('wpn')){if(ship.cd<=0&&!ship.ovh){ship.cd=(LZ?.07:T.rate)/eff('wpn');if(aA&&!CFG.ie)ship.en=Math.max(0,ship.en-.5*ship.cd);const ls=LZ?3200:900,a=aA?lead(ship,tg,ls):fireTouch&&!fireOn?(tg?lead(ship,tg,ls):ship.a):(mouse?Math.atan2(w2y(mouse.y)-ship.y,w2x(mouse.x)-ship.x):ship.a);const aa=a+(LZ?rnd(-.004,.004):rnd(-.02,.02)),q=bl(ship,aa,'p',(LZ?T.dmg*1.6:T.dmg)*(Math.random()<crtV()?2:1));if(LZ){q.vx=(ship.vx||0)+Math.cos(aa)*3200;q.vy=(ship.vy||0)+Math.sin(aa)*3200;q.life=.45;q.lz=1;ship.heat+=4.5;if(ship.heat>=100){ship.ovh=1;toast('⚠ Láser sobrecalentado')}}bullets.push(q);qEv('shot')}}
  else if(tg&&ship.cd<=0&&on('def')&&eff('wpn')){ship.cd=T.rate*2.6/eff('wpn');bullets.push(bl(ship,lead(ship,tg)+rnd(-.03,.03),'p',T.dmg*.6))}
  // minado
  ship.beam=null;
  if(!ship.docked&&ship.ore<T.cargo&&on('col')&&eff('min')){if(ship.mt&&!canMine(ship.mt))ship.mt=null;let b=ship.mt&&dist(ship.mt,ship)<260?ship.mt:null;
    if(b){const m=Math.min(b.ore,T.mine*2*eff('min')*dt,T.cargo-ship.ore);b.ore-=m;ship.ore+=m;ship.inv[b.m]=(ship.inv[b.m]||0)+m;mpMined(b.id,m);qEv('ore',b.m,m);ship.beam={x:b.x,y:b.y,c:'#ffd166'};mineFx(b,MIN[b.m]?MIN[b.m][1]:'#ffd166',dt,b.r);if(b.ore<=.01){b.dead=1;boom(b.x,b.y,16,'#99a');if(!mpSlave())for(let i=0;i<2;i++)loot.push({x:b.x+rnd(-20,20),y:b.y+rnd(-20,20),v:1+((Math.random()*3)|0),life:120})}}}
  else if(ship.ore>=T.cargo-.01&&!ship.full){ship.full=1;toast('Bodega llena: vuelve a una base')}
  if(ship.ore<T.cargo-1)ship.full=0;
  asts=asts.filter(a=>!a.dead);
  ship.fixing=0;
  if(T.rep&&on('rep')&&!ship.docked&&Math.hypot(ship.vx,ship.vy)<50){let wk=null,wr=1;for(const q of PR){const r=gv(q[0])/gm(q[0]);if(r<wr){wr=r;wk=q[0]}}
    if(wk){const m=gm(wk);sv(wk,Math.min(m,gv(wk)+m*.008*(T.tal||1)*dt));ship.fixing=1}}
  // rescate de naves averiadas (solo Técnico)
  let dv=null;if(!ship.docked)for(const d of derel)if(dist(d,ship)<240)dv=d;
  if(dv&&T.rep&&on('rep')){ship.rep+=dt*(T.tal||1)/3;ship.beam={x:dv.x,y:dv.y,c:'#c792ff'};if(ship.rep>=1){ship.rep=0;dv.dead=1;if(dv.id&&MP.role){mpBc('dr',{id:dv.id});MPS.dd.add(dv.id)}qEv('rescue');recruit()}}
  else{ship.rep=0;if(dv&&!ship.warned){ship.warned=1;toast('Nave averiada: necesitas un TÉCNICO')}if(!dv)ship.warned=0}
  worldUpd(dt);
  cam.x+=(ship.x-cam.x)*Math.min(1,6*dt);cam.y+=(ship.y-cam.y)*Math.min(1,6*dt);
  {const mx=Math.min(W,H)*.16/zoom,dx=ship.x-cam.x,dy=ship.y-cam.y,d=Math.hypot(dx,dy);if(d>mx){cam.x=ship.x-dx/d*mx;cam.y=ship.y-dy/d*mx}} /* la cámara se retrasa un poco a gran velocidad, sin dejar que la nave salga de la pantalla */}

