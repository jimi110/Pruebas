/* ============================================================================
   systems/missions.js — Misiones: catálogo, campaña principal y encargos dinámicos/rescates.
   (Trozo de la antigua pieza única de index.html. Se carga como script clásico en orden:
   comparte el ámbito global con el resto de js/. NO cambies el orden de carga en index.html.)
   ========================================================================== */
"use strict";
/* ===== FASE 3: sistema unificado de misiones ===== */
const QCAT={main:{n:'PRINCIPAL',c:'#b57bff'},side:{n:'SECUNDARIA',c:'#7fdcff'},job:{n:'ENCARGO',c:'#ffd84d'}},QORD=['main','side','job'];
let QX={ore:{},kill:0,rescue:0,fix:0,sell:0,dock:{},vis:{},del:{},tp:{}},QZ={s:{},tr:null,to:null,ut:0,jobs:[],jn:0},qOpen=0,qDet=null,qSig='',qT=0,qJT=0,qClr=0,qLast=null,qTop=-1;
function qEv(t,a,v){if(state==='menu')return;if(t==='ore')QX.ore[a]=(QX.ore[a]||0)+v;else if(t==='dock')QX.dock[a]=(QX.dock[a]||0)+1;else if(t==='scrap')QX.scrap=(QX.scrap||0)+a;else if(t==='dst')QX.dst=(QX.dst||0)+a;else if(t==='sell')QX.sell+=a;else if(t==='del'){const o=QX.del[a]=QX.del[a]||{};for(const k in v)o[k]=(o[k]||0)+v[k]}else QX[t]=(QX[t]||0)+1}
const qNear=(arr,f)=>{let b=null,bd=1e18;for(const o of arr){if(f&&!f(o))continue;const d=(o.x-ship.x)**2+(o.y-ship.y)**2;if(d<bd){bd=d;b=o}}return b};
const qBase=n=>BASES.find(b=>b.n===n),qdn=id=>(QZ.s[id]||{}).s==='done';
/* Constructores de objetivos: tx=texto, n=cantidad, g()=valor real del juego, rel=cuenta desde que se acepta, at()=ubicación actual o null */
const oOre=(m,n)=>({tx:'Mina '+MIN[m][0],n,rel:1,g:()=>QX.ore[m]||0,at:()=>{const a=qNear(asts,a=>a.m===m&&!a.dead&&a.ore>.5);return a&&{x:a.x,y:a.y,n:'Asteroide de '+MIN[m][0]}}});
const oDock=(nm,tx)=>({tx:tx||'Atraca en '+nm,n:1,rel:1,g:()=>QX.dock[nm]||0,at:()=>{const b=qBase(nm);return{x:b.x,y:b.y,n:nm}}});
const oVisB=nm=>({tx:'Llega a '+nm,n:1,g:()=>QX.vis[nm]?1:0,at:()=>{const b=qBase(nm);return{x:b.x,y:b.y,n:nm}}});
const oVisF=F=>({tx:'Descubre '+F.n,n:1,g:()=>QX.vis[F.n]?1:0,at:()=>({x:F.x,y:F.y,n:F.n})});
const qOn=id=>{const z=QZ.s[id];return !!z&&(z.s==='active'||z.s==='done')};
const oEv=(tx,k)=>({tx,n:1,rel:1,g:()=>QX[k]||0,at:()=>null});
const oFix=(n,tx)=>({tx:tx||(n>1?'Repara '+n+' componentes de la nave':'Repara un componente de la nave'),n,rel:1,g:()=>QX.fix||0,at:()=>{const b=qNear(BASES);return b&&{x:b.x,y:b.y,n:'Repara en '+b.n}}});
const oKill=(n,tx)=>({tx,n,rel:1,g:()=>QX.kill,at:()=>{const e=qNear(npcs,e=>e.team==='e'&&e.hp>0);return e?{x:e.x,y:e.y,n:'Enemigo cercano'}:{x:B.x,y:B.y,n:B.n}}});
const oDst=(n,tx)=>({tx,n,rel:1,g:()=>QX.dst||0,at:()=>null});
const oShot=n=>({tx:'Dispara '+n+' veces',n,rel:1,g:()=>QX.shot||0,at:()=>null});
const oUpg=()=>({tx:'Compra una mejora en una estación (Cobre, Vega o Nova)',n:1,rel:1,g:()=>QX.upg||0,at:()=>{const b=qNear(BASES,b=>b.small);return b&&{x:b.x,y:b.y,n:b.n}}});
const oFull=()=>({tx:'Deja todos los componentes sin averías',n:1,g:()=>PR.every(p=>gv(p[0])>=gm(p[0])-.01)?1:0,at:()=>{const b=qNear(BASES);return b&&{x:b.x,y:b.y,n:'Repara en '+b.n}}});
const oJob=()=>({tx:'Completa un encargo (panel de misiones [Q])',n:1,rel:1,g:()=>QX.job||0,at:()=>{const j=QZ.jobs.map(jobQ).find(q=>qSt(q)==='active');if(!j)return null;const pr=qProg(j),i=pr.findIndex(p=>!p.ok);return i<0?null:j.objs[i].at()}});
/* Entrega real: cuenta el mineral que llevabas en bodega al atracar en la base indicada (desde que se acepta la misión) */
const delN=(nm,m)=>(QX.del[nm]||{})[m]||0;
const oDel=(nm,m,n)=>({tx:'Entrega '+n+' de '+MIN[m][0]+' en '+nm+' (minado tras aceptar)',n,rel:1,g:()=>delN(nm,m),bs:()=>[delN(nm,m),QX.ore[m]||0],gr:b=>{const a=Array.isArray(b)?b:[+b||0,0];return Math.min(delN(nm,m)-a[0],(QX.ore[m]||0)-a[1])},at:()=>{if(ship.ore<T.cargo-.5&&(ship.inv[m]||0)<n){const a=qNear(asts,a=>a.m===m&&!a.dead&&a.ore>.5);if(a)return{x:a.x,y:a.y,n:'Asteroide de '+MIN[m][0]}}const b=qBase(nm);return{x:b.x,y:b.y,n:nm}}});
/* Desgaste leve para poder enseñar/completar reparaciones aunque la nave esté intacta */
function qWear(n){let have=PR.filter(p=>gv(p[0])<gm(p[0])-.01).length;const ok=PR.map(p=>p[0]).filter(k=>k!=='hull'&&k!=='shd'&&gv(k)>=gm(k)-.01);while(have<n&&ok.length){const k=ok.splice(Math.floor(Math.random()*ok.length),1)[0];sv(k,gm(k)*.72);have++;toast('Revisión: desgaste detectado en '+NM[k]+' · repárala desde Nave [N]')}}
/* ===== Campaña principal (datos): para añadir una base/capítulo nuevo basta con añadir misiones con ch:N y enlazar 'prev' ===== */
const CHT={1:'Base Alfa',2:'Base Beta',3:'Base Omega',4:'Nebulosa Zafiro'},CHN={1:2,2:2};
const sideLoc=ch=>{const ss=QUESTS.filter(q=>q.cs===ch&&!qdn(q.id)&&qSt(q)!=='locked'),a=ss.find(q=>qSt(q)==='active')||ss[0];if(!a)return null;const pr=qProg(a),i=Math.max(0,pr.findIndex(p=>!p.ok));return a.objs[i].at()};
const oSides=ch=>({tx:'Completa '+CHN[ch]+' misiones secundarias del capítulo (elige entre 3)',n:CHN[ch],g:()=>QUESTS.filter(q=>q.cs===ch&&qdn(q.id)).length,at:()=>sideLoc(ch)});
const MQ=(ch,id,prev,o)=>Object.assign({id,cat:'main',auto:1,ch,when:prev?()=>qdn(prev):undefined},o);
const SQ=(ch,id,unl,o)=>Object.assign({id,cat:'side',auto:1,ch,cs:ch,when:()=>qOn(unl)},o);
const QUESTS=[
 /* Capítulo 1 · Base Alfa → Base Beta */
 MQ(1,'c1.0',null,{chStart:1,tut:1,when:()=>!qOn('c1.1'),name:'Despegue',desc:'Bienvenido, piloto. Lo primero es aprender a mover la nave.',objs:[oDst(2000,'Vuela unos 2 km (mira el contador de abajo)')],rew:{cred:50},
  tip:'PC: clic izquierdo en el espacio = ir hacia ese punto (mantén pulsado para seguir el cursor). W/S cambian el acelerador, Espacio o X frenan. Móvil: toca para moverte y usa la barra de acelerador de la derecha. Pasar del 100% de acelerador gasta energía. En la zona protegida de Alfa no te atacan.'}),
 MQ(1,'c1.1',null,{tut:1,when:()=>qdn('c1.0')||qOn('c1.2'),name:'Primeros pasos',desc:'Abre el mapa y fija un rumbo para familiarizarte con la navegación.',objs:[oEv('Abre el mapa [M]','map'),oEv('Elige un destino y pulsa Rumbo normal o Salto','nav')],rew:{cred:100},
  tip:'El mapa se abre con [M] o tocando el minimapa y el juego NO se pausa. Toca un destino: «Rumbo normal» es gratis pero lento; «Salto» es casi instantáneo y gasta un % de energía que se recarga sola con el tiempo (un salto muy largo puede superar tu energía). Con el cursor sobre una zona del mapa ves su información (minerales, peligro).'}),
 MQ(1,'c1.2','c1.1',{name:'Localiza el Campo de Hierro',desc:'Busca el Campo de Hierro y entra en él. Usa el mapa: los saltos largos gastan energía.',objs:[oVisF(FIELD)],rew:{cred:150},
  tip:'Los campos de asteroides son zonas marcadas con ⚠ ZONA DE PELIGRO: ahí aparecen piratas. Cuanto más lejos de Alfa, más peligroso es el espacio: el «peligro» (0-4) de la esquina superior izquierda indica cuántos piratas, en qué grupos y con qué dureza te encontrarás. Alfa está protegida por su guardia.'}),
 MQ(1,'c1.2a','c1.2',{when:()=>qdn('c1.2')&&!qOn('c1.3'),tut:1,name:'Defiéndete',desc:'Los piratas rondan los campos. Practica el disparo.',objs:[oShot(10)],rew:{cred:80},
  tip:'PC: clic derecho en el espacio (o mantenlo) para disparar hacia el cursor; clic derecho sobre un pirata fija una órbita de ataque automática. Móvil: botón DISPARAR. Los piratas huyen con poco casco y se curan si no los golpeas durante 20 s: acaba con ellos rápido. Cada pirata destruido da créditos y chatarra.'}),
 MQ(1,'c1.2b','c1.2a',{when:()=>qdn('c1.2a')&&!qOn('c1.3'),name:'Tu primer mineral',desc:'Mina hierro de un asteroide y revisa tu bodega.',objs:[Object.assign(oOre('fe',6),{tx:'Mina 6 de Hierro (o ten ya ese hierro en la bodega)',gr:b=>Math.max((QX.ore.fe||0)-(Array.isArray(b)?b[0]:+b||0),ship.inv.fe||0),bs:()=>[QX.ore.fe||0]}),oEv('Abre el inventario [I]','inv')],rew:{cred:80},
  tip:'Clic derecho (o mantener pulsado en móvil) sobre una roca para minarla. La bodega tiene capacidad limitada (CARGA x/y en pantalla). Cada mineral vale distinto: hierro es barato, cristal, platino, titanio, iridio y neutronita valen cada vez más pero exigen mejorar el Sistema de minería. El inventario [I] muestra lo que llevas.'}),
 MQ(1,'c1.3','c1.2b',{name:'Instalación minera',desc:'Cerca del campo hay una instalación minera: Estación Cobre. Acércate a ella.',objs:[oVisB('Estación Cobre')],rew:{scrap:10},
  tip:'Las estaciones pequeñas venden mejoras para tu nave (Nave [N] → MEJORAR) y tienen servicios propios. Para atracar acércate despacio sin destino fijado: la nave atraca sola. Atracar vende automáticamente todo el mineral que lleves.'}),
 MQ(1,'c1.4','c1.3',{name:'Materiales para la estación',desc:'Mina hierro y cobre en el Campo de Hierro y entrégalos en Estación Cobre.',objs:[oDel('Estación Cobre','fe',20),oDel('Estación Cobre','cu',8)],rew:{cred:200,scrap:15},
  tip:'Entregar = atracar con ese mineral en la bodega. Solo cuenta el mineral que MINES después de recibir la misión (el que ya tuvieras antes no vale). Al atracar también se vende lo que llevas, así que cobrarás créditos además de la recompensa. Si la bodega se llena, atraca, vacíala y vuelve a minar.'}),
 MQ(1,'c1.5','c1.4',{name:'Aprende a reparar',desc:'Un componente tiene desgaste. Abre Nave [N], elígelo y pulsa Reparar (en una base cuesta créditos o chatarra).',objs:[oFix(1)],acc:()=>qWear(1),rew:{cred:100,scrap:10},
  tip:'Nave [N]: toca un componente para ver su estado. Reparar en una base es inmediato y cuesta chatarra y, si falta, créditos; en el espacio tarda y cuesta ×1.5 de chatarra. Un componente al 0% deja de funcionar. La chatarra sale de los restos de piratas y de ciertos eventos: guarda siempre algo.',tut:1}),
 MQ(1,'c1.5b','c1.5',{when:()=>qdn('c1.5')&&!qOn('c1.6'),name:'Hangar y flota',desc:'Conoce el hangar de la base.',objs:[oEv('Atraca en una base y abre el Hangar [H]','han')],rew:{cred:100},
  tip:'En el hangar eliges nave: cada una conserva su propio casco, daños, energía y mejoras. Hay naves que se compran en Base Beta y en Base Omega, y el Codex (menú de pausa) registra los enemigos derrotados.'}),
 MQ(1,'c1.6','c1.5b',{chEnd:1,name:'Permiso de acceso a Beta',desc:'Para viajar a Base Beta debes demostrar que estás preparado: completa 2 de las 3 misiones secundarias.',objs:[oSides(1)],rew:{cred:300,scrap:20},
  tip:'Las misiones secundarias se activan solas cuando se desbloquean: no hace falta aceptarlas. Elige las que prefieras; con [Q] ves todas y decides cuál seguir (la seguida es la que sale en pantalla con su flecha y su distancia).'}),
 SQ(1,'c1a','c1.4',{name:'Provisión de cobre',desc:'Prepara la nave: mina 15 de cobre y entrégalo en Base Alfa.',objs:[oDel('Base Alfa','cu',15)],rew:{cred:150},tip:'El cobre (marrón) abunda en los campos cercanos. Recuerda: cuenta el que mines desde que se activó esta misión.'}),
 SQ(1,'c1b','c1.4',{name:'Mantenimiento de rutina',desc:'Repara 2 componentes desgastados de la nave.',objs:[oFix(2)],acc:()=>qWear(2),rew:{cred:100,scrap:20},tip:'Se ha desgastado algún componente a propósito: abre Nave [N], elige cada uno y repáralo.'}),
 SQ(1,'c1c','c1.4',{name:'Investigar Estación Vega',desc:'Investiga la instalación de Estación Vega: mejoras y tienda de armas.',objs:[oDock('Estación Vega','Atraca en Estación Vega')],rew:{cred:200},tip:'Estación Vega vende armas (por ejemplo el Rayo láser: más alcance y daño, pero se sobrecalienta).'}),
 /* Capítulo 2 · Base Beta → Base Omega */
 MQ(2,'c2.1','c1.6',{chStart:1,name:'Rumbo a Beta',desc:'Viaja a Base Beta, una base sin protección.',objs:[oVisB('Base Beta')],rew:{cred:300,scrap:20},
  tip:'Base Beta NO está protegida: a su alrededor patrullan piratas, a menudo en grupos. A cambio paga ×1.5 por tus minerales y vende naves. Ve con casco y escudo al máximo.'}),
 MQ(2,'c2.2','c2.1',{name:'Comercio en Beta',desc:'Mina cobre y entrégalo en Base Beta (paga x1.5).',objs:[oDel('Base Beta','cu',25)],rew:{cred:300},tip:'Compensa vender en Beta (×1.5), pero el viaje es peligroso. Para planear: cobre vale ×1, cristal ×1.6, platino ×2.5, titanio ×3.6 (el precio base de cada mineral).'}),
 MQ(2,'c2.3','c2.2',{name:'Primer encargo',desc:'Los encargos del panel de misiones [Q] son trabajos extra. Acepta y completa uno.',objs:[oJob()],rew:{cred:200},tip:'Los encargos son trabajos que se generan solos cada pocos minutos (máximo 3 a la vez), con ubicación real: minar, chatarra, entregas, investigar, recuperar componentes o rescatar naves. Se aceptan desde [Q] y puedes abandonarlos. A diferencia de las secundarias, hay que aceptarlos.'}),
 MQ(2,'c2.4','c2.3',{name:'Revisión técnica',desc:'Prepara la nave para una expedición exigente: compra una mejora (recomendado: Sistema de minería) y repara cualquier avería.',objs:[oUpg(),oFull()],rew:{cred:150,scrap:20},tip:'En una estación: Nave [N] → pestaña MEJORAR. El Sistema de minería nv.1 permite minar titanio y nv.2 iridio; otras mejoras dan más motor, escudo o salto. Cada mejora sube hasta nivel 3 y su precio crece.'}),
 MQ(2,'c2.5','c2.4',{name:'Explora el Campo Cobalto',desc:'Descubre el Campo Cobalto, más peligroso y con minerales mejores.',objs:[oVisF(FIELDS[1])],rew:{cred:300},tip:'El Campo Cobalto está más lejos de Alfa: peligro 2. Espera manadas de 2-3 piratas más duros. Mejor módulo de Defensa, escudo completo y repara antes de entrar.'}),
 MQ(2,'c2.6','c2.5',{name:'Materiales de expedición',desc:'Reúne material para Omega: cristal y titanio (el titanio exige Sistema de minería nivel 1).',objs:[oDel('Base Beta','cr',12),oDel('Base Beta','ti',8)],rew:{cred:500,scrap:30},tip:'El titanio exige Sistema de minería nivel 1 (si no, no podrás minarlo). Recuerda que solo cuenta lo minado desde que empezó esta misión.'}),
 MQ(2,'c2.7','c2.6',{name:'Permiso hacia Omega',desc:'Omega solo acepta pilotos con experiencia: completa 2 de las 3 misiones secundarias.',objs:[oSides(2)],rew:{cred:800,scrap:30},tip:'Las secundarias ya están activas; haz las que más te convengan. Después tendrás que conseguir la tarjeta de acceso a Omega.'}),
 MQ(2,'c2.8','c2.7',{when:()=>qdn('c2.7')&&!qOn('c3.1'),name:'Estación Umbral',desc:'La Base Omega está custodiada. Viaja a Estación Umbral, la última estación antes de Omega.',objs:[oVisB('Estación Umbral')],rew:{cred:200},tip:'Los guardianes de Omega disparan a todo piloto sin tarjeta de acceso y no te dejarán atracar. La tarjeta se compra en Estación Umbral, pero solo tras superar su prueba de pilotaje.'}),
 MQ(2,'c2.9','c2.8',{when:()=>qdn('c2.8')&&!qOn('c3.1'),name:'Prueba de pilotaje',desc:'Supera la prueba de la estación para poder comprar la tarjeta.',objs:[{tx:'Supera la prueba de pilotaje (atraca en Umbral → Nave [N] → Iniciar prueba)',n:1,g:()=>QX.test?1:0,at:()=>TRL&&TRL.pts[TRL.i]?{x:TRL.pts[TRL.i].x,y:TRL.pts[TRL.i].y,n:'Baliza '+(TRL.i+1)}:{x:UM.x,y:UM.y,n:UM.n}}],rew:{cred:200},tip:'Atraca en Estación Umbral, abre Nave [N] y pulsa «Iniciar prueba». Atraviesa las 5 balizas en orden antes de que se acabe el tiempo (se muestra arriba). Si fallas puedes reintentarlo sin coste: vuelve a atracar.'}),
 MQ(2,'c2.10','c2.9',{chEnd:2,when:()=>qdn('c2.9')&&!qOn('c3.1'),name:'Tarjeta de acceso',desc:'Compra la tarjeta de acceso a Base Omega en Estación Umbral.',objs:[{tx:'Compra la tarjeta de acceso ('+CARDP+' cr) en Estación Umbral',n:1,g:()=>QX.card?1:0,at:()=>({x:UM.x,y:UM.y,n:UM.n})}],rew:{scrap:30},tip:'Cuesta '+CARDP+' créditos: véndele mineral a las bases para reunirlos. Con la tarjeta los guardianes de Omega te ignoran y defienden la base de los piratas.'}),
 SQ(2,'c2a','c2.2',{name:'Patrulla de Beta',desc:'Destruye 6 naves enemigas.',objs:[oKill(6,'Destruye 6 naves enemigas')],rew:{cred:350,scrap:15},tip:'Solo cuentan las naves que destruyas desde que la misión se activa. Los piratas aparecen en manadas cerca de los campos y de Beta.'}),
 SQ(2,'c2b','c2.2',{name:'Encargo de cristal',desc:'Mina 15 de cristal y entrégalo en Base Beta.',objs:[oDel('Base Beta','cr',15)],rew:{cred:250},tip:'El cristal se encuentra sobre todo en el Campo Cobalto y se paga ×1.6.'}),
 SQ(2,'c2c','c2.2',{name:'Investigar Estación Nova',desc:'Investiga la instalación de Estación Nova.',objs:[oDock('Estación Nova','Atraca en Estación Nova')],rew:{cred:250},tip:'Acércate despacio y sin destino fijado para atracar.'}),
 /* Capítulo 3 · Base Omega (final de la campaña actual) */
 MQ(3,'c3.1','c2.10',{chStart:1,name:'Hasta Omega',desc:'Viaja a la Base Omega, la más lejana.',objs:[oVisB('Base Omega')],rew:{cred:1000,scrap:50},tip:'Es la zona de más peligro (nivel 4): sin tarjeta los guardianes disparan. Con ella son aliados.'}),
 MQ(3,'c3.2','c3.1',{chEnd:3,name:'Atraca en Omega',desc:'Atraca en Base Omega: allí se vende la nave más avanzada.',objs:[oDock('Base Omega','Atraca en Base Omega')],rew:{cred:1000},tip:'Aquí se vende la nave más avanzada: el Técnico, con modo Reparación y Rescate.'}),
 /* Capítulo 4 · Zona de implosión → Nebulosa Zafiro (N-2) */
 MQ(4,'c4.1','c3.2',{chStart:1,name:'Pilotos varados',desc:'Para cruzar la zona exterior necesitas una flota. Con el Técnico, repara 2 naves averiadas.',objs:[{tx:'Repara 2 naves averiadas con el Técnico (modo Rescate)',n:2,rel:1,g:()=>QX.rescue||0,at:()=>{const d=qNear(derel,d=>!d.dead);return d&&{x:d.x,y:d.y,n:'Nave averiada'}}}],rew:{cred:400},tip:'Necesitas el Técnico (se vende en Base Omega). Con él, clic derecho sobre una nave averiada para repararla y unirla a tu flota.'}),
 MQ(4,'c4.2','c4.1',{name:'Preparación interespacial',desc:'Recoge mineral raro del aro de asteroides de Alfa (platino, titanio, iridio o neutronita). Cuanto mejor sea, más lingotes dará.',objs:[{tx:'Mina 30 minerales raros del aro de Alfa',n:30,rel:1,g:()=>IMPK.reduce((a,k)=>a+(QX.ore[k]||0),0),at:()=>{const a=qNear(asts,a=>IMPK.includes(a.m)&&!a.dead&&a.ore>.5);if(a)return{x:a.x,y:a.y,n:'Asteroide de '+MIN[a.m][0]};const F=FIELDS.find(f=>f.ring),an=Math.atan2(ship.y,ship.x),r=F?F.rr(an):RINGR;return{x:Math.cos(an)*r,y:Math.sin(an)*r,n:'Aro de asteroides de Alfa'}}}],rew:{cred:300},tip:'El aro rodea Alfa y es el único sitio con tanto mineral raro. El titanio exige Sistema de minería nv.1 y el iridio nv.2. Al atracar conservarás este mineral en lugar de venderlo.'}),
 MQ(4,'c4.3','c4.2',{name:'Fundición',desc:'Lleva el mineral a cualquier base y fúndelo hasta reunir 30 lingotes.',objs:[{tx:'Funde 30 lingotes (atraca → Nave [N] → Fundición)',n:30,rel:1,g:()=>QX.ingT||0,at:()=>{const b=qNear(BASES);return b&&{x:b.x,y:b.y,n:b.n}}}],rew:{cred:200},tip:'Abre Nave [N] estando atracado: la tarjeta FUNDICIÓN convierte el mineral raro en lingotes (platino ×1, titanio ×1, iridio ×2, neutronita ×3).'}),
 MQ(4,'c4.4','c4.3',{name:'Casco anti-implosión',desc:'Más allá del aro hay una zona de implosión. Compra en Base Omega la mejora de casco con tus lingotes.',objs:[{tx:'Compra el refuerzo de casco en Base Omega (30 lingotes + 3000 cr)',n:1,rel:1,g:()=>QX.hu||0,at:()=>({x:OM.x,y:OM.y,n:OM.n})}],rew:{scrap:30},tip:'Nave [N] estando atracado en Base Omega. Se compra una vez por nave y suma +100 de resistencia. Sin ella, al salir del aro verás un aviso de implosión y la nave explotará.'}),
 MQ(4,'c4.5','c4.4',{name:'Flota reforzada',desc:'Tu flota también implosionaría fuera del aro: refuérzala en Base Omega (es más barato).',objs:[{tx:'Refuerza todas las naves de tu flota en Base Omega',n:1,g:()=>impAllies().every(w=>w.imp)?1:0,at:()=>{const need=impAllies().filter(w=>!w.imp).length*IMPF.l;if((QX.ing|0)<need){const a=qNear(asts,a=>IMPK.includes(a.m)&&!a.dead&&a.ore>.5);if(a)return{x:a.x,y:a.y,n:'Más mineral raro para fundir'}}return{x:OM.x,y:OM.y,n:OM.n}}}],rew:{cred:300},tip:'Cada nave de la flota cuesta 8 lingotes y 400 cr. Si no tienes flota, esta misión se completa sola.'}),
 MQ(4,'c4.6','c4.5',{name:'Cruza la zona de implosión',desc:'Ya puedes salir. Viaja a la Nebulosa Zafiro, al este del aro de Alfa.',objs:[{tx:'Llega a la Nebulosa Zafiro',n:1,g:()=>RGH(r=>r.vis('region-01'))?1:0,at:()=>RGH(r=>r.pos('region-01'))}],rew:{cred:500},tip:'Usa el mapa [M]: la zona de implosión aparece en rojo. Con el casco reforzado un salto largo la atraviesa sin problemas.'}),
 MQ(4,'c4.7','c4.6',{chEnd:4,last:1,name:'La guardia de Zafiro',desc:'Al entrar, la guardia de la nebulosa te inmovilizará. Derrota al Centinela Zafiro para abrir la región.',objs:[{tx:'Derrota al Centinela Zafiro',n:1,g:()=>RGH(r=>r.cleared('region-01'))?1:0,at:()=>RGH(r=>r.pos('region-01'))}],rew:{cred:2000,scrap:60},tip:'Puedes huir (te devuelven a la frontera) o luchar: primero la guardia, después 2 oleadas y el jefe. Su campo te atrapa hasta derrotarlo; con poca vida se vuelve invulnerable y huye.'}),
 /* Secundarias generales (fuera de la campaña) */
 {id:'wg',cat:'side',auto:1,when:()=>TYPES[4].own,name:'Escoltas',desc:'Repara una nave con el Técnico y ordénale que te siga (clic derecho sobre ella).',objs:[{tx:'Rescata una nave averiada',n:1,rel:1,g:()=>QX.rescue||0},{tx:'Clic derecho en la nave: Seguirme o Enviar a base',n:1,rel:1,g:()=>QX.wgf||0}],rew:{cred:250}},
 {id:'s2',cat:'side',auto:1,repeat:1,when:()=>TYPES[4].own,name:'Rescate de nave',desc:'Rescata una nave averiada (modo Rescate del Técnico).',objs:[{tx:'Rescata una nave averiada',n:1,rel:1,g:()=>QX.rescue,at:()=>{const d=qNear(derel,d=>!d.dead);return d&&{x:d.x,y:d.y,n:'Nave averiada'}}}],rew:{cred:200}},
 {id:'s3',cat:'side',auto:1,repeat:1,when:()=>qOn('c1.4'),name:'Limpiar la zona',desc:'Destruye 5 naves enemigas.',objs:[oKill(5,'Destruye enemigos')],rew:{cred:300,scrap:15}}];
