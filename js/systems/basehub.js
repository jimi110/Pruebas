/* ============================================================================
   systems/basehub.js — Centro de base: pestañas, mercado y fondo interior.
   ----------------------------------------------------------------------------
   · Barra superior (en el hangar y en la pantalla Nave) con pestañas: HANGAR · NAVE · ECONOMÍA · BASE.
   · Atracar YA NO vende nada: el mineral se vende (todo o a elección) en la pestaña ECONOMÍA.
   · Mercado único y compartido por todas las bases: cada mineral (crudo o en lingote) y la chatarra tienen un
     precio que varía con las existencias (mucho stock = barato, escasez = caro) y con eventos aleatorios.
     Se puede comprar y vender; comprar sale algo más caro que vender. Cada base aplica su multiplicador
     al vender (Beta y Omega pagan más).
   · Fundición (solo Estación Umbral): convierte mineral crudo en lingotes del mismo mineral. Los lingotes se
     guardan en el almacén común de todas las bases (QX.ig). Las existencias y el historial se guardan en QX.mk.
   · Al abrir NAVE, ECONOMÍA o BASE estando atracado, el fondo de estrellas pasa a ser el interior de la base.
   · Script clásico: comparte el ámbito global con el resto del juego.
   ========================================================================== */
"use strict";
let hubTab='nave',mkSel='fe',MKV=0,MKA=0,MKH=0,flSel=0,flMin='fe',flMode='sell',FLID=0;
const MKN=90,MKSP=.92,MKBY=1.1,MKIN=2.2;
const MKS0={fe:900,cu:700,cr:450,pt:260,ti:160,ir:90,ne:40,sc:1500};
/* ---------- catálogo ---------- */
function mkItems(){const L=[];for(const k in MIN)L.push({k,raw:1,n:MIN[k][0],col:MIN[k][1],p0:C.sell*MIN[k][2],s0:MKS0[k]||300});
  for(const k in MIN)L.push({k:'i_'+k,ing:k,n:'Lingote de '+MIN[k][0].toLowerCase(),col:MIN[k][1],p0:C.sell*MIN[k][2]*MKIN,s0:Math.round((MKS0[k]||300)*.4)});
  L.push({k:'sc',scr:1,n:'Chatarra',col:'#cfe8ff',p0:1,s0:MKS0.sc});return L}
let MKI=null;const mkItem=k=>{if(!MKI)MKI=mkItems();return MKI.find(i=>i.k===k)};
const mkAll=()=>{if(!MKI)MKI=mkItems();return MKI};
/* ---------- estado y simulación ---------- */
const mkG=()=>{let a=0;for(let i=0;i<4;i++)a+=Math.random();return(a-2)/1.15};
function mkStepO(o,I){o.s+=(I.s0-o.s)*.012+(Math.random()-.5)*I.s0*.006;o.m+=(1-o.m)*.03+mkG()*.012;o.m=Math.max(.75,Math.min(1.35,o.m));o.s=Math.max(I.s0*.05,Math.min(I.s0*3,o.s))}
const mkMidO=(o,I)=>I.p0*o.m*Math.max(.55,Math.min(2.3,Math.pow(I.s0/Math.max(o.s,I.s0*.12),.4)));
function mkInit(){
  if(QX.ing){QX.ig=QX.ig||{};QX.ig.pt=(QX.ig.pt||0)+QX.ing;QX.ing=0}   // migración de lingotes sueltos antiguos
  QX.ig=QX.ig||{};
  if(QX.mk&&QX.mk.v===1&&mkAll().every(i=>QX.mk.st[i.k]))return;
  const st={};for(const I of mkAll()){const o={s:I.s0*(.75+Math.random()*.5),m:1,h:[]};for(let i=0;i<MKN;i++){for(let j=0;j<3;j++)mkStepO(o,I);o.h.push(Math.round(mkMidO(o,I)*100)/100)}st[I.k]=o}
  QX.mk={v:1,st,news:null}}
const mkO=k=>{mkInit();return QX.mk.st[k]},mkMid=k=>mkMidO(mkO(k),mkItem(k));
const mkSellP=(k,b)=>{const I=mkItem(k);return mkMid(k)*MKSP*(I.scr?1:(b&&b.mult)||1)},mkBuyP=k=>mkMid(k)*(mkItem(k).scr?1.3:MKBY);
function mkNews(txt){QX.mk.news={t:Date.now(),txt}}
function mkShock(){const L=mkAll().filter(i=>!i.scr||Math.random()<.3),I=L[Math.floor(Math.random()*L.length)],o=mkO(I.k),up=Math.random()<.5;
  o.s=Math.max(I.s0*.05,o.s*(up?.45:1.9));
  mkNews(up?'Escasez de '+I.n.toLowerCase()+': un convoy no ha llegado y el precio sube.':'Llega un cargamento de '+I.n.toLowerCase()+': sobra existencias y el precio baja.')}
function mkTick(dt){if(state==='menu'||!QX)return;mkInit();MKA+=dt;MKH+=dt;
  if(MKA>=4){MKA=0;for(const I of mkAll())mkStepO(QX.mk.st[I.k],I)}
  if(MKH>=12){MKH=0;for(const I of mkAll()){const o=QX.mk.st[I.k];o.h.push(Math.round(mkMidO(o,I)*100)/100);if(o.h.length>MKN)o.h.shift()}MKV++}
  if(Math.random()<dt/110)mkShock()}
/* ---------- lingotes (almacén común) ---------- */
const ingTot=()=>Object.values(QX.ig||{}).reduce((a,b)=>a+(b||0),0);
function ingSpend(n){if(ingTot()<n)return false;const ks=Object.keys(QX.ig).filter(k=>QX.ig[k]>0).sort((a,b)=>mkMid('i_'+a)-mkMid('i_'+b));
  for(const k of ks){const q=Math.min(QX.ig[k],n);QX.ig[k]-=q;n-=q;if(n<=0)break}return true}
/* ---------- almacén común (todas las bases): crudo y chatarra; los lingotes están en QX.ig ---------- */
const whO=()=>(QX.wh=QX.wh||{}),whGet=k=>Math.floor(whO()[k]||0);
function whAdd(k,n){const o=whO();o[k]=(o[k]||0)+n;if(o[k]<.0001)delete o[k]}
const whTot=()=>Object.values(whO()).reduce((a,b)=>a+(b||0),0);
/* ---------- operaciones ---------- */
const mkHeld=k=>{const I=mkItem(k);return I.raw?Math.floor(ship.inv[k]||0)+whGet(k):I.ing?Math.floor((QX.ig||{})[I.ing]||0):Math.floor(ship.scrap||0)+whGet('sc')};
const mkCargo=k=>Math.floor(ship.inv[k]||0);
function mkSell(k,q,quiet,src){const d=ship.docked,I=mkItem(k);if(!d||!I)return 0;const have=src==='cargo'?mkCargo(k):mkHeld(k),n=q==='all'?have:Math.min(+q||0,have);if(n<=0){if(!quiet)toast('No tienes '+I.n.toLowerCase()+' para vender');return 0}
  const o=mkO(k);let rev=0;const s=o.s;for(let i=0;i<n;i++){o.s=s+i;rev+=mkSellP(k,d)}o.s=s+n;rev=Math.floor(rev);
  if(I.raw){const c=Math.min(n,mkCargo(k));if(c){ship.inv[k]-=c;if(ship.inv[k]<.001)delete ship.inv[k];ship.ore=Math.max(0,(ship.ore||0)-c)}if(n>c)whAdd(k,-(n-c));qEv('del',d.n,{[k]:n})}
  else if(I.ing)QX.ig[I.ing]-=n;else{const c=Math.min(n,Math.floor(ship.scrap||0));ship.scrap-=c;if(n>c)whAdd('sc',-(n-c))}
  ship.cred+=rev;qEv('sell',rev);if(!quiet)toast('Vendido: '+n+' × '+I.n.toLowerCase()+' → +'+rev+' cr');return rev}
