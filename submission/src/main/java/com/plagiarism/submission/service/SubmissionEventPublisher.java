package com.plagiarism.submission.service;

import com.plagiarism.common.constant.AppConstants;
import com.plagiarism.common.event.SubmissionUploadedEvent;
import com.plagiarism.submission.model.Assignment;
import com.plagiarism.submission.model.Submission;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class SubmissionEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(SubmissionEventPublisher.class);

    private final RabbitTemplate rabbitTemplate;

    public SubmissionEventPublisher(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    public void publishSubmissionUploaded(Assignment assignment, List<Submission> submissions) {
        if (assignment == null || submissions == null || submissions.isEmpty()) {
            return;
        }

        SubmissionUploadedEvent event = new SubmissionUploadedEvent();
        event.setAssignmentId(assignment.getId());
        event.setLanguage(assignment.getLanguage());
        event.setRequestedBy(assignment.getCreatedBy());
        event.setPublishedAt(Instant.now().toString());
        event.setSubmissions(submissions.stream()
                .map(this::toPayload)
                .toList());

        try {
            rabbitTemplate.convertAndSend(
                    AppConstants.EXCHANGE_NAME,
                    AppConstants.SUBMISSION_UPLOADED_ROUTING_KEY,
                    event
            );
            log.info(
                    "Published submission upload event for assignment {} with {} submissions",
                    event.getAssignmentId(),
                    event.getSubmissions().size()
            );
        } catch (AmqpException ex) {
            log.warn(
                    "Failed to publish submission upload event for assignment {}",
                    event.getAssignmentId(),
                    ex
            );
        }
    }

    private SubmissionUploadedEvent.SubmissionPayload toPayload(Submission submission) {
        SubmissionUploadedEvent.SubmissionPayload payload = new SubmissionUploadedEvent.SubmissionPayload();
        payload.setSubmissionId(submission.getId());
        payload.setSubmittedBy(submission.getSubmittedBy());
        payload.setOriginalFileName(submission.getOriginalFileName());
        payload.setObjectKey(submission.getObjectKey());
        return payload;
    }
}
