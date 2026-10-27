/* ============================================================================
   core/render.js — Dibujado: mundo, mapa, minimapa, HUD, modelos de naves y enemigos, sonido y efectos.
   (Trozo de la antigua pieza única de index.html. Se carga como script clásico en orden:
   comparte el ámbito global con el resto de js/. NO cambies el orden de carga en index.html.)
   ========================================================================== */
"use strict";
/* ===== RENDER ===== */
const layers=[.15,.35,.65].map((f,i)=>({f,s:Array.from({length:60+i*40},()=>({x:Math.random()*900,y:Math.random()*900,r:rnd(.4,1.4)+i*.4}))}));
function stars(){const P=900;for(const L of layers){g.fillStyle=`rgba(200,225,255,${.3+L.f*.6})`;
  const ox=-((cam.x*L.f)%P+P)%P,oy=-((cam.y*L.f)%P+P)%P;
  for(let tx=ox-P;tx<W+P;tx+=P)for(let ty=oy-P;ty<H+P;ty+=P)for(const s of L.s){const x=tx+s.x,y=ty+s.y;if(x>-2&&x<W+2&&y>-2&&y<H+2)g.fillRect(x,y,s.r,s.r)}}}
const poly=p=>{g.beginPath();p.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.closePath()};
function drawS(x,y,a,sh,col,sc){g.save();g.translate(x,y);g.rotate(a);g.scale(sc,sc);poly(SH[sh]);g.fillStyle='#0e1c2c';g.fill();g.strokeStyle=col;g.lineWidth=2/sc;g.stroke();g.restore()}
function brk(x,y,s,c){g.strokeStyle=c;g.lineWidth=2;g.setLineDash([]);const l=s*.45;for(const[a,b]of[[-1,-1],[1,-1],[1,1],[-1,1]]){g.beginPath();g.moveTo(x+a*s,y+b*s-b*l);g.lineTo(x+a*s,y+b*s);g.lineTo(x+a*s-a*l,y+b*s);g.stroke()}}
const txt=(t,x,y,c,al='left',f=12)=>{g.fillStyle=c;g.textAlign=al;g.font=f+'px ui-monospace,Menlo,monospace';g.fillText(t,x,y)};

function drawHangar(){cam.x=time*40;cam.y=0;g.fillStyle='#05070d';g.fillRect(0,0,W,H);stars();
  const hh=Math.max(110,H-250),cx=W/2,cy=hh/2+30,sc=Math.min(6,hh/42,W/90);
  g.strokeStyle='rgba(79,209,255,.12)';g.lineWidth=1;for(let i=-6;i<=6;i++){g.beginPath();g.moveTo(cx+i*40,cy+sc*20);g.lineTo(cx+i*160,H);g.stroke()}
  brk(cx,cy,sc*24,T.col);drawS(cx,cy,-Math.PI/2+Math.sin(time*.8)*.12,T.sh,T.col,sc,{...pst(),th:.15});
  txt('CRÉDITOS '+ship.cred,16,42,'#cfe8ff');
  txt(T.n.toUpperCase()+' — '+T.r,W/2,cy-sc*26-8,T.col,'center',14)}

function warpFx(back){const w=warp,t=w.t,c=Math.cos(w.h),n=Math.sin(w.h);
  if(t<w.t1){if(back)return;const k=t/w.t1,e=k*k*(3-2*k),X=ship.x,Y=ship.y;g.save();g.globalCompositeOperation='lighter';
    /* haz guía hacia el destino: crece y se afila */
    {const Lg=120+900*e,gr=g.createLinearGradient(X,Y,X+c*Lg,Y+n*Lg);gr.addColorStop(0,'rgba(170,235,255,'+(.15+.45*e)+')');gr.addColorStop(1,'rgba(170,235,255,0)');g.fillStyle=gr;g.beginPath();g.moveTo(X-n*(1+3*e),Y+c*(1+3*e));g.lineTo(X+c*Lg,Y+n*Lg);g.lineTo(X+n*(1+3*e),Y-c*(1+3*e));g.closePath();g.fill()}
    /* motores rugiendo: llama hacia atrás que se alarga */
    {const Lb=24+170*e,gr=g.createLinearGradient(X,Y,X-c*Lb,Y-n*Lb);gr.addColorStop(0,'rgba(220,250,255,'+(.3+.6*e)+')');gr.addColorStop(.4,'rgba(120,210,255,'+(.25*e+.1)+')');gr.addColorStop(1,'rgba(120,210,255,0)');g.strokeStyle=gr;g.lineCap='round';g.lineWidth=5+9*e;g.beginPath();g.moveTo(X-c*14,Y-n*14);g.lineTo(X-c*Lb,Y-n*Lb);g.stroke()}
    /* partículas de energía que convergen hacia la nave */
    for(let i=0;i<34;i++){const ph=(time*(.55+.9*e)+i*.6180339)%1,an=i*2.399963,R0=300-250*ph*ph*0+0,r=40+260*(1-ph)*(1-ph),r2=r+10+26*e,al=Math.sin(ph*Math.PI)*(.25+.6*e);
      g.strokeStyle='rgba(150,225,255,'+al+')';g.lineWidth=1.2+1.2*e;g.beginPath();g.moveTo(X+Math.cos(an)*r,Y+Math.sin(an)*r);g.lineTo(X+Math.cos(an)*r2,Y+Math.sin(an)*r2);g.stroke()}
    /* núcleo de luz */
    {const R=30+90*e,gr=g.createRadialGradient(X,Y,0,X,Y,R);gr.addColorStop(0,'rgba(235,252,255,'+(.15+.55*e)+')');gr.addColorStop(.5,'rgba(110,200,255,'+(.12+.2*e)+')');gr.addColorStop(1,'rgba(60,140,255,0)');g.fillStyle=gr;g.fillRect(X-R,Y-R,R*2,R*2)}
    g.restore();
    /* anillo de progreso */
    g.strokeStyle='rgba(125,255,155,.25)';g.lineWidth=2;g.beginPath();g.arc(X,Y,46,0,TAU);g.stroke();
    g.strokeStyle='rgba(215,255,230,.95)';g.lineWidth=3;g.lineCap='round';g.beginPath();g.arc(X,Y,46,-Math.PI/2,-Math.PI/2+TAU*k);g.stroke()}
  else{if(!back)return;const sp=Math.hypot(ship.vx,ship.vy),L=clamp(sp*.22,0,2200),k=clamp(sp/2500,0,1);
    g.save();g.globalCompositeOperation='lighter';g.lineCap='round';{const t2=g.createLinearGradient(ship.x,ship.y,ship.x-c*L,ship.y-n*L);t2.addColorStop(0,'rgba(90,170,255,.35)');t2.addColorStop(1,'rgba(90,170,255,0)');g.strokeStyle=t2;g.lineWidth=22;g.beginPath();g.moveTo(ship.x,ship.y);g.lineTo(ship.x-c*L,ship.y-n*L);g.stroke()}
    const tr=g.createLinearGradient(ship.x,ship.y,ship.x-c*L,ship.y-n*L);tr.addColorStop(0,'rgba(190,240,255,.95)');tr.addColorStop(1,'rgba(160,230,255,0)');
    g.strokeStyle=tr;g.lineWidth=8;g.beginPath();g.moveTo(ship.x,ship.y);g.lineTo(ship.x-c*L,ship.y-n*L);g.stroke();g.restore();
    g.lineWidth=1.5;g.strokeStyle=`rgba(190,235,255,${.55*k})`;
    for(let i=0;i<5;i++){const u=rnd(-1,1)*600,v=rnd(-1,1)*800,px=cam.x-n*u+c*v,py=cam.y+c*u+n*v,len=250+700*k;g.beginPath();g.moveTo(px,py);g.lineTo(px-c*len,py-n*len);g.stroke()}}}
function warpFlash(){const f=Math.max(clamp(1-Math.abs(warp.t-warp.t1)/.12,0,1)*.8,clamp(1-Math.abs(warp.t-warp.te+.05)/.18,0,1)*.7);if(f>0){g.fillStyle=`rgba(235,248,255,${f*.85})`;g.fillRect(0,0,W,H)}
  txt('SALTO HIPERESPACIAL → '+warp.dest.n.toUpperCase(),W/2,36,'#cfe8ff','center',14);if(warp.t<warp.t1)txt('CARGANDO SALTO · '+Math.ceil(warp.t1-warp.t)+' s',W/2,56,'#7dff9b','center',12)}
