-- Update existing members table with new columns
-- Run this script to update existing database

USE rks_mahila_sangha;

-- Add new columns to members table
ALTER TABLE members 
ADD COLUMN guardian_name VARCHAR(100) AFTER aadhar_number,
ADD COLUMN gotra_name VARCHAR(50) AFTER guardian_name,
ADD COLUMN educational_qualification VARCHAR(50) AFTER gotra_name,
ADD COLUMN profession VARCHAR(100) AFTER educational_qualification,
ADD COLUMN marital_status ENUM('Single', 'Married', 'Widowed', 'Divorced') AFTER profession,
ADD COLUMN blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') AFTER marital_status,
ADD COLUMN photo_url VARCHAR(500) AFTER blood_group;
