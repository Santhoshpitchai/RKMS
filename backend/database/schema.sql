-- RKS Mahila Sangha MySQL Database Schema
-- Phase 1: Local Demo Setup

-- Create Database
CREATE DATABASE IF NOT EXISTS rks_mahila_sangha;
USE rks_mahila_sangha;

-- Admin Table
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Members Table  
CREATE TABLE IF NOT EXISTS members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    membership_id VARCHAR(20) UNIQUE NOT NULL,
    date_of_birth DATE,
    address TEXT,
    city VARCHAR(50),
    state VARCHAR(50),
    pincode VARCHAR(10),
    aadhar_number VARCHAR(12),
    guardian_name VARCHAR(100),
    gotra_name VARCHAR(50),
    educational_qualification VARCHAR(50),
    profession VARCHAR(100),
    marital_status ENUM('Single', 'Married', 'Widowed', 'Divorced'),
    blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
    photo_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Events Table
CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time TIME,
    location VARCHAR(200),
    image_url VARCHAR(500),
    category ENUM('upcoming', 'past') DEFAULT 'upcoming',
    price DECIMAL(10,2) DEFAULT 0,
    is_free BOOLEAN DEFAULT FALSE,
    max_participants INT,
    current_participants INT DEFAULT 0,
    registration_deadline DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    membership_fee DECIMAL(10,2) DEFAULT 1001,
    donation_suggestions JSON,
    contact_email VARCHAR(100) DEFAULT 'info@rksmahilavedike.org',
    organization_name VARCHAR(200) DEFAULT 'Raju Kshatriya Mahila Sangha',
    default_event_price DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT,
    event_id INT,
    type ENUM('membership', 'event', 'donation') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    payment_id VARCHAR(100),
    order_id VARCHAR(100),
    donor_name VARCHAR(100),
    donor_email VARCHAR(100),
    donor_phone VARCHAR(20),
    purpose VARCHAR(50),
    pan_number VARCHAR(10),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
);

-- Event Registrations Table
CREATE TABLE IF NOT EXISTS event_registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    member_id INT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    membership_id VARCHAR(30),
    payment_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    payment_amount DECIMAL(10,2) DEFAULT 0,
    payment_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL
);

-- Insert Default Admin
INSERT IGNORE INTO admins (username, password) VALUES ('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'); -- admin123

-- Insert Default Settings
INSERT IGNORE INTO settings (id, membership_fee, donation_suggestions, contact_email, organization_name) 
VALUES (1, 1001, '[500, 1000, 2500, 5000, 10000]', 'info@rksmahilavedike.org', 'Raju Kshatriya Mahila Sangha');
