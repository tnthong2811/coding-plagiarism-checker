package com.plagiarism.submission.controller;

import com.plagiarism.submission.dto.AssignmentResponse;
import com.plagiarism.submission.dto.CreateAssignmentRequest;
import com.plagiarism.submission.dto.SubmissionResponse;
import com.plagiarism.submission.model.Assignment;
import com.plagiarism.submission.security.AuthenticationSupport;
import com.plagiarism.submission.service.AssignmentService;
import com.plagiarism.submission.service.SubmissionService;
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
import java.util.Map;

@RestController
@RequestMapping("/api/assignments")
public class AssignmentController {

    private final AssignmentService assignmentService;
    private final SubmissionService submissionService;

    public AssignmentController(AssignmentService assignmentService, SubmissionService submissionService) {
        this.assignmentService = assignmentService;
        this.submissionService = submissionService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER','BUSINESS_ADMIN')")
    public ResponseEntity<?> create(@Valid @RequestBody CreateAssignmentRequest request,
                                    Authentication authentication) {
        try {
            Assignment assignment = assignmentService.create(
                    AuthenticationSupport.username(authentication),
                    AuthenticationSupport.role(authentication),
                    request
            );
            return ResponseEntity.ok(AssignmentResponse.from(assignment));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<List<AssignmentResponse>> list(Authentication authentication) {
        return ResponseEntity.ok(assignmentService.listAssignments(
                        AuthenticationSupport.username(authentication),
                        AuthenticationSupport.role(authentication)
                ).stream()
                .map(AssignmentResponse::from)
                .toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AssignmentResponse> get(@PathVariable("id") Long id, Authentication authentication) {
        return ResponseEntity.ok(AssignmentResponse.from(assignmentService.getAssignment(
                id,
                AuthenticationSupport.username(authentication),
                AuthenticationSupport.role(authentication)
        )));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER','BUSINESS_ADMIN')")
    public ResponseEntity<?> update(@PathVariable("id") Long id,
                                    @Valid @RequestBody CreateAssignmentRequest request,
                                    Authentication authentication) {
        try {
            Assignment assignment = assignmentService.updateAssignment(
                    id,
                    AuthenticationSupport.username(authentication),
                    AuthenticationSupport.role(authentication),
                    request
            );
            return ResponseEntity.ok(AssignmentResponse.from(assignment));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER','BUSINESS_ADMIN')")
    public ResponseEntity<AssignmentResponse> delete(@PathVariable("id") Long id, Authentication authentication) {
        return ResponseEntity.ok(AssignmentResponse.from(assignmentService.deleteAssignment(
                id,
                AuthenticationSupport.username(authentication),
                AuthenticationSupport.role(authentication)
        )));
    }

    @GetMapping("/{id}/submissions")
    @PreAuthorize("hasAnyRole('TEACHER','BUSINESS_ADMIN')")
    public ResponseEntity<List<SubmissionResponse>> submissions(@PathVariable("id") Long id, Authentication authentication) {
        return ResponseEntity.ok(submissionService.getSubmissionsForAssignment(
                        id,
                        AuthenticationSupport.username(authentication),
                        AuthenticationSupport.role(authentication)
                ).stream()
                .map(SubmissionResponse::from)
                .toList());
    }

    @GetMapping("/{id}/submissions/mine")
    public ResponseEntity<List<SubmissionResponse>> mine(@PathVariable("id") Long id, Authentication authentication) {
        String username = AuthenticationSupport.username(authentication);
        assignmentService.getAssignment(id, username, AuthenticationSupport.role(authentication));
        return ResponseEntity.ok(submissionService.getMySubmissionsForAssignment(username, id).stream()
                .map(SubmissionResponse::from)
                .toList());
    }
}
