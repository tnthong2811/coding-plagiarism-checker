package com.plagiarism.auth.service;

import com.plagiarism.auth.model.User;
import com.plagiarism.auth.repository.PasswordResetTokenRepository;
import com.plagiarism.auth.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

@DataJpaTest
@ActiveProfiles("test")
class UserServiceTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Test
    void googleEmailRegistrationSendsTemporaryPasswordAndRequiresReset() {
        AccountMailService mailService = mock(AccountMailService.class);
        UserService userService = userService(mailService);

        User user = userService.registerGoogleEmail(" Student@Gmail.Com ");

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
    void duplicateGoogleEmailRegistrationIsRejected() {
        UserService userService = userService(mock(AccountMailService.class));
        userService.registerGoogleEmail("student@gmail.com");

        assertThatExceptionOfType(ResponseStatusException.class)
                .isThrownBy(() -> userService.registerGoogleEmail(" STUDENT@gmail.com "))
                .satisfies(ex -> {
                    assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(ex.getReason()).isEqualTo("email already registered");
                });
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
