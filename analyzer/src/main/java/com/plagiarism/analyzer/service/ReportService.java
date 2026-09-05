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

    public List<ReportSummaryResponse> listReports(Long assignmentId) {
        List<AnalysisReport> reports = assignmentId == null
                ? reportRepository.findAllByOrderByGeneratedAtDesc()
                : reportRepository.findByAssignmentIdOrderByGeneratedAtDesc(assignmentId);

        return reports.stream()
                .map(ReportSummaryResponse::from)
                .toList();
    }

    public CompareResponse getReport(String id) {
        return reportRepository.findById(id)
                .map(AnalysisReport::toCompareResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found"));
    }
}
