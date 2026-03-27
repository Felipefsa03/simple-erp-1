# Como Criar o Banco de Dados no Supabase

## Passo a Passo

### 1. Acesse o SQL Editor

1. Vá para [supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecione o projeto **gzcimnredlffqyogxzqq**
3. No menu lateral, clique em **SQL Editor**

### 2. Execute os blocos na ordem

Execute **um bloco por vez**, esperando cada um terminar antes de executar o próximo:

#### Bloco 1: `01-functions-basic.sql`
```
Clique em "New Query" → Cole o conteúdo → Clique em "Run"
```

#### Bloco 2: `02-tables.sql`
```
Clique em "New Query" → Cole o conteúdo → Clique em "Run"
```

#### Bloco 3: `03-functions-triggers.sql`
```
Clique em "New Query" → Cole o conteúdo → Clique em "Run"
```

#### Bloco 4: `04-rls-policies.sql`
```
Clique em "New Query" → Cole o conteúdo → Clique em "Run"
```

#### Bloco 5: `05-seed-data.sql`
```
Clique em "New Query" → Cole o conteúdo → Clique em "Run"
```

### 3. Verifique se deu certo

Vá em **Table Editor** no menu lateral. Você deve ver:

```
✓ clinics
✓ users
✓ patients
✓ professionals
✓ services
✓ appointments
✓ medical_records
✓ transactions
✓ stock_items
✓ insurances
✓ branches
✓ clinic_integrations
✓ system_integrations
✓ password_codes
✓ audit_logs
```

### Se der erro

- Se o erro for "relation already exists", ignore (já foi criado antes)
- Se o erro for de dependência, execute o bloco anterior primeiro
- Se persistir, execute este SQL para limpar tudo e recomeçar:

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;
```
