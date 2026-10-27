/* ============================================================================
   core/ui.js — Interfaz y estados: tienda y hangar, panel de nave, mapa, zoom y gestos, inventario.
   (Trozo de la antigua pieza única de index.html. Se carga como script clásico en orden:
   comparte el ámbito global con el resto de js/. NO cambies el orden de carga en index.html.)
   ========================================================================== */
"use strict";
/* ===== UI / ESTADOS ===== */
function setState(s){if(wmap&&s!=='warp'){wmap=0;zoom=zp}if(typeof wP==='function')wP(s);if(typeof cxDef==='function')cxDef();dkS='';if(s==='hangar'&&state!=='hangar')hgT=time;if(state==='map'&&(s==='play'||s==='warp'))zoom=zp;state=s;$('hangar').classList.toggle('hide',s!=='hangar');$('panel').classList.toggle('hide',s!=='map');$('bMap').classList.toggle('hide',s!=='map'&&s!=='warp');$('bPause').classList.toggle('hide',s!=='play');$('pause').classList.toggle('hide',s!=='pause');$('codex').classList.add('hide');$('modes').classList.toggle('hide',s!=='play');$('bShip').classList.add('hide');$('shipP').classList.toggle('hide',s!=='ship');$('bTg').classList.toggle('hide',s!=='play');$('ctx').classList.add('hide');$('zinfo').classList.add('hide');$('menu').classList.toggle('hide',s!=='menu');$('invP').classList.add('hide');$('bInv').classList.toggle('hide',s!=='play');$('bFire').classList.toggle('hide',s!=='play'||!('ontouchstart' in window));$('thr').classList.toggle('hide',s!=='play');hold=0;try{qShow()}catch(_){}wkUI()}
const stat=(l,v)=>`<div class=st><span>${l}</span><i><b style="width:${clamp(v,0,1)*100}%"></b></i></div>`;
function renderCards(){$('cards').innerHTML=TYPES.map((t,i)=>{const lk=!t.own;return `<div class="card${t===T?' sel':''}" data-i="${i}" style="--c:${t.col};${lk?'opacity:.65':''}"><h3>${lk?'🔒 ':''}${t.n}</h3><p>${t.r}</p>${stat('CASCO',(t.hull+t.shd)/340)}${stat('CARGA',t.cargo/45)}${stat('ATAQUE',t.dmg/t.rate/110)}${stat('VEL',t.spd/520)}${stat('ENERGÍA',t.regen/t.jump/11.7)}${lk?`<div style="margin-top:6px;color:#ffd166">${t.price} cr · ${t.shop}</div>`:''}</div>`}).join('')}renderCards();
let STORE={};const snap=()=>JSON.parse(JSON.stringify({hull:ship.hull,shd:ship.shd,en:ship.en,ore:ship.ore,inv:ship.inv,parts:ship.parts,rq,mode}));
function pickType(i,f){if(!f&&(T===TYPES[i]||!TYPES[i].own))return;if(!f)STORE[TYPES.indexOf(T)]=snap();T=TYPES[i];const sv=!f&&STORE[i];
 if(sv){mode=sv.mode||{};if(!Object.keys(mode).length)T.md.forEach(k=>mode[k]=k!=='atk');buildModes();ship.hull=sv.hull;ship.shd=sv.shd;ship.en=sv.en;ship.ore=sv.ore;ship.inv=sv.inv;ship.parts=sv.parts;rq=sv.rq||[]}
 else{mode={};T.md.forEach(k=>mode[k]=k!=='atk');buildModes();ship.hull=T.hull;ship.shd=T.shd;ship.ore=0;ship.inv={};ship.parts=fp();rq=[]}
 document.querySelectorAll('.card').forEach((c,j)=>c.classList.toggle('sel',j===i));if(window.thrReady){ship.thr=Math.min(ship.thr||1,tmx());thrUI()}}
const CARDP=1500,TRN=5;let TRL=null;
function trlStart(){if(ship.docked!==UM||QX.card||TRL)return;const pts=[],a0=rnd(0,TAU);let tot=0,px=UM.x,py=UM.y;for(let i=0;i<TRN;i++){const a=a0+i*TAU/TRN+rnd(-.2,.2),R=2000+rnd(0,700),q={x:Math.round(UM.x+Math.cos(a)*R),y:Math.round(UM.y+Math.sin(a)*R)};if(asts.some(o=>Math.hypot(o.x-q.x,o.y-q.y)<o.r+130)){i--;continue}tot+=Math.hypot(q.x-px,q.y-py);px=q.x;py=q.y;pts.push(q)}
 TRL={pts,i:0,t:0,rad:140,lim:Math.round(tot/(Math.max(T.spd,150)*.62)+15)};prevS='play';closeShip();ship.dest={x:pts[0].x,y:pts[0].y,auto:1};toast('Prueba de pilotaje: '+TRN+' balizas en '+TRL.lim+' s · pasa por cada una en orden')}
function trlEnd(ok,m){TRL=null;if(ok){QX.test=1;toast('✔ Prueba superada: ya puedes comprar la tarjeta de acceso en Estación Umbral');saveGame()}else toast('✖ '+m+': vuelve a Estación Umbral para reintentar')}
function trlTick(dt){if(!TRL)return;if(state==='warp'||ship.dead>0||(ship.docked&&TRL.t>3))return trlEnd(0,'Prueba cancelada');if(state!=='play'&&state!=='map')return;TRL.t+=dt;const p=TRL.pts[TRL.i];if(dist(ship,p)<TRL.rad){TRL.i++;sfx('d');if(TRL.i>=TRL.pts.length)trlEnd(1);else{toast('Baliza '+TRL.i+'/'+TRL.pts.length);const q=TRL.pts[TRL.i];if(ship.dest&&ship.dest.auto)ship.dest={x:q.x,y:q.y,auto:1}}}else if(TRL.t>TRL.lim)trlEnd(0,'Tiempo agotado')}
function drawTrl(){if(!TRL)return;const f=14/zoom;TRL.pts.forEach((p,i)=>{const cur=i===TRL.i,done=i<TRL.i,c=done?'#7dff9b':cur?'#ffd166':'#5f7a96',pu=cur?1+.12*Math.sin(time*6):1;g.strokeStyle=c;g.lineWidth=(cur?3:2)/zoom;g.globalAlpha=done?.4:1;g.beginPath();g.arc(p.x,p.y,TRL.rad*pu,0,TAU);g.stroke();if(cur){g.beginPath();g.arc(p.x,p.y,TRL.rad*.35,0,TAU);g.stroke()}txt(String(i+1),p.x,p.y+f*.35,c,'center',f);g.globalAlpha=1})}
function trlHud(){if(!TRL)return;const p=TRL.pts[TRL.i],l=Math.ceil(TRL.lim-TRL.t),y=Math.max(50,44+SAFE.t);txt('PRUEBA DE PILOTAJE · baliza '+(TRL.i+1)+'/'+TRL.pts.length+' · '+Math.max(0,l)+' s',W/2,y,l<10?'#ff6b6b':'#ffd166','center',14);
 const dx=(p.x-cam.x)*zoom,dy=(p.y-cam.y)*zoom,hw=W/2-40-SAFE.r,hh=H/2-40-SAFE.b;if(Math.abs(dx)>=hw||Math.abs(dy)>=hh){const k=Math.min(hw/Math.max(Math.abs(dx),1e-3),hh/Math.max(Math.abs(dy),1e-3)),px=W/2+dx*k,py=H/2+dy*k,a=Math.atan2(dy,dx);g.save();g.translate(px,py);g.rotate(a);g.fillStyle='#ffd166';g.strokeStyle='#000';g.lineWidth=1;g.beginPath();g.moveTo(16,0);g.lineTo(-8,-11);g.lineTo(-3,0);g.lineTo(-8,11);g.closePath();g.fill();g.stroke();g.restore();txt(km(dist(ship,p)),clamp(px-Math.cos(a)*34,60,W-60),clamp(py-Math.sin(a)*34+4,16,H-10),'#ffd166','center',12)}}
function buyCard(){if(ship.docked!==UM||QX.card||!QX.test)return;if(ship.cred<CARDP)return toast('Créditos insuficientes: '+CARDP+' cr');ship.cred-=CARDP;QX.card=1;toast('✔ Tarjeta de acceso a Base Omega adquirida: los guardianes ya no te atacan');saveGame()}
let armI=-1,armT=0;
function buyShip(i){const t=TYPES[i];if(!ship.docked||ship.docked.n!==t.shop)return toast(t.n+' se vende en '+t.shop);if(ship.cred<t.price)return toast('Créditos insuficientes: '+t.price+' cr');
  if(armI!==i||time>armT){armI=i;armT=time+4;return toast('Pulsa otra vez para comprar '+t.n+' · '+t.price+' cr')}
  ship.cred-=t.price;t.own=true;armI=-1;toast(t.n+' comprada');renderCards();saveGame()}
