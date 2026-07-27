package com.skillbridge.controller;

import com.skillbridge.model.Interview;
import com.skillbridge.model.User;
import com.skillbridge.repository.UserRepository;
import com.skillbridge.service.InterviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/interviews")
@RequiredArgsConstructor
public class InterviewController {

    private final InterviewService interviewService;
    private final UserRepository userRepository;

    @PostMapping("/schedule")
    @PreAuthorize("hasRole('EMPLOYER') or hasRole('ADMIN')")
    public ResponseEntity<?> schedule(@RequestBody Interview interview, Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
            interview.setEmployerId(user.getId());
            boolean isAdmin = "ADMIN".equals(user.getRole());
            return ResponseEntity.ok(interviewService.scheduleInterview(interview, user.getId(), isAdmin));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/my-interviews")
    @PreAuthorize("hasRole('SEEKER')")
    public ResponseEntity<List<Interview>> mySeekerInterviews(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(interviewService.getSeekerInterviews(user.getId()));
    }

    @GetMapping("/employer-interviews")
    @PreAuthorize("hasRole('EMPLOYER')")
    public ResponseEntity<List<Interview>> myEmployerInterviews(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(interviewService.getEmployerInterviews(user.getId()));
    }

    // Seeker marks interview as attended (joins meeting)
    @PutMapping("/{id}/join")
    @PreAuthorize("hasRole('SEEKER')")
    public ResponseEntity<?> joinInterview(@PathVariable String id, Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
            return ResponseEntity.ok(interviewService.markCompleted(id, user.getId()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('EMPLOYER') or hasRole('ADMIN')")
    public ResponseEntity<?> updateInterview(@PathVariable String id,
                                             @RequestBody Map<String, String> body,
                                             Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
            boolean isAdmin = "ADMIN".equals(user.getRole());
            return ResponseEntity.ok(interviewService.updateInterview(
                id, body.get("status"), body.get("feedback"), body.get("result"),
                user.getId(), isAdmin));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Interview>> allInterviews() {
        return ResponseEntity.ok(interviewService.getAllInterviews());
    }
}