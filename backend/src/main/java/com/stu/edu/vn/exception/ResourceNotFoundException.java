package com.stu.edu.vn.exception;

/** HTTP 404. Also used when a user asks for a resource that belongs to someone else (do not leak existence). */
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
