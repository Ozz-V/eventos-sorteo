/* Comagro Eventos - gestion.js
   Gestion de inscriptos, check-in, carga manual, editar/eliminar, exportar Excel */

// GESTION EVENTO
async function manageEvent(id) {
  currentEventId = id;
  const ev = allEvents.find(x => x.id == id);
  if (!ev) return;
  currentEventData = ev;

  document.getElementById('cur-ev-name').textContent = ev.name;
  const fmtT = (t) => t ? t.substring(0,5) : '';
  let gridTimes = [];
  if (ev.time) gridTimes.push(ev.end_time ? `${fmtT(ev.time)} a ${fmtT(ev.end_time)}` : fmtT(ev.time));
  if (ev.extra_times && Array.isArray(ev.extra_times)) {
    ev.extra_times.forEach(t => {
      if (t.start) gridTimes.push(t.end ? `${fmtT(t.start)} a ${fmtT(t.end)}` : fmtT(t.start));
    });
  }
  const timeDisplay = gridTimes.length > 0 ? gridTimes.join(', ') : '';

  document.getElementById('cur-ev-meta').textContent = (ev.type||'Evento')+' \u00b7 '+formatDate(ev.date)+(timeDisplay ? ' \u00b7 '+timeDisplay : '')+(ev.location?' \u00b7 '+ev.location:'');
  document.getElementById('topbar-title').textContent = ev.name;
  document.getElementById('topbar-sub').textContent = 'Gestion de inscriptos';

  switchView('gestion');

  const { data: shifts } = await sb.from('event_shifts').select('*').eq('event_id', id).order('date', { ascending: true }).order('start_time', { ascending: true });
  currentEventShifts = shifts || [];
  currentShiftFilter = null;
  renderShiftsTabs();
  updateManualShiftDropdown();

  loadRegistrations(id);
  loadBudgetInline(id);

  if (realtimeChannel) sb.removeChannel(realtimeChannel);
  realtimeChannel = sb.channel('regs-' + id)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations', filter: 'event_id=eq.'+id }, () => loadRegistrations(id))
    .subscribe();

  lucide.createIcons();
}

// CAMBIO 2: renderShiftsTabs con nuevo diseño de botones con colores
function renderShiftsTabs() {
  const container = document.getElementById('shifts-tabs-container');
  if (currentEventShifts.length === 0) {
    container.style.display = 'none';
    return;
  }
  container.style.display = 'flex';

  const totalCount = currentRegs ? currentRegs.length : 0;

  // Botón TODOS
  let html = `<button class="shift-tab-btn ${currentShiftFilter === null ? 'active-all' : ''}" onclick="setShiftFilter(null)">
    <span class="tab-dot"></span>
    Todos <span style="opacity:0.7;font-size:0.9em;margin-left:4px;">(${totalCount})</span>
  </button>`;

  // Los turnos ya vienen ordenados por date + start_time desde la query
  currentEventShifts.forEach(s => {
    const isActive = currentShiftFilter === s.id;
    const shiftCount = currentRegs ? currentRegs.filter(r => r.shift_id === s.id).length : 0;
    html += `<button class="shift-tab-btn ${isActive ? 'active-shift' : ''}" onclick="setShiftFilter('${s.id}')">
      <span class="tab-dot"></span>
      ${esc(s.name)} <span style="opacity:0.7;font-size:0.9em;margin-left:4px;">(${shiftCount})</span>
    </button>`;
  });

  container.innerHTML = html;
}

function setShiftFilter(shiftId) {
  currentShiftFilter = shiftId;
  renderShiftsTabs();
  renderRegsTable();
}

function updateManualShiftDropdown() {
  const wrap = document.getElementById('m-shift-wrap');
  const select = document.getElementById('m-shift');
  if (currentEventShifts.length === 0) {
    wrap.style.display = 'none';
    select.removeAttribute('required');
    select.innerHTML = '';
  } else {
    wrap.style.display = 'block';
    select.setAttribute('required', 'true');
    select.innerHTML = '<option value="">Selecciona un turno...</option>' + currentEventShifts.map(s => `<option value="${esc(s.id)}">${esc(s.name)} (${s.start_time.substring(0,5)} a ${s.end_time.substring(0,5)})</option>`).join('');
  }
}

async function loadRegistrations(eventId) {
  const { data, error } = await sb.from('registrations').select('*').eq('event_id', eventId).order('registered_at', { ascending: false });
  if (error) { showToast('Error cargando inscriptos: '+error.message, 'error'); return; }
  currentRegs = data || [];
  renderShiftsTabs();
  renderRegsTable();
}

