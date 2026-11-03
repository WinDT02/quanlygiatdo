package com.stu.edu.vn.service;

import com.stu.edu.vn.dto.ForgotPasswordRequest;
import com.stu.edu.vn.dto.ResetPasswordRequest;
import com.stu.edu.vn.entity.User;
import com.stu.edu.vn.entity.enums.AuthProvider;
import com.stu.edu.vn.entity.enums.UserStatus;
import com.stu.edu.vn.exception.BadRequestException;
import com.stu.edu.vn.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HexFormat;

/**
 * Forgot / reset password with a 6-digit e-mail code.
 * <ul>
 *   <li>code valid 5 minutes, one active code per user (a new request replaces the old one);</li>
 *   <li>only a SHA-256 hash is stored, never the code;</li>
 *   <li>5 wrong guesses destroy the code (6 digits alone could otherwise be brute-forced);</li>
 *   <li>at most one e-mail per minute per account;</li>
 *   <li>the API never reveals whether an e-mail is registered.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class PasswordResetService {

    static final int OTP_VALID_MINUTES = 5;
    static final int MAX_ATTEMPTS = 5;
    static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);
    static final String INVALID_OTP = "Mã OTP không hợp lệ hoặc đã hết hạn";

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    /** Step 1. Silent when nothing should be sent (unknown e-mail, banned, Google account, cool-down). */
    @Transactional
    public void requestReset(ForgotPasswordRequest request) {
        String email = normalize(request.email());
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null
                || user.getStatus() != UserStatus.ACTIVE
                || user.getAuthProvider() != AuthProvider.LOCAL) {      // Google accounts have no password to reset
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        if (user.getOtpResetExpires() != null) {
            LocalDateTime lastSentAt = user.getOtpResetExpires().minusMinutes(OTP_VALID_MINUTES);
            if (lastSentAt.plus(RESEND_COOLDOWN).isAfter(now)) {
                return;
            }
        }

        String otp = generateOtp();
        user.setOtpReset(hash(email, otp));
        user.setOtpResetExpires(now.plusMinutes(OTP_VALID_MINUTES));
        user.setOtpResetAttempts(0);

        emailService.sendPasswordResetOtp(user.getEmail(), user.getFullName(), otp, OTP_VALID_MINUTES);
    }

    /**
     * Step 2. Every failure about the code gives the same message. noRollbackFor: the wrong-guess counter
     * (and the destroyed code) must be saved even though we then throw.
     */
    @Transactional(noRollbackFor = BadRequestException.class)
    public void resetPassword(ResetPasswordRequest request) {
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new BadRequestException("Mật khẩu nhập lại không khớp");
        }

        String email = normalize(request.email());
        User user = userRepository.findByEmail(email).orElseThrow(() -> new BadRequestException(INVALID_OTP));
        LocalDateTime now = LocalDateTime.now();

        if (user.getOtpReset() == null
                || user.getOtpResetExpires() == null
                || user.getOtpResetExpires().isBefore(now)
                || user.getOtpResetAttempts() >= MAX_ATTEMPTS
                || user.getStatus() != UserStatus.ACTIVE) {
            clearOtp(user);
            throw new BadRequestException(INVALID_OTP);
        }

        boolean matches = MessageDigest.isEqual(
                hash(email, request.otp()).getBytes(StandardCharsets.UTF_8),
                user.getOtpReset().getBytes(StandardCharsets.UTF_8));
        if (!matches) {
            user.setOtpResetAttempts(user.getOtpResetAttempts() + 1);
            if (user.getOtpResetAttempts() >= MAX_ATTEMPTS) {
                clearOtp(user);
            }
            throw new BadRequestException(INVALID_OTP);
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setRefreshTokenHash(null);       // forget any refresh token issued before the reset
        clearOtp(user);
    }

    // ----------------------------------------------------------------- helpers

    private void clearOtp(User user) {
        user.setOtpReset(null);
        user.setOtpResetExpires(null);
        user.setOtpResetAttempts(0);
    }

    /** 000000-999999, zero padded. */
    static String generateOtp() {
        return String.format("%06d", RANDOM.nextInt(1_000_000));
    }

    /** SHA-256(email:otp) as hex; the e-mail acts as a per-user salt. */
    static String hash(String email, String otp) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest((email + ":" + otp).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    private String normalize(String email) {
        return email.trim().toLowerCase();
    }
}
