package com.skillbridge.controller;

import com.skillbridge.dto.PasswordDTO;
import com.skillbridge.model.Job;
import com.skillbridge.model.User;
import com.skillbridge.repository.ApplicationRepository;
import com.skillbridge.repository.InterviewRepository;
import com.skillbridge.repository.JobRepository;
import com.skillbridge.repository.UserRepository;
import com.skillbridge.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final JobRepository jobRepository;
    private final ApplicationRepository applicationRepository;
    private final InterviewRepository interviewRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @GetMapping("/profile")
    public ResponseEntity<User> getMyProfile(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
        user.setPassword(null);
        return ResponseEntity.ok(user);
    }

    @PutMapping("/2fa")
    public ResponseEntity<?> toggleTwoFactor(@RequestBody Map<String, Boolean> body, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
        boolean enabled = Boolean.TRUE.equals(body.get("enabled"));
        user.setTwoFactorEnabled(enabled);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of(
            "message", enabled ? "Two-factor authentication enabled." : "Two-factor authentication disabled.",
            "twoFactorEnabled", enabled
        ));
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody User updatedUser, Authentication auth) {
        if (updatedUser.getName() == null || updatedUser.getName().isBlank()) {
            return ResponseEntity.badRequest().body("Name cannot be empty.");
        }
        if (updatedUser.getExperienceYears() < 0) {
            return ResponseEntity.badRequest().body("Experience years cannot be negative.");
        }
        String phoneError = com.skillbridge.util.ValidationUtils.validatePhone(updatedUser.getPhone());
        if (phoneError != null) {
            return ResponseEntity.badRequest().body(phoneError);
        }
        User user = userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
        user.setName(updatedUser.getName());
        user.setPhone(updatedUser.getPhone());
        user.setLocation(updatedUser.getLocation());
        user.setBio(updatedUser.getBio());
        // Note: resumeUrl is intentionally NOT updated here — it's only managed by the
        // dedicated upload-resume/delete-resume endpoints, which also own resumeData.
        // Letting a generic profile save overwrite it could silently desync the link
        // from the actual stored file.
        user.setCompanyName(updatedUser.getCompanyName());
        user.setCompanyWebsite(updatedUser.getCompanyWebsite());
        user.setExperienceYears(updatedUser.getExperienceYears());
        User saved = userRepository.save(user);
        saved.setPassword(null);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody PasswordDTO.ChangePasswordRequest req, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
        if (!passwordEncoder.matches(req.getCurrentPassword(), user.getPassword()))
            return ResponseEntity.badRequest().body("Current password is incorrect");
        String passwordError = com.skillbridge.util.ValidationUtils.validatePassword(req.getNewPassword());
        if (passwordError != null)
            return ResponseEntity.badRequest().body(passwordError);
        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        userRepository.save(user);
        try {
            emailService.sendPasswordChangedEmail(user.getEmail(), user.getName());
        } catch (Exception e) { log.error("Password-changed email failed: {}", e.getMessage()); }
        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }

    // ─── Forgot Password: Step 1 - Send OTP ───
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        Optional<User> optUser = userRepository.findByEmail(email);
        if (optUser.isEmpty())
            return ResponseEntity.badRequest().body("No account found with this email address");
        User user = optUser.get();
        String otp = String.format("%06d", new Random().nextInt(999999));
        user.setOtpCode(passwordEncoder.encode(otp));
        user.setOtpExpiry(LocalDateTime.now().plusMinutes(10));
        userRepository.save(user);
        try {
            emailService.sendPasswordResetOtpEmail(email, user.getName(), otp);
        } catch (Exception e) {
            log.error("Email failed: {}", e.getMessage());
        }
        return ResponseEntity.ok(Map.of(
            "message", "OTP generated successfully. Please check your email. Valid for 10 minutes."
        ));
    }

    // ─── Forgot Password: Step 2 - Verify OTP & Reset ───
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String otp = body.get("otp");
        String newPassword = body.get("newPassword");
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));
        if (user.getOtpCode() == null || user.getOtpExpiry() == null)
            return ResponseEntity.badRequest().body("No OTP requested. Please use Forgot Password first.");
        if (LocalDateTime.now().isAfter(user.getOtpExpiry()))
            return ResponseEntity.badRequest().body("OTP has expired. Please request a new one.");
        if (!passwordEncoder.matches(otp, user.getOtpCode()))
            return ResponseEntity.badRequest().body("Invalid OTP. Please check your email.");
        String passwordError = com.skillbridge.util.ValidationUtils.validatePassword(newPassword);
        if (passwordError != null)
            return ResponseEntity.badRequest().body(passwordError);
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setOtpCode(null);
        user.setOtpExpiry(null);
        userRepository.save(user);
        try {
            emailService.sendPasswordChangedEmail(user.getEmail(), user.getName());
        } catch (Exception e) { log.error("Password-changed email failed: {}", e.getMessage()); }
        return ResponseEntity.ok(Map.of("message", "Password reset successfully! You can now login."));
    }

    // ─── Save / Unsave Job ───
    @PutMapping("/saved-jobs/{jobId}")
    @PreAuthorize("hasRole('SEEKER')")
    public ResponseEntity<?> toggleSavedJob(@PathVariable String jobId, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
        List<String> saved = new ArrayList<>(user.getSavedJobIdsList());
        boolean wasSaved = saved.contains(jobId);
        if (wasSaved) saved.remove(jobId); else saved.add(jobId);
        user.setSavedJobIdsList(saved);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("saved", !wasSaved,
            "message", wasSaved ? "Job removed from saved" : "Job saved!"));
    }

    // ─── Get Saved Jobs ───
    @GetMapping("/saved-jobs")
    @PreAuthorize("hasRole('SEEKER')")
    public ResponseEntity<List<Job>> getSavedJobs(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
        List<String> ids = user.getSavedJobIdsList();
        if (ids.isEmpty()) return ResponseEntity.ok(List.of());
        List<Job> jobs = ids.stream()
            .map(id -> jobRepository.findById(id).orElse(null))
            .filter(Objects::nonNull)
            .collect(Collectors.toList());
        return ResponseEntity.ok(jobs);
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllUsers(@RequestParam(required = false) Integer page,
                                          @RequestParam(required = false) Integer size) {
        if (page == null) {
            List<User> users = userRepository.findAll();
            users.forEach(u -> u.setPassword(null));
            return ResponseEntity.ok(users);
        }
        int pageSize = (size == null || size <= 0) ? 15 : size;
        org.springframework.data.domain.Page<User> result = userRepository.findAll(
            org.springframework.data.domain.PageRequest.of(page, pageSize,
                org.springframework.data.domain.Sort.by("id").descending())
        );
        result.getContent().forEach(u -> u.setPassword(null));
        return ResponseEntity.ok(Map.of(
            "content", result.getContent(),
            "totalElements", result.getTotalElements(),
            "totalPages", result.getTotalPages(),
            "currentPage", page
        ));
    }

    @PutMapping("/{id}/toggle-active")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> toggleActive(@PathVariable String id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
        if ("ADMIN".equals(user.getRole())) {
            return ResponseEntity.badRequest().body("Cannot deactivate another Admin account.");
        }
        user.setActive(!user.isActive());
        userRepository.save(user);
        return ResponseEntity.ok(Map.of(
            "message", user.isActive() ? "Account reactivated." : "Account deactivated.",
            "active", user.isActive()
        ));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteUser(@PathVariable String id) {
        if (!userRepository.existsById(id)) return ResponseEntity.notFound().build();
        jobRepository.findByEmployerId(id).forEach(job -> {
            applicationRepository.findByJobId(job.getId()).forEach(app -> {
                interviewRepository.findByApplicationId(app.getId())
                    .forEach(iv -> interviewRepository.deleteById(iv.getId()));
                applicationRepository.deleteById(app.getId());
            });
            jobRepository.deleteById(job.getId());
        });
        applicationRepository.findBySeekerId(id).forEach(app -> {
            interviewRepository.findByApplicationId(app.getId())
                .forEach(iv -> interviewRepository.deleteById(iv.getId()));
            applicationRepository.deleteById(app.getId());
        });
        userRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
    }
}