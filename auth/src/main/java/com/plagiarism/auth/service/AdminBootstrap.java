package com.plagiarism.auth.service;

import com.plagiarism.auth.model.UserRole;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class AdminBootstrap implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final UserService userService;

    @Value("${BOOTSTRAP_ADMIN_USERNAME:}")
    private String bootstrapUsername;

    @Value("${BOOTSTRAP_ADMIN_PASSWORD:}")
    private String bootstrapPassword;

    public AdminBootstrap(UserService userService) {
        this.userService = userService;
    }

    @Override
    public void run(String... args) {
        if (bootstrapUsername == null || bootstrapUsername.isBlank() || bootstrapPassword == null || bootstrapPassword.isBlank()) {
            return;
        }
        if (userService.findByUsername(bootstrapUsername).isEmpty()) {
            userService.register(bootstrapUsername, bootstrapPassword, UserRole.ADMIN);
            log.info("Bootstrap admin user created: {}", bootstrapUsername);
        }
    }
}

