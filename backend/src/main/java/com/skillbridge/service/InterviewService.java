package com.skillbridge.service;

import com.skillbridge.model.Application;
import com.skillbridge.model.Interview;
import com.skillbridge.model.User;
import com.skillbridge.repository.InterviewRepository;
import com.skillbridge.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import com.skillbridge.service.NotificationService;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class InterviewService {

    private final InterviewRepository interviewRepository;
    private final ApplicationService applicationService;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final NotificationService notificationService;
    private final com.skillbridge.repository.JobRepository jobRepository;

    public Interview scheduleInterview(Interview interview, String requestingEmployerId, boolean isAdmin) {
        Application app = applicationService.getById(interview.getApplicationId());

        // Verify the requesting employer actually owns the job this application is for —
        // without this, any employer could schedule (and email) a fake interview against
        // any other company's applicant.
        com.skillbridge.model.Job job = jobRepository.findById(app.getJobId())
            .orElseThrow(() -> new RuntimeException("Job not found"));
        if (!isAdmin && (job.getEmployerId() == null || !job.getEmployerId().equals(requestingEmployerId))) {
            throw new RuntimeException("You are not authorized to schedule an interview for this application.");
        }
        if (interview.getScheduledDateTime() == null) {
            throw new RuntimeException("Interview date/time is required.");
        }
        if (interview.getScheduledDateTime().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Interview date/time cannot be in the past.");
        }

        interview.setSeekerId(app.getSeekerId());
        interview.setSeekerName(app.getSeekerName());
        interview.setJobId(app.getJobId());
        interview.setJobTitle(app.getJobTitle());
        interview.setStatus("SCHEDULED");
        interview.setResult("PENDING");
        interview.setCreatedAt(LocalDateTime.now());

        // Auto update application status
        applicationService.updateStatus(interview.getApplicationId(), "INTERVIEW_SCHEDULED", null);

        Interview saved = interviewRepository.save(interview);

        // Send interview email to seeker
        User seeker = userRepository.findById(app.getSeekerId()).orElse(null);
        if (seeker != null) {
            String formattedDateTime = interview.getScheduledDateTime() != null
                ? interview.getScheduledDateTime()
                    .format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"))
                : "To be confirmed";

            emailService.sendInterviewScheduledEmail(
                seeker.getEmail(),
                seeker.getName(),
                app.getJobTitle(),
                app.getCompanyName(),
                formattedDateTime,
                interview.getMode(),
                interview.getMeetingLink(),
                interview.getVenue()
            );
        }

        // Send in-app notification
        if (seeker != null) {
            notificationService.create(seeker.getId(),
                "🎯 Interview Scheduled!",
                "Your interview for " + app.getJobTitle() + " at " + app.getCompanyName() + " has been scheduled.",
                "INTERVIEW", "/seeker/interviews");
        }
        return saved;
    }

    public List<Interview> getSeekerInterviews(String seekerId) {
        return interviewRepository.findBySeekerId(seekerId);
    }

    public List<Interview> getEmployerInterviews(String employerId) {
        return interviewRepository.findByEmployerId(employerId);
    }

    // Seeker marks interview as completed (joined meeting)
    public Interview markCompleted(String id, String seekerId) {
        Interview interview = interviewRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Interview not found"));

        // Verify this seeker owns the interview
        if (!interview.getSeekerId().equals(seekerId))
            throw new RuntimeException("Not authorized");

        // Mark interview as completed
        interview.setStatus("COMPLETED");
        Interview saved = interviewRepository.save(interview);

        // Update application status to INTERVIEW_COMPLETED
        applicationService.updateStatus(interview.getApplicationId(), "INTERVIEW_COMPLETED", null);

        // Notify employer that seeker attended
        User seeker = userRepository.findById(seekerId).orElse(null);
        if (seeker != null && interview.getEmployerId() != null) {
            notificationService.create(interview.getEmployerId(),
                "✅ " + seeker.getName() + " Attended the Interview!",
                seeker.getName() + " has joined and completed the interview for " + interview.getJobTitle() + ". You can now send the offer letter!",
                "INTERVIEW", "/employer/applications/" + interview.getJobId());
        }

        // Notify seeker confirmation
        if (seeker != null) {
            notificationService.create(seekerId,
                "✅ Interview Completed!",
                "Your interview for " + interview.getJobTitle() + " is marked as completed. Wait for employer's decision.",
                "INTERVIEW", "/seeker/interviews");
        }

        return saved;
    }

    public Interview updateInterview(String id, String status, String feedback, String result,
                                      String requestingUserId, boolean isAdmin) {
        Interview interview = interviewRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Interview not found"));

        // ─── Authorization: only the employer who owns this interview (or an admin) may update it ───
        if (!isAdmin && (interview.getEmployerId() == null
                || !interview.getEmployerId().equals(requestingUserId))) {
            throw new RuntimeException("You are not authorized to modify this interview.");
        }

        String previousStatus = interview.getStatus();
        if (status != null) interview.setStatus(status);
        if (feedback != null) interview.setFeedback(feedback);
        if (result != null) interview.setResult(result);
        Interview saved = interviewRepository.save(interview);

        // Notify seeker when employer cancels or reschedules interview
        if (status != null && !status.equals(previousStatus)) {
            User seeker = interview.getSeekerId() != null
                ? userRepository.findById(interview.getSeekerId()).orElse(null) : null;

            if ("CANCELLED".equals(status) && seeker != null) {
                notificationService.create(seeker.getId(),
                    "❌ Interview Cancelled",
                    "Your interview for " + interview.getJobTitle() + " has been cancelled by the employer. Please check with the employer for further information.",
                    "INTERVIEW", "/seeker/interviews");
                log.info("Notified seeker {} of interview cancellation", seeker.getId());
                try {
                    String company = jobRepository.findById(interview.getJobId())
                        .map(com.skillbridge.model.Job::getCompanyName).orElse("the company");
                    emailService.sendInterviewCancelledEmail(seeker.getEmail(), seeker.getName(),
                        interview.getJobTitle(), company);
                } catch (Exception ex) { log.warn("Cancel email failed: {}", ex.getMessage()); }
            }

            if ("RESCHEDULED".equals(status) && seeker != null) {
                notificationService.create(seeker.getId(),
                    "📅 Interview Rescheduled",
                    "Your interview for " + interview.getJobTitle() + " has been rescheduled. Please check My Interviews for the new details.",
                    "INTERVIEW", "/seeker/interviews");
                try {
                    String company = jobRepository.findById(interview.getJobId())
                        .map(com.skillbridge.model.Job::getCompanyName).orElse("the company");
                    String when = interview.getScheduledDateTime() != null
                        ? interview.getScheduledDateTime().toString() : "See portal";
                    emailService.sendInterviewRescheduledEmail(seeker.getEmail(), seeker.getName(),
                        interview.getJobTitle(), company, when, interview.getMode(), interview.getMeetingLink());
                } catch (Exception ex) { log.warn("Reschedule email failed: {}", ex.getMessage()); }
            }
        }

        return saved;
    }

    public List<Interview> getAllInterviews() {
        return interviewRepository.findAll();
    }
}