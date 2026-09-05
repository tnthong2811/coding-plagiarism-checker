package com.plagiarism.submission.dto;

import com.plagiarism.submission.model.Assignment;
import com.plagiarism.submission.model.Submission;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class SubmissionResponse {
    private Long id;
    private Long assignmentId;
    private String assignmentTitle;
    private String submittedBy;
    private String originalFileName;
    private String objectKey;
    private Long fileSize;
    private String contentType;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static SubmissionResponse from(Submission submission) {
        SubmissionResponse response = new SubmissionResponse();
        Assignment assignment = submission.getAssignment();

        response.setId(submission.getId());
        if (assignment != null) {
            response.setAssignmentId(assignment.getId());
            response.setAssignmentTitle(assignment.getTitle());
        }
        response.setSubmittedBy(submission.getSubmittedBy());
        response.setOriginalFileName(submission.getOriginalFileName());
        response.setObjectKey(submission.getObjectKey());
        response.setFileSize(submission.getFileSize());
        response.setContentType(submission.getContentType());
        response.setStatus(submission.getStatus());
        response.setCreatedAt(submission.getCreatedAt());
        response.setUpdatedAt(submission.getUpdatedAt());
        return response;
    }
}
