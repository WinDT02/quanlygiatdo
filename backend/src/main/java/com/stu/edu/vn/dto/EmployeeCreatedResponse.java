package com.stu.edu.vn.dto;

/**
 * Result of creating an employee.
 * {@code temporaryPassword} is filled ONLY when the server generated the password; it is shown once
 * (only the BCrypt hash is stored) and is null when the admin chose the password himself.
 */
public record EmployeeCreatedResponse(
        EmployeeResponse employee,
        String temporaryPassword
) {
}
