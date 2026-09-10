package com.plagiarism.submission.model;

import com.plagiarism.common.entity.BaseEntity;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(
        name = "classrooms",
        uniqueConstraints = @UniqueConstraint(name = "uk_classroom_code", columnNames = "code")
)
@Getter
@Setter
public class Classroom extends BaseEntity {

    @Column(nullable = false, length = 160)
    private String name;

    @Column(nullable = false, unique = true, length = 32)
    private String code;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 120)
    private String createdBy;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "classroom_teachers", joinColumns = @JoinColumn(name = "classroom_id"))
    @Column(name = "teacher_username", nullable = false, length = 120)
    private Set<String> teacherUsernames = new LinkedHashSet<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "classroom_students", joinColumns = @JoinColumn(name = "classroom_id"))
    @Column(name = "student_username", nullable = false, length = 120)
    private Set<String> studentUsernames = new LinkedHashSet<>();
}
