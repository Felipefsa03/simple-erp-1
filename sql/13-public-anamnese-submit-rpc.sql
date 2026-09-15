-- Consome o token e grava a anamnese sob o mesmo bloqueio de linha, evitando
-- que dois envios concorrentes reutilizem o mesmo link público.
CREATE OR REPLACE FUNCTION public.submit_public_anamnese(
  p_token_hash text,
  p_jti uuid,
  p_anamnese jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token anamnese_public_tokens%ROWTYPE;
  v_record_id uuid;
BEGIN
  SELECT * INTO v_token FROM anamnese_public_tokens
  WHERE token_hash = p_token_hash AND jti = p_jti AND used_at IS NULL AND expires_at > now()
  FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Link inválido, expirado ou já utilizado.'); END IF;

  SELECT id INTO v_record_id FROM medical_records
  WHERE clinic_id = v_token.clinic_id AND patient_id = v_token.patient_id AND deleted_at IS NULL
  ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF v_record_id IS NULL THEN
    INSERT INTO medical_records (clinic_id, patient_id, anamnese)
    VALUES (v_token.clinic_id, v_token.patient_id, p_anamnese || jsonb_build_object('submitted_at', now(), 'source', 'public_link'))
    RETURNING id INTO v_record_id;
  ELSE
    UPDATE medical_records
      SET anamnese = coalesce(anamnese, '{}'::jsonb) || p_anamnese || jsonb_build_object('submitted_at', now(), 'source', 'public_link'), updated_at = now()
    WHERE id = v_record_id;
  END IF;
  UPDATE anamnese_public_tokens SET used_at = now() WHERE id = v_token.id;
  RETURN jsonb_build_object('ok', true, 'record_id', v_record_id);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_anamnese(text, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_anamnese(text, uuid, jsonb) TO service_role;
