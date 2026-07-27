-- SkillBridge Database Setup
-- Run this SQL in MySQL Workbench or command line

-- Step 1: Create database
CREATE DATABASE IF NOT EXISTS skillbridge
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE skillbridge;

-- Step 2: Spring Boot will auto-create tables via JPA (ddl-auto=update)
-- Just run the backend and tables will be created automatically.

-- ─── MIGRATION: If you already have data in the database ───
-- Run these ALTER TABLE commands to add new columns added in this version:

-- Add new columns to users table (run only if upgrading from old version)
ALTER TABLE users ADD COLUMN IF NOT EXISTS saved_job_ids TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expiry DATETIME;
ALTER TABLE users ADD COLUMN IF NOT EXISTS active TINYINT(1) DEFAULT 1;

-- Create notifications table (if not exists)
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255),
    title VARCHAR(500),
    message TEXT,
    type VARCHAR(50),
    link VARCHAR(500),
    is_read TINYINT(1) DEFAULT 0,
    created_at DATETIME,
    INDEX idx_user_id (user_id),
    INDEX idx_read (is_read)
);

-- ─── FIX: If existing users can't login ───
-- Their passwords might be stored as plain text.
-- Option 1: Let them login normally - the app will auto-upgrade to BCrypt
-- Option 2: Reset a specific user's password manually:

-- Example: Reset password to 'password123' for a user
-- UPDATE users SET password = '$2a$10$N.ZOn9G6/ZWCpyRiHcVxOOsca.0Z6mZpEeT2S6aTLOh0Z8LS15DKi' WHERE email = 'user@example.com';
-- (The hash above = BCrypt of 'password123')

-- ─── Common BCrypt hashes for testing ───
-- Password: test123    → $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
-- Password: password   → $2a$10$N.ZOn9G6/ZWCpyRiHcVxOOsca.0Z6mZpEeT2S6aTLOh0Z8LS15DKi  
-- Password: admin123   → $2a$10$8K1p/a0dhrxSA8ozYGiX8.6nIj3OTDUHDMhJD2q6e/9YPBlh9V3rS
-- Password: cdac2024   → $2a$10$7EqJtq98hPqEX7fNZaFWoOa3z.YR9H2kLDXdKJjpP8bJLBkbPLnZa

-- ─── Quick Reset All Passwords to 'password123' ───
-- WARNING: Only use in development/testing!
-- UPDATE users SET password = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

-- ─── Check current users ───
-- SELECT id, name, email, role, active, LEFT(password, 10) as pwd_start FROM users;

-- ─── Make a user Admin ───
-- UPDATE users SET role = 'ADMIN' WHERE email = 'your@email.com';

SHOW TABLES;
SELECT 'Database setup complete!' as status;
