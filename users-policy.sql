-- Políticas para users (necessário para buscar nomes de profissionais)
CREATE POLICY "anon_users_select" ON users FOR SELECT TO anon USING (true);
