package com.skillbridge.controller;

import com.skillbridge.model.Application;
import com.skillbridge.model.Job;
import com.skillbridge.repository.UserRepository;
import com.skillbridge.repository.JobRepository;
import com.skillbridge.repository.SkillRepository;
import com.skillbridge.repository.ApplicationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Platform statistics.
 *  - /api/stats     : public, read-only counts for the landing page.
 *  - /api/analytics : admin-only dashboard data (charts).
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class StatsController {

    private final UserRepository userRepository;
    private final JobRepository jobRepository;
    private final SkillRepository skillRepository;
    private final ApplicationRepository applicationRepository;

    @GetMapping("/stats")
    public ResponseEntity<?> stats() {
        long seekers   = userRepository.countByRole("SEEKER");
        long employers = userRepository.countByRole("EMPLOYER");
        long openJobs  = jobRepository.countByStatusAndVerified("OPEN", true);
        long verifiedSkills = skillRepository.countByVerified(true);

        return ResponseEntity.ok(Map.of(
            "seekers", seekers,
            "employers", employers,
            "jobs", openJobs,
            "verifiedSkills", verifiedSkills
        ));
    }

    @GetMapping("/analytics")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> analytics() {
        List<Application> apps = applicationRepository.findAll();
        List<Job> jobs = jobRepository.findAll();

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("seekers", userRepository.countByRole("SEEKER"));
        summary.put("employers", userRepository.countByRole("EMPLOYER"));
        summary.put("jobs", jobs.size());
        summary.put("applications", apps.size());

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MMM d");
        Map<String, Integer> byDay = new LinkedHashMap<>();
        LocalDate today = LocalDate.now();
        for (int i = 13; i >= 0; i--) {
            byDay.put(today.minusDays(i).format(fmt), 0);
        }
        for (Application a : apps) {
            if (a.getAppliedAt() != null) {
                LocalDate d = a.getAppliedAt().toLocalDate();
                if (!d.isBefore(today.minusDays(13)) && !d.isAfter(today)) {
                    String key = d.format(fmt);
                    byDay.merge(key, 1, Integer::sum);
                }
            }
        }

        Map<String, Integer> byStatus = new LinkedHashMap<>();
        for (String s : new String[]{"APPLIED", "SHORTLISTED", "INTERVIEW_SCHEDULED", "OFFERED", "ACCEPTED", "REJECTED"}) {
            byStatus.put(s, 0);
        }
        for (Application a : apps) {
            String s = a.getStatus() == null ? "APPLIED" : a.getStatus();
            byStatus.merge(s, 1, Integer::sum);
        }

        Map<String, Integer> jobsByStatus = new LinkedHashMap<>();
        for (String s : new String[]{"OPEN", "PAUSED", "CLOSED"}) jobsByStatus.put(s, 0);
        for (Job j : jobs) {
            String s = j.getStatus() == null ? "OPEN" : j.getStatus();
            jobsByStatus.merge(s, 1, Integer::sum);
        }

        Map<String, Integer> skillCounts = new LinkedHashMap<>();
        for (Job j : jobs) {
            List<String> req = j.getRequiredSkillsList();
            if (req != null) {
                for (String skill : req) {
                    if (skill != null && !skill.trim().isEmpty()) {
                        skillCounts.merge(skill.trim(), 1, Integer::sum);
                    }
                }
            }
        }
        List<Map<String, Object>> topSkills = new ArrayList<>();
        skillCounts.entrySet().stream()
            .sorted((a, b) -> b.getValue() - a.getValue())
            .limit(6)
            .forEach(e -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("skill", e.getKey());
                m.put("count", e.getValue());
                topSkills.add(m);
            });

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("summary", summary);
        result.put("applicationsByDay", byDay);
        result.put("applicationsByStatus", byStatus);
        result.put("jobsByStatus", jobsByStatus);
        result.put("topSkills", topSkills);
        return ResponseEntity.ok(result);
    }
}