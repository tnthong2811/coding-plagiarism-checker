package com.plagiarism.auth.controller;

import com.plagiarism.auth.model.User;
import com.plagiarism.auth.model.UserRole;
import com.plagiarism.auth.security.JwtUtil;
import com.plagiarism.auth.service.UserService;
import lombok.Data;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;
    private final JwtUtil jwtUtil;

    public AuthController(UserService userService, JwtUtil jwtUtil) {
        this.userService = userService;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest req) {
        User u = userService.registerWithEmailVerification(req.getUsername(), req.getEmail());
        Map<String, Object> response = userResponse(u);
        response.put("message", "Account created. Check your email for the temporary password, then sign in to set a new password.");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        return userService.findByUsername(req.getUsername())
                .filter(u -> userService.checkPassword(u, req.getPassword()))
                .map(u -> {
                    if (userService.isPasswordResetRequired(u)) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body(Map.of(
                                        "error", "password reset required",
                                        "message", "Temporary password accepted. Choose a new password to continue."
                                ));
                    }
                    String role = roleName(u);
                    String token = jwtUtil.generateToken(u.getUsername(), role);
                    return ResponseEntity.ok(Map.of("token", token, "role", role, "username", u.getUsername()));
                })
                .orElseGet(() -> ResponseEntity.status(401).body(Map.of("error", "invalid credentials")));
    }

    @PostMapping("/password/forgot")
    public ResponseEntity<?> forgotPassword(@RequestBody ForgotPasswordRequest req) {
        userService.requestTemporaryPasswordReset(req.getIdentifier());
        return ResponseEntity.ok(Map.of(
                "message",
                "If the account exists and has an email address, a temporary password has been sent."
        ));
    }

    @PostMapping("/password/reset")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest req) {
        User user = userService.resetPassword(req.getToken(), req.getPassword());
        Map<String, Object> response = userResponse(user);
        response.put("message", "Password reset successfully. You can log in now.");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/password/temporary")
    public ResponseEntity<?> completeTemporaryPassword(@RequestBody TemporaryPasswordRequest req) {
        User user = userService.completeTemporaryPassword(
                req.getUsername(),
                req.getTemporaryPassword(),
                req.getPassword()
        );
        String role = roleName(user);
        String token = jwtUtil.generateToken(user.getUsername(), role);
        return ResponseEntity.ok(Map.of(
                "token", token,
                "role", role,
                "username", user.getUsername(),
                "message", "Password updated successfully."
        ));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body(Map.of("error", "unauthorized"));
        }
        return authenticatedUser(authentication)
                .map(u -> ResponseEntity.ok(userResponse(u)))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "unauthorized")));
    }

    @PostMapping("/me/username")
    public ResponseEntity<?> updateMyUsername(@RequestBody UpdateUsernameRequest req, Authentication authentication) {
        User currentUser = authenticatedUser(authentication)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "unauthorized"));
        User updatedUser = userService.updateUsername(currentUser.getId(), req.getUsername());
        String role = roleName(updatedUser);
        String token = jwtUtil.generateToken(updatedUser.getUsername(), role);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("token", token);
        response.put("user", userResponse(updatedUser));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/me/avatar")
    public ResponseEntity<?> updateMyAvatar(@RequestBody UpdateAvatarRequest req, Authentication authentication) {
        User currentUser = authenticatedUser(authentication)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "unauthorized"));
        User updatedUser = userService.updateAvatarUrl(currentUser.getId(), req.getAvatarUrl());
        return ResponseEntity.ok(userResponse(updatedUser));
    }

    @PostMapping("/admin/users")
    @PreAuthorize("hasAnyRole('BUSINESS_ADMIN','SYSTEM_ADMIN')")
    public ResponseEntity<?> createByAdmin(@RequestBody CreateUserRequest req, Authentication authentication) {
        if (userService.findByUsername(req.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "username exists"));
        }
        UserRole role = UserRole.fromString(req.getRole());
        requireAssignableRole(authentication, role);
        User u = userService.register(req.getUsername(), req.getPassword(), role);
        return ResponseEntity.ok(userResponse(u));
    }

    @GetMapping("/admin/users")
    @PreAuthorize("hasAnyRole('BUSINESS_ADMIN','SYSTEM_ADMIN')")
    public ResponseEntity<?> listUsers() {
        List<Map<String, Object>> users = userService.findAllUsers().stream()
                .map(this::userResponse)
                .toList();
        return ResponseEntity.ok(users);
    }

    @RequestMapping(value = "/admin/users/{id}/role", method = {RequestMethod.PUT, RequestMethod.POST})
    @PreAuthorize("hasAnyRole('BUSINESS_ADMIN','SYSTEM_ADMIN')")
    public ResponseEntity<?> updateUserRole(@PathVariable("id") Long id,
                                            @RequestBody UpdateUserRoleRequest req,
                                            Authentication authentication) {
        UserRole role = UserRole.fromString(req.getRole());
        User target = userService.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "user not found"));
        requireManageableTarget(authentication, target);
        requireAssignableRole(authentication, role);
        User updated = userService.updateRole(id, role);
        return ResponseEntity.ok(userResponse(updated));
    }

    @DeleteMapping("/admin/users/{id}")
    @PreAuthorize("hasAnyRole('BUSINESS_ADMIN','SYSTEM_ADMIN')")
    public ResponseEntity<?> deleteUser(@PathVariable("id") Long id, Authentication authentication) {
        User target = userService.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "user not found"));
        requireManageableTarget(authentication, target);
        User deleted = userService.deleteById(id, authentication.getName());
        return ResponseEntity.ok(userResponse(deleted));
    }

    private Map<String, Object> userResponse(User user) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", user.getId());
        response.put("username", user.getUsername());
        response.put("email", user.getEmail());
        response.put("avatarUrl", user.getAvatarUrl());
        response.put("role", roleName(user));
        response.put("passwordResetRequired", userService.isPasswordResetRequired(user));
        return response;
    }

    private String roleName(User user) {
        return UserRole.fromString(user.getRole()).name();
    }

    private void requireAssignableRole(Authentication authentication, UserRole role) {
        UserRole currentRole = currentRole(authentication);
        if (currentRole != UserRole.SYSTEM_ADMIN && role == UserRole.SYSTEM_ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "only system admin can assign SYSTEM_ADMIN role");
        }
    }

    private void requireManageableTarget(Authentication authentication, User target) {
        UserRole currentRole = currentRole(authentication);
        UserRole targetRole = UserRole.fromString(target.getRole());
        if (currentRole != UserRole.SYSTEM_ADMIN && targetRole == UserRole.SYSTEM_ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "only system admin can manage SYSTEM_ADMIN users");
        }
    }

    private UserRole currentRole(Authentication authentication) {
        if (authentication == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "unauthorized");
        }
        return authenticatedUser(authentication)
                .map(user -> UserRole.fromString(user.getRole()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "unauthorized"));
    }

    private Optional<User> authenticatedUser(Authentication authentication) {
        if (authentication.getName() != null && !authentication.getName().isBlank()) {
            Optional<User> byUsername = userService.findByUsername(authentication.getName());
            if (byUsername.isPresent()) {
                return byUsername;
            }
        }

        String email = authenticatedEmail(authentication);
        if (email == null || email.isBlank()) {
            return Optional.empty();
        }
        return userService.findByEmail(email);
    }

    private String authenticatedEmail(Authentication authentication) {
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

    @Data
    static class RegisterRequest {
        private String email;
        private String username;
    }

    @Data
    static class ResetPasswordRequest {
        private String token;
        private String password;
    }

    @Data
    static class ForgotPasswordRequest {
        private String identifier;
    }

    @Data
    static class TemporaryPasswordRequest {
        private String username;
        private String temporaryPassword;
        private String password;
    }

    @Data
    static class LoginRequest {
        private String username;
        private String password;
    }

    @Data
    static class UpdateUsernameRequest {
        private String username;
    }

    @Data
    static class UpdateAvatarRequest {
        private String avatarUrl;
    }

    @Data
    static class CreateUserRequest {
        private String username;
        private String password;
        private String role;
    }

    @Data
    static class UpdateUserRoleRequest {
        private String role;
    }
}

