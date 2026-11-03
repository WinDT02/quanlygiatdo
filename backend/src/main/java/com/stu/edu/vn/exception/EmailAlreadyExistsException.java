package com.stu.edu.vn.exception;

/** HTTP 409. */
public class EmailAlreadyExistsException extends RuntimeException {
    public EmailAlreadyExistsException(String email) {
        super("Email " + email + " đã được đăng ký");
    }
}
