ALTER TABLE companies ADD COLUMN IF NOT EXISTS display_name text;

-- Drop bank_phone column if it exists
ALTER TABLE companies DROP COLUMN IF EXISTS bank_phone;