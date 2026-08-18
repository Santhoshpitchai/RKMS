-- Supabase PostgreSQL Schema for RKS Mahila Sangha
-- Execute this script in the Supabase SQL Editor

-- 1. Admins Table
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Members Table
CREATE TABLE IF NOT EXISTS members (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    membership_id VARCHAR(30) UNIQUE NOT NULL,
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
    marital_status VARCHAR(20) CHECK (marital_status IN ('Single', 'Married', 'Widowed', 'Divorced')),
    blood_group VARCHAR(10) CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    photo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Events Table
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time TIME,
    location VARCHAR(200),
    image_url TEXT,
    category VARCHAR(20) DEFAULT 'upcoming' CHECK (category IN ('upcoming', 'past')),
    price NUMERIC(10,2) DEFAULT 0,
    is_free BOOLEAN DEFAULT FALSE,
    max_participants INT,
    current_participants INT DEFAULT 0,
    registration_deadline DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Settings Table
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    membership_fee NUMERIC(10,2) DEFAULT 1001,
    donation_suggestions JSONB DEFAULT '[500, 1000, 2500, 5000, 10000]'::jsonb,
    contact_email VARCHAR(100) DEFAULT 'info@rksmahilavedike.org',
    organization_name VARCHAR(200) DEFAULT 'Raju Kshatriya Mahila Sangha',
    default_event_price NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Payments Table (Memberships, Event Fees & Donations with Razorpay fields)
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    member_id INT REFERENCES members(id) ON DELETE SET NULL,
    event_id INT REFERENCES events(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('membership', 'event', 'donation')),
    amount NUMERIC(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    order_id VARCHAR(100),       -- Razorpay Order ID (order_...)
    payment_id VARCHAR(100),     -- Razorpay Payment ID (pay_...)
    signature VARCHAR(255),      -- Razorpay Signature HMAC
    donor_name VARCHAR(100),
    donor_email VARCHAR(100),
    donor_phone VARCHAR(20),
    purpose VARCHAR(100),
    pan_number VARCHAR(10),
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Event Registrations Table
CREATE TABLE IF NOT EXISTS event_registrations (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    member_id INT REFERENCES members(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    number_of_attendees INT DEFAULT 1,
    guest_names TEXT,
    membership_id VARCHAR(30),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
    payment_amount NUMERIC(10,2) DEFAULT 0,
    payment_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS number_of_attendees INT DEFAULT 1;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS guest_names TEXT;

-- 7. Registered Website Visitors Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    otp_code VARCHAR(10),
    otp_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Migrations for existing tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ;

ALTER TABLE admins ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS otp_code VARCHAR(10);
ALTER TABLE admins ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ;

-- Insert Default Admin User
INSERT INTO admins (username, password) 
VALUES ('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi')
ON CONFLICT (username) DO NOTHING;

-- 8. Webhook Events Table (For Razorpay Event Deduplication & Transactional Idempotency)
CREATE TABLE IF NOT EXISTS webhook_events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(100) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing', 'processed', 'failed')),
    processed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    payload JSONB,
    error_log TEXT
);

-- Insert Default Settings Record
INSERT INTO settings (id, membership_fee, donation_suggestions, contact_email, organization_name) 
VALUES (1, 1001, '[500, 1000, 2500, 5000, 10000]'::jsonb, 'info@rksmahilavedike.org', 'Raju Kshatriya Mahila Sangha')
ON CONFLICT (id) DO NOTHING;
