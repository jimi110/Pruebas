/* ============================================================================
   systems/implosion.js — Presión exterior, fundición de lingotes y refuerzos de casco.
   ----------------------------------------------------------------------------
   · Lore: el aro de asteroides de Alfa amortigua la presión. Todo lo que queda fuera del aro (el resto del
     universo) tiene una presión mucho más alta: un casco sin reforzar implosiona. No se dibuja nada en el
     mapa: solo hay un aviso al acercarse al aro y una cuenta atrás al salir.
   · Los lingotes (fundidos en Estación Umbral desde la pestaña ECONOMÍA, ver basehub.js) se guardan por tipo en
     el almacén común de todas las bases (QX.ig); aquí solo se gastan.
   · Refuerzos: en el apartado CASCO de Ingeniería, al final, estando atracado en Base Omega (+100 de
     resistencia, 30 lingotes + 3000 cr, uno por nave; la flota, más barata). Un salto hacia fuera sin refuerzo
     se corta en el límite del aro.
   · Se carga como script clásico tras quests.js y comparte el ámbito global. No se ejecuta en multijugador.
   ========================================================================== */
"use strict";
const IMPIN=1500,IMPT=7,IMPH={l:30,c:3000},IMPF={l:8,c:400},IMPK=['pt','ti','ir','ne'];
const impRing=()=>FIELDS.find(q=>q.ring),impE=a=>{const F=impRing();return F?F.rr(a)+RINGW*1.25:0};
function impLv(x,y){const e=impE(Math.atan2(y,x));if(!e)return 0;const r=Math.hypot(x,y);return r<e-600?0:r<e+IMPIN?1:2}   // 0 aro/Alfa · 1 aviso (borde del aro) · 2 presión exterior: todo lo de fuera
const impAllies=()=>wing.filter(w=>w.own&&w.hp>0);
const IMPS={t:0,ov:null,h:null},impSt=()=>BASES.find(b=>b.n==='Estación Umbral');
function impOv(h,hot){let el=IMPS.ov;if(!el){el=IMPS.ov=document.createElement('div');el.id='impW';
  el.style.cssText='position:fixed;left:50%;top:calc(96px + env(safe-area-inset-top));transform:translateX(-50%);z-index:38;pointer-events:none;display:none;text-align:center;font:12px ui-monospace,Menlo,monospace;color:#ffd9d2;background:rgba(40,6,8,.86);border:1px solid #ff4a3a;padding:8px 14px;max-width:min(420px,70%)';document.body.appendChild(el)}
  if(IMPS.h!==h){IMPS.h=h;el.innerHTML=h;el.style.display=h?'block':'none'}el.style.opacity=h&&hot?(.65+.35*Math.sin(performance.now()/110)):1}
function impWarp(){const w=warp;if(!w||w._imp||!w.a||!w.dest)return;w._imp=1;
  if(T.imp&&impAllies().every(q=>q.imp))return;const A=w.a,D=w.dest;if(Math.hypot(D.x,D.y)<=Math.hypot(A.x,A.y))return;   // solo se corta al salir hacia fuera
  let hit=0;for(let i=1;i<=400;i++){const t=i/400;if(impLv(A.x+(D.x-A.x)*t,A.y+(D.y-A.y)*t)===2){hit=i;break}}
  if(hit<=1)return;const t=(hit-1)/400,tx=A.x+(D.x-A.x)*t,ty=A.y+(D.y-A.y)*t,d=Math.hypot(tx-A.x,ty-A.y);
  w.dest.x=tx;w.dest.y=ty;w.dest.n='Límite del aro de Alfa';w.h=Math.atan2(ty-A.y,tx-A.x);w.te=2.5+Math.max(1.2,d/12000)/wspV();
  toast('⚠ El salto se corta en el límite del aro de Alfa: fuera la presión destruiría tu casco (o el de tu flota) sin reforzar')}
