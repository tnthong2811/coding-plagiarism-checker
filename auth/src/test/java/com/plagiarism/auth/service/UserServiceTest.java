package com.plagiarism.auth.service;

import com.plagiarism.auth.model.PasswordResetToken;
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
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
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
    void registerWithEmailVerificationCreatesResetRequiredUserAndSendsTemporaryPassword() {
        AccountMailService mailService = mock(AccountMailService.class);
        UserService userService = userService(mailService);

        User user = userService.registerWithEmailVerification(
                " student1 ",
                " Student@One.Edu "
        );

        assertThat(user.getUsername()).isEqualTo("student1");
        assertThat(user.getEmail()).isEqualTo("student@one.edu");
        assertThat(user.getRole()).isEqualTo(UserRole.STUDENT.name());
        assertThat(userService.isPasswordResetRequired(user)).isTrue();
        assertThat(passwordResetTokenRepository.findAll()).isEmpty();

        ArgumentCaptor<String> temporaryPasswordCaptor = ArgumentCaptor.forClass(String.class);
        verify(mailService).sendRegistrationTemporaryPasswordEmail(
                eq("student@one.edu"),
                eq("student1"),
                temporaryPasswordCaptor.capture()
        );
        assertThat(userService.checkPassword(user, temporaryPasswordCaptor.getValue())).isTrue();
    }

    @Test
    void registerWithEmailVerificationRejectsDuplicateEmail() {
        AccountMailService mailService = mock(AccountMailService.class);
        UserService userService = userService(mailService);
        userService.registerWithEmailVerification("student1", "student@example.edu");

        assertThatThrownBy(() -> userService.registerWithEmailVerification("student2", " STUDENT@example.edu "))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("email already registered");
    }

    @Test
    void completeTemporaryPasswordReplacesTemporaryPasswordAndClearsResetRequiredFlag() {
        AccountMailService mailService = mock(AccountMailService.class);
        UserService userService = userService(mailService);

        User user = userService.registerWithEmailVerification("student1", "student@example.edu");
        ArgumentCaptor<String> temporaryPasswordCaptor = ArgumentCaptor.forClass(String.class);
        verify(mailService).sendRegistrationTemporaryPasswordEmail(
                eq("student@example.edu"),
                eq("student1"),
                temporaryPasswordCaptor.capture()
        );

        User updated = userService.completeTemporaryPassword(
                " student1 ",
                temporaryPasswordCaptor.getValue(),
                "new-secret"
        );

        assertThat(userService.isPasswordResetRequired(updated)).isFalse();
        assertThat(userService.checkPassword(updated, "new-secret")).isTrue();
        assertThat(userService.checkPassword(updated, temporaryPasswordCaptor.getValue())).isFalse();
        assertThat(userRepository.findById(user.getId()))
                .hasValueSatisfying(saved -> assertThat(saved.getPasswordResetRequired()).isFalse());
    }

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
                temporaryPasswordCaptor.capture()
        );
        assertThat(userService.isPasswordResetRequired(onboardingUser)).isTrue();
        assertThat(passwordResetTokenRepository.findAll()).isEmpty();

        clearInvocations(mailService);
        GoogleOAuthRegistrationResult result = userService.registerGoogleOAuthEmail(" STUDENT@gmail.com ");

        assertThat(result.status()).isEqualTo(GoogleOAuthRegistrationResult.Status.EXISTING_USER);
        assertThat(userService.isPasswordResetRequired(result.user())).isFalse();
        assertThat(userService.checkPassword(result.user(), temporaryPasswordCaptor.getValue())).isFalse();
        assertThat(passwordResetTokenRepository.findAll()).isEmpty();
        verifyNoInteractions(mailService);
    }

    @Test
    void updateUsernameChangesUsernameWithoutChangingGoogleEmail() {
        UserService userService = userService(mock(AccountMailService.class));
        User user = userService.registerGoogleOAuthEmail("student@gmail.com").user();

        User updated = userService.updateUsername(user.getId(), "Student One");

        assertThat(updated.getUsername()).isEqualTo("Student One");
        assertThat(updated.getEmail()).isEqualTo("student@gmail.com");
        assertThat(userRepository.findByEmailIgnoreCase("student@gmail.com"))
                .hasValueSatisfying(found -> assertThat(found.getId()).isEqualTo(user.getId()));
    }

    @Test
    void updateUsernameRejectsDuplicateUsername() {
        UserService userService = userService(mock(AccountMailService.class));
        User first = userService.register("first", "secret", UserRole.STUDENT);
        userService.register("second", "secret", UserRole.STUDENT);

        assertThatThrownBy(() -> userService.updateUsername(first.getId(), "second"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("username exists");
    }

    @Test
    void updateAvatarUrlAcceptsRemoteAndDataImageUrls() {
        UserService userService = userService(mock(AccountMailService.class));
        User user = userService.register("student1", "secret", UserRole.STUDENT);

        User remoteAvatarUser = userService.updateAvatarUrl(user.getId(), " https://example.com/avatar.png ");
        assertThat(remoteAvatarUser.getAvatarUrl()).isEqualTo("https://example.com/avatar.png");

        User dataAvatarUser = userService.updateAvatarUrl(user.getId(), "data:image/png;base64,aGVsbG8=");
        assertThat(dataAvatarUser.getAvatarUrl()).isEqualTo("data:image/png;base64,aGVsbG8=");
    }

    @Test
    void updateAvatarUrlClearsBlankValue() {
        UserService userService = userService(mock(AccountMailService.class));
        User user = userService.register("student1", "secret", UserRole.STUDENT);
        userService.updateAvatarUrl(user.getId(), "https://example.com/avatar.png");

        User updated = userService.updateAvatarUrl(user.getId(), " ");

        assertThat(updated.getAvatarUrl()).isNull();
    }

    @Test
    void updateAvatarUrlRejectsUnsafeScheme() {
        UserService userService = userService(mock(AccountMailService.class));
        User user = userService.register("student1", "secret", UserRole.STUDENT);

        assertThatThrownBy(() -> userService.updateAvatarUrl(user.getId(), "javascript:alert(1)"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("avatar URL must be http or https");
    }

    @Test
    void requestTemporaryPasswordResetSendsTemporaryPasswordAndRequiresPasswordChange() {
        AccountMailService mailService = mock(AccountMailService.class);
        UserService userService = userService(mailService);
        User user = userService.registerWithEmailVerification("student1", "student@example.edu");
        userService.completeTemporaryPassword(
                "student1",
                captureRegistrationTemporaryPassword(mailService),
                "old-secret"
        );
        clearInvocations(mailService);

        userService.requestTemporaryPasswordReset(" STUDENT@example.edu ");

        User updated = userRepository.findById(user.getId()).orElseThrow();
        assertThat(userService.isPasswordResetRequired(updated)).isTrue();
        assertThat(userService.checkPassword(updated, "old-secret")).isFalse();

        ArgumentCaptor<String> temporaryPasswordCaptor = ArgumentCaptor.forClass(String.class);
        verify(mailService).sendPasswordResetTemporaryPasswordEmail(
                eq("student@example.edu"),
                eq("student1"),
                temporaryPasswordCaptor.capture()
        );
        assertThat(userService.checkPassword(updated, temporaryPasswordCaptor.getValue())).isTrue();
    }

    @Test
    void requestTemporaryPasswordResetIgnoresUnknownAccount() {
        AccountMailService mailService = mock(AccountMailService.class);
        UserService userService = userService(mailService);

        userService.requestTemporaryPasswordReset("missing@example.edu");

        verify(mailService, never()).sendPasswordResetTemporaryPasswordEmail(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString()
        );
    }

    @Test
    void deleteByIdDeletesPasswordResetTokensBeforeDeletingUser() {
        UserService userService = userService(mock(AccountMailService.class));
        User user = userService.register("student1", "secret", UserRole.STUDENT);
        PasswordResetToken token = new PasswordResetToken();
        token.setUser(user);
        token.setTokenHash("test-token-hash");
        token.setExpiresAt(LocalDateTime.now().plusMinutes(30));
        passwordResetTokenRepository.save(token);

        User deleted = userService.deleteById(user.getId(), "admin");

        assertThat(deleted.getUsername()).isEqualTo("student1");
        assertThat(userRepository.findById(user.getId())).isEmpty();
        assertThat(passwordResetTokenRepository.findAll()).isEmpty();
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

    private String captureRegistrationTemporaryPassword(AccountMailService mailService) {
        ArgumentCaptor<String> temporaryPasswordCaptor = ArgumentCaptor.forClass(String.class);
        verify(mailService).sendRegistrationTemporaryPasswordEmail(
                eq("student@example.edu"),
                eq("student1"),
                temporaryPasswordCaptor.capture()
        );
        return temporaryPasswordCaptor.getValue();
    }
}
