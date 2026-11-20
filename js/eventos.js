/* Comagro Eventos - eventos.js
   Grilla de eventos, crear/editar/duplicar, papelera, extender inscripcion */

// EVENTOS GRID
function renderEventsGrid() {
  const grid = document.getElementById('events-grid');
  const activeEvents = allEvents.filter(e => e.status !== 'eliminado');
  document.getElementById('events-count').textContent = activeEvents.length+' evento'+(activeEvents.length!==1?'s':'')+' registrado'+(activeEvents.length!==1?'s':'');
  if (activeEvents.length === 0) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><i data-lucide="calendar-x-2"></i><h4>No tenes eventos todavia</h4><p>Crea tu primer evento para empezar.</p><button class="btn btn-primary" style="margin-top:20px;" onclick="openCreateEventModal()"><i data-lucide="plus"></i> Crear primer evento</button></div>';
    lucide.createIcons(); return;
  }
  grid.innerHTML = activeEvents.map(ev => {
    const status = getEventStatus(ev);
    const statusColors = { activo: 'background:rgba(45,158,95,0.85);color:#fff;', finalizado: 'background:rgba(107,114,128,0.85);color:#fff;', lleno: 'background:rgba(220,38,38,0.85);color:#fff;' };
    const statusLabels = { activo: 'Activo', finalizado: 'Finalizado', lleno: 'Cupos llenos' };
    const fmtT = (t) => t ? t.substring(0,5) : '';
    let gridTimes = [];
    if (ev.time) gridTimes.push(ev.end_time ? `${fmtT(ev.time)} a ${fmtT(ev.end_time)}` : fmtT(ev.time));
    if (ev.extra_times && Array.isArray(ev.extra_times)) {
      ev.extra_times.forEach(t => {
        if (t.start) gridTimes.push(t.end ? `${fmtT(t.start)} a ${fmtT(t.end)}` : fmtT(t.start));
      });
    }
    const timeDisplay = gridTimes.length > 0 ? '&nbsp;&middot;&nbsp; ' + gridTimes.join(', ') : '';
    const isExpired = status === 'finalizado';
    return '<div class="event-card"><div class="event-card-banner" style="'+(ev.banner_url && /^https?:\/\//i.test(ev.banner_url)?'background-image:url(\''+encodeURI(ev.banner_url).replace(/'/g,'%27')+'\')':'')+'">'+(!ev.banner_url?'<div class="event-card-banner-placeholder"><i data-lucide="image"></i></div>':'')+'<div class="event-type-tag">'+esc(ev.type||'Evento')+'</div><div class="event-status-tag" style="'+(statusColors[status]||'')+'">'+(statusLabels[status]||status)+'</div></div><div class="event-card-body"><div class="event-card-name">'+esc(ev.name)+'</div><div class="event-card-meta"><i data-lucide="calendar"></i>'+formatDate(ev.date)+timeDisplay+'</div>'+(ev.location?'<div class="event-card-meta" style="margin-bottom:8px;"><i data-lucide="map-pin"></i>'+esc(ev.location)+'</div>':'')+'<div class="event-card-actions"><button class="btn btn-primary btn-sm" onclick="manageEvent(\''+ev.id+'\')" style="flex:1;justify-content:center;">Gestionar</button>'+(isExpired ? '<button class="btn btn-outline btn-sm" onclick="openExtendRegModal(\''+ev.id+'\')" title="Extender periodo de inscripción"><i data-lucide="clock"></i></button>' : '')+'<button class="btn btn-outline btn-sm" onclick="copyRegLink(\''+ev.id+'\')" title="Copiar link"><i data-lucide="link"></i></button><button class="btn btn-outline btn-sm" onclick="'+(isExpired ? `Swal.fire('Evento finalizado', 'La fecha de este evento ya pasó y se encuentra bloqueado para evitar modificaciones accidentales.', 'info')` : `editEvent('${ev.id}')`)+'" title="Editar" '+(isExpired?'style="opacity:0.5;"':'')+'><i data-lucide="pencil"></i></button><button class="btn btn-outline btn-sm" onclick="duplicateEvent(\''+ev.id+'\')" title="Duplicar"><i data-lucide="copy"></i></button><button class="btn btn-danger btn-sm" onclick="deleteEvent(\''+ev.id+'\')" title="Mover a papelera"><i data-lucide="trash-2"></i></button></div></div></div>';
  }).join('');
  lucide.createIcons();
}

