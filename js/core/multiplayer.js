/* ============================================================================
   core/multiplayer.js — Multijugador (Supabase Realtime): salas, partidas, invitados, ayuda entre jugadores e interfaz.
   (Trozo de la antigua pieza única de index.html. Se carga como script clásico en orden:
   comparte el ámbito global con el resto de js/. NO cambies el orden de carga en index.html.)
   ========================================================================== */
"use strict";
/* ===== MULTIJUGADOR (Supabase Realtime) · varias partidas =====
   · Cada partida multijugador es un mundo propio con código de sala FIJO. El anfitrión la guarda en su dispositivo
     (sl_mp_games = lista, sl_mp_prof_<id> = fichas de todos los que han jugado, starluge_mph_<id> = su nave).
   · El invitado guarda en su lista (sl_mp_joined) la partida con el nombre del anfitrión y sus amigos; su ficha vive en el anfitrión.
   · Se ven y chocan entre sí; enemigos, asteroides y eventos siguen siendo locales (siguiente paso).
   · Supabase NO guarda nada: solo reenvía mensajes en vivo. El mundo y el progreso de todos viven en el dispositivo del anfitrión.
   · Sin tablas: solo canales Broadcast + Presence de Supabase Realtime. Pega tu clave pública en SUPA_KEY. */
var SUPA_URL='https://xjnldzitsueltueqowho.supabase.co',SUPA_KEY='sb_publishable_-byS6FlxLmBlZr5hVzk9Ww_96OlhYuv';
var mpOpen=0,mpLastPush=0;
const mpEsc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mpName=()=>{try{return localStorage.getItem('sl_mp_name')||''}catch(e){return ''}};
const mpClean=s=>String(s||'').replace(/[^\p{L}\p{N} _\-]/gu,'').trim().slice(0,16);
function mpSetName(s){s=mpClean(s);try{localStorage.setItem('sl_mp_name',s)}catch(e){}return s}
function mpId(){let i=null;try{i=sessionStorage.getItem('sl_mpid')}catch(e){}if(!i){i=Math.random().toString(36).slice(2,10);try{sessionStorage.setItem('sl_mpid',i)}catch(e){}}return i}
function mpGenCode(){const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let c='';for(let i=0;i<6;i++)c+=a[Math.floor(Math.random()*a.length)];return c}
const mpDt=t=>new Date(t||Date.now()).toLocaleString('es-ES',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
async function mpZip(str){try{if(!window.CompressionStream)return 'r'+str;const cs=new CompressionStream('gzip'),w=cs.writable.getWriter();w.write(new TextEncoder().encode(str));w.close();const buf=new Uint8Array(await new Response(cs.readable).arrayBuffer());let s='';for(let i=0;i<buf.length;i+=8192)s+=String.fromCharCode.apply(null,buf.subarray(i,i+8192));return 'z'+btoa(s)}catch(e){return 'r'+str}}
async function mpUnzip(z){if(!z)return null;if(z[0]==='r')return z.slice(1);const bin=atob(z.slice(1)),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);const ds=new DecompressionStream('gzip'),w=ds.writable.getWriter();w.write(u);w.close();return await new Response(ds.readable).text()}
/* ---- almacenamiento de partidas ---- */
const mpJ=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}};
const mpW=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return 1}catch(e){toast('Almacenamiento lleno: no se pudo guardar la partida');return 0}};
const mpGames=()=>mpJ('sl_mp_games',{}),mpJoined=()=>mpJ('sl_mp_joined',{});
const mpProf=n=>mpJ('sl_mp_prof_'+MPG.gid,{})[n.toLowerCase()]||null;
function mpProfSet(n,z){const k='sl_mp_prof_'+MPG.gid,o=mpJ(k,{}),lc=n.toLowerCase(),isNew=!o[lc];if(z==null&&!isNew)return;o[lc]={n,z:z!=null?z:null,t:Date.now()};mpW(k,o);
 if(isNew){const G=mpGames(),g=G[MPG.gid];if(g){g.names=Object.values(o).map(q=>q.n);mpW('sl_mp_games',G)}}}
