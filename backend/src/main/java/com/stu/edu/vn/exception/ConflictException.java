package com.stu.edu.vn.exception;

/** HTTP 409 - the request is valid but clashes with the current state (e.g. order already reviewed). */
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
