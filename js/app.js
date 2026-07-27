// APLICACIÓN PRINCIPAL DE GESTIÓN INMOBILIARIA - EL TRIUNFO (Administrador, Dueño, SOL)

let currentRole = 'admin';
let currentPeriod = 'general'; // 'mensual' | 'anual' | 'general'
let adminTab = 'expedientes';  // 'expedientes' | 'operativo' | 'revision' | 'egresos' | 'seguridad'

// Cache de Roles Autenticados en la Sesión Actual
let authenticatedRoles = { admin: true }; // Admin autenticado de inicio

// Filtros de Tablero 3 (Control de Ingresos)
let dateFromFilter = '';
let dateToFilter = '';
let isGeneralDateFilter = true;
let adminIncomeCategoryFilter = 'todos';

// Filtro Tablero 4 (Control de Egresos)
let adminExpenseCategoryFilter = 'todos';

// Filtros y Búsqueda en Vista SOL
let solSearchQuery = '';
let solStatusFilter = 'todos';
let solShowOnlyOccupied = true; // Por defecto deshabilitadas desaparecen de SOL

const MESES_LISTA = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

document.addEventListener('DOMContentLoaded', () => {
  initRoleSwitcher();
  renderApp();
  
  if (window.InmobiliariaSync) {
    window.InmobiliariaSync.subscribeToState(() => {
      renderApp();
    });
  }
});

function initRoleSwitcher() {
  const roleBtns = document.querySelectorAll('.role-btn');
  roleBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetRole = e.currentTarget.getAttribute('data-role');
      if (targetRole === currentRole) return;

      const state = window.InmobiliariaSync.getAppState();
      const rolePins = (state.settings && state.settings.role_pins) ? state.settings.role_pins : { admin: '0000', dueno: '0000', sol: '0000' };
      const expectedPin = rolePins[targetRole] || '0000';

      if (authenticatedRoles[targetRole]) {
        switchRole(targetRole);
      } else {
        openRoleAuthModal(targetRole, expectedPin);
      }
    });
  });
}

