/* Comagro Eventos - layout.js
   Estructura HTML del sistema (pantallas, formularios, modales y ruleta).
   Se inserta dentro de <div id="comagro-app"> ANTES de cargar el resto de los scripts.
   Para cambiar textos o campos de pantalla, editar aca. */
(function () {
  var root = document.getElementById('comagro-app');
  if (!root) { console.error('Comagro: falta <div id="comagro-app"> en la pagina'); return; }
  root.innerHTML = `
  <div id="ce-loading">
    <img src="https://www.chacomer.com.py/media/wysiwyg/comagro/ISOLOGO_COMAGRO_COLOR.png" alt="Comagro">
    <div class="ce-spinner"></div>
  </div>

  <div id="ce-root" style="display:none;">

    <!-- VISTA PUBLICA -->
    <div id="view-registro-cliente">
      <div class="pub-wrap">
        <div class="pub-card">
          <div class="pub-card-top">
            <img src="https://www.chacomer.com.py/media/wysiwyg/comagro/ISOLOGO_COMAGRO_COLOR.png" alt="Comagro">
            <h2 id="pub-name">Inscripcion al Evento</h2>
            <p id="pub-meta">Cargando informacion...</p>
            <p id="pub-location" style="display:none; font-size:13px; color:rgba(255,255,255,0.9); margin-top:6px; display:flex; align-items:center; gap:6px; justify-content:center;"></p>
          </div>
          <div class="pub-card-body">
            
            <div id="pub-pauses-wrap" style="display:none; margin-bottom:24px; padding:16px; background:#f2f5fb; border-radius:8px;">
              <h4 style="margin:0 0 12px 0; color:var(--navy); font-size:15px; display:flex; align-items:center; gap:6px;"><i data-lucide="clock" style="width:16px;height:16px;"></i> Cronograma</h4>
              <div id="pub-pauses"></div>
            </div>

            <div id="pub-full" class="pub-full-msg" style="display:none;">
              <i data-lucide="users-x"></i>
              <h3>Cupos agotados</h3>
              <p>Lamentablemente los cupos para este evento estan llenos.<br>Seguinos en nuestras redes para enterarte de mas eventos, lanzamientos y capacitaciones.</p>
              <div style="display:flex;gap:12px;justify-content:center;margin-top:24px;flex-wrap:wrap;">
                <a href="https://www.instagram.com/comagropy" target="_blank" class="btn btn-outline btn-sm"><i data-lucide="instagram"></i> Instagram</a>
                <a href="https://www.facebook.com/comagropy" target="_blank" class="btn btn-outline btn-sm"><i data-lucide="facebook"></i> Facebook</a>
              </div>
            </div>
            <form id="public-reg-form" class="form-grid">
              <div id="pub-shifts-wrap" class="form-group full" style="display:none; margin-bottom:16px; background:#f0f5ff; padding:16px; border-radius:12px; border:1px solid #d0e1ff;">
                <label style="color:var(--navy); font-size:15px; margin-bottom:12px; display:block;"><i data-lucide="calendar-clock" style="width:16px;height:16px;display:inline;vertical-align:-3px;margin-right:6px;"></i>Selecciona tu turno <span style="color:#dc2626;">*</span></label>
                <div id="pub-shifts-options" style="display:flex; flex-direction:column; gap:8px;"></div>
              </div>
              <div class="form-group full"><label>Nombre y Apellido <span style="color:#dc2626;">*</span></label><input type="text" id="p-fname" placeholder="Juan Gonzalez" required></div>
              <div class="form-group full"><label>Correo electronico <span style="color:#dc2626;">*</span></label><input type="email" id="p-email" placeholder="juan@empresa.com" required></div>
              <div class="form-group full"><label>Telefono <span style="color:#dc2626;">*</span></label><input type="tel" id="p-phone" placeholder="+595 9xx xxx xxx" required></div>
              <div class="form-group full"><label>Empresa <span style="color:#dc2626;">*</span></label><input type="text" id="p-comp" placeholder="Nombre de la empresa" required></div>
              <div class="form-group full" style="margin-top:8px;"><button type="submit" class="btn btn-success btn-lg" style="width:100%;justify-content:center;">Confirmar inscripcion</button></div>
            </form>
            <div id="pub-success" class="pub-success">
              <i data-lucide="check-circle-2"></i>
              <h3>Registro completado!</h3>
              <p>Tu inscripcion fue confirmada. Recibiras mas informacion proximamente.</p>
            </div>
          </div>
        </div>
        <p style="text-align:center;font-size:12px;color:var(--muted);margin-top:20px;">&copy; 2026 Comagro S.A. &mdash; Todos los derechos reservados</p>
      </div>
    </div>

    <!-- PANEL ADMIN -->
    <div id="admin-shell" style="display:none;">

      <aside class="ce-sidebar">
        <div class="ce-sidebar-logo">
          <img src="https://www.chacomer.com.py/media/wysiwyg/comagro/ISOLOGO_COMAGRO_COLOR.png" alt="Comagro">
        </div>
        <div class="ce-sidebar-section">Navegacion</div>
        <nav class="ce-nav">
          <div class="ce-nav-item active" data-view="dashboard" onclick="switchView('dashboard')">
            <i data-lucide="layout-dashboard"></i><span class="nav-label">Dashboard</span>
          </div>
          <div class="ce-nav-item" data-view="eventos" onclick="switchView('eventos')">
            <i data-lucide="calendar-days"></i><span class="nav-label">Eventos</span>
          </div>
          <div class="ce-nav-item" data-view="reportes" onclick="switchView('reportes')">
            <i data-lucide="bar-chart-2"></i> Informes
          </div>
          <div class="ce-nav-item" data-view="sorteo-rapido" onclick="switchView('sorteo-rapido')">
            <i data-lucide="trophy"></i><span class="nav-label">Sorteo rápido</span>
          </div>
          <div class="ce-nav-item" data-view="papelera" onclick="switchView('papelera')">
            <i data-lucide="trash-2"></i> Papelera
          </div>
        </nav>
        <div class="ce-sidebar-footer">
          <div class="ce-user-chip">
            <div class="ce-avatar" id="user-avatar">?</div>
            <div class="ce-user-info"><div class="ce-user-email" id="user-email-display">&ndash;</div></div>
            <button class="ce-logout-btn" onclick="logout()" title="Cerrar sesion"><i data-lucide="log-out"></i></button>
          </div>
        </div>
      </aside>
      <div class="ce-sidebar-backdrop" id="ce-sidebar-backdrop" onclick="toggleSidebar(false)"></div>

      <div class="ce-main">
        <div class="ce-topbar">
          <div class="ce-topbar-left" style="display:flex;align-items:center;min-width:0;">
            <button class="ce-menu-btn" onclick="toggleSidebar()" title="Menu"><i data-lucide="menu"></i></button>
            <div style="min-width:0;">
              <h3 id="topbar-title">Dashboard</h3>
              <p id="topbar-sub">Panel de gestion de eventos</p>
            </div>
          </div>
          <div class="ce-topbar-right">
            <div class="flex items-center gap-8 text-sm text-muted">
              <div class="rt-dot"></div>
              <span style="font-size:12px;color:var(--muted);">Sincronizado</span>
            </div>
          </div>
        </div>

        <div class="ce-page">

          <!-- DASHBOARD -->
          <div id="view-dashboard" class="ce-view active">
            <div class="stats-row">
              <div class="stat-card">
                <div><div class="stat-label">Total Eventos</div><div class="stat-value" id="stat-total-events">&mdash;</div><div class="stat-sub">Registrados</div></div>
                <div class="stat-card-icon navy"><i data-lucide="calendar-days"></i></div>
              </div>
              <div class="stat-card">
                <div><div class="stat-label">Inscriptos</div><div class="stat-value" id="stat-total-regs">&mdash;</div><div class="stat-sub">En total</div></div>
                <div class="stat-card-icon green"><i data-lucide="users"></i></div>
              </div>
              <div class="stat-card">
                <div><div class="stat-label">Presentes</div><div class="stat-value" id="stat-presentes">&mdash;</div><div class="stat-sub">Check-in realizado</div></div>
                <div class="stat-card-icon gold"><i data-lucide="check-square"></i></div>
              </div>
              <div class="stat-card">
                <div><div class="stat-label">Proximo</div><div class="stat-value" id="stat-proximo" style="font-size:18px;">&mdash;</div><div class="stat-sub">Evento mas cercano</div></div>
                <div class="stat-card-icon soft"><i data-lucide="calendar-clock"></i></div>
              </div>
            </div>
            <div class="ce-card">
              <div class="ce-card-header">
                <span class="ce-card-title">Eventos recientes</span>
                <button class="btn btn-sm btn-primary" onclick="switchView('eventos')"><i data-lucide="plus"></i> Nuevo</button>
              </div>
              <div class="ce-table-wrap">
                <table id="tbl-dash-events">
                  <thead><tr><th>Evento</th><th>Tipo</th><th>Fecha</th><th>Inscriptos / Presentes</th><th>Estado</th><th></th></tr></thead>
                  <tbody></tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- EVENTOS -->
          <div id="view-eventos" class="ce-view">
            <div class="flex items-center" style="justify-content:space-between;margin-bottom:24px;">
              <div>
                <h2 style="font-family:'Roboto', sans-serif;font-size:26px;color:var(--navy);font-weight:400;">Mis Eventos</h2>
                <p class="text-sm text-muted" style="margin-top:3px;" id="events-count">Cargando...</p>
              </div>
              <button class="btn btn-primary" onclick="openCreateEventModal()"><i data-lucide="plus"></i> Nuevo Evento</button>
            </div>
            <div class="events-grid" id="events-grid"></div>
          </div>

          <!-- GESTION / DETALLE -->
          <div id="view-gestion" class="ce-view">
            <div class="flex items-center" style="justify-content:space-between;margin-bottom:24px;gap:16px;flex-wrap:wrap;">
              <div>
                <h2 id="cur-ev-name" style="font-family:'Roboto', sans-serif;font-size:26px;color:var(--navy);font-weight:400;">Cargando...</h2>
                <p id="cur-ev-meta" class="text-sm text-muted" style="margin-top:3px;"></p>
              </div>
              <div class="flex gap-8" style="flex-wrap:wrap;">
                <button class="btn btn-outline btn-sm" onclick="copyRegLink(currentEventId)"><i data-lucide="link"></i> Link de inscripcion</button>
                <button class="btn btn-outline btn-sm" onclick="openExportModal()"><i data-lucide="download"></i> Exportar Excel</button>
                <button class="btn btn-outline btn-sm" onclick="compartirLista(currentEventId)"><i data-lucide="share-2"></i> Compartir lista</button>
                <button class="btn btn-sm" onclick="abrirSorteo()" style="background:linear-gradient(135deg,#1b2868,#2d85b8);color:#fff;border:none;gap:8px;">
                  <i data-lucide="trophy"></i> Sorteo
                </button>
                <button class="btn btn-ghost btn-sm" onclick="switchView('eventos')"><i data-lucide="arrow-left"></i> Regresar</button>
              </div>
            </div>

            <!-- Inscriptos card -->
            <div class="ce-card mb-28">
              <div class="ce-card-header">
                <span class="ce-card-title"><i data-lucide="users" style="width:18px;height:18px;display:inline;margin-right:8px;vertical-align:middle;"></i>Inscriptos <span id="reg-count-badge" class="badge badge-navy" style="margin-left:10px;font-size:11px;">0</span></span>
                <div class="search-wrap"><i data-lucide="search"></i><input type="text" id="search-reg" placeholder="Buscar nombre, empresa..."></div>
                <div class="filter-wrap" style="margin-left:10px;">
                  <select id="filter-status-reg" class="form-control" style="padding-top:6px; padding-bottom:6px; border-radius:6px; height:36px; border:1px solid var(--border); font-size:14px; color:var(--text);">
                    <option value="todos">Todos los Estados</option>
                    <option value="presente">Solo Presentes</option>
                    <option value="pendiente">Solo Pendientes</option>
                  </select>
                </div>
              </div>

              <!-- CAMBIO 2: Tabs de turnos con nuevo diseño de botones -->
              <div id="shifts-tabs-container" style="display:none;" class="shifts-tabs-bar">
                <!-- Se rellena dinámicamente por renderShiftsTabs() -->
              </div>

              <!-- CAMBIO 1: Grid sin overflow - columna manual fija, tabla ocupa todo el resto -->
              <div style="display:flex;flex-direction:column;gap:22px;padding:22px;min-width:0;">
                <!-- Carga Manual -->
                <div class="ce-card" style="flex-shrink:0;">
                  <div class="ce-card-header"><span class="ce-card-title" style="font-size:16px;">Carga manual</span></div>
                  <div class="ce-card-body">
                    <form id="manual-reg-form" style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;">
                      <div class="form-group" style="flex:1;min-width:200px;margin:0;"><label>Nombre y Apellido</label><input type="text" id="m-fname" placeholder="Juan Gonzalez" required></div>
                      <div class="form-group" style="flex:1;min-width:200px;margin:0;"><label>Email</label><input type="email" id="m-email" placeholder="correo@empresa.com" required></div>
                      <div class="form-group" style="flex:1;min-width:150px;margin:0;"><label>Telefono</label><input type="text" id="m-phone" placeholder="+595 9xx xxx xxx" required></div>
                      <div class="form-group" style="flex:1;min-width:150px;margin:0;"><label>Empresa <span style="color:var(--muted);font-weight:400;">(opcional)</span></label><input type="text" id="m-comp" placeholder="Empresa"></div>
                      <div class="form-group" id="m-shift-wrap" style="display:none;flex:1;min-width:150px;margin:0;"><label>Turno <span style="color:#dc2626;">*</span></label><select id="m-shift"></select></div>
                      <button type="submit" class="btn btn-success" style="height:40px;padding:0 24px;"><i data-lucide="user-plus"></i> Registrar</button>
                    </form>
                  </div>
                </div>
                <div class="ce-card" style="min-width:0;overflow:hidden;">
                  <div style="overflow-x:hidden;overflow-y:auto;max-height:600px;">
                    <table id="tbl-registrations" style="width:100%;">
                      <thead><tr><th style="width:100px;">ID</th><th>Inscripto</th><th>Empresa</th><th style="width:160px;text-align:center;">Estado / Check-in</th></tr></thead>
                      <tbody></tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <!-- PRESUPUESTO INLINE -->
            <div class="ce-card" id="budget-inline-card">
              <div class="ce-card-header">
                <span class="ce-card-title"><i data-lucide="wallet" style="width:18px;height:18px;display:inline;margin-right:8px;vertical-align:middle;"></i>Presupuesto</span>
                <div class="flex gap-8" id="budget-header-actions">
                  <!-- Se rellena dinámicamente -->
                </div>
              </div>
              <div class="ce-card-body" id="budget-inline-body">
                <!-- Se rellena dinámicamente -->
              </div>
            </div>

          </div>

          <!-- REPORTES -->
          <div id="view-reportes" class="ce-view">
            <div style="margin-bottom:24px;">
              <h2 style="font-family:'Roboto', sans-serif;font-size:26px;color:var(--navy);font-weight:400;">Reportes</h2>
              <p class="text-sm text-muted" style="margin-top:3px;">Selecciona un evento para ver su reporte completo</p>
            </div>
            <div class="report-cards-grid" id="report-cards-grid"></div>
          </div>

          <!-- REPORTE DETALLE -->
          <div id="view-reporte-detalle" class="ce-view">
            <div class="report-header">
              <div>
                <h2 id="rep-ev-name" style="font-family:'Roboto', sans-serif;font-size:26px;color:var(--navy);font-weight:400;">Reporte</h2>
                <p id="rep-ev-meta" class="text-sm text-muted" style="margin-top:3px;"></p>
              </div>
              <div class="flex gap-8" style="flex-wrap:wrap;">
                <button class="btn btn-warning btn-sm" onclick="togglePauseEvent()" id="btn-pause-event"><i data-lucide="pause"></i> Pausar Inscripciones</button>
                <button class="btn btn-success btn-sm" onclick="exportReportPDF()"><i data-lucide="file-text"></i> Exportar PDF</button>
                <button class="btn btn-ghost btn-sm" onclick="switchView('reportes')"><i data-lucide="arrow-left"></i> Volver</button>
              </div>
            </div>

            <div class="stats-row" id="rep-stats-row" style="grid-template-columns:repeat(4,1fr);">
              <div class="stat-card"><div><div class="stat-label">Inscriptos</div><div class="stat-value" id="rep-stat-total">&mdash;</div><div class="stat-sub">Total registrados</div></div><div class="stat-card-icon navy"><i data-lucide="users"></i></div></div>
              <div class="stat-card"><div><div class="stat-label">Presentes</div><div class="stat-value" id="rep-stat-presentes">&mdash;</div><div class="stat-sub">Check-in realizado</div></div><div class="stat-card-icon green"><i data-lucide="user-check"></i></div></div>
              <div class="stat-card"><div><div class="stat-label">Asistencia</div><div class="stat-value" id="rep-stat-pct">&mdash;</div><div class="stat-sub">Porcentaje</div></div><div class="stat-card-icon gold"><i data-lucide="percent"></i></div></div>
              <div class="stat-card"><div><div class="stat-label">Ausentes</div><div class="stat-value" id="rep-stat-ausentes">&mdash;</div><div class="stat-sub">No asistieron</div></div><div class="stat-card-icon soft"><i data-lucide="user-x"></i></div></div>
            </div>

            <div class="report-grid-2">
              <div class="ce-card">
                <div class="ce-card-header"><span class="ce-card-title">Asistencia</span></div>
                <div class="ce-card-body"><div class="chart-container"><canvas id="chart-asistencia"></canvas></div></div>
              </div>
              <div class="ce-card">
                <div class="ce-card-header"><span class="ce-card-title">Registros por hora</span></div>
                <div class="ce-card-body"><div class="chart-container"><canvas id="chart-horas"></canvas></div></div>
              </div>
            </div>

            <div class="report-grid-2" id="rep-budget-section" style="display:none;">
              <div class="ce-card">
                <div class="ce-card-header"><span class="ce-card-title">Presupuesto vs Gasto</span></div>
                <div class="ce-card-body">
                  <div class="chart-container"><canvas id="chart-budget"></canvas></div>
                  <div class="budget-bar-wrap" style="margin-top:16px;">
                    <div class="budget-bar-labels">
                      <span id="rep-budget-spent" style="font-weight:600;color:var(--navy);">Gs. 0</span>
                      <span id="rep-budget-pct" style="color:var(--muted);">0%</span>
                    </div>
                    <div class="budget-bar-track"><div class="budget-bar-fill" id="rep-budget-bar" style="width:0%"></div></div>
                    <div style="font-size:11px;color:var(--muted);margin-top:4px;" id="rep-budget-remaining">Gs. 0 disponibles</div>
                  </div>
                </div>
              </div>
              <div class="ce-card">
                <div class="ce-card-header"><span class="ce-card-title">Detalle de gastos</span></div>
                <div class="ce-card-body">
                  <table class="budget-items-table" id="rep-budget-table">
                    <thead><tr><th>Concepto</th><th style="text-align:right;">Monto (Gs.)</th></tr></thead>
                    <tbody></tbody>
                  </table>
                </div>
              </div>
            </div>

            <div class="ce-card">
              <div class="ce-card-header"><span class="ce-card-title">Lista de inscriptos</span></div>
              <div class="ce-table-wrap">
                <table id="rep-tbl-regs">
                  <thead><tr><th>ID</th><th>Nombre</th><th>Email</th><th>Empresa</th><th>Estado</th><th>Registro</th></tr></thead>
                  <tbody></tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- PAPELERA -->
          <div id="view-papelera" class="ce-view">
            <div class="flex items-center" style="justify-content:space-between;margin-bottom:24px;">
              <div>
                <h2 style="font-family:'Roboto', sans-serif;font-size:26px;color:var(--navy);font-weight:400;">Papelera</h2>
                <p class="text-sm text-muted" style="margin-top:3px;" id="trash-count">Cargando...</p>
              </div>
            </div>
            <div class="events-grid" id="trash-grid"></div>
          </div>

          <!-- SORTEO RAPIDO -->
          <div id="view-sorteo-rapido" class="ce-view">
            <div class="qr-header flex items-center" style="justify-content:space-between;margin-bottom:24px;gap:16px;flex-wrap:wrap;">
              <div>
                <h2 style="font-family:'Roboto', sans-serif;font-size:26px;color:var(--navy);font-weight:400;">Sorteo rápido</h2>
                <p class="text-sm text-muted" style="margin-top:3px;" id="qr-count-sub">Cargá participantes y sorteá al instante</p>
              </div>
              <button class="btn btn-lg qr-sortear-btn" id="qr-sortear-btn" onclick="qrStartSorteo()" disabled><i data-lucide="trophy"></i> Sortear</button>
            </div>

            <!-- Carga -->
            <div class="ce-card mb-28">
              <div class="ce-card-header"><span class="ce-card-title"><i data-lucide="user-plus" style="width:18px;height:18px;display:inline;margin-right:8px;vertical-align:middle;"></i>Cargar participantes</span></div>
              <div class="ce-tabs" id="qr-tabs">
                <div class="ce-tab active" data-tab="manual" onclick="qrSwitchTab('manual')">Carga manual</div>
                <div class="ce-tab" data-tab="excel" onclick="qrSwitchTab('excel')">Subir Excel</div>
                <div class="ce-tab" data-tab="pegar" onclick="qrSwitchTab('pegar')">Pegar desde Excel</div>
              </div>

              <div class="ce-tab-panel active" id="qr-panel-manual">
                <form id="qr-manual-form" style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;">
                  <div class="form-group" style="flex:1;min-width:200px;margin:0;"><label>Nombre y Apellido <span style="color:#dc2626;">*</span></label><input type="text" id="qr-fname" placeholder="Juan Gonzalez" required></div>
                  <div class="form-group" style="flex:1;min-width:150px;margin:0;"><label>Telefono <span style="color:var(--muted);font-weight:400;">(opcional)</span></label><input type="tel" id="qr-phone" placeholder="+595 9xx xxx xxx"></div>
                  <div class="form-group" style="flex:1;min-width:150px;margin:0;"><label>Empresa <span style="color:var(--muted);font-weight:400;">(opcional)</span></label><input type="text" id="qr-comp" placeholder="Empresa"></div>
                  <button type="submit" class="btn btn-success" style="height:40px;padding:0 24px;"><i data-lucide="user-plus"></i> Agregar</button>
                </form>
              </div>

              <div class="ce-tab-panel" id="qr-panel-excel">
                <label class="qr-dropzone" id="qr-dropzone">
                  <input type="file" id="qr-file" accept=".xlsx,.xls,.csv" style="display:none;">
                  <i data-lucide="file-spreadsheet"></i>
                  <div style="font-weight:600;color:var(--navy);font-size:15px;">Tocá para elegir un archivo o arrastralo acá</div>
                  <div class="text-sm text-muted" style="margin-top:4px;">Formatos: .xlsx, .xls, .csv</div>
                </label>
                <p class="qr-hint">Se lee la primera hoja. Si tiene encabezados como <code>Nombre</code>, <code>Telefono</code> o <code>Empresa</code> se usan automáticamente; si no tiene, las columnas se detectan solas (nombre, teléfono y empresa). Los duplicados se omiten.</p>
              </div>

              <div class="ce-tab-panel" id="qr-panel-pegar">
                <textarea id="qr-paste" class="qr-paste" placeholder="Seleccioná las celdas en Excel, copiá (Ctrl+C) y pegá acá (Ctrl+V)&#10;&#10;Nombre	Telefono	Empresa&#10;Juan Gonzalez	0981 123 456	Comagro&#10;Maria Lopez	0971 555 222	Agro SA"></textarea>
                <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;">
                  <button type="button" class="btn btn-success" onclick="qrImportPaste()"><i data-lucide="clipboard-check"></i> Importar filas</button>
                  <button type="button" class="btn btn-outline" onclick="document.getElementById('qr-paste').value=''">Limpiar</button>
                </div>
                <p class="qr-hint">Pegá tal cual desde Excel o Google Sheets: cada fila es un participante y cada columna se separa sola. También sirve una sola columna con nombres, o texto separado por <code>;</code>.</p>
              </div>
            </div>

            <!-- Lista -->
            <div class="ce-card">
              <div class="ce-card-header">
                <span class="ce-card-title"><i data-lucide="users" style="width:18px;height:18px;display:inline;margin-right:8px;vertical-align:middle;"></i>Participantes <span id="qr-count-badge" class="badge badge-navy" style="margin-left:10px;font-size:11px;">0</span></span>
                <div class="flex gap-8 items-center qr-head-actions">
                  <div class="search-wrap"><i data-lucide="search"></i><input type="text" id="qr-search" placeholder="Buscar nombre, empresa..."></div>
                  <button class="btn btn-danger btn-sm" onclick="qrClearAll()" title="Vaciar lista"><i data-lucide="trash-2"></i> Vaciar</button>
                </div>
              </div>
              <div class="qr-options">
                <div class="form-group" style="flex:1;min-width:200px;margin:0;"><label>Titulo del sorteo <span style="color:var(--muted);font-weight:400;">(opcional)</span></label><input type="text" id="qr-title" placeholder="Ej: Sorteo Expo Agro 2026"></div>
                <label class="qr-option"><input type="checkbox" id="qr-remove-winner" checked> Quitar al ganador de la rueda para el siguiente sorteo</label>
              </div>
              <div class="qr-table-wrap">
                <table id="qr-table">
                  <thead><tr><th style="width:56px;">#</th><th>Nombre</th><th>Telefono</th><th class="qr-col-company">Empresa</th><th style="width:56px;"></th></tr></thead>
                  <tbody></tbody>
                </table>
              </div>
            </div>

            <div class="qr-mobile-bar">
              <button class="btn btn-lg qr-sortear-btn" id="qr-sortear-btn-m" onclick="qrStartSorteo()" disabled><i data-lucide="trophy"></i> Sortear</button>
            </div>
          </div>

        </div>
      </div>

  <!-- MODAL CREAR EVENTO -->
  <div id="modal-create-event" class="modal-overlay hidden">
    <div class="modal" style="max-width:640px;max-height:90vh;overflow-y:auto;">
      <div class="modal-header">
        <span class="modal-title" id="modal-event-title">Nuevo Evento</span>
        <button class="modal-close" onclick="closeCreateEventModal()"><i data-lucide="x"></i></button>
      </div>
      <form id="event-form">
        <input type="hidden" id="ev-id">
        <div class="form-grid" style="margin-bottom:20px;">
          <div class="form-group full"><label>Nombre del Evento</label><input type="text" id="ev-name" required placeholder="Ej: Expo Feria Agro 2026"></div>
          <div class="form-group"><label>Tipo</label>
            <div style="display:flex;gap:8px;">
              <select id="ev-type" onchange="if(this.value==='otros'){document.getElementById('ev-type-custom').style.display='block';}else{document.getElementById('ev-type-custom').style.display='none';}" style="flex:1;">
                <option value="lanzamiento">Lanzamiento</option>
                <option value="capacitacion">Capacitacion</option>
                <option value="inauguracion">Inauguracion</option>
                <option value="feria">Feria</option>
                <option value="otros">Otro...</option>
              </select>
              <input type="text" id="ev-type-custom" placeholder="Especificar..." style="display:none; flex:1;">
            </div>
          </div>
          <div class="form-group"><label>Cupos Maximos <span style="color:var(--muted);font-weight:400;">(opcional)</span></label><input type="number" id="ev-cap" placeholder="Sin limite" min="1"></div>
          <div class="form-group"><label>Fecha</label><input type="date" id="ev-date" required></div>
          <div class="form-group full" style="margin-bottom:12px; border:1px solid var(--border);border-radius:8px;padding:16px;background:#fafaf8;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <label style="margin-top:0;">Horarios del Evento</label>
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:13px; color:var(--navy); font-weight:500;">
                <input type="checkbox" id="ev-has-shifts" onchange="toggleShiftsMode(this.checked)" style="width:16px;height:16px;margin:0;">
                Habilitar selección de turnos
              </label>
            </div>
            
            <div id="simple-times-wrap">
              <div id="times-container" style="display:flex;flex-direction:column;gap:10px;">
                <div class="time-item primary-time" style="display:flex;gap:12px;align-items:center;">
                  <div style="flex:1;"><label style="font-size:12px;color:var(--muted);margin-bottom:4px;display:block;">Hora de inicio</label><input type="time" id="ev-time" class="t-start"></div>
                  <div style="flex:1;"><label style="font-size:12px;color:var(--muted);margin-bottom:4px;display:block;">Hora de fin</label><input type="time" id="ev-time-end" class="t-end"></div>
                  <div style="width:34px; margin-top:22px;"></div>
                </div>
              </div>
              <button type="button" class="btn btn-outline btn-sm" style="margin-top:12px;" onclick="addTimeField()"><i data-lucide="plus"></i> Añadir otro bloque horario</button>
            </div>

            <div id="shifts-times-wrap" style="display:none; flex-direction:column; gap:12px;">
              <p style="font-size:13px;color:var(--muted);margin:0 0 8px 0;">Los inscriptos deberán elegir uno de estos turnos obligatoriamente.</p>
              <div id="shifts-container" style="display:flex;flex-direction:column;gap:10px;"></div>
              <div><button type="button" class="btn btn-outline btn-sm" onclick="addShiftField()"><i data-lucide="plus"></i> Añadir turno</button></div>
            </div>
          </div>
          
          <div class="form-group full" style="border:1px solid var(--border);border-radius:8px;padding:16px;background:#fafaf8;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <label style="margin:0;font-size:14px;color:var(--navy);">Cronograma de Pausas <span style="color:var(--muted);font-weight:400;">(opcional)</span></label>
              <button type="button" class="btn btn-outline btn-sm" onclick="addPauseField()"><i data-lucide="plus"></i> Añadir pausa</button>
            </div>
            <div id="pauses-container" style="display:flex;flex-direction:column;gap:10px;"></div>
          </div>

          <div class="form-group full"><label>Lugar <span style="color:var(--muted);font-weight:400;">(opcional)</span></label><input type="text" id="ev-location" placeholder="Ej: Salon principal, Ciudad del Este"></div>
          <div class="form-group full"><label>Link de Google Maps <span style="color:var(--muted);font-weight:400;">(opcional)</span></label><input type="url" id="ev-location-link" placeholder="https://maps.app.goo.gl/..."></div>
          
          <div class="form-group full"><label>Descripcion <span style="color:var(--muted);font-weight:400;">(opcional)</span></label><textarea id="ev-desc" placeholder="Breve descripcion del evento..."></textarea></div>
          <div class="form-group full"><label>URL del Flyer <span style="color:var(--muted);font-weight:400;">(opcional)</span></label><input type="text" id="ev-flyer" placeholder="https://comagro.com.py/banner.jpg"></div>
        </div>
        <div class="modal-footer" style="margin-top:0;padding-top:20px;border-top:1px solid var(--border);">
          <button type="submit" class="btn btn-success" style="flex:1;justify-content:center;"><i data-lucide="save"></i> Guardar Evento</button>
          <button type="button" class="btn btn-outline" onclick="closeCreateEventModal()">Cancelar</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL DETALLES INSCRIPTO -->
  <div id="modal-reg-detail" class="modal-overlay hidden">
    <div class="modal" style="max-width:500px;">
      <div class="modal-header">
        <span class="modal-title">Detalles del Inscripto</span>
        <button class="modal-close" onclick="closeRegDetailModal()"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body" id="reg-detail-content"></div>
      <div class="modal-footer">
        <button class="btn btn-outline" style="width:100%;justify-content:center;" onclick="closeRegDetailModal()">Cerrar</button>
      </div>
    </div>
  </div>

  <!-- MODAL EXPORTAR -->
  <div id="modal-export" class="modal-overlay hidden">
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">Exportar a Excel</span>
        <button class="modal-close" onclick="closeExportModal()"><i data-lucide="x"></i></button>
      </div>
      <p class="text-sm text-muted" style="margin-bottom:18px;">Selecciona las columnas a incluir en el reporte.</p>
      <div class="modal-cols" id="export-cols">
        <label class="export-col"><input type="checkbox" value="registered_at" checked><div class="export-col-info"><div class="export-col-name">Fecha de Registro</div><div class="export-col-desc">Dia y hora de la inscripcion</div></div></label>
        <label class="export-col"><input type="checkbox" value="short_id" checked><div class="export-col-info"><div class="export-col-name">ID Unico</div><div class="export-col-desc">Identificador interno</div></div></label>
        <label class="export-col"><input type="checkbox" value="full_name" checked><div class="export-col-info"><div class="export-col-name">Nombre completo</div><div class="export-col-desc">Nombre y apellido</div></div></label>
        <label class="export-col"><input type="checkbox" value="email" checked><div class="export-col-info"><div class="export-col-name">Correo electronico</div><div class="export-col-desc">Email de contacto</div></div></label>
        <label class="export-col"><input type="checkbox" value="phone"><div class="export-col-info"><div class="export-col-name">Telefono</div><div class="export-col-desc">Numero de contacto</div></div></label>
        <label class="export-col"><input type="checkbox" value="company" checked><div class="export-col-info"><div class="export-col-name">Empresa</div><div class="export-col-desc">Empresa u organizacion</div></div></label>
        <label class="export-col"><input type="checkbox" value="status" checked><div class="export-col-info"><div class="export-col-name">Estado de asistencia</div><div class="export-col-desc">Pendiente / Presente</div></div></label>
      </div>
      <div style="margin-top:15px; margin-bottom:5px;">
        <label style="display:block; font-size:13px; font-weight:600; color:var(--navy); margin-bottom:5px;">Filtrar Inscriptos a Exportar</label>
        <select id="export-status-filter" class="form-control">
          <option value="todos">Exportar Todos</option>
          <option value="presente">Solo Presentes</option>
          <option value="pendiente">Solo Pendientes</option>
        </select>
      </div>
      <div class="modal-footer">
        <button class="btn btn-success" style="flex:1;justify-content:center;" onclick="exportToExcel()"><i data-lucide="download"></i> Descargar Excel</button>
        <button class="btn btn-outline" onclick="closeExportModal()">Cancelar</button>
      </div>
    </div>
  </div>

  <!-- MODAL AGREGAR / EDITAR PRESUPUESTO TOTAL -->
  <div id="modal-edit-budget" class="modal-overlay hidden">
    <div class="modal" style="max-width:380px;">
      <div class="modal-header">
        <span class="modal-title" id="modal-budget-title">Agregar Presupuesto</span>
        <button class="modal-close" onclick="document.getElementById('modal-edit-budget').classList.add('hidden')"><i data-lucide="x"></i></button>
      </div>
      <div class="form-group">
        <label>Presupuesto total (Gs.)</label>
        <input type="number" id="edit-budget-val" placeholder="Ej: 5000000" min="0">
      </div>
      <div class="modal-footer">
        <button class="btn btn-success" style="flex:1;justify-content:center;" onclick="saveBudgetTotal()"><i data-lucide="save"></i> Guardar</button>
        <button class="btn btn-outline" onclick="document.getElementById('modal-edit-budget').classList.add('hidden')">Cancelar</button>
      </div>
    </div>
  </div>
  <div id="modal-extend-reg" class="modal-overlay hidden">
    <div class="modal" style="max-width:400px;">
      <div class="modal-header">
        <span class="modal-title">Extender periodo de inscripción</span>
        <button class="modal-close" onclick="closeExtendRegModal()"><i data-lucide="x"></i></button>
      </div>
      <div class="form-group" style="padding: 20px 20px 0 20px; margin-bottom: 0;">
        <label>Fecha y hora límite</label>
        <input type="datetime-local" id="ext-datetime" style="width:100%;box-sizing:border-box;">
        <input type="hidden" id="ext-event-id">
      </div>
      <div class="modal-footer" style="margin-top:20px;">
        <button class="btn btn-primary" style="flex:1;justify-content:center;" onclick="saveExtendReg()"><i data-lucide="save"></i> Guardar</button>
        <button class="btn btn-outline" onclick="closeExtendRegModal()">Cancelar</button>
      </div>
    </div>
  </div>

  <div id="sorteo-root">
    <div class="sr-loading" id="sr-loading"><div class="sr-spinner"></div><p>Cargando participantes...</p></div>
    <div class="sr-empty" id="sr-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:64px;height:64px;color:rgba(74,171,223,0.4);"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
      <h3>Sin presentes</h3><p>No hay inscriptos con check-in para este evento</p>
    </div>
    <div class="sr-header">
      <div class="sr-header-left">
        <img src="https://www.chacomer.com.py/media/wysiwyg/comagro/ISOLOGO_COMAGRO_COLOR.png" alt="Comagro">
        <div><div class="sr-event-name" id="sr-event-name">Cargando...</div><div class="sr-event-meta" id="sr-event-meta"></div></div>
      </div>
      <div style="display:flex;align-items:center;gap:14px;">
        <div class="sr-participants-badge"><span class="count" id="sr-count">0</span><span>participantes</span></div>
        <button class="sr-close-btn" onclick="closeSorteo()">Cerrar</button>
      </div>
    </div>
    <div class="sr-body">
      <div class="sr-wheel-col">
        <div id="sr-wheel-wrapper" style="position:relative;display:inline-flex;align-items:center;justify-content:center;">
          <canvas id="sr-wheelCanvas"></canvas>
          <div id="sr-lottie-container" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:45%;aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:2;overflow:hidden;border-radius:50%;">
            <dotlottie-wc src="https://lottie.host/b5e65afa-ab86-4536-b200-271907960655/rBCrFaYEHJ.lottie" autoplay loop id="sr-lottie" style="width:100%;height:100%;object-fit:contain;"></dotlottie-wc>
          </div>
        </div>
      </div>
      <div class="sr-name-col">
        <div class="sr-label-small">Participante activo</div>
        <div class="sr-big-name" id="sr-bigName">---</div>
        <div class="sr-triangle"></div>
      </div>
    </div>
    <div class="sr-controls">
      <button class="sr-btn" id="sr-listBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px;display:inline-block;vertical-align:middle;margin-right:6px;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>Ver participantes</button>
      <button class="sr-btn sr-btn-spin" id="sr-spinBtn" disabled>GIRAR</button>
      <button class="sr-btn" id="sr-resetBtn">Resetear</button>
    </div>
    <div class="sr-winner-banner" id="sr-winnerBanner">
      <span class="wb-trophy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:52px;height:52px;color:#45d636;display:block;margin:0 auto 16px;"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 22V14.5"/><path d="M14 22V14.5"/><path d="M6 4h12v8a6 6 0 0 1-12 0Z"/><path d="M10 22h4"/></svg></span>
      <div class="wb-label">Ganador del sorteo!</div>
      <div class="wb-name" id="sr-winnerName"></div>
      <div class="wb-phone" id="sr-winnerPhone"></div>
      <div class="wb-company" id="sr-winnerCompany"></div>
      <div class="wb-actions">
        <button class="wb-btn wb-btn-again" onclick="srDismissAndSpin()">Otro sorteo</button>
        <button class="wb-btn wb-btn-close" onclick="srDismissBanner()">Cerrar</button>
      </div>
    </div>
    <div class="sr-panel-overlay" id="sr-panelOverlay"></div>
    <div class="sr-panel" id="sr-panel">
      <div class="sr-panel-header"><h2>Participantes del sorteo</h2><button class="sr-panel-close" onclick="srClosePanel()">&times;</button></div>
      <div class="sr-panel-list" id="sr-panel-list"></div>
      <div class="sr-panel-footer" id="sr-panel-footer"></div>
    </div>
  </div>

`;
})();
