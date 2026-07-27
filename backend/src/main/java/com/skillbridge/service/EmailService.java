package com.skillbridge.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class EmailService {

    @Value("${brevo.api.key}")
    private String brevoApiKey;

    @Value("${brevo.sender.email}")
    private String senderEmail;

    @Value("${brevo.sender.name}")
    private String senderName;

    @Value("${app.base-url:http://localhost:5173}")
    private String baseUrl;

    private static final String BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

    // ─── Core send method using Brevo HTTP API (no attachment) ───
    private void sendEmail(String to, String subject, String html) {
        sendEmail(to, subject, html, null, null);
    }

    // ─── Core send method using Brevo HTTP API (with optional PDF attachment) ───
    private void sendEmail(String to, String subject, String html,
                            byte[] attachmentBytes, String attachmentFilename) {
        try {
            if (brevoApiKey == null || brevoApiKey.isBlank()) {
                log.error("❌ Email not sent to {} — BREVO_API_KEY is not set", to);
                return;
            }

            RestTemplate restTemplate = new RestTemplate();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", brevoApiKey);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));

            Map<String, Object> sender = new HashMap<>();
            sender.put("name", senderName);
            sender.put("email", senderEmail);

            Map<String, Object> recipient = new HashMap<>();
            recipient.put("email", to);

            Map<String, Object> body = new HashMap<>();
            body.put("sender", sender);
            body.put("to", List.of(recipient));
            body.put("subject", subject);
            body.put("htmlContent", html);

            if (attachmentBytes != null && attachmentBytes.length > 0) {
                Map<String, Object> attachment = new HashMap<>();
                attachment.put("content", Base64.getEncoder().encodeToString(attachmentBytes));
                attachment.put("name", attachmentFilename != null ? attachmentFilename : "attachment.pdf");
                body.put("attachment", List.of(attachment));
            }

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(
                BREVO_ENDPOINT,
                request,
                String.class
            );

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("✅ Email sent to {} | Subject: {}", to, subject);
            } else {
                log.error("❌ Email failed ({}): {}", response.getStatusCode(), response.getBody());
            }
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            // Brevo returns 4xx with a JSON error body — log it so misconfig is obvious
            log.error("❌ Email error for {}: {} | Response: {}", to, e.getMessage(), e.getResponseBodyAsString());
        } catch (Exception e) {
            log.error("❌ Email error for {}: {}", to, e.getMessage());
        }
    }

    // ─── 1. OTP Email ───
    public void sendJobAlertEmail(String toEmail, String name, java.util.List<com.skillbridge.model.Job> matchingJobs) {
        StringBuilder jobListHtml = new StringBuilder();
        for (com.skillbridge.model.Job job : matchingJobs) {
            jobListHtml.append("<div style='padding:12px;border:1px solid #eee;border-radius:8px;margin-bottom:8px;'>")
                .append("<strong>").append(job.getTitle()).append("</strong> at ").append(job.getCompanyName())
                .append("<br><span style='color:#666;font-size:13px;'>")
                .append(job.getLocation() != null ? job.getLocation() : "Remote")
                .append("</span></div>");
        }
        String html = "<div style='font-family:sans-serif;max-width:560px;margin:0 auto;'>"
            + "<h2 style='color:#0A66C2;'>New jobs matching your alert 🔔</h2>"
            + "<p>Hi " + name + ", " + matchingJobs.size() + " new job(s) match one of your saved alerts:</p>"
            + jobListHtml
            + "<p style='margin-top:16px;'><a href='" + baseUrl + "/jobs' style='background:#0A66C2;color:#fff;padding:10px 20px;border-radius:20px;text-decoration:none;'>Browse Jobs</a></p>"
            + "</div>";
        sendEmail(toEmail, "🔔 " + matchingJobs.size() + " new job(s) match your alert", html);
    }

    public void sendOtpEmail(String toEmail, String name, String otp) {
        String subject = "Your SkillBridge Verification Code";
        sendEmail(toEmail, subject, buildOtpHtml(name, otp));
        log.info("OTP email triggered for: {}", toEmail);
    }

    // ─── 2. Application Confirmation ───
    public void sendApplicationConfirmationEmail(String toEmail, String seekerName,
                                                  String jobTitle, String companyName, int matchScore) {
        sendEmail(toEmail,
            "Application Received - " + jobTitle + " at " + companyName,
            buildApplicationHtml(seekerName, jobTitle, companyName, matchScore));
    }

    // ─── 3. Shortlist Email ───
    public void sendShortlistEmail(String toEmail, String seekerName,
                                    String jobTitle, String companyName) {
        sendEmail(toEmail,
            "🎉 You're Shortlisted for " + jobTitle + " at " + companyName,
            buildShortlistHtml(seekerName, jobTitle, companyName));
    }

    // ─── 4. Interview Scheduled ───
    public void sendInterviewScheduledEmail(String toEmail, String seekerName,
                                             String jobTitle, String companyName,
                                             String scheduledDateTime, String mode,
                                             String meetingLink, String venue) {
        sendEmail(toEmail,
            "Interview Scheduled - " + jobTitle + " at " + companyName,
            buildInterviewHtml(seekerName, jobTitle, companyName,
                scheduledDateTime, mode, meetingLink, venue));
    }

    // ─── 5. Offer Letter Email (with real PDF attachment) ───
    public void sendOfferLetterEmail(String toEmail, String seekerName,
                                      String jobTitle, String companyName,
                                      String companyWebsite, String employerName,
                                      double minSalary, double maxSalary,
                                      String jobType, boolean remote,
                                      String employerNote, byte[] offerLetterPdf) {
        String filename = "OfferLetter_" + seekerName.replace(" ", "_") + ".pdf";
        sendEmail(toEmail,
            "🎉 Job Offer Received - " + jobTitle + " at " + companyName,
            buildOfferHtml(seekerName, jobTitle, companyName, employerNote),
            offerLetterPdf, filename);
    }

    // ─── HTML Templates ───

    private String buildOtpHtml(String name, String otp) {
        return template("#0A66C2", "Verification Code", name,
            "<p style='color:#444'>Your One-Time Password (OTP) for verifying your " +
            "SkillBridge account is:</p>" +
            "<div style='text-align:center;margin:24px 0'>" +
            "<div style='display:inline-block;background:#EEF3F8;border:2px dashed #0A66C2;" +
            "border-radius:12px;padding:20px 40px'>" +
            "<div style='font-size:36px;font-weight:700;letter-spacing:8px;color:#0A66C2'>" + otp + "</div>" +
            "<div style='color:#666;font-size:12px;margin-top:8px'>Valid for 10 minutes only</div>" +
            "</div></div>" +
            "<div style='background:#FEF3C7;border-radius:8px;padding:12px;border:1px solid #FCD34D'>" +
            "<strong style='color:#92400e'>Please do not share this OTP with anyone. " +
            "SkillBridge will never ask you to share your verification code.</strong></div>",
            "/login", "Go to Login", "#0A66C2");
    }

    private String buildApplicationHtml(String name, String job, String company, int score) {
        String scoreColor = score>=70?"#057642":score>=40?"#d97706":"#dc3545";
        return template("#0A66C2", "Application Received", name,
            "<p>Thank you for applying for the " + job + " position at " + company +
            " through SkillBridge. We have successfully received your application and your " +
            "profile is now under review by the employer.</p>" +
            "<div style='background:#EEF3F8;border-radius:10px;padding:20px;margin:16px 0;" +
            "border-left:4px solid #0A66C2'>" +
            "<p style='margin:6px 0'><strong>Job Title:</strong> " + job + "</p>" +
            "<p style='margin:6px 0'><strong>Company:</strong> " + company + "</p>" +
            "<p style='margin:6px 0'><strong>Application Status:</strong> " +
            "<span style='color:#0A66C2;font-weight:700'>Applied</span></p>" +
            "<p style='margin:6px 0'><strong>Skill Match:</strong> " +
            "<span style='color:" + scoreColor + ";font-size:20px;font-weight:700'>" + score + "%</span></p>" +
            "</div>" +
            "<p style='color:#666'>The employer will review your application and update the status " +
            "if your profile is shortlisted for the next stage. You can track your application " +
            "anytime from your SkillBridge dashboard.</p>",
            "/seeker/applications", "Track Application", "#0A66C2");
    }

    private String buildShortlistHtml(String name, String job, String company) {
        return template("#0ea5e9", "You're Shortlisted!", name,
            "<p>Great news! Your application for the " + job + " position at " + company +
            " has been shortlisted by the employer.</p>" +
            "<div style='background:#E0F2FE;border-radius:10px;padding:20px;margin:16px 0;" +
            "border-left:4px solid #0ea5e9'>" +
            "<p style='margin:6px 0'><strong>Job Title:</strong> " + job + "</p>" +
            "<p style='margin:6px 0'><strong>Company:</strong> " + company + "</p>" +
            "<p style='margin:6px 0'><strong>Application Status:</strong> " +
            "<span style='color:#0ea5e9;font-weight:700'>Shortlisted</span></p></div>" +
            "<p style='color:#666'>Your profile has successfully passed the initial screening stage. " +
            "The employer may contact you with further information regarding the next stage. " +
            "Please keep checking your SkillBridge dashboard and email for updates.</p>",
            "/seeker/applications", "View Application", "#0ea5e9");
    }

    private String buildInterviewHtml(String name, String job, String company,
                                       String dateTime, String mode,
                                       String link, String venue) {
        String meetingSection = "";
        if (link != null && !link.isEmpty())
            meetingSection += "<p style='margin:6px 0'><strong>Meeting Link:</strong> " +
                "<a href='" + link + "' style='color:#0A66C2'>" + link + "</a></p>";
        if (venue != null && !venue.isEmpty())
            meetingSection += "<p style='margin:6px 0'><strong>Venue:</strong> " + venue + "</p>";

        return template("#0A66C2", "Interview Scheduled", name,
            "<p>Congratulations! The employer has scheduled an interview for your application " +
            "for the " + job + " position at " + company + ".</p>" +
            "<div style='background:#EEF3F8;border-radius:10px;padding:20px;margin:16px 0;" +
            "border-left:4px solid #0A66C2'>" +
            "<p style='margin:6px 0'><strong>Position:</strong> " + job + "</p>" +
            "<p style='margin:6px 0'><strong>Company:</strong> " + company + "</p>" +
            "<p style='margin:6px 0'><strong>Date & Time:</strong> " +
            "<span style='color:#0A66C2;font-weight:700'>" + dateTime + "</span></p>" +
            "<p style='margin:6px 0'><strong>Interview Type:</strong> " + mode + "</p>" +
            meetingSection + "</div>" +
            "<div style='background:#FEF3C7;border-radius:8px;padding:14px;" +
            "margin:12px 0;border:1px solid #FCD34D'>" +
            "<strong style='color:#92400e'>Please make sure you are available at the scheduled time " +
            "and join using the provided link. We wish you the very best!</strong></div>",
            "/seeker/interviews", "View Interview Details", "#0A66C2");
    }

    private String buildOfferHtml(String name, String job, String company, String note) {
        String noteSection = (note != null && !note.isEmpty())
            ? "<div style='background:#EEF3F8;border-radius:8px;padding:14px;margin:12px 0'>" +
              "<strong style='color:#0A66C2'>Message from Employer:</strong><br>" +
              "<em style='color:#333'>" + note + "</em></div>"
            : "";
        return template("#057642", "🎉 Job Offer Received", name,
            "<p>Congratulations! We are pleased to inform you that " + company +
            " has extended a job offer to you for the " + job + " position.</p>" +
            "<div style='background:#D1FAE5;border-radius:10px;padding:20px;margin:16px 0;" +
            "border-left:4px solid #057642'>" +
            "<p style='margin:6px 0'><strong>Position:</strong> " +
            "<span style='color:#057642;font-weight:700;font-size:16px'>" + job + "</span></p>" +
            "<p style='margin:6px 0'><strong>Company:</strong> " + company + "</p>" +
            "<p style='margin:6px 0'><strong>Offer Status:</strong> " +
            "<span style='color:#d97706;font-weight:700'>Pending Your Response</span></p></div>" +
            noteSection +
            "<p style='color:#666'>Please log in to your SkillBridge account and go to " +
            "<strong>My Offers</strong> to review the complete offer details and choose whether " +
            "to accept or decline. Please respond within the specified deadline.</p>",
            "/seeker/offers", "View My Offers", "#057642");
    }

    private String template(String color, String heading, String name,
                             String content, String ctaPath,
                             String ctaLabel, String ctaColor) {
        return "<!DOCTYPE html><html><body style='margin:0;padding:20px;" +
            "background:#f3f2ef;font-family:Arial,sans-serif'>" +
            "<div style='max-width:600px;margin:auto;background:#fff;border-radius:12px;" +
            "overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1)'>" +
            "<div style='background:" + color + ";padding:28px 32px;text-align:center'>" +
            "<h2 style='color:#fff;margin:0 0 6px;font-size:22px'>" + heading + "</h2>" +
            "<p style='color:rgba(255,255,255,0.85);margin:0;font-size:13px'>" +
            "SkillBridge — Remote Job Portal</p></div>" +
            "<div style='padding:28px 32px'>" +
            "<p style='font-size:15px;color:#191919;margin-bottom:12px'>Dear <strong>" +
            name + "</strong>,</p>" +
            content +
            "<div style='text-align:center;margin:24px 0'>" +
            "<a href='" + baseUrl + ctaPath + "' style='background:" + ctaColor +
            ";color:#fff;padding:13px 32px;border-radius:25px;text-decoration:none;" +
            "font-weight:bold;font-size:14px;display:inline-block'>" + ctaLabel + "</a></div>" +
            "<p style='color:" + ctaColor + ";font-weight:bold;margin-top:24px'>" +
            "Team SkillBridge</p></div>" +
            "<div style='background:#f8f9fa;padding:14px;text-align:center;" +
            "border-top:1px solid #e2e8f0'>" +
            "<p style='margin:0;color:#999;font-size:11px'>" +
            "SkillBridge — CDAC PGCP-AC-002 | C-DAC Bangalore 2026</p>" +
            "</div></div></body></html>";
    }

    // ─── 6. Offer Accepted (to seeker) ───
    public void sendOfferAcceptedEmail(String toEmail, String seekerName,
                                        String jobTitle, String companyName) {
        sendEmail(toEmail,
            "Offer Accepted - " + jobTitle + " at " + companyName,
            template("#057642", "Offer Accepted", seekerName,
                "<p>Your acceptance of the job offer has been successfully recorded.</p>" +
                "<div style='background:#D1FAE5;border-radius:10px;padding:20px;margin:16px 0;" +
                "border-left:4px solid #057642'>" +
                "<p style='margin:6px 0'><strong>Company:</strong> " + companyName + "</p>" +
                "<p style='margin:6px 0'><strong>Position:</strong> " + jobTitle + "</p>" +
                "<p style='margin:6px 0'><strong>Status:</strong> " +
                "<span style='color:#057642;font-weight:700'>Accepted</span></p></div>" +
                "<p style='color:#666'>Please follow any further instructions from the employer " +
                "regarding your joining process. We wish you great success in your new role!</p>",
                "/seeker/offers", "View Offer", "#057642"));
    }

    // ─── 7. Offer Declined (to seeker) ───
    public void sendOfferDeclinedEmail(String toEmail, String seekerName,
                                        String jobTitle, String companyName) {
        sendEmail(toEmail,
            "Offer Declined - " + jobTitle + " at " + companyName,
            template("#6c757d", "Offer Declined", seekerName,
                "<p>This confirms that your decision to decline the job offer has been recorded.</p>" +
                "<div style='background:#F1F5F9;border-radius:10px;padding:20px;margin:16px 0;" +
                "border-left:4px solid #6c757d'>" +
                "<p style='margin:6px 0'><strong>Company:</strong> " + companyName + "</p>" +
                "<p style='margin:6px 0'><strong>Position:</strong> " + jobTitle + "</p>" +
                "<p style='margin:6px 0'><strong>Status:</strong> " +
                "<span style='color:#6c757d;font-weight:700'>Declined</span></p></div>" +
                "<p style='color:#666'>Thank you for using SkillBridge. We wish you all the best " +
                "in your future career opportunities.</p>",
                "/jobs", "Explore More Jobs", "#0A66C2"));
    }

    // ─── 8. Application Rejected / Not Selected (to seeker) ───
    public void sendRejectionEmail(String toEmail, String seekerName,
                                    String jobTitle, String companyName) {
        sendEmail(toEmail,
            "Application Update - " + jobTitle + " at " + companyName,
            template("#dc3545", "Application Update", seekerName,
                "<p>Thank you for your interest in the " + jobTitle + " position at " +
                companyName + ".</p>" +
                "<div style='background:#FEF2F2;border-radius:10px;padding:20px;margin:16px 0;" +
                "border-left:4px solid #dc3545'>" +
                "<p style='margin:6px 0'><strong>Company:</strong> " + companyName + "</p>" +
                "<p style='margin:6px 0'><strong>Position:</strong> " + jobTitle + "</p>" +
                "<p style='margin:6px 0'><strong>Status:</strong> " +
                "<span style='color:#dc3545;font-weight:700'>Not Selected</span></p></div>" +
                "<p style='color:#666'>After careful consideration, the employer has decided not to " +
                "proceed with your application at this time. Please continue exploring other " +
                "opportunities on SkillBridge that match your skills.</p>",
                "/jobs", "Explore More Jobs", "#0A66C2"));
    }

    // ─── 9. Password Changed Confirmation ───
    public void sendPasswordChangedEmail(String toEmail, String userName) {
        sendEmail(toEmail,
            "Password Changed Successfully - SkillBridge",
            template("#123160", "Password Changed", userName,
                "<p>Your SkillBridge account password has been successfully changed.</p>" +
                "<div style='background:#EEF3F8;border-radius:10px;padding:20px;margin:16px 0;" +
                "border-left:4px solid #123160'>" +
                "<p style='margin:6px 0'><strong>Email:</strong> " + toEmail + "</p>" +
                "<p style='margin:6px 0'><strong>Account:</strong> SkillBridge</p></div>" +
                "<p style='color:#666'>If you made this change, no further action is required. " +
                "If you did <strong>not</strong> change your password, please secure your account " +
                "immediately and contact support.</p>",
                "/login", "Go to Login", "#123160"));
    }

    // ─── 10. Password Reset OTP ───
    public void sendPasswordResetOtpEmail(String toEmail, String userName, String otp) {        sendEmail(toEmail,
            "Password Reset Code - SkillBridge",
            template("#123160", "Password Reset Code", userName,
                "<p>We received a request to reset the password for your SkillBridge account.</p>" +
                "<div style='background:#EEF3F8;border-radius:10px;padding:24px;margin:16px 0;" +
                "border-left:4px solid #123160;text-align:center'>" +
                "<p style='margin:0 0 8px;color:#666'>Your password reset OTP is:</p>" +
                "<p style='margin:0;font-size:32px;font-weight:800;letter-spacing:6px;color:#123160'>" +
                otp + "</p></div>" +
                "<p style='color:#666'>This OTP is valid for 10 minutes. If you did not request a " +
                "password reset, please ignore this email — your password will remain unchanged. " +
                "<strong>Never share this code with anyone.</strong></p>",
                "/forgot-password", "Reset Password", "#123160"));
    }

    // ─── 11. Application Withdrawn (to seeker) ───
    public void sendWithdrawalEmail(String toEmail, String seekerName,
                                     String jobTitle, String companyName) {        sendEmail(toEmail,
            "Application Withdrawn - " + jobTitle + " at " + companyName,
            template("#6c757d", "Application Withdrawn", seekerName,
                "<p>This email confirms that your application for the " + jobTitle +
                " position at " + companyName + " has been successfully withdrawn.</p>" +
                "<div style='background:#F1F5F9;border-radius:10px;padding:20px;margin:16px 0;" +
                "border-left:4px solid #6c757d'>" +
                "<p style='margin:6px 0'><strong>Position:</strong> " + jobTitle + "</p>" +
                "<p style='margin:6px 0'><strong>Company:</strong> " + companyName + "</p>" +
                "<p style='margin:6px 0'><strong>Status:</strong> " +
                "<span style='color:#6c757d;font-weight:700'>Withdrawn</span></p></div>" +
                "<p style='color:#666'>No further action is required regarding this application. " +
                "You can continue exploring and applying for other opportunities on SkillBridge.</p>",
                "/jobs", "Explore More Jobs", "#0A66C2"));
    }

    // ─── 12. Interview Cancelled (to seeker) ───
    public void sendInterviewCancelledEmail(String toEmail, String seekerName,
                                             String jobTitle, String companyName) {
        sendEmail(toEmail,
            "Interview Cancelled - " + jobTitle + " at " + companyName,
            template("#dc3545", "Interview Cancelled", seekerName,
                "<p>We would like to inform you that the interview scheduled for the " + jobTitle +
                " position at " + companyName + " has been cancelled.</p>" +
                "<div style='background:#FEF2F2;border-radius:10px;padding:20px;margin:16px 0;" +
                "border-left:4px solid #dc3545'>" +
                "<p style='margin:6px 0'><strong>Position:</strong> " + jobTitle + "</p>" +
                "<p style='margin:6px 0'><strong>Company:</strong> " + companyName + "</p>" +
                "<p style='margin:6px 0'><strong>Status:</strong> " +
                "<span style='color:#dc3545;font-weight:700'>Interview Cancelled</span></p></div>" +
                "<p style='color:#666'>If the employer schedules another interview, you will receive " +
                "a new notification through SkillBridge. We apologise for any inconvenience caused.</p>",
                "/seeker/interviews", "View Interviews", "#0A66C2"));
    }

    // ─── 13. Interview Rescheduled (to seeker) ───
    public void sendInterviewRescheduledEmail(String toEmail, String seekerName,
                                               String jobTitle, String companyName,
                                               String newDateTime, String mode,
                                               String meetingLink) {
        String meetingSection = (meetingLink != null && !meetingLink.isEmpty())
            ? "<p style='margin:6px 0'><strong>Meeting Link:</strong> " +
              "<a href='" + meetingLink + "' style='color:#0A66C2'>" + meetingLink + "</a></p>"
            : "";
        sendEmail(toEmail,
            "Interview Rescheduled - " + jobTitle + " at " + companyName,
            template("#d97706", "Interview Rescheduled", seekerName,
                "<p>Please be informed that your interview for the " + jobTitle +
                " position at " + companyName + " has been rescheduled.</p>" +
                "<div style='background:#FEF3C7;border-radius:10px;padding:20px;margin:16px 0;" +
                "border-left:4px solid #d97706'>" +
                "<p style='margin:6px 0'><strong>Position:</strong> " + jobTitle + "</p>" +
                "<p style='margin:6px 0'><strong>Company:</strong> " + companyName + "</p>" +
                "<p style='margin:6px 0'><strong>New Date & Time:</strong> " +
                "<span style='font-weight:700'>" + newDateTime + "</span></p>" +
                "<p style='margin:6px 0'><strong>Interview Type:</strong> " + mode + "</p>" +
                meetingSection + "</div>" +
                "<p style='color:#666'>Please take note of the updated schedule and ensure your " +
                "availability.</p>",
                "/seeker/interviews", "View Interview Details", "#0A66C2"));
    }
}