function mkBuy(k,q){const d=ship.docked,I=mkItem(k);if(!d||!I)return;const o=mkO(k);let max=Math.floor(o.s-I.s0*.05);if(max<1)return toast('Sin existencias de '+I.n.toLowerCase()+' en el mercado');
  const want=q==='max'?max:Math.min(+q||0,max);let n=0,cost=0;const s=o.s;for(let i=0;i<want;i++){o.s=s-i;const p=mkBuyP(k);if(cost+p>ship.cred)break;cost+=p;n++}
  o.s=s-n;if(n<=0)return toast('Créditos insuficientes');cost=Math.ceil(cost);ship.cred-=cost;
  if(I.raw)whAdd(k,n);else if(I.ing)QX.ig[I.ing]=(QX.ig[I.ing]||0)+n;else whAdd('sc',n);
  toast('Comprado: '+n+' × '+I.n.toLowerCase()+' por '+cost+' cr → almacén común')}
function mkSellN(k,n,b){const o=mkO(k),s0=o.s;let rev=0;for(let i=0;i<n;i++){o.s=s0+i;rev+=mkSellP(k,b)}o.s=s0+n;return Math.floor(rev)}
function mkSellCargo(){let tot=0,n=0;for(const k in MIN){const h=mkCargo(k);if(h>0){tot+=mkSell(k,'all',1,'cargo');n+=h}}if(!n)return toast('No llevas mineral en la bodega');toast('Carga vendida: '+n+' minerales → +'+tot+' cr')}
function mkSmelt(k,q){const d=ship.docked;if(!d||d.n!=='Estación Umbral')return toast('La fundición está en Estación Umbral');const have=mkHeld(k),n=q==='all'?have:Math.min(+q||0,have);if(n<=0)return toast('No tienes ese mineral');
  {const c=Math.min(n,mkCargo(k));if(c){ship.inv[k]-=c;if(ship.inv[k]<.001)delete ship.inv[k];ship.ore=Math.max(0,ship.ore-c)}if(n>c)whAdd(k,-(n-c))}QX.ig[k]=(QX.ig[k]||0)+n;QX.ingT=(QX.ingT|0)+n;toast('🔥 '+n+' × '+MIN[k][0].toLowerCase()+' fundidos: +'+n+' lingotes en el almacén común')}
function mkAct(s){const p=String(s).split(':');try{if(p[0]==='sel')mkSel=p[1];else if(p[0]==='sell')mkSell(p[1],p[2]);else if(p[0]==='buy')mkBuy(p[1],p[2]);else if(p[0]==='cargo')mkSellCargo();else if(p[0]==='smelt')mkSmelt(p[1],p[2]);else if(p[0]==='wh')whMove(p[1],p[2],p[3]);else if(p[0]==='up')upAct(p[1],p[2]);else if(p[0]==='fl')flAct(p);
  if(p[0]!=='sel')saveGame()}catch(e){console.warn('[mercado]',e)}}
/* ---------- textos ---------- */
const MKL={fe:['Esqueleto de cascos, vigas y remaches. Tan común que casi nunca escasea.','Blindaje básico, reparaciones y chatarra.','Fácil: no exige mejoras de minería.'],
 cu:['Conductor de cables, bobinas y reactores. Las estaciones pequeñas siempre lo reclaman.','Cableado, motores y escudos.','Fácil.'],
 cr:['Silicato cristalino que se talla en lentes y sensores. Brilla con luz propia en los campos jóvenes.','Lentes de láser, sensores y blindaje óptico.','Media.'],
 pt:['Metal noble e inalterable. Cataliza las reacciones de los motores de salto, por eso nunca sobra.','Motores de salto, catalizadores y electrónica fina.','Media-alta.'],
 ti:['Aleación ligerísima y muy resistente. Las naves de élite lo prefieren al hierro.','Cascos reforzados y estructura de naves rápidas.','Alta: exige Sistema de minería nv.1.'],
 ir:['Metal densísimo y casi indestructible. Resiste presiones que aplastarían cualquier otro casco.','Escudos, cascos de élite y herramientas de minería profunda.','Muy alta: exige Sistema de minería nv.2.'],
 neu:0};
MKL.ne=['Materia de estrellas muertas. Apenas se estudia y casi nadie sabe trabajarla: el mineral más raro y caro.','Reactores avanzados e investigación.','Extrema: exige Sistema de minería nv.3.'];
const MKSC=['Restos de naves y estaciones, desguazados y prensados. Se usa para reparar antes que los créditos.','Reparaciones en cualquier base.'];
const BLORE={'Base Alfa':'Primera base de la región, construida sobre el aro de asteroides que amortigua la presión del exterior. Hogar de los pilotos novatos y de todo el comercio local.',
 'Base Beta':'Plataforma minera avanzada, sin protección frente a los piratas. Paga más por el mineral y vende naves a quien se atreva a llegar.',
 'Base Omega':'Última base conocida, de acceso restringido. Sus guardianes atacan a quien no lleve la tarjeta. Aquí se vende la nave más avanzada y se refuerza el casco para salir al exterior.',
 'Estación Cobre':'Pequeña estación de servicio rodeada de campos de cobre. Mejoras para tu nave y poco más.','Estación Vega':'Estación de mejoras con la única tienda de armas de la región.','Estación Nova':'Estación de mejoras en el borde de los campos ricos.',
 'Estación Umbral':'La estación amarilla antes de Omega: prueba de pilotaje, tarjeta de acceso y la única fundición de la región, donde el mineral se convierte en lingotes.'};
const mkFound=I=>{const k=I.raw?I.k:I.ing;if(!k)return'—';const L=FIELDS.filter(f=>f.tb&&f.tb.some(t=>t[0]===k)).map(f=>f.n);return L.length?L.join(' · '):'—'};
const mkFmt=v=>v>=100?Math.round(v)+'':v>=10?v.toFixed(1):v.toFixed(2);
/* ---------- gráficos (SVG) ---------- */
function mkSpark(h,col,w=70,hh=22){const mn=Math.min(...h),mx=Math.max(...h),r=Math.max(mx-mn,mx*.02,.01);const pts=h.map((v,i)=>(i/(h.length-1)*w).toFixed(1)+','+(hh-2-(v-mn)/r*(hh-4)).toFixed(1)).join(' ');
  return `<svg width="${w}" height="${hh}" viewBox="0 0 ${w} ${hh}" style="flex:none"><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.6" stroke-linejoin="round"/></svg>`}
