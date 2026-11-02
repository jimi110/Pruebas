/* ============================================================================
   systems/quests.js — Motor de misiones: progreso, recompensas, HUD y panel de misiones.
   (Trozo de la antigua pieza única de index.html. Se carga como script clásico en orden:
   comparte el ámbito global con el resto de js/. NO cambies el orden de carga en index.html.)
   ========================================================================== */
"use strict";
const qAll=()=>QUESTS.concat(QZ.jobs.map(jobQ)),qGet=id=>QUESTS.find(q=>q.id===id)||(()=>{const p=QZ.jobs.find(p=>p.id===id);return p&&jobQ(p)})();
const qSt=q=>(QZ.s[q.id]||{}).s||(q.when&&!q.when()?'locked':'available');
function qProg(q){const b=(QZ.s[q.id]||{}).b||[];return q.objs.map((o,i)=>{const v=o.gr?o.gr(b[i]):o.rel?o.g()-(b[i]||0):o.g(),c=Math.max(0,Math.min(o.n,v));return{c,n:o.n,ok:c>=o.n-1e-6,tx:o.tx}})}
const qAcc=q=>{QZ.s[q.id]={s:'active',b:q.objs.map(o=>o.bs?o.bs():o.rel?o.g():0)};if(q.acc)q.acc()};
const qRew=r=>[(r||{}).cred?'◈ '+r.cred:'',(r||{}).scrap?'⚙ '+r.scrap:''].filter(Boolean).join(' · ');
function qDone(q){const st=QZ.s[q.id];if(st.pd)return;st.pd=1;st.s='done';st.t=Date.now();const mm=MPG&&q.cat==='main',r=mm?{}:(q.rew||{});if(r.cred)ship.cred+=r.cred;if(r.scrap)ship.scrap+=r.scrap;if(!mm)toast('✔ '+q.name+' completada · '+qRew(r));if(q.cat==='job'){QX.job=(QX.job||0)+1;QZ.jw=Date.now()+60000+Math.random()*60000}if(q.chEnd&&!MPG)toast('★ Capítulo '+q.ch+' completado'+(q.last?' · fin de la campaña actual: nuevas bases próximamente':''));if(q.repeat)st.rt=Date.now()+60000+Math.random()*60000;if(QZ.tr===q.id)qClr=time+5;saveGame()}
function qTick(dt){qT-=dt;if(qT>0)return;qT=.25;
 for(const b of BASES)if(!QX.vis[b.n]&&dist(ship,b)<b.r+260)QX.vis[b.n]=1;
 for(const F of FIELDS)if(!QX.vis[F.n]&&F.ins(ship.x,ship.y))QX.vis[F.n]=1;
 for(const q of qAll()){let st=QZ.s[q.id];
  if(st&&st.s==='done'&&st.rt&&Date.now()>st.rt){delete QZ.s[q.id];st=null}
  if(!st&&q.auto&&(!q.when||q.when())){qAcc(q);if(!QZ.tr&&!QZ.ut&&!(MPG&&q.cat==='main')&&(q.cat==='main'||!qAll().some(m=>m.cat==='main'&&qSt(m)==='active'))){QZ.tr=q.id;QZ.to=null}if(!MPG||q.cat!=='main'){if(q.chStart&&!MPG)toast('Capítulo '+q.ch+': '+CHT[q.ch]);toast('Nueva misión: '+q.name)}st=QZ.s[q.id]}
  if(st&&st.s==='active'&&q.tut&&q.tip&&!QX.tp[q.id]&&state==='play'&&!qDet&&$('cxN').classList.contains('hide')&&!ship.dead&&!QZ.ev){QX.tp[q.id]=1;qDet=q.id;qSig=''}
  if(st&&st.s==='active'){if(q.pt&&!st.v&&dist(ship,q.pt)<450){st.v=1;toast(q.pt.msg);for(let i=0;i<3;i++)loot.push({x:q.pt.x+rnd(-80,80),y:q.pt.y+rnd(-80,80),v:2+rn(3),life:90})}
   if(q.pre&&st.d0==null&&q.pre())st.d0=QX.dock[q.dk]||0;
   if(q.mat&&!st.dl&&ship.docked&&ship.docked.n===q.mat.nm&&(ship.scrap|0)>=q.mat.n){ship.scrap-=q.mat.n;st.dl=1;toast('Materiales entregados: −'+q.mat.n+' de chatarra')}}
  if(st&&st.s==='active'){if(q.fail&&q.fail()){st.s='failed';st.t=Date.now()}else if(qProg(q).every(p=>p.ok))qDone(q)}}
 if(MPG&&QZ.tr){const t0=qGet(QZ.tr);if(!t0||t0.cat==='main'){QZ.tr=null;QZ.to=null}}
 qZone(.25);QZ.jobs=QZ.jobs.filter(p=>{const s=(QZ.s[p.id]||{s:'available'}).s;return s!=='available'||!!p.z===(zC==='z')});
 QZ.jobs=QZ.jobs.filter(p=>{const s=QZ.s[p.id];if(s&&s.s!=='active'&&Date.now()-(s.t||0)>8000){delete QZ.s[p.id];return false}return true});
 if(QZ.tr){const s=QZ.s[QZ.tr];if(!s||s.s==='done'||s.s==='failed'){if(!qClr)qClr=time+5;else if(time>qClr){const nx=MPG?null:qAll().find(q=>q.cat==='main'&&qSt(q)==='active');QZ.tr=!QZ.ut&&nx?nx.id:null;QZ.to=null;qClr=0}}else qClr=0}
 if((qJT-=.25)<=0){qJT=12;if((MPG||qdn('c1.6'))&&Date.now()>=(QZ.jw||0)&&QZ.jobs.filter(p=>(QZ.s[p.id]||{s:'available'}).s!=='done'&&(QZ.s[p.id]||{s:'available'}).s!=='failed').length<3)qGen()}
 qUI();if(MPG&&qDet)qDetail();evUI();gevUI()}
