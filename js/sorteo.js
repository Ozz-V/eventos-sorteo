/* Comagro Eventos - sorteo.js
   Ruleta de sorteo (por evento y sorteo rapido) */

(function() {
  var params = new URLSearchParams(window.location.search);
  var sorteoId = params.get('sorteo');
  var linkToken = params.get('sorteo-link');
  if (!sorteoId && !linkToken) return;
  function start() {
    document.getElementById('ce-loading').style.display='none';
    document.getElementById('ce-root').style.display='none';
    document.body.appendChild(document.getElementById('sorteo-root'));
    if (linkToken) initSorteoLink(linkToken); else initSorteo(sorteoId);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

// abrirSorteo() ahora esta en sorteos.js (abre el selector/creador de sorteos del evento)

var srNames=[],srData=[],srOriginal=[],srRotation=0,srSpinning=false,srLastActive=-1,srSpinFrom=0,srSpinTo=0,srSpinDur=5500,srSpinStart=null,srWinnerIdx=-1,srCssSize=400,srDPR=1,srCanvas,srCtx;
var srLocalMode=false,srRemoveWinner=false,srPendingRemoval=false,srLoopStarted=false,srResizeBound=false;
var srOnWinner=null,srPersist=false,srRemoteDraw=null,srLinkTimer=null,srLinkExpired=false;   // srOnWinner: funcion que guarda cada ganador en la base

// Ventana aparte (?sorteo=ID). ID puede ser un sorteo guardado (raffles)
// o, por compatibilidad con links viejos, un evento (usa sus presentes).
function srShowEmpty(title, msg, loginLink) {
  document.getElementById('sr-loading').style.display='none';
  var box=document.getElementById('sr-empty');
  box.querySelector('h3').textContent=title;
  box.querySelector('p').innerHTML=srEscHtml(msg)+(loginLink?'<br><br><a href="/login" style="color:#45d636;font-weight:700;">Iniciar sesion</a>':'');
  box.classList.add('show');
}

async function initSorteo(id) {
  srLocalMode=false;
  document.getElementById('sorteo-root').classList.add('active');
  document.getElementById('sr-loading').style.display='flex';
  document.getElementById('sr-empty').classList.remove('show');
  var sess=await sb.auth.getSession();
  if(!sess.data||!sess.data.session){
    srShowEmpty('Inicia sesion','La ruleta usa los datos de los participantes: solo la pueden abrir administradores con sesion iniciada en este navegador.',true);
    return;
  }

  // 1) Sorteo guardado
  var rr=await sb.from('raffles').select('*, events(name)').eq('id',id).maybeSingle();
  if(rr.data){
    var raffle=rr.data;
    var pr=await sb.from('raffle_participants').select('*').eq('raffle_id',raffle.id).order('created_at');
    var wr=await sb.from('raffle_winners').select('participant_id').eq('raffle_id',raffle.id);
    var won={}; (wr.data||[]).forEach(function(w){ if(w.participant_id) won[w.participant_id]=1; });
    var parts=(pr.data||[]).filter(function(p){ return !raffle.remove_winners || !won[p.id]; });
    document.getElementById('sr-event-name').textContent=raffle.name;
    document.getElementById('sr-event-meta').textContent=(raffle.events&&raffle.events.name?raffle.events.name+' · ':'')+parts.length+' participantes';
    document.title='Sorteo | '+raffle.name;
    document.getElementById('sr-loading').style.display='none';
    if(parts.length<2){ srShowEmpty('Sin participantes suficientes','Se necesitan al menos 2 participantes habilitados en este sorteo.'); return; }
    srRemoveWinner=!!raffle.remove_winners; srPersist=true;
    srOnWinner=async function(d){
      var ins=await sb.from('raffle_winners').insert([{raffle_id:raffle.id,participant_id:d.pid||null,nombre:d.nombreOriginal||d.nombre,telefono:d.telefono||null,empresa:d.company||null}]);
      if(ins.error) alert('ATENCION: el ganador no se pudo guardar: '+ins.error.message);
    };
    srSetup(parts.map(function(p){ return {id:p.id,first_name:p.nombre,phone:p.telefono,company:p.empresa}; }));
    return;
  }

  // 2) Link viejo: id de evento -> presentes (no guarda ganadores)
  var evResult=await sb.from('events').select('*').eq('id',id).maybeSingle();
  var ev=evResult.data;
  if(!ev){ srShowEmpty('Sorteo no encontrado','El link no es valido o no tenes permiso para verlo.'); return; }
  document.getElementById('sr-event-name').textContent=ev.name;document.getElementById('sr-event-meta').textContent=(ev.type?ev.type.charAt(0).toUpperCase()+ev.type.slice(1):'Evento')+' - '+srFormatDate(ev.date)+(ev.location?' - '+ev.location:'');document.title='Sorteo | '+ev.name;
  var regsResult=await sb.from('registrations').select('*').eq('event_id',id).eq('status','presente');
  var lista=regsResult.data||[];
  document.getElementById('sr-loading').style.display='none';
  if(lista.length<2){ srShowEmpty('Sin presentes', lista.length===0?'No hay inscriptos marcados como presentes en este evento.':'Se necesitan al menos 2 participantes para hacer el sorteo.'); return; }
  srSetup(lista);
}

// ---------------------------------------------------------------------
// LINK COMPARTIDO (?sorteo-link=TOKEN): sin login, valido 15 minutos.
// El servidor elige el ganador (public_raffle_draw) y lo guarda.
// ---------------------------------------------------------------------
function srLinkMsg(code){
  if(code==='expired') return ['Link vencido','Este link de sorteo ya no es valido. Pedi uno nuevo al organizador.'];
  if(code==='empty') return ['Sin participantes suficientes','No quedan al menos 2 participantes habilitados en este sorteo.'];
  return ['Link no valido','El link no existe o el sorteo ya no esta disponible.'];
}

async function initSorteoLink(token) {
  srLocalMode=false;
  document.getElementById('sorteo-root').classList.add('active');
  document.getElementById('sr-loading').style.display='flex';
  document.getElementById('sr-empty').classList.remove('show');
  var res=await sb.rpc('public_raffle_by_link',{p_token:token});
  var d=res.data;
  if(res.error||!d||!d.ok){ var m=srLinkMsg(d&&d.code); srShowEmpty(m[0],m[1]); return; }
  document.getElementById('sr-event-name').textContent=d.name;
  document.title='Sorteo | '+d.name;
  document.getElementById('sr-loading').style.display='none';
  if((d.participants||[]).length<2){ var m2=srLinkMsg('empty'); srShowEmpty(m2[0],m2[1]); return; }
  srRemoveWinner=!!d.remove_winners; srPersist=true; srOnWinner=null;
  srRemoteDraw=async function(){
    var r=await sb.rpc('public_raffle_draw',{p_token:token});
    if(r.error) return {ok:false,code:'error'};
    return r.data;
  };
  // Cuenta regresiva (usa la hora del servidor)
  var offset=new Date(d.server_now).getTime()-Date.now();
  var expires=new Date(d.expires_at).getTime();
  var right=document.querySelector('#sorteo-root .sr-header > div:last-child');
  var t=document.getElementById('sr-timer');
  if(!t){ t=document.createElement('div'); t.id='sr-timer'; t.className='sr-participants-badge'; t.style.cssText='color:#fff;font-variant-numeric:tabular-nums;'; right.insertBefore(t,right.firstChild); }
  function tick(){
    var left=Math.max(0,Math.floor((expires-(Date.now()+offset))/1000));
    t.innerHTML='<span style="opacity:.7;">Link</span> <b>'+String(Math.floor(left/60)).padStart(2,'0')+':'+String(left%60).padStart(2,'0')+'</b>';
    t.style.borderColor=left<=60?'#dc2626':'';
    if(left===0){
      srLinkExpired=true;
      var btn=document.getElementById('sr-spinBtn'); btn.disabled=true; btn.textContent='LINK VENCIDO';
      if(!srSpinning && !document.getElementById('sr-winnerBanner').classList.contains('show')){
        clearInterval(srLinkTimer); var m3=srLinkMsg('expired'); srShowEmpty(m3[0],m3[1]);
      }
    }
  }
  tick(); srLinkTimer=setInterval(tick,1000);
  document.getElementById('sr-event-meta').textContent=(d.event_name?d.event_name+' · ':'')+d.participants.length+' participantes';
  srSetup(d.participants.map(function(p){ return {id:p.id,first_name:p.nombre,phone:p.telefono,company:p.empresa}; }));
}

// Abre la ruleta en la misma pagina. opts.onWinner(d) guarda cada ganador.
function openLocalSorteo(lista, title, meta, removeWinner, opts) {
  srLocalMode=true; srRemoveWinner=!!removeWinner; srPendingRemoval=false;
  srOnWinner=(opts&&opts.onWinner)||null; srPersist=!!srOnWinner;
  var root=document.getElementById('sorteo-root');
  if(root.parentElement!==document.body) document.body.appendChild(root);
  root.classList.add('active');
  document.body.style.overflow='hidden';
  document.getElementById('sr-loading').style.display='none';
  document.getElementById('sr-empty').classList.remove('show');
  document.getElementById('sr-winnerBanner').classList.remove('show');
  srClosePanel();
  document.getElementById('sr-event-name').textContent=title||'Sorteo rápido';
  document.getElementById('sr-event-meta').textContent=meta||'';
  srSpinning=false; srRotation=0;
  srSetup(lista);
}

function srSetup(lista) {
  srData=lista.map(function(r){
    var fn=(r.first_name||'?').trim().split(/\s+/);
    var shortName=fn[0];
    if(fn[1]) shortName+=' '+fn[1].charAt(0)+'.';
    return { pid:r.id||null, display:shortName.toUpperCase(), nombre:(r.first_name||'').toUpperCase(), nombreOriginal:(r.first_name||'').trim(), telefono:r.phone||'', company:r.company||'' };
  });
  srOriginal=srData.slice();
  srRebuildWheel();
  srCanvas=document.getElementById('sr-wheelCanvas');srCtx=srCanvas.getContext('2d');
  srResizeCanvas();
  if(!srResizeBound){
    srResizeBound=true;
    window.addEventListener('resize',srResizeCanvas);
    window.addEventListener('orientationchange',function(){setTimeout(srResizeCanvas,250);});
    if(window.visualViewport)window.visualViewport.addEventListener('resize',srResizeCanvas);
  }
  if(!srLoopStarted){ srLoopStarted=true; requestAnimationFrame(srAnimate); }
}

function srEscHtml(t){var d=document.createElement('div');d.textContent=t==null?'':String(t);return d.innerHTML;}

function srRebuildWheel() {
  srNames=srData.map(function(d){return d.display;});
  srLastActive=-1;
  document.getElementById('sr-count').textContent=srNames.length;
  var btn=document.getElementById('sr-spinBtn');
  btn.disabled=srNames.length<2; btn.textContent='GIRAR';
  var big=document.getElementById('sr-bigName');
  big.style.fontSize='';
  big.textContent=srNames.length>=2?(srNames[0]||'---'):(srNames.length===1?'SOLO QUEDA '+srNames[0]:'SIN PARTICIPANTES');
  var listEl=document.getElementById('sr-panel-list');
  listEl.innerHTML=srData.map(function(p,i){return'<div class="sr-participant-row"><span class="p-num">'+(i+1)+'</span><span class="p-name">'+srEscHtml(p.nombre)+'</span><span class="p-phone">'+srEscHtml(p.telefono)+'</span></div>';}).join('');
  document.getElementById('sr-panel-footer').textContent=srData.length+' participante'+(srData.length!==1?'s':'')+' en el sorteo';
}

function srIsMobile(){ return window.innerWidth<=768 || (window.innerWidth<window.innerHeight && window.innerWidth<=1024); }

function srFormatDate(d){if(!d)return'';var parts=d.split('-');var months=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];return parseInt(parts[2])+' '+months[parseInt(parts[1])-1]+' '+parts[0];}

function srResizeCanvas(){if(!srCanvas)return;var mob=srIsMobile();document.getElementById('sorteo-root').classList.toggle('sr-mobile',mob);srCssSize=mob?Math.min(window.innerWidth*0.86,window.innerHeight*0.46):Math.min(window.innerHeight*0.85,window.innerHeight-160,window.innerWidth*0.5);srCssSize=Math.max(srCssSize,200);srDPR=window.devicePixelRatio||1;srCanvas.style.width=srCssSize+'px';srCanvas.style.height=srCssSize+'px';srCanvas.width=srCssSize*srDPR;srCanvas.height=srCssSize*srDPR;srCtx.scale(srDPR,srDPR);}

function srDraw(){if(!srCtx)return;var S=srCssSize;srCtx.clearRect(0,0,S,S);var cx=S/2,cy=S/2,outerR=S*0.495,innerR=S*0.25;var rg=srCtx.createRadialGradient(cx,cy,innerR*0.6,cx,cy,outerR);rg.addColorStop(0,'#2d85b8');rg.addColorStop(0.5,'#3a9cd4');rg.addColorStop(1,'#4aabdf');srCtx.beginPath();srCtx.arc(cx,cy,outerR,0,Math.PI*2);srCtx.fillStyle=rg;srCtx.fill();var ig=srCtx.createRadialGradient(cx,cy,0,cx,cy,innerR);ig.addColorStop(0,'#1e2e78');ig.addColorStop(1,'#111c55');srCtx.beginPath();srCtx.arc(cx,cy,innerR,0,Math.PI*2);srCtx.fillStyle=ig;srCtx.fill();srDrawNames(cx,cy);}

function srDrawNames(cx,cy){var n=srNames.length;if(n===0)return;var S=srCssSize,innerR=S*0.25,outerR=S*0.495,sliceDeg=360/n,textStartX=innerR+10,textEndX=outerR-8,espacioDisponible=textEndX-textStartX,midR=(innerR+outerR)/2,arcAtMid=(2*Math.PI*midR)/n,maxByArc=arcAtMid*0.65,longest=srNames.reduce(function(a,b){return a.length>=b.length?a:b;},''),fontSize=Math.min(maxByArc,60);fontSize=Math.max(fontSize,12);var mc=document.createElement('canvas').getContext('2d');while(fontSize>12){mc.font='800 '+fontSize+'px Barlow Condensed, sans-serif';if(mc.measureText(longest).width<=espacioDisponible)break;fontSize-=0.5;}srCtx.save();srCtx.font='800 '+fontSize+'px Barlow Condensed, sans-serif';var newActive=srLastActive;for(var i=0;i<n;i++){var angleDeg=srRotation+i*sliceDeg,angleRad=angleDeg*Math.PI/180,normDeg=((angleDeg%360)+360)%360,halfSlice=sliceDeg/2,isActive=normDeg<halfSlice||normDeg>360-halfSlice,distDeg=Math.min(normDeg,360-normDeg),proximity=Math.pow(1-Math.min(distDeg/100,1),1.4);srCtx.save();srCtx.translate(cx,cy);srCtx.rotate(angleRad);srCtx.textAlign='left';srCtx.textBaseline='middle';if(isActive){srCtx.fillStyle='#ffffff';srCtx.shadowColor='#ffffff';srCtx.shadowBlur=14;newActive=i;}else{var alpha=0.32+0.55*proximity;srCtx.fillStyle='rgba(255,255,255,'+alpha+')';srCtx.shadowBlur=0;}srCtx.fillText(srNames[i],textStartX,0,espacioDisponible);srCtx.restore();}srCtx.restore();if(newActive!==srLastActive&&newActive>=0){srLastActive=newActive;srSetDisplayName(srNames[newActive]);}}

function srMeasureText(text,fs){var mc=document.createElement('canvas').getContext('2d');mc.font='900 '+fs+'px Barlow Condensed, sans-serif';return mc.measureText(text).width;}

function srSetDisplayName(name){var el=document.getElementById('sr-bigName');if(!el||el.textContent===name)return;el.textContent=name;requestAnimationFrame(function(){var col=el.parentElement,cs=getComputedStyle(col),maxW=col.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),fs=parseFloat(getComputedStyle(el).fontSize);while(fs>28&&srMeasureText(name,fs)>maxW)fs-=2;el.style.fontSize=fs+'px';});}

// Numero aleatorio seguro (crypto) para que el sorteo sea justo
function srRandomInt(n){ try{ var a=new Uint32Array(1), lim=Math.floor(4294967296/n)*n, v; do{ crypto.getRandomValues(a); v=a[0]; }while(v>=lim); return v%n; }catch(e){ return Math.floor(Math.random()*n); } }

function easeOutQuint(t){return 1-Math.pow(1-t,5);}

function srAnimate(ts){if(srSpinning){if(!srSpinStart)srSpinStart=ts;var elapsed=ts-srSpinStart,progress=Math.min(elapsed/srSpinDur,1);srRotation=srSpinFrom+(srSpinTo-srSpinFrom)*easeOutQuint(progress);if(progress>=1){srRotation=srSpinTo;srSpinning=false;srSpinStart=null;srOnSpinEnd();}}srDraw();requestAnimationFrame(srAnimate);}

function srOnSpinEnd(){document.getElementById('sr-spinBtn').disabled=false;document.getElementById('sr-spinBtn').textContent='GIRAR';var el=document.getElementById('sr-bigName');el.classList.remove('winner-flash');void el.offsetWidth;el.classList.add('winner-flash');el.addEventListener('animationend',function(){el.classList.remove('winner-flash');},{once:true});var d=srData[srWinnerIdx];document.getElementById('sr-winnerName').textContent=d?d.nombre:srNames[srWinnerIdx];document.getElementById('sr-winnerPhone').textContent=d&&d.telefono?d.telefono:'';document.getElementById('sr-winnerCompany').textContent=d&&d.company?d.company.toUpperCase():'';setTimeout(function(){document.getElementById('sr-winnerBanner').classList.add('show');srLaunchConfetti();},600);srPendingRemoval=srRemoveWinner;if(srOnWinner&&d){try{srOnWinner(d);}catch(e){console.error(e);}}}

function srStartSpin(){if(srSpinning||srNames.length<2||srLinkExpired)return;if(srRemoteDraw){srRemoteSpin();return;}srSpinToIndex(srRandomInt(srNames.length));}
function srSpinToIndex(idx){srSpinning=true;srLastActive=-1;srWinnerIdx=idx;var n=srNames.length,sliceDeg=360/n,targetMod=((-(srWinnerIdx*sliceDeg))%360+360)%360,currentMod=(srRotation%360+360)%360,delta=(targetMod-currentMod+360)%360;if(delta<sliceDeg)delta+=360;srSpinFrom=srRotation;srSpinTo=srRotation+delta+360*(6+Math.floor(Math.random()*5));srSpinDur=5200+Math.random()*2600;srSpinStart=null;var btn=document.getElementById('sr-spinBtn');btn.disabled=true;btn.textContent='Girando...';}
async function srRemoteSpin(){
  var btn=document.getElementById('sr-spinBtn');
  srSpinning=true; btn.disabled=true; btn.textContent='Sorteando...';
  var res; try{ res=await srRemoteDraw(); }catch(e){ res={ok:false,code:'error'}; }
  srSpinning=false;
  if(!res||!res.ok){
    btn.disabled=false; btn.textContent='GIRAR';
    var m=srLinkMsg(res&&res.code);
    if(res&&(res.code==='expired'||res.code==='invalid')){ srLinkExpired=true; if(srLinkTimer)clearInterval(srLinkTimer); srShowEmpty(m[0],m[1]); }
    else if(res&&res.code==='empty'){ srShowEmpty(m[0],m[1]); }
    else alert('No se pudo sortear. Revisa la conexion e intenta de nuevo.');
    return;
  }
  var idx=-1;
  for(var i=0;i<srData.length;i++){ if(String(srData[i].pid)===String(res.participant_id)){ idx=i; break; } }
  if(idx<0){
    var fn=(res.nombre||'?').trim().split(/\s+/), sn=fn[0]+(fn[1]?' '+fn[1].charAt(0)+'.':'');
    srData.push({pid:res.participant_id,display:sn.toUpperCase(),nombre:(res.nombre||'').toUpperCase(),nombreOriginal:res.nombre,telefono:res.telefono||'',company:res.empresa||''});
    srRebuildWheel(); idx=srData.length-1;
  }
  srSpinToIndex(idx);
}

function srReset(){if(srSpinning)return;srPendingRemoval=false;if(!srPersist&&srRemoveWinner&&srOriginal.length){srData=srOriginal.slice();srRebuildWheel();}srRotation=0;srLastActive=-1;var el=document.getElementById('sr-bigName');el.textContent=srNames.length?srNames[0]:'---';el.style.fontSize='';document.getElementById('sr-winnerBanner').classList.remove('show');}

function srLaunchConfetti(){if(typeof confetti==='undefined')return;var colors=['#45d636','#4aabdf','#ffffff','#ffd700','#ff6b6b'],end=Date.now()+4500;(function frame(){confetti({particleCount:4,angle:60,spread:65,startVelocity:55,origin:{x:0,y:0.6},colors:colors,zIndex:9200});confetti({particleCount:4,angle:120,spread:65,startVelocity:55,origin:{x:1,y:0.6},colors:colors,zIndex:9200});if(Date.now()<end)requestAnimationFrame(frame);})();}

function srDismissBanner(){
  document.getElementById('sr-winnerBanner').classList.remove('show');
  if(srPendingRemoval&&srWinnerIdx>=0&&srWinnerIdx<srData.length){
    srPendingRemoval=false;
    srData.splice(srWinnerIdx,1);
    srWinnerIdx=-1;
    srRebuildWheel();
  }
}
function srCheckLinkExpired(){ if(srLinkExpired&&!srSpinning){ if(srLinkTimer)clearInterval(srLinkTimer); var m=srLinkMsg('expired'); srShowEmpty(m[0],m[1]); return true; } return false; }
function srDismissAndSpin(){srDismissBanner();if(srCheckLinkExpired())return;if(srNames.length>=2)setTimeout(srStartSpin,300);}
function srOpenPanel(){document.getElementById('sr-panel').classList.add('open');document.getElementById('sr-panelOverlay').classList.add('show');}
function srClosePanel(){document.getElementById('sr-panel').classList.remove('open');document.getElementById('sr-panelOverlay').classList.remove('show');}
function closeSorteo(){
  if(!srLocalMode){window.close();return;}
  srSpinning=false;srSpinStart=null;srPendingRemoval=false;
  document.getElementById('sr-winnerBanner').classList.remove('show');
  srClosePanel();
  document.getElementById('sorteo-root').classList.remove('active');
  document.body.style.overflow='';
}

document.getElementById('sr-spinBtn').addEventListener('click',srStartSpin);
document.getElementById('sr-resetBtn').addEventListener('click',srReset);
document.getElementById('sr-listBtn').addEventListener('click',srOpenPanel);
document.getElementById('sr-panelOverlay').addEventListener('click',srClosePanel);
document.getElementById('sr-wheelCanvas').addEventListener('click',srStartSpin);
document.addEventListener('keydown',function(e){
  if(!document.getElementById('sorteo-root').classList.contains('active'))return;
  if(e.key==='Escape'){
    if(document.getElementById('sr-winnerBanner').classList.contains('show'))srDismissBanner();
    else if(document.getElementById('sr-panel').classList.contains('open'))srClosePanel();
    else if(srLocalMode)closeSorteo();
  }
});