function drawMap(){const M=mt(),X=x=>M.ox+x*M.s,Y=y=>M.oy+y*M.s;
  g.fillStyle='#030813';g.fillRect(0,0,W,H);
  const cx=cam.x,cy=cam.y;cam.x=time*20;cam.y=0;stars();cam.x=cx;cam.y=cy;
  const neb=(x,y,r,c)=>{const q=g.createRadialGradient(X(x),Y(y),0,X(x),Y(y),r*M.s);q.addColorStop(0,c);q.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=q;g.fillRect(0,0,W,H)};
  neb(4400,-4400,11000,'rgba(50,90,200,.22)');neb(16000,-7000,9000,'rgba(255,120,70,.16)');neb(-12000,9000,11000,'rgba(120,80,200,.14)');neb(8000,22000,10000,'rgba(60,150,170,.12)');
  g.lineWidth=1;g.setLineDash([]);
  const vx0=-M.ox/M.s,vx1=(W-M.ox)/M.s,vy0=-M.oy/M.s,vy1=(H-M.oy)/M.s;
  const zone=(b,r,c)=>{blobPath(X(b.x),Y(b.y),r*M.s,b.x*.0013+b.y*.0007);g.fillStyle=c[0];g.fill();g.strokeStyle=c[1].replace(/[\d.]+\)$/,'.22)');g.lineWidth=1;g.stroke()};
  zone(A,C.safeR,['rgba(79,209,255,.09)','rgba(79,209,255,.5)']);zone(B,1500,['rgba(255,90,70,.09)','rgba(255,110,90,.5)']);FIELDS.forEach(F=>{fPoly(F,X,Y);g.fillStyle='rgba('+F.col+',.1)';g.fill('evenodd');g.strokeStyle='rgba('+F.col+',.4)';g.lineWidth=1;g.stroke()});
  RGH(r=>r.drawMap(X,Y,M));gevDraw(X,Y,M.s,1);
  for(const o of ANOM){const x=X(o.x+o.jx),y=Y(o.y+o.jy);if(o.found||MAPALL){g.beginPath();g.arc(X(o.x),Y(o.y),Math.max(3,o.r0*M.s),0,TAU);g.fillStyle=`rgba(${o.col},.3)`;g.fill();txt(o.n,X(o.x),Y(o.y)-o.r0*M.s-3,`rgba(${o.col},.8)`,'center',8)}else{g.fillStyle='rgba(255,255,255,.6)';g.fillRect(x-2,y-2,4,4);txt('? posible anomalía',x+6,y+3,'rgba(255,255,255,.45)','left',8)}}
  g.fillStyle='rgba(190,200,220,.7)';for(const a of asts){if(a.rg&&(RGH(r=>r.sumA(a.x,a.y,M.s))||0)>=1)continue;g.fillRect(X(a.x)-1,Y(a.y)-1,2,2)}
  for(const c of cmts){const x=X(c.x),y=Y(c.y);g.fillStyle='rgba('+CK[c.k].c+',.95)';g.beginPath();g.arc(x,y,3.5,0,TAU);g.fill();g.strokeStyle='rgba('+CK[c.k].c+',.5)';g.lineWidth=2;g.beginPath();g.moveTo(x,y);g.lineTo(x-c.vx/Math.hypot(c.vx,c.vy)*18,y-c.vy/Math.hypot(c.vx,c.vy)*18);g.stroke();txt('☄ '+CK[c.k].n,x+7,y+3,'rgba('+CK[c.k].c+',.9)','left',9)}
  FIELDS.forEach(F=>{txt(F.n.toUpperCase(),X(F.x),Y(F.ring?-F.r:F.y)+(F.ring?-28:F.r*M.s+14),'rgba('+F.col+',.95)','center',10);txt('⚠ '+F.dng,X(F.x),Y(F.ring?-F.r:F.y)+(F.ring?-16:F.r*M.s+26),'#ff8a70','center',9)});txt('⚠ ZONA DE PELIGRO',X(B.x),Y(B.y)+1500*M.s+14,'#ff8a70','center',10);
  const jf=Math.max(T.jump*(eff('jmp')<1?1.5:1),.01),rg=CFG.ie?1e5:(ship.en/jf-30)*650*C.jr,rm=CFG.ie?0:(100/jf-30)*650*C.jr;
  const jOK=!ship.wreck&&eff('jmp')>0;
  if(jOK&&rm>C.jumpMin){g.setLineDash([8,8]);g.lineWidth=1.5;g.strokeStyle='rgba(255,220,120,.6)';g.beginPath();g.arc(X(ship.x),Y(ship.y),rm*M.s,0,TAU);g.stroke();g.setLineDash([]);txt('ALCANCE MÁXIMO · '+km(rm),X(ship.x),Y(ship.y)-rm*M.s-6,'rgba(255,220,120,.95)','center',10)}
  if(jOK&&rg>C.jumpMin&&rg<rm*.995){g.strokeStyle='rgba(125,255,155,.7)';g.lineWidth=1.5;g.beginPath();g.arc(X(ship.x),Y(ship.y),rg*M.s,0,TAU);g.stroke();txt('ALCANCE ACTUAL · '+km(rg),X(ship.x),Y(ship.y)-rg*M.s-6,'rgba(125,255,155,.95)','center',10)}
  if(!MAPALL)fog(X,Y,M.s,.93);
  const sysA=sysR(0)?clamp((SYSZ1-M.s)/(SYSZ1-SYSZ0),0,1):0;/* 0 = mapa normal · 1 = todo el interior del aro resumido en una zona */
  if(sysA>0){g.save();g.beginPath();for(let i=0;i<=180;i++){const a=i/180*TAU,r=sysR(a),x=X(Math.cos(a)*r),y=Y(Math.sin(a)*r);i?g.lineTo(x,y):g.moveTo(x,y)}g.closePath();g.globalAlpha=sysA;g.fillStyle='#050d1c';g.fill();g.fillStyle='rgba(79,209,255,.13)';g.fill();g.strokeStyle='rgba(120,215,255,.85)';g.lineWidth=2;g.setLineDash([10,6]);g.stroke();g.setLineDash([]);
    txt(SYSN.toUpperCase(),X(0),Y(0)-14,'rgba(190,236,255,.98)','center',20);txt('zona interior · se detalla al acercar el zoom',X(0),Y(0)+8,'rgba(150,210,240,.75)','center',10);g.restore()}
  for(const b of BASES){const ra=b.rg?(RGH(r=>r.sumA(b.x,b.y,M.s))||0):0;if(ra>=1)continue;const ins=sysA>0&&sysIn(b.x,b.y);if(ins&&sysA>=1)continue;g.globalAlpha=ra>0?1-ra:ins?1-sysA:1;const x=X(b.x),y=Y(b.y);g.strokeStyle=b.col;g.fillStyle='#0b1a2a';g.lineWidth=2;
    if(b===A){g.beginPath();g.arc(x,y,8,0,TAU);g.fill();g.stroke();g.beginPath();g.arc(x,y,13,0,TAU);g.globalAlpha=.4;g.stroke();g.globalAlpha=1}
    else if(b.small){g.fillRect(x-4,y-4,8,8);g.strokeRect(x-4,y-4,8,8)}else{g.fillRect(x-7,y-7,14,14);g.strokeRect(x-7,y-7,14,14);g.strokeRect(x-12,y-12,24,24)}
    txt(b.n,x,y-20,b.col,'center',12);txt(b.tag,x,y+28,b.col,'center',9)}g.globalAlpha=1;
  if(sel){g.setLineDash([3,5]);g.strokeStyle='rgba(125,255,155,.7)';g.lineWidth=1.5;g.beginPath();g.moveTo(X(ship.x),Y(ship.y));g.lineTo(X(sel.x),Y(sel.y));g.stroke();g.setLineDash([]);
    brk(X(sel.cx??sel.x),Y(sel.cy??sel.y),16+3*Math.sin(time*5),'#7dff9b')}
  for(const n of npcs){if(n.team!=='e'||n.hp<=0||(sysA>=1&&sysIn(n.x,n.y))||(RGH(r=>r.sumA(n.x,n.y,M.s))||0)>=1)continue;const x=X(n.x),y=Y(n.y);g.fillStyle=n.boss?'#ff9a4f':'#ff4d4d';if(n.boss){g.fillRect(x-5,y-5,10,10);g.strokeStyle='#ff9a4f';g.lineWidth=1.5;g.strokeRect(x-9,y-9,18,18)}else{g.beginPath();g.arc(x,y,3,0,TAU);g.fill()}}
  txt('● Enemigos',16,58,'#ff6b6b','left',10);
  if(!sczDead()&&!(sysA>=1&&sysIn(SCZ.x,SCZ.y))){const x=X(SCZ.x),y=Y(SCZ.y);g.strokeStyle='#d9b86a';g.fillStyle='#2a2418';g.lineWidth=1.5;g.beginPath();g.moveTo(x,y-6);g.lineTo(x+6,y);g.lineTo(x,y+6);g.lineTo(x-6,y);g.closePath();g.fill();g.stroke();txt(SCZ.n,x,y-12,'#d9b86a','center',10);txt('♻ CHATARRA · limitada',x,y+18,'#b99a56','center',9)}
  qMap(X,Y);const sx=X(ship.x),sy=Y(ship.y),gl=g.createRadialGradient(sx,sy,0,sx,sy,20);gl.addColorStop(0,'rgba(255,255,255,.55)');gl.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gl;g.fillRect(sx-20,sy-20,40,40);
  g.save();g.translate(sx,sy);g.rotate(ship.a);g.fillStyle='#fff';poly([[9,0],[-6,-5],[-3,0],[-6,5]]);g.fill();g.restore();
  for(const w of wing)mapAlly2(w,X,Y,1);mpMapDraw(X,Y);for(const r of [...svc,...svr])mapAlly2(r,X,Y,1);
  txt('MAPA ESTELAR',16,24,'#4fd1ff','left',14);txt('Toca un punto para elegir destino',16,42,'rgba(207,232,255,.6)','left',10);
  if(mouse&&!('ontouchstart' in window))brk(mouse.x,mouse.y,12,'rgba(79,209,255,.5)')}

let VX=0,VY=0,VRd=1e9;const vis=(x,y,r=0)=>Math.hypot(x-VX,y-VY)<VRd+r;
function drawWorld(){VX=cam.x;VY=cam.y;VRd=Math.hypot(W,H)/zoom;g.fillStyle='#02040a';g.fillRect(0,0,W,H);stars();g.save();g.translate(VPx||W/2,VPy||H/2);g.rotate(VR);g.scale(zoom,zoom);g.translate(-cam.x,-cam.y);
  for(const b of BASES){if(!vis(b.x,b.y,b.r*2.2))continue;drawBase(b);txt(b.n.toUpperCase(),b.x,b.y-b.r*1.7,b.col,'center',Math.round(15/zoom))}
  drawTrl();RGH(r=>r.rimWorld&&r.rimWorld());drawScz();drawSczOld();if(zoom<.3){const u=1/zoom;for(const b of BASES){g.strokeStyle=b.col;g.lineWidth=2*u;g.beginPath();g.arc(b.x,b.y,10*u,0,TAU);g.stroke();txt(b.n,b.x,b.y-18*u,b.col,'center',12*u)}}
  for(const o of ANOM){if(!vis(o.x,o.y,o.r+200))continue;const pu=.75+.25*Math.sin(time*2+o.x);
    if(o.t==='w'){drawS(o.x,o.y,time*.15,'c','#8a8f99',1.6,DEAD);drawS(o.x+30,o.y-26,2,'t','#666',1,DEAD);g.strokeStyle=`rgba(${o.col},${o.cd?.12:.45*pu})`;g.setLineDash([6,8]);g.beginPath();g.arc(o.x,o.y,110,0,TAU);g.stroke();g.setLineDash([])}
    else{const q=g.createRadialGradient(o.x,o.y,0,o.x,o.y,o.r);q.addColorStop(0,`rgba(${o.col},${.28*pu})`);q.addColorStop(1,`rgba(${o.col},0)`);g.fillStyle=q;g.fillRect(o.x-o.r,o.y-o.r,o.r*2,o.r*2);
      if(o.t==='i'){g.strokeStyle=`rgba(${o.col},.5)`;g.lineWidth=1.5;for(let i=0;i<5;i++){const a=time*1.5+i*1.26+o.y,r=o.r*(.3+.15*i);g.beginPath();g.moveTo(o.x+Math.cos(a)*r,o.y+Math.sin(a)*r);g.lineTo(o.x+Math.cos(a+.4)*(r+40),o.y+Math.sin(a+.4)*(r+40));g.stroke()}}}
    txt(o.n.toUpperCase(),o.x,o.y-(o.t==='w'?125:o.r*.5),`rgba(${o.col},.8)`,'center',10)}
  for(const a of asts)if(vis(a.x,a.y,a.r*1.6+40))drawAst(a);RGH(r=>r.drawWorld());
  for(const c of cmts){if(!vis(c.x,c.y,(c.lg?2400:1000)+c.r*3))continue;const K=CK[c.k],h=Math.atan2(c.vy,c.vx),L=620*(c.lg?2.8:1)*(.5+.5*c.r/(c.r0||c.r)),tr=c.r/2,fl=Math.sin(time*3+c.age)*6;g.save();g.translate(c.x,c.y);g.rotate(h);g.globalCompositeOperation='lighter';
   const tg=g.createLinearGradient(0,0,-L,0);tg.addColorStop(0,'rgba('+K.c+',.6)');tg.addColorStop(1,'rgba('+K.c+',0)');g.fillStyle=tg;g.beginPath();g.moveTo(0,-tr*1.1);g.quadraticCurveTo(-L*.5,-tr*1.2+fl,-L,-tr*2.2+fl*2);g.lineTo(-L*.95,tr*.6);g.quadraticCurveTo(-L*.5,tr*.9-fl,0,tr*1.1);g.fill();
   const ig=g.createLinearGradient(0,0,-L*1.25,0);ig.addColorStop(0,'rgba(190,235,255,.55)');ig.addColorStop(1,'rgba(190,235,255,0)');g.fillStyle=ig;g.beginPath();g.moveTo(0,-tr*.35);g.lineTo(-L*1.25,-tr*.12+fl*.5);g.lineTo(-L*1.25,tr*.12+fl*.5);g.lineTo(0,tr*.35);g.fill();
   const hg=g.createRadialGradient(0,0,0,0,0,tr*3);hg.addColorStop(0,'rgba(255,255,255,.85)');hg.addColorStop(.2,'rgba('+K.c+',.5)');hg.addColorStop(1,'rgba('+K.c+',0)');g.fillStyle=hg;g.beginPath();g.arc(0,0,tr*3,0,TAU);g.fill();g.globalCompositeOperation='source-over';
   g.rotate(c.rot-h);const sh=c.sh||[1,1,1,1,1,1,1,1,1,1],n=sh.length;g.beginPath();for(let i=0;i<n;i++){const a=i/n*TAU,r=c.r*.62*sh[i];i?g.lineTo(Math.cos(a)*r,Math.sin(a)*r):g.moveTo(Math.cos(a)*r,Math.sin(a)*r)}g.closePath();
   const ng=g.createRadialGradient(-c.r*.2,-c.r*.2,1,0,0,c.r*.7);ng.addColorStop(0,'#f3f8ff');ng.addColorStop(1,'#4a566a');g.fillStyle=ng;g.fill();g.strokeStyle='rgba('+K.c+',.9)';g.lineWidth=1.5;g.stroke();
   g.fillStyle='rgba(30,40,60,.45)';for(const[a1,b1,r1]of[[.2,.15,.18],[-.25,.3,.12],[.1,-.3,.1]]){g.beginPath();g.arc(a1*c.r,b1*c.r,r1*c.r,0,TAU);g.fill()}g.restore()}
  drawEv();drawGev();for(const d of derel){if(!vis(d.x,d.y,80))continue;drawS(d.x,d.y,time*.3,'t','#777',1.3,DEAD);if(Math.sin(time*6)>0){g.fillStyle='#ffb347';g.fillRect(d.x-3,d.y-3,6,6)}}
  for(const l of loot){if(!vis(l.x,l.y,20))continue;const s=l.s||(l.s=Math.random()*1000),z=3.5+Math.min(3,(l.v||1)*.35);g.save();g.translate(l.x,l.y);g.rotate(time*1.6+s);g.beginPath();for(let j=0;j<5;j++){const a=j/5*TAU,k=.7+.5*((Math.sin(s*12.9+j*4.1)+1)/2);g[j?'lineTo':'moveTo'](Math.cos(a)*z*k,Math.sin(a)*z*k*.75)}g.closePath();g.fillStyle='#5a6577';g.fill();g.strokeStyle='rgba(190,205,225,.8)';g.lineWidth=1;g.stroke();g.restore();const gk=Math.pow(Math.max(0,Math.sin(time*3+s)),10);if(gk>.05){g.save();g.globalCompositeOperation='lighter';g.strokeStyle='rgba(220,235,255,'+gk*.9+')';g.lineWidth=1;const gl=z*(.6+gk);g.beginPath();g.moveTo(l.x-gl,l.y);g.lineTo(l.x+gl,l.y);g.moveTo(l.x,l.y-gl);g.lineTo(l.x,l.y+gl);g.stroke();g.restore()}}drawFx();
  drawBul();
  for(const w of wing)if(vis(w.x,w.y,150)){if(w.jp)wjDraw(w.x,w.y,w.a,wjCode(w),w.vx,w.vy);if(w.rg){const hq=WRS.get(w);if(hq)mpRope(hq.x,hq.y,w.x,w.y,true)}drawS(w.x,w.y,w.a,w.sh,w.col,.9,{h:w.hp/w.max,th:.5});}for(const r of [...svc,...svr]){if(r.tow&&ship.wreck){const sx=ship.x,sy=ship.y,ex=r.x-Math.cos(r.a)*10,ey=r.y-Math.sin(r.a)*10,dd=Math.hypot(ex-sx,ey-sy),nx=-(ey-sy)/(dd||1),ny=(ex-sx)/(dd||1),tn=r.tn||0;g.save();g.lineCap='round';for(const o of[-1,1]){g.strokeStyle='rgba(255,209,102,'+(.35+.4*tn)+')';g.lineWidth=2.2;g.beginPath();g.moveTo(sx+nx*o*9,sy+ny*o*9);g.lineTo(ex+nx*o*3,ey+ny*o*3);g.stroke()}g.strokeStyle='rgba(255,240,180,'+(.5+.4*Math.sin(time*18))+')';g.lineWidth=1.4;g.setLineDash([6,10]);g.lineDashOffset=-time*140;g.beginPath();g.moveTo(sx,sy);g.lineTo(ex,ey);g.stroke();g.setLineDash([]);g.fillStyle='rgba(255,209,102,.9)';g.beginPath();g.arc(sx,sy,3.5,0,TAU);g.fill();g.beginPath();g.arc(ex,ey,3.5,0,TAU);g.fill();g.restore();if(Math.random()<.4)parts.push({x:r.x-Math.cos(r.a)*14,y:r.y-Math.sin(r.a)*14,vx:-Math.cos(r.a)*60,vy:-Math.sin(r.a)*60,life:.4,max:.4,c:'#ffb347'})}if(vis(r.x,r.y,150))drawS(r.x,r.y,r.a,r.sh,r.col,.9)}
  for(const n of npcs){if(n.evs||!vis(n.x,n.y,150))continue;const e=n.team==='e';drawS(n.x,n.y,n.a,!e?'g':n.boss?'bos':n.role==='p'?'esp':n.role==='t'?'est':n.role==='a'?'esa':'pir',!e?(n.om?'#ff9a4f':'#9fe8ff'):n.boss?'#ff9a4f':n.role==='p'?'#ffd166':n.role==='t'?'#c792ff':'#ff5c5c',n.boss?2.4:n.om?1.05:.85,{h:n.hp/n.max,th:.5});
    if(n.heal){const bo=npcs.find(q=>q.boss);if(bo){g.strokeStyle='#c792ff';g.lineWidth=2;g.beginPath();g.moveTo(n.x,n.y);g.lineTo(bo.x,bo.y);g.stroke()}}
    }
  if(ship.mt)brk(ship.mt.x,ship.mt.y,ship.mt.r+10,'#ffd166');if(ship.cl&&cmts.includes(ship.cl))brk(ship.cl.x,ship.cl.y,ship.cl.r+16+2*Math.sin(time*6),'#a8e6ff');if(mouse&&!('ontouchstart' in window)){const wx=w2x(mouse.x),wy=w2y(mouse.y);for(const o of [...npcs.filter(n=>n.team==='e'),...asts]){const r=(o.rad||o.r||18)+10;if(Math.hypot(o.x-wx,o.y-wy)<r+8){brk(o.x,o.y,r+6,'rgba(255,255,255,.6)');break}}}if(ship.lock)brk(ship.lock.x,ship.lock.y,(ship.lock.rad||18)+14+2*Math.sin(time*6),'#ff6b6b');
  if(ship.beam){g.strokeStyle=ship.beam.c;g.globalAlpha=.5+.4*Math.sin(time*30);g.lineWidth=2;g.beginPath();g.moveTo(ship.x,ship.y);g.lineTo(ship.beam.x,ship.beam.y);g.stroke();g.globalAlpha=1}
  if(fireOn&&mouse&&!ship.dead){g.strokeStyle='rgba(255,120,120,.35)';g.lineWidth=1.5/zoom;g.setLineDash([6/zoom,8/zoom]);g.beginPath();g.moveTo(ship.x,ship.y);g.lineTo(w2x(mouse.x),w2y(mouse.y));g.stroke();g.setLineDash([])}
  if(warp)warpFx(1);if(ship.wreck){drawS(ship.x,ship.y,ship.a,T.sh,'#667',1.1,DEAD);if(Math.sin(time*6)>0){g.fillStyle='#ffb347';g.fillRect(ship.x-3,ship.y-3,6,6)}if(Math.random()<.25)parts.push({x:ship.x+rnd(-10,10),y:ship.y+rnd(-10,10),vx:rnd(-12,12),vy:rnd(-12,12),life:.9,max:.9,c:'#556'})}if(!ship.dead){if(Math.hypot(ship.vx,ship.vy)>40){g.fillStyle='rgba(255,179,71,.8)';g.fillRect(ship.x-Math.cos(ship.a)*16-2,ship.y-Math.sin(ship.a)*16-2,4,4)}fxTrail();drawS(ship.x,ship.y,ship.a,T.sh,heatCol(),1.1,pst());heatGlow()}try{mpDraw()}catch(e){}
  if(ship.dest&&!ship.dest.auto)brk(ship.dest.x,ship.dest.y,18+2*Math.sin(time*5),'#7dff9b');
  if(warp)warpFx();g.restore();if(!warp){{const br=CFG.br;g.fillStyle='rgba(0,2,8,'+Math.max(0,.55*(1-br)+.025)+')';g.fillRect(0,0,W,H);if(br>1){g.globalCompositeOperation='lighter';g.fillStyle='rgba(120,160,220,'+(br-1)*.14+')';g.fillRect(0,0,W,H);g.globalCompositeOperation='source-over'}}}if(!warp&&state!=='ship')fog(x=>W/2+(x-cam.x)*zoom,y=>H/2+(y-cam.y)*zoom,zoom,.7);if(warp)warpFlash();else if(state!=='menu')hud()}

