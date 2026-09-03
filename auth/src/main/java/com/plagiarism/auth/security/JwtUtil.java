package com.plagiarism.auth.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component
public class JwtUtil {

    private final Key key;

    private final long validityMs;

    public JwtUtil(@Value("${JWT_SECRET:dev-jwt-secret-key-change-in-production}") String secret,
                   @Value("${JWT_EXPIRATION:86400000}") long validityMs) {
        // secret must be at least 256 bits for HS256
        this.key = Keys.hmacShaKeyFor(secret.getBytes());
        this.validityMs = validityMs;
    }

    public String generateToken(String username) {
        return generateToken(username, null);
    }

    public String generateToken(String username, String role) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + validityMs);
        JwtBuilder builder = Jwts.builder()
                .setSubject(username)
                .setIssuedAt(now)
                .setExpiration(expiry)
                .signWith(key, SignatureAlgorithm.HS256);
        if (role != null && !role.isBlank()) {
            builder.claim("role", role);
        }
        return builder.compact();
    }

    public Claims validateAndGetClaims(String token) {
        try {
            Jws<Claims> claims = Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return claims.getBody();
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }

    public String validateAndGetSubject(String token) {
        Claims claims = validateAndGetClaims(token);
        return claims == null ? null : claims.getSubject();
    }
}

