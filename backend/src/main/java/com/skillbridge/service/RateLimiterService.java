package com.skillbridge.service;

import org.springframework.stereotype.Service;

import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

/**
 * Simple in-memory fixed-window rate limiter, keyed by client IP.
 * Used to slow down brute-force login/register attempts.
 *
 * Note: this is in-memory and per-instance. If you ever run multiple backend
 * instances behind a load balancer, this won't share state between them —
 * fine for a single Render web service, not sufficient for a multi-instance
 * production deployment (which would need a shared store like Redis).
 */
@Service
public class RateLimiterService {

    private static final int MAX_ATTEMPTS = 10;
    private static final long WINDOW_MILLIS = 60 * 1000; // 1 minute

    private final ConcurrentHashMap<String, Deque<Long>> attempts = new ConcurrentHashMap<>();

    /**
     * @param key typically "login:" + ip or "register:" + ip
     * @return true if this attempt is allowed, false if the caller should be blocked
     */
    public boolean allow(String key) {
        long now = System.currentTimeMillis();
        Deque<Long> timestamps = attempts.computeIfAbsent(key, k -> new ConcurrentLinkedDeque<>());

        // Drop timestamps outside the current window
        while (!timestamps.isEmpty() && now - timestamps.peekFirst() > WINDOW_MILLIS) {
            timestamps.pollFirst();
        }

        if (timestamps.size() >= MAX_ATTEMPTS) {
            return false;
        }
        timestamps.addLast(now);
        return true;
    }
}