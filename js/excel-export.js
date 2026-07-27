// Módulo de Exportación a Excel (.xlsx) para El Triunfo (Con Métricas de Caja Actual y Margen Operativo)

window.InmobiliariaExport = window.InmobiliariaExport || {};

window.InmobiliariaExport.exportFinancialReportToExcel = function(state, mode = 'global', options = {}) {
  if (typeof XLSX === 'undefined') {
    alert('La librería de exportación a Excel (SheetJS) se está cargando. Por favor reintente en un segundo.');
    return;
  }

  const wb = XLSX.utils.book_new();
  let txList = [...state.transactions];
  let reportTitle = 'REPORTE FINANCIERO GLOBAL - EL TRIUNFO';

  if (mode === 'mensual' && options.currentMonth) {
    txList = txList.filter(t => t.month_paid === options.currentMonth || window.InmobiliariaStatus.getPeriodStringFromDate(t.created_at) === options.currentMonth);
    reportTitle = `BALANCE FINANCIERO - ${options.currentMonth.toUpperCase()} (EL TRIUNFO)`;
  } else if (mode === 'rango' && options.dateFrom && options.dateTo) {
    const fromTime = new Date(options.dateFrom + 'T00:00:00').getTime();
    const toTime = new Date(options.dateTo + 'T23:59:59').getTime();
    txList = txList.filter(t => {
      const txTime = new Date(t.created_at).getTime();
      return txTime >= fromTime && txTime <= toTime;
    });
    reportTitle = `REPORTE PERSONALIZADO POR FECHAS (${options.dateFrom} AL ${options.dateTo}) - EL TRIUNFO`;
  }

  // CÁLCULO DE CAJA ACTUAL Y MÁRGENES OPERATIVOS
  const ingresosList = txList.filter(t => t.type === 'ingreso');
  const egresosList = txList.filter(t => t.type === 'egreso');

  const totalIngresos = ingresosList.reduce((s, t) => s + Number(t.amount), 0);
  const totalEgresos = egresosList.reduce((s, t) => s + Number(t.amount), 0);
  const cajaActual = totalIngresos - totalEgresos;
  const margenOperativoPct = totalIngresos > 0 ? ((cajaActual / totalIngresos) * 100).toFixed(2) : '0.00';
  const promedioIngresoPorTx = ingresosList.length > 0 ? (totalIngresos / ingresosList.length).toFixed(2) : '0.00';

  const summaryData = [
    ["BIENES RAÍCES EL TRIUNFO - GESTIÓN INMOBILIARIA"],
    [reportTitle],
    ["Fecha de Generación:", new Date().toLocaleString()],
    [],
    ["📊 MÉTRICAS FINANCIERAS Y CAJA ACTUAL DEL PERIODO"],
    ["CONCEPTO CLAVE", "MONTO / INDICADOR"],
    ["Total Ingresos Acumulados (MXN)", totalIngresos],
    ["Total Egresos Operativos (MXN)", totalEgresos],
    ["CAJA ACTUAL (MONTO NETO EN CAJA)", cajaActual],
    ["MARGEN OPERATIVO DE GANANCIA (%)", `${margenOperativoPct}%`],
    ["Promedio por Transacción de Ingreso", `$${promedioIngresoPorTx} MXN`],
    ["Número de Transacciones de Ingreso", ingresosList.length],
    ["Número de Transacciones de Egreso", egresosList.length],
    [],
    ["DISTRIBUCIÓN DE EGRESOS POR CATEGORÍA EN EL RANGO"]
  ];

  const expCategories = state.expenseCategories || ['agua', 'luz', 'internet', 'mantenimiento', 'otro'];
  expCategories.forEach(cat => {
    const catSum = egresosList.filter(t => t.category === cat).reduce((s, t) => s + Number(t.amount), 0);
    const pct = totalEgresos > 0 ? ((catSum / totalEgresos) * 100).toFixed(1) : '0.0';
    summaryData.push([`Egreso Categoría: ${cat.toUpperCase()}`, `$${catSum.toLocaleString('es-MX')} (${pct}%)`]);
  });

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen & Caja Actual");

  // HOJA 2: TRANSACCIONES DETALLADAS DE INGRESOS
  const ingresosData = [
    ["ID Transacción", "Fecha", "Mes Pagado", "Categoría", "Inmueble", "Concepto", "Monto (MXN)", "Registrado Por"]
  ];

  ingresosList.forEach(t => {
    const prop = state.properties.find(p => p.id === t.property_id);
    ingresosData.push([
      t.id,
      new Date(t.created_at).toLocaleString(),
      t.month_paid || 'N/A',
      (t.category || 'renta').toUpperCase(),
      prop ? `${prop.code} - ${prop.title}` : 'Ingreso Directo',
      t.concept,
      Number(t.amount),
      t.registered_by
    ]);
  });

  const wsIngresos = XLSX.utils.aoa_to_sheet(ingresosData);
  XLSX.utils.book_append_sheet(wb, wsIngresos, "Detalle Ingresos");

  // HOJA 3: TRANSACCIONES DETALLADAS DE EGRESOS
  const egresosData = [
    ["ID Transacción", "Fecha", "Categoría", "Concepto Obligatorio", "Monto (MXN)", "Registrado Por"]
  ];

  egresosList.forEach(t => {
    egresosData.push([
      t.id,
      new Date(t.created_at).toLocaleString(),
      t.category.toUpperCase(),
      t.concept,
      Number(t.amount),
      t.registered_by
    ]);
  });

  const wsEgresos = XLSX.utils.aoa_to_sheet(egresosData);
  XLSX.utils.book_append_sheet(wb, wsEgresos, "Detalle Egresos");

  // HOJA 4: CATÁLOGO COMPLETO DE INMUEBLES E INQUILINOS
  const propData = [
    ["Código", "Tipo", "Servicios Incluidos", "Renta Base", "Estado", "Inquilino Asignado", "CURP", "Teléfono", "Fecha Renovación Contrato"]
  ];

  state.properties.forEach(p => {
    const tenant = state.tenants.find(t => t.property_id === p.id);
    propData.push([
      p.code,
      p.type.toUpperCase(),
      p.includes_services ? "SÍ (Agua/Luz/WiFi)" : "NO",
      Number(p.base_rent),
      p.status.toUpperCase(),
      tenant ? tenant.full_name : "DISPONIBLE",
      tenant ? tenant.curp || 'N/A' : '-',
      tenant ? tenant.phone || '-' : '-',
      tenant ? tenant.contract_renewal_date || '-' : '-'
    ]);
  });

  const wsProps = XLSX.utils.aoa_to_sheet(propData);
  XLSX.utils.book_append_sheet(wb, wsProps, "Inmuebles y Expedientes");

  // DESCARGA DEL ARCHIVO
  const filename = mode === 'mensual' 
    ? `Reporte_El_Triunfo_${options.currentMonth.replace(/\s+/g, '_')}.xlsx`
    : mode === 'rango'
    ? `Reporte_El_Triunfo_${options.dateFrom}_al_${options.dateTo}.xlsx`
    : `Reporte_El_Triunfo_Global_${new Date().toISOString().slice(0, 10)}.xlsx`;

  XLSX.writeFile(wb, filename);
};
