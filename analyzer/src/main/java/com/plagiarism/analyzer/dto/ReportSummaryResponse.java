package com.plagiarism.analyzer.dto;

import com.plagiarism.analyzer.model.AnalysisReport;
import lombok.Data;

@Data
public class ReportSummaryResponse {
    private String id;
    private Long assignmentId;
    private String language;
    private int submissionCount;
    private int comparisonCount;
    private double maxSimilarityPercent;
    private long durationMs;
    private String generatedAt;
    private String requestedBy;
    private String message;

    public static ReportSummaryResponse from(AnalysisReport report) {
        ReportSummaryResponse response = new ReportSummaryResponse();
        response.setId(report.getId());
        response.setAssignmentId(report.getAssignmentId());
        response.setLanguage(report.getLanguage());
        response.setSubmissionCount(report.getSubmissionCount());
        response.setComparisonCount(report.getComparisons() == null ? 0 : report.getComparisons().size());
        response.setMaxSimilarityPercent(maxSimilarityPercent(report));
        response.setDurationMs(report.getDurationMs());
        response.setGeneratedAt(report.getGeneratedAt());
        response.setRequestedBy(report.getRequestedBy());
        response.setMessage(report.getMessage());
        return response;
    }

    private static double maxSimilarityPercent(AnalysisReport report) {
        if (report.getComparisons() == null || report.getComparisons().isEmpty()) {
            return 0;
        }

        return report.getComparisons().stream()
                .mapToDouble(CompareResponse.ComparisonRow::getSimilarityPercent)
                .max()
                .orElse(0);
    }
}
