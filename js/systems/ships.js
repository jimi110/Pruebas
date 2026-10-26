/* ============================================================================
   systems/ships.js — Naves aliadas: flota/escoltas, órdenes y menús, saltos de flota, tutorial de escoltas, nave inutilizada.
   (Trozo de la antigua pieza única de index.html. Se carga como script clásico en orden:
   comparte el ámbito global con el resto de js/. NO cambies el orden de carga en index.html.)
   ========================================================================== */
"use strict";
function wP(st){const b=$('bEsc'),p=$('wP'),k=$('wk'),u=wUnl();if(b)b.classList.toggle('hide',st!=='play'||!u);if(p)p.classList.toggle('hide',!wOpen||st!=='play'||!u);if(k)k.classList.toggle('hide',!ship.wreck||st!=='play')}
function wCloseAll(){const c=$('ctx');if(c){c.classList.add('hide');c.dataset.src=''}if(aiW)wInfoClose();if(wtOn)wTutClose()}
function wToggle(){if(ship.wreck)return;if(!wUnl())return toast('Recluta una nave o desbloquea el Técnico en Base Omega');wOpen=!wOpen;wLast='';if(!wOpen)wCloseAll();wP(state);if(wOpen)wRender()}
function wSlot(i,n){const f=WG.f,r=1+(i>>1),sd=i%2?1:-1;
 if(f==='line')return[-(i+1)*85,0];if(f==='flank')return[-20,sd*r*90];
 if(f==='sq')return[[-100,-100],[-100,100],[100,-100],[100,100]][i];
 if(f==='circ'){const a=i/n*TAU+time*.35;return[Math.cos(a)*140,Math.sin(a)*140]}
 return n===1?[-70,-70]:[-r*70,sd*r*75]}
function recruit(){const ti=(Math.random()*5)|0,t=TYPES[ti],mx=Math.round(t.hull*.5+40);
 const w={x:ship.x+rnd(-60,60),y:ship.y+rnd(-60,60),vx:0,vy:0,a:ship.a,hp:mx*.4,max:mx,smax:Math.round(t.shd*.5),shd:Math.round(t.shd*.2),cd:0,n:t.n,ti,sh:t.sh,col:t.col,spd:t.spd*.9,dmg:Math.max(5,t.dmg*.8),rate:t.rate*1.3,st:'idle',own:0,hx:ship.x,hy:ship.y,oa:rnd(0,TAU)};
 w.hb=nBase(ship);
 if(ownN()>=4){const g=Math.round(PRC[ti]*.4),b=nBase(ship);ship.cred+=g;w.st='guard';w.hb=b;toast('Flota completa: '+t.n+' pagado +'+g+' cr · se va a escoltar '+b.n)}
 else toast('Nave reparada ('+t.n+'): clic derecho sobre ella para ordenarle. Si no, se queda protegiendo '+w.hb.n);
 wing.push(w);if(wOpen)wRender()}
function setW(a,st){if(!a.own&&ownN()>=4)return toast('Flota llena (4/4)');a.own=1;a.esc=null;if(st==='follow')wBs(a);a.st=st;a.jp=null;if(st==='base'){a.hb=nBase(a);toast('Va a '+a.hb.n+' a esperar')}else toast('Se une a tu formación');qEv('wgf');if(wOpen)wRender()}
const ALP_PR=700,OMG_PR=2200;
function gAt(wx,wy){let r=null,rd=45/zoom;for(const n of npcs)if(n.team==='g'&&!n.gv&&n.hp>0&&(!n.om||QX.card)){const d=Math.hypot(n.x-wx,n.y-wy)-(n.rad||18);if(d<rd){rd=d;r=n}}return r}
function recruitG(n){if(n.om){if(!QX.card)return toast('Necesitas la tarjeta de acceso de Omega');if(omHostile())return toast('La guardia de Omega te ataca: no puede unirse')}else if(wanted)return toast('La guardia de Alfa te ataca: no puede unirse');if(ownN()>=4)return toast('Flota llena (4/4)');const PR_=n.om?OMG_PR:ALP_PR;if(ship.cred<PR_)return toast('Créditos insuficientes ('+PR_+' cr)');const i=npcs.indexOf(n);if(i<0)return;const t=TYPES[0],mx=Math.round(t.hull*.5+40);ship.cred-=PR_;npcs.splice(i,1);
 wing.push({x:n.x,y:n.y,vx:n.vx||0,vy:n.vy||0,a:n.a,hp:n.om?200:mx,max:n.om?200:mx,smax:n.om?140:Math.round(t.shd*.5),shd:n.om?140:Math.round(t.shd*.5),cd:0,n:n.om?'Guardián de Omega':'Guardián de Alfa',ti:0,sh:t.sh,col:n.om?'#ff9a4f':t.col,spd:n.om?t.spd*1.05:t.spd*.9,dmg:n.om?16:Math.max(5,t.dmg*.8),rate:n.om?.3:t.rate*1.3,st:'follow',own:1,hx:n.x,hy:n.y,oa:rnd(0,TAU),hb:nBase(n)});
 qEv('wgf');toast((n.om?'Guardián de Omega':'Guardián de Alfa')+' reclutado (-'+PR_+' cr): se une a tu formación');if(wOpen)wRender()}
function gMenu(px,py,n){ctxMenu(px,py,[['Reclutar Guardián de '+(n.om?'Omega · '+OMG_PR:'Alfa · '+ALP_PR)+' cr',()=>recruitG(n)]])}
function allyAt(wx,wy){let r=null,rd=50/zoom+14;for(const w of wing){const d=Math.hypot(w.x-wx,w.y-wy);if(d<rd){rd=d;r=w}}return r}
function allyMenu(px,py,a){if(ship.dead&&!ship.wreck&&!a.svc)return;if(a.svc||a.st==='rescue')return ctxMenu(px,py,[['Información',()=>wInfoOpen(a)]]);const it=[],pr=PRC[a.ti];
 if(a.st==='guard')it.push(['Unirse a tu formación · '+pr+' cr',()=>{if(ownN()>=4)return toast('Flota llena (4/4)');if(ship.cred<pr)return toast('Créditos insuficientes ('+pr+' cr)');ship.cred-=pr;setW(a,'follow')}]);
 else{if(ship.wreck)it.push(['Rescate',()=>wCallOne(a)]);else if(a.st!=='follow')it.push(['Seguirme',()=>setW(a,'follow')]);else it.push([a.bs?'Volver a '+a.bs.n:'Dejar de seguir',()=>wStop(a,px,py),'dng']);it.push(['Enviar a una base…',()=>baseMenu(px,py,a)])}
 it.push(['Información',()=>wInfoOpen(a)]);if(MP.role&&a.own&&!ship.wreck)it.push(['Escoltar a un jugador…',()=>escMenu(px,py,a)]);ctxMenu(px,py,it)}
/* base de origen: se recuerda al empezar a seguirte; si nunca estuvo en una base se pregunta adónde llevarla */
function escMenu(px,py,a){const L=[],now=performance.now();for(const k in MPR){const r=MPR[k];if(r.sx==null||now-r.t>5000)continue;L.push(['Para ayudar a '+r.n,()=>escSend(a,r,'help')]);L.push(['Para matar a '+r.n+(MP.pvp?'':' · solo en PVP'),()=>escSend(a,r,'kill'),MP.pvp?'dng':'dis'])}
 if(!L.length)return toast('No hay otros jugadores en la sala');L.push(['‹ Atrás',()=>allyMenu(px,py,a)]);ctxMenu(px,py,L)}
