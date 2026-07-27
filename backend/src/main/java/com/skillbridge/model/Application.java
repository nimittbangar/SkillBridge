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
@Table(name = "applications")
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String jobId;
    private String seekerId;
    private String seekerName;
    private String seekerEmail;
    private String jobTitle;
    private String companyName;
    private String status = "APPLIED"; // APPLIED, SHORTLISTED, INTERVIEW_SCHEDULED, OFFERED, REJECTED, ACCEPTED
    private int skillMatchScore;

    @Column(columnDefinition = "TEXT")
    private String coverLetter;

    private String resumeUrl;

    @Column(columnDefinition = "TEXT")
    private String employerNote;

    private LocalDateTime appliedAt;
    private LocalDateTime updatedAt;
}
