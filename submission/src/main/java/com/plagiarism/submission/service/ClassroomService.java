package com.plagiarism.submission.service;

import com.plagiarism.submission.dto.CreateClassroomRequest;
import com.plagiarism.submission.model.Assignment;
import com.plagiarism.submission.model.Classroom;
import com.plagiarism.submission.repository.AssignmentRepository;
import com.plagiarism.submission.repository.ClassroomRepository;
import com.plagiarism.submission.repository.SubmissionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

@Service
public class ClassroomService {

    private static final Pattern CLASS_CODE_PATTERN = Pattern.compile("^[A-Z0-9][A-Z0-9_-]{2,31}$");

    private final ClassroomRepository classroomRepository;
    private final AssignmentRepository assignmentRepository;
    private final SubmissionRepository submissionRepository;

    public ClassroomService(ClassroomRepository classroomRepository,
                            AssignmentRepository assignmentRepository,
                            SubmissionRepository submissionRepository) {
        this.classroomRepository = classroomRepository;
        this.assignmentRepository = assignmentRepository;
        this.submissionRepository = submissionRepository;
    }

    @Transactional
    public Classroom create(String createdBy, CreateClassroomRequest request) {
        String code = normalizeClassCode(request.getCode());
        if (classroomRepository.existsByCodeIgnoreCase(code)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Class code already exists");
        }

        Classroom classroom = new Classroom();
        classroom.setName(normalizeRequiredText(request.getName(), "Class name is required"));
        classroom.setCode(code);
        classroom.setDescription(normalizeOptionalText(request.getDescription()));
        classroom.setCreatedBy(createdBy);
        classroom.setTeacherUsernames(normalizeUsernames(request.getTeacherUsernames()));
        classroom.setStudentUsernames(normalizeUsernames(request.getStudentUsernames()));
        return classroomRepository.save(classroom);
    }

