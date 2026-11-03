package com.stu.edu.vn.exception;

/** HTTP 429 - the client is asking too often (e.g. resending an OTP within the cool-down). */
public class TooManyRequestsException extends RuntimeException {
    public TooManyRequestsException(String message) {
        super(message);
    }
}
