# SkillBridge — Login Fix Guide

## Why Can't Existing Users Login?

If users were created directly in the database (via MySQL Workbench or SQL INSERT),
their passwords are stored as **plain text** (e.g., "password123").

But the app uses **BCrypt encryption**. BCrypt cannot match plain text passwords.

## Solution 1 — Automatic Fix (Recommended)

The app now **auto-detects** plain text passwords and fixes them on first login!

Steps:
1. Start the backend: `mvn spring-boot:run`
2. Try logging in with your email and plain text password
3. If it works → password is auto-upgraded to BCrypt
4. If it fails → use Solution 2

## Solution 2 — Manual Reset via MySQL

Open MySQL Workbench and run:

```sql
USE skillbridge;

-- See all users and their password format
SELECT id, name, email, role, LEFT(password, 10) as pwd_start FROM users;

-- Reset specific user password to 'password123'
UPDATE users 
SET password = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
WHERE email = 'user@example.com';

-- Reset ALL users to password 'password123' (for testing only!)
UPDATE users 
SET password = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
```

Common BCrypt hashes:
| Plain Password | BCrypt Hash |
|---------------|-------------|
| password123   | $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi |
| admin123      | $2a$10$8K1p/a0dhrxSA8ozYGiX8.6nIj3OTDUHDMhJD2q6e/9YPBlh9V3rS |
| cdac2024      | $2a$10$7EqJtq98hPqEX7fNZaFWoOa3z.YR9H2kLDXdKJjpP8bJLBkbPLnZa |
| test123       | $2a$10$N.ZOn9G6/ZWCpyRiHcVxOOsca.0Z6mZpEeT2S6aTLOh0Z8LS15DKi |

## Solution 3 — Forgot Password (Easiest for Users)

1. Go to Login page
2. Click **"Forgot Password?"** red link
3. Enter your email → OTP sent to Gmail
4. Enter OTP + new password → done!

## Solution 4 — Add Missing DB Columns

If you get errors about missing columns, run in MySQL Workbench:

```sql
USE skillbridge;
ALTER TABLE users ADD COLUMN IF NOT EXISTS saved_job_ids TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expiry DATETIME;
ALTER TABLE users ADD COLUMN IF NOT EXISTS active TINYINT(1) DEFAULT 1;

-- Update all existing users to active=1
UPDATE users SET active = 1 WHERE active IS NULL;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255),
    title VARCHAR(500),
    message TEXT,
    type VARCHAR(50),
    link VARCHAR(500),
    is_read TINYINT(1) DEFAULT 0,
    created_at DATETIME
);
```

## Quick Test

After fix, test login with:
- Email: your registered email
- Password: password123 (if you reset using Solution 2)

## Make User Admin

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'your@email.com';
```
