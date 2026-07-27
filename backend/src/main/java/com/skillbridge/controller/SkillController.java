package com.skillbridge.controller;

import com.skillbridge.model.Skill;
import com.skillbridge.model.User;
import com.skillbridge.repository.UserRepository;
import com.skillbridge.service.SkillService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/skills")
@RequiredArgsConstructor
public class SkillController {

    private final SkillService skillService;
    private final UserRepository userRepository;

    @GetMapping("/all")
    public ResponseEntity<List<Skill>> getAllSkills() {
        return ResponseEntity.ok(skillService.getAllSkills());
    }

    @GetMapping("/verified")
    public ResponseEntity<List<Skill>> getVerifiedSkills() {
        return ResponseEntity.ok(skillService.getVerifiedSkills());
    }

    @PostMapping("/add")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Skill> addSkill(@RequestBody Skill skill) {
        return ResponseEntity.ok(skillService.addSkill(skill));
    }

    @PutMapping("/{id}/verify")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Skill> verifySkill(@PathVariable String id) {
        return ResponseEntity.ok(skillService.verifySkill(id));
    }

    @PutMapping("/verify-user-skill")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<User> verifyUserSkill(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(skillService.verifyUserSkill(body.get("userId"), body.get("skillName")));
    }

    @PutMapping("/update-my-skills")
    @PreAuthorize("hasRole('SEEKER')")
    public ResponseEntity<?> updateMySkills(@RequestBody Map<String, List<String>> body, Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
            return ResponseEntity.ok(skillService.updateUserSkills(user.getId(), body.get("skills")));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
