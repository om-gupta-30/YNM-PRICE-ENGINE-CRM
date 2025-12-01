-- Add Account Names Only (Admin will assign employees, they will fill details)
-- Run this in your Supabase SQL Editor

INSERT INTO accounts (account_name) VALUES
  ('APCO Infratech Pvt Ltd'),
  ('Megha Engineering & Infrastructures Ltd (MEIL)'),
  ('Hindustan Construction Company (HCC)'),
  ('Afcons Infrastructure Ltd'),
  ('GMR Infrastructure Ltd'),
  ('NCC Ltd (Nagarjuna Construction Company)'),
  ('Dilip Buildcon Ltd (DBL)'),
  ('Sadbhav Engineering Ltd'),
  ('Shapoorji Pallonji Engineering & Construction'),
  ('IRCON International Ltd'),
  ('KEC International Ltd'),
  ('Ashoka Buildcon Ltd')
ON CONFLICT DO NOTHING;

-- Verify the accounts were added
SELECT id, account_name, company_stage, company_tag, assigned_employee 
FROM accounts 
WHERE account_name IN (
  'APCO Infratech Pvt Ltd',
  'Megha Engineering & Infrastructures Ltd (MEIL)',
  'Hindustan Construction Company (HCC)',
  'Afcons Infrastructure Ltd',
  'GMR Infrastructure Ltd',
  'NCC Ltd (Nagarjuna Construction Company)',
  'Dilip Buildcon Ltd (DBL)',
  'Sadbhav Engineering Ltd',
  'Shapoorji Pallonji Engineering & Construction',
  'IRCON International Ltd',
  'KEC International Ltd',
  'Ashoka Buildcon Ltd'
)
ORDER BY account_name;

SELECT '✅ Added 12 accounts successfully!' as status;