function escSend(a,r,k){if(k==='kill'&&!MP.pvp)return toast('Solo se puede atacar a jugadores en modo PVP');a.own=1;a.esc={id:r.id,k,n:r.n};a.st='esc';a.jp=null;toast(a.n+(k==='kill'?' va a por ':' va a escoltar a ')+r.n);if(wOpen)wRender()}
function wEsc(w,dt){const r=MPR[w.esc.id],kill=w.esc.k==='kill';
 if(!r||r.sx==null||performance.now()-r.t>8000){w.esc=null;w.st='follow';toast(w.n+' pierde el contacto y vuelve contigo');return}
 if(kill&&!MP.pvp){w.esc=null;w.st='follow';toast('PVP desactivado: '+w.n+' vuelve contigo');return}
 const fe=wing.filter(q=>q.st==='esc'&&q.esc&&q.esc.id===w.esc.id),i=Math.max(0,fe.indexOf(w)),far=dist(w,r);
 if(far>7000&&!w.jp){wJump(w,{x:r.x-Math.cos(r.a||0)*220,y:r.y-Math.sin(r.a||0)*220},.3,1.2);return}
 let tg=null,td=1e9;
 if(kill){if(!r.dk&&!r.dd&&!r.wk){tg=r;td=far}for(const o of r.wgs||[]){if(o.jp)continue;const d=dist(w,o);if(d<td){td=d;tg={x:o.x,y:o.y,vx:o.svx||0,vy:o.svy||0}}}}
 else for(const o of npcs){if(o.team!=='e'||o.hp<=0||o.evs)continue;const d=dist(w,o);if(d<td&&d<900&&dist(o,r)<1300){td=d;tg=o}}
 if(tg&&td<900){const a=lead(w,tg);w.a+=clamp(angDiff(w.a,a),-1,1)*4*dt;const k=td>300?1:td<180?-.5:0;w.vx=(w.vx+Math.cos(w.a)*w.spd*.9*k*dt)*(1-.8*dt);w.vy=(w.vy+Math.sin(w.a)*w.spd*.9*k*dt)*(1-.8*dt);
  if(td<600&&w.cd<=0&&Math.abs(angDiff(w.a,a))<.15){w.cd=w.rate;bullets.push(bl(w,a+rnd(-.05,.05),'w',w.dmg))}}
 else{const sl=wSlot(i,fe.length),h=r.a||0,px=r.x+Math.cos(h)*sl[0]-Math.sin(h)*sl[1],py=r.y+Math.sin(h)*sl[0]+Math.cos(h)*sl[1],dx=px-w.x,dy=py-w.y,d=Math.hypot(dx,dy),sp=Math.min(w.spd*1.3,d*1.4),bx=r.vx||0,by=r.vy||0;
  let tx=bx+(d>1?dx/d*sp:0),ty=by+(d>1?dy/d*sp:0);const cp=w.spd*1.35,tl=Math.hypot(tx,ty);if(tl>cp){tx*=cp/tl;ty*=cp/tl}wSteer(w,tx-w.vx,ty-w.vy,dt,3.2,cp);if(d<80)w.a+=angDiff(w.a,r.a||0)*Math.min(1,2.5*dt)}
 const o=avoid(w,14,null);w.vx+=o[0]*700*dt;w.vy+=o[1]*700*dt;w.x+=w.vx*dt;w.y+=w.vy*dt}
function wBs(a){if((a.st==='base'||a.st==='idle'||a.st==='guard')&&a.hb)a.bs=a.hb}
function wStop(a,px,py){if(a.bs)return sendW(a,a.bs);toast(a.n+' no tiene base de origen: elige a cuál llevarla');baseMenu(px,py,a)}
function baseMenu(px,py,a){const bs=baseList(a);ctxMenu(px,py,bs.map(b=>['Enviar a '+b.n+' · '+km(dist(a,b)),()=>sendW(a,b)]).concat([['‹ Atrás',()=>allyMenu(px,py,a)]]))}
function sendW(a,b){if(!a.own&&ownN()>=4)return toast('Flota llena (4/4)');a.own=1;a.esc=null;a.st='base';a.hb=b;a.jp=null;toast(a.n+' viaja a '+b.n);qEv('wgf');if(wOpen)wRender()}
function whereIs(o){let n='el espacio profundo',f=0,bd=1e18;for(const b of BASES){const d=dist(o,b);if(d<b.r+1500&&d<bd){bd=d;n='cerca de '+b.n;f=1}}if(!f){for(const F of FIELDS)if(F.ins(o.x,o.y,300)){n='en '+F.n;f=1;break}}if(!f&&dist(o,SCZ)<SCZ.r+400)n='en el '+SCZ.n;return n}
function wLbl(w){if(w.svc)return w.back?'Volviendo a '+w.hb.n.replace('Base ','').replace('Estación ',''):w.arr?(w.k==='tow'?'Remolcando':'Reparando'):'En camino hacia ti';if(w.jp)return'Saltando';if(w.st==='base'){const far=dist(w,w.hb)>w.hb.r+700;return(far?'rumbo a ':'en ')+w.hb.n.replace('Base ','').replace('Estación ','')}if(w.st==='guard')return'guardia (en venta)';if(w.st==='esc'&&w.esc)return(w.esc.k==='kill'?'Cazando a ':'Escoltando a ')+w.esc.n;return({follow:dist(w,ship)>3000?'Rezagada':'Escolta',idle:'Protegiendo '+(w.hb?w.hb.n.replace('Base ','').replace('Estación ',''):'la base'),rescue:'En camino'})[w.st]||w.st}
/* ----- saltos de la flota: viajan de verdad, como tú ----- */
function wJump(w,D,delay,t0){const d=dist(w,D),a=t0==null?1.2:t0;w.jp={a:{x:w.x,y:w.y},d:{x:D.x,y:D.y},t:0,t1:a+(delay||0),te:a+(delay||0)+Math.max(1.2,d/12000)/wspV(),h:Math.atan2(D.y-w.y,D.x-w.x)}}
function wjStep(w,dt){const j=w.jp;j.t+=dt;w.a+=angDiff(w.a,j.h)*Math.min(1,10*dt);if(j.t<j.t1){w.vx=w.vy=0;return}
 const L=j.te-j.t1,p=clamp((j.t-j.t1)/L,0,1),r=clamp(.3/L,.02,.3),nn=1-r;let e,de;
 if(p<r){de=p/r/nn;e=p*p/(2*r)/nn}else if(p>1-r){const q=1-p;de=q/r/nn;e=1-q*q/(2*r)/nn}else{de=1/nn;e=(r/2+p-r)/nn}
 const sp=dist(j.a,j.d)*de/L;w.x=j.a.x+(j.d.x-j.a.x)*e;w.y=j.a.y+(j.d.y-j.a.y)*e;w.a=j.h;w.vx=Math.cos(j.h)*sp;w.vy=Math.sin(j.h)*sp;
 if(j.t>=j.te){w.x=j.d.x;w.y=j.d.y;w.vx=Math.cos(j.h)*w.spd*.6;w.vy=Math.sin(j.h)*w.spd*.6;w.jp=null}}
function wFollowJump(wp){const fo=wing.filter(q=>q.st==='follow'&&q.hp>0&&!q.jp);fo.forEach((q,i)=>{const sl=wSlot(i,fo.length),h=wp.h,D=wp.dest;wJump(q,{x:D.x+Math.cos(h)*sl[0]-Math.sin(h)*sl[1],y:D.y+Math.sin(h)*sl[0]+Math.cos(h)*sl[1]},.6+.5*i,wp.t1+.3)})}
function wHit(b){for(const w of wing)if(w.hp>0&&!w.jp&&Math.hypot(w.x-b.x,w.y-b.y)<18){b.life=0;mpBh(b);{const q=Math.min(w.shd||0,b.d);w.shd=(w.shd||0)-q;w.hp-=b.d-q;w.lh=time;w.by=b.o}if(b.o)b.o.hostile=time;boom(b.x,b.y,4,'#6cf');return true}return false}
const W_D={agr:'Atacan a cualquier enemigo cercano.',def:'Solo atacan a quien os dispare a ti o a ellos.',obj:'Solo atacan a tu objetivo fijado [T] o al último que disparaste.',pas:'No disparan; solo te acompañan.'};
function wCan(w){return w.own&&w.hp>0&&w.st!=='rescue'&&!w.jp}
function wCall(w){if(!w||!w.own||w.hp<=0)return false;if(w.jp){toast(w.n+' está saltando: espera a que llegue');return false}
 if(ship.wreck){if(w.st==='rescue')return false;w.st0=w.st;w.st='rescue';return true}
 if(w.st==='follow')return false;wBs(w);w.esc=null;w.st='follow';return true}