$('cards').addEventListener('click',e=>{const c=e.target.closest('.card');if(!c)return;const i=+c.dataset.i;if(TYPES[i].own)pickType(i);else buyShip(i)});
pickType(0,true);
$('bFly').onclick=()=>{ship.disc=0;setState('play');toast('Toca la pantalla para moverte · toca el minimapa para abrir el mapa')};
$('bMap').onclick=toggleMap;$('bX').onclick=toggleMap;$('bGo').onclick=confirmGo;
$('bHan').onclick=openHangar;$('bTg').onclick=cycleLock;$('bShip').onclick=$('bHS').onclick=openShip;
function cruise(){if(state!=='map'||!sel)return;if(ship.wreck){toast('Nave inutilizada: no puedes navegar. Pide ayuda');return}if(dist(ship,sel)<120){toast('Ya estás en ese punto');setState('play');return}ship.dest={x:sel.x,y:sel.y};qEv('nav');setState('play')}
$('bCr').onclick=cruise;$('bCen').onclick=()=>{mc={x:ship.x,y:ship.y};wmapF=1};
function cycleLock(){if(ship.dead)return;const L=npcs.filter(n=>(n.team==='e'||(n.boss&&n.evs&&n.hp>0))&&dist(n,ship)<1500).sort((a,b)=>dist(a,ship)-dist(b,ship));if(!L.length){ship.lock=ship.orbit=null;return toast('Sin enemigos cerca')}const i=L.indexOf(ship.lock);ship.lock=L[(i+1)%L.length];toast('Objetivo fijado')}
let cfn=[];function ctxMenu(x,y,items){const c=$('ctx');cfn=items.map(i=>i[1]);c.innerHTML=items.map((i,k)=>`<button class="sq${i[2]?' '+i[2]:(k?'':' go')}" data-k="${k}" style="position:static">${i[0]}</button>`).join('');c.classList.remove('hide');const u=CFG.ui||1;c.style.left=(Math.min(x,W-210*u)-SAFE.l)/u+'px';c.style.top=(Math.min(y,H-(40+items.length*46)*u)-SAFE.t)/u+'px'}
const cellKnown=(x,y)=>EXS.has(ck(Math.floor(x/CELL),Math.floor(y/CELL)));
const known=(o,r)=>{let n=0;for(let k=0;k<EX.length;k+=2)if(Math.hypot((EX[k]+.5)*CELL-o.x,(EX[k+1]+.5)*CELL-o.y)<r&&++n>=1)return true;return false};
const fk=F=>{if(!F.ring)return known(F,F.r);for(let k=0;k<EX.length;k+=2){const x=(EX[k]+.5)*CELL,y=(EX[k+1]+.5)*CELL;if(Math.abs(Math.hypot(x,y)-F.rr(Math.atan2(y,x)))<RINGW*1.3+CELL)return true}return false};
const rar=w=>w>=.4?'abundante':w>=.2?'común':w>=.1?'poco común':'raro';
function zoneInfo(p){if(!sczDead()&&dist(p,SCZ)<SCZ.r+150)return `<b class="t">${SCZ.n}</b><br><span style="color:#d9b86a">♻ Restos de chatarra</span><br><span style="opacity:.7">Vuela sobre los restos brillantes para desguazarlos. Hay pocos y tardan unos 10 minutos en regenerarse.</span>`;const F=FIELDS.find(f=>f.ins(p.x,p.y)),bs=BASES.find(b=>dist(p,b)<b.r+120);
 if(bs&&known(bs,bs.r+300))return `<b class="t">${bs.n}</b><br>${bs.tag}<br><span style="opacity:.7">${bs.info?bs.info:bs===B?'Piratas en la zona. Paga más por los minerales.':bs.small?'Aquí puedes comprar mejoras para tu nave.':'Base principal: zona protegida.'}</span>`;
 if(F){if(!fk(F))return `<b class="t">Zona sin descubrir</b><br><span style="opacity:.7">Aún no se ha explorado esta región. Viaja hasta allí para descubrir qué contiene.</span>`;
  const ml=(T.lv||{}).min||0;return `<b class="t">${F.n}</b><br><span style="color:#ff8a70">⚠ ${F.dng}</span><br><span style="opacity:.7">Piratas de nivel ${F.tier+1} · peligro de la región ${dgr(F.x,F.y)}/4 (más lejos de Alfa: manadas más numerosas y duras)</span><div style="margin-top:6px;opacity:.8">Minerales:</div>`+F.tb.map(([k,w])=>{const q=MIN[k],lk=(q[3]||0)>ml;return `<div class="r"><i style="background:${q[1]}"></i><span style="flex:1">${q[0]} <span style="opacity:.6">· ${rar(w)}</span></span>${lk?'<span style="color:#ffb347">minería nv '+q[3]+'</span>':''}</div>`}).join('')}
 if(dist(p,B)<1500&&known(B,1800))return `<b class="t">Zona hostil de Beta</b><br><span style="color:#ff8a70">⚠ ZONA DE PELIGRO</span><br><span style="opacity:.7">Aquí patrullan piratas.</span>`;
 return `<b class="t">Espacio profundo</b><br><span style="opacity:.7">Sin recursos conocidos. Puede haber asteroides sueltos. Peligro ${dgr(p.x,p.y)}/4.</span>`}
function showCtx(x,y){const d=dist(ship,sel),lg=d>C.jumpMin;ctxMenu(x,y,[[lg?(jumpCost(d)>100&&!CFG.ie?'Fuera de alcance de salto':'Salto · '+jumpCost(d)+'% energía'):'Salto (muy cerca)',confirmGo],['Rumbo normal',cruise]]);
 const z=$('zinfo');z.innerHTML=zoneInfo(sel)+'<div style="margin-top:6px;opacity:.85">Distancia '+km(d)+' · '+(lg?(jumpCost(d)>100&&!CFG.ie?'fuera de alcance de salto':'salto '+jumpCost(d)+'% de energía (tienes '+Math.floor(ship.en)+'%)'):'vuelo de crucero, sin coste')+'</div>';z.classList.remove('hide');{const u=CFG.ui||1,cw=($('ctx').offsetWidth||200)*u;let zx=x+cw+8;if(zx+250*u>W)zx=Math.max(4,x-258*u);z.style.left=(zx-SAFE.l)/u+'px';z.style.top=(Math.min(y,H-z.offsetHeight*u-8)-SAFE.t)/u+'px'}}
$('ctx').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;$('ctx').classList.add('hide');$('zinfo').classList.add('hide');const f=cfn[+b.dataset.k];f&&f()});
function worldMenu(px,py){const wx=w2x(px),wy=w2y(py);{const al=allyAt(wx,wy);if(al){allyMenu(px,py,al);return 1}}{const gu=gAt(wx,wy);if(gu){gMenu(px,py,gu);return 1}}{const wr=mpWreckAt(wx,wy);if(wr){mpAidMenu(px,py,wr);return 1}}let en=null,ed=45/zoom;for(const n of npcs)if(n.team==='e'||(n.boss&&n.evs&&n.hp>0)){const d=Math.hypot(n.x-wx,n.y-wy)-(n.rad||18);if(d<ed){ed=d;en=n}}
  if(en){ctxMenu(px,py,[['Fijar objetivo',()=>{ship.lock=en;ship.orbit=null}],['Atacar en órbita',()=>{ship.lock=en;ship.orbit=1;ship.mt=null;ship.oa=Math.atan2(ship.y-en.y,ship.x-en.x)}],['Soltar objetivo',()=>{ship.lock=ship.orbit=null}]]);return 1}
  let cm=null,cd=60/zoom;for(const c of cmts){const d=Math.hypot(c.x-wx,c.y-wy)-c.r;if(d<cd){cd=d;cm=c}}
  if(cm){ctxMenu(px,py,[['Recoger '+CK[cm.k].m,()=>{if(T.md.includes('col')){mode.col=true;buildModes()}ship.cl=ship.mc=cm;ship.mt=null;ship.orbit=null;ship.dest=null}],['Fijar cometa',()=>{ship.cl=cm}]]);return 1}
  let as=null,ad=40/zoom;for(const a of asts){const d=Math.hypot(a.x-wx,a.y-wy)-a.r;if(d<ad){ad=d;as=a}}
  if(as){ctxMenu(px,py,[['Minar',()=>{if(!canMine(as))return toast(needMsg(as));if(T.md.includes('col')){mode.col=true;buildModes()}ship.mt=as;ship.orbit=null;ship.dest=null}]]);return 1}return 0}
