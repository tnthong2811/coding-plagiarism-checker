package com.plagiarism.submission.service;

import com.plagiarism.submission.config.MinioProperties;
import com.plagiarism.submission.model.Assignment;
import com.plagiarism.submission.model.Submission;
import com.plagiarism.submission.repository.AssignmentRepository;
import com.plagiarism.submission.repository.SubmissionRepository;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.errors.MinioException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.UUID;

@Service
public class SubmissionService {

    private final MinioClient minioClient;
    private final MinioProperties minioProperties;
    private final SubmissionRepository submissionRepository;
    private final AssignmentRepository assignmentRepository;

    public SubmissionService(MinioClient minioClient,
                             MinioProperties minioProperties,
                             SubmissionRepository submissionRepository,
                             AssignmentRepository assignmentRepository) {
        this.minioClient = minioClient;
        this.minioProperties = minioProperties;
        this.submissionRepository = submissionRepository;
        this.assignmentRepository = assignmentRepository;
    }

    public Submission upload(String submittedBy, Long assignmentId, MultipartFile file) {
        if (assignmentId == null) {
            throw new IllegalArgumentException("Assignment is required");
        }
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Assignment not found"));
        String originalName = file.getOriginalFilename() == null ? "submission.zip" : file.getOriginalFilename();
        String objectKey = "assignments/" + assignment.getId() + "/" + submittedBy + "/" + UUID.randomUUID() + "-" + originalName;
        String contentType = file.getContentType() == null ? "application/octet-stream" : file.getContentType();

        try {
            ensureBucketExists();
            try (InputStream in = file.getInputStream()) {
                minioClient.putObject(
                        PutObjectArgs.builder()
                                .bucket(minioProperties.getBucketName())
                                .object(objectKey)
                                .stream(in, file.getSize(), -1)
                                .contentType(contentType)
                                .build()
                );
            }
        } catch (MinioException | IOException e) {
            throw new RuntimeException("Failed to upload to MinIO", e);
        } catch (Exception e) {
            throw new RuntimeException("Unexpected upload failure", e);
        }

        Submission submission = new Submission();
        submission.setAssignment(assignment);
        submission.setSubmittedBy(submittedBy);
        submission.setOriginalFileName(originalName);
        submission.setObjectKey(objectKey);
        submission.setContentType(contentType);
        submission.setFileSize(file.getSize());
        submission.setStatus("UPLOADED");

        return submissionRepository.save(submission);
    }

    public List<Submission> getMySubmissions(String username) {
        return submissionRepository.findBySubmittedByOrderByCreatedAtDesc(username);
    }

    public List<Submission> getMySubmissionsForAssignment(String username, Long assignmentId) {
        return submissionRepository.findByAssignment_IdAndSubmittedByOrderByCreatedAtDesc(assignmentId, username);
    }

    public List<Submission> getSubmissionsForAssignment(Long assignmentId) {
        return submissionRepository.findByAssignment_IdOrderByCreatedAtDesc(assignmentId);
    }

    public List<Submission> getSubmissionHistory() {
        return submissionRepository.findAllByOrderByCreatedAtDesc();
    }

    private void ensureBucketExists() throws Exception {
        boolean exists = minioClient.bucketExists(
                BucketExistsArgs.builder().bucket(minioProperties.getBucketName()).build()
        );
        if (!exists) {
            minioClient.makeBucket(
                    MakeBucketArgs.builder().bucket(minioProperties.getBucketName()).build()
            );
        }
    }
}