function wCallAll(){let n=0;for(const w of wing)if(wCall(w))n++;toast(n?(ship.wreck?'Patrulla en camino':n+' nave'+(n>1?'s':'')+' en camino a tu posición'):'No hay naves que llamar');if(wOpen)wRender();if(ship.wreck)wkRender()}
function wCallOne(w){if(wCall(w))toast(w.n+(ship.wreck?' viene a ayudarte':' viene a tu posición'));else if(w&&w.own&&w.st==='follow')toast(w.n+' ya está contigo');if(wOpen)wRender();if(ship.wreck)wkRender()}
function morph(a,b){const ac=[...a.childNodes],bc=[...b.childNodes],m=Math.min(ac.length,bc.length);
 for(let i=0;i<m;i++){const x=ac[i],y=bc[i];if(x.nodeType!==y.nodeType||x.nodeName!==y.nodeName){a.replaceChild(y.cloneNode(true),x);continue}
  if(x.nodeType===3){if(x.nodeValue!==y.nodeValue)x.nodeValue=y.nodeValue}
  else if(x.nodeType===1){for(const at of[...x.attributes])if(!y.hasAttribute(at.name))x.removeAttribute(at.name);for(const at of y.attributes)if(x.getAttribute(at.name)!==at.value)x.setAttribute(at.name,at.value);morph(x,y)}}
 for(let i=ac.length-1;i>=m;i--)a.removeChild(ac[i]);for(let i=m;i<bc.length;i++)a.appendChild(bc[i].cloneNode(true))}
function setHtml(el,html){const t=document.createElement('div');t.innerHTML=html;morph(el,t)}
var wLast='';
function wRender(){const F=Object.keys(W_F),B=Object.keys(W_B),n=ownN();
 const card=(w,wi)=>{const t=TYPES[w.ti],hp=clamp(w.hp/w.max,0,1),sh=w.smax?clamp((w.shd||0)/w.smax,0,1):0,d=dist(w,ship),dk=d<1000?Math.round(d)+' m':km(d),near=w.st==='follow'&&d<1500;
  return `<div class="fcd" style="border-color:${w.own?w.col:'#556'}"><div class="fh2"><b style="color:${w.col}">${w.n}</b><span>${w.own?'':'(sin unir) · '}${wLbl(w)}</span></div><div class="fbr"><i><b style="width:${hp*100}%;background:#ff6b6b"></b></i><i><b style="width:${sh*100}%;background:#5fd0ff"></b></i></div><div style="font-size:10.5px;opacity:.7">Casco ${Math.ceil(w.hp)}/${w.max} · Distancia ${dk}</div>
  <div class="fbt">${w.own&&ship.wreck?`<button class="sq" data-w="call:${wi}" ${wCan(w)?'':'disabled'}>Pedir ayuda</button>`:''}<button class="sq" data-w="ord:${wi}">Órdenes…</button></div></div>`};
 const own=wing.map((w,i)=>[w,i]).filter(q=>q[0].own),oth=wing.map((w,i)=>[w,i]).filter(q=>!q[0].own&&q[0].st!=='guard');
 const fb=B.map(k=>`<button class="sq${WG.b===k?' on':''}" data-w="b:${k}">${W_B[k]}</button>`).join(''),
 ff=F.map(k=>{const sl=WTF[k];return `<button class="sq fm2${WG.f===k?' on':''}" data-w="f:${k}"><svg viewBox="-190 -190 380 380" width="46" height="46"><g transform="scale(1.9)">${WTSH('#cfe8ff')}</g>${sl.map(q=>`<g transform="translate(${q[0]*.55},${q[1]*.55}) scale(1.4)">${WTSH('#7dff9b')}</g>`).join('')}</svg><span>${W_F[k]}</span></button>`}).join('');
 const html=`<div class="fti"><span>FLOTA · ${n}/4 naves</span><button class="sq" data-w="x" style="padding:5px 12px;width:auto;flex:0 0 auto">✕ Cerrar</button></div>
 <div class="fcs">${wing.length?own.map(q=>card(q[0],q[1])).join('')+oth.map(q=>card(q[0],q[1])).join(''):'<div style="opacity:.65;padding:6px 2px">Aún no tienes naves. Repara naves averiadas con el Técnico y pulsa clic derecho sobre ellas para unirlas.</div>'}</div>
 ${n?`<div class="fbt" style="margin:8px 0"><button class="sq go" data-w="all" style="flex:1 1 auto">Llamar a toda la flota</button></div>`:''}
 <div class="fl2">Formación</div><div class="fbt">${ff}</div>
 <div class="fl2">Actitud</div><div class="fbt">${fb}</div><div style="font-size:11px;opacity:.75;margin:5px 0 8px">${W_D[WG.b]}</div>
 <div class="fbt"><button class="sq" data-w="h" style="flex:1 1 auto">Ver tutorial</button></div>`;
 setHtml($('wP'),html)}
$('wP').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;const [k,v]=(b.dataset.w||'').split(':'),w=wing[+v];
 if(k==='x')return wToggle();if(k==='h')return wTutOpen(1);if(k==='all')return wCallAll();if(k==='call')return wCallOne(w);if(k==='inf'&&w)return wInfoOpen(w);if(k==='ord'&&w){const c=$('ctx');if(!c.classList.contains('hide')&&c.dataset.src===b.dataset.w){c.classList.add('hide');c.dataset.src='';return}const r=b.getBoundingClientRect();allyMenu(r.left,r.bottom,w);c.dataset.src=b.dataset.w;return}
 if(k==='f')WG.f=v;else if(k==='b')WG.b=v;wRender()});