cv.addEventListener('pointerdown',()=>{$('ctx').classList.add('hide');$('zinfo').classList.add('hide')},true);
document.addEventListener('contextmenu',e=>{e.preventDefault()},true);
cv.addEventListener('contextmenu',e=>{e.preventDefault();if(state==='map'){{const al=mapAllyAt(e.clientX,e.clientY);if(al){allyMenu(e.clientX,e.clientY,al);return}}if(ship.dead>0)return;pickPoint(e.clientX,e.clientY);showCtx(e.clientX,e.clientY)}});
addEventListener('pointerup',()=>{hold=0;clearTimeout(lp)});addEventListener('pointercancel',()=>{hold=0});
const pc=v=>Math.round(v*100)+'%';
const UP={
hull:{c:120,s:()=>['Casco máx.',T.hull,T.hull+30],a:()=>{T.hull+=30;ship.hull+=30}},
shd:{c:130,s:()=>['Escudo máx. / recuperación por s',T.shd+' / '+(T.shr||0).toFixed(1),(T.shd+30)+' / '+((T.shr||0)+1.2).toFixed(1)],a:()=>{T.shd+=30;ship.shd+=30;T.shr=(T.shr||0)+1.2}},
eng:{c:120,s:()=>['Velocidad máx.',T.spd,T.spd+30],a:()=>{T.spd+=30}},
eg2:{c:100,s:()=>['Aceleración / giro',pc(T.acc||1)+' / '+pc(T.man||1),pc((T.acc||1)+.12)+' / '+pc((T.man||1)+.15)],a:()=>{T.acc=(T.acc||1)+.12;T.man=(T.man||1)+.15}},
wpn:{c:120,s:()=>['Daño / s entre disparos (Ataque y manual; Defensa: 60% de daño y 2,6x más lenta)',T.dmg+' / '+T.rate.toFixed(2),(T.dmg+3)+' / '+(T.rate*.87).toFixed(2)],a:()=>{T.dmg+=3;T.rate*=.87}},
min:{c:120,s:()=>['Minado / bodega',T.mine.toFixed(1)+' / '+T.cargo,(T.mine*1.2).toFixed(1)+' / '+(T.cargo+10)],a:()=>{T.mine*=1.2;T.cargo+=10}},
jmp:{c:150,s:()=>['Alcance máx. de salto / coste',km(jrg(T.jump))+' / '+pc(T.jump),km(jrg(T.jump*.85))+' / '+pc(T.jump*.85)],a:()=>{T.jump*=.85}},
jmr:{c:120,s:()=>['Recarga total de energía',Math.round(100/(T.regen*.12))+' s',Math.round(100/((T.regen+1.5)*.12))+' s'],a:()=>{T.regen+=1.5}},
jmv:{c:130,s:()=>['Velocidad del salto',pc(wspV()),pc(wspV()+.25)],a:()=>{T.wsp=(T.wsp||1)+.25}}};
const wspV=()=>(T.wsp||1)+(TYPES.indexOf(T)===3?1:0),hlcV=()=>(T.rep?.02:0)+(T.hlc||0),crtV=()=>(TYPES.indexOf(T)===2?.08:0)+(T.crt||0),isI=l=>l.includes(TYPES.indexOf(T));
UP.ovc={c:130,ok:()=>isI([3,4]),s:()=>['Coste de energía en sobrecarga',pc(T.ovc||1),pc((T.ovc||1)*.8)],a:()=>{T.ovc=(T.ovc||1)*.8}};
UP.afb={c:140,ok:()=>isI([3]),s:()=>['Aceleración en sobrecarga','+'+pc(T.afb||0),'+'+pc((T.afb||0)+.25)],a:()=>{T.afb=(T.afb||0)+.25}};
UP.tal={c:140,ok:()=>isI([4]),s:()=>['Autorreparación y rescate',pc(T.tal||1),pc((T.tal||1)+.4)],a:()=>{T.tal=(T.tal||1)+.4}};
UP.tfd={c:150,ok:()=>isI([4]),s:()=>['Cura a tus naves a menos de 600 u (por s)',pc(hlcV()),pc(hlcV()+.015)],a:()=>{T.hlc=(T.hlc||0)+.015}};
UP.crt={c:140,ok:()=>isI([2]),s:()=>['Probabilidad de crítico (daño x2)',pc(crtV()),pc(crtV()+.07)],a:()=>{T.crt=(T.crt||0)+.07}};
const XUP={eng:['ovc','afb'],min:['tal'],shd:['tfd'],wpn:['crt']},upl=k=>[...(UPS[k]||[k]),...(XUP[k]||[]).filter(q=>UP[q].ok())];
const UPS={jmp:['jmp','jmr','jmv']},UPN={ovc:'Eficiencia de sobrecarga',afb:'Postcombustión',tal:'Taller de a bordo',tfd:'Campo reparador',crt:'Fuego crítico',jmp:'Alcance de salto',jmr:'Recarga de energía',jmv:'Velocidad de salto'},jrg=j=>(100/Math.max(j,.01)-30)*650*C.jr;
const upc=k=>{T.lv=T.lv||{};return UP[k].c*((T.lv[k]||0)+1)};
function buy(k){if(!ship.docked||!ship.docked.small)return toast('Mejoras solo en estaciones: Cobre, Vega o Nova');T.lv=T.lv||{};const l=T.lv[k]||0;if(l>=3)return;const c=upc(k);if(ship.cred<c)return toast('Créditos insuficientes: faltan '+(c-ship.cred));ship.cred-=c;T.lv[k]=l+1;UP[k].a();qEv('upg');toast('Mejora comprada: '+(UPN[k]||NM[k])+' nivel '+(l+1))}
let prevS='play',selP='hull',SL={cx:0,cy:0,sc:4};
const IP={hull:'M12 2.5 20 7v9.5L12 21.5 4 16.5V7z M12 7v10',shd:'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z M7.5 12a4.5 4.5 0 0 1 4.5-4.5',eng:'M12 3c3 4 5 7 5 10a5 5 0 0 1-10 0c0-3 2-6 5-10z M12 13v5',eg2:'M5 7l7-4 7 4 M5 13l7-4 7 4 M5 19l7-4 7 4',wpn:'M12 2v6 M12 16v6 M2 12h6 M16 12h6 M12 9a3 3 0 1 0 .01 0',min:'M3 21l8-8 M13 3l8 8-3 3-8-8z',jmp:'M13 2 5 14h6l-1 8 9-12h-6z'};
const P2={};for(const q in IP)P2[q]=new Path2D(IP[q]);
const ico=(k,sz,c)=>`<svg class=ico viewBox="0 0 24 24" width="${sz}" height="${sz}" fill="none" stroke="${c||'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${IP[k]}"/></svg>`;
const RC={zf:['#5aa8ff','sap'],cred:['#ffd166','dia'],scrap:['#9aa5b8','bolt'],fe:['#b0b8c8','ing'],cu:['#e08a4f','ing'],cr:['#7fe8ff','cry'],pt:['#ffd166','ing'],ti:['#9fb7ff','ing'],ir:['#ff7ad9','cry'],ne:['#7dffb0','orb']};CK.forEach((c,i)=>RC['c'+i]=[c.mc,'drop']);
const RS={sap:'<path d="M8 .8 14 5.4 11.8 14H4.2L2 5.4z" fill="C"/><path d="M8 .8 6 5.4h4zM2 5.4h12M6 5.4 4.2 14M10 5.4 11.8 14" stroke="#fff" stroke-opacity=".55" stroke-width=".9" fill="none"/>',dia:'<path d="M8 1l7 7-7 7-7-7z" fill="C"/><path d="M8 4.6 11.4 8 8 11.4 4.6 8z" fill="#05070d" opacity=".55"/>',bolt:'<path d="M8 1l6 3.5v7L8 15l-6-3.5v-7z" fill="C"/><circle cx="8" cy="8" r="2.3" fill="#05070d" opacity=".6"/>',ing:'<path d="M3.5 4h9l2.5 8H1z" fill="C"/><path d="M4.5 6h7" stroke="#fff" stroke-opacity=".5" stroke-width="1.2"/>',cry:'<path d="M8 1l5 5-5 9-5-9z" fill="C"/><path d="M8 1v14M3 6h10" stroke="#fff" stroke-opacity=".4" stroke-width="1"/>',orb:'<circle cx="8" cy="8" r="6.5" fill="C" opacity=".35"/><circle cx="8" cy="8" r="4" fill="C"/>',drop:'<path d="M8 1c3 4 5 6 5 8.5a5 5 0 0 1-10 0C3 7 5 5 8 1z" fill="C"/>'};
const ric=(k,sz)=>{const r=RC[k]||['#cfe8ff','dia'];sz=sz||16;return `<svg class=ico viewBox="0 0 16 16" width="${sz}" height="${sz}">${RS[r[1]].replace(/fill="C"/g,'fill="'+r[0]+'"')}</svg>`};
const FN={hull:'Estructura de la nave. A 0 la nave se destruye.',shd:'Absorbe el daño antes de que llegue al casco.',eng:'Empuje principal: velocidad máxima.',eg2:'Empuje auxiliar: aceleración y giro.',wpn:'Modo Ataque: dispara sola con toda su potencia y gasta un poco de energía. Modo Defensa: disparo automático más lento y débil, sin coste. También tus disparos manuales.',min:'Rayo extractor de asteroides y cometas.',jmp:'Núcleo del salto hiperespacial.'};
const FXC={eng:['Empuje al 50%: menos velocidad y aceleración; la nave tiende a desviarse.','Sin empuje de este motor: mucha menos velocidad y la nave se desvía.'],eg2:['Empuje al 50%: menos velocidad y aceleración; la nave tiende a desviarse.','Sin empuje de este motor: mucha menos velocidad y la nave se desvía.'],wpn:['Cadencia de disparo a la mitad (torreta y manual).','No dispara: ni torreta ni disparo manual.'],min:['Minado al 50%.','Minado desactivado.'],jmp:['Saltos un 50% más caros.','Salto bloqueado.'],hull:['Casco crítico: otro impacto fuerte podría destruir la nave.',''],shd:['Escudo casi agotado.','Escudo agotado: el casco recibe el daño directo.']};
function fxT(k){const v=gv(k),r=v/gm(k);if(r>=.8)return '';if(v<=0)return FXC[k][1]||FXC[k][0];if(r<.4)return FXC[k][0];return k==='hull'||k==='shd'?'Menos margen ante el daño.':'Sin penalización aún. Por debajo del 40% rinde al 50%.'}

