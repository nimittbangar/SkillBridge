package com.skillbridge.service;

import com.skillbridge.dto.AuthDTOs;
import com.skillbridge.model.User;
import com.skillbridge.repository.UserRepository;
import com.skillbridge.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final AuthenticationManager authenticationManager;
    private final EmailService emailService;

    @Value("${admin.registration.secret:}")
    private String adminRegistrationSecret;

    private static final List<String> ALLOWED_ROLES = List.of("SEEKER", "EMPLOYER", "ADMIN");

    public AuthDTOs.AuthResponse register(AuthDTOs.RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("This email is already registered. Please login instead.");
        }

        String passwordError = com.skillbridge.util.ValidationUtils.validatePassword(request.getPassword());
        if (passwordError != null) {
            throw new RuntimeException(passwordError);
        }
        String phoneError = com.skillbridge.util.ValidationUtils.validatePhone(request.getPhone());
        if (phoneError != null) {
            throw new RuntimeException(phoneError);
        }

        String role = request.getRole() != null ? request.getRole().toUpperCase() : "SEEKER";
        if (!ALLOWED_ROLES.contains(role)) {
            throw new RuntimeException("Invalid role. Allowed: SEEKER, EMPLOYER, ADMIN");
        }

        // ─── Gate ADMIN self-registration behind a server-side secret ───
        // Without this, anyone could POST role=ADMIN and get full admin access.
        if (role.equals("ADMIN")) {
            if (adminRegistrationSecret == null || adminRegistrationSecret.isBlank()) {
                // Fail closed: if no secret is configured on the server, admin
                // self-registration is disabled entirely rather than left open.
                throw new RuntimeException("Admin registration is currently disabled.");
            }
            if (request.getSecretCode() == null || !adminRegistrationSecret.equals(request.getSecretCode())) {
                log.warn("⚠️ Rejected admin registration attempt for email {} — invalid secret code", request.getEmail());
                throw new RuntimeException("Invalid admin registration code.");
            }
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(role);
        user.setPhone(request.getPhone());
        user.setCompanyName(request.getCompanyName());
        user.setSkillsList(request.getSkills() != null ? request.getSkills() : new ArrayList<>());
        user.setVerifiedSkillsList(new ArrayList<>());
        user.setCreatedAt(LocalDateTime.now());
        user.setActive(true);

        User saved = userRepository.save(user);
        String token = jwtUtils.generateToken(saved.getEmail(), saved.getRole());
        return new AuthDTOs.AuthResponse(token, saved.getId(), saved.getName(), saved.getEmail(), saved.getRole());
    }

    public AuthDTOs.AuthResponse login(AuthDTOs.LoginRequest request) {
        // Find user first
        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new RuntimeException("No account found with this email. Please register first."));

        // ─── SMART PASSWORD CHECK ───
        // Handles BOTH cases:
        // Case 1: Password is BCrypt encoded (new accounts registered via app)
        // Case 2: Password is plain text (old accounts created directly in DB)
        boolean passwordMatches = false;

        if (user.getPassword() != null) {
            // Try BCrypt first (normal case)
            if (user.getPassword().startsWith("$2a$") || user.getPassword().startsWith("$2b$")) {
                // BCrypt encoded - use normal check
                passwordMatches = passwordEncoder.matches(request.getPassword(), user.getPassword());
            } else {
                // Plain text password in DB - compare directly
                // Then auto-upgrade to BCrypt for security
                if (user.getPassword().equals(request.getPassword())) {
                    passwordMatches = true;
                    // AUTO-UPGRADE: encode and save the password as BCrypt
                    user.setPassword(passwordEncoder.encode(request.getPassword()));
                    userRepository.save(user);
                    log.info("Auto-upgraded plain text password to BCrypt for user: {}", user.getEmail());
                }
            }
        }

        if (!passwordMatches) {
            throw new RuntimeException("Incorrect password. Please try again.");
        }

        // Check if account is active
        if (!user.isActive()) {
            throw new RuntimeException("Your account has been deactivated. Please contact admin.");
        }

        // ─── Optional 2FA: if enabled, send an OTP instead of issuing a token directly ───
        // Reuses the same otpCode/otpExpiry fields as forgot-password. Note: this means a
        // simultaneous password-reset request and a 2FA login attempt would overwrite each
        // other's OTP — an acceptable edge case at this scale, not worth a second column for.
        if (user.isTwoFactorEnabled()) {
            String otp = String.format("%06d", new java.util.Random().nextInt(999999));
            user.setOtpCode(passwordEncoder.encode(otp));
            user.setOtpExpiry(LocalDateTime.now().plusMinutes(10));
            userRepository.save(user);
            try {
                emailService.sendOtpEmail(user.getEmail(), user.getName(), otp);
            } catch (Exception e) {
                log.error("Failed to send 2FA OTP email: {}", e.getMessage());
            }
            AuthDTOs.AuthResponse pending = new AuthDTOs.AuthResponse(null, user.getId(), user.getName(), user.getEmail(), user.getRole());
            pending.setTwoFactorRequired(true);
            return pending;
        }

        String token = jwtUtils.generateToken(user.getEmail(), user.getRole());
        return new AuthDTOs.AuthResponse(token, user.getId(), user.getName(), user.getEmail(), user.getRole());
    }

    public AuthDTOs.AuthResponse verifyLoginOtp(String email, String otp) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("No account found with this email."));

        if (user.getOtpCode() == null || user.getOtpExpiry() == null) {
            throw new RuntimeException("No OTP was requested. Please log in again.");
        }
        if (LocalDateTime.now().isAfter(user.getOtpExpiry())) {
            throw new RuntimeException("OTP has expired. Please log in again.");
        }
        if (!passwordEncoder.matches(otp, user.getOtpCode())) {
            throw new RuntimeException("Incorrect OTP. Please try again.");
        }

        user.setOtpCode(null);
        user.setOtpExpiry(null);
        userRepository.save(user);

        String token = jwtUtils.generateToken(user.getEmail(), user.getRole());
        return new AuthDTOs.AuthResponse(token, user.getId(), user.getName(), user.getEmail(), user.getRole());
    }
}