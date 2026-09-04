package com.plagiarism.analyzer.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class CompareResponse {
    private boolean success;
    private String language;
    private int submissionCount;
    private long durationMs;
    private String generatedAt;
    private String message;
    private List<ComparisonRow> comparisons = new ArrayList<>();

    @Data
    public static class ComparisonRow {
        private Long leftSubmissionId;
        private String leftStudent;
        private String leftFileName;
        private Long rightSubmissionId;
        private String rightStudent;
        private String rightFileName;
        private double similarityPercent;
        private double maximalSimilarityPercent;
        private double minimalSimilarityPercent;
        private int matchedTokens;
    }
}

