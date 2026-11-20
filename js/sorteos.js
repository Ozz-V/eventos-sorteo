/* Comagro Eventos - sorteos.js
   Sorteos con historial: crear sorteos, cargar participantes (manual, Excel o
   pegado), sortear y guardar cada ganador. Tambien sorteos desde un evento
   (toma los presentes de la lista de inscriptos).
   Tablas: raffles, raffle_participants, raffle_winners (ver sql/03_sorteos.sql) */

let rfCurrent = null;        // sorteo abierto
let rfParticipants = [];     // participantes del sorteo abierto
let rfWinners = [];          // ganadores del sorteo abierto
let rfModalEventId = null;

const QR_LEGACY_KEY = 'comagro_sorteo_rapido_v1';

// ---------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------
function qrSwitchTab(tab) {
  document.querySelectorAll('#qr-tabs .ce-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('#view-sorteo-detalle .ce-tab-panel').forEach(p => p.classList.toggle('active', p.id === 'qr-panel-' + tab));
}
function qrKey(p) { return String(p.nombre || '').trim().toLowerCase().replace(/\s+/g, ' ') + '|' + String(p.telefono || '').replace(/\D/g, ''); }
function rfLegacyList() { try { return JSON.parse(localStorage.getItem(QR_LEGACY_KEY) || '[]') || []; } catch (e) { return []; } }
function rfEligible() {
  if (!rfCurrent) return [];
  if (!rfCurrent.remove_winners) return rfParticipants.slice();
  const won = new Set(rfWinners.map(w => w.participant_id).filter(Boolean));
  return rfParticipants.filter(p => !won.has(p.id));
}
async function rfInsertChunks(table, rows) {
  const out = [];
  for (let i = 0; i < rows.length; i += 500) {
    const { data, error } = await sb.from(table).insert(rows.slice(i, i + 500)).select();
    if (error) throw error;
    out.push(...(data || []));
  }
  return out;
}

// ---------------------------------------------------------------------
// LISTA DE SORTEOS
// ---------------------------------------------------------------------
async function rfLoadList() {
  const grid = document.getElementById('rf-grid');
  const legacy = rfLegacyList();
  const banner = document.getElementById('rf-legacy-banner');
  if (legacy.length) { document.getElementById('rf-legacy-n').textContent = legacy.length; banner.classList.remove('hidden'); }
  else banner.classList.add('hidden');

  const { data, error } = await sb.from('raffles')
    .select('*, events(name), raffle_participants(count), raffle_winners(count)')
    .order('created_at', { ascending: false });
  if (error) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><i data-lucide="alert-triangle"></i><h4>No se pudieron cargar los sorteos</h4><p>' + esc(error.message) + '</p><p style="margin-top:8px;">Si dice que la tabla no existe, falta ejecutar <code>sql/03_sorteos.sql</code> en Supabase.</p></div>';
    document.getElementById('rf-count-sub').textContent = '';
    lucide.createIcons(); return;
  }
  const showArch = document.getElementById('rf-show-archived').checked;
  const list = (data || []).filter(r => showArch || r.status !== 'archivado');
  const activos = (data || []).filter(r => r.status !== 'archivado').length;
  document.getElementById('rf-count-sub').textContent = activos + ' sorteo' + (activos !== 1 ? 's' : '') + ' activo' + (activos !== 1 ? 's' : '');

  if (!list.length) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><i data-lucide="trophy"></i><h4>Todavia no hay sorteos</h4><p>Crea un sorteo, carga los participantes y sortea. Cada ganador queda guardado.</p><button class="btn btn-primary" style="margin-top:20px;" onclick="rfOpenCreateModal()"><i data-lucide="plus"></i> Crear sorteo</button></div>';
    lucide.createIcons(); return;
  }
  grid.innerHTML = list.map(r => {
    const np = (r.raffle_participants && r.raffle_participants[0]) ? r.raffle_participants[0].count : 0;
    const nw = (r.raffle_winners && r.raffle_winners[0]) ? r.raffle_winners[0].count : 0;
    const origin = r.events && r.events.name
      ? '<span class="badge badge-navy" title="Sorteo de evento"><i data-lucide="calendar-days" style="width:11px;height:11px;"></i>' + esc(r.events.name) + '</span>'
      : '<span class="badge badge-finalizado">Lista propia</span>';
    const arch = r.status === 'archivado';
    return '<div class="event-card"' + (arch ? ' style="opacity:0.6;"' : '') + '><div class="event-card-body">' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">' + origin + (arch ? '<span class="badge badge-danger">Archivado</span>' : '') + '</div>' +
      '<div class="event-card-name">' + esc(r.name) + '</div>' +
      '<div class="event-card-meta"><i data-lucide="calendar"></i>' + formatDateTime(r.created_at) + (r.created_by ? ' · ' + esc(r.created_by.split('@')[0]) : '') + '</div>' +
      '<div class="report-stat-mini" style="margin-top:4px;">' +
        '<div class="report-stat-mini-item"><div class="val">' + np + '</div><div class="lbl">Participantes</div></div>' +
        '<div class="report-stat-mini-item"><div class="val" style="color:var(--green);">' + nw + '</div><div class="lbl">Ganadores</div></div>' +
      '</div>' +
      '<div class="event-card-actions" style="margin-top:14px;">' +
        '<button class="btn btn-primary btn-sm" style="flex:1;justify-content:center;" onclick="rfOpen(\'' + esc(r.id) + '\')"><i data-lucide="trophy"></i> Abrir</button>' +
        '<button class="btn btn-outline btn-sm" onclick="rfSetArchived(\'' + esc(r.id) + '\',' + (!arch) + ')" title="' + (arch ? 'Restaurar' : 'Archivar') + '"><i data-lucide="' + (arch ? 'rotate-ccw' : 'archive') + '"></i></button>' +
      '</div></div></div>';
  }).join('');
  lucide.createIcons();
}
document.getElementById('rf-show-archived').addEventListener('change', () => rfLoadList());

