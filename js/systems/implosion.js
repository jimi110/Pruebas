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
  const ox=D.x,oy=D.y;w.dest.x=tx;w.dest.y=ty;w.dest.n='Límite del aro de Alfa';w.h=Math.atan2(ty-A.y,tx-A.x);w.te=2.5+Math.max(1.2,d/12000)/wspV();
  if(typeof wRetarget==='function')wRetarget(ox,oy,tx,ty);
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
/* ---------- refuerzos: se COMPRAN en MEJORAS (Base Omega) y se EQUIPAN en NAVE → Casco / FLOTA ---------- */
function impAct(a){const d=ship.docked;if(!d)return;const isOm=d.n===OM.n;
  if(a==='hull'){if(!isOm)return toast('El refuerzo solo se vende en Base Omega');if(T.imp||T.imq)return;
    if(ingTot()<IMPH.l)return toast('Faltan lingotes: necesitas '+IMPH.l);if(ship.cred<IMPH.c)return toast('Créditos insuficientes: '+IMPH.c+' cr');
    ingSpend(IMPH.l);ship.cred-=IMPH.c;T.imq=1;toast('Refuerzo comprado: equípalo en NAVE → Casco')}
  else if(a==='equip'){if(!T.imq||T.imp)return;T.imq=0;T.imp=1;T.hull+=100;ship.hull=Math.min(T.hull,ship.hull+100);QX.hu=(QX.hu|0)+1;toast('✔ Casco reforzado: +100 de resistencia y a salvo de la implosión')}
  else if(a==='kit'){if(!isOm)return toast('Los refuerzos de flota se venden en Base Omega');
    if(ingTot()<IMPF.l)return toast('Faltan lingotes: necesitas '+IMPF.l);if(ship.cred<IMPF.c)return toast('Créditos insuficientes: '+IMPF.c+' cr');
    ingSpend(IMPF.l);ship.cred-=IMPF.c;QX.fli=(QX.fli|0)+1;toast('Refuerzo de flota comprado: equípalo en FLOTA')}
  saveGame();if(state==='ship'){try{renderShip()}catch(e){}}}
/* tarjeta que se ve en NAVE → Casco: equipar el refuerzo comprado */
function impHullCard(){if(MPG)return'';
  let h=`<div class=card2 style="border-color:#7de3ff"><b style="color:#7de3ff">REFUERZO ANTI-IMPLOSIÓN</b><div class=dim style="margin:6px 0">Fuera del aro de Alfa la presión es altísima. Este refuerzo suma +100 de resistencia al casco y permite salir. Una vez por nave.</div>`;
  if(T.imp)h+='<div style="color:#7dff9b">✔ Equipado en esta nave.</div>';
  else if(T.imq)h+=sq('Equipar refuerzo','data-imp="equip"'+(ship.docked?'':' disabled'),'width:100%;margin-top:8px')+(ship.docked?'':'<div class=dim style="margin-top:4px">Atraca en una base para equiparlo.</div>');
  else h+='<div class=dim>No lo tienes: se compra en la pestaña MEJORAS de Base Omega (30 lingotes + 3000 cr).</div>';
  return h+'</div>'}
/* tienda que se ve en la pestaña MEJORAS */
function impStore(){if(MPG)return'';const d=ship.docked,isOm=!!d&&d.n===OM.n,ing=ingTot(),okH=ing>=IMPH.l&&ship.cred>=IMPH.c,okK=ing>=IMPF.l&&ship.cred>=IMPF.c;
  let h=`<div class=card2 style="border-color:#7de3ff"><b style="color:#7de3ff">REFUERZO ANTI-IMPLOSIÓN · esta nave</b><div class=dim style="margin:6px 0">+100 de resistencia y permite salir del aro de Alfa. Se compra aquí y se equipa en NAVE → Casco. Una vez por nave.</div>${kv('Lingotes en almacén',ing)}`;
  if(T.imp)h+='<div style="color:#7dff9b;margin-top:6px">✔ Ya equipado.</div>';else if(T.imq)h+='<div style="color:#7dff9b;margin-top:6px">✔ Comprado: equípalo en NAVE → Casco.</div>';
  else h+=kv('Coste',IMPH.l+' lingotes + '+IMPH.c+' cr',okH?'':'#ff6b6b')+(isOm?sq('Comprar refuerzo de casco','data-mk="up:hull"'+(okH?'':' disabled'),'width:100%;margin-top:8px'):'<div class=dim style="margin-top:6px">Se vende en Base Omega.</div>');
  h+=`</div><div class=card2 style="border-color:#7de3ff"><b style="color:#7de3ff">REFUERZO DE FLOTA</b><div class=dim style="margin:6px 0">Kit para una nave de tu flota (+100 de resistencia y a salvo de la implosión). Se equipa en la pestaña FLOTA.</div>${kv('Kits en inventario',QX.fli|0)}${kv('Coste por kit',IMPF.l+' lingotes + '+IMPF.c+' cr',okK?'':'#ff6b6b')}`+(isOm?sq('Comprar kit de flota','data-mk="up:kit"'+(okK?'':' disabled'),'width:100%;margin-top:8px'):'<div class=dim style="margin-top:6px">Se vende en Base Omega.</div>')+'</div>';
  return h}