const PR=[['hull','Casco','#ff6b6b',2],['shd','Escudo','#4fd1ff',1],['eng','Motor 1','#ffd166',1.2],['eg2','Motor 2','#ffd166',1.2],['wpn','Armas','#ff9a4f',1.2],['min','Minería','#9dff7a',1.2],['jmp','Propulsor','#c792ff',1.2]];
const NM={hull:'Casco',shd:'Escudos',eng:'Motor principal',eg2:'Motor secundario',wpn:'Torreta automática',min:'Sistema de minería',jmp:'Propulsor de salto'};
const DS={hull:'Estructura de la nave: si llega a 0 la nave es destruida.',shd:'Absorbe el daño antes que el casco; se recupera tras unos segundos sin impactos si tiene mejoras.',eng:'Empuje principal: velocidad máxima.',eg2:'Propulsión auxiliar: aceleración y capacidad de giro.',wpn:'Torretas automáticas: daño y cadencia de fuego.',min:'Rayo extractor: velocidad de minado y bodega.',jmp:'Núcleo del salto hiperespacial: coste energético y recarga.'};
const EF={hull:'riesgo de destrucción',shd:'menos protección',eng:'velocidad y estabilidad reducidas, la nave se desvía',eg2:'velocidad y estabilidad reducidas, la nave se desvía',wpn:'cadencia reducida o armas inactivas',min:'minado más lento o desactivado',jmp:'saltos un 50% más caros o bloqueados'};
const CX={hull:70,shd:30,eng:40,eg2:40,wpn:45,min:40,jmp:55};
const PP={shd:[-21.5,21],wpn:[18,0],eng:[-13,-7],eg2:[-13,7],min:[2,-11],jmp:[2,11],hull:[-3,0]};
const gv=k=>k==='hull'?ship.hull:k==='shd'?ship.shd:ship.parts[k],gm=k=>k==='hull'?T.hull:k==='shd'?T.shd:100;
const sv=(k,v)=>{if(k==='hull')ship.hull=v;else if(k==='shd')ship.shd=v;else ship.parts[k]=v};
const rc=k=>Math.ceil(repCost(k,gv(k),gm(k))*(ship.disc?.5:1));
const rt=k=>repTime(k,gv(k),gm(k));
function stT(k){const v=gv(k),r=v/gm(k),sp=k==='hull'||k==='shd';return v<=0?[sp?'AGOTADO':'DESTRUIDO','#6b7686']:r<.4?['CRÍTICO','#ff4d4d']:r<.8?['DAÑADO','#ff9a4f']:['OPERATIVO','#7dff9b']}
function fix(k){if(ship.dead>0||ship.wreck)return toast('Nave inutilizada: no puedes reparar');const c=rc(k);if(!c)return toast('Sin daños');if(rq.some(j=>j.k===k))return toast('Ya hay una reparación en curso en ese componente');
  if(ship.docked){const sc=Math.min(ship.scrap|0,c),cr=c-sc;if(ship.cred<cr)return toast('Falta material: '+(cr-ship.cred)+' créditos o chatarra');ship.scrap-=sc;ship.cred-=cr;sv(k,gm(k));qEv('fix');return toast('✔ '+NM[k]+': reparación completada')}
  const q=Math.ceil(c*1.5);if(ship.scrap<q)return toast('Falta chatarra: necesitas '+q+' y tienes '+(ship.scrap|0));ship.scrap-=q;rq.push({k,t:0,tot:rt(k),v0:gv(k)});toast('Reparación iniciada: '+NM[k]+' (~'+rt(k)+' s)')}
function tickRep(dt){if(!rq.length)return;rq=stepRep(rq,gv,sv,gm,dt,j=>{qEv('fix');toast('✔ '+NM[j.k]+': reparación completada')})}
function openShip(){if(state!=='play'&&state!=='hangar')return;prevS=state;shT=prevS==='play'?0:1;shDir=1;setState('ship');renderShip()}
function closeShip(){if(prevS==='play'&&shT>0){shDir=-1;$('shipP').classList.add('hide')}else setState(prevS)}
const sq=(l,a,x)=>`<button class="sq" ${a} style="position:static;padding:8px 10px;${x||''}">${l}</button>`;
let selTab='rep',shSig='';
const kv=(a,b,c)=>`<div class=kv><span style="opacity:.7">${a}</span><b${c?' style="color:'+c+'"':''}>${b}</b></div>`;
const ehInfo=()=>{const rs=ship.ehR>0,h=rs?100:clamp(ship.eh||0,0,100);return{h,c:rs?'#ff4d4d':h>70?'#ffb347':h>35?'#ffd166':'#7dff9b',t:rs?'EN REPOSO '+Math.ceil(ship.ehR)+' s':Math.round(h)+'%'}};
function renderShip(){const sp0=$('shipP'),dk0=!!ship.docked,hb=dk0&&typeof hubTab!=='undefined'?hubTab:'nave';sp0.classList.toggle('dk',dk0);sp0.classList.toggle('wide',dk0&&hb!=='nave');if(dk0&&hb!=='nave'&&typeof hubRender==='function'){hubRender();return}
 const k=selP,v=gv(k),m=gm(k),[ss,sc]=stT(k),d=ship.docked,job=rq.find(j=>j.k===k),c=rc(k),l=(T.lv||{})[k]||0,up=UP[k],uc=up?upc(k):0,stn=d&&d.small,col=PR.find(p=>p[0]===k)[2],cr0=ship.cred,sr=ship.scrap|0,fx=fxT(k);
 const chip=(rk,n,ok)=>`<span class=cc${ok===false?' style="color:#ff6b6b;border-color:#ff6b6b"':''}>${ric(rk)}<b>${n}</b></span>`;
 const stc=d&&d===UM?`<div class=card2 style="border-color:#ffd166"><b style="color:#ffd166">ACCESO A BASE OMEGA</b>`+(QX.card?'<div style="color:#7dff9b;margin-top:6px">✔ Tarjeta de acceso en tu poder.</div>':!QX.test?`<div class=dim style="margin:6px 0">Prueba de pilotaje: atraviesa ${TRN} balizas en orden antes de que se acabe el tiempo. Puedes reintentarla las veces que quieras. Al superarla podrás comprar la tarjeta.</div>`+sq('Iniciar prueba','data-tr=1','color:#ffd166;width:100%'):`<div class=dim style="margin:6px 0">Prueba superada. Con la tarjeta, los guardianes de Omega dejan de atacarte y podrás atracar allí.</div><div class=cost><span class=dim>Precio</span>${chip('cred',CARDP,cr0>=CARDP)}</div>`+sq('Comprar tarjeta de acceso','data-card=1'+(cr0>=CARDP?'':' disabled'),'width:100%'))+`</div>`:'';
 let h=`<div class=sh1><b style="color:#4fd1ff;letter-spacing:.12em">INGENIERÍA</b>${sq('Cerrar [N]','data-x=1')}</div>
<div class=tabs><button class="sq${selTab==='rep'?' on':''}" data-t="rep">REPARAR</button><button class="sq${selTab==='up'?' on':''}" data-t="up">MEJORAR</button></div>
<div class=res>${chip('cred',cr0)}${chip('scrap',sr)}<span class=loc style="${d?'color:#7dff9b;opacity:1':''}">${d?d.n:'Espacio profundo'}</span></div>
${stc}<div class=icons>${PR.map(p=>{const q=stT(p[0])[1];return `<button class="sq${p[0]===k?' on':''}" data-s="${p[0]}" title="${NM[p[0]]}" aria-label="${NM[p[0]]}" style="border-color:${q};color:${q}">${ico(p[0],24)}</button>`}).join('')}</div>
<div class=card2><div class=dh>${ico(k,28,sc)}<div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b style="font-size:16px">${NM[k]}</b><span class=badge style="color:${sc}">${ss}</span></div><div class=fn>${FN[k]}</div></div></div>
<div class=bb style="height:12px;margin:8px 0 4px"><b style="width:${clamp(v/m,0,1)*100}%;background:${sc}"></b></div>${kv('Integridad',Math.round(v)+' / '+m+' ('+Math.round(v/m*100)+'%)')}${fx?`<div class=fx style="color:${sc==='#7dff9b'?'#cfe8ff':sc}">${fx}</div>`:''}</div>
<div class=card2>`;
 if(selTab==='rep'){
  if(job)h+=`<b style="color:#c792ff">Reparación en curso</b><div class=bb style="height:12px"><b data-pb="${k}" style="width:${job.t/job.tot*100}%;background:#c792ff"></b></div><div data-pt="${k}">${Math.floor(job.t/job.tot*100)}% · quedan ${Math.ceil(job.tot-job.t)} s</div><div class=dim style="margin-top:4px">Sigue aunque cierres el menú.</div>`;
  else if(!c)h+='<div class=dim>Sin daños: no hace falta reparar.</div>';
  else{let cs,ok;if(d){const a=Math.min(sr,c),b=c-a;cs=(a?chip('scrap',a):'')+(b?chip('cred',b,cr0>=b):'');ok=cr0>=b}else{const q=Math.ceil(c*1.5);cs=chip('scrap',q,sr>=q);ok=sr>=q}
   h+=`<div class=cost><span class=dim>Coste</span>${cs}</div><div class=dim>${d?'Inmediata en estación (chatarra primero, luego créditos)':'~'+rt(k)+' s, con el juego en marcha (solo chatarra)'}</div>${ok?'':'<div style="color:#ff6b6b;margin-top:4px">Materiales insuficientes</div>'}`+sq(d?'Reparar ahora':'Iniciar reparación','data-f="'+k+'"'+(ok?'':' disabled'),'color:#7dff9b;width:100%;margin-top:8px')}
  if(PR.filter(p=>rc(p[0])&&!rq.some(j=>j.k===p[0])).length>1)h+=sq('Reparar todo lo dañado','data-r=all','width:100%;margin-top:8px')}
 else if(!up)h+='<div class=dim>No hay mejoras disponibles para este componente.</div>';
 else{for(const k2 of upl(k)){const up=UP[k2],l=(T.lv||{})[k2]||0,uc=upc(k2),us=up.s();h+=(k2===k?'':'<div style="border-top:1px solid #1d3550;margin:12px 0 8px"></div>')+`<b>${UPN[k2]||'Mejora'} · nivel ${l} / 3</b>`+kv(us[0],us[1]+(l>=3?'':' → '+us[2]));
  if(l>=3)h+='<div style="color:#7dff9b;margin-top:6px">Nivel máximo</div>';
  else{const ok=cr0>=uc;h+=`<div class=cost><span class=dim>Coste</span>${chip('cred',uc,ok)}</div>`+(stn?(ok?'':'<div style="color:#ff6b6b">Créditos insuficientes</div>')+sq('Comprar mejora','data-u="'+k2+'"'+(ok?'':' disabled'),'width:100%;margin-top:8px'):`<div class=dim>Se compra en Estación Cobre, Vega o Nova${d?' (no en '+d.n+')':''}.</div>`)}}}
 h+='</div>';
 if(rq.length)h+=`<div class=card2><b>COLA DE REPARACIONES</b>`+rq.map(j=>`<div style="margin-top:6px">${kv(NM[j.k],'<span data-pt="'+j.k+'">'+Math.floor(j.t/j.tot*100)+'% · quedan '+Math.ceil(j.tot-j.t)+' s</span>','#c792ff')}<div class=bb><b data-pb="${j.k}" style="width:${j.t/j.tot*100}%;background:#c792ff"></b></div></div>`).join('')+'</div>';
 if(k==='wpn')h+=wpnCard();if(k==='hull'&&typeof impHullCard==='function')h+=impHullCard();$('shipP').innerHTML=h}