function impUpd(dt){
  if(MPG||!impRing())return;
  if(state==='warp'){impWarp();return}
  if(state!=='play'||ship.docked||ship.dead>0||ship.wreck){impOv('');return}
  const lv=impLv(ship.x,ship.y),pr=!!T.imp,ally=impAllies();
  for(const w of ally){if(impLv(w.x,w.y)===2&&!w.imp){w.it=(w.it||0)+dt;if(w.it>IMPT){w.hp=0;boom(w.x,w.y,22,'#ff6a4a');toast('💥 '+w.n+' implosiona: su casco no estaba reforzado')}}else if(w.it)w.it=Math.max(0,w.it-2*dt)}
  if(lv===2&&!pr){IMPS.t+=dt;if(IMPS.t>=IMPT){IMPS.t=0;ship.hull=0;boom(ship.x,ship.y,40,'#ff6a4a');toast('💥 Implosión: tu casco no resistió la presión')}}else IMPS.t=Math.max(0,IMPS.t-2*dt);
  const un=ally.filter(w=>!w.imp).length,H=(a,b)=>`<b style="display:block;color:#ff6a5a;font-size:13px;letter-spacing:.1em">${a}</b><span style="font-size:11px">${b}</span>`;
  let m='';
  if(lv>=1&&!pr)m=lv===2?H('⚠ IMPLOSIÓN INMINENTE',Math.max(0,Math.ceil(IMPT-IMPS.t))+' s · vuelve dentro del aro de Alfa'):H('⚠ PELIGRO DE IMPLOSIÓN','Fuera del aro de Alfa la presión es mucho mayor y tu casco no la resiste. Da la vuelta.');
  else if(lv>=1&&un)m=H('⚠ FLOTA SIN REFORZAR',un+' nave'+(un>1?'s':'')+' implosionará'+(un>1?'n':'')+' en la zona exterior');
  impOv(m,lv===2&&!pr)}
/* ---------- fundición y refuerzos ---------- */
function impAct(a){const d=ship.docked;if(!d)return;const isOm=d.n===OM.n;
  if(a==='hull'){if(!isOm)return toast('El refuerzo solo se vende en Base Omega');if(T.imp)return;
    if(ingTot()<IMPH.l)return toast('Faltan lingotes: necesitas '+IMPH.l);if(ship.cred<IMPH.c)return toast('Créditos insuficientes: '+IMPH.c+' cr');
    ingSpend(IMPH.l);ship.cred-=IMPH.c;T.imp=1;T.hull+=100;ship.hull=Math.min(T.hull,ship.hull+100);QX.hu=(QX.hu|0)+1;toast('✔ Casco reforzado: +100 de resistencia y a salvo de la implosión')}
  else if(a==='fleet'){if(!isOm)return toast('El refuerzo solo se vende en Base Omega');const f=impAllies().filter(w=>!w.imp);if(!f.length)return;
    const l=f.length*IMPF.l,c=f.length*IMPF.c;if(ingTot()<l)return toast('Faltan lingotes: necesitas '+l);if(ship.cred<c)return toast('Créditos insuficientes: '+c+' cr');
    ingSpend(l);ship.cred-=c;for(const w of f){w.imp=1;w.max+=100;w.hp=Math.min(w.max,w.hp+100)}toast('✔ Flota reforzada ('+f.length+' nave'+(f.length>1?'s':'')+')')}
  saveGame();if(state==='ship'){try{renderShip()}catch(e){}}}
function impHullCard(){if(MPG)return'';const d=ship.docked,isOm=!!d&&d.n===OM.n,f=impAllies().filter(w=>!w.imp),all=impAllies().length,ing=ingTot(),okH=ing>=IMPH.l&&ship.cred>=IMPH.c,lf=f.length*IMPF.l,cf=f.length*IMPF.c,okF=ing>=lf&&ship.cred>=cf;
  let h=`<div class=card2 style="border-color:#7de3ff"><b style="color:#7de3ff">REFUERZO ANTI-IMPLOSIÓN</b><div class=dim style="margin:6px 0">Fuera del aro de Alfa la presión es altísima. Este refuerzo suma +100 de resistencia al casco y permite salir. Una vez por nave.</div>${kv('Lingotes en almacén',ing)}`;
  if(T.imp)h+='<div style="color:#7dff9b;margin-top:6px">✔ Esta nave ya está reforzada.</div>';
  else h+=kv('Coste',IMPH.l+' lingotes + '+IMPH.c+' cr',okH?'':'#ff6b6b')+(isOm?sq('Comprar refuerzo de casco','data-imp="hull"'+(okH?'':' disabled'),'width:100%;margin-top:8px'):`<div class=dim style="margin-top:6px">Se compra en Base Omega${d?' (no en '+d.n+')':''}.</div>`);
  h+=`<div style="border-top:1px solid #1d3550;margin:12px 0 8px"></div><b>Flota</b>`;
  if(!all)h+='<div class=dim style="margin-top:4px">No tienes naves en tu flota.</div>';
  else if(!f.length)h+='<div style="color:#7dff9b;margin-top:4px">✔ Toda tu flota está reforzada.</div>';
  else h+=kv(f.length+' nave'+(f.length>1?'s':'')+' sin reforzar',lf+' lingotes + '+cf+' cr',okF?'':'#ff6b6b')+(isOm?sq('Reforzar la flota','data-imp="fleet"'+(okF?'':' disabled'),'width:100%;margin-top:8px'):`<div class=dim style="margin-top:6px">Se compra en Base Omega${d?' (no en '+d.n+')':''}.</div>`);
  return h+'</div>'}