$('bEsc').onclick=wToggle;
$('ui').insertAdjacentHTML('beforeend','<div id="wk" class="hide" style="pointer-events:auto;position:absolute;left:14px;top:60px;width:min(300px,50%);padding:10px 12px;background:rgba(5,12,22,.94);border:1px solid #ff6b6b;box-sizing:border-box"></div>');
/* ===== Tutorial visual de escoltas (al conseguir el Técnico) ===== */
var wtOn=0,wtI=0,wtAt=0,wtTm=null;
const WTS='<polygon points="12,0 -8,-7 -4,0 -8,7" ',WTSH=(c,o)=>WTS+'fill="#0e1c2c" stroke="'+c+'" stroke-width="1.6" '+(o||'')+'/>';
const WTF={v:[[-70,-75],[-70,75],[-140,-150],[-140,150]],line:[[-85,0],[-170,0],[-255,0],[-340,0]],flank:[[-20,-90],[-20,90],[-20,-180],[-20,180]],sq:[[-100,-100],[-100,100],[100,-100],[100,100]],circ:[[140,0],[0,140],[-140,0],[0,-140]]};
const WTP=[
 {t:'1 · Consigue escoltas',d:'Repara una nave averiada con el Técnico. Después haz clic derecho sobre ella (táctil: doble toque) y elige «Unirse a tu formación». Puedes tener hasta 4.',
  v:()=>`<svg viewBox="0 0 300 150"><g transform="translate(55,95) scale(1.5)">${WTSH('#777')}</g><rect x="52" y="92" width="6" height="6" fill="#ffb347" style="animation:wtb 1s infinite"/><g transform="translate(135,50) scale(1.5)">${WTSH('#c792ff')}</g><line x1="129" y1="56" x2="64" y2="90" stroke="#c792ff" stroke-width="2" stroke-dasharray="5 4" style="animation:wtd .5s linear infinite"/><text x="55" y="128" fill="#aab" font-size="9" text-anchor="middle">Nave averiada</text><text x="135" y="30" fill="#c792ff" font-size="9" text-anchor="middle">Técnico</text><g transform="translate(215,95) scale(1.5)">${WTSH('#7dff9b')}</g><rect x="176" y="30" width="118" height="22" fill="rgba(8,20,36,.95)" stroke="#7dff9b"/><text x="235" y="44" fill="#7dff9b" font-size="8" text-anchor="middle">Unirse a tu formación</text><path d="M232 66 l0 0 l0 13 l4 -3 l3 7 l3 -1 l-3 -7 l5 0 z" fill="#fff" transform="translate(-6,-8)" style="animation:wtp 1s infinite;transform-origin:230px 70px"/><text x="215" y="128" fill="#7dff9b" font-size="9" text-anchor="middle">Escolta</text></svg>`},
 {t:'2 · Formación',d:'Abre «Escolta [F]» y pulsa «Formación» para cambiarla. Tus naves mantienen su sitio respecto a tu rumbo.',
  v:()=>`<svg viewBox="0 0 300 150"><g id="wtG"><g transform="translate(200,75) scale(1.7)">${WTSH('#cfe8ff')}</g>${[0,1,2,3].map(i=>`<g class="fm" id="wtE${i}" style="transform:translate(200px,75px)"><g transform="scale(1.3)">${WTSH('#7dff9b')}</g></g>`).join('')}</g><text id="wtL" x="150" y="143" fill="#c792ff" font-size="11" text-anchor="middle"></text></svg>`,
  on:()=>{const K=Object.keys(WTF);let k=0;const go=()=>{const f=K[k%K.length],L=document.getElementById('wtL');if(!L)return;L.textContent=W_F[f].toUpperCase();WTF[f].forEach((q,i)=>{const e=document.getElementById('wtE'+i);if(e)e.style.transform='translate('+(200+q[0]*.4)+'px,'+(75+q[1]*.4)+'px)'});k++};go();wtTm=setInterval(go,1500)}},
 {t:'3 · Actitud',d:'«Actitud» decide cuándo disparan. Si cae una nave tuya, la pierdes: cuídalas cerca de las bases.',
  v:()=>{const C=(x,y,c,n,l,ic)=>`<g transform="translate(${x},${y})"><rect width="138" height="58" fill="rgba(8,20,36,.9)" stroke="${c}"/><g transform="translate(20,29)">${ic}</g><text x="42" y="24" fill="${c}" font-size="10" font-weight="700">${n}</text><text x="42" y="40" fill="#aab" font-size="8">${l}</text></g>`;
   return `<svg viewBox="0 0 300 150">${C(6,10,'#ff6b6b','AGRESIVO','Atacan lo que ven','<circle r="9" fill="none" stroke="#ff6b6b" stroke-width="2"/><path d="M-13 0h8M5 0h8M0 -13v8M0 5v8" stroke="#ff6b6b" stroke-width="2"/>')}${C(156,10,'#5fd0ff','DEFENSIVO','Solo si te atacan','<path d="M0 -11 L10 -6 V4 Q10 10 0 13 Q-10 10 -10 4 V-6Z" fill="none" stroke="#5fd0ff" stroke-width="2"/>')}${C(6,82,'#ffd166','MI OBJETIVO','Tu objetivo (T)','<path d="M0 -12 L3 -3 L12 0 L3 3 L0 12 L-3 3 L-12 0 L-3 -3Z" fill="#ffd166"/>')}${C(156,82,'#9aa4b8','PASIVO','No disparan','<circle r="10" fill="none" stroke="#9aa4b8" stroke-width="2"/><path d="M-7 7L7 -7" stroke="#9aa4b8" stroke-width="2"/>')}</svg>`}}];
function wtShow(){clearInterval(wtTm);const P=WTP[wtI];$('wtV').innerHTML=P.v();$('wtT').textContent=P.t;$('wtD').textContent=P.d;$('wtN').textContent=(wtI+1)+'/'+WTP.length;
 $('wtDots').innerHTML=WTP.map((_,i)=>'<i class="'+(i===wtI?'on':'')+'"></i>').join('');$('wtP').style.visibility=wtI?'visible':'hidden';$('wtX').textContent=wtI===WTP.length-1?'Entendido':'Siguiente';if(P.on)P.on()}
function wTutOpen(force){if(MPG)return;let seen=0;try{seen=localStorage.getItem('sb_wtut')}catch(_){}
 if(wtOn||(!force&&seen)||state!=='play'||ship.dead>0||ship.wreck)return;wtOn=1;wtI=0;wtAt=time;hold=0;fireOn=0;fireTouch=0;$('wTut').classList.remove('hide');wtShow()}
function wTutClose(){if(!wtOn)return;clearInterval(wtTm);wtOn=0;$('wTut').classList.add('hide');const d=time-wtAt;BAL.st.next+=d;BAL.st.bNext+=d;BAL.st.lk+=d;bossT+=d;try{localStorage.setItem('sb_wtut','1')}catch(_){}}
$('wtX').onclick=()=>{if(wtI>=WTP.length-1)wTutClose();else{wtI++;wtShow()}};$('wtP').onclick=()=>{if(wtI>0){wtI--;wtShow()}};
addEventListener('keydown',e=>{if(!wtOn)return;e.stopImmediatePropagation();e.preventDefault();if(e.code==='Escape')wTutClose();else if(e.code==='Enter'||e.code==='ArrowRight')$('wtX').onclick();else if(e.code==='ArrowLeft')$('wtP').onclick()},true);
var aiW=null,aiB=0;
$('ui').insertAdjacentHTML('beforeend','<div id="aInfo" class="hide"></div>');
const baseList=a=>BASES.filter(b=>(b===A||known(b,b.r+300))&&(b.n.indexOf('Omega')<0||QX.card)).sort((p,q)=>dist(a,p)-dist(a,q));
var avV=null,avT=0;
function wInfoOpen(w){avV=null;aiW=w;aiB=0;const t=TYPES[w.ti];$('aInfo').classList.remove('hide');
 $('aInfo').innerHTML='<div style="display:flex;justify-content:space-between;align-items:center"><b style="color:#4fd1ff;letter-spacing:.12em">'+(w.svc?'NAVE DE AYUDA':'NAVE ALIADA')+'</b><button class="sq" data-k="x" style="position:static;padding:8px 12px">Cerrar</button></div>'
 +'<div class=card2><h2 id="aiN" style="margin:0 0 2px;color:'+w.col+'"></h2><div style="opacity:.7">'+(w.rl||t.r)+'</div><div id="aiS" style="margin-top:4px;letter-spacing:.1em"></div></div>'
 +'<div class=card2><div class=kv><span style="opacity:.7">Casco</span><b id="aiHt"></b></div><div class=bb style="height:12px"><b id="aiHb" style="background:#ff6b6b"></b></div><div class=kv><span style="opacity:.7">Escudo</span><b id="aiSt"></b></div><div class=bb style="height:12px"><b id="aiSb" style="background:#4fd1ff"></b></div><div class=kv><span style="opacity:.7">Estado</span><b id="aiE"></b></div></div>'
 +'<div class=card2><div class=kv><span style="opacity:.7">Orden</span><b id="aiO"></b></div><div class=kv><span style="opacity:.7">Velocidad</span><b id="aiV"></b></div><div class=kv><span style="opacity:.7">Distancia a ti</span><b id="aiD"></b></div><div class=kv><span style="opacity:.7">Llegada</span><b id="aiL2"></b></div></div><div id="aiAct"></div>';aiAct();aiRender()}
function aiAct(){const w=aiW;if(!w)return;let h='';if(w.svc||w.st==='rescue'){$('aiAct').innerHTML='';return}if(w.st==='guard')h+='<button class="sq" data-k="u" style="position:static;width:100%;margin-top:8px">Unirse a tu formación · '+PRC[w.ti]+' cr</button>';
 else{if(ship.wreck)h+='<button class="sq" data-k="r" style="position:static;width:100%;margin-top:8px">Rescate</button>';else if(w.st!=='follow')h+='<button class="sq" data-k="f" style="position:static;width:100%;margin-top:8px">Seguirme</button>';else h+='<button class="sq dng" data-k="d" style="position:static;width:100%;margin-top:8px">'+(w.bs?'Volver a '+w.bs.n:'Dejar de seguir')+'</button>';h+='<button class="sq'+(aiB?' on':'')+'" data-k="b" style="position:static;width:100%;margin-top:8px">Enviar a una base… '+(aiB?'▲':'▼')+'</button>';
  if(aiB)h+='<div class=card2 style="margin:4px 0">'+baseList(w).map((b,i)=>'<button class="sq" data-k="s" data-i="'+i+'" style="position:static;width:100%;margin:3px 0;padding:9px 10px;font-size:12px;text-align:left">'+b.n+' · '+km(dist(w,b))+'</button>').join('')+'</div>'}$('aiAct').innerHTML=h}
