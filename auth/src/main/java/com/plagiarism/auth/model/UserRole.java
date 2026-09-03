package com.plagiarism.auth.model;

public enum UserRole {
    STUDENT,
    TEACHER,
    ADMIN;

    public static UserRole fromString(String value) {
        if (value == null || value.isBlank()) {
            return STUDENT;
        }
        try {
            return UserRole.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            // Backward compatibility for older values
            if ("USER".equalsIgnoreCase(value)) {
                return STUDENT;
            }
            throw ex;
        }
    }
}

