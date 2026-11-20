/* Comagro Eventos - sorteo.js
   Ruleta de sorteo (por evento y sorteo rapido) */

(function() {
  var params = new URLSearchParams(window.location.search);
  var sorteoId = params.get('sorteo');
  if (sorteoId) {
    document.addEventListener('DOMContentLoaded', function() {
      document.getElementById('ce-loading').style.display='none';
      document.getElementById('ce-root').style.display='none';
      document.body.appendChild(document.getElementById('sorteo-root'));
      initSorteo(sorteoId);
    });
    if (document.readyState !== 'loading') {
      document.getElementById('ce-loading').style.display='none';
      document.getElementById('ce-root').style.display='none';
      document.body.appendChild(document.getElementById('sorteo-root'));
      initSorteo(sorteoId);
    }
  }
})();

function abrirSorteo() { if (!currentEventId) return; var baseUrl=window.location.href.split('?')[0].split('#')[0]; window.open(baseUrl+'?sorteo='+currentEventId,'_blank','width=1280,height=800'); }

var srNames=[],srData=[],srOriginal=[],srRotation=0,srSpinning=false,srLastActive=-1,srSpinFrom=0,srSpinTo=0,srSpinDur=5500,srSpinStart=null,srWinnerIdx=-1,srCssSize=400,srDPR=1,srCanvas,srCtx;
var srLocalMode=false,srRemoveWinner=false,srPendingRemoval=false,srLoopStarted=false,srResizeBound=false;

async function initSorteo(evId) {
  srLocalMode=false;
  document.getElementById('sorteo-root').classList.add('active');
  document.getElementById('sr-loading').style.display='flex';
  document.getElementById('sr-empty').classList.remove('show');
  var sbLocal=(typeof sb!=='undefined')?sb:supabase.createClient('https://itylpvuzflqlmmqvdhbz.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0eWxwdnV6ZmxxbG1tcXZkaGJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNjYzMTgsImV4cCI6MjA5MTg0MjMxOH0.yuZ5sWX-Isxd04ySP_ZgDLit1fQDsxoeb25GmU_C_5I');
  var evResult=await sbLocal.from('events').select('*').eq('id',evId).single();
  var ev=evResult.data;
  if(ev){document.getElementById('sr-event-name').textContent=ev.name;document.getElementById('sr-event-meta').textContent=(ev.type?ev.type.charAt(0).toUpperCase()+ev.type.slice(1):'Evento')+' - '+srFormatDate(ev.date)+(ev.time?' - '+ev.time:'')+(ev.location?' - '+ev.location:'');document.title='Sorteo | '+ev.name;}
  var regsResult=await sbLocal.from('registrations').select('*').eq('event_id',evId).eq('status','presente');
  var lista=regsResult.data||[];
  document.getElementById('sr-loading').style.display='none';
  if(lista.length<2){document.getElementById('sr-empty').classList.add('show');document.querySelector('#sr-empty p').textContent=lista.length===0?'No hay inscriptos marcados como presentes en este evento.':'Se necesitan al menos 2 participantes para hacer el sorteo.';return;}
  srSetup(lista);
}

// Abre el sorteo en la misma pagina con una lista local (Sorteo rapido)
function openLocalSorteo(lista, title, meta, removeWinner) {
  srLocalMode=true; srRemoveWinner=!!removeWinner; srPendingRemoval=false;
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
    return { display:shortName.toUpperCase(), nombre:(r.first_name||'').toUpperCase(), telefono:r.phone||'', company:r.company||'' };
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

function easeOutQuint(t){return 1-Math.pow(1-t,5);}

function srAnimate(ts){if(srSpinning){if(!srSpinStart)srSpinStart=ts;var elapsed=ts-srSpinStart,progress=Math.min(elapsed/srSpinDur,1);srRotation=srSpinFrom+(srSpinTo-srSpinFrom)*easeOutQuint(progress);if(progress>=1){srRotation=srSpinTo;srSpinning=false;srSpinStart=null;srOnSpinEnd();}}srDraw();requestAnimationFrame(srAnimate);}

function srOnSpinEnd(){document.getElementById('sr-spinBtn').disabled=false;document.getElementById('sr-spinBtn').textContent='GIRAR';var el=document.getElementById('sr-bigName');el.classList.remove('winner-flash');void el.offsetWidth;el.classList.add('winner-flash');el.addEventListener('animationend',function(){el.classList.remove('winner-flash');},{once:true});var d=srData[srWinnerIdx];document.getElementById('sr-winnerName').textContent=d?d.nombre:srNames[srWinnerIdx];document.getElementById('sr-winnerPhone').textContent=d&&d.telefono?d.telefono:'';document.getElementById('sr-winnerCompany').textContent=d&&d.company?d.company.toUpperCase():'';setTimeout(function(){document.getElementById('sr-winnerBanner').classList.add('show');srLaunchConfetti();},600);srPendingRemoval=srRemoveWinner;}

function srStartSpin(){if(srSpinning||srNames.length<2)return;srSpinning=true;srLastActive=-1;srWinnerIdx=Math.floor(Math.random()*srNames.length);var n=srNames.length,sliceDeg=360/n,targetMod=((-(srWinnerIdx*sliceDeg))%360+360)%360,currentMod=(srRotation%360+360)%360,delta=(targetMod-currentMod+360)%360;if(delta<sliceDeg)delta+=360;srSpinFrom=srRotation;srSpinTo=srRotation+delta+360*(6+Math.floor(Math.random()*5));srSpinDur=5200+Math.random()*2600;srSpinStart=null;var btn=document.getElementById('sr-spinBtn');btn.disabled=true;btn.textContent='Girando...';}

function srReset(){if(srSpinning)return;srPendingRemoval=false;if(srRemoveWinner&&srOriginal.length){srData=srOriginal.slice();srRebuildWheel();}srRotation=0;srLastActive=-1;var el=document.getElementById('sr-bigName');el.textContent=srNames.length?srNames[0]:'---';el.style.fontSize='';document.getElementById('sr-winnerBanner').classList.remove('show');}

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
function srDismissAndSpin(){srDismissBanner();if(srNames.length>=2)setTimeout(srStartSpin,300);}
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