async function rfSetArchived(id, archived) {
  const { error } = await sb.from('raffles').update({ status: archived ? 'archivado' : 'activo' }).eq('id', id);
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  showToast(archived ? 'Sorteo archivado (no se borra nada)' : 'Sorteo restaurado', 'success');
  rfLoadList();
}

// ---------------------------------------------------------------------
// CREAR SORTEO (desde Sorteos o desde un evento)
// ---------------------------------------------------------------------
async function rfOpenCreateModal(eventId) {
  rfModalEventId = eventId || null;
  if (!allEvents || !allEvents.length) {
    const { data } = await sb.from('events').select('*').order('date', { ascending: false });
    allEvents = data || [];
  }
  const sel = document.getElementById('rf-new-event');
  sel.innerHTML = '<option value="">Sin evento (cargo los participantes a mano)</option>' +
    allEvents.filter(e => e.status !== 'eliminado').map(e => '<option value="' + esc(e.id) + '">' + esc(e.name) + ' · ' + formatDate(e.date) + '</option>').join('');
  document.getElementById('rf-create-form').reset();
  sel.value = rfModalEventId || '';
  const ev = allEvents.find(e => String(e.id) === String(rfModalEventId));
  document.getElementById('rf-new-name').value = ev ? 'Sorteo - ' + ev.name : '';
  document.getElementById('rf-modal-title').textContent = ev ? 'Sorteo del evento' : 'Crear sorteo';
  rfToggleSource();

  const box = document.getElementById('rf-modal-existing');
  box.classList.add('hidden');
  if (ev) {
    const { data: prev } = await sb.from('raffles').select('id, name, created_at, raffle_winners(count)').eq('event_id', ev.id).neq('status', 'archivado').order('created_at', { ascending: false });
    if (prev && prev.length) {
      document.getElementById('rf-modal-existing-list').innerHTML = prev.map(r =>
        '<button type="button" class="btn btn-outline" style="justify-content:space-between;height:auto;padding:12px 14px;white-space:normal;text-align:left;" onclick="rfCloseCreateModal();rfOpen(\'' + esc(r.id) + '\')">' +
        '<span><b>' + esc(r.name) + '</b><br><span class="text-sm text-muted">' + formatDateTime(r.created_at) + '</span></span>' +
        '<span class="badge badge-presente">' + ((r.raffle_winners && r.raffle_winners[0]) ? r.raffle_winners[0].count : 0) + ' ganadores</span></button>'
      ).join('');
      box.classList.remove('hidden');
    }
  }
  document.getElementById('modal-raffle').classList.remove('hidden');
  lucide.createIcons();
  setTimeout(() => document.getElementById('rf-new-name').focus(), 50);
}
function rfCloseCreateModal() { document.getElementById('modal-raffle').classList.add('hidden'); }
function rfToggleSource() {
  document.getElementById('rf-new-source-wrap').classList.toggle('hidden', !document.getElementById('rf-new-event').value);
}
document.getElementById('rf-new-event').addEventListener('change', rfToggleSource);

