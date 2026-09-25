package com.plagiarism.analyzer.service;

import com.plagiarism.analyzer.dto.CompareRequest;
import com.plagiarism.common.constant.AppConstants;
import com.plagiarism.common.event.SubmissionUploadedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

@Service
public class SubmissionUploadedListener {

    private static final Logger log = LoggerFactory.getLogger(SubmissionUploadedListener.class);

    private final ReportService reportService;

    public SubmissionUploadedListener(ReportService reportService) {
        this.reportService = reportService;
    }

    @RabbitListener(queues = AppConstants.ANALYSIS_QUEUE)
    public void handleSubmissionUploaded(SubmissionUploadedEvent event) {
        if (event == null || event.getAssignmentId() == null) {
            log.warn("Ignored invalid submission uploaded event: {}", event);
            return;
        }
        if (event.getSubmissions() == null || event.getSubmissions().size() < 2) {
            log.info("Skipped analysis for assignment {} because fewer than 2 submissions are available", event.getAssignmentId());
            return;
        }

        try {
            CompareRequest request = toCompareRequest(event);
            reportService.compareAndSave(request, event.getRequestedBy());
            log.info(
                    "Completed queued analysis for assignment {} with {} submissions",
                    event.getAssignmentId(),
                    event.getSubmissions().size()
            );
        } catch (Exception ex) {
            log.warn("Queued analysis failed for assignment {}", event.getAssignmentId(), ex);
        }
    }

    private CompareRequest toCompareRequest(SubmissionUploadedEvent event) {
        CompareRequest request = new CompareRequest();
        request.setAssignmentId(event.getAssignmentId());
        request.setLanguage(event.getLanguage());
        request.setSubmissions(event.getSubmissions().stream()
                .map(this::toSubmissionPayload)
                .toList());
        return request;
    }

    private CompareRequest.SubmissionPayload toSubmissionPayload(SubmissionUploadedEvent.SubmissionPayload eventPayload) {
        CompareRequest.SubmissionPayload payload = new CompareRequest.SubmissionPayload();
        payload.setSubmissionId(eventPayload.getSubmissionId());
        payload.setSubmittedBy(eventPayload.getSubmittedBy());
        payload.setOriginalFileName(eventPayload.getOriginalFileName());
        payload.setObjectKey(eventPayload.getObjectKey());
        return payload;
    }
}
