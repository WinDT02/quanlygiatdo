package com.stu.edu.vn.dto;

import com.stu.edu.vn.entity.LaundryService;

import java.math.BigDecimal;

public record ServiceResponse(
        Long id,
        String name,
        BigDecimal price,
        String unit,
        String description,
        String imageUrl,
        String status
) {
    public static ServiceResponse from(LaundryService s) {
        return new ServiceResponse(
                s.getId(),
                s.getName(),
                s.getPrice(),
                s.getUnit(),
                s.getDescription(),
                s.getImageUrl(),
                s.getStatus().name());
    }
}