async function rfFetchEventParticipants(eventId, onlyPresent) {
  let q = sb.from('registrations').select('id, first_name, phone, company, status').eq('event_id', eventId).order('registered_at', { ascending: true });
  if (onlyPresent) q = q.eq('status', 'presente');
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).filter(r => (r.first_name || '').trim()).map(r => ({
    nombre: r.first_name.trim(), telefono: r.phone || null, empresa: r.company || null, registration_id: r.id
  }));
}

document.getElementById('rf-create-form').onsubmit = async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  const name = document.getElementById('rf-new-name').value.trim();
  const eventId = document.getElementById('rf-new-event').value || null;
  const source = document.getElementById('rf-new-source').value;
  if (!name) return;
  btn.disabled = true;
  try {
    const { data: raffle, error } = await sb.from('raffles').insert([{ name, event_id: eventId }]).select().single();
    if (error) throw error;
    let n = 0;
    if (eventId && source !== 'ninguno') {
      const parts = await rfFetchEventParticipants(eventId, source === 'presentes');
      if (parts.length) { await rfInsertChunks('raffle_participants', parts.map(p => ({ ...p, raffle_id: raffle.id }))); n = parts.length; }
    }
    rfCloseCreateModal();
    showToast('Sorteo creado' + (n ? ' con ' + n + ' participantes' : ''), 'success');
    await rfOpen(raffle.id);
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally { btn.disabled = false; }
};

// Boton "Sorteo" dentro de Gestionar evento
function abrirSorteo() { if (!currentEventId) return; rfOpenCreateModal(currentEventId); }

// ---------------------------------------------------------------------
// DETALLE DEL SORTEO
// ---------------------------------------------------------------------
async function rfOpen(id) {
  const [{ data: raffle, error }, { data: parts }, { data: wins }] = await Promise.all([
    sb.from('raffles').select('*, events(name)').eq('id', id).single(),
    sb.from('raffle_participants').select('*').eq('raffle_id', id).order('created_at', { ascending: true }),
    sb.from('raffle_winners').select('*').eq('raffle_id', id).order('won_at', { ascending: true })
  ]);
  if (error || !raffle) { showToast('No se pudo abrir el sorteo', 'error'); return; }
  rfCurrent = raffle; rfParticipants = parts || []; rfWinners = wins || [];
  document.getElementById('qr-search').value = '';
  switchView('sorteo-detalle');
  rfRenderAll();
}

function rfRenderAll() {
  if (!rfCurrent) return;
  document.getElementById('rf-name').textContent = rfCurrent.name;
  document.getElementById('topbar-title').textContent = rfCurrent.name;
  document.getElementById('rf-meta').textContent =
    (rfCurrent.events && rfCurrent.events.name ? 'Evento: ' + rfCurrent.events.name + ' · ' : 'Lista propia · ') +
    'Creado ' + formatDateTime(rfCurrent.created_at) + (rfCurrent.created_by ? ' por ' + rfCurrent.created_by : '') +
    (rfCurrent.status === 'archivado' ? ' · ARCHIVADO' : '');
  document.getElementById('rf-sync-btn').classList.toggle('hidden', !rfCurrent.event_id);
  document.getElementById('qr-remove-winner').checked = !!rfCurrent.remove_winners;
  rfRenderWinners();
  qrRender();
}

function rfRenderWinners() {
  const tbody = document.querySelector('#rf-win-table tbody');
  document.getElementById('rf-win-badge').textContent = rfWinners.length;
  if (!rfWinners.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--muted);">Todavia no hay ganadores. Cuando sortees, cada ganador queda guardado aca.</td></tr>';
    return;
  }
  tbody.innerHTML = rfWinners.map((w, i) =>
    '<tr><td><code>' + (i + 1) + '°</code></td>' +
    '<td><div style="font-weight:700;color:var(--navy);">' + esc(w.nombre) + '</div>' + (w.empresa ? '<div class="qr-company-inline" style="font-size:11px;color:var(--muted);">' + esc(w.empresa) + '</div>' : '') + '</td>' +
    '<td style="font-size:13px;white-space:nowrap;">' + esc(w.telefono || '-') + '</td>' +
    '<td class="qr-col-company" style="font-size:13px;">' + esc(w.empresa || '-') + '</td>' +
    '<td style="font-size:12px;white-space:nowrap;">' + formatDateTime(w.won_at) + '</td>' +
    '<td style="text-align:center;"><button class="btn btn-ghost btn-sm" onclick="rfDeleteWinner(\'' + esc(w.id) + '\')" title="Anular (ej: no estaba presente)" style="padding:4px;height:auto;color:#dc2626;"><i data-lucide="x-circle" style="width:15px;height:15px;"></i></button></td></tr>'
  ).join('');
  lucide.createIcons();
}

