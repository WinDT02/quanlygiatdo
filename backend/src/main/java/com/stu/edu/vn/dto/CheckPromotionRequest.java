package com.stu.edu.vn.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/** Body of POST /api/promotions/check. */
public record CheckPromotionRequest(
        @NotBlank(message = "Vui lòng nhập mã khuyến mãi")
        @Size(max = 50, message = "Mã khuyến mãi tối đa 50 ký tự")
        String code,

        /** Optional: current subtotal of the cart (before shipping). When given, the discount amount is previewed. */
        @DecimalMin(value = "0", message = "Tạm tính không được âm")
        BigDecimal subtotal
) {
}
