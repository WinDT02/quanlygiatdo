package com.stu.edu.vn.service;

import com.stu.edu.vn.entity.User;
import com.stu.edu.vn.entity.enums.UserStatus;
import com.stu.edu.vn.exception.BadRequestException;
import com.stu.edu.vn.exception.TooManyRequestsException;
import com.stu.edu.vn.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.LocalDateTime;

import static com.stu.edu.vn.service.PasswordResetService.INVALID_OTP;
import static com.stu.edu.vn.service.PasswordResetService.MAX_ATTEMPTS;
import static com.stu.edu.vn.service.PasswordResetService.OTP_VALID_MINUTES;
import static com.stu.edu.vn.service.PasswordResetService.RESEND_COOLDOWN;

/**
 * E-mail verification of a new account (status PENDING -> ACTIVE) with a 6-digit code.
 * Same safety rules as the password reset: 5-minute code, only a SHA-256 hash is stored (users.otp_register),
 * 5 wrong guesses destroy the code, at most one e-mail per minute.
 * The hash uses a "register:" salt prefix, so a password-reset code can never be used here (and vice versa).
 */
@Service
@RequiredArgsConstructor
public class RegistrationVerificationService {

    private static final String SALT_PREFIX = "register:";

    private final UserRepository userRepository;
    private final EmailService emailService;

    /** Generates a fresh code for the user, stores its hash and e-mails the code. Joins the caller's transaction. */
    @Transactional
    public void issueOtp(User user) {

        String otp = PasswordResetService.generateOtp();
        user.setOtpRegister(hash(user.getEmail(), otp));
        System.out.println("MÃ OTP : " + otp);
        user.setOtpRegisterExpires(LocalDateTime.now().plusMinutes(OTP_VALID_MINUTES));
        user.setOtpRegisterAttempts(0);
        emailService.sendRegisterOtp(user.getEmail(), user.getFullName(), otp, OTP_VALID_MINUTES);
    }

    /**
     * Sends a new code to an account that is still PENDING, at most once per 60 seconds.
     * Unknown or already-active e-mails are ignored silently (the caller answers 200 either way).
     *
     * @throws TooManyRequestsException (429) when asked again inside the cool-down
     */
    @Transactional
    public void resendOtp(String rawEmail) {
        String email = normalize(rawEmail);
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || user.getStatus() != UserStatus.PENDING) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        if (user.getOtpRegisterExpires() != null) {
            LocalDateTime nextAllowedAt = user.getOtpRegisterExpires()
                    .minusMinutes(OTP_VALID_MINUTES)
                    .plus(RESEND_COOLDOWN);
            if (nextAllowedAt.isAfter(now)) {
                long wait = Math.max(1, Duration.between(now, nextAllowedAt).toSeconds() + 1);
                throw new TooManyRequestsException("Vui lòng đợi " + wait + " giây trước khi yêu cầu gửi lại mã OTP");
            }
        }
        issueOtp(user);
    }

    /**
     * Checks the code and activates the account. Every failure gives the same message.
     * noRollbackFor: the wrong-guess counter / destroyed code must be saved even though we throw.
     *
     * @return the now ACTIVE user (role loaded)
     */
    @Transactional(noRollbackFor = BadRequestException.class)
    public User verifyAndActivate(String rawEmail, String otp) {
        String email = normalize(rawEmail);
        User user = userRepository.findByEmail(email).orElseThrow(() -> new BadRequestException(INVALID_OTP));
        LocalDateTime now = LocalDateTime.now();

        if (user.getStatus() != UserStatus.PENDING
                || user.getOtpRegister() == null
                || user.getOtpRegisterExpires() == null
                || user.getOtpRegisterExpires().isBefore(now)
                || user.getOtpRegisterAttempts() >= MAX_ATTEMPTS) {
            if (user.getStatus() == UserStatus.PENDING) {
                clearOtp(user);          // expired / exhausted code: only "resend" can help now
            }
            throw new BadRequestException(INVALID_OTP);
        }

        boolean matches = MessageDigest.isEqual(
                hash(email, otp).getBytes(StandardCharsets.UTF_8),
                user.getOtpRegister().getBytes(StandardCharsets.UTF_8));
        if (!matches) {
            user.setOtpRegisterAttempts(user.getOtpRegisterAttempts() + 1);
            if (user.getOtpRegisterAttempts() >= MAX_ATTEMPTS) {
                clearOtp(user);
            }
            throw new BadRequestException(INVALID_OTP);
        }

        user.setStatus(UserStatus.ACTIVE);
        user.setVerified(true);
        clearOtp(user);
        return user;
    }

    private void clearOtp(User user) {
        user.setOtpRegister(null);
        user.setOtpRegisterExpires(null);
        user.setOtpRegisterAttempts(0);
    }

    private static String hash(String email, String otp) {
        return PasswordResetService.hash(SALT_PREFIX + email, otp);
    }

    private String normalize(String email) {
        return email.trim().toLowerCase();
    }
}
