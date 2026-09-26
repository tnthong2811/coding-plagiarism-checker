package com.plagiarism.auth.service;

import com.plagiarism.auth.model.PasswordResetToken;
import com.plagiarism.auth.model.User;
import com.plagiarism.auth.model.UserRole;
import com.plagiarism.auth.repository.PasswordResetTokenRepository;
import com.plagiarism.auth.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

@Service
public class UserService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final Pattern DATA_IMAGE_PATTERN = Pattern.compile(
            "^data:image/(png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/=]+$",
            Pattern.CASE_INSENSITIVE
    );
    private static final int TEMPORARY_PASSWORD_BYTES = 12;
    private static final int RESET_TOKEN_BYTES = 32;
    private static final int MAX_AVATAR_URL_LENGTH = 1_400_000;
    private static final int MAX_REMOTE_AVATAR_URL_LENGTH = 2_048;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AccountMailService accountMailService;
    private final String frontendBaseUrl;
    private final long resetTokenExpirationMinutes;

    public UserService(UserRepository userRepository,
                       PasswordResetTokenRepository passwordResetTokenRepository,
                       PasswordEncoder passwordEncoder,
                       AccountMailService accountMailService,
                       @Value("${app.frontend-base-url:http://localhost:5173}") String frontendBaseUrl,
                       @Value("${app.password-reset.token-expiration-minutes:30}") long resetTokenExpirationMinutes) {
        this.userRepository = userRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.accountMailService = accountMailService;
        this.frontendBaseUrl = frontendBaseUrl;
        this.resetTokenExpirationMinutes = resetTokenExpirationMinutes;
    }

    public User register(String username, String rawPassword) {
        return register(username, rawPassword, UserRole.STUDENT);
    }

    public User register(String username, String rawPassword, UserRole role) {
        String hash = passwordEncoder.encode(rawPassword);
        User u = new User();
        u.setUsername(username);
        u.setPasswordHash(hash);
        u.setRole(role.name());
        u.setPasswordResetRequired(false);
        return userRepository.save(u);
    }

    @Transactional
    public User registerWithEmailVerification(String username, String email) {
        String normalizedUsername = normalizeUsername(username);
        String normalizedEmail = normalizeEmail(email);

        if (userRepository.findByUsername(normalizedUsername).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "username exists");
        }
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email already registered");
        }

        String temporaryPassword = generateSecret(TEMPORARY_PASSWORD_BYTES);
        User user = new User();
        user.setUsername(normalizedUsername);
        user.setEmail(normalizedEmail);
        user.setPasswordHash(passwordEncoder.encode(temporaryPassword));
        user.setRole(UserRole.STUDENT.name());
        user.setPasswordResetRequired(true);
        User saved = userRepository.save(user);
        accountMailService.sendRegistrationTemporaryPasswordEmail(
                saved.getEmail(),
                saved.getUsername(),
                temporaryPassword
        );
        return saved;
    }

    @Transactional
    public User registerGoogleEmail(String email) {
        String normalizedEmail = normalizeEmail(email);
        if (userRepository.findByUsername(normalizedEmail).isPresent()
                || userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email already registered");
        }

        User user = new User();
        user.setUsername(normalizedEmail);
        user.setEmail(normalizedEmail);
        user.setRole(UserRole.STUDENT.name());
        user.setPasswordResetRequired(true);
        return issueGoogleOnboardingEmail(user);
    }

    @Transactional
    public GoogleOAuthRegistrationResult registerGoogleOAuthEmail(String email) {
        String normalizedEmail = normalizeEmail(email);
        Optional<User> existingUser = userRepository.findByEmailIgnoreCase(normalizedEmail)
                .or(() -> userRepository.findByUsername(normalizedEmail));

        if (existingUser.isPresent()) {
            User user = existingUser.get();
            if (user.getEmail() == null || user.getEmail().isBlank()) {
                user.setEmail(normalizedEmail);
            }
            if (isPasswordResetRequired(user)) {
                consumeOutstandingPasswordResetTokens(user);
                user.setPasswordHash(passwordEncoder.encode(generateSecret(TEMPORARY_PASSWORD_BYTES)));
            }
            user.setPasswordResetRequired(false);
            User saved = userRepository.save(user);
            return new GoogleOAuthRegistrationResult(saved, GoogleOAuthRegistrationResult.Status.EXISTING_USER);
        }

        User user = new User();
        user.setUsername(normalizedEmail);
        user.setEmail(normalizedEmail);
        user.setRole(UserRole.STUDENT.name());
        user.setPasswordHash(passwordEncoder.encode(generateSecret(TEMPORARY_PASSWORD_BYTES)));
        user.setPasswordResetRequired(false);
        User saved = userRepository.save(user);
        return new GoogleOAuthRegistrationResult(saved, GoogleOAuthRegistrationResult.Status.CREATED);
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmailIgnoreCase(normalizeEmail(email));
    }

    public boolean checkPassword(User user, String rawPassword) {
        return passwordEncoder.matches(rawPassword, user.getPasswordHash());
    }

    public boolean isPasswordResetRequired(User user) {
        return Boolean.TRUE.equals(user.getPasswordResetRequired());
    }

    public List<User> findAllUsers() {
        return userRepository.findAll();
    }

    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    public User updateRole(Long id, UserRole role) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("user not found"));
        user.setRole(role.name());
        return userRepository.save(user);
    }

    @Transactional
    public User updateUsername(Long id, String username) {
        String normalizedUsername = normalizeUsername(username);
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "user not found"));

        Optional<User> existingUser = userRepository.findByUsername(normalizedUsername);
        if (existingUser.isPresent() && !existingUser.get().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "username exists");
        }

        user.setUsername(normalizedUsername);
        return userRepository.save(user);
    }

    @Transactional
    public User updateAvatarUrl(Long id, String avatarUrl) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "user not found"));

        user.setAvatarUrl(normalizeAvatarUrl(avatarUrl));
        return userRepository.save(user);
    }

    @Transactional
    public void requestTemporaryPasswordReset(String identifier) {
        String normalizedIdentifier = normalizeRequired(identifier, "email or username is required");
        Optional<User> userToReset = findResetCandidate(normalizedIdentifier);
        if (userToReset.isEmpty()) {
            return;
        }

        User user = userToReset.get();
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            return;
        }

        String temporaryPassword = generateSecret(TEMPORARY_PASSWORD_BYTES);
        consumeOutstandingPasswordResetTokens(user);
        user.setPasswordHash(passwordEncoder.encode(temporaryPassword));
        user.setPasswordResetRequired(true);
        User saved = userRepository.save(user);

        accountMailService.sendPasswordResetTemporaryPasswordEmail(
                saved.getEmail(),
                saved.getUsername(),
                temporaryPassword
        );
    }

    @Transactional
    public User resetPassword(String token, String rawPassword) {
        String normalizedToken = normalizeRequired(token, "reset token is required");
        String normalizedPassword = normalizeRequired(rawPassword, "password is required");
        if (normalizedPassword.length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "password must be at least 6 characters");
        }

        PasswordResetToken passwordResetToken = passwordResetTokenRepository
                .findByTokenHashAndConsumedAtIsNull(hashToken(normalizedToken))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "reset link is invalid"));

        if (passwordResetToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "reset link has expired");
        }

        passwordResetToken.setConsumedAt(LocalDateTime.now());
        User user = passwordResetToken.getUser();
        user.setPasswordHash(passwordEncoder.encode(normalizedPassword));
        user.setPasswordResetRequired(false);
        return userRepository.save(user);
    }

    @Transactional
    public User completeTemporaryPassword(String username, String temporaryPassword, String rawPassword) {
        String normalizedUsername = normalizeUsername(username);
        String normalizedTemporaryPassword = normalizeRequired(temporaryPassword, "temporary password is required");
        String normalizedPassword = normalizePassword(rawPassword);

        User user = userRepository.findByUsername(normalizedUsername)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid credentials"));
        if (!isPasswordResetRequired(user)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "password reset is not required");
        }
        if (!passwordEncoder.matches(normalizedTemporaryPassword, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid credentials");
        }

        user.setPasswordHash(passwordEncoder.encode(normalizedPassword));
        user.setPasswordResetRequired(false);
        consumeOutstandingPasswordResetTokens(user);
        return userRepository.save(user);
    }

    @Transactional
    public User deleteById(Long id, String currentUsername) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "user not found"));
        if (user.getUsername().equals(currentUsername)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "cannot delete your own account");
        }
        passwordResetTokenRepository.deleteByUser(user);
        userRepository.delete(user);
        return user;
    }

    private String normalizeEmail(String email) {
        String normalized = normalizeRequired(email, "email is required").toLowerCase(Locale.ROOT);
        if (!EMAIL_PATTERN.matcher(normalized).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email is invalid");
        }
        return normalized;
    }

    private String normalizeUsername(String username) {
        String normalized = normalizeRequired(username, "username is required");
        if (normalized.length() < 2 || normalized.length() > 60) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "username must be 2-60 characters");
        }
        return normalized;
    }

    private String normalizePassword(String password) {
        String normalized = normalizeRequired(password, "password is required");
        if (normalized.length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "password must be at least 6 characters");
        }
        return normalized;
    }

    private String normalizeAvatarUrl(String avatarUrl) {
        if (avatarUrl == null || avatarUrl.isBlank()) {
            return null;
        }

        String normalized = avatarUrl.trim();
        if (normalized.length() > MAX_AVATAR_URL_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "avatar image is too large");
        }

        String lower = normalized.toLowerCase(Locale.ROOT);
        if (lower.startsWith("data:image/")) {
            if (!DATA_IMAGE_PATTERN.matcher(normalized).matches()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "avatar image format is not supported");
            }
            return normalized;
        }

        if (normalized.length() > MAX_REMOTE_AVATAR_URL_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "avatar URL is too long");
        }

        URI uri;
        try {
            uri = URI.create(normalized);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "avatar URL is invalid");
        }

        String scheme = uri.getScheme();
        if (scheme == null || (!scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https"))
                || uri.getHost() == null || uri.getHost().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "avatar URL must be http or https");
        }

        return normalized;
    }

    private Optional<User> findResetCandidate(String identifier) {
        String normalized = identifier.trim();
        Optional<User> byEmail = EMAIL_PATTERN.matcher(normalized).matches()
                ? userRepository.findByEmailIgnoreCase(normalized.toLowerCase(Locale.ROOT))
                : Optional.empty();
        return byEmail.or(() -> userRepository.findByUsername(normalized));
    }

    private String normalizeRequired(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        return value.trim();
    }

    private String generateSecret(int byteCount) {
        byte[] bytes = new byte[byteCount];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private User issueGoogleOnboardingEmail(User user) {
        String temporaryPassword = generateSecret(TEMPORARY_PASSWORD_BYTES);

        if (user.getId() != null) {
            consumeOutstandingPasswordResetTokens(user);
        }

        user.setPasswordHash(passwordEncoder.encode(temporaryPassword));
        user.setPasswordResetRequired(true);
        User saved = userRepository.save(user);

        accountMailService.sendGoogleRegistrationEmail(
                saved.getEmail(),
                temporaryPassword
        );
        return saved;
    }

    private void consumeOutstandingPasswordResetTokens(User user) {
        LocalDateTime now = LocalDateTime.now();
        passwordResetTokenRepository.findByUserAndConsumedAtIsNull(user)
                .forEach(token -> token.setConsumedAt(now));
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hashed);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available", ex);
        }
    }

    private String passwordResetLink(String token) {
        String baseUrl = frontendBaseUrl == null || frontendBaseUrl.isBlank()
                ? "http://localhost:5173"
                : frontendBaseUrl.trim().replaceAll("/+$", "");
        return baseUrl + "/reset-password?token=" + URLEncoder.encode(token, StandardCharsets.UTF_8);
    }
}

