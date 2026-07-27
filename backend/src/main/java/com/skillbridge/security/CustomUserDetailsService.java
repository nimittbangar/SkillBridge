package com.skillbridge.security;

import com.skillbridge.model.User;
import com.skillbridge.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        // ─── Handle both BCrypt and plain text passwords ───
        // Spring Security needs a valid password for JWT filter validation
        String password = user.getPassword();
        if (password == null) password = "";

        // If plain text, wrap it so Spring Security doesn't throw error
        // The actual login validation is done in AuthService
        if (!password.startsWith("$2a$") && !password.startsWith("$2b$") && !password.isEmpty()) {
            // Plain text password - encode it for Spring Security's internal use
            // (AuthService handles the actual comparison)
            password = "{noop}" + password;
        }

        return new org.springframework.security.core.userdetails.User(
            user.getEmail(),
            password,
            user.isActive(),  // enabled
            true,             // accountNonExpired
            true,             // credentialsNonExpired
            true,             // accountNonLocked
            List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole()))
        );
    }
}
