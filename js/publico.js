/* Comagro Eventos - publico.js
   Paginas publicas: formulario de inscripcion y lista compartida */

// VISTA PUBLICA
// Seguridad: el formulario publico NO lee ni escribe tablas directamente.
// Usa funciones de Supabase (RPC) que validan todo en el servidor:
//   public_get_event(p_event_id)  -> datos publicos del evento + turnos + estado
//   public_register(...)          -> inscribe validando cupos, fechas, duplicados y turno

function pubShowClosed(title, msg) {
  document.getElementById('public-reg-form').style.display = 'none';
  const box = document.getElementById('pub-full');
  if (title) box.querySelector('h3').textContent = title;
  if (msg) box.querySelector('p').textContent = msg;
  box.style.display = 'block';
  lucide.createIcons();
}

function pubSafeUrl(u) {
  // Solo permite enlaces http/https (evita javascript: en links y fondos)
  return (typeof u === 'string' && /^https?:\/\//i.test(u.trim())) ? u.trim() : '';
}

async function showPublicForm(evId) {
  document.documentElement.style.visibility = 'visible';

  var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  var isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 1024 || screen.width <= 1024 || isTouch;
  if (isMobile) {
    document.getElementById('view-registro-cliente').classList.add('pub-mobile');
  }

  document.getElementById('view-registro-cliente').classList.add('active');
  currentEventId = evId;

  const { data: info, error } = await sb.rpc('public_get_event', { p_event_id: evId });
  if (error || !info || !info.event) {
    document.getElementById('pub-name').textContent = 'Evento no encontrado';
    const meta = document.getElementById('pub-meta'); if (meta) meta.textContent = '';
    pubShowClosed('Evento no disponible', 'El enlace no es valido o el evento ya no existe.');
    return;
  }
  const data = info.event;
  const shifts = info.shifts || [];
  document.getElementById('pub-name').textContent = data.name;

  const fmtT = (t) => t ? t.substring(0,5) : '';
  let dateHtml, timesHtml;

  dateHtml = `<span style="font-weight:600; color:#ffffff; text-shadow:0 1px 4px rgba(0,0,0,0.7); font-size:15px;">${formatDate(data.date)}</span>`;

  if (shifts.length > 0) {
    timesHtml = shifts.map(s => {
      const dateStr = s.date ? formatDate(s.date) + ' · ' : '';
      return `<span style="display:block; font-weight:600; color:#ffffff; text-shadow:0 1px 4px rgba(0,0,0,0.7); font-size:13px; line-height:1.6;">${esc(s.name)}: ${dateStr}${fmtT(s.start_time)} a ${fmtT(s.end_time)} hs</span>`;
    }).join('');
  } else {
    let timesArray = [];
    if (data.time && data.end_time) timesArray.push(`De ${fmtT(data.time)} a ${fmtT(data.end_time)} hs`);
    else if (data.time) timesArray.push(`A partir de las ${fmtT(data.time)} hs`);
    if (data.extra_times && Array.isArray(data.extra_times)) {
      data.extra_times.forEach(t => {
        if (t.start && t.end) timesArray.push(`De ${fmtT(t.start)} a ${fmtT(t.end)} hs`);
        else if (t.start) timesArray.push(`A partir de las ${fmtT(t.start)} hs`);
      });
    }
    timesHtml = timesArray.length > 0
      ? timesArray.map(t => `<span style="font-weight:600; color:#ffffff; text-shadow:0 1px 4px rgba(0,0,0,0.7); font-size:15px;">${esc(t)}</span>`).join('<br>')
      : '<span style="font-weight:500; color:rgba(255,255,255,0.8); font-size:14px;">A definir</span>';
  }

  const metaEl = document.getElementById('pub-meta');
  metaEl.outerHTML = `
    <div id="pub-meta" style="display:flex; justify-content:space-between; gap:16px; margin-top:16px; text-align:left; background:rgba(0,0,0,0.25); padding:12px 16px; border-radius:8px; border:1px solid rgba(255,255,255,0.1);">
      <div style="flex:0 0 auto;">
        <span style="font-size:11px; color:rgba(255,255,255,0.8); display:block; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">Fecha</span>
        ${dateHtml}
      </div>
      <div style="flex:1; text-align:right;">
        <span style="font-size:11px; color:rgba(255,255,255,0.8); display:block; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">Horario${shifts.length > 1 ? 's' : ''}</span>
        ${timesHtml}
      </div>
    </div>
  `;

  const locEl = document.getElementById('pub-location');
  if (data.location) {
    const link = pubSafeUrl(data.location_link);
    const locHtml = link ? `<a href="${esc(link)}" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;">${esc(data.location)}</a>` : esc(data.location);
    locEl.innerHTML = '<i data-lucide="map-pin" style="width:14px;height:14px;"></i> ' + locHtml;
    locEl.style.display = 'flex';
  } else {
    locEl.style.display = 'none';
  }

  const pausesWrap = document.getElementById('pub-pauses-wrap');
  const pausesEl = document.getElementById('pub-pauses');
  if (data.pauses && Array.isArray(data.pauses) && data.pauses.length > 0) {
    pausesEl.innerHTML = data.pauses.map(p => `
      <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(0,0,0,0.05);">
        <strong style="color:var(--navy);font-size:14px;">${esc(p.title)}</strong>
        <span style="color:var(--muted);font-size:13px;font-weight:500;">${fmtT(p.start)} a ${fmtT(p.end)}</span>
      </div>
    `).join('');
    pausesWrap.style.display = 'block';
  } else {
    pausesWrap.style.display = 'none';
  }

  const banner = pubSafeUrl(data.banner_url);
  if (banner) {
    const top = document.querySelector('.pub-card-top');
    top.style.backgroundImage = 'linear-gradient(rgba(13,35,89,0.8),rgba(13,35,89,0.8)),url("' + encodeURI(banner).replace(/"/g, '%22') + '")';
    top.style.backgroundSize = 'cover'; top.style.backgroundPosition = 'center';
  }

  // El estado lo calcula el servidor (fecha de Paraguay, cupos, pausa)
  if (info.state === 'expired') { pubShowClosed('Este evento ya finalizo', 'El periodo de inscripcion para este evento ha cerrado.'); return; }
  if (info.state === 'closed')  { pubShowClosed('Inscripciones Cerradas', 'El periodo de inscripción para este evento se encuentra pausado o cerrado actualmente.'); return; }
  if (info.state === 'full')    { pubShowClosed(); return; }

  const shiftsWrap = document.getElementById('pub-shifts-wrap');
  const shiftsOptions = document.getElementById('pub-shifts-options');
  if (shifts.length > 0) {
    shiftsWrap.style.display = 'block';
    shiftsOptions.innerHTML = shifts.map((s, idx) => `
      <label style="display:flex; align-items:center; gap:10px; padding:12px; background:#fff; border:1px solid #d0e1ff; border-radius:8px; cursor:pointer;">
        <input type="radio" name="p-shift" value="${esc(s.id)}" ${idx === 0 ? 'required' : ''} style="width:18px;height:18px;margin:0;">
        <div style="flex:1;">
          <div style="font-weight:600; color:var(--navy); font-size:14px;">${esc(s.name)}</div>
          <div style="font-size:12px; color:var(--muted);">${s.date ? formatDate(s.date) + ' - ' : ''}${fmtT(s.start_time)} a ${fmtT(s.end_time)} hs</div>
        </div>
      </label>
    `).join('');
  } else {
    shiftsWrap.style.display = 'none';
    shiftsOptions.innerHTML = '';
  }

  lucide.createIcons();

  if (isMobile) {
    document.querySelectorAll('#public-reg-form input, #public-reg-form select').forEach(function(el) {
      el.addEventListener('focus', function() {
        setTimeout(function() { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 350);
      });
    });
  }
}

document.getElementById('public-reg-form').onsubmit = async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  const resetBtn = () => { btn.disabled = false; btn.textContent = 'Confirmar inscripcion'; };
  btn.disabled = true; btn.textContent = 'Procesando...';
  const evId = window.location.hash.split('/').pop();

  const emailVal = document.getElementById('p-email').value.trim();
  const phoneVal = document.getElementById('p-phone').value.trim();
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);
  const cleanedPhone = phoneVal.replace(/[\s-]/g, '');
  const isPhoneValid = /^(\+\d{8,15}|09\d{8})$/.test(cleanedPhone);

  if (!isEmailValid) { showToast('Por favor, ingresa un correo electronico valido.', 'error'); resetBtn(); return; }
  if (!isPhoneValid) { showToast('El telefono debe ser valido (ej: 0981... o internacional con +)', 'error'); resetBtn(); return; }

  const selectedShift = document.querySelector('input[name="p-shift"]:checked');

  const { data: res, error } = await sb.rpc('public_register', {
    p_event_id: evId,
    p_full_name: document.getElementById('p-fname').value.trim(),
    p_email: emailVal,
    p_phone: phoneVal,
    p_company: document.getElementById('p-comp').value.trim(),
    p_shift_id: selectedShift ? selectedShift.value : null
  });

  if (error) { resetBtn(); showToast('Error al registrar: ' + error.message, 'error'); return; }
  if (res && res.ok) {
    document.getElementById('public-reg-form').style.display = 'none';
    document.getElementById('pub-success').classList.add('active');
    lucide.createIcons();
    return;
  }
  const code = res && res.code;
  if (code === 'closed')   { pubShowClosed('Inscripciones Cerradas', 'Las inscripciones acaban de ser pausadas o cerradas.'); return; }
  if (code === 'expired')  { pubShowClosed('Este evento ya finalizo', 'El periodo de inscripcion para este evento ha cerrado.'); return; }
  if (code === 'full')     { pubShowClosed('Cupos agotados', 'Lamentablemente los cupos para este evento estan llenos.'); return; }
  if (code === 'not_found'){ pubShowClosed('Evento no disponible', 'El enlace no es valido o el evento ya no existe.'); return; }
  resetBtn();
  const msgs = {
    duplicate: 'El correo o telefono ya fue registrado en este evento.',
    shift_required: 'Selecciona un turno para continuar.',
    invalid_shift: 'El turno elegido ya no esta disponible. Recarga la pagina.',
    invalid_name: 'Ingresa tu nombre y apellido.',
    invalid_email: 'Por favor, ingresa un correo electronico valido.',
    invalid_phone: 'El telefono debe ser valido (ej: 0981... o internacional con +)'
  };
  showToast(msgs[code] || 'No se pudo completar la inscripcion.', 'error');
};

