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

    public void sendGoogleRegistrationEmail(String email, String temporaryPassword) {
        String subject = "Your CodeProof temporary password";
        String body = """
                Your CodeProof account has been created.

                Temporary password: %s

                Sign in with this temporary password. You will be asked to choose a new password immediately.

                If you did not request this account, ignore this email.
                """.formatted(temporaryPassword);

        if (!mailEnabled) {
            LOGGER.warn(
                    "Mail disabled. Google registration email for {}. Temporary password: {}",
                    email,
                    temporaryPassword
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

    public void sendRegistrationTemporaryPasswordEmail(String email, String username, String temporaryPassword) {
        String subject = "Your CodeProof temporary password";
        String body = """
                Your CodeProof account has been created.

                Username: %s
                Temporary password: %s

                Sign in with this temporary password. You will be asked to choose a new password immediately.

                If you did not request this account, ignore this email.
                """.formatted(username, temporaryPassword);

        if (!mailEnabled) {
            throw new IllegalStateException("Mail must be enabled before email-based registration can be used");
        }
        sendEmail(email, subject, body, "Registration temporary password: " + temporaryPassword);
    }

    private void sendEmail(String email, String subject, String body, String disabledLogDetail) {
        if (!mailEnabled) {
            LOGGER.warn("Mail disabled. {} for {}", disabledLogDetail, email);
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
