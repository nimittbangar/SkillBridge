package com.skillbridge.repository;

import com.skillbridge.model.Resume;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ResumeRepository extends JpaRepository<Resume, String> {
    List<Resume> findByUserIdOrderByUploadedAtDesc(String userId);
    Optional<Resume> findByUserIdAndIsPrimaryTrue(String userId);
    long countByUserId(String userId);
}