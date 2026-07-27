// Base de datos oficial de El Triunfo con inquilinos reales (22 Departamentos + 10 Casas)

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

const REAL_TENANTS_DATA = [
  { propiedad: "Depto 1", nombre: null },
  { propiedad: "Depto 2", nombre: null },
  { propiedad: "Depto 3", nombre: "Kevin Leonardo Mojica Acevedo", curp: "MOAK060601HMSJCVA2", correo_electronico: "kevinleonardomojicaacevedo@gmail.com", telefono: "7621202849", tiempo_estancia: "1 Año", fecha_proxima_contrato: "2026-12-04" },
  { propiedad: "Depto 4", nombre: null },
  { propiedad: "Depto 5", nombre: "Francisco Cuevas Figueroa", curp: null, correo_electronico: null, telefono: "7361059607", tiempo_estancia: null, fecha_proxima_contrato: "2026-12-04" },
  { propiedad: "Depto 6", nombre: "Valeria Catañeda Garcia / Rubi Lucero Perez Rios", curp: null, correo_electronico: null, telefono: "7341060010 / 7776343613", tiempo_estancia: "1 mes", fecha_proxima_contrato: "2026-12-24" },
  { propiedad: "Depto 7", nombre: null },
  { propiedad: "Depto 8", nombre: null },
  { propiedad: "Depto 9", nombre: null },
  { propiedad: "Depto 10", nombre: "Ricardo Rinconi Rojas", curp: "RIRR030901HGRNJCA2", correo_electronico: "rikirojas0109@gmail.com", telefono: "7771752950", tiempo_estancia: null, fecha_proxima_contrato: "2026-12-24" },
  { propiedad: "Depto 11", nombre: "Anika Celeste Cruz Ramos", curp: "CURA040204MGRRMNA6", correo_electronico: "aniramos987@gmail.com", telefono: "7771394518", tiempo_estancia: "1 Año", fecha_proxima_contrato: "2026-12-04" },
  { propiedad: "Depto 12", nombre: null },
  { propiedad: "Depto 13", nombre: "Geraldine Melani Mendez Gaytan", curp: "MEGG040705MMSNYRA3", correo_electronico: "L24090229@zacatepec.tecnm.mx", telefono: null, tiempo_estancia: "9 Meses", fecha_proxima_contrato: "2026-12-04" },
  { propiedad: "Depto 14", nombre: "Naomi Román Rios", curp: "RORN040510MGRMSMA3", correo_electronico: "naomirios054@gmail.com", telefono: "7333154622", tiempo_estancia: "3 Años", fecha_proxima_contrato: "2026-12-04" },
  { propiedad: "Depto 15", nombre: "Zuntay Kaly Robles Arredondo", curp: "ROAZ060329HMSBRNA9", correo_electronico: null, telefono: "7775206206", tiempo_estancia: "1 mes", fecha_proxima_contrato: "2026-12-04" },
  { propiedad: "Depto 16", nombre: "Stefano Yamil Lopez Hernandez", curp: "LOHS051127HGRPRTA1", correo_electronico: null, telefono: "7621127733", tiempo_estancia: null, fecha_proxima_contrato: "2026-12-04" },
  { propiedad: "Depto 17", nombre: "Leonardo Carrillo Orea", curp: "CAOL060426HMSRRNA8", correo_electronico: "leocarrillo260406@gmail.com", telefono: "7352004935", tiempo_estancia: "1 Año", fecha_proxima_contrato: "2026-12-04" },
  { propiedad: "Depto 18", nombre: "Diego Armando Flores Bastida", curp: "FOBD040228HGRLSGA3", correo_electronico: "armandofb36@gmail.com", telefono: "7361001678", tiempo_estancia: "2 Meses", fecha_proxima_contrato: "2026-12-04" },
  { propiedad: "Depto 19", nombre: "Celia Gonzalez Hernandez", curp: "GOHC040103MMSNRLA1", correo_electronico: "Celiaespingonzalez@gmail.com", telefono: "7341010230", tiempo_estancia: "2 Meses", fecha_proxima_contrato: "2026-12-04" },
  { propiedad: "Depto 20", nombre: "Ximena Brito Pacheco", curp: "BIPX040926MGRRCMA5", correo_electronico: null, telefono: "7361081963", tiempo_estancia: "3 Años", fecha_proxima_contrato: "2026-12-04" },
  { propiedad: "Depto 21", nombre: "Laisha Lizeth Gil Medina", curp: "GIML070110MMSLDSA9", correo_electronico: null, telefono: "7351733749", tiempo_estancia: null, fecha_proxima_contrato: "2026-12-04" },
  { propiedad: "Depto 22", nombre: null },
  { propiedad: "Casa 1", nombre: "Fortino Cortez Franco", curp: null, correo_electronico: null, telefono: "7341256465", tiempo_estancia: "8 Meses", fecha_proxima_contrato: "2026-12-04" },
  { propiedad: "Casa 2", nombre: "Mariela Tapia Velázquez", curp: null, correo_electronico: null, telefono: "7341696865", tiempo_estancia: "1 Año", fecha_proxima_contrato: "2026-12-04" },
  { propiedad: "Casa 3", nombre: null },
  { propiedad: "Casa 4", nombre: null },
  { propiedad: "Casa 5", nombre: null },
  { propiedad: "Casa 6", nombre: null },
  { propiedad: "Casa 7", nombre: null },
  { propiedad: "Casa 8", nombre: "Carmelo Valderas Moso", curp: null, correo_electronico: null, telefono: "7341115393", tiempo_estancia: "5 Años", fecha_proxima_contrato: "2026-12-04" },
  { propiedad: "Casa 9", nombre: "Abel Vargas Cruz", curp: null, correo_electronico: null, telefono: "7341152345", tiempo_estancia: null, fecha_proxima_contrato: "2026-09-22" },
  { propiedad: "Casa 10", nombre: "Alejandro Navarro Flores", curp: null, correo_electronico: null, telefono: "7341375667", tiempo_estancia: "2 Años", fecha_proxima_contrato: "2026-12-24" }
];

