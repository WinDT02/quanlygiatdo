package com.stu.edu.vn.exception;

/** HTTP 503 - a feature is not configured or an external system (e.g. Google) cannot be reached. */
public class ServiceUnavailableException extends RuntimeException {
    public ServiceUnavailableException(String message) {
        super(message);
    }

    public ServiceUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
