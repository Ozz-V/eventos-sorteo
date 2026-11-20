/* Comagro Eventos - sorteo-rapido.js
   Sorteo rapido con lista local (manual, Excel o pegado) */

// =============================================
// SORTEO RAPIDO (datos locales, sin base de datos)
// =============================================
const QR_KEY = 'comagro_sorteo_rapido_v1';
let qrList = [];
try { qrList = JSON.parse(localStorage.getItem(QR_KEY) || '[]') || []; } catch (e) { qrList = []; }
function qrSave() { try { localStorage.setItem(QR_KEY, JSON.stringify(qrList)); } catch (e) {} }

function qrSwitchTab(tab) {
  document.querySelectorAll('#qr-tabs .ce-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('#view-sorteo-rapido .ce-tab-panel').forEach(p => p.classList.toggle('active', p.id === 'qr-panel-' + tab));
}

function qrKey(p) { return (p.nombre || '').trim().toLowerCase().replace(/\s+/g, ' ') + '|' + String(p.telefono || '').replace(/\D/g, ''); }

function qrAddMany(items) {
  const existing = new Set(qrList.map(qrKey));
  let added = 0, dup = 0;
  items.forEach(p => {
    const nombre = String(p.nombre || '').trim();
    if (!nombre) return;
    const clean = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      nombre: nombre,
      telefono: String(p.telefono || '').trim(),
      empresa: String(p.empresa || '').trim()
    };
    const k = qrKey(clean);
    if (existing.has(k)) { dup++; return; }
    existing.add(k); qrList.push(clean); added++;
  });
  qrSave(); qrRender();
  return { added, dup };
}

function qrReportImport(r) {
  if (r.added === 0 && r.dup > 0) { showToast('Todos ya estaban cargados (' + r.dup + ' duplicados)', 'error'); return; }
  if (r.added === 0) { showToast('No se encontraron participantes validos', 'error'); return; }
  showToast(r.added + ' participante' + (r.added !== 1 ? 's' : '') + ' agregado' + (r.added !== 1 ? 's' : '') + (r.dup ? ' · ' + r.dup + ' duplicado' + (r.dup !== 1 ? 's' : '') + ' omitido' + (r.dup !== 1 ? 's' : '') : ''), 'success');
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

function qrImportPaste() {
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
  const rows = lines.map(l => delim ? l.split(delim) : [l]);
  const r = qrAddMany(qrParseRows(rows));
  qrReportImport(r);
  if (r.added > 0) document.getElementById('qr-paste').value = '';
}

async function qrHandleFile(file) {
  if (!file) return;
  try {
    const XLSX_LIB = window.XLSX;
    if (!XLSX_LIB) { showToast('Libreria Excel no cargada', 'error'); return; }
    const buf = await file.arrayBuffer();
    const wb = XLSX_LIB.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX_LIB.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
    qrReportImport(qrAddMany(qrParseRows(rows)));
  } catch (err) {
    showToast('No se pudo leer el archivo: ' + err.message, 'error');
  } finally {
    document.getElementById('qr-file').value = '';
  }
}

function qrRender() {
  const tbody = document.querySelector('#qr-table tbody');
  if (!tbody) return;
  const q = (document.getElementById('qr-search').value || '').trim().toLowerCase();
  const n = qrList.length;
  document.getElementById('qr-count-badge').textContent = n;
  document.getElementById('qr-count-sub').textContent = n === 0
    ? 'Carga participantes y sortea al instante'
    : n + ' participante' + (n !== 1 ? 's' : '') + ' listo' + (n !== 1 ? 's' : '') + ' para sortear';
  ['qr-sortear-btn', 'qr-sortear-btn-m'].forEach(id => {
    const b = document.getElementById(id);
    if (b) { b.disabled = n < 2; b.innerHTML = '<i data-lucide="trophy"></i> Sortear' + (n ? ' (' + n + ')' : ''); }
  });
  const rows = qrList.map((p, i) => ({ p, i })).filter(({ p }) => !q || (p.nombre + ' ' + p.empresa + ' ' + p.telefono).toLowerCase().includes(q));
  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--muted);">' + (q ? 'Sin resultados para "' + esc(q) + '"' : 'Todavia no hay participantes. Cargalos a mano, subi un Excel o pega las filas.') + '</td></tr>';
  } else {
    tbody.innerHTML = rows.map(({ p, i }) =>
      '<tr><td><code>' + (i + 1) + '</code></td>' +
      '<td><div style="font-weight:600;color:var(--navy);">' + esc(p.nombre) + '</div>' +
      (p.empresa ? '<div class="qr-company-inline" style="font-size:11px;color:var(--muted);">' + esc(p.empresa) + '</div>' : '') + '</td>' +
      '<td style="font-size:13px;white-space:nowrap;">' + esc(p.telefono || '-') + '</td>' +
      '<td class="qr-col-company" style="font-size:13px;">' + esc(p.empresa || '-') + '</td>' +
      '<td style="text-align:center;"><button class="btn btn-ghost btn-sm" onclick="qrRemove(\'' + p.id + '\')" title="Quitar" style="padding:4px;height:auto;color:#dc2626;"><i data-lucide="trash-2" style="width:15px;height:15px;"></i></button></td></tr>'
    ).join('');
  }
  lucide.createIcons();
}

function qrRemove(id) {
  qrList = qrList.filter(p => p.id !== id);
  qrSave(); qrRender();
}

function qrClearAll() {
  if (!qrList.length) return;
  Swal.fire({
    title: '¿Vaciar la lista?',
    text: 'Se quitaran los ' + qrList.length + ' participantes cargados.',
    icon: 'warning', showCancelButton: true,
    confirmButtonColor: '#d33', cancelButtonColor: '#6b7280',
    confirmButtonText: 'Sí, vaciar', cancelButtonText: 'Cancelar'
  }).then(r => { if (r.isConfirmed) { qrList = []; qrSave(); qrRender(); showToast('Lista vaciada', ''); } });
}

function qrStartSorteo() {
  if (qrList.length < 2) { showToast('Necesitas al menos 2 participantes', 'error'); return; }
  const title = document.getElementById('qr-title').value.trim() || 'Sorteo rápido';
  const lista = qrList.map(p => ({ first_name: p.nombre, phone: p.telefono, company: p.empresa }));
  openLocalSorteo(lista, title, qrList.length + ' participantes cargados', document.getElementById('qr-remove-winner').checked);
}

document.getElementById('qr-manual-form').onsubmit = (e) => {
  e.preventDefault();
  const r = qrAddMany([{
    nombre: document.getElementById('qr-fname').value,
    telefono: document.getElementById('qr-phone').value,
    empresa: document.getElementById('qr-comp').value
  }]);
  if (r.added) { e.target.reset(); document.getElementById('qr-fname').focus(); showToast('Participante agregado', 'success'); }
  else showToast('Ese participante ya esta en la lista', 'error');
};
document.getElementById('qr-search').addEventListener('input', () => qrRender());
document.getElementById('qr-file').addEventListener('change', e => qrHandleFile(e.target.files[0]));
(function () {
  const dz = document.getElementById('qr-dropzone');
  ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('drag'); }));
  dz.addEventListener('drop', e => { if (e.dataTransfer.files && e.dataTransfer.files[0]) qrHandleFile(e.dataTransfer.files[0]); });
})();
