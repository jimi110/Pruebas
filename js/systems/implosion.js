/* ============================================================================
   systems/implosion.js — Zona de implosión, fundición de lingotes y refuerzos de casco.
   ----------------------------------------------------------------------------
   · Más allá del aro de asteroides de Alfa (hasta la Nebulosa Zafiro) hay una franja donde un casco
     sin reforzar no resiste: aviso al acercarse y, dentro, cuenta atrás y explosión de la nave.
   · Fundición (cualquier base): convierte mineral raro (platino, titanio, iridio, neutronita) en lingotes.
   · Base Omega: refuerzo de casco (+100 de resistencia, 30 lingotes + 3000 cr, uno por nave) y refuerzo
     de la flota (más barato). Un salto hacia fuera sin refuerzo se corta en el límite de la zona.
   · Se carga como script clásico tras quests.js y comparte el ámbito global. No se ejecuta en multijugador.
   ========================================================================== */
"use strict";
const IMPIN=1500,IMPOUT=76000,IMPT=7,IMPH={l:30,c:3000},IMPF={l:8,c:400},IMPW={pt:1,ti:1,ir:2,ne:3},IMPK=Object.keys(IMPW);
const impRing=()=>FIELDS.find(q=>q.ring),impE=a=>{const F=impRing();return F?F.rr(a)+RINGW*1.25:0};
function impLv(x,y){const e=impE(Math.atan2(y,x));if(!e)return 0;const r=Math.hypot(x,y);return r<e-600||r>IMPOUT?0:r<e+IMPIN?1:2}   // 0 libre · 1 aviso · 2 zona de implosión
const impKeep=()=>qOn('c4.2')&&!qdn('c4.3'),impAllies=()=>wing.filter(w=>w.own&&w.hp>0);
const IMPS={t:0,ov:null,h:null};
function impOv(h,hot){let el=IMPS.ov;if(!el){el=IMPS.ov=document.createElement('div');el.id='impW';
  el.style.cssText='position:fixed;left:50%;top:calc(96px + env(safe-area-inset-top));transform:translateX(-50%);z-index:38;pointer-events:none;display:none;text-align:center;font:12px ui-monospace,Menlo,monospace;color:#ffd9d2;background:rgba(40,6,8,.86);border:1px solid #ff4a3a;padding:8px 14px;max-width:min(420px,70%)';document.body.appendChild(el)}
  if(IMPS.h!==h){IMPS.h=h;el.innerHTML=h;el.style.display=h?'block':'none'}el.style.opacity=h&&hot?(.65+.35*Math.sin(performance.now()/110)):1}
function impWarp(){const w=warp;if(!w||w._imp||!w.a||!w.dest)return;w._imp=1;
  if(T.imp&&impAllies().every(q=>q.imp))return;const A=w.a,D=w.dest;if(Math.hypot(D.x,D.y)<=Math.hypot(A.x,A.y))return;   // solo se corta al salir hacia fuera
  let hit=0;for(let i=1;i<=400;i++){const t=i/400;if(impLv(A.x+(D.x-A.x)*t,A.y+(D.y-A.y)*t)===2){hit=i;break}}
  if(hit<=1)return;const t=(hit-1)/400,tx=A.x+(D.x-A.x)*t,ty=A.y+(D.y-A.y)*t,d=Math.hypot(tx-A.x,ty-A.y);
  w.dest.x=tx;w.dest.y=ty;w.dest.n='Límite de la zona de implosión';w.h=Math.atan2(ty-A.y,tx-A.x);w.te=2.5+Math.max(1.2,d/12000)/wspV();
  toast('⚠ El salto se corta en el límite de la zona de implosión: tu casco (o el de tu flota) no está reforzado')}
