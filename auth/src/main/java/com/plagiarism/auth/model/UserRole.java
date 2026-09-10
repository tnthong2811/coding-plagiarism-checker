package com.plagiarism.auth.model;

public enum UserRole {
    STUDENT,
    TEACHER,
    BUSINESS_ADMIN,
    SYSTEM_ADMIN;

    public static UserRole fromString(String value) {
        if (value == null || value.isBlank()) {
            return STUDENT;
        }
        String normalized = value.trim().toUpperCase();
        if (normalized.startsWith("ROLE_")) {
            normalized = normalized.substring("ROLE_".length());
        }
        if ("USER".equals(normalized)) {
            return STUDENT;
        }
        if ("TEACHING_ASSISTANT".equals(normalized) || "TA".equals(normalized)) {
            return TEACHER;
        }
        if ("ADMIN".equals(normalized)) {
            return BUSINESS_ADMIN;
        }
        try {
            return UserRole.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            throw ex;
        }
    }
}