async function renderTrashGrid() {
  const grid = document.getElementById('trash-grid');
  grid.innerHTML = '<div style="text-align:center;padding:40px;color:#6b7280;"><i data-lucide="loader" style="width:28px;height:28px;animation:spin 1s linear infinite;display:inline-block;"></i><p style="margin-top:12px;">Cargando papelera...</p></div>';
  lucide.createIcons();
  try {
    const { data: trashEvents, error } = await sb.from('events').select('*').eq('status', 'eliminado').order('date', { ascending: false });
    if (error) throw error;
    const { data: allFresh } = await sb.from('events').select('*').order('date', { ascending: false });
    allEvents = allFresh || [];
    const trashCountEl = document.getElementById('trash-count');
    if (trashCountEl) {
      const n = trashEvents ? trashEvents.length : 0;
      trashCountEl.textContent = n + ' evento' + (n !== 1 ? 's' : '') + ' en papelera';
    }
    if (!trashEvents || trashEvents.length === 0) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><i data-lucide="trash"></i><h4>Papelera vacía</h4><p>No hay eventos eliminados.</p></div>';
      lucide.createIcons(); 
      return;
    }
    grid.innerHTML = trashEvents.map(ev => {
      const isExpiredDate = ev.date < new Date().toISOString().split('T')[0];
      const restoreNote = isExpiredDate ? '<p style="font-size:11px;color:#9ca3af;margin:4px 0 8px 0;">⚠️ Fecha ya pasada. Se restaurará sin poder editar.</p>' : '';
      return `<div class="event-card" style="opacity:0.85;">
        <div class="event-card-body">
          <div style="display:inline-block; margin-bottom:8px; padding:2px 10px; border-radius:4px; font-size:11px; font-weight:700; color:white; background:#dc2626; letter-spacing:0.5px;">ELIMINADO</div>
          <div class="event-card-name">${esc(ev.name||'Sin nombre')}</div>
          <div class="event-card-meta" style="margin-bottom:6px;"><i data-lucide="calendar"></i>${formatDate(ev.date)}</div>
          ${restoreNote}
          <div class="event-card-actions" style="margin-top:12px;">
            <button class="btn btn-outline btn-sm" onclick="restoreEvent('${ev.id}')" style="flex:1;"><i data-lucide="rotate-ccw"></i> Restaurar</button>
            <button class="btn btn-danger btn-sm" onclick="hardDeleteEvent('${ev.id}')" title="Borrar definitivo"><i data-lucide="trash-2"></i> Borrar</button>
          </div>
        </div>
      </div>`;
    }).join('');
    lucide.createIcons();
  } catch (err) {
    grid.innerHTML = '<div style="color:red; padding: 20px; font-weight:bold;">Error cargando papelera: ' + err.message + '</div>';
  }
}

function openCreateEventModal() {
  document.getElementById('event-form').reset();
  document.getElementById('ev-id').value = '';
  document.getElementById('modal-event-title').textContent = 'Nuevo Evento';
  document.getElementById('ev-type-custom').style.display = 'none';
  document.querySelectorAll('.extra-time, .pause-item, .shift-item').forEach(el => el.remove());
  document.getElementById('ev-has-shifts').checked = false;
  toggleShiftsMode(false);
  document.getElementById('modal-create-event').classList.remove('hidden');
}

function toggleShiftsMode(enabled) {
  document.getElementById('simple-times-wrap').style.display = enabled ? 'none' : 'block';
  document.getElementById('shifts-times-wrap').style.display = enabled ? 'flex' : 'none';
  if (enabled && document.querySelectorAll('.shift-item').length === 0) addShiftField();
}