function qrRender() {
  const tbody = document.querySelector('#qr-table tbody');
  if (!tbody || !rfCurrent) return;
  const q = (document.getElementById('qr-search').value || '').trim().toLowerCase();
  const won = new Set(rfWinners.map(w => w.participant_id).filter(Boolean));
  const n = rfParticipants.length, el = rfEligible().length;
  document.getElementById('qr-count-badge').textContent = n;
  ['rf-spin-btn', 'rf-spin-btn-m'].forEach(id => {
    const b = document.getElementById(id);
    if (b) { b.disabled = el < 2; b.innerHTML = '<i data-lucide="trophy"></i> Sortear' + (n ? ' (' + el + (el !== n ? ' de ' + n : '') + ')' : ''); }
  });
  const rows = rfParticipants.map((p, i) => ({ p, i })).filter(({ p }) => !q || (p.nombre + ' ' + (p.empresa || '') + ' ' + (p.telefono || '')).toLowerCase().includes(q));
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--muted);">' + (q ? 'Sin resultados para "' + esc(q) + '"' : 'Todavia no hay participantes. Cargalos a mano, subi un Excel o pega las filas.') + '</td></tr>';
  } else {
    tbody.innerHTML = rows.map(({ p, i }) =>
      '<tr' + (won.has(p.id) ? ' style="background:#f0faf4;"' : '') + '><td><code>' + (i + 1) + '</code></td>' +
      '<td><div style="font-weight:600;color:var(--navy);">' + esc(p.nombre) + (won.has(p.id) ? ' <span class="badge badge-presente" style="margin-left:6px;">Ganó</span>' : '') + '</div>' +
      (p.empresa ? '<div class="qr-company-inline" style="font-size:11px;color:var(--muted);">' + esc(p.empresa) + '</div>' : '') + '</td>' +
      '<td style="font-size:13px;white-space:nowrap;">' + esc(p.telefono || '-') + '</td>' +
      '<td class="qr-col-company" style="font-size:13px;">' + esc(p.empresa || '-') + '</td>' +
      '<td style="text-align:center;"><button class="btn btn-ghost btn-sm" onclick="rfRemoveParticipant(\'' + esc(p.id) + '\')" title="Quitar" style="padding:4px;height:auto;color:#dc2626;"><i data-lucide="trash-2" style="width:15px;height:15px;"></i></button></td></tr>'
    ).join('');
  }
  lucide.createIcons();
}
document.getElementById('qr-search').addEventListener('input', () => qrRender());

// ---------------------------------------------------------------------
// CARGA DE PARTICIPANTES (se guardan en la base)
// ---------------------------------------------------------------------
async function rfAddMany(items) {
  if (!rfCurrent) return { added: 0, dup: 0 };
  const existing = new Set(rfParticipants.map(qrKey));
  const toAdd = []; let dup = 0;
  items.forEach(p => {
    const nombre = String(p.nombre || '').trim().slice(0, 150);
    if (!nombre) return;
    const row = { raffle_id: rfCurrent.id, nombre, telefono: String(p.telefono || '').trim().slice(0, 40) || null, empresa: String(p.empresa || '').trim().slice(0, 150) || null };
    if (p.registration_id) row.registration_id = p.registration_id;
    const k = qrKey(row);
    if (existing.has(k)) { dup++; return; }
    existing.add(k); toAdd.push(row);
  });
  if (toAdd.length) {
    const saved = await rfInsertChunks('raffle_participants', toAdd);
    rfParticipants.push(...saved);
  }
  qrRender();
  return { added: toAdd.length, dup };
}

