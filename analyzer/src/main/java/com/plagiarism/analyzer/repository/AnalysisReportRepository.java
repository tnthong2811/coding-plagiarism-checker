package com.plagiarism.analyzer.repository;

import com.plagiarism.analyzer.model.AnalysisReport;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface AnalysisReportRepository extends MongoRepository<AnalysisReport, String> {
    List<AnalysisReport> findAllByOrderByGeneratedAtDesc();

    List<AnalysisReport> findByAssignmentIdOrderByGeneratedAtDesc(Long assignmentId);
}