window.InmobiliariaData.INITIAL_PROPERTIES = [];
window.InmobiliariaData.INITIAL_TENANTS = [];
window.InmobiliariaData.INITIAL_TRANSACTIONS = [];
window.InmobiliariaData.INITIAL_ANNOUNCEMENTS = [];
window.InmobiliariaData.INITIAL_OWNER_NOTES = [];

// Generar los 22 Departamentos de El Triunfo
for (let i = 1; i <= 22; i++) {
  const code = `DEP-${String(i).padStart(2, '0')}`;
  const dataItem = REAL_TENANTS_DATA.find(d => d.propiedad === `Depto ${i}`);
  const isOccupied = dataItem && dataItem.nombre !== null;

  const propId = `prop-dep-${i}`;
  window.InmobiliariaData.INITIAL_PROPERTIES.push({
    id: propId,
    code: code,
    title: `Departamento ${String(i).padStart(2, '0')}`,
    type: 'departamento',
    includes_services: true,
    base_rent: 3800.00,
    status: isOccupied ? 'ocupado' : 'disponible'
  });

  if (isOccupied) {
    window.InmobiliariaData.INITIAL_TENANTS.push({
      id: `tenant-dep-${i}`,
      property_id: propId,
      full_name: dataItem.nombre,
      curp: dataItem.curp || '',
      phone: dataItem.telefono || '',
      email: dataItem.correo_electronico || '',
      cutoff_day: 1,
      payment_due_day: 5,
      discount: 0,
      custom_late_fee: null,
      paid_months: ['Julio 2026'],
      last_payment_date: new Date().toISOString(),
      contract_renewal_date: dataItem.fecha_proxima_contrato || '2026-12-04',
      contract_start: '2025-12-04',
      contract_end: dataItem.fecha_proxima_contrato || '2026-12-04',
      extra_notes: dataItem.tiempo_estancia ? `Tiempo de estancia registrado: ${dataItem.tiempo_estancia}` : 'Inquilino oficial de El Triunfo.'
    });
  }
}

// Generar las 10 Casas Residenciales de El Triunfo
for (let i = 1; i <= 10; i++) {
  const code = `CASA-${String(i).padStart(2, '0')}`;
  const dataItem = REAL_TENANTS_DATA.find(d => d.propiedad === `Casa ${i}`);
  const isOccupied = dataItem && dataItem.nombre !== null;

  const propId = `prop-casa-${i}`;
  window.InmobiliariaData.INITIAL_PROPERTIES.push({
    id: propId,
    code: code,
    title: `Casa Residencial ${String(i).padStart(2, '0')}`,
    type: 'casa',
    includes_services: false,
    base_rent: 6500.00,
    status: isOccupied ? 'ocupado' : 'disponible'
  });

  if (isOccupied) {
    window.InmobiliariaData.INITIAL_TENANTS.push({
      id: `tenant-casa-${i}`,
      property_id: propId,
      full_name: dataItem.nombre,
      curp: dataItem.curp || '',
      phone: dataItem.telefono || '',
      email: dataItem.correo_electronico || '',
      cutoff_day: 1,
      payment_due_day: 5,
      discount: 0,
      custom_late_fee: null,
      paid_months: ['Julio 2026'],
      last_payment_date: new Date().toISOString(),
      contract_renewal_date: dataItem.fecha_proxima_contrato || '2026-12-04',
      contract_start: '2025-12-04',
      contract_end: dataItem.fecha_proxima_contrato || '2026-12-04',
      extra_notes: dataItem.tiempo_estancia ? `Tiempo de estancia registrado: ${dataItem.tiempo_estancia}` : 'Inquilino oficial de El Triunfo.'
    });
  }
}
