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
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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
        if (userService.findByUsername(req.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "username exists"));
        }
        User u = userService.register(req.getUsername(), req.getPassword(), UserRole.STUDENT);
        return ResponseEntity.ok(Map.of("id", u.getId(), "username", u.getUsername(), "role", u.getRole()));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        return userService.findByUsername(req.getUsername())
                .filter(u -> userService.checkPassword(u, req.getPassword()))
                .map(u -> {
                    if (userService.isPasswordResetRequired(u)) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body(Map.of("error", "password reset required"));
                    }
                    String role = roleName(u);
                    String token = jwtUtil.generateToken(u.getUsername(), role);
                    return ResponseEntity.ok(Map.of("token", token, "role", role, "username", u.getUsername()));
                })
                .orElseGet(() -> ResponseEntity.status(401).body(Map.of("error", "invalid credentials")));
    }

    @PostMapping("/password/reset")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest req) {
        User user = userService.resetPassword(req.getToken(), req.getPassword());
        Map<String, Object> response = userResponse(user);
        response.put("message", "Password reset successfully. You can log in now.");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(401).body(Map.of("error", "unauthorized"));
        }
        return userService.findByUsername(authentication.getName())
                .map(u -> ResponseEntity.ok(userResponse(u)))
                .orElseGet(() -> ResponseEntity.status(404).body(Map.of("error", "user not found")));
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
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "unauthorized");
        }
        return userService.findByUsername(authentication.getName())
                .map(user -> UserRole.fromString(user.getRole()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "unauthorized"));
    }

    @Data
    static class RegisterRequest {
        private String username;
        private String password;
    }

    @Data
    static class ResetPasswordRequest {
        private String token;
        private String password;
    }

    @Data
    static class LoginRequest {
        private String username;
        private String password;
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

