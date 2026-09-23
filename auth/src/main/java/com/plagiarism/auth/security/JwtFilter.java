package com.plagiarism.auth.security;

import com.plagiarism.auth.model.UserRole;
import com.plagiarism.auth.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import io.jsonwebtoken.Claims;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@Component
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    public JwtFilter(JwtUtil jwtUtil, UserRepository userRepository) {
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            Claims claims = jwtUtil.validateAndGetClaims(token);
            String subject = claims == null ? null : claims.getSubject();
            String role = claims == null ? null : claims.get("role", String.class);
            if (subject != null) {
                Optional<com.plagiarism.auth.model.User> user = userRepository.findByUsername(subject);
                if (user.isEmpty()) {
                    SecurityContextHolder.clearContext();
                    filterChain.doFilter(request, response);
                    return;
                }
                List<SimpleGrantedAuthority> authorities =
                        List.of(new SimpleGrantedAuthority("ROLE_" + resolveRole(user.get(), role)));
                UserDetails ud = User.withUsername(subject).password("").authorities(authorities).build();
                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(ud, null, ud.getAuthorities());
                auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(auth);
            } else {
                SecurityContextHolder.clearContext();
            }
        }
        filterChain.doFilter(request, response);
    }

    private String resolveRole(com.plagiarism.auth.model.User user, String tokenRole) {
        String role = user.getRole();
        if (role == null || role.isBlank()) {
            role = tokenRole;
        }
        return normalizeRole(role);
    }

    private String normalizeRole(String role) {
        try {
            return UserRole.fromString(role).name();
        } catch (IllegalArgumentException ex) {
            return "STUDENT";
        }
    }
}

