/* ============================================================================
   systems/items.js — Objetos genéricos + ALMACÉN nuevo (cuadrícula limpia) — script clásico (ámbito global)
   ----------------------------------------------------------------------------
   · Cualquier cosa que el jugador pueda recoger se declara con ITM.add(id,{n,kind,col,val,...}); aparece sola en
     el inventario y en el almacén (no hay lista cerrada de objetos).
   · Objetos recogidos (rocas, plantas…): se llevan en la nave (QX.bag) y se guardan en el almacén común (QX.wh).
   · Almacén: cuadrícula sin casillas visibles que crece hacia abajo, filtro por nombre y menú con clic derecho:
       Información · Guardar · Recoger en la nave · Enviar a fundir · Vender · Triturar.
   · Fundir: el mineral vuelve convertido en lingotes al almacén tras unos segundos (QX.cook, sobrevive a recargar).
   ========================================================================== */
"use strict";
const ITM=(function(){
const nrm=s=>String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const DEF={};          // objetos genéricos registrados
/* kind: 'mat' (material de planeta) · rar: 0 común … 3 muy raro · val: créditos por unidad */
function add(id,d){DEF[id]=Object.assign({id,n:id,kind:'mat',col:'#9aa5b8',ico:'rock',rar:0,val:5,desc:'',found:'—',use:'Sin uso por ahora.'},d);return DEF[id]}
add('roca',{n:'Roca',ico:'rock',col:'#8b8883',val:8,rar:0,desc:'Fragmento de roca recogido a mano en la superficie de un planeta.',found:'Superficie de planetas (rocas sueltas)',use:'De momento solo se puede vender o triturar.'});
add('planta',{n:'Planta',ico:'leaf',col:'#58b45a',val:12,rar:0,desc:'Planta recogida en la superficie de un planeta. Aún sin estudiar.',found:'Superficie de planetas (zonas de hierba)',use:'De momento solo se puede vender o triturar.'});

/* ---------- mochila de la nave (objetos recogidos fuera de la nave) ---------- */
const bag=()=>(QX.bag=QX.bag||{});
const bagGet=k=>Math.floor(bag()[k]||0);
const bagCount=()=>Object.values(bag()).reduce((a,b)=>a+(b||0),0);
function bagAdd(id,n,meta){const o=bag();o[id]=(o[id]||0)+n;if(o[id]<.0001)delete o[id];
  if(meta&&meta.nm&&id in DEF&&!DEF[id].named){}                                                  // (nombre local del planeta: solo para el aviso)
}
function ensure(id){return DEF[id]||add(id,{n:id})}

/* ---------- definición de cualquier pila (mineral, lingote, chatarra u objeto) ---------- */
function defOf(id){
  if(id==='sc')return{id,n:'Chatarra',kind:'scrap',col:'#cfe8ff',ico:'bolt',rar:0,val:Math.max(1,Math.round(mkItem('sc').p0||2)),desc:'Restos metálicos. La chatarra de tu nave se usa para reparar.',found:'Piezas de naves destruidas y ventas',use:'Reparaciones de la nave.'};
  if(typeof MIN==='object'&&MIN[id]){const m=MIN[id],L=(typeof MKL==='object'&&MKL[id])||[],p=Math.round(C.sell*m[2]);
    return{id,n:m[0],kind:'ore',col:m[1],ico:'gem',rar:m[3]>=3?(m[2]>=10?3:2):m[2]>=4?2:m[2]>=1.5?1:0,val:p,desc:L[0]||'Mineral crudo.',found:(typeof mkFound==='function'?mkFound(mkItem(id)):'—'),use:L[1]||'Se vende o se funde en lingotes.',lv:m[3]||0,ore:1}}
  if(id[0]==='i'&&id[1]==='_'&&typeof MIN==='object'&&MIN[id.slice(2)]){const k=id.slice(2),m=MIN[k];
    return{id,n:'Lingote de '+m[0].toLowerCase(),kind:'ing',col:m[1],ico:'bar',rar:m[3]>=3?3:m[2]>=4?2:m[2]>=1.5?1:0,val:Math.round(C.sell*m[2]*1.6),desc:'Mineral ya refinado en barra. Es lo que se usa para fabricar y mejorar.',found:'Se obtiene fundiendo el mineral crudo',use:'Materiales para mejoras y construcciones.'}}
  return ensure(id)}
const RAR=['Común','Poco común','Raro','Muy raro'],RCOL=['#9aa5b8','#7dff9b','#59c8ff','#ff7ad9'];

/* ---------- iconos (SVG) ---------- */
function icon(d,s){s=s||44;const c=d.col,sh=`<defs><linearGradient id="g${d.id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></linearGradient></defs>`;
  let b='';
  if(d.ico==='gem')b=`<polygon points="22,5 37,15 33,36 22,40 11,36 7,15" fill="url(#g${d.id})" stroke="${c}" stroke-width="1.4"/><polyline points="7,15 22,22 37,15 22,40 7,15 22,22" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="1"/>`;
  else if(d.ico==='bar')b=`<polygon points="8,16 36,16 41,32 3,32" fill="url(#g${d.id})" stroke="${c}" stroke-width="1.4"/><polygon points="8,16 36,16 33,11 11,11" fill="rgba(255,255,255,.4)"/>`;
  else if(d.ico==='bolt')b=`<circle cx="22" cy="22" r="15" fill="none" stroke="${c}" stroke-width="3"/><polygon points="24,9 14,24 21,24 19,35 31,19 24,19" fill="${c}"/>`;
  else if(d.ico==='leaf')b=`<path d="M22 38 C22 26 14 22 8 14 C20 12 29 18 22 38 Z" fill="#3f9a45"/><path d="M22 38 C22 24 30 20 37 12 C26 10 17 18 22 38 Z" fill="#58b45a"/><circle cx="22" cy="12" r="5" fill="#ffd75e"/><circle cx="22" cy="12" r="2" fill="#fff6c8"/>`;
  else b=`<polygon points="7,28 13,12 29,10 39,23 31,36 14,36" fill="url(#g${d.id})" stroke="#5e5b57" stroke-width="1.4"/><polygon points="13,12 29,10 25,21 12,23" fill="rgba(255,255,255,.28)"/>`;
  return `<svg width="${s}" height="${s}" viewBox="0 0 44 44">${sh}${b}</svg>`}

/* ---------- pilas del almacén ---------- */
function stacks(){
  const L=[],seen=new Set(),push=(id,wh,sh)=>{if(seen.has(id)||(wh<=0&&sh<=0))return;seen.add(id);L.push({id,wh,sh,d:defOf(id)})};
  const w=QX.wh||{};
  if(typeof MIN==='object')for(const k in MIN)push(k,Math.floor(w[k]||0),Math.floor(ship.inv&&ship.inv[k]||0));
  for(const k in(QX.ig||{}))if(MIN[k])push('i_'+k,Math.floor(QX.ig[k]||0),0);
  push('sc',Math.floor(w.sc||0),Math.floor(ship.scrap||0));
  const ks=new Set([...Object.keys(w),...Object.keys(bag())]);
  for(const k of ks)if(k!=='sc'&&!(typeof MIN==='object'&&MIN[k]))push(k,Math.floor(w[k]||0),bagGet(k));
  return L}
const whAddQ=(k,n)=>{const o=(QX.wh=QX.wh||{});o[k]=(o[k]||0)+n;if(o[k]<.0001)delete o[k]};
const price=(id,d)=>{try{if(DEF[id])return DEF[id].val;if(id[0]==='i'&&id[1]==='_'||id==='sc'||(typeof MIN==='object'&&MIN[id]))return mkSellP(id,d)}catch(e){}return defOf(id).val};

/* ---------- acciones ---------- */
let qty=1,fil='';
const take=(n,have)=>Math.max(0,Math.min(have,n==='all'?have:+n||0));
function deposit(id,n){                            // nave → almacén
  const L=stacks().find(s=>s.id===id);if(!L||L.sh<=0)return;const q=take(n,L.sh);if(q<=0)return;
  if(id==='sc'){ship.scrap-=q;whAddQ('sc',q)}
  else if(typeof MIN==='object'&&MIN[id]){ship.inv[id]-=q;if(ship.inv[id]<.001)delete ship.inv[id];ship.ore=Math.max(0,ship.ore-q);whAddQ(id,q)}
  else{bag()[id]-=q;if(bag()[id]<.001)delete bag()[id];whAddQ(id,q)}
  toast('Guardado en el almacén: '+q+' × '+L.d.n.toLowerCase())}
function depositAll(){let c=0;for(const s of stacks())if(s.sh>0&&s.id!=='sc'&&!(typeof MIN==='object'&&MIN[s.id])){const q=s.sh;deposit(s.id,q);c+=q}
  if(!c)toast('No llevas objetos recogidos para guardar')}
function retrieve(id,n){                           // almacén → nave
  const L=stacks().find(s=>s.id===id);if(!L||L.wh<=0)return;let q=take(n,L.wh);
  if(id[0]==='i'&&id[1]==='_')return toast('Los lingotes se quedan en el almacén (se usan para fabricar)');
  if(typeof MIN==='object'&&MIN[id]){q=Math.min(q,Math.floor(T.cargo-ship.ore));if(q<=0)return toast('Bodega llena');whAddQ(id,-q);ship.inv[id]=(ship.inv[id]||0)+q;ship.ore+=q}
  else if(id==='sc'){whAddQ('sc',-q);ship.scrap=(ship.scrap||0)+q}
  else{whAddQ(id,-q);bag()[id]=(bag()[id]||0)+q}
  toast('Recogido en la nave: '+q+' × '+L.d.n.toLowerCase())}
const COOK_T=4000;
function cook(id,n){
  const L=stacks().find(s=>s.id===id);if(!L||L.wh<=0||!(typeof MIN==='object'&&MIN[id]))return;const q=take(n,L.wh);if(q<=0)return;
  whAddQ(id,-q);(QX.cook=QX.cook||[]).push({k:id,n:q,end:Date.now()+COOK_T+Math.min(1500,q*40)});
  toast('🔥 '+q+' × '+L.d.n.toLowerCase()+' enviados a fundir…')}
function cookTick(){const c=QX.cook;if(!c||!c.length)return;const now=Date.now();let any=false;
  for(let i=c.length-1;i>=0;i--)if(c[i].end<=now){const e=c.splice(i,1)[0];QX.ig=QX.ig||{};QX.ig[e.k]=(QX.ig[e.k]||0)+e.n;QX.ingT=(QX.ingT|0)+e.n;any=true;
    try{toast('✔ '+e.n+' × lingote de '+MIN[e.k][0].toLowerCase()+' listo en el almacén')}catch(x){}}
  if(any){try{saveGame()}catch(e){}hubSg=''}else if(typeof hubTab!=='undefined'&&hubTab==='wh'&&state==='ship')cookStrip()}
function sell(id,n,crush){
  const L=stacks().find(s=>s.id===id);if(!L||L.wh<=0)return;const q=take(n,L.wh);if(q<=0)return;const d=ship.docked;let rev=0;
  if(DEF[id])rev=Math.floor(DEF[id].val*q);
  else if(id[0]==='i'&&id[1]==='_'){const k=id.slice(2);if(!crush){QX.ig[k]-=q;if(QX.ig[k]<=0)delete QX.ig[k];rev=mkSellN(id,q,d)}else{QX.ig[k]-=q;if(QX.ig[k]<=0)delete QX.ig[k];rev=Math.floor(price(id,d)*q)}}
  else{whAddQ(id,-q);rev=crush?Math.floor(price(id,d)*q):mkSellN(id,q,d)}
  if(DEF[id])whAddQ(id,-q);
  if(crush){rev=Math.floor(rev*.7);ship.cred+=rev;toast('🔨 Triturado: '+q+' × '+L.d.n.toLowerCase()+' → +'+rev+' cr')}
  else{const sc=Math.max(1,Math.ceil(rev*.06));ship.cred+=rev;ship.scrap=(ship.scrap||0)+sc;toast('Vendido: '+q+' × '+L.d.n.toLowerCase()+' → +'+rev+' cr y +'+sc+' chatarra')}
  try{qEv('sell',rev)}catch(e){}try{saveGame()}catch(e){}}

/* ---------- menú de clic derecho e información ---------- */
function info(id){
  const s=stacks().find(x=>x.id===id),d=s?s.d:defOf(id),unit=price(id,ship.docked),kind={ore:'Mineral crudo',ing:'Lingote',scrap:'Chatarra',mat:'Material de planeta'}[d.kind]||'Objeto';
  let el=document.getElementById('itInfo');if(!el){el=document.createElement('div');el.id='itInfo';el.onclick=e=>{if(e.target.closest('[data-c]')||e.target===el)el.remove()};document.body.appendChild(el)}
  el.style.cssText='position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55)';
  el.innerHTML=`<div style="background:rgba(5,12,22,.98);border:1px solid var(--bd);border-top:3px solid ${d.col};padding:16px 18px;width:min(380px,90%);max-height:86%;overflow:auto;box-sizing:border-box">
  <div style="display:flex;gap:14px;align-items:center">${icon(d,72)}<div style="flex:1"><div style="font:700 18px ui-monospace,Menlo,monospace;letter-spacing:.06em;color:#cfe8ff">${esc(d.n)}</div><div style="opacity:.7;font-size:12px;letter-spacing:.12em;text-transform:uppercase">${kind}</div>
  <div style="margin-top:4px"><b style="color:${RCOL[d.rar||0]}">${RAR[d.rar||0]}</b>${price(id,ship.docked)>=100?' · <b style="color:#ffd166">Valioso</b>':''}</div></div></div>
  <p style="margin:12px 0 8px;opacity:.9;line-height:1.45">${esc(d.desc)}</p>
  <div class="kv"><span style="opacity:.7">Valor por unidad</span><b style="font-weight:400">${Math.round(unit)} cr</b></div>
  <div class="kv"><span style="opacity:.7">Dónde se encuentra</span><b style="font-weight:400;text-align:right">${esc(d.found)}</b></div>
  <div class="kv"><span style="opacity:.7">Para qué sirve</span><b style="font-weight:400;text-align:right">${esc(d.use)}</b></div>
  ${d.lv?`<div class="kv"><span style="opacity:.7">Minería necesaria</span><b style="font-weight:400">Nivel ${d.lv}</b></div>`:''}
  <div class="kv"><span style="opacity:.7">Cantidad</span><b style="font-weight:400">${s?s.wh+' en el almacén'+(s.sh?' · '+s.sh+' en la nave':''):'—'}</b></div>
  <button class="sq" data-c="1" style="position:static;margin-top:12px;width:100%">Cerrar</button></div>`}
function menu(px,py,id){
  const s=stacks().find(x=>x.id===id);if(!s)return;const q=qty==='all'?'todo':qty,it=[];
  it.push(['Información',()=>info(id),'']);
  if(s.sh>0)it.push(['Guardar en el almacén ('+q+')',()=>{deposit(id,qty);rr()}]);
  if(s.wh>0&&!(id[0]==='i'&&id[1]==='_'))it.push(['Recoger en la nave ('+q+')',()=>{retrieve(id,qty);rr()}]);
  if(s.wh>0&&s.d.ore)it.push(['🔥 Enviar a fundir ('+q+')',()=>{cook(id,qty);rr()}]);
  if(s.wh>0){it.push(['Vender ('+q+')',()=>{sell(id,qty,false);rr()}]);it.push(['🔨 Triturar ('+q+')',()=>{sell(id,qty,true);rr()}])}
  if(typeof ctxMenu==='function')ctxMenu(px,py,it)}
const rr=()=>{hubSg='';try{if(state==='ship')hubRender()}catch(e){}};

/* ---------- ALMACÉN (sustituye a la pestaña anterior) ---------- */
function gridHtml(){
  const f=nrm(fil),L=stacks().filter(s=>!f||nrm(s.d.n).includes(f)).sort((a,b)=>(a.d.ore?0:a.d.kind==='ing'?1:2)-(b.d.ore?0:b.d.kind==='ing'?1:2)||a.d.n.localeCompare(b.d.n));
  if(!L.length)return `<div class="dim" style="padding:18px 4px">${fil?'Ningún objeto coincide con la búsqueda.':'El almacén está vacío. Guarda aquí mineral, lingotes, chatarra y todo lo que recojas.'}</div>`;
  return L.map(s=>`<div class="wit" data-wk="${esc(s.id)}" title="${esc(s.d.n)}">${icon(s.d,46)}<span class="wn">${esc(s.d.n)}</span>${s.wh>0?`<b class="wc">${s.wh}</b>`:''}${s.sh>0?`<i class="ws">nave ${s.sh}</i>`:''}</div>`).join('')}
function cookStrip(){const el=document.getElementById('whCook');if(!el)return;const c=QX.cook||[],now=Date.now();
  el.innerHTML=c.length?c.map(e=>`🔥 Fundiendo ${e.n} × ${esc(MIN[e.k][0].toLowerCase())}… ${Math.max(0,Math.ceil((e.end-now)/1000))} s`).join(' · '):''}
function hubWhNew(){
  mkInit();const d=ship.docked,chip=(t,v)=>`<span class=cc>${t}<b>${v}</b></span>`,L=stacks();
  let val=0;for(const s of L)if(s.wh>0)val+=price(s.id,d)*s.wh;
  const bg=bagCount(),qb=(v,t)=>`<button class="sq${qty===v?' go':''}" data-wq="${v}" style="position:static;padding:7px 12px">${t}</button>`;
  return `<style>.whg{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:4px 6px;margin-top:10px}.wit{position:relative;display:flex;flex-direction:column;align-items:center;padding:8px 4px 6px;border-radius:6px;cursor:default;user-select:none}.wit:hover{background:rgba(120,190,255,.10)}.wit .wn{font-size:11px;opacity:.85;text-align:center;line-height:1.2;margin-top:3px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wit .wc{position:absolute;right:6px;top:4px;font-size:12px;background:rgba(5,12,22,.85);padding:0 5px;border-radius:8px;color:#ffe9a8}.wit .ws{position:absolute;left:5px;top:5px;font-size:10px;font-style:normal;color:#7dff9b}#whQ{flex:1;min-width:140px;background:rgba(5,12,22,.8);border:1px solid var(--bd);color:#cfe8ff;padding:9px 10px;font:inherit}</style>
<div class=sh1><b style="color:#7dc8ff;letter-spacing:.12em">ALMACÉN</b>${sq('Cerrar [N]','data-x=1')}</div>
<div class=res>${chip('Pilas ',L.filter(s=>s.wh>0).length)}${chip('Valor aprox. ',Math.floor(val)+' cr')}${chip('Bodega ',Math.floor(ship.ore)+'/'+T.cargo)}</div>
<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:8px"><input id="whQ" placeholder="Buscar por nombre…" value="${esc(fil)}" autocomplete="off"><span class="dim">Cantidad:</span>${qb(1,'1')}${qb(10,'10')}${qb('all','Todo')}</div>
${bg?`<div class="card2" style="margin-top:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span>🎒 En tu nave: <b>${bg}</b> objetos recogidos</span><button class="sq go" data-wsa="1" style="position:static;padding:7px 12px">Guardar todo</button></div>`:''}
<div id="whCook" class="dim" style="margin-top:6px;min-height:16px;color:#ffb36b"></div>
<div id="whGrid" class="whg">${gridHtml()}</div>
<div class="dim" style="margin-top:12px">Clic derecho sobre un objeto: información, guardar, recoger en la nave, fundir, vender o triturar. Triturar da solo créditos; vender da créditos y chatarra.</div>`}

/* ---------- eventos (delegados) ---------- */
function bind(){
  const sp=document.getElementById('shipP');if(!sp||sp._itm)return;sp._itm=1;
  sp.addEventListener('contextmenu',e=>{const t=e.target.closest('[data-wk]');if(!t)return;e.preventDefault();menu(e.clientX,e.clientY,t.dataset.wk)},true);
  sp.addEventListener('click',e=>{
    const w=e.target.closest('[data-wq]');if(w){qty=w.dataset.wq==='all'?'all':+w.dataset.wq;e.stopImmediatePropagation();rr();return}
    if(e.target.closest('[data-wsa]')){e.stopImmediatePropagation();depositAll();rr();return}
    const t=e.target.closest('[data-wk]');if(t){e.stopImmediatePropagation();menu(e.clientX,e.clientY,t.dataset.wk)}},true);       // un toque (móvil) también abre el menú
  sp.addEventListener('input',e=>{if(e.target.id==='whQ'){fil=e.target.value;const g=document.getElementById('whGrid');if(g)g.innerHTML=gridHtml()}},true)}

/* ---------- inventario [I] ---------- */
function invHtml(){const b=bag(),ks=Object.keys(b).filter(k=>b[k]>0);if(!ks.length)return '';
  return `<div style="margin-top:10px;opacity:.7;font-size:12px">OBJETOS RECOGIDOS (se guardan en el almacén de cualquier base)</div>`+ks.map(k=>{const d=defOf(k);return `<div style="display:flex;align-items:center;gap:8px;margin:6px 0">${icon(d,22)}<span style="flex:1">${esc(d.n)}</span><b>${Math.floor(b[k])}</b></div>`}).join('')}

setInterval(cookTick,500);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
setInterval(bind,2000);
return{add,def:DEF,defOf,bagAdd,bagGet,bagCount,invHtml,hubWh:hubWhNew,info,stacks,deposit,retrieve,cook,sell,menu}
})();

hubWh=ITM.hubWh;   // la pestaña ALMACÉN usa la cuadrícula nueva
