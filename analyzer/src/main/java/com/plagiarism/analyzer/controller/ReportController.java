package com.plagiarism.analyzer.controller;

import com.plagiarism.analyzer.dto.CompareRequest;
import com.plagiarism.analyzer.dto.CompareResponse;
import com.plagiarism.analyzer.dto.ReportSummaryResponse;
import com.plagiarism.analyzer.service.ReportService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @PostMapping("/compare")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<?> compare(@RequestBody CompareRequest request, Authentication authentication) {
        try {
            CompareResponse response = reportService.compareAndSave(request, username(authentication));
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<List<ReportSummaryResponse>> list(@RequestParam(name = "assignmentId", required = false) Long assignmentId) {
        return ResponseEntity.ok(reportService.listReports(assignmentId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<CompareResponse> get(@PathVariable("id") String id) {
        return ResponseEntity.ok(reportService.getReport(id));
    }

    private String username(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return "unknown";
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof UserDetails userDetails) {
            return userDetails.getUsername();
        }
        return authentication.getName();
    }
}

