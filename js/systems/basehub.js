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
let hubTab='nave',mkSel='fe',MKV=0,MKA=0,MKH=0;
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
/* ---------- operaciones ---------- */
const mkHeld=k=>{const I=mkItem(k);return I.raw?Math.floor(ship.inv[k]||0):I.ing?Math.floor((QX.ig||{})[I.ing]||0):Math.floor(ship.scrap||0)};
function mkSell(k,q,quiet){const d=ship.docked,I=mkItem(k);if(!d||!I)return 0;const have=mkHeld(k),n=q==='all'?have:Math.min(+q||0,have);if(n<=0){if(!quiet)toast('No tienes '+I.n.toLowerCase()+' para vender');return 0}
  const o=mkO(k);let rev=0;const s=o.s;for(let i=0;i<n;i++){o.s=s+i;rev+=mkSellP(k,d)}o.s=s+n;rev=Math.floor(rev);
  if(I.raw){ship.inv[k]=(ship.inv[k]||0)-n;if(ship.inv[k]<.001)delete ship.inv[k];ship.ore=Math.max(0,(ship.ore||0)-n);qEv('del',d.n,{[k]:n})}
  else if(I.ing)QX.ig[I.ing]-=n;else ship.scrap-=n;
  ship.cred+=rev;qEv('sell',rev);if(!quiet)toast('Vendido: '+n+' × '+I.n.toLowerCase()+' → +'+rev+' cr');return rev}
function mkBuy(k,q){const d=ship.docked,I=mkItem(k);if(!d||!I)return;const o=mkO(k);let max=Math.floor(o.s-I.s0*.05);if(max<1)return toast('Sin existencias de '+I.n.toLowerCase()+' en el mercado');
  if(I.raw)max=Math.min(max,Math.floor(T.cargo-ship.ore));if(max<1)return toast('Bodega llena');
  const want=q==='max'?max:Math.min(+q||0,max);let n=0,cost=0;const s=o.s;for(let i=0;i<want;i++){o.s=s-i;const p=mkBuyP(k);if(cost+p>ship.cred)break;cost+=p;n++}
  o.s=s-n;if(n<=0)return toast('Créditos insuficientes');cost=Math.ceil(cost);ship.cred-=cost;
  if(I.raw){ship.inv[k]=(ship.inv[k]||0)+n;ship.ore+=n}else if(I.ing)QX.ig[I.ing]=(QX.ig[I.ing]||0)+n;else ship.scrap+=n;
  toast('Comprado: '+n+' × '+I.n.toLowerCase()+' por '+cost+' cr')}
function mkSellCargo(){let tot=0,n=0;for(const k in MIN){const h=mkHeld(k);if(h>0){tot+=mkSell(k,'all',1);n+=h}}if(!n)return toast('No llevas mineral en la bodega');toast('Carga vendida: '+n+' minerales → +'+tot+' cr')}
function mkSmelt(k,q){const d=ship.docked;if(!d||d.n!=='Estación Umbral')return toast('La fundición está en Estación Umbral');const have=Math.floor(ship.inv[k]||0),n=q==='all'?have:Math.min(+q||0,have);if(n<=0)return toast('No llevas ese mineral');
  ship.inv[k]-=n;if(ship.inv[k]<.001)delete ship.inv[k];ship.ore=Math.max(0,ship.ore-n);QX.ig[k]=(QX.ig[k]||0)+n;QX.ingT=(QX.ingT|0)+n;toast('🔥 '+n+' × '+MIN[k][0].toLowerCase()+' fundidos: +'+n+' lingotes en el almacén común')}
