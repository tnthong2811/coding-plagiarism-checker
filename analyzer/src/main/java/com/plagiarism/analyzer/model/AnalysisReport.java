package com.plagiarism.analyzer.model;

import com.plagiarism.analyzer.dto.CompareResponse;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Document(collection = "analysis_reports")
@Getter
@Setter
public class AnalysisReport {

    @Id
    private String id;

    private Long assignmentId;

    private boolean success;

    private String language;

    private int submissionCount;

    private long durationMs;

    private String generatedAt;

    private String requestedBy;

    private String message;

    private List<CompareResponse.ComparedSubmissionSource> sources = new ArrayList<>();

    private List<CompareResponse.ComparisonRow> comparisons = new ArrayList<>();

    public static AnalysisReport from(CompareResponse response, String requestedBy) {
        AnalysisReport report = new AnalysisReport();
        report.setAssignmentId(response.getAssignmentId());
        report.setSuccess(response.isSuccess());
        report.setLanguage(response.getLanguage());
        report.setSubmissionCount(response.getSubmissionCount());
        report.setDurationMs(response.getDurationMs());
        report.setGeneratedAt(response.getGeneratedAt());
        report.setRequestedBy(requestedBy);
        report.setMessage(response.getMessage());
        report.setSources(response.getSources());
        report.setComparisons(response.getComparisons());
        return report;
    }

    public CompareResponse toCompareResponse() {
        CompareResponse response = new CompareResponse();
        response.setReportId(id);
        response.setAssignmentId(assignmentId);
        response.setSuccess(success);
        response.setLanguage(language);
        response.setSubmissionCount(submissionCount);
        response.setDurationMs(durationMs);
        response.setGeneratedAt(generatedAt);
        response.setMessage(message);
        response.setSources(sources == null ? List.of() : sources);
        response.setComparisons(comparisons == null ? List.of() : comparisons);
        return response;
    }
}