let mmH=0;function mm(){const b=Math.min(Math.round(Math.min(190,W*.36,H*.42)*mmZ),Math.round(H*.5)),bw=mmH?Math.round(b*1.25):b;mmH=state==='play'&&mouse&&!('ontouchstart' in window)&&mouse.x>W-bw-12&&mouse.y<bw+40?1:0;const w=mmH?Math.round(b*1.25):b;return{x:W-w-12-SAFE.r,y:12+SAFE.t,w,h:w,r:4500}}
let mfc=null,mfg=null;
function drawMini(){const m=mm(),cx=m.x+m.w/2,cy=m.y+m.h/2,s=m.w/2/m.r,X=x=>cx+(x-ship.x)*s,Y=y=>cy+(y-ship.y)*s,hw=m.w/2-3,inR=(o,r=0)=>Math.hypot(o.x-ship.x,o.y-ship.y)<m.r*1.45+r;
  g.save();g.fillStyle='#030813';g.fillRect(m.x,m.y,m.w,m.h);g.beginPath();g.rect(m.x,m.y,m.w,m.h);g.clip();
  const neb=(x,y,r,c)=>{const q=g.createRadialGradient(X(x),Y(y),0,X(x),Y(y),r*s);q.addColorStop(0,c);q.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=q;g.fillRect(m.x,m.y,m.w,m.h)};
  neb(4400,-4400,11000,'rgba(50,90,200,.22)');neb(16000,-7000,9000,'rgba(255,120,70,.16)');neb(-12000,9000,11000,'rgba(120,80,200,.14)');neb(8000,22000,10000,'rgba(60,150,170,.12)');
  for(const[o,r,c]of[[A,C.safeR,['rgba(79,209,255,.09)','rgba(79,209,255,.3)']],[B,1500,['rgba(255,90,70,.09)','rgba(255,110,90,.3)']]]){blobPath(X(o.x),Y(o.y),r*s,o.x*.0013+o.y*.0007);g.fillStyle=c[0];g.fill();g.strokeStyle=c[1];g.lineWidth=1;g.stroke()}
  for(const F of FIELDS){if(F.ring?Math.abs(Math.hypot(ship.x,ship.y)-F.rr(Math.atan2(ship.y,ship.x)))>m.r*1.45+3000:!inR(F,F.r))continue;fPoly(F,X,Y);g.fillStyle='rgba('+F.col+',.12)';g.fill('evenodd');g.strokeStyle='rgba('+F.col+',.5)';g.lineWidth=1;g.stroke();if(!F.ring)txt(F.n.toUpperCase(),X(F.x),Y(F.y)+3,'rgba('+F.col+',.9)','center',7)}
  gevDraw(X,Y,s,0);
  for(const o of ANOM){if(!inR(o))continue;if(o.found||MAPALL){g.beginPath();g.arc(X(o.x),Y(o.y),Math.max(2,o.r0*s),0,TAU);g.fillStyle='rgba('+o.col+',.35)';g.fill()}else{g.fillStyle='rgba(255,255,255,.6)';g.fillRect(X(o.x+o.jx)-1.5,Y(o.y+o.jy)-1.5,3,3)}}
  g.fillStyle='rgba(190,200,220,.75)';for(const a of asts){const x=X(a.x),y=Y(a.y);if(x>m.x&&x<m.x+m.w&&y>m.y&&y<m.y+m.h)g.fillRect(x-1,y-1,2,2)}
  for(const c of cmts){const x=X(c.x),y=Y(c.y),v=Math.hypot(c.vx,c.vy)||1;g.fillStyle='rgba('+CK[c.k].c+',1)';g.beginPath();g.arc(x,y,2.5,0,TAU);g.fill();g.strokeStyle='rgba('+CK[c.k].c+',.5)';g.lineWidth=1.5;g.beginPath();g.moveTo(x,y);g.lineTo(x-c.vx/v*9,y-c.vy/v*9);g.stroke()}
  g.fillStyle='#ffb347';for(const d of derel)g.fillRect(X(d.x)-1.5,Y(d.y)-1.5,3,3);
  for(const w of wing)mapAlly2(w,X,Y);mpMapDraw(X,Y);for(const r of [...svc,...svr])mapAlly2(r,X,Y);for(const n of npcs){const q=n.boss?5:n.team==='e'?2.6:2;g.fillStyle=n.team==='e'?'#ff5c5c':n.evs?'#c792ff':'#7fe0ff';g.fillRect(X(n.x)-q/2,Y(n.y)-q/2,q,q);if(n.boss){g.strokeStyle='#ff9a4f';g.lineWidth=1;g.beginPath();g.arc(X(n.x),Y(n.y),5+2*Math.sin(time*5),0,TAU);g.stroke()}}
  if(!mfc){mfc=document.createElement('canvas');mfg=mfc.getContext('2d')}
  if(mfc.width!==m.w||mfc.height!==m.h){mfc.width=m.w;mfc.height=m.h}
  mfg.globalCompositeOperation='source-over';mfg.clearRect(0,0,m.w,m.h);mfg.fillStyle='rgba(2,4,10,.93)';mfg.fillRect(0,0,m.w,m.h);mfg.globalCompositeOperation='destination-out';mfg.fillStyle='#000';const fr=Math.max(2,RV*s);
  for(let k=0;k<EX.length;k+=2){const x=(EX[k]+.5)*CELL-ship.x,y=(EX[k+1]+.5)*CELL-ship.y;if(Math.abs(x)>m.r+RV||Math.abs(y)>m.r+RV)continue;mfg.beginPath();mfg.arc(m.w/2+x*s,m.h/2+y*s,fr,0,TAU);mfg.fill()}
  if(!MAPALL)g.drawImage(mfc,m.x,m.y);mpMini(X,Y,m);
  for(const b of BASES){let dx=(b.x-ship.x)*s,dy=(b.y-ship.y)*s;const mx=Math.max(Math.abs(dx),Math.abs(dy)),out=mx>hw;if(out&&b.small)continue;if(out){dx*=hw/mx;dy*=hw/mx}
    g.fillStyle=out?'rgba(0,0,0,0)':b.col;g.strokeStyle=b.col;g.lineWidth=1.5;g.fillRect(cx+dx-3,cy+dy-3,6,6);if(out)g.strokeRect(cx+dx-3,cy+dy-3,6,6);else txt(b.n,cx+dx,cy+dy-6,b.col,'center',7)}
  qMini(cx,cy,s,hw);if(ship.dest&&!ship.dest.auto){let dx=(ship.dest.x-ship.x)*s,dy=(ship.dest.y-ship.y)*s;const mx=Math.max(Math.abs(dx),Math.abs(dy));if(mx>hw){dx*=hw/mx;dy*=hw/mx}g.fillStyle='#7dff9b';g.fillRect(cx+dx-2,cy+dy-2,4,4)}
  {const vw=W/zoom*s,vh=H/zoom*s;g.strokeStyle='rgba(255,255,255,.28)';g.lineWidth=1;g.strokeRect(cx-vw/2,cy-vh/2,vw,vh)}
  g.translate(cx,cy);g.rotate(ship.a);g.fillStyle='#fff';poly([[5,0],[-3,-3],[-1.5,0],[-3,3]]);g.fill();g.restore();
  g.strokeStyle='rgba(120,200,255,.6)';g.lineWidth=1;g.strokeRect(m.x+.5,m.y+.5,m.w,m.h);g.strokeRect(m.x+3,m.y+3,14,14);txt('±',m.x+6,m.y+14,'#4fd1ff','left',12);
  const nb=dist(ship,A)<dist(ship,B)?A:B;
  txt(nb.n+' · '+km(dist(ship,nb)),m.x+m.w,m.y+m.h+13,'#cfe8ff','right',10);if(!CFG.ie)txt('Salto máx · '+km((100/Math.max(T.jump*(eff('jmp')<1?1.5:1),.01)-30)*650*C.jr),m.x+m.w,m.y+m.h+25,'#ffdc78','right',10)}
