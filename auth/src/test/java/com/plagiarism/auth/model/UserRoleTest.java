package com.plagiarism.auth.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class UserRoleTest {

    @Test
    void mapsLegacyAdminToBusinessAdmin() {
        assertEquals(UserRole.BUSINESS_ADMIN, UserRole.fromString("ADMIN"));
        assertEquals(UserRole.BUSINESS_ADMIN, UserRole.fromString("ROLE_BUSINESS_ADMIN"));
        assertEquals(UserRole.SYSTEM_ADMIN, UserRole.fromString("ROLE_SYSTEM_ADMIN"));
    }

    @Test
    void mapsTeachingAssistantAliasesToTeacher() {
        assertEquals(UserRole.TEACHER, UserRole.fromString("TA"));
        assertEquals(UserRole.TEACHER, UserRole.fromString("TEACHING_ASSISTANT"));
    }

    @Test
    void defaultsMissingRoleToStudent() {
        assertEquals(UserRole.STUDENT, UserRole.fromString(null));
        assertEquals(UserRole.STUDENT, UserRole.fromString(" "));
    }
}
