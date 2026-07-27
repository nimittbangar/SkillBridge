package com.skillbridge.util;

import java.util.regex.Pattern;

/**
 * Shared validation rules used by registration, change-password, and reset-password,
 * so the rules are defined once on the server and can't drift out of sync between
 * endpoints — and can't be bypassed just because a request skips the frontend
 * (e.g. someone calling the API directly with Postman/curl).
 */
public class ValidationUtils {

    private static final Pattern PHONE_PATTERN = Pattern.compile("^\\+\\d{1,4}\\s\\d{7,12}$");

    /** Mirrors the frontend's validatePassword() in utils/validation.js. */
    public static String validatePassword(String password) {
        if (password == null || password.length() < 8) {
            return "Password must be at least 8 characters.";
        }
        if (!password.matches(".*[A-Z].*")) {
            return "Password needs at least one uppercase letter.";
        }
        if (!password.matches(".*[a-z].*")) {
            return "Password needs at least one lowercase letter.";
        }
        if (!password.matches(".*[0-9].*")) {
            return "Password needs at least one number.";
        }
        return null; // valid
    }

    /**
     * Phone is optional everywhere it's used — only validated if non-blank.
     * Expected shape: "+91 9876543210" (country code, space, 7-12 digits),
     * matching exactly what the frontend's PhoneInput component sends.
     */
    public static String validatePhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return null; // optional field, nothing to validate
        }
        if (!PHONE_PATTERN.matcher(phone.trim()).matches()) {
            return "Phone number format looks invalid. Expected format: +91 9876543210";
        }
        return null; // valid
    }
}