/* ============================================================================
   core/loop.js — Bucle principal, menú de inicio y ajustes de interfaz. (loop se arranca desde main.js)
   (Trozo de la antigua pieza única de index.html. Se carga como script clásico en orden:
   comparte el ámbito global con el resto de js/. NO cambies el orden de carga en index.html.)
   ========================================================================== */
"use strict";
let last=performance.now();
function loop(n){const dt=Math.min(.05,(n-last)/1000);last=n;time+=dt;
  for(const t of toasts)t.life-=dt;toasts=toasts.filter(t=>t.life>0);
  if(state==='menu')menuTick(dt);if(!wtOn&&(state==='play'||state==='map'||state==='ship'||state==='hangar'||state==='menu'||(state==='pause'&&MP.role)))upd(dt);else if(state==='warp'){updWarp(dt);for(const p of parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt}parts=parts.filter(p=>p.life>0);if(!warp||!warp.done)worldUpd(dt);else wingUpd(dt)}
  if(state==='ship')shipTick();if(state==='ship')shipAnim(dt);if(state==='play'||state==='warp'||state==='ship'||state==='menu')starTick(dt);render();audioTick();syncPP();dockUI();if(time-svT>4){svT=time;saveGame()}if(invT<time-.4&&!$('invP').classList.contains('hide')){invT=time;invRender()}requestAnimationFrame(loop)}
let mnuSp=0;
function menuTick(dt){ship.docked=null;ship.hull=ship.shd=1e6;ship.parts=fp();ship.en=100;ship.dead=0;ship.mt=ship.mc=null;
 const E=npcs.filter(n=>n.team==='e'&&dist(n,ship)<1700);let L=ship.lock;
 if(!L||L.hp<=0||!npcs.includes(L)||dist(L,ship)>1500){L=E.sort((a,b)=>dist(a,ship)-dist(b,ship))[0];if(L){ship.lock=L;ship.orbit=1;ship.oa=Math.atan2(ship.y-L.y,ship.x-L.x)}else ship.lock=ship.orbit=null}
 mnuSp-=dt;if(E.length<3&&mnuSp<=0){mnuSp=3;const a=rnd(0,TAU);npcs.push(mkE(FIELD,ship.x+Math.cos(a)*750,ship.y+Math.sin(a)*750))}
 if(dist(ship,FIELD)>FIELD.r*.8&&!ship.lock)ship.dest={x:FIELD.x,y:FIELD.y,auto:1}}
function startMenu(){noSave=1;pickType(2,true);mode.atk=true;mode.def=true;buildModes();Object.assign(ship,{x:FIELD.x+FIELD.r*.2,y:FIELD.y,vx:0,vy:0,docked:null,hull:1e6,shd:1e6});zoom=.7;cam.x=ship.x;cam.y=ship.y;
 let has=0;try{const d=JSON.parse(localStorage.getItem(SAVEK));has=d&&Array.isArray(d.T)}catch(e){}
 $('mHint').classList.toggle('hide',!has);setState('menu')}
const mshow=k=>{for(const id of['mMain','mCfg','mAsk'])$(id).classList.toggle('hide',id!==k)};
const cfgSave=()=>{try{localStorage.setItem(CFGK,JSON.stringify(CFG))}catch(e){}};
$('mPlay').onclick=()=>{location.hash='go';location.reload()};
$('mSet').onclick=()=>{$('rV').value=Math.round(CFG.vol*100);$('rB').value=Math.round(CFG.br*100);$('vV').textContent=$('rV').value+'%';$('vB').textContent=$('rB').value+'%';mshow('mCfg')};
function layUi(){const u=CFG.ui||1,e=$('ui').style;e.inset='auto';e.left=SAFE.l+'px';e.top=SAFE.t+'px';e.width=(W-SAFE.l-SAFE.r)/u+'px';e.height=(H-SAFE.t-SAFE.b)/u+'px';e.transformOrigin='0 0';e.transform=u===1?'':'scale('+u+')';dkS=''}
const applyUi=()=>{layUi()},syncUi=()=>{for(const i of['rU','prU'])$(i).value=Math.round(CFG.ui*100);for(const i of['vU','pvU'])$(i).textContent=Math.round(CFG.ui*100)+'%'};
if(CFG.uiv!==3){CFG.ui=1.35;CFG.uiv=3}if(!(CFG.ui>=.8&&CFG.ui<=2))CFG.ui=1;applyUi();syncUi();
for(const i of['rU','prU'])$(i).oninput=e=>{CFG.ui=e.target.value/100;applyUi();syncUi();cfgSave()};
$('rV').oninput=e=>{CFG.vol=e.target.value/100;$('vV').textContent=e.target.value+'%';cfgSave()};
$('rB').oninput=e=>{CFG.br=e.target.value/100;$('vB').textContent=e.target.value+'%';cfgSave()};