function mkChart(h,col){const W=320,H=120,pl=34,mn0=Math.min(...h),mx0=Math.max(...h),pd=Math.max((mx0-mn0)*.12,mx0*.02,.01),mn=mn0-pd,mx=mx0+pd,y=v=>H-8-(v-mn)/(mx-mn)*(H-18),x=i=>pl+i/(h.length-1)*(W-pl-6);
  const pts=h.map((v,i)=>x(i).toFixed(1)+','+y(v).toFixed(1)),area=pts.join(' ')+` ${x(h.length-1)},${H-8} ${x(0)},${H-8}`;let g='';
  for(let i=0;i<4;i++){const v=mn+(mx-mn)*i/3,yy=y(v);g+=`<line x1="${pl}" x2="${W-6}" y1="${yy.toFixed(1)}" y2="${yy.toFixed(1)}" stroke="rgba(120,160,200,.18)"/><text x="${pl-4}" y="${(yy+3).toFixed(1)}" fill="rgba(180,205,230,.6)" font-size="9" text-anchor="end">${mkFmt(v)}</text>`}
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;background:rgba(5,12,22,.55);border:1px solid #1d3550"><defs><linearGradient id="mkg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".35"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>${g}<polygon points="${area}" fill="url(#mkg)"/><polyline points="${pts.join(' ')}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round"/><circle cx="${x(h.length-1).toFixed(1)}" cy="${y(h[h.length-1]).toFixed(1)}" r="3.5" fill="${col}"/></svg>`}
const mkStock=I=>{const r=mkO(I.k).s/I.s0;return r<.45?['ESCASEZ','#ff6b6b']:r<.8?['BAJAS','#ffb347']:r<1.3?['NORMAL','#7dff9b']:['ABUNDANTE','#7dc8ff']};
const mkTrend=h=>{const a=h[Math.max(0,h.length-7)],b=h[h.length-1];return a?(b-a)/a*100:0};
/* ---------- paneles ---------- */
function hubRender(){const sp=$('shipP'),sc=sp.scrollTop,l=sp.querySelector('.mkl'),ls=l?l.scrollTop:0;sp.innerHTML=hubTab==='econ'?hubEcon():hubTab==='wh'?hubWh():hubTab==='upg'?hubUpg():hubTab==='fleet'?hubFleet():hubBase();sp.scrollTop=sc;const l2=sp.querySelector('.mkl');if(l2)l2.scrollTop=ls}
function hubEcon(){mkInit();const d=ship.docked,umb=d&&d.n==='Estación Umbral',cargoV=Object.keys(MIN).reduce((a,k)=>a+mkCargo(k)*mkSellP(k,d),0);
  const chip=(t,v)=>`<span class=cc>${t}<b>${v}</b></span>`;
  let h=`<div class=sh1><b style="color:#ffd166;letter-spacing:.12em">ECONOMÍA · ${d.n.toUpperCase()}</b>${sq('Cerrar [N]','data-x=1')}</div>
<div class=res>${chip('◈ ',ship.cred+' cr')}${chip('Chatarra ',ship.scrap|0)}${chip('Carga ',Math.floor(ship.ore)+'/'+T.cargo)}${chip('Almacén ',ingTot()+' lingotes · '+whTot()+' crudo')}${d.mult!==1?chip('Paga ','×'+d.mult):''}</div>`;
  if(QX.mk.news)h+=`<div class=card2 style="border-color:#ffd166;margin-top:8px"><span style="color:#ffd166">📰 Mercado:</span> ${QX.mk.news.txt}</div>`;
  h+=`<div class=card2 style="margin-top:8px">${sq('Vender toda la carga'+(cargoV>=1?' (≈ '+Math.floor(cargoV)+' cr)':''),'data-mk="cargo"'+(cargoV>=1?'':' disabled'),'width:100%')}<div class=dim style="margin-top:6px">Atracar no vende nada: aquí eliges qué vender (de tu bodega y del almacén). Lo que compres y los lingotes que fundas van al almacén común de todas las bases.</div></div>`;
  const row=I=>{const o=mkO(I.k),tr=mkTrend(o.h),tc=tr>.5?'#7dff9b':tr<-.5?'#ff8a8a':'#9fb3c8',st=mkStock(I),hd=mkHeld(I.k),sp=I.scr?mkSellP(I.k,d):mkSellP(I.k,d);
    return `<button class="mkrow${I.k===mkSel?' on':''}" data-mk="sel:${I.k}"><i style="background:${I.col}"></i><span style="flex:1;min-width:0"><b>${I.n}</b><small style="display:block;color:${st[1]}">${st[0]}${hd?` · tienes ${hd}`:''}</small></span>${mkSpark(o.h,tc)}<span style="text-align:right;min-width:62px"><b>${mkFmt(sp)}</b><small style="display:block;color:${tc}">${tr>=0?'▲':'▼'} ${Math.abs(tr).toFixed(1)}%</small></span></button>`};
  const L=mkAll();let list='<div class=mkh>CRUDOS</div>'+L.filter(i=>i.raw).map(row).join('')+'<div class=mkh>LINGOTES (cocinados)</div>'+L.filter(i=>i.ing).map(row).join('')+'<div class=mkh>OTROS</div>'+L.filter(i=>i.scr).map(row).join('');
  const I=mkItem(mkSel)||mkItem('fe'),o=mkO(I.k),st=mkStock(I),hd=mkHeld(I.k),sP=mkSellP(I.k,d),bP=mkBuyP(I.k),lore=I.raw?MKL[I.k]:I.ing?['Mineral '+MIN[I.ing][0].toLowerCase()+' fundido y purificado en Estación Umbral. Más valioso y compacto que el crudo: no ocupa bodega, se guarda en el almacén común de todas las bases.','Refuerzos de casco (30 lingotes de cualquier tipo) y comercio.','Se obtiene fundiendo el crudo en Estación Umbral.']:MKSC;
  let dt=`<div class=card2><div style="display:flex;align-items:center;gap:8px"><i style="width:14px;height:14px;border-radius:50%;background:${I.col};display:inline-block"></i><b style="font-size:16px">${I.n}</b><span class=badge style="margin-left:auto;color:${st[1]}">${st[0]}</span></div>
<div style="margin:8px 0 4px">${mkChart(o.h,I.col)}</div><div class=dim style="font-size:11px;text-align:right">últimos ~${Math.round(MKN*12/60)} min · el precio cambia con las existencias</div>
${kv('Te pagan (aquí)',mkFmt(sP)+' cr/ud',I.k===mkSel?'#7dff9b':'')}${kv('Te cobran',mkFmt(bP)+' cr/ud','#ffd166')}${kv('Existencias del mercado',Math.round(o.s)+' (normal ≈ '+I.s0+')')}${kv('Tienes',I.raw?hd+' (bodega '+mkCargo(I.k)+' + almacén '+whGet(I.k)+')':I.ing?hd+' en el almacén común':hd+' (nave '+Math.floor(ship.scrap||0)+' + almacén '+whGet('sc')+')')}
<div style="display:flex;gap:6px;margin-top:8px">${sq('Vender 1','data-mk="sell:'+I.k+':1"'+(hd>=1?'':' disabled'),'flex:1')}${sq('Vender 10','data-mk="sell:'+I.k+':10"'+(hd>=1?'':' disabled'),'flex:1')}${sq('Vender todo','data-mk="sell:'+I.k+':all"'+(hd>=1?'':' disabled'),'flex:1;color:#7dff9b')}</div>
<div style="display:flex;gap:6px;margin-top:6px">${sq('Comprar 1','data-mk="buy:'+I.k+':1"','flex:1')}${sq('Comprar 10','data-mk="buy:'+I.k+':10"','flex:1')}${sq('Comprar máx.','data-mk="buy:'+I.k+':max"','flex:1;color:#ffd166')}</div>`;
  if(I.raw)dt+=umb?`<div style="border-top:1px solid #1d3550;margin:10px 0 6px"></div><b style="color:#ff9a4f">FUNDICIÓN</b><div class=dim style="margin:4px 0">Funde ${MIN[I.k][0].toLowerCase()} en lingotes (1 por 1). Solo en Estación Umbral.</div><div style="display:flex;gap:6px">${sq('Fundir 1','data-mk="smelt:'+I.k+':1"'+(hd>=1?'':' disabled'),'flex:1')}${sq('Fundir todo','data-mk="smelt:'+I.k+':all"'+(hd>=1?'':' disabled'),'flex:1;color:#ff9a4f')}</div>`:`<div class=dim style="margin-top:8px">🔥 La fundición para convertirlo en lingote está en Estación Umbral.</div>`;
  dt+=`</div><div class=card2><b>Descripción</b><div style="margin:6px 0">${lore[0]}</div>${I.scr?'':kv('Dónde se encuentra',mkFound(I))}${kv('Para qué sirve',lore[1])}${lore[2]?kv('Dificultad',lore[2]):''}</div>`;
  return h+`<div class=mkw><div class=mkl>${list}</div><div>${dt}</div></div>`}
function hubBase(){const d=ship.docked,i=BASES.indexOf(d);
  const sv=[['Hangar','Cambia de nave y despega'],['Reparaciones','Chatarra primero, luego créditos (pestaña NAVE)'],['Economía','Compra y venta de minerales, lingotes y chatarra']];
  if(d.small||d.n==='Estación Cobre')sv.push(['Mejoras','Mejoras de componentes de la nave']);if(d.n==='Estación Vega')sv.push(['Armas','Única tienda de armas']);
  if(d.n==='Base Beta'||d.n==='Base Omega')sv.push(['Tienda de naves',d.n==='Base Omega'?'La nave más avanzada: el Técnico':'2 naves a la venta']);
  if(d.n==='Base Omega')sv.push(['Refuerzo anti-implosión','Pestaña NAVE → Casco (30 lingotes + 3000 cr)']);
  if(d.n==='Estación Umbral')sv.push(['Fundición','Mineral crudo → lingotes (pestaña ECONOMÍA)'],['Prueba de acceso','Tarjeta para entrar en Base Omega']);
  const dist=Math.round(Math.hypot(d.x-BASES[0].x,d.y-BASES[0].y)/100)/10;
  return `<div class=sh1><b style="color:${d.col};letter-spacing:.12em">${d.n.toUpperCase()}</b>${sq('Cerrar [N]','data-x=1')}</div>
<div class=card2 style="border-color:${d.col}"><span class=badge style="color:${d.col}">${d.tag||''}</span><div style="margin-top:8px">${BLORE[d.n]||d.info||''}</div>${d.info&&BLORE[d.n]?`<div class=dim style="margin-top:6px">${d.info}</div>`:''}</div>
<div class=card2><b>DATOS</b>${kv('Tipo',d.small?'Estación':'Base')}${kv('Distancia a Base Alfa',dist+' km')}${kv('Pago por minerales','×'+d.mult,d.mult>1?'#7dff9b':'')}${kv('Radio de atraque',d.r+' u')}</div>
<div class=card2><b>SERVICIOS</b>${sv.map(s=>kv(s[0],s[1])).join('')}</div>`}
const hubSig=()=>hubTab+'|'+mkSel+'|'+MKV+'|'+(hubTab==='fleet'?Math.floor(time)+'|'+flSel+flMin+flMode:'')+'|'+(QX.wh?JSON.stringify(QX.wh):'')+'|'+(ship.inv?Object.keys(ship.inv).map(k=>k+Math.floor(ship.inv[k])).join():'')+'|'+Math.floor(ingTot())+'|'+(QX.mk&&QX.mk.news?QX.mk.news.t:0);
/* ---------- barra superior ---------- */
let hubEl=null,hubSg='';
function hubBar(){if(hubEl)return hubEl;hubEl=document.createElement('div');hubEl.id='hubTop';document.body.appendChild(hubEl);
  const st=document.createElement('style');st.textContent=`#hubTop{position:fixed;top:0;left:0;right:0;z-index:50;display:none;gap:6px;align-items:center;padding:6px 10px;background:rgba(5,12,22,.95);border-bottom:1px solid var(--bd,#1d3550);box-sizing:border-box;overflow-x:auto;white-space:nowrap;font-family:inherit;pointer-events:auto}
#hubTop .bn{font-size:12px;letter-spacing:.08em;margin-right:4px}#hubTop .cr{margin-left:auto;color:#ffd166;font-size:12px;padding-left:8px}
#hubTop button{background:rgba(10,20,34,.9);border:1px solid #2a4560;color:#cfe8ff;padding:7px 11px;font:inherit;font-size:12px;letter-spacing:.08em;cursor:pointer}#hubTop button.on{background:#12304a;border-color:#4fd1ff;color:#fff}
#shipP.dk{padding-top:54px}#shipP.wide{top:0!important;left:0!important;right:0!important;bottom:0!important;width:auto!important;max-height:none!important;border:0!important}
.mkw{display:grid;grid-template-columns:minmax(260px,40%) 1fr;gap:12px;margin-top:8px;align-items:start}@media(max-width:720px){.mkw{grid-template-columns:1fr}}
.mkl{max-height:calc(100vh - 260px);overflow:auto;padding-right:4px}@media(max-width:720px){.mkl{max-height:300px}}
.mkh{margin:10px 0 4px;color:#7fa8c8;font-size:11px;letter-spacing:.18em}.mkh:first-child{margin-top:0}
.mkrow{display:flex;align-items:center;gap:8px;width:100%;text-align:left;margin:3px 0;padding:7px 8px;background:rgba(10,20,34,.8);border:1px solid #1d3550;color:#cfe8ff;font:inherit;cursor:pointer}.mkrow.on{border-color:#ffd166;background:#16263a}
.flw{display:grid;grid-template-columns:minmax(230px,34%) 1fr;gap:12px;margin-top:8px;align-items:start}@media(max-width:760px){.flw{grid-template-columns:1fr}}
.fll{display:flex;flex-direction:column;gap:6px;max-height:calc(100vh - 230px);overflow:auto}@media(max-width:760px){.fll{max-height:none;flex-direction:row;overflow-x:auto}.flc{min-width:210px}}
.flc{text-align:left;padding:8px 10px;background:rgba(10,20,34,.85);border:1px solid #1d3550;border-left:4px solid var(--c,#4fd1ff);color:#cfe8ff;font:inherit;cursor:pointer}.flc.on{background:#16263a;border-color:var(--c,#ffb86b)}
.flh{display:flex;align-items:center;gap:8px}.flh i{width:10px;height:10px;border-radius:50%;flex:none}.flh b{flex:1;min-width:0}
.chp{border:1px solid;padding:1px 8px;font-size:10px;letter-spacing:.08em;white-space:nowrap}
.fld{display:flex;flex-direction:column;gap:10px}.fld .card2{margin:0}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px}.tile{background:rgba(5,12,22,.7);border:1px solid #16293f;padding:6px 8px}.tile small{display:block;font-size:10px;color:#7fa8c8;letter-spacing:.1em;text-transform:uppercase}.tile b{font-size:13px}
.acts{display:flex;flex-wrap:wrap;gap:6px}.acts .sq{position:static;width:auto!important;margin:0!important;padding:7px 11px;font-size:12px}
.stp{margin:14px 0 6px;color:#ffb86b;font-size:11px;letter-spacing:.14em;text-transform:uppercase}.stp b{display:inline-block;width:18px;height:18px;line-height:18px;text-align:center;border:1px solid #ffb86b;border-radius:50%;margin-right:6px}
.chb{background:rgba(10,20,34,.9);border:1px solid #2a4560;color:#cfe8ff;padding:6px 10px;font:inherit;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:6px}.chb i{width:9px;height:9px;border-radius:50%}.chb.on{border-color:#ffb86b;background:#2a2012;color:#fff}.chb[disabled]{opacity:.45;cursor:default}
.whr{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:6px 0;border-top:1px solid #12243a;font-size:12px}.whr:first-child{border-top:0}.whr i{width:10px;height:10px;border-radius:50%;flex:none}.whb{margin-left:auto;display:flex;gap:6px}.whb .sq{position:static;padding:5px 9px;font-size:11px;margin:0}.fls{margin:8px 0}.mkrow i{width:10px;height:10px;border-radius:50%;flex:none}.mkrow small{font-size:10px;opacity:.9}`;document.head.appendChild(st);
  hubEl.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&b.dataset.hub)hubGo(b.dataset.hub)});return hubEl}
