# Correção de Sincronização e RLS para Criação de Usuários

## O que foi alterado
1. **Backend (`server/index.js`)**:
   - A função `getSupabaseWriteHeaders` agora impõe explicitamente o uso da `SUPABASE_SERVICE_ROLE_KEY` caso ela exista. Se não existir, ele usa o token do usuário logado em vez da `ANON_KEY`.
   - Adicionada a passagem do `req.token` (do administrador logado) para a função `upsertClinicTeamUser`. Isso garante que as requisições ao Supabase para inserir usuários tenham o contexto do admin (e não anônimo).

2. **Banco de Dados (`sql/04-rls-policies.sql`)**:
   - A política `users_insert` e `users_update` foram modificadas para permitir que donos/admins (`owner`, `super_admin`, `admin`) da mesma clínica possam inserir registros na tabela `users`.
   - Essa é uma **solução definitiva e robusta**, pois não depende unicamente da Service Role Key para ignorar as RLS; ela autoriza legitimamente o administrador da clínica no banco de dados.

3. **Frontend (`frontend/src/stores/clinicStore.ts`)**:
   - Se a criação do usuário no backend falhar (por exemplo, 500 Server Error ou Permissão Negada), o frontend **NÃO salva mais o profissional com `user_id: null`**.
   - O profissional falso é removido da lista em tela, garantindo consistência com o banco.

## Variáveis Necessárias no Render

Certifique-se de ter configurado no Render as seguintes variáveis de ambiente:
- `SUPABASE_URL` = URL do seu projeto Supabase (ex: https://gzcimnredlffqyogxzqq.supabase.co)
- `SUPABASE_PUBLISHABLE_KEY` = Sua Anon Key
- `SUPABASE_SERVICE_ROLE_KEY` = A chave de Service Role (que começa com `eyJhb...`). Você encontra em Project Settings -> API -> Legacy anon, service_role API keys. **NUNCA DEIXE ESSA CHAVE VAZIA EM PRODUÇÃO**.

## Como Testar
- Limpe o cache do navegador.
- Faça login com uma conta Admin válida.
- Tente criar um novo usuário com perfil (Recepcionista/Dentista).
- Verifique se a linha do usuário é inserida nas tabelas `auth.users`, `users` e `professionals` do Supabase.
- Verifique a ausência de erros `permission denied for table users` no console ou log do Render.
