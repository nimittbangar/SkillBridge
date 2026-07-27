package com.skillbridge.service;

import com.skillbridge.model.Application;
import com.skillbridge.model.Job;
import com.skillbridge.model.User;
import com.skillbridge.repository.ApplicationRepository;
import com.skillbridge.repository.JobRepository;
import com.skillbridge.service.NotificationService;
import com.skillbridge.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final JobRepository jobRepository;
    private final JobService jobService;
    private final EmailService emailService;
    private final PdfService pdfService;
    private final NotificationService notificationService;

    public Application applyToJob(String seekerId, String jobId, String coverLetter) {
        if (applicationRepository.findBySeekerIdAndJobId(seekerId, jobId).isPresent())
            throw new RuntimeException("Already applied to this job");

        User seeker = userRepository.findById(seekerId)
            .orElseThrow(() -> new RuntimeException("Seeker not found"));
        Job job = jobService.getJobById(jobId);

        // A job must be admin-verified before anyone can apply to it.
        if (!job.isVerified()) {
            throw new RuntimeException("This job is pending admin approval and is not open for applications yet.");
        }

        // Only jobs that are actively OPEN accept applications — a paused or closed
        // (or deadline-expired, auto-closed) posting should reject new applicants.
        if (!"OPEN".equals(job.getStatus())) {
            throw new RuntimeException("This job is no longer accepting applications.");
        }

        Application app = new Application();
        app.setSeekerId(seekerId);
        app.setJobId(jobId);
        app.setSeekerName(seeker.getName());
        app.setSeekerEmail(seeker.getEmail());
        app.setJobTitle(job.getTitle());
        app.setCompanyName(job.getCompanyName());
        app.setStatus("APPLIED");
        app.setCoverLetter(coverLetter);
        app.setResumeUrl(seeker.getResumeUrl());
        app.setSkillMatchScore(jobService.calculateSkillMatchScore(seekerId, jobId));
        app.setAppliedAt(LocalDateTime.now());
        app.setUpdatedAt(LocalDateTime.now());

        jobService.incrementApplicationCount(jobId);
        Application saved = applicationRepository.save(app);

        // Notify seeker: application confirmation
        notificationService.create(seeker.getId(),
            "📨 Application Submitted!",
            "Your application for " + job.getTitle() + " at " + job.getCompanyName() + " has been submitted successfully!",
            "APPLICATION", "/seeker/applications");

        // Notify employer: new application received
        if (job.getEmployerId() != null && !job.getEmployerId().isEmpty()) {
            notificationService.create(job.getEmployerId(),
                "👤 New Application from " + seeker.getName(),
                seeker.getName() + " has applied for " + job.getTitle() +
                ". Skill match: " + saved.getSkillMatchScore() + "%. Review their profile now!",
                "APPLICATION", "/employer/applications/" + jobId);
            log.info("✅ Employer notification sent to employerId: {}", job.getEmployerId());
        } else {
            log.warn("⚠️ Cannot notify employer — job {} has no employerId!", jobId);
        }

        // Auto email: Application confirmation to seeker
        emailService.sendApplicationConfirmationEmail(
            seeker.getEmail(), seeker.getName(),
            job.getTitle(), job.getCompanyName(),
            saved.getSkillMatchScore()
        );
        return saved;
    }

    public void withdrawApplication(String appId, String seekerId) {
        Application app = applicationRepository.findById(appId)
            .orElseThrow(() -> new RuntimeException("Application not found"));
        if (!app.getSeekerId().equals(seekerId))
            throw new RuntimeException("Not authorized to withdraw this application");
        if (List.of("OFFERED", "ACCEPTED", "INTERVIEW_SCHEDULED").contains(app.getStatus()))
            throw new RuntimeException("Cannot withdraw — application is at " + app.getStatus() + " stage");

        // Notify employer that seeker withdrew
        try {
            Job job = jobRepository.findById(app.getJobId()).orElse(null);
            User seeker = userRepository.findById(seekerId).orElse(null);
            if (job != null && seeker != null && job.getEmployerId() != null) {
                notificationService.create(job.getEmployerId(),
                    "↩️ " + seeker.getName() + " Withdrew Application",
                    seeker.getName() + " has withdrawn their application for " + app.getJobTitle() + ". You may want to review other candidates.",
                    "APPLICATION", "/employer/applications/" + app.getJobId());
            }
            // Confirm withdrawal to the seeker by email
            if (seeker != null) {
                emailService.sendWithdrawalEmail(seeker.getEmail(), seeker.getName(),
                    app.getJobTitle(), app.getCompanyName());
            }
        } catch (Exception e) {
            log.warn("Could not notify employer of withdrawal: {}", e.getMessage());
        }

        applicationRepository.deleteById(appId);
    }

    public List<Application> getSeekerApplications(String seekerId) {
        return applicationRepository.findBySeekerId(seekerId);
    }

    public List<Application> getJobApplications(String jobId) {
        return applicationRepository.findByJobId(jobId);
    }

    // Internal/system-initiated status change (e.g. interview scheduled/completed) —
    // not triggered by a user request, so it bypasses the per-user ownership check.
    public Application updateStatus(String appId, String status, String employerNote) {
        return updateStatus(appId, status, employerNote, null, "ADMIN");
    }

    public Application updateStatus(String appId, String status, String employerNote,
                                     String requestingUserId, String requestingRole) {
        Application app = applicationRepository.findById(appId)
            .orElseThrow(() -> new RuntimeException("Application not found"));

        // ─── Authorization: verify the caller is allowed to touch THIS application ───
        boolean isAdmin = "ADMIN".equals(requestingRole);
        if (!isAdmin) {
            if ("SEEKER".equals(requestingRole)) {
                // A seeker may only act on their own application (accept/decline their own offer).
                if (!requestingUserId.equals(app.getSeekerId())) {
                    throw new RuntimeException("You are not authorized to modify this application.");
                }
            } else if ("EMPLOYER".equals(requestingRole)) {
                // An employer may only act on applications to jobs they own.
                Job job = jobRepository.findById(app.getJobId()).orElse(null);
                if (job == null || job.getEmployerId() == null
                        || !job.getEmployerId().equals(requestingUserId)) {
                    throw new RuntimeException("You are not authorized to modify this application.");
                }
            } else {
                throw new RuntimeException("You are not authorized to modify this application.");
            }
        }

        String previousStatus = app.getStatus();
        app.setStatus(status);
        if (employerNote != null && !employerNote.isEmpty()) app.setEmployerNote(employerNote);
        app.setUpdatedAt(LocalDateTime.now());
        Application saved = applicationRepository.save(app);

        // Send emails only when status actually changes
        if (!status.equals(previousStatus)) {
            User seeker = userRepository.findById(app.getSeekerId()).orElse(null);
            if (seeker != null) {
                switch (status) {
                    case "SHORTLISTED" -> {
                        emailService.sendShortlistEmail(
                            seeker.getEmail(), seeker.getName(),
                            app.getJobTitle(), app.getCompanyName()
                        );
                        // Notify seeker
                        notificationService.create(seeker.getId(),
                            "⭐ You've been Shortlisted!",
                            "Congratulations! You've been shortlisted for " + app.getJobTitle() + " at " + app.getCompanyName() + ". Interview may be scheduled soon.",
                            "SHORTLIST", "/seeker/applications");
                        // Notify employer confirmation
                        Job job = jobRepository.findById(app.getJobId()).orElse(null);
                        if (job != null) {
                            notificationService.create(job.getEmployerId(),
                                "✅ " + seeker.getName() + " Shortlisted",
                                "You have shortlisted " + seeker.getName() + " for " + app.getJobTitle() + ". Schedule interview next.",
                                "SHORTLIST", "/employer/applications/" + app.getJobId());
                        }
                    }
                    case "INTERVIEW_SCHEDULED" -> {
                        // Notify seeker about interview
                        notificationService.create(seeker.getId(),
                            "📅 Interview Scheduled!",
                            "Your interview for " + app.getJobTitle() + " at " + app.getCompanyName() + " has been scheduled. Check My Interviews for details.",
                            "INTERVIEW", "/seeker/interviews");
                        // Notify employer confirmation
                        Job jobI = jobRepository.findById(app.getJobId()).orElse(null);
                        if (jobI != null) {
                            notificationService.create(jobI.getEmployerId(),
                                "📅 Interview Scheduled for " + seeker.getName(),
                                "Interview scheduled with " + seeker.getName() + " for " + app.getJobTitle() + ".",
                                "INTERVIEW", "/employer/interviews");
                        }
                    }
                    case "INTERVIEW_COMPLETED" -> {
                        // Seeker attended interview - just log, notifications sent by InterviewService
                        log.info("Interview completed for application: {}", appId);
                    }
                    case "OFFERED" -> {
                        // Notify seeker about offer — NO email yet, email sent only when accepted
                        notificationService.create(seeker.getId(),
                            "🎉 Job Offer Received!",
                            "You have received an offer for " + app.getJobTitle() + " at " + app.getCompanyName() + ". Please accept or decline.",
                            "OFFER", "/seeker/offers");

                        // Notify employer that offer was sent
                        Job job = jobRepository.findById(app.getJobId()).orElse(null);
                        if (job != null) {
                            notificationService.create(job.getEmployerId(),
                                "📨 Offer Sent to " + seeker.getName(),
                                "Your offer for " + app.getJobTitle() + " has been sent to " + seeker.getName() + ". Waiting for response.",
                                "OFFER", "/employer/applications/" + app.getJobId());
                        }
                    }
                    case "ACCEPTED" -> {
                        // Seeker accepted — NOW send offer letter email
                        Job job = jobRepository.findById(app.getJobId()).orElse(null);
                        User employer = job != null
                            ? userRepository.findById(job.getEmployerId()).orElse(null)
                            : null;

                        // Generate the same offer letter PDF used for download, then attach it
                        byte[] offerLetterPdf = pdfService.generateOfferLetter(
                            seeker.getName(),
                            seeker.getEmail(),
                            app.getJobTitle(),
                            app.getCompanyName(),
                            employer != null ? employer.getCompanyWebsite() : "",
                            employer != null ? employer.getName() : app.getCompanyName(),
                            job != null ? job.getMinSalary() : 0,
                            job != null ? job.getMaxSalary() : 0,
                            job != null ? job.getJobType() : "FULL_TIME",
                            job != null && job.isRemote(),
                            employerNote
                        );

                        // Send offer letter email to seeker, with real PDF attached
                        emailService.sendOfferLetterEmail(
                            seeker.getEmail(),
                            seeker.getName(),
                            app.getJobTitle(),
                            app.getCompanyName(),
                            employer != null ? employer.getCompanyWebsite() : "",
                            employer != null ? employer.getName() : app.getCompanyName(),
                            job != null ? job.getMinSalary() : 0,
                            job != null ? job.getMaxSalary() : 0,
                            job != null ? job.getJobType() : "FULL_TIME",
                            job != null && job.isRemote(),
                            employerNote,
                            offerLetterPdf
                        );

                        // Notify seeker
                        notificationService.create(seeker.getId(),
                            "✅ Offer Accepted!",
                            "You have accepted the offer for " + app.getJobTitle() + " at " + app.getCompanyName() + ". Congratulations!",
                            "OFFER", "/seeker/offers");

                        // Email seeker confirming acceptance
                        try {
                            emailService.sendOfferAcceptedEmail(
                                seeker.getEmail(), seeker.getName(),
                                app.getJobTitle(), app.getCompanyName());
                        } catch (Exception ex) { log.warn("Accepted email failed: {}", ex.getMessage()); }

                        // Notify employer that seeker ACCEPTED
                        if (job != null) {
                            notificationService.create(job.getEmployerId(),
                                "🎉 " + seeker.getName() + " Accepted the Offer!",
                                seeker.getName() + " has accepted your offer for " + app.getJobTitle() + ". Congratulations on your new hire!",
                                "OFFER", "/employer/applications/" + app.getJobId());
                        }
                    }
                    case "REJECTED" -> {
                        Job job = jobRepository.findById(app.getJobId()).orElse(null);
                        boolean seekerDeclined = "SEEKER".equals(requestingRole);
                        if (seekerDeclined) {
                            // Seeker declined an offer → notify employer + confirm to seeker
                            if (job != null) {
                                notificationService.create(job.getEmployerId(),
                                    "❌ " + seeker.getName() + " Declined the Offer",
                                    seeker.getName() + " has declined your offer for " + app.getJobTitle() + ".",
                                    "OFFER", "/employer/applications/" + app.getJobId());
                            }
                            try {
                                emailService.sendOfferDeclinedEmail(
                                    seeker.getEmail(), seeker.getName(),
                                    app.getJobTitle(), app.getCompanyName());
                            } catch (Exception ex) { log.warn("Declined email failed: {}", ex.getMessage()); }
                        } else {
                            // Employer/admin rejected the applicant → notify + email the seeker
                            notificationService.create(seeker.getId(),
                                "Application Update - " + app.getJobTitle(),
                                "Your application for " + app.getJobTitle() + " at " + app.getCompanyName() + " was not selected.",
                                "APPLICATION", "/seeker/applications");
                            try {
                                emailService.sendRejectionEmail(
                                    seeker.getEmail(), seeker.getName(),
                                    app.getJobTitle(), app.getCompanyName());
                            } catch (Exception ex) { log.warn("Rejection email failed: {}", ex.getMessage()); }
                        }
                    }
                    default -> log.info("Status: {} — no email trigger", status);
                }
            }
        }
        return saved;
    }

    public Application getById(String id) {
        return applicationRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Application not found"));
    }

    public List<Application> getAllApplications() {
        return applicationRepository.findAll();
    }

    public org.springframework.data.domain.Page<Application> getAllApplicationsPaged(int page, int size) {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(
            page, size, org.springframework.data.domain.Sort.by("appliedAt").descending()
        );
        return applicationRepository.findAll(pageable);
    }

    // ─────────────────────────────────────────────────────────────
    //  CSV EXPORT (employer)
    //  Returns applications for the given employer's jobs, optionally
    //  filtered to a single pipeline status, as CSV text. If isAdmin is
    //  true the export covers all jobs.
    // ─────────────────────────────────────────────────────────────
    public String exportApplicationsCsv(String employerId, boolean isAdmin, String statusFilter) {
        // Collect the relevant applications, scoped to the employer's own jobs.
        java.util.List<Application> apps = new java.util.ArrayList<>();
        if (isAdmin) {
            apps = applicationRepository.findAll();
        } else {
            java.util.List<Job> myJobs = jobRepository.findByEmployerId(employerId);
            for (Job job : myJobs) {
                apps.addAll(applicationRepository.findByJobId(job.getId()));
            }
        }

        // Optional status filter (e.g. APPLIED, SHORTLISTED, INTERVIEW_SCHEDULED,
        // INTERVIEW_COMPLETED, OFFERED, ACCEPTED, REJECTED). "ALL"/null = no filter.
        final String wanted = (statusFilter == null || statusFilter.isBlank()
                || statusFilter.equalsIgnoreCase("ALL")) ? null : statusFilter.toUpperCase();

        StringBuilder sb = new StringBuilder();
        // Header row
        sb.append("Sr No,Candidate Name,Email,Job Title,Company,Status,Match Score (%),Applied On,Last Updated\n");

        int sr = 1;
        // newest first
        apps.sort((a, b) -> {
            if (a.getAppliedAt() == null) return 1;
            if (b.getAppliedAt() == null) return -1;
            return b.getAppliedAt().compareTo(a.getAppliedAt());
        });

        java.time.format.DateTimeFormatter fmt =
            java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

        for (Application a : apps) {
            String status = a.getStatus() == null ? "APPLIED" : a.getStatus();
            if (wanted != null && !wanted.equals(status)) continue;

            String applied = a.getAppliedAt() != null ? a.getAppliedAt().format(fmt) : "";
            String updated = a.getUpdatedAt() != null ? a.getUpdatedAt().format(fmt) : "";

            sb.append(sr++).append(",")
              .append(csv(a.getSeekerName())).append(",")
              .append(csv(a.getSeekerEmail())).append(",")
              .append(csv(a.getJobTitle())).append(",")
              .append(csv(a.getCompanyName())).append(",")
              .append(csv(status.replace("_", " "))).append(",")
              .append(a.getSkillMatchScore()).append(",")
              .append(csv(applied)).append(",")
              .append(csv(updated))
              .append("\n");
        }
        return sb.toString();
    }

    // Escape a value for CSV: wrap in quotes if it contains comma/quote/newline,
    // and double any internal quotes.
    private String csv(String v) {
        if (v == null) return "";
        boolean needsQuote = v.contains(",") || v.contains("\"") || v.contains("\n") || v.contains("\r");
        String escaped = v.replace("\"", "\"\"");
        return needsQuote ? "\"" + escaped + "\"" : escaped;
    }
}