function wpnCard(){const d=ship.docked;return `<div class=card2><b>ARMAS</b>`+Object.keys(WP).map(k=>{const w=WP[k],ow=WOWN[k],eq=T.wp===k;if(k==='laser'&&T.sh==='e')return `<div style="margin-top:8px"><b>${w.n}</b><div style="opacity:.7">${w.d}</div><div style="color:#ff9a4f">No compatible con el Explorador</div></div>`;return `<div style="margin-top:8px"><b style="color:${eq?'#7dff9b':'#cfe8ff'}">${w.n}</b><div style="opacity:.7">${w.d}</div>`+(ow?(eq?'<div style="color:#7dff9b">Equipada</div>':sq('Equipar','data-we="'+k+'"','width:100%;margin-top:4px')):(d&&d.n==='Estación Vega'?sq('Comprar · '+w.pr+' '+ric('cred',14),'data-wb="'+k+'"','width:100%;margin-top:4px'):`<div style="opacity:.75">Se compra en Estación Vega · ${w.pr} ${ric('cred',14)}</div>`))+`</div>`}).join('')+`</div>`}
function buyW(k){if(k==='laser'&&T.sh==='e')return toast('El Explorador no es compatible con el láser');const d=ship.docked,w=WP[k];if(!d||d.n!=='Estación Vega')return toast('Las armas se venden en Estación Vega');if(WOWN[k])return;if(ship.cred<w.pr)return toast('Créditos insuficientes: '+w.pr+' cr');ship.cred-=w.pr;WOWN[k]=1;T.wp=k;toast(w.n+' comprada y equipada');saveGame()}

function shipTick(){const sig=rq.map(j=>j.k).join()+'|'+(ship.docked?ship.docked.n:'')+'|'+ship.scrap+'|'+ship.cred+'|'+Math.round(gv(selP))+'|'+selP+selTab+PR.map(p=>stT(p[0])[0]+Math.round(gv(p[0]))).join()+(typeof hubSig==='function'?hubSig():'');if(sig!==shSig){shSig=sig;renderShip();return}
  document.querySelectorAll('[data-pb]').forEach(el=>{const j=rq.find(q=>q.k===el.dataset.pb);if(j)el.style.width=Math.min(100,j.t/j.tot*100)+'%'});
  document.querySelectorAll('[data-pt]').forEach(el=>{const j=rq.find(q=>q.k===el.dataset.pt);if(j)el.textContent=Math.floor(j.t/j.tot*100)+'% · quedan '+Math.ceil(j.tot-j.t)+' s'})}
$('shipP').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;if(d.x)return closeShip();if(d.t)selTab=d.t;else if(d.s)selP=d.s;else if(d.u)buy(d.u);else if(d.we){if(d.we==='laser'&&T.sh==='e')toast('El Explorador no es compatible con el láser');else T.wp=d.we}else if(d.wb)buyW(d.wb);else if(d.tr)trlStart();else if(d.card)buyCard();else if(d.imp)impAct(d.imp);else if(d.mk)mkAct(d.mk);else if(d.f)fix(d.f);else if(d.r)PR.forEach(p=>{if(rc(p[0])&&!rq.some(j=>j.k===p[0]))fix(p[0])});renderShip()});
function avoid(o,r,skip){let ax=0,ay=0;const la=Math.hypot(o.vx||0,o.vy||0)*.5;for(const a of asts){if(a===skip)continue;const dx=o.x-a.x;if(dx>700||dx<-700)continue;const dy=o.y-a.y;if(dy>700||dy<-700)continue;const d=Math.hypot(dx,dy),s=a.r+r+70+la;if(d<s&&d>1){const p=(s-d)/s,nx=dx/d,ny=dy/d,sg=(nx*(o.vy||0)-ny*(o.vx||0))>=0?1:-1;ax+=nx*p-ny*sg*p*.8;ay+=ny*p+nx*sg*p*.8}}return[ax,ay]}
function pickPart(px,py){const{cx,cy,sc}=SL;let b=null,bd=Math.max(5.5*sc,18);for(const k in PP){const d=Math.hypot(cx+PP[k][1]*sc-px,cy-PP[k][0]*sc-py);if(d<bd){bd=d;b=k}}
  if(!b){const d=Math.hypot(px-cx,py-cy);if(d>24*sc&&d<36*sc)b='shd';else if(d<20*sc)b='hull'}if(b){selP=b;renderShip()}}
