package com.stu.edu.vn.exception;

/** Business-rule violation caused by the client's input -> HTTP 400. */
public class BadRequestException extends RuntimeException {
    public BadRequestException(String message) {
        super(message);
    }
}
