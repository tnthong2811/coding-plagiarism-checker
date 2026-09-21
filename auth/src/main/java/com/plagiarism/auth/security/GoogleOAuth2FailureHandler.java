package com.plagiarism.auth.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class GoogleOAuth2FailureHandler implements AuthenticationFailureHandler {

    private final String frontendBaseUrl;

    public GoogleOAuth2FailureHandler(@Value("${app.frontend-base-url:http://localhost:5173}") String frontendBaseUrl) {
        this.frontendBaseUrl = frontendBaseUrl;
    }

    @Override
    public void onAuthenticationFailure(HttpServletRequest request,
                                        HttpServletResponse response,
                                        AuthenticationException exception) throws IOException, ServletException {
        response.sendRedirect(frontendUrl() + "/register?googleStatus=oauth-error");
    }

    private String frontendUrl() {
        if (frontendBaseUrl == null || frontendBaseUrl.isBlank()) {
            return "http://localhost:5173";
        }
        return frontendBaseUrl.trim().replaceAll("/+$", "");
    }
}
