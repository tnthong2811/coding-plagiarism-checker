package com.plagiarism.auth.controller;

import com.plagiarism.auth.model.User;
import com.plagiarism.auth.model.UserRole;
import com.plagiarism.auth.security.JwtUtil;
import com.plagiarism.auth.service.UserService;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

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
                    String token = jwtUtil.generateToken(u.getUsername(), u.getRole());
                    return ResponseEntity.ok(Map.of("token", token, "role", u.getRole(), "username", u.getUsername()));
                })
                .orElseGet(() -> ResponseEntity.status(401).body(Map.of("error", "invalid credentials")));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(401).body(Map.of("error", "unauthorized"));
        }
        return userService.findByUsername(authentication.getName())
                .map(u -> ResponseEntity.ok(Map.of("id", u.getId(), "username", u.getUsername(), "role", u.getRole())))
                .orElseGet(() -> ResponseEntity.status(404).body(Map.of("error", "user not found")));
    }

    @PostMapping("/admin/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createByAdmin(@RequestBody CreateUserRequest req) {
        if (userService.findByUsername(req.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "username exists"));
        }
        UserRole role = UserRole.fromString(req.getRole());
        User u = userService.register(req.getUsername(), req.getPassword(), role);
        return ResponseEntity.ok(Map.of("id", u.getId(), "username", u.getUsername(), "role", u.getRole()));
    }

    @GetMapping("/admin/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> listUsers() {
        List<Map<String, Object>> users = userService.findAllUsers().stream()
                .map(u -> Map.<String, Object>of(
                        "id", u.getId(),
                        "username", u.getUsername(),
                        "role", u.getRole()
                ))
                .toList();
        return ResponseEntity.ok(users);
    }

    @RequestMapping(value = "/admin/users/{id}/role", method = {RequestMethod.PUT, RequestMethod.POST})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateUserRole(@PathVariable("id") Long id, @RequestBody UpdateUserRoleRequest req) {
        UserRole role = UserRole.fromString(req.getRole());
        return userService.findById(id)
                .map(u -> {
                    User updated = userService.updateRole(id, role);
                    return ResponseEntity.ok(Map.of("id", updated.getId(), "username", updated.getUsername(), "role", updated.getRole()));
                })
                .orElseGet(() -> ResponseEntity.status(404).body(Map.of("error", "user not found")));
    }

    @Data
    static class RegisterRequest {
        private String username;
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

