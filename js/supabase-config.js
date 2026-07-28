// Configuración de Supabase en la Nube & Motor de Sincronización en Tiempo Real - El Triunfo

window.InmobiliariaSync = window.InmobiliariaSync || {};

const SUPABASE_URL = 'https://agvhmdbayqvyrjscdthc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFndmhtZGJheXF2eXJqc2NkdGhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxMTY3MDcsImV4cCI6MjEwMDY5MjcwN30.kH8wDrHajKcdeybO85PvSDgIRCU3iilyv7T_aReHPXQ';

const STORAGE_KEY = 'inmobiliaria_app_db_v3';
const REALTIME_CHANNEL_NAME = 'inmobiliaria_realtime_sync';

let supabaseClient = null;
if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Conectado a la base de datos en la nube de Supabase (El Triunfo)');
  } catch (err) {
    console.warn('Advertencia al inicializar Supabase:', err);
  }
}

const realtimeChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(REALTIME_CHANNEL_NAME) : null;

let appState = loadStateFromStorage();

function checkAutoOccupationByContractDate(state) {
  if (!state || !Array.isArray(state.tenants) || !Array.isArray(state.properties)) return;

  const todayStr = new Date().toISOString().slice(0, 10);

  state.tenants.forEach(tenant => {
    if (tenant.property_id && tenant.contract_start) {
      const contractStartDate = tenant.contract_start.slice(0, 10);
      if (contractStartDate <= todayStr) {
        const prop = state.properties.find(p => p.id === tenant.property_id || p.code === tenant.property_id);
        if (prop && prop.status === 'disponible') {
          prop.status = 'ocupado';
          console.log(`⚡ Auto-ocupación activada para ${prop.code} por fecha de inicio de contrato (${contractStartDate}).`);
        }
      }
    }
  });
}

function loadStateFromStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      const initData = window.InmobiliariaData || {};

      if (!parsed.settings || !parsed.settings.role_pins) {
        parsed.settings = { ...initData.INITIAL_SYSTEM_SETTINGS, ...parsed.settings };
      }
      if (!Array.isArray(parsed.notes)) parsed.notes = [];
      if (!Array.isArray(parsed.incomeCategories)) parsed.incomeCategories = initData.INITIAL_INCOME_CATEGORIES || ['renta', 'externo', 'otro'];
      if (!Array.isArray(parsed.expenseCategories)) parsed.expenseCategories = initData.INITIAL_EXPENSE_CATEGORIES || ['agua', 'luz', 'internet', 'mantenimiento', 'otro'];
      
      checkAutoOccupationByContractDate(parsed);
      return parsed;
    }
  } catch (e) {
    console.warn('Error al cargar datos locales, usando base limpia El Triunfo:', e);
  }
  
  const cleanState = getCleanTriunfoState();
  checkAutoOccupationByContractDate(cleanState);
  return cleanState;
}

function getCleanTriunfoState() {
  const initData = window.InmobiliariaData || {};
  return {
    properties: initData.INITIAL_PROPERTIES || [],
    tenants: initData.INITIAL_TENANTS || [],
    transactions: initData.INITIAL_TRANSACTIONS || [],
    announcements: initData.INITIAL_ANNOUNCEMENTS || [],
    settings: initData.INITIAL_SYSTEM_SETTINGS || {
      role_pins: { admin: '0000', dueno: '0000', sol: '0000' }
    },
    notes: initData.INITIAL_OWNER_NOTES || [],
    incomeCategories: initData.INITIAL_INCOME_CATEGORIES || ['renta', 'externo', 'otro'],
    expenseCategories: initData.INITIAL_EXPENSE_CATEGORIES || ['agua', 'luz', 'internet', 'mantenimiento', 'otro'],
    supabaseConfig: { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY }
  };
}

function saveStateToStorage() {
  try {
    checkAutoOccupationByContractDate(appState);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    if (realtimeChannel) {
      realtimeChannel.postMessage({ type: 'STATE_UPDATED', timestamp: Date.now() });
    }
    window.dispatchEvent(new CustomEvent('inmobiliaria_state_changed', { detail: appState }));
    
    pushStateToSupabase().catch(err => console.warn('Sync nube silencioso:', err));
  } catch (e) {
    console.error('Error guardando estado local:', e);
  }
}

