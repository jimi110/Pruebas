/* ============================================================================
   core/game.js — Arranque: utilidades, pantalla/orientación, datos de naves y armas (TYPES), sesión multijugador, claves de guardado y semilla del mundo.
   (Trozo de la antigua pieza única de index.html. Se carga como script clásico en orden:
   comparte el ámbito global con el resto de js/. NO cambies el orden de carga en index.html.)
   ========================================================================== */
"use strict";
addEventListener('keydown',e=>{const t=e.target;if(t&&t.classList&&t.classList.contains('mpin')&&e.code!=='Escape'){e.stopImmediatePropagation();if(e.code==='Enter'&&t.id==='mpCode')mpJoin()}},true);
function RGH(f){try{return typeof REGIONS!=='undefined'?f(REGIONS):undefined}catch(e){console.warn('[regiones]',e)}}/* puente defensivo hacia regions.js: si falla, el juego sigue igual */
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rnd=(a,b)=>a+Math.random()*(b-a),$=i=>document.getElementById(i);
const angDiff=(a,b)=>((b-a+Math.PI*3)%TAU)-Math.PI,dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const EVENTOS=false,EVBOSS=true;let bossT=150;const C={jr:.3,jumpMin:5000,dockR:230,safeR:1500,sell:15};
const cv=$('c');let g=cv.getContext('2d');const g0=g,withCtx=(c,f)=>{g=c;try{f()}finally{g=g0}};let W,H,SAFE={t:0,r:0,b:0,l:0};
function resize(){const q=getComputedStyle($('sa'));SAFE={t:parseFloat(q.paddingTop)||0,r:parseFloat(q.paddingRight)||0,b:parseFloat(q.paddingBottom)||0,l:parseFloat(q.paddingLeft)||0};const d=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*d;cv.height=H*d;g.setTransform(d,0,0,d,0,0);try{layUi()}catch(e){}}
addEventListener('resize',resize);resize();
const isTouch=matchMedia('(pointer:coarse)').matches||'ontouchstart' in window;let rotOff=0;
function orient(){const p=isTouch&&!rotOff&&innerHeight>innerWidth&&Math.min(innerWidth,innerHeight)<700;$('rot').classList.toggle('hide',!p)}
function onRot(){rotOff=0;setTimeout(()=>{resize();orient()},150);setTimeout(()=>{resize();orient()},500)}
addEventListener('orientationchange',onRot);addEventListener('resize',orient);if(window.visualViewport)visualViewport.addEventListener('resize',()=>{resize();orient()});
$('rotOk').onclick=()=>{rotOff=1;orient()};orient();
let lockTried=0;function lockLand(){if(!isTouch||lockTried)return;lockTried=1;const go=()=>{try{const p=screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape');p&&p.catch&&p.catch(()=>{})}catch(_){}};
 try{const de=document.documentElement;if(!document.fullscreenElement&&de.requestFullscreen){de.requestFullscreen().then(go,go)}else go()}catch(_){go()}}
addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse')lockLand()},{once:false,passive:true});

/* ===== DATOS ===== */
const SH={g:[[20,0],[8,-16],[-14,-18],[-10,0],[-14,18],[8,16]],m:[[14,-5],[14,5],[0,12],[-16,14],[-16,-14],[0,-12]],c:[[24,0],[-8,-9],[-14,-17],[-10,0],[-14,17],[-8,9]],e:[[27,0],[-14,-7],[-10,0],[-14,7]],t:[[16,0],[6,-12],[-14,-10],[-14,10],[6,12]]};
const TYPES=[
 {n:'Guardián',own:true,shop:'',price:0,wp:'cannon',md:['atk','def'],r:'Protección',col:'#5fd0ff',sh:'g',hull:170,shd:170,spd:300,dmg:9,rate:.28,cargo:10,mine:.6,jump:1,regen:4},
 {n:'Minero',own:true,shop:'Base Alfa',price:300,wp:'cannon',md:['col','def'],r:'Recolección',col:'#ffd166',sh:'m',hull:100,shd:70,spd:270,dmg:5,rate:.5,cargo:45,mine:2.2,jump:1,regen:4},
 {n:'Cazador',own:false,shop:'Base Beta',price:1200,wp:'cannon',md:['atk','def'],r:'Ataque',col:'#ff6b6b',sh:'c',hull:90,shd:80,spd:350,dmg:15,rate:.14,cargo:8,mine:.5,jump:1,regen:4},
 {n:'Explorador',own:false,shop:'Base Beta',price:1200,wp:'cannon',md:['col','def'],r:'Viaje rápido',col:'#9dff7a',sh:'e',hull:70,shd:60,spd:520,dmg:6,rate:.4,cargo:14,mine:.8,jump:.588,regen:7},
 {n:'Técnico',own:false,shop:'Base Omega',price:5000,wp:'cannon',md:['rep','def'],r:'Reparación y rescate',col:'#c792ff',sh:'t',hull:110,shd:90,spd:320,dmg:6,rate:.4,cargo:16,mine:.7,jump:1,regen:4,rep:1}];
const WOWN={cannon:1},WP={cannon:{n:'Cañón de pulsos',d:'Cadencia alta, sin recalentamiento.',pr:0},laser:{n:'Rayo láser',d:'Mucho alcance y daño, pero se sobrecalienta.',pr:2500},sniper:{n:'Rayo francotirador',d:'Fija la mira (línea roja) y dispara un rayo instantáneo de enorme alcance y daño. Recarga lenta. Se construye en Base Zafiro con su plano.',pr:3500}};let LZ=0;
const MPG=(()=>{try{const m=JSON.parse(sessionStorage.getItem('sl_mpg'));return m&&m.code&&m.seed&&m.gid?m:null}catch(e){return null}})(),MPK=MPG?(MPG.role==='host'?'starluge_mph_':'starluge_mpg_')+MPG.gid:'';
if(MPG&&!MPG.used){try{if(MPG.save)localStorage.setItem(MPK,JSON.stringify(MPG.save));else if(localStorage.getItem(MPK)===null)localStorage.setItem(MPK,JSON.stringify({v:1,seed:MPG.seed,lay:MPG.lay}));sessionStorage.setItem('sl_mpg',JSON.stringify(Object.assign({},MPG,{save:null,used:1})))}catch(e){}}
const SAVEK=MPG?MPK:'starluge_save_v2',CFGK='starluge_cfg';try{for(const[o,n]of[['starbound2d_save_v2',SAVEK],['starbound2d_cfg',CFGK]])if(localStorage.getItem(o)!==null&&localStorage.getItem(n)===null)localStorage.setItem(n,localStorage.getItem(o))}catch(e){}/* migra partidas y ajustes del nombre anterior */let CFG={vol:.7,br:1};try{const sv0=JSON.parse(localStorage.getItem(CFGK))||{};if(sv0.brv!==2)delete sv0.br;Object.assign(CFG,sv0)}catch(e){}CFG.brv=2;
let SEED=0,NEWWORLD=0,LEG=0;try{const d0=JSON.parse(localStorage.getItem(SAVEK));if(d0&&d0.v===1){SEED=d0.seed|0;LEG=d0.lay===2?0:1}else NEWWORLD=1}catch(e){NEWWORLD=1}
if(NEWWORLD){SEED=(Math.random()*2147483646|0)+1;try{localStorage.setItem(SAVEK,JSON.stringify({v:1,seed:SEED,lay:2}))}catch(e){}}