function openRoleAuthModal(targetRole, expectedPin) {
  const roleNames = { admin: 'Administrador', dueno: 'Dueño', sol: 'SOL' };
  
  const modalHtml = `
    <div class="modal-overlay" id="role-auth-modal">
      <div class="modal-content" style="max-width:400px; text-align:center;">
        <div class="modal-header" style="justify-content:center;">
          <h3 class="modal-title">🔒 Acceso Protegido - ${roleNames[targetRole]}</h3>
        </div>

        <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:1.2rem;">
          Ingrese la contraseña / PIN para acceder al perfil de <strong>${roleNames[targetRole]}</strong>.
        </p>

        <form id="role-auth-form">
          <div class="form-group">
            <input type="password" maxlength="10" class="form-control" id="role-pin-input" placeholder="PIN (Predeterminado: 0000)" style="font-size:1.4rem; text-align:center; letter-spacing:0.3rem;" required autofocus>
          </div>

          <div style="display:flex; gap:0.75rem; margin-top:1.5rem;">
            <button type="button" class="btn btn-secondary" onclick="closeModal('role-auth-modal')" style="flex:1;">Cancelar</button>
            <button type="submit" class="btn btn-primary" style="flex:1;">Ingresar</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const pinInput = document.getElementById('role-pin-input');
  if (pinInput) pinInput.focus();

  document.getElementById('role-auth-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const entered = pinInput.value;
    if (entered === expectedPin) {
      authenticatedRoles[targetRole] = true;
      closeModal('role-auth-modal');
      switchRole(targetRole);
    } else {
      alert('❌ PIN Incorrecto. Acceso Denegado.');
      pinInput.value = '';
      pinInput.focus();
    }
  });
}

function switchRole(role) {
  const roleBtns = document.querySelectorAll('.role-btn');
  roleBtns.forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`.role-btn[data-role="${role}"]`);
  if (activeBtn) activeBtn.classList.add('active');
  currentRole = role;
  renderApp();
}

function renderApp() {
  if (!window.InmobiliariaSync) return;
  const state = window.InmobiliariaSync.getAppState();
  const mainContainer = document.getElementById('main-content');
  if (!mainContainer) return;

  switch (currentRole) {
    case 'dueno':
      mainContainer.innerHTML = renderOwnerModule(state);
      break;
    case 'admin':
      mainContainer.innerHTML = renderAdminModule(state);
      break;
    case 'sol':
      mainContainer.innerHTML = renderSolModule(state);
      break;
    default:
      mainContainer.innerHTML = renderAdminModule(state);
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }

  attachDynamicEvents();
}

/* =====================================================================
   MÓDULO 1: DUEÑO (Lectura Global + Desglose Interactivo + Notas)
   ===================================================================== */
function renderOwnerModule(state) {
  const filteredTxs = window.InmobiliariaStatus.filterTransactionsByPeriod(state.transactions, currentPeriod);

  const totalIngresos = filteredTxs.filter(t => t.type === 'ingreso').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalEgresos = filteredTxs.filter(t => t.type === 'egreso').reduce((sum, t) => sum + Number(t.amount), 0);

  const cajaActual = totalIngresos - totalEgresos;
  const porcentajeMargen = totalIngresos > 0 ? ((cajaActual / totalIngresos) * 100).toFixed(1) : 0;

  const totalProps = state.properties.length;
  const ocupadas = state.properties.filter(p => p.status === 'ocupado').length;
  const ocupacionPct = ((ocupadas / totalProps) * 100).toFixed(1);

  const periodLabel = currentPeriod === 'mensual' ? 'Mes Actual' : currentPeriod === 'anual' ? 'Año Actual' : 'General Histórico';
  const ownerNotesList = Array.isArray(state.notes) ? state.notes : [];

  return `
    <div class="module-container">
      <div class="header-banner">
        <div class="header-title">
          <h2>Módulo Dueño - Lectura Global (El Triunfo)</h2>
          <p>Vista ejecutiva de rentabilidad, Caja Actual y comunicación con Administración.</p>
        </div>

        <div class="header-actions">
          <span style="font-size:0.85rem; color:var(--text-muted); font-weight:600;">Periodo:</span>
          <div class="time-filter-container">
            <button class="time-filter-btn ${currentPeriod === 'mensual' ? 'active' : ''}" data-period="mensual">Mensual</button>
            <button class="time-filter-btn ${currentPeriod === 'anual' ? 'active' : ''}" data-period="anual">Anual</button>
            <button class="time-filter-btn ${currentPeriod === 'general' ? 'active' : ''}" data-period="general">General</button>
          </div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card clickable" id="card-dueño-ingresos">
          <div class="stat-header">
            <span class="stat-title">Ingresos (${periodLabel})</span>
            <div class="stat-icon"><i data-lucide="trending-up"></i></div>
          </div>
          <div class="stat-value" style="color: var(--status-green);">$${totalIngresos.toLocaleString('es-MX', {minimumFractionDigits: 2})}</div>
          <div class="stat-sub">🔍 Clic para ver desglose de ingresos</div>
        </div>

        <div class="stat-card clickable" id="card-dueño-egresos">
          <div class="stat-header">
            <span class="stat-title">Egresos (${periodLabel})</span>
            <div class="stat-icon"><i data-lucide="trending-down"></i></div>
          </div>
          <div class="stat-value" style="color: var(--status-red);">$${totalEgresos.toLocaleString('es-MX', {minimumFractionDigits: 2})}</div>
          <div class="stat-sub">🔍 Clic para ver desglose de gastos/servicios</div>
        </div>

        <div class="stat-card clickable" id="card-dueño-utilidad">
          <div class="stat-header">
            <span class="stat-title">Caja Actual</span>
            <div class="stat-icon"><i data-lucide="wallet"></i></div>
          </div>
          <div class="stat-value">$${cajaActual.toLocaleString('es-MX', {minimumFractionDigits: 2})}</div>
          <div class="stat-sub" style="color: var(--status-green);">Margen: ${porcentajeMargen}% (Clic para ver)</div>
        </div>

        <div class="stat-card clickable" id="card-dueño-ocupacion">
          <div class="stat-header">
            <span class="stat-title">Tasa de Ocupación</span>
            <div class="stat-icon"><i data-lucide="home"></i></div>
          </div>
          <div class="stat-value">${ocupacionPct}%</div>
          <div class="stat-sub">${ocupadas} de ${totalProps} rentadas (Clic para ver)</div>
        </div>
      </div>

      <div class="tenant-portal-card" style="border-color: rgba(245, 158, 11, 0.4);">
        <div class="modal-header">
          <h3 style="color: #f59e0b; display:flex; align-items:center; gap:0.5rem;">
            <i data-lucide="edit-3"></i> Redactar Nueva Observación para el Administrador
          </h3>
        </div>

        <form id="owner-note-send-form">
          <div class="form-group">
            <label>Categoría / Asunto:</label>
            <select class="form-control" id="owner-note-category" required>
              <option value="Supervisión Financiera">Supervisión Financiera</option>
              <option value="Instrucciones Operativas">Instrucciones Operativas / Mantenimiento</option>
              <option value="General">Observación General</option>
            </select>
          </div>

          <div class="form-group">
            <label>Mensaje u Observación:</label>
            <textarea class="form-control" id="owner-note-text" placeholder="Escriba aquí la nota..." required></textarea>
          </div>

          <button type="submit" class="btn btn-primary">
            <i data-lucide="send"></i> Enviar Nota a Administración
          </button>
        </form>

        <div style="margin-top:2rem;">
          <h4 style="color:#fff; font-size:1rem; margin-bottom:1rem; border-top:1px solid var(--border-card); padding-top:1rem;">
            <i data-lucide="list"></i> Historial de Notas Enviadas
          </h4>
          ${ownerNotesList.length === 0 ? '<p style="color:var(--text-dim);">No ha enviado observaciones recientes.</p>' : ''}
          ${ownerNotesList.map(n => `
            <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-card); padding:0.8rem 1rem; border-radius:var(--radius-md); margin-bottom:0.6rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
              <div>
                <strong style="color:#fde68a; font-size:0.85rem;">${n.section_title || 'Nota'}</strong>
                <span style="font-size:0.75rem; color:var(--text-dim); margin-left:0.5rem;">${new Date(n.date).toLocaleString()}</span>
                <p style="font-size:0.85rem; color:var(--text-main); margin-top:0.2rem;">${n.content}</p>
              </div>
              <div>
                <span class="month-cell-badge ${n.status === 'visto' ? 'month-paid' : 'month-unpaid'}">
                  ${n.status === 'visto' ? '✓ Visto por Administración' : '⏳ Pendiente de Revisión'}
                </span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

/* =====================================================================
   MÓDULO 2: ADMINISTRADOR (Control Total & 5 Tableros con Edición de Movimientos)
   ===================================================================== */
function renderAdminModule(state) {
  const filteredTxs = window.InmobiliariaStatus.filterTransactionsByPeriod(state.transactions, currentPeriod);
  const totalIngresos = filteredTxs.filter(t => t.type === 'ingreso').reduce((s, t) => s + Number(t.amount), 0);
  const totalEgresos = filteredTxs.filter(t => t.type === 'egreso').reduce((s, t) => s + Number(t.amount), 0);
  const cajaActual = totalIngresos - totalEgresos;

  const periodLabel = currentPeriod === 'mensual' ? 'Mes Actual' : currentPeriod === 'anual' ? 'Año Actual' : 'General Histórico';
  const ownerNotesList = Array.isArray(state.notes) ? state.notes : [];

  return `
    <div class="module-container">
      <div class="header-banner">
        <div class="header-title">
          <h2>Módulo Administrador - El Triunfo</h2>
          <p>Control de expedientes, edición de movimientos de SOL, Caja Actual y reportes Excel.</p>
        </div>

        <div class="header-actions">
          <div class="time-filter-container">
            <button class="time-filter-btn ${currentPeriod === 'mensual' ? 'active' : ''}" data-period="mensual">Mensual</button>
            <button class="time-filter-btn ${currentPeriod === 'anual' ? 'active' : ''}" data-period="anual">Anual</button>
            <button class="time-filter-btn ${currentPeriod === 'general' ? 'active' : ''}" data-period="general">General</button>
          </div>

          <button class="btn btn-excel" id="btn-export-excel">
            <i data-lucide="download"></i> Exportar a Excel
          </button>
        </div>
      </div>

      <div class="owner-notes-admin-box">
        <h4><i data-lucide="message-square"></i> Observaciones Enviadas por el Dueño</h4>
        ${ownerNotesList.length === 0 ? '<p style="color:var(--text-muted); font-size:0.85rem;">No hay notas pendientes del dueño.</p>' : ''}
        <div style="display:flex; flex-direction:column; gap:0.75rem; margin-top:0.75rem;">
          ${ownerNotesList.map(n => `
            <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(245,158,11,0.3); padding:1rem; border-radius:var(--radius-md); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem;">
              <div style="max-width:70%;">
                <div style="display:flex; align-items:center; gap:0.5rem;">
                  <strong style="font-size:0.85rem; color:#fde68a;">${n.section_title || 'Observación'}</strong>
                  <span style="font-size:0.75rem; color:var(--text-dim);">${new Date(n.date).toLocaleString()}</span>
                  <span class="month-cell-badge ${n.status === 'visto' ? 'month-paid' : 'month-unpaid'}">
                    ${n.status === 'visto' ? '✓ Visto' : 'Pendiente'}
                  </span>
                </div>
                <p style="font-size:0.85rem; color:var(--text-main); margin-top:0.3rem;">${n.content}</p>
              </div>
              <div style="display:flex; gap:0.5rem;">
                ${n.status !== 'visto' ? `
                  <button class="btn btn-secondary btn-sm btn-mark-note-read" data-id="${n.id}" style="padding:0.3rem 0.6rem; font-size:0.75rem; color:#10b981;">
                    ✓ Marcar como Vista
                  </button>
                ` : ''}
                <button class="btn btn-danger btn-sm btn-delete-note" data-id="${n.id}" style="padding:0.3rem 0.6rem; font-size:0.75rem;">
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card clickable" id="card-admin-ingresos">
          <div class="stat-title">Ingresos (${periodLabel})</div>
          <div class="stat-value" style="color:var(--status-green);">$${totalIngresos.toLocaleString('es-MX')}</div>
          <div class="stat-sub">🔍 Clic para ver desglose</div>
        </div>
        <div class="stat-card clickable" id="card-admin-egresos">
          <div class="stat-title">Egresos (${periodLabel})</div>
          <div class="stat-value" style="color:var(--status-red);">$${totalEgresos.toLocaleString('es-MX')}</div>
          <div class="stat-sub">🔍 Clic para ver desglose</div>
        </div>
        <div class="stat-card clickable" id="card-admin-utilidad">
          <div class="stat-title">Caja Actual</div>
          <div class="stat-value">$${cajaActual.toLocaleString('es-MX')}</div>
          <div class="stat-sub">🔍 Clic para ver balance de caja</div>
        </div>
      </div>

      <div class="admin-tabs-nav">
        <button class="admin-tab-btn ${adminTab === 'expedientes' ? 'active' : ''}" data-tab="expedientes">
          <i data-lucide="users"></i> Tablero 1: Expediente Personal
        </button>
        <button class="admin-tab-btn ${adminTab === 'operativo' ? 'active' : ''}" data-tab="operativo">
          <i data-lucide="building"></i> Tablero 2: Control Operativo & Toggle Ocupado
        </button>
        <button class="admin-tab-btn ${adminTab === 'revision' ? 'active' : ''}" data-tab="revision">
          <i data-lucide="trending-up"></i> Tablero 3: Control de Ingresos
        </button>
        <button class="admin-tab-btn ${adminTab === 'egresos' ? 'active' : ''}" data-tab="egresos">
          <i data-lucide="minus-circle"></i> Tablero 4: Control de Egresos
        </button>
        <button class="admin-tab-btn ${adminTab === 'seguridad' ? 'active' : ''}" data-tab="seguridad">
          <i data-lucide="lock"></i> Tablero 5: Configuraciones de Acceso
        </button>
      </div>

      ${adminTab === 'expedientes' ? renderTableroExpedientesSeparado(state) : ''}
      ${adminTab === 'operativo' ? renderTableroOperativoSeparado(state) : ''}
      ${adminTab === 'revision' ? renderTableroControlIngresos(state) : ''}
      ${adminTab === 'egresos' ? renderTableroEgresos(state) : ''}
      ${adminTab === 'seguridad' ? renderTableroSeguridadAcceso(state) : ''}
    </div>
  `;
}

/* TABLERO 5: CONFIGURACIONES DE ACCESO CON BLOQUEO POR CONTRASEÑA PIN */
function renderTableroSeguridadAcceso(state) {
  const pins = (state.settings && state.settings.role_pins) ? state.settings.role_pins : { admin: '0000', dueno: '0000', sol: '0000' };

  return `
    <div class="tenant-portal-card" style="padding:1.5rem;">
      <div class="section-header-bar" style="margin-bottom:1.5rem;">
        <h3><i data-lucide="lock"></i> Tablero 5: Configuraciones de Acceso y Contraseñas por Perfil</h3>
      </div>

      <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:1.5rem;">
        Configure las contraseñas (PIN) de bloqueo para cada uno de los 3 perfiles del sistema. Únicamente la cuenta del <strong>Administrador</strong> tiene el privilegio de modificar estas claves. La clave inicial predeterminada para todos los perfiles es <strong><code>0000</code></strong>.
      </p>

      <form id="security-pins-form" style="max-width:600px;">
        <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-card); padding:1.25rem; border-radius:var(--radius-md); margin-bottom:1rem;">
          <h4 style="color:var(--accent); margin-bottom:0.75rem; display:flex; align-items:center; gap:0.5rem;">
            <i data-lucide="shield"></i> 1. Contraseña / PIN para Administrador
          </h4>
          <div class="form-group" style="margin-bottom:0;">
            <label>PIN de Acceso Administrador:</label>
            <input type="text" class="form-control" id="pin-admin" value="${pins.admin || '0000'}" required style="letter-spacing:0.2rem; font-weight:700;">
          </div>
        </div>

        <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-card); padding:1.25rem; border-radius:var(--radius-md); margin-bottom:1rem;">
          <h4 style="color:#fde68a; margin-bottom:0.75rem; display:flex; align-items:center; gap:0.5rem;">
            <i data-lucide="crown"></i> 2. Contraseña / PIN para Dueño
          </h4>
          <div class="form-group" style="margin-bottom:0;">
            <label>PIN de Acceso Dueño:</label>
            <input type="text" class="form-control" id="pin-dueno" value="${pins.dueno || '0000'}" required style="letter-spacing:0.2rem; font-weight:700;">
          </div>
        </div>

        <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-card); padding:1.25rem; border-radius:var(--radius-md); margin-bottom:1.5rem;">
          <h4 style="color:#f59e0b; margin-bottom:0.75rem; display:flex; align-items:center; gap:0.5rem;">
            ☀️ 3. Contraseña / PIN para SOL
          </h4>
          <div class="form-group" style="margin-bottom:0;">
            <label>PIN de Acceso SOL:</label>
            <input type="text" class="form-control" id="pin-sol" value="${pins.sol || '0000'}" required style="letter-spacing:0.2rem; font-weight:700;">
          </div>
        </div>

        <button type="submit" class="btn btn-primary" style="width:100%; justify-content:center;">
          🔒 Guardar y Actualizar Contraseñas de Acceso
        </button>
      </form>
    </div>
  `;
}

/* TABLERO 1: EXPEDIENTES SEPARADOS POR ENCABEZADOS DE DEPARTAMENTOS Y CASAS */
function renderTableroExpedientesSeparado(state) {
  const dptoTenants = state.tenants.filter(t => {
    const prop = state.properties.find(p => p.id === t.property_id);
    return prop && prop.type === 'departamento';
  });

  const casaTenants = state.tenants.filter(t => {
    const prop = state.properties.find(p => p.id === t.property_id);
    return prop && prop.type === 'casa';
  });

  return `
    <div>
      <div class="property-section-title">
        🏢 22 DEPARTAMENTOS - EXPEDIENTES PERSONALES DE INQUILINOS
      </div>
      <div class="table-container" style="margin-bottom:2rem;">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Inmueble</th>
              <th>Nombre Inquilino</th>
              <th>CURP</th>
              <th>Teléfono / Correo</th>
              <th>Fecha de renovación de contrato</th>
              <th>Vigencia Contrato (Inicio - Fin)</th>
              <th>Notas Extra</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${dptoTenants.length === 0 ? '<tr><td colspan="8" style="color:var(--text-dim);">No hay inquilinos cargados en departamentos.</td></tr>' : ''}
            ${dptoTenants.map(t => renderTenantRow(t, state)).join('')}
          </tbody>
        </table>
      </div>

      <div class="property-section-title">
        🏡 10 CASAS RESIDENCIALES - EXPEDIENTES PERSONALES DE INQUILINOS
      </div>
      <div class="table-container">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Inmueble</th>
              <th>Nombre Inquilino</th>
              <th>CURP</th>
              <th>Teléfono / Correo</th>
              <th>Fecha de renovación de contrato</th>
              <th>Vigencia Contrato (Inicio - Fin)</th>
              <th>Notas Extra</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${casaTenants.length === 0 ? '<tr><td colspan="8" style="color:var(--text-dim);">No hay inquilinos cargados en casas residenciales.</td></tr>' : ''}
            ${casaTenants.map(t => renderTenantRow(t, state)).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderTenantRow(t, state) {
  const prop = state.properties.find(p => p.id === t.property_id);
  return `
    <tr>
      <td><strong>${prop ? prop.code : 'Sin asignar'}</strong></td>
      <td><strong>${t.full_name}</strong></td>
      <td><code style="color:#fde68a;">${t.curp || 'N/A'}</code></td>
      <td>${t.phone || '-'}<br><span style="font-size:0.75rem; color:var(--text-muted);">${t.email || ''}</span></td>
      <td><span style="color:#6366f1; font-weight:700;">${t.contract_renewal_date || '-'}</span></td>
      <td><span style="color:var(--status-green);">${t.contract_start || '-'}</span> al <span style="color:var(--status-red);">${t.contract_end || '-'}</span></td>
      <td><span style="font-size:0.8rem; color:var(--text-muted);">${t.extra_notes || '-'}</span></td>
      <td>
        <button class="btn btn-secondary btn-sm btn-edit-tenant-full" data-id="${t.id}" style="padding:0.3rem 0.6rem; font-size:0.75rem;">
          <i data-lucide="edit"></i> Editar Expediente
        </button>
      </td>
    </tr>
  `;
}

/* TABLERO 2: CONTROL OPERATIVO CON SEMÁFORO AUTOMÁTICO EN TIEMPO REAL */
function renderTableroOperativoSeparado(state) {
  const dptos = state.properties.filter(p => p.type === 'departamento');
  const casas = state.properties.filter(p => p.type === 'casa');

  return `
    <div>
      <div class="property-section-title">
        🏢 22 DEPARTAMENTOS (Servicios de Agua, CFE e Internet Incluidos)
      </div>
      <div class="table-container" style="margin-bottom:2rem;">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Tipo</th>
              <th>Estado (Toggle)</th>
              <th>Renta Base</th>
              <th>Inquilino Asignado</th>
              <th>Corte / Límite</th>
              <th>Descuento</th>
              <th>Recargo</th>
              <th>Semáforo Automático</th>
              <th>Acciones Operativas</th>
            </tr>
          </thead>
          <tbody>
            ${dptos.map(p => renderOperationalRow(p, state)).join('')}
          </tbody>
        </table>
      </div>

      <div class="property-section-title">
        🏡 10 CASAS RESIDENCIALES (Sin Servicios Incluidos por Defecto)
      </div>
      <div class="table-container">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Tipo</th>
              <th>Estado (Toggle)</th>
              <th>Renta Base</th>
              <th>Inquilino Asignado</th>
              <th>Corte / Límite</th>
              <th>Descuento</th>
              <th>Recargo</th>
              <th>Semáforo Automático</th>
              <th>Acciones Operativas</th>
            </tr>
          </thead>
          <tbody>
            ${casas.map(p => renderOperationalRow(p, state)).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderOperationalRow(p, state) {
  const tenant = state.tenants.find(t => t.property_id === p.id);
  const statusInfo = window.InmobiliariaStatus.calculateTenantStatus(tenant, p, state.settings);
  const isOccupied = p.status === 'ocupado';

  return `
    <tr>
      <td><strong>${p.code}</strong></td>
      <td><span class="prop-badge-type">${p.type}</span></td>
      <td>
        <button class="btn btn-secondary btn-sm btn-toggle-occupancy" data-propid="${p.id}" style="padding:0.25rem 0.5rem; font-size:0.75rem; color:${isOccupied ? '#10b981' : 'var(--text-dim)'};">
          ${isOccupied ? '🟢 Ocupado (Deshabilitar)' : '⚪ Desocupado (Activar)'}
        </button>
      </td>
      <td><strong>$${Number(p.base_rent).toLocaleString('es-MX')}</strong></td>
      <td>${tenant ? tenant.full_name : '<span style="color:var(--text-dim)">Disponible</span>'}</td>
      <td>${tenant ? `Día ${tenant.cutoff_day} / Día ${tenant.payment_due_day}` : '-'}</td>
      <td>${tenant && tenant.discount > 0 ? `<span style="color:var(--status-green)">-$${tenant.discount}</span>` : '$0'}</td>
      <td>${statusInfo.lateFee > 0 ? `<span style="color:var(--status-red)">+$${statusInfo.lateFee}</span>` : '$0'}</td>
      <td>
        <span class="dot dot-${statusInfo.status}"></span>
        <strong style="margin-left:0.3rem; text-transform:capitalize;">${statusInfo.badgeText}</strong>
      </td>
      <td>
        <button class="btn btn-primary btn-sm btn-edit-op-params" data-propid="${p.id}" style="padding:0.3rem 0.6rem; font-size:0.75rem;">
          ⚙️ Editar Parámetros (Impacta a SOL)
        </button>
      </td>
    </tr>
  `;
}

/* RENDERIZADO TABLERO 3: CONTROL CONSOLIDADO DE INGRESOS CON OPCIÓN DE EDICIÓN Y ELIMINACIÓN */
function renderTableroControlIngresos(state) {
  let ingresosList = state.transactions.filter(t => t.type === 'ingreso');

  if (!isGeneralDateFilter && dateFromFilter && dateToFilter) {
    const fromTime = new Date(dateFromFilter + 'T00:00:00').getTime();
    const toTime = new Date(dateToFilter + 'T23:59:59').getTime();

    ingresosList = ingresosList.filter(t => {
      const txTime = new Date(t.created_at).getTime();
      return txTime >= fromTime && txTime <= toTime;
    });
  }

  if (adminIncomeCategoryFilter !== 'todos') {
    ingresosList = ingresosList.filter(t => t.category === adminIncomeCategoryFilter);
  }

  const totalIngresos = ingresosList.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalRentas = ingresosList.filter(t => t.category === 'renta').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExternos = ingresosList.filter(t => t.category !== 'renta').reduce((sum, t) => sum + Number(t.amount), 0);

  const incCategories = state.incomeCategories || ['renta', 'externo', 'otro'];

  return `
    <div class="tenant-portal-card" style="padding:1.5rem;">
      <div class="section-header-bar" style="margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
        <h3><i data-lucide="trending-up"></i> Tablero 3: Control Consolidado de Ingresos</h3>
        
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
          <button class="btn btn-primary" id="btn-add-income-direct">
            ➕ Registrar Ingreso Directo
          </button>
          <button class="btn btn-secondary" id="btn-manage-inc-cat">
            ⚙️ Gestionar Categorías de Ingreso
          </button>
        </div>
      </div>

      <div class="stats-grid" style="margin-bottom:1.5rem;">
        <div class="stat-card">
          <div class="stat-title">Total Ingresos Registrados</div>
          <div class="stat-value" style="color:var(--status-green);">$${totalIngresos.toLocaleString('es-MX')}</div>
          <div class="stat-sub">${ingresosList.length} cobro(s) en el rango seleccionado</div>
        </div>

        <div class="stat-card">
          <div class="stat-title">Ingresos por Rentas</div>
          <div class="stat-value" style="color:var(--accent);">$${totalRentas.toLocaleString('es-MX')}</div>
          <div class="stat-sub">Cobranza de mensualidades de alquiler</div>
        </div>

        <div class="stat-card">
          <div class="stat-title">Ingresos Externos / Otros</div>
          <div class="stat-value" style="color:#fde68a;">$${totalExternos.toLocaleString('es-MX')}</div>
          <div class="stat-sub">Entradas adicionales registradas</div>
        </div>
      </div>

      <div style="display:flex; gap:1rem; align-items:flex-end; flex-wrap:wrap; margin-bottom:1.5rem; background:rgba(0,0,0,0.2); padding:1rem; border-radius:var(--radius-md);">
        <div class="form-group" style="margin-bottom:0;">
          <label>Fecha Desde:</label>
          <input type="date" class="form-control" id="date-from-input" value="${dateFromFilter}">
        </div>

        <div class="form-group" style="margin-bottom:0;">
          <label>Fecha Hasta:</label>
          <input type="date" class="form-control" id="date-to-input" value="${dateToFilter}">
        </div>

        <button class="btn btn-primary" id="btn-apply-date-filter">
          🔍 Filtrar Rango
        </button>

        <button class="btn ${isGeneralDateFilter ? 'btn-excel' : 'btn-secondary'}" id="btn-toggle-general-date">
          🌐 Ver General / Histórico Completo
        </button>
      </div>

      <div style="display:flex; gap:0.4rem; align-items:center; margin-bottom:1.5rem; background:rgba(0,0,0,0.2); padding:0.75rem; border-radius:var(--radius-md); flex-wrap:wrap;">
        <span style="font-size:0.8rem; color:var(--text-muted); font-weight:600;">Filtrar Categoría:</span>
        <button class="time-filter-btn ${adminIncomeCategoryFilter === 'todos' ? 'active' : ''}" data-inccat="todos">Todos</button>
        ${incCategories.map(cat => `
          <button class="time-filter-btn ${adminIncomeCategoryFilter === cat ? 'active' : ''}" data-inccat="${cat}">
            ${cat.toUpperCase()}
          </button>
        `).join('')}
      </div>

      <div class="table-container">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Fecha y Hora</th>
              <th>Mes Saldado</th>
              <th>Categoría</th>
              <th>Inmueble / Inquilino</th>
              <th>Concepto Obligatorio</th>
              <th>Monto Recibido (MXN)</th>
              <th>Registrado Por</th>
              <th>Acciones Administrador</th>
            </tr>
          </thead>
          <tbody>
            ${ingresosList.length === 0 ? '<tr><td colspan="8">No hay ingresos registrados con el filtro seleccionado.</td></tr>' : ''}
            ${ingresosList.map(tx => {
              const prop = state.properties.find(p => p.id === tx.property_id);
              const tenant = prop ? state.tenants.find(t => t.property_id === prop.id) : null;

              return `
                <tr>
                  <td>${new Date(tx.created_at).toLocaleString()}</td>
                  <td><span class="prop-badge-type">${tx.month_paid || 'N/A'}</span></td>
                  <td><span class="service-tag">${(tx.category || 'renta').toUpperCase()}</span></td>
                  <td><strong>${prop ? prop.code : 'Ingreso Directo'}</strong><br><span style="font-size:0.8rem; color:var(--text-muted);">${tenant ? tenant.full_name : ''}</span></td>
                  <td><strong>${tx.concept}</strong></td>
                  <td><strong style="color:var(--status-green); font-size:1.05rem;">+$${Number(tx.amount).toLocaleString('es-MX')}</strong></td>
                  <td><span class="service-tag">${tx.registered_by}</span></td>
                  <td>
                    <button class="btn btn-secondary btn-sm btn-edit-tx" data-id="${tx.id}" style="padding:0.2rem 0.5rem; font-size:0.75rem;">✏️ Editar</button>
                    <button class="btn btn-danger btn-sm btn-delete-tx" data-id="${tx.id}" style="padding:0.2rem 0.5rem; font-size:0.75rem;">🗑️ Borrar</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/* RENDERIZADO TABLERO 4: CONTROL CONSOLIDADO DE EGRESOS CON OPCIÓN DE EDICIÓN Y ELIMINACIÓN */
function renderTableroEgresos(state) {
  let egresosList = state.transactions.filter(t => t.type === 'egreso');

  if (adminExpenseCategoryFilter !== 'todos') {
    egresosList = egresosList.filter(t => t.category === adminExpenseCategoryFilter);
  }

  const totalEgresos = egresosList.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalServiciosDptos = egresosList.filter(t => ['agua', 'luz', 'internet'].includes(t.category)).reduce((sum, t) => sum + Number(t.amount), 0);
  const registeredBySolCount = egresosList.filter(t => t.registered_by === 'SOL' || t.registered_by.includes('SOL')).length;

  const expCategories = state.expenseCategories || ['agua', 'luz', 'internet', 'mantenimiento', 'otro'];

  return `
    <div class="tenant-portal-card" style="padding:1.5rem;">
      <div class="section-header-bar" style="margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
        <h3><i data-lucide="minus-circle"></i> Tablero 4: Control Consolidado de Egresos y Servicios</h3>
        
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
          <button class="btn btn-danger" id="btn-add-expense-direct">
            ➕ Registrar Egreso Directo
          </button>
          <button class="btn btn-secondary" id="btn-manage-exp-cat">
            ⚙️ Gestionar Categorías de Egreso
          </button>
        </div>
      </div>

      <div class="stats-grid" style="margin-bottom:1.5rem;">
        <div class="stat-card">
          <div class="stat-title">Total Egresos Registrados</div>
          <div class="stat-value" style="color:var(--status-red);">$${totalEgresos.toLocaleString('es-MX')}</div>
          <div class="stat-sub">${egresosList.length} registro(s) en total</div>
        </div>

        <div class="stat-card">
          <div class="stat-title">Servicios de Dptos (Agua/Luz/WiFi)</div>
          <div class="stat-value" style="color:#f59e0b;">$${totalServiciosDptos.toLocaleString('es-MX')}</div>
          <div class="stat-sub">Servicios integrados en los 22 Dptos</div>
        </div>

        <div class="stat-card">
          <div class="stat-title">Registrados por SOL</div>
          <div class="stat-value">${registeredBySolCount} de ${egresosList.length}</div>
          <div class="stat-sub">Egresos capturados desde el mapa de cobranza</div>
        </div>
      </div>

      <div style="display:flex; gap:0.4rem; align-items:center; margin-bottom:1.5rem; background:rgba(0,0,0,0.2); padding:0.75rem; border-radius:var(--radius-md); flex-wrap:wrap;">
        <span style="font-size:0.8rem; color:var(--text-muted); font-weight:600;">Filtrar Categoría:</span>
        <button class="time-filter-btn ${adminExpenseCategoryFilter === 'todos' ? 'active' : ''}" data-expcat="todos">Todos</button>
        ${expCategories.map(cat => `
          <button class="time-filter-btn ${adminExpenseCategoryFilter === cat ? 'active' : ''}" data-expcat="${cat}">
            ${cat.toUpperCase()}
          </button>
        `).join('')}
      </div>

      <div class="table-container">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Fecha y Hora</th>
              <th>Categoría</th>
              <th>Concepto Obligatorio</th>
              <th>Monto (MXN)</th>
              <th>Registrado Por</th>
              <th>Acciones Administrador</th>
            </tr>
          </thead>
          <tbody>
            ${egresosList.length === 0 ? '<tr><td colspan="6">No hay egresos registrados con el filtro seleccionado.</td></tr>' : ''}
            ${egresosList.map(tx => `
              <tr>
                <td>${new Date(tx.created_at).toLocaleString()}</td>
                <td><span class="prop-badge-type">${tx.category.toUpperCase()}</span></td>
                <td><strong>${tx.concept}</strong></td>
                <td><strong style="color:var(--status-red); font-size:1.05rem;">-$${Number(tx.amount).toLocaleString('es-MX')}</strong></td>
                <td><span class="service-tag">${tx.registered_by}</span></td>
                <td>
                  <button class="btn btn-secondary btn-sm btn-edit-tx" data-id="${tx.id}" style="padding:0.2rem 0.5rem; font-size:0.75rem;">✏️ Editar</button>
                  <button class="btn btn-danger btn-sm btn-delete-tx" data-id="${tx.id}" style="padding:0.2rem 0.5rem; font-size:0.75rem;">🗑️ Borrar</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/* =====================================================================
   MÓDULO 3: SOL (Matriz Táctil Gamificada, Buscador & LOGO OFICIAL EL TRIUNFO)
   ===================================================================== */
function renderSolModule(state) {
  let allProps = state.properties;

  if (solShowOnlyOccupied) {
    allProps = allProps.filter(p => p.status === 'ocupado');
  }

  if (solSearchQuery && solSearchQuery.trim() !== '') {
    const q = solSearchQuery.toLowerCase();
    allProps = allProps.filter(p => {
      const tenant = state.tenants.find(t => t.property_id === p.id);
      return p.code.toLowerCase().includes(q) || p.title.toLowerCase().includes(q) || (tenant && tenant.full_name.toLowerCase().includes(q));
    });
  }

  if (solStatusFilter !== 'todos') {
    allProps = allProps.filter(p => {
      const tenant = state.tenants.find(t => t.property_id === p.id);
      const statusInfo = window.InmobiliariaStatus.calculateTenantStatus(tenant, p, state.settings);
      return statusInfo.status === solStatusFilter;
    });
  }

  const dptos = allProps.filter(p => p.type === 'departamento');
  const casas = allProps.filter(p => p.type === 'casa');
  const egresosList = state.transactions.filter(t => t.type === 'egreso');

  return `
    <div class="module-container">
      <div class="header-banner" style="background: linear-gradient(135deg, rgba(245,158,11,0.15), rgba(18,26,44,0.8)); border-color: rgba(245,158,11,0.4);">
        <div class="header-title" style="display:flex; align-items:center; gap:1rem;">
          <img src="img/logo.png" alt="Logo El Triunfo" style="width:60px; height:60px; border-radius:12px; object-fit:cover; border:2px solid rgba(245,158,11,0.6); box-shadow:0 0 15px rgba(245,158,11,0.4);">
          <div>
            <h2 style="color:#fde68a;">Módulo SOL - Mapa Táctil de Cobranza</h2>
            <p>Consulte montos, confirme cobros por mes/año libre y emita recibos digitales para WhatsApp.</p>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" id="btn-toggle-sol-vacant">
            ${solShowOnlyOccupied ? '👁️ Ver Solo Ocupados (Filtro Activo)' : '👁️ Mostrar Todos (Incluye Desocupados)'}
          </button>
          <button class="btn btn-danger" id="btn-quick-expense">
            <i data-lucide="minus-circle"></i> Registrar Egreso Rápido
          </button>
        </div>
      </div>

      <div class="search-filter-bar">
        <div class="search-input-group">
          <span style="color:var(--text-muted);">🔍</span>
          <input type="text" class="form-control" id="sol-search-input" value="${solSearchQuery}" placeholder="Buscar inmueble (ej: DEP-05) o inquilino..." style="border:none; background:transparent;">
        </div>

        <div style="display:flex; gap:0.4rem; align-items:center;">
          <span style="font-size:0.8rem; color:var(--text-muted); font-weight:600;">Estado Semáforo:</span>
          <button class="time-filter-btn ${solStatusFilter === 'todos' ? 'active' : ''}" data-solfilter="todos">Todos</button>
          <button class="time-filter-btn ${solStatusFilter === 'verde' ? 'active' : ''}" data-solfilter="verde">🟢 Al Día</button>
          <button class="time-filter-btn ${solStatusFilter === 'amarillo' ? 'active' : ''}" data-solfilter="amarillo">🟡 Prórroga</button>
          <button class="time-filter-btn ${solStatusFilter === 'rojo' ? 'active' : ''}" data-solfilter="rojo">🔴 Desalojo</button>
        </div>
      </div>

      <div class="property-section-title">
        🏢 22 DEPARTAMENTOS (Servicios de Agua, CFE e Internet Incluidos)
      </div>
      ${dptos.length === 0 ? '<p style="color:var(--text-dim); padding:1rem;">No se encontraron departamentos ocupados activos.</p>' : ''}
      <div class="property-grid">
        ${dptos.map(p => renderPropertyCardForSol(p, state)).join('')}
      </div>

      <div style="height: 3rem;"></div>

      <div class="property-section-title">
        🏡 10 CASAS RESIDENCIALES (Sin Servicios Incluidos por Defecto)
      </div>
      ${casas.length === 0 ? '<p style="color:var(--text-dim); padding:1rem;">No se encontraron casas ocupadas activas.</p>' : ''}
      <div class="property-grid">
        ${casas.map(p => renderPropertyCardForSol(p, state)).join('')}
      </div>

      <div class="tenant-portal-card" style="margin-top:3rem;">
        <div class="section-header-bar">
          <h3><i data-lucide="list"></i> Historial Completo de Egresos Operativos y Servicios</h3>
        </div>
        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Categoría</th>
                <th>Concepto Obligatorio</th>
                <th>Monto</th>
                <th>Registrado Por</th>
              </tr>
            </thead>
            <tbody>
              ${egresosList.length === 0 ? '<tr><td colspan="5">No hay egresos registrados.</td></tr>' : ''}
              ${egresosList.map(tx => `
                <tr>
                  <td>${new Date(tx.created_at).toLocaleDateString()}</td>
                  <td><span class="prop-badge-type">${tx.category}</span></td>
                  <td><strong>${tx.concept}</strong></td>
                  <td><span style="color:var(--status-red)">-$${Number(tx.amount).toLocaleString('es-MX')}</span></td>
                  <td>${tx.registered_by}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function renderPropertyCardForSol(p, state) {
  const tenant = state.tenants.find(t => t.property_id === p.id);
  const statusInfo = window.InmobiliariaStatus.calculateTenantStatus(tenant, p, state.settings);

  return `
    <div class="game-prop-card status-${statusInfo.status}" data-propid="${p.id}">
      <span class="prop-badge-type">${p.type} ${p.includes_services ? '• WiFi/Agua/Luz' : ''}</span>
      <div class="prop-title">${p.title}</div>
      <div class="prop-tenant">${tenant ? tenant.full_name : 'DISPONIBLE'}</div>
      
      <div class="prop-dates-info">
        <span>Corte: Día ${tenant ? tenant.cutoff_day : 1}</span>
        <span>Límite: Día ${tenant ? tenant.payment_due_day : 5}</span>
      </div>

      <div class="prop-footer">
        <div class="prop-price">$${statusInfo.totalDue.toLocaleString('es-MX')}</div>
        <span class="badge" style="font-size:0.75rem; font-weight:700;">${statusInfo.badgeText}</span>
      </div>
    </div>
  `;
}

function attachDynamicEvents() {
  document.querySelectorAll('.time-filter-btn[data-period]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      currentPeriod = e.currentTarget.getAttribute('data-period');
      renderApp();
    });
  });

  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      adminTab = e.currentTarget.getAttribute('data-tab');
      renderApp();
    });
  });

  document.querySelectorAll('.time-filter-btn[data-inccat]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      adminIncomeCategoryFilter = e.currentTarget.getAttribute('data-inccat');
      renderApp();
    });
  });

  document.querySelectorAll('.time-filter-btn[data-expcat]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      adminExpenseCategoryFilter = e.currentTarget.getAttribute('data-expcat');
      renderApp();
    });
  });

  document.querySelectorAll('.btn-edit-tx').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const txId = e.currentTarget.getAttribute('data-id');
      openEditTransactionModal(txId);
    });
  });

  document.querySelectorAll('.btn-delete-tx').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const txId = e.currentTarget.getAttribute('data-id');
      if (confirm('¿Está seguro de eliminar este movimiento financiero?')) {
        window.InmobiliariaSync.deleteTransaction(txId);
      }
    });
  });

  const securityForm = document.getElementById('security-pins-form');
  if (securityForm) {
    securityForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const adminPin = document.getElementById('pin-admin').value.trim();
      const duenoPin = document.getElementById('pin-dueno').value.trim();
      const solPin = document.getElementById('pin-sol').value.trim();

      if (!adminPin || !duenoPin || !solPin) {
        alert('Por favor complete las 3 contraseñas.');
        return;
      }

      window.InmobiliariaSync.updateRolePins({ adminPin, duenoPin, solPin });
      alert('🔒 ¡Contraseñas de acceso actualizadas exitosamente por el Administrador!');
    });
  }

  const btnAddIncomeDirect = document.getElementById('btn-add-income-direct');
  if (btnAddIncomeDirect) {
    btnAddIncomeDirect.addEventListener('click', () => openRegisterIncomeModal());
  }

  const btnManageIncCat = document.getElementById('btn-manage-inc-cat');
  if (btnManageIncCat) {
    btnManageIncCat.addEventListener('click', () => openCategoryManagerModal('ingreso'));
  }

  const btnAddExpenseDirect = document.getElementById('btn-add-expense-direct');
  if (btnAddExpenseDirect) {
    btnAddExpenseDirect.addEventListener('click', () => openExpenseModal());
  }

  const btnManageExpCat = document.getElementById('btn-manage-exp-cat');
  if (btnManageExpCat) {
    btnManageExpCat.addEventListener('click', () => openCategoryManagerModal('egreso'));
  }

  document.querySelectorAll('.btn-toggle-occupancy').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const propId = e.currentTarget.getAttribute('data-propid');
      window.InmobiliariaSync.togglePropertyOccupation(propId);
    });
  });

  const btnToggleSolVacant = document.getElementById('btn-toggle-sol-vacant');
  if (btnToggleSolVacant) {
    btnToggleSolVacant.addEventListener('click', () => {
      solShowOnlyOccupied = !solShowOnlyOccupied;
      renderApp();
    });
  }

  document.querySelectorAll('.time-filter-btn[data-solfilter]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      solStatusFilter = e.currentTarget.getAttribute('data-solfilter');
      renderApp();
    });
  });

  const solSearchInput = document.getElementById('sol-search-input');
  if (solSearchInput) {
    solSearchInput.addEventListener('input', (e) => {
      solSearchQuery = e.target.value;
      renderApp();
    });
  }

  const btnApplyDateFilter = document.getElementById('btn-apply-date-filter');
  if (btnApplyDateFilter) {
    btnApplyDateFilter.addEventListener('click', () => {
      dateFromFilter = document.getElementById('date-from-input').value;
      dateToFilter = document.getElementById('date-to-input').value;
      if (dateFromFilter && dateToFilter) {
        isGeneralDateFilter = false;
        renderApp();
      } else {
        alert('Por favor seleccione una fecha inicio y una fecha fin.');
      }
    });
  }

  const btnToggleGeneralDate = document.getElementById('btn-toggle-general-date');
  if (btnToggleGeneralDate) {
    btnToggleGeneralDate.addEventListener('click', () => {
      isGeneralDateFilter = true;
      renderApp();
    });
  }

  const ownerNoteForm = document.getElementById('owner-note-send-form');
  if (ownerNoteForm) {
    ownerNoteForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('owner-note-category').value;
      const text = document.getElementById('owner-note-text').value;

      window.InmobiliariaSync.addOwnerNote('owner_note', title, text);
      document.getElementById('owner-note-text').value = '';
      alert('¡Observación enviada a la Administración exitosamente!');
    });
  }

  document.querySelectorAll('.btn-mark-note-read').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const noteId = e.currentTarget.getAttribute('data-id');
      window.InmobiliariaSync.markOwnerNoteAsRead(noteId);
    });
  });

  document.querySelectorAll('.btn-delete-note').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const noteId = e.currentTarget.getAttribute('data-id');
      if (confirm('¿Está seguro de eliminar esta observación?')) {
        window.InmobiliariaSync.deleteOwnerNote(noteId);
      }
    });
  });

  document.querySelectorAll('.btn-edit-op-params').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const propId = e.currentTarget.getAttribute('data-propid');
      openEditOpParamsModal(propId);
    });
  });

  const cardIds = [
    'card-dueño-ingresos', 'card-dueño-egresos', 'card-dueño-utilidad', 'card-dueño-ocupacion',
    'card-admin-ingresos', 'card-admin-egresos', 'card-admin-utilidad'
  ];

  cardIds.forEach(id => {
    const card = document.getElementById(id);
    if (card) {
      card.addEventListener('click', () => openMetricBreakdownModal(id));
    }
  });

  const btnExcel = document.getElementById('btn-export-excel');
  if (btnExcel) {
    btnExcel.addEventListener('click', () => openExcelChoiceModal());
  }

  document.querySelectorAll('.btn-edit-tenant-full').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tenantId = e.currentTarget.getAttribute('data-id');
      openEditTenantFullModal(tenantId);
    });
  });

  document.querySelectorAll('.game-prop-card').forEach(card => {
    card.addEventListener('click', () => {
      const propId = card.getAttribute('data-propid');
      openPaymentModal(propId);
    });
  });

  const btnQuickExpense = document.getElementById('btn-quick-expense');
  if (btnQuickExpense) {
    btnQuickExpense.addEventListener('click', () => openExpenseModal());
  }
}

