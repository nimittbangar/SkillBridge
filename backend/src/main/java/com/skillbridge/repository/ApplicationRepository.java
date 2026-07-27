package com.skillbridge.repository;

import com.skillbridge.model.Application;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ApplicationRepository extends JpaRepository<Application, String> {
    List<Application> findBySeekerId(String seekerId);
    List<Application> findByJobId(String jobId);
    Optional<Application> findBySeekerIdAndJobId(String seekerId, String jobId);
    long countByJobId(String jobId);
}