function addShiftField() {
  const html = `
    <div class="shift-item" style="display:flex;gap:12px;align-items:center;background:#fff;padding:12px;border:1px solid var(--border);border-radius:8px;">
      <div style="flex:1.5;"><label style="font-size:12px;color:var(--muted);margin-bottom:4px;display:block;">Nombre del turno *</label><input type="text" class="sh-name" placeholder="Ej: Turno Mañana" required></div>
      <div style="flex:1;"><label style="font-size:12px;color:var(--muted);margin-bottom:4px;display:block;">Fecha</label><input type="date" class="sh-date"></div>
      <div style="flex:1;"><label style="font-size:12px;color:var(--muted);margin-bottom:4px;display:block;">Desde *</label><input type="time" class="sh-start" required></div>
      <div style="flex:1;"><label style="font-size:12px;color:var(--muted);margin-bottom:4px;display:block;">Hasta *</label><input type="time" class="sh-end" required></div>
      <button type="button" onclick="this.parentElement.remove()" class="btn btn-sm btn-outline" style="color:#dc2626;border-color:#dc2626;padding:8px;margin-top:22px;">
        <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
      </button>
    </div>
  `;
  document.getElementById('shifts-container').insertAdjacentHTML('beforeend', html);
  lucide.createIcons();
}

function closeCreateEventModal() { document.getElementById('modal-create-event').classList.add('hidden'); }

function addTimeField(start = '', end = '') {
  const id = Date.now() + Math.random().toString(36).substring(2,6);
  const html = `
    <div class="time-item extra-time" id="time-${id}" style="display:flex;gap:12px;align-items:center;">
      <div style="flex:1;"><input type="time" class="t-start" value="${start}"></div>
      <div style="flex:1;"><input type="time" class="t-end" value="${end}"></div>
      <button type="button" class="btn btn-outline btn-sm" style="color:#dc2626; border-color:#fca5a5; padding:0 8px; width:34px;" onclick="document.getElementById('time-${id}').remove()">
        <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
      </button>
    </div>
  `;
  document.getElementById('times-container').insertAdjacentHTML('beforeend', html);
  lucide.createIcons();
}

function addPauseField(title = '', start = '', end = '') {
  const id = Date.now() + Math.random().toString(36).substring(2,6);
  const html = `
    <div class="pause-item" id="pause-${id}" style="display:flex; gap:8px; align-items:center;">
      <input type="text" class="p-title" placeholder="Ej: Coffee Break" style="flex:2;" value="${title}">
      <input type="time" class="p-start" style="flex:1;" value="${start}">
      <input type="time" class="p-end" style="flex:1;" value="${end}">
      <button type="button" class="btn btn-outline btn-sm" style="color:#dc2626; border-color:#fca5a5; padding:0 8px;" onclick="document.getElementById('pause-${id}').remove()">
        <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
      </button>
    </div>
  `;
  document.getElementById('pauses-container').insertAdjacentHTML('beforeend', html);
  lucide.createIcons();
}