function mkAct(s){const p=String(s).split(':');try{if(p[0]==='sel')mkSel=p[1];else if(p[0]==='sell')mkSell(p[1],p[2]);else if(p[0]==='buy')mkBuy(p[1],p[2]);else if(p[0]==='cargo')mkSellCargo();else if(p[0]==='smelt')mkSmelt(p[1],p[2]);
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
function hubRender(){const sp=$('shipP'),sc=sp.scrollTop,l=sp.querySelector('.mkl'),ls=l?l.scrollTop:0;sp.innerHTML=hubTab==='econ'?hubEcon():hubBase();sp.scrollTop=sc;const l2=sp.querySelector('.mkl');if(l2)l2.scrollTop=ls}
function hubEcon(){mkInit();const d=ship.docked,umb=d&&d.n==='Estación Umbral',cargoV=Object.keys(MIN).reduce((a,k)=>a+mkHeld(k)*mkSellP(k,d),0);
  const chip=(t,v)=>`<span class=cc>${t}<b>${v}</b></span>`;
  let h=`<div class=sh1><b style="color:#ffd166;letter-spacing:.12em">ECONOMÍA · ${d.n.toUpperCase()}</b>${sq('Cerrar [N]','data-x=1')}</div>
<div class=res>${chip('◈ ',ship.cred+' cr')}${chip('Chatarra ',ship.scrap|0)}${chip('Carga ',Math.floor(ship.ore)+'/'+T.cargo)}${chip('Almacén ',ingTot()+' lingotes')}${d.mult!==1?chip('Paga ','×'+d.mult):''}</div>`;
  if(QX.mk.news)h+=`<div class=card2 style="border-color:#ffd166;margin-top:8px"><span style="color:#ffd166">📰 Mercado:</span> ${QX.mk.news.txt}</div>`;
  h+=`<div class=card2 style="margin-top:8px">${sq('Vender toda la carga'+(cargoV>=1?' (≈ '+Math.floor(cargoV)+' cr)':''),'data-mk="cargo"'+(cargoV>=1?'':' disabled'),'width:100%')}<div class=dim style="margin-top:6px">Atracar no vende nada: aquí eliges qué vender. Los lingotes se guardan en el almacén común de todas las bases.</div></div>`;
  const row=I=>{const o=mkO(I.k),tr=mkTrend(o.h),tc=tr>.5?'#7dff9b':tr<-.5?'#ff8a8a':'#9fb3c8',st=mkStock(I),hd=mkHeld(I.k),sp=I.scr?mkSellP(I.k,d):mkSellP(I.k,d);
    return `<button class="mkrow${I.k===mkSel?' on':''}" data-mk="sel:${I.k}"><i style="background:${I.col}"></i><span style="flex:1;min-width:0"><b>${I.n}</b><small style="display:block;color:${st[1]}">${st[0]}${hd?` · tienes ${hd}`:''}</small></span>${mkSpark(o.h,tc)}<span style="text-align:right;min-width:62px"><b>${mkFmt(sp)}</b><small style="display:block;color:${tc}">${tr>=0?'▲':'▼'} ${Math.abs(tr).toFixed(1)}%</small></span></button>`};
  const L=mkAll();let list='<div class=mkh>CRUDOS</div>'+L.filter(i=>i.raw).map(row).join('')+'<div class=mkh>LINGOTES (cocinados)</div>'+L.filter(i=>i.ing).map(row).join('')+'<div class=mkh>OTROS</div>'+L.filter(i=>i.scr).map(row).join('');
  const I=mkItem(mkSel)||mkItem('fe'),o=mkO(I.k),st=mkStock(I),hd=mkHeld(I.k),sP=mkSellP(I.k,d),bP=mkBuyP(I.k),lore=I.raw?MKL[I.k]:I.ing?['Mineral '+MIN[I.ing][0].toLowerCase()+' fundido y purificado en Estación Umbral. Más valioso y compacto que el crudo: no ocupa bodega, se guarda en el almacén común de todas las bases.','Refuerzos de casco (30 lingotes de cualquier tipo) y comercio.','Se obtiene fundiendo el crudo en Estación Umbral.']:MKSC;
  let dt=`<div class=card2><div style="display:flex;align-items:center;gap:8px"><i style="width:14px;height:14px;border-radius:50%;background:${I.col};display:inline-block"></i><b style="font-size:16px">${I.n}</b><span class=badge style="margin-left:auto;color:${st[1]}">${st[0]}</span></div>
<div style="margin:8px 0 4px">${mkChart(o.h,I.col)}</div><div class=dim style="font-size:11px;text-align:right">últimos ~${Math.round(MKN*12/60)} min · el precio cambia con las existencias</div>
${kv('Te pagan (aquí)',mkFmt(sP)+' cr/ud',I.k===mkSel?'#7dff9b':'')}${kv('Te cobran',mkFmt(bP)+' cr/ud','#ffd166')}${kv('Existencias del mercado',Math.round(o.s)+' (normal ≈ '+I.s0+')')}${kv('Tienes',hd+(I.raw?' en la bodega':I.ing?' en el almacén común':' de chatarra'))}
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
const hubSig=()=>hubTab+'|'+mkSel+'|'+MKV+'|'+(ship.inv?Object.keys(ship.inv).map(k=>k+Math.floor(ship.inv[k])).join():'')+'|'+Math.floor(ingTot())+'|'+(QX.mk&&QX.mk.news?QX.mk.news.t:0);
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
.mkrow i{width:10px;height:10px;border-radius:50%;flex:none}.mkrow small{font-size:10px;opacity:.9}`;document.head.appendChild(st);
  hubEl.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&b.dataset.hub)hubGo(b.dataset.hub)});return hubEl}
function hubSync(){const on=!!ship.docked&&(state==='hangar'||state==='ship');const el=hubBar();if(!on){if(el.style.display!=='none')el.style.display='none';hubSg='';return}
  const cur=state==='hangar'?'hangar':hubTab,sg=cur+'|'+ship.docked.n+'|'+Math.floor(ship.cred);if(sg===hubSg)return;hubSg=sg;el.style.display='flex';
  const t=[['hangar','⌂ HANGAR'],['nave','⚙ NAVE'],['econ','◈ ECONOMÍA'],['base','ⓘ BASE']];
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