// MODAL PARA QUE EL ADMINISTRADOR EDITE CUALQUIER MOVIMIENTO (INGRESO O EGRESO)
function openEditTransactionModal(txId) {
  const state = window.InmobiliariaSync.getAppState();
  const tx = state.transactions.find(t => t.id === txId);
  if (!tx) return;

  const isIncome = tx.type === 'ingreso';
  const categories = isIncome 
    ? (state.incomeCategories || ['renta', 'externo', 'otro']) 
    : (state.expenseCategories || ['agua', 'luz', 'internet', 'mantenimiento', 'otro']);

  const modalHtml = `
    <div class="modal-overlay" id="edit-tx-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">✏️ Editar Movimiento (${isIncome ? 'Ingreso' : 'Egreso'})</h3>
          <button class="modal-close" onclick="closeModal('edit-tx-modal')">&times;</button>
        </div>

        <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:1rem;">
          Corrija cualquier error en el monto, concepto o fecha registrado por SOL o Administración.
        </p>

        <form id="edit-tx-form">
          <div class="form-group">
            <label>Categoría</label>
            <select class="form-control" id="edtx-category" required>
              ${categories.map(c => `<option value="${c}" ${c === tx.category ? 'selected' : ''}>${c.toUpperCase()}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label>Monto (MXN)</label>
            <input type="number" step="0.01" class="form-control" id="edtx-amount" value="${tx.amount}" required>
          </div>

          <div class="form-group">
            <label>Concepto</label>
            <textarea class="form-control" id="edtx-concept" required>${tx.concept}</textarea>
          </div>

          ${isIncome ? `
            <div class="form-group">
              <label>Mes Saldado</label>
              <input type="text" class="form-control" id="edtx-month" value="${tx.month_paid || ''}" placeholder="ej: Julio 2026">
            </div>
          ` : ''}

          <button type="submit" class="btn btn-primary" style="width:100%;">
            💾 Guardar Cambios en Movimiento
          </button>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('edit-tx-form').addEventListener('submit', (e) => {
    e.preventDefault();
    window.InmobiliariaSync.updateTransaction({
      id: tx.id,
      category: document.getElementById('edtx-category').value,
      amount: document.getElementById('edtx-amount').value,
      concept: document.getElementById('edtx-concept').value,
      month_paid: isIncome ? document.getElementById('edtx-month').value : null
    });

    closeModal('edit-tx-modal');
    alert('Movimiento actualizado correctamente.');
  });
}

