package com.plagiarism.auth.service;

import com.plagiarism.auth.model.User;

public record GoogleOAuthRegistrationResult(User user, Status status) {

    public enum Status {
        CREATED,
        EXISTING_USER
    }
}
