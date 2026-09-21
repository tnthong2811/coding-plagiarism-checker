package com.plagiarism.auth.service;

import com.plagiarism.auth.model.User;
import com.plagiarism.auth.model.UserRole;
import com.plagiarism.auth.repository.PasswordResetTokenRepository;
import com.plagiarism.auth.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@DataJpaTest
@ActiveProfiles("test")
class UserServiceTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Test
    void googleOAuthRegistrationSendsTemporaryPasswordAndRequiresReset() {
        AccountMailService mailService = mock(AccountMailService.class);
        UserService userService = userService(mailService);

        GoogleOAuthRegistrationResult result = userService.registerGoogleOAuthEmail(" Student@Gmail.Com ");
        User user = result.user();

        assertThat(result.status()).isEqualTo(GoogleOAuthRegistrationResult.Status.ONBOARDING_EMAIL_SENT);
        assertThat(user.getUsername()).isEqualTo("student@gmail.com");
        assertThat(user.getEmail()).isEqualTo("student@gmail.com");
        assertThat(userService.isPasswordResetRequired(user)).isTrue();

        ArgumentCaptor<String> passwordCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> linkCaptor = ArgumentCaptor.forClass(String.class);
        verify(mailService).sendGoogleRegistrationEmail(
                eq("student@gmail.com"),
                passwordCaptor.capture(),
                linkCaptor.capture()
        );

        assertThat(userService.checkPassword(user, passwordCaptor.getValue())).isTrue();
        assertThat(linkCaptor.getValue()).startsWith("http://localhost:5173/reset-password?token=");

        User resetUser = userService.resetPassword(tokenFrom(linkCaptor.getValue()), "new-secret");

        assertThat(userService.isPasswordResetRequired(resetUser)).isFalse();
        assertThat(userService.checkPassword(resetUser, "new-secret")).isTrue();
        assertThat(passwordResetTokenRepository.findAll())
                .allSatisfy(token -> assertThat(token.getConsumedAt()).isNotNull());
    }

    @Test
    void googleOAuthRegistrationForActiveUserDoesNotSendAnotherResetEmail() {
        AccountMailService mailService = mock(AccountMailService.class);
        UserService userService = userService(mailService);
        User existing = userService.register("student@gmail.com", "student-secret", UserRole.STUDENT);

        GoogleOAuthRegistrationResult result = userService.registerGoogleOAuthEmail(" STUDENT@gmail.com ");

        assertThat(result.status()).isEqualTo(GoogleOAuthRegistrationResult.Status.EXISTING_ACTIVE_USER);
        assertThat(result.user().getId()).isEqualTo(existing.getId());
        assertThat(result.user().getEmail()).isEqualTo("student@gmail.com");
        assertThat(userService.checkPassword(result.user(), "student-secret")).isTrue();
        verifyNoInteractions(mailService);
    }

    private UserService userService(AccountMailService mailService) {
        return new UserService(
                userRepository,
                passwordResetTokenRepository,
                new BCryptPasswordEncoder(),
                mailService,
                "http://localhost:5173",
                30
        );
    }

    private String tokenFrom(String resetLink) {
        return URLDecoder.decode(resetLink.substring(resetLink.indexOf("token=") + "token=".length()), StandardCharsets.UTF_8);
    }
}