function hubSync(){const on=!!ship.docked&&(state==='hangar'||state==='ship');const el=hubBar();if(!on){if(el.style.display!=='none')el.style.display='none';hubSg='';return}
  const cur=state==='hangar'?'hangar':hubTab,sg=cur+'|'+ship.docked.n+'|'+Math.floor(ship.cred);if(sg===hubSg)return;hubSg=sg;el.style.display='flex';
  const t=[['hangar','⌂ HANGAR'],['nave','⚙ NAVE'],['upg','✚ MEJORAS'],['fleet','✈ FLOTA'],['econ','◈ ECONOMÍA'],['wh','▣ ALMACÉN'],['base','ⓘ BASE']];
  el.innerHTML=`<span class=bn style="color:${ship.docked.col}">${ship.docked.n.toUpperCase()}</span>`+t.map(a=>`<button data-hub="${a[0]}" class="${a[0]===cur?'on':''}">${a[1]}</button>`).join('')+`<span class=cr>◈ ${Math.floor(ship.cred)} cr</span>`}
function hubGo(t){if(!ship.docked)return;
  if(t==='hangar'){if(state==='hangar')return;if(state==='ship'){if(prevS==='hangar')closeShip();else{shT=0;shDir=1;setState('play');openHangar()}}return}
  hubTab=t;if(state==='hangar')openShip();else if(state==='ship')renderShip();hubSg=''}