function drawShip(){g.fillStyle='#04060c';g.fillRect(0,0,W,H);const dy=ship.docked?46:0;if(ship.docked&&typeof hubTab!=='undefined'&&hubTab!=='nave'&&typeof baseInterior==='function'){baseInterior(ship.docked);return}
 const nar=W<720&&W<H*1.34,pw=nar?0:Math.min(390,W*.52),aw=W-pw,ah=nar?H*.5:H,cx=aw/2,cy=nar?ah/2+34:H/2,sc=Math.max(1.5,Math.min(7,aw/84,(ah-70)/84));SL={cx,cy,sc};if(ship.docked&&typeof baseInterior==='function')baseInterior(ship.docked);else{VR=angDiff(ship.a,-Math.PI/2);stars();VR=0}
 const gl=g.createRadialGradient(cx,cy,0,cx,cy,50*sc);gl.addColorStop(0,'rgba(40,110,200,.28)');gl.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gl;g.fillRect(cx-50*sc,cy-50*sc,100*sc,100*sc);
 g.lineWidth=1;g.strokeStyle='rgba(79,209,255,.12)';for(let i=1;i<=3;i++){g.beginPath();g.arc(cx,cy,i*13*sc,0,TAU);g.stroke()}g.beginPath();g.moveTo(cx-48*sc,cy);g.lineTo(cx+48*sc,cy);g.moveTo(cx,cy-48*sc);g.lineTo(cx,cy+48*sc);g.stroke();
 g.strokeStyle=`rgba(79,209,255,${.15+.6*ship.shd/T.shd})`;g.lineWidth=selP==='shd'?4:2;g.setLineDash([10,8]);g.lineDashOffset=-time*20;g.beginPath();g.arc(cx,cy,30*sc,0,TAU);g.stroke();g.setLineDash([]);
 {const rv0=angDiff(ship.a,-Math.PI/2),k0=sc/1.1,mw=()=>{g.translate(cx,cy);g.rotate(rv0);g.scale(k0,k0);g.translate(-ship.x,-ship.y)};g.save();mw();fxTrail();g.restore();drawS(cx,cy,-Math.PI/2,T.sh,heatCol(),sc,{...pst(),th:.5});g.save();mw();heatGlow(k0);g.restore()}
 {const rv=angDiff(ship.a,-Math.PI/2),ct=Math.cos(rv),st=Math.sin(rv),k=sc/1.1,r2=(Math.max(W,H)/k)**2,f=(x,y)=>[cx+(x*ct-y*st)*k,cy+(x*st+y*ct)*k];g.lineCap='round';
  for(const b of bullets){if(b.own==='p')continue;const dx=b.x-ship.x,dy=b.y-ship.y;if(dx*dx+dy*dy>r2)continue;const p1=f(dx,dy),p2=f(dx-b.vx*.015,dy-b.vy*.015);g.strokeStyle=b.own==='e'?'rgba(255,90,90,.95)':'rgba(120,230,255,.95)';g.lineWidth=3;g.beginPath();g.moveTo(p1[0],p1[1]);g.lineTo(p2[0],p2[1]);g.stroke()}
  for(const q of parts){const dx=q.x-ship.x,dy=q.y-ship.y;if(dx*dx+dy*dy>r2)continue;const p1=f(dx,dy);g.globalAlpha=clamp(q.life/q.max,0,1);g.fillStyle=q.c;g.fillRect(p1[0]-1.5,p1[1]-1.5,3,3)}g.globalAlpha=1;g.lineCap='butt';
  const hk=time-shHitT;if(hk<.5){const aa=shHitA+rv,al=1-hk/.5;g.strokeStyle='rgba(140,225,255,'+al+')';g.lineWidth=6;g.beginPath();g.arc(cx,cy,30*sc,aa-.55,aa+.55);g.stroke();const hx=cx+Math.cos(aa)*30*sc,hy=cy+Math.sin(aa)*30*sc,gr=g.createRadialGradient(hx,hy,0,hx,hy,22);gr.addColorStop(0,'rgba(220,245,255,'+al+')');gr.addColorStop(1,'rgba(220,245,255,0)');g.fillStyle=gr;g.fillRect(hx-22,hy-22,44,44)}}
 for(const k in PP){const[x,y]=PP[k],px=cx+y*sc,py=cy-x*sc,[,c]=stT(k),se=selP===k,cr=gv(k)>0&&gv(k)/gm(k)<.4,r=Math.min(Math.max(2.4*sc,10),6.6*sc)+(se?2*Math.sin(time*6):0);g.beginPath();g.arc(px,py,r,0,TAU);g.fillStyle=gv(k)<=0?'#1f2630':c;g.globalAlpha=gv(k)<=0?.9:cr?.25+.2*Math.sin(time*7):.3;g.fill();g.globalAlpha=1;g.strokeStyle=c;g.lineWidth=se?3:1.8;g.stroke();if(se)brk(px,py,r+8,'#fff');
   {const z=r*1.3;g.save();g.translate(px-z/2,py-z/2);g.scale(z/24,z/24);g.lineWidth=2.4;g.lineCap='round';g.lineJoin='round';g.strokeStyle=gv(k)<=0?'#7b8798':'#eaf6ff';g.stroke(P2[k]);g.restore()}
   if(!nar&&aw>=560)txt(NM[k]+' '+Math.round(gv(k)/gm(k)*100)+'%',px+(y<0?-1:1)*(r+8),py+4,c,y<0?'right':'left',11);else if(se){const lb=NM[k]+' '+Math.round(gv(k)/gm(k)*100)+'%';g.font='11px ui-monospace,Menlo,monospace';const hw=g.measureText(lb).width/2+6;txt(lb,clamp(px,hw,aw-hw),py+r+16,c,'center',11)}}
 txt('INGENIERÍA · '+T.n.toUpperCase(),16,24+dy,'#4fd1ff','left',14);if(nar||H>=500){bar(16,34+dy,110,ship.hull,T.hull,'#ff6b6b','CASCO '+Math.round(ship.hull)+'/'+T.hull);bar(16,56+dy,110,ship.shd,T.shd,'#4fd1ff','ESCUDO '+Math.round(ship.shd)+'/'+T.shd);bar(16,78+dy,110,ship.en,100,'#7dff9b','ENERGÍA '+Math.floor(ship.en)+'%');if(T.sh==='e'){const i=ehInfo();bar(16,100+dy,110,i.h,100,i.c,'MOTORES '+(ship.ehR>0?'EN REPOSO '+Math.ceil(ship.ehR)+' s':Math.round(i.h)+'%'))}}
 if(!ship.docked&&npcs.some(n=>n.team==='e'&&dist(n,ship)<900))txt('⚠ ENEMIGOS CERCA · el juego sigue en marcha',aw/2,24,'#ff6b6b','center',14);if(nar||H>=500)txt('CHATARRA '+ship.scrap+' · CARGA '+Math.floor(ship.ore)+'/'+T.cargo,16,(T.sh==='e'?134:112)+dy,'#cfe8ff','left',12);txt('Toca un componente de la nave',cx,nar?ah-8:H<500?H-8:cy+44*sc,'rgba(207,232,255,.45)','center',10)}
function openHangar(){if(!ship.docked||state!=='play'||hgL)return;if(Math.hypot(ship.vx,ship.vy)>25)return toast('Quédate quieto para entrar al hangar');hgL={t:0,p:ship.hull+ship.shd}}
function hgTick(dt){if(!hgL)return;const cur=ship.hull+ship.shd;if(ship.dead>0||!ship.docked||state!=='play'||Math.hypot(ship.vx,ship.vy)>40){hgL=null;return}if(cur<hgL.p-.01){hgL=null;toast('Entrada al hangar cancelada: te están disparando');return}hgL.p=cur;hgL.t+=dt;if(hgL.t>=1){hgL=null;setState('hangar');qEv('han');tn(520,780,.35,'sine',.1)}}
function drawHgL(){const p=clamp(hgL.t,0,1),cx=W/2,cy=H*.5,R=34;g.save();g.lineCap='round';g.lineWidth=5;g.strokeStyle='rgba(79,209,255,.2)';g.beginPath();g.arc(cx,cy,R,0,TAU);g.stroke();g.strokeStyle='#7dff9b';g.beginPath();g.arc(cx,cy,R,-Math.PI/2,-Math.PI/2+TAU*p);g.stroke();g.lineWidth=1.5;g.strokeStyle='rgba(79,209,255,.5)';g.beginPath();g.arc(cx,cy,R+9+3*Math.sin(time*10),0,TAU);g.stroke();g.restore();txt('ENTRANDO AL HANGAR',cx,cy+R+26,'#7dff9b','center',13)}
const mapV=()=>state==='map'||(state==='warp'&&wmap);
function toggleMap(){if(state==='warp'){if(wmap){wmap=0;zoom=zp;$('panel').classList.add('hide')}else{wmap=1;wmapF=1;zp=zoom;mc={x:ship.x,y:ship.y};zoom=Math.min(zoom,.02);mapT=time;$('panel').classList.remove('hide');for(const i of['info','bGo','bCr'])$(i).classList.add('hide')}return}
  if(state==='map'){sel=null;zoom=zp;setState('play')}else if(state==='play'){sel=null;zp=zoom;mc={x:ship.x,y:ship.y};zoom=Math.min(zoom,.02);setState('map');mapT=time;qEv('map');updInfo()}}
addEventListener('keydown',e=>{const c=e.code;
  if(c==='KeyM')toggleMap();else if(c==='Escape'&&mapV())toggleMap();
  else if(c==='Enter'&&state==='map')confirmGo();else if(c==='KeyN'){if(state==='ship')closeShip();else openShip()}else if(c==='KeyH'&&state==='play')openHangar();else if(c==='KeyT'&&state==='play')cycleLock();else if(c==='KeyF'&&state==='play')wToggle();else if(c==='KeyI'&&state!=='warp'&&state!=='map'&&state!=='menu')invToggle();else if(state==='play'&&(c==='KeyW'||c==='ArrowUp'))thrSet(.1);else if(state==='play'&&(c==='KeyS'||c==='ArrowDown'))thrSet(-.1);else if(state==='play'&&(c==='KeyX'||c==='Space'))brakeNow();else if(c==='Escape'){if(state==='play'||state==='hangar')openPause();else if(state==='ship')closeShip()}});

/* ===== MAPA: selección de destino ===== */
const SYSN='Sistema Alfa',SYSZ0=.0075,SYSZ1=.0105;
const sysR=a=>{const F=FIELDS.find(q=>q.ring);return F?((F.rr(a)+RINGW*1.25)*1.05+700):0},sysIn=(x,y)=>{const r=sysR(Math.atan2(y,x));return r>0&&Math.hypot(x,y)<r};
function mt(){return{s:zoom,ox:W/2-mc.x*zoom,oy:H/2-mc.y*zoom}}
function pickPoint(px,py){if(ship.dead>0)return;const M=mt(),sy0=zoom<SYSZ0&&sysR(0),L=[...BASES.filter(b=>(b===A||known(b,b.r+300))&&!(sy0&&sysIn(b.x,b.y))&&!(b.rg&&RGH(r=>r.sumName(b.x,b.y,zoom)))).map(b=>({n:b.n,x:b.x+150,y:b.y,cx:b.x,cy:b.y})),...FIELDS.filter(F=>!F.ring&&fk(F)&&!(sy0&&sysIn(F.x,F.y))).map(F=>({n:F.n,x:F.x,y:F.y,cx:F.x,cy:F.y}))];
  let best=null,bd=40;for(const p of L){const d=Math.hypot(M.ox+p.cx*M.s-px,M.oy+p.cy*M.s-py);if(d<bd){bd=d;best=p}}
  if(best)sel={n:best.n,x:best.x,y:best.y,cx:best.cx,cy:best.cy};
  else{const x=(px-M.ox)/M.s,y=(py-M.oy)/M.s;sel={n:sy0&&sysIn(x,y)?SYSN:RGH(r=>r.sumName(x,y,zoom))||(FIELDS.find(F=>F.ins(x,y)&&fk(F))||{n:'Coordenadas libres'}).n,x,y}}
  updInfo()}
