package com.skillbridge.service;

import com.skillbridge.model.Application;
import com.skillbridge.model.Job;
import com.skillbridge.model.Message;
import com.skillbridge.model.User;
import com.skillbridge.repository.JobRepository;
import com.skillbridge.repository.MessageRepository;
import com.skillbridge.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final ApplicationService applicationService;
    private final JobRepository jobRepository;
    private final NotificationService notificationService;

    /**
     * Confirms the requesting user is either the seeker who submitted this
     * application, or the employer who owns the job it was submitted to.
     * Throws if neither — this is what keeps one employer from reading
     * messages on another company's applications.
     */
    private void assertParticipant(Application app, Job job, User requestingUser) {
        boolean isAdmin = "ADMIN".equals(requestingUser.getRole());
        boolean isSeekerOwner = requestingUser.getId().equals(app.getSeekerId());
        boolean isEmployerOwner = job.getEmployerId() != null && job.getEmployerId().equals(requestingUser.getId());
        if (!isAdmin && !isSeekerOwner && !isEmployerOwner) {
            throw new RuntimeException("You are not authorized to view this conversation.");
        }
    }

    public List<Message> getThread(String applicationId, User requestingUser) {
        Application app = applicationService.getById(applicationId);
        Job job = jobRepository.findById(app.getJobId())
            .orElseThrow(() -> new RuntimeException("Job not found"));
        assertParticipant(app, job, requestingUser);

        List<Message> thread = messageRepository.findByApplicationIdOrderByCreatedAtAsc(applicationId);
        // Mark messages from the other participant as read now that this user has opened the thread
        thread.stream()
            .filter(m -> !m.getSenderId().equals(requestingUser.getId()) && !m.isReadByRecipient())
            .forEach(m -> { m.setReadByRecipient(true); messageRepository.save(m); });
        return thread;
    }

    public Message sendMessage(String applicationId, String content, User requestingUser) {
        if (content == null || content.isBlank()) {
            throw new RuntimeException("Message cannot be empty.");
        }
        if (content.length() > 2000) {
            throw new RuntimeException("Message is too long (max 2000 characters).");
        }

        Application app = applicationService.getById(applicationId);
        Job job = jobRepository.findById(app.getJobId())
            .orElseThrow(() -> new RuntimeException("Job not found"));
        assertParticipant(app, job, requestingUser);

        Message message = new Message();
        message.setApplicationId(applicationId);
        message.setSenderId(requestingUser.getId());
        message.setSenderName(requestingUser.getName());
        message.setSenderRole(requestingUser.getRole());
        message.setContent(content.trim());
        message.setCreatedAt(LocalDateTime.now());
        message.setReadByRecipient(false);
        Message saved = messageRepository.save(message);

        // Notify whichever participant didn't send this message
        boolean senderIsSeeker = requestingUser.getId().equals(app.getSeekerId());
        String recipientId = senderIsSeeker ? job.getEmployerId() : app.getSeekerId();
        String link = senderIsSeeker ? "/employer/applications/" + job.getId() : "/seeker/applications";
        if (recipientId != null) {
            notificationService.create(
                recipientId,
                "New message",
                requestingUser.getName() + " sent you a message about \"" + app.getJobTitle() + "\"",
                "MESSAGE",
                link
            );
        }

        return saved;
    }

    // ─── Pre-application inquiries (no Application exists yet) ───

    public List<Message> getJobThread(String jobId, String seekerId, User requestingUser) {
        Job job = jobRepository.findById(jobId).orElseThrow(() -> new RuntimeException("Job not found"));
        assertJobThreadParticipant(job, seekerId, requestingUser);
        List<Message> thread = messageRepository.findByJobIdAndSeekerIdOrderByCreatedAtAsc(jobId, seekerId);
        thread.stream()
            .filter(m -> !m.getSenderId().equals(requestingUser.getId()) && !m.isReadByRecipient())
            .forEach(m -> { m.setReadByRecipient(true); messageRepository.save(m); });
        return thread;
    }

    public Message sendJobMessage(String jobId, String seekerId, String content, User requestingUser) {
        if (content == null || content.isBlank()) {
            throw new RuntimeException("Message cannot be empty.");
        }
        if (content.length() > 2000) {
            throw new RuntimeException("Message is too long (max 2000 characters).");
        }
        Job job = jobRepository.findById(jobId).orElseThrow(() -> new RuntimeException("Job not found"));
        assertJobThreadParticipant(job, seekerId, requestingUser);

        Message message = new Message();
        message.setJobId(jobId);
        message.setSeekerId(seekerId);
        message.setSenderId(requestingUser.getId());
        message.setSenderName(requestingUser.getName());
        message.setSenderRole(requestingUser.getRole());
        message.setContent(content.trim());
        message.setCreatedAt(LocalDateTime.now());
        message.setReadByRecipient(false);
        Message saved = messageRepository.save(message);

        boolean senderIsSeeker = requestingUser.getId().equals(seekerId);
        String recipientId = senderIsSeeker ? job.getEmployerId() : seekerId;
        if (recipientId != null) {
            notificationService.create(
                recipientId,
                "New message",
                requestingUser.getName() + " sent you a message about \"" + job.getTitle() + "\"",
                "MESSAGE",
                senderIsSeeker ? "/employer/jobs" : "/jobs/" + jobId
            );
        }
        return saved;
    }

    // Lists the seekers who have an inquiry thread for this job — used to build the
    // employer's "Job Inquiries" inbox per job.
    public List<String> getInquirySeekerIds(String jobId, User requestingUser) {
        Job job = jobRepository.findById(jobId).orElseThrow(() -> new RuntimeException("Job not found"));
        boolean isAdmin = "ADMIN".equals(requestingUser.getRole());
        boolean isEmployerOwner = job.getEmployerId() != null && job.getEmployerId().equals(requestingUser.getId());
        if (!isAdmin && !isEmployerOwner) {
            throw new RuntimeException("You are not authorized to view inquiries for this job.");
        }
        return messageRepository.findByJobIdOrderByCreatedAtDesc(jobId).stream()
            .map(Message::getSeekerId)
            .filter(java.util.Objects::nonNull)
            .distinct()
            .toList();
    }

    private void assertJobThreadParticipant(Job job, String seekerId, User requestingUser) {
        boolean isAdmin = "ADMIN".equals(requestingUser.getRole());
        boolean isSeekerOwner = requestingUser.getId().equals(seekerId);
        boolean isEmployerOwner = job.getEmployerId() != null && job.getEmployerId().equals(requestingUser.getId());
        if (!isAdmin && !isSeekerOwner && !isEmployerOwner) {
            throw new RuntimeException("You are not authorized to view this conversation.");
        }
    }
}