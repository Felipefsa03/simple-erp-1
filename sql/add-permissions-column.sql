-- Add permissions column to clinics table
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';

-- Enable RLS on clinics again if needed
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

-- Policy for users to update their own clinic
CREATE POLICY "users_update_own_clinic" ON clinics
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.clinic_id = clinics.id
  ));

-- Policy for users to read their own clinic
CREATE POLICY "users_read_own_clinic" ON clinics
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.clinic_id = clinics.id
  ));