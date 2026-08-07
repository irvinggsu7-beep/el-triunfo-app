-- =====================================================================
-- ESQUEMA COMPLETO POSTGRESQL / SUPABASE FOR EL TRIUNFO INMOBILIARIA ESTUDIANTIL
-- Compatibilidad total con IDs en formato texto (Sincronización de Pagos y Egresos)
-- =====================================================================

-- 1. TABLA DEDICADA DE CONTRASEÑAS POR ROL
CREATE TABLE IF NOT EXISTS public.app_passwords (
    role TEXT PRIMARY KEY,
    pin TEXT NOT NULL DEFAULT '0000',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.app_passwords DISABLE ROW LEVEL SECURITY;

INSERT INTO public.app_passwords (role, pin) VALUES 
('admin', '0000'),
('dueno', '0000'),
('sol', '0000')
ON CONFLICT (role) DO NOTHING;

-- 2. TABLA DE CONFIGURACIÓN DEL SISTEMA
CREATE TABLE IF NOT EXISTS public.system_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    whatsapp_phone_1 TEXT NOT NULL DEFAULT '+527772198122',
    whatsapp_phone_2 TEXT NOT NULL DEFAULT '+527341408271',
    bank_name TEXT NOT NULL DEFAULT 'BBVA Bancomer',
    bank_account_holder TEXT NOT NULL DEFAULT 'Bienes Raíces El Triunfo S.A. de C.V.',
    bank_clabe TEXT NOT NULL DEFAULT '012180001234567890',
    bank_account_num TEXT NOT NULL DEFAULT '1234567890',
    default_late_fee NUMERIC(10,2) NOT NULL DEFAULT 250.00,
    grace_period_days INT NOT NULL DEFAULT 7,
    eviction_notice_hours INT NOT NULL DEFAULT 72,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;

INSERT INTO public.system_settings (id, whatsapp_phone_1, whatsapp_phone_2)
VALUES ('global', '+527772198122', '+527341408271')
ON CONFLICT (id) DO NOTHING;

-- 3. TABLA DE PROPIEDADES (22 DEPARTAMENTOS Y 10 CASAS)
CREATE TABLE IF NOT EXISTS public.properties (
    id TEXT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('departamento', 'casa')),
    includes_services BOOLEAN NOT NULL DEFAULT false,
    base_rent NUMERIC(10,2) NOT NULL DEFAULT 3800.00,
    status VARCHAR(20) NOT NULL DEFAULT 'disponible' CHECK (status IN ('disponible', 'ocupado', 'mantenimiento')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.properties DISABLE ROW LEVEL SECURITY;

-- 4. TABLA DE INQUILINOS / ARRENDATARIOS (Sincronización de Pagos por Mes)
CREATE TABLE IF NOT EXISTS public.tenants (
    id TEXT PRIMARY KEY,
    property_id TEXT,
    full_name VARCHAR(150) NOT NULL,
    curp VARCHAR(50),
    phone VARCHAR(30),
    email VARCHAR(150),
    cutoff_day INT NOT NULL DEFAULT 1,
    payment_due_day INT NOT NULL DEFAULT 5,
    discount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    custom_late_fee NUMERIC(10,2) DEFAULT NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'verde',
    paid_months JSONB DEFAULT '[]'::jsonb,
    last_payment_date TIMESTAMP WITH TIME ZONE,
    contract_renewal_date VARCHAR(50),
    contract_start VARCHAR(50),
    contract_end VARCHAR(50),
    extra_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;

-- 5. TABLA DE TRANSACCIONES (INGRESOS Y EGRESOS EN TIEMPO REAL)
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    property_id TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('ingreso', 'egreso')),
    category VARCHAR(50) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    concept TEXT NOT NULL,
    month_paid VARCHAR(50),
    registered_by VARCHAR(50) NOT NULL DEFAULT 'SOL',
    receipt_photo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;

-- 6. TABLA DE ANUNCIOS GLOBALES Y ESPECÍFICOS
CREATE TABLE IF NOT EXISTS public.announcements (
    id TEXT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    content TEXT NOT NULL,
    target_property_id TEXT,
    important_level VARCHAR(20) DEFAULT 'normal',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.announcements DISABLE ROW LEVEL SECURITY;

-- 7. TABLA DE NOTAS PERSISTENTES DEL DUEÑO
CREATE TABLE IF NOT EXISTS public.owner_notes (
    id TEXT PRIMARY KEY,
    section_key VARCHAR(100) NOT NULL,
    section_title VARCHAR(150),
    content TEXT NOT NULL DEFAULT '',
    status VARCHAR(20) DEFAULT 'pendiente',
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.owner_notes DISABLE ROW LEVEL SECURITY;

-- CONFIGURACIÓN DE REPLICA IDENTITY FULL PARA TRANSMISIÓN DE EVENTOS COMPLETOS EN TIEMPO REAL
ALTER TABLE public.app_passwords REPLICA IDENTITY FULL;
ALTER TABLE public.properties REPLICA IDENTITY FULL;
ALTER TABLE public.tenants REPLICA IDENTITY FULL;
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.announcements REPLICA IDENTITY FULL;
ALTER TABLE public.owner_notes REPLICA IDENTITY FULL;
ALTER TABLE public.system_settings REPLICA IDENTITY FULL;

-- SUSCRIPCIÓN A PUBLICACIÓN REALTIME
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'app_passwords') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.app_passwords;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'properties') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.properties;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'tenants') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.tenants;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'transactions') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'announcements') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'system_settings') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.system_settings;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'owner_notes') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.owner_notes;
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
