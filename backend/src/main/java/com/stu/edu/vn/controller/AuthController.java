package com.stu.edu.vn.controller;

import com.stu.edu.vn.dto.AuthResponse;
import com.stu.edu.vn.dto.ForgotPasswordRequest;
import com.stu.edu.vn.dto.GoogleLoginRequest;
import com.stu.edu.vn.dto.MessageResponse;
import com.stu.edu.vn.dto.ResendRegisterOtpRequest;
import com.stu.edu.vn.dto.ResetPasswordRequest;
import com.stu.edu.vn.dto.VerifyRegisterRequest;
import com.stu.edu.vn.dto.LoginRequest;
import com.stu.edu.vn.dto.RegisterRequest;
import com.stu.edu.vn.dto.UserResponse;
import com.stu.edu.vn.security.UserPrincipal;
import com.stu.edu.vn.service.AuthService;
import com.stu.edu.vn.service.PasswordResetService;
import com.stu.edu.vn.service.RegistrationVerificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;
    private final RegistrationVerificationService registrationVerificationService;

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    /** Step 2 of registration: correct code -> account ACTIVE + access token (same response as /login). */
    @PostMapping("/verify-register")
    public ResponseEntity<AuthResponse> verifyRegister(@Valid @RequestBody VerifyRegisterRequest request) {
        return ResponseEntity.ok(authService.verifyRegister(request));
    }

    /** New code for an account still waiting for verification; 429 if asked again within 60 seconds. */
    @PostMapping("/resend-register-otp")
    public MessageResponse resendRegisterOtp(@Valid @RequestBody ResendRegisterOtpRequest request) {
        registrationVerificationService.resendOtp(request.email());
        return new MessageResponse("Nếu tài khoản đang chờ xác thực, mã OTP mới đã được gửi. Mã có hiệu lực trong 5 phút.");
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    /** Body: { "idToken": "<credential from Google Identity Services>" } -> same response as /login. */
    @PostMapping("/google")
    public ResponseEntity<AuthResponse> google(@Valid @RequestBody GoogleLoginRequest request) {
        return ResponseEntity.ok(authService.loginWithGoogle(request));
    }

    /** Always answers 200 with the same text, whether or not the e-mail exists (no account enumeration). */
    @PostMapping("/forgot-password")
    public MessageResponse forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.requestReset(request);
        return new MessageResponse("Nếu email tồn tại trong hệ thống, mã OTP đã được gửi. Mã có hiệu lực trong 5 phút.");
    }

    @PostMapping("/reset-password")
    public MessageResponse resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request);
        return new MessageResponse("Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.");
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(authService.getCurrentUser(principal.getId()));
    }
}
