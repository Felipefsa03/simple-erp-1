-- ============================================
-- BLOCO 5: Dados Iniciais e Funções de Limpeza
-- Execute DEPOIS do Bloco 4
-- ============================================

-- Dados demo
INSERT INTO clinics (id, name, cnpj, email, phone, address, city, state, zip_code, plan, status)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Lumina Odontologia', '12345678000190', 'lumina@email.com', '1134567890', 'Av. Paulista, 1000', 'São Paulo', 'SP', '01310100', 'professional', 'active'),
    ('00000000-0000-0000-0000-000000000002', 'Sorriso Total', '98765432000110', 'sorriso@email.com', '2134567891', 'Rua do Catete, 500', 'Rio de Janeiro', 'RJ', '22220000', 'basic', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO services (clinic_id, name, category, price, duration)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Consulta', 'Consulta', 150, 30),
    ('00000000-0000-0000-0000-000000000001', 'Limpeza', 'Procedimento', 200, 60),
    ('00000000-0000-0000-0000-000000000001', 'Restauração', 'Procedimento', 350, 90),
    ('00000000-0000-0000-0000-000000000001', 'Canal', 'Procedimento', 800, 120),
    ('00000000-0000-0000-0000-000000000001', 'Clareamento', 'Estética', 1200, 90)
ON CONFLICT DO NOTHING;

-- Funções de limpeza
CREATE OR REPLACE FUNCTION cleanup_expired_codes()
RETURNS void AS $$
BEGIN
    DELETE FROM password_codes WHERE expires < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Comentários
COMMENT ON TABLE clinics IS 'Clínicas cadastradas (multi-tenant)';
COMMENT ON TABLE users IS 'Usuários do sistema (sincronizado com auth.users)';
COMMENT ON TABLE patients IS 'Pacientes das clínicas';
COMMENT ON TABLE professionals IS 'Perfis complementares de profissionais';
COMMENT ON TABLE services IS 'Serviços oferecidos';
COMMENT ON TABLE appointments IS 'Agendamentos';
COMMENT ON TABLE medical_records IS 'Prontuários médicos';
COMMENT ON TABLE transactions IS 'Transações financeiras';
COMMENT ON TABLE stock_items IS 'Itens de estoque';
COMMENT ON TABLE insurances IS 'Convênios aceitos';
COMMENT ON TABLE branches IS 'Filiais';
COMMENT ON TABLE clinic_integrations IS 'Integrações por clínica';
COMMENT ON TABLE system_integrations IS 'Integrações globais do sistema';
COMMENT ON TABLE password_codes IS 'Códigos de recuperação de senha';
COMMENT ON TABLE audit_logs IS 'Logs de auditoria';
