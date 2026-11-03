package com.stu.edu.vn.exception;

/** HTTP 401 - the credentials / token the client sent (e.g. a Google id_token) are not acceptable. */
public class UnauthorizedException extends RuntimeException {
    public UnauthorizedException(String message) {
        super(message);
    }
}