document.getElementById('event-form').onsubmit = async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Guardando...';
  const eventName = document.getElementById('ev-name').value.trim();
  const slug = eventName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') + '-' + Math.floor(Date.now()/1000);
  const evId = document.getElementById('ev-id').value;

  const pauses = [];
  document.querySelectorAll('.pause-item').forEach(el => {
    const title = el.querySelector('.p-title').value.trim();
    const start = el.querySelector('.p-start').value;
    const end = el.querySelector('.p-end').value;
    if (title && start && end) pauses.push({ title, start, end });
  });

  const extraTimes = [];
  document.querySelectorAll('.extra-time').forEach(el => {
    const start = el.querySelector('.t-start').value;
    const end = el.querySelector('.t-end').value;
    if (start || end) extraTimes.push({ start, end });
  });

  const typeSel = document.getElementById('ev-type').value;
  const finalType = typeSel === 'otros' ? document.getElementById('ev-type-custom').value.trim() : typeSel;

  const hasShifts = document.getElementById('ev-has-shifts').checked;
  const shifts = [];
  if (hasShifts) {
    document.querySelectorAll('.shift-item').forEach(el => {
      const name = el.querySelector('.sh-name').value.trim();
      const start = el.querySelector('.sh-start').value;
      const end = el.querySelector('.sh-end').value;
      const date = el.querySelector('.sh-date').value || null;
      if (name && start && end) shifts.push({ id: el.dataset.shiftId || null, name, start_time: start, end_time: end, date });
    });
  }

  // Proteccion de datos: si se van a quitar turnos que ya tienen inscriptos, avisar antes.
  // (Antes se borraban y recreaban todos los turnos en cada edicion y los inscriptos perdian su turno.)
  let shiftsToDelete = [];
  if (evId) {
    const { data: existingShifts } = await sb.from('event_shifts').select('id, name').eq('event_id', evId);
    const keepIds = new Set(shifts.filter(x => x.id).map(x => String(x.id)));
    shiftsToDelete = (existingShifts || []).filter(x => !hasShifts || !keepIds.has(String(x.id)));
    if (shiftsToDelete.length > 0) {
      const { count: affected } = await sb.from('registrations').select('id', { count: 'exact', head: true })
        .eq('event_id', evId).in('shift_id', shiftsToDelete.map(x => x.id));
      if (affected > 0) {
        const ok = await Swal.fire({
          title: '¿Quitar turnos con inscriptos?',
          html: 'Vas a quitar <b>' + shiftsToDelete.map(x => esc(x.name)).join(', ') + '</b>.<br><br><b>' + affected + ' inscripto' + (affected !== 1 ? 's' : '') + '</b> quedar' + (affected !== 1 ? 'án' : 'á') + ' como "Sin turno". Los inscriptos NO se borran.',
          icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#6b7280',
          confirmButtonText: 'Sí, quitar turnos', cancelButtonText: 'Cancelar'
        });
        if (!ok.isConfirmed) { btn.disabled = false; btn.innerHTML = '<i data-lucide="save"></i> Guardar Evento'; lucide.createIcons(); return; }
      }
    }
  }

  const payload = {
    name: eventName,
    type: finalType || 'otros',
    date: document.getElementById('ev-date').value,
    time: hasShifts ? null : (document.getElementById('ev-time').value || null),
    end_time: hasShifts ? null : (document.getElementById('ev-time-end').value || null),
    extra_times: hasShifts ? [] : extraTimes,
    pauses: pauses,
    max_capacity: document.getElementById('ev-cap').value || null,
    location: document.getElementById('ev-location').value.trim() || null,
    location_link: document.getElementById('ev-location-link').value.trim() || null,
    description: document.getElementById('ev-desc').value.trim() || null,
    banner_url: document.getElementById('ev-flyer').value.trim() || null,
  };
  let error;
  let savedEvId = evId;
  if (evId) {
    ({ error } = await sb.from('events').update(payload).eq('id', evId));
  } else {
    payload.slug = slug; payload.status = 'activo';
    const { data: newEv, error: insErr } = await sb.from('events').insert([payload]).select().single();
    error = insErr;
    if (newEv) savedEvId = newEv.id;
  }

  if (!error && savedEvId) {
    // 1) Turnos quitados: primero se desvinculan los inscriptos (no se borran), despues se borra el turno
    if (shiftsToDelete.length > 0) {
      const ids = shiftsToDelete.map(x => x.id);
      await sb.from('registrations').update({ shift_id: null }).eq('event_id', savedEvId).in('shift_id', ids);
      const { error: delErr } = await sb.from('event_shifts').delete().in('id', ids);
      if (delErr) error = delErr;
    }
    if (!error && hasShifts) {
      // 2) Turnos existentes: se actualizan manteniendo su ID (los inscriptos conservan su turno)
      for (const sh of shifts.filter(x => x.id)) {
        const { error: upErr } = await sb.from('event_shifts')
          .update({ name: sh.name, start_time: sh.start_time, end_time: sh.end_time, date: sh.date })
          .eq('id', sh.id);
        if (upErr) { error = upErr; break; }
      }
      // 3) Turnos nuevos
      const nuevos = shifts.filter(x => !x.id).map(x => ({ name: x.name, start_time: x.start_time, end_time: x.end_time, date: x.date, event_id: savedEvId }));
      if (!error && nuevos.length > 0) {
        const { error: insErr2 } = await sb.from('event_shifts').insert(nuevos);
        if (insErr2) error = insErr2;
      }
    }
  }
  btn.disabled = false;
  btn.innerHTML = '<i data-lucide="save"></i> Guardar Evento';
  lucide.createIcons();
  if (!error) {
    closeCreateEventModal();
    showToast(evId ? 'Evento actualizado' : 'Evento creado con exito', 'success');
    const { data } = await sb.from('events').select('*').order('date', { ascending: false });
    allEvents = data || [];
    switchView('eventos');
  } else {
    showToast('Error: ' + error.message, 'error');
  }
};

    // EDITAR EVENTO
    async function editEvent(id) {
      const ev = allEvents.find(x => x.id == id);
      if (!ev) return;
      document.getElementById('ev-id').value = ev.id;
      document.getElementById('ev-name').value = ev.name || '';

      const predefined = ['lanzamiento','capacitacion','inauguracion','feria'];
      if (predefined.includes(ev.type)) {
        document.getElementById('ev-type').value = ev.type || 'lanzamiento';
        document.getElementById('ev-type-custom').style.display = 'none';
        document.getElementById('ev-type-custom').value = '';
      } else if (ev.type) {
        document.getElementById('ev-type').value = 'otros';
        document.getElementById('ev-type-custom').style.display = 'block';
        document.getElementById('ev-type-custom').value = ev.type;
      } else {
        document.getElementById('ev-type').value = 'lanzamiento';
        document.getElementById('ev-type-custom').style.display = 'none';
      }

      document.getElementById('ev-date').value = ev.date || '';
      document.getElementById('ev-time').value = ev.time || '';
      document.getElementById('ev-time-end').value = ev.end_time || '';
      document.getElementById('ev-cap').value = ev.max_capacity || '';
      document.getElementById('ev-location').value = ev.location || '';
      document.getElementById('ev-location-link').value = ev.location_link || '';
      document.getElementById('ev-desc').value = ev.description || '';
      document.getElementById('ev-flyer').value = ev.banner_url || '';

      document.querySelectorAll('.extra-time').forEach(el => el.remove());
      if (ev.extra_times && Array.isArray(ev.extra_times)) {
        ev.extra_times.forEach(t => addTimeField(t.start, t.end));
      }

      const container = document.getElementById('pauses-container');
      container.innerHTML = '';
      if (ev.pauses && Array.isArray(ev.pauses)) {
        ev.pauses.forEach(p => addPauseField(p.title, p.start, p.end));
      }

      document.querySelectorAll('.shift-item').forEach(el => el.remove());
      const { data: shifts, error: shiftsError } = await sb.from('event_shifts').select('*').eq('event_id', id).order('date', { ascending: true }).order('start_time', { ascending: true });
      if (shifts && shifts.length > 0) {
        document.getElementById('ev-has-shifts').checked = true;
        toggleShiftsMode(true);
        document.querySelectorAll('.shift-item').forEach(el => el.remove());
        shifts.forEach(s => {
          addShiftField();
          const items = document.querySelectorAll('.shift-item');
          const last = items[items.length - 1];
          last.dataset.shiftId = s.id;
          last.querySelector('.sh-name').value = s.name || '';
          last.querySelector('.sh-date').value = s.date || '';
          last.querySelector('.sh-start').value = s.start_time || '';
          last.querySelector('.sh-end').value = s.end_time || '';
        });
      } else {
        document.getElementById('ev-has-shifts').checked = false;
        toggleShiftsMode(false);
      }

document.getElementById('modal-event-title').textContent = 'Editar Evento';
      document.getElementById('modal-create-event').classList.remove('hidden');
      lucide.createIcons();
    }

