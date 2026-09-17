-- Add photos JSONB column to patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;

-- Update existing patients to have empty photos array
UPDATE patients SET photos = '[]'::jsonb WHERE photos IS NULL;
