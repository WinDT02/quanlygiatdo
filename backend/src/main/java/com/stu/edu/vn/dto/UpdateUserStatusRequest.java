package com.stu.edu.vn.dto;

import com.stu.edu.vn.entity.enums.UserStatus;
import jakarta.validation.constraints.NotNull;

/** Body of PUT /api/admin/users/{id}/status. */
public record UpdateUserStatusRequest(
        @NotNull(message = "Trạng thái không được để trống")
        UserStatus status      // ACTIVE | BANNED
) {
}