function impUpd(dt){
  if(MPG||!impRing())return;
  if(state==='warp'){impWarp();return}
  if(state!=='play'||ship.docked||ship.dead>0||ship.wreck){impOv('');return}
  const lv=impLv(ship.x,ship.y),pr=!!T.imp,ally=impAllies();
  for(const w of ally){if(impLv(w.x,w.y)===2&&!w.imp){w.it=(w.it||0)+dt;if(w.it>IMPT){w.hp=0;boom(w.x,w.y,22,'#ff6a4a');toast('💥 '+w.n+' implosiona: su casco no estaba reforzado')}}else if(w.it)w.it=Math.max(0,w.it-2*dt)}
  if(lv===2&&!pr){IMPS.t+=dt;if(IMPS.t>=IMPT){IMPS.t=0;ship.hull=0;boom(ship.x,ship.y,40,'#ff6a4a');toast('💥 Implosión: tu casco no resistió la presión')}}else IMPS.t=Math.max(0,IMPS.t-2*dt);
  const un=ally.filter(w=>!w.imp).length,H=(a,b)=>`<b style="display:block;color:#ff6a5a;font-size:13px;letter-spacing:.1em">${a}</b><span style="font-size:11px">${b}</span>`;
  let m='';
  if(lv>=1&&!pr)m=lv===2?H('⚠ IMPLOSIÓN INMINENTE',Math.max(0,Math.ceil(IMPT-IMPS.t))+' s · vuelve hacia el aro de Alfa'):H('⚠ PELIGRO DE IMPLOSIÓN','Más allá del aro tu casco no resiste. Da la vuelta.');
  else if(lv>=1&&un)m=H('⚠ FLOTA SIN REFORZAR',un+' nave'+(un>1?'s':'')+' implosionará'+(un>1?'n':'')+' en la zona exterior');
  impOv(m,lv===2&&!pr)}
/* ---------- fundición y refuerzos ---------- */
function impAct(a){const d=ship.docked;if(!d)return;const isOm=d.n===OM.n;
  if(a==='smelt'){let n=0,l=0;for(const k of IMPK){const q=Math.floor(ship.inv[k]||0);if(q<=0)continue;ship.inv[k]-=q;if(ship.inv[k]<.001)delete ship.inv[k];ship.ore=Math.max(0,(ship.ore||0)-q);n+=q;l+=q*IMPW[k]}
    if(!n)return toast('No llevas mineral raro (platino, titanio, iridio o neutronita)');QX.ing=(QX.ing|0)+l;QX.ingT=(QX.ingT|0)+l;toast('🔥 '+n+' minerales fundidos: +'+l+' lingotes')}
  else if(a==='hull'){if(!isOm)return toast('El refuerzo solo se vende en Base Omega');if(T.imp)return;
    if((QX.ing|0)<IMPH.l)return toast('Faltan lingotes: necesitas '+IMPH.l);if(ship.cred<IMPH.c)return toast('Créditos insuficientes: '+IMPH.c+' cr');
    QX.ing-=IMPH.l;ship.cred-=IMPH.c;T.imp=1;T.hull+=100;ship.hull=Math.min(T.hull,ship.hull+100);QX.hu=(QX.hu|0)+1;toast('✔ Casco reforzado: +100 de resistencia y a salvo de la implosión')}
  else if(a==='fleet'){if(!isOm)return toast('El refuerzo solo se vende en Base Omega');const f=impAllies().filter(w=>!w.imp);if(!f.length)return;
    const l=f.length*IMPF.l,c=f.length*IMPF.c;if((QX.ing|0)<l)return toast('Faltan lingotes: necesitas '+l);if(ship.cred<c)return toast('Créditos insuficientes: '+c+' cr');
    QX.ing-=l;ship.cred-=c;for(const w of f){w.imp=1;w.max+=100;w.hp=Math.min(w.max,w.hp+100)}toast('✔ Flota reforzada ('+f.length+' nave'+(f.length>1?'s':'')+')')}
  saveGame();if(state==='ship'){try{renderShip()}catch(e){}}}