function bar(x,y,w,v,mx,col,l){g.fillStyle='rgba(10,20,35,.8)';g.fillRect(x,y,w,18);g.fillStyle=col;g.fillRect(x,y,w*clamp(v/mx,0,1),18);g.strokeStyle='rgba(120,200,255,.5)';g.lineWidth=1;g.strokeRect(x,y,w,18);txt(l,x+w+8,y+14,'#cfe8ff','left',13)}
function hud(){const x=14,bw=Math.min(230,W*.4);drawMini();
  txt(T.n.toUpperCase()+' · '+zone(),x,20,'#4fd1ff','left',14);
  bar(x,30,bw,ship.hull,T.hull,'#ff6b6b','CASCO '+Math.round(ship.hull));bar(x,54,bw,ship.shd,T.shd,'#4fd1ff','ESCUDO '+Math.round(ship.shd));
  bar(x,78,bw,ship.en,100,ship.en>=50?'#7dff9b':'#ffd166','ENERGÍA '+Math.floor(ship.en)+'% · salto mín '+jumpCost(C.jumpMin)+'%');
  let y=122;const L=(t,c)=>{txt(t,x,y,c,'left',13);y+=18};
  L(`CARGA ${Math.floor(ship.ore)}/${T.cargo}   CHATARRA ${ship.scrap}`,'#cfe8ff');
  {const bk=Object.values(ship.parts).filter(v=>v<=0).length;if(bk)L('SISTEMAS AVERIADOS: '+bk+' · abre Nave [N]','#ff6b6b');if(stab()<1)L('MOTORES DAÑADOS: menos velocidad y estabilidad','#ffb347')}
  if(ship.dest&&!ship.dest.auto)L('RUMBO · '+Math.round(dist(ship,ship.dest))+' u','#7dff9b');
  rq.forEach(j=>L('⚙ '+NM[j.k]+' '+Math.floor(j.t/j.tot*100)+'% · '+Math.ceil(j.tot-j.t)+' s','#c792ff'));
  if(ship.docked)txt('ATRACADO · '+ship.docked.n.toUpperCase(),W/2,H-40,'#7dff9b','center',15);
  if(ship.fixing)txt('AUTORREPARANDO',W/2,H-100,'#c792ff','center',12);
  if(ship.rep>0){g.fillStyle='#c792ff';g.fillRect(W/2-50,H-70,100*ship.rep,6);g.strokeStyle='#c792ff';g.strokeRect(W/2-50,H-70,100,6);txt('REPARANDO',W/2,H-78,'#c792ff','center',12)}
  if(ship.dead>0)txt('NAVE INUTILIZADA',W/2,H/2,'#ff6b6b','center',22)}

function render(){
  if(W<1||H<1)return;
  if(state==='hangar'||(state==='pause'&&pauseFrom==='hangar'))drawHangar();else if(mapV()){if(state==='warp'){if(wmapF)mc={x:ship.x,y:ship.y};const s0=state;state='map';drawMap();state=s0;txt('SALTO EN CURSO → '+warp.dest.n.toUpperCase(),W/2,18,'#7dff9b','center',12)}else drawMap()}else if(state==='ship')shipView();else if(aiW&&state==='play')allyView();else drawWorld();
  vHud(()=>{if(hgL&&state==='play')drawHgL();if(state!=='warp'&&state!=='menu'&&state!=='ship'&&!aiW)txt('◈ '+ship.cred+' cr',W/2,26,'#ffd166','center',19);
  toasts.forEach((t,i)=>{g.globalAlpha=clamp(t.life,0,1);txt(t.t,state==='ship'&&!(W<720&&W<H*1.34)?(W-Math.min(390,W*.52))/2:W/2,state==='ship'?(W<720&&W<H*1.34?H*.5-34:H-30)-(toasts.length-1-i)*22:Math.min(H*.15,80)+i*22,'#cfe8ff','center',16)});g.globalAlpha=1})}

/* ===== MEJORAS: km, audio, gráficos ===== */
const km=d=>(d/1000).toFixed(d<9950?2:1)+' km',rings=[],DEAD={h:.15,p:{eng:0,eg2:0,wpn:0,min:0,jmp:0},th:0};
const pst=()=>({h:ship.hull/T.hull,p:ship.parts,th:Math.min(1,Math.hypot(ship.vx,ship.vy)/T.spd)});
let AC=null,mg=null,eN=null,mN=null;
function au(){if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)();mg=AC.createGain();mg.gain.value=.5;mg.connect(AC.destination)}catch(e){}}if(AC&&AC.state==='suspended')AC.resume()}
['pointerdown','keydown'].forEach(e=>addEventListener(e,au,{passive:true}));
document.addEventListener('click',e=>{if(e.target.closest('.sq,.card'))sfx('k')});
const tn=(f0,f1,d,ty,v,t0)=>{if(!AC)return;const t=AC.currentTime+(t0||0),o=AC.createOscillator(),q=AC.createGain();o.type=ty;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+d);q.gain.setValueAtTime(v,t);q.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(q);q.connect(mg);o.start(t);o.stop(t+d+.05)};
const nz=(d,v,f)=>{if(!AC)return;const n=AC.sampleRate*d|0,b=AC.createBuffer(1,n,AC.sampleRate),a=b.getChannelData(0);for(let i=0;i<n;i++)a[i]=(Math.random()*2-1)*(1-i/n);const s=AC.createBufferSource(),fl=AC.createBiquadFilter(),q=AC.createGain();s.buffer=b;fl.type='lowpass';fl.frequency.value=f;q.gain.value=v;s.connect(fl);fl.connect(q);q.connect(mg);s.start()};
function sfx(k,o,x){if(!AC)return;if(state==='hangar'&&o)return;const v=o?clamp(1-dist(o,ship)/2600,0,1):1;if(v<.03)return;
 if(k==='s'){x==='p'?tn(1100,180,.14,'sawtooth',.1):tn(x==='e'?520:760,140,.14,x==='e'?'square':'triangle',.07*v)}
 else if(k==='b'){nz(.3+Math.min(.7,x/40),.35*v,700);tn(130,30,.5,'sine',.35*v)}
 else if(k==='d'){tn(660,660,.3,'sine',.12);tn(990,990,.4,'sine',.1,.12)}
 else if(k==='w'){tn(60,2400,1.8,'sawtooth',.1);nz(2,.18,3500)}
 else if(k==='h'){nz(.18,.35,400);tn(200,50,.2,'square',.1)}
 else tn(1300,800,.05,'square',.04)}
function mkL(f,t,lp){const o=AC.createOscillator(),fl=AC.createBiquadFilter(),q=AC.createGain();o.type=t;o.frequency.value=f;fl.type='lowpass';fl.frequency.value=lp;q.gain.value=0;o.connect(fl);fl.connect(q);q.connect(mg);o.start();return{o,q}}
function audioTick(){if(!AC)return;if(!eN){eN=mkL(48,'sawtooth',280);mN=mkL(170,'square',700)}const t=AC.currentTime,pl=state==='play'||state==='warp',sp=pl?Math.hypot(ship.vx,ship.vy)/T.spd:0;
 mg.gain.setTargetAtTime((state==='menu'?0:CFG.vol/.7)*.5*clamp(Math.pow((state==='hangar'||state==='ship'?1:zoom)/.7,.9),.15,1.6),t,.1);
 eN.q.gain.setTargetAtTime(pl?(.015+.05*Math.min(1,sp))*(eff('eng')+eff('eg2'))/2:0,t,.15);eN.o.frequency.setTargetAtTime(44+Math.min(sp,3)*30,t,.15);
 mN.q.gain.setTargetAtTime(state==='play'&&ship.beam?.03:0,t,.08);mN.o.frequency.setTargetAtTime(150+Math.sin(time*30)*20,t,.05)}

