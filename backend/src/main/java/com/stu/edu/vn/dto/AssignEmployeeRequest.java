package com.stu.edu.vn.dto;

import jakarta.validation.constraints.NotNull;

/** Body of PUT /api/orders/{id}/assign. employeeId = employees.id (not users.id). */
public record AssignEmployeeRequest(
        @NotNull(message = "Vui lòng chọn nhân viên")
        Long employeeId
) {
}
