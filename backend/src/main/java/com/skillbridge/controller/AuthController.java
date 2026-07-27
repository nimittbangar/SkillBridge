package com.skillbridge.controller;

import com.skillbridge.dto.AuthDTOs;
import com.skillbridge.service.AuthService;
import com.skillbridge.service.RateLimiterService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final RateLimiterService rateLimiterService;

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody AuthDTOs.RegisterRequest request,
                                       HttpServletRequest httpRequest) {
        if (!rateLimiterService.allow("register:" + clientIp(httpRequest))) {
            return ResponseEntity.status(429).body("Too many attempts. Please wait a minute and try again.");
        }
        try {
            return ResponseEntity.ok(authService.register(request));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AuthDTOs.LoginRequest request,
                                    HttpServletRequest httpRequest) {
        if (!rateLimiterService.allow("login:" + clientIp(httpRequest))) {
            return ResponseEntity.status(429).body("Too many login attempts. Please wait a minute and try again.");
        }
        try {
            return ResponseEntity.ok(authService.login(request));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/verify-login-otp")
    public ResponseEntity<?> verifyLoginOtp(@RequestBody java.util.Map<String, String> body,
                                             HttpServletRequest httpRequest) {
        if (!rateLimiterService.allow("login-otp:" + clientIp(httpRequest))) {
            return ResponseEntity.status(429).body("Too many attempts. Please wait a minute and try again.");
        }
        try {
            return ResponseEntity.ok(authService.verifyLoginOtp(body.get("email"), body.get("otp")));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Turns a 400 validation failure (e.g. blank email) into the same plain-string
    // error format the frontend already expects, instead of a raw Spring error blob.
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
            .findFirst()
            .map(err -> err.getDefaultMessage())
            .orElse("Invalid request.");
        return ResponseEntity.badRequest().body(message);
    }
}