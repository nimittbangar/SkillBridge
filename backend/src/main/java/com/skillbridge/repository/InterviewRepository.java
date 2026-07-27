package com.skillbridge.repository;

import com.skillbridge.model.Interview;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface InterviewRepository extends JpaRepository<Interview, String> {
    List<Interview> findBySeekerId(String seekerId);
    List<Interview> findByEmployerId(String employerId);
    List<Interview> findByApplicationId(String applicationId);
}