function wInfoClose(){aiW=null;aiB=0;$('aInfo').classList.add('hide')}
$('aInfo').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!aiW)return;const k=b.dataset.k;
 if(k==='x')wInfoClose();else if(k==='r'){wCallOne(aiW);aiAct()}else if(k==='f'){setW(aiW,'follow');aiAct()}else if(k==='d'){if(aiW.bs)sendW(aiW,aiW.bs);else{aiB=1;toast(aiW.n+' no tiene base de origen: elige a cuál llevarla')}aiAct()}else if(k==='b'){aiB=!aiB;aiAct()}
 else if(k==='u'){const pr=PRC[aiW.ti];if(ownN()>=4)return toast('Flota llena (4/4)');if(ship.cred<pr)return toast('Créditos insuficientes ('+pr+' cr)');ship.cred-=pr;setW(aiW,'follow');aiAct()}
 else if(k==='s'){const bs=baseList(aiW);if(bs[+b.dataset.i])sendW(aiW,bs[+b.dataset.i]);aiB=0;aiAct()}});
addEventListener('keydown',e=>{if(aiW&&e.code==='Escape'){e.stopImmediatePropagation();wInfoClose()}},true);
function aiRender(){const w=aiW;if(!w)return;if(!wing.includes(w)&&!svc.includes(w)&&!svr.includes(w)){wInfoClose();if(!w.svc)toast('Esa nave ya no está en tu flota');return}if(state!=='play'&&state!=='map'){wInfoClose();return}
 if(state==='play'&&!w.svc&&dist(w,ship)>1700){wInfoClose();toast('Nave aliada fuera de alcance: solo visible en el mapa');return}
 const sp=Math.hypot(w.vx,w.vy),mv=!!w.jp||sp>25,sr=w.smax?clamp((w.shd||0)/w.smax,0,1):0,hr=clamp(w.hp/w.max,0,1),T2=w.jp?w.jp.d:w.st==='base'&&w.hb?w.hb:null,eta=w.jp?Math.max(0,w.jp.te-w.jp.t):w.svc?(w.back?dist(w,w.hb)/w.spd:w.arr?0:dist(w,ship)/w.spd):w.st==='rescue'?dist(w,ship)/w.spd:T2?Math.max(0,dist(w,T2)-(T2.r||0)-360)/w.spd:0;
 $('aiN').textContent=w.n;$('aiS').textContent=w.jp?'SALTO HIPERESPACIAL':mv?'EN MOVIMIENTO':'PARADA';$('aiS').style.color=mv?'#ffd166':'#7dff9b';
 $('aiHt').textContent=Math.round(w.hp)+' / '+w.max;$('aiHb').style.width=hr*100+'%';$('aiSt').textContent=w.smax?Math.round(w.shd||0)+' / '+w.smax:'—';$('aiSb').style.width=sr*100+'%';
 $('aiE').textContent=hr<.35?'Crítica':hr<.7?'Dañada':'Operativa';$('aiE').style.color=hr<.35?'#ff6b6b':hr<.7?'#ffd166':'#7dff9b';
 $('aiO').textContent=wLbl(w);$('aiV').textContent=(sp/1000).toFixed(2).replace('.',',')+' km/s';$('aiD').textContent=km(dist(w,ship));$('aiL2').textContent=eta>1.2?(eta>99?Math.ceil(eta/60)+' min':Math.ceil(eta)+' s'):'—'}
function allyView(){const w=aiW;if(!w||!wing.includes(w)){wInfoClose();drawWorld();return}
 g.fillStyle='#04060c';g.fillRect(0,0,W,H);
 const nar=W<720&&W<H*1.34,pw=nar?0:Math.min(390,W*.52),aw=W-pw,ah=nar?H*.5:H,cx=aw/2,cy=nar?ah/2+34:H/2,sc=Math.max(1.5,Math.min(7,aw/84,(ah-70)/84)),
  sp=Math.hypot(w.vx,w.vy),mv=!!w.jp||sp>25,sr=w.smax?clamp((w.shd||0)/w.smax,0,1):0,hr=clamp(w.hp/w.max,0,1),c0={x:cam.x,y:cam.y};
 cam.x=w.x;cam.y=w.y;{const tv=angDiff(w.a,-Math.PI/2),dd=Math.min(.1,Math.max(0,time-avT));avT=time;if(avV==null||dd>=.1)avV=tv;else avV+=angDiff(avV,tv)*Math.min(1,4*dd);VR=avV}stars();VR=0;cam.x=c0.x;cam.y=c0.y;
 const gl=g.createRadialGradient(cx,cy,0,cx,cy,50*sc);gl.addColorStop(0,'rgba(40,110,200,.28)');gl.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gl;g.fillRect(cx-50*sc,cy-50*sc,100*sc,100*sc);
 g.lineWidth=1;g.strokeStyle='rgba(79,209,255,.12)';for(let i=1;i<=3;i++){g.beginPath();g.arc(cx,cy,i*13*sc,0,TAU);g.stroke()}g.beginPath();g.moveTo(cx-48*sc,cy);g.lineTo(cx+48*sc,cy);g.moveTo(cx,cy-48*sc);g.lineTo(cx,cy+48*sc);g.stroke();
 if(w.smax){g.strokeStyle='rgba(79,209,255,'+(.15+.6*sr)+')';g.lineWidth=2;g.setLineDash([10,8]);g.lineDashOffset=-time*20;g.beginPath();g.arc(cx,cy,30*sc,0,TAU);g.stroke();g.setLineDash([])}
 drawS(cx,cy,-Math.PI/2,w.sh,w.col,sc,{h:hr,th:w.jp?1:mv?clamp(sp/w.spd,.3,1):0});
 txt('NAVE ALIADA · '+w.n.toUpperCase(),16,24,'#4fd1ff','left',14);if(nar||H>=500){bar(16,34,110,w.hp,w.max,'#ff6b6b','CASCO '+Math.round(w.hp)+'/'+w.max);if(w.smax)bar(16,56,110,w.shd||0,w.smax,'#4fd1ff','ESCUDO '+Math.round(w.shd||0)+'/'+w.smax)}
 if(!ship.docked&&npcs.some(n=>n.team==='e'&&dist(n,ship)<900))txt('⚠ ENEMIGOS CERCA · el juego sigue en marcha',aw/2,24,'#ff6b6b','center',14);
 txt(w.jp?'SALTO HIPERESPACIAL':mv?'EN MOVIMIENTO':'PARADA',cx,nar?ah-8:H<500?H-8:cy+44*sc,mv?'#ffd166':'#7dff9b','center',13)}
function mapAllyAt(px,py){const M=mt();let r=null,rd=18;for(const w of [...wing,...svc,...svr]){const d=Math.hypot(M.ox+w.x*M.s-px,M.oy+w.y*M.s-py);if(d<rd){rd=d;r=w}}return r}
function mapAlly2(w,X,Y,big){const x=X(w.x),y=Y(w.y),sv=w.svc||w.st==='rescue',far=w.jp||dist(w,ship)>3000,c=w.jp?'#9fe8ff':sv?'#c792ff':w.own?'#7dff9b':'#8aa0b8',T2=w.jp?w.jp.d:w.back?w.hb:sv?ship:w.st==='base'&&w.hb?w.hb:w.st==='follow'?ship:null,ln=T2&&dist(w,T2)>120&&(far||w.st==='base'||sv||w.back);
 if(ln){g.strokeStyle=c;g.globalAlpha=.55;g.lineWidth=1.5;g.setLineDash([5,6]);g.beginPath();g.moveTo(x,y);g.lineTo(X(T2.x),Y(T2.y));g.stroke();g.setLineDash([]);g.globalAlpha=1}
 g.save();g.translate(x,y);g.rotate(w.a);g.fillStyle=c;g.beginPath();g.moveTo(7,0);g.lineTo(-5,-5);g.lineTo(-2,0);g.lineTo(-5,5);g.closePath();g.fill();g.restore();
 if(ln){const eta=w.jp?Math.max(0,w.jp.te-w.jp.t):dist(w,T2)/((w.spd||300)*(sv||w.back?1:1.2));txt(w.n+' · '+(eta>99?Math.ceil(eta/60)+' min':Math.ceil(eta)+' s'),x+10,y+4,c,'left',11)}}
