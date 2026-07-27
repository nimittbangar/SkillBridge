package com.skillbridge.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "interviews")
public class Interview {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String applicationId;
    private String jobId;
    private String seekerId;
    private String employerId;
    private String seekerName;
    private String jobTitle;

    // ─── KEY FIX: tell Jackson how to parse the datetime string from frontend ───
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm")
    private LocalDateTime scheduledDateTime;

    private String mode = "VIDEO";    // VIDEO, PHONE, IN_PERSON
    private String meetingLink;
    private String venue;
    private String status = "SCHEDULED";  // SCHEDULED, COMPLETED, CANCELLED, RESCHEDULED
    private String feedback;
    private String result = "PENDING";    // PASS, FAIL, PENDING
    private LocalDateTime createdAt;
}
