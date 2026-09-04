package com.plagiarism.analyzer.controller;

import com.plagiarism.analyzer.dto.CompareRequest;
import com.plagiarism.analyzer.dto.CompareResponse;
import com.plagiarism.analyzer.jplag.JPlagRunner;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final JPlagRunner jPlagRunner;

    public ReportController(JPlagRunner jPlagRunner) {
        this.jPlagRunner = jPlagRunner;
    }

    @PostMapping("/compare")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<?> compare(@RequestBody CompareRequest request) {
        try {
            CompareResponse response = jPlagRunner.runAnalysis(request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}