function qrReportImport(r) {
  if (r.added === 0 && r.dup > 0) { showToast('Todos ya estaban cargados (' + r.dup + ' duplicados)', 'error'); return; }
  if (r.added === 0) { showToast('No se encontraron participantes validos', 'error'); return; }
  showToast(r.added + ' participante' + (r.added !== 1 ? 's' : '') + ' guardado' + (r.added !== 1 ? 's' : '') + (r.dup ? ' · ' + r.dup + ' duplicado' + (r.dup !== 1 ? 's' : '') + ' omitido' + (r.dup !== 1 ? 's' : '') : ''), 'success');
}

// Convierte filas (arrays de celdas) en participantes {nombre, telefono, empresa}
function qrParseRows(rows) {
  rows = (rows || []).map(r => (r || []).map(c => (c === null || c === undefined) ? '' : String(c).trim()))
                     .filter(r => r.some(c => c !== ''));
  if (!rows.length) return [];
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const head = rows[0].map(norm);
  const find = (keys, exclude) => head.findIndex((h, i) => !(exclude || []).includes(i) && h.length < 40 && keys.some(k => h.includes(k)));

  let iComp = find(['empresa', 'compan', 'razon social', 'organiz', 'institu', 'firma']);
  let iPhone = find(['tel', 'cel', 'phone', 'movil', 'whats', 'contacto', 'numero', 'nro'], [iComp]);
  let iName = find(['nombre', 'name', 'participante', 'cliente', 'asistente', 'persona'], [iComp, iPhone]);
  let iLast = find(['apellido', 'last'], [iComp, iPhone, iName]);
  if (iName < 0 && iLast >= 0) { iName = iLast; iLast = -1; }
  const hasHeader = iName >= 0 || iPhone >= 0 || iComp >= 0;
  let data = hasHeader ? rows.slice(1) : rows;

  if (!hasHeader || iName < 0) {
    // Detectar columnas por contenido
    const nCols = Math.max(...rows.map(r => r.length));
    const isPhone = v => /^[+(]?\d[\d\s\-().]{5,}$/.test(v) && v.replace(/\D/g, '').length >= 6;
    const isEmail = v => v.includes('@');
    const isNum = v => /^\d+([.,]\d+)?$/.test(v);
    const textCols = [];
    let phoneCol = iPhone;
    for (let c = 0; c < nCols; c++) {
      if (c === iComp || c === iPhone) continue;
      const vals = data.map(r => r[c] || '').filter(v => v);
      if (!vals.length) continue;
      const ratio = fn => vals.filter(fn).length / vals.length;
      if (phoneCol < 0 && ratio(isPhone) > 0.6) { phoneCol = c; continue; }
      if (ratio(isEmail) > 0.5) continue;
      if (ratio(isNum) > 0.6) continue; // columnas de numeracion / IDs
      textCols.push(c);
    }
    iPhone = phoneCol;
    if (iName < 0) iName = textCols.length ? textCols[0] : 0;
    if (iComp < 0 && textCols.length > 1) iComp = textCols.find(c => c !== iName);
  }

  return data.map(r => ({
    nombre: [(r[iName] || ''), (iLast >= 0 ? (r[iLast] || '') : '')].join(' ').trim(),
    telefono: iPhone >= 0 ? (r[iPhone] || '') : '',
    empresa: (iComp !== undefined && iComp >= 0) ? (r[iComp] || '') : ''
  })).filter(p => p.nombre);
}

async function qrImportPaste() {
  const txt = document.getElementById('qr-paste').value;
  if (!txt.trim()) { showToast('Pega primero las filas copiadas de Excel', 'error'); return; }
  const lines = txt.replace(/\r/g, '').split('\n').filter(l => l.trim() !== '');
  let delim = null;
  if (lines.some(l => l.includes('\t'))) delim = '\t';
  else if (lines.some(l => l.includes(';'))) delim = ';';
  else {
    const counts = lines.map(l => (l.match(/,/g) || []).length);
    if (counts[0] > 0 && counts.every(c => c === counts[0])) delim = ',';
  }
  try {
    const r = await rfAddMany(qrParseRows(lines.map(l => delim ? l.split(delim) : [l])));
    qrReportImport(r);
    if (r.added > 0) document.getElementById('qr-paste').value = '';
  } catch (err) { showToast('Error al guardar: ' + err.message, 'error'); }
}

async function qrHandleFile(file) {
  if (!file) return;
  try {
    const XLSX_LIB = window.XLSX;
    if (!XLSX_LIB) { showToast('Libreria Excel no cargada', 'error'); return; }
    const wb = XLSX_LIB.read(await file.arrayBuffer(), { type: 'array' });
    const rows = XLSX_LIB.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' });
    qrReportImport(await rfAddMany(qrParseRows(rows)));
  } catch (err) {
    showToast('No se pudo leer o guardar el archivo: ' + err.message, 'error');
  } finally { document.getElementById('qr-file').value = ''; }
}

document.getElementById('qr-manual-form').onsubmit = async (e) => {
  e.preventDefault();
  try {
    const r = await rfAddMany([{ nombre: document.getElementById('qr-fname').value, telefono: document.getElementById('qr-phone').value, empresa: document.getElementById('qr-comp').value }]);
    if (r.added) { e.target.reset(); document.getElementById('qr-fname').focus(); showToast('Participante guardado', 'success'); }
    else showToast('Ese participante ya esta en la lista', 'error');
  } catch (err) { showToast('Error: ' + err.message, 'error'); }
};
document.getElementById('qr-file').addEventListener('change', e => qrHandleFile(e.target.files[0]));
(function () {
  const dz = document.getElementById('qr-dropzone');
  ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('drag'); }));
  dz.addEventListener('drop', e => { if (e.dataTransfer.files && e.dataTransfer.files[0]) qrHandleFile(e.dataTransfer.files[0]); });
})();