// GESTIÓN DE CONTRASEÑAS EN TABLA DEDICADA app_passwords EN SUPABASE CLOUD
async function saveCloudPin(role, pin) {
  const cleanPin = String(pin).trim();
  const url = `${SUPABASE_URL}/rest/v1/app_passwords?on_conflict=role`;
  const payload = {
    role: role,
    pin: cleanPin,
    updated_at: new Date().toISOString()
  };

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify(payload)
    });
    const result = await resp.json();
    console.log(`⚡ PIN de [${role}] guardado en tabla app_passwords en Supabase Nube:`, result);

    if (!appState.settings) appState.settings = {};
    if (!appState.settings.role_pins) appState.settings.role_pins = { admin: '0000', dueno: '0000', sol: '0000' };
    appState.settings.role_pins[role] = cleanPin;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));

    if (realtimeChannel) {
      realtimeChannel.postMessage({ type: 'PIN_UPDATED', role, pin: cleanPin });
    }
    return true;
  } catch (err) {
    console.error(`Error al guardar PIN para [${role}]:`, err);
    return false;
  }
}

async function fetchCloudPins() {
  const url = `${SUPABASE_URL}/rest/v1/app_passwords?select=role,pin`;
  try {
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    const data = await resp.json();
    if (Array.isArray(data) && data.length > 0) {
      if (!appState.settings) appState.settings = {};
      if (!appState.settings.role_pins) appState.settings.role_pins = { admin: '0000', dueno: '0000', sol: '0000' };
      
      data.forEach(item => {
        if (item.role && item.pin) {
          appState.settings.role_pins[item.role] = item.pin;
        }
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
      console.log('⚡ Contraseñas descargadas directamente de app_passwords:', appState.settings.role_pins);
      return appState.settings.role_pins;
    }
  } catch (err) {
    console.warn('Error leyendo contraseñas de app_passwords:', err);
  }
  return appState.settings ? appState.settings.role_pins : { admin: '0000', dueno: '0000', sol: '0000' };
}

async function pushStateToSupabase() {
  if (!supabaseClient) return;

  try {
    if (Array.isArray(appState.properties) && appState.properties.length > 0) {
      const dbProps = appState.properties.map(p => ({
        code: p.code,
        title: p.title,
        type: p.type,
        includes_services: p.includes_services,
        base_rent: p.base_rent,
        status: p.status
      }));
      await supabaseClient.from('properties').upsert(dbProps, { onConflict: 'code' });
    }

    if (Array.isArray(appState.tenants) && appState.tenants.length > 0) {
      const dbTenants = appState.tenants.map(t => ({
        full_name: t.full_name,
        curp: t.curp || null,
        phone: t.phone || null,
        email: t.email || null,
        cutoff_day: t.cutoff_day || 1,
        payment_due_day: t.payment_due_day || 5,
        discount: t.discount || 0,
        custom_late_fee: t.custom_late_fee !== undefined ? t.custom_late_fee : null,
        paid_months: t.paid_months || [],
        last_payment_date: t.last_payment_date || null
      }));
      await supabaseClient.from('tenants').upsert(dbTenants);
    }
  } catch (err) {
    console.warn('Sync asíncrono Supabase:', err);
  }
}

async function fetchStateFromSupabase() {
  await fetchCloudPins();

  if (!supabaseClient) return appState;

  try {
    const { data: propsData } = await supabaseClient.from('properties').select('*');
    if (Array.isArray(propsData) && propsData.length > 0) {
      propsData.forEach(sp => {
        const localProp = appState.properties.find(p => p.code === sp.code);
        if (localProp) {
          localProp.status = sp.status;
          localProp.base_rent = Number(sp.base_rent);
        }
      });
    }

    const { data: tenantsData } = await supabaseClient.from('tenants').select('*');
    if (Array.isArray(tenantsData) && tenantsData.length > 0) {
      appState.tenants = tenantsData.map(st => ({
        id: st.id,
        property_id: st.property_id,
        full_name: st.full_name,
        curp: st.curp,
        phone: st.phone,
        email: st.email,
        cutoff_day: st.cutoff_day,
        payment_due_day: st.payment_due_day,
        discount: Number(st.discount),
        custom_late_fee: st.custom_late_fee !== null ? Number(st.custom_late_fee) : null,
        paid_months: Array.isArray(st.paid_months) ? st.paid_months : [],
        last_payment_date: st.last_payment_date
      }));
    }

    const { data: txsData } = await supabaseClient.from('transactions').select('*').order('created_at', { ascending: false }).limit(200);
    if (Array.isArray(txsData) && txsData.length > 0) {
      appState.transactions = txsData.map(stx => ({
        id: stx.id,
        property_id: stx.property_id,
        type: stx.type,
        category: stx.category,
        amount: Number(stx.amount),
        concept: stx.concept,
        month_paid: stx.month_paid,
        registered_by: stx.registered_by,
        receipt_photo: stx.receipt_photo || null,
        created_at: stx.created_at
      }));
    }

    checkAutoOccupationByContractDate(appState);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    window.dispatchEvent(new CustomEvent('inmobiliaria_state_changed', { detail: appState }));
  } catch (err) {
    console.warn('Error leyendo desde Supabase Nube:', err);
  }
  return appState;
}

window.addEventListener('focus', () => {
  fetchStateFromSupabase();
});

if (supabaseClient) {
  fetchStateFromSupabase();

  try {
    supabaseClient
      .channel('schema-db-realtime-global')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        console.log('⚡ Sincronización en tiempo real desde Supabase Nube:', payload);
        fetchStateFromSupabase();
      })
      .subscribe();
  } catch (err) {
    console.warn('Canal de Tiempo Real Supabase:', err);
  }
}