function mpTouch(){if(!MPG)return;const now=Date.now();if(now-(mpTouch.l||0)<30000)return;mpTouch.l=now;const h=MPG.role==='host',O=h?mpGames():mpJoined();if(O[MPG.gid]){O[MPG.gid].t=now;mpW(h?'sl_mp_games':'sl_mp_joined',O)}}
/* ---- conexión ---- */
function mpLoadLib(){return new Promise((ok,ko)=>{if(window.supabase)return ok();const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/dist/umd/supabase.min.js';s.onload=ok;s.onerror=()=>ko(new Error('No se pudo cargar la librería de Supabase'));document.head.appendChild(s)})}
async function mpConnect(code){if(!SUPA_KEY)throw new Error('Falta la clave de Supabase: pégala en SUPA_KEY (código del multijugador)');await mpLoadLib();
 if(!MP.sb)MP.sb=window.supabase.createClient(SUPA_URL,SUPA_KEY,{realtime:{params:{eventsPerSecond:20}}});
 const ch=MP.sb.channel('starluge-'+code,{config:{broadcast:{self:false,ack:false},presence:{key:MP.id}}});MP.ch=ch;MP.code=code;
 ch.on('presence',{event:'sync'},mpSync).on('broadcast',{event:'join'},m=>mpOnJoin(m.payload)).on('broadcast',{event:'welcome'},m=>mpOnWelcome(m.payload)).on('broadcast',{event:'st'},m=>mpOnSt(m.payload)).on('broadcast',{event:'sv'},m=>mpOnSv(m.payload)).on('broadcast',{event:'close'},()=>mpOnClose()).on('broadcast',{event:'rs'},()=>{if(MP.role==='host')MPS.reset()}).on('broadcast',{event:'kr'},m=>mpOnKr(m.payload)).on('broadcast',{event:'cx'},m=>mpOnCx(m.payload)).on('broadcast',{event:'af'},m=>mpOnAf(m.payload)).on('broadcast',{event:'dr'},m=>mpOnDr(m.payload)).on('broadcast',{event:'bh'},m=>mpOnBh(m.payload)).on('broadcast',{event:'tt'},m=>{const q=m.payload;if(q&&typeof q.m==='string'&&(!q.to||q.to===MP.id))toast(q.m.slice(0,100))});
 await new Promise((ok,ko)=>{const t=setTimeout(()=>ko(new Error('Sin conexión con el servidor')),8000);ch.subscribe(s=>{if(s==='SUBSCRIBED'){clearTimeout(t);ok()}else if(s==='CHANNEL_ERROR'||s==='TIMED_OUT'){clearTimeout(t);ko(new Error('Error de conexión con Supabase'))}})})}
/* modo creativo de sala: todo infinito mientras esté activo; no se guarda y al desactivarlo se restaura lo tuyo */
function mpCreApply(){if(MP.cre&&!MPCS){MPCS={cred:ship.cred,scrap:ship.scrap,inv:{...ship.inv},cm:{...(ship.cm||{})},ore:ship.ore,card:QX.card,ie:CFG.ie,iv:CFG.inv,ns:noSave};CFG.ie=1;CFG.inv=1;noSave=1}
 else if(!MP.cre&&MPCS){const o=MPCS;MPCS=null;ship.cred=o.cred;ship.scrap=o.scrap;ship.inv=o.inv;ship.cm=o.cm;ship.ore=o.ore;QX.card=o.card;CFG.ie=o.ie;CFG.inv=o.iv;noSave=o.ns}}
function mpBc(ev,payload){try{const p=MP.ch.send({type:'broadcast',event:ev,payload});if(p&&p.catch)p.catch(()=>{})}catch(e){}}
function mpReset(){const ch=MP.ch,sb=MP.sb;clearInterval(MP.tm);clearTimeout(MP.jt);clearTimeout(MP.lt);MP.lt=0;MP.tm=null;MP.role=null;MP.pvp=0;if(MP.cre){MP.cre=0;mpCreApply()}MP.peers={};MP.pend={};MP.ch=null;MP.joined=0;MP.hostGone=0;MP.big=0;for(const k in MPR)delete MPR[k];if(ch&&sb)setTimeout(()=>{try{sb.removeChannel(ch)}catch(e){}},350)}
function mpStart(){if(MP.tm)return;MP.tm=setInterval(mpSend,110)}
function mpSync(){if(!MP.ch)return;const st=MP.ch.presenceState(),p={};for(const k in st){const e=st[k][0];if(e)p[k]={n:e.n,h:e.h,id:k}}MP.peers=p;for(const k in MPR)if(!p[k])delete MPR[k];
 if(MP.role==='guest'&&MP.joined&&!MP.hostGone){if(Object.values(p).some(q=>q.h)){if(MP.lt){clearTimeout(MP.lt);MP.lt=0}}else if(!MP.lt){MP.lts=performance.now();MP.lt=setTimeout(()=>{MP.lt=0;if(MP.role==='guest'&&!Object.values(MP.peers).some(q=>q.h))mpOnClose()},30000)}}mpRenderList()}
/* ---- anfitrión: abrir la sala de la partida y atender peticiones ---- */
async function mpOpenRoom(auto){if(MP.busy||MP.role||!MPG||MPG.role!=='host')return;MP.busy=1;MP.id=MPG.id||mpId();MP.name=MPG.name||mpName();MP.role='host';mpMsg('Abriendo sala…');
 try{await mpConnect(MPG.code);await MP.ch.track({n:MP.name,h:1,id:MP.id});mpStart();mpMsg('');toast('Sala abierta · código '+MP.code)}catch(e){mpReset();mpMsg(e.message||'Error');if(auto)toast(e.message||'No se pudo abrir la sala')}MP.busy=0;if(mpOpen)mpRender()}
function mpOnJoin(p){if(MP.role!=='host'||!MPG||!p||!p.id||p.id===MP.id)return;const n=mpClean(p.n),rep=o=>mpBc('welcome',Object.assign({to:p.id},o)),now=Date.now();
 for(const k in MP.pend)if(now-MP.pend[k]>15000||MP.peers[k])delete MP.pend[k];
 if(!n)return rep({ok:0,why:'Nombre no válido'});
 if(Object.values(MP.peers).some(q=>q.id!==p.id&&String(q.n).toLowerCase()===n.toLowerCase()))return rep({ok:0,why:'Ese nombre ya está en uso en la sala'});
 const cnt=Object.keys(MP.peers).filter(k=>k!==p.id).length+Object.keys(MP.pend).filter(k=>k!==p.id&&!MP.peers[k]).length;
 if(cnt>=4)return rep({ok:0,why:'Sala llena (4/4)'});
 if(!MP.peers[p.id])MP.pend[p.id]=now;const pr=mpProf(n);mpProfSet(n,null);
 const names=Object.values(mpJ('sl_mp_prof_'+MPG.gid,{})).map(q=>q.n).filter(x=>x.toLowerCase()!==n.toLowerCase());
 rep({ok:1,seed:SEED,lay:LEG?1:2,z:pr?pr.z:null,gid:MPG.gid,hn:MP.name,names});MPS.reset();mpCxAll()}
function mpOnSv(p){if(MP.role!=='host'||!MPG||!p||typeof p.z!=='string'||p.z.length>260000)return;const q=MP.peers[p.id];if(q&&q.n===p.n&&!q.h)mpProfSet(p.n,p.z)}
function mpCloseRoom(){if(MP.role==='host')mpBc('close',{});mpReset();mpRender();toast('Sala cerrada')}
/* ---- crear / continuar / borrar partidas ---- */
function mpNew(copy){if(MP.busy||MP.role||MPG)return;const n=mpSetName($('mpName').value);if(!n)return mpMsg('Escribe un nombre para entrar');if(!SUPA_KEY)return mpMsg('Falta la clave de Supabase: pégala en SUPA_KEY');
 let seed,lay=2,save=null;
 if(copy){if(state==='pause')saveGame();const d=mpJ('starluge_save_v2',null);if(!d||d.v!==1||!Array.isArray(d.T))return mpMsg('No tienes una partida en solitario guardada');save=d;seed=d.seed|0;lay=d.lay===2?2:1}
 else seed=(Math.random()*2147483646|0)+1;
 const gid=Math.random().toString(36).slice(2,10),code=mpGenCode(),G=mpGames();G[gid]={gid,code,seed,lay,c:Date.now(),t:Date.now(),hn:n,names:[]};if(!mpW('sl_mp_games',G))return;
 try{sessionStorage.setItem('sl_mpg',JSON.stringify({role:'host',gid,code,name:n,id:mpId(),seed,lay,save,used:0}))}catch(e){return mpMsg('No se pudo preparar la partida')}
 mpMsg('Creando partida…');location.reload()}
function mpContinue(gid,r){if(MP.busy||MP.role||MPG)return;const n=mpSetName($('mpName').value);if(!n)return mpMsg('Escribe un nombre para entrar');
 if(r==='g'){const e=mpJoined()[gid];if(e)mpJoin(e.code);return}
 const g=mpGames()[gid];if(!g)return;if(!SUPA_KEY)return mpMsg('Falta la clave de Supabase: pégala en SUPA_KEY');
 try{if(state==='pause')saveGame();sessionStorage.setItem('sl_mpg',JSON.stringify({role:'host',gid,code:g.code,name:n,id:mpId(),seed:g.seed,lay:g.lay,save:null,used:0}))}catch(e){return mpMsg('No se pudo preparar la partida')}
 mpMsg('Cargando partida…');location.reload()}
function mpDel(gid,r){if(MPG||MP.role)return;if(r==='h'){if(!confirm('¿Borrar esta partida y los datos de todos los jugadores que han entrado en ella?'))return;const G=mpGames();delete G[gid];mpW('sl_mp_games',G);for(const k of['sl_mp_prof_'+gid,'starluge_mph_'+gid])try{localStorage.removeItem(k)}catch(e){}}
 else{if(!confirm('¿Quitar esta partida de tu lista? Tu ficha seguirá guardada en el dispositivo del anfitrión.'))return;const J=mpJoined();delete J[gid];mpW('sl_mp_joined',J);try{localStorage.removeItem('starluge_mpg_'+gid)}catch(e){}}mpRender()}
/* ---- invitado ---- */
async function mpJoin(code0){if(MP.busy||MP.role||MPG)return;const n=mpSetName($('mpName').value),code=String(code0||($('mpCode')&&$('mpCode').value)||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 if(!n)return mpMsg('Escribe un nombre para entrar');if(code.length!==6)return mpMsg('El código tiene 6 caracteres');
 MP.busy=1;mpMsg('Conectando…');MP.id=mpId();MP.name=n;MP.role='guest';MP.joined=0;
 try{await mpConnect(code);await new Promise(r=>setTimeout(r,900));mpSync();if(!Object.values(MP.peers).some(q=>q.h))throw new Error('El anfitrión no está conectado con ese código');
  mpMsg('Pidiendo entrar…');mpBc('join',{id:MP.id,n});MP.jt=setTimeout(()=>{if(!MP.joined)mpFail('El anfitrión no responde')},7000)}catch(e){mpFail(e.message||'Error')}MP.busy=0}
function mpFail(m){mpReset();mpMsg(m);mpRender()}
async function mpOnWelcome(p){if(!p||p.to!==MP.id||MP.role!=='guest'||MP.joined)return;clearTimeout(MP.jt);if(!p.ok)return mpFail(p.why||'No se puede entrar');
 MP.joined=1;const J=mpJoined(),e=J[p.gid]||{gid:p.gid,c:Date.now()};Object.assign(e,{code:MP.code,hn:p.hn,names:p.names||[],seed:p.seed,lay:p.lay,t:Date.now()});J[p.gid]=e;mpW('sl_mp_joined',J);
 if(MPG){mpMsg('');toast('Conectado a la sala de '+p.hn);mpRender();mpCxAll();return}
 let save=null;if(p.z){try{save=JSON.parse(await mpUnzip(p.z))}catch(e2){}}
 try{saveGame();sessionStorage.setItem('sl_mpg',JSON.stringify({role:'guest',gid:p.gid,code:MP.code,name:MP.name,id:MP.id,seed:p.seed,lay:p.lay,save,used:0}))}catch(e3){return mpFail('No se pudo preparar la partida')}
 mpMsg('Entrando en el mundo de '+p.hn+'…');location.reload()}
async function mpResume(){if(MPG.role==='host')return mpOpenRoom(true);MP.id=MPG.id;MP.name=MPG.name;MP.role='guest';MP.joined=0;MP.hostGone=0;
 try{await mpConnect(MPG.code);await MP.ch.track({n:MP.name,h:0,id:MP.id});mpStart();await new Promise(r=>setTimeout(r,600));mpBc('join',{id:MP.id,n:MP.name});
  MP.jt=setTimeout(()=>{if(!MP.joined){MP.hostGone=1;toast('El anfitrión no está en la sala: sigues en tu copia local');mpRender()}},7000)}catch(e){MP.hostGone=1;toast(e.message||'Sin conexión con la sala')}}
function mpOnClose(){if(MP.role!=='guest'||MP.hostGone)return;MP.hostGone=1;for(const k in MPR)delete MPR[k];try{saveGame()}catch(e){}try{alert('El anfitrión ha cerrado la sala. Tu progreso de esta partida queda guardado en tu dispositivo.')}catch(e){}noSave=1;try{sessionStorage.removeItem('sl_mpg')}catch(e){}location.reload()}
async function mpPush(force){if(MP.role!=='guest'||!MP.joined||!MP.ch||MP.hostGone)return;const now=Date.now();if(!force&&now-mpLastPush<8000)return;mpLastPush=now;let raw=null;try{raw=localStorage.getItem(SAVEK)}catch(e){}if(!raw)return;
 const z=await mpZip(raw);if(z.length>240000){if(!MP.big){MP.big=1;toast('Tu progreso es demasiado grande para sincronizarlo con el anfitrión')}return}mpBc('sv',{id:MP.id,n:MP.name,z})}
/* salir de la partida multijugador y volver al menú */
async function mpExit(){if(MPG.role==='guest'){try{saveGame();await mpPush(true);await new Promise(r=>setTimeout(r,400))}catch(e){}}else{if(MP.role==='host')mpBc('close',{});try{saveGame()}catch(e){}await new Promise(r=>setTimeout(r,300))}
 noSave=1;try{sessionStorage.removeItem('sl_mpg')}catch(e){}location.reload()}
/* ---- estado de las naves ---- */
/* ---- efectos de la flota (se ven igual para ti y para los demás) ---- */
function wjCode(w){const j=w.jp;if(!j)return 0;return j.t<j.t1?1+Math.round(clamp(j.t/Math.max(.01,j.t1),0,1)*98):100}
function mpWg(){const L=wing.filter(w=>w.hp>0).slice(0,8);for(const w of L)if(!w.uid)w.uid=++MPS.wid;return L.map(w=>{const rs=w.rg?WRS.get(w):null;return[w.uid,w.ti,Math.round(w.x),Math.round(w.y),+(w.a||0).toFixed(2),Math.round(clamp(w.hp/w.max,0,1)*100),Math.round(w.vx||0),Math.round(w.vy||0),wjCode(w),w.col==='#ff9a4f'?1:0,rs?(rs===ship?1:(rs.uid||0)+1):0,w.mb?[Math.round(w.mb[0]),Math.round(w.mb[1])]:0,w.fm&&w.st==='mine'?w.fm.k:0]})}
function wjDraw(x,y,a,code,vx,vy){if(!code)return;
 if(code<100){const k=clamp((code-1)/98,0,1),o={x:ship.x,y:ship.y,w0:warp};ship.x=x;ship.y=y;warp={t:k,t1:1,te:2,h:a,dest:{n:''}};g.save();g.translate(x,y);g.scale(.55,.55);g.translate(-x,-y);try{warpFx(0)}finally{g.restore();ship.x=o.x;ship.y=o.y;warp=o.w0}return}
 const sp=Math.hypot(vx||0,vy||0),L=Math.min(900,sp*.12),c=Math.cos(a),n=Math.sin(a);g.save();g.globalCompositeOperation='lighter';g.lineCap='round';g.strokeStyle='rgba(90,170,255,.3)';g.lineWidth=9;g.beginPath();g.moveTo(x,y);g.lineTo(x-c*L,y-n*L);g.stroke();g.strokeStyle='rgba(180,235,255,.7)';g.lineWidth=4;g.beginPath();g.moveTo(x,y);g.lineTo(x-c*L,y-n*L);g.stroke();g.restore()}
function mpSend(){if(!MP.role||!MP.ch||state==='menu')return;
 {const P={id:MP.id,n:MP.name,ti:TYPES.indexOf(T),x:Math.round(ship.x),y:Math.round(ship.y),vx:Math.round(ship.vx||0),vy:Math.round(ship.vy||0),a:+ship.a.toFixed(2),dk:(state==='hangar'||(state==='pause'&&pauseFrom==='hangar'))?1:0,dd:ship.dead>0?1:0,wk:ship.wreck?1:0,sh:MP.share?1:0,h:+clamp(ship.hull/T.hull,0,1).toFixed(2),pp:[ship.parts.eng,ship.parts.eg2,ship.parts.wpn,ship.parts.min,ship.parts.jmp].map(v=>Math.round(v)),cd:QX.card?1:0,eh:Math.round(ship.eh||0),er:ship.ehR>0?1:0,ek:Math.round((ship.fk||0)*100),wj:(state==='warp'&&warp)?[+warp.t.toFixed(2),+warp.t1.toFixed(2),+warp.te.toFixed(2),+warp.h.toFixed(3)]:0,bm:(ship.beam&&!ship.dead)?[Math.round(ship.beam.x),Math.round(ship.beam.y),ship.beam.c]:0,wg:mpWg()};
  if(MPS.hf&&MPS.help)P[MPS.hf]=MPS.help.id;
  if(MPS.gk.length)P.gk=MPS.gk.splice(0,40);if(MPS.tc){P.tc=MPS.tc;MPS.tc=0}if(MPS.gd){P.gd=MPS.gd;MPS.gd=0}if(MPS.gp){P.gp=MPS.gp;MPS.gp=0}if(MPS.gn){P.gn=MPS.gn;MPS.gn=0}if(MPS.pb.length)P.pb=MPS.pb.splice(0,40);if(MPS.lp.length)P.lp=MPS.lp.splice(0,40);
  {const a=Object.entries(MPS.mi);if(a.length){P.mi=a.map(([i,m])=>[+i,+m.toFixed(3)]);MPS.mi={}}const c=Object.entries(MPS.mc);if(c.length){P.mc=c.map(([i,m])=>[+i,+m.toFixed(3)]);MPS.mc={}}}
  if(MP.role==='host')P.w=mpWorld();mpBc('st',P)}}
function mpOnSt(p){if(!p||!p.id||p.id===MP.id||!MP.role)return;let r=MPR[p.id];if(!r)r=MPR[p.id]={id:p.id,x:p.x,y:p.y,vx:0,vy:0,a:p.a};
 r.n=mpClean(p.n)||'?';r.ti=clamp(p.ti|0,0,TYPES.length-1);r.sx=p.x;r.sy=p.y;r.svx=p.vx||0;r.svy=p.vy||0;r.sa=p.a;r.dk=p.dk;r.dd=p.dd;r.wk=p.wk|0;r.rf=p.rf||0;r.tw=p.tw||0;r.sh=p.sh|0;r.hh=p.h!=null?p.h:1;r.pp=p.pp||null;r.cd=p.cd|0;r.eh=p.eh|0;r.er=p.er|0;r.ek=p.ek|0;{const pw=r.wj;r.wj=p.wj||0;if(pw&&!r.wj)boom(p.x,p.y,24,'#bfefff');else if(pw&&r.wj&&pw[0]<pw[1]&&r.wj[0]>=r.wj[1])boom(r.x,r.y,18,'#e8fbff')}r.bm=p.bm||0;
 if(p.wg){const old=new Map((r.wgs||[]).map(q=>[q.u,q]));r.wgs=p.wg.map(q=>{const o=old.get(q[0])||{x:q[2],y:q[3],a:q[4]};o.u=q[0];o.ti=q[1];o.sx=q[2];o.sy=q[3];o.sa=q[4];o.h=q[5]/100;o.svx=q[6];o.svy=q[7];o.jp=q[8]|0;o.om=q[9];o.hs=q[10]|0;o.mb=q[11]||null;o.mk=q[12]||null;return o})}
 r.t=performance.now();mpOnSt2(p)}
const mpLive=r=>r&&r.sx!=null&&performance.now()-r.t<5000&&!r.dk&&!r.dd;
/* ayuda entre jugadores: un amigo con Técnico repara tu nave inutilizada; cualquier nave puede remolcarte a la base */
function mpWreckAt(x,y){if(!MP.role)return null;let b=null,bd=55/zoom;for(const k in MPR){const r=MPR[k];if(!r.wk||r.dk||r.sx==null||performance.now()-r.t>5000)continue;const d=Math.hypot(r.x-x,r.y-y);if(d<bd){bd=d;b=r}}return b}
const MPFIX={t:8,sc:12};/* reparar a un amigo: 8 s y 12 de chatarra del que repara */
function mpAidMenu(px,py,r){const L=[];if(ship.dead>0||ship.wreck)return toast('Tu nave está inutilizada: no puedes ayudar');
 L.push(T.rep?['Reparar a '+r.n+' · '+MPFIX.sc+' chatarra',()=>mpAidStart('rf',r.id)]:['Reparar a '+r.n+' (solo Técnico)',()=>toast('Solo una nave Técnico puede reparar a otro jugador'),'dis']);L.push(['Remolcar a '+r.n,()=>mpAidStart('tw',r.id)]);
 if(MPS.help)L.push(['Cancelar ayuda',()=>{MPS.help=null;MPS.hf=0;if(ship.dest&&ship.dest.auto)ship.dest=null}]);ctxMenu(px,py,L)}
function mpAidStart(k,id){if(ship.dead>0||ship.wreck||ship.docked)return toast('Despega con tu nave para ayudar');const r=MPR[id];if(!r)return;if(k==='rf'){if(!T.rep)return toast('Solo una nave Técnico puede reparar a otro jugador');if(ship.scrap<MPFIX.sc)return toast('Necesitas '+MPFIX.sc+' de chatarra para reparar')}MPS.help={k,id,att:0};ship.lock=ship.mt=ship.mc=ship.orbit=null;toast(k==='rf'?'Vas a reparar a '+r.n+': acércate y quédate cerca':'Acércate a '+r.n+' para engancharlo y llévalo a una base')}
function mpAidTick(dt){const h=MPS.help;MPS.hf=0;if(!h)return;const r=MPR[h.id];
 if(!r||performance.now()-r.t>6000||ship.wreck||ship.dead>0){MPS.help=null;return}
 if(!r.wk){toast(r.n+' vuelve a estar operativo');MPS.help=null;if(ship.dest&&ship.dest.auto)ship.dest=null;return}
 const d=dist(ship,r);
 if(h.k==='rf'){if(d>130)ship.dest={x:r.x,y:r.y,stop:80,auto:1};else{if(ship.dest&&ship.dest.auto)ship.dest=null;if(Math.hypot(ship.vx,ship.vy)<90){if(ship.scrap<=0&&(MPS.sa||0)<1){toast('Sin chatarra: la reparación se detiene');MPS.help=null;MPS.hf=0;return}MPS.hf='rf';MPS.sa=(MPS.sa||0)+MPFIX.sc/MPFIX.t*dt;while(MPS.sa>=1&&ship.scrap>0){MPS.sa--;ship.scrap--}}}if(d>700)MPS.help=null}
 else{if(!h.att){if(d<170){h.att=1;toast('Remolque enganchado: llévalo a una base')}else ship.dest={x:r.x,y:r.y,stop:90,auto:1}}if(h.att){if(d<450)MPS.hf='tw';else{h.att=0;toast('Remolque soltado: te has alejado demasiado')}}}}
function mpAid(){if(!MP.role)return null;const now=performance.now();for(const k in MPR){const r=MPR[k];if(now-r.t>3000)continue;if(r.rf===MP.id&&dist(r,ship)<260)return{r,k:'rf'};if(r.tw===MP.id&&dist(r,ship)<480)return{r,k:'tw'}}return null}
function mpRope(ax,ay,bx,by,rf){g.save();g.lineCap='round';const dd=Math.hypot(bx-ax,by-ay)||1,nx=-(by-ay)/dd,ny=(bx-ax)/dd;
 if(rf){g.globalCompositeOperation='lighter';g.strokeStyle='rgba(199,146,255,.28)';g.lineWidth=9;g.beginPath();g.moveTo(ax,ay);g.lineTo(bx,by);g.stroke();g.strokeStyle='rgba(235,215,255,'+(.6+.35*Math.sin(time*30))+')';g.lineWidth=2.2;g.beginPath();g.moveTo(ax,ay);g.lineTo(bx,by);g.stroke();g.fillStyle='rgba(235,215,255,.9)';g.beginPath();g.arc(bx,by,4+2*Math.sin(time*20),0,TAU);g.fill()}
 else{for(const o of[-1,1]){g.strokeStyle='rgba(255,209,102,.7)';g.lineWidth=2.2;g.beginPath();g.moveTo(ax+nx*o*7,ay+ny*o*7);g.lineTo(bx+nx*o*3,by+ny*o*3);g.stroke()}g.strokeStyle='rgba(255,240,180,'+(.5+.4*Math.sin(time*18))+')';g.lineWidth=1.4;g.setLineDash([6,10]);g.lineDashOffset=-time*140;g.beginPath();g.moveTo(ax,ay);g.lineTo(bx,by);g.stroke();g.setLineDash([]);g.fillStyle='rgba(255,209,102,.9)';g.beginPath();g.arc(ax,ay,3.5,0,TAU);g.fill();g.beginPath();g.arc(bx,by,3.5,0,TAU);g.fill()}
 g.restore()}
function mpWreckDraw(){if(!MP||!MP.role)return;const now=performance.now();for(const k in MPR){const r=MPR[k];if(r.sx==null||now-r.t>5000)continue;
  if(r.wk&&!r.dk&&vis(r.x,r.y,120)){const t=TYPES[r.ti]||TYPES[0];drawS(r.x,r.y,r.a,t.sh,'#8a8f99',1.1,DEAD);if(Math.sin(time*6)>0){g.fillStyle='#ffb347';g.fillRect(r.x-3,r.y-3,6,6)}txt(r.n+' · INUTILIZADA',r.x,r.y-30,'#ffd166','center',Math.round(11/Math.max(.4,zoom)))}
  const id=r.tw||r.rf;if(id){const o=id===MP.id?ship:MPR[id];if(o)mpRope(r.x,r.y,o.x,o.y,!!r.rf)}}
 const h=MPS.help;if(h&&MPS.hf&&!ship.wreck){const o=MPR[h.id];if(o)mpRope(ship.x,ship.y,o.x,o.y,h.k==='rf')}}
function mpSt(r){const pp=r.pp||[],t=TYPES[r.ti]||TYPES[0];return{h:r.hh!=null?r.hh:1,p:{eng:pp[0],eg2:pp[1],wpn:pp[2],min:pp[3],jmp:pp[4]},th:Math.min(1,Math.hypot(r.svx||0,r.svy||0)/(t.spd||300))}}
function mpAs(r,f){const o={x:ship.x,y:ship.y,vx:ship.vx,vy:ship.vy,a:ship.a,eh:ship.eh,ehR:ship.ehR,ft:ship.ft,T0:T,w0:warp};ship.x=r.x;ship.y=r.y;ship.vx=r.svx||0;ship.vy=r.svy||0;ship.a=r.a||0;ship.eh=r.eh||0;ship.ehR=r.er?1:0;ship.ft=r.ft||[];T=TYPES[r.ti]||TYPES[0];warp=null;try{f()}finally{ship.x=o.x;ship.y=o.y;ship.vx=o.vx;ship.vy=o.vy;ship.a=o.a;ship.eh=o.eh;ship.ehR=o.ehR;ship.ft=o.ft;T=o.T0;warp=o.w0}}
function mpFxStep(r,dt,age,k2){const sh=(TYPES[r.ti]||{}).sh;if(sh==='e'||r.ft){r.ft=(r.ft||[]).filter(q=>(q.t+=dt)<1.3);if(sh==='e'&&r.ek>1&&!r.dk&&!r.dd&&performance.now()-r.t<2000)r.ft.push({x:r.x,y:r.y,a:r.a,k:r.ek/100,kw:0,t:0})}
 if(r.wgs)for(const o of r.wgs){o.x+=(o.sx+o.svx*age-o.x)*k2;o.y+=(o.sy+o.svy*age-o.y)*k2;o.a+=angDiff(o.a,o.sa)*k2}}
function mpWarpFx(r){const wj=r.wj;if(!wj)return;const t=wj[0]+(performance.now()-r.t)/1000,t1=wj[1],te=wj[2],h=wj[3];
 if(t<t1){mpAs(r,()=>{warp={t,t1,te,h,dest:{n:''}};try{warpFx(0)}finally{warp=null}});return}
 const sp=Math.hypot(r.svx||0,r.svy||0),L=clamp(sp*.22,0,2200),c=Math.cos(h),n=Math.sin(h);g.save();g.globalCompositeOperation='lighter';g.lineCap='round';
 {const t2=g.createLinearGradient(r.x,r.y,r.x-c*L,r.y-n*L);t2.addColorStop(0,'rgba(90,170,255,.35)');t2.addColorStop(1,'rgba(90,170,255,0)');g.strokeStyle=t2;g.lineWidth=22;g.beginPath();g.moveTo(r.x,r.y);g.lineTo(r.x-c*L,r.y-n*L);g.stroke()}
 const tr=g.createLinearGradient(r.x,r.y,r.x-c*L,r.y-n*L);tr.addColorStop(0,'rgba(190,240,255,.95)');tr.addColorStop(1,'rgba(160,230,255,0)');g.strokeStyle=tr;g.lineWidth=8;g.beginPath();g.moveTo(r.x,r.y);g.lineTo(r.x-c*L,r.y-n*L);g.stroke();g.restore()}
function mpBeamDraw(r){const b=r.bm;if(!b)return;const col=/^#[0-9a-f]{3,8}$/i.test(String(b[2]))?b[2]:'#ffd166',x=+b[0],y=+b[1];if(!isFinite(x)||!isFinite(y)||Math.hypot(x-r.x,y-r.y)>2500)return;g.save();g.strokeStyle=col;g.globalAlpha=.5+.4*Math.sin(time*30);g.lineWidth=2;g.beginPath();g.moveTo(r.x,r.y);g.lineTo(x,y);g.stroke();g.restore()}
function mpStep(dt){mpAidTick(dt);const now=performance.now(),k2=Math.min(1,10*dt);for(const k in MPR){const r=MPR[k];if(r.sx==null)continue;const age=Math.min(.4,(now-r.t)/1000);r.vx=r.svx;r.vy=r.svy;r.x+=(r.sx+r.svx*age-r.x)*k2;r.y+=(r.sy+r.svy*age-r.y)*k2;r.a+=angDiff(r.a,r.sa)*k2;mpFxStep(r,dt,age,k2)}}
function mpDraw(){if(!MP||!MP.role)return;mpWreckDraw();const now=performance.now();
 for(const k in MPR){const r=MPR[k];
  if(r.wgs&&now-r.t<5000)for(const o of r.wgs){if(!vis(o.x,o.y,120))continue;const t=TYPES[o.ti]||TYPES[0];
   if(o.jp)wjDraw(o.x,o.y,o.a,o.jp,o.svx,o.svy);if(o.hs){const hq=o.hs===1?r:(r.wgs||[]).find(q=>q.u===o.hs-1);if(hq)mpRope(hq.x,hq.y,o.x,o.y,true)}
   drawS(o.x,o.y,o.a,t.sh,o.om?'#ff9a4f':t.col,.9,{h:o.h,th:.5})}
  if(!mpLive(r))continue;
  if(r.wj)mpWarpFx(r);
  if(!vis(r.x,r.y,90)&&!(r.ft&&r.ft.length>1)&&!r.wj)continue;const t=TYPES[r.ti]||TYPES[0],hot=t.sh==='e'&&(r.er||r.eh>0);
  if(t.sh==='e'&&!r.wj)mpAs(r,()=>fxTrail());
  if(!vis(r.x,r.y,90))continue;
  drawS(r.x,r.y,r.a,t.sh,hot?hexMix(t.col,'#ff2a1a',r.er?1:r.eh/100):t.col,1.1,mpSt(r));
  if(hot)mpAs(r,()=>heatGlow());
  mpBeamDraw(r);
  txt(r.n+(r.hh<.995?' · '+Math.round(r.hh*100)+'%':''),r.x,r.y-30,r.hh<.4?'#ffd166':'#cfe8ff','center',Math.round(11/Math.max(.4,zoom)))}}
function mpMini(X,Y,m){if(!MP||!MP.role)return;const cx=m.x+m.w/2,cy=m.y+m.h/2,hw=m.w/2-4;for(const k in MPR){const r=MPR[k];if(r.sx==null||!r.sh||performance.now()-r.t>8000)continue;const c=r.wk?'#ffd166':r.dk?'#4fd1ff':'#7dff9b';let dx=X(r.x)-cx,dy=Y(r.y)-cy;const mx=Math.max(Math.abs(dx),Math.abs(dy)),out=mx>hw;if(out){dx*=hw/mx;dy*=hw/mx}
 g.fillStyle=out?'rgba(0,0,0,0)':c;g.strokeStyle=c;g.lineWidth=1.5;g.fillRect(cx+dx-3,cy+dy-3,6,6);if(out)g.strokeRect(cx+dx-3,cy+dy-3,6,6);if(out)txt((r.n||'?').slice(0,6),cx+dx,cy+dy-6,c,'center',8)}}
function mpHud(){if(!MP||!MP.role||state!=='play')return;if(MP.lt)txt('⚠ Anfitrión sin conexión · esperando '+Math.max(0,Math.ceil(30-(performance.now()-MP.lts)/1000))+' s',W/2,60,'#ffd166','center',12);txt('SALA '+MP.code+' · '+Object.keys(MP.peers).length+'/4'+(MP.pvp?' · PVP':'')+(MP.hostGone?' · SIN ANFITRIÓN':''),W/2,44,MP.hostGone?'#ff6b6b':'#7dff9b','center',11)}
/* ---- interfaz ---- */
function mpMsg(t){MP.msg=t||'';const e=$('mpSt');if(e)e.textContent=MP.msg}
function mpCard(g){const h=g.r==='h',fr=(g.names||[]).join(', ');
 const t=h?(fr?'Con '+fr:'Sin invitados todavía'):'Partida de '+g.hn+(fr?' · con '+fr:'');
 return `<div class="mpg"><div class="mpgi"><b>${mpEsc(t)}</b><span>${h?'Anfitrión · código '+mpEsc(g.code):'Invitado'} · ${mpDt(g.t)}</span></div><div class="mpgb"><button class="sq go" data-a="cont" data-g="${g.gid}" data-r="${g.r}">Continuar</button><button class="sq dng" data-a="del" data-g="${g.gid}" data-r="${g.r}" title="Borrar">✕</button></div></div>`}
function mpRender(){const b=$('mpBody');if(!b)return;const inR=!!MP.role;
 let h=`<label>Nombre de piloto</label><input id="mpName" class="mpin" maxlength="16" autocomplete="off" spellcheck="false" placeholder="Tu nombre" value="${mpEsc(MP.name&&MPG?MP.name:mpName())}" ${inR||MPG?'disabled':''}>`;
 if(inR){h+=`<label>Código de sala</label><div class="mpC">${mpEsc(MP.code)}<button class="sq" data-a="copy">Copiar</button></div><label>Jugadores</label><div id="mpL"></div>`;
  h+=`<label>Modo de juego</label>`+(MP.role==='host'?`<button class="sq" data-a="pvp">${MP.pvp?'⚔ PVP · los jugadores pueden dispararse':'🤝 PVE · cooperativo'} (cambiar)</button>`:`<div class="mpH">${MP.pvp?'⚔ PVP':'🤝 PVE'} (lo elige el anfitrión)</div>`)+(MP.role==='host'?`<button class="sq" data-a="cre">${MP.cre?'🛠 Creativo ACTIVADO para toda la sala (desactivar)':'🛠 Activar modo creativo para toda la sala'}</button>`:(MP.cre?`<div class="mpH">🛠 Modo creativo activo (lo elige el anfitrión)</div>`:''));
  if(MP.role==='host')h+=`<button class="sq" data-a="close" style="margin-top:14px">Cerrar sala (sigues jugando)</button>`;
  else if(MP.hostGone)h+=`<button class="sq go" data-a="retry" style="margin-top:14px">Reconectar</button>`;
  h+=`<button class="sq dng" data-a="exit" style="margin-top:8px">Salir de la partida</button>`}
 else if(MPG){if(MPG.role==='host')h+=`<div class="mpH" style="margin-top:12px">La sala está cerrada: nadie puede entrar. Tu partida sigue en marcha.</div><button class="sq go" data-a="open" style="margin-top:10px">Abrir sala</button>`;
  else h+=`<div class="mpH" style="margin-top:12px">No estás conectado a la sala.</div><button class="sq go" data-a="retry" style="margin-top:10px">Reconectar</button>`;
  h+=`<button class="sq dng" data-a="exit" style="margin-top:8px">Salir de la partida</button>`}
 else{const all=[...Object.values(mpGames()).map(g=>Object.assign({r:'h'},g)),...Object.values(mpJoined()).map(g=>Object.assign({r:'g'},g))].sort((a,c)=>(c.t||0)-(a.t||0)),solo=(()=>{const d=mpJ('starluge_save_v2',null);return !!(d&&d.v===1&&Array.isArray(d.T))})();
  h+=`<label>Tus partidas multijugador</label>`+(all.length?all.map(mpCard).join(''):'<div class="mpH">Aún no tienes ninguna. Crea una nueva o únete a la de un amigo.</div>');
  h+=`<label>Nueva partida (tú eres el anfitrión)</label><button class="sq go" data-a="new0">Mundo nuevo</button><button class="sq" data-a="new1" style="margin-top:6px" ${solo?'':'disabled'}>Copiar mi partida en solitario</button><div class="mpH">Hasta 4 jugadores. El mundo, tu progreso y el de quienes entren se guardan en este dispositivo.</div>`;
  h+=`<label>Unirse con código</label><input id="mpCode" class="mpin" maxlength="6" autocomplete="off" spellcheck="false" placeholder="ABC234" style="text-transform:uppercase;letter-spacing:.3em"><button class="sq" data-a="join" style="margin-top:8px">Unirse a la sala</button>`}
 h+=`<div id="mpSt" class="mpH">${mpEsc(MP.msg||'')}</div>`;b.innerHTML=h;mpRenderList()}
function mpRenderList(){const e=$('mpL');if(!e||!MP.role)return;const ps=Object.values(MP.peers);
 let h=ps.map(q=>{const me=q.id===MP.id,r=MPR[q.id],d=me?'tú':r&&r.sx!=null?(r.dk?'atracado':r.sh?km(dist(ship,r)):'ubicación oculta'):'—';return `<div><span>${mpEsc(q.n)}${q.h?' · anfitrión':''}${(me?QX.card:r&&r.cd)?' · 🔑 Omega':''}</span><span style="opacity:.7">${d}</span></div>`}).join('');
 if(!ps.length)h='<div><span style="opacity:.6">Conectando…</span></div>';
 h+=`<div style="border:0"><span style="opacity:.6">${ps.length}/4 jugadores</span></div>`;if(MP.hostGone)h+='<div style="border:0;color:#ff6b6b">El anfitrión ya no está en la sala</div>';
 e.innerHTML=h}
function mpShow(){if(state!=='pause'&&state!=='menu')return;mpOpen=1;$('mpw').classList.remove('hide');mpRender()}
function mpHide(){mpOpen=0;$('mpw').classList.add('hide')}
$('pMP').onclick=mpShow;$('mMP').onclick=mpShow;
$('mpw').addEventListener('click',e=>{if(e.target===$('mpw'))return mpHide();const b=e.target.closest('button');if(!b||b.disabled)return;const a=b.dataset.a;
 if(a==='x')mpHide();else if(a==='new0')mpNew(0);else if(a==='new1')mpNew(1);else if(a==='join')mpJoin();else if(a==='cont')mpContinue(b.dataset.g,b.dataset.r);else if(a==='del')mpDel(b.dataset.g,b.dataset.r);
 else if(a==='pvp'){if(MP.role==='host'){MP.pvp=MP.pvp?0:1;toast(MP.pvp?'⚔ Modo PVP activado':'🤝 Modo PVE activado');mpRender()}}else if(a==='cre'){if(MP.role==='host'){MP.cre=MP.cre?0:1;mpCreApply();toast(MP.cre?'🛠 Modo creativo activado para toda la sala':'Modo creativo desactivado');mpRender()}}else if(a==='close')mpCloseRoom();else if(a==='open')mpOpenRoom(0);else if(a==='exit')mpExit();else if(a==='retry'){mpReset();mpRender();mpResume()}
 else if(a==='copy'){try{navigator.clipboard.writeText(MP.code);mpMsg('Código copiado')}catch(_){mpMsg('Código: '+MP.code)}}});
addEventListener('keydown',e=>{if(state==='menu'&&e.code==='Escape'&&mpOpen){e.preventDefault();mpHide()}});
setInterval(()=>{if(mpOpen&&MP.role)mpRenderList()},1000);
function mpLoop(t){const dt=Math.min(.05,(t-(mpLoop.l||t))/1000);mpLoop.l=t;if(MP.role)mpStep(dt);requestAnimationFrame(mpLoop)}requestAnimationFrame(mpLoop);
/* guardado: progreso del invitado → anfitrión, y fecha de última partida */
{const _sg=saveGame;saveGame=function(){_sg.apply(this,arguments);mpPush(0);mpTouch()}}
addEventListener('pagehide',()=>mpPush(1));document.addEventListener('visibilitychange',()=>{if(document.hidden)mpPush(1)});
{const _pe=$('pE').onclick;$('pE').onclick=()=>{if(MPG&&!ship.wreck)return mpExit();_pe()}}
if(MPG)mpResume();
