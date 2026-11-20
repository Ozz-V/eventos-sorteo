/* Comagro Eventos - reportes.js
   Informes, graficos, PDF y pausar inscripciones */

// REPORTES
async function renderReportCards() {
  const { data: events } = await sb.from('events').select('*').order('date', { ascending: false });
  allEvents = events || [];
  const activeEvents = allEvents.filter(e => e.status !== 'eliminado');
  const { data: regs } = await sb.from('registrations').select('id, status, event_id');
  const grid = document.getElementById('report-cards-grid');
  if (activeEvents.length === 0) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><i data-lucide="bar-chart-2"></i><h4>No hay eventos todavia</h4><p>Crea un evento para ver reportes.</p></div>';
    lucide.createIcons(); return;
  }
  grid.innerHTML = activeEvents.map(ev => {
    const evRegs = regs ? regs.filter(r => String(r.event_id) === String(ev.id)) : [];
    const presentes = evRegs.filter(r => r.status === 'presente').length;
    const pct = evRegs.length > 0 ? Math.round((presentes/evRegs.length)*100) : 0;
    const status = getEventStatus(ev);
    return '<div class="report-event-card" onclick="openReportDetail(\''+ev.id+'\')">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">' +
      '<span class="badge badge-navy" style="text-transform:capitalize;font-size:10px;">'+esc(ev.type||'Evento')+'</span>'+statusBadge(status)+
      '</div><h4>'+esc(ev.name)+'</h4><p>'+formatDate(ev.date)+(ev.location?' &middot; '+esc(ev.location):'')+'</p>' +
      '<div class="report-stat-mini">' +
      '<div class="report-stat-mini-item"><div class="val">'+evRegs.length+'</div><div class="lbl">Inscriptos</div></div>' +
      '<div class="report-stat-mini-item"><div class="val" style="color:var(--green);">'+presentes+'</div><div class="lbl">Presentes</div></div>' +
      '<div class="report-stat-mini-item"><div class="val" style="color:var(--gold);">'+pct+'%</div><div class="lbl">Asistencia</div></div>' +
      '</div></div>';
  }).join('');
  lucide.createIcons();
}

