-- Booking público: operação única, validada e executada pelo backend/RPC.
-- O front-end nunca recebe acesso direto a patients ou appointments.
CREATE OR REPLACE FUNCTION public.public_create_booking(
  p_clinic_id uuid,
  p_name text,
  p_phone text,
  p_email text,
  p_service_id uuid DEFAULT NULL,
  p_professional_id uuid DEFAULT NULL,
  p_date date DEFAULT NULL,
  p_time time DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id uuid;
  v_appointment_id uuid;
  v_scheduled timestamptz;
  v_duration integer := 60;
  v_end timestamptz;
BEGIN
  IF p_name IS NULL OR length(trim(p_name)) = 0 OR p_email IS NULL OR p_phone IS NULL OR p_date IS NULL OR p_time IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Dados obrigatórios ausentes.');
  END IF;
  IF p_date < current_date OR p_time < time '06:00' OR p_time > time '22:00' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Horário inválido para agendamento.');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM clinics
    WHERE id = p_clinic_id AND deleted_at IS NULL AND status IN ('trial', 'active')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Clínica indisponível para agendamento.');
  END IF;
  IF p_service_id IS NOT NULL THEN
    SELECT coalesce(duration, 60) INTO v_duration
    FROM services WHERE id = p_service_id AND clinic_id = p_clinic_id AND deleted_at IS NULL AND active = true;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Serviço indisponível.'); END IF;
  END IF;
  IF p_professional_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM professionals WHERE id = p_professional_id AND clinic_id = p_clinic_id AND active = true
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Profissional indisponível.');
  END IF;

  v_scheduled := (p_date + p_time) AT TIME ZONE current_setting('TimeZone');
  v_end := v_scheduled + make_interval(mins => v_duration);
  IF p_professional_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM appointments
    WHERE clinic_id = p_clinic_id AND professional_id = p_professional_id
      AND status NOT IN ('cancelled', 'no_show') AND deleted_at IS NULL
      AND scheduled < v_end AND (scheduled + make_interval(mins => coalesce(duration, 60))) > v_scheduled
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Horário não está mais disponível.');
  END IF;

  SELECT id INTO v_patient_id FROM patients
  WHERE clinic_id = p_clinic_id AND deleted_at IS NULL
    AND (lower(email) = lower(trim(p_email)) OR phone = regexp_replace(p_phone, '\D', '', 'g'))
  ORDER BY updated_at DESC NULLS LAST LIMIT 1 FOR UPDATE;
  IF v_patient_id IS NULL THEN
    INSERT INTO patients (clinic_id, name, email, phone, active)
    VALUES (p_clinic_id, trim(p_name), lower(trim(p_email)), regexp_replace(p_phone, '\D', '', 'g'), true)
    RETURNING id INTO v_patient_id;
  ELSE
    UPDATE patients SET name = trim(p_name), email = lower(trim(p_email)), phone = regexp_replace(p_phone, '\D', '', 'g'), updated_at = now()
    WHERE id = v_patient_id;
  END IF;

  INSERT INTO appointments (clinic_id, patient_id, professional_id, service_id, scheduled, duration, status, notes)
  VALUES (p_clinic_id, v_patient_id, p_professional_id, p_service_id, v_scheduled, v_duration, 'scheduled', left(coalesce(p_notes, 'Agendamento Online'), 300))
  RETURNING id INTO v_appointment_id;
  RETURN jsonb_build_object('ok', true, 'appointment_id', v_appointment_id, 'patient_id', v_patient_id, 'scheduled', v_scheduled);
END;
$$;

REVOKE ALL ON FUNCTION public.public_create_booking(uuid, text, text, text, uuid, uuid, date, time, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_create_booking(uuid, text, text, text, uuid, uuid, date, time, text) TO service_role;
