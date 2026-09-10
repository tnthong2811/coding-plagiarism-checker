package com.plagiarism.submission.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class JoinClassroomRequest {

    @NotBlank
    @Size(max = 32)
    private String code;
}