/* Objetivo seguido: siempre el objetivo pendiente seleccionado (o el primero pendiente) */
function qTarget(){const id=QZ.tr;if(!id)return null;const q=qGet(id),s=QZ.s[id];if(!q||!s)return{st:'na'};if(s.s==='done')return{q,st:'done'};if(s.s==='failed')return{q,st:'failed'};
 const pr=qProg(q);let i=QZ.to!=null&&pr[QZ.to]&&!pr[QZ.to].ok?QZ.to:pr.findIndex(p=>!p.ok);if(i<0)return{q,st:'done'};
 const c=QCAT[q.cat].c,l=q.objs[i].at();if(!l)return{q,st:'na',c,i,tx:q.objs[i].tx};qLast={x:l.x,y:l.y,id:q.id};return{q,st:'ok',c,i,l,pr:pr[i]}}
function qGlyph(x,y,s,cat,col,kind){const gc=kind?'#8a97a8':col;g.save();g.translate(x,y);g.lineWidth=2;g.setLineDash([]);g.strokeStyle=gc;g.fillStyle=kind?'rgba(30,40,55,.9)':col+'55';g.beginPath();
 if(cat==='main'){g.moveTo(0,-s);g.lineTo(s,0);g.lineTo(0,s);g.lineTo(-s,0);g.closePath()}else if(cat==='side')g.arc(0,0,s,0,TAU);else g.rect(-s*.8,-s*.8,s*1.6,s*1.6);
 g.fill();g.stroke();if(kind){g.beginPath();if(kind==='done'){g.moveTo(-s*.45,0);g.lineTo(-s*.1,s*.4);g.lineTo(s*.5,-s*.4)}else{g.moveTo(-s*.4,-s*.4);g.lineTo(s*.4,s*.4);g.moveTo(s*.4,-s*.4);g.lineTo(-s*.4,s*.4)}g.stroke()}g.restore()}
