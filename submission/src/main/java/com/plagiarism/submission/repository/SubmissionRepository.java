package com.plagiarism.submission.repository;

import com.plagiarism.submission.model.Submission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SubmissionRepository extends JpaRepository<Submission, Long> {
    List<Submission> findBySubmittedByOrderByCreatedAtDesc(String submittedBy);

    List<Submission> findByAssignment_IdAndSubmittedByOrderByCreatedAtDesc(Long assignmentId, String submittedBy);

    List<Submission> findByAssignment_IdOrderByCreatedAtDesc(Long assignmentId);

    List<Submission> findAllByOrderByCreatedAtDesc();
}

