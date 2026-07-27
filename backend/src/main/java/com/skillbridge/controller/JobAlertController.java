package com.skillbridge.controller;

import com.skillbridge.model.JobAlert;
import com.skillbridge.model.User;
import com.skillbridge.repository.JobAlertRepository;
import com.skillbridge.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/job-alerts")
@RequiredArgsConstructor
public class JobAlertController {

    private static final int MAX_ALERTS_PER_USER = 10;

    private final JobAlertRepository jobAlertRepository;
    private final UserRepository userRepository;

    @PostMapping
    @PreAuthorize("hasRole('SEEKER')")
    public ResponseEntity<?> createAlert(@RequestBody JobAlert alert, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (jobAlertRepository.countByUserId(user.getId()) >= MAX_ALERTS_PER_USER) {
            return ResponseEntity.badRequest().body("You can have at most " + MAX_ALERTS_PER_USER + " job alerts. Delete one first.");
        }
        if ((alert.getKeyword() == null || alert.getKeyword().isBlank())
            && alert.getRemote() == null && alert.getExperienceLevel() == null) {
            return ResponseEntity.badRequest().body("Set at least one filter for this alert.");
        }

        alert.setUserId(user.getId());
        alert.setCreatedAt(LocalDateTime.now());
        alert.setLastNotifiedAt(LocalDateTime.now()); // don't email about jobs posted before the alert existed
        return ResponseEntity.ok(jobAlertRepository.save(alert));
    }

    @GetMapping
    @PreAuthorize("hasRole('SEEKER')")
    public ResponseEntity<List<JobAlert>> myAlerts(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(jobAlertRepository.findByUserId(user.getId()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SEEKER')")
    public ResponseEntity<?> deleteAlert(@PathVariable String id, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
        JobAlert alert = jobAlertRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Alert not found"));
        if (!alert.getUserId().equals(user.getId())) {
            return ResponseEntity.status(403).body("You are not authorized to delete this alert.");
        }
        jobAlertRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Alert deleted."));
    }
}