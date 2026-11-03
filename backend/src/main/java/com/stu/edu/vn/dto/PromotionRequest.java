package com.stu.edu.vn.dto;

import com.stu.edu.vn.entity.enums.PromotionType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Body of POST /api/promotions and PUT /api/promotions/{id} (ADMIN). Dates are ISO, e.g. 2026-12-31T23:59:59. */
public record PromotionRequest(
        @NotBlank(message = "Mã khuyến mãi không được để trống")
        @Pattern(regexp = "^[A-Za-z0-9_-]{3,50}$",
                message = "Mã chỉ gồm chữ, số, dấu gạch ngang/gạch dưới, dài 3-50 ký tự")
        String code,

        @Size(max = 200, message = "Tiêu đề tối đa 200 ký tự")
        String title,

        @Size(max = 200, message = "Phụ đề tối đa 200 ký tự")
        String subtitle,

        String description,

        /** Optional, defaults to PROMOTION on create and keeps the current value on update. */
        PromotionType type,

        @NotNull(message = "Phần trăm giảm không được để trống")
        @DecimalMin(value = "0", inclusive = false, message = "Phần trăm giảm phải lớn hơn 0")
        @DecimalMax(value = "100", message = "Phần trăm giảm tối đa là 100")
        BigDecimal discountPercent,

        @NotNull(message = "Ngày bắt đầu không được để trống")
        LocalDateTime startDate,

        @NotNull(message = "Ngày kết thúc không được để trống")
        LocalDateTime endDate,

        /** Optional, defaults to true on create and keeps the current value on update. */
        Boolean active
) {
}