async function duplicateEvent(id) {
  const ev = allEvents.find(x => x.id == id);
  if (!ev) return;
  const newName = ev.name + ' (copia)';
  const slug = newName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') + '-' + Math.floor(Date.now()/1000);
  const { error } = await sb.from('events').insert([{ name:newName, slug, type:ev.type, date:ev.date, time:ev.time, end_time:ev.end_time, extra_times:ev.extra_times, pauses:ev.pauses, max_capacity:ev.max_capacity, location:ev.location, location_link:ev.location_link, description:ev.description, banner_url:ev.banner_url, budget:ev.budget, status:'activo' }]);
  if (!error) {
    showToast('Evento duplicado. Podes editarlo ahora.', 'success');
    const { data } = await sb.from('events').select('*').order('date', { ascending: false });
    allEvents = data || [];
    renderEventsGrid();
  } else showToast('Error: ' + error.message, 'error');
}

function openExtendRegModal(id) {
  const ev = allEvents.find(x => x.id == id);
  document.getElementById('ext-event-id').value = id;
  if (ev && ev.registration_deadline) {
    const dateObj = new Date(ev.registration_deadline);
    const tzOffset = dateObj.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(dateObj - tzOffset)).toISOString().slice(0,16);
    document.getElementById('ext-datetime').value = localISOTime;
  } else {
    document.getElementById('ext-datetime').value = '';
  }
  document.getElementById('modal-extend-reg').classList.remove('hidden');
  lucide.createIcons();
}

