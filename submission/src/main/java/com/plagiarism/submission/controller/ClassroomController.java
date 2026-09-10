package com.plagiarism.submission.controller;

import com.plagiarism.submission.dto.ClassroomResponse;
import com.plagiarism.submission.dto.CreateClassroomRequest;
import com.plagiarism.submission.dto.JoinClassroomRequest;
import com.plagiarism.submission.model.Classroom;
import com.plagiarism.submission.security.AuthenticationSupport;
import com.plagiarism.submission.service.ClassroomService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/classes")
public class ClassroomController {

    private final ClassroomService classroomService;

    public ClassroomController(ClassroomService classroomService) {
        this.classroomService = classroomService;
    }

    @PostMapping
    @PreAuthorize("hasRole('BUSINESS_ADMIN')")
    public ResponseEntity<ClassroomResponse> create(@Valid @RequestBody CreateClassroomRequest request,
                                                    Authentication authentication) {
        Classroom classroom = classroomService.create(AuthenticationSupport.username(authentication), request);
        return ResponseEntity.ok(toResponse(classroom));
    }

    @GetMapping
    public ResponseEntity<List<ClassroomResponse>> list(Authentication authentication) {
        String username = AuthenticationSupport.username(authentication);
        String role = AuthenticationSupport.role(authentication);
        return ResponseEntity.ok(classroomService.listForUser(username, role).stream()
                .map(this::toResponse)
                .toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClassroomResponse> get(@PathVariable("id") Long id, Authentication authentication) {
        Classroom classroom = classroomService.getForUser(
                id,
                AuthenticationSupport.username(authentication),
                AuthenticationSupport.role(authentication)
        );
        return ResponseEntity.ok(toResponse(classroom));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('BUSINESS_ADMIN')")
    public ResponseEntity<ClassroomResponse> update(@PathVariable("id") Long id,
                                                    @Valid @RequestBody CreateClassroomRequest request) {
        return ResponseEntity.ok(toResponse(classroomService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('BUSINESS_ADMIN')")
    public ResponseEntity<ClassroomResponse> delete(@PathVariable("id") Long id) {
        Classroom deleted = classroomService.delete(id);
        return ResponseEntity.ok(ClassroomResponse.from(deleted, 0));
    }

    @PostMapping("/join")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ClassroomResponse> join(@Valid @RequestBody JoinClassroomRequest request,
                                                  Authentication authentication) {
        Classroom classroom = classroomService.joinByCode(AuthenticationSupport.username(authentication), request.getCode());
        return ResponseEntity.ok(toResponse(classroom));
    }

    private ClassroomResponse toResponse(Classroom classroom) {
        return ClassroomResponse.from(classroom, classroomService.assignmentCount(classroom.getId()));
    }
}
