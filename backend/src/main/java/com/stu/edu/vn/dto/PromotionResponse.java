package com.stu.edu.vn.dto;

import com.stu.edu.vn.entity.Promotion;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PromotionResponse(
        Long id,
        String code,
        String title,
        String subtitle,
        String description,
        String type,                // PROMOTION | EVENT
        BigDecimal discountPercent,
        LocalDateTime startDate,
        LocalDateTime endDate,
        boolean active,             // admin switch
        boolean usableNow           // active AND inside the date range, at the moment of the request
) {
    public static PromotionResponse from(Promotion p, LocalDateTime now) {
        return new PromotionResponse(
                p.getId(),
                p.getCode(),
                p.getTitle(),
                p.getSubtitle(),
                p.getDescription(),
                p.getType().name(),
                p.getDiscountPercent(),
                p.getStartDate(),
                p.getEndDate(),
                p.isActive(),
                p.isUsableAt(now));
    }
}
