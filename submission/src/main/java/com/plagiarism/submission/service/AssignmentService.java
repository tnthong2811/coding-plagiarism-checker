package com.plagiarism.submission.service;

import com.plagiarism.submission.dto.CreateAssignmentRequest;
import com.plagiarism.submission.model.Assignment;
import com.plagiarism.submission.model.Classroom;
import com.plagiarism.submission.repository.AssignmentRepository;
import com.plagiarism.submission.repository.ClassroomRepository;
import com.plagiarism.submission.repository.SubmissionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

@Service
public class AssignmentService {

    private final AssignmentRepository assignmentRepository;
    private final SubmissionRepository submissionRepository;
    private final ClassroomRepository classroomRepository;

    public AssignmentService(AssignmentRepository assignmentRepository,
                             SubmissionRepository submissionRepository,
                             ClassroomRepository classroomRepository) {
        this.assignmentRepository = assignmentRepository;
        this.submissionRepository = submissionRepository;
        this.classroomRepository = classroomRepository;
    }

    @Transactional
    public Assignment create(String createdBy, String role, CreateAssignmentRequest request) {
        Classroom classroom = getManagedClassroom(createdBy, role, request.getClassroomId());
        Assignment assignment = new Assignment();
        assignment.setClassroom(classroom);
        assignment.setTitle(request.getTitle().trim());
        assignment.setDescription(normalizeOptionalText(request.getDescription()));
        assignment.setLanguage(normalizeLanguage(request.getLanguage()));
        assignment.setDueAt(request.getDueAt());
        assignment.setCreatedBy(createdBy);
        return assignmentRepository.save(assignment);
    }

    @Transactional(readOnly = true)
    public List<Assignment> listAssignments(String username, String role) {
        return assignmentRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(assignment -> ClassroomService.canReadAssignment(username, role, assignment))
                .toList();
    }

    @Transactional(readOnly = true)
    public Assignment getAssignment(Long id, String username, String role) {
        Assignment assignment = getRequired(id);
        if (!ClassroomService.canReadAssignment(username, role, assignment)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Assignment is outside your scope");
        }
        return assignment;
    }

    @Transactional
    public Assignment updateAssignment(Long id, String username, String role, CreateAssignmentRequest request) {
        Assignment assignment = getRequired(id);
        if (!ClassroomService.canManageAssignment(username, role, assignment)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Assignment is outside your management scope");
        }

        if (request.getClassroomId() != null
                && (assignment.getClassroom() == null || !request.getClassroomId().equals(assignment.getClassroom().getId()))) {
            assignment.setClassroom(getManagedClassroom(username, role, request.getClassroomId()));
        }
        assignment.setTitle(request.getTitle().trim());
        assignment.setDescription(normalizeOptionalText(request.getDescription()));
        assignment.setLanguage(normalizeLanguage(request.getLanguage()));
        assignment.setDueAt(request.getDueAt());
        return assignmentRepository.save(assignment);
    }

    @Transactional
    public Assignment deleteAssignment(Long id, String username, String role) {
        Assignment assignment = getRequired(id);
        if (!ClassroomService.canManageAssignment(username, role, assignment)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Assignment is outside your management scope");
        }
        submissionRepository.deleteByAssignment_Id(id);
        assignmentRepository.delete(assignment);
        return assignment;
    }

    private Assignment getRequired(Long id) {
        return assignmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Assignment not found"));
    }

    private Classroom getManagedClassroom(String username, String role, Long classroomId) {
        if (classroomId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Classroom is required");
        }

        Classroom classroom = classroomRepository.findById(classroomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Classroom not found"));
        if (!ClassroomService.canManageClassroom(username, role, classroom)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Classroom is outside your management scope");
        }
        return classroom;
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
