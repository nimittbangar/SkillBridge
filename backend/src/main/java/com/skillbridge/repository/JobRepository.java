package com.skillbridge.repository;

import com.skillbridge.model.Job;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface JobRepository extends JpaRepository<Job, String> {
    List<Job> findByEmployerId(String employerId);
    List<Job> findByStatus(String status);

    // ─── Admin verification finders ───
    // Only verified jobs are shown to seekers; pending (unverified) jobs are what the admin reviews.
    List<Job> findByStatusAndVerified(String status, boolean verified);
    List<Job> findByVerified(boolean verified);
    long countByStatusAndVerified(String status, boolean verified);

    @Query("SELECT j FROM Job j WHERE j.status = 'OPEN' AND j.verified = true AND " +
           "(:keyword IS NULL OR LOWER(j.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(j.description) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND " +
           "(:remote IS NULL OR j.remote = :remote) AND " +
           "(:experienceLevel IS NULL OR j.experienceLevel = :experienceLevel) AND " +
           "(:minSalary IS NULL OR j.maxSalary >= :minSalary) AND " +
           "(:maxSalary IS NULL OR j.minSalary <= :maxSalary)")
    List<Job> searchJobs(@Param("keyword") String keyword,
                         @Param("remote") Boolean remote,
                         @Param("experienceLevel") String experienceLevel,
                         @Param("minSalary") Double minSalary,
                         @Param("maxSalary") Double maxSalary);

    // Same filters as searchJobs, but paginated — used by the job-browsing page so it
    // doesn't have to fetch every open job in one response as the dataset grows.
    @Query("SELECT j FROM Job j WHERE j.status = 'OPEN' AND j.verified = true AND " +
           "(:keyword IS NULL OR LOWER(j.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(j.description) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND " +
           "(:remote IS NULL OR j.remote = :remote) AND " +
           "(:experienceLevel IS NULL OR j.experienceLevel = :experienceLevel) AND " +
           "(:minSalary IS NULL OR j.maxSalary >= :minSalary) AND " +
           "(:maxSalary IS NULL OR j.minSalary <= :maxSalary)")
    Page<Job> searchJobsPaged(@Param("keyword") String keyword,
                               @Param("remote") Boolean remote,
                               @Param("experienceLevel") String experienceLevel,
                               @Param("minSalary") Double minSalary,
                               @Param("maxSalary") Double maxSalary,
                               Pageable pageable);
}