package com.plagiarism.auth.service;

import com.plagiarism.auth.model.User;

public record GoogleOAuthRegistrationResult(User user, Status status) {

    public enum Status {
        ONBOARDING_EMAIL_SENT,
        EXISTING_ACTIVE_USER
    }
}
