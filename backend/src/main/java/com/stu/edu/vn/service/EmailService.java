package com.stu.edu.vn.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class EmailService {

    private final ObjectProvider<JavaMailSender> mailSender;   // absent until spring.mail.host is configured
    private final String from;

    public EmailService(ObjectProvider<JavaMailSender> mailSender,
                        @Value("${app.mail.from:${spring.mail.username:}}") String from) {
        this.mailSender = mailSender;
        this.from = from;
    }

    /** Sends the e-mail verification code of a new registration (same rules as the reset code below). */
    @Async
    public void sendRegisterOtp(String to, String fullName, String otp, int validMinutes) {
        send(to, "Mã OTP xác thực tài khoản - Tiệm giặt sấy", """
                Xin chào %s,

                Cảm ơn bạn đã đăng ký. Mã OTP kích hoạt tài khoản của bạn là: %s

                Mã có hiệu lực trong %d phút. Không chia sẻ mã này với bất kỳ ai.
                Nếu bạn không đăng ký tài khoản, hãy bỏ qua email này.
                """.formatted(fullName, otp, validMinutes));
    }

    /**
     * Sends the password-reset code. Runs on another thread; a failure is only logged, because the API
     * answers the same way whether or not the address exists.
     */
    @Async
    public void sendPasswordResetOtp(String to, String fullName, String otp, int validMinutes) {
        System.out.println("OTP: "+ otp);
        send(to, "Mã OTP đặt lại mật khẩu - Tiệm giặt sấy", """
                Xin chào %s,

                Mã OTP đặt lại mật khẩu của bạn là: %s

                Mã có hiệu lực trong %d phút. Không chia sẻ mã này với bất kỳ ai.
                Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
                """.formatted(fullName, otp, validMinutes));
    }

    private void send(String to, String subject, String text) {
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null) {
            log.error("Cannot send e-mail: spring.mail.* is not configured");
            return;
        }
        SimpleMailMessage message = new SimpleMailMessage();
        if (!from.isBlank()) {
            message.setFrom(from);
        }
        message.setTo(to);
        message.setSubject(subject);
        message.setText(text);
        try {
            sender.send(message);
        } catch (MailException e) {
            log.error("Failed to send e-mail: {}", e.getMessage());
        }
    }
}
