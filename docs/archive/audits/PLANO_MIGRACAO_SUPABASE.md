# PLANO DETALHADO: Integração com Supabase
## Migração Completa do Banco de Dados para o Supabase

---

## 1. O QUE É O SUPABASE?

O Supabase é uma plataforma de **Backend as a Service (BaaS)** que oferece:

| Recurso | Descrição |
|---|---|
| **PostgreSQL** | Banco de dados relacional completo |
| **Autenticação** | Login, cadastro, recuperação de senha |
| **Storage** | Upload de arquivos (imagens, documentos) |
| **Realtime** | Dados em tempo real (como Firebase) |
| **Edge Functions** | Funções serverless |
| **Row Level Security** | Segurança por linha no banco |

**É como ter um backend completo sem precisar configurar servidores.**

---

## 2. POR QUE USAR SUPABASE?

| Problema Atual | Solução com Supabase |
|---|---|
| Dados salvos no localStorage do navegador | Dados salvos na nuvem (PostgreSQL) |
| Dados perdidos ao limpar cache | Dados permanentes e seguros |
| Não funciona em múltiplos dispositivos | Sincronização entre todos os dispositivos |
| Sem backup automático | Backup automático diário |
| Sem autenticação real | Autenticação profissional (email, Google, etc.) |
| Sem escalabilidade | Escala automaticamente |
| Dados não são multi-tenant | Suporte nativo a multi-tenant |

---

## 3. ARQUITETURA ATUAL vs NOVA

### Arquitetura Atual

```
┌─────────────────────────────────────────┐
│           NAVEGADOR DO USUÁRIO          │
├─────────────────────────────────────────┤
│                                         │
│   React App                             │
│      ↓                                  │
│   Zustand Store                         │
│      ↓                                  │
│   localStorage (armazenamento local)    │
│                                         │
│   ⚠️ Problema: dados ficam no navegador │
│                                         │
└─────────────────────────────────────────┘
```

### Nova Arquitetura com Supabase

```
┌─────────────────────────────────────────┐
│           NAVEGADOR DO USUÁRIO          │
├─────────────────────────────────────────┤
│                                         │
│   React App                             │
│      ↓                                  │
│   Supabase Client SDK                   │
│      ↓                                  │
│   HTTPS                                 │
│                                         │
└───────────────────┬─────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────┐
│              SUPABASE                   │
├─────────────────────────────────────────┤
│                                         │
│   PostgreSQL (banco de dados)           │
│   Auth (autenticação)                   │
│   Storage (arquivos)                    │
│   Realtime (tempo real)                 │
│   Edge Functions (serverless)           │
│                                         │
│   ✅ Dados na nuvem, seguros e          │
│      sincronizados                      │
│                                         │
└─────────────────────────────────────────┘
```

---

## 4. ESQUEMA DO BANCO DE DADOS

### Tabelas Necessárias