/* Encargos: se generan dinámicamente y se guardan como parámetros */
/* ===== FASE 5: encargos dinámicos y rescate de naves averiadas =====
   Todo es configurable por datos: RESC (variantes de rescate) y JK (tipos de encargo). */
const rn=n=>Math.floor(Math.random()*n);
function repCost(k,v,m){return Math.ceil((m-v)*PR.find(p=>p[0]===k)[3])}
function repTime(k,v,m){return Math.max(3,Math.round(CX[k]*(1-v/m)*(v<=0?1.25:1)/(T.rep?1.5:1)))}
function stepRep(L,get,set,mx,dt,done){for(const j of L){const m=mx(j.k),v=get(j.k);if(v<j.v0-.01){j.tot+=(j.v0-v)/m*CX[j.k]/(T.rep?1.5:1);j.v0=v}j.t+=dt;if(j.t>=j.tot){set(j.k,m);j.done=1;done(j)}}return L.filter(j=>!j.done)}
const evCost=(k,v,m)=>Math.max(1,Math.ceil(Math.ceil(repCost(k,v,100)*1.5)*m));
/* Variantes de rescate: lugar, estado inicial, materiales (mat), oleadas, dificultad y recompensa */
const RESC=[
 {n:'Carguero «Alba»',pool:['eng','eg2','min'],np:[1,2],lo:.2,hi:.55,hp:170,mat:.4,waves:[2,3],tier:0,dm:1,rew:[240,360],scr:[6,14],dist:[2500,26000],when:()=>true},
 {n:'Correo «Lira»',pool:['eng','eg2','wpn','jmp'],np:[2,3],lo:.1,hi:.5,hp:140,mat:.45,waves:[2,3,3],tier:1,dm:1.15,rew:[420,620],scr:[10,24],dist:[12000,48000],when:()=>qdn('c2.2')}];
