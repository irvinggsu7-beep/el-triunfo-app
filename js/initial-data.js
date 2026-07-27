// Base de datos limpia de inicio para El Triunfo (22 Departamentos + 10 Casas)

window.InmobiliariaData = window.InmobiliariaData || {};

window.InmobiliariaData.INITIAL_SYSTEM_SETTINGS = {
  id: 'global',
  bank_name: 'BBVA Bancomer',
  bank_account_holder: 'Bienes Raíces El Triunfo S.A. de C.V.',
  bank_clabe: '012180001234567890',
  bank_account_num: '1234567890',
  default_late_fee: 250.00,
  grace_period_days: 7,
  eviction_notice_hours: 72,
  role_pins: {
    admin: '0000',
    dueno: '0000',
    sol: '0000'
  }
};

window.InmobiliariaData.INITIAL_INCOME_CATEGORIES = ['renta', 'externo', 'estacionamiento', 'deposito', 'otro'];
window.InmobiliariaData.INITIAL_EXPENSE_CATEGORIES = ['agua', 'luz', 'internet', 'mantenimiento', 'limpieza', 'impuestos', 'otro'];

window.InmobiliariaData.INITIAL_PROPERTIES = [];
window.InmobiliariaData.INITIAL_TENANTS = [];
window.InmobiliariaData.INITIAL_TRANSACTIONS = [];
window.InmobiliariaData.INITIAL_ANNOUNCEMENTS = [];
window.InmobiliariaData.INITIAL_OWNER_NOTES = [];

// Generar los 22 Departamentos de El Triunfo
for (let i = 1; i <= 22; i++) {
  const code = `DEP-${String(i).padStart(2, '0')}`;
  window.InmobiliariaData.INITIAL_PROPERTIES.push({
    id: `prop-dep-${i}`,
    code: code,
    title: `Departamento ${String(i).padStart(2, '0')}`,
    type: 'departamento',
    includes_services: true,
    base_rent: 3800.00,
    status: 'disponible'
  });
}

// Generar las 10 Casas Residenciales de El Triunfo
for (let i = 1; i <= 10; i++) {
  const code = `CASA-${String(i).padStart(2, '0')}`;
  window.InmobiliariaData.INITIAL_PROPERTIES.push({
    id: `prop-casa-${i}`,
    code: code,
    title: `Casa Residencial ${String(i).padStart(2, '0')}`,
    type: 'casa',
    includes_services: false,
    base_rent: 6500.00,
    status: 'disponible'
  });
}
