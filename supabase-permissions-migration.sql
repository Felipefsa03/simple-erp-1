CREATE TABLE IF NOT EXISTS clinic_permissions (
    clinic_id UUID PRIMARY KEY REFERENCES clinics(id) ON DELETE CASCADE,
    permissions JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clinic_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_permissions_select" ON clinic_permissions 
FOR SELECT USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY "clinic_permissions_insert" ON clinic_permissions 
FOR INSERT WITH CHECK (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

CREATE POLICY "clinic_permissions_update" ON clinic_permissions 
FOR UPDATE USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
