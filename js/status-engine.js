// MOTOR AUTOMÁTICO EN TIEMPO REAL DEL SEMÁFORO Y PERIODOS PARA EL TRIUNFO

window.InmobiliariaStatus = window.InmobiliariaStatus || {};

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

window.InmobiliariaStatus.getCurrentMonthString = function(date = new Date()) {
  const m = MESES[date.getMonth()];
  const y = date.getFullYear();
  return `${m} ${y}`;
};

window.InmobiliariaStatus.getPeriodStringFromDate = function(dateInput) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return window.InmobiliariaStatus.getCurrentMonthString(d);
};

/* CÁLCULO AUTOMÁTICO 100% EN TIEMPO REAL DEL SEMÁFORO (VERDE, AMARILLO, ROJO DESALOJO) */
window.InmobiliariaStatus.calculateTenantStatus = function(tenant, property, systemSettings = {}) {
  const baseRent = Number(property ? property.base_rent : 0) || 0;
  
  if (!property || !tenant || property.status === 'disponible') {
    return {
      status: 'disponible',
      baseRent: baseRent,
      totalDue: baseRent,
      lateFee: 0,
      badgeText: 'Disponible'
    };
  }

  const discount = Number(tenant.discount) || 0;
  const customLateFee = tenant.custom_late_fee !== null && tenant.custom_late_fee !== undefined ? Number(tenant.custom_late_fee) : null;
  const defaultLateFee = Number(systemSettings.default_late_fee) || 250;
  const appliedLateFee = customLateFee !== null ? customLateFee : defaultLateFee;

  const currentMonthStr = window.InmobiliariaStatus.getCurrentMonthString();
  const hasPaidCurrentMonth = Array.isArray(tenant.paid_months) && tenant.paid_months.includes(currentMonthStr);

  // 1. SI EL PAGO YA FUE CONFIRMADO POR SOL EN EL MES EN CURSO:
  // El semáforo permanece en VERDE hasta el próximo día de corte.
  if (hasPaidCurrentMonth) {
    return {
      status: 'verde',
      baseRent: baseRent,
      totalDue: Math.max(0, baseRent - discount),
      lateFee: 0,
      badgeText: '🟢 Al Día (Pagado)'
    };
  }

  // 2. SI NO SE HA CONFIRMADO EL PAGO POR SOL:
  // Se evalúa automáticamente con el reloj en tiempo real según el día límite de pago.
  const now = new Date();
  const currentDay = now.getDate();
  const dueDay = Number(tenant.payment_due_day) || 5;

  let daysOverdue = 0;
  if (currentDay > dueDay) {
    daysOverdue = currentDay - dueDay;
  }

  if (daysOverdue === 0) {
    // Dentro de la ventana del día de corte y día límite de pago -> VERDE
    return {
      status: 'verde',
      baseRent: baseRent,
      totalDue: Math.max(0, baseRent - discount),
      lateFee: 0,
      badgeText: '🟢 En Periodo de Pago'
    };
  } else if (daysOverdue >= 1 && daysOverdue <= 7) {
    // 1 día después del límite de pago y hasta 7 días después -> AMARILLO
    return {
      status: 'amarillo',
      baseRent: baseRent,
      totalDue: Math.max(0, baseRent - discount) + appliedLateFee,
      lateFee: appliedLateFee,
      badgeText: '🟡 Prórroga (+Recargo)'
    };
  } else {
    // Superados más de 7 días después del límite de pago -> ROJO DESALOJO
    return {
      status: 'rojo',
      baseRent: baseRent,
      totalDue: Math.max(0, baseRent - discount) + appliedLateFee,
      lateFee: appliedLateFee,
      badgeText: '🔴 DESALOJO (Aviso 72h)'
    };
  }
};

window.InmobiliariaStatus.filterTransactionsByPeriod = function(transactions, periodType = 'general', customDate = new Date()) {
  if (!Array.isArray(transactions)) return [];
  if (periodType === 'general') return transactions;

  const currentYear = customDate.getFullYear();
  const currentMonthStr = window.InmobiliariaStatus.getCurrentMonthString(customDate);

  return transactions.filter(t => {
    const txDate = new Date(t.created_at);
    if (isNaN(txDate.getTime())) return false;

    if (periodType === 'mensual') {
      return t.month_paid === currentMonthStr || window.InmobiliariaStatus.getPeriodStringFromDate(t.created_at) === currentMonthStr;
    } else if (periodType === 'anual') {
      return txDate.getFullYear() === currentYear;
    }
    return true;
  });
};
