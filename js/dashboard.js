/* Comagro Eventos - dashboard.js
   Dashboard y estados de eventos */

// DASHBOARD
async function loadAdminDashboard() {
  const { data: events } = await sb.from('events').select('*').order('date', { ascending: false });
  const { data: regs } = await sb.from('registrations').select('id, status, event_id');
  allEvents = events || [];
  const activeEvents = allEvents.filter(e => e.status !== 'eliminado');
  const totalRegs = regs ? regs.length : 0;
  const presentes = regs ? regs.filter(r => r.status === 'presente').length : 0;

  document.getElementById('stat-total-events').textContent = activeEvents.length;
  document.getElementById('stat-total-regs').textContent = totalRegs;
  document.getElementById('stat-presentes').textContent = presentes;

  const today = new Date().toISOString().split('T')[0];
  const upcoming = activeEvents.filter(e => e.date >= today).sort((a,b) => a.date.localeCompare(b.date));
  document.getElementById('stat-proximo').textContent = upcoming.length > 0
    ? (upcoming[0].name.length > 18 ? upcoming[0].name.substring(0,18)+'...' : upcoming[0].name)
    : '-';

  const tbody = document.querySelector('#tbl-dash-events tbody');
  if (activeEvents.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--muted);">No hay eventos registrados aun.</td></tr>';
    return;
  }
  tbody.innerHTML = activeEvents.slice(0,8).map(ev => {
    const count = regs ? regs.filter(r => String(r.event_id) === String(ev.id)).length : 0;
    const presentes = regs ? regs.filter(r => String(r.event_id) === String(ev.id) && r.status === 'presente').length : 0;
    const status = getEventStatus(ev);
    return '<tr><td><strong style="color:var(--navy);">'+esc(ev.name)+'</strong></td><td><span class="badge badge-navy" style="text-transform:capitalize;">'+esc(ev.type||'-')+'</span></td><td style="white-space:nowrap;">'+formatDate(ev.date)+'</td><td><span class="badge badge-navy" title="Inscriptos">'+count+'</span> <span class="badge" style="background:#2d9e5f;color:white;" title="Presentes">'+presentes+'</span></td><td>'+statusBadge(status)+'</td><td><button class="btn btn-sm btn-outline" onclick="manageEvent(\''+ev.id+'\')">Ver detalles</button></td></tr>';
  }).join('');
  lucide.createIcons();
}

function getEventStatus(ev) {
  if (ev.status === 'eliminado') return 'eliminado';
  if (ev.status === 'pausado') return 'pausado';
  const today = new Date().toISOString().split('T')[0];
  if (ev.date < today) return 'finalizado';
  if (ev.max_capacity && ev.spots_remaining !== null && ev.spots_remaining <= 0) return 'lleno';
  return 'activo';
}

function statusBadge(status) {
  const map = { activo: 'badge-activo', finalizado: 'badge-finalizado', lleno: 'badge-lleno', eliminado: 'badge-danger' };
  const labels = { activo: 'Activo', finalizado: 'Finalizado', lleno: 'Cupos llenos', eliminado: 'Eliminado' };
  return '<span class="badge '+(map[status]||'badge-navy')+'">'+(labels[status]||status)+'</span>';
}
