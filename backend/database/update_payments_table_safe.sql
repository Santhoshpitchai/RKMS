-- Safe update script for payments table - checks if columns exist before adding
-- Run this script to update existing database safely

USE rks_mahila_sangha;

-- Add purpose column if it doesn't exist
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'rks_mahila_sangha' 
     AND TABLE_NAME = 'payments' 
     AND COLUMN_NAME = 'purpose') > 0,
    'SELECT "purpose column already exists" as message;',
    'ALTER TABLE payments ADD COLUMN purpose VARCHAR(50) AFTER donor_phone;'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add pan_number column if it doesn't exist
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'rks_mahila_sangha' 
     AND TABLE_NAME = 'payments' 
     AND COLUMN_NAME = 'pan_number') > 0,
    'SELECT "pan_number column already exists" as message;',
    'ALTER TABLE payments ADD COLUMN pan_number VARCHAR(10) AFTER purpose;'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add address column if it doesn't exist
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'rks_mahila_sangha' 
     AND TABLE_NAME = 'payments' 
     AND COLUMN_NAME = 'address') > 0,
    'SELECT "address column already exists" as message;',
    'ALTER TABLE payments ADD COLUMN address TEXT AFTER pan_number;'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Show final table structure
DESCRIBE payments;