    @Transactional
    public Classroom update(Long id, CreateClassroomRequest request) {
        Classroom classroom = getRequired(id);
        String requestedCode = normalizeClassCode(request.getCode());
        classroomRepository.findByCodeIgnoreCase(requestedCode)
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Class code already exists");
                });

        classroom.setName(normalizeRequiredText(request.getName(), "Class name is required"));
        classroom.setCode(requestedCode);
        classroom.setDescription(normalizeOptionalText(request.getDescription()));
        replaceUsernames(classroom.getTeacherUsernames(), normalizeUsernames(request.getTeacherUsernames()));
        replaceUsernames(classroom.getStudentUsernames(), normalizeUsernames(request.getStudentUsernames()));
        return classroomRepository.save(classroom);
    }

    @Transactional(readOnly = true)
    public List<Classroom> listForUser(String username, String role) {
        return classroomRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(classroom -> canReadClassroom(username, role, classroom))
                .toList();
    }

    @Transactional(readOnly = true)
    public Classroom getForUser(Long id, String username, String role) {
        Classroom classroom = getRequired(id);
        if (!canReadClassroom(username, role, classroom)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Classroom is outside your scope");
        }
        return classroom;
    }

    @Transactional
    public Classroom joinByCode(String username, String code) {
        Classroom classroom = classroomRepository.findByCodeIgnoreCase(normalizeClassCode(code))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Classroom not found"));
        classroom.getStudentUsernames().add(normalizeUsername(username));
        return classroomRepository.save(classroom);
    }

    @Transactional
    public Classroom delete(Long id) {
        Classroom classroom = getRequired(id);
        List<Assignment> assignments = assignmentRepository.findByClassroom_IdOrderByCreatedAtDesc(id);
        for (Assignment assignment : assignments) {
            submissionRepository.deleteByAssignment_Id(assignment.getId());
        }
        assignmentRepository.deleteAll(assignments);
        classroomRepository.delete(classroom);
        return classroom;
    }

    @Transactional(readOnly = true)
    public long assignmentCount(Long classroomId) {
        return assignmentRepository.countByClassroom_Id(classroomId);
    }

    boolean canReadClassroom(String username, String role, Classroom classroom) {
        String normalizedRole = normalizeRole(role);
        if ("BUSINESS_ADMIN".equals(normalizedRole) || "SYSTEM_ADMIN".equals(normalizedRole)) {
            return true;
        }

        String normalizedUsername = normalizeUsername(username);
        if ("TEACHER".equals(normalizedRole)) {
            return classroom.getTeacherUsernames().contains(normalizedUsername);
        }
        if ("STUDENT".equals(normalizedRole)) {
            return classroom.getStudentUsernames().contains(normalizedUsername);
        }
        return false;
    }

    static boolean canManageClassroom(String username, String role, Classroom classroom) {
        String normalizedRole = normalizeRole(role);
        if ("BUSINESS_ADMIN".equals(normalizedRole) || "SYSTEM_ADMIN".equals(normalizedRole)) {
            return true;
        }
        return "TEACHER".equals(normalizedRole)
                && classroom.getTeacherUsernames().contains(normalizeUsername(username));
    }

    static boolean canReadAssignment(String username, String role, Assignment assignment) {
        String normalizedRole = normalizeRole(role);
        if ("BUSINESS_ADMIN".equals(normalizedRole) || "SYSTEM_ADMIN".equals(normalizedRole)) {
            return true;
        }

        String normalizedUsername = normalizeUsername(username);
        Classroom classroom = assignment.getClassroom();
        if ("TEACHER".equals(normalizedRole)) {
            return normalizedUsername.equals(normalizeUsername(assignment.getCreatedBy()))
                    || (classroom != null && classroom.getTeacherUsernames().contains(normalizedUsername));
        }
        if ("STUDENT".equals(normalizedRole)) {
            return classroom != null && classroom.getStudentUsernames().contains(normalizedUsername);
        }
        return false;
    }

    static boolean canManageAssignment(String username, String role, Assignment assignment) {
        String normalizedRole = normalizeRole(role);
        if ("BUSINESS_ADMIN".equals(normalizedRole) || "SYSTEM_ADMIN".equals(normalizedRole)) {
            return true;
        }

        String normalizedUsername = normalizeUsername(username);
        Classroom classroom = assignment.getClassroom();
        return "TEACHER".equals(normalizedRole)
                && (normalizedUsername.equals(normalizeUsername(assignment.getCreatedBy()))
                || (classroom != null && classroom.getTeacherUsernames().contains(normalizedUsername)));
    }

    static String normalizeRole(String role) {
        if (role == null || role.isBlank()) {
            return "STUDENT";
        }
        String normalized = role.trim().toUpperCase(Locale.ROOT);
        if (normalized.startsWith("ROLE_")) {
            normalized = normalized.substring("ROLE_".length());
        }
        if ("USER".equals(normalized)) {
            return "STUDENT";
        }
        if ("TEACHING_ASSISTANT".equals(normalized) || "TA".equals(normalized)) {
            return "TEACHER";
        }
        if ("ADMIN".equals(normalized)) {
            return "BUSINESS_ADMIN";
        }
        return normalized;
    }

    static String normalizeUsername(String username) {
        return username == null ? "" : username.trim();
    }

    private Classroom getRequired(Long id) {
        return classroomRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Classroom not found"));
    }

    private String normalizeClassCode(String code) {
        String normalized = normalizeRequiredText(code, "Class code is required")
                .toUpperCase(Locale.ROOT)
                .replace(" ", "");
        if (!CLASS_CODE_PATTERN.matcher(normalized).matches()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Class code must be 3-32 characters and use only letters, numbers, underscore, or hyphen"
            );
        }
        return normalized;
    }

    private String normalizeRequiredText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        return value.trim();
    }

    private String normalizeOptionalText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private Set<String> normalizeUsernames(List<String> usernames) {
        Set<String> normalized = new LinkedHashSet<>();
        if (usernames == null) {
            return normalized;
        }

        for (String username : usernames) {
            String value = normalizeUsername(username);
            if (!value.isBlank()) {
                normalized.add(value);
            }
        }
        return normalized;
    }

    private void replaceUsernames(Set<String> target, Set<String> replacement) {
        target.clear();
        target.addAll(replacement);
    }
}
