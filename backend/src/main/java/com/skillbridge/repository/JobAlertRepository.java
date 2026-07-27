package com.skillbridge.repository;

import com.skillbridge.model.JobAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface JobAlertRepository extends JpaRepository<JobAlert, String> {
    List<JobAlert> findByUserId(String userId);
    long countByUserId(String userId);
}