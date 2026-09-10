package com.plagiarism.submission.repository;

import com.plagiarism.submission.model.Classroom;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ClassroomRepository extends JpaRepository<Classroom, Long> {
    List<Classroom> findAllByOrderByCreatedAtDesc();

    Optional<Classroom> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);
}