/* ---------- fondo: interior de la base ---------- */
function baseInterior(b){const c=b.col||'#4fd1ff',sm=!!b.small,t=time;g.fillStyle='#060a12';g.fillRect(0,0,W,H);
  const fy=H*.66,wl=g.createLinearGradient(0,0,0,fy);wl.addColorStop(0,'#0c1626');wl.addColorStop(1,'#09111d');g.fillStyle=wl;g.fillRect(0,0,W,fy);
  g.strokeStyle='rgba(120,160,200,.10)';g.lineWidth=1;const pw=sm?110:160;for(let x=0;x<W;x+=pw){g.beginPath();g.moveTo(x,0);g.lineTo(x,fy);g.stroke();g.fillStyle='rgba(120,160,200,.06)';g.fillRect(x+3,0,2,fy)}
  for(let y=fy*.18;y<fy;y+=fy*.27){g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke()}
  const ww=Math.min(W*.62,sm?460:760),wh=fy*.5,wx=W/2-ww/2,wy=fy*.14;                                     // ventanal con estrellas
  g.save();g.beginPath();g.rect(wx,wy,ww,wh);g.clip();g.fillStyle='#02040a';g.fillRect(wx,wy,ww,wh);VR=0;stars();
  const pg=g.createRadialGradient(wx+ww*.78,wy+wh*.35,0,wx+ww*.78,wy+wh*.35,wh*.5);pg.addColorStop(0,c+'55');pg.addColorStop(1,c+'00');g.fillStyle=pg;g.fillRect(wx,wy,ww,wh);g.restore();
  g.strokeStyle='#243a54';g.lineWidth=6;g.strokeRect(wx,wy,ww,wh);g.strokeStyle='rgba(125,180,230,.25)';g.lineWidth=2;for(let i=1;i<4;i++){g.beginPath();g.moveTo(wx+ww*i/4,wy);g.lineTo(wx+ww*i/4,wy+wh);g.stroke()}
  const lc=Math.max(5,Math.round(W/150));for(let i=0;i<lc;i++){const x=(i+.5)/lc*W,pu=.65+.35*Math.sin(t*1.7+i*1.3),gl=g.createRadialGradient(x,6,0,x,6,70);gl.addColorStop(0,c+(pu>.8?'66':'44'));gl.addColorStop(1,c+'00');g.fillStyle=gl;g.fillRect(x-70,0,140,90);g.fillStyle='rgba(235,245,255,'+(.55+.4*pu)+')';g.fillRect(x-20,3,40,4)}   // luces del techo
  const fl=g.createLinearGradient(0,fy,0,H);fl.addColorStop(0,'#101c2c');fl.addColorStop(1,'#050a12');g.fillStyle=fl;g.fillRect(0,fy,W,H-fy);
  g.strokeStyle='rgba(79,209,255,.16)';for(let i=-12;i<=12;i++){g.beginPath();g.moveTo(W/2+i*40,fy);g.lineTo(W/2+i*190,H);g.stroke()}for(let j=1;j<7;j++){const y=fy+(H-fy)*j*j/49;g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke()}
  g.fillStyle=c+'33';g.fillRect(0,fy-4,W,4);for(let x=-40;x<W;x+=34){g.fillStyle='rgba(255,209,102,.16)';g.beginPath();g.moveTo(x,fy+8);g.lineTo(x+16,fy+8);g.lineTo(x+6,fy+16);g.lineTo(x-10,fy+16);g.closePath();g.fill()}   // franja de seguridad
  g.fillStyle='rgba(8,14,24,.85)';for(const[fx,fw,fh]of[[.05,.1,.16],[.86,.1,.2]]){g.fillRect(W*fx,fy-H*fh,W*fw,H*fh);g.fillStyle=c+'55';g.fillRect(W*fx+6,fy-H*fh+8,W*fw-12,3);g.fillStyle='rgba(8,14,24,.85)'}   // consolas
  const vg=g.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.max(W,H)*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.55)');g.fillStyle=vg;g.fillRect(0,0,W,H)}