/* HUD en pantalla: flecha de dirección + distancia (PC y móvil) y posición del panel bajo los indicadores */
function qHud(y){const el=$('qp'),top=Math.round(y-8-SAFE.t);if(top!==qTop){qTop=top;el.style.top=top+'px';el.style.maxHeight=Math.max(96,H-top-125)+'px'}
 const t=qTarget();if(!t)return;
 if(t.st!=='ok'){const c=t.c||(t.q?QCAT[t.q.cat].c:'#9aa8ba');txt(t.st==='done'?'✔ '+t.q.name+': completada':t.st==='failed'?'✖ '+t.q.name+': fallida':(t.tx?'◉ '+t.tx:'◌ Objetivo no disponible'+(t.q?' · '+t.q.name:'')),W/2,48,t.st==='done'||t.tx?c:'#9aa8ba','center',13);return}
 const l=t.l,dx=(l.x-cam.x)*zoom,dy=(l.y-cam.y)*zoom,hw=W/2-40-SAFE.r,hh=H/2-40-SAFE.b,lb=km(dist(ship,l))+' · '+l.n;
 if(Math.abs(dx)<hw&&Math.abs(dy)<hh){qGlyph(W/2+dx,H/2+dy,9+2*Math.sin(time*5),t.q.cat,t.c);txt(lb,W/2+dx,H/2+dy-18,t.c,'center',12)}
 else{const k=Math.min(hw/Math.max(Math.abs(dx),1e-3),hh/Math.max(Math.abs(dy),1e-3)),px=W/2+dx*k,py=H/2+dy*k,a=Math.atan2(dy,dx);g.save();g.translate(px,py);g.rotate(a);g.fillStyle=t.c;g.strokeStyle='#000';g.lineWidth=1;g.beginPath();g.moveTo(16,0);g.lineTo(-8,-11);g.lineTo(-3,0);g.lineTo(-8,11);g.closePath();g.fill();g.stroke();g.restore();
  txt(lb,clamp(px-Math.cos(a)*34,80,W-80),clamp(py-Math.sin(a)*34+4,16,H-10),t.c,'center',12)}}
function qMap(X,Y){const t=qTarget();if(!t||!t.q)return;const l=t.st==='ok'?t.l:qLast&&qLast.id===t.q.id?qLast:null;if(!l)return;const x=X(l.x),y=Y(l.y),k=t.st==='ok'?0:t.st==='done'?'done':'na',c=t.c||QCAT[t.q.cat].c;
 if(!k){g.strokeStyle=c;g.globalAlpha=.5;g.lineWidth=1.5;g.beginPath();g.arc(x,y,16+4*Math.sin(time*4),0,TAU);g.stroke();g.globalAlpha=1}
 qGlyph(x,y,8,t.q.cat,c,k);{const lb=t.q.name+(!k?' · '+km(dist(ship,l)):k==='done'?' · completada':' · no disponible');let ty=y-16;for(const b of BASES)if(Math.hypot(X(b.x)-x,Y(b.y)-y)<90){ty=y-40;break}if(!sczDead()&&Math.hypot(X(SCZ.x)-x,Y(SCZ.y)-y)<90)ty=Math.min(ty,y-34);g.font='11px ui-monospace,Menlo,monospace';const tw=g.measureText(lb).width+10,tx=clamp(x,tw/2+4,W-tw/2-4);g.fillStyle='rgba(3,8,19,.85)';g.fillRect(tx-tw/2,ty-12,tw,16);txt(lb,tx,ty,k?'#9aa8ba':c,'center',11)}}
