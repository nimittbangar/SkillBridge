package com.skillbridge.controller;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.canvas.parser.PdfTextExtractor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.skillbridge.model.Resume;
import com.skillbridge.model.Skill;
import com.skillbridge.model.User;
import com.skillbridge.repository.ResumeRepository;
import com.skillbridge.repository.SkillRepository;
import com.skillbridge.repository.UserRepository;
import com.skillbridge.repository.ApplicationRepository;
import com.skillbridge.repository.JobRepository;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileUploadController {

    private static final int MAX_RESUMES_PER_USER = 5;

    private final UserRepository userRepository;
    private final SkillRepository skillRepository;
    private final ResumeRepository resumeRepository;
    private final ApplicationRepository applicationRepository;
    private final JobRepository jobRepository;

    @PostMapping("/upload-resume")
    @PreAuthorize("hasRole('SEEKER')")
    public ResponseEntity<?> uploadResume(@RequestParam("file") MultipartFile file,
                                          Authentication auth) {
        try {
            String contentType = file.getContentType();
            if (contentType == null || !contentType.equals("application/pdf")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Only PDF files are allowed"));
            }
            if (file.getSize() > 5 * 1024 * 1024) {
                return ResponseEntity.badRequest().body(Map.of("error", "File size must be less than 5MB"));
            }

            User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

            long existingCount = resumeRepository.countByUserId(user.getId());
            if (existingCount >= MAX_RESUMES_PER_USER) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "You can have at most " + MAX_RESUMES_PER_USER + " resumes. Delete one first."));
            }

            byte[] fileBytes = file.getBytes();
            String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "resume.pdf";

            Resume resume = new Resume();
            resume.setUserId(user.getId());
            resume.setFileName(originalFilename);
            resume.setFileData(fileBytes);
            resume.setUploadedAt(LocalDateTime.now());
            // First resume a seeker uploads automatically becomes primary
            boolean makePrimary = existingCount == 0;
            resume.setPrimary(makePrimary);
            Resume saved = resumeRepository.save(resume);

            if (makePrimary) {
                syncPrimaryToUser(user, saved);
            }

            List<String> suggestedSkills = suggestSkills(fileBytes, user);

            return ResponseEntity.ok(Map.of(
                "resumeId", saved.getId(),
                "fileName", originalFilename,
                "isPrimary", saved.isPrimary(),
                "message", "Resume uploaded successfully!",
                "suggestedSkills", suggestedSkills
            ));

        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to upload file: " + e.getMessage()));
        }
    }

    @GetMapping("/resumes")
    @PreAuthorize("hasRole('SEEKER')")
    public ResponseEntity<?> listResumes(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
        List<Map<String, Object>> result = new ArrayList<>();
        for (Resume r : resumeRepository.findByUserIdOrderByUploadedAtDesc(user.getId())) {
            result.add(Map.of(
                "id", r.getId(),
                "fileName", r.getFileName() != null ? r.getFileName() : "resume.pdf",
                "isPrimary", r.isPrimary(),
                "uploadedAt", r.getUploadedAt() != null ? r.getUploadedAt().toString() : ""
            ));
        }
        return ResponseEntity.ok(result);
    }

    @PutMapping("/resumes/{resumeId}/primary")
    @PreAuthorize("hasRole('SEEKER')")
    public ResponseEntity<?> setPrimaryResume(@PathVariable String resumeId, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
        Resume target = resumeRepository.findById(resumeId)
            .orElseThrow(() -> new RuntimeException("Resume not found"));
        if (!target.getUserId().equals(user.getId())) {
            return ResponseEntity.status(403).body("You are not authorized to modify this resume.");
        }
        for (Resume r : resumeRepository.findByUserIdOrderByUploadedAtDesc(user.getId())) {
            if (r.isPrimary() && !r.getId().equals(resumeId)) {
                r.setPrimary(false);
                resumeRepository.save(r);
            }
        }
        target.setPrimary(true);
        resumeRepository.save(target);
        syncPrimaryToUser(user, target);
        return ResponseEntity.ok(Map.of("message", "Primary resume updated."));
    }

    @DeleteMapping("/resumes/{resumeId}")
    @PreAuthorize("hasRole('SEEKER')")
    public ResponseEntity<?> deleteResume(@PathVariable String resumeId, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
        Resume target = resumeRepository.findById(resumeId)
            .orElseThrow(() -> new RuntimeException("Resume not found"));
        if (!target.getUserId().equals(user.getId())) {
            return ResponseEntity.status(403).body("You are not authorized to delete this resume.");
        }
        boolean wasPrimary = target.isPrimary();
        resumeRepository.deleteById(resumeId);

        if (wasPrimary) {
            List<Resume> remaining = resumeRepository.findByUserIdOrderByUploadedAtDesc(user.getId());
            if (!remaining.isEmpty()) {
                Resume promoted = remaining.get(0);
                promoted.setPrimary(true);
                resumeRepository.save(promoted);
                syncPrimaryToUser(user, promoted);
            } else {
                user.setResumeData(null);
                user.setResumeFileName(null);
                user.setResumeUrl(null);
                userRepository.save(user);
            }
        }
        return ResponseEntity.ok(Map.of("message", "Resume deleted."));
    }

    // Public view of a specific resume by its own ID — same trust model as the
    // primary-resume endpoint below: the ID is an unguessable UUID, not auth-gated,
    // so a plain link (no JS fetch/blob handling needed) works from the UI.
    @GetMapping("/resumes/{resumeId}/view")
    public ResponseEntity<byte[]> viewSpecificResume(@PathVariable String resumeId, Authentication auth) {
        Resume r = resumeRepository.findById(resumeId).orElse(null);
        if (r == null) return ResponseEntity.notFound().build();
        if (!canAccessResumeOf(r.getUserId(), auth)) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + (r.getFileName() != null ? r.getFileName() : "resume.pdf") + "\"")
            .body(r.getFileData());
    }

    // Serves whichever resume is currently primary for a user. Employers reach this
    // from an application's resumeUrl; access is restricted to the owner, an admin,
    // or an employer the seeker has applied to.
    @GetMapping("/resume/{userId}")
    public ResponseEntity<byte[]> viewResume(@PathVariable String userId, Authentication auth) {
        if (!canAccessResumeOf(userId, auth)) {
            return ResponseEntity.status(403).build();
        }
        return userRepository.findById(userId)
            .filter(u -> u.getResumeData() != null)
            .map(u -> ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                    "inline; filename=\"" + (u.getResumeFileName() != null ? u.getResumeFileName() : "resume.pdf") + "\"")
                .body(u.getResumeData()))
            .orElse(ResponseEntity.notFound().build());
    }

    // ─── Resume access rule ───
    // A resume belonging to `ownerId` may be viewed by: the owner themselves, any
    // admin, or an employer who owns at least one job that this seeker has applied to.
    private boolean canAccessResumeOf(String ownerId, Authentication auth) {
        if (auth == null || auth.getName() == null) return false;
        User requester = userRepository.findByEmail(auth.getName()).orElse(null);
        if (requester == null) return false;
        if (requester.getId().equals(ownerId)) return true;          // owner
        if ("ADMIN".equals(requester.getRole())) return true;        // admin
        if ("EMPLOYER".equals(requester.getRole())) {
            // Employer may view only if this seeker applied to one of the employer's jobs.
            return applicationRepository.findBySeekerId(ownerId).stream()
                .map(app -> jobRepository.findById(app.getJobId()).orElse(null))
                .filter(job -> job != null)
                .anyMatch(job -> requester.getId().equals(job.getEmployerId()));
        }
        return false;
    }

    private void syncPrimaryToUser(User user, Resume primary) {
        user.setResumeData(primary.getFileData());
        user.setResumeFileName(primary.getFileName());
        user.setResumeUrl("/api/files/resume/" + user.getId());
        userRepository.save(user);
    }

    private List<String> suggestSkills(byte[] fileBytes, User user) {
        List<String> suggestedSkills = new ArrayList<>();
        try {
            String resumeText = extractPdfText(fileBytes).toLowerCase();
            List<Skill> allSkills = skillRepository.findAll();
            List<String> alreadyTagged = user.getSkillsList();
            for (Skill skill : allSkills) {
                String skillNameLower = skill.getName().toLowerCase();
                boolean mentionedInResume = resumeText.contains(skillNameLower);
                boolean notAlreadyTagged = alreadyTagged == null || !alreadyTagged.contains(skill.getName());
                if (mentionedInResume && notAlreadyTagged) {
                    suggestedSkills.add(skill.getName());
                }
            }
        } catch (Exception ex) {
            log.warn("⚠️ Could not extract text from resume for skill suggestions: {}", ex.getMessage());
        }
        return suggestedSkills;
    }

    private String extractPdfText(byte[] pdfBytes) throws IOException {
        StringBuilder text = new StringBuilder();
        try (PdfDocument pdfDoc = new PdfDocument(new PdfReader(new ByteArrayInputStream(pdfBytes)))) {
            int pages = pdfDoc.getNumberOfPages();
            for (int i = 1; i <= pages; i++) {
                text.append(PdfTextExtractor.getTextFromPage(pdfDoc.getPage(i))).append(" ");
            }
        }
        return text.toString();
    }
}