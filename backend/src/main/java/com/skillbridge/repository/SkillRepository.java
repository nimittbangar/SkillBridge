package com.skillbridge.repository;

import com.skillbridge.model.Skill;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SkillRepository extends JpaRepository<Skill, String> {
    Optional<Skill> findByNameIgnoreCase(String name);
    List<Skill> findByVerified(boolean verified);
    long countByVerified(boolean verified);
    List<Skill> findByCategory(String category);
}