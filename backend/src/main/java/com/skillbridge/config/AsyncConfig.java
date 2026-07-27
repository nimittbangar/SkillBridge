package com.skillbridge.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

@Configuration
@EnableAsync
public class AsyncConfig {
    // Enables @Async annotation for EmailService
    // Emails are sent in background thread — app never blocks waiting for email
}
