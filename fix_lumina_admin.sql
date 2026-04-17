-- FIX LUMINA ADMIN SUBSCRIPTION
-- Força o plano premium e remove bloqueios de cobrança para admin@lumina.com

-- 1. Identificar IDs
DO $$
DECLARE
    v_user_id UUID;
    v_clinic_id UUID;
BEGIN
    SELECT id, clinic_id INTO v_user_id, v_clinic_id FROM users WHERE email = 'admin@lumina.com';

    IF v_user_id IS NOT NULL AND v_clinic_id IS NOT NULL THEN
        -- 2. Atualizar Plano da Clínica para Premium
        UPDATE clinics SET plan = 'premium', status = 'active' WHERE id = v_clinic_id;

        -- 3. Inserir Registro de Pagamento Aprovado (Garante liberação do RLS)
        INSERT INTO payments (id, clinic_id, amount, status, method, details, created_at)
        VALUES (
            gen_random_uuid(),
            v_clinic_id,
            397.00,
            'approved',
            'manual_patch',
            '{"reason": "Isenção Administrativa - Plano Premium Vitalício", "operator": "Antigravity AI"}',
            NOW()
        )
        ON CONFLICT DO NOTHING;

        RAISE NOTICE 'Sucesso: admin@lumina.com (Clínica %) atualizada para Premium.', v_clinic_id;
    ELSE
        RAISE NOTICE 'Aviso: Usuário admin@lumina.com não encontrado.';
    END IF;
END $$;