function renderRegsTable(filter) {
  if (filter === undefined) { filter = document.getElementById('search-reg').value.trim(); }
  filter = filter || '';
  let filtered = filter
    ? currentRegs.filter(r => ((r.first_name||'')+' '+(r.company||'')).toLowerCase().includes(filter.toLowerCase()))
    : currentRegs;

  const statusFilter = document.getElementById('filter-status-reg').value;
  if (statusFilter === 'presente') {
    filtered = filtered.filter(r => r.status === 'presente');
  } else if (statusFilter === 'pendiente') {
    filtered = filtered.filter(r => r.status !== 'presente');
  }

  if (currentShiftFilter) {
    filtered = filtered.filter(r => r.shift_id === currentShiftFilter);
  }
  document.getElementById('reg-count-badge').textContent = currentRegs.length;
  const tbody = document.querySelector('#tbl-registrations tbody');
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:40px;color:var(--muted);">'+(filter?'Sin resultados para "'+filter+'"':'No hay inscriptos aun.')+'</td></tr>';
    return;
  }
  tbody.innerHTML = filtered.map(r => {
    let shiftBadge = '';
    if (currentEventShifts.length > 0) {
      const shift = currentEventShifts.find(s => s.id === r.shift_id);
      const shiftName = shift ? shift.name : 'Sin turno';
      shiftBadge = `<div style="display:inline-block; margin-top:4px; padding:2px 6px; background:#f0f5ff; border:1px solid #d0e1ff; border-radius:4px; color:var(--navy); font-size:9px; font-weight:600;">${esc(shiftName)}</div>`;
    }
    return '<tr><td><code>'+(r.short_id||'-')+'</code></td><td><div style="display:flex;align-items:center;gap:10px;"><div><div style="font-weight:600;color:var(--navy);font-size:14px;">'+esc(r.first_name||'')+'</div><div style="font-size:11px;color:var(--muted);">'+esc(r.email||'')+'</div><div style="font-size:10px;color:var(--green);font-weight:600;margin-top:2px;display:flex;align-items:center;gap:3px;"><i data-lucide="clock" style="width:10px;height:10px;"></i> '+formatDateTime(r.registered_at)+'</div>'+shiftBadge+'</div><button class="btn btn-ghost btn-sm" onclick="showRegDetails(\''+r.id+'\')" title="Ver detalles" style="padding:4px;height:auto;flex-shrink:0;"><i data-lucide="eye" style="width:14px;height:14px;"></i></button><button class="btn btn-ghost btn-sm" onclick="editReg(\''+r.id+'\')" title="Editar" style="padding:4px;height:auto;flex-shrink:0;"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button><button class="btn btn-ghost btn-sm" onclick="deleteReg(\''+r.id+'\')" title="Eliminar" style="padding:4px;height:auto;flex-shrink:0;color:#dc2626;"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button></div></td><td><span style="font-size:13px;">'+esc(r.company||'-')+'</span></td><td style="text-align:center;"><button class="badge badge-btn '+(r.status==='presente'?'badge-presente':'badge-pendiente')+'" onclick="toggleAttendance(\''+r.id+'\',\''+r.status+'\')" style="width:130px;justify-content:center;"><i data-lucide="'+(r.status==='presente'?'check-circle':'circle')+'" style="width:14px;height:14px;"></i>'+(r.status==='presente'?'PRESENTE':'PENDIENTE')+'</button></td></tr>';
  }).join('');
  lucide.createIcons();
}

function showRegDetails(regId) {
  const r = currentRegs.find(x => x.id == regId);
  if (!r) return;
  document.getElementById('reg-detail-content').innerHTML = '<div class="detail-grid"><div class="detail-item"><label>ID Unico</label><span>'+(r.short_id||'-')+'</span></div><div class="detail-item"><label>Estado</label><span class="badge '+(r.status==='presente'?'badge-presente':'badge-pendiente')+'">'+r.status.toUpperCase()+'</span></div><div class="detail-item" style="grid-column:span 2;"><label>Nombre Completo</label><span style="font-size:16px;font-weight:600;">'+esc(r.first_name||'')+'</span></div><div class="detail-item"><label>Email</label><span>'+esc(r.email||'-')+'</span></div><div class="detail-item"><label>Telefono</label><span>'+esc(r.phone||'-')+'</span></div><div class="detail-item"><label>Empresa</label><span>'+esc(r.company||'-')+'</span></div><div class="detail-item" style="grid-column:span 2;margin-top:10px;padding-top:10px;border-top:1px dashed var(--border);"><label>Fecha de Inscripcion</label><span style="color:var(--green);font-weight:600;display:flex;align-items:center;gap:5px;"><i data-lucide="calendar-check" style="width:14px;height:14px;"></i>'+formatDateTime(r.registered_at)+'</span></div></div>';
  document.getElementById('modal-reg-detail').classList.remove('hidden');
  lucide.createIcons();
}

