package com.plagiarism.common.event;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class SubmissionUploadedEvent {
    private Long assignmentId;
    private String language = "AUTO";
    private String requestedBy;
    private String publishedAt;
    private List<SubmissionPayload> submissions = new ArrayList<>();

    @Data
    public static class SubmissionPayload {
        private Long submissionId;
        private String submittedBy;
        private String originalFileName;
        private String objectKey;
    }
}
