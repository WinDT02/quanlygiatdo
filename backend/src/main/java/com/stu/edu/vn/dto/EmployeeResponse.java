package com.stu.edu.vn.dto;

import com.stu.edu.vn.entity.Employee;

import java.time.LocalDateTime;

/**
 * Staff member for the admin screens. {@code id} is the EMPLOYEE id (what PUT /api/orders/{id}/assign expects),
 * {@code userId} is the login account id (what PUT /api/admin/users/{id}/status expects).
 */
public record EmployeeResponse(
        Long id,
        Long userId,
        String fullName,
        String email,
        String phone,
        String address,
        String status,          // ACTIVE | BANNED
        LocalDateTime createdAt
) {
    /** The employee's user must already be loaded (the repository queries use join fetch). */
    public static EmployeeResponse from(Employee employee) {
        return new EmployeeResponse(
                employee.getId(),
                employee.getUser().getId(),
                employee.getUser().getFullName(),
                employee.getUser().getEmail(),
                employee.getPhone(),
                employee.getAddress(),
                employee.getUser().getStatus().name(),
                employee.getCreatedAt());
    }
}