const oScr=n=>({tx:'Recupera '+n+' de chatarra',n,rel:1,g:()=>QX.scrap||0,at:()=>{const l=qNear(loot);if(l)return{x:l.x,y:l.y,n:'Chatarra'};const a=qNear(asts,a=>!a.dead&&a.ore>.5);return a&&{x:a.x,y:a.y,n:'Rompe asteroides: sueltan chatarra'}}});
const oDk2=(id,nm)=>({tx:'Atraca en '+nm,n:1,g:()=>{const s=QZ.s[id]||{};return s.d0!=null&&(QX.dock[nm]||0)>s.d0?1:0},at:()=>{const b=qBase(nm);return{x:b.x,y:b.y,n:nm}}});
const oPt=(id,x,y,tx,nm)=>({tx,n:1,g:()=>(QZ.s[id]||{}).v?1:0,at:()=>({x,y,n:nm})});
const oMat=(id,nm,n)=>({tx:'Entrega '+n+' de chatarra en '+nm,n:1,g:()=>(QZ.s[id]||{}).dl?1:0,at:()=>{if((ship.scrap|0)<n){const l=qNear(loot);if(l)return{x:l.x,y:l.y,n:'Chatarra'};const a=qNear(asts,a=>!a.dead&&a.ore>.5);if(a)return{x:a.x,y:a.y,n:'Rompe asteroides: sueltan chatarra'}}const b=qBase(nm);return{x:b.x,y:b.y,n:nm}}});
const evIs=id=>!!QZ.ev&&QZ.ev.id===id;
const EVA=()=>{const E=QZ.ev,s=E&&QZ.s[E.id];return !!s&&s.s==='active'};
function rscQ(p){const c=RESC[p.v],at=()=>({x:p.x,y:p.y,n:c.n}),ks=Object.keys(p.pa);
 return{name:'Rescate · '+c.n,desc:c.n+' está averiada cerca de '+p.fn+' y pide ayuda. Repara sus sistemas con tu chatarra (unas '+p.need+') y protégela de los piratas mientras trabajas.',
  acc:()=>evInit(p),fail:()=>!evIs(p.id)||QZ.ev.ph==='fail',
  objs:[{tx:'Llega a la nave averiada',n:1,g:()=>evIs(p.id)&&QZ.ev.arr?1:0,at},
   {tx:'Repara los sistemas dañados ('+ks.map(k=>NM[k]).join(', ')+')',n:ks.length,g:()=>evIs(p.id)?ks.filter(k=>QZ.ev.parts[k]>=99.5).length:0,at},
   {tx:'Protege la nave hasta terminar la operación',n:1,g:()=>evIs(p.id)&&QZ.ev.ph==='ok'?1:0,at}],rew:{cred:p.r,scrap:p.rs}}}
