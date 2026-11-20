/* Comagro Eventos - core.js
   Configuracion, estado global, arranque, navegacion y utilidades. Debe cargarse PRIMERO. */

function esc(str) {
  if (str === null || str === undefined) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

(function(){
      function forceVP() {
        var meta = document.querySelector('meta[name="viewport"]');
        if (meta && meta.content !== "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0") {
          meta.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0";
        } else if (!meta) {
          meta = document.createElement('meta');
          meta.name = "viewport";
          meta.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0";
          document.head.appendChild(meta);
        }
        try {
          if (window.parent && window.parent !== window) {
            var pMeta = window.parent.document.querySelector('meta[name="viewport"]');
            if (pMeta && pMeta.content !== "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0") {
              pMeta.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0";
            } else if (!pMeta) {
              pMeta = window.parent.document.createElement('meta');
              pMeta.name = "viewport";
              pMeta.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0";
              window.parent.document.head.appendChild(pMeta);
            }
          }
        } catch(e) {}
      }
      forceVP();
      setInterval(forceVP, 1000);
    })();

    if (typeof lucide === 'undefined') window.lucide = { createIcons: () => {} };

    const SUPABASE_URL = 'https://itylpvuzflqlmmqvdhbz.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0eWxwdnV6ZmxxbG1tcXZkaGJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNjYzMTgsImV4cCI6MjA5MTg0MjMxOH0.yuZ5sWX-Isxd04ySP_ZgDLit1fQDsxoeb25GmU_C_5I';
    const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    let allEvents = [];
    let currentRegs = [];
    let currentEventShifts = [];
    let currentShiftFilter = null;
    let currentEventId = null;
    let currentEventData = null;
    let currentBudgetItems = [];
    let realtimeChannel = null;
    let reportCharts = {};

    // BOOT
    window.onload = async () => {
      if (new URLSearchParams(window.location.search).has('sorteo') || new URLSearchParams(window.location.search).has('sorteo-link')) { document.documentElement.style.visibility = 'visible'; return; }
      lucide.createIcons();
      const hash = window.location.hash;
if (hash.startsWith('#/lista/')) { const evId = hash.split('/').pop(); hideLoading(); showPublicLista(evId); return; }
      if (hash.startsWith('#/registro/')) {
        const evId = hash.split('/').pop();
        hideLoading();
        showPublicForm(evId);
        return;
      }
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { sessionStorage.setItem('redirect_to_eventos','1'); window.location.replace('/login'); return; }

      const { data: admin, error: adminError } = await sb.from('event_admins').select('email').eq('email', session.user.email).single();
      if (adminError && adminError.code !== 'PGRST116') { hideLoading(); showError('Error de configuracion', adminError.message); return; }
      if (!admin) { hideLoading(); showError('Acceso restringido', 'Tu correo no tiene autorizacion para ingresar a esta seccion.'); return; }

      const email = session.user.email || '';
      document.getElementById('user-email-display').textContent = email;
      document.getElementById('user-avatar').textContent = email.charAt(0).toUpperCase();
      hideLoading();
      document.getElementById('admin-shell').style.display = '';
      document.getElementById('ce-root').style.display = '';

      const navHash = window.location.hash.replace('#','');
      const validViews = ['dashboard','eventos','reportes','papelera','gestion','reporte-detalle','sorteos','sorteo-detalle'];
      const startView = validViews.includes(navHash) ? navHash : 'dashboard';
      switchView(startView);

      window.addEventListener('popstate', function(e) {
        const v = e.state && e.state.view ? e.state.view : 'dashboard';
        document.querySelectorAll('.ce-view').forEach(x => x.classList.remove('active'));
        const tgt = document.getElementById('view-' + v);
        if (tgt) tgt.classList.add('active');
        document.querySelectorAll('.ce-nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === v));
        const m = VIEW_TITLES[v];
        if (m && m[0]) { document.getElementById('topbar-title').textContent = m[0]; document.getElementById('topbar-sub').textContent = m[1]; }
        if (v === 'eventos') renderEventsGrid();
        if (v === 'papelera') renderTrashGrid();
        if (v === 'dashboard') loadAdminDashboard();
        if (v === 'reportes') renderReportCards();
        if (v === 'sorteos') rfLoadList();
        if (v === 'sorteo-detalle' && typeof rfCurrent !== 'undefined' && rfCurrent) rfRenderAll();
        lucide.createIcons();
      });
    };

    function showError(title, msg) {
      document.getElementById('ce-root').style.display = '';
      document.getElementById('ce-root').innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:sans-serif;background:#f5f4f0;"><div style="text-align:center;padding:40px;"><img src="https://www.chacomer.com.py/media/wysiwyg/comagro/ISOLOGO_COMAGRO_COLOR.png" style="width:140px;margin-bottom:24px;"><h2 style="color:#0d2359;margin-bottom:12px;">'+title+'</h2><p style="color:#6b7280;">'+msg+'</p></div></div>';
    }

    function hideLoading() {
      document.documentElement.style.visibility = 'visible';
      const loader = document.getElementById('ce-loading');
      loader.style.opacity = '0';
      setTimeout(() => loader.style.display = 'none', 300);
      document.getElementById('ce-root').style.display = '';
    }

    async function logout() { await sb.auth.signOut(); window.location.replace('/login'); }

    const VIEW_TITLES = {
      dashboard: ['Dashboard', 'Resumen general de actividad'],
      eventos: ['Mis Eventos', 'Gestion de agenda y registro'],
      reportes: ['Informes y Reportes', 'Analitica de eventos'],
      gestion: ['Detalles', 'Gestion de inscriptos'],
      'reporte-detalle': ['Detalle', 'Visualizando datos del evento'],
      papelera: ['Papelera de Eventos', 'Recupera o elimina eventos descartados'],
      sorteos: ['Sorteos', 'Crea sorteos y guarda sus ganadores'],
      'sorteo-detalle': ['Sorteo', 'Participantes y ganadores']
    };

    function switchView(id) {
      document.querySelectorAll('.ce-view').forEach(v => v.classList.remove('active'));
      const target = document.getElementById('view-' + id);
      if (target) target.classList.add('active');
      document.querySelectorAll('.ce-nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === id || (id === 'sorteo-detalle' && n.dataset.view === 'sorteos')));
      const meta = VIEW_TITLES[id];
      if (meta && meta[0]) {
        document.getElementById('topbar-title').textContent = meta[0];
        document.getElementById('topbar-sub').textContent = meta[1];
      }
      if (id === 'eventos') renderEventsGrid();
      if (id === 'papelera') renderTrashGrid();
      if (id === 'dashboard') loadAdminDashboard();
      if (id === 'reportes') renderReportCards();
      if (id === 'sorteos') rfLoadList();
      if (id === 'sorteo-detalle' && (typeof rfCurrent === 'undefined' || !rfCurrent)) { switchView('sorteos'); return; }
      toggleSidebar(false);
      lucide.createIcons();
      history.pushState({ view: id }, '', '#' + id);
    }

    function buildRegLink(id) { return window.location.href.split('#')[0] + '#/registro/' + id; }
    function copyRegLink(id) { if (!id) return; navigator.clipboard.writeText(buildRegLink(id)).then(() => showToast('Enlace copiado al portapapeles', 'success')); }
    function formatDate(dateStr) { if (!dateStr) return '-'; const [y,m,d] = dateStr.split('-'); const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']; return parseInt(d)+' '+months[parseInt(m)-1]+' '+y; }
    function formatDateTime(isoString) { if (!isoString) return '-'; return new Date(isoString).toLocaleString('es-PY', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
    function fmtNum(n) { return Number(n).toLocaleString('es-PY'); }

    function showToast(msg, type) {
      type = type || '';
      const existing = document.querySelector('.toast');
      if (existing) existing.remove();
      const t = document.createElement('div');
      t.className = 'toast'+(type?' toast-'+type:'');
      t.innerHTML = '<i data-lucide="'+(type==='success'?'check-circle':type==='error'?'x-circle':'info')+'"></i>'+msg;
      document.body.appendChild(t);
      lucide.createIcons();
      setTimeout(() => { t.style.opacity='0'; t.style.transform='translateY(8px)'; t.style.transition='all .3s'; setTimeout(()=>t.remove(),300); }, 3000);
    }

    window.addEventListener('hashchange', () => {
      const hash = window.location.hash;
if (hash.startsWith('#/lista/')) { const evId = hash.split('/').pop(); showPublicLista(evId); return; }
      if (hash.startsWith('#/registro/')) {
        const evId = hash.split('/').pop();
        document.getElementById('public-reg-form').reset();
        document.getElementById('public-reg-form').style.display = 'grid';
        document.getElementById('pub-success').classList.remove('active');
        document.getElementById('pub-full').style.display = 'none';
        showPublicForm(evId);
      } else if (hash===''||hash==='#') { location.reload(); }
    });

// =============================================
// MENU MOVIL
// =============================================
function toggleSidebar(force) {
  const sb_ = document.querySelector('.ce-sidebar');
  const bd = document.getElementById('ce-sidebar-backdrop');
  if (!sb_ || !bd) return;
  const open = (typeof force === 'boolean') ? force : !sb_.classList.contains('open');
  sb_.classList.toggle('open', open);
  bd.classList.toggle('show', open);
}

// Re-dibuja iconos cuando lucide termine de cargar
var _li=setInterval(function(){if(window.lucide){window.lucide.createIcons();clearInterval(_li);}},150);