function qMini(cx,cy,s,hw){const t=qTarget();if(!t||t.st!=='ok')return;let dx=(t.l.x-ship.x)*s,dy=(t.l.y-ship.y)*s;const mx=Math.max(Math.abs(dx),Math.abs(dy));if(mx>hw){dx*=hw/mx;dy*=hw/mx}qGlyph(cx+dx,cy+dy,4.5,t.q.cat,t.c)}
/* Interfaz: panel compacto expandible + detalle */
const qOb=(pr,all)=>pr.filter(p=>all||!p.ok).map(p=>`<div class=qo>${p.ok?'✔':'▫'} ${p.tx}${p.n>1?` <b>${Math.floor(p.c)}/${p.n}</b>`:''}</div>`).join('');
function qChapLine(){const m=QUESTS.filter(q=>q.cat==='main'&&q.ch),f=m.find(q=>!qdn(q.id));if(!f)return `<div class=qg style="color:#b57bff">CAMPAÑA ACTUAL COMPLETADA · nuevas bases próximamente</div>`;const ch=f.ch,ms=m.filter(q=>q.ch===ch),ss=QUESTS.filter(q=>q.cs===ch);return `<div class=qg style="color:#b57bff">CAPÍTULO ${ch} · ${CHT[ch]} — principales ${ms.filter(q=>qdn(q.id)).length}/${ms.length}`+(ss.length?` · secundarias ${ss.filter(q=>qdn(q.id)).length}/${ss.length} (necesarias ${CHN[ch]})`:'')+`</div>`}
function qUI(){const el=$('qp');if(el.classList.contains('hide'))return;const all=qAll().filter(q=>!(MPG&&q.cat==='main')),act=all.filter(q=>qSt(q)==='active'),av=all.filter(q=>qSt(q)==='available'),tq=QZ.tr?qGet(QZ.tr):null,ts=tq?qSt(tq):'',sh=tq&&(ts==='active'||ts==='done'||ts==='failed')?tq:null,ex=act.length-(sh&&ts==='active'?1:0);
 const bd=(ex?'+'+ex+' activa'+(ex>1?'s':''):'')+(ex&&av.length?' · ':'')+(av.length?av.length+' disp.':''),c=sh?QCAT[sh.cat].c:'#8a97a8';let h;
 if(!qOpen){h=`<div class=qh data-h=1 style="color:${c}"><span>${sh?(sh.cat==='main'?'◆ ':'')+QCAT[sh.cat].n+(sh.ch?' · CAP. '+sh.ch:''):'MISIONES'}</span><span class=qb>${bd||'—'} ▾</span></div>`+(sh?`<div class=qi data-q="${sh.id}" style="--c:${c}"><div class=qn>◉ ${sh.name}${ts==='done'?' · ✔ completada':ts==='failed'?' · ✖ fallida':''}</div>${ts==='active'?qOb(qProg(sh)):''}${ts==='active'&&sh.tip?`<div class=qt>💡 ${sh.tip}</div>`:''}</div>`:`<div class=qi data-h=1 style="--c:#8a97a8"><div class=qo>Ninguna misión seguida</div><div class=qd2>Pulsa aquí o [Q] y elige cuál seguir.</div></div>`)}
 else{h=`<div class=qh data-h=1 style="color:#cfe8ff"><span>MISIONES</span><span class=qb>▴</span></div>`+(MPG?'':qChapLine());
  for(const k of QORD){const a=act.filter(q=>q.cat===k),v=av.filter(q=>q.cat===k);if(!a.length&&!v.length)continue;const cc=QCAT[k].c;h+=`<div class=qg style="color:${cc}">${QCAT[k].n}</div>`;
   for(const q of a)h+=`<div class=qi data-q="${q.id}" style="--c:${cc}"><div class=qn>${QZ.tr===q.id?'◉ ':''}${q.name}</div><div class=qr style="color:${cc}">${qRew(q.rew)}</div></div>`;
   for(const q of v)h+=`<div class="qi dim" data-q="${q.id}" style="--c:${cc}"><div class=qn>${q.name} <span class=qb>DISPONIBLE</span></div><div class=qr style="color:${cc}">${qRew(q.rew)}</div></div>`}}
 el.style.setProperty('--qc',c);if(h!==qSig){qSig=h;el.innerHTML=h}if(qDet)qDetail()}
const QSL={active:'ACTIVA',available:'DISPONIBLE',done:'COMPLETADA',failed:'FALLIDA',locked:'BLOQUEADA'};
function qDetail(){const el=$('qd'),q=qDet&&qGet(qDet);if(!q){el.classList.add('hide');qDet=null;return}const st=qSt(q),c=QCAT[q.cat].c,pr=qProg(q),tr=QZ.tr===q.id,ac=st==='active',cu=tr?(qTarget()||{}).i:-1;
 el.style.setProperty('--c',c);el.classList.remove('hide');
 if(MPG&&q.cat==='main'){const h=`<div class=qdh><span class=qbd style="background:#4fd1ff">TUTORIAL</span><span><b data-a=x style="cursor:pointer;padding:2px 8px;border:1px solid currentColor;margin-left:6px">✕</b></span></div><div class=qdn style="color:#4fd1ff">${q.name}</div><div class=qtp><b>💡 Cómo se hace</b><br>${q.tip||q.desc}</div><div class=qdb2><button class="sq go" data-a="x" style="position:static">Entendido</button></div>`;el.style.setProperty('--c','#4fd1ff');if(el._h!==h){el._h=h;el.innerHTML=h}return}
 const h=`<div class=qdh><span class=qbd style="background:${c}">${QCAT[q.cat].n}${q.ch?' · CAP. '+q.ch:''}</span><span>${QSL[st]} <b data-a=x style="cursor:pointer;padding:2px 8px;border:1px solid currentColor;margin-left:6px">✕</b></span></div><div class=qdn style="color:${c}">${q.name}</div><div class=qdd>${q.desc}</div>${q.tip?`<div class=qtp><b>💡 Cómo se hace</b><br>${q.tip}</div>`:''}`+
 pr.map((p,i)=>`<div class="qo2${ac&&!p.ok?' pick':''}${cu===i?' cur':''}" data-o="${i}">${p.ok?'✔':cu===i?'◉':'▫'} ${p.tx}${p.n>1?` <b>${Math.floor(p.c)}/${p.n}</b>`:''}</div>`).join('')+
 `<div class=qdr style="color:${c}">Recompensa: ${qRew(q.rew)||'—'}</div><div class=qdb2>`+
 (ac?`<button class="sq go" data-a="tr" style="position:static">${tr?'Dejar de seguir':'Seguir'}</button>`:st==='available'?`<button class="sq go" data-a="ac" style="position:static">Aceptar y seguir</button>`:'')+
 (ac&&q.cat==='job'?`<button class="sq dng" data-a="ab" style="position:static">Abandonar</button>`:'')+`<button class="sq" data-a="x" style="position:static">Cerrar</button></div>`+(ac&&pr.filter(p=>!p.ok).length>1?'<div class=qdd style="opacity:.55;font-size:11px">Toca un objetivo pendiente para seguirlo.</div>':'');
 if(el._h!==h){el._h=h;el.innerHTML=h}}