const JK={
 col:p=>({name:p.n+' × '+MIN[p.m][0],desc:'Mina '+p.n+' de '+MIN[p.m][0]+' y atraca en Base Alfa.',objs:[oOre(p.m,p.n),oDock('Base Alfa')]}),
 trv:p=>({name:'Entrega · '+BASES[p.d].n,desc:'Lleva un paquete a '+BASES[p.d].n+'.',objs:[oDock(BASES[p.d].n,'Entrega en '+BASES[p.d].n)]}),
 scr:p=>({name:'Chatarra × '+p.n,desc:'Recupera '+p.n+' de chatarra (rompe asteroides o recoge restos) y llévala a Base Alfa.',objs:[oScr(p.n),oDk2(p.id,'Base Alfa')],dk:'Base Alfa',pre:()=>(QX.scrap||0)-(((QZ.s[p.id]||{}).b||[0])[0]||0)>=p.n}),
 mat:p=>({name:'Materiales · '+BASES[p.d].n,desc:'Entrega '+p.n+' de chatarra en '+BASES[p.d].n+'. Se descuenta de tu bodega al atracar.',objs:[oMat(p.id,BASES[p.d].n,p.n)],mat:{nm:BASES[p.d].n,n:p.n}}),
 inv:p=>({name:'Investigar · '+p.fn,desc:'Una baliza emite una señal débil cerca de '+p.fn+'. Acércate a investigar.',objs:[oPt(p.id,p.x,p.y,'Investiga la señal','Señal débil')],pt:{x:p.x,y:p.y,msg:'Señal investigada: recoges algunos restos'}}),
 rec:p=>({name:'Recuperar componente',desc:'Un componente se perdió cerca de '+p.fn+'. Recupéralo y entrégalo en Base Alfa.',objs:[oPt(p.id,p.x,p.y,'Recupera el componente','Componente perdido'),oDk2(p.id,'Base Alfa')],dk:'Base Alfa',pt:{x:p.x,y:p.y,msg:'Componente recuperado: llévalo a Base Alfa'},pre:()=>!!(QZ.s[p.id]||{}).v}),
 rsc:p=>rscQ(p)};
