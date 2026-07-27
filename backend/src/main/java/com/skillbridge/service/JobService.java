package com.skillbridge.service;

import com.skillbridge.model.Job;
import com.skillbridge.model.User;
import com.skillbridge.repository.JobRepository;
import com.skillbridge.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class JobService {

    private final JobRepository jobRepository;
    private final UserRepository userRepository;

    public Job createJob(Job job, String employerId) {
        if (job.getTitle() == null || job.getTitle().isBlank()) {
            throw new RuntimeException("Job title is required.");
        }
        if (job.getDescription() == null || job.getDescription().isBlank()) {
            throw new RuntimeException("Job description is required.");
        }
        if (job.getMinSalary() < 0 || job.getMaxSalary() < 0) {
            throw new RuntimeException("Salary cannot be negative.");
        }
        if (job.getMaxSalary() > 0 && job.getMaxSalary() < job.getMinSalary()) {
            throw new RuntimeException("Maximum salary cannot be less than minimum salary.");
        }

        User employer = userRepository.findById(employerId)
            .orElseThrow(() -> new RuntimeException("Employer not found"));

        job.setEmployerId(employerId);
        job.setCompanyName(
            employer.getCompanyName() != null && !employer.getCompanyName().isEmpty()
                ? employer.getCompanyName()
                : employer.getName()
        );
        job.setStatus("OPEN");
        job.setPostedAt(LocalDateTime.now());
        job.setApplicationCount(0);
        // A new posting must be approved by an admin before seekers can see or apply to it.
        job.setVerified(false);
        job.setVerifiedBy(null);
        job.setVerifiedAt(null);

        // Clean requiredSkills — remove any JSON array brackets/quotes
        if (job.getRequiredSkills() != null) {
            String cleaned = job.getRequiredSkills()
                .replace("[", "").replace("]", "").replace("\"", "").trim();
            job.setRequiredSkills(cleaned);
        }

        log.info("Creating job: {} for employer: {}", job.getTitle(), employer.getName());
        return jobRepository.save(job);
    }

    public List<Job> getAllOpenJobs() {
        // Seekers only ever see jobs that are both OPEN and admin-verified.
        return jobRepository.findByStatusAndVerified("OPEN", true);
    }

    // ─── Admin: jobs awaiting verification ───
    public List<Job> getPendingJobs() {
        return jobRepository.findByVerified(false);
    }

    // ─── Admin: approve a job so it becomes visible/applyable ───
    public Job verifyJob(String jobId, String adminId) {
        Job job = getJobById(jobId);
        job.setVerified(true);
        job.setVerifiedBy(adminId);
        job.setVerifiedAt(LocalDateTime.now());
        log.info("Job {} verified by admin {}", jobId, adminId);
        return jobRepository.save(job);
    }

    // ─── Admin: revoke verification (e.g. job was approved by mistake) ───
    public Job unverifyJob(String jobId) {
        Job job = getJobById(jobId);
        job.setVerified(false);
        job.setVerifiedBy(null);
        job.setVerifiedAt(null);
        log.info("Job {} verification revoked", jobId);
        return jobRepository.save(job);
    }

    public List<Job> getJobsByEmployer(String employerId) {
        return jobRepository.findByEmployerId(employerId);
    }

    public Job getJobById(String id) {
        return jobRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Job not found with id: " + id));
    }

    public Job updateJob(String id, Job updatedJob, String requestingUserId, boolean isAdmin) {
        Job job = getJobById(id);
        if (!isAdmin && (job.getEmployerId() == null || !job.getEmployerId().equals(requestingUserId))) {
            throw new RuntimeException("You are not authorized to edit this job posting.");
        }
        if (updatedJob.getTitle() != null && updatedJob.getTitle().isBlank()) {
            throw new RuntimeException("Job title cannot be empty.");
        }
        if (updatedJob.getMinSalary() < 0 || updatedJob.getMaxSalary() < 0) {
            throw new RuntimeException("Salary cannot be negative.");
        }
        if (updatedJob.getMaxSalary() > 0 && updatedJob.getMaxSalary() < updatedJob.getMinSalary()) {
            throw new RuntimeException("Maximum salary cannot be less than minimum salary.");
        }
        if (updatedJob.getTitle() != null) job.setTitle(updatedJob.getTitle());
        if (updatedJob.getDescription() != null) job.setDescription(updatedJob.getDescription());
        if (updatedJob.getRequiredSkills() != null) {
            String cleaned = updatedJob.getRequiredSkills()
                .replace("[", "").replace("]", "").replace("\"", "").trim();
            job.setRequiredSkills(cleaned);
        }
        job.setMinSalary(updatedJob.getMinSalary());
        job.setMaxSalary(updatedJob.getMaxSalary());
        job.setRemote(updatedJob.isRemote());
        if (updatedJob.getJobType() != null) job.setJobType(updatedJob.getJobType());
        if (updatedJob.getExperienceLevel() != null) job.setExperienceLevel(updatedJob.getExperienceLevel());
        if (updatedJob.getStatus() != null) job.setStatus(updatedJob.getStatus());
        if (updatedJob.getDeadline() != null) job.setDeadline(updatedJob.getDeadline());
        if (updatedJob.getLocation() != null) job.setLocation(updatedJob.getLocation());
        return jobRepository.save(job);
    }

    public void deleteJob(String id, String requestingUserId, boolean isAdmin) {
        Job job = getJobById(id);
        if (!isAdmin && (job.getEmployerId() == null || !job.getEmployerId().equals(requestingUserId))) {
            throw new RuntimeException("You are not authorized to delete this job posting.");
        }
        jobRepository.deleteById(id);
    }

    public List<Job> searchJobs(String keyword, Double minSalary, Double maxSalary,
                                 Boolean remote, String experienceLevel) {
        return jobRepository.searchJobs(keyword, remote, experienceLevel, minSalary, maxSalary);
    }

    public org.springframework.data.domain.Page<Job> searchJobsPaged(
            String keyword, Double minSalary, Double maxSalary,
            Boolean remote, String experienceLevel, int page, int size) {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(
            page, size,
            org.springframework.data.domain.Sort.by("postedAt").descending()
        );
        return jobRepository.searchJobsPaged(keyword, remote, experienceLevel, minSalary, maxSalary, pageable);
    }

    public int calculateSkillMatchScore(String seekerId, String jobId) {
        User seeker = userRepository.findById(seekerId)
            .orElseThrow(() -> new RuntimeException("Seeker not found"));
        Job job = getJobById(jobId);

        // Get required skills list from job
        List<String> required = job.getRequiredSkillsList();
        if (required == null || required.isEmpty()) return 100;

        // ─── FIX: explicitly cast to String list ───
        List<String> seekerRaw = seeker.getSkillsList();
        List<String> verifiedRaw = seeker.getVerifiedSkillsList();

        List<String> seekerSkills = new ArrayList<>();
        if (seekerRaw != null) {
            for (Object o : seekerRaw) {
                if (o != null) seekerSkills.add(o.toString().toLowerCase().trim());
            }
        }

        List<String> verifiedSkills = new ArrayList<>();
        if (verifiedRaw != null) {
            for (Object o : verifiedRaw) {
                if (o != null) verifiedSkills.add(o.toString().toLowerCase().trim());
            }
        }

        long matched = 0;
        long verifiedMatched = 0;
        for (String req : required) {
            String reqLower = req.toLowerCase().trim();
            if (seekerSkills.contains(reqLower)) matched++;
            if (verifiedSkills.contains(reqLower)) verifiedMatched++;
        }

        double score = (matched + verifiedMatched * 0.5) / required.size() * 100;
        return (int) Math.min(score, 100);
    }

    // Returns an itemized breakdown of the skill match for a seeker vs a job:
    // which required skills they have, which are admin-verified, and which are
    // missing. Uses the SAME matching logic as calculateSkillMatchScore so the
    // breakdown always agrees with the percentage shown.
    public Map<String, Object> getSkillBreakdown(String seekerId, String jobId) {
        User seeker = userRepository.findById(seekerId)
            .orElseThrow(() -> new RuntimeException("Seeker not found"));
        Job job = getJobById(jobId);

        List<String> required = job.getRequiredSkillsList();
        List<String> matchedSkills = new ArrayList<>();
        List<String> verifiedSkills = new ArrayList<>();
        List<String> missingSkills = new ArrayList<>();

        // Normalise seeker skills to lowercase for comparison, but keep the
        // original required-skill casing for display.
        List<String> seekerLower = new ArrayList<>();
        if (seeker.getSkillsList() != null)
            for (Object o : seeker.getSkillsList())
                if (o != null) seekerLower.add(o.toString().toLowerCase().trim());

        List<String> verifiedLower = new ArrayList<>();
        if (seeker.getVerifiedSkillsList() != null)
            for (Object o : seeker.getVerifiedSkillsList())
                if (o != null) verifiedLower.add(o.toString().toLowerCase().trim());

        if (required != null) {
            for (String req : required) {
                String reqLower = req.toLowerCase().trim();
                if (verifiedLower.contains(reqLower)) {
                    verifiedSkills.add(req);
                    matchedSkills.add(req);
                } else if (seekerLower.contains(reqLower)) {
                    matchedSkills.add(req);
                } else {
                    missingSkills.add(req);
                }
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("score", calculateSkillMatchScore(seekerId, jobId));
        result.put("matched", matchedSkills);       // skills the seeker has
        result.put("verified", verifiedSkills);      // subset that are admin-verified
        result.put("missing", missingSkills);        // required skills the seeker lacks
        result.put("totalRequired", required == null ? 0 : required.size());
        return result;
    }

    public void incrementApplicationCount(String jobId) {
        Job job = getJobById(jobId);
        job.setApplicationCount(job.getApplicationCount() + 1);
        jobRepository.save(job);
    }
}