package com.stu.edu.vn.dto;

/** Safe view of a user: never contains the password hash, OTPs or tokens. */
public record UserResponse(
        Long id,
        String fullName,
        String email,
        String role,          // ADMIN | EMPLOYEE | CUSTOMER
        String status,        // ACTIVE | BANNED
        String authProvider,  // LOCAL | GOOGLE
        String phone,
        String address
) {
}
