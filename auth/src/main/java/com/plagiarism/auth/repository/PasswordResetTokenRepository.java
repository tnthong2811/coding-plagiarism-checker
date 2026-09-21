package com.plagiarism.auth.repository;

import com.plagiarism.auth.model.PasswordResetToken;
import com.plagiarism.auth.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByTokenHashAndConsumedAtIsNull(String tokenHash);

    List<PasswordResetToken> findByUserAndConsumedAtIsNull(User user);
}
