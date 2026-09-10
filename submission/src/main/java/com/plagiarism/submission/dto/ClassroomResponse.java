package com.plagiarism.submission.dto;

import com.plagiarism.submission.model.Classroom;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
public class ClassroomResponse {
    private Long id;
    private String name;
    private String code;
    private String description;
    private String createdBy;
    private List<String> teacherUsernames = new ArrayList<>();
    private List<String> studentUsernames = new ArrayList<>();
    private long assignmentCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ClassroomResponse from(Classroom classroom, long assignmentCount) {
        ClassroomResponse response = new ClassroomResponse();
        response.setId(classroom.getId());
        response.setName(classroom.getName());
        response.setCode(classroom.getCode());
        response.setDescription(classroom.getDescription());
        response.setCreatedBy(classroom.getCreatedBy());
        response.setTeacherUsernames(new ArrayList<>(classroom.getTeacherUsernames()));
        response.setStudentUsernames(new ArrayList<>(classroom.getStudentUsernames()));
        response.setAssignmentCount(assignmentCount);
        response.setCreatedAt(classroom.getCreatedAt());
        response.setUpdatedAt(classroom.getUpdatedAt());
        return response;
    }
}