```sql
-- ============================================
-- 1. CLÍNICAS (Multi-tenant)
-- ============================================
CREATE TABLE clinics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cnpj TEXT UNIQUE,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    logo_url TEXT,
    subscription_plan TEXT DEFAULT 'basic',
    subscription_status TEXT DEFAULT 'trial',
    subscription_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. USUÁRIOS (Autenticação)
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'dentist', 'receptionist', 'aesthetician', 'financial')),
    cro TEXT,
    commission_pct NUMERIC DEFAULT 0,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. PACIENTES
-- ============================================
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    cpf TEXT,
    rg TEXT,
    birth_date DATE,
    gender TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    notes TEXT,
    allergies TEXT,
    medications TEXT,
    medical_history JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. PROFISSIONAIS
-- ============================================
CREATE TABLE professionals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id),
    user_id UUID REFERENCES users(id),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    cro TEXT,
    specialty TEXT,
    commission_pct NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. SERVIÇOS
-- ============================================
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id),
    name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    base_price NUMERIC DEFAULT 0,
    avg_duration_min INTEGER DEFAULT 60,
    estimated_cost NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. AGENDAMENTOS
-- ============================================
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id),
    patient_id UUID REFERENCES patients(id),
    professional_id UUID REFERENCES professionals(id),
    service_id UUID REFERENCES services(id),
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_min INTEGER DEFAULT 60,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'done', 'cancelled', 'no_show')),
    notes TEXT,
    whatsapp_confirmed BOOLEAN DEFAULT false,
    whatsapp_reminder_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. PRONTUÁRIOS
-- ============================================
CREATE TABLE medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id),
    patient_id UUID REFERENCES patients(id),
    appointment_id UUID REFERENCES appointments(id),
    professional_id UUID REFERENCES professionals(id),
    anamnese JSONB DEFAULT '{}',
    odontogram JSONB DEFAULT '{}',
    diagnosis TEXT,
    treatment_plan TEXT,
    evolution TEXT,
    prescriptions TEXT,
    attachments TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. TRANSAÇÕES FINANCEIRAS
-- ============================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id),
    appointment_id UUID REFERENCES appointments(id),
    patient_id UUID REFERENCES patients(id),
    professional_id UUID REFERENCES professionals(id),
    type TEXT CHECK (type IN ('income', 'expense')),
    category TEXT,
    description TEXT,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
    payment_method TEXT,
    payment_reference TEXT,
    pix_code TEXT,
    asaas_payment_id TEXT,
    due_date DATE,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. ESTOQUE
-- ============================================
CREATE TABLE stock_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id),
    name TEXT NOT NULL,
    category TEXT,
    unit TEXT DEFAULT 'UN',
    quantity NUMERIC DEFAULT 0,
    min_quantity NUMERIC DEFAULT 0,
    cost_price NUMERIC DEFAULT 0,
    supplier TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. CONVÊNIOS
-- ============================================
CREATE TABLE insurances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id),
    name TEXT NOT NULL,
    code TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    address TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 11. FILIAIS
-- ============================================
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    responsible_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 12. INTEGRAÇÕES POR CLÍNICA
-- ============================================
CREATE TABLE clinic_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id),
    integration_type TEXT NOT NULL CHECK (integration_type IN ('whatsapp', 'asaas', 'google_calendar', 'rd_station', 'meta_ads')),
    status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'pending', 'error')),
    api_token TEXT,
    api_secret TEXT,
    phone_number TEXT,
    webhook_url TEXT,
    extra_config JSONB DEFAULT '{}',
    last_sync_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 13. INTEGRAÇÃO WHATSAPP GLOBAL (Sistema)
-- ============================================
CREATE TABLE system_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_type TEXT NOT NULL UNIQUE CHECK (integration_type IN ('whatsapp_system', 'nfe', 'payment_gateway')),
    status TEXT DEFAULT 'inactive',
    api_token TEXT,
    phone_number TEXT,
    extra_config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 14. CÓDIGOS DE RECUPERAÇÃO DE SENHA
-- ============================================
CREATE TABLE password_reset_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER DEFAULT 0,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 15. LOGS DE AUDITORIA
-- ============================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID,
    user_id UUID,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. CONFIGURAÇÃO DO SUPABASE

### Passo 1: Criar Conta

1. Acesse [supabase.com](https://supabase.com)
2. Clique em "Start your project"
3. Faça login com GitHub ou email
4. Clique em "New Project"
5. Preencha:
   - **Name**: luminaflow-erp
   - **Database Password**: (gere uma senha forte)
   - **Region**: South America (São Paulo)
6. Clique em "Create new project"

### Passo 2: Obter Credenciais

Após criar o projeto, vá em **Settings > API**:

```
Project URL: https://xxxxxxxxxxxx.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Service Role Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Passo 3: Configurar .env

```env
# Supabase
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Passo 4: Instalar SDK

```bash
npm install @supabase/supabase-js
```

### Passo 5: Criar Cliente Supabase

```typescript
// frontend/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## 6. MIGRAÇÃO DO ZUSTAND PARA SUPABASE

### Antes (Zustand + localStorage)

```typescript
// stores/clinicStore.ts
const useClinicStore = create((set) => ({
  patients: [],
  addPatient: (patient) => {
    set((state) => ({
      patients: [...state.patients, patient]
    }));
  }
}));
```

### Depois (Supabase)

```typescript
// hooks/usePatients.ts
import { supabase } from '@/lib/supabase';

export function usePatients(clinicId: string) {
  const [patients, setPatients] = useState([]);

  // Buscar pacientes
  const fetchPatients = async () => {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false });

    if (!error) setPatients(data);
  };

  // Adicionar paciente
  const addPatient = async (patient) => {
    const { data, error } = await supabase
      .from('patients')
      .insert({ ...patient, clinic_id: clinicId })
      .select()
      .single();

    if (!error) {
      setPatients(prev => [data, ...prev]);
    }
  };

  // Atualizar paciente
  const updatePatient = async (id, updates) => {
    const { data, error } = await supabase
      .from('patients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (!error) {
      setPatients(prev => prev.map(p => p.id === id ? data : p));
    }
  };

  // Deletar paciente
  const deletePatient = async (id) => {
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id);

    if (!error) {
      setPatients(prev => prev.filter(p => p.id !== id));
    }
  };

  return { patients, fetchPatients, addPatient, updatePatient, deletePatient };
}
```

---

## 7. AUTENTICAÇÃO COM SUPABASE

### Substituir useAuth.ts

