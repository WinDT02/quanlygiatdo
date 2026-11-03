package com.stu.edu.vn.dto;

import java.math.BigDecimal;

/**
 * Always returned with HTTP 200: a wrong / expired code is a normal outcome of the check, not an error.
 * When {@code valid} is false only {@code message} is meaningful.
 */
public record CheckPromotionResponse(
        boolean valid,
        String message,
        String code,
        String title,
        BigDecimal discountPercent,
        BigDecimal discountAmount      // only when the request contained a subtotal
) {
    public static CheckPromotionResponse invalid(String message) {
        return new CheckPromotionResponse(false, message, null, null, null, null);
    }

    public static CheckPromotionResponse valid(String code, String title,
                                               BigDecimal discountPercent, BigDecimal discountAmount) {
        return new CheckPromotionResponse(true, "Mã khuyến mãi hợp lệ", code, title, discountPercent, discountAmount);
    }
}
