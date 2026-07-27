package com.skillbridge.controller;

import com.skillbridge.model.Application;
import com.skillbridge.model.Job;
import com.skillbridge.model.User;
import com.skillbridge.repository.JobRepository;
import com.skillbridge.repository.UserRepository;
import com.skillbridge.service.ApplicationService;
import com.skillbridge.service.PdfService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/applications")
@RequiredArgsConstructor
public class ApplicationController {

    private final ApplicationService applicationService;
    private final UserRepository userRepository;
    private final JobRepository jobRepository;
    private final PdfService pdfService;

    @PostMapping("/apply/{jobId}")
    @PreAuthorize("hasRole('SEEKER')")
    public ResponseEntity<?> apply(@PathVariable String jobId,
                                   @RequestBody Map<String, String> body,
                                   Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
            return ResponseEntity.ok(applicationService.applyToJob(
                user.getId(), jobId, body.getOrDefault("coverLetter", "")));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/my-applications")
    @PreAuthorize("hasRole('SEEKER')")
    public ResponseEntity<List<Application>> myApplications(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(applicationService.getSeekerApplications(user.getId()));
    }

    // ─── Download Offer Letter PDF (Seeker) ───
    @GetMapping("/{id}/offer-letter-pdf")
    @PreAuthorize("hasRole('SEEKER') or hasRole('EMPLOYER') or hasRole('ADMIN')")
    public ResponseEntity<?> downloadOfferLetterPdf(@PathVariable String id, Authentication auth) {
        try {
            Application app = applicationService.getById(id);

            // Only allow the seeker who owns the application, or employer/admin
            User requestingUser = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
            if ("SEEKER".equals(requestingUser.getRole()) && !app.getSeekerId().equals(requestingUser.getId())) {
                return ResponseEntity.status(403).body("Not authorized");
            }

            if (!"OFFERED".equals(app.getStatus()) && !"ACCEPTED".equals(app.getStatus())) {
                return ResponseEntity.badRequest().body("Offer letter is only available for OFFERED or ACCEPTED applications");
            }

            Job job = jobRepository.findById(app.getJobId()).orElse(null);
            User employer = (job != null)
                ? userRepository.findById(job.getEmployerId()).orElse(null)
                : null;

            byte[] pdf = pdfService.generateOfferLetter(
                app.getSeekerName(),
                app.getSeekerEmail(),
                app.getJobTitle(),
                app.getCompanyName(),
                employer != null ? employer.getCompanyWebsite() : "",
                employer != null ? employer.getName() : app.getCompanyName(),
                job != null ? job.getMinSalary() : 0,
                job != null ? job.getMaxSalary() : 0,
                job != null ? job.getJobType() : "FULL_TIME",
                job != null && job.isRemote(),
                app.getEmployerNote()
            );

            String filename = "OfferLetter_" + app.getSeekerName().replace(" ", "_") + ".pdf";
            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to generate offer letter: " + e.getMessage());
        }
    }

    // ─── Withdraw Application ───
    @DeleteMapping("/{id}/withdraw")
    @PreAuthorize("hasRole('SEEKER')")
    public ResponseEntity<?> withdraw(@PathVariable String id, Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
            applicationService.withdrawApplication(id, user.getId());
            return ResponseEntity.ok(Map.of("message", "Application withdrawn successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/job/{jobId}")
    @PreAuthorize("hasRole('EMPLOYER') or hasRole('ADMIN')")
    public ResponseEntity<List<Application>> jobApplications(@PathVariable String jobId) {
        return ResponseEntity.ok(applicationService.getJobApplications(jobId));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('EMPLOYER') or hasRole('ADMIN') or hasRole('SEEKER')")
    public ResponseEntity<?> updateStatus(@PathVariable String id,
                                          @RequestBody Map<String, String> body,
                                          Authentication auth) {
        try {
            String status = body.get("status");
            String note = body.get("employerNote");
            User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
            if ("SEEKER".equals(user.getRole())) {
                if (!"ACCEPTED".equals(status) && !"REJECTED".equals(status))
                    return ResponseEntity.badRequest().body("Seekers can only Accept or Decline offers");
            }
            return ResponseEntity.ok(applicationService.updateStatus(id, status, note, user.getId(), user.getRole()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ── CSV export of applicants for the logged-in employer, filtered by status ──
    // status values: ALL, APPLIED, SHORTLISTED, INTERVIEW_SCHEDULED,
    //                INTERVIEW_COMPLETED, OFFERED, ACCEPTED, REJECTED
    @GetMapping("/export")
    @PreAuthorize("hasRole('EMPLOYER') or hasRole('ADMIN')")
    public ResponseEntity<?> exportApplicationsCsv(
            @RequestParam(required = false, defaultValue = "ALL") String status,
            Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
            boolean isAdmin = "ADMIN".equals(user.getRole());
            String csv = applicationService.exportApplicationsCsv(user.getId(), isAdmin, status);

            String safeStatus = status == null ? "all" : status.toLowerCase();
            String filename = "applicants_" + safeStatus + ".csv";

            return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(csv);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> allApplications(@RequestParam(required = false) Integer page,
                                              @RequestParam(required = false) Integer size) {
        if (page == null) {
            return ResponseEntity.ok(applicationService.getAllApplications());
        }
        int pageSize = (size == null || size <= 0) ? 15 : size;
        org.springframework.data.domain.Page<Application> result = applicationService.getAllApplicationsPaged(page, pageSize);
        return ResponseEntity.ok(Map.of(
            "content", result.getContent(),
            "totalElements", result.getTotalElements(),
            "totalPages", result.getTotalPages(),
            "currentPage", page
        ));
    }
}