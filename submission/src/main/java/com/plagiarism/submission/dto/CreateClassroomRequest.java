package com.plagiarism.submission.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class CreateClassroomRequest {

    @NotBlank
    @Size(max = 160)
    private String name;

    @NotBlank
    @Size(max = 32)
    private String code;

    @Size(max = 4000)
    private String description;

    private List<String> teacherUsernames = new ArrayList<>();

    private List<String> studentUsernames = new ArrayList<>();
}
