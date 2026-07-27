package com.skillbridge.controller;

import com.skillbridge.model.Application;
import com.skillbridge.model.Job;
import com.skillbridge.model.User;
import com.skillbridge.repository.ApplicationRepository;
import com.skillbridge.repository.JobRepository;
import com.skillbridge.repository.UserRepository;
import com.skillbridge.service.JobService;
import com.skillbridge.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/jobs")
@Slf4j
@RequiredArgsConstructor
public class JobController {

    private final JobService jobService;
    private final JobRepository jobRepository;
    private final UserRepository userRepository;
    private final ApplicationRepository applicationRepository;
    private final NotificationService notificationService;

    @GetMapping("/all")
    public ResponseEntity<List<Job>> getAllJobs() {
        return ResponseEntity.ok(jobService.getAllOpenJobs());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Job> getJobById(@PathVariable String id) {
        return ResponseEntity.ok(jobService.getJobById(id));
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchJobs(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Double minSalary,
            @RequestParam(required = false) Double maxSalary,
            @RequestParam(required = false) Boolean remote,
            @RequestParam(required = false) String experienceLevel,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        // Backward compatible: existing callers that don't pass page/size keep getting
        // a plain List<Job> exactly as before. Pass page+size to get a paginated response
        // shaped as { content, totalElements, totalPages, currentPage }.
        if (page == null) {
            return ResponseEntity.ok(jobService.searchJobs(keyword, minSalary, maxSalary, remote, experienceLevel));
        }
        int pageSize = (size == null || size <= 0) ? 9 : size;
        org.springframework.data.domain.Page<Job> result =
            jobService.searchJobsPaged(keyword, minSalary, maxSalary, remote, experienceLevel, page, pageSize);
        return ResponseEntity.ok(java.util.Map.of(
            "content", result.getContent(),
            "totalElements", result.getTotalElements(),
            "totalPages", result.getTotalPages(),
            "currentPage", page
        ));
    }

    @PostMapping("/create")
    @PreAuthorize("hasRole('EMPLOYER') or hasRole('ADMIN')")
    public ResponseEntity<?> createJob(@RequestBody Job job, Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
            return ResponseEntity.ok(jobService.createJob(job, user.getId()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/my-jobs")
    @PreAuthorize("hasRole('EMPLOYER')")
    public ResponseEntity<List<Job>> getMyJobs(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
        List<Job> jobs = jobService.getJobsByEmployer(user.getId());
        // Ensure companyName is always set from employer profile
        String companyName = user.getCompanyName() != null && !user.getCompanyName().isEmpty()
            ? user.getCompanyName() : user.getName();
        jobs.forEach(j -> {
            if (j.getCompanyName() == null || j.getCompanyName().isEmpty()) {
                j.setCompanyName(companyName);
            }
        });
        return ResponseEntity.ok(jobs);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('EMPLOYER') or hasRole('ADMIN')")
    public ResponseEntity<?> updateJob(@PathVariable String id, @RequestBody Job job, Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
            boolean isAdmin = "ADMIN".equals(user.getRole());
            return ResponseEntity.ok(jobService.updateJob(id, job, user.getId(), isAdmin));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('EMPLOYER') or hasRole('ADMIN')")
    public ResponseEntity<?> deleteJob(@PathVariable String id, Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
            boolean isAdmin = "ADMIN".equals(user.getRole());
            jobService.deleteJob(id, user.getId(), isAdmin);
            return ResponseEntity.ok("Job deleted successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ─── Quick Status Toggle ───
    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('EMPLOYER') or hasRole('ADMIN')")
    public ResponseEntity<?> toggleStatus(@PathVariable String id,
                                           @RequestBody java.util.Map<String, String> body,
                                           Authentication auth) {
        try {
            User requestingUser = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
            Job job = jobService.getJobById(id);
            boolean isAdmin = "ADMIN".equals(requestingUser.getRole());
            if (!isAdmin && (job.getEmployerId() == null || !job.getEmployerId().equals(requestingUser.getId()))) {
                return ResponseEntity.status(403).body("You are not authorized to change this job's status.");
            }
            String prevStatus = job.getStatus();
            String newStatus = body.get("status");
            job.setStatus(newStatus);
            Job saved = jobRepository.save(job);

            // Notify all seekers who applied when job is PAUSED or CLOSED
            if (("PAUSED".equals(newStatus) || "CLOSED".equals(newStatus)) && !newStatus.equals(prevStatus)) {
                List<Application> applications = applicationRepository.findByJobId(id);
                for (Application app : applications) {
                    if (app.getSeekerId() != null &&
                        !List.of("REJECTED","ACCEPTED","OFFERED").contains(app.getStatus())) {
                        try {
                            String msg = "PAUSED".equals(newStatus)
                                ? "The job posting for " + job.getTitle() + " at " + job.getCompanyName() + " has been temporarily paused by the employer."
                                : "The job posting for " + job.getTitle() + " at " + job.getCompanyName() + " has been closed.";
                            notificationService.create(app.getSeekerId(),
                                "PAUSED".equals(newStatus) ? "⏸️ Job Paused — " + job.getTitle() : "🔒 Job Closed — " + job.getTitle(),
                                msg,
                                "SYSTEM", "/seeker/applications");
                        } catch (Exception e) {
                            log.warn("Could not notify seeker {} of job status change", app.getSeekerId());
                        }
                    }
                }
                log.info("Notified {} seekers of job {} status change to {}", applications.size(), id, newStatus);
            }

            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/match-score/{jobId}")
    @PreAuthorize("hasRole('SEEKER')")
    public ResponseEntity<?> getMatchScore(@PathVariable String jobId, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
        int score = jobService.calculateSkillMatchScore(user.getId(), jobId);
        return ResponseEntity.ok(java.util.Map.of("score", score));
    }

    // Itemized skill-gap breakdown for the job detail page: which required skills
    // the seeker has, which are admin-verified, and which are missing.
    @GetMapping("/skill-breakdown/{jobId}")
    @PreAuthorize("hasRole('SEEKER')")
    public ResponseEntity<?> getSkillBreakdown(@PathVariable String jobId, Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
            return ResponseEntity.ok(jobService.getSkillBreakdown(user.getId(), jobId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    //  ADMIN JOB VERIFICATION
    //  Employers post jobs as "pending"; an admin reviews and approves
    //  them here. Only verified jobs are visible to seekers and open
    //  for applications.
    // ─────────────────────────────────────────────────────────────

    // List every job still awaiting admin approval.
    @GetMapping("/admin/pending")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Job>> getPendingJobs() {
        return ResponseEntity.ok(jobService.getPendingJobs());
    }

    // List ALL jobs (verified, pending, open, paused, closed) for the admin console.
    // The public /all endpoint only returns verified+open jobs, so admins need this
    // separate view to see and moderate everything on the platform.
    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Job>> getAllJobsForAdmin() {
        return ResponseEntity.ok(jobRepository.findAll());
    }

    // Approve a job — makes it live for seekers and notifies the employer.
    @PutMapping("/{id}/verify")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> verifyJob(@PathVariable String id, Authentication auth) {
        try {
            User admin = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
            Job job = jobService.verifyJob(id, admin.getId());

            // Let the employer know their posting is approved and now visible.
            if (job.getEmployerId() != null && !job.getEmployerId().isEmpty()) {
                try {
                    notificationService.create(job.getEmployerId(),
                        "✅ Job Approved — " + job.getTitle(),
                        "Your job posting \"" + job.getTitle() + "\" has been verified by an admin and is now live. Seekers can view and apply to it.",
                        "SYSTEM", "/employer/dashboard");
                } catch (Exception e) {
                    log.warn("Could not notify employer {} of job approval", job.getEmployerId());
                }
            }
            return ResponseEntity.ok(job);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Revoke a job's verification (e.g. approved by mistake) — hides it again.
    @PutMapping("/{id}/unverify")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> unverifyJob(@PathVariable String id, Authentication auth) {
        try {
            Job job = jobService.unverifyJob(id);
            if (job.getEmployerId() != null && !job.getEmployerId().isEmpty()) {
                try {
                    notificationService.create(job.getEmployerId(),
                        "⚠️ Job Unpublished — " + job.getTitle(),
                        "Your job posting \"" + job.getTitle() + "\" has been unpublished by an admin and is no longer visible to seekers.",
                        "SYSTEM", "/employer/dashboard");
                } catch (Exception e) {
                    log.warn("Could not notify employer {} of job unverify", job.getEmployerId());
                }
            }
            return ResponseEntity.ok(job);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}