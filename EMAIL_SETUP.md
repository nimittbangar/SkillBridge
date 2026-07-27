# SkillBridge Email Setup Guide

## Step 1 — Create Gmail Account for SkillBridge
Create a new Gmail: skillbridge.cdac@gmail.com (or use your own)

## Step 2 — Enable 2-Step Verification
1. Go to myaccount.google.com
2. Click Security
3. Turn ON 2-Step Verification

## Step 3 — Generate App Password
1. Go to myaccount.google.com/apppasswords
2. Select app: Mail
3. Select device: Other → type "SkillBridge"
4. Click Generate
5. Copy the 16-digit password (example: abcd efgh ijkl mnop)

## Step 4 — Update application.properties
Open: skillbridge/backend/src/main/resources/application.properties

Change these two lines:
```
spring.mail.username=skillbridge.cdac@gmail.com
spring.mail.password=abcdefghijklmnop
```
(paste your 16-digit password WITHOUT spaces)

## Step 5 — Restart Backend
```bash
mvn spring-boot:run
```

## Emails Sent Automatically:
| Event | Email Sent To | Content |
|-------|--------------|---------|
| Seeker applies | Seeker | Application confirmation + match score |
| Employer shortlists | Seeker | Shortlist notification |
| Employer schedules interview | Seeker | Interview details + meeting link + date/time |
| Employer makes offer | Seeker | Offer letter with Accept/Decline link |

## Testing Email (Without Gmail Setup)
If you don't want to set up Gmail yet, the app still works perfectly.
Email failures are caught silently — the app never crashes.
You will see a log message: "Failed to send email to..."

## For CDAC Demo
Recommended: Set up Gmail with app password before demo.
This makes a great impression showing real email notifications!
