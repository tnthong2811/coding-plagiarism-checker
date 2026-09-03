package com.plagiarism.submission.model;

import com.plagiarism.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "submissions")
@Getter
@Setter
public class Submission extends BaseEntity {

    @Column(nullable = false)
    private String submittedBy;

    @Column(nullable = false)
    private String originalFileName;

    @Column(nullable = false, unique = true)
    private String objectKey;

    @Column(nullable = false)
    private Long fileSize;

    @Column(nullable = false)
    private String contentType;

    @Column(nullable = false)
    private String status = "UPLOADED";
}

