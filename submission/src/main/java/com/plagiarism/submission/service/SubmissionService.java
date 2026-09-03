package com.plagiarism.submission.service;

import com.plagiarism.submission.config.MinioProperties;
import com.plagiarism.submission.model.Submission;
import com.plagiarism.submission.repository.SubmissionRepository;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.errors.MinioException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.UUID;

@Service
public class SubmissionService {

    private final MinioClient minioClient;
    private final MinioProperties minioProperties;
    private final SubmissionRepository submissionRepository;

    public SubmissionService(MinioClient minioClient,
                             MinioProperties minioProperties,
                             SubmissionRepository submissionRepository) {
        this.minioClient = minioClient;
        this.minioProperties = minioProperties;
        this.submissionRepository = submissionRepository;
    }

    public Submission upload(String submittedBy, MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        String originalName = file.getOriginalFilename() == null ? "submission.zip" : file.getOriginalFilename();
        String objectKey = submittedBy + "/" + UUID.randomUUID() + "-" + originalName;
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