function impCard(){const d=ship.docked;if(!d||MPG)return'';
  const inv=IMPK.map(k=>[k,Math.floor(ship.inv[k]||0)]).filter(q=>q[1]>0),pot=inv.reduce((s,q)=>s+q[1]*IMPW[q[0]],0),ing=QX.ing|0;
  let h=`<div class=card2 style="border-color:#ff9a4f"><b style="color:#ff9a4f">FUNDICIÓN</b><div class=dim style="margin:6px 0">Funde mineral raro en lingotes: platino ×1, titanio ×1, iridio ×2, neutronita ×3.</div>${kv('Lingotes',ing)}${kv('Mineral raro en bodega',inv.length?inv.map(q=>MIN[q[0]][0]+' '+q[1]).join(' · '):'—')}${sq('Fundir mineral raro'+(pot?' (+'+pot+' lingotes)':''),'data-imp="smelt"'+(pot?'':' disabled'),'width:100%;margin-top:8px')}</div>`;
  if(d.n===OM.n){const f=impAllies().filter(w=>!w.imp),all=impAllies().length;
    h+=`<div class=card2 style="border-color:#7de3ff"><b style="color:#7de3ff">REFUERZO ANTI-IMPLOSIÓN</b><div class=dim style="margin:6px 0">Permite cruzar la zona de implosión y suma +100 de resistencia al casco. Se compra una vez por nave.</div>`+
      (T.imp?'<div style="color:#7dff9b">✔ Esta nave ya está reforzada.</div>':kv('Coste',IMPH.l+' lingotes + '+IMPH.c+' cr',ing>=IMPH.l&&ship.cred>=IMPH.c?'':'#ff6b6b')+sq('Reforzar esta nave','data-imp="hull"'+(ing>=IMPH.l&&ship.cred>=IMPH.c?'':' disabled'),'width:100%;margin-top:8px'))+
      `<div style="border-top:1px solid #1d3550;margin:10px 0 8px"></div><b>Flota</b>`+
      (!all?'<div class=dim style="margin-top:4px">No tienes naves en tu flota.</div>':!f.length?'<div style="color:#7dff9b;margin-top:4px">✔ Toda tu flota está reforzada.</div>':kv(f.length+' nave'+(f.length>1?'s':'')+' sin reforzar',(f.length*IMPF.l)+' lingotes + '+(f.length*IMPF.c)+' cr',ing>=f.length*IMPF.l&&ship.cred>=f.length*IMPF.c?'':'#ff6b6b')+sq('Reforzar la flota','data-imp="fleet"'+(ing>=f.length*IMPF.l&&ship.cred>=f.length*IMPF.c?'':' disabled'),'width:100%;margin-top:8px'))+`</div>`}
  return h}
/* ---------- dibujo: mapa y mundo ---------- */
function impMap(X,Y,s){const F=impRing();if(!F||MPG)return;g.save();g.beginPath();
  for(let i=0;i<=120;i++){const a=i/120*TAU,r=impE(a)+IMPIN,x=X(Math.cos(a)*r),y=Y(Math.sin(a)*r);i?g.lineTo(x,y):g.moveTo(x,y)}g.closePath();
  g.moveTo(X(0)+IMPOUT*s,Y(0));g.arc(X(0),Y(0),IMPOUT*s,0,TAU);g.fillStyle='rgba(255,70,60,.07)';g.fill('evenodd');
  g.setLineDash([6,6]);g.lineWidth=1.2;g.strokeStyle='rgba(255,100,80,.55)';g.stroke();g.setLineDash([]);
  const x0=impE(0)+IMPIN;if((IMPOUT-x0)*s>70)txt('ZONA DE IMPLOSIÓN',X((x0+IMPOUT)/2),Y(0)+4,'rgba(255,120,100,.9)','center',10);g.restore()}
function impWorld(){const F=impRing();if(!F||MPG)return;const r0=Math.hypot(VX,VY),ca=Math.atan2(VY,VX),e0=impE(ca)+IMPIN;
  if(r0<e0-VRd-3000||r0>IMPOUT+VRd)return;const span=Math.min(Math.PI,VRd*1.4/Math.max(r0,2000)+.05),N=60,A=i=>ca-span+2*span*i/N;
  g.save();g.beginPath();for(let i=0;i<=N;i++){const a=A(i),r=impE(a)+IMPIN;i?g.lineTo(Math.cos(a)*r,Math.sin(a)*r):g.moveTo(Math.cos(a)*r,Math.sin(a)*r)}
  for(let i=N;i>=0;i--){const a=A(i),r=Math.min(IMPOUT,impE(a)+IMPIN+16000);g.lineTo(Math.cos(a)*r,Math.sin(a)*r)}
  g.closePath();g.fillStyle='rgba(255,60,50,.07)';g.fill();g.beginPath();
  for(let i=0;i<=N;i++){const a=A(i),r=impE(a)+IMPIN;i?g.lineTo(Math.cos(a)*r,Math.sin(a)*r):g.moveTo(Math.cos(a)*r,Math.sin(a)*r)}
  g.setLineDash([60/zoom,40/zoom]);g.lineWidth=3/zoom;g.strokeStyle='rgba(255,100,80,.65)';g.stroke();g.restore()}
