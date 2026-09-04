package com.plagiarism.analyzer.dto;

import lombok.Data;

import java.util.List;

@Data
public class CompareRequest {
    private String language = "JAVA";
    private List<SubmissionPayload> submissions;

    @Data
    public static class SubmissionPayload {
        private Long submissionId;
        private String submittedBy;
        private String originalFileName;
        private String objectKey;
    }
}

