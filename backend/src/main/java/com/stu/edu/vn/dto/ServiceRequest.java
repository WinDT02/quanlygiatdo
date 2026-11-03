package com.stu.edu.vn.dto;

import com.stu.edu.vn.entity.enums.ServiceStatus;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/** Body of POST /api/services and PUT /api/services/{id}. */
public record ServiceRequest(
        @NotBlank(message = "Tên dịch vụ không được để trống")
        @Size(max = 255, message = "Tên dịch vụ tối đa 255 ký tự")
        String name,

        @NotNull(message = "Đơn giá không được để trống")
        @Positive(message = "Đơn giá phải lớn hơn 0")
        @DecimalMax(value = "9999999999.99", message = "Đơn giá quá lớn")
        BigDecimal price,

        @NotBlank(message = "Đơn vị tính không được để trống")
        @Size(max = 50, message = "Đơn vị tính tối đa 50 ký tự")
        String unit,                 // kg | cái

        String description,

        @Size(max = 500, message = "Đường dẫn ảnh tối đa 500 ký tự")
        String imageUrl,

        /** Optional. Create: defaults to ACTIVE. Update: null keeps the current status. */
        ServiceStatus status
) {
}
