package com.skillbridge.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "messages")
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    // Exactly one of these two modes is used per message:
    // 1. Application-scoped chat (applicationId set) — after the seeker has applied.
    // 2. Pre-application inquiry (jobId + seekerId set, applicationId null) — a seeker
    //    asking an employer a question about a job before applying.
    private String applicationId;
    private String jobId;
    private String seekerId;

    @Column(nullable = false)
    private String senderId;

    private String senderName;
    private String senderRole; // SEEKER or EMPLOYER

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    private boolean readByRecipient = false;

    private LocalDateTime createdAt;
}