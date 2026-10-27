/* ============================================================================
   core/save.js — Guardado: saveGame, loadGame y borrado de datos.
   (Trozo de la antigua pieza única de index.html. Se carga como script clásico en orden:
   comparte el ámbito global con el resto de js/. NO cambies el orden de carga en index.html.)
   ========================================================================== */
"use strict";
const SAVE=SAVEK,wipe=()=>{for(const k of['starbound2d_save_v1','starbound2d_save_v2','starbound2d_cfg',SAVEK])try{localStorage.removeItem(k)}catch(e){}};
function saveGame(){if(noSave||(ship.dead>0&&!ship.wreck)||state==='warp')return;try{localStorage.setItem(SAVE,JSON.stringify({v:1,seed:SEED,lay:LEG?1:2,ti:TYPES.indexOf(T),T:TYPES,s:{x:ship.x,y:ship.y,a:ship.a,hull:ship.hull,shd:ship.shd,en:ship.en,ore:ship.ore,inv:ship.inv,cred:ship.cred,scrap:ship.scrap,cm:ship.cm,sp:ship.sp||{},eh:ship.eh||0,ehR:ship.ehR||0,parts:ship.parts,wreck:ship.wreck?1:0,dead:ship.wreck?1e9:0,wp:ship.wp||0},dk:RGH(r=>r.dk(ship.docked))??BASES.indexOf(ship.docked),rg:RGH(r=>r.save()),rq,mo:mode,st:STORE,wo:WOWN,ex:EX,cx:CXD,fd:ANOM.map(o=>o.found?1:0),q:qSave()}))}catch(e){}}
function loadGame(){let d=null;try{d=JSON.parse(localStorage.getItem(SAVE))}catch(e){}
  if(!d||d.v!==1||!Array.isArray(d.T)||d.T.length!==TYPES.length){setState('hangar');return}
  try{d.T.forEach((t,i)=>Object.assign(TYPES[i],t));if(d.wo)Object.assign(WOWN,d.wo);renderCards();pickType(clamp(d.ti|0,0,TYPES.length-1),true);Object.assign(ship,d.s);STORE=d.st||{};if(d.cx&&typeof d.cx==='object')for(const k in CXT)if(d.cx[k]&&(d.cx[k].o|0)>0)CXD[k]={o:d.cx[k].o|0,k:Math.max(1,d.cx[k].k|0)};if(d.mo){mode=d.mo;buildModes()}ship.docked=d.dk>=0?BASES[d.dk]:null;window.__RGS=d.rg;RGH(r=>r.load(d.rg));rq=d.rq||[];EX=d.ex||[];EXS.clear();for(let i=0;i<EX.length;i+=2)EXS.add(ck(EX[i],EX[i+1]));(d.fd||[]).forEach((f,i)=>{if(ANOM[i]&&f)ANOM[i].found=1});qLoad(d.q);cam.x=ship.x;cam.y=ship.y}catch(e){console.warn(e)}
  if(ship.wreck){ship.dead=1e9;ship.vx=ship.vy=0;ship.docked=null}setState(ship.docked?'hangar':'play');if(ship.wreck){wkOpen();toast('Tu nave sigue inutilizada: pide ayuda')}else if(state==='play')toast('Partida cargada')}
$('bRst').onclick=()=>{if(confirm('¿Borrar todos los datos guardados?')){noSave=1;wipe();try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}location.reload()}};