/* ---- Naves: cada tipo con su silueta; el daño se pinta sobre la pieza afectada ---- */
const HUL={
g:{b:[[24,0],[12,-5],[-2,-7],[-16,-8],[-17,0]],w:[[9,-6],[-2,-19],[-15,-20],[-14,-8]],x:[[12,-5],[8,-13],[0,-13],[2,-6]],cp:[11,3.5],gn:[[15,-3],[15,3]],en:[-16,5],mn:[-1,13],jp:[-1,13]},
m:{b:[[17,0],[14,-6],[4,-9],[-14,-10],[-17,0]],w:[[6,-9],[6,-18],[-12,-18],[-12,-9]],x:[[-12,-12],[-12,-16],[-16,-16],[-16,-11]],cp:[9,3],gn:[[15,0]],en:[-15,6],mn:[-3,13.5],jp:[-3,13.5]},
c:{b:[[28,0],[8,-3],[-6,-6],[-15,-5],[-12,0]],w:[[10,-3],[-6,-23],[-12,-22],[-8,-5]],x:[[-6,-6],[-15,-14],[-16,-6]],cp:[12,2.5],gn:[[2,-10],[2,10]],en:[-14,3.5],mn:[-3,11],jp:[-3,11]},
e:{b:[[31,0],[10,-3],[-8,-4],[-14,-3],[-14,0]],w:[[-2,-4],[-12,-14],[-15,-13],[-10,-4]],x:[[8,-3],[4,-8],[-2,-4]],cp:[14,2],gn:[[22,0]],en:[-14,2.4],mn:[-8,7],jp:[-8,7]},
t:{b:[[17,0],[10,-8],[-6,-10],[-14,-7],[-15,0]],w:[[4,-9],[2,-17],[-8,-18],[-10,-9]],x:[[-2,-10],[-2,-14],[-8,-14],[-8,-10]],cp:[6,4],gn:[[12,0]],en:[-14,4.5],mn:[-3,13],jp:[-3,13]}};
function syncPP(){const H=HUL[T.sh];if(!H)return;PP.eng=[H.en[0],-H.en[1]];PP.eg2=[H.en[0],H.en[1]];PP.min=[H.mn[0],-H.mn[1]];PP.jmp=[H.jp[0],H.jp[1]];PP.wpn=[H.gn[0][0]+4,0]}
function drawS(x,y,a,sh,col,sc,st){const H=HUL[sh]||HUL.c,h=st&&st.h!=null?st.h:1,P=st&&st.p||{},th=st&&st.th!=null?st.th:.4,v=k=>P[k]!=null?P[k]:100,lw=1/sc,[ex,ey]=H.en,nh=Math.min(2.4,ey*.8),[mx,my]=H.mn,[jx,jy]=H.jp;
 g.save();g.translate(x,y);g.rotate(a);g.scale(sc,sc);
 const pol=(p,f,al)=>{poly(p);g.fillStyle=f;if(al!=null)g.globalAlpha=al;g.fill();g.globalAlpha=1},fl=p=>p.map(q=>[q[0],-q[1]]);
 const body=H.b.concat(fl(H.b).reverse()),pc_=H.pc||['#6283ad','#2d4968','#0e1b2d'],dk=g.createLinearGradient(0,-12,0,12);dk.addColorStop(0,pc_[0]);dk.addColorStop(.45,pc_[1]);dk.addColorStop(1,pc_[2]);
 const gw=g.createLinearGradient(0,-20,0,20);if(H.pc){gw.addColorStop(0,pc_[1]);gw.addColorStop(.5,pc_[2]);gw.addColorStop(1,'#050505')}else{gw.addColorStop(0,'#41608a');gw.addColorStop(.5,'#1a2f4b');gw.addColorStop(1,'#0a1422')}
 // llamas (aditivas) detrás de todo
 g.globalCompositeOperation='lighter';for(const[k,py]of[['eng',-ey],['eg2',ey]])if(v(k)>0){const L=(7+16*th)*(v(k)<40?.4+.6*Math.random():1),f=g.createLinearGradient(ex-3,0,ex-3-L,0);f.addColorStop(0,'rgba(210,248,255,.95)');f.addColorStop(.35,'rgba(80,160,255,.6)');f.addColorStop(1,'rgba(40,80,255,0)');g.fillStyle=f;g.beginPath();g.moveTo(ex-3,py-nh*.9);g.lineTo(ex-3-L,py);g.lineTo(ex-3,py+nh*.9);g.fill();
  const q=g.createRadialGradient(ex-3,py,0,ex-3,py,nh*3);q.addColorStop(0,'rgba(140,200,255,.55)');q.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=q;g.fillRect(ex-3-nh*3,py-nh*3,nh*6,nh*6)}g.globalCompositeOperation='source-over';
 for(const s of[1,-1]){const w=H.w.map(p=>[p[0],p[1]*s]),xx=H.x.map(p=>[p[0],p[1]*s]);pol(w,gw);pol(w,col,.12);pol(xx,dk);pol(xx,col,.16)}
 // toberas (detrás del casco)
 for(const[k,py]of[['eng',-ey],['eg2',ey]])if(v(k)>0){g.fillStyle='#08111d';g.fillRect(ex-3,py-nh,4,nh*2);g.fillStyle=v(k)<40?'#ff9a4f':'#8fd4ff';g.fillRect(ex-3.2,py-nh*.55,1,nh*1.1)}
 pol(body,dk);pol(body,col,.14);
 g.save();poly(body);g.clip();const sp=g.createLinearGradient(0,-10,0,10);sp.addColorStop(0,'rgba(255,255,255,.24)');sp.addColorStop(.4,'rgba(255,255,255,0)');sp.addColorStop(1,'rgba(0,0,0,.42)');g.fillStyle=sp;g.fillRect(-30,-30,70,60);g.restore();
 for(const s of[1,-1])pol([[H.b[1][0],s*1.2],[-8,s*H.b[2][1]*.7],[-8,s*(H.b[2][1]*.7-1.6)],[H.b[1][0]-3,s*.2]],col,.6);
 g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=lw*.8;g.beginPath();g.moveTo(H.b[0][0]-4,0);g.lineTo(-13,0);for(const s of[1,-1]){g.moveTo(H.b[1][0]-2,s*H.b[1][1]*.5);g.lineTo(-10,s*H.b[2][1]*.8)}g.stroke();
 if(H.fx)H.fx(col,lw);
 // armas
 H.gn.forEach(([gx,gy])=>{const w=v('wpn');if(w>0){const L=w<40?3:8;g.fillStyle='#0a1320';g.fillRect(gx,gy-1,L,2);g.fillStyle=col;g.fillRect(gx+L-1.2,gy-.6,1.4,1.2)}});
 // minería (plato) y salto (bobina)
 if(v('min')>0){const q=g.createRadialGradient(mx,-my,0,mx,-my,3);q.addColorStop(0,'#fff3c0');q.addColorStop(.4,'#ffd166');q.addColorStop(1,'#3a2a08');g.fillStyle=q;g.beginPath();g.arc(mx,-my,3,0,TAU);g.fill()}
 if(v('jmp')>0){const t=.5+.5*Math.sin(time*4),q=g.createRadialGradient(jx,jy,0,jx,jy,3.4);q.addColorStop(0,'rgba(240,215,255,'+(.6+.4*t)+')');q.addColorStop(.6,'rgba(199,146,255,'+(.5+.3*t)+')');q.addColorStop(1,'rgba(60,20,110,.9)');g.fillStyle=q;g.beginPath();g.arc(jx,jy,3.4,0,TAU);g.fill()}
 const cq=g.createRadialGradient(H.cp[0]-1,-1,0,H.cp[0],0,H.cp[1]*1.3);cq.addColorStop(0,h<.25?'#333':'#e4fbff');cq.addColorStop(.5,h<.25?'#10151d':'#4fb4ee');cq.addColorStop(1,h<.25?'#080c12':'#0f3f72');g.beginPath();g.ellipse(H.cp[0],0,H.cp[1]*1.3,H.cp[1]*.8,0,0,TAU);g.fillStyle=cq;g.fill();
 if(h<.6){g.strokeStyle='rgba(0,0,0,.85)';g.lineWidth=lw;g.beginPath();g.moveTo(H.cp[0]-2,-2);g.lineTo(H.cp[0]+1,1.5);g.stroke()}
 const bk=Math.sin(time*5)>.2;g.fillStyle=bk?'#ff4d4d':'#401010';g.fillRect(H.w[1][0]-1,H.w[1][1]-1,2,2);g.fillStyle=bk?'#4dff7a':'#103018';g.fillRect(H.w[1][0]-1,-H.w[1][1]-1,2,2);
 // ===== DAÑOS VISIBLES =====
 if(h<.85){pol(body,'#1e0800',(.85-h)*.7);const k=Math.ceil((1-h)*9);for(let i=0;i<k;i++){const sx=Math.sin(i*12.9+1)*11,sy=Math.cos(i*7.3)*6;g.strokeStyle='rgba(0,0,0,.65)';g.lineWidth=lw*1.6;g.beginPath();g.moveTo(sx,sy);g.lineTo(sx-4,sy+Math.sin(i*5)*4);g.stroke();
  if(h<.55){g.strokeStyle='rgba(255,140,50,'+(.5+.4*Math.sin(time*7+i))+')';g.lineWidth=lw*.7;g.stroke()}
  if(h<.35&&i%2==0){const f=g.createRadialGradient(sx,sy,0,sx,sy,4+Math.random()*2);f.addColorStop(0,'rgba(255,220,120,.9)');f.addColorStop(1,'rgba(255,70,0,0)');g.fillStyle=f;g.fillRect(sx-7,sy-7,14,14)}}}
 const dm=(px,py,q)=>{if(q>=80)return;const r=3+(100-q)*.05,z=g.createRadialGradient(px,py,0,px,py,r*1.6);z.addColorStop(0,'rgba(0,0,0,.75)');z.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=z;g.fillRect(px-r*2,py-r*2,r*4,r*4);
  if(q<=0){const j=[];for(let i=0;i<9;i++){const an=i/9*TAU+px,rr=r*(i%2?.7:1.15);j.push([px+Math.cos(an)*rr,py+Math.sin(an)*rr])}pol(j,'#03050a');g.strokeStyle='rgba(255,'+(110+Math.sin(time*9)*50|0)+',40,.95)';g.lineWidth=lw*1.4;g.stroke()}
  if(q<40){for(let i=0;i<3;i++)if(Math.random()<.35){g.fillStyle='#ffd38a';g.fillRect(px+rnd(-r,r),py+rnd(-r,r),1.3,1.3)}g.fillStyle='rgba(130,130,140,.35)';for(let i=0;i<3;i++){const t=(time*.9+i/3)%1;g.beginPath();g.arc(px-t*10,py+Math.sin(t*6+i)*2,1.5+t*3,0,TAU);g.fill()}}};
 dm(ex,-ey,v('eng'));dm(ex,ey,v('eg2'));dm(mx,-my,v('min'));dm(jx,jy,v('jmp'));dm(H.gn[0][0]+3,H.gn[0][1],v('wpn'));
 g.restore()}


/* ---- Modelos enemigos: cada tipo con silueta, paleta (pc) y detalles propios (fx) ---- */
const sc_=(a,b,l,w)=>{g.strokeStyle=b;g.lineWidth=w;g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(l[0],l[1]);g.stroke()};
HUL.pir={pc:['#9a6a50','#53301f','#1d110b'],b:[[25,0],[15,-3],[8,-8],[-4,-8],[-11,-12],[-17,-9],[-18,-3],[-14,0]],w:[[9,-8],[15,-19],[6,-21],[-6,-11]],x:[[-4,-8],[-13,-17],[-18,-10]],cp:[11,3],gn:[[19,-2.5],[19,2.5]],en:[-17,5],mn:[-2,12],jp:[-3,12],
 fx:(c,lw)=>{g.fillStyle='#74462f';poly([[3,-8],[-4,-9],[-5,-4],[2,-3]]);g.fill();g.fillStyle='#454b52';poly([[5,4],[-2,5],[-4,10],[4,9]]);g.fill();g.fillStyle='#2b2f35';poly([[-9,-3],[-14,-4],[-14,3],[-9,2]]);g.fill();
  g.strokeStyle='rgba(0,0,0,.65)';g.lineWidth=lw;g.beginPath();g.moveTo(3,-8);g.lineTo(2,-3);g.moveTo(5,4);g.lineTo(4,9);g.moveTo(-4,-9);g.lineTo(-10,-6);g.stroke();
  g.fillStyle='#d9c9b0';for(const[x,y]of[[1,-7],[-3,-8],[3,5],[-1,7],[-12,-2],[-12,1]])g.fillRect(x-.4,y-.4,.9,.9);
  g.strokeStyle='rgba(140,60,20,.55)';g.lineWidth=lw*1.4;g.beginPath();g.moveTo(-3,-4);g.lineTo(-6,2);g.moveTo(10,-6);g.lineTo(8,-1);g.stroke();
  g.fillStyle=c;g.globalAlpha=.8;poly([[25,0],[29,-.7],[25,-1.6]]);g.fill();poly([[25,0],[29,.7],[25,1.6]]);g.fill();g.globalAlpha=1;
  g.fillStyle='#0a0705';poly([[-14,-9],[-16,-6],[-12,-6]]);g.fill()}};
HUL.esa={pc:['#a04a5c','#46182a','#14060c'],b:[[31,0],[14,-3],[3,-7],[-9,-8],[-17,-5],[-15,0]],w:[[7,-7],[0,-22],[-9,-24],[-13,-8]],x:[[-9,-8],[-17,-16],[-19,-6]],cp:[13,2.4],gn:[[24,-1.8],[24,1.8]],en:[-16,3.6],mn:[-3,11],jp:[-3,11],
 fx:(c,lw)=>{g.fillStyle=c;g.globalAlpha=.85;poly([[28,-.6],[-9,-1.5],[-9,1.5],[28,.6]]);g.fill();g.globalAlpha=1;
  for(const s of[1,-1]){const y=s*12;g.fillStyle='#1c0a12';g.fillRect(3,y-2,13,4);g.fillStyle=c;g.fillRect(16,y-.6,8,1.2);g.fillRect(4,y-1.8,2,.8);
   g.strokeStyle='#2c1019';g.lineWidth=lw*1.5;g.beginPath();g.moveTo(6,s*7);g.lineTo(7,y-s*2);g.moveTo(12,s*6);g.lineTo(12,y-s*2);g.stroke();
   g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=lw;g.beginPath();g.moveTo(-2,s*7);g.lineTo(-6,s*13);g.moveTo(-8,s*8);g.lineTo(-11,s*15);g.stroke();
   g.strokeStyle='rgba(255,120,140,.5)';g.beginPath();g.moveTo(8,s*4);g.lineTo(0,s*6);g.lineTo(-7,s*6);g.stroke()}
  g.fillStyle='rgba(0,0,0,.5)';poly([[-14,-4],[-17,-4],[-16,-1]]);g.fill()}};
HUL.esp={pc:['#b79a55','#5f4a22','#211806'],b:[[17,0],[14,-7],[6,-12],[-11,-12],[-17,-6],[-17,0]],w:[[15,-6],[12,-21],[1,-23],[-4,-10]],x:[[-4,-12],[-12,-21],[-18,-13]],cp:[8,3.2],gn:[[16,-2.5],[16,2.5]],en:[-17,5.5],mn:[-3,14],jp:[-3,14],
 fx:(c,lw)=>{const pu=.55+.25*Math.sin(time*3);g.strokeStyle=c;g.globalAlpha=pu;g.lineWidth=lw*2.6;g.beginPath();g.arc(6,0,19,-.95,.95);g.stroke();g.lineWidth=lw*1.2;g.beginPath();g.arc(6,0,22.5,-.8,.8);g.stroke();g.globalAlpha=1;
  g.strokeStyle='rgba(20,12,0,.6)';g.lineWidth=lw;g.beginPath();for(const x of[8,0,-7,-13]){g.moveTo(x,-11);g.lineTo(x-1,11)}g.moveTo(14,-6);g.lineTo(-16,-5);g.moveTo(14,6);g.lineTo(-16,5);g.stroke();
  g.fillStyle='#2a1f08';const h=[];for(let i=0;i<6;i++)h.push([-2+Math.cos(i*TAU/6)*3.6,Math.sin(i*TAU/6)*3.6]);poly(h);g.fill();g.strokeStyle=c;g.lineWidth=lw*1.2;g.stroke();
  g.fillStyle='rgba(0,0,0,.55)';poly([[9,-11],[5,-12],[7,-8]]);g.fill()}};