const qValid=p=>!!p&&!!p.id&&!!((p.k==='col'&&MIN[p.m])||(p.k==='trv'&&BASES[p.d])||(p.k==='scr'&&p.n)||(p.k==='mat'&&BASES[p.d]&&p.n)||((p.k==='inv'||p.k==='rec')&&isFinite(p.x)&&isFinite(p.y)&&p.fn)||(p.k==='rsc'&&RESC[p.v]&&p.pa&&Array.isArray(p.wv)&&isFinite(p.x)&&isFinite(p.y)));
const jobQ=p=>Object.assign({id:p.id,cat:'job',rew:{cred:p.r}},JK[p.k](p));
/* Ubicación real: campos ya visitados o alrededores de bases visitadas, lejos de zonas hostiles y de bases */
function qLoc(mn,mx){const vf=FIELDS.filter(F=>!F.ring&&QX.vis[F.n]),bs=BASES.filter(b=>QX.vis[b.n]);
 for(let t=0;t<30;t++){let x,y,n;if(vf.length&&Math.random()<.7){const F=vf[rn(vf.length)],q=F.smp();x=q[0];y=q[1];n=F.n}else{const b=bs[rn(bs.length)],a=rnd(0,TAU),d=rnd(2400,4200);x=b.x+Math.cos(a)*d;y=b.y+Math.sin(a)*d;n=b.n}
  const P={x,y},dA=dist(P,A);if(dA<mn||dA>mx||dist(P,B)<2300||dist(P,ship)<1500||BASES.some(b=>dist(b,P)<b.r+500))continue;return{x,y,n}}return null}
