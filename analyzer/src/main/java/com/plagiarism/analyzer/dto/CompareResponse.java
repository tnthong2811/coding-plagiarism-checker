package com.plagiarism.analyzer.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class CompareResponse {
    private String reportId;
    private boolean success;
    private Long assignmentId;
    private String language;
    private int submissionCount;
    private long durationMs;
    private String generatedAt;
    private String message;
    private List<ComparedSubmissionSource> sources = new ArrayList<>();
    private List<ComparisonRow> comparisons = new ArrayList<>();

    @Data
    public static class ComparedSubmissionSource {
        private String submissionName;
        private Long submissionId;
        private String submittedBy;
        private String originalFileName;
        private List<SourceFile> sourceFiles = new ArrayList<>();
    }

    @Data
    public static class SourceFile {
        private String path;
        private String fileName;
        private String content;
        private int lineCount;
    }

    @Data
    public static class ComparisonRow {
        private String leftSubmissionName;
        private Long leftSubmissionId;
        private String leftStudent;
        private String leftFileName;
        private String rightSubmissionName;
        private Long rightSubmissionId;
        private String rightStudent;
        private String rightFileName;
        private double similarityPercent;
        private double maximalSimilarityPercent;
        private double minimalSimilarityPercent;
        private int matchedTokens;
        private List<MatchSegment> matches = new ArrayList<>();
    }

    @Data
    public static class MatchSegment {
        private int matchIndex;
        private int matchedTokens;
        private List<SourceRange> leftRanges = new ArrayList<>();
        private List<SourceRange> rightRanges = new ArrayList<>();
    }

    @Data
    public static class SourceRange {
        private String path;
        private int startLine;
        private int endLine;
    }
}