if (realtimeChannel) {
  realtimeChannel.onmessage = (event) => {
    if (event.data && (event.data.type === 'STATE_UPDATED' || event.data.type === 'PIN_UPDATED')) {
      appState = loadStateFromStorage();
      fetchCloudPins().then(() => {
        window.dispatchEvent(new CustomEvent('inmobiliaria_state_changed', { detail: appState }));
      });
    }
  };
}

window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) {
    appState = loadStateFromStorage();
    window.dispatchEvent(new CustomEvent('inmobiliaria_state_changed', { detail: appState }));
  }
});

window.InmobiliariaSync.getAppState = function() {
  return appState;
};

window.InmobiliariaSync.fetchStateFromSupabase = fetchStateFromSupabase;
window.InmobiliariaSync.fetchCloudPins = fetchCloudPins;

window.InmobiliariaSync.subscribeToState = function(callback) {
  const handler = () => callback(appState);
  window.addEventListener('inmobiliaria_state_changed', handler);
  return () => window.removeEventListener('inmobiliaria_state_changed', handler);
};

// ACTUALIZACIÓN DE CLAVES PINS EN LA TABLA DEDICADA app_passwords
window.InmobiliariaSync.updateRolePins = async function({ adminPin, duenoPin, solPin }) {
  if (adminPin) await saveCloudPin('admin', adminPin);
  if (duenoPin) await saveCloudPin('dueno', duenoPin);
  if (solPin) await saveCloudPin('sol', solPin);
  window.dispatchEvent(new CustomEvent('inmobiliaria_state_changed', { detail: appState }));
};

window.InmobiliariaSync.saveSingleRolePin = async function(role, pin) {
  const ok = await saveCloudPin(role, pin);
  if (ok) {
    window.dispatchEvent(new CustomEvent('inmobiliaria_state_changed', { detail: appState }));
  }
  return ok;
};

window.InmobiliariaSync.updateTransaction = function({ id, category, amount, concept, month_paid, created_at, receipt_photo }) {
  const idx = appState.transactions.findIndex(t => t.id === id);
  if (idx !== -1) {
    if (category !== undefined) appState.transactions[idx].category = category;
    if (amount !== undefined) appState.transactions[idx].amount = Number(amount);
    if (concept !== undefined) appState.transactions[idx].concept = concept.trim();
    if (month_paid !== undefined) appState.transactions[idx].month_paid = month_paid;
    if (created_at !== undefined) appState.transactions[idx].created_at = created_at;
    if (receipt_photo !== undefined) appState.transactions[idx].receipt_photo = receipt_photo;
    saveStateToStorage();
  }
};

window.InmobiliariaSync.deleteTransaction = function(id) {
  appState.transactions = appState.transactions.filter(t => t.id !== id);
  saveStateToStorage();
};

window.InmobiliariaSync.addCategory = function(type, categoryName) {
  if (!categoryName || categoryName.trim() === '') return;
  const cleanName = categoryName.trim().toLowerCase();
  
  if (type === 'ingreso') {
    if (!appState.incomeCategories.includes(cleanName)) {
      appState.incomeCategories.push(cleanName);
    }
  } else if (type === 'egreso') {
    if (!appState.expenseCategories.includes(cleanName)) {
      appState.expenseCategories.push(cleanName);
    }
  }
  saveStateToStorage();
};

