package com.skillbridge.controller;

import com.skillbridge.model.Notification;
import com.skillbridge.model.User;
import com.skillbridge.repository.UserRepository;
import com.skillbridge.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<Notification>> getMyNotifications(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(notificationService.getByUser(user.getId()));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(Map.of("count", notificationService.getUnreadCount(user.getId())));
    }

    @PutMapping("/mark-all-read")
    public ResponseEntity<?> markAllRead(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
        notificationService.markAllRead(user.getId());
        return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markRead(@PathVariable String id, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
        notificationService.markRead(id, user.getId());
        return ResponseEntity.ok(Map.of("message", "Notification marked as read"));
    }

    @DeleteMapping("/clear")
    public ResponseEntity<?> clearAll(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
        notificationService.deleteAll(user.getId());
        return ResponseEntity.ok(Map.of("message", "All notifications cleared"));
    }
}