function openCategoryManagerModal(type = 'ingreso') {
  const state = window.InmobiliariaSync.getAppState();
  const categories = type === 'ingreso' ? (state.incomeCategories || []) : (state.expenseCategories || []);
  const typeLabel = type === 'ingreso' ? 'Ingresos' : 'Egresos';

  const modalHtml = `
    <div class="modal-overlay" id="category-manager-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">⚙️ Gestionar Categorías de ${typeLabel}</h3>
          <button class="modal-close" onclick="closeModal('category-manager-modal')">&times;</button>
        </div>

        <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:1rem;">
          Las categorías agregadas o eliminadas aquí se modificarán <strong>en vivo en los módulos del Administrador y SOL</strong>.
        </p>

        <form id="add-category-form" style="display:flex; gap:0.75rem; margin-bottom:1.5rem;">
          <input type="text" class="form-control" id="new-cat-name" placeholder="Nombre de nueva categoría..." required>
          <button type="submit" class="btn btn-primary" style="white-space:nowrap;">➕ Agregar</button>
        </form>

        <h4 style="color:#fff; font-size:0.95rem; margin-bottom:0.75rem;">Categorías Activas:</h4>
        <div style="display:flex; flex-direction:column; gap:0.5rem; max-height:220px; overflow-y:auto;">
          ${categories.map(cat => `
            <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-card); padding:0.6rem 1rem; border-radius:var(--radius-sm); display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:700; text-transform:uppercase; color:var(--text-main);">${cat}</span>
              <button class="btn btn-danger btn-sm btn-delete-cat" data-cat="${cat}" style="padding:0.2rem 0.5rem; font-size:0.75rem;">
                🗑️ Eliminar
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('add-category-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const catName = document.getElementById('new-cat-name').value;
    window.InmobiliariaSync.addCategory(type, catName);
    closeModal('category-manager-modal');
    openCategoryManagerModal(type);
  });

  document.querySelectorAll('.btn-delete-cat').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const catName = e.currentTarget.getAttribute('data-cat');
      if (confirm(`¿Está seguro de eliminar la categoría "${catName}"?`)) {
        window.InmobiliariaSync.deleteCategory(type, catName);
        closeModal('category-manager-modal');
        openCategoryManagerModal(type);
      }
    });
  });
}

