/* Comagro Eventos - presupuesto.js
   Presupuesto e items de gasto */

// =============================================
// PRESUPUESTO INLINE
// =============================================
async function loadBudgetInline(eventId) {
  const ev = allEvents.find(x => x.id == eventId);
  const budget = ev ? (ev.budget || 0) : 0;
  const { data: items } = await sb.from('event_budget_items').select('*').eq('event_id', eventId).order('created_at');
  currentBudgetItems = items || [];
  renderBudgetInline(budget);
}

function renderBudgetInline(budget) {
  const actions = document.getElementById('budget-header-actions');
  const body = document.getElementById('budget-inline-body');
  const total = currentBudgetItems.reduce((s, i) => s + Number(i.monto), 0);

  if (!budget || budget === 0) {
    actions.innerHTML = '';
    body.innerHTML = `
      <div class="budget-inline-empty">
        <i data-lucide="wallet" style="width:40px;height:40px;color:#d1d5db;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;"></i>
        <h4>Sin presupuesto asignado</h4>
        <p>Agrega un presupuesto para controlar los gastos de este evento.</p>
        <button class="btn btn-primary" onclick="openBudgetModal()">
          <i data-lucide="plus"></i> Agregar presupuesto
        </button>
      </div>`;
    lucide.createIcons();
    return;
  }

  const pct = Math.min((total/budget)*100, 100);
  const barClass = pct >= 100 ? ' danger' : pct >= 75 ? ' warning' : '';

  actions.innerHTML = `
    <button class="btn btn-outline btn-sm" onclick="openBudgetModal()">
      <i data-lucide="edit-2"></i> Editar monto
    </button>
    <button class="btn btn-danger btn-sm" onclick="deleteBudgetTotal()">
      <i data-lucide="trash-2"></i> Borrar presupuesto
    </button>`;

  body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
      <div>
        <div class="stat-label">Presupuesto total</div>
        <div style="font-size:28px;font-weight:700;color:var(--navy);">Gs. ${fmtNum(budget)}</div>
      </div>
      <div style="text-align:right;">
        <div class="stat-label">Gastado</div>
        <div style="font-size:22px;font-weight:700;color:${pct>=100?'#dc2626':pct>=75?'var(--gold)':'var(--green)'};">Gs. ${fmtNum(total)}</div>
      </div>
    </div>

    <div class="budget-bar-labels">
      <span style="font-weight:600;color:var(--navy);">Gs. ${fmtNum(total)} gastados</span>
      <span style="color:var(--muted);">${Math.round(pct)}%</span>
    </div>
    <div class="budget-bar-track">
      <div class="budget-bar-fill${barClass}" style="width:${pct}%"></div>
    </div>
    <div style="font-size:11px;color:var(--muted);margin-top:4px;">Gs. ${fmtNum(Math.max(budget-total,0))} disponibles</div>

    <div style="margin-top:24px;">
      <div style="font-size:13px;font-weight:600;color:var(--navy);margin-bottom:12px;">Items de gasto</div>
      <table class="budget-items-table">
        <thead><tr><th>Concepto</th><th style="text-align:right;">Monto (Gs.)</th><th style="width:80px;"></th></tr></thead>
        <tbody id="budget-items-tbody">
          ${currentBudgetItems.length === 0
            ? '<tr><td colspan="3" style="text-align:center;padding:20px;color:var(--muted);">Sin items de gasto aun.</td></tr>'
            : currentBudgetItems.map(item =>
                `<tr id="brow-${item.id}">
                  <td>${esc(item.concepto)}</td>
                  <td style="text-align:right;font-weight:600;color:var(--navy);">Gs. ${fmtNum(item.monto)}</td>
                  <td style="text-align:center;white-space:nowrap;">
                    <button class="btn btn-ghost btn-sm" onclick="startEditBudgetItem('${item.id}')" style="padding:4px;height:auto;color:var(--navy);" title="Editar"><i data-lucide="pencil" style="width:13px;height:13px;"></i></button>
                    <button class="btn btn-ghost btn-sm" onclick="deleteBudgetItem('${item.id}')" style="padding:4px;height:auto;color:#dc2626;" title="Eliminar"><i data-lucide="trash-2" style="width:13px;height:13px;"></i></button>
                  </td>
                </tr>`
              ).join('')
          }
          ${currentBudgetItems.length > 0 ? `<tr style="background:#fafaf8;"><td style="font-weight:700;color:var(--navy);">TOTAL</td><td style="text-align:right;font-weight:700;color:var(--navy);">Gs. ${fmtNum(total)}</td><td></td></tr>` : ''}
        </tbody>
      </table>
      <div class="budget-add-row" style="margin-top:16px;">
        <input type="text" id="b-concepto" placeholder="Concepto (ej: Catering)">
        <input type="number" id="b-monto" placeholder="Monto Gs." min="0" style="max-width:160px;">
        <button class="btn btn-success btn-sm" onclick="addBudgetItem()"><i data-lucide="plus"></i> Agregar</button>
      </div>
    </div>`;
  lucide.createIcons();
}

function openBudgetModal() {
  const ev = allEvents.find(x => x.id == currentEventId);
  const hasBudget = ev && ev.budget;
  document.getElementById('modal-budget-title').textContent = hasBudget ? 'Editar Presupuesto' : 'Agregar Presupuesto';
  document.getElementById('edit-budget-val').value = hasBudget ? ev.budget : '';
  document.getElementById('modal-edit-budget').classList.remove('hidden');
}

async function saveBudgetTotal() {
  const val = parseFloat(document.getElementById('edit-budget-val').value);
  if (isNaN(val) || val <= 0) { showToast('Ingresa un monto valido', 'error'); return; }
  const { error } = await sb.from('events').update({ budget: val }).eq('id', currentEventId);
  if (!error) {
    document.getElementById('modal-edit-budget').classList.add('hidden');
    const { data } = await sb.from('events').select('*').order('date', { ascending: false });
    allEvents = data || [];
    currentEventData = allEvents.find(x => x.id == currentEventId);
    await loadBudgetInline(currentEventId);
    showToast('Presupuesto guardado', 'success');
  } else showToast('Error: '+error.message, 'error');
}

async function deleteBudgetTotal() {
  if (!confirm('¿Borrar el presupuesto y todos los items de gasto de este evento?\nEsta accion no se puede deshacer.')) return;
  await sb.from('event_budget_items').delete().eq('event_id', currentEventId);
  await sb.from('events').update({ budget: null }).eq('id', currentEventId);
  const { data } = await sb.from('events').select('*').order('date', { ascending: false });
  allEvents = data || [];
  currentEventData = allEvents.find(x => x.id == currentEventId);
  currentBudgetItems = [];
  renderBudgetInline(0);
  showToast('Presupuesto eliminado', '');
}

async function addBudgetItem() {
  const concepto = document.getElementById('b-concepto').value.trim();
  const monto = parseFloat(document.getElementById('b-monto').value);
  if (!concepto || isNaN(monto) || monto <= 0) { showToast('Completa concepto y monto', 'error'); return; }
  const { error } = await sb.from('event_budget_items').insert([{ event_id: currentEventId, concepto, monto }]);
  if (!error) {
    document.getElementById('b-concepto').value = '';
    document.getElementById('b-monto').value = '';
    await loadBudgetInline(currentEventId);
    showToast('Item agregado', 'success');
  } else showToast('Error: '+error.message, 'error');
}

async function deleteBudgetItem(id) {
  await sb.from('event_budget_items').delete().eq('id', id);
  await loadBudgetInline(currentEventId);
  showToast('Item eliminado', '');
}

function startEditBudgetItem(id) {
  const item = currentBudgetItems.find(x => x.id == id);
  if (!item) return;
  const row = document.getElementById('brow-'+id);
  row.innerHTML =
    '<td><input type="text" id="bedit-concepto-'+id+'" value="'+esc(item.concepto)+'" style="padding:6px 10px;border:1.5px solid var(--navy-mid);border-radius:7px;font-size:13px;font-family:inherit;width:100%;background:#fff;"></td>' +
    '<td><input type="number" id="bedit-monto-'+id+'" value="'+item.monto+'" style="padding:6px 10px;border:1.5px solid var(--navy-mid);border-radius:7px;font-size:13px;font-family:inherit;width:130px;background:#fff;text-align:right;"></td>' +
    '<td style="text-align:center;white-space:nowrap;">' +
      '<button class="btn btn-success btn-sm" onclick="saveEditBudgetItem(\''+id+'\')" style="padding:4px 10px;height:auto;" title="Guardar"><i data-lucide="check" style="width:13px;height:13px;"></i></button>' +
      '<button class="btn btn-ghost btn-sm" onclick="loadBudgetInline(currentEventId)" style="padding:4px;height:auto;" title="Cancelar"><i data-lucide="x" style="width:13px;height:13px;"></i></button>' +
    '</td>';
  lucide.createIcons();
  document.getElementById('bedit-concepto-'+id).focus();
}

async function saveEditBudgetItem(id) {
  const concepto = document.getElementById('bedit-concepto-'+id).value.trim();
  const monto = parseFloat(document.getElementById('bedit-monto-'+id).value);
  if (!concepto || isNaN(monto) || monto <= 0) { showToast('Completa concepto y monto', 'error'); return; }
  const { error } = await sb.from('event_budget_items').update({ concepto, monto }).eq('id', id);
  if (!error) {
    await loadBudgetInline(currentEventId);
    showToast('Item actualizado', 'success');
  } else showToast('Error: '+error.message, 'error');
}
