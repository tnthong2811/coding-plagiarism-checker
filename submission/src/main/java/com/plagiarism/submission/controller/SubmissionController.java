package com.plagiarism.submission.controller;

import com.plagiarism.submission.dto.SubmissionResponse;
import com.plagiarism.submission.model.Submission;
import com.plagiarism.submission.security.AuthenticationSupport;
import com.plagiarism.submission.service.SubmissionService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/submissions")
public class SubmissionController {

    private final SubmissionService submissionService;

    public SubmissionController(SubmissionService submissionService) {
        this.submissionService = submissionService;
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> upload(@RequestParam("assignmentId") Long assignmentId,
                                    @RequestParam("file") MultipartFile file,
                                    Authentication authentication) {
        try {
            Submission saved = submissionService.upload(AuthenticationSupport.username(authentication), assignmentId, file);
            return ResponseEntity.ok(SubmissionResponse.from(saved));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/mine")
    public ResponseEntity<List<SubmissionResponse>> mine(Authentication authentication) {
        return ResponseEntity.ok(submissionService.getMySubmissions(AuthenticationSupport.username(authentication)).stream()
                .map(SubmissionResponse::from)
                .toList());
    }

    @GetMapping("/history")
    @PreAuthorize("hasAnyRole('TEACHER','BUSINESS_ADMIN')")
    public ResponseEntity<List<SubmissionResponse>> history(Authentication authentication) {
        return ResponseEntity.ok(submissionService.getSubmissionHistory(
                        AuthenticationSupport.username(authentication),
                        AuthenticationSupport.role(authentication)
                ).stream()
                .map(SubmissionResponse::from)
                .toList());
    }
}