function closeRegDetailModal() { document.getElementById('modal-reg-detail').classList.add('hidden'); }
document.getElementById('search-reg').addEventListener('input', e => renderRegsTable(e.target.value.trim()));
document.getElementById('filter-status-reg').addEventListener('change', () => renderRegsTable());

async function toggleAttendance(id, current) {
  const next = current === 'presente' ? 'pendiente' : 'presente';
  await sb.from('registrations').update({ status: next }).eq('id', id);
  loadRegistrations(currentEventId);
  showToast(next === 'presente' ? 'Check-in realizado' : 'Check-in deshecho', next === 'presente' ? 'success' : '');
}

document.getElementById('manual-reg-form').onsubmit = async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  const shortId = Math.random().toString(36).substring(2,8).toUpperCase();
  const { error } = await sb.from('registrations').insert([{
    event_id: currentEventId, 
    short_id: shortId,
    first_name: document.getElementById('m-fname').value.trim(),
    email: document.getElementById('m-email').value.trim(),
    phone: document.getElementById('m-phone').value.trim(),
    company: document.getElementById('m-comp').value.trim() || null,
    shift_id: document.getElementById('m-shift').value || null,
    status: 'pendiente', 
    registered_at: new Date().toISOString()
  }]);
  btn.disabled = false;
  if (!error) { e.target.reset(); loadRegistrations(currentEventId); showToast('Inscripto agregado', 'success'); }
  else showToast('Error: '+error.message, 'error');
};

    // EXPORTAR EXCEL
    function openExportModal() { document.getElementById('modal-export').classList.remove('hidden'); }
    function closeExportModal() { document.getElementById('modal-export').classList.add('hidden'); }