```typescript
// hooks/useAuth.ts (novo)
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

interface AuthState {
  user: any | null;
  clinic: any | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  updatePassword: (newPassword: string) => Promise<boolean>;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  clinic: null,
  loading: true,

  // Login
  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return false;

    // Buscar dados do usuário
    const { data: userData } = await supabase
      .from('users')
      .select('*, clinics(*)')
      .eq('id', data.user.id)
      .single();

    set({
      user: userData,
      clinic: userData.clinics,
    });

    return true;
  },

  // Logout
  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, clinic: null });
  },

  // Recuperar senha
  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return !error;
  },

  // Atualizar senha
  updatePassword: async (newPassword) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return !error;
  },
}));

// Verificar sessão ao carregar
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    // Usuário logado
  } else if (event === 'SIGNED_OUT') {
    useAuth.getState().logout();
  }
});
```

---

## 8. ROW LEVEL SECURITY (SEGURANÇA)

### Política para cada tabela

```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Política: Usuário só vê dados da própria clínica
CREATE POLICY "Users can only see own clinic data" ON patients
    FOR ALL USING (
        clinic_id IN (
            SELECT clinic_id FROM users WHERE id = auth.uid()
        )
    );

-- Política: Usuário só vê próprios agendamentos
CREATE POLICY "Users can only see own clinic appointments" ON appointments
    FOR ALL USING (
        clinic_id IN (
            SELECT clinic_id FROM users WHERE id = auth.uid()
        )
    );

-- Política: Usuário só vê próprias transações
CREATE POLICY "Users can only see own clinic transactions" ON transactions
    FOR ALL USING (
        clinic_id IN (
            SELECT clinic_id FROM users WHERE id = auth.uid()
        )
    );

-- Super Admin vê tudo
CREATE POLICY "Super admin can see all" ON clinics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'
        )
    );
```

---

## 9. REALTIME (TEMPO REAL)

### Configurar subscriptions

```typescript
// hooks/useRealtime.ts
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useRealtimeAppointments(clinicId: string, onUpdate: () => void) {
  useEffect(() => {
    const subscription = supabase
      .channel('appointments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `clinic_id=eq.${clinicId}`,
        },
        (payload) => {
          console.log('Appointment changed:', payload);
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [clinicId, onUpdate]);
}
```

---

## 10. STORAGE (ARQUIVOS)

### Upload de imagens

```typescript
// services/storage.ts
import { supabase } from '@/lib/supabase';

export async function uploadAvatar(file: File, userId: string) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}.${fileExt}`;
  const filePath = `avatars/${fileName}`;

  const { data, error } = await supabase.storage
    .from('clinic-files')
    .upload(filePath, file, { upsert: true });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('clinic-files')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}
```

---

## 11. TIMELINE DE MIGRAÇÃO

| Fase | Tempo | Entregável |
|---|---|---|
| **Fase 1** | 2 dias | Configurar Supabase + criar tabelas |
| **Fase 2** | 3 dias | Migrar autenticação |
| **Fase 3** | 3 dias | Migrar pacientes e agenda |
| **Fase 4** | 2 dias | Migrar financeiro e estoque |
| **Fase 5** | 2 dias | Migrar convênios e filiais |
| **Fase 6** | 2 dias | Configurar RLS e segurança |
| **Fase 7** | 2 dias | Configurar Realtime |
| **Fase 8** | 2 dias | Testes e correções |
| **Total** | **18 dias** | Sistema completo no Supabase |

---

## 12. CUSTOS DO SUPABASE

| Plano | Preço | Recursos |
|---|---|---|
| **Free** | $0/mês | 500MB banco, 1GB storage, 50k usuários |
| **Pro** | $25/mês | 8GB banco, 100GB storage, 100k usuários |
| **Team** | $599/mês | Tudo do Pro + suporte prioritário |
| **Enterprise** | Sob consulta | Customizado |

**Recomendação:** Começar com o **plano Free** para testes, depois migrar para **Pro** em produção.

---

## 13. CHECKLIST DE MIGRAÇÃO

### Antes da Migração
- [ ] Criar conta no Supabase
- [ ] Criar projeto no Supabase
- [ ] Configurar variáveis de ambiente
- [ ] Instalar @supabase/supabase-js
- [ ] Criar tabelas no Supabase
- [ ] Configurar RLS

### Durante a Migração
- [ ] Migrar autenticação
- [ ] Migrar pacientes
- [ ] Migrar agenda
- [ ] Migrar financeiro
- [ ] Migrar estoque
- [ ] Migrar convênios
- [ ] Migrar filiais
- [ ] Migrar integrações

### Após a Migração
- [ ] Testar login/logout
- [ ] Testar CRUD de pacientes
- [ ] Testar CRUD de agenda
- [ ] Testar financeiro
- [ ] Testar realtime
- [ ] Testar upload de arquivos
- [ ] Verificar segurança (RLS)
- [ ] Deploy em produção

---

## 14. PRÓXIMOS PASSOS

1. **Criar conta no Supabase** (5 minutos)
2. **Criar projeto** (5 minutos)
3. **Configurar variáveis de ambiente** (10 minutos)
4. **Criar tabelas** (30 minutos)
5. **Começar migração da autenticação** (2-3 dias)

Quer que eu comece a implementar a migração agora?
