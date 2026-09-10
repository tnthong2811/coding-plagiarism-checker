package com.plagiarism.submission.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CreateAssignmentRequest {

    private Long classroomId;

    @NotBlank
    @Size(max = 180)
    private String title;

    @Size(max = 4000)
    private String description;

    private String language = "AUTO";

    private LocalDateTime dueAt;
}