// UTILIDADES
function compartirLista(id) { if (!id) return; const link = window.location.href.split('#')[0] + '#/lista/' + id; navigator.clipboard.writeText(link).then(() => showToast('Link de lista copiado al portapapeles', 'success')); }

// Lista publica compartida: usa la funcion segura public_get_lista(p_event_id)
// y se actualiza sola cada 15 segundos.
let _listaPollTimer = null;
let _listaSignature = '';

async function showPublicLista(evId) {
  document.documentElement.style.visibility = 'visible';
  const vr = document.getElementById('view-registro-cliente'); if (vr) vr.style.display = 'none';
  const as = document.getElementById('admin-shell'); if (as) as.style.display = 'none';

  const { data: info, error } = await sb.rpc('public_get_lista', { p_event_id: evId });
  if (error || !info || !info.event) {
    document.body.innerHTML = '<div style="text-align:center;padding:60px;font-family:sans-serif;color:#6b7280;">Evento no encontrado.</div>';
    return;
  }
  renderPublicLista(info);
  _listaSignature = JSON.stringify(info.registrations || []);

  if (_listaPollTimer) clearInterval(_listaPollTimer);
  _listaPollTimer = setInterval(async () => {
    if (document.hidden) return;
    const { data: fresh } = await sb.rpc('public_get_lista', { p_event_id: evId });
    if (!fresh || !fresh.event) return;
    const sig = JSON.stringify(fresh.registrations || []);
    if (sig !== _listaSignature) { _listaSignature = sig; renderPublicLista(fresh); }
  }, 15000);
}