/* ================= ALMACÉN ================= */
function whMove(dir,k,q){const d=ship.docked;if(!d)return;
  if(k==='sc'){const have=dir==='dep'?Math.floor(ship.scrap||0):whGet('sc'),n=q==='all'?have:Math.min(+q||0,have);if(n<=0)return;if(dir==='dep'){ship.scrap-=n;whAdd('sc',n)}else{ship.scrap=(ship.scrap||0)+n;whAdd('sc',-n)}return}
  const have=dir==='dep'?mkCargo(k):whGet(k);let n=q==='all'?have:Math.min(+q||0,have);if(dir==='ret')n=Math.min(n,Math.floor(T.cargo-ship.ore));if(n<=0)return n===0&&dir==='ret'?toast('Bodega llena'):0;
  if(dir==='dep'){ship.inv[k]-=n;if(ship.inv[k]<.001)delete ship.inv[k];ship.ore=Math.max(0,ship.ore-n);whAdd(k,n)}else{whAdd(k,-n);ship.inv[k]=(ship.inv[k]||0)+n;ship.ore+=n}}
function hubWh(){mkInit();const d=ship.docked,chip=(t,v)=>`<span class=cc>${t}<b>${v}</b></span>`;
  let val=0;for(const k in MIN)val+=(mkCargo(k)+whGet(k))*mkSellP(k,d);for(const k in MIN)val+=((QX.ig||{})[k]||0)*mkSellP('i_'+k,d);
  const row=(k,I)=>{const c=mkCargo(k),w=whGet(k);if(!c&&!w)return'';return `<div class=whr><i style="background:${I.col}"></i><b style="flex:1;min-width:90px">${I.n}</b><span class=dim>Nave ${c}</span><span>Almacén <b>${w}</b></span><span class=whb>${c?sq('Guardar 1','data-mk="wh:dep:'+k+':1"')+sq('todo','data-mk="wh:dep:'+k+':all"'):''}${w?sq('Retirar 1','data-mk="wh:ret:'+k+':1"')+sq('todo','data-mk="wh:ret:'+k+':all"'):''}</span></div>`};
  const raw=Object.keys(MIN).map(k=>row(k,mkItem(k))).join(''),ings=Object.keys(MIN).filter(k=>((QX.ig||{})[k]||0)>0).map(k=>`<div class=whr><i style="background:${MIN[k][1]}"></i><b style="flex:1">${mkItem('i_'+k).n}</b><span>Almacén <b>${QX.ig[k]}</b></span><span class=dim>≈ ${mkFmt(mkSellP('i_'+k,d))} cr/ud</span></div>`).join('');
  const sc=Math.floor(ship.scrap||0),ws=whGet('sc');
  return `<div class=sh1><b style="color:#7dc8ff;letter-spacing:.12em">ALMACÉN COMÚN</b>${sq('Cerrar [N]','data-x=1')}</div>
<div class=res>${chip('Crudo ',whTot()-ws)}${chip('Lingotes ',ingTot())}${chip('Chatarra ',ws)}${chip('Valor aprox. ',Math.floor(val)+' cr')}</div>
<div class=card2 style="margin-top:8px"><div class=dim>Es el mismo almacén en todas las bases y estaciones. Lo que compras en ECONOMÍA y los lingotes que fundes llegan aquí. Desde aquí puedes mover mineral a tu bodega (${Math.floor(ship.ore)}/${T.cargo}) y guardarlo de nuevo.</div></div>
<div class=card2><b>MINERAL CRUDO</b><div style="margin-top:6px">${raw||'<div class=dim>No tienes mineral crudo.</div>'}</div></div>
<div class=card2><b>LINGOTES (cocinados)</b><div style="margin-top:6px">${ings||'<div class=dim>Aún no tienes lingotes. Se funden en Estación Umbral (pestaña ECONOMÍA).</div>'}</div></div>
<div class=card2><b>CHATARRA</b><div class=whr style="margin-top:6px"><i style="background:#cfe8ff"></i><b style="flex:1">Chatarra</b><span class=dim>Nave ${sc}</span><span>Almacén <b>${ws}</b></span><span class=whb>${sc?sq('Guardar 1','data-mk="wh:dep:sc:1"')+sq('todo','data-mk="wh:dep:sc:all"'):''}${ws?sq('Retirar 1','data-mk="wh:ret:sc:1"')+sq('todo','data-mk="wh:ret:sc:all"'):''}</span></div><div class=dim style="margin-top:4px">La chatarra de tu nave es la que se usa para reparar.</div></div>`}
/* ================= MEJORAS ESPECIALES (se compran aquí y se equipan en las naves compatibles) =================
   Las mejoras normales por niveles se siguen comprando y aplicando desde NAVE. Aquí solo hay dos especiales:
   · Rayo láser (arma): se compra una vez (vale para todas tus naves) en Estación Vega y se equipa en cada nave
     compatible. El Explorador no es compatible.
   · Refuerzo anti-implosión (casco): se compra por nave en Base Omega (30 lingotes + 3000 cr) y se equipa.
   · Kits de refuerzo de flota: se compran en Base Omega y se equipan en la pestaña FLOTA.
   Para cambiar qué naves son compatibles, edita spuLaserOk / spuImpOk. */
const spuLaserOk=t=>t.sh!=='e',spuImpOk=t=>true;
const spuShips=()=>TYPES.map((t,i)=>({t,i})).filter(o=>o.t.own);
function upAct(a,k){try{const d=ship.docked;if(!d)return;const t=TYPES[+k];
  if(a==='wb'){if(d.n!=='Estación Vega')return toast('El láser se vende en Estación Vega');if(WOWN.laser)return;if(ship.cred<WP.laser.pr)return toast('Créditos insuficientes: '+WP.laser.pr+' cr');ship.cred-=WP.laser.pr;WOWN.laser=1;toast('Rayo láser comprado: equípalo en las naves compatibles')}
  else if(a==='we'){if(!t||!WOWN.laser)return;if(!spuLaserOk(t))return toast(t.n+' no es compatible con el láser');t.wp='laser';toast('Láser equipado en '+t.n)}
  else if(a==='wu'){if(t)t.wp='cannon'}
  else if(a==='ib'){if(!t)return;if(d.n!==OM.n)return toast('El refuerzo se vende en Base Omega');if(!spuImpOk(t))return toast(t.n+' no es compatible con el refuerzo');if(t.imp||t.imq)return;
    if(ingTot()<IMPH.l)return toast('Faltan lingotes: necesitas '+IMPH.l);if(ship.cred<IMPH.c)return toast('Créditos insuficientes: '+IMPH.c+' cr');ingSpend(IMPH.l);ship.cred-=IMPH.c;t.imq=1;toast('Refuerzo comprado para '+t.n+': equípalo')}
  else if(a==='ie'){if(!t||!t.imq||t.imp)return;t.imq=0;t.imp=1;t.hull+=100;if(t===T)ship.hull=Math.min(T.hull,ship.hull+100);QX.hu=(QX.hu|0)+1;toast('✔ '+t.n+' reforzada: +100 de resistencia y a salvo de la implosión')}
  else if(a==='kit'&&typeof impAct==='function')impAct('kit');
  saveGame()}catch(e){console.warn('[mejoras]',e)}}
