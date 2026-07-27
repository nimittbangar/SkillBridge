package com.skillbridge.config;

import com.skillbridge.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final UserDetailsService userDetailsService;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/users/forgot-password", "/api/users/reset-password").permitAll()
                .requestMatchers("/api/jobs/search", "/api/jobs/all", "/api/jobs/{id}").permitAll()
                .requestMatchers("/api/skills/all").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/api/health").permitAll()
                .requestMatchers("/api/stats").permitAll()
                .anyRequest().authenticated()
            )
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @org.springframework.beans.factory.annotation.Value("${app.frontend-url:}")
    private String frontendUrl;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // Build the allowed-origins list defensively:
        // - FRONTEND_URL can be a single URL or a comma-separated list
        // - trailing slashes are stripped (a very common copy-paste mistake that would
        //   otherwise cause an exact-match failure and silently block the whole site)
        // - common local dev ports are always included so local testing never breaks
        java.util.List<String> origins = new java.util.ArrayList<>();
        if (frontendUrl != null && !frontendUrl.isBlank()) {
            for (String url : frontendUrl.split(",")) {
                String cleaned = url.trim();
                if (cleaned.endsWith("/")) cleaned = cleaned.substring(0, cleaned.length() - 1);
                if (!cleaned.isEmpty()) origins.add(cleaned);
            }
        }
        origins.add("http://localhost:5173");
        origins.add("http://localhost:3000");
        // Safety net so a single misconfigured FRONTEND_URL can't take the whole site
        // down — covers frontends hosted on Vercel or Render regardless of env var state.
        origins.add("https://*.vercel.app");
        origins.add("https://*.onrender.com");

        config.setAllowedOriginPatterns(origins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}