HUL.est={pc:['#9a80c0','#46335f','#171027'],b:[[15,0],[11,-7],[4,-10],[-8,-10],[-14,-5],[-14,0]],w:[[3,-10],[0,-15],[-9,-16],[-10,-10]],x:[[-8,-10],[-13,-14],[-15,-9]],cp:[7,3.4],gn:[[12,0]],en:[-14,4.5],mn:[-3,12],jp:[-3,12],
 fx:(c,lw)=>{const k=.5+.5*Math.sin(time*5);g.strokeStyle=c;g.globalAlpha=.55;g.lineWidth=lw*1.6;g.beginPath();g.ellipse(-1,0,13,8.5,0,0,TAU);g.stroke();g.globalAlpha=1;
  for(const s of[1,-1]){g.strokeStyle='#2a1f40';g.lineWidth=lw*2.2;g.beginPath();g.moveTo(5,s*8);g.lineTo(11,s*13);g.lineTo(17,s*12);g.stroke();g.strokeStyle='#cbb3ee';g.lineWidth=lw*1.2;g.stroke();
   g.fillStyle=Math.sin(time*18+s)>0?'#fff4c0':'#ffb347';g.fillRect(17,s*12-.8,1.7,1.7);if(Math.sin(time*18+s)>0){g.fillStyle='rgba(255,230,150,.35)';g.beginPath();g.arc(17.8,s*12,3.2,0,TAU);g.fill()}}
  g.strokeStyle='#cbb3ee';g.lineWidth=lw;g.beginPath();g.moveTo(-7,0);g.lineTo(-12,0);g.stroke();g.beginPath();g.arc(-12,0,2.2,0,TAU);g.stroke();
  g.fillStyle='rgba(120,255,220,'+(.4+.5*k)+')';g.fillRect(-5,-1,2,2);g.fillStyle='rgba(0,0,0,.5)';g.fillRect(-2,6,6,1.2);g.fillRect(-6,-8,1,4)}};
HUL.bos={pc:['#c47a44','#5c2c14','#1e0e06'],b:[[35,0],[25,-5],[15,-10],[3,-13],[-12,-14],[-22,-9],[-23,0]],w:[[11,-12],[5,-29],[-12,-31],[-19,-14]],x:[[-4,-14],[-14,-25],[-22,-15]],cp:[17,3],gn:[[28,-3],[28,3],[15,-12.5],[15,12.5]],en:[-23,6],mn:[-2,15],jp:[-2,15],
 fx:(c,lw)=>{for(const s of[1,-1]){g.fillStyle='#2a1208';poly([[24,s*4],[36,s*10],[27,s*3]]);g.fill();g.strokeStyle=c;g.lineWidth=lw*1.2;g.stroke();
   g.fillStyle='#32180c';for(let i=0;i<4;i++){const x=10-i*8;poly([[x,s*13],[x-3,s*13],[x-2,s*18]]);g.fill()}
   g.strokeStyle='rgba(0,0,0,.65)';g.lineWidth=lw;g.beginPath();g.moveTo(14,s*9);g.lineTo(-18,s*10);g.moveTo(2,s*12);g.lineTo(-2,s*27);g.moveTo(-8,s*13);g.lineTo(-12,s*28);g.stroke();
   g.fillStyle='#0c0604';g.beginPath();g.ellipse(11,s*3.4,2.4,1.1,s*.4,0,TAU);g.fill()}
  g.fillStyle=c;g.globalAlpha=.9;poly([[33,-.8],[-12,-2],[-12,2],[33,.8]]);g.fill();g.globalAlpha=1;
  const k=.55+.45*Math.sin(time*3),q=g.createRadialGradient(-6,0,0,-6,0,7);q.addColorStop(0,'rgba(255,230,160,'+k+')');q.addColorStop(.5,'rgba(255,90,30,'+k*.8+')');q.addColorStop(1,'rgba(120,0,0,0)');g.fillStyle=q;g.fillRect(-14,-8,16,16);
  g.fillStyle='rgba(0,0,0,.55)';poly([[-20,-8],[-23,-8],[-22,-4]]);g.fill();poly([[8,12],[3,13],[5,17]]);g.fill()}};

HUL.mer={pc:['#b9a77a','#6a5a38','#241d0e'],b:[[18,0],[15,-6],[8,-9],[-14,-10],[-20,-8],[-20,0]],w:[[6,-9],[4,-14],[-12,-15],[-14,-10]],x:[[-12,-12],[-14,-17],[-19,-14]],cp:[13,3],gn:[[16,0]],en:[-20,5],mn:[-4,10],jp:[-4,10],
 fx:(c,lw)=>{const cols=['#c0533c','#3c7fc0','#d9a43a','#4aa06a'];for(let i=0;i<3;i++)for(const s of[1,-1]){const x=4-i*9;g.fillStyle=cols[(i+(s>0?1:0))%4];g.fillRect(x-4,s>0?9.5:-17,8,7.5);g.strokeStyle='rgba(0,0,0,.55)';g.lineWidth=lw;g.strokeRect(x-4,s>0?9.5:-17,8,7.5);g.beginPath();g.moveTo(x-1.3,s>0?9.5:-17);g.lineTo(x-1.3,s>0?17:-9.5);g.moveTo(x+1.3,s>0?9.5:-17);g.lineTo(x+1.3,s>0?17:-9.5);g.stroke()}
  g.strokeStyle=c;g.lineWidth=lw*1.6;g.beginPath();g.moveTo(14,-5);g.lineTo(-16,-5);g.moveTo(14,5);g.lineTo(-16,5);g.stroke();
  const k=Math.sin(time*3)>0;g.fillStyle=k?'#ffe27a':'#4a3d10';g.fillRect(16,-1,1.8,2);g.fillStyle='rgba(0,0,0,.5)';g.fillRect(-10,-2,6,1.2);g.fillRect(-18,3,3,1)}};
/* ---- Bases a escala ---- */
function drawBase(b){const r=b.r,c=b.col,p=.5+.5*Math.sin(time*3+b.x);g.save();g.translate(b.x,b.y);
 let q=g.createRadialGradient(0,0,r*.5,0,0,r*2.2);q.addColorStop(0,c+'30');q.addColorStop(1,c+'00');g.fillStyle=q;g.fillRect(-r*2.2,-r*2.2,r*4.4,r*4.4);
 const met=g.createLinearGradient(-r,-r,r,r);met.addColorStop(0,'#40597a');met.addColorStop(.5,'#16263b');met.addColorStop(1,'#2c4560');
 const lights=(n,rad,z)=>{for(let i=0;i<n;i++){const a=i/n*TAU;g.fillStyle=Math.sin(time*2+i*1.7)>-.3?'#ffe9a8':'#3a3320';g.fillRect(Math.cos(a)*rad-z/2,Math.sin(a)*rad-z/2,z,z)}};
 const panel=(x,y,w,h)=>{g.fillStyle='#0f2a4a';g.fillRect(x,y,w,h);g.strokeStyle='rgba(90,160,224,.55)';g.lineWidth=2;g.beginPath();for(let i=1;i<6;i++){g.moveTo(x+w*i/6,y);g.lineTo(x+w*i/6,y+h)}g.moveTo(x,y+h/2);g.lineTo(x+w,y+h/2);g.stroke()};
 const hub=(R)=>{const k=g.createRadialGradient(-R*.3,-R*.3,R*.1,0,0,R);k.addColorStop(0,'#5b7da3');k.addColorStop(1,'#101c2e');g.fillStyle=k;g.beginPath();g.arc(0,0,R,0,TAU);g.fill();g.fillStyle=c;g.globalAlpha=.35+.4*p;g.beginPath();g.arc(0,0,R*.4,0,TAU);g.fill();g.globalAlpha=1};
 if(b===A){for(let i=0;i<4;i++){g.save();g.rotate(i*Math.PI/2+Math.PI/4);g.fillStyle=met;g.fillRect(r*.7,-r*.03,r*.5,r*.06);panel(r*1.15,-r*.2,r*.55,r*.4);g.restore()}
  g.save();g.rotate(time*.04);g.strokeStyle=met;g.lineWidth=r*.16;g.beginPath();g.arc(0,0,r*.82,0,TAU);g.stroke();
  for(let i=0;i<4;i++){g.save();g.rotate(i*Math.PI/2);g.fillStyle=met;g.fillRect(r*.3,-r*.05,r*.45,r*.1);g.restore()}lights(48,r*.82,r*.03);g.restore();hub(r*.34)}
 else if(b.small){g.fillStyle=met;g.fillRect(-r*.9,-r*.22,r*1.8,r*.44);panel(-r*2.1,-r*.45,r*1.1,r*.9);panel(r,-r*.45,r*1.1,r*.9);hub(r*.45);lights(10,r*.7,r*.06)}
 else{const hx=R=>{g.beginPath();for(let i=0;i<6;i++)g.lineTo(Math.cos(i*Math.PI/3)*R,Math.sin(i*Math.PI/3)*R);g.closePath()};hx(r);g.fillStyle=met;g.fill();hx(r*.62);g.fillStyle='#0c1624';g.fill();
  for(let i=0;i<6;i++){const a=i*Math.PI/3,tx=Math.cos(a)*r,ty=Math.sin(a)*r;g.fillStyle='#233955';g.beginPath();g.arc(tx,ty,r*.1,0,TAU);g.fill();g.fillStyle=Math.sin(time*4+i)>0?'#ff5050':'#501010';g.beginPath();g.arc(tx,ty,r*.04,0,TAU);g.fill();g.strokeStyle='#3a516e';g.beginPath();g.moveTo(0,0);g.lineTo(tx*.62,ty*.62);g.stroke()}
  g.save();g.rotate(time*.6);g.strokeStyle='#9ad';g.lineWidth=4;g.beginPath();g.moveTo(-r*.3,0);g.lineTo(r*.3,0);g.stroke();g.beginPath();g.arc(r*.3,0,r*.08,0,TAU);g.stroke();g.restore();hub(r*.16);lights(18,r*.78,r*.03)}
 g.restore()}

/* ---- Asteroides, efectos, estrellas ---- */
function drawAst(a){g.save();g.translate(a.x,a.y);g.rotate(a.rot);const mc=MIN[a.m]?MIN[a.m][1]:'#6b7385',pts=a.sh.map((m,i)=>[Math.cos(i/9*TAU)*a.r*m,Math.sin(i/9*TAU)*a.r*m]);poly(pts);
 const q=g.createRadialGradient(-a.r*.4,-a.r*.4,a.r*.1,0,0,a.r*1.2);q.addColorStop(0,'#6e7586');q.addColorStop(.6,'#353a47');q.addColorStop(1,'#12151c');g.fillStyle=q;g.fill();g.save();g.clip();
 for(let i=0;i<4;i++){const x=Math.sin(a.rot*7+i*2)*a.r*.5,y=Math.cos(a.rot*5+i*3)*a.r*.5,cr=a.r*(.12+.04*(i%3));g.fillStyle='rgba(0,0,0,.32)';g.beginPath();g.arc(x,y,cr,0,TAU);g.fill();g.strokeStyle='rgba(255,255,255,.14)';g.lineWidth=1;g.beginPath();g.arc(x-1,y-1,cr,Math.PI,TAU*.9);g.stroke()}
 g.strokeStyle=mc;g.globalAlpha=.55+.25*Math.sin(time*2+a.x);g.lineWidth=Math.max(1.5,a.r*.07);for(let i=0;i<3;i++){g.beginPath();g.moveTo(Math.sin(i*2.1+a.rot)*a.r*.8,Math.cos(i*1.7)*a.r*.8);g.lineTo(Math.cos(i*3.3+a.rot)*a.r*.3,Math.sin(i*2.9)*a.r*.3);g.stroke()}g.globalAlpha=1;g.restore();
 g.restore()}
function drawFx(){drawLz();g.globalCompositeOperation='lighter';for(const q of sucks){if(!vis(q.x,q.y,200))continue;const k=clamp(q.life/q.max,0,1);g.globalAlpha=.4+.6*(1-k);g.strokeStyle=q.c;g.lineWidth=2;g.beginPath();g.moveTo(q.px||q.x,q.py||q.y);g.lineTo(q.x,q.y);g.stroke();g.fillStyle=q.c;g.fillRect(q.x-2,q.y-2,4,4)}g.globalAlpha=1;for(const p of parts){if(!vis(p.x,p.y,40))continue;const k=clamp(p.life/p.max,0,1),r=(2+5*k)*2,z=g.createRadialGradient(p.x,p.y,0,p.x,p.y,r);z.addColorStop(0,p.c);z.addColorStop(1,'rgba(0,0,0,0)');g.globalAlpha=k;g.fillStyle=z;g.fillRect(p.x-r,p.y-r,r*2,r*2)}g.globalAlpha=1;
 for(let i=rings.length-1;i>=0;i--){const o=rings[i];o.t+=.016;const k=o.t/.6;if(k>=1){rings.splice(i,1);continue}if(!vis(o.x,o.y,o.r+20))continue;g.strokeStyle='rgba(255,200,140,'+(1-k)*.7+')';g.lineWidth=3*(1-k)+1;g.beginPath();g.arc(o.x,o.y,o.r*k+8,0,TAU);g.stroke()}g.globalCompositeOperation='source-over'}