function renderPublicLista(info) {
  const ev = info.event;
  const lista = info.registrations || [];
  const shiftList = info.shifts || [];
  const fmtT = t => t ? t.substring(0,5) : '';
  const TH = 'padding:12px 18px;text-align:left;font-size:11px;font-weight:700;color:rgba(255,255,255,0.8);letter-spacing:1.2px;text-transform:uppercase;';
  const tableHead = `<thead><tr style="background:#0d2359;"><th style="${TH}">Nombre</th><th style="${TH}">Teléfono</th><th style="${TH}">Empresa</th><th style="${TH}">Correo</th></tr></thead>`;
  const TD = 'padding:13px 18px;font-size:13px;color:#6b7280;border-bottom:1px solid #e2e0d8;';

  function buildExcelBtn() {
    return `<button onclick="exportListaExcel()" style="display:inline-flex;align-items:center;gap:8px;padding:0 20px;height:40px;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;border:1.5px solid #e2e0d8;background:#fff;color:#1a1a2e;font-family:'Roboto',sans-serif;transition:all .2s;" onmouseover="this.style.background='#eef2fb';this.style.borderColor='#0d2359';" onmouseout="this.style.background='#fff';this.style.borderColor='#e2e0d8';">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      Exportar Excel
    </button>`;
  }

  function buildTableRows(regsList) {
    if (!regsList || regsList.length === 0) return `<tr><td colspan="4" style="text-align:center;padding:32px;color:#9ca3af;">Sin inscriptos</td></tr>`;
    return regsList.map((r, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#fafaf8'};">
        <td style="${TD}font-size:14px;color:#1a1a2e;font-weight:500;">${esc(r.first_name || '-')}</td>
        <td style="${TD}">${esc(r.phone || '-')}</td>
        <td style="${TD}">${esc(r.company || '-')}</td>
        <td style="${TD}">${esc(r.email || '-')}</td>
      </tr>`).join('');
  }

  function section(title, subtitle, regs) {
    const head = title === null ? '' : `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
        <div>
          <span style="font-size:16px;font-weight:700;color:#0d2359;">${esc(title)}</span>
          ${subtitle ? `<span style="font-size:13px;color:#6b7280;margin-left:10px;">${subtitle}</span>` : ''}
        </div>
        <span style="background:#eef2fb;color:#0d2359;font-size:12px;font-weight:700;padding:4px 14px;border-radius:20px;">${regs.length} inscriptos</span>
      </div>`;
    return `
      <div style="margin-bottom:36px;">${head}
        <div style="overflow-x:auto;overflow-y:auto;max-height:600px;border-radius:10px;border:1px solid #e2e0d8;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <table style="width:100%;border-collapse:collapse;">${tableHead}<tbody>${buildTableRows(regs)}</tbody></table>
        </div>
      </div>`;
  }

  let sectionsHtml = '';
  if (shiftList.length > 0) {
    shiftList.forEach(s => {
      const dateStr = s.date ? formatDate(s.date) + ' · ' : '';
      sectionsHtml += section(s.name, `${dateStr}${fmtT(s.start_time)} a ${fmtT(s.end_time)} hs`, lista.filter(r => r.shift_id === s.id));
    });
    const sinTurno = lista.filter(r => !r.shift_id || !shiftList.some(s => s.id === r.shift_id));
    if (sinTurno.length > 0) sectionsHtml += section('Sin turno asignado', '', sinTurno);
  } else {
    sectionsHtml = section(null, '', lista);
  }

  const banner = pubSafeUrl(ev.banner_url);
  const bannerStyle = banner
    ? `background:linear-gradient(rgba(13,35,89,0.82),rgba(13,35,89,0.82)),url('${encodeURI(banner).replace(/'/g, '%27')}') center/cover no-repeat;`
    : `background:linear-gradient(135deg,#0d2359,#1a3a8a);`;

  document.body.innerHTML = `
    <div style="min-height:100vh;background:#f5f4f0;font-family:'Roboto',sans-serif;">
      <div style="${bannerStyle}padding:36px 24px 32px;text-align:center;">
        <img src="https://www.chacomer.com.py/media/wysiwyg/comagro/ISOLOGO_COMAGRO_COLOR.png" style="height:44px;filter:brightness(0) invert(1);opacity:0.9;margin-bottom:20px;display:block;margin-left:auto;margin-right:auto;">
        <h1 style="font-size:clamp(22px,4vw,36px);font-weight:700;color:#fff;margin:0 0 10px 0;">${esc(ev.name)}</h1>
        <p style="font-size:14px;color:rgba(255,255,255,0.75);margin:0;">${esc(ev.type ? ev.type.charAt(0).toUpperCase()+ev.type.slice(1) : 'Evento')} &middot; ${formatDate(ev.date)}${ev.location ? ' &middot; ' + esc(ev.location) : ''}</p>
        <div style="display:inline-flex;align-items:center;gap:8px;margin-top:18px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);padding:8px 20px;border-radius:20px;">
          <span style="font-size:22px;font-weight:800;color:#45d636;">${lista.length}</span>
          <span style="font-size:13px;color:rgba(255,255,255,0.8);">inscriptos en total</span>
        </div>
      </div>
      <div style="max-width:960px;margin:0 auto;padding:32px 20px 60px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
          <h2 style="font-size:20px;font-weight:700;color:#0d2359;margin:0;">Lista de Inscriptos</h2>
          ${buildExcelBtn()}
        </div>
        <div id="lista-sections">${sectionsHtml}</div>
        <p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:40px;">&copy; 2026 Comagro S.A. &mdash; Lista actualizada automáticamente</p>
      </div>
    </div>`;

  window._listaEvData = { ev, lista, shiftList };
}

function exportListaExcel() {
  const XLSX_LIB = window.XLSX || (typeof XLSX !== 'undefined' ? XLSX : null);
  if (!XLSX_LIB) { alert('Librería Excel no disponible'); return; }
  const d = window._listaEvData;
  if (!d) return;
  const wb = XLSX_LIB.utils.book_new();
  const headers = ['Nombre', 'Teléfono', 'Empresa', 'Correo', 'Estado', 'Fecha Inscripción'];

  function buildRows(regs) {
    return [headers, ...regs.map(r => [r.first_name||'', r.phone||'', r.company||'', r.email||'', r.status==='presente'?'Presente':'Pendiente', r.registered_at ? new Date(r.registered_at).toLocaleString('es-PY') : ''])];
  }

  function addSheet(name, regs) {
    const rows = buildRows(regs);
    const ws = XLSX_LIB.utils.aoa_to_sheet(rows);
    ws['!cols'] = rows.reduce((acc, row) => { row.forEach((c,i) => { const l = String(c||'').length; if (!acc[i] || acc[i].wch < l) acc[i] = {wch: Math.min(l+2,50)}; }); return acc; }, []);
    XLSX_LIB.utils.book_append_sheet(wb, ws, name.replace(/[\\\/\?\*\[\]]/g,'').substring(0,31));
  }

  if (d.shiftList && d.shiftList.length > 0) {
    addSheet('Todos', d.lista);
    d.shiftList.forEach(s => { addSheet(s.name, d.lista.filter(r => r.shift_id === s.id)); });
    const sinTurno = d.lista.filter(r => !r.shift_id);
    if (sinTurno.length > 0) addSheet('Sin turno', sinTurno);
  } else {
    addSheet('Inscriptos', d.lista);
  }

  const cleanName = d.ev.name.trim().replace(/[\/\\?%*:|"<>]/g, '-');
  XLSX_LIB.writeFile(wb, 'Lista_' + cleanName + '.xlsx');
}