cv.addEventListener('pointerdown',e=>{mouse={x:e.clientX,y:e.clientY};
  if(state==='map'){}
  else if(state==='play'&&(!ship.dead||ship.wreck)&&e.button!==2&&ptr.size<2&&!aiW){const m=mmR();if(!ship.dead&&e.clientX>=m.x&&e.clientX<=m.x+20*(CFG.ui||1)&&e.clientY>=m.y&&e.clientY<=m.y+20*(CFG.ui||1)){mmZ=mmZ===1?1.8:mmZ===1.8?.6:1;return}
    if(e.clientX>=m.x&&e.clientX<=m.x+m.w&&e.clientY>=m.y&&e.clientY<=m.y+m.h+28*(CFG.ui||1)){toggleMap();return}
    if(ship.dead)return;if(e.shiftKey&&worldMenu(e.clientX,e.clientY))return;hold=1;ship.orbit=ship.mt=ship.mc=null;ship.dest={x:w2x(e.clientX),y:w2y(e.clientY)};if(e.pointerType==='touch'){clearTimeout(lp);lp=setTimeout(()=>{if(worldMenu(e.clientX,e.clientY))hold=0},450)}}});
cv.addEventListener('pointermove',e=>{mouse={x:e.clientX,y:e.clientY}});
function updInfo(){if(ship.wreck){$('info').innerHTML='<span style="color:#ff6b6b">NAVE INUTILIZADA: salto y navegación bloqueados. Solo puedes consultar el mapa; pide ayuda desde el panel.</span>';$('bGo').style.opacity=.35;return}if(!sel){$('info').innerHTML='Toca el mapa para elegir un destino. Clic derecho (táctil: doble toque): salto o rumbo normal.';$('bGo').style.opacity=.4;return}
  const d=dist(ship,sel),long=d>C.jumpMin,c=jumpCost(d),bad=long&&ship.en<c;$('bGo').style.opacity=1;
  $('info').innerHTML=`DESTINO: <b>${sel.n}</b><br>Distancia ${km(d)} · `+(long?`<span style="color:${bad?'#ff6b6b':'#7dff9b'}">SALTO: coste ${c}% de energía (tienes ${Math.floor(ship.en)}%)${bad?' · faltan ~'+Math.ceil((c-ship.en)/(T.regen*.12))+' s':''}</span>`:'vuelo de crucero, sin coste')}
function confirmGo(){if(state!=='map'||!sel)return;if(ship.wreck){toast('Nave inutilizada: no puedes saltar ni navegar. Pide ayuda');return}if(RGH(r=>r.locked&&r.locked())){toast('⛔ Los saltos están bloqueados mientras la guardia te retiene');return}const d=dist(ship,sel);
  if(d<120){toast('Ya estás en ese punto');setState('play');return}
  if(d>C.jumpMin){if(!eff('jmp')){toast('Propulsor de salto averiado: repáralo');return}const c=jumpCost(d);if(c>100&&!CFG.ie){toast('Fuera de alcance: con la energía completa el salto máximo es '+km(Math.floor((100/Math.max(T.jump*(eff('jmp')<1?1.5:1),.01)-30)*650*C.jr)));updInfo();return}if(ship.en<c){toast(`Energía insuficiente: necesitas ${c}%`);updInfo();return}
    ship.en-=c;ship.dest=null;ship.docked=null;ship.vx=ship.vy=0;warp={t:0,dest:{...sel},a:{x:ship.x,y:ship.y},t1:2.5,te:2.5+Math.max(1.2,d/12000)/wspV(),done:0,c,h:Math.atan2(sel.y-ship.y,sel.x-ship.x)};sfx('w');qEv('nav');setState('warp')}
  else{ship.dest={x:sel.x,y:sel.y};qEv('nav');setState('play')}}

/* ===== ZOOM Y GESTOS ===== */
const w2x=px=>cam.x+(px-W/2)/zoom,w2y=py=>cam.y+(py-H/2)/zoom;
const ptr=new Map();let drag=null,pinch=0;
const pd=()=>{const a=[...ptr.values()];return Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)||1},pm=()=>{const a=[...ptr.values()];return{x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2}};
function zoomAt(px,py,f){if((aiW&&state==='play')||(state!=='play'&&!mapV()))return;zRet=null;const z0=zoom,mp=mapV();zoom=clamp(zoom*f,mp?(RGH(r=>r.minZoom())||.004):.5,mp?1.5:3.6);
  if(mp){const wx=mc.x+(px-W/2)/z0,wy=mc.y+(py-H/2)/z0;mc.x=wx-(px-W/2)/zoom;mc.y=wy-(py-H/2)/zoom;RGH(r=>r.onZoom(f))}}
cv.addEventListener('wheel',e=>{e.preventDefault();zoomAt(e.clientX,e.clientY,Math.exp(-e.deltaY*.0015))},{passive:false});
cv.addEventListener('pointerdown',e=>{if(state==='play'&&ship.wreck)wmAt=time;if(aiW&&state==='play')return;if(e.pointerType==='mouse'&&e.button===2){if(state==='play'&&!ship.dead){if(!quickAct(e.clientX,e.clientY)){fireOn=1;mouse={x:e.clientX,y:e.clientY}}}return}ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});if(ptr.size===2){pinch=pd();hold=0;drag=null}else if(ptr.size===1)drag={m:0};try{cv.setPointerCapture(e.pointerId)}catch(_){}},true);
cv.addEventListener('pointermove',e=>{const p=ptr.get(e.pointerId);if(!p)return;const ox=p.x,oy=p.y;p.x=e.clientX;p.y=e.clientY;
  if(ptr.size===2){const d=pd(),m=pm();if(pinch>0)zoomAt(m.x,m.y,d/pinch);pinch=d;if(drag)drag.m=99;return}
  if(drag&&mapV()){drag.m+=Math.hypot(p.x-ox,p.y-oy);if(drag.m>6){if(state==='warp')wmapF=0;mc.x-=(p.x-ox)/zoom;mc.y-=(p.y-oy)/zoom}}},true);
const pu=e=>{if(!ptr.has(e.pointerId))return;ptr.delete(e.pointerId);
  if(drag&&!ptr.size&&drag.m<=6&&e.type==='pointerup'&&e.button!==2){if(state==='map'){if(time-mapT>.4){const al=mapAllyAt(e.clientX,e.clientY);if(al)wInfoOpen(al);else pickPoint(e.clientX,e.clientY)}}else if(state==='ship')pickPart(e.clientX,e.clientY)}
  if(ptr.size<2)pinch=0;if(!ptr.size)drag=null};
addEventListener('pointerup',pu);addEventListener('pointercancel',pu);
/* ===== Doble toque = clic derecho (solo táctil/lápiz) ===== */
const DT={s:null,last:null,bad:0,cool:0};
function ripple(x,y){const d=document.createElement('div');d.className='rip';d.style.left=x+'px';d.style.top=y+'px';document.body.appendChild(d);setTimeout(()=>d.remove(),600);try{navigator.vibrate&&navigator.vibrate(15)}catch(_){}}
function dtAct(x,y){
  if(state==='map'){{const al=mapAllyAt(x,y);if(al){allyMenu(x,y,al);return 1}}if(ship.dead>0)return 0;pickPoint(x,y);showCtx(x,y);return 1}
  if(state==='play'&&!ship.dead){const m=mmR();if(x>=m.x&&x<=m.x+m.w&&y>=m.y&&y<=m.y+m.h+28*(CFG.ui||1))return 0;
    if(quickAct(x,y)){ship.dest=null;hold=0;clearTimeout(lp);return 1}}
  return 0}
cv.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;
  if(ptr.size>=2){DT.bad=1;DT.s=null;DT.last=null;return}
  DT.bad=0;DT.s={id:e.pointerId,x:e.clientX,y:e.clientY,t:performance.now(),mv:0,st:state}},true);
cv.addEventListener('pointermove',e=>{const s=DT.s;if(s&&s.id===e.pointerId&&Math.hypot(e.clientX-s.x,e.clientY-s.y)>10)s.mv=1},true);
addEventListener('pointerup',e=>{const s=DT.s;if(!s||s.id!==e.pointerId)return;DT.s=null;
  const now=performance.now();if(DT.bad||s.mv||now-s.t>350||s.st!==state){DT.last=null;return}
  const L=DT.last;
  if(L&&L.st===state&&now-L.t<320&&Math.hypot(L.x-e.clientX,L.y-e.clientY)<32&&now>DT.cool){DT.last=null;DT.cool=now+450;if(dtAct(e.clientX,e.clientY))ripple(e.clientX,e.clientY)}
  else DT.last={t:now,x:e.clientX,y:e.clientY,st:state}});