async function rfRemoveParticipant(id) {
  const p = rfParticipants.find(x => x.id === id);
  if (!p || !confirm('¿Quitar a ' + p.nombre + ' de este sorteo?')) return;
  const { error } = await sb.from('raffle_participants').delete().eq('id', id);
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  rfParticipants = rfParticipants.filter(x => x.id !== id);
  qrRender();
}

async function rfSyncFromEvent() {
  if (!rfCurrent || !rfCurrent.event_id) return;
  try {
    const parts = await rfFetchEventParticipants(rfCurrent.event_id, true);
    const have = new Set(rfParticipants.map(p => p.registration_id).filter(Boolean));
    const r = await rfAddMany(parts.filter(p => !have.has(p.registration_id)));
    showToast(r.added ? r.added + ' presente' + (r.added !== 1 ? 's' : '') + ' nuevo' + (r.added !== 1 ? 's' : '') + ' agregado' + (r.added !== 1 ? 's' : '') : 'No hay presentes nuevos', r.added ? 'success' : '');
  } catch (err) { showToast('Error: ' + err.message, 'error'); }
}

async function rfToggleRemoveWinners(checked) {
  if (!rfCurrent) return;
  const { error } = await sb.from('raffles').update({ remove_winners: checked }).eq('id', rfCurrent.id);
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  rfCurrent.remove_winners = checked;
  qrRender();
}

async function rfRename() {
  if (!rfCurrent) return;
  const r = await Swal.fire({ title: 'Renombrar sorteo', input: 'text', inputValue: rfCurrent.name, showCancelButton: true, confirmButtonText: 'Guardar', cancelButtonText: 'Cancelar', inputValidator: v => !v.trim() && 'Escribi un nombre' });
  if (!r.isConfirmed) return;
  const { error } = await sb.from('raffles').update({ name: r.value.trim() }).eq('id', rfCurrent.id);
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  rfCurrent.name = r.value.trim(); rfRenderAll();
}

