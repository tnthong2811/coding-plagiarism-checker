package com.plagiarism.submission.model;

import com.plagiarism.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "assignments")
@Getter
@Setter
public class Assignment extends BaseEntity {

    @Column(nullable = false, length = 180)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "source_language", nullable = false, length = 16)
    private String language = "AUTO";

    @Column(name = "due_at")
    private LocalDateTime dueAt;

    @Column(nullable = false, length = 120)
    private String createdBy;
}