WTP.push({t:'4 · Órdenes y bases',d:'Clic derecho sobre una nave (en la partida o en el mapa): «Seguirme», «Enviar a una base…» (viaja sola y espera allí) e «Información», que abre su ficha con vida, escudo y si se mueve o está parada.',
 v:()=>`<svg viewBox="0 0 300 150"><g transform="translate(60,75) scale(1.8)">${WTSH('#7dff9b')}</g><rect x="105" y="22" width="140" height="92" fill="rgba(8,20,36,.95)" stroke="#c792ff"/><text x="115" y="44" fill="#cfe8ff" font-size="10">Seguirme</text><text x="115" y="68" fill="#cfe8ff" font-size="10">Enviar a una base…</text><text x="115" y="92" fill="#cfe8ff" font-size="10">Información</text><rect x="109" y="55" width="132" height="18" fill="none" stroke="#7dff9b"><animate attributeName="y" values="28;55;79;28" dur="3s" repeatCount="indefinite"/></rect></svg>`},
{t:'5 · Saltos y distancia',d:'Cuando saltas, tus naves salen detrás de ti y llegan unos segundos después. Si vas más rápido que ellas se quedan atrás: las verás en el mapa viniendo hacia ti. Las que envías a una base también viajan de verdad, sin teletransportes.',
 v:()=>`<svg viewBox="0 0 300 150"><line x1="20" y1="75" x2="280" y2="75" stroke="#34506b" stroke-dasharray="4 5"/><g><animateTransform attributeName="transform" type="translate" values="30,60;230,60" dur="3s" repeatCount="indefinite"/><g transform="translate(0,15) scale(1.6)">${WTSH('#cfe8ff')}</g></g>${[0,1,2].map(i=>`<g><animateTransform attributeName="transform" type="translate" values="${10-i*8},${75-(i-1)*18};${210-i*14-16},${75-(i-1)*18}" dur="3s" begin="${.5+i*.4}s" repeatCount="indefinite"/><g transform="scale(1.1)">${WTSH('#7dff9b')}</g></g>`).join('')}<text x="150" y="140" fill="#c792ff" font-size="10" text-anchor="middle">Llegan con un pequeño retraso</text></svg>`});
function wSteer(w,dvx,dvy,dt,turn,cap){const m=Math.hypot(dvx,dvy),acc=w.spd*.9;
 if(m>6){const ta=Math.atan2(dvy,dvx),da=angDiff(w.a,ta);w.a+=clamp(da,-turn*dt,turn*dt);const al=Math.max(0,Math.cos(angDiff(w.a,ta))),f=Math.min(acc,m*3);
  w.vx+=(Math.cos(w.a)*al*.85+dvx/m*.3)*f*dt;w.vy+=(Math.sin(w.a)*al*.85+dvy/m*.3)*f*dt}
 const hx=Math.cos(w.a),hy=Math.sin(w.a),vf=w.vx*hx+w.vy*hy,lx=w.vx-hx*vf,ly=w.vy-hy*vf,kd=Math.min(1,1.8*dt);w.vx-=lx*kd;w.vy-=ly*kd;
 const sp=Math.hypot(w.vx,w.vy);if(sp>cap){w.vx*=cap/sp;w.vy*=cap/sp}}
/* rumbo de formación: gira despacio y se congela cuando la nave casi no se mueve (evita giros y temblor al frenar) */
function wHd(dt){const sv=Math.hypot(ship.vx,ship.vy);if(WG.hd==null)WG.hd=ship.a;if(sv>120)WG.hd+=angDiff(WG.hd,ship.a)*Math.min(1,2*dt);return WG.hd}
function wingUpd(dt){
 if(WG.o4==null)WG.o4=TYPES[4].own?1:0;
 {const u=wUnl();if(WG.ux!==u){WG.ux=u;wP(state)}}
 if(wUnl()&&!WG.u&&state==='play'&&!ship.dead){WG.u=1;toast('Escoltas desbloqueadas: botón Escolta [F]');wP(state);wTutOpen(TYPES[4].own&&!WG.o4?1:0)}
 for(const r of svr){const h=r.hb,dx=h.x-r.x,dy=h.y-r.y,d=Math.hypot(dx,dy)||1;if(d<h.r*.6+40||dist(r,ship)>25000)r.gone=1;else{const v=Math.min(r.spd,(d-h.r*.5)*1.2+60);r.vx=dx/d*v;r.vy=dy/d*v;r.x+=r.vx*dt;r.y+=r.vy*dt;r.a+=angDiff(r.a,Math.atan2(dy,dx))*Math.min(1,6*dt)}}if(svr.some(r=>r.gone))svr=svr.filter(r=>!r.gone);
 wT-=dt;if(wOpen&&wT<=0){wT=.5;wRender()}
 const fo=wing.filter(w=>w.st==='follow'),hd=wHd(dt);{/* curación: solo si hay un técnico (tú con el Técnico o una nave Técnico de la flota); cura una nave cada vez, poco a poco */
  const hl=hlcV(),src=[];if(hl&&on('rep')&&!ship.dead)src.push({o:ship,r:hl,d:600});for(const q of wing)if(q.own&&q.ti===4&&q.hp>0&&!q.jp)src.push({o:q,r:.03,d:650});
  const dm=w=>w.own&&w.hp>0&&!w.jp&&(w.hp<w.max-.01||(w.smax&&(w.shd||0)<w.smax-.01)),rc=(w,q)=>q.o!==w&&dist(q.o,w)<q.d,ok=w=>dm(w)&&src.some(q=>rc(w,q));
  for(const w of wing)w.rg=0;WRS.clear();if(!(WG.ht&&wing.includes(WG.ht)&&ok(WG.ht)))WG.ht=wing.find(ok)||null;
  if(WG.ht){const t=WG.ht,q=src.find(q=>rc(t,q));if(q){t.hp=Math.min(t.max,t.hp+t.max*q.r*dt);t.rg=1;WRS.set(t,q.o)}}}
 {/* bases no enemigas: Beta es hostil y Omega solo es segura con la tarjeta; la flota se cura poco a poco dentro de su zona */
  const safeB=b=>b!==B&&(b.n.indexOf('Omega')<0||QX.card);
  for(const w of wing){if(!w.own||w.hp<=0||w.jp||w.svc)continue;const hb=BASES.find(b=>safeB(b)&&dist(w,b)<b.r+250);
   if(hb&&time-(w.lh||-99)>4){if(w.hp<w.max)w.hp=Math.min(w.max,w.hp+w.max*.04*dt);if(w.smax&&(w.shd||0)<w.smax)w.shd=Math.min(w.smax,(w.shd||0)+w.smax*.06*dt)}}}
 for(const w of wing){w.cd-=dt;if(w.smax&&w.rg&&time-(w.lh||-99)>6)w.shd=Math.min(w.smax,(w.shd||0)+w.smax*.08*dt);if(w.jp){wjStep(w,dt);continue}
  if(w.st==='rescue'){if(w.tow&&ship.wreck)continue;const dx=ship.x-w.x,dy=ship.y-w.y,d=Math.hypot(dx,dy);{const v=Math.min(w.spd,d*1.2);if(d>50)wSteer(w,dx/d*v-w.vx*.35,dy/d*v-w.vy*.35,dt,2.6,w.spd);else{w.vx*=1-3*dt;w.vy*=1-3*dt;w.a+=angDiff(w.a,ship.a)*Math.min(1,3*dt)}}w.x+=w.vx*dt;w.y+=w.vy*dt;continue}
  if(w.st==='esc'&&w.esc){wEsc(w,dt);continue}
  const fl=w.st==='follow',an=fl?ship:(w.hb||(w.hb=nBase(w)));let tg=null,td=1e9;
  if(fl){if(!ship.docked&&WG.b!=='pas'){
    if(WG.b==='obj'){const L=ship.lock&&ship.lock.hp>0&&dist(ship,ship.lock)<1500?ship.lock:(lastShot&&lastShot.hp>0&&time-lastShotT<6?lastShot:null);if(L){tg=L;td=dist(w,L)}}
    else for(const o of npcs){if(o.team!=='e'||o.hp<=0||o.evs)continue;if(WG.b==='def'&&time-(o.hostile||-99)>8)continue;const d=dist(w,o);if(d<td&&d<(WG.b==='agr'?900:1100)){td=d;tg=o}}
    if(tg&&dist(tg,ship)>1300)tg=null}}
  else for(const o of npcs){if(o.team!=='e'||o.hp<=0||o.evs)continue;const d=dist(w,o);if(d<td&&d<800&&dist(o,an)<1200){td=d;tg=o}}
  
  const i=fo.indexOf(w),sl=fl?wSlot(i,fo.length):[0,0],px=fl?ship.x+Math.cos(hd)*sl[0]-Math.sin(hd)*sl[1]:an.x+Math.cos(w.oa)*(an.r+330),py=fl?ship.y+Math.sin(hd)*sl[0]+Math.cos(hd)*sl[1]:an.y+Math.sin(w.oa)*(an.r+330);
    if(state==='warp')tg=null;
  if(tg){const a=lead(w,tg);w.a+=clamp(angDiff(w.a,a),-1,1)*4*dt;const k=td>300?1:td<180?-.5:0;
   w.vx=(w.vx+Math.cos(w.a)*w.spd*.9*k*dt)*(1-.8*dt);w.vy=(w.vy+Math.sin(w.a)*w.spd*.9*k*dt)*(1-.8*dt);
   if(td<600&&w.cd<=0&&Math.abs(angDiff(w.a,a))<.15){w.cd=w.rate;bullets.push(bl(w,a+rnd(-.05,.05),'w',w.dmg))}}
  else{if(!fl)w.oa+=.12*dt;const dx=px-w.x,dy=py-w.y,d=Math.hypot(dx,dy),sp=Math.min(w.spd*(fl?1.3:w.st==='guard'?.5:1),d*1.4),k=Math.min(1,3*dt),bx=fl?ship.vx:0,by=fl?ship.vy:0;
   let tx=bx+(d>1?dx/d*sp:0),ty=by+(d>1?dy/d*sp:0);const cp=w.spd*(fl?1.35:1.1),tl=Math.hypot(tx,ty);if(tl>cp){tx*=cp/tl;ty*=cp/tl}if(!fl&&d<170){const R=an.r+330,k=Math.min(1,3*dt),tv=.12*R;w.x+=dx*k;w.y+=dy*k;w.vx+=(-Math.sin(w.oa)*tv-w.vx)*k;w.vy+=(Math.cos(w.oa)*tv-w.vy)*k;w.a+=angDiff(w.a,w.oa+Math.PI/2)*Math.min(1,4*dt)}else if(fl&&(w.hs?d<170:d<110)){w.hs=1;const kk=Math.min(1,3*dt);let gx=bx+dx*2.2,gy=by+dy*2.2;const gl=Math.hypot(gx,gy);if(gl>cp){gx*=cp/gl;gy*=cp/gl}/* nunca más rápido que su velocidad máxima */w.vx+=(gx-w.vx)*kk;w.vy+=(gy-w.vy)*kk;w.a+=angDiff(w.a,ship.a)*Math.min(1,3*dt)}else{w.hs=0;wSteer(w,tx-w.vx,ty-w.vy,dt,fl?3.2:2.4,cp)};
   if(d<80&&Math.hypot(w.vx-bx,w.vy-by)<60)w.a+=angDiff(w.a,fl?ship.a:w.oa+Math.PI/2)*Math.min(1,2.5*dt)}
  const o=avoid(w,14,null),ka=fl&&w.hs?.3:1;w.vx+=o[0]*700*dt*ka;w.vy+=o[1]*700*dt*ka;w.x+=w.vx*dt;w.y+=w.vy*dt}
 for(const w of wing)if(w.hp<=0){boom(w.x,w.y,26,'#ff8a5c');for(let j=0;j<3;j++)loot.push({x:w.x+rnd(-25,25),y:w.y+rnd(-25,25),v:2+((Math.random()*3)|0),life:120});toast('⚠ Tu nave '+w.n+' ha sido destruida '+whereIs(w)+' por '+(w.by?(w.by.boss?'el jefe pirata':w.by.om?'la guardia de Omega':w.by.team==='g'?'la guardia de Alfa':w.by.team==='e'?'un pirata':'un enemigo'):'daño enemigo'))}
 if(wing.some(w=>w.hp<=0)){wing=wing.filter(w=>w.hp>0);if(wOpen)wRender()}if(aiW)aiRender()}
