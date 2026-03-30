-- LuminaFlow ERP - Tabelas do Supabase
-- Execute este script no SQL Editor do Supabase

-- 1. Patients
CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    clinic_id TEXT NOT NULL,
    name TEXT NOT NULL,
    cpf TEXT,
    phone TEXT,
    email TEXT,
    birth_date TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    cep TEXT,
    gender TEXT,
    occupation TEXT,
    emergency_contact TEXT,
    emergency_phone TEXT,
    notes TEXT,
    tags TEXT[],
    allergies TEXT[],
    status TEXT DEFAULT 'active',
    last_visit TEXT,
    created_at TEXT DEFAULT NOW()
);

-- 2. Professionals
CREATE TABLE IF NOT EXISTS professionals (
    id TEXT PRIMARY KEY,
    clinic_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    commission_pct DECIMAL(5,2) DEFAULT 0,
    phone TEXT,
    cro TEXT,
    specialty TEXT,
    active BOOLEAN DEFAULT true,
    created_at TEXT DEFAULT NOW()
);

-- 3. Appointments
CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    clinic_id TEXT NOT NULL,
    patient_id TEXT,
    patient_name TEXT,
    professional_id TEXT,
    professional_name TEXT,
    service_id TEXT,
    service_name TEXT,
    scheduled_at TEXT NOT NULL,
    duration_min INTEGER NOT NULL,
    status TEXT DEFAULT 'scheduled',
    base_value DECIMAL(10,2),
    notes TEXT,
    source TEXT DEFAULT 'internal',
    created_at TEXT DEFAULT NOW()
);

-- 4. Services
CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    clinic_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    avg_duration_min INTEGER,
    base_price DECIMAL(10,2),
    estimated_cost DECIMAL(10,2),
    active BOOLEAN DEFAULT true,
    created_at TEXT DEFAULT NOW()
);

-- 5. Stock Items
CREATE TABLE IF NOT EXISTS stock_items (
    id TEXT PRIMARY KEY,
    clinic_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    quantity INTEGER DEFAULT 0,
    min_quantity INTEGER DEFAULT 0,
    unit TEXT,
    unit_cost DECIMAL(10,2),
    created_at TEXT DEFAULT NOW()
);

-- 6. Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    clinic_id TEXT NOT NULL,
    patient_id TEXT,
    patient_name TEXT,
    professional_id TEXT,
    professional_name TEXT,
    appointment_id TEXT,
    type TEXT NOT NULL,
    category TEXT,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending',
    payment_method TEXT,
    paid_at TEXT,
    date TEXT,
    idempotency_key TEXT,
    created_at TEXT DEFAULT NOW()
);

-- 7. Medical Records
CREATE TABLE IF NOT EXISTS medical_records (
    id TEXT PRIMARY KEY,
    clinic_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    appointment_id TEXT,
    professional_id TEXT,
    content TEXT,
    created_at TEXT DEFAULT NOW()
);

-- 8. Anamnese
CREATE TABLE IF NOT EXISTS anamnese (
    id TEXT PRIMARY KEY,
    clinic_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    medical_history TEXT,
    current_medications TEXT,
    allergies TEXT,
    complaints TEXT,
    updated_at TEXT DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security) - opcional para desenvolvimento
-- ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE services ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE anamnese ENABLE ROW LEVEL SECURITY;

SELECT 'Tabelas criadas com sucesso!';