function closeExtendRegModal() {
  document.getElementById('modal-extend-reg').classList.add('hidden');
}

async function saveExtendReg() {
  const id = document.getElementById('ext-event-id').value;
  const formValue = document.getElementById('ext-datetime').value;
  if (!formValue) {
    showToast('Por favor ingrese una fecha y hora', 'error');
    return;
  }

  const { error } = await sb.from('events').update({ registration_deadline: formValue.slice(0, 10) }).eq('id', id);
  if (!error) {
    showToast('Periodo de inscripción extendido', 'success');
    closeExtendRegModal();
    const { data } = await sb.from('events').select('*').order('date', { ascending: false });
    allEvents = data || [];
    renderEventsGrid();
  } else {
    showToast('Error al extender: ' + error.message, 'error');
  }
}

async function deleteEvent(id) {
  const ev = allEvents.find(x => x.id == id);
  if (!ev) return;
  const { count } = await sb.from('registrations').select('id', { count: 'exact', head: true }).eq('event_id', id);

  Swal.fire({
    title: '¿Mover a la papelera?',
    html: `Estás a punto de enviar <b>"${esc(ev.name)}"</b> a la papelera.<br>` + (count > 0 ? `<br><b>¡OJO! Tiene ${count} inscriptos registrados.</b>` : '') + `<br>El evento se ocultará del panel principal.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Sí, mover a papelera',
    cancelButtonText: 'Cancelar'
  }).then(async (result) => {
    if (result.isConfirmed) {
      const { error } = await sb.from('events').update({ status: 'eliminado' }).eq('id', id);
      if (!error) {
        showToast('Evento movido a la papelera', 'success');
        const { data } = await sb.from('events').select('*').order('date', { ascending: false });
        allEvents = data || [];
        if(document.getElementById('view-eventos').classList.contains('active')) renderEventsGrid();
      } else showToast('Error: ' + error.message, 'error');
    }
  });
}

async function restoreEvent(id) {
  const { error } = await sb.from('events').update({ status: 'activo' }).eq('id', id);
  if (!error) {
    showToast('Evento restaurado', 'success');
    const { data } = await sb.from('events').select('*').order('date', { ascending: false });
    allEvents = data || [];
    renderTrashGrid();
  }
}

async function hardDeleteEvent(id) {
  const ev = allEvents.find(x => x.id == id);
  Swal.fire({
    title: '¡BORRADO DEFINITIVO!',
    html: `Vas a eliminar <b>${esc(ev.name)}</b> para siempre.<br><br><b>¡Se borrarán todos sus inscriptos permanentemente!</b><br>Esta acción no se puede deshacer.`,
    icon: 'error',
    showCancelButton: true,
    confirmButtonColor: '#991b1b',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Sí, borrar para siempre',
    cancelButtonText: 'Cancelar'
  }).then(async (result) => {
    if (result.isConfirmed) {
      await sb.from('registrations').delete().eq('event_id', id);
      await sb.from('event_budget_items').delete().eq('event_id', id);
      await sb.from('event_shifts').delete().eq('event_id', id);
      const { error } = await sb.from('events').delete().eq('id', id);
      if (!error) {
        showToast('Evento eliminado para siempre', '');
        const { data } = await sb.from('events').select('*').order('date', { ascending: false });
        allEvents = data || [];
        renderTrashGrid();
      } else showToast('Error: ' + error.message, 'error');
    }
  });
}