function drawBul(){g.globalCompositeOperation='lighter';g.lineCap='round';for(const b of bullets){if(!vis(b.x,b.y,120))continue;const c=b.lz?'255,110,230':b.own==='e'?'255,90,90':b.own==='g'?'120,230,255':'140,255,210';g.strokeStyle='rgba('+c+',.35)';g.lineWidth=8;g.beginPath();g.moveTo(b.x,b.y);g.lineTo(b.x-b.vx*.03,b.y-b.vy*.03);g.stroke();g.strokeStyle='rgba(255,255,255,.95)';g.lineWidth=2.5;g.beginPath();g.moveTo(b.x,b.y);g.lineTo(b.x-b.vx*.02,b.y-b.vy*.02);g.stroke()}g.lineCap='butt';g.globalCompositeOperation='source-over'}
let VR=0,VPx=0,VPy=0,SM=1;const SA=[{x:0,y:0},{x:0,y:0},{x:0,y:0}];let SV={x:0,y:0,hy:0},mapT=-9;
const zs=()=>state==='ship'&&shT>=1?SL.sc/1.1*.3:zoom;
function starTick(dt){let vx=ship.vx||0,vy=ship.vy||0;const hy=clamp((Math.hypot(vx,vy)/T.spd-1.5)/6,0,1);{const k=Math.min(1,5*dt);SV.x+=(vx-SV.x)*k;SV.y+=(vy-SV.y)*k;SV.hy+=(hy-SV.hy)*k}layers.forEach((L,i)=>{const f=(L.f+(1-L.f)*hy)*zs()/.7;SA[i].x+=vx*dt*f;SA[i].y+=vy*dt*f})}
function stars(){const rot=VR!==0,ext=rot?Math.hypot(W,H)/2:0,WARPST=state==='warp';
 if(rot){g.save();g.translate(W/2,H/2);g.rotate(VR);g.translate(-W/2,-H/2)}
 g.globalAlpha=SM;
 for(const[i,x,y,r,c]of[[0,.2,.3,.6,'60,90,200'],[1,.75,.65,.7,'160,70,200'],[2,.5,.9,.5,'40,160,170']]){const M=1.4,px=((x*W-cam.x*.03*(i+1))%(W*M)+W*M)%(W*M)-W*.2,py=((y*H-cam.y*.03*(i+1))%(H*M)+H*M)%(H*M)-H*.2,R=Math.max(W,H)*r;if(!isFinite(px+py+R))continue;const q=g.createRadialGradient(px,py,0,px,py,R);q.addColorStop(0,'rgba('+c+',.06)');q.addColorStop(1,'rgba('+c+',0)');g.fillStyle=q;g.fillRect(-ext,-ext,W+ext*2,H+ext*2)}
 const P=900,live=state==='play'||state==='warp'||state==='ship'||state==='menu',hy=live?SV.hy:0;
 g.fillStyle='rgb(200,225,255)';g.strokeStyle='rgb(200,225,255)';g.lineCap='round';
 layers.forEach((L,i)=>{const f=live?(L.f+(1-L.f)*hy)*zs()/.7:0,ax=live?SA[i].x:cam.x*L.f,ay=live?SA[i].y:cam.y*L.f,tl=live?(.03+.035*hy)*(WARPST?.45:1):0,sx=SV.x*f*tl,sy=SV.y*f*tl,len=Math.hypot(sx,sy),pad=len+3+ext,ox=-((ax%P)+P)%P,oy=-((ay%P)+P)%P,ka=clamp((len-1.5)/8,0,1),st=ka>0;let sk=0;if(st)g.beginPath();
  for(let k=0;k<1;k++)for(let tx=ox-P+k*P/2-ext;tx<W+P+ext;tx+=P)for(let ty=oy-P+k*P*.37-ext;ty<H+P+ext;ty+=P)for(const s of L.s){const x=tx+s.x,y=ty+s.y;if(x>-pad&&x<W+pad&&y>-pad&&y<H+pad){
   if(st&&!(WARPST&&(sk++%3))){g.moveTo(x,y);g.lineTo(x+sx,y+sy)}if(ka<1){g.globalAlpha=SM*(1-ka)*(.2+L.f*.45)*(.65+.35*Math.sin(time*2+s.x*.13+s.y));g.fillRect(x,y,s.r,s.r)}}}
  if(st){g.globalAlpha=SM*ka*(.3+L.f*.4);g.lineWidth=1+i*.4;g.stroke()}});
 g.globalAlpha=1;g.lineCap='butt';if(rot)g.restore()}

/* ---- Hangar y HUD ---- */
function drawHangar(){cam.x=time*40;cam.y=0;g.fillStyle='#05070d';g.fillRect(0,0,W,H);stars();
 const ph=($('hangar').offsetHeight||250)*(CFG.ui||1),y0=62*(CFG.ui||1),hh=Math.max(60,H-ph-8-y0),cx=W/2,sc=Math.min(6,(hh-16)/52,W/90),cy=y0+hh/2-sc*4,fy=cy+sc*26;
 const fl=g.createLinearGradient(0,fy,0,H);fl.addColorStop(0,'rgba(20,50,80,.55)');fl.addColorStop(1,'rgba(5,10,20,.9)');g.fillStyle=fl;g.fillRect(0,fy,W,H-fy);
 g.strokeStyle='rgba(79,209,255,.16)';g.lineWidth=1;for(let i=-10;i<=10;i++){g.beginPath();g.moveTo(cx+i*30,fy);g.lineTo(cx+i*140,H);g.stroke()}for(let j=1;j<7;j++){const y=fy+(H-fy)*j*j/49;g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke()}
 const sp=g.createRadialGradient(cx,cy,0,cx,cy,sc*45);sp.addColorStop(0,T.col+'40');sp.addColorStop(1,T.col+'00');g.fillStyle=sp;g.fillRect(cx-sc*45,cy-sc*45,sc*90,sc*90);
 g.strokeStyle=T.col;g.globalAlpha=.5;g.lineWidth=2;g.setLineDash([14,10]);g.lineDashOffset=-time*30;g.beginPath();g.ellipse(cx,fy,sc*34,sc*7,0,0,TAU);g.stroke();g.setLineDash([]);g.globalAlpha=1;
 {const t=clamp((time-hgT)/2,0,1),e=1-Math.pow(1-t,3),a=-Math.PI/2+Math.sin(time*.8)*.12*e+(1-e)*Math.PI/2;
  drawS(cx-(1-e)*W*.75,cy-(1-e)*H*.25,a,T.sh,T.col,sc*(.55+.45*e),{...pst(),th:t<1?.9-.75*e:.15});
  if(t<1){g.globalCompositeOperation='lighter';const sg=g.createRadialGradient(cx,fy,0,cx,fy,sc*50);sg.addColorStop(0,'rgba(125,255,155,'+.5*e+')');sg.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=sg;g.fillRect(cx-sc*50,fy-sc*50,sc*100,sc*100);g.globalCompositeOperation='source-over'}
  const dr=clamp(1-(time-hgT)/.6,0,1);if(dr>0){const w=W/2*dr;g.fillStyle='#070d18';g.fillRect(0,0,w,H);g.fillRect(W-w,0,w,H);g.fillStyle='rgba(79,209,255,'+dr+')';g.fillRect(w-3,0,3,H);g.fillRect(W-w,0,3,H)}}
 {const u=CFG.ui||1;vHud(()=>{txt(T.n.toUpperCase()+' — '+T.r,W/2,(cy-sc*26-8)/u,T.col,'center',14)})}}
function drawHeat(){if(!(T.wp==='laser'&&WOWN.laser))return;const w=Math.min(140,W*.3),x=W/2-w/2,y=12,h=ship.heat||0;g.fillStyle='rgba(10,20,35,.75)';g.fillRect(x,y,w,8);g.fillStyle=ship.ovh?'#ff4d4d':h>70?'#ffb347':'#ff7ad9';g.fillRect(x,y,w*clamp(h/100,0,1),8);g.strokeStyle='rgba(255,122,217,.5)';g.strokeRect(x,y,w,8);txt(ship.ovh?'LÁSER SOBRECALENTADO':'LÁSER',W/2,y+20,'#ff7ad9','center',9)}
function vHud(f){const u=CFG.ui||1;if(u===1)return f();const W0=W,H0=H,S0=SAFE,m0=mouse,z0=zoom;zoom=z0/u;W=W0/u;H=H0/u;SAFE={t:S0.t/u,r:S0.r/u,b:S0.b/u,l:S0.l/u};mouse=m0&&{x:m0.x/u,y:m0.y/u};g.save();g.scale(u,u);try{return f()}finally{g.restore();zoom=z0;W=W0;H=H0;SAFE=S0;mouse=m0}}
function mmR(){const u=CFG.ui||1;let m;vHud(()=>{m=mm()});return{x:m.x*u,y:m.y*u,w:m.w*u,h:m.h*u,r:m.r}}
function hud(){vHud(hud1);mpHud()}
function hud1(){if(ship.wreck){drawMini();wmTxt();$('qp').classList.add('hide');return}gevHud();evHud();trlHud();const x=14+SAFE.l,bw=Math.min(190,W*.36);drawMini();drawHI();
 const LZH=T.wp==='laser'&&WOWN.laser,b=(y,v,m,c,l)=>{const hv=mouse&&state==='play'&&mouse.x>=x&&mouse.x<=x+bw+90&&mouse.y>=y-3&&mouse.y<=y+12;g.fillStyle='rgba(8,16,28,.7)';g.fillRect(x,y,bw,9);g.fillStyle=c;g.fillRect(x,y,bw*clamp(v/m,0,1),9);g.strokeStyle='rgba(120,200,255,.45)';g.lineWidth=1;g.strokeRect(x+.5,y+.5,bw,9);if(hv){g.strokeStyle='rgba(255,255,255,.8)';g.strokeRect(x-1.5,y-1.5,bw+3,12)}txt(l+(hv?' '+Math.round(v)+'/'+Math.round(m):''),x+bw+7,y+9,hv?'#fff':'rgba(207,232,255,.7)','left',hv?11:10)};
 b(44,ship.hull,T.hull,'#ff6b6b','CASCO');b(60,ship.shd,T.shd,'#4fd1ff','ESCUDO');b(76,ship.en,100,ship.en>=50?'#7dff9b':'#ffd166','ENERGÍA');
 if(LZH){const h=ship.heat||0;b(92,h,100,ship.ovh?'#ff4d4d':h>70?'#ffb347':'#ff7ad9',ship.ovh?'LÁSER SOBRECALENTADO':'LÁSER')}
 const EHB=T.sh==='e'&&((ship.eh||0)>.5||ship.ehR>0);if(EHB){const rs=ship.ehR>0,h=ship.eh||0;b(92,rs?ship.ehR:h,rs?EHT.rest:100,rs?'#ff4d4d':h>70?'#ffb347':'#ff9a4f',rs?'MOTORES EN REPOSO '+Math.ceil(ship.ehR)+'s':'MOTORES')}
 let y=(LZH?122:106)+(EHB?16:0);const L=(t,c)=>{txt(t,x,y,c,'left',12);y+=16};
 if(ship.ore>.5||ship.scrap)L('CARGA '+Math.floor(ship.ore)+'/'+T.cargo+(ship.scrap?' · CHATARRA '+ship.scrap:''),'#cfe8ff');
 if(Object.values(ship.parts).some(q=>q<=0))L('SISTEMA DAÑADO · [N]','#ff6b6b');
 if(ship.dest&&!ship.dest.auto)L('RUMBO · '+km(dist(ship,ship.dest)),'#7dff9b');
 L('VEL '+Math.round(Math.hypot(ship.vx,ship.vy))+' · ACELERADOR '+Math.round((ship.thr||1)*100)+'%'+(ship.ovd?' · SOBRECARGA (gasta energía)':''),ship.ovd?'#ff9a4f':'#9fc8e8');
 rq.forEach(j=>L('⚙ '+NM[j.k]+' '+Math.floor(j.t/j.tot*100)+'%','#c792ff'));
 if(ship.docked)txt('ATRACADO · '+ship.docked.n.toUpperCase(),W/2,H<520?H-74:H-40,'#7dff9b','center',14);
 if(ship.rep>0){const ry=H<520?H-100:H-70;g.fillStyle='#c792ff';g.fillRect(W/2-50,ry,100*ship.rep,6);g.strokeStyle='#c792ff';g.strokeRect(W/2-50,ry,100,6)}
 if(ship.wreck){wmTxt();return}if(ship.dead>0)txt('NAVE INUTILIZADA',W/2,H/2,'#ff6b6b','center',22);qHud(y)}

