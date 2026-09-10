package com.plagiarism.analyzer.service;

import com.plagiarism.analyzer.dto.CompareRequest;
import com.plagiarism.analyzer.dto.CompareResponse;
import com.plagiarism.analyzer.dto.ReportSummaryResponse;
import com.plagiarism.analyzer.jplag.JPlagRunner;
import com.plagiarism.analyzer.model.AnalysisReport;
import com.plagiarism.analyzer.repository.AnalysisReportRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

@Service
public class ReportService {

    private final JPlagRunner jPlagRunner;
    private final AnalysisReportRepository reportRepository;

    public ReportService(JPlagRunner jPlagRunner, AnalysisReportRepository reportRepository) {
        this.jPlagRunner = jPlagRunner;
        this.reportRepository = reportRepository;
    }

    public CompareResponse compareAndSave(CompareRequest request, String requestedBy) {
        CompareResponse response = jPlagRunner.runAnalysis(request);
        AnalysisReport saved = reportRepository.save(AnalysisReport.from(response, requestedBy));
        response.setReportId(saved.getId());
        return response;
    }

    public List<ReportSummaryResponse> listReports(Long assignmentId, String username, String role) {
        List<AnalysisReport> reports = assignmentId == null
                ? reportRepository.findAllByOrderByGeneratedAtDesc()
                : reportRepository.findByAssignmentIdOrderByGeneratedAtDesc(assignmentId);

        return reports.stream()
                .filter(report -> canAccessReport(report, username, role))
                .map(ReportSummaryResponse::from)
                .toList();
    }

    public CompareResponse getReport(String id, String username, String role) {
        AnalysisReport report = reportRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found"));
        requireAccess(report, username, role);
        return report.toCompareResponse();
    }

    public ReportSummaryResponse deleteReport(String id, String username, String role) {
        AnalysisReport report = reportRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found"));
        requireAccess(report, username, role);
        reportRepository.delete(report);
        return ReportSummaryResponse.from(report);
    }

    private void requireAccess(AnalysisReport report, String username, String role) {
        if (!canAccessReport(report, username, role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Report is outside your scope");
        }
    }

    private boolean canAccessReport(AnalysisReport report, String username, String role) {
        String normalizedRole = normalizeRole(role);
        if ("BUSINESS_ADMIN".equals(normalizedRole) || "SYSTEM_ADMIN".equals(normalizedRole)) {
            return true;
        }
        return "TEACHER".equals(normalizedRole)
                && normalizeUsername(username).equals(normalizeUsername(report.getRequestedBy()));
    }

    private String normalizeRole(String role) {
        if (role == null || role.isBlank()) {
            return "STUDENT";
        }
        String normalized = role.trim().toUpperCase(Locale.ROOT);
        if (normalized.startsWith("ROLE_")) {
            normalized = normalized.substring("ROLE_".length());
        }
        if ("ADMIN".equals(normalized)) {
            return "BUSINESS_ADMIN";
        }
        if ("USER".equals(normalized)) {
            return "STUDENT";
        }
        if ("TEACHING_ASSISTANT".equals(normalized) || "TA".equals(normalized)) {
            return "TEACHER";
        }
        return normalized;
    }

    private String normalizeUsername(String username) {
        return username == null ? "" : username.trim();
    }
}
