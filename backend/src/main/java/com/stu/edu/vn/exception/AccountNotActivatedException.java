package com.stu.edu.vn.exception;

/** HTTP 403 - correct credentials, but the e-mail has not been verified with the registration OTP yet. */
public class AccountNotActivatedException extends RuntimeException {
    public AccountNotActivatedException() {
        super("Tài khoản chưa được kích hoạt, vui lòng kiểm tra email để xác thực OTP");
    }
}
