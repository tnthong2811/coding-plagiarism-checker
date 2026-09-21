package com.plagiarism.auth.controller;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

import java.io.IOException;

@Controller
public class OAuthStatusController {

    private final ObjectProvider<ClientRegistrationRepository> clientRegistrationRepositoryProvider;
    private final String frontendBaseUrl;

    public OAuthStatusController(ObjectProvider<ClientRegistrationRepository> clientRegistrationRepositoryProvider,
                                 @Value("${app.frontend-base-url:http://localhost:5173}") String frontendBaseUrl) {
        this.clientRegistrationRepositoryProvider = clientRegistrationRepositoryProvider;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    @GetMapping("/oauth2/authorization/google")
    public void googleOAuthStatus(HttpServletResponse response) throws IOException {
        String status = clientRegistrationRepositoryProvider.getIfAvailable() == null
                ? "oauth-not-configured"
                : "oauth-error";
        response.sendRedirect(frontendUrl() + "/register?googleStatus=" + status);
    }

    private String frontendUrl() {
        if (frontendBaseUrl == null || frontendBaseUrl.isBlank()) {
            return "http://localhost:5173";
        }
        return frontendBaseUrl.trim().replaceAll("/+$", "");
    }
}