/* ===== Explorador: calor de motores y estelas ===== */
const EHT={heat:20,cool:30,rest:25,ramp:.86,from:1.8,slide:.14}; /* slide: frenado por segundo con los motores apagados (menor = se desliza más lejos) */ /* s para sobrecalentar a tope · s para enfriar · reposo · cuánto se frena la aceleración al subir hacia el máximo */
const hexMix=(a,b,t)=>{const p=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)),A=p(a),B=p(b);return 'rgb('+A.map((v,i)=>Math.round(v+(B[i]-v)*clamp(t,0,1))).join(',')+')'};
const heatCol=()=>T.sh==='e'&&((ship.eh||0)>0||ship.ehR>0)?hexMix(T.col,'#ff2a1a',ship.ehR>0?1:ship.eh/100):T.col;
function engHeat(dt,mxB){if(T.sh!=='e'||ship.dead>0){ship.eh=0;ship.ehR=0;ship.ft=[];return}
 if(ship.ehR>0){ship.ehR-=dt;ship.dest=null;ship.brake=0;ship.ft=(ship.ft||[]).filter(q=>(q.t+=dt)<1.3);{const sp=Math.hypot(ship.vx,ship.vy),f=sp<8?0:Math.exp(-EHT.slide*dt);ship.vx*=f;ship.vy*=f}if(ship.ehR<=0){ship.ehR=0;ship.eh=0;toast('Motores operativos de nuevo')}return}
 const tm=tmx(),spd=Math.hypot(ship.vx,ship.vy),r=spd/Math.max(1,mxB),pw=ship.thr||1,pwOn=!!ship.dest&&pw>=EHT.from-.001,hf=pwOn?.04+.96*clamp((pw-EHT.from)/(tm-EHT.from),0,1):0;
 ship.eh=hf>0?Math.min(100,(ship.eh||0)+100/EHT.heat*hf*dt):Math.max(0,(ship.eh||0)-100/EHT.cool*dt);
 if(ship.eh>=100){ship.ehR=EHT.rest;ship.dest=null;ship.thr=1;thrUI();toast('⚠ Motores sobrecalentados: se apagan '+EHT.rest+' s');boom(ship.x,ship.y,14,'#ff6b3a');return}
 const sm=u=>u*u*(3-2*u),km=sm(clamp((r-2)/(tm-2),0,1)),k=spd>30?.05*clamp(r-1,0,1)+.95*km:0,kw=sm(clamp((r-(tm-.4))/.4,0,1));
 ship.ft=(ship.ft||[]).filter(q=>(q.t+=dt)<1.3);ship.fk=k>.01?k:0;if(k>.01)ship.ft.push({x:ship.x,y:ship.y,a:ship.a,k,kw,t:0})}
function fxTrail(){if(warp||T.sh!=='e'||!ship.ft||ship.ft.length<2)return;const l0=ship.ft[ship.ft.length-1],P=l0.t<.2?ship.ft.concat([{x:ship.x,y:ship.y,a:ship.a,k:l0.k,t:0}]):ship.ft,L=1.3,n=P.length,hd=P[n-1],tl=P[0];g.save();g.lineJoin='round';
 /* cinta fina que se afila hacia atrás: halo suave + núcleo claro, sin mezcla aditiva */
 for(const[wd,al,col]of[[2.6,.09,'120,210,255'],[1.8,.13,'120,210,255'],[1.1,.2,'140,220,255'],[.45,.9,'240,252,255']]){const up=[],dn=[];
  for(const q of P){const f=Math.max(0,1-q.t/L),hw=(3.6+7*q.k)*f*Math.sqrt(f)*wd*(.3+.7*Math.min(1,q.t/.16)**.8),nx=-Math.sin(q.a),ny=Math.cos(q.a),bx=q.x-Math.cos(q.a)*7,by=q.y-Math.sin(q.a)*7;up.push([bx+nx*hw,by+ny*hw]);dn.push([bx-nx*hw,by-ny*hw])}
  const x0=hd.x-Math.cos(hd.a)*7,y0=hd.y-Math.sin(hd.a)*7,x1=tl.x-Math.cos(tl.a)*7,y1=tl.y-Math.sin(tl.a)*7,gr=g.createLinearGradient(x0,y0,x1,y1),a0=al*Math.min(1,.35+hd.k);
  gr.addColorStop(0,'rgba('+col+','+a0+')');gr.addColorStop(1,'rgba('+col+',0)');
  g.beginPath();g.moveTo(up[0][0],up[0][1]);for(let i=1;i<n;i++)g.lineTo(up[i][0],up[i][1]);for(let i=n-1;i>=0;i--)g.lineTo(dn[i][0],dn[i][1]);g.closePath();g.fillStyle=gr;g.fill()}
 g.restore()}
function heatGlow(zs){if(T.sh!=='e')return;const ov=ship.ehR>0,h=ov?1:(ship.eh||0)/100,a=clamp((h-.2)/.8,0,1);if(a<=0)return;zs=zs||zoom;const c=Math.cos(ship.a),sn=Math.sin(ship.a),pu=.9+.1*Math.sin(time*7),
 r1=Math.max(18+14*h,(26+30*h)/zs),r2=Math.max(46+30*h,(80+90*h)/zs);/* el radio no baja de un mínimo en pantalla: se ve brillar aunque te alejes */
 g.save();g.globalCompositeOperation='lighter';
 for(const[r,al]of[[r2,.22],[r1,.55]]){const z=g.createRadialGradient(ship.x,ship.y,0,ship.x,ship.y,r);z.addColorStop(0,'rgba(255,90,50,'+al*a*pu+')');z.addColorStop(.45,'rgba(255,50,30,'+al*.45*a*pu+')');z.addColorStop(1,'rgba(255,30,20,0)');g.fillStyle=z;g.fillRect(ship.x-r,ship.y-r,r*2,r*2)}
 g.restore();
 if(ov&&Math.random()<.3)parts.push({x:ship.x-c*13,y:ship.y-sn*13,vx:rnd(-12,12)-c*10,vy:rnd(-12,12)-sn*10,life:.9,max:.9,c:'rgba(130,135,150,.55)'})}
/* ===== Acelerador, freno e inercia ===== */
const tmx=()=>({3:3,4:1.75})[TYPES.indexOf(T)]||1.5,thrY=v=>{const tm=tmx();return 170-9-(clamp(v,.1,tm)-.1)/(tm-.1)*152};
const DK=['bPause','bMap','bHan','bShip','bTg','bInv','bEsc'];let dkS='';
function dockUI(){const vs=DK.filter(i=>!$(i).classList.contains('hide')),v=vs.join()+innerWidth+'x'+innerHeight;if(v===dkS)return;dkS=v;const cl={};for(const i of vs){const e=$(i),r=getComputedStyle(e).right;(cl[r]=cl[r]||[]).push(e)}
 for(const r in cl){let y=10;for(const e of cl[r]){e.style.bottom=y+'px';y+=(e.offsetHeight||40)+6}}}
function thrUI(){const t=Math.round((ship.thr||1)*100),e=$('thrV');e.textContent=t+'%';e.style.color=t>100?'#ff9a4f':'#cfe8ff';$('thrK').style.top=(thrY(ship.thr||1)-9)+'px';$('thrM').style.top=thrY(1)+'px';$('thrK').style.background=t>100?'#ff9a4f':'#4fd1ff'}
window.thrReady=1;
function thrSet(d){if(ship.dead)return;ship.thr=clamp(Math.round(((ship.thr||1)+d)*10)/10,.1,tmx());thrUI();if(ship.thr>1)toast('Sobrecarga: más velocidad, gasta energía')}
function brakeNow(){if(ship.dead)return;ship.dest=null;ship.orbit=null;ship.mt=null;ship.brake=1;hold=0;toast('Frenando…')}
{const L=$('thrL'),mv=e=>{const r=L.getBoundingClientRect(),pv=ship.thr||1,f=clamp(((r.bottom-e.clientY)/(CFG.ui||1)-9)/152,0,1);{const tm=tmx();ship.thr=clamp(Math.round((.1+f*(tm-.1))*10)/10,.1,tm)}thrUI();if(ship.thr>1&&pv<=1)toast('Sobrecarga: más velocidad, gasta energía')};L.addEventListener('pointerdown',e=>{L.setPointerCapture(e.pointerId);L._d=1;mv(e);e.preventDefault()});L.addEventListener('pointermove',e=>{if(L._d)mv(e)});L.addEventListener('pointerup',()=>{L._d=0});L.addEventListener('pointercancel',()=>{L._d=0})}thrUI();
/* ===== Zonas libres e irregulares, aviso de disparos, cámara de nave ===== */
const blobPath=(cx,cy,r,sd)=>{g.beginPath();for(let i=0;i<=72;i++){const a=i/72*TAU,k=1+.17*(Math.sin(a*2+sd)*.5+Math.sin(a*3+sd*1.7)*.3+Math.sin(a*5+sd*.7)*.2),x=cx+Math.cos(a)*r*k,y=cy+Math.sin(a)*r*k;i?g.lineTo(x,y):g.moveTo(x,y)}g.closePath()};
function drawZones(){for(const F of FIELDS){if(!(F.ring?Math.abs(Math.hypot(VX,VY)-F.rr(Math.atan2(VY,VX)))<VRd+3000:vis(F.x,F.y,F.r+200)))continue;fPoly(F,x=>x,y=>y);g.fillStyle='rgba('+F.col+',.11)';g.fill('evenodd');g.strokeStyle='rgba('+F.col+',.42)';g.lineWidth=4/zoom;g.stroke()}
 for(const[o,r,c]of[[A,C.safeR,'79,209,255'],[B,1500,'255,100,80']]){const q=g.createRadialGradient(o.x,o.y,r*.3,o.x,o.y,r*1.2);q.addColorStop(0,'rgba('+c+',0)');q.addColorStop(.8,'rgba('+c+',.035)');q.addColorStop(1,'rgba('+c+',.09)');blobPath(o.x,o.y,r,o.x*.0013+o.y*.0007);g.fillStyle=q;g.fill()}}
const HI=[];
function hitInd(b){const o=b.o;if(!o||o===ship)return;const h=HI.find(q=>q.o===o);if(h)h.t=time+2.5;else HI.push({o,t:time+2.5})}
function drawHI(){for(let i=HI.length-1;i>=0;i--){const h=HI[i],o=h.o,k=(h.t-time)/2.5;if(k<=0||!npcs.includes(o)){HI.splice(i,1);continue}
 const dx=(o.x-cam.x)*zoom,dy=(o.y-cam.y)*zoom,hw=W/2-34,hh=H/2-34;if(Math.abs(dx)<hw+20&&Math.abs(dy)<hh+20)continue;
 const t=Math.min(hw/Math.max(Math.abs(dx),1e-3),hh/Math.max(Math.abs(dy),1e-3)),px=W/2+dx*t,py=H/2+dy*t;
 g.save();g.translate(px,py);g.rotate(Math.atan2(dy,dx));g.globalAlpha=clamp(k*1.6,0,1)*(.7+.3*Math.sin(time*14));g.fillStyle='#ff4d4d';poly([[18,0],[-8,-12],[-3,0],[-8,12]]);g.fill();g.restore()}g.globalAlpha=1}
let shT=1,shDir=1,shHitT=-9,shHitA=0;
function shipAnim(dt){shT=clamp(shT+shDir*dt/.85,0,1);const p=$('shipP').style;p.opacity=clamp((shT-.7)/.3,0,1);p.pointerEvents=shT<1?'none':'auto';if(shDir<0&&shT<=0){shDir=1;p.opacity=1;p.pointerEvents='auto';setState(prevS)}}
function shipView(){if(shT>=1){drawShip();return}
 const e=shT*shT*(3-2*shT),nar=W<720,pw=nar?0:Math.min(390,W),aw=W-pw,ah=nar?H*.5:H,cx=aw/2,cy=nar?ah/2+34:H/2,sc=Math.max(1.5,Math.min(7,aw/84,(ah-70)/84)),
  z=zoom+(sc/1.1-zoom)*e,Px=W/2+(cx-W/2)*e,Py=H/2+(cy-H/2)*e,rot=angDiff(ship.a,-Math.PI/2)*e,z0=zoom,c0={x:cam.x,y:cam.y};
 zoom=z;cam.x=ship.x;cam.y=ship.y;VR=rot;VPx=Px;VPy=Py;drawWorld();
 g.fillStyle='rgba(4,6,12,'+.92*e+')';g.fillRect(0,0,W,H);
 SM=.92*e;stars();SM=1;
 zoom=z0;cam.x=c0.x;cam.y=c0.y;VR=0;VPx=0;VPy=0;
 drawS(Px,Py,ship.a+rot,T.sh,T.col,z*1.1,pst())}

