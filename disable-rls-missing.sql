-- SECURITY PATCH:
-- Este script legado desabilitava RLS globalmente e criava risco de exposição entre clínicas.
-- Mantemos o arquivo apenas por compatibilidade histórica, mas com comportamento seguro.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurances ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