function hubUpg(){const d=ship.docked,isV=d.n==='Estación Vega',isO=d.n===OM.n,ing=ingTot(),L=spuShips(),chip=(t,v)=>`<span class=cc>${t}<b>${v}</b></span>`;
  let h=`<div class=sh1><b style="color:#7dff9b;letter-spacing:.12em">MEJORAS ESPECIALES</b>${sq('Cerrar [N]','data-x=1')}</div>
<div class=res>${chip('◈ ',Math.floor(ship.cred)+' cr')}${chip('Lingotes ',ing)}</div>
<div class=card2 style="margin-top:8px"><div class=dim>Aquí se compran las mejoras especiales y se equipan en las naves compatibles. Las mejoras normales por niveles (casco, escudos, motores…) se compran y aplican desde NAVE → el componente → MEJORAR.</div></div>`;
  /* láser */
  const okL=ship.cred>=WP.laser.pr;
  h+=`<div class=card2 style="border-color:#ff9a4f"><b style="color:#ff9a4f">${WP.laser.n.toUpperCase()}</b><div class=dim style="margin:6px 0">${WP.laser.d} Se compra una vez y sirve para todas tus naves compatibles.</div>`;
  if(WOWN.laser)h+='<div style="color:#7dff9b">✔ Comprado</div>';
  else h+=kv('Precio',WP.laser.pr+' cr',okL?'':'#ff6b6b')+(isV?sq('Comprar rayo láser','data-mk="up:wb:0"'+(okL?'':' disabled'),'width:100%;margin-top:8px'):'<div class=dim style="margin-top:6px">Se vende en Estación Vega.</div>');
  h+=`<div style="border-top:1px solid #1d3550;margin:10px 0 4px"></div>`+L.map(o=>{const t=o.t,eq=t.wp==='laser',ok=spuLaserOk(t);
    return `<div class=whr><i style="background:${t.col}"></i><b style="flex:1;min-width:90px">${t.n}</b>`+(!ok?'<span style="color:#ff9a4f">No compatible</span>':eq?`<span style="color:#7dff9b">Láser equipado</span><span class=whb>${sq('Volver a pulsos','data-mk="up:wu:'+o.i+'"')}</span>`:WOWN.laser?`<span class=dim>Cañón de pulsos</span><span class=whb>${sq('Equipar láser','data-mk="up:we:'+o.i+'"')}</span>`:'<span class=dim>Cañón de pulsos</span>')+`</div>`}).join('')+`</div>`;
  /* refuerzo anti-implosión */
  const okH=ing>=IMPH.l&&ship.cred>=IMPH.c;
  h+=`<div class=card2 style="border-color:#7de3ff"><b style="color:#7de3ff">REFUERZO ANTI-IMPLOSIÓN</b><div class=dim style="margin:6px 0">Fuera del aro de Alfa la presión es altísima. Este refuerzo suma +100 de resistencia al casco y permite salir. Se compra por nave en Base Omega.</div>${kv('Coste por nave',IMPH.l+' lingotes + '+IMPH.c+' cr',okH?'':'#ff6b6b')}`+(isO?'':'<div class=dim style="margin:4px 0">Se vende en Base Omega.</div>')+
    `<div style="border-top:1px solid #1d3550;margin:10px 0 4px"></div>`+L.map(o=>{const t=o.t,ok=spuImpOk(t);
    return `<div class=whr><i style="background:${t.col}"></i><b style="flex:1;min-width:90px">${t.n}</b>`+(!ok?'<span style="color:#ff9a4f">No compatible</span>':t.imp?'<span style="color:#7dff9b">✔ Equipado</span>':t.imq?`<span style="color:#7dff9b">Comprado</span><span class=whb>${sq('Equipar','data-mk="up:ie:'+o.i+'"')}</span>`:`<span class=whb>${isO?sq('Comprar','data-mk="up:ib:'+o.i+'"'+(okH?'':' disabled')):''}</span>`)+`</div>`}).join('')+`</div>`;
  /* kits de flota */
  const okK=ing>=IMPF.l&&ship.cred>=IMPF.c;
  h+=`<div class=card2 style="border-color:#7de3ff"><b style="color:#7de3ff">REFUERZO DE FLOTA</b><div class=dim style="margin:6px 0">Kit para una nave de tu flota (+100 de resistencia y a salvo de la implosión). Se equipa en la pestaña FLOTA.</div>${kv('Kits en inventario',QX.fli|0)}${kv('Coste por kit',IMPF.l+' lingotes + '+IMPF.c+' cr',okK?'':'#ff6b6b')}`+(isO?sq('Comprar kit de flota','data-mk="up:kit:0"'+(okK?'':' disabled'),'width:100%;margin-top:8px'):'<div class=dim style="margin-top:6px">Se vende en Base Omega.</div>')+'</div>';
  return h}
/* ================= FLOTA ================= */
const flOwn=()=>wing.filter(w=>w.own&&w.hp>0),flId=w=>w.fid||(w.fid=++FLID);
function flAct(p){const w=wing.find(q=>q.fid===+p[2]);
  if(p[1]==='sel'){flSel=+p[2];return}if(p[1]==='min'){flMin=p[3];return}if(p[1]==='mode'){flMode=p[3];return}
  if(!w)return;
  if(p[1]==='go')fmStart(w,flMin,flMode);else if(p[1]==='stop')fmStop(w);
  else if(p[1]==='call'){wCall(w)}
  else if(p[1]==='base'){const b=BASES[+p[3]];if(b)sendW(w,b)}
  else if(p[1]==='kit'){if((QX.fli|0)<1)return toast('No tienes refuerzos de flota: cómpralos en MEJORAS (Base Omega)');if(w.imp)return;QX.fli--;w.imp=1;w.max+=100;w.hp=Math.min(w.max,w.hp+100);toast('✔ '+w.n+' reforzada: +100 de resistencia y a salvo de la implosión')}
  try{saveGame()}catch(e){}}
