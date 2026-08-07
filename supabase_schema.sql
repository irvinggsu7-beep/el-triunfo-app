-- =====================================================================
-- ESQUEMA DEFINITIVO SUPABASE - EL TRIUNFO INMOBILIARIA ESTUDIANTIL
-- Reconstrucción de Tablas para Sincronización en Tiempo Real de Pagos y Montos
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

-- 2. RECONSTRUIR TABLA DE PROPIEDADES
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

-- 3. RECONSTRUIR TABLA DE INQUILINOS
DROP TABLE IF EXISTS public.tenants CASCADE;

CREATE TABLE public.tenants (
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

-- 4. RECONSTRUIR TABLA DE TRANSACCIONES (MOVIMIENTOS DE PAGOS Y EGRESOS)
DROP TABLE IF EXISTS public.transactions CASCADE;

CREATE TABLE public.transactions (
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

-- 5. TABLA DE NOTAS DEL DUEÑO
CREATE TABLE IF NOT EXISTS public.owner_notes (
    id TEXT PRIMARY KEY,
    section_key VARCHAR(100) NOT NULL,
    section_title VARCHAR(150),
    content TEXT NOT NULL DEFAULT '',
    status VARCHAR(20) DEFAULT 'pendiente',
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.owner_notes DISABLE ROW LEVEL SECURITY;

-- CONFIGURACIÓN DE REPLICA IDENTITY FULL PARA REALTIME BROADCASTING
ALTER TABLE public.app_passwords REPLICA IDENTITY FULL;
ALTER TABLE public.properties REPLICA IDENTITY FULL;
ALTER TABLE public.tenants REPLICA IDENTITY FULL;
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.owner_notes REPLICA IDENTITY FULL;

-- RE-SUSCRIPCIÓN DE TABLAS A LA PUBLICACIÓN REALTIME DE SUPABASE
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
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'owner_notes') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.owner_notes;
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
