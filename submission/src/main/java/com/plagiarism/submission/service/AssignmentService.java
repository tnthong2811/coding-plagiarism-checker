package com.plagiarism.submission.service;

import com.plagiarism.submission.dto.CreateAssignmentRequest;
import com.plagiarism.submission.model.Assignment;
import com.plagiarism.submission.repository.AssignmentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

@Service
public class AssignmentService {

    private final AssignmentRepository assignmentRepository;

    public AssignmentService(AssignmentRepository assignmentRepository) {
        this.assignmentRepository = assignmentRepository;
    }

    @Transactional
    public Assignment create(String createdBy, CreateAssignmentRequest request) {
        Assignment assignment = new Assignment();
        assignment.setTitle(request.getTitle().trim());
        assignment.setDescription(normalizeOptionalText(request.getDescription()));
        assignment.setLanguage(normalizeLanguage(request.getLanguage()));
        assignment.setDueAt(request.getDueAt());
        assignment.setCreatedBy(createdBy);
        return assignmentRepository.save(assignment);
    }

    @Transactional(readOnly = true)
    public List<Assignment> listAssignments() {
        return assignmentRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public Assignment getAssignment(Long id) {
        return assignmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Assignment not found"));
    }

    private String normalizeOptionalText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String normalizeLanguage(String language) {
        if (language == null || language.isBlank()) {
            return "AUTO";
        }

        String normalized = language.trim()
                .toUpperCase(Locale.ROOT)
                .replace("-", "_")
                .replace("/", "_")
                .replace(" ", "");

        return switch (normalized) {
            case "AUTO" -> "AUTO";
            case "JAVA" -> "JAVA";
            case "CPP", "C", "C++", "CXX", "CC", "C_CPP", "CPLUSPLUS" -> "CPP";
            default -> throw new IllegalArgumentException(
                    "Unsupported language: " + language + ". Supported values: AUTO, JAVA, CPP"
            );
        };
    }
}