$('qp').addEventListener('click',e=>{if(e.target.closest('[data-h]')){qOpen=!qOpen;qSig='';qUI();return}const i=e.target.closest('[data-q]');if(i){qDet=i.dataset.q;qDetail()}});
$('qd').addEventListener('click',e=>{const o=e.target.closest('[data-o]'),b=e.target.closest('[data-a]'),q=qDet&&qGet(qDet);if(!q)return;
 if(o&&qSt(q)==='active'&&!qProg(q)[+o.dataset.o].ok){QZ.tr=q.id;QZ.to=+o.dataset.o;QZ.ut=0}
 else if(b){const a=b.dataset.a;if(a==='x')qDet=null;else if(a==='tr'){if(QZ.tr===q.id){QZ.tr=null;QZ.to=null;QZ.ut=1}else{QZ.tr=q.id;QZ.to=null;QZ.ut=0}}
  else if(a==='ac'){qAcc(q);QZ.tr=q.id;QZ.to=null;QZ.ut=0;toast('Misión aceptada: '+q.name)}
  else if(a==='ab'){const s=QZ.s[q.id];s.s='failed';s.t=Date.now();qDet=null}}
 qSig='';qUI();qDetail();saveGame()});
$('evP').addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(b){evStart(b.dataset.k);evUI()}});
addEventListener('keydown',e=>{if(e.code==='Escape'&&qDet){e.stopImmediatePropagation();qDet=null;qDetail()}else if(e.code==='KeyQ'&&state==='play'){qOpen=!qOpen;qSig='';qUI()}},true);
function qShow(){$('qp').classList.toggle('hide',state!=='play');if(state!=='play'){qDet=null;$('qd').classList.add('hide')}qSig='';qUI()}
const qSave=()=>({s:QZ.s,tr:QZ.tr,to:QZ.to,ut:QZ.ut,jobs:QZ.jobs,jn:QZ.jn,jw:QZ.jw||0,x:QX,ev:QZ.ev?Object.assign({},QZ.ev,{sp:0,wt:0,aw:0}):null});
function qLoad(d){if(!d||typeof d!=='object')return;try{if(d.s&&typeof d.s==='object')QZ.s=d.s;QZ.tr=typeof d.tr==='string'?d.tr:null;QZ.to=Number.isInteger(d.to)?d.to:null;QZ.ut=d.ut?1:0;QZ.jobs=Array.isArray(d.jobs)?d.jobs.filter(qValid):[];QZ.jn=d.jn|0;QZ.jw=+d.jw||0;QZ.ev=d.ev&&typeof d.ev==='object'&&d.ev.id&&d.ev.parts&&RESC[d.ev.v]&&Array.isArray(d.ev.wv)?Object.assign(d.ev,{sp:0,wt:0,aw:0,rq:Array.isArray(d.ev.rq)?d.ev.rq:[]}):null;if(d.x&&typeof d.x==='object')Object.assign(QX,d.x);QX.ore=QX.ore||{};QX.dock=QX.dock||{};QX.vis=QX.vis||{};QX.del=QX.del||{};QX.tp=QX.tp||{};for(const k of['m1','m2','m3','m4','s1'])delete QZ.s[k];if(QZ.tr&&!qGet(QZ.tr)){QZ.tr=null;QZ.to=null}}catch(e){console.warn(e)}}