window.InmobiliariaSync.deleteCategory = function(type, categoryName) {
  if (type === 'ingreso') {
    appState.incomeCategories = appState.incomeCategories.filter(c => c !== categoryName);
  } else if (type === 'egreso') {
    appState.expenseCategories = appState.expenseCategories.filter(c => c !== categoryName);
  }
  saveStateToStorage();
};

window.InmobiliariaSync.togglePropertyOccupation = function(propertyId) {
  const prop = appState.properties.find(p => p.id === propertyId || p.code === propertyId);
  if (!prop) return;

  if (prop.status === 'ocupado') {
    prop.status = 'disponible';
  } else {
    prop.status = 'ocupado';
    const hasTenant = appState.tenants.some(t => t.property_id === prop.id);
    if (!hasTenant) {
      appState.tenants.push({
        id: 'tenant-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        property_id: prop.id,
        full_name: `Inquilino ${prop.title}`,
        curp: `INQ${Date.now().toString().slice(-8)}`,
        phone: '7770000000',
        email: 'inquilino@ejemplo.com',
        contract_renewal_date: new Date().toISOString().slice(0, 10),
        contract_start: new Date().toISOString().slice(0, 10),
        contract_end: new Date(Date.now() + 31536000000).toISOString().slice(0, 10),
        extra_notes: 'Asignado desde control operativo.',
        cutoff_day: 1,
        payment_due_day: 5,
        discount: 0,
        custom_late_fee: null,
        paid_months: [],
        last_payment_date: null
      });
    }
  }

  saveStateToStorage();
};

window.InmobiliariaSync.updatePropertyOperationalSettings = function({ propertyId, base_rent, cutoff_day, payment_due_day, discount, custom_late_fee }) {
  const pIdx = appState.properties.findIndex(p => p.id === propertyId || p.code === propertyId);
  if (pIdx !== -1) {
    if (base_rent !== undefined) appState.properties[pIdx].base_rent = Number(base_rent);
    const targetPropId = appState.properties[pIdx].id;

    const tIdx = appState.tenants.findIndex(t => t.property_id === targetPropId);
    if (tIdx !== -1) {
      if (cutoff_day !== undefined) appState.tenants[tIdx].cutoff_day = Number(cutoff_day);
      if (payment_due_day !== undefined) appState.tenants[tIdx].payment_due_day = Number(payment_due_day);
      if (discount !== undefined) appState.tenants[tIdx].discount = Number(discount);
      if (custom_late_fee !== undefined) appState.tenants[tIdx].custom_late_fee = custom_late_fee !== '' ? Number(custom_late_fee) : null;
    }
  }

  saveStateToStorage();
};

window.InmobiliariaSync.confirmPayment = function({ propertyId, tenantId, amount, concept, monthPaid, registeredBy = 'SOL' }) {
  const now = new Date().toISOString();
  const targetMonth = monthPaid || window.InmobiliariaStatus.getCurrentMonthString();
  
  const tenantIndex = appState.tenants.findIndex(t => t.property_id === propertyId || t.id === tenantId);
  if (tenantIndex !== -1) {
    const tenant = appState.tenants[tenantIndex];
    if (!tenant.paid_months) tenant.paid_months = [];
    if (!tenant.paid_months.includes(targetMonth)) {
      tenant.paid_months.push(targetMonth);
    }
    tenant.last_payment_date = now;
  }

  const prop = appState.properties.find(p => p.id === propertyId || p.code === propertyId);
  const formattedConcept = concept || `Pago de renta del mes de ${targetMonth} - ${prop ? prop.title : ''}`;

  const newTx = {
    id: 'tx-' + Date.now(),
    property_id: propertyId,
    type: 'ingreso',
    category: 'renta',
    amount: Number(amount),
    concept: formattedConcept,
    month_paid: targetMonth,
    registered_by: registeredBy,
    created_at: now
  };

  appState.transactions.unshift(newTx);
  saveStateToStorage();
  return { success: true, transaction: newTx };
};