/* ===== nave inutilizada ===== */
var wmAt=-99;
function wkUI(){const iv=$('invP');if(ship.wreck){for(const i of['modes','bTg','bHan','bShip','bEsc','thr','bFire','wP']){const e=$(i);if(e)e.classList.add('hide')}wOpen=0;$('qp').classList.add('hide');$('qd').classList.add('hide');}dkS=''}
function wmTxt(){const k=1-(time-wmAt)/2.4;if(k>0){g.globalAlpha=Math.min(1,k*1.6);txt('NAVE INUTILIZADA',W/2,H/2,'#ff6b6b','center',22);g.globalAlpha=1}}
function wkOpen(){wmAt=time;wP(state);wkUI();wkRender()}
function wkRender(){const k=$('wk');if(!k)return;const rs=wing.filter(w=>w.st==='rescue'),eta=[...svc,...rs].map(r=>Math.ceil(dist(r,ship)/r.spd)),first=TYPES.indexOf(T)===0;
 const bt=(a,t,d,en)=>`<button class="sq" data-k="${a}" style="position:static;display:block;width:100%;margin:3px 0;padding:8px 10px;font-size:11px;text-align:left${en?'':';opacity:.4'}"><span>${t}</span><small style="display:block;font-size:9.5px;letter-spacing:0;text-transform:none;opacity:.7;margin-top:2px;line-height:1.3;font-weight:400">${d}</small></button>`;
 const pen=ship.cred>0?'pierdes un 35% de tus créditos':'no pierdes nada (no tienes créditos)';
 const h=`<div style="color:#ff6b6b;margin-bottom:4px">NAVE INUTILIZADA</div><div style="margin-bottom:6px;opacity:.85">${ship.wst||'Pide ayuda'}${eta.length&&!ship.wp?' · llegan en '+Math.min(...eta)+' s':''}</div><div style="font-size:10.5px;line-height:1.35;opacity:.7;margin-bottom:6px">Tu nave no puede moverse ni saltar. El mundo sigue en marcha: elige cómo pedir ayuda.</div>`+
 wing.filter(w=>w.own&&w.hp>0).map(w=>bt('call:'+wing.indexOf(w),'Llamar a '+w.n+' ('+TYPES[w.ti].n+')'+(w.st==='rescue'?' · en camino':''),w.ti===4?'Viene volando hacia ti y repara tu nave en el sitio.':'Viene hacia ti y te remolca a la base más cercana.',w.st!=='rescue')).join('')+(ownN()>1?bt('callall','Llamar a toda la flota','Todas tus naves acuden a la vez.',wing.some(w=>w.own&&w.hp>0&&w.st!=='rescue')):'')+bt('tec','Servicio técnico · 900 cr','Llega desde la base más cercana y te repara del todo en el sitio (unos 6 s).',!svc.length)+bt('tow','Remolque · 400 cr','Una grúa te arrastra hasta la base más cercana. Allí reparas con −50% de coste.',!svc.length)+bt('ab','Abandonar y volver al hangar','Vuelves al hangar: '+pen+'. '+(first?'El Guardián es gratis e infinito.':'Pierdes esta nave, pero podrás recomprarla en Base Alfa.'),1);
 setHtml(k,h)}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#wk button');if(!b||!ship.wreck)return;const k=b.dataset.k;
 if(k.startsWith('call:'))wCallOne(wing[+k.slice(5)]);else if(k==='callall')wCallAll()
 else if(k==='tec'||k==='tow'){const c=k==='tec'?900:400;if(svc.length)return toast('Ya hay un servicio en camino: espera a que termine');if(ship.cred<c)return toast('Necesitas '+c+' cr');ship.cred-=c;const q=nBase(ship);svc.push({x:q.x,y:q.y,vx:0,vy:0,a:0,svc:1,hb0:q,ti:k==='tec'?4:1,hp:90,max:90,smax:0,rl:k==='tec'?'Servicio técnico · ayuda':'Servicio de remolque · ayuda',spd:k==='tec'?560:440,k,n:k==='tec'?'Técnico':'Remolque',sh:k==='tec'?'t':'m',col:k==='tec'?'#c792ff':'#ffd166'});toast((k==='tec'?'Técnico':'Remolque')+' en camino desde '+q.n)}
 else if(k==='ab')abandon();wkRender()});
