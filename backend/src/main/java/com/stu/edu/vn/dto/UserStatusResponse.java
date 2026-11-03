package com.stu.edu.vn.dto;

public record UserStatusResponse(
        Long id,
        String fullName,
        String email,
        String role,
        String status
) {
}
