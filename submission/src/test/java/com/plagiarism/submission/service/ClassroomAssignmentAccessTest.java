package com.plagiarism.submission.service;

import com.plagiarism.submission.dto.CreateAssignmentRequest;
import com.plagiarism.submission.dto.CreateClassroomRequest;
import com.plagiarism.submission.model.Assignment;
import com.plagiarism.submission.model.Classroom;
import com.plagiarism.submission.repository.AssignmentRepository;
import com.plagiarism.submission.repository.ClassroomRepository;
import com.plagiarism.submission.repository.SubmissionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

@DataJpaTest
@ActiveProfiles("test")
class ClassroomAssignmentAccessTest {

    @Autowired
    private ClassroomRepository classroomRepository;

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private SubmissionRepository submissionRepository;

    private ClassroomService classroomService;
    private AssignmentService assignmentService;

    @BeforeEach
    void setUp() {
        classroomService = new ClassroomService(classroomRepository, assignmentRepository, submissionRepository);
        assignmentService = new AssignmentService(assignmentRepository, submissionRepository, classroomRepository);
    }

    @Test
    void classroomMembershipScopesAssignmentVisibility() {
        Classroom classroom = classroomService.create(
                "business-admin",
                classroomRequest("Intro to Programming", "cs101", List.of("teacher01"), List.of("student01"))
        );

        Assignment assignment = assignmentService.create(
                "teacher01",
                "TEACHER",
                assignmentRequest(classroom.getId(), "Pointers Lab")
        );

        assertThat(assignment.getClassroom().getCode()).isEqualTo("CS101");
        assertThat(classroomService.listForUser("business-admin", "BUSINESS_ADMIN")).hasSize(1);
        assertThat(classroomService.listForUser("teacher01", "TEACHER"))
                .extracting(Classroom::getCode)
                .containsExactly("CS101");
        assertThat(assignmentService.listAssignments("student01", "STUDENT"))
                .extracting(Assignment::getId)
                .containsExactly(assignment.getId());
        assertThat(assignmentService.listAssignments("student02", "STUDENT")).isEmpty();
    }

    @Test
    void teacherCannotCreateAssignmentOutsideAssignedClassroom() {
        Classroom classroom = classroomService.create(
                "business-admin",
                classroomRequest("Data Structures", "cs201", List.of("teacher01"), List.of())
        );

        assertThatExceptionOfType(ResponseStatusException.class)
                .isThrownBy(() -> assignmentService.create(
                        "teacher02",
                        "TEACHER",
                        assignmentRequest(classroom.getId(), "Hash Table Lab")
                ))
                .satisfies(ex -> assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void canCreateMultipleClassroomsWithDifferentCodes() {
        Classroom first = classroomService.create(
                "business-admin",
                classroomRequest("Intro to Programming", "cs101", List.of("teacher01"), List.of())
        );
        Classroom second = classroomService.create(
                "business-admin",
                classroomRequest("Data Structures", "cs102", List.of("teacher02"), List.of())
        );

        assertThat(first.getCode()).isEqualTo("CS101");
        assertThat(second.getCode()).isEqualTo("CS102");
        assertThat(classroomService.listForUser("business-admin", "BUSINESS_ADMIN"))
                .extracting(Classroom::getCode)
                .containsExactly("CS102", "CS101");
    }

    @Test
    void duplicateClassroomCodeIsRejected() {
        classroomService.create(
                "business-admin",
                classroomRequest("Intro to Programming", "cs101", List.of("teacher01"), List.of())
        );

        assertThatExceptionOfType(ResponseStatusException.class)
                .isThrownBy(() -> classroomService.create(
                        "business-admin",
                        classroomRequest("Another Intro Class", " CS 101 ", List.of("teacher02"), List.of())
                ))
                .satisfies(ex -> {
                    assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(ex.getReason()).isEqualTo("Class code already exists");
                });
    }

    @Test
    void studentCanJoinClassroomByCode() {
        Classroom classroom = classroomService.create(
                "business-admin",
                classroomRequest("Algorithms", "cs301", List.of("teacher01"), List.of())
        );

        Classroom joined = classroomService.joinByCode("student01", " CS301 ");

        assertThat(joined.getId()).isEqualTo(classroom.getId());
        assertThat(joined.getStudentUsernames()).containsExactly("student01");
        assertThat(classroomService.listForUser("student01", "STUDENT"))
                .extracting(Classroom::getCode)
                .containsExactly("CS301");
    }

    private CreateClassroomRequest classroomRequest(String name,
                                                    String code,
                                                    List<String> teachers,
                                                    List<String> students) {
        CreateClassroomRequest request = new CreateClassroomRequest();
        request.setName(name);
        request.setCode(code);
        request.setTeacherUsernames(teachers);
        request.setStudentUsernames(students);
        return request;
    }

    private CreateAssignmentRequest assignmentRequest(Long classroomId, String title) {
        CreateAssignmentRequest request = new CreateAssignmentRequest();
        request.setClassroomId(classroomId);
        request.setTitle(title);
        request.setLanguage("JAVA");
        return request;
    }
}