function rscGen(){if(!qdn('c1.6')||ship.dead>0||ship.parts.wpn<40||ship.hull<T.hull*.5)return null;const cs=RESC.map((c,i)=>i).filter(i=>RESC[i].when());if(!cs.length)return null;const v=cs[rn(cs.length)],c=RESC[v],l=qLoc(c.dist[0],c.dist[1]);if(!l)return null;
 const ks=c.pool.slice(),pa={},np=c.np[0]+rn(c.np[1]-c.np[0]+1);for(let i=0;i<np&&ks.length;i++)pa[ks.splice(rn(ks.length),1)[0]]=Math.round(rnd(c.lo,c.hi)*100);
 let need=0;for(const k in pa)need+=evCost(k,pa[k],c.mat);if((ship.scrap|0)<Math.ceil(need*.5))return null;
 return{k:'rsc',v,x:l.x,y:l.y,fn:l.n,pa,need,hp:c.hp,mat:c.mat,wv:c.waves.slice(),tier:c.tier,dm:c.dm,r:Math.round(rnd(c.rew[0],c.rew[1])),rs:Math.round(rnd(c.scr[0],c.scr[1]))}}
const JW={col:3,trv:2,scr:2,mat:2,inv:2,rec:1.5,rsc:1.3};
function qGen(){const pend=QZ.jobs.filter(p=>{const s=(QZ.s[p.id]||{s:'available'}).s;return s==='available'||s==='active'}),has=k=>pend.some(p=>p.k===k);
 const vb=BASES.map((b,i)=>i).filter(i=>i>0&&QX.vis[BASES[i].n]);
 const G={col:()=>{const m=['fe','cu','cr'][rn(3)],n=12+rn(19);return{k:'col',m,n,r:Math.round(n*C.sell*MIN[m][2]*.9)}},
  trv:()=>{if(!vb.length)return null;const d=vb[rn(vb.length)];return{k:'trv',d,r:Math.min(700,Math.round(150+dist(BASES[d],A)/25))}},
  scr:()=>{const n=8+rn(13);return{k:'scr',n,r:n*14}},
  mat:()=>{if(!vb.length)return null;const d=vb[rn(vb.length)],n=6+rn(9);return{k:'mat',d,n,r:Math.round(n*16+Math.min(250,dist(BASES[d],A)/90))}},
  inv:()=>{const l=qLoc(2500,32000);return l&&{k:'inv',x:l.x,y:l.y,fn:l.n,r:Math.round(140+Math.min(260,dist(l,A)/80))}},
  rec:()=>{const l=qLoc(3500,45000);return l&&{k:'rec',x:l.x,y:l.y,fn:l.n,r:Math.round(220+Math.min(300,dist(l,A)/80))}},
  rsc:rscGen};
 let ks=Object.keys(G).filter(k=>!has(k));while(ks.length){const tot=ks.reduce((a,k)=>a+JW[k],0);let r=Math.random()*tot,k=ks[0];for(const q of ks){r-=JW[q];if(r<=0){k=q;break}}
  const p=G[k]();if(p){QZ.jobs.push(Object.assign({id:'j'+(++QZ.jn)},p));return}ks=ks.filter(q=>q!==k)}}
