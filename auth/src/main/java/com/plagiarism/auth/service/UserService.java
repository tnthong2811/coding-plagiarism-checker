package com.plagiarism.auth.service;

import com.plagiarism.auth.model.User;
import com.plagiarism.auth.model.UserRole;
import com.plagiarism.auth.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
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
        return userRepository.save(u);
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public boolean checkPassword(User user, String rawPassword) {
        return passwordEncoder.matches(rawPassword, user.getPasswordHash());
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
}

