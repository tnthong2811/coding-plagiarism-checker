package com.plagiarism.submission.controller;

import com.plagiarism.submission.dto.AssignmentResponse;
import com.plagiarism.submission.dto.CreateAssignmentRequest;
import com.plagiarism.submission.dto.SubmissionResponse;
import com.plagiarism.submission.model.Assignment;
import com.plagiarism.submission.service.AssignmentService;
import com.plagiarism.submission.service.SubmissionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<?> create(@Valid @RequestBody CreateAssignmentRequest request,
                                    Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return ResponseEntity.status(401).body(Map.of("error", "unauthorized"));
        }

        try {
            Assignment assignment = assignmentService.create(username(authentication), request);
            return ResponseEntity.ok(AssignmentResponse.from(assignment));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<List<AssignmentResponse>> list() {
        return ResponseEntity.ok(assignmentService.listAssignments().stream()
                .map(AssignmentResponse::from)
                .toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AssignmentResponse> get(@PathVariable("id") Long id) {
        return ResponseEntity.ok(AssignmentResponse.from(assignmentService.getAssignment(id)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<AssignmentResponse> delete(@PathVariable("id") Long id) {
        return ResponseEntity.ok(AssignmentResponse.from(assignmentService.deleteAssignment(id)));
    }

    @GetMapping("/{id}/submissions")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<List<SubmissionResponse>> submissions(@PathVariable("id") Long id) {
        assignmentService.getAssignment(id);
        return ResponseEntity.ok(submissionService.getSubmissionsForAssignment(id).stream()
                .map(SubmissionResponse::from)
                .toList());
    }

    @GetMapping("/{id}/submissions/mine")
    public ResponseEntity<List<SubmissionResponse>> mine(@PathVariable("id") Long id, Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(401).build();
        }

        assignmentService.getAssignment(id);
        return ResponseEntity.ok(submissionService.getMySubmissionsForAssignment(authentication.getName(), id).stream()
                .map(SubmissionResponse::from)
                .toList());
    }

    private String username(Authentication authentication) {
        Object principal = authentication.getPrincipal();
        if (principal instanceof UserDetails userDetails) {
            return userDetails.getUsername();
        }
        return authentication.getName();
    }
}
