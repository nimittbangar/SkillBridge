package com.skillbridge.controller;

import com.skillbridge.model.Message;
import com.skillbridge.model.User;
import com.skillbridge.repository.UserRepository;
import com.skillbridge.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;
    private final UserRepository userRepository;

    @GetMapping("/{applicationId}")
    public ResponseEntity<?> getThread(@PathVariable String applicationId, Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
            List<Message> thread = messageService.getThread(applicationId, user);
            return ResponseEntity.ok(thread);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{applicationId}")
    public ResponseEntity<?> sendMessage(@PathVariable String applicationId,
                                          @RequestBody Map<String, String> body,
                                          Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
            Message saved = messageService.sendMessage(applicationId, body.get("content"), user);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ─── Pre-application inquiries (message a company before applying) ───

    @GetMapping("/job/{jobId}")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('SEEKER')")
    public ResponseEntity<?> getMyJobThread(@PathVariable String jobId, Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
            return ResponseEntity.ok(messageService.getJobThread(jobId, user.getId(), user));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/job/{jobId}")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('SEEKER')")
    public ResponseEntity<?> sendMyJobMessage(@PathVariable String jobId,
                                               @RequestBody Map<String, String> body,
                                               Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
            return ResponseEntity.ok(messageService.sendJobMessage(jobId, user.getId(), body.get("content"), user));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/job/{jobId}/inquiries")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('EMPLOYER') or hasRole('ADMIN')")
    public ResponseEntity<?> listInquiries(@PathVariable String jobId, Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
            List<String> seekerIds = messageService.getInquirySeekerIds(jobId, user);
            List<Map<String, String>> result = new java.util.ArrayList<>();
            for (String seekerId : seekerIds) {
                User seeker = userRepository.findById(seekerId).orElse(null);
                if (seeker != null) {
                    result.add(Map.of("seekerId", seekerId, "seekerName", seeker.getName(), "seekerEmail", seeker.getEmail()));
                }
            }
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/job/{jobId}/seeker/{seekerId}")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('EMPLOYER') or hasRole('ADMIN')")
    public ResponseEntity<?> getInquiryThread(@PathVariable String jobId, @PathVariable String seekerId, Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
            return ResponseEntity.ok(messageService.getJobThread(jobId, seekerId, user));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/job/{jobId}/seeker/{seekerId}")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('EMPLOYER') or hasRole('ADMIN')")
    public ResponseEntity<?> replyToInquiry(@PathVariable String jobId, @PathVariable String seekerId,
                                             @RequestBody Map<String, String> body, Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
            return ResponseEntity.ok(messageService.sendJobMessage(jobId, seekerId, body.get("content"), user));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}