function exportToExcel() {
      try {
        const XLSX_LIB = window.XLSX || XLSX;
        if (!XLSX_LIB) { showToast('Libreria Excel no cargada', 'error'); return; }
        if (!currentRegs || currentRegs.length === 0) { showToast('No hay datos para exportar', 'error'); return; }

        const selectedCols = Array.from(document.querySelectorAll('#export-cols input:checked')).map(i => i.value);
        const ev = currentEventData || allEvents.find(x => x.id == currentEventId);

        const statusFilter = document.getElementById('export-status-filter').value;
        let regsToExport = currentRegs;
        if (statusFilter === 'presente') {
            regsToExport = currentRegs.filter(r => r.status === 'presente');
        } else if (statusFilter === 'pendiente') {
            regsToExport = currentRegs.filter(r => r.status !== 'presente');
        }

        if (regsToExport.length === 0) { showToast('No hay datos con ese filtro', 'error'); return; }
        const wb = XLSX_LIB.utils.book_new();

        function buildHeader(ev, shiftLabel) {
          const fmtT = (t) => t ? t.substring(0, 5) : '';
          let timeStr = '';
          if (shiftLabel) {
            timeStr = shiftLabel;
          } else {
            let times = [];
            if (ev.time) times.push(ev.end_time ? fmtT(ev.time) + ' a ' + fmtT(ev.end_time) + ' hs' : fmtT(ev.time) + ' hs');
            if (ev.extra_times && Array.isArray(ev.extra_times)) {
              ev.extra_times.forEach(t => { if (t.start) times.push(t.end ? fmtT(t.start) + ' a ' + fmtT(t.end) + ' hs' : fmtT(t.start) + ' hs'); });
            }
            timeStr = times.join(' | ') || '-';
          }
          return [
            ['Evento:', ev ? ev.name || '-' : '-'],
            ['Tipo:', ev ? ev.type || '-' : '-'],
            ['Fecha:', ev ? formatDate(ev.date) : '-'],
            ['Horario:', timeStr],
            ['Lugar:', ev && ev.location ? ev.location : '-'],
            [],
          ];
        }

        function buildRows(regs) {
          const colMap = { registered_at: 'Fecha Inscripcion', short_id: 'ID Unico', full_name: 'Nombre Completo', email: 'Correo', phone: 'Telefono', company: 'Empresa', status: 'Estado' };
          const headers = selectedCols.map(c => colMap[c] || c);
          const rows = regs.map(r => selectedCols.map(c => {
            if (c === 'registered_at') return formatDateTime(r.registered_at);
            if (c === 'short_id') return r.short_id || '';
            if (c === 'full_name') return r.first_name || '';
            if (c === 'email') return r.email || '';
            if (c === 'phone') return r.phone || '';
            if (c === 'company') return r.company || '';
            if (c === 'status') return r.status === 'presente' ? 'Presente' : 'Pendiente';
            return '';
          }));
          return [headers, ...rows];
        }

        function addSheet(wb, sheetName, headerRows, dataRows) {
          const allRows = [...headerRows, ...dataRows];
          const ws = XLSX_LIB.utils.aoa_to_sheet(allRows);
          const colWidths = allRows.reduce((acc, row) => {
            row.forEach((cell, i) => { const len = String(cell || '').length; if (!acc[i] || acc[i].wch < len) acc[i] = { wch: Math.min(len + 2, 50) }; });
            return acc;
          }, []);
          ws['!cols'] = colWidths;
          const safeName = sheetName.replace(/[\\\/\?\*\[\]]/g, '').substring(0, 31);
          XLSX_LIB.utils.book_append_sheet(wb, ws, safeName);
        }

        const rawName = ev ? ev.name : (document.getElementById('cur-ev-name').textContent || 'Evento');

        if (currentEventShifts.length > 0) {
          addSheet(wb, 'Todos', buildHeader(ev, null), buildRows(regsToExport));
          currentEventShifts.forEach(s => {
            const shiftRegs = regsToExport.filter(r => r.shift_id === s.id);
            const shiftTimeLabel = s.name + ': ' + s.start_time.substring(0,5) + ' a ' + s.end_time.substring(0,5) + ' hs' + (s.date ? ' (' + formatDate(s.date) + ')' : '');
            addSheet(wb, s.name, buildHeader(ev, shiftTimeLabel), buildRows(shiftRegs));
          });
        } else {
          addSheet(wb, 'Inscriptos', buildHeader(ev, null), buildRows(regsToExport));
        }

        const cleanName = rawName.trim().replace(/[\/\\?%*:|"<>]/g, '-');
        XLSX_LIB.writeFile(wb, 'Comagro_Reg_' + cleanName + '.xlsx');
        closeExportModal();
        showToast('Excel generado exitosamente', 'success');
      } catch (err) { showToast('Error: '+err.message, 'error'); }
    }

function editReg(regId) {
  const r = currentRegs.find(x => x.id == regId);
  if (!r) return;
  document.getElementById('reg-detail-content').innerHTML =
    '<form id="edit-reg-form" style="display:flex;flex-direction:column;gap:14px;margin-top:4px;">' +
    '<input type="hidden" id="er-id" value="'+r.id+'">' +
    '<div class="form-grid">' +
    '<div class="form-group full"><label>Nombre y Apellido</label><input type="text" id="er-fname" value="'+esc(r.first_name||'')+'" required></div>' +
    '<div class="form-group full"><label>Email</label><input type="email" id="er-email" value="'+esc(r.email||'')+'"></div>' +
    '<div class="form-group full"><label>Telefono</label><input type="text" id="er-phone" value="'+esc(r.phone||'')+'"></div>' +
    '<div class="form-group full"><label>Empresa</label><input type="text" id="er-comp" value="'+esc(r.company||'')+'"></div>' +
    '</div></form>';
  document.querySelector('#modal-reg-detail .modal-footer').innerHTML =
    '<button class="btn btn-success" style="flex:1;justify-content:center;" onclick="saveRegEdit()"><i data-lucide="save"></i> Guardar cambios</button>' +
    '<button class="btn btn-outline" onclick="closeRegDetailModal()">Cancelar</button>';
  document.getElementById('modal-reg-detail').querySelector('.modal-title').textContent = 'Editar Inscripto';
  document.getElementById('modal-reg-detail').classList.remove('hidden');
  lucide.createIcons();
}

async function saveRegEdit() {
  const id = document.getElementById('er-id').value;
  const { error } = await sb.from('registrations').update({
    first_name: document.getElementById('er-fname').value.trim(),
    email:      document.getElementById('er-email').value.trim(),
    phone:      document.getElementById('er-phone').value.trim(),
    company:    document.getElementById('er-comp').value.trim(),
  }).eq('id', id);
  if (!error) {
    closeRegDetailModal();
    loadRegistrations(currentEventId);
    showToast('Inscripto actualizado', 'success');
    document.querySelector('#modal-reg-detail .modal-footer').innerHTML = '<button class="btn btn-outline" style="width:100%;justify-content:center;" onclick="closeRegDetailModal()">Cerrar</button>';
    document.getElementById('modal-reg-detail').querySelector('.modal-title').textContent = 'Detalles del Inscripto';
  } else showToast('Error: ' + error.message, 'error');
}

async function deleteReg(regId) {
  const r = currentRegs.find(x => x.id == regId);
  if (!r) return;
  if (!confirm('¿Eliminar a ' + (r.first_name||'') + ' de este evento?')) return;
  const { error } = await sb.from('registrations').delete().eq('id', regId);
  if (!error) { loadRegistrations(currentEventId); showToast('Inscripto eliminado', ''); }
  else showToast('Error: ' + error.message, 'error');
}