function hubFleet(){const L=flOwn(),d=ship.docked;
  const mis=L.filter(w=>w.fm&&w.st==='mine').length,near=L.filter(w=>!(w.fm&&w.st==='mine')&&w.st==='follow').length;
  let h=`<div class=sh1><b style="color:#ffb86b;letter-spacing:.12em">FLOTA · ${L.length}/4 NAVES</b>${sq('Cerrar [N]','data-x=1')}</div>`;
  if(!L.length)return h+`<div class=card2 style="margin-top:8px">Aún no tienes naves en tu flota. Repara naves averiadas con el Técnico o recluta guardias: aparecerán aquí y podrás mandarlas a minar.</div>`;
  if(!L.some(w=>flId(w)===flSel))flSel=flId(L[0]);
  const stc=w=>{const m=w.fm&&w.st==='mine';return w.hp<w.max*.4?['Dañada','#ff6b6b']:m?['En misión','#ffb86b']:w.st==='follow'?['Contigo','#7dff9b']:w.st==='base'?['En base','#7dc8ff']:['Activa','#cfe8ff']};
  h+=`<div class=res><span class=cc>En misión <b>${mis}</b></span><span class=cc>Contigo <b>${near}</b></span><span class=cc>Refuerzos <b>${QX.fli|0}</b></span><span class=cc>◈ <b>${Math.floor(ship.cred)} cr</b></span></div><div class=flw><div class=fll>`;
  h+=L.map(w=>{const t=TYPES[w.ti],f=flId(w),m=w.fm&&w.st==='mine',c=stc(w);
    return `<button class="flc${f===flSel?' on':''}" data-mk="fl:sel:${f}" style="--c:${t.col}"><div class=flh><i style="background:${t.col}"></i><b>${w.n}</b><span class=chp style="color:${c[1]};border-color:${c[1]}">${c[0]}</span></div><div class=dim>${t.n} · ${m?fmLbl(w):wLbl(w)}</div><div class=bb><b style="width:${Math.round(w.hp/w.max*100)}%;background:#7dff9b"></b></div>${m?`<div class=bb style="margin-top:3px"><b style="width:${Math.round(w.fm.cargo/w.fm.cap*100)}%;background:${MIN[w.fm.k][1]}"></b></div>`:''}</button>`}).join('')+`</div><div class=fld>`;
  const w=L.find(q=>flId(q)===flSel),t=TYPES[w.ti],f=flId(w),m=w.fm&&w.st==='mine'?w.fm:null,c=stc(w),tile=(a,b,c2)=>`<div class=tile><small>${a}</small><b${c2?' style="color:'+c2+'"':''}>${b}</b></div>`;
  /* --- ficha de la nave --- */
  h+=`<div class=card2 style="border-color:${t.col}"><div class=flh><i style="background:${t.col}"></i><b style="font-size:16px">${w.n}</b><span class=chp style="color:${c[1]};border-color:${c[1]};margin-left:auto">${c[0]}</span></div><div class=dim style="margin:2px 0 8px">${t.n} · ${m?fmLbl(w):wLbl(w)}</div>
<div class=tiles>${tile('Casco',Math.round(w.hp)+' / '+Math.round(w.max),w.hp<w.max*.4?'#ff6b6b':'')}${tile('Bodega',(t.cargo||0)+' uds')}${tile('Posición',whereIs(w))}${tile('Distancia',km(dist(w,ship)))}${tile('Anti-implosión',w.imp?'✔ instalado':'no instalado',w.imp?'#7dff9b':'#ffb347')}${tile('Motor',Math.round(w.spd)+' u/s')}</div>
<div class=dim style="margin:10px 0 4px">ÓRDENES</div><div class=acts>${sq('Llamar a mi lado','data-mk="fl:call:'+f+'"')}${!w.imp&&(QX.fli|0)>0?sq('Reforzar ('+QX.fli+' kits)','data-mk="fl:kit:'+f+'"','color:#7de3ff'):''}</div>
<div class=dim style="margin:10px 0 4px">ENVIAR A UNA BASE</div><div class=acts>${BASES.map((b,i)=>b.n==='Base Beta'?'':sq(b.n.replace('Base ','').replace('Estación ',''),'data-mk="fl:base:'+f+':'+i+'"')).join('')}</div></div>`;
  /* --- misión de minería --- */
  if(m){const pc=Math.round(m.cargo/m.cap*100);
    h+=`<div class=card2 style="border-color:#ffb86b"><b style="color:#ffb86b">MISIÓN EN CURSO</b><div style="margin:8px 0 4px"><span style="color:${MIN[m.k][1]}">●</span> ${MIN[m.k][0]} · ${FMM[m.mode][0]}</div><div class=bb><b style="width:${pc}%;background:${MIN[m.k][1]}"></b></div><div class=dim style="margin:3px 0 8px">Carga ${m.cargo} / ${m.cap}</div>
<div class=tiles>${tile('Ganado en la ruta',m.earn+' cr','#ffd166')}${tile('Viajes completados',m.cyc)}</div>${m.stop?'<div class=dim style="margin-top:8px">Terminando la ruta: descargará y se quedará en la base.</div>':sq('Terminar ruta (descarga y para)','data-mk="fl:stop:'+f+'"','width:100%;margin-top:10px')}</div>`;return h+`</div></div>`}
  const lv=fmLv(),mins=Object.keys(MIN),need=k=>MIN[k][3]||0,okK=k=>need(k)<=lv,fs=fmFieldsFor(flMin,w),fld=fs[0],spu=fmSpu(flMin,fld),cap=t.cargo||30;
  h+=`<div class=card2 style="border-color:#ffb86b"><b style="color:#ffb86b">MISIÓN DE MINERÍA</b><div class=dim style="margin-top:2px">Sale de donde esté, mina, lleva la carga a la base y te ingresa el dinero. Si la atacan y baja del 40%, vuelve a la base.</div>
<div class=stp><b>1</b> Mineral</div><div class=acts>${mins.map(k=>`<button class="chb${k===flMin?' on':''}"${okK(k)?'':' disabled'} data-mk="fl:min:${f}:${k}"><i style="background:${MIN[k][1]}"></i>${MIN[k][0]}${okK(k)?'':' 🔒'}</button>`).join('')}</div>
<div class=stp><b>2</b> Qué hacer con la carga</div><div class=acts>${Object.keys(FMM).map(k=>`<button class="chb${k===flMode?' on':''}" data-mk="fl:mode:${f}:${k}">${FMM[k][0]}</button>`).join('')}</div><div class=dim style="margin-top:4px">${FMM[flMode][1]}</div>
<div class=stp><b>3</b> Resumen</div>`+(fld?`<div class=tiles>${tile('Campo',fld.n)}${tile('Distancia',km(fmFD(fld,w)))}${tile('Ritmo',(60/spu).toFixed(1)+' uds/min')}${tile('Llenar bodega',Math.ceil(cap*spu/60)+' min')}${tile('Precio actual',mkFmt(mkMid(flMin))+' cr/ud','#ffd166')}${tile('Ingreso por bodega','≈ '+Math.floor(cap*mkMid(flMin)*(flMode==='cook'?MKIN:1)*MKSP)+' cr','#7dff9b')}</div>`:`<div style="color:#ff6b6b;margin-top:6px">No hay un campo accesible para este mineral${fs.blocked?': queda fuera del aro y necesita refuerzo anti-implosión':''}.</div>`)+
    sq('Enviar a minar '+MIN[flMin][0].toLowerCase(),'data-mk="fl:go:'+f+'"'+(!fld||!okK(flMin)?' disabled':''),'width:100%;margin-top:10px;color:#ffb86b')+`</div>`;
  return h+`</div></div>`}
