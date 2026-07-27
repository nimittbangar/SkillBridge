package com.skillbridge.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String role; // SEEKER, EMPLOYER, ADMIN

    private String phone;
    private String location;

    @Column(columnDefinition = "TEXT")
    private String bio;

    private String resumeUrl;
    private String resumeFileName;

    // Resume stored directly in the database instead of the app server's disk.
    // Render's filesystem is ephemeral (wiped on every redeploy/restart), but the
    // database persists independently, so this survives deploys.
    @Lob
    @Column(columnDefinition = "LONGBLOB")
    private byte[] resumeData;

    private String companyName;
    private String companyWebsite;
    private int experienceYears;
    private String profilePicture;

    // Stored as comma-separated string in DB
    @Column(columnDefinition = "TEXT")
    private String skills;

    @Column(columnDefinition = "TEXT")
    private String verifiedSkills;

    @Column(columnDefinition = "TEXT")
    private String savedJobIds; // comma-separated job IDs

    public List<String> getSavedJobIdsList() {
        if (savedJobIds == null || savedJobIds.trim().isEmpty()) return new ArrayList<>();
        return new ArrayList<>(Arrays.asList(savedJobIds.split(",")));
    }

    public void setSavedJobIdsList(List<String> list) {
        if (list == null || list.isEmpty()) { this.savedJobIds = ""; return; }
        this.savedJobIds = list.stream().filter(s -> s != null && !s.trim().isEmpty())
            .map(String::trim).collect(java.util.stream.Collectors.joining(","));
    }

    private String otpCode;
    private LocalDateTime otpExpiry;
    private boolean twoFactorEnabled = false;

    private LocalDateTime createdAt;
    private boolean active = true;

    // ─── Returns List<String> always — NEVER null, NEVER List<Object> ───
    public List<String> getSkillsList() {
        if (skills == null || skills.trim().isEmpty()) return new ArrayList<>();
        return new ArrayList<>(Arrays.asList(skills.split(",")));
    }

    public void setSkillsList(List<String> list) {
        if (list == null || list.isEmpty()) {
            this.skills = "";
        } else {
            this.skills = list.stream()
                .filter(s -> s != null && !s.trim().isEmpty())
                .map(String::trim)
                .reduce("", (a, b) -> a.isEmpty() ? b : a + "," + b);
        }
    }

    // ─── Returns List<String> always — NEVER null, NEVER List<Object> ───
    public List<String> getVerifiedSkillsList() {
        if (verifiedSkills == null || verifiedSkills.trim().isEmpty()) return new ArrayList<>();
        return new ArrayList<>(Arrays.asList(verifiedSkills.split(",")));
    }

    public void setVerifiedSkillsList(List<String> list) {
        if (list == null || list.isEmpty()) {
            this.verifiedSkills = "";
        } else {
            this.verifiedSkills = list.stream()
                .filter(s -> s != null && !s.trim().isEmpty())
                .map(String::trim)
                .reduce("", (a, b) -> a.isEmpty() ? b : a + "," + b);
        }
    }
}