function openRegisterIncomeModal() {
  const state = window.InmobiliariaSync.getAppState();
  const incCategories = state.incomeCategories || ['renta', 'externo', 'otro'];

  const modalHtml = `
    <div class="modal-overlay" id="income-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">➕ Registrar Ingreso Directo</h3>
          <button class="modal-close" onclick="closeModal('income-modal')">&times;</button>
        </div>

        <form id="income-direct-form">
          <div class="form-group">
            <label>Inmueble Asociado (Opcional)</label>
            <select class="form-control" id="inc-prop-id">
              <option value="">-- Sin Inmueble (Ingreso Externo Directo) --</option>
              ${state.properties.map(p => `<option value="${p.id}">${p.code} - ${p.title}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label>Categoría de Ingreso</label>
            <select class="form-control" id="inc-category" required>
              ${incCategories.map(cat => `<option value="${cat}">${cat.toUpperCase()}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label>Monto Recibido (MXN)</label>
            <input type="number" step="0.01" class="form-control" id="inc-amount" placeholder="0.00" required>
          </div>

          <div class="form-group">
            <label>Concepto del Ingreso (<strong style="color:var(--status-green);">OBLIGATORIO</strong>)</label>
            <textarea class="form-control" id="inc-concept" placeholder="Descripción del ingreso..." required></textarea>
          </div>

          <button type="submit" class="btn btn-primary" style="width:100%;">Registrar Ingreso</button>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('income-direct-form').addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      const propId = document.getElementById('inc-prop-id').value || null;
      const category = document.getElementById('inc-category').value;
      const amount = document.getElementById('inc-amount').value;
      const concept = document.getElementById('inc-concept').value;

      window.InmobiliariaSync.registerIncome({
        propertyId: propId,
        category,
        amount,
        concept,
        registeredBy: 'Administrador'
      });

      closeModal('income-modal');
      alert('¡Ingreso registrado con éxito!');
    } catch (err) {
      alert(err.message);
    }
  });
}

function openExpenseModal() {
  const state = window.InmobiliariaSync.getAppState();
  const expCategories = state.expenseCategories || ['agua', 'luz', 'internet', 'mantenimiento', 'otro'];

  const modalHtml = `
    <div class="modal-overlay" id="expense-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">Registrar Egreso Operativo</h3>
          <button class="modal-close" onclick="closeModal('expense-modal')">&times;</button>
        </div>

        <form id="expense-form">
          <div class="form-group">
            <label>Categoría</label>
            <select class="form-control" id="exp-category" required>
              ${expCategories.map(cat => `<option value="${cat}">${cat.toUpperCase()}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label>Monto del Egreso (MXN)</label>
            <input type="number" step="0.01" class="form-control" id="exp-amount" placeholder="0.00" required>
          </div>

          <div class="form-group">
            <label>Concepto (<strong style="color:var(--status-red);">OBLIGATORIO</strong>)</label>
            <textarea class="form-control" id="exp-concept" placeholder="Razón del egreso..." required></textarea>
          </div>

          <button type="submit" class="btn btn-danger" style="width:100%;">Registrar Egreso</button>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('expense-form').addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      const category = document.getElementById('exp-category').value;
      const amount = document.getElementById('exp-amount').value;
      const concept = document.getElementById('exp-concept').value;

      window.InmobiliariaSync.registerExpense({
        category,
        amount,
        concept,
        registeredBy: currentRole === 'sol' ? 'SOL' : 'Administrador'
      });

      closeModal('expense-modal');
      alert('¡Egreso registrado correctamente!');
    } catch (err) {
      alert(err.message);
    }
  });
}

function openEditOpParamsModal(propId) {
  const state = window.InmobiliariaSync.getAppState();
  const prop = state.properties.find(p => p.id === propId);
  if (!prop) return;
  const tenant = state.tenants.find(t => t.property_id === prop.id);

  const modalHtml = `
    <div class="modal-overlay" id="edit-op-params-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">Editar Parámetros Operativos - ${prop.title}</h3>
          <button class="modal-close" onclick="closeModal('edit-op-params-modal')">&times;</button>
        </div>

        <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:1rem;">
          Los cambios realizados aquí se cargan de forma predeterminada en la ventana de cobro de <strong>SOL</strong>. El semáforo se calcula <strong>100% de forma automática en tiempo real</strong>.
        </p>

        <form id="edit-op-params-form">
          <div class="form-group">
            <label>Renta Base (MXN)</label>
            <input type="number" step="0.01" class="form-control" id="op-rent" value="${prop.base_rent}" required>
          </div>

          <div class="form-group" style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
            <div>
              <label>Día de Corte (del 1 al 28)</label>
              <input type="number" min="1" max="28" class="form-control" id="op-cutoff" value="${tenant ? tenant.cutoff_day : 1}" required>
            </div>
            <div>
              <label>Día Límite de Pago (sin recargo)</label>
              <input type="number" min="1" max="28" class="form-control" id="op-due" value="${tenant ? tenant.payment_due_day : 5}" required>
            </div>
          </div>

          <div class="form-group" style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
            <div>
              <label>Descuento Especial (MXN)</label>
              <input type="number" step="0.01" class="form-control" id="op-discount" value="${tenant ? tenant.discount : 0}">
            </div>
            <div>
              <label>Recargo Personalizado (MXN / Opcional)</label>
              <input type="number" step="0.01" class="form-control" id="op-latefee" value="${tenant && tenant.custom_late_fee !== null ? tenant.custom_late_fee : ''}" placeholder="Por defecto $250">
            </div>
          </div>

          <button type="submit" class="btn btn-primary" style="width:100%;">
            ⚡ Guardar Parámetros Operativos
          </button>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('edit-op-params-form').addEventListener('submit', (e) => {
    e.preventDefault();
    window.InmobiliariaSync.updatePropertyOperationalSettings({
      propertyId: prop.id,
      base_rent: document.getElementById('op-rent').value,
      cutoff_day: document.getElementById('op-cutoff').value,
      payment_due_day: document.getElementById('op-due').value,
      discount: document.getElementById('op-discount').value,
      custom_late_fee: document.getElementById('op-latefee').value
    });

    closeModal('edit-op-params-modal');
    alert('¡Parámetros actualizados! El semáforo operará automáticamente con las fechas registradas.');
  });
}

function openExcelChoiceModal() {
  const currentMonthStr = window.InmobiliariaStatus.getCurrentMonthString();

  const modalHtml = `
    <div class="modal-overlay" id="excel-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">📊 Exportar Reporte Financiero - El Triunfo (.xlsx)</h3>
          <button class="modal-close" onclick="closeModal('excel-modal')">&times;</button>
        </div>

        <p style="color:var(--text-muted); margin-bottom:1.5rem; font-size:0.9rem;">
          Elija la modalidad de descarga que requiera en este momento:
        </p>

        <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-card); padding:1rem; border-radius:var(--radius-md); margin-bottom:1rem;">
          <h4 style="color:#10b981; margin-bottom:0.4rem;">1. Balance del Mes Actual</h4>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.75rem;">Exporta únicamente los ingresos y egresos registrados en <strong>${currentMonthStr}</strong>.</p>
          <button class="btn btn-excel" id="btn-export-monthly-action" style="width:100%; justify-content:center;">
            📊 Descargar Balance (${currentMonthStr})
          </button>
        </div>

        <div style="background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.3); padding:1rem; border-radius:var(--radius-md); margin-bottom:1rem;">
          <h4 style="color:#818cf8; margin-bottom:0.4rem;">2. Rango de Fechas / Años Personalizado (Con Caja Actual y Márgenes)</h4>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.75rem;">Seleccione de qué fecha a qué fecha exportar. Incluye métricas de Caja Actual y % de margen operativo.</p>
          
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:0.75rem;">
            <div>
              <label style="font-size:0.75rem; color:var(--text-muted);">Desde (Fecha Inicio):</label>
              <input type="date" class="form-control" id="excel-date-from" value="2026-01-01">
            </div>
            <div>
              <label style="font-size:0.75rem; color:var(--text-muted);">Hasta (Fecha Fin):</label>
              <input type="date" class="form-control" id="excel-date-to" value="${new Date().toISOString().slice(0, 10)}">
            </div>
          </div>

          <button class="btn btn-primary" id="btn-export-custom-range" style="width:100%; justify-content:center;">
            📅 Descargar Rango Seleccionado
          </button>
        </div>

        <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-card); padding:1rem; border-radius:var(--radius-md);">
          <h4 style="color:#fff; margin-bottom:0.4rem;">3. Reporte Histórico Global Completo</h4>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.75rem;">Descarga toda la base de datos de movimientos e inquilinos acumulada.</p>
          <button class="btn btn-secondary" id="btn-export-global-action" style="width:100%; justify-content:center;">
            🌐 Descargar Reporte Histórico Completo
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('btn-export-monthly-action').addEventListener('click', () => {
    window.InmobiliariaExport.exportFinancialReportToExcel(window.InmobiliariaSync.getAppState(), 'mensual', { currentMonth: currentMonthStr });
    closeModal('excel-modal');
  });

  document.getElementById('btn-export-custom-range').addEventListener('click', () => {
    const dFrom = document.getElementById('excel-date-from').value;
    const dTo = document.getElementById('excel-date-to').value;
    if (dFrom && dTo) {
      window.InmobiliariaExport.exportFinancialReportToExcel(window.InmobiliariaSync.getAppState(), 'rango', { dateFrom: dFrom, dateTo: dTo });
      closeModal('excel-modal');
    } else {
      alert('Por favor seleccione una fecha inicio y una fecha fin válidas.');
    }
  });

  document.getElementById('btn-export-global-action').addEventListener('click', () => {
    window.InmobiliariaExport.exportFinancialReportToExcel(window.InmobiliariaSync.getAppState(), 'global');
    closeModal('excel-modal');
  });
}

function openMetricBreakdownModal(cardId) {
  const state = window.InmobiliariaSync.getAppState();
  const filteredTxs = window.InmobiliariaStatus.filterTransactionsByPeriod(state.transactions, currentPeriod);

  let title = 'Desglose de Datos';
  let contentHtml = '';

  if (cardId.includes('ingresos')) {
    title = 'Desglose Detallado de Ingresos';
    const list = filteredTxs.filter(t => t.type === 'ingreso');
    contentHtml = `
      <table class="custom-table">
        <thead><tr><th>Fecha</th><th>Mes Saldado</th><th>Concepto</th><th>Monto</th><th>Registrado Por</th></tr></thead>
        <tbody>
          ${list.length === 0 ? '<tr><td colspan="5">No hay ingresos en este periodo.</td></tr>' : ''}
          ${list.map(t => `
            <tr>
              <td>${new Date(t.created_at).toLocaleString()}</td>
              <td><span class="prop-badge-type">${t.month_paid || 'N/A'}</span></td>
              <td>${t.concept}</td>
              <td><strong style="color:var(--status-green);">$${Number(t.amount).toLocaleString('es-MX')}</strong></td>
              <td>${t.registered_by}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else if (cardId.includes('egresos')) {
    title = 'Desglose Detallado de Egresos y Servicios';
    const list = filteredTxs.filter(t => t.type === 'egreso');
    contentHtml = `
      <table class="custom-table">
        <thead><tr><th>Fecha</th><th>Categoría</th><th>Concepto</th><th>Monto</th><th>Registrado Por</th></tr></thead>
        <tbody>
          ${list.length === 0 ? '<tr><td colspan="5">No hay egresos en este periodo.</td></tr>' : ''}
          ${list.map(t => `
            <tr>
              <td>${new Date(t.created_at).toLocaleString()}</td>
              <td><span class="prop-badge-type">${t.category}</span></td>
              <td>${t.concept}</td>
              <td><strong style="color:var(--status-red);">-$${Number(t.amount).toLocaleString('es-MX')}</strong></td>
              <td>${t.registered_by}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else if (cardId.includes('ocupacion')) {
    title = 'Desglose de Ocupación por Inmueble';
    contentHtml = `
      <table class="custom-table">
        <thead><tr><th>Código</th><th>Tipo</th><th>Estado</th><th>Inquilino</th></tr></thead>
        <tbody>
          ${state.properties.map(p => {
            const tenant = state.tenants.find(t => t.property_id === p.id);
            return `
              <tr>
                <td><strong>${p.code}</strong></td>
                <td>${p.type}</td>
                <td><span class="dot dot-${p.status === 'ocupado' ? 'green' : 'yellow'}"></span> ${p.status.toUpperCase()}</td>
                <td>${tenant ? tenant.full_name : 'DISPONIBLE'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  } else {
    title = 'Desglose de Caja Actual';
    contentHtml = `<p style="color:var(--text-muted);">Balance acumulado de efectivo disponible en el periodo ${currentPeriod.toUpperCase()}.</p>`;
  }

  const modalHtml = `
    <div class="modal-overlay" id="breakdown-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close" onclick="closeModal('breakdown-modal')">&times;</button>
        </div>
        <div style="max-height:60vh; overflow-y:auto;">${contentHtml}</div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function openEditTenantFullModal(tenantId) {
  const state = window.InmobiliariaSync.getAppState();
  const tenant = state.tenants.find(t => t.id === tenantId);
  if (!tenant) return;

  const modalHtml = `
    <div class="modal-overlay" id="edit-tenant-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">Editar Expediente del Inquilino</h3>
          <button class="modal-close" onclick="closeModal('edit-tenant-modal')">&times;</button>
        </div>

        <form id="edit-tenant-form">
          <div class="form-group">
            <label>Nombre Completo</label>
            <input type="text" class="form-control" id="ten-name" value="${tenant.full_name}" required>
          </div>
          <div class="form-group">
            <label>CURP</label>
            <input type="text" class="form-control" id="ten-curp" value="${tenant.curp || ''}">
          </div>
          <div class="form-group" style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
            <div>
              <label>Teléfono</label>
              <input type="text" class="form-control" id="ten-phone" value="${tenant.phone || ''}">
            </div>
            <div>
              <label>Correo Electrónico</label>
              <input type="email" class="form-control" id="ten-email" value="${tenant.email || ''}">
            </div>
          </div>
          <div class="form-group" style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:1rem;">
            <div>
              <label>Fecha de renovación de contrato</label>
              <input type="date" class="form-control" id="ten-renewal" value="${tenant.contract_renewal_date || ''}">
            </div>
            <div>
              <label>Inicio Contrato</label>
              <input type="date" class="form-control" id="ten-cstart" value="${tenant.contract_start || ''}">
            </div>
            <div>
              <label>Fin Contrato</label>
              <input type="date" class="form-control" id="ten-cend" value="${tenant.contract_end || ''}">
            </div>
          </div>
          <div class="form-group">
            <label>Notas Extra del Inquilino</label>
            <textarea class="form-control" id="ten-notes">${tenant.extra_notes || ''}</textarea>
          </div>

          <button type="submit" class="btn btn-primary" style="width:100%;">Guardar Expediente</button>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('edit-tenant-form').addEventListener('submit', (e) => {
    e.preventDefault();
    window.InmobiliariaSync.saveTenant({
      ...tenant,
      full_name: document.getElementById('ten-name').value,
      curp: document.getElementById('ten-curp').value,
      phone: document.getElementById('ten-phone').value,
      email: document.getElementById('ten-email').value,
      contract_renewal_date: document.getElementById('ten-renewal').value,
      contract_start: document.getElementById('ten-cstart').value,
      contract_end: document.getElementById('ten-cend').value,
      extra_notes: document.getElementById('ten-notes').value
    });

    closeModal('edit-tenant-modal');
    alert('Expediente de inquilino actualizado correctamente.');
  });
}

/* MODAL DE CONFIRMACIÓN DE PAGO EN SOL CON SELECTOR LIBRE DE MES Y AÑO */
function openPaymentModal(propId) {
  const state = window.InmobiliariaSync.getAppState();
  const prop = state.properties.find(p => p.id === propId);
  if (!prop) return;
  const tenant = state.tenants.find(t => t.property_id === prop.id);
  const statusInfo = window.InmobiliariaStatus.calculateTenantStatus(tenant, prop, state.settings);

  const now = new Date();
  const currentMonthName = MESES_LISTA[now.getMonth()];
  const currentYearNum = now.getFullYear();

  const defaultConcept = `Pago de renta del mes de ${currentMonthName} ${currentYearNum} - ${prop.title}`;

  const modalHtml = `
    <div class="modal-overlay" id="payment-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">Confirmar Cobro de Renta (SOL ☀️)</h3>
          <button class="modal-close" onclick="closeModal('payment-modal')">&times;</button>
        </div>

        <div style="background:rgba(255,255,255,0.03); padding:1rem; border-radius:var(--radius-md); margin-bottom:1rem;">
          <h4 style="color:#fff; margin-bottom:0.3rem;">${prop.title} (${prop.code})</h4>
          <p style="color:var(--text-muted); font-size:0.9rem;">Inquilino: <strong>${tenant ? tenant.full_name : 'No asignado'}</strong></p>
        </div>

        <form id="payment-form">
          <div class="form-group">
            <label>Renta Base (Costo Alquiler Definido por Administración):</label>
            <input type="text" class="form-control" value="$${statusInfo.baseRent.toLocaleString('es-MX', {minimumFractionDigits:2})} MXN" readonly style="background:rgba(255,255,255,0.03); color:#fde68a; font-weight:700; cursor:not-allowed;">
            <small style="color:var(--text-dim); display:block; margin-top:0.2rem;">* Este valor es puramente informativo para corroboración y no suma a ingresos.</small>
          </div>

          <!-- SELECTOR LIBRE DE MES Y AÑO PARA CONTROL HISTÓRICO COMPLETO -->
          <div class="form-group" style="display:grid; grid-template-columns:1.5fr 1fr; gap:0.75rem;">
            <div>
              <label>Mes Saldado:</label>
              <select class="form-control" id="pay-month-name">
                ${MESES_LISTA.map(m => `<option value="${m}" ${m === currentMonthName ? 'selected' : ''}>${m}</option>`).join('')}
              </select>
            </div>
            <div>
              <label>Año:</label>
              <select class="form-control" id="pay-year-num">
                ${[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => `<option value="${y}" ${y === currentYearNum ? 'selected' : ''}>${y}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Monto Recibido (<strong style="color:var(--status-green);">SUMA A INGRESOS</strong>)</label>
            <input type="number" step="0.01" class="form-control" id="pay-amount" value="${statusInfo.totalDue}" required>
          </div>

          <div class="form-group">
            <label>Concepto de Cobro (Autogenerado):</label>
            <input type="text" class="form-control" id="pay-concept" value="${defaultConcept}" required>
          </div>

          <button type="submit" class="btn btn-primary" style="width:100%;">
            <i data-lucide="check-circle"></i> Confirmar Pago y Generar Recibo Digital
          </button>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  const monthSelect = document.getElementById('pay-month-name');
  const yearSelect = document.getElementById('pay-year-num');
  const conceptInput = document.getElementById('pay-concept');

  function updateConceptText() {
    const selectedMonth = monthSelect.value;
    const selectedYear = yearSelect.value;
    conceptInput.value = `Pago de renta del mes de ${selectedMonth} ${selectedYear} - ${prop.title}`;
  }

  monthSelect.addEventListener('change', updateConceptText);
  yearSelect.addEventListener('change', updateConceptText);

  document.getElementById('payment-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = document.getElementById('pay-amount').value;
    const concept = document.getElementById('pay-concept').value;
    const monthPaid = `${monthSelect.value} ${yearSelect.value}`;
    
    const result = window.InmobiliariaSync.confirmPayment({
      propertyId: prop.id,
      tenantId: tenant ? tenant.id : null,
      amount,
      concept,
      monthPaid,
      registeredBy: 'SOL'
    });

    closeModal('payment-modal');
    openDigitalReceiptModal(result.transaction, tenant, prop);
  });
}

function openDigitalReceiptModal(tx, tenant, prop) {
  const folio = 'REC-' + tx.id.slice(-6).toUpperCase();
  const dateStr = new Date(tx.created_at).toLocaleString();
  const tenantPhone = tenant && tenant.phone ? tenant.phone.replace(/[^\d]/g, '') : '';
  
  const waMsg = encodeURIComponent(
    `🧾 *RECIBO DIGITAL DE PAGO - EL TRIUNFO*\n` +
    `----------------------------------------\n` +
    `Folio: ${folio}\n` +
    `Fecha: ${dateStr}\n` +
    `Inmueble: ${prop ? prop.title : ''} (${prop ? prop.code : ''})\n` +
    `Inquilino: ${tenant ? tenant.full_name : ''}\n` +
    `Concepto: ${tx.concept}\n` +
    `Monto Pagado: $${Number(tx.amount).toLocaleString('es-MX', {minimumFractionDigits:2})} MXN\n` +
    `----------------------------------------\n` +
    `¡Gracias por su pago puntual!`
  );

  const waUrl = tenantPhone ? `https://wa.me/${tenantPhone}?text=${waMsg}` : `https://wa.me/?text=${waMsg}`;

  const modalHtml = `
    <div class="modal-overlay" id="receipt-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">🧾 Recibo Digital de Pago Emitido</h3>
          <button class="modal-close" onclick="closeModal('receipt-modal')">&times;</button>
        </div>

        <div class="receipt-box">
          <div class="receipt-header">
            <div class="receipt-title">EL TRIUNFO</div>
            <span style="font-size:0.8rem; color:#fde68a;">Folio: ${folio}</span>
          </div>

          <div class="receipt-row">
            <span>Fecha y Hora:</span>
            <strong>${dateStr}</strong>
          </div>
          <div class="receipt-row">
            <span>Inmueble:</span>
            <strong>${prop ? prop.title : ''} (${prop ? prop.code : ''})</strong>
          </div>
          <div class="receipt-row">
            <span>Inquilino:</span>
            <strong>${tenant ? tenant.full_name : ''}</strong>
          </div>
          <div class="receipt-row">
            <span>Concepto:</span>
            <strong>${tx.concept}</strong>
          </div>

          <div class="receipt-total">
            <span>TOTAL LIQUIDADO:</span>
            <span>$${Number(tx.amount).toLocaleString('es-MX', {minimumFractionDigits:2})} MXN</span>
          </div>
        </div>

        <div style="margin-top:1.5rem; display:flex; gap:1rem; flex-wrap:wrap;">
          <a href="${waUrl}" target="_blank" class="btn btn-excel" style="flex:1; justify-content:center; text-decoration:none;">
            💬 Compartir Recibo por WhatsApp
          </a>
          <button class="btn btn-secondary" onclick="closeModal('receipt-modal')">
            Cerrar Recibo
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function openAnnouncementModal() {
  const modalHtml = `
    <div class="modal-overlay" id="ann-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">Publicar Anuncio</h3>
          <button class="modal-close" onclick="closeModal('ann-modal')">&times;</button>
        </div>
        <form id="ann-form">
          <div class="form-group">
            <label>Título del Anuncio</label>
            <input type="text" class="form-control" id="ann-title" placeholder="Ej: Mantenimiento de Agua" required>
          </div>
          <div class="form-group">
            <label>Contenido del Mensaje</label>
            <textarea class="form-control" id="ann-content" placeholder="Escriba el comunicado..." required></textarea>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;">Publicar Anuncio</button>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  document.getElementById('ann-form').addEventListener('submit', (e) => {
    e.preventDefault();
    window.InmobiliariaSync.createAnnouncement({
      title: document.getElementById('ann-title').value,
      content: document.getElementById('ann-content').value
    });
    closeModal('ann-modal');
    alert('Anuncio publicado.');
  });
}

window.closeModal = function(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.remove();
};
