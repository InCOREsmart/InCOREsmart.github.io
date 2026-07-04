-- Add phone column to companies table for CEO/company phone
ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone text;

-- Create index for phone lookups
CREATE INDEX IF NOT EXISTS idx_companies_phone ON companies(phone);