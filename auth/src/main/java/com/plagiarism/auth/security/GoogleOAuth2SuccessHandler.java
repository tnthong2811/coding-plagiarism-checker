package com.plagiarism.auth.security;

import com.plagiarism.auth.model.UserRole;
import com.plagiarism.auth.service.GoogleOAuthRegistrationResult;
import com.plagiarism.auth.service.UserService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Component
public class GoogleOAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final UserService userService;
    private final JwtUtil jwtUtil;
    private final String frontendBaseUrl;

    public GoogleOAuth2SuccessHandler(UserService userService,
                                      JwtUtil jwtUtil,
                                      @Value("${app.frontend-base-url:http://localhost:5173}") String frontendBaseUrl) {
        this.userService = userService;
        this.jwtUtil = jwtUtil;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        String email = extractEmail(authentication);
        if (email == null || email.isBlank()) {
            response.sendRedirect(frontendUrl() + "/register?googleStatus=email-missing");
            return;
        }

        if (!isVerifiedEmail(authentication)) {
            response.sendRedirect(frontendUrl() + "/register?googleStatus=email-unverified");
            return;
        }

        GoogleOAuthRegistrationResult result = userService.registerGoogleOAuthEmail(email);
        String role = UserRole.fromString(result.user().getRole()).name();
        String token = jwtUtil.generateToken(result.user().getUsername(), role);
        response.sendRedirect(frontendUrl() + "/oauth/callback?token=" + encode(token));
    }

    private String extractEmail(Authentication authentication) {
        Object principal = authentication.getPrincipal();
        if (principal instanceof OidcUser oidcUser) {
            return oidcUser.getEmail();
        }
        if (principal instanceof OAuth2User oauth2User) {
            Object email = oauth2User.getAttribute("email");
            return email == null ? null : email.toString();
        }
        return null;
    }

    private boolean isVerifiedEmail(Authentication authentication) {
        Object principal = authentication.getPrincipal();
        if (principal instanceof OidcUser oidcUser) {
            return Boolean.TRUE.equals(oidcUser.getEmailVerified());
        }
        if (principal instanceof OAuth2User oauth2User) {
            Object emailVerified = oauth2User.getAttribute("email_verified");
            if (emailVerified == null) {
                emailVerified = oauth2User.getAttribute("verified_email");
            }
            return Boolean.TRUE.equals(emailVerified) || "true".equalsIgnoreCase(String.valueOf(emailVerified));
        }
        return false;
    }

    private String frontendUrl() {
        if (frontendBaseUrl == null || frontendBaseUrl.isBlank()) {
            return "http://localhost:5173";
        }
        return frontendBaseUrl.trim().replaceAll("/+$", "");
    }

    private String encode(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }
}
