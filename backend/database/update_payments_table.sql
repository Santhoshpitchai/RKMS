-- Update existing payments table with new columns
-- Run this script to update existing database

USE rks_mahila_sangha;

-- Add new columns to payments table
ALTER TABLE payments 
ADD COLUMN purpose VARCHAR(50) AFTER donor_phone,
ADD COLUMN pan_number VARCHAR(10) AFTER purpose,
ADD COLUMN address TEXT AFTER pan_number;
