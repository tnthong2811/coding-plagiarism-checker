package com.plagiarism.auth.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class AccountMailService {

    private static final Logger LOGGER = LoggerFactory.getLogger(AccountMailService.class);

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final boolean mailEnabled;
    private final String fromAddress;

    public AccountMailService(ObjectProvider<JavaMailSender> mailSenderProvider,
                              @Value("${app.mail.enabled:false}") boolean mailEnabled,
                              @Value("${app.mail.from:noreply@codeproof.local}") String fromAddress) {
        this.mailSenderProvider = mailSenderProvider;
        this.mailEnabled = mailEnabled;
        this.fromAddress = fromAddress;
    }

    public void sendGoogleRegistrationEmail(String email, String temporaryPassword, String resetLink) {
        String subject = "CodeProof account password reset";
        String body = """
                Your CodeProof account has been created.

                Temporary password: %s

                You must reset your password before signing in:
                %s

                If you did not request this account, ignore this email.
                """.formatted(temporaryPassword, resetLink);

        if (!mailEnabled) {
            LOGGER.warn(
                    "Mail disabled. Google registration email for {}. Temporary password: {}. Reset link: {}",
                    email,
                    temporaryPassword,
                    resetLink
            );
            return;
        }

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            throw new IllegalStateException("Mail is enabled but JavaMailSender is not configured");
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(email);
        message.setSubject(subject);
        message.setText(body);
        mailSender.send(message);
    }
}
