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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.clearInvocations;
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
    void googleOAuthRegistrationCreatesActiveUserWithoutResetEmail() {
        AccountMailService mailService = mock(AccountMailService.class);
        UserService userService = userService(mailService);

        GoogleOAuthRegistrationResult result = userService.registerGoogleOAuthEmail(" Student@Gmail.Com ");
        User user = result.user();

        assertThat(result.status()).isEqualTo(GoogleOAuthRegistrationResult.Status.CREATED);
        assertThat(user.getUsername()).isEqualTo("student@gmail.com");
        assertThat(user.getEmail()).isEqualTo("student@gmail.com");
        assertThat(user.getRole()).isEqualTo(UserRole.STUDENT.name());
        assertThat(userService.isPasswordResetRequired(user)).isFalse();
        assertThat(passwordResetTokenRepository.findAll()).isEmpty();
        verifyNoInteractions(mailService);
    }

    @Test
    void googleOAuthRegistrationForExistingUserDoesNotSendResetEmail() {
        AccountMailService mailService = mock(AccountMailService.class);
        UserService userService = userService(mailService);
        User existing = userService.register("student@gmail.com", "student-secret", UserRole.STUDENT);

        GoogleOAuthRegistrationResult result = userService.registerGoogleOAuthEmail(" STUDENT@gmail.com ");

        assertThat(result.status()).isEqualTo(GoogleOAuthRegistrationResult.Status.EXISTING_USER);
        assertThat(result.user().getId()).isEqualTo(existing.getId());
        assertThat(result.user().getEmail()).isEqualTo("student@gmail.com");
        assertThat(userService.checkPassword(result.user(), "student-secret")).isTrue();
        verifyNoInteractions(mailService);
    }

    @Test
    void googleOAuthRegistrationActivatesResetRequiredUserWithoutResetEmail() {
        AccountMailService mailService = mock(AccountMailService.class);
        UserService userService = userService(mailService);

        User onboardingUser = userService.registerGoogleEmail("student@gmail.com");
        ArgumentCaptor<String> temporaryPasswordCaptor = ArgumentCaptor.forClass(String.class);
        verify(mailService).sendGoogleRegistrationEmail(
                eq("student@gmail.com"),
                temporaryPasswordCaptor.capture(),
                anyString()
        );
        assertThat(userService.isPasswordResetRequired(onboardingUser)).isTrue();
        assertThat(passwordResetTokenRepository.findAll())
                .anySatisfy(token -> assertThat(token.getConsumedAt()).isNull());

        clearInvocations(mailService);
        GoogleOAuthRegistrationResult result = userService.registerGoogleOAuthEmail(" STUDENT@gmail.com ");

        assertThat(result.status()).isEqualTo(GoogleOAuthRegistrationResult.Status.EXISTING_USER);
        assertThat(userService.isPasswordResetRequired(result.user())).isFalse();
        assertThat(userService.checkPassword(result.user(), temporaryPasswordCaptor.getValue())).isFalse();
        assertThat(passwordResetTokenRepository.findAll())
                .allSatisfy(token -> assertThat(token.getConsumedAt()).isNotNull());
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
}
