package com.skillbridge.repository;

import com.skillbridge.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, String> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(String userId);
    long countByUserIdAndReadFalse(String userId);
    List<Notification> findByUserIdAndReadFalseOrderByCreatedAtDesc(String userId);
}