addEventListener('pointercancel',()=>{DT.s=null;DT.last=null});

const h2=(i,j,k)=>{const x=Math.sin(i*127.1+j*311.7+k*74.7)*43758.5453;return x-Math.floor(x)};
function poiDraw(X,Y,x0,x1,y0,y1,sc){const S=3000;if((x1-x0)/S>60)return;
  for(let i=Math.floor(x0/S);i<=Math.floor(x1/S);i++)for(let j=Math.floor(y0/S);j<=Math.floor(y1/S);j++){if(h2(i,j,1)<.5)continue;const x=(i+h2(i,j,2))*S,y=(j+h2(i,j,3))*S;if(Math.hypot(x,y)<RINGR+4000)continue;
    const r=Math.max(2,(300+h2(i,j,5)*900)*sc);g.beginPath();g.arc(X(x),Y(y),r,0,TAU);g.fillStyle=h2(i,j,4)<.5?'rgba(150,160,180,.22)':'rgba(190,110,255,.22)';g.fill();if(sc>.03)txt('? sector sin explorar',X(x),Y(y)-r-3,'rgba(200,210,230,.5)','center',9)}}

const CELL=300,RV=700;let EX=[];const EXS=new Set(),ck=(i,j)=>(i+200000)*400000+(j+200000);
function reveal(){const RR=Math.hypot(W,H),n=Math.ceil(RR/CELL)+1,ci=Math.floor(ship.x/CELL),cj=Math.floor(ship.y/CELL);for(let i=ci-n;i<=ci+n;i++)for(let j=cj-n;j<=cj+n;j++){if(Math.hypot((i+.5)*CELL-ship.x,(j+.5)*CELL-ship.y)>RR)continue;const k=ck(i,j);if(!EXS.has(k)){EXS.add(k);EX.push(i,j)}}}
const fc=document.createElement('canvas'),fg=fc.getContext('2d');
function fog(X,Y,sc,al){if(W<1||H<1)return;if(fc.width!==W||fc.height!==H){fc.width=W;fc.height=H}
  fg.globalCompositeOperation='source-over';fg.clearRect(0,0,W,H);fg.fillStyle='rgba(2,4,10,'+al+')';fg.fillRect(0,0,W,H);fg.globalCompositeOperation='destination-out';const r=RV*sc;
  for(let k=0;k<EX.length;k+=2){const x=X((EX[k]+.5)*CELL),y=Y((EX[k+1]+.5)*CELL);if(x<-r||x>W+r||y<-r||y>H+r)continue;
    if(r<14){fg.fillStyle='#000';fg.beginPath();fg.arc(x,y,r*.85,0,TAU);fg.fill()}
    else{const gr=fg.createRadialGradient(x,y,r*.4,x,y,r);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(1,'rgba(0,0,0,0)');fg.fillStyle=gr;fg.fillRect(x-r,y-r,r*2,r*2)}}
  fg.globalCompositeOperation='source-over';g.drawImage(fc,0,0,W,H)}
function quickAct(px,py){const wx=w2x(px),wy=w2y(py);{const al=allyAt(wx,wy);if(al){allyMenu(px,py,al);return 1}}{const gu=gAt(wx,wy);if(gu){gMenu(px,py,gu);return 1}}{const wr=mpWreckAt(wx,wy);if(wr){mpAidMenu(px,py,wr);return 1}}let en=null,ed=45/zoom;for(const n of npcs)if(n.team==='e'||(n.boss&&n.evs&&n.hp>0)){const d=Math.hypot(n.x-wx,n.y-wy)-(n.rad||18);if(d<ed){ed=d;en=n}}
  if(en){ship.lock=en;ship.orbit=1;ship.mt=null;ship.oa=Math.atan2(ship.y-en.y,ship.x-en.x);toast('Órbita de ataque');return 1}
  let cm=null,cd=60/zoom;for(const c of cmts){const d=Math.hypot(c.x-wx,c.y-wy)-c.r;if(d<cd){cd=d;cm=c}}
  if(cm){if(T.md.includes('col')){mode.col=true;buildModes()}ship.cl=ship.mc=cm;ship.mt=null;ship.orbit=null;ship.dest=null;toast('Cometa fijado · recogiendo '+CK[cm.k].m);return 1}
  let as=null,ad=40/zoom;for(const a of asts){const d=Math.hypot(a.x-wx,a.y-wy)-a.r;if(d<ad){ad=d;as=a}}
  if(as){if(!canMine(as)){toast(needMsg(as));return 1}if(T.md.includes('col')){mode.col=true;buildModes()}ship.mt=as;ship.orbit=null;ship.dest=null;toast('Minando '+(MIN[as.m]?MIN[as.m][0]:'roca'));return 1}return 0}
let omAn=0,omW=0;const omHostile=()=>!QX.card&&(dist(ship,OM)<OM.r+2600||time<omAn)&&!ship.docked;
const MIN={fe:['Hierro','#b0b8c8',.7],cu:['Cobre','#e08a4f',1],cr:['Cristal','#7fe8ff',1.6],pt:['Platino','#ffd166',2.5],ti:['Titanio','#9fb7ff',3.6,1],ir:['Iridio','#ff7ad9',5.5,2],ne:['Neutronita','#7dffb0',9,3]};
const canMine=a=>((MIN[a.m]||[])[3]||0)<=((T.lv||{}).min||0),needMsg=a=>'Necesitas mejorar el Sistema de minería a nivel '+MIN[a.m][3]+' para minar '+MIN[a.m][0]+' (mejoras en estaciones)';
let invT=0;
function invRender(){const tot=Object.values(ship.inv).reduce((a,b)=>a+b,0);let v=0;
 let h=`<div style="display:flex;justify-content:space-between;align-items:center"><b style="color:#4fd1ff;letter-spacing:.12em;font-size:15px">INVENTARIO · ${T.n.toUpperCase()}</b><button class="sq" data-x=1 style="position:static;padding:8px 12px">Cerrar</button></div>
<div style="margin:8px 0">Bodega ${tot.toFixed(1)} / ${T.cargo}</div><div class=bb style="height:14px"><b style="width:${clamp(ship.ore/T.cargo,0,1)*100}%;background:#ffd166"></b></div>`;
 for(const k in MIN){const q=ship.inv[k]||0,p=Math.round(C.sell*MIN[k][2]);v+=Math.floor(q)*p;h+=`<div style="display:flex;align-items:center;gap:8px;margin:6px 0">${ric(k,18)}<span style="flex:1">${MIN[k][0]}</span><b>${q.toFixed(1)}</b><span style="opacity:.6;width:78px;text-align:right">${p} ${ric('cred',13)}/u</span></div>`}
 {const cs=Object.keys(ship.cm||{}).filter(k=>ship.cm[k]>.05);if(cs.length){h+=`<div style="margin-top:10px;opacity:.7;font-size:12px">POLVO DE COMETA (sin uso por ahora)</div>`;for(const k of cs)h+=`<div style="display:flex;align-items:center;gap:8px;margin:6px 0">${ric('c'+k,18)}<span style="flex:1">${CK[k].m}</span><b>${ship.cm[k].toFixed(1)}</b></div>`}}
 {const sp=ship.sp||{};if((sp.zf|0)>0)h+=`<div style="margin-top:10px;opacity:.7;font-size:12px">MATERIAL ÚNICO · FACCIÓN ZAFIRO (no se vende · sin uso por ahora)</div><div style="display:flex;align-items:center;gap:8px;margin:6px 0">${ric('zf',18)}<span style="flex:1;color:#8fc4ff">Corazón de Zafiro</span><b>${sp.zf|0}</b></div>`}
 h+=`<div style="border-top:1px solid var(--bd);padding-top:8px;margin-top:8px">Valor estimado: <span class=cc>${ric("cred")}<b style="color:#ffd166">${v}</b></span> (Base Beta ×1.5)<br><span class=cc>${ric("scrap")}<b>${ship.scrap}</b></span> chatarra (reparaciones) · <span class=cc>${ric("cred")}<b>${ship.cred}</b></span></div><div style="opacity:.6;margin-top:6px;font-size:12px">Las vetas brillantes de cada asteroide indican su mineral.</div>`;$('invP').innerHTML=h}
function invToggle(){const p=$('invP');if(p.classList.contains('hide')){p.classList.remove('hide');invRender();qEv('inv')}else p.classList.add('hide')}
$('bInv').onclick=invToggle;$('invP').addEventListener('click',e=>{if(e.target.closest('[data-x]'))$('invP').classList.add('hide')});
const stab=()=>(eff('eng')+eff('eg2'))/2;
function zonePart(src){const ks=Object.keys(ship.parts);if(src==null||Math.random()<.3)return ks[Math.floor(Math.random()*ks.length)];const r=angDiff(ship.a,src),ar=Math.abs(r);return ar<.7?'wpn':ar<2.1?(r<0?'min':'jmp'):(r<0?'eng':'eg2')}