async function openReportDetail(evId) {
  const ev = allEvents.find(x => x.id == evId);
  if (!ev) return;
  document.getElementById('rep-ev-name').textContent = ev.name;
  document.getElementById('rep-ev-meta').textContent = (ev.type||'Evento')+' \u00b7 '+formatDate(ev.date)+(ev.time?' \u00b7 '+ev.time:'')+(ev.location?' \u00b7 '+ev.location:'');

  currentReportEvId = ev.id;
  const btnPause = document.getElementById('btn-pause-event');
  if (ev.status === 'pausado') {
    btnPause.innerHTML = '<i data-lucide="play"></i> Reanudar Inscripciones';
    btnPause.className = 'btn btn-success btn-sm';
  } else {
    btnPause.innerHTML = '<i data-lucide="pause"></i> Pausar Inscripciones';
    btnPause.className = 'btn btn-warning btn-sm';
  }

  document.getElementById('topbar-title').textContent = 'Reporte: ' + ev.name;
  document.getElementById('topbar-sub').textContent = 'Analisis detallado del evento';

  const { data: regs } = await sb.from('registrations').select('*').eq('event_id', evId).order('registered_at');
  const rList = regs || [];
  const presentes = rList.filter(r => r.status === 'presente').length;
  const ausentes = rList.length - presentes;
  const pct = rList.length > 0 ? Math.round((presentes/rList.length)*100) : 0;

  document.getElementById('rep-stat-total').textContent = rList.length;
  document.getElementById('rep-stat-presentes').textContent = presentes;
  document.getElementById('rep-stat-pct').textContent = pct + '%';
  document.getElementById('rep-stat-ausentes').textContent = ausentes;

  Object.values(reportCharts).forEach(c => c.destroy());
  reportCharts = {};

  const ctx1 = document.getElementById('chart-asistencia').getContext('2d');
  reportCharts.asistencia = new Chart(ctx1, {
    type: 'doughnut',
    data: { labels: ['Presentes', 'Ausentes'], datasets: [{ data: [presentes, ausentes], backgroundColor: ['#2d9e5f','#e2e0d8'], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });

  const hoursMap = {};
  rList.forEach(r => { if (!r.registered_at) return; const h = new Date(r.registered_at).getHours(); hoursMap[h] = (hoursMap[h]||0) + 1; });
  const hours = Object.keys(hoursMap).sort((a,b)=>a-b);
  const ctx2 = document.getElementById('chart-horas').getContext('2d');
  reportCharts.horas = new Chart(ctx2, {
    type: 'bar',
    data: { labels: hours.map(h => h+':00'), datasets: [{ label: 'Registros', data: hours.map(h => hoursMap[h]), backgroundColor: '#1a3a8a', borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
  });

  const { data: budgetItems } = await sb.from('event_budget_items').select('*').eq('event_id', evId);
  const bItems = budgetItems || [];
  const budget = ev.budget || 0;
  const spent = bItems.reduce((s,i) => s+Number(i.monto), 0);

  if (budget > 0 || bItems.length > 0) {
    document.getElementById('rep-budget-section').style.display = '';
    const bPct = budget > 0 ? Math.min((spent/budget)*100,100) : 0;
    document.getElementById('rep-budget-spent').textContent = 'Gs. ' + fmtNum(spent) + ' gastados';
    document.getElementById('rep-budget-pct').textContent = budget > 0 ? Math.round(bPct)+'%' : '-';
    document.getElementById('rep-budget-remaining').textContent = budget > 0 ? 'Gs. '+fmtNum(Math.max(budget-spent,0))+' disponibles' : '';
    const rb = document.getElementById('rep-budget-bar');
    rb.style.width = bPct + '%';
    rb.className = 'budget-bar-fill' + (bPct>=100?' danger':bPct>=75?' warning':'');
    const ctx3 = document.getElementById('chart-budget').getContext('2d');
    reportCharts.budget = new Chart(ctx3, {
      type: 'bar',
      data: { labels: ['Presupuesto', 'Gastado', 'Disponible'], datasets: [{ data: [budget, spent, Math.max(budget-spent,0)], backgroundColor: ['#eef2fb','#dc2626','#2d9e5f'], borderRadius: 6 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
    const repBudgetTbody = document.querySelector('#rep-budget-table tbody');
    repBudgetTbody.innerHTML = bItems.map(i => '<tr><td>'+esc(i.concepto)+'</td><td style="text-align:right;font-weight:600;">Gs. '+fmtNum(i.monto)+'</td></tr>').join('') +
      '<tr style="background:#fafaf8;"><td style="font-weight:700;">TOTAL</td><td style="text-align:right;font-weight:700;">Gs. '+fmtNum(spent)+'</td></tr>';
  } else {
    document.getElementById('rep-budget-section').style.display = 'none';
  }

  const repTbody = document.querySelector('#rep-tbl-regs tbody');
  repTbody.innerHTML = rList.length === 0
    ? '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--muted);">Sin inscriptos</td></tr>'
    : rList.map(r => '<tr><td><code>'+(r.short_id||'-')+'</code></td><td><strong>'+esc(r.first_name||'')+'</strong></td><td style="font-size:12px;">'+esc(r.email||'-')+'</td><td style="font-size:12px;">'+esc(r.company||'-')+'</td><td>'+(r.status==='presente'?'<span class="badge badge-presente">PRESENTE</span>':'<span class="badge badge-pendiente">PENDIENTE</span>')+'</td><td style="font-size:12px;">'+formatDateTime(r.registered_at)+'</td></tr>').join('');

  window._repData = { ev, rList, presentes, ausentes, pct, budget, spent, bItems };
  switchView('reporte-detalle');
  lucide.createIcons();
}

// EXPORTAR PDF
async function exportReportPDF() {
  const d = window._repData;
  if (!d) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const navy = [13,35,89], green = [45,158,95], gold = [200,169,110], light = [238,242,251], muted = [107,114,128];
  doc.setFillColor(...navy); doc.rect(0,0,210,38,'F');
  doc.setTextColor(255,255,255); doc.setFontSize(18); doc.setFont('helvetica','bold'); doc.text('REPORTE DE EVENTO',20,18);
  doc.setFontSize(11); doc.setFont('helvetica','normal'); doc.text(d.ev.name,20,27);
  doc.setFontSize(9); doc.text(formatDate(d.ev.date)+(d.ev.time?' \u00b7 '+d.ev.time:'')+(d.ev.location?' \u00b7 '+d.ev.location:''),20,34);
  doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.text('COMAGRO',190,22,{align:'right'});
  let y = 50;
  const boxes = [{label:'INSCRIPTOS',value:String(d.rList.length),color:navy},{label:'PRESENTES',value:String(d.presentes),color:green},{label:'ASISTENCIA',value:d.pct+'%',color:gold},{label:'AUSENTES',value:String(d.ausentes),color:muted}];
  boxes.forEach((b,i) => {
    const x = 15+i*46; doc.setFillColor(...light); doc.roundedRect(x,y,42,22,3,3,'F');
    doc.setTextColor(...b.color); doc.setFontSize(16); doc.setFont('helvetica','bold'); doc.text(b.value,x+21,y+12,{align:'center'});
    doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(...muted); doc.text(b.label,x+21,y+18,{align:'center'});
  });
  y += 30;
  if (d.budget > 0 || d.bItems.length > 0) {
    doc.setTextColor(...navy); doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.text('PRESUPUESTO',15,y); y+=6;
    doc.setFillColor(...light); doc.roundedRect(15,y,180,14,3,3,'F');
    doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(...navy);
    doc.text('Total asignado: Gs. '+fmtNum(d.budget),20,y+6);
    doc.text('Gastado: Gs. '+fmtNum(d.spent),85,y+6);
    const pctB = d.budget > 0 ? Math.round((d.spent/d.budget)*100) : 0;
    doc.text('Disponible: Gs. '+fmtNum(Math.max(d.budget-d.spent,0))+'  ('+pctB+'%)',140,y+6);
    y+=20;
    if (d.bItems.length > 0) {
      doc.autoTable({ startY:y, head:[['Concepto','Monto (Gs.)']], body:[...d.bItems.map(i=>[i.concepto,'Gs. '+fmtNum(i.monto)]),['TOTAL','Gs. '+fmtNum(d.spent)]], theme:'grid', headStyles:{fillColor:navy,textColor:255,fontSize:9}, bodyStyles:{fontSize:9}, margin:{left:15,right:15}, columnStyles:{1:{halign:'right'}} });
      y = doc.lastAutoTable.finalY + 10;
    }
  }
  doc.setTextColor(...navy); doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.text('LISTA DE INSCRIPTOS',15,y); y+=4;
  doc.autoTable({ startY:y, head:[['ID','Nombre','Email','Empresa','Estado','Registro']], body:d.rList.map(r=>[r.short_id||'-',(r.first_name||''),r.email||'-',r.company||'-',r.status==='presente'?'PRESENTE':'PENDIENTE',formatDateTime(r.registered_at)]), theme:'striped', headStyles:{fillColor:navy,textColor:255,fontSize:8}, bodyStyles:{fontSize:7.5}, margin:{left:15,right:15}, didParseCell:(data)=>{ if(data.section==='body'&&data.column.index===4){data.cell.styles.textColor=data.cell.raw==='PRESENTE'?green:muted;} } });
  const pageCount = doc.internal.getNumberOfPages();
  for (let i=1;i<=pageCount;i++) { doc.setPage(i); doc.setFillColor(...light); doc.rect(0,285,210,12,'F'); doc.setTextColor(...muted); doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.text('Comagro S.A. - Reporte generado el '+new Date().toLocaleString('es-PY'),15,292); doc.text('Pagina '+i+' de '+pageCount,195,292,{align:'right'}); }
  const cleanName = d.ev.name.replace(/[\/\\?%*:|"<>]/g,'-');
  doc.save('Comagro_Reporte_'+cleanName+'.pdf');
  showToast('PDF generado exitosamente', 'success');
}

let currentReportEvId = null;
async function togglePauseEvent() {
  if (!currentReportEvId) return;
  const ev = allEvents.find(x => x.id == currentReportEvId);
  if (!ev) return;

  const newStatus = ev.status === 'pausado' ? 'activo' : 'pausado';
  const actionText = newStatus === 'pausado' ? 'Pausar' : 'Reanudar';

  const { error } = await sb.from('events').update({ status: newStatus }).eq('id', currentReportEvId);
  if (!error) {
    showToast('Inscripciones ' + (newStatus === 'pausado' ? 'pausadas' : 'reanudadas'), 'success');
    const { data } = await sb.from('events').select('*').order('date', { ascending: false });
    allEvents = data || [];
    openReportDetail(currentReportEvId);
    renderEventsGrid();
  } else {
    showToast('Error al ' + actionText.toLowerCase(), 'error');
  }
}