function retSvc(){for(const r of svc){r.back=1;r.tow=0;r.arr=0;r.tn=0;r.hb=r.hb0||nBase(r);svr.push(r)}svc=[]}
function revive(msg,b){ship.dead=0;ship.wreck=0;ship.wp=0;retSvc();ship.vx=ship.vy=0;for(const w of wing){if(w.tow){w.vx=w.vy=0}w.tow=0;w.off=null;if(w.st==='rescue')w.st=w.st0||'follow'}if(b)dockAt(b);else if(state==='play')setState('play');wkUI();toast(msg);const k=$('wk');if(k)k.classList.add('hide');if(wOpen)wRender()}
function abandon(){if(TYPES.indexOf(T)>0){T.own=false;pickType(0,true)}if(ship.cred>0)ship.cred-=Math.floor(ship.cred*.35);svc=[];svr=[];ship.wreck=0;for(const w of wing){w.tow=0;w.off=null;if(w.st==='rescue')w.st=w.st0||'follow'}
 Object.assign(ship,{x:700,y:0,vx:0,vy:0,ore:0,inv:{},scrap:0,hull:T.hull,shd:T.shd,dest:null,docked:A,dead:0,parts:fp()});wanted=0;rq=[];evShipLost();cam.x=700;cam.y=0;$('wk').classList.add('hide');setState('hangar');wkUI();toast('Has abandonado la nave: vuelves al hangar')}
function wreckTick(dt){
 for(const r of svc){const dx=ship.x-r.x,dy=ship.y-r.y,d=Math.hypot(dx,dy);if(r.tow){r.arr=1;r.tn=0}else if(d>60){r.x+=dx/d*r.spd*dt;r.y+=dy/d*r.spd*dt;r.a=Math.atan2(dy,dx)}else r.arr=1}
 const ar=wing.filter(w=>w.st==='rescue'&&w.hp>0&&(w.tow||dist(w,ship)<90)),tP=svc.find(r=>r.k==='tec'&&r.arr),wP2=svc.find(r=>r.k==='tow'&&r.arr),tE=ar.find(w=>w.ti===4);let tw=0,tt0=wP2||ar[0];ship.wst='Esperando ayuda';
 const H=mpAid();
 if(H&&H.k==='rf'){ship.wp=(ship.wp||0)+dt/MPFIX.t;ship.wst=mpEsc(H.r.n)+' te repara '+Math.round(ship.wp*100)+'%';if(ship.wp>=1){ship.hull=T.hull;ship.shd=T.shd;ship.parts=fp();revive('Tu amigo '+H.r.n+' te ha reparado')}}
 else if(H&&H.k==='tw'){tw=1;const b=nBase(ship),a=H.r.a||0,tx=H.r.x-Math.cos(a)*70,ty=H.r.y-Math.sin(a)*70,k=Math.min(1,4*dt);ship.x+=(tx-ship.x)*k;ship.y+=(ty-ship.y)*k;ship.vx=H.r.vx||0;ship.vy=H.r.vy||0;ship.a=a;ship.wst='Remolcado por '+mpEsc(H.r.n);if(H.r.dk&&dist(ship,b)<b.r+600){ship.hull=Math.max(ship.hull,T.hull*.2);revive('Remolque completado',b)}}
 else if(tP){ship.wp=(ship.wp||0)+dt/6;ship.wst='Reparación en curso '+Math.round(ship.wp*100)+'%';if(ship.wp>=1){ship.hull=T.hull;ship.shd=T.shd;ship.parts=fp();revive('Servicio técnico: nave reparada')}}
 else if(tE){ship.hull+=T.hull*.04*dt;for(const k in ship.parts)ship.parts[k]=Math.min(100,ship.parts[k]+4*dt);ship.wst='Tu Técnico repara la nave '+Math.round(Math.min(1,ship.hull/(T.hull*.4))*100)+'%';if(ship.hull>=T.hull*.4){for(const k in ship.parts)ship.parts[k]=Math.max(ship.parts[k],40);revive('Tu Técnico ha reparado la nave')}}
 else if(wP2||ar.length){tw=1;const b=nBase(ship),dx=b.x-ship.x,dy=b.y-ship.y,d=Math.hypot(dx,dy);ship.wst='Remolcando a '+b.n;

  if(d>b.r*.5+120){const sp0=Math.hypot(ship.vx,ship.vy),sp1=Math.min(clamp(d*.6,450,1100),sp0+340*dt,(d-b.r*.5-120)*1.8+80);ship.vx=dx/d*sp1;ship.vy=dy/d*sp1;const da=angDiff(ship.a,Math.atan2(dy,dx));ship.a+=da*Math.min(1,3*dt);ship.x+=ship.vx*dt;ship.y+=ship.vy*dt}
  else{if(wP2)ship.disc=1;ship.hull=Math.max(ship.hull,T.hull*.2);revive('Remolque completado',b)}}
 if(tw&&tt0&&ship.wreck){const b=nBase(ship),dx=b.x-ship.x,dy=b.y-ship.y,d=Math.hypot(dx,dy)||1,sp=Math.hypot(ship.vx,ship.vy),tg=70,o0=tt0.off==null?Math.min(90,dist(tt0,ship)):tt0.off;tt0.off=o0+(tg-o0)*Math.min(1,3*dt);tt0.x=ship.x+dx/d*tt0.off;tt0.y=ship.y+dy/d*tt0.off;tt0.a=Math.atan2(dy,dx);tt0.tow=1;tt0.tn=1-Math.min(1,sp/450)}
 if(!tw&&ship.wreck){ship.vx*=1-1.5*dt;ship.vy*=1-1.5*dt;ship.x+=ship.vx*dt;ship.y+=ship.vy*dt}
 cam.x+=(ship.x-cam.x)*Math.min(1,6*dt);cam.y+=(ship.y-cam.y)*Math.min(1,6*dt);wkT-=dt;if(wkT<=0){wkT=.4;if(ship.wreck)wkRender()}}
const mk=(team,x,y,home)=>({team,x,y,vx:0,vy:0,a:rnd(0,TAU),hp:team==='g'?70:40,max:team==='g'?70:40,cd:rnd(0,1),home});
for(let i=0;i<4;i++)npcs.push(mk('g',700+rnd(-200,200),rnd(-300,300),A));
const boom=(x,y,n,c)=>{sfx('b',{x,y},n);if(n>=16)rings.push({x,y,t:0,r:n*3});for(let i=0;i<n;i++){const a=rnd(0,TAU),s=rnd(30,220);parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rnd(.3,.9),max:.9,c})}};
const bl=(o,a,own,d)=>(sfx('s',o,own),{x:o.x+Math.cos(a)*16,y:o.y+Math.sin(a)*16,vx:(o.vx||0)+Math.cos(a)*900,vy:(o.vy||0)+Math.sin(a)*900,life:1,own,d,o});
const lead=(o,t,sp=900)=>{const tt=dist(o,t)/sp;return Math.atan2(t.y+((t.vy||0)-(o.vy||0))*tt-o.y,t.x+((t.vx||0)-(o.vx||0))*tt-o.x)};const jumpCost=d=>CFG.ie?0:Math.ceil(Math.max(30,30+d/(650*C.jr))*T.jump*(eff('jmp')<1?1.5:1));
const dgT=()=>{const L=dgr(ship.x,ship.y);return L?' · peligro '+L:''};
const zone=()=>{if(dist(ship,A)<C.safeR)return'Zona protegida de Alfa';if(!sczDead()&&dist(ship,SCZ)<SCZ.r)return'♻ '+SCZ.n+' · chatarra';if(dist(ship,B)<1500)return'⚠ Zona de peligro · Beta'+dgT();const F=FIELDS.find(f=>f.ins(ship.x,ship.y));return F?'⚠ '+F.n+' · '+F.dng+dgT():'Espacio profundo'+dgT()};

