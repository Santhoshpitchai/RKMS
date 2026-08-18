-- Check current payments table structure
USE rks_mahila_sangha;

-- Show all columns in payments table
DESCRIBE payments;

-- Show sample data to verify new fields are working
SELECT id, donor_name, donor_email, donor_phone, purpose, pan_number, address, amount, type, created_at 
FROM payments 
WHERE type = 'donation' 
ORDER BY created_at DESC 
LIMIT 5;
