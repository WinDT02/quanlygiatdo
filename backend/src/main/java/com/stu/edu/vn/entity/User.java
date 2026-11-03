package com.stu.edu.vn.entity;

import com.stu.edu.vn.entity.enums.AuthProvider;
import com.stu.edu.vn.entity.enums.UserStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * Login account shared by admins, employees and customers.
 * The customer / employee profile lives in {@link Customer} / {@link Employee},
 * which own the 1-1 foreign key (user_id).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@Entity
@Table(name = "users")
public class User extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "email", nullable = false, unique = true, length = 191)
    private String email;

    /** BCrypt hash. NULL for accounts created through Google sign-in. */
    @Column(name = "password_hash")
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "auth_provider", nullable = false, length = 20)
    @Builder.Default
    private AuthProvider authProvider = AuthProvider.LOCAL;

    /** Subject ("sub") returned by the external provider, e.g. the Google account id. */
    @Column(name = "provider_id", length = 191)
    private String providerId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private UserStatus status = UserStatus.ACTIVE;

    @Column(name = "is_verified", nullable = false)
    @Builder.Default
    private boolean verified = false;

    /** SHA-256 hex of the e-mail verification code (never the 6 digits themselves). */
    @Column(name = "otp_register", length = 64)
    private String otpRegister;

    @Column(name = "otp_register_expires")
    private LocalDateTime otpRegisterExpires;

    /** Wrong guesses for the current verification code; the code is destroyed after too many. */
    @Column(name = "otp_register_attempts", nullable = false)
    @Builder.Default
    private int otpRegisterAttempts = 0;

    /** SHA-256 hex of the password-reset code (never the 6 digits themselves). */
    @Column(name = "otp_reset", length = 64)
    private String otpReset;

    @Column(name = "otp_reset_expires")
    private LocalDateTime otpResetExpires;

    /** Wrong guesses for the current reset code; the code is destroyed after too many. */
    @Column(name = "otp_reset_attempts", nullable = false)
    @Builder.Default
    private int otpResetAttempts = 0;

    /** Hash of the current refresh token (never store the raw token). */
    @Column(name = "refresh_token_hash")
    private String refreshTokenHash;
}