window.InmobiliariaSync.registerExpense = function({ propertyId = null, category, amount, concept, registeredBy = 'SOL', expenseDate = null, receiptPhoto = null }) {
  if (!concept || concept.trim() === '') {
    throw new Error('El campo "Concepto" es obligatorio para registrar un egreso.');
  }

  if (registeredBy === 'SOL' && (!receiptPhoto || receiptPhoto.trim() === '')) {
    throw new Error('📸 ¡ATENCIÓN! La fotografía del comprobante de egreso es OBLIGATORIA para los egresos registrados por SOL. Por favor tome la foto del ticket antes de guardar.');
  }

  const txDate = expenseDate ? new Date(expenseDate + 'T12:00:00').toISOString() : new Date().toISOString();

  const newTx = {
    id: 'tx-' + Date.now(),
    property_id: propertyId,
    type: 'egreso',
    category: category || 'otro',
    amount: Number(amount),
    concept: concept.trim(),
    month_paid: null,
    registered_by: registeredBy,
    receipt_photo: receiptPhoto || null,
    created_at: txDate
  };

  appState.transactions.unshift(newTx);
  saveStateToStorage();
  return { success: true, transaction: newTx };
};

window.InmobiliariaSync.registerIncome = function({ propertyId = null, category = 'externo', amount, concept, registeredBy = 'Administrador' }) {
  if (!concept || concept.trim() === '') {
    throw new Error('El campo "Concepto" es obligatorio.');
  }

  const newTx = {
    id: 'tx-' + Date.now(),
    property_id: propertyId,
    type: 'ingreso',
    category: category || 'externo',
    amount: Number(amount),
    concept: concept.trim(),
    month_paid: window.InmobiliariaStatus.getCurrentMonthString(),
    registered_by: registeredBy,
    created_at: new Date().toISOString()
  };

  appState.transactions.unshift(newTx);
  saveStateToStorage();
  return { success: true, transaction: newTx };
};

window.InmobiliariaSync.addOwnerNote = function(sectionKey, sectionTitle, content) {
  if (!content || content.trim() === '') return;
  
  if (!Array.isArray(appState.notes)) {
    appState.notes = [];
  }

  const newNote = {
    id: 'note-' + Date.now(),
    date: new Date().toISOString(),
    section_key: sectionKey,
    section_title: sectionTitle,
    content: content.trim(),
    status: 'pendiente'
  };

  appState.notes.unshift(newNote);
  saveStateToStorage();
};

window.InmobiliariaSync.markOwnerNoteAsRead = function(noteId) {
  if (!Array.isArray(appState.notes)) return;
  const idx = appState.notes.findIndex(n => n.id === noteId);
  if (idx !== -1) {
    appState.notes[idx].status = 'visto';
    saveStateToStorage();
  }
};

window.InmobiliariaSync.deleteOwnerNote = function(noteId) {
  if (!Array.isArray(appState.notes)) return;
  appState.notes = appState.notes.filter(n => n.id !== noteId);
  saveStateToStorage();
};

window.InmobiliariaSync.updateSettings = function(newSettings) {
  appState.settings = { ...appState.settings, ...newSettings };
  saveStateToStorage();
};

window.InmobiliariaSync.saveTenant = function(tenantData) {
  if (tenantData.id) {
    const idx = appState.tenants.findIndex(t => t.id === tenantData.id);
    if (idx !== -1) {
      appState.tenants[idx] = { ...appState.tenants[idx], ...tenantData };
    }
  } else {
    const newTenant = {
      ...tenantData,
      id: 'tenant-' + Date.now(),
      paid_months: [],
      last_payment_date: null
    };
    appState.tenants.push(newTenant);
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  if (tenantData.property_id && tenantData.contract_start && tenantData.contract_start.slice(0, 10) <= todayStr) {
    const pIdx = appState.properties.findIndex(p => p.id === tenantData.property_id || p.code === tenantData.property_id);
    if (pIdx !== -1) appState.properties[pIdx].status = 'ocupado';
  }
  
  saveStateToStorage();
};

window.InmobiliariaSync.deleteTenant = function(tenantId) {
  const tenant = appState.tenants.find(t => t.id === tenantId);
  if (tenant && tenant.property_id) {
    const pIdx = appState.properties.findIndex(p => p.id === tenant.property_id);
    if (pIdx !== -1) appState.properties[pIdx].status = 'disponible';
  }
  appState.tenants = appState.tenants.filter(t => t.id !== tenantId);
  saveStateToStorage();
};

window.InmobiliariaSync.createAnnouncement = function({ title, content, target_property_id = null, important_level = 'informativo' }) {
  const newAnn = {
    id: 'ann-' + Date.now(),
    title,
    content,
    target_property_id,
    important_level,
    created_at: new Date().toISOString()
  };
  appState.announcements.unshift(newAnn);
  saveStateToStorage();
};

window.InmobiliariaSync.resetDatabase = function() {
  localStorage.removeItem(STORAGE_KEY);
  appState = getCleanTriunfoState();
  saveStateToStorage();
};