async function rfDeleteWinner(id) {
  const w = rfWinners.find(x => x.id === id);
  if (!w) return;
  const r = await Swal.fire({ title: '¿Anular este ganador?', html: '<b>' + esc(w.nombre) + '</b> deja de figurar como ganador y vuelve a participar.<br><span style="font-size:13px;color:#6b7280;">Queda registrado en el historial.</span>', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí, anular', cancelButtonText: 'Cancelar' });
  if (!r.isConfirmed) return;
  const { error } = await sb.from('raffle_winners').delete().eq('id', id);
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  rfWinners = rfWinners.filter(x => x.id !== id);
  rfRenderAll();
}

// ---------------------------------------------------------------------
// SORTEAR (ruleta) y guardar ganadores
// ---------------------------------------------------------------------
async function rfSaveWinner(d) {
  if (!rfCurrent || !d) return;
  const row = { raffle_id: rfCurrent.id, participant_id: d.pid || null, nombre: d.nombreOriginal || d.nombre, telefono: d.telefono || null, empresa: d.company || null };
  const { data, error } = await sb.from('raffle_winners').insert([row]).select().single();
  if (error) { showToast('ATENCION: el ganador no se pudo guardar: ' + error.message, 'error'); return; }
  rfWinners.push(data);
  rfRenderAll();
}

function rfStartSorteo() {
  const lista = rfEligible();
  if (lista.length < 2) { showToast('Se necesitan al menos 2 participantes habilitados', 'error'); return; }
  openLocalSorteo(
    lista.map(p => ({ id: p.id, first_name: p.nombre, phone: p.telefono, company: p.empresa })),
    rfCurrent.name,
    lista.length + ' participantes' + (rfWinners.length ? ' · ' + rfWinners.length + ' ganador' + (rfWinners.length !== 1 ? 'es' : '') + ' anteriores' : ''),
    !!rfCurrent.remove_winners,
    { onWinner: rfSaveWinner }
  );
}

function rfOpenWindow() {
  if (!rfCurrent) return;
  const base = window.location.href.split('?')[0].split('#')[0];
  window.open(base + '?sorteo=' + rfCurrent.id, '_blank', 'width=1280,height=800');
}

function rfExportExcel() {
  if (!rfCurrent) return;
  const X = window.XLSX; if (!X) { showToast('Libreria Excel no cargada', 'error'); return; }
  const wb = X.utils.book_new();
  const head = [['Sorteo:', rfCurrent.name], ['Evento:', rfCurrent.events && rfCurrent.events.name ? rfCurrent.events.name : '-'], ['Creado:', formatDateTime(rfCurrent.created_at)], []];
  const win = [...head, ['Puesto', 'Ganador', 'Telefono', 'Empresa', 'Fecha y hora', 'Sorteado por'], ...rfWinners.map((w, i) => [(i + 1) + '°', w.nombre, w.telefono || '', w.empresa || '', formatDateTime(w.won_at), w.drawn_by || ''])];
  const par = [...head, ['#', 'Nombre', 'Telefono', 'Empresa'], ...rfParticipants.map((p, i) => [i + 1, p.nombre, p.telefono || '', p.empresa || ''])];
  [['Ganadores', win], ['Participantes', par]].forEach(([n, rows]) => {
    const ws = X.utils.aoa_to_sheet(rows);
    ws['!cols'] = rows.reduce((acc, row) => { row.forEach((c, i) => { const l = String(c || '').length; if (!acc[i] || acc[i].wch < l) acc[i] = { wch: Math.min(l + 2, 50) }; }); return acc; }, []);
    X.utils.book_append_sheet(wb, ws, n);
  });
  X.writeFile(wb, 'Sorteo_' + rfCurrent.name.trim().replace(/[\/\\?%*:|"<>]/g, '-') + '.xlsx');
}

// ---------------------------------------------------------------------
// Lista del "sorteo rapido" anterior (guardada solo en el navegador)
// ---------------------------------------------------------------------
async function rfImportLegacy() {
  const legacy = rfLegacyList();
  if (!legacy.length) return;
  try {
    const { data: raffle, error } = await sb.from('raffles').insert([{ name: 'Sorteo rápido (importado ' + new Date().toLocaleDateString('es-PY') + ')' }]).select().single();
    if (error) throw error;
    await rfInsertChunks('raffle_participants', legacy.filter(p => (p.nombre || '').trim()).map(p => ({ raffle_id: raffle.id, nombre: p.nombre.trim(), telefono: p.telefono || null, empresa: p.empresa || null })));
    localStorage.removeItem(QR_LEGACY_KEY);
    showToast('Lista guardada como sorteo', 'success');
    rfOpen(raffle.id);
  } catch (err) { showToast('Error: ' + err.message, 'error'); }
}
function rfDiscardLegacy() {
  if (!confirm('¿Descartar la lista guardada en este navegador?')) return;
  try { localStorage.removeItem(QR_LEGACY_KEY); } catch (e) {}
  rfLoadList();
}

// Si se sorteo en la "Pantalla aparte", al volver a esta ventana se actualizan los ganadores
window.addEventListener('focus', async () => {
  if (!rfCurrent || !document.getElementById('view-sorteo-detalle').classList.contains('active')) return;
  if (document.getElementById('sorteo-root').classList.contains('active')) return;
  const { data } = await sb.from('raffle_winners').select('*').eq('raffle_id', rfCurrent.id).order('won_at', { ascending: true });
  if (data && data.length !== rfWinners.length) { rfWinners = data; rfRenderAll